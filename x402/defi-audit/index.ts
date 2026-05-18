export default async function handler(req: Request) {
  try {
    const { token_address } = await req.json();
    const res = await fetch(
      `${process.env.BUZZ_API_URL}/api/v1/audit/${token_address}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.BUZZ_API_KEY,
        },
        body: JSON.stringify({ tier: "standard" }),
      },
    );
    if (!res.ok)
      return { error: `Upstream ${res.status}`, service: "buzzbd.ai" };
    return await res.json();
  } catch (e) {
    return {
      error: "Service temporarily unavailable",
      retry: true,
      service: "buzzbd.ai",
    };
  }
}
