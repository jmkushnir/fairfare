/**
 * Netlify Function: planFlights
 * Robust input parsing to prevent null origin/destination/departureDate errors.
 * Accepts POST JSON and GET query params.
 *
 * Supported keys (any of these):
 * - origin / from / originLocationCode
 * - destination / to / destinationLocationCode
 * - departureDate / departDate / departure_date / date
 * - returnDate / return / return_date
 *
 * Also supports nested app_state.trip.* common patterns.
 */

const json = (statusCode, bodyObj, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders,
  },
  body: JSON.stringify(bodyObj),
});

const corsHeaders = (origin) => ({
  "access-control-allow-origin": origin || "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization",
});

function pickInput(event) {
  const method = event.httpMethod || "GET";
  if (method === "POST") {
    try {
      return JSON.parse(event.body || "{}");
    } catch {
      return {};
    }
  }
  return event.queryStringParameters || {};
}

function normalizeStr(v) {
  return String(v || "").trim();
}

function looksLikeIata(code) {
  return /^[A-Z]{3}$/.test(code);
}

function parsePassengerCounts(input) {
  const app = input?.app_state || {};
  const pax = input?.passengers || app?.passengers || {};
  let adults = Number(input.adults ?? pax.adults ?? app?.trip?.adults ?? 1) || 1;
  let children = Number(input.children ?? pax.children ?? 0) || 0;
  let infants = Number(input.infants ?? pax.infants ?? 0) || 0;

  const travelers =
    input?.travelers ||
    app?.travelers ||
    app?.traveler_profiles ||
    app?.travelerProfiles ||
    input?.traveler_profiles ||
    input?.travelerProfiles ||
    null;

  if (Array.isArray(travelers) && travelers.length > 0) {
    let a = 0, c = 0, i = 0;
    for (const t of travelers) {
      const type = String(t?.type || t?.travelerType || "").toUpperCase();
      if (type.includes("CHILD")) c += 1;
      else if (type.includes("INFANT")) i += 1;
      else a += 1;
    }
    adults = a || adults;
    children = c || children;
    infants = i || infants;
  }

  adults = Math.max(1, Math.min(9, adults));
  children = Math.max(0, Math.min(9, children));
  infants = Math.max(0, Math.min(9, infants));
  return { adults, children, infants };
}

function parsePets(input) {
  const trip = input?.app_state?.trip || {};
  const pets = trip?.pets ?? input?.pets ?? null;
  if (pets == null) return [];

  const normalizeType = (t) => {
    const x = String(t || "pet").toLowerCase().trim();
    if (x === "service" || x === "serviceanimal" || x === "service_animal") return "service_animal";
    if (x === "cabin" || x === "in-cabin" || x === "in_cabin") return "in_cabin";
    if (x === "hold" || x === "checked" || x === "cargo") return "checked";
    if (x === "pet") return "pet";
    return x;
  };

  const toItem = (obj) => {
    if (obj == null) return null;
    if (typeof obj === "number") return { type: "pet", count: Math.max(0, obj) };
    if (typeof obj === "object") {
      const count = Number(obj.count ?? obj.quantity ?? 1) || 0;
      const type = normalizeType(obj.type ?? obj.category ?? "pet");
      return { type, count: Math.max(0, count) };
    }
    return null;
  };

  if (Array.isArray(pets)) {
    return pets.map(toItem).filter(Boolean).filter((p) => p.count > 0);
  }
  const single = toItem(pets);
  return single && single.count > 0 ? [single] : [];
}

async function getAmadeusToken(baseUrl, clientId, clientSecret) {
  const tokenRes = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok) {
    const err = new Error("Amadeus auth failed");
    err.status = tokenRes.status;
    err.details = tokenJson;
    throw err;
  }
  return tokenJson.access_token;
}

async function resolveLocationCode(baseUrl, accessToken, value) {
  const v = normalizeStr(value);
  const upper = v.toUpperCase();
  if (looksLikeIata(upper)) return upper;

  const url = new URL(`${baseUrl}/v1/reference-data/locations`);
  url.searchParams.set("keyword", v);
  url.searchParams.set("subType", "CITY,AIRPORT");
  url.searchParams.set("page[limit]", "1");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    const err = new Error("Amadeus location lookup failed");
    err.status = res.status;
    err.details = data;
    throw err;
  }

  const first = Array.isArray(data.data) ? data.data[0] : null;
  const code = first?.iataCode;
  if (!code) {
    const err = new Error("Could not resolve location code");
    err.status = 400;
    err.details = { message: `No iataCode found for keyword: ${v}` };
    throw err;
  }
  return String(code).toUpperCase();
}

function durPretty(iso) {
  if (!iso) return "?";
  return String(iso).replace("PT", "").replace("H", "h ").replace("M", "m");
}

/**
 * Robust input getter:
 * - checks multiple aliases
 * - trims strings
 * - converts empty strings to ""
 */
function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = normalizeStr(v);
    if (s) return s;
  }
  return "";
}

exports.handler = async (event) => {
  const originHeader = event.headers?.origin;

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: { ...corsHeaders(originHeader), "cache-control": "no-store" }, body: "" };
  }

  const input = pickInput(event);
  const trip = input?.app_state?.trip || input?.trip || {};

  // Accept more aliases to prevent null input issues
  const fromRaw = firstNonEmpty(
    input.origin,
    input.from,
    input.originLocationCode,
    input.origin_location_code,
    trip.from,
    trip.origin,
    trip.originLocationCode,
    trip.origin_location_code
  );

  const toRaw = firstNonEmpty(
    input.destination,
    input.to,
    input.destinationLocationCode,
    input.destination_location_code,
    trip.to,
    trip.destination,
    trip.destinationLocationCode,
    trip.destination_location_code
  );

  const departureDate = firstNonEmpty(
    input.departureDate,
    input.departDate,
    input.departure_date,
    input.date,
    trip.depart_date,
    trip.departureDate,
    trip.departDate
  );

  const returnDate = firstNonEmpty(
    input.returnDate,
    input.return,
    input.return_date,
    trip.returnDate,
    trip.return_date
  );

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return json(
      500,
      {
        error: "Amadeus env vars not visible to this Function at runtime.",
        has_AMADEUS_CLIENT_ID: !!process.env.AMADEUS_CLIENT_ID,
        has_AMADEUS_CLIENT_SECRET: !!process.env.AMADEUS_CLIENT_SECRET,
      },
      corsHeaders(originHeader)
    );
  }

  // If still missing, return a more diagnostic 400 (shows keys present)
  if (!fromRaw || !toRaw || !departureDate) {
    const keys = Object.keys(input || {}).sort();
    return json(
      400,
      {
        error: "Missing required inputs. Send origin+destination+departureDate (YYYY-MM-DD). Aliases supported: from/to/departDate/date.",
        received: {
          origin: fromRaw || null,
          destination: toRaw || null,
          departureDate: departureDate || null,
          returnDate: returnDate || null,
        },
        debug: {
          method: event.httpMethod || null,
          hasBody: !!event.body,
          topLevelKeys: keys,
          sample: {
            origin: input?.origin ?? null,
            from: input?.from ?? null,
            destination: input?.destination ?? null,
            to: input?.to ?? null,
            departureDate: input?.departureDate ?? null,
            departDate: input?.departDate ?? null,
            date: input?.date ?? null,
            app_state_trip: input?.app_state?.trip ?? null,
          },
        },
      },
      corsHeaders(originHeader)
    );
  }

  try {
    const AMADEUS_BASE = String(process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com").replace(/\/$/, "");
    const accessToken = await getAmadeusToken(AMADEUS_BASE, clientId, clientSecret);

    const originCode = await resolveLocationCode(AMADEUS_BASE, accessToken, fromRaw);
    const destCode = await resolveLocationCode(AMADEUS_BASE, accessToken, toRaw);

    const { adults, children, infants } = parsePassengerCounts(input);
    const pets = parsePets(input);

    const url = new URL(`${AMADEUS_BASE}/v2/shopping/flight-offers`);
    url.searchParams.set("currencyCode", "USD");
    url.searchParams.set("originLocationCode", originCode);
    url.searchParams.set("destinationLocationCode", destCode);
    url.searchParams.set("departureDate", departureDate);
    if (returnDate) url.searchParams.set("returnDate", returnDate);
    url.searchParams.set("adults", String(adults));
    if (children > 0) url.searchParams.set("children", String(children));
    if (infants > 0) url.searchParams.set("infants", String(infants));
    url.searchParams.set("max", "50");

    const maxConnections = input?.app_state?.preferences?.max_connections;
    if (typeof maxConnections === "number") {
      if (maxConnections <= 0) url.searchParams.set("nonStop", "true");
      else url.searchParams.set("maxNumberOfConnections", String(maxConnections));
    }

    const offersRes = await fetch(url.toString(), { headers: { authorization: `Bearer ${accessToken}` } });
    const offersJson = await offersRes.json();

    if (!offersRes.ok) {
      return json(offersRes.status, { error: "Amadeus flight search failed", details: offersJson }, corsHeaders(originHeader));
    }

    const offers = Array.isArray(offersJson.data) ? offersJson.data : [];
    const stopCounts = offers.reduce((acc, o) => {
      const s = Math.max(0, (o?.itineraries?.[0]?.segments?.length || 1) - 1);
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const ranked = offers.slice(0, 5).map((offer, idx) => {
      const priceTotal = offer?.price?.total || null;
      const currency = offer?.price?.currency || null;
      const itin = offer?.itineraries?.[0];
      const segments = itin?.segments || [];
      const stops = Math.max(0, segments.length - 1);
      const firstSeg = segments[0];
      const lastSeg = segments[segments.length - 1];
      const carriers = offer?.validatingAirlineCodes || [];
      const carrier = carriers[0] || null;

      return {
        rank: idx + 1,
        highlight: idx === 0,
        label: `${stops === 0 ? "Nonstop" : `${stops} stop`}${priceTotal ? ` • ${currency} ${priceTotal}` : ""}`,
        summary: {
          from: originCode,
          to: destCode,
          depart_at: firstSeg?.departure?.at || "?",
          arrive_at: lastSeg?.arrival?.at || "?",
          duration: durPretty(itin?.duration),
          stops,
          carrier,
        },
      };
    });

    const notes = [
      `Source: Amadeus (${AMADEUS_BASE})`,
      `Passengers: adults=${adults}, children=${children}, infants=${infants}`,
      `Stops available: ${
        Object.keys(stopCounts)
          .sort((a, b) => Number(a) - Number(b))
          .map((k) => `${k} stop=${stopCounts[k]}`)
          .join(" | ") || "none"
      }`,
    ];

    if (pets.length > 0) {
      const total = pets.reduce((s, p) => s + (p.count || 0), 0);
      const hasService = pets.some((p) => p.type === "service_animal");
      const hasInCabin = pets.some((p) => p.type === "in_cabin" || p.type === "pet");
      const hasChecked = pets.some((p) => p.type === "checked");

      notes.push(`Animals: ${total} (${pets.map((p) => `${p.type}:${p.count}`).join(", ")})`);
      if (hasService) notes.push("Service animal: airline-specific policies/documentation apply. Confirm requirements with the airline before travel.");
      if (hasInCabin) notes.push("In-cabin pet: capacity/fees are airline-specific and limited per flight. After choosing an itinerary, add the pet with the airline (often by phone/chat) and avoid tight connections.");
      if (hasChecked) notes.push("Checked/hold pet: availability depends on aircraft, season, and airline rules. Verify directly with the airline before purchase when possible.");
    }

    return json(
      200,
      {
        type: "flight_results",
        version: "1.0",
        data: { ranked_options: ranked, notes },
        next_question: "",
      },
      corsHeaders(originHeader)
    );
  } catch (err) {
    console.error("planFlights error:", err);
    return json(
      err?.status || 500,
      { error: err?.message || "Server error in planFlights", details: err?.details || null },
      corsHeaders(originHeader)
    );
  }
};
