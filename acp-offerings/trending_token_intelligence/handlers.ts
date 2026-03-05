import type { ExecuteJobResult } from "../../../runtime/offeringTypes.js";

export async function executeJob(request: Record<string, any>): Promise<ExecuteJobResult> {
  const chain = request.chain || "solana";
  const limit = request.limit || 5;
  
  const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1");
  const tokens = await res.json();
  const filtered = (tokens as any[]).filter((t: any) => t.chainId === chain).slice(0, limit);
  
  const results = [];
  for (const t of filtered) {
    try {
      const scoreRes = await fetch("http://localhost:3000/api/v1/score-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": process.env.BUZZ_API_ADMIN_KEY || "" },
        body: JSON.stringify({ address: t.tokenAddress, chain })
      });
      const score = await scoreRes.json();
      results.push({ address: t.tokenAddress, score: score.score?.total, verdict: score.score?.verdict });
    } catch { results.push({ address: t.tokenAddress, error: "scoring failed" }); }
  }
  return { deliverable: JSON.stringify({ chain, tokens_scanned: results.length, results }) };
}
