export default async function handler(req: Request) {
  try {
    const { token_address, agents = 1000, rounds = 10 } = await req.json();
    const res = await fetch(`${process.env.BUZZ_API_URL}/api/v1/simulate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.BUZZ_API_KEY },
      body: JSON.stringify({ address: token_address, agents: Math.min(agents, 1000), rounds })
    });
    if (!res.ok) return { error: `Upstream ${res.status}`, service: 'buzzbd.ai' };
    return await res.json();
  } catch (e) { return { error: 'Service temporarily unavailable', retry: true, service: 'buzzbd.ai' }; }
}
