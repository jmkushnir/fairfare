from pathlib import Path
import glob
import datetime

paths = [Path(p) for p in glob.glob(r"C:\dev\fairfare-netlify\**\_redirects", recursive=True)]
if not paths:
    raise SystemExit("NO _redirects FOUND")

p = paths[0]
t = p.read_text(encoding="utf-8", errors="replace")

stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
bak = p.with_name(p.name + ".bak_" + stamp)
bak.write_text(t, encoding="utf-8")

lines = t.splitlines()

# remove existing exemptions if any
def keep(ln: str) -> bool:
    s = ln.strip()
    return not (s.startswith("/@vite/") or s.startswith("/src/"))

lines = [ln for ln in lines if keep(ln)]

# find SPA catchall: /* ... 200
idx = None
for i, ln in enumerate(lines):
    s = ln.strip()
    if s.startswith("/*") and s.endswith("200"):
        idx = i
        break

exempt = [
    "/@vite/*  /@vite/:splat  200",
    "/src/*    /src/:splat    200",
]

if idx is None:
    lines = exempt + [""] + lines
else:
    lines = lines[:idx] + exempt + [""] + lines[idx:]

p.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
print("PATCHED:", str(p))
print("BACKUP:", str(bak))