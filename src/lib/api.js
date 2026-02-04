export async function planFlights({ from, to, departDate, returnDate, adults = 1 }) {
  const qs = new URLSearchParams();
  qs.set("origin", from);
  qs.set("destination", to);
  qs.set("departureDate", departDate);
  if (returnDate) qs.set("returnDate", returnDate);
  if (adults) qs.set("adults", String(adults));

  const res = await fetch(`/.netlify/functions/planFlights?${qs.toString()}`, { method: "GET" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error || `planFlights failed: ${res.status}`);

  // Your function returns: { type, version, data: { ranked_options: [...] } }
  const offers = payload?.data?.ranked_options;
  return Array.isArray(offers) ? offers : [];
}
