// src/lib/api.js

export async function planFlights({ from, to, departDate, returnDate }) {
  const res = await fetch("/.netlify/functions/planFlights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, departDate, returnDate })
  });

  // Always read text first so we can show useful errors
  const text = await res.text();

  if (!res.ok) {
    // Return a clear error message (and keep it as a normal JS Error)
    throw new Error(text || `planFlights failed: HTTP ${res.status}`);
  }

  // Handle empty/invalid JSON safely
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error(`planFlights returned invalid JSON: ${text.slice(0, 200)}`);
  }

  // Amadeus flight offers response is usually { data: [...] }
  // We return the offers list directly for the UI.
  return json.data || [];
}
