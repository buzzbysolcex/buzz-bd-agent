/**
 * Nansen CLI Enrichment Service — Intel Source #17
 * Uses nansen-cli for smart money analysis
 * Credit-aware: stops all calls on CREDITS_EXHAUSTED
 */

const { execSync } = require("child_process");
const { getDB } = require("../db");

let creditsExhausted = false;
const NANSEN_KEY = () => process.env.NANSEN_API_KEY || "";

function nansenCmd(args) {
  if (creditsExhausted) return { error: "CREDITS_EXHAUSTED" };
  if (!NANSEN_KEY()) return { error: "NANSEN_API_KEY not set" };
  
  try {
    const cmd = `nansen ${args} --api-key ${NANSEN_KEY()} --output json`;
    const result = execSync(cmd, { timeout: 30000, encoding: "utf8" });
    return JSON.parse(result);
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("CREDITS_EXHAUSTED") || msg.includes("credits")) {
      creditsExhausted = true;
      console.error("[nansen] CREDITS EXHAUSTED — all calls stopped");
      return { error: "CREDITS_EXHAUSTED" };
    }
    if (msg.includes("UNAUTHORIZED") || msg.includes("401")) {
      console.error("[nansen] Unauthorized — check API key");
      return { error: "UNAUTHORIZED" };
    }
    console.error("[nansen] Error:", msg.slice(0, 200));
    return { error: msg.slice(0, 200) };
  }
}

async function getSmartMoney(chain = "solana") {
  return nansenCmd(`smart-money --chain ${chain} --fields address,label,netflow_7d,token_count`);
}

async function getTokenHolders(address, chain = "solana") {
  return nansenCmd(`token holders ${address} --chain ${chain} --fields address,label,balance,pct`);
}

async function getWalletProfile(address, chain = "solana") {
  return nansenCmd(`wallet profile ${address} --chain ${chain} --fields label,pnl_30d,tokens_held,first_seen`);
}

async function enrichToken(address, chain = "solana") {
  const db = getDB();
  
  const existing = db.prepare(
    "SELECT * FROM nansen_enrichments WHERE token_address = ? AND chain = ? AND enriched_at > datetime(now, -2 hours)"
  ).get(address, chain);
  if (existing) return { cached: true, data: existing };
  
  const holders = await getTokenHolders(address, chain);
  if (holders.error) return holders;
  
  const holderList = holders.data || holders.holders || [];
  const smartMoneyCount = holderList.filter(h => h.label && h.label !== "unknown").length;
  const whaleHolders = holderList.filter(h => parseFloat(h.pct || 0) > 1).length;
  const top10Pct = holderList.slice(0, 10).reduce((sum, h) => sum + parseFloat(h.pct || 0), 0);
  const labels = holderList.filter(h => h.label && h.label !== "unknown").map(h => h.label);
  const netflow = holderList.reduce((sum, h) => sum + (parseFloat(h.netflow_7d || 0)), 0);
  
  const enrichment = {
    token_address: address,
    chain,
    smart_money_netflow: netflow,
    smart_money_count: smartMoneyCount,
    whale_holders: whaleHolders,
    top10_concentration: Math.round(top10Pct * 100) / 100,
    nansen_labels: JSON.stringify(labels),
    raw_json: JSON.stringify(holders).slice(0, 10000)
  };
  
  db.prepare(`
    INSERT INTO nansen_enrichments (token_address, chain, smart_money_netflow, smart_money_count,
      whale_holders, top10_concentration, nansen_labels, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(token_address, chain) DO UPDATE SET
      smart_money_netflow=excluded.smart_money_netflow,
      smart_money_count=excluded.smart_money_count,
      whale_holders=excluded.whale_holders,
      top10_concentration=excluded.top10_concentration,
      nansen_labels=excluded.nansen_labels,
      raw_json=excluded.raw_json,
      enriched_at=datetime(now)
  `).run(
    enrichment.token_address, enrichment.chain,
    enrichment.smart_money_netflow, enrichment.smart_money_count,
    enrichment.whale_holders, enrichment.top10_concentration,
    enrichment.nansen_labels, enrichment.raw_json
  );
  
  return { cached: false, data: enrichment };
}

function getScorerSignals(enrichment) {
  const signals = [];
  if (!enrichment || enrichment.error) return signals;
  
  const d = enrichment.data || enrichment;
  
  if (d.smart_money_netflow > 100000)
    signals.push({ name: "NANSEN_SMART_MONEY_INFLOW", impact: 8, detail: `Net inflow $${Math.round(d.smart_money_netflow).toLocaleString()}` });
  if (d.smart_money_netflow < -50000)
    signals.push({ name: "NANSEN_SMART_MONEY_OUTFLOW", impact: -10, detail: `Net outflow $${Math.round(Math.abs(d.smart_money_netflow)).toLocaleString()}` });
  if (d.smart_money_count >= 3)
    signals.push({ name: "NANSEN_WHALE_ACCUMULATION", impact: 5, detail: `${d.smart_money_count} smart money wallets holding` });
  if (d.top10_concentration > 60)
    signals.push({ name: "NANSEN_HIGH_CONCENTRATION", impact: -5, detail: `Top 10 hold ${d.top10_concentration}%` });
  
  const labels = JSON.parse(d.nansen_labels || "[]");
  if (labels.some(l => /fund|venture|capital|vc/i.test(l)))
    signals.push({ name: "NANSEN_LABELED_FUND", impact: 5, detail: `VC/fund detected: ${labels.filter(l => /fund|venture|capital|vc/i.test(l)).join(", ")}` });
  
  return signals;
}

function getStatus() {
  return {
    configured: !!NANSEN_KEY(),
    creditsExhausted,
    apiKeySet: !!NANSEN_KEY()
  };
}

module.exports = { getSmartMoney, getTokenHolders, getWalletProfile, enrichToken, getScorerSignals, getStatus };
