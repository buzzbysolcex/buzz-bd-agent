/**
 * Stacks SIP-010 Token Scanner — BuzzShield Extension
 * Enables scanning of Stacks fungible tokens (SIP-010 standard)
 * Data sources: Hiro API (metadata + balances), DexScreener (pricing)
 * Addresses publisher feedback: "Stacks returns unsupported_chain"
 * Feature flag: STACKS_SIP010_SCANNING
 */

const HIRO_API = "https://api.hiro.so";

/**
 * Fetch SIP-010 token metadata from Hiro API
 */
async function getTokenMetadata(contractId) {
  try {
    const res = await fetch(`${HIRO_API}/metadata/v1/ft/${contractId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch token holder count from Hiro API
 */
async function getHolderCount(contractId) {
  try {
    const res = await fetch(
      `${HIRO_API}/extended/v1/tokens/ft/${contractId}/holders?limit=1`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data.total || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch contract info from Hiro API (verification, source)
 */
async function getContractInfo(contractId) {
  try {
    const res = await fetch(`${HIRO_API}/extended/v1/contract/${contractId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch pricing data from DexScreener (Stacks pairs)
 */
async function getDexScreenerData(contractId) {
  try {
    // DexScreener uses the contract principal for Stacks tokens
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractId}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.pairs?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Full SIP-010 token scan — returns BuzzShield-compatible scan result
 */
async function scanSIP010Token(contractId) {
  const [metadata, holders, contractInfo, dexData] = await Promise.all([
    getTokenMetadata(contractId),
    getHolderCount(contractId),
    getContractInfo(contractId),
    getDexScreenerData(contractId),
  ]);

  const result = {
    chain: "stacks",
    chain_id: "stacks-mainnet",
    token_standard: "SIP-010",
    contract_id: contractId,
    metadata: {
      name: metadata?.name || "Unknown",
      symbol: metadata?.symbol || "???",
      decimals: metadata?.decimals || 0,
      total_supply: metadata?.total_supply || "0",
      description: metadata?.description || "",
      image: metadata?.image_uri || metadata?.image_canonical_uri || null,
      token_uri: metadata?.token_uri || null,
    },
    contract: {
      verified: !!contractInfo?.source_code,
      has_source: !!contractInfo?.source_code,
      deployer: contractInfo?.sender_address || null,
      block_height: contractInfo?.block_height || null,
      tx_id: contractInfo?.tx_id || null,
    },
    market: {
      price_usd: dexData ? parseFloat(dexData.priceUsd || 0) : null,
      volume_24h: dexData ? parseFloat(dexData.volume?.h24 || 0) : null,
      liquidity_usd: dexData ? parseFloat(dexData.liquidity?.usd || 0) : null,
      market_cap: dexData ? parseFloat(dexData.marketCap || 0) : null,
      fdv: dexData ? parseFloat(dexData.fdv || 0) : null,
      price_change_24h: dexData
        ? parseFloat(dexData.priceChange?.h24 || 0)
        : null,
      buys_24h: dexData ? parseInt(dexData.txns?.h24?.buys || 0) : null,
      sells_24h: dexData ? parseInt(dexData.txns?.h24?.sells || 0) : null,
      dex: dexData?.dexId || null,
      pair_address: dexData?.pairAddress || null,
    },
    holders: {
      total: holders,
    },
    safety: {
      has_source_code: !!contractInfo?.source_code,
      deployer_address: contractInfo?.sender_address || null,
      // SIP-010 safety checks
      checks: [],
    },
    scan_timestamp: new Date().toISOString(),
    data_sources: ["hiro-api", "dexscreener"],
  };

  // SIP-010 specific safety checks
  if (contractInfo?.source_code) {
    const src = contractInfo.source_code;
    result.safety.checks.push({
      check: "has_mint_function",
      passed: !src.includes("ft-mint?"),
      detail: src.includes("ft-mint?")
        ? "Contract has ft-mint? function — minting possible"
        : "No ft-mint? function found — supply is fixed",
      severity: src.includes("ft-mint?") ? "medium" : "pass",
    });
    result.safety.checks.push({
      check: "has_burn_function",
      passed: true, // burns are generally positive
      detail: src.includes("ft-burn?")
        ? "Contract has ft-burn? — deflationary capability"
        : "No ft-burn? function",
      severity: "info",
    });
    result.safety.checks.push({
      check: "has_transfer_restriction",
      passed: !src.includes("block-height"),
      detail:
        src.includes("block-height") && src.includes("ft-transfer?")
          ? "Transfer function references block-height — possible time lock"
          : "No transfer restrictions detected",
      severity:
        src.includes("block-height") && src.includes("ft-transfer?")
          ? "low"
          : "pass",
    });
    result.safety.checks.push({
      check: "contract_verified",
      passed: true,
      detail: "Source code available on Hiro explorer",
      severity: "pass",
    });
  } else {
    result.safety.checks.push({
      check: "contract_verified",
      passed: false,
      detail: "No source code available — cannot verify contract safety",
      severity: "high",
    });
  }

  // Calculate a basic safety score
  const passedChecks = result.safety.checks.filter(
    (c) => c.passed || c.severity === "pass" || c.severity === "info",
  ).length;
  result.safety.score = Math.round(
    (passedChecks / Math.max(result.safety.checks.length, 1)) * 100,
  );

  return result;
}

module.exports = {
  scanSIP010Token,
  getTokenMetadata,
  getHolderCount,
  getContractInfo,
  getDexScreenerData,
};
