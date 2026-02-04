// src/pages/Results.jsx
import React, { useEffect, useState } from "react";
import { planFlights } from "../lib/api";

function formatSegment(seg) {
  if (!seg) return "No segment";
  const dep = `${seg.departure.iataCode} ${seg.departure.at}`;
  const arr = `${seg.arrival.iataCode} ${seg.arrival.at}`;
  const flight = `${seg.carrierCode}${seg.number}`;
  return `${dep} → ${arr} (${flight})`;
}

function formatItinerary(itin) {
  if (!itin || !Array.isArray(itin.segments) || itin.segments.length === 0) {
    return "No itinerary";
  }
  const first = itin.segments[0];
  const last = itin.segments[itin.segments.length - 1];
  if (itin.segments.length === 1) return formatSegment(first);
  return `${formatSegment(first)} … ${formatSegment(last)}`;
}

export default function Results() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Safe default values (replace later with your real search state/params if desired)
  const search = {
    from: "ATL",
    to: "DEN",
    departDate: "2026-02-16",
    returnDate: "2026-02-20"
  };

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setError("");
      setOffers([]);

      try {
        const list = await planFlights(search);
        if (!alive) return;
        setOffers(list);
      } catch (e) {
        if (!alive) return;
        setError(e.message || String(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Results</h2>

      <div style={{ marginBottom: 12 }}>
        <div><b>From:</b> {search.from}</div>
        <div><b>To:</b> {search.to}</div>
        <div><b>Date:</b> {search.departDate}</div>
        <div><b>Return:</b> {search.returnDate}</div>
      </div>

      {loading && <div>Searching…</div>}

      {error && (
        <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      )}

      {!loading && !error && offers.length === 0 && (
        <div>No offers found.</div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {offers.map((offer) => {
          const outbound = offer.itineraries?.[0];
          const inbound = offer.itineraries?.[1]; // ✅ return leg is here

          const price =
            offer.price?.grandTotal ??
            offer.price?.total ??
            "—";

          const currency = offer.price?.currency ?? "USD";
          const airline = offer.validatingAirlineCodes?.[0] ?? "";

          return (
            <div
              key={offer.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 10,
                padding: 12
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {currency} {price} {airline ? `· ${airline}` : ""}
              </div>

              <div style={{ marginTop: 8 }}>
                <div><b>Outbound:</b> {formatItinerary(outbound)}</div>
                <div><b>Return:</b> {inbound ? formatItinerary(inbound) : "No return itinerary found"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
