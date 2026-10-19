import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "../src/contact/turnstile.js";

function fakeSiteverify(success) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ success });
  };
  return { fetchFn, calls };
}

test("posts secret, response and remoteip to siteverify", async () => {
  const api = fakeSiteverify(true);
  await verifyTurnstile("tok", "sec", "203.0.113.9", api.fetchFn);
  const { url, init } = api.calls[0];
  assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.equal(init.method, "POST");
  const form = new URLSearchParams(init.body);
  assert.deepEqual(
    [form.get("secret"), form.get("response"), form.get("remoteip")],
    ["sec", "tok", "203.0.113.9"],
  );
});

test("omits remoteip when the IP is unknown", async () => {
  const api = fakeSiteverify(true);
  await verifyTurnstile("tok", "sec", null, api.fetchFn);
  assert.equal(new URLSearchParams(api.calls[0].init.body).has("remoteip"), false);
});

test("true when success is true", async () => {
  assert.equal(await verifyTurnstile("tok", "sec", null, fakeSiteverify(true).fetchFn), true);
});

test("false when success is false", async () => {
  assert.equal(await verifyTurnstile("tok", "sec", null, fakeSiteverify(false).fetchFn), false);
});

test("false for empty token without calling fetch", async () => {
  const api = fakeSiteverify(true);
  assert.equal(await verifyTurnstile("", "sec", null, api.fetchFn), false);
  assert.equal(api.calls.length, 0);
});

test("throws when fetch fails", async () => {
  const fetchFn = async () => { throw new Error("network down"); };
  await assert.rejects(verifyTurnstile("tok", "sec", null, fetchFn));
});

test("throws on a non-OK siteverify response", async () => {
  const fetchFn = async () => new Response("bad gateway", { status: 502 });
  await assert.rejects(verifyTurnstile("tok", "sec", null, fetchFn));
});
