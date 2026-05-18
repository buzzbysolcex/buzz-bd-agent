/**
 * Triple Verification Service — Day 32B Data Hardening
 *
 * RULE: No data surfaces without 3 independent checks passing.
 *
 * Check 1: DexScreener API (contract address, never name)
 * Check 2: CoinGecko cross-reference (name + mcap match)
 * Check 3: Internal consistency (DB + chain + format)
 */

const { getDB } = require("../db");

const VERIFICATION_STATUS = {
  VERIFIED: "VERIFIED",
  QUARANTINED: "QUARANTINED",
  UNVERIFIED: "UNVERIFIED",
  STALE: "STALE",
};

// Hard-coded rules — non-negotiable
const CONTRACT_FORMAT = {
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  base: /^0x[a-fA-F0-9]{40}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
};

const MCAP_TOLERANCE = 0.2;
const MCAP_LIQUIDITY_SUSPICIOUS_RATIO = 25;
const MAX_AGE_SECONDS = 3600;
const NEW_TOKEN_MIN_HOURS = 24;

function isPumpFun(address) {
  return typeof address === "string" && address.toLowerCase().endsWith("pump");
}

async function fetchJSON(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ═══════ CHECK 1: DexScreener (source of truth) ═══════
async function verifyViaDexScreener(contractAddress, chain) {
  const result = { pass: false, data: null, warnings: [] };

  const data = await fetchJSON(
    `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`,
  );

  if (!data || !data.pairs || data.pairs.length === 0) {
    result.warnings.push("NOT_FOUND_ON_DEXSCREENER");
    return result;
  }

  // Filter pairs to requested chain
  const chainMap = {
    solana: "solana",
    base: "base",
    bsc: "bsc",
    ethereum: "ethereum",
  };
  const chainPairs = data.pairs.filter(
    (p) => p.chainId === (chainMap[chain] || chain),
  );

  if (chainPairs.length === 0) {
    result.warnings.push(`NO_PAIRS_ON_CHAIN_${chain.toUpperCase()}`);
    return result;
  }

  // Use pair with highest liquidity as primary
  const primary = chainPairs.sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
  )[0];

  const pairAge = primary.pairCreatedAt
    ? (Date.now() - primary.pairCreatedAt) / 3600000
    : null;

  const mcapLiqRatio =
    primary.liquidity?.usd > 0
      ? (primary.marketCap || 0) / primary.liquidity.usd
      : Infinity;

  result.data = {
    name: primary.baseToken?.name || null,
    symbol: primary.baseToken?.symbol || null,
    address: primary.baseToken?.address || contractAddress,
    mcap: primary.marketCap || null,
    liquidity: primary.liquidity?.usd || null,
    price: parseFloat(primary.priceUsd) || null,
    volume24h: primary.volume?.h24 || null,
    dexId: primary.dexId,
    pairCount: chainPairs.length,
    pairAgeHours: pairAge ? Math.round(pairAge * 10) / 10 : null,
    mcapLiquidityRatio: Math.round(mcapLiqRatio * 10) / 10,
    pairAddress: primary.pairAddress,
    url:
      primary.url || `https://dexscreener.com/${chain}/${primary.pairAddress}`,
  };

  // Warnings
  if (pairAge !== null && pairAge < NEW_TOKEN_MIN_HOURS) {
    result.warnings.push(`NEW_TOKEN_${Math.round(pairAge)}H_OLD`);
  }
  if (mcapLiqRatio > MCAP_LIQUIDITY_SUSPICIOUS_RATIO) {
    result.warnings.push(
      `SUSPICIOUS_MCAP_LIQ_RATIO_${mcapLiqRatio.toFixed(1)}x`,
    );
  }
  if (isPumpFun(contractAddress)) {
    result.warnings.push("PUMP_FUN_TOKEN");
  }
  if (primary.liquidity?.usd < 10000) {
    result.warnings.push("LOW_LIQUIDITY_UNDER_10K");
  }

  // Pass if we got data (warnings don't block check1, they inform check3)
  result.pass = true;
  return result;
}

// ═══════ CHECK 2: CoinGecko cross-reference ═══════
async function verifyViaCoinGecko(contractAddress, chain, dexData) {
  const result = { pass: false, data: null, warnings: [] };

  const platformMap = {
    solana: "solana",
    base: "base",
    bsc: "binance-smart-chain",
    ethereum: "ethereum",
  };
  const platform = platformMap[chain];
  if (!platform) {
    result.warnings.push("UNSUPPORTED_CHAIN_FOR_COINGECKO");
    return result;
  }

  // Try 1: Exact contract address lookup
  let data = await fetchJSON(
    `https://api.coingecko.com/api/v3/coins/${platform}/contract/${contractAddress}`,
  );

  // Try 2: If contract lookup fails, search by symbol/name (flexible matching)
  if ((!data || data.error) && dexData?.data?.symbol) {
    const symbol = (dexData.data.symbol || "").toLowerCase();
    const searchData = await fetchJSON(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
    );

    if (searchData?.coins?.length > 0) {
      // Find matching coin by symbol, preferring exact symbol match
      const match = searchData.coins.find(
        (c) => c.symbol?.toLowerCase() === symbol,
      );

      if (match) {
        // Fetch full coin data to get mcap for comparison
        const coinData = await fetchJSON(
          `https://api.coingecko.com/api/v3/coins/${match.id}?localization=false&tickers=false&community_data=false&developer_data=false`,
        );

        if (coinData && !coinData.error) {
          const cgMcap = coinData.market_data?.market_cap?.usd || 0;
          const dexMcap = dexData?.data?.mcap || 0;

          // Verify mcap within 30% tolerance (wider for symbol-based match)
          const mcapMatch =
            dexMcap > 0 && cgMcap > 0
              ? Math.abs(cgMcap - dexMcap) / Math.max(cgMcap, dexMcap) < 0.3
              : false;

          if (mcapMatch) {
            data = coinData;
            result.warnings.push("VERIFIED_BY_SYMBOL_MATCH");
          } else if (cgMcap > 0) {
            result.warnings.push(
              `SYMBOL_MATCH_MCAP_MISMATCH: cg=$${Math.round(cgMcap)} dex=$${Math.round(dexMcap)}`,
            );
          }
        }
      }
    }
  }

  if (!data || data.error) {
    result.warnings.push("NOT_ON_COINGECKO");
    return result;
  }

  result.data = {
    name: data.name || null,
    symbol: (data.symbol || "").toUpperCase(),
    mcap: data.market_data?.market_cap?.usd || null,
    totalVolume: data.market_data?.total_volume?.usd || null,
    coingeckoId: data.id,
    url: `https://www.coingecko.com/en/coins/${data.id}`,
  };

  result.pass = true;
  return result;
}

// ═══════ CHECK 3: Internal consistency ═══════
async function verifyInternalConsistency(
  contractAddress,
  chain,
  dexData,
  cgData,
) {
  const db = getDB();
  const result = { pass: true, data: null, warnings: [] };

  // 3a: Validate contract format matches chain
  const format = CONTRACT_FORMAT[chain];
  if (format && !format.test(contractAddress)) {
    result.pass = false;
    result.warnings.push(`CONTRACT_FORMAT_INVALID_FOR_${chain.toUpperCase()}`);
    return result;
  }

  // 3b: Cross-reference names between DexScreener and CoinGecko
  if (dexData?.data?.name && cgData?.data?.name) {
    const dexName = (dexData.data.name || "").toLowerCase().trim();
    const cgName = (cgData.data.name || "").toLowerCase().trim();
    if (dexName !== cgName) {
      // Allow partial match (one contains the other)
      if (!dexName.includes(cgName) && !cgName.includes(dexName)) {
        result.pass = false;
        result.warnings.push(
          `NAME_MISMATCH: dexscreener="${dexData.data.name}" coingecko="${cgData.data.name}"`,
        );
      }
    }
  }

  // 3c: Cross-reference mcap between sources
  if (dexData?.data?.mcap && cgData?.data?.mcap) {
    const ratio =
      Math.abs(dexData.data.mcap - cgData.data.mcap) /
      Math.max(dexData.data.mcap, cgData.data.mcap);
    if (ratio > MCAP_TOLERANCE) {
      result.pass = false;
      result.warnings.push(
        `MCAP_DIVERGENCE_${Math.round(ratio * 100)}%: dex=$${Math.round(dexData.data.mcap)} cg=$${Math.round(cgData.data.mcap)}`,
      );
    }
  }

  // 3d: Check internal DB for existing data
  let existing = null;
  try {
    existing = db
      .prepare(
        "SELECT * FROM verified_snapshots WHERE contract_address = ? AND chain = ?",
      )
      .get(contractAddress, chain);
  } catch {
    /* table may not exist yet */
  }

  if (existing) {
    result.data = { previousSnapshot: existing };
    // Check if mcap changed >50% since last verification
    if (existing.mcap && dexData?.data?.mcap) {
      const change =
        Math.abs(dexData.data.mcap - existing.mcap) / existing.mcap;
      if (change > 0.5) {
        result.warnings.push(
          `MCAP_CHANGED_${Math.round(change * 100)}%_SINCE_LAST_VERIFY`,
        );
      }
    }
    // Check if name changed
    if (existing.token_name && dexData?.data?.name) {
      if (
        existing.token_name.toLowerCase() !== dexData.data.name.toLowerCase()
      ) {
        result.pass = false;
        result.warnings.push(
          `NAME_CHANGED: was="${existing.token_name}" now="${dexData.data.name}"`,
        );
      }
    }
  }

  // 3e: Pump.fun flag
  if (isPumpFun(contractAddress)) {
    result.warnings.push("PUMP_FUN_TOKEN_DETECTED");
  }

  // 3f: Suspicious mcap/liquidity ratio
  if (dexData?.data?.mcapLiquidityRatio > MCAP_LIQUIDITY_SUSPICIOUS_RATIO) {
    result.warnings.push(
      `MCAP_LIQ_RATIO_SUSPICIOUS_${dexData.data.mcapLiquidityRatio}x`,
    );
  }

  return result;
}

// ═══════ MAIN: Triple Verification ═══════
async function verifyToken(contractAddress, chain) {
  const now = new Date().toISOString();

  const results = {
    contract_address: contractAddress,
    chain,
    check1_dexscreener: null,
    check2_crossref: null,
    check3_consistency: null,
    overall: VERIFICATION_STATUS.QUARANTINED,
    mismatches: [],
    verified_at: now,
    evidence: {},
  };

  // CHECK 1: DexScreener
  results.check1_dexscreener = await verifyViaDexScreener(
    contractAddress,
    chain,
  );
  results.evidence.dexscreener = results.check1_dexscreener.data;

  // CHECK 2: CoinGecko (pass dexData for symbol-based fallback)
  results.check2_crossref = await verifyViaCoinGecko(
    contractAddress,
    chain,
    results.check1_dexscreener,
  );
  results.evidence.coingecko = results.check2_crossref.data;

  // CHECK 3: Internal consistency (needs check1 + check2 data)
  results.check3_consistency = await verifyInternalConsistency(
    contractAddress,
    chain,
    results.check1_dexscreener,
    results.check2_crossref,
  );

  // Collect all mismatches
  const allWarnings = [
    ...results.check1_dexscreener.warnings,
    ...results.check2_crossref.warnings,
    ...results.check3_consistency.warnings,
  ];
  results.mismatches = allWarnings;

  // Determine overall status
  const c1 = results.check1_dexscreener.pass;
  const c2 = results.check2_crossref.pass;
  const c3 = results.check3_consistency.pass;

  if (c1 && c2 && c3) {
    results.overall = VERIFICATION_STATUS.VERIFIED;
  } else if (!c1) {
    results.overall = VERIFICATION_STATUS.QUARANTINED;
  } else if (!c2 && c1 && c3) {
    results.overall = VERIFICATION_STATUS.UNVERIFIED;
  } else {
    results.overall = VERIFICATION_STATUS.QUARANTINED;
  }

  // Persist to DB
  await logVerification(results);

  // If VERIFIED, save snapshot
  if (
    results.overall === VERIFICATION_STATUS.VERIFIED &&
    results.check1_dexscreener.data
  ) {
    await saveSnapshot(contractAddress, chain, results);
  }

  // If QUARANTINED, add to quarantine table
  if (results.overall === VERIFICATION_STATUS.QUARANTINED) {
    await quarantineToken(
      contractAddress,
      chain,
      results.check1_dexscreener.data?.name,
      results.check1_dexscreener.data?.symbol,
      allWarnings.join("; "),
    );
  }

  return results;
}

async function logVerification(results) {
  try {
    const db = getDB();
    db.prepare(
      `
      INSERT INTO verification_log (
        contract_address, chain, token_name, token_symbol,
        check1_pass, check1_data, check2_pass, check2_data,
        check3_pass, check3_data, overall_status, mismatches,
        evidence, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      results.contract_address,
      results.chain,
      results.check1_dexscreener?.data?.name || null,
      results.check1_dexscreener?.data?.symbol || null,
      results.check1_dexscreener?.pass ? 1 : 0,
      JSON.stringify(results.check1_dexscreener),
      results.check2_crossref?.pass ? 1 : 0,
      JSON.stringify(results.check2_crossref),
      results.check3_consistency?.pass ? 1 : 0,
      JSON.stringify(results.check3_consistency),
      results.overall,
      JSON.stringify(results.mismatches),
      JSON.stringify(results.evidence),
      results.verified_at,
    );
  } catch (e) {
    console.error("[data-verifier] Failed to log verification:", e.message);
  }
}

async function saveSnapshot(contractAddress, chain, results) {
  try {
    const db = getDB();
    const d = results.check1_dexscreener.data;
    const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000)
      .toISOString()
      .replace("T", " ")
      .replace("Z", "");

    db.prepare(
      `
      INSERT INTO verified_snapshots (
        contract_address, chain, token_name, token_symbol,
        mcap, liquidity, dex_count, pair_age_hours, price_usd,
        volume_24h, mcap_liquidity_ratio, is_pump_fun,
        dexscreener_url, coingecko_url, verified_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(contract_address, chain) DO UPDATE SET
        token_name = excluded.token_name, token_symbol = excluded.token_symbol,
        mcap = excluded.mcap, liquidity = excluded.liquidity,
        dex_count = excluded.dex_count, pair_age_hours = excluded.pair_age_hours,
        price_usd = excluded.price_usd, volume_24h = excluded.volume_24h,
        mcap_liquidity_ratio = excluded.mcap_liquidity_ratio,
        dexscreener_url = excluded.dexscreener_url,
        coingecko_url = excluded.coingecko_url,
        verified_at = excluded.verified_at, expires_at = excluded.expires_at
    `,
    ).run(
      contractAddress,
      chain,
      d.name,
      d.symbol,
      d.mcap,
      d.liquidity,
      d.pairCount,
      d.pairAgeHours,
      d.price,
      d.volume24h,
      d.mcapLiquidityRatio,
      isPumpFun(contractAddress) ? 1 : 0,
      d.url,
      results.check2_crossref?.data?.url || null,
      results.verified_at.replace("T", " ").replace("Z", ""),
      expiresAt,
    );
  } catch (e) {
    console.error("[data-verifier] Failed to save snapshot:", e.message);
  }
}

async function quarantineToken(contractAddress, chain, name, symbol, reason) {
  try {
    const db = getDB();
    db.prepare(
      `
      INSERT INTO quarantined_tokens (contract_address, chain, token_name, token_symbol, reason, quarantined_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(contract_address, chain) DO UPDATE SET
        reason = excluded.reason, quarantined_at = excluded.quarantined_at,
        resolved_at = NULL, resolved_by = NULL
    `,
    ).run(contractAddress, chain, name || null, symbol || null, reason);
  } catch (e) {
    console.error("[data-verifier] Failed to quarantine:", e.message);
  }
}

// Check if a token is currently verified (snapshot exists and not expired)
function isVerified(contractAddress, chain) {
  try {
    const db = getDB();
    const snapshot = db
      .prepare(
        "SELECT * FROM verified_snapshots WHERE contract_address = ? AND chain = ? AND expires_at > datetime('now')",
      )
      .get(contractAddress, chain);
    return snapshot ? { verified: true, snapshot } : { verified: false };
  } catch {
    return { verified: false };
  }
}

// Check if a token is quarantined
function isQuarantined(contractAddress, chain) {
  try {
    const db = getDB();
    const q = db
      .prepare(
        "SELECT * FROM quarantined_tokens WHERE contract_address = ? AND chain = ? AND resolved_at IS NULL",
      )
      .get(contractAddress, chain);
    return q ? { quarantined: true, reason: q.reason } : { quarantined: false };
  } catch {
    return { quarantined: false };
  }
}

// Resolve a quarantine (admin action)
function resolveQuarantine(contractAddress, chain, resolvedBy) {
  const db = getDB();
  return db
    .prepare(
      "UPDATE quarantined_tokens SET resolved_at = datetime('now'), resolved_by = ? WHERE contract_address = ? AND chain = ? AND resolved_at IS NULL",
    )
    .run(resolvedBy, contractAddress, chain);
}

// Get verification stats
function getVerificationStats() {
  const db = getDB();
  const total = db
    .prepare("SELECT COUNT(*) as c FROM verification_log")
    .get().c;
  const verified = db
    .prepare(
      "SELECT COUNT(*) as c FROM verification_log WHERE overall_status = 'VERIFIED'",
    )
    .get().c;
  const quarantined = db
    .prepare(
      "SELECT COUNT(*) as c FROM verification_log WHERE overall_status = 'QUARANTINED'",
    )
    .get().c;
  const unverified = db
    .prepare(
      "SELECT COUNT(*) as c FROM verification_log WHERE overall_status = 'UNVERIFIED'",
    )
    .get().c;
  const activeQuarantines = db
    .prepare(
      "SELECT COUNT(*) as c FROM quarantined_tokens WHERE resolved_at IS NULL",
    )
    .get().c;
  const activeSnapshots = db
    .prepare(
      "SELECT COUNT(*) as c FROM verified_snapshots WHERE expires_at > datetime('now')",
    )
    .get().c;

  return {
    total_checks: total,
    verified,
    quarantined,
    unverified,
    active_quarantines: activeQuarantines,
    active_snapshots: activeSnapshots,
    pass_rate: total > 0 ? Math.round((verified / total) * 100) : 0,
  };
}

module.exports = {
  verifyToken,
  isVerified,
  isQuarantined,
  resolveQuarantine,
  getVerificationStats,
  isPumpFun,
  VERIFICATION_STATUS,
  MAX_AGE_SECONDS,
  // Exposed for testing
  verifyViaDexScreener,
  verifyViaCoinGecko,
  verifyInternalConsistency,
};
