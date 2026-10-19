export const TOPICS = [
  "Question about a Pica8 product",
  "ZTP / automation (ONIE, Ansible)",
  "Troubleshooting",
  "Something else",
];

export const TIMELINES = ["ASAP", "This month", "Just exploring"];

const NO_REPLY = /^(no-?reply|do-?not-?reply|donotreply|mailer-daemon|postmaster)$/i;
const PLAUSIBLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEmail(email) {
  if (!PLAUSIBLE_EMAIL.test(email)) return "Please check this email address.";
  if (NO_REPLY.test(email.split("@")[0])) return "Please use an address I can reply to.";
  return "";
}

const RULES = [
  { key: "name", required: true, max: 100 },
  { key: "email", required: true, max: 254, check: checkEmail },
  { key: "company", max: 100 },
  { key: "topic", required: true, oneOf: TOPICS },
  { key: "switches", max: 200 },
  { key: "timeline", oneOf: TIMELINES },
  { key: "problem", required: true, max: 5000 },
];

export function emailDomain(email) {
  return email.slice(email.lastIndexOf("@") + 1);
}

/*
 * Only the domain is case-insensitive; the local part is left exactly as
 * typed because some mail servers do treat it case-sensitively.
 */
function normalizeEmail(email) {
  const at = email.lastIndexOf("@");
  return at < 0 ? email : email.slice(0, at + 1) + email.slice(at + 1).toLowerCase();
}

function fieldError(rule, value) {
  if (!value) return rule.required ? "Please fill this in." : "";
  if (value.length > (rule.max ?? Infinity)) return `Please keep this to ${rule.max} characters or fewer.`;
  if (rule.oneOf && !rule.oneOf.includes(value)) return "Please pick one of the options.";
  return rule.check ? rule.check(value) : "";
}

export function validateFields(input) {
  const data = {};
  const errors = {};
  for (const rule of RULES) {
    const raw = typeof input?.[rule.key] === "string" ? input[rule.key].trim() : "";
    data[rule.key] = rule.key === "email" ? normalizeEmail(raw) : raw;
    const error = fieldError(rule, data[rule.key]);
    if (error) errors[rule.key] = error;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
