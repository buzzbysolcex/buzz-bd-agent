/**
 * Verification Rules — Day 32B Data Hardening
 * Hard-coded, non-negotiable rules for data integrity.
 */

const CONTRACT_RULES = {
  primaryKey: "contract_address",
  validation: {
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    bsc: /^0x[a-fA-F0-9]{40}$/,
    base: /^0x[a-fA-F0-9]{40}$/,
  },
  pumpFunDetection: (address) =>
    typeof address === "string" && address.toLowerCase().endsWith("pump"),
  nameAloneIsTrusted: false,
};

const FRESHNESS_RULES = {
  maxAge_seconds: 3600,
  mcapChangeThreshold: 0.5,
  liquidityChangeThreshold: 0.5,
  newTokenExtraChecks: true,
  newTokenMinAge_hours: 24,
  trendingNewPairFlag: true,
};

const CROSSREF_RULES = {
  nameMatchCaseSensitive: false,
  nameMatchExact: true,
  mcapTolerance: 0.2,
  missingCoinGecko: "UNVERIFIED",
  chainMismatch: "QUARANTINE",
};

const OUTPUT_RULES = {
  tweetRequiresVerification: true,
  simulationRequiresVerification: true,
  reportRequiresVerification: true,
  dmTemplateRequiresVerification: true,
  requiredFields: [
    "contract_address",
    "chain",
    "verification_timestamp",
    "data_sources",
  ],
  truncateContractInPublic: false,
  linkToExactPair: true,
};

function validateContractFormat(address, chain) {
  const pattern = CONTRACT_RULES.validation[chain];
  if (!pattern) return { valid: false, reason: `unsupported_chain: ${chain}` };
  return {
    valid: pattern.test(address),
    reason: pattern.test(address) ? null : `invalid_format_for_${chain}`,
  };
}

function isDataStale(verifiedAt) {
  if (!verifiedAt) return true;
  const age = (Date.now() - new Date(verifiedAt).getTime()) / 1000;
  return age > FRESHNESS_RULES.maxAge_seconds;
}

function checkMcapChange(oldMcap, newMcap) {
  if (!oldMcap || !newMcap) return { changed: false };
  const change = Math.abs(newMcap - oldMcap) / oldMcap;
  return {
    changed: change > FRESHNESS_RULES.mcapChangeThreshold,
    changePct: Math.round(change * 100),
  };
}

module.exports = {
  CONTRACT_RULES,
  FRESHNESS_RULES,
  CROSSREF_RULES,
  OUTPUT_RULES,
  validateContractFormat,
  isDataStale,
  checkMcapChange,
};
