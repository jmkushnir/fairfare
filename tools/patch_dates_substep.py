import re, shutil
from pathlib import Path
from datetime import datetime

path = Path(r"C:\dev\fairfare-netlify\src\components\IntakeWizard.jsx")
if not path.exists():
    raise SystemExit(f"File not found: {path}")

ts = datetime.now().strftime("%Y%m%d_%H%M%S")
bak = path.with_name(path.name + f".bak_{ts}")
shutil.copy2(path, bak)
print("BACKUP:", bak)

text = path.read_text(encoding="utf-8")

# Insert datePage state right after: const [step, setStep] = useState(...)
if "datePage, setDatePage" not in text:
    m = re.search(r"(?m)^\s*const\s*\[\s*step\s*,\s*setStep\s*\]\s*=\s*useState\([^\)]*\);\s*$", text)
    if not m:
        raise SystemExit("Could not find: const [step, setStep] = useState(...);")
    insert = m.group(0) + "\n  const [datePage, setDatePage] = useState(\"depart\"); // \"depart\" | \"return\"\n"
    text = text[:m.start()] + insert + text[m.end():]
    print("Inserted datePage state.")
else:
    print("datePage state already present.")

step2 = "// ---------------- Step 2: dates ----------------"
step3 = "// ---------------- Step 3: extras ----------------"
i2 = text.find(step2)
i3 = text.find(step3)
if i2 < 0 or i3 < 0 or i3 <= i2:
    raise SystemExit("Could not locate Step 2/Step 3 boundaries safely.")

new_step2 = r"""
  // ---------------- Step 2: dates ----------------
  if (step === 2) {
    const invalidReturn =
      tripType === "roundtrip" &&
      trip.returnDate &&
      trip.departDate &&
      trip.returnDate < trip.departDate;

    const onDepartPage = datePage !== "return";
    const canContinueDepart = !!trip.departDate;
    const canContinueReturn =
      tripType === "oneway" || (!!trip.returnDate && !invalidReturn);

    return (
      <div>
        <style>{`
          input[type="date"]{ font-size:18px; padding:10px 12px; }
          input[type="date"]::-webkit-calendar-picker-indicator{ opacity:1; transform:scale(1.6); cursor:pointer; }

          .row{ display:flex; align-items:center; gap:10px; margin-top:8px; }
          label{ display:block; margin-top:10px; }

          .calBtn{
            display:flex; align-items:center; justify-content:center; gap:10px;
            font-size:18px; padding:10px 14px; min-width:170px;
            border:2px solid #93c5fd; border-radius:10px;
            background:#2563eb; color:#ffffff; font-weight:800; cursor:pointer;
          }
          .calBtn:hover{background:#1d4ed8}
          .calBtn:focus{outline:3px solid #fbbf24; outline-offset:2px}
        `}</style>

        <h2>Trip type</h2>
        <select
          value={tripType}
          onChange={(e) => {
            const nextType = e.target.value;
            setTrip({
              ...trip,
              tripType: nextType,
              returnDate: nextType === "oneway" ? "" : trip.returnDate,
            });
            if (nextType === "oneway") setDatePage("depart");
          }}
        >
          <option value="oneway">One-way</option>
          <option value="roundtrip">Round-trip</option>
        </select>

        {onDepartPage ? (
          <>
            <h2>Departure date</h2>

            <label>Departure date</label>
            <div className="row">
              <input
                ref={departRef}
                type="date"
                min={departMin}
                value={trip.departDate || ""}
                onChange={(e) => {
                  const d = e.target.value;
                  const newReturn =
                    tripType === "roundtrip" && trip.returnDate && d && trip.returnDate < d
                      ? ""
                      : trip.returnDate;
                  setTrip({ ...trip, departDate: d, returnDate: newReturn });
                }}
              />
              <button type="button" className="calBtn" onClick={() => openPicker(departRef)}>
                <CalIcon /> <span>Pick date</span>
              </button>
            </div>

            {invalidReturn && (
              <div style={{ color: "crimson", marginTop: 8 }}>
                Return date cant be before departure date.
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button onClick={() => setStep(1)}>Back</button>{" "}
              <button
                disabled={!canContinueDepart}
                onClick={() => {
                  if (tripType === "roundtrip") setDatePage("return");
                  else setStep(3);
                }}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Return date</h2>

            <div style={{ marginTop: 6, marginBottom: 6, color: "var(--muted)", fontSize: 16 }}>
              Departure: <strong>{trip.departDate || ""}</strong>
            </div>

            <label>Return date</label>
            <div className="row">
              <input
                ref={returnRef}
                type="date"
                min={returnMin}
                value={trip.returnDate || ""}
                onChange={(e) => setTrip({ ...trip, returnDate: e.target.value })}
              />
              <button type="button" className="calBtn" onClick={() => openPicker(returnRef)}>
                <CalIcon /> <span>Pick date</span>
              </button>
            </div>

            {invalidReturn && (
              <div style={{ color: "crimson", marginTop: 8 }}>
                Return date cant be before departure date.
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button onClick={() => setDatePage("depart")}>Back</button>{" "}
              <button disabled={!canContinueReturn} onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
""".lstrip("\n")

text = text[:i2] + new_step2 + "\n\n" + text[i3:]

# Write UTF-8 WITHOUT BOM
path.write_text(text, encoding="utf-8")
print("WROTE:", path)