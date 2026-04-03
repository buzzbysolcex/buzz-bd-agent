export default async function handler(req: Request) {
  try {
    const { wallet_address } = await req.json();
    const res = await fetch(`${process.env.BUZZ_API_URL}/api/v1/portfolio/${wallet_address}`, { headers: { 'X-API-Key': process.env.BUZZ_API_KEY } });
    if (!res.ok) return { error: `Upstream ${res.status}`, service: 'buzzbd.ai' };
    return await res.json();
  } catch (e) { return { error: 'Service temporarily unavailable', retry: true, service: 'buzzbd.ai' }; }
}
