import { test } from "node:test";
import assert from "node:assert/strict";
import { canReceiveMail } from "../src/contact/mail-domain.js";

const RECORD_TYPE = { MX: 15, A: 1, AAAA: 28 };

/*
 * Fake DoH resolver: `records` maps a query type to the `data` strings it
 * answers with. Every request is recorded in `calls`.
 */
function fakeDns(records, { status = 0 } = {}) {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const type = new URL(url).searchParams.get("type");
    const answers = (records[type] ?? []).map((data) => ({ type: RECORD_TYPE[type], data }));
    const body = { Status: status, ...(answers.length && { Answer: answers }) };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/dns-json" } });
  };
  return { fetchFn, calls };
}

const queriedTypes = (calls) => calls.map((c) => c.url.searchParams.get("type"));

test("true when an MX record exists", async () => {
  const dns = fakeDns({ MX: ["10 mx.example.com."] });
  assert.equal(await canReceiveMail("example.com", dns.fetchFn), true);
  assert.deepEqual(queriedTypes(dns.calls), ["MX"]);
});

test("false for null MX", async () => {
  const dns = fakeDns({ MX: ["0 ."], A: ["192.0.2.1"] });
  assert.equal(await canReceiveMail("example.com", dns.fetchFn), false);
});

test("true with no MX but an A record", async () => {
  const dns = fakeDns({ A: ["192.0.2.1"] });
  assert.equal(await canReceiveMail("example.com", dns.fetchFn), true);
});

test("true with no MX but an AAAA record", async () => {
  const dns = fakeDns({ AAAA: ["2001:db8::1"] });
  assert.equal(await canReceiveMail("example.com", dns.fetchFn), true);
});

test("false when no MX, A or AAAA", async () => {
  const dns = fakeDns({});
  assert.equal(await canReceiveMail("example.com", dns.fetchFn), false);
});

test("false for NXDOMAIN", async () => {
  const dns = fakeDns({}, { status: 3 });
  assert.equal(await canReceiveMail("nope.invalid", dns.fetchFn), false);
});

test("true when the lookup throws", async () => {
  const fetchFn = async () => { throw new Error("network down"); };
  assert.equal(await canReceiveMail("example.com", fetchFn), true);
});

test("true on HTTP 500", async () => {
  const fetchFn = async () => new Response("oops", { status: 500 });
  assert.equal(await canReceiveMail("example.com", fetchFn), true);
});

test("queries cloudflare-dns.com with accept: application/dns-json", async () => {
  const dns = fakeDns({ MX: ["10 mx.example.com."] });
  await canReceiveMail("example.com", dns.fetchFn);
  const { url, init } = dns.calls[0];
  assert.equal(url.origin + url.pathname, "https://cloudflare-dns.com/dns-query");
  assert.equal(url.searchParams.get("name"), "example.com");
  assert.equal(new Headers(init.headers).get("accept"), "application/dns-json");
});
