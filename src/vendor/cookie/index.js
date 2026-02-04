export function parse(str = "", opts = {}) {
  const obj = {};
  if (!str) return obj;
  const pairs = str.split(/;\s*/);
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = decodeURIComponent(pair.slice(0, idx).trim());
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    if (obj[key] === undefined) obj[key] = val;
  }
  return obj;
}

export function serialize(name, value, options = {}) {
  const enc = encodeURIComponent;
  let str = `${enc(name)}=${enc(String(value))}`;
  if (options.maxAge != null) str += `; Max-Age=${Math.floor(options.maxAge)}`;
  if (options.domain) str += `; Domain=${options.domain}`;
  if (options.path) str += `; Path=${options.path}`; else str += `; Path=/`;
  if (options.expires) str += `; Expires=${options.expires.toUTCString?.() ?? options.expires}`;
  if (options.httpOnly) str += `; HttpOnly`;
  if (options.secure) str += `; Secure`;
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}
