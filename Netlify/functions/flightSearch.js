// netlify/functions/flightSearch.js

let cachedToken = null;
let cachedTokenExp = 0;

async function getAmadeusToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExp - 30_000) return cachedToken;

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  const baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";

  if (!clientId || !clientSecret) {
    throw new Error("Missing AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET env vars");
  }

  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);

  const r = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!r.ok) throw new Error(`Token error: ${r.status} ${await r.text()}`);
  const j = await r.json();

  cachedToken = j.access_token;
  cachedTokenExp = now + (j.expires_in * 1000);
  return cachedToken;
}

function scoreOffer(offer, prefs = {}) {
  const itineraries = offer.itineraries || [];
  const segments = itineraries.flatMap(i => i.segments || []);
  const stops = Math.max(0, segments.length - 1);
  const price = Number(offer.price?.grandTotal || 999999);

  let score = 0;
  score += stops === 0 ? 120 : stops === 1 ? 60 : 0;
  if (prefs.nonstopOnly && stops > 0) score -= 1000;
  score += -Math.min(price, 2000) / 10;

  const dep = segments[0]?.departure?.at ? new Date(segments[0].departure.at) : null;
  if (dep) {
    const h = dep.getHours();
    if (prefs.avoidEarly && h < 7) score -= 50;
    if (prefs.avoidLate && h >= 21) score -= 50;
  }

  if (stops >= 1) score -= 15 * stops;
  return { score, stops, price };
}

export const handler = async (event) => {
  try {
    const qs = event.queryStringParameters || {};

// Parse POST body (JSON), including base64-encoded bodies
let body = {};
let rawBody = event.body || "";
if (event.isBase64Encoded && rawBody) {
  try { rawBody = Buffer.from(rawBody, "base64").toString("utf8"); } catch { rawBody = ""; }
}
if (rawBody) {
  try { body = JSON.parse(rawBody); } catch { body = {}; }
}

const origin = ((body.origin ?? qs.origin) || "").toUpperCase();
const destination = ((body.destination ?? qs.destination) || "").toUpperCase();

// Accept either `date` or `departureDate`
const date = (body.date ?? body.departureDate ?? qs.date ?? qs.departureDate);
const returnDate = (body.returnDate ?? qs.returnDate ?? qs.return);

const adults = String(body.adults ?? qs.adults ?? "1");

// prefs can come as object (POST) or JSON string (GET)
let prefs = {};
if (body.prefs && typeof body.prefs === "object") prefs = body.prefs;
else if (typeof qs.prefs === "string") { try { prefs = JSON.parse(qs.prefs); } catch { prefs = {}; } }

    if (!origin || !destination || !date) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing origin, destination, or date" }) };
    }

    const token = await getAmadeusToken();
    const baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";

    const url = new URL(`${baseUrl}/v2/shopping/flight-offers`);
    url.searchParams.set("originLocationCode", origin);
    url.searchParams.set("destinationLocationCode", destination);
    url.searchParams.set("departureDate", date);
    if (returnDate) url.searchParams.set("returnDate", returnDate);
    url.searchParams.set("adults", adults);
    url.searchParams.set("currencyCode", "USD");
    url.searchParams.set("max", "25");

    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return { statusCode: r.status, body: await r.text() };

    const data = await r.json();
    const offers = (data.data || [])
      .map(o => ({ ...o, _ff: scoreOffer(o, prefs) }))
      .sort((a, b) => b._ff.score - a._ff.score);

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offers }, null, 2) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};

