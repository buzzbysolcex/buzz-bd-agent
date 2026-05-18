export default async function handler(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${process.env.BUZZ_API_URL}/api/v1/alerts/price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.BUZZ_API_KEY,
      },
      body: JSON.stringify(body),
    });
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
