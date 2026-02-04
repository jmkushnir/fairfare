exports.handler = async () => {
  try {
    const baseUrl = process.env.AMADEUS_BASE_URL || "https://test.api.amadeus.com";
    const id = process.env.AMADEUS_CLIENT_ID;
    const secret = process.env.AMADEUS_CLIENT_SECRET;

    if (!id || !secret) {
      return {
        statusCode: 500,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ error: "Missing env vars", needed: ["AMADEUS_CLIENT_ID","AMADEUS_CLIENT_SECRET"] }),
      };
    }

    const body = new URLSearchParams();
    body.append("grant_type", "client_credentials");
    body.append("client_id", id);
    body.append("client_secret", secret);

    const r = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = await r.json();
    return {
      statusCode: r.status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: String(e && e.message ? e.message : e) }),
    };
  }
};
