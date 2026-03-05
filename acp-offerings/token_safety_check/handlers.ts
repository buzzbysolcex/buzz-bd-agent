import type { ExecuteJobResult } from "../../../runtime/offeringTypes.js";

export async function executeJob(request: Record<string, any>): Promise<ExecuteJobResult> {
  const address = request.address || request.token_address || request.ca;
  const chain = request.chain || "solana";
  if (!address) return { deliverable: JSON.stringify({ error: "address required" }) };
  
  const res = await fetch("http://localhost:3000/api/v1/score-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": process.env.BUZZ_API_ADMIN_KEY || "" },
    body: JSON.stringify({ address, chain })
  });
  const data = await res.json();
  const safety = data.sub_agents?.safety || {};
  return { deliverable: JSON.stringify({
    address, chain,
    safety_score: safety.score || 0,
    safety_status: safety.status || "unknown",
    safety_data: safety.data || {},
    overall_score: data.score?.total || 0,
    verdict: data.score?.verdict || "UNKNOWN"
  })};
}
