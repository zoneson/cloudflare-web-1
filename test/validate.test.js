import { test } from "node:test";
import assert from "node:assert/strict";
import { validateFields, emailDomain, TOPICS, TIMELINES } from "../src/contact/validate.js";

const valid = () => ({
  name: "Jane Chen",
  email: "jane@example.com",
  company: "Example DC",
  topic: TOPICS[1],
  switches: "12 x AS4630",
  timeline: TIMELINES[1],
  problem: "16 new switches need PicOS via ZTP.",
});

test("accepts a complete valid request", () => {
  assert.equal(validateFields(valid()).ok, true);
});

test("requires name, email, topic, problem", () => {
  const result = validateFields({});
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["email", "name", "problem", "topic"]);
});

test("enforces length limits", () => {
  const longEmail = "a".repeat(64) + "@" + "b".repeat(185) + ".com";
  assert.equal(longEmail.length, 254);
  const limits = { name: 100, company: 100, switches: 200, problem: 5000 };
  for (const [field, max] of Object.entries(limits)) {
    assert.equal(validateFields({ ...valid(), [field]: "x".repeat(max) }).ok, true, field);
    const over = validateFields({ ...valid(), [field]: "x".repeat(max + 1) });
    assert.ok(over.errors?.[field], field);
  }
  assert.equal(validateFields({ ...valid(), email: longEmail }).ok, true);
  assert.ok(validateFields({ ...valid(), email: "a" + longEmail }).errors?.email);
});

test("rejects topic or timeline outside the allowed set", () => {
  assert.ok(validateFields({ ...valid(), topic: "Other" }).errors?.topic);
  assert.ok(validateFields({ ...valid(), timeline: "Tomorrow" }).errors?.timeline);
});

test("trims and lower-cases the email domain", () => {
  const result = validateFields({ ...valid(), email: "  Jane@Example.COM " });
  assert.equal(result.data.email, "Jane@example.com");
  assert.equal(emailDomain(result.data.email), "example.com");
});

test("rejects implausible email syntax", () => {
  for (const email of ["a@b", "a@@b.com", "@b.com", "a b@c.com"]) {
    assert.ok(validateFields({ ...valid(), email }).errors?.email, email);
  }
});

test("rejects no-reply style addresses", () => {
  const dead = ["noreply", "No-Reply", "do-not-reply", "donotreply", "mailer-daemon", "postmaster"];
  for (const local of dead) {
    const result = validateFields({ ...valid(), email: `${local}@x.com` });
    assert.equal(result.errors?.email, "Please use an address I can reply to.", local);
  }
  assert.equal(validateFields({ ...valid(), email: "noreplyjane@x.com" }).ok, true);
});

test("ignores non-string field values", () => {
  assert.ok(validateFields({ ...valid(), name: 42 }).errors?.name);
});

test("fills absent optional fields with empty strings", () => {
  const { company, switches, timeline, ...required } = valid();
  const result = validateFields(required);
  assert.deepEqual(
    [result.data.company, result.data.switches, result.data.timeline],
    ["", "", ""],
  );
});
