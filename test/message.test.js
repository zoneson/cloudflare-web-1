import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSubject, buildMime } from "../src/contact/message.js";

const data = (overrides = {}) => ({
  name: "Jane Chen",
  email: "jane@example.com",
  company: "Example DC",
  topic: "Troubleshooting",
  switches: "12 x AS4630",
  timeline: "This month",
  problem: "Line one.\nLine two.",
  ...overrides,
});

const ENVELOPE = { from: "form@zoneson.net", to: "zoneson@gmail.com" };

function parse(raw) {
  const [head, ...rest] = raw.split("\r\n\r\n");
  const unfolded = head.replace(/\r\n /g, " ");
  const headers = Object.fromEntries(
    unfolded.split("\r\n").map((line) => [line.slice(0, line.indexOf(":")), line.slice(line.indexOf(":") + 2)]),
  );
  const body = Buffer.from(rest.join("\r\n\r\n").replace(/\r\n/g, ""), "base64").toString("utf8");
  return { head, headers, body };
}

/* RFC 2047: whitespace is dropped only between two adjacent encoded words. */
const decodeWords = (value) =>
  value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?UTF-8\?B\?([^?]*)\?=/g, (_, b64) => Buffer.from(b64, "base64").toString("utf8"));

test("subject follows the spec format", () => {
  assert.equal(buildSubject(data()), "[Troubleshooting] Jane Chen — Example DC");
  assert.equal(buildSubject(data({ company: "" })), "[Troubleshooting] Jane Chen — no company");
});

test("has the required headers", () => {
  const { head, headers } = parse(buildMime(data(), ENVELOPE));
  assert.match(head, /^From: Website form <form@zoneson\.net>$/m);
  assert.match(head, /^To: zoneson@gmail\.com$/m);
  assert.match(headers["Reply-To"], /<jane@example\.com>$/);
  assert.match(headers["Message-ID"], /^<.+@zoneson\.net>$/);
  assert.ok(headers["Date"]);
  assert.equal(headers["MIME-Version"], "1.0");
  assert.equal(headers["Content-Type"], "text/plain; charset=UTF-8");
  assert.equal(decodeWords(headers["Subject"]), buildSubject(data()));
});

test("uses CRLF line endings only", () => {
  const raw = buildMime(data(), ENVELOPE);
  assert.equal(raw.replace(/\r\n/g, "").includes("\n"), false);
});

test("encodes non-ASCII subject and display name", () => {
  const name = "陈忠森";
  const company = "Müller Netzwerke GmbH ".repeat(4).trim();
  const { head, headers } = parse(buildMime(data({ name, company }), ENVELOPE));
  assert.match(head, /^[\x20-\x7e\r\n]*$/);
  assert.ok(head.split("\r\n").every((line) => line.length <= 78), "header lines folded");
  assert.match(headers["Subject"], /=\?UTF-8\?B\?/);
  assert.equal(decodeWords(headers["Subject"]), buildSubject(data({ name, company })));
  assert.equal(decodeWords(headers["Reply-To"]), `${name} <jane@example.com>`);
});

test("quotes an ASCII display name with special characters", () => {
  const { headers } = parse(buildMime(data({ name: 'Chen, "Jane"' }), ENVELOPE));
  assert.equal(headers["Reply-To"], '"Chen, \\"Jane\\"" <jane@example.com>');
});

test("cannot inject headers through fields", () => {
  const raw = buildMime(data({ name: "Jane\r\nBcc: x@y.com", company: "A\nB" }), ENVELOPE);
  const { head, headers } = parse(raw);
  assert.equal(head.split("\r\n").some((line) => line.startsWith("Bcc:")), false);
  assert.deepEqual(Object.keys(headers).sort(), [
    "Content-Transfer-Encoding", "Content-Type", "Date", "From", "MIME-Version",
    "Message-ID", "Reply-To", "Subject", "To",
  ]);
});

test("body lists fields in order with problem last", () => {
  const { body } = parse(buildMime(data(), ENVELOPE));
  assert.deepEqual(body.split("\r\n"), [
    "Name: Jane Chen",
    "Email: jane@example.com",
    "Company: Example DC",
    "Topic: Troubleshooting",
    "Switches: 12 x AS4630",
    "Timeline: This month",
    "",
    "Problem:",
    "Line one.",
    "Line two.",
  ]);
});

test("body survives non-ASCII text", () => {
  const { body } = parse(buildMime(data({ problem: "交换机无法启动 ZTP" }), ENVELOPE));
  assert.ok(body.endsWith("交换机无法启动 ZTP"));
});
