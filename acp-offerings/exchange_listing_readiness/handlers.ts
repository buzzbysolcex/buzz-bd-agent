import type { ExecuteJobResult } from "../../../runtime/offeringTypes.js";

export async function executeJob(request: Record<string, any>): Promise<ExecuteJobResult> {
  const address = request.address || request.token_address || request.ca;
  const chain = request.chain || "solana";
  if (!address) return { deliverable: JSON.stringify({ error: "address required" }) };
  
  const res = await fetch("http://localhost:3000/api/v1/score-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.BUZZ_API_ADMIN_KEY || "" },
    body: JSON.stringify({ address, chain, depth: "deep" })
  });
  const data = await res.json();
  const score = data.score?.total || 0;
  return { deliverable: JSON.stringify({
    address, chain, score,
    verdict: data.score?.verdict || "UNKNOWN",
    listing_ready: score >= 70,
    recommendation: score >= 85 ? "STRONG BUY — immediate listing candidate"
      : score >= 70 ? "QUALIFIED — proceed with listing review"
      : score >= 50 ? "WATCHLIST — needs improvement"
      : "NOT READY — does not meet criteria",
    breakdown: data.score?.breakdown || {},
    token: data.token || {}
  })};
}
