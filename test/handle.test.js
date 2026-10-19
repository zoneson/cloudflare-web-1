import { test } from "node:test";
import assert from "node:assert/strict";
import { handleContact } from "../src/contact/handle.js";

const validBody = (overrides = {}) => ({
  name: "Jane Chen",
  email: "jane@example.com",
  topic: "Troubleshooting",
  problem: "Switch stuck in ONIE.",
  turnstileToken: "tok",
  ...overrides,
});

const post = (body) =>
  new Request("https://zoneson.net/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.9" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

/* Fake deps that record the order they were called in. */
function fakeDeps({ human = true, mailable = true, sendError = null, verifyError = null } = {}) {
  const calls = [];
  const sent = [];
  return {
    calls,
    sent,
    deps: {
      secret: "sec",
      verify: async (...args) => { calls.push(["verify", ...args]); if (verifyError) throw verifyError; return human; },
      canReceiveMail: async (domain) => { calls.push(["canReceiveMail", domain]); return mailable; },
      send: async (raw) => { calls.push(["send"]); if (sendError) throw sendError; sent.push(raw); },
    },
  };
}

async function call(body, options) {
  const fake = fakeDeps(options);
  const response = await handleContact(post(body), fake.deps);
  return { ...fake, status: response.status, json: await response.json() };
}

test("200 and one send on a valid request", async () => {
  const result = await call(validBody());
  assert.equal(result.status, 200);
  assert.deepEqual(result.json, { ok: true });
  assert.equal(result.sent.length, 1);
  assert.match(result.sent[0], /^Reply-To: .*<jane@example\.com>$/m);
});

test("400 with field errors, no verify/DNS/send calls", async () => {
  const result = await call(validBody({ name: "" }));
  assert.equal(result.status, 400);
  assert.equal(result.json.ok, false);
  assert.ok(result.json.errors.name);
  assert.deepEqual(result.calls, []);
});

test("400 on a body that is not JSON", async () => {
  const result = await call("name=Jane");
  assert.equal(result.status, 400);
  assert.equal(result.json.ok, false);
  assert.deepEqual(result.calls, []);
});

test("403 when verify returns false", async () => {
  const result = await call(validBody(), { human: false });
  assert.equal(result.status, 403);
  assert.deepEqual(result.json, { ok: false, error: "turnstile" });
  assert.equal(result.sent.length, 0);
});

test("400 when the email domain can't receive mail", async () => {
  const result = await call(validBody(), { mailable: false });
  assert.equal(result.status, 400);
  assert.equal(result.json.errors.email, "That email domain can't receive mail.");
  assert.equal(result.sent.length, 0);
});

test("502 when send throws", async (t) => {
  t.mock.method(console, "error", () => {});
  const result = await call(validBody(), { sendError: new Error("binding down") });
  assert.equal(result.status, 502);
  assert.deepEqual(result.json, { ok: false, error: "send" });
});

test("502 when verify throws", async (t) => {
  t.mock.method(console, "error", () => {});
  const result = await call(validBody(), { verifyError: new Error("siteverify down") });
  assert.equal(result.status, 502);
  assert.deepEqual(result.json, { ok: false, error: "send" });
});

test("runs checks in spec order", async () => {
  const deadAddress = await call(validBody({ email: "noreply@example.com" }));
  assert.deepEqual(deadAddress.calls, []);
  const ok = await call(validBody({ email: "Jane@Example.COM" }));
  assert.deepEqual(ok.calls.map(([name]) => name), ["verify", "canReceiveMail", "send"]);
  assert.deepEqual(ok.calls[0], ["verify", "tok", "sec", "203.0.113.9"]);
  assert.deepEqual(ok.calls[1], ["canReceiveMail", "example.com"]);
});

test("a non-string Turnstile token is treated as missing", async () => {
  const result = await call(validBody({ turnstileToken: { x: 1 } }));
  assert.equal(result.calls[0][1], "");
});
