import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { planFlights } from "../lib/api.js";

function formatStops(n) {
  if (n === 0) return "Nonstop";
  if (n === 1) return "1 stop";
  return `${n} stops`;
}

function moneyFromLabel(label) {
  const m = String(label || "").match(/USD\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? `USD ${m[1]}` : String(label || "").replace(/ΓÇó|â€”|â€“/g, "•");
}

function niceTime(iso) {
  if (!iso) return "";
  // Keep it simple: show ISO without seconds
  return String(iso).replace(":00Z", "").replace("T", " ");
}

export default function Results() {
  const nav = useNavigate();
  const { state } = useLocation();
  const search = state || {};

  const [offers, setOffers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const list = await planFlights(search); // api.js returns ranked_options array
        if (!alive) return;
        setOffers(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setErr(String(e?.message || e));
        setOffers([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // run once

  const from = search.from || search.origin || "";
  const to = search.to || search.destination || "";
  const departDate = search.departDate || search.departureDate || "";
  const returnDate = search.returnDate || "";

  return (
    <div style={{ maxWidth: 820, margin: "24px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Results</h1>
        <button onClick={() => nav("/")} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
          Back
        </button>
      </div>

      <div style={{ marginTop: 10, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <div><b>From:</b> {from || "—"}</div>
        <div><b>To:</b> {to || "—"}</div>
        <div><b>Date:</b> {departDate || "—"}</div>
        <div><b>Return:</b> {returnDate || "—"}</div>
      </div>

      {loading && <div style={{ marginTop: 14 }}>Loading flights…</div>}
      {!!err && (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #f5c2c7", background: "#f8d7da", borderRadius: 12 }}>
          <b>Error:</b> {err}
        </div>
      )}

      {!loading && !err && offers.length === 0 && (
        <div style={{ marginTop: 14 }}>No offers found.</div>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {offers.map((opt) => {
          const s = opt?.summary || {};
          return (
            <div key={opt?.rank ?? `${s.from}-${s.to}-${s.depart_at}-${moneyFromLabel(opt?.label)}`}
                 style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{moneyFromLabel(opt?.label)}</div>
              <div style={{ marginTop: 6 }}>
                <b>{formatStops(s.stops)}</b> • {s.duration || ""} • {s.carrier ? `Carrier: ${s.carrier}` : ""}
              </div>
              <div style={{ marginTop: 8 }}>
                <div><b>Outbound:</b> {s.from} → {s.to}</div>
                <div>
                  {niceTime(s.depart_at)} → {niceTime(s.arrive_at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
