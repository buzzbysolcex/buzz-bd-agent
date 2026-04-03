export default async function handler(req: Request) {
  try {
    const { token_address, chain } = await req.json();
    const url = `${process.env.BUZZ_API_URL}/api/v1/score-token?address=${token_address}${chain ? '&chain=' + chain : ''}`;
    const res = await fetch(url, { headers: { 'X-API-Key': process.env.BUZZ_API_KEY } });
    if (!res.ok) return { error: `Upstream ${res.status}`, service: 'buzzbd.ai' };
    return await res.json();
  } catch (e) { return { error: 'Service temporarily unavailable', retry: true, service: 'buzzbd.ai' }; }
}
