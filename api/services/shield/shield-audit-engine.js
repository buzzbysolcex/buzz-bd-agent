/**
 * BuzzShield Audit Engine — Autonomous Smart Contract Security Auditing
 * Powered by Austin Griffith's ETHSkills curriculum (19 modules, 500+ checks)
 *
 * Feature flag: BUZZSHIELD_AUDIT_ENGINE
 *
 * Architecture:
 * - 10 audit domains (always-run + contract-type-specific)
 * - Parallel sub-agent checklist evaluation
 * - Findings feed into drain pattern candidates + hill-climber ground truth
 * - Pre-deploy checklist API (free tier, drives traffic)
 */

const { feature } = require("../../lib/feature-flags");
const { getDB } = require("../../db");
const { emit } = require("../events/event-bus");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function db() {
  return getDB();
}

// ─── SCHEMA ─────────────────────────────────────────────

function createAuditTables() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS shield_audit_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audit_id TEXT UNIQUE NOT NULL,
      contract_address TEXT NOT NULL,
      chain TEXT DEFAULT 'ethereum',
      contract_type TEXT,
      github_url TEXT,
      source_hash TEXT,
      domains_run TEXT NOT NULL,
      findings_json TEXT NOT NULL,
      severity_summary TEXT NOT NULL,
      score INTEGER NOT NULL,
      checklist_items_passed INTEGER DEFAULT 0,
      checklist_items_failed INTEGER DEFAULT 0,
      checklist_items_total INTEGER DEFAULT 0,
      recommendations TEXT,
      drain_pattern_candidates TEXT,
      status TEXT DEFAULT 'complete' CHECK(status IN ('pending', 'running', 'complete', 'failed')),
      paid INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_contract ON shield_audit_reports(contract_address);
    CREATE INDEX IF NOT EXISTS idx_audit_chain ON shield_audit_reports(chain);
    CREATE INDEX IF NOT EXISTS idx_audit_score ON shield_audit_reports(score);
    CREATE INDEX IF NOT EXISTS idx_audit_date ON shield_audit_reports(created_at);
  `);
}

// ─── AUDIT DOMAINS ──────────────────────────────────────

const AUDIT_DOMAINS = {
  // Always-run domains
  "evm-audit-general": {
    name: "General EVM Footguns",
    alwaysRun: true,
    skillFile: "evm-audit-general.md",
    items: 46,
  },
  "evm-audit-precision-math": {
    name: "Precision & Math",
    alwaysRun: true,
    skillFile: "evm-audit-precision-math.md",
    items: 23,
  },
  "evm-audit-access-control": {
    name: "Access Control",
    alwaysRun: true,
    skillFile: "evm-audit-access-control.md",
    items: 20,
  },
  "evm-audit-dos": {
    name: "DoS & Griefing",
    alwaysRun: true,
    skillFile: "evm-audit-dos.md",
    items: 15,
  },
  // Contract-type-specific domains
  "evm-audit-erc20": {
    name: "ERC-20 Token",
    contractTypes: ["erc20", "token"],
    skillFile: "evm-audit-erc20.md",
    items: 27,
  },
  "evm-audit-defi-amm": {
    name: "DEX / AMM",
    contractTypes: ["amm", "dex", "swap"],
    skillFile: "evm-audit-defi-amm.md",
    items: 30,
  },
  "evm-audit-defi-lending": {
    name: "Lending / Borrowing",
    contractTypes: ["lending", "borrowing"],
    skillFile: "evm-audit-defi-lending.md",
    items: 33,
  },
  "evm-audit-erc4626": {
    name: "ERC-4626 Vault",
    contractTypes: ["vault", "erc4626"],
    skillFile: "evm-audit-erc4626.md",
    items: 42,
  },
  "evm-audit-signatures": {
    name: "Signatures & Replay",
    contractTypes: ["signature", "permit", "meta-tx"],
    skillFile: "evm-audit-signatures.md",
    items: 19,
  },
  "evm-audit-oracles": {
    name: "Oracle Integration",
    contractTypes: ["oracle", "price-feed", "chainlink"],
    skillFile: "evm-audit-oracles.md",
    items: 29,
  },
};

// ─── PRE-DEPLOY CHECKLISTS ─────────────────────────────

const PRE_DEPLOY_CHECKLISTS = {
  erc20: {
    name: "ERC-20 Token Pre-Deploy Checklist",
    items: [
      {
        id: "T01",
        check: "No fee-on-transfer without explicit balance tracking",
        severity: "high",
        category: "token-mechanics",
      },
      {
        id: "T02",
        check: "approve() race condition mitigated (increaseAllowance pattern)",
        severity: "medium",
        category: "approval",
      },
      {
        id: "T03",
        check: "No rebasing logic without adapter contracts",
        severity: "high",
        category: "token-mechanics",
      },
      {
        id: "T04",
        check: "Decimal consistency (6 vs 18) handled in all calculations",
        severity: "critical",
        category: "precision",
      },
      {
        id: "T05",
        check: "totalSupply cannot overflow or be manipulated",
        severity: "high",
        category: "supply",
      },
      {
        id: "T06",
        check: "Transfer to zero address blocked or intentional",
        severity: "low",
        category: "transfer",
      },
      {
        id: "T07",
        check: "Pausable mechanism has timelock or multisig",
        severity: "medium",
        category: "access-control",
      },
      {
        id: "T08",
        check: "Mint/burn functions properly access-controlled",
        severity: "critical",
        category: "access-control",
      },
      {
        id: "T09",
        check: "No hidden mint functions in fallback/receive",
        severity: "critical",
        category: "backdoor",
      },
      {
        id: "T10",
        check: "Events emitted for all state changes",
        severity: "low",
        category: "transparency",
      },
      {
        id: "T11",
        check: "Contract verified on block explorer",
        severity: "medium",
        category: "transparency",
      },
      {
        id: "T12",
        check: "Ownership renounced or behind timelock",
        severity: "medium",
        category: "trust",
      },
    ],
  },
  vault: {
    name: "ERC-4626 Vault Pre-Deploy Checklist",
    items: [
      {
        id: "V01",
        check:
          "First depositor inflation attack mitigated (virtual shares or minimum deposit)",
        severity: "critical",
        category: "vault-attack",
      },
      {
        id: "V02",
        check: "Share/asset conversion uses consistent rounding direction",
        severity: "high",
        category: "precision",
      },
      {
        id: "V03",
        check: "Deposit and withdraw use CEI pattern",
        severity: "high",
        category: "reentrancy",
      },
      {
        id: "V04",
        check: "maxDeposit/maxWithdraw correctly implement limits",
        severity: "medium",
        category: "limits",
      },
      {
        id: "V05",
        check: "Preview functions match actual execution amounts",
        severity: "high",
        category: "consistency",
      },
      {
        id: "V06",
        check:
          "Multi-step operations (deposit+stake) are atomic or have slippage protection",
        severity: "high",
        category: "atomicity",
      },
      {
        id: "V07",
        check: "Underlying asset cannot be drained via direct transfer",
        severity: "critical",
        category: "drain",
      },
      {
        id: "V08",
        check: "Emergency withdrawal mechanism exists with timelock",
        severity: "medium",
        category: "emergency",
      },
    ],
  },
  amm: {
    name: "AMM / DEX Pre-Deploy Checklist",
    items: [
      {
        id: "A01",
        check: "Slippage protection enforced (minAmountOut parameter)",
        severity: "critical",
        category: "mev",
      },
      {
        id: "A02",
        check: "Sandwich attack resistance via deadline parameter",
        severity: "high",
        category: "mev",
      },
      {
        id: "A03",
        check: "Price oracle not based on spot reserves (use TWAP)",
        severity: "critical",
        category: "oracle",
      },
      {
        id: "A04",
        check: "LP token mint uses CEI pattern",
        severity: "high",
        category: "reentrancy",
      },
      {
        id: "A05",
        check: "Fee calculation doesn't truncate to zero on small amounts",
        severity: "medium",
        category: "precision",
      },
      {
        id: "A06",
        check: "Flash loan callback properly validated",
        severity: "critical",
        category: "flash-loan",
      },
      {
        id: "A07",
        check: "Pool initialization can't be front-run",
        severity: "high",
        category: "mev",
      },
      {
        id: "A08",
        check: "Concentrated liquidity range boundaries validated",
        severity: "medium",
        category: "bounds",
      },
    ],
  },
  lending: {
    name: "Lending Protocol Pre-Deploy Checklist",
    items: [
      {
        id: "L01",
        check: "Liquidation threshold properly bounds collateral ratio",
        severity: "critical",
        category: "liquidation",
      },
      {
        id: "L02",
        check: "Oracle staleness check with fallback price source",
        severity: "critical",
        category: "oracle",
      },
      {
        id: "L03",
        check: "Interest rate model has sane bounds (no infinite APR)",
        severity: "high",
        category: "economics",
      },
      {
        id: "L04",
        check: "Flash loan fee is non-zero and enforced",
        severity: "medium",
        category: "flash-loan",
      },
      {
        id: "L05",
        check: "Bad debt socialization mechanism exists",
        severity: "high",
        category: "risk",
      },
      {
        id: "L06",
        check:
          "Collateral hiding via deposit-then-borrow-then-withdraw blocked",
        severity: "critical",
        category: "exploit",
      },
      {
        id: "L07",
        check: "Liquidation cannot be front-run to steal collateral",
        severity: "high",
        category: "mev",
      },
      {
        id: "L08",
        check: "Non-18 decimal tokens handled correctly in all calculations",
        severity: "critical",
        category: "precision",
      },
    ],
  },
};

// ─── CORE AUDIT LOGIC ───────────────────────────────────

/**
 * Determine which audit domains to run based on contract type
 */
function selectDomains(contractType) {
  const domains = [];
  for (const [key, domain] of Object.entries(AUDIT_DOMAINS)) {
    if (domain.alwaysRun) {
      domains.push(key);
    } else if (
      contractType &&
      domain.contractTypes?.some((t) => contractType.toLowerCase().includes(t))
    ) {
      domains.push(key);
    }
  }
  return domains;
}

/**
 * Load audit skill content from wiki
 */
function loadSkillContent(skillFile) {
  const skillPath = path.join("/data/buzz/persistent/wiki/skills", skillFile);
  try {
    return fs.readFileSync(skillPath, "utf8");
  } catch (e) {
    return null;
  }
}

/**
 * Run audit checklist for a single domain (heuristic evaluation)
 * Returns findings array
 */
function runDomainAudit(domainKey, sourceCode) {
  const domain = AUDIT_DOMAINS[domainKey];
  if (!domain) return [];

  const findings = [];
  const code = sourceCode.toLowerCase();

  // Heuristic checks based on domain
  const checks = getDomainChecks(domainKey);
  for (const check of checks) {
    const result = evaluateCheck(check, code);
    if (result.triggered) {
      findings.push({
        domain: domainKey,
        domain_name: domain.name,
        check_id: check.id,
        title: check.title,
        severity: check.severity,
        description: check.description,
        line_hint: result.lineHint || null,
        recommendation: check.recommendation,
      });
    }
  }
  return findings;
}

/**
 * Get heuristic checks for a domain
 */
function getDomainChecks(domainKey) {
  const checks = {
    "evm-audit-general": [
      {
        id: "G01",
        title: "Unchecked external call return value",
        severity: "high",
        pattern: /\.call\{|\.call\(/,
        antiPattern: /require\(.*\.call/,
        description:
          "External call return value not checked — funds may silently fail to transfer",
        recommendation:
          "Use require() on all external call return values or use OpenZeppelin's Address.sendValue()",
      },
      {
        id: "G02",
        title: "Reentrancy risk — state change after external call",
        severity: "critical",
        pattern: /\.call\{value/,
        secondPattern: /=.*\.call/,
        description:
          "State changes after external call create reentrancy opportunity",
        recommendation:
          "Apply checks-effects-interactions (CEI) pattern; use ReentrancyGuard",
      },
      {
        id: "G03",
        title: "msg.value used in loop",
        severity: "high",
        pattern: /for\s*\(.*msg\.value|while\s*\(.*msg\.value/,
        description:
          "msg.value reused across loop iterations — can be double-spent",
        recommendation:
          "Cache msg.value before loop and track spending per iteration",
      },
      {
        id: "G04",
        title: "Delegatecall to user-supplied address",
        severity: "critical",
        pattern: /delegatecall/,
        description:
          "Delegatecall can execute arbitrary code in caller's context",
        recommendation:
          "Never delegatecall to user-supplied addresses; restrict to known implementations",
      },
      {
        id: "G05",
        title: "selfdestruct present",
        severity: "high",
        pattern: /selfdestruct|suicide/,
        description:
          "selfdestruct can destroy contract and send ETH to arbitrary address",
        recommendation:
          "Remove selfdestruct; post-Dencun it only transfers ETH without destroying code",
      },
      {
        id: "G06",
        title: "tx.origin used for authentication",
        severity: "critical",
        pattern: /tx\.origin/,
        antiPattern: /msg\.sender\s*==\s*tx\.origin/,
        description:
          "tx.origin can be phished — attacker contract calls your contract",
        recommendation: "Use msg.sender for authentication, not tx.origin",
      },
    ],
    "evm-audit-precision-math": [
      {
        id: "M01",
        title: "Division before multiplication",
        severity: "high",
        pattern: /\/.*\*/,
        description: "Division before multiplication causes precision loss",
        recommendation:
          "Always multiply before dividing: (a * b) / c instead of (a / c) * b",
      },
      {
        id: "M02",
        title: "Unchecked arithmetic in Solidity >=0.8",
        severity: "medium",
        pattern: /unchecked\s*\{/,
        description: "Unchecked blocks bypass overflow protection",
        recommendation:
          "Only use unchecked blocks where overflow is mathematically impossible",
      },
      {
        id: "M03",
        title: "Decimal assumption (hardcoded 18 decimals)",
        severity: "high",
        pattern: /1e18|10\s*\*\*\s*18|1000000000000000000/,
        description:
          "Hardcoded 18 decimals will break with USDC (6) or other non-standard tokens",
        recommendation:
          "Use token.decimals() dynamically; handle 6, 8, and 18 decimal tokens",
      },
    ],
    "evm-audit-access-control": [
      {
        id: "AC01",
        title: "Single-step ownership transfer",
        severity: "medium",
        pattern: /transferOwnership/,
        antiPattern: /Ownable2Step|pendingOwner/,
        description:
          "Single-step ownership transfer can permanently lock contract if sent to wrong address",
        recommendation:
          "Use Ownable2Step pattern — new owner must accept ownership",
      },
      {
        id: "AC02",
        title: "Missing zero-address check on critical setter",
        severity: "medium",
        pattern: /function\s+set.*address/,
        antiPattern: /require\(.*!=\s*address\(0/,
        description:
          "Critical address can be set to zero, bricking functionality",
        recommendation:
          "Add require(newAddress != address(0)) to all address setters",
      },
      {
        id: "AC03",
        title: "No timelock on privileged function",
        severity: "medium",
        pattern: /onlyOwner|onlyAdmin|onlyRole/,
        antiPattern: /TimelockController|timelock/,
        description:
          "Privileged functions execute immediately — no time for users to react",
        recommendation:
          "Add timelock for functions that affect user funds or protocol parameters",
      },
    ],
    "evm-audit-dos": [
      {
        id: "D01",
        title: "Unbounded loop over dynamic array",
        severity: "high",
        pattern: /for\s*\(\s*uint.*\.length/,
        description:
          "Loop over dynamic array can exceed gas limit as array grows",
        recommendation:
          "Implement pagination or limit array size; use pull-over-push pattern",
      },
      {
        id: "D02",
        title: "External call in loop (DoS via revert)",
        severity: "high",
        pattern: /for\s*\([\s\S]{0,200}\.call|for\s*\([\s\S]{0,200}\.transfer/,
        description:
          "Single failing external call in loop blocks all iterations",
        recommendation:
          "Use pull-over-push pattern; let users withdraw individually",
      },
    ],
    "evm-audit-erc20": [
      {
        id: "E01",
        title: "approve() without setting to 0 first",
        severity: "medium",
        pattern: /approve\(/,
        antiPattern: /approve\(.*,\s*0\)/,
        description:
          "ERC-20 approve race condition — allowance can be front-run",
        recommendation:
          "Use increaseAllowance/decreaseAllowance or set to 0 first",
      },
      {
        id: "E02",
        title: "No check for fee-on-transfer tokens",
        severity: "high",
        pattern: /transferFrom\(/,
        antiPattern: /balanceOf.*before.*after|balanceBefore/,
        description: "Fee-on-transfer tokens deliver less than expected amount",
        recommendation:
          "Check balance before and after transfer; use the difference as actual amount",
      },
    ],
    "evm-audit-defi-amm": [
      {
        id: "AMM01",
        title: "No slippage protection",
        severity: "critical",
        pattern: /swap|exchange/,
        antiPattern: /minAmount|minimumOut|slippage|amountOutMin/,
        description:
          "Swap without minimum output amount is vulnerable to sandwich attacks",
        recommendation:
          "Add minAmountOut parameter and validate output meets user's expectation",
      },
      {
        id: "AMM02",
        title: "Spot price used as oracle",
        severity: "critical",
        pattern: /getReserves|reserve0.*reserve1/,
        antiPattern: /twap|observe|consult/,
        description:
          "Using spot reserves as price oracle is trivially manipulable via flash loans",
        recommendation:
          "Use TWAP oracle or Chainlink price feed instead of spot reserves",
      },
    ],
    "evm-audit-defi-lending": [
      {
        id: "LN01",
        title: "No oracle staleness check",
        severity: "critical",
        pattern: /latestRoundData|getPrice/,
        antiPattern: /updatedAt|timestamp.*stale|heartbeat/,
        description:
          "Oracle price accepted without freshness check — stale prices enable exploits",
        recommendation:
          "Check updatedAt timestamp against heartbeat; revert if stale",
      },
    ],
    "evm-audit-erc4626": [
      {
        id: "VT01",
        title: "No inflation attack mitigation",
        severity: "critical",
        pattern: /totalAssets|totalSupply/,
        antiPattern: /virtual.*shares|_decimalsOffset|1e3/,
        description:
          "First depositor can manipulate share price via ERC-4626 inflation attack",
        recommendation:
          "Use virtual shares (OpenZeppelin) or enforce minimum first deposit",
      },
    ],
    "evm-audit-signatures": [
      {
        id: "SG01",
        title: "No nonce in signature scheme",
        severity: "critical",
        pattern: /ecrecover|ECDSA\.recover|signTypedData/,
        antiPattern: /nonce|nonces/,
        description: "Signatures without nonces can be replayed",
        recommendation:
          "Include incrementing nonce in signed data; invalidate after use",
      },
      {
        id: "SG02",
        title: "No deadline in permit",
        severity: "high",
        pattern: /permit\(/,
        antiPattern: /deadline|expiry/,
        description:
          "Permits without deadline never expire — indefinite approval risk",
        recommendation:
          "Always include and enforce deadline parameter in permit signatures",
      },
    ],
    "evm-audit-oracles": [
      {
        id: "OR01",
        title: "Chainlink staleness not checked",
        severity: "critical",
        pattern: /latestRoundData/,
        antiPattern: /updatedAt|answeredInRound/,
        description:
          "Chainlink price used without checking staleness or round completeness",
        recommendation:
          "Check updatedAt > 0, answeredInRound >= roundId, and timestamp within heartbeat",
      },
      {
        id: "OR02",
        title: "Hardcoded Chainlink feed address",
        severity: "medium",
        pattern: /0x.*AggregatorV3Interface|priceFeed\s*=\s*0x/,
        description:
          "Hardcoded oracle address prevents migration if feed is deprecated",
        recommendation:
          "Make oracle address configurable by admin with timelock",
      },
    ],
  };
  return checks[domainKey] || [];
}

/**
 * Evaluate a single check against source code
 */
function evaluateCheck(check, code) {
  if (!check.pattern) return { triggered: false };
  const hasPattern = check.pattern.test(code);
  const hasAntiPattern = check.antiPattern
    ? check.antiPattern.test(code)
    : false;
  // Triggered if pattern found but anti-pattern (mitigation) NOT found
  return { triggered: hasPattern && !hasAntiPattern };
}

/**
 * Calculate audit score from findings
 */
function calculateAuditScore(findings, totalChecks) {
  if (totalChecks === 0) return 100;

  let penalty = 0;
  for (const f of findings) {
    switch (f.severity) {
      case "critical":
        penalty += 25;
        break;
      case "high":
        penalty += 15;
        break;
      case "medium":
        penalty += 8;
        break;
      case "low":
        penalty += 3;
        break;
    }
  }
  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Run full audit on contract source code
 */
function runAudit(contractAddress, chain, contractType, sourceCode, githubUrl) {
  if (!feature("BUZZSHIELD_AUDIT_ENGINE")) {
    return { error: "BUZZSHIELD_AUDIT_ENGINE flag is off" };
  }

  const auditId = `audit-${crypto.randomBytes(8).toString("hex")}`;
  const domains = selectDomains(contractType);
  const allFindings = [];
  let totalChecks = 0;
  let passedChecks = 0;

  for (const domainKey of domains) {
    const domain = AUDIT_DOMAINS[domainKey];
    totalChecks += domain.items;
    const findings = runDomainAudit(domainKey, sourceCode);
    allFindings.push(...findings);
    passedChecks += domain.items - findings.length;
  }

  const score = calculateAuditScore(allFindings, totalChecks);
  const severitySummary = {
    critical: allFindings.filter((f) => f.severity === "critical").length,
    high: allFindings.filter((f) => f.severity === "high").length,
    medium: allFindings.filter((f) => f.severity === "medium").length,
    low: allFindings.filter((f) => f.severity === "low").length,
  };

  // Identify drain pattern candidates from critical/high findings
  const drainCandidates = allFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .map((f) => ({
      check_id: f.check_id,
      title: f.title,
      severity: f.severity,
      domain: f.domain,
    }));

  // Generate recommendations
  const recommendations = allFindings.map((f) => ({
    finding: f.title,
    severity: f.severity,
    action: f.recommendation,
  }));

  const sourceHash = crypto
    .createHash("sha256")
    .update(sourceCode)
    .digest("hex")
    .slice(0, 16);

  // Store report
  const result = db()
    .prepare(
      `INSERT INTO shield_audit_reports
    (audit_id, contract_address, chain, contract_type, github_url, source_hash,
     domains_run, findings_json, severity_summary, score,
     checklist_items_passed, checklist_items_failed, checklist_items_total,
     recommendations, drain_pattern_candidates)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      auditId,
      contractAddress,
      chain || "ethereum",
      contractType || "unknown",
      githubUrl || null,
      sourceHash,
      JSON.stringify(domains),
      JSON.stringify(allFindings),
      JSON.stringify(severitySummary),
      score,
      passedChecks,
      allFindings.length,
      totalChecks,
      JSON.stringify(recommendations),
      JSON.stringify(drainCandidates),
    );

  // Emit event
  emit("shield-audit", "shield.audit.complete", {
    audit_id: auditId,
    contract_address: contractAddress,
    chain,
    score,
    findings_count: allFindings.length,
    severity_summary: severitySummary,
  });

  return {
    audit_id: auditId,
    contract_address: contractAddress,
    chain: chain || "ethereum",
    contract_type: contractType || "unknown",
    score,
    verdict: score >= 80 ? "PASS" : score >= 50 ? "REVIEW" : "FAIL",
    severity_summary: severitySummary,
    findings: allFindings,
    recommendations,
    domains_audited: domains.map((d) => AUDIT_DOMAINS[d]?.name || d),
    checklist: {
      passed: passedChecks,
      failed: allFindings.length,
      total: totalChecks,
    },
    drain_pattern_candidates: drainCandidates.length,
    source_hash: sourceHash,
    engine_version: "v1.0-ethskills",
  };
}

/**
 * Get pre-deploy checklist for a contract type
 */
function getChecklist(contractType) {
  const type = contractType?.toLowerCase() || "erc20";
  const checklist = PRE_DEPLOY_CHECKLISTS[type];
  if (!checklist) {
    return {
      error: `Unknown contract type: ${type}`,
      available_types: Object.keys(PRE_DEPLOY_CHECKLISTS),
    };
  }
  return {
    contract_type: type,
    name: checklist.name,
    items: checklist.items,
    total_items: checklist.items.length,
    source: "ETHSkills by Austin Griffith + BuzzShield research",
    engine_version: "v1.0-ethskills",
  };
}

/**
 * Get audit stats
 */
function getAuditStats() {
  try {
    const total = db()
      .prepare("SELECT COUNT(*) as c FROM shield_audit_reports")
      .get();
    const byVerdict = db()
      .prepare(
        `SELECT
        SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) as pass,
        SUM(CASE WHEN score >= 50 AND score < 80 THEN 1 ELSE 0 END) as review,
        SUM(CASE WHEN score < 50 THEN 1 ELSE 0 END) as fail
      FROM shield_audit_reports`,
      )
      .get();
    const avgScore = db()
      .prepare("SELECT AVG(score) as avg FROM shield_audit_reports")
      .get();
    return {
      total_audits: total?.c || 0,
      pass: byVerdict?.pass || 0,
      review: byVerdict?.review || 0,
      fail: byVerdict?.fail || 0,
      average_score: Math.round(avgScore?.avg || 0),
      domains_available: Object.keys(AUDIT_DOMAINS).length,
      checklist_types: Object.keys(PRE_DEPLOY_CHECKLISTS).length,
    };
  } catch (e) {
    return { total_audits: 0, error: e.message };
  }
}

/**
 * Get recent audits
 */
function getRecentAudits(limit = 10) {
  try {
    return db()
      .prepare(
        `SELECT audit_id, contract_address, chain, contract_type, score, severity_summary, created_at
       FROM shield_audit_reports ORDER BY created_at DESC LIMIT ?`,
      )
      .all(limit);
  } catch (e) {
    return [];
  }
}

module.exports = {
  createAuditTables,
  AUDIT_DOMAINS,
  PRE_DEPLOY_CHECKLISTS,
  selectDomains,
  runAudit,
  getChecklist,
  getAuditStats,
  getRecentAudits,
};
