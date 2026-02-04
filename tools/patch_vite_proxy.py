from pathlib import Path
import sys
import datetime

root = Path(r"C:\dev\fairfare-netlify")

cands = []
for name in ("vite.config.ts","vite.config.js","vite.config.mjs","vite.config.cjs"):
    p = root / name
    if p.exists():
        cands.append(p)

if not cands:
    print("NO_VITE_CONFIG_FOUND")
    sys.exit(2)

p = cands[0]
t = p.read_text(encoding="utf-8", errors="replace")

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
bak = p.with_name(p.name + ".bak_" + stamp)
bak.write_text(t, encoding="utf-8")

proxy_line = "proxy: { '/.netlify/functions': 'http://localhost:9999' }"

if "/.netlify/functions" in t and "localhost:9999" in t:
    print("ALREADY_OK:", str(p))
    print("BACKUP:", str(bak))
    sys.exit(0)

# If server block exists, inject proxy inside it (best-effort string insertion, no regex)
idx = t.find("server:")
if idx != -1:
    brace = t.find("{", idx)
    if brace != -1:
        insert_at = brace + 1
        t = t[:insert_at] + "\n    " + proxy_line + ",\n" + t[insert_at:]
        p.write_text(t, encoding="utf-8")
        print("PATCHED_SERVER_PROXY:", str(p))
        print("BACKUP:", str(bak))
        sys.exit(0)

# If defineConfig({ exists, add server block
dc = t.find("defineConfig(")
if dc != -1:
    obj = t.find("{", dc)
    if obj != -1:
        insert_at = obj + 1
        t = t[:insert_at] + "\n  server: { " + proxy_line + " },\n" + t[insert_at:]
        p.write_text(t, encoding="utf-8")
        print("PATCHED_DEFINECONFIG_SERVER:", str(p))
        print("BACKUP:", str(bak))
        sys.exit(0)

# Fallback append (keeps existing config intact)
t = t.rstrip() + "\n\n// added for local netlify functions proxy\nexport default { server: { " + proxy_line + " } };\n"
p.write_text(t, encoding="utf-8")
print("APPENDED_FALLBACK_EXPORT:", str(p))
print("BACKUP:", str(bak))