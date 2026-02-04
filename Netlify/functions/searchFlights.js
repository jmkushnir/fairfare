export default async (req, context) => {
  try {
    const params = req.queryStringParameters || {};
    const from = params.from;
    const to = params.to;
    const depart = params.depart;
    const ret = params.ret;
    const adults = params.adults || "1";

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({
        error: "Missing server env vars",
        needed: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"]
      }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    if (!from || !to || !depart) {
      return new Response(JSON.stringify({
        error: "Missing query params",
        example: "/.netlify/functions/searchFlights?from=ATL&to=DEN&depart=2026-02-16&ret=2026-02-20&adults=1"
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Token (Amadeus TEST endpoint example)
    const tokenRes = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({
        error: "Token request failed",
        status: tokenRes.status,
        details: tokenJson
      }), { status: tokenRes.status, headers: { "Content-Type": "application/json" } });
    }

    const accessToken = tokenJson.access_token;

    const flightsUrl = new URL("https://test.api.amadeus.com/v2/shopping/flight-offers");
    flightsUrl.searchParams.set("originLocationCode", from);
    flightsUrl.searchParams.set("destinationLocationCode", to);
    flightsUrl.searchParams.set("departureDate", depart);
    if (ret) flightsUrl.searchParams.set("returnDate", ret);
    flightsUrl.searchParams.set("adults", adults);
    flightsUrl.searchParams.set("max", "20");

    const flightsRes = await fetch(flightsUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const flightsJson = await flightsRes.json();
    return new Response(JSON.stringify(flightsJson), {
      status: flightsRes.status,
      headers: { "Content-Type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Unhandled exception", message: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
