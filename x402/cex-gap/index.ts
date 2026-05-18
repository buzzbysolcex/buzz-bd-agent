export default async function handler(req: Request) {
  try {
    const { symbol } = await req.json();
    const res = await fetch(
      `${process.env.BUZZ_API_URL}/api/v1/cex-gap/${symbol}`,
      { headers: { "X-API-Key": process.env.BUZZ_API_KEY } },
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
