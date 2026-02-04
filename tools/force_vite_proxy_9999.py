from pathlib import Path
import datetime
import sys

root = Path(r"C:\dev\fairfare-netlify")
cands = [root/n for n in ("vite.config.ts","vite.config.js","vite.config.mjs","vite.config.cjs") if (root/n).exists()]
if not cands:
    print("NO_VITE_CONFIG_FOUND"); sys.exit(2)

p = cands[0]
t = p.read_text(encoding="utf-8", errors="replace")

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
bak = p.with_name(p.name + ".bak_" + stamp)
bak.write_text(t, encoding="utf-8")

proxy_block = """proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true
      }
    }"""

if "localhost:9999" in t and "/.netlify/functions" in t and "proxy" in t:
    print("ALREADY_HAS_9999_PROXY:", p)
    print("BACKUP:", bak)
    sys.exit(0)

# replace any existing proxy for /.netlify/functions
if "/.netlify/functions" in t and "proxy" in t:
    import re
    t2 = re.sub(r"(?s)proxy\s*:\s*\{.*?/.netlify/functions.*?\}(\s*,)?", proxy_block + ",", t, count=1)
    if t2 != t:
        p.write_text(t2, encoding="utf-8")
        print("REPLACED_PROXY_BLOCK:", p)
        print("BACKUP:", bak)
        sys.exit(0)

# inject into existing server: { ... }
i = t.find("server:")
if i != -1:
    b = t.find("{", i)
    if b != -1:
        t = t[:b+1] + "\n    " + proxy_block + ",\n" + t[b+1:]
        p.write_text(t, encoding="utf-8")
        print("INJECTED_PROXY_IN_SERVER:", p)
        print("BACKUP:", bak)
        sys.exit(0)

# inject server into defineConfig({ ... })
dc = t.find("defineConfig(")
if dc != -1:
    ob = t.find("{", dc)
    if ob != -1:
        t = t[:ob+1] + "\n  server: { " + proxy_block + " },\n" + t[ob+1:]
        p.write_text(t, encoding="utf-8")
        print("ADDED_SERVER_WITH_PROXY:", p)
        print("BACKUP:", bak)
        sys.exit(0)

# fallback append
t = t.rstrip() + "\n\nexport default { server: { " + proxy_block + " } };\n"
p.write_text(t, encoding="utf-8")
print("APPENDED_FALLBACK_EXPORT:", p)
print("BACKUP:", bak)