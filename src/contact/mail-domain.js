const DOH_URL = "https://cloudflare-dns.com/dns-query";
const RECORD_TYPE = { MX: 15, A: 1, AAAA: 28 };
const NOERROR = 0;
const NXDOMAIN = 3;

/*
 * Returns the answer data for one record type. Answers are filtered by type
 * because an A query on an alias also returns the CNAME hop. Any status
 * other than "exists" or "does not exist" (e.g. SERVFAIL) is a lookup
 * failure, not proof the domain is dead.
 */
async function lookup(domain, type, fetchFn) {
  const url = `${DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
  const response = await fetchFn(url, { headers: { accept: "application/dns-json" } });
  if (!response.ok) throw new Error(`DoH HTTP ${response.status}`);
  const body = await response.json();
  if (body.Status !== NOERROR && body.Status !== NXDOMAIN) throw new Error(`DoH status ${body.Status}`);
  return (body.Answer ?? []).filter((a) => a.type === RECORD_TYPE[type]).map((a) => a.data);
}

const isNullMx = (data) => /^0\s+\.$/.test(data.trim());

/*
 * MX first; without one, RFC 5321 delivers to the A/AAAA host. A failed
 * lookup answers true: losing a real customer to a DNS hiccup is worse
 * than letting one fake address through.
 */
export async function canReceiveMail(domain, fetchFn = fetch) {
  try {
    const mx = await lookup(domain, "MX", fetchFn);
    if (mx.length) return !mx.every(isNullMx);
    const hosts = await Promise.all([lookup(domain, "A", fetchFn), lookup(domain, "AAAA", fetchFn)]);
    return hosts.flat().length > 0;
  } catch {
    return true;
  }
}
