const CRLF = "\r\n";
const FOLD = CRLF + " ";
/*
 * 39 bytes -> 52 base64 chars -> 64-char encoded word, which keeps
 * "Reply-To: " / "Subject: " lines under the 78-char RFC 5322 guideline.
 */
const WORD_BYTES = 39;

const utf8 = new TextEncoder();
const isAscii = (text) => /^[\x20-\x7e]*$/.test(text);
const oneLine = (text) => text.replace(/[\r\n]+/g, " ");

function base64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/* RFC 2047 encoded words, split on character boundaries, never mid-codepoint. */
function encodeWords(text) {
  const words = [];
  let chunk = [];
  for (const char of text) {
    const bytes = utf8.encode(char);
    if (chunk.length + bytes.length > WORD_BYTES) {
      words.push(chunk);
      chunk = [];
    }
    chunk.push(...bytes);
  }
  words.push(chunk);
  return words.map((bytes) => `=?UTF-8?B?${base64(bytes)}?=`).join(FOLD);
}

const headerText = (text) => (isAscii(text) ? text : encodeWords(text));

function mailbox(name, address) {
  if (!isAscii(name)) return encodeWords(name) + FOLD + `<${address}>`;
  return `"${name.replace(/["\\]/g, "\\$&")}" <${address}>`;
}

export function buildSubject(data) {
  return `[${data.topic}] ${data.name} — ${data.company || "no company"}`;
}

function buildBody(data) {
  const lines = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Company: ${data.company}`,
    `Topic: ${data.topic}`,
    `Switches: ${data.switches}`,
    `Timeline: ${data.timeline}`,
    "",
    "Problem:",
    data.problem,
  ];
  return lines.join("\n").replace(/\r?\n/g, CRLF);
}

export function buildMime(data, { from, to, date = new Date(), messageId }) {
  const safe = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, oneLine(value)]));
  const headers = [
    `From: Website form <${from}>`,
    `To: ${to}`,
    `Reply-To: ${mailbox(safe.name, safe.email)}`,
    `Subject: ${headerText(buildSubject(safe))}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: ${messageId ?? `<${crypto.randomUUID()}@zoneson.net>`}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ];
  const body = base64(utf8.encode(buildBody(data))).match(/.{1,76}/g).join(CRLF);
  return headers.join(CRLF) + CRLF + CRLF + body + CRLF;
}
