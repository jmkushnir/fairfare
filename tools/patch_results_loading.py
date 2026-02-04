import re, shutil
from pathlib import Path
from datetime import datetime

path = Path(r"C:\dev\fairfare-netlify\src\pages\Results.jsx")
if not path.exists():
    raise SystemExit(f"File not found: {path}")

ts = datetime.now().strftime("%Y%m%d_%H%M%S")
bak = path.with_name(path.name + f".bak_{ts}")
shutil.copy2(path, bak)
print("BACKUP:", bak)

text = path.read_text(encoding="utf-8")

loading_block = """if (loading) {
    return (
      <div style={{ padding: 18, maxWidth: 720 }}>
        <h2>Searching flights…</h2>
        <div style={{ marginTop: 8, opacity: 0.85, lineHeight: 1.4 }}>
          This can take up to a minute. Please don’t refresh.
        </div>
      </div>
    );
  }
"""

changed = False

m = re.search(r'(?s)\bif\s*\(\s*loading\s*\)\s*return\s*\([^;]*\);\s*', text)
if m:
    text = text[:m.start()] + loading_block + text[m.end():]
    print("Patched: replaced `if (loading) return (...)`")
    changed = True
else:
    m = re.search(r'(?s)\bif\s*\(\s*loading\s*\)\s*\{\s*return\s*\([^;]*\);\s*\}\s*', text)
    if m:
        text = text[:m.start()] + loading_block + text[m.end():]
        print("Patched: replaced `if (loading) { return (...) }`")
        changed = True

if not changed:
    m = re.search(r'(?s)(\bexport\s+default\s+function\s+Results\b|\bfunction\s+Results\b|\bconst\s+Results\s*=\s*\(\)\s*=>\s*\{).*?\{', text)
    if not m:
        raise SystemExit("Could not find Results component start.")
    start = m.end()
    m2 = re.search(r'(?s)\breturn\s*\(', text[start:])
    if not m2:
        raise SystemExit("Could not find a return( ) to insert before.")
    insert_at = start + m2.start()
    text = text[:insert_at] + "\n  " + loading_block + "\n  " + text[insert_at:]
    print("Patched: inserted new loading block")
    changed = True

path.write_text(text, encoding="utf-8")
print("WROTE:", path)