# BUZZ SHIELD — FULL BUILD PLAN

## AI Agent Security Intelligence

## "Security before performance. Intelligence before execution."

## April 4, 2026

---

# PART 1: WHAT BUZZ SHIELD IS

Buzz Shield is an intelligence service that any AI agent calls before acting on-chain.
Not a wallet. Not a firewall. The decision layer.

```
WITHOUT BUZZ SHIELD:
  Agent discovers opportunity → Agent executes → Agent gets drained

WITH BUZZ SHIELD:
  Agent discovers opportunity
    → Buzz Shield: Is the program safe? (program risk score)
    → Buzz Shield: Is the deployer legit? (identity check)
    → Buzz Shield: Does this match a known drain pattern? (pattern match)
    → Buzz Shield: What does the simulation say? (MiroFish)
    → Wallet Guard: ALLOW / WARN / BLOCK (execution gate)
    → Agent executes (or doesn't)
    → BuzzReputation: Record outcome on-chain
```

**The market context:**

- 250,000+ daily active AI agents on-chain (400% YoY growth)
- $45M+ lost to AI agent security incidents in 2026
- $7.84B → $52.62B market by 2030 (46.3% CAGR)
- Google DeepMind published 6 categories of AI agent attacks (Apr 1, 2026)
- Anthropic warned AI agents can autonomously exploit smart contracts
- Claw Wallet launched Apr 2 as first "B2A" wallet — validates the category
- NOBODY is building the intelligence layer between agent and action

**Buzz's position:**

- Blockaid = firewall for humans
- Blowfish = firewall for wallets
- Claw Wallet = secure wallet for agents
- Buzz Shield = intelligence for agents

---

# PART 2: ARCHITECTURE

```
BUZZ SHIELD ARCHITECTURE (fits inside existing Buzz v9.2)

EXTERNAL AGENTS (any agent, any framework)
  │
  ├── Free: GET /shield/health/{walletAddress}
  ├── Free: GET /shield/program/{programId}
  ├── Free: GET /shield/patterns (known drain feed)
  ├── x402: POST /shield/scan (pre-action intelligence)
  ├── x402: POST /shield/audit (deep program audit)
  ├── x402: POST /shield/forensics (full wallet forensics)
  │
  ↓
BUZZ SHIELD ENGINE (new module: api/services/shield/)
  │
  ├── PROGRAM RISK SCORER
  │   ├── Is program verified on-chain?
  │   ├── Is program immutable or upgradeable?
  │   ├── When was it deployed? (age penalty for <7 days)
  │   ├── Who deployed it? (→ ATV identity check)
  │   ├── Does bytecode match known drain patterns?
  │   ├── Has this program been flagged before?
  │   └── Output: 0-100 program safety score
  │
  ├── INSTRUCTION SCANNER
  │   ├── Parse all instructions in unsigned transaction
  │   ├── Flag: assign (owner reassignment)
  │   ├── Flag: setAuthority (authority change)
  │   ├── Flag: bulk transfers (drain pattern)
  │   ├── Flag: durable nonce usage (never-expiring tx)
  │   ├── Flag: program upgrade (code change mid-flight)
  │   ├── Flag: unknown program interaction
  │   └── Output: instruction_flags[], risk_level
  │
  ├── DRAIN PATTERN MATCHER
  │   ├── Known drainer program addresses (database, updated daily)
  │   ├── Known drainer instruction sequences
  │   ├── Behavioral patterns (assign + transfer combo)
  │   ├── TOCTOU attack indicators
  │   ├── Community-reported addresses (via free scans)
  │   └── Output: pattern_matches[], confidence
  │
  ├── AGENT CONTEXT ANALYZER
  │   ├── What is the agent trying to do? (intent classification)
  │   ├── Does the action match the agent's stated purpose?
  │   ├── Is the value at risk proportional to the expected gain?
  │   ├── Has this agent been compromised? (behavior anomaly)
  │   └── Output: context_risk, anomaly_score
  │
  ├── DEPLOYER FORENSICS (existing: ATV + Helius + Octav)
  │   ├── ENS/identity verification (ATV x402)
  │   ├── Transaction history (Helius adapter)
  │   ├── Portfolio analysis (Octav adapter)
  │   ├── Previous deployments (track record)
  │   └── Output: deployer_trust_score
  │
  └── VERDICT ENGINE
      ├── Combines all scores: program + instructions + patterns + context + deployer
      ├── Weighted formula (like token scoring but for actions)
      ├── Output: SAFE / CAUTION / WARNING / DANGER
      ├── Human-readable explanation
      ├── Receipt (hash, timestamp, reproducible)
      └── On-chain: ShieldStorage contract (optional, premium)

INTEGRATION WITH EXISTING BUZZ:
  │
  ├── WALLET GUARD (Aldo/AION)
  │   Shield scan → feeds into Wallet Guard evaluate()
  │   Shield DANGER → Wallet Guard auto-BLOCK
  │   Shield CAUTION → Wallet Guard WARN → War Room
  │   Shield SAFE → Wallet Guard ALLOW → proceed
  │
  ├── MIROFISH (swarm simulation)
  │   For high-value actions, Shield triggers 1K-agent simulation
  │   "If 1,000 agents evaluated this action, what would they decide?"
  │
  ├── SCORING ENGINE (100-point system)
  │   Shield reuses: security checks, deployer analysis, Rug-O-Meter
  │   New: program risk score adds to token score context
  │
  ├── PULSE ENGINE
  │   Shield health monitored every 100 ticks
  │   Pattern database auto-updates via autoDream
  │
  └── ON-CHAIN
      ShieldReceipt stored on Base (new contract or extend BuzzReputation)
      Verifiable proof that Shield scanned before execution
```

---

# PART 3: DATABASE SCHEMA

```sql
-- Shield scan results
CREATE TABLE shield_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id TEXT UNIQUE NOT NULL,
  scan_type TEXT NOT NULL CHECK(scan_type IN ('pre_action', 'program', 'wallet', 'forensics')),
  requester TEXT, -- agent address or identifier
  target TEXT NOT NULL, -- program address, wallet, or tx hash
  chain TEXT DEFAULT 'solana',
  verdict TEXT NOT NULL CHECK(verdict IN ('SAFE', 'CAUTION', 'WARNING', 'DANGER')),
  program_score INTEGER, -- 0-100
  instruction_flags JSON, -- array of flagged instructions
  pattern_matches JSON, -- matched drain patterns
  deployer_trust INTEGER, -- 0-100
  context_risk REAL, -- 0-1
  explanation TEXT, -- human-readable
  receipt_hash TEXT, -- SHA-256 for verification
  scan_duration_ms INTEGER,
  paid INTEGER DEFAULT 0, -- 0=free, 1=x402
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_shield_target ON shield_scans(target);
CREATE INDEX idx_shield_verdict ON shield_scans(verdict);
CREATE INDEX idx_shield_date ON shield_scans(created_at);

-- Known drain patterns
CREATE TABLE drain_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, -- e.g. "owner_reassignment_combo"
  description TEXT,
  instruction_sequence JSON, -- array of instruction signatures
  program_addresses JSON, -- known drainer program addresses
  severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
  source TEXT, -- who reported: community, heyanon, manual
  confirmed INTEGER DEFAULT 0, -- verified by team
  active INTEGER DEFAULT 1,
  first_seen TEXT,
  last_seen TEXT,
  match_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Program risk cache
CREATE TABLE program_risk_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_address TEXT NOT NULL,
  chain TEXT DEFAULT 'solana',
  verified INTEGER, -- source code verified
  immutable INTEGER, -- not upgradeable
  deploy_date TEXT,
  deployer_address TEXT,
  deployer_trust INTEGER,
  bytecode_hash TEXT,
  risk_score INTEGER, -- 0-100 (100=safest)
  flags JSON, -- array of risk flags
  last_checked TEXT,
  check_count INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(program_address, chain)
);

CREATE INDEX idx_program_address ON program_risk_cache(program_address);

-- Community reports (from free scans)
CREATE TABLE shield_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter TEXT, -- agent address
  target TEXT NOT NULL, -- program or address reported
  report_type TEXT CHECK(report_type IN ('drain', 'phishing', 'suspicious', 'false_positive')),
  details TEXT,
  verified INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Shield service stats
CREATE TABLE shield_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  total_scans INTEGER DEFAULT 0,
  free_scans INTEGER DEFAULT 0,
  paid_scans INTEGER DEFAULT 0,
  safe_count INTEGER DEFAULT 0,
  caution_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  danger_count INTEGER DEFAULT 0,
  patterns_matched INTEGER DEFAULT 0,
  unique_agents INTEGER DEFAULT 0,
  revenue_usd REAL DEFAULT 0,
  UNIQUE(date)
);
```

Total new tables: 5
Buzz total after Shield: 87 + 5 = **92 tables**

---

# PART 4: API ENDPOINTS

## FREE TIER (no auth, rate limited)

```
GET /shield/health/{walletAddress}
  Rate: 10/day per IP
  Returns: wallet exposure summary
  {
    "wallet": "...",
    "chain": "solana",
    "verdict": "CAUTION",
    "exposure": {
      "total_value_usd": 12400,
      "connected_dapps": 14,
      "risky_approvals": 3,
      "oldest_approval_days": 180,
      "programs_interacted": 47
    },
    "recommendations": [
      "Revoke 3 old approvals (>90 days)",
      "2 programs interacted with are upgradeable"
    ],
    "scanned_at": "..."
  }

GET /shield/program/{programId}
  Rate: 20/day per IP
  Returns: program risk score
  {
    "program": "...",
    "chain": "solana",
    "risk_score": 82,
    "verified": true,
    "immutable": false,
    "deploy_date": "2025-09-15",
    "deployer": "...",
    "flags": ["upgradeable"],
    "verdict": "CAUTION",
    "scanned_at": "..."
  }

GET /shield/patterns
  Rate: 100/day per IP
  Returns: known drain pattern feed (public safety data)
  {
    "patterns": [
      {
        "id": "owner_reassign_combo",
        "severity": "critical",
        "description": "assign instruction combined with SOL transfer",
        "programs": ["...addresses..."],
        "first_seen": "2026-01-15",
        "match_count": 847
      }
    ],
    "total_patterns": 47,
    "last_updated": "..."
  }

GET /shield/stats
  Rate: unlimited
  Returns: aggregate shield statistics (public dashboard data)
  {
    "total_scans": 15420,
    "dangers_blocked": 342,
    "patterns_known": 47,
    "agents_protected": 1200,
    "value_protected_usd": 2400000
  }
```

## PAID TIER (x402, USDC on Base)

```
POST /shield/scan — $0.01
  Body: {
    "transaction": "base64_unsigned_tx",
    "chain": "solana",
    "agent": "optional_agent_identifier",
    "context": {
      "intent": "swap_token",
      "expected_outcome": "receive 100 USDC",
      "value_at_risk": 500
    }
  }
  Returns: {
    "scan_id": "...",
    "verdict": "WARNING",
    "program_score": 45,
    "instruction_flags": [
      { "instruction": "assign", "risk": "critical", "detail": "Owner reassignment to unknown program" },
      { "instruction": "transfer", "risk": "high", "detail": "Transfers ALL SOL to unknown address" }
    ],
    "pattern_matches": [
      { "pattern": "owner_reassign_combo", "confidence": 0.95 }
    ],
    "deployer_trust": 12,
    "explanation": "DANGER: This transaction contains an owner reassignment instruction combined with a full SOL transfer. This matches the owner_reassign_combo drain pattern with 95% confidence. The deployer has no verified identity and the program was deployed 3 days ago. DO NOT SIGN.",
    "receipt": { "hash": "sha256...", "timestamp": "..." }
  }

POST /shield/audit — $0.05
  Body: { "program": "...", "chain": "solana" }
  Returns: deep program analysis
  {
    "program": "...",
    "risk_score": 23,
    "verified": false,
    "immutable": false,
    "last_upgrade": "2026-04-03T14:00:00Z",
    "upgrade_authority": "...",
    "deployer": {
      "address": "...",
      "identity_verified": false,
      "previous_deployments": 1,
      "account_age_days": 5,
      "trust_score": 8
    },
    "bytecode_analysis": {
      "has_assign": true,
      "has_set_authority": true,
      "has_bulk_transfer": true,
      "suspicious_patterns": 3
    },
    "similar_programs": [
      { "address": "...", "similarity": 0.89, "known_drain": true }
    ],
    "verdict": "DANGER",
    "explanation": "Program is unverified, upgradeable, deployed 5 days ago by an anonymous address with no history. Bytecode contains assign + bulk transfer patterns matching known drainers."
  }

POST /shield/forensics — $0.10
  Body: { "wallet": "...", "chain": "solana" }
  Returns: full wallet exposure report
  {
    "wallet": "...",
    "total_value_usd": 45000,
    "token_count": 23,
    "programs_authorized": 67,
    "risky_programs": [
      { "program": "...", "risk_score": 15, "last_interaction": "...", "recommendation": "REVOKE" }
    ],
    "recent_suspicious": [
      { "tx": "...", "type": "assign attempt", "blocked": false, "date": "..." }
    ],
    "drain_exposure": {
      "immediate_risk_usd": 2400,
      "programs_to_revoke": 5,
      "stale_approvals": 12
    },
    "health_score": 62,
    "verdict": "CAUTION",
    "recommendations": [
      "Revoke 5 high-risk program authorizations",
      "Remove 12 stale approvals (>90 days)",
      "Consider moving high-value tokens to hardware wallet"
    ]
  }
```

## INTERNAL ENDPOINTS (admin only)

```
POST /shield/patterns/add — Add new drain pattern (manual or auto-discovered)
GET /shield/patterns/stats — Pattern match analytics
GET /shield/scans/recent — Recent scan log
POST /shield/report — Community report submission (from free scans)
```

---

# PART 5: PROGRAM RISK SCORING (0-100)

Like the token scorer but for Solana programs:

```
PROGRAM RISK SCORE (100 = safest)

POSITIVE FACTORS:
  Verified source code:         +20
  Immutable (not upgradeable):  +20
  Age > 180 days:               +15
  Age 30-180 days:              +10
  Deployer identity verified:   +15
  Multiple independent audits:  +10
  High interaction count:       +10
  Open source on GitHub:        +10

NEGATIVE FACTORS (penalties):
  Unverified source:            -20
  Upgradeable:                  -15
  Age < 7 days:                 -20
  Age 7-30 days:                -10
  Anonymous deployer:           -15
  Contains assign instruction:  -10
  Contains setAuthority:        -10
  Bytecode matches drainer:     -30 (auto DANGER)
  Flagged by community:         -10 per confirmed report
  Deployer has rugpull history: -25

VERDICT MAPPING:
  80-100: SAFE — Proceed with confidence
  60-79:  CAUTION — Proceed with monitoring
  40-59:  WARNING — Significant risk, review carefully
  0-39:   DANGER — Do not interact
```

---

# PART 6: DRAIN PATTERN LIBRARY (initial 20)

```
PATTERN 01: owner_reassign_combo
  Severity: CRITICAL
  Sequence: assign(victim → attacker_program) + transfer(all SOL)
  Source: DeepMind "AI Agent Traps" report

PATTERN 02: bulk_spl_drain
  Severity: CRITICAL
  Sequence: enumerate_tokens + transfer(each SPL token → attacker)
  Source: On-chain analysis of 1,200+ drain transactions

PATTERN 03: durable_nonce_trick
  Severity: HIGH
  Indicator: AdvanceNonceAccount + program call (benign at sign time)
  Source: Blockaid TOCTOU research

PATTERN 04: toctou_program_upgrade
  Severity: HIGH
  Indicator: Program upgraded within 1 hour of transaction
  Source: Blowfish Aqua/Vanish drainer analysis

PATTERN 05: blinks_phishing
  Severity: HIGH
  Indicator: Action endpoint returns assign instruction hidden in "normal" tx
  Source: Solana Blinks registry misuse reports

PATTERN 06: fake_mint_drain
  Severity: MEDIUM
  Sequence: create_token_account + transfer(victim_SOL) disguised as "mint"
  Source: Q1 2026 NFT phishing campaigns

PATTERN 07: approval_fatigue
  Severity: MEDIUM
  Indicator: Multiple small benign txs → one malicious tx in sequence
  Source: DeepMind trap category #6

PATTERN 08: supply_chain_poison
  Severity: CRITICAL
  Indicator: Package dependency modified to include wallet exfiltration
  Source: LiteLLM incident March 2026

PATTERN 09: mcp_tool_hijack
  Severity: HIGH
  Indicator: MCP tool returning manipulated data to agent
  Source: $45M AI agent breach analysis

PATTERN 10: memory_poison
  Severity: HIGH
  Indicator: Agent long-term memory contains injected malicious instructions
  Source: DeepMind trap category #2

PATTERN 11: multisig_reassign
  Severity: CRITICAL
  Sequence: Silently add attacker key to multisig authority
  Source: SlowMist TRON-to-Solana pattern migration

PATTERN 12: token_account_drain
  Severity: HIGH
  Sequence: close_account on all token accounts → SOL rent reclaimed to attacker
  Source: Rublevka Team drainer kit analysis

PATTERN 13: cascading_agent_exploit
  Severity: CRITICAL
  Indicator: One compromised agent sends instructions to other agents
  Source: $3.2M procurement fraud case (Q3 2026)

PATTERN 14: phantom_simulation_bypass
  Severity: HIGH
  Indicator: Transaction passes simulation but executes differently
  Source: Coinspect Phantom vulnerability disclosure

PATTERN 15: program_upgrade_then_drain
  Severity: CRITICAL
  Sequence: upgradeProgram + wait(1 block) + drain via upgraded code
  Source: TOCTOU variant

PATTERN 16: hidden_instruction_bundle
  Severity: MEDIUM
  Indicator: >5 instructions where one is malicious, hidden among benign ones
  Source: General phishing analysis

PATTERN 17: fake_airdrop_drain
  Severity: MEDIUM
  Indicator: "Claim airdrop" transaction that actually transfers OUT
  Source: Rublevka Team landing page analysis

PATTERN 18: delegated_authority_abuse
  Severity: HIGH
  Indicator: Program given delegate authority then uses it to drain
  Source: SPL Token delegate exploitation

PATTERN 19: agent_identity_spoof
  Severity: HIGH
  Indicator: Agent claiming to be a known trusted agent (wrong ERC-8004)
  Source: DeepMind trap category #5

PATTERN 20: prompt_injection_via_tx_memo
  Severity: MEDIUM
  Indicator: Transaction memo field contains instructions targeting the signing agent
  Source: Novel 2026 attack vector
```

---

# PART 7: INTEGRATION MAP

## With Existing Buzz Modules

```
SHIELD ←→ SCORING ENGINE
  Token score context enriches Shield scan
  Shield program score feeds back into token evaluation
  Shared deployer analysis (ATV identity)

SHIELD ←→ WALLET GUARD (Aldo/AION)
  Shield scan runs BEFORE Wallet Guard evaluate()
  Shield DANGER → auto-triggers Wallet Guard BLOCK
  Shield receipt → included in Wallet Guard receipt
  Combined: intelligence + governance in one flow

SHIELD ←→ MIROFISH
  High-value scans (>$1,000 at risk) trigger 1K simulation
  "How would 1,000 agents evaluate this action?"
  Simulation consensus feeds Shield verdict

SHIELD ←→ HEYANON MCP
  Rug-O-Meter feeds Shield pattern database
  19-chain wallet monitoring extends Shield forensics
  DeFi protocol data enriches program risk scoring

SHIELD ←→ PULSE ENGINE
  Shield health monitored every 50 ticks
  Pattern database update tracked in observation_log
  autoDream compresses scan history nightly

SHIELD ←→ AIBTC
  Shield as a skill on AIBTC marketplace (600 sats/scan)
  New beat: agent-security (Shield-related signals)
  Revenue: token scorer + Shield = dual income stream

SHIELD ←→ SOLANA AGENT SKILLS
  buzz-shield skill on solana.com/skills
  Any Claude Code agent installs and gets pre-action safety
  Complementary to token intelligence skill
```

## With External Partners

```
SHIELD ←→ CLAW WALLET (launched Apr 2)
  Claw Wallet = secure wallet for agents
  Buzz Shield = intelligence for agents
  Integration: Claw calls Shield API before executing
  Partnership opportunity: reach out to Jason Li (jason@bitslab.xyz)

SHIELD ←→ ALDO (AION)
  Already building Wallet Guard together
  Shield adds program analysis layer to Wallet Guard
  Frontier demo: Shield scan → Wallet Guard gate → on-chain receipt

SHIELD ←→ BLOCKAID / BLOWFISH
  Complementary, not competitive
  They scan transactions → Buzz scans the decision context
  Potential data-sharing: their drain database + our pattern library
```

---

# PART 8: FEATURE FLAGS

```javascript
// Buzz Shield — Agent Security Intelligence (Apr 2026)
SHIELD_ENGINE: false,         // Master switch for Shield module
SHIELD_FREE_TIER: false,      // Free endpoints (health, program, patterns)
SHIELD_PAID_TIER: false,      // x402 endpoints (scan, audit, forensics)
SHIELD_INSTRUCTION_SCANNER: false,  // Parse Solana tx instructions
SHIELD_PATTERN_MATCHER: false,      // Known drain pattern matching
SHIELD_PROGRAM_SCORER: false,       // Program risk scoring (0-100)
SHIELD_COMMUNITY_REPORTS: false,    // Accept community drain reports
SHIELD_MIROFISH_TRIGGER: false,     // Auto-trigger sim for high-value scans
SHIELD_WALLET_GUARD_LINK: false,    // Feed Shield into Wallet Guard
SHIELD_ON_CHAIN: false,             // Store receipts on-chain (ShieldStorage)
```

---

# PART 9: BUILD PHASES

## PHASE 1: FOUNDATION (Week 1-2, Apr 7-18)

**Goal: Core engine + free tier + first drain patterns**

```
Tasks:
  1. Create api/services/shield/ directory structure
  2. Build program risk scorer (positive/negative factors)
  3. Build drain pattern library (seed with 20 patterns)
  4. Build Shield verdict engine (combine scores → SAFE/CAUTION/WARNING/DANGER)
  5. Create 5 new database tables
  6. Build 3 free endpoints: /shield/health, /shield/program, /shield/patterns
  7. Add 10 feature flags (all false)
  8. Create CLAUDE.md for Shield module
  9. ADR-023: Buzz Shield Architecture
  10. Unit tests for pattern matching

Deliverables:
  ✅ Program risk scorer works on any Solana program address
  ✅ Pattern matcher identifies top 10 drain patterns
  ✅ Free endpoints return real data
  ✅ All feature-flagged

Dependencies:
  - Helius API key (for parsed transactions, program data)
  - Task 19 scan layer (Jupiter + Pyth active)
  - Claude Code restart (for fresh MCP + beat expansion)
```

## PHASE 1.5: P0 PATTERN EXPANSION (COMPLETED Apr 5, 2026)

**Goal: 3 critical patterns from ADR-025 gap analysis**

```
COMPLETED:
  ✅ address_poisoning_lookalike (65.4M incidents, $12.4M single loss)
  ✅ durable_nonce_temporal_delay (Drift $270M attack vector)
  ✅ cross_chain_bridge_spoof (69% of DeFi theft)
  ✅ checkAddressPoisoning() detection function
  ✅ checkTemporalAnomaly() with shield_presigned_txs table
  ✅ checkBridgeVerification() with bridge_registry table
  ✅ PULSE Shield monitoring (every 100 ticks)
  ✅ autoDream Phase 7 — Shield nightly analysis
  ✅ 6 Shield event types in event bus
  ✅ 56 feature flags, 27 services

Total patterns: 23 (20 Phase 1 + 3 Phase 1.5 P0)
See ADR-025 for full gap analysis (15 vectors, 5 structural findings)
```

## PHASE 2: INSTRUCTION SCANNER (Week 2-3, Apr 14-25)

**Goal: Parse unsigned Solana transactions, flag dangerous instructions**

```
Tasks:
  1. Build Solana instruction decoder
     - Deserialize base64 transaction
     - Parse each instruction's program ID + data
     - Map known program IDs (System, Token, Associated Token)
     - Flag: assign, setAuthority, transfer (bulk), close_account
  2. Build instruction risk classifier
     - Critical: assign, setAuthority to unknown program
     - High: bulk transfer, durable nonce, program upgrade
     - Medium: unknown program interaction, >5 instructions
     - Low: standard swap, standard transfer to known address
  3. Wire instruction scanner into Shield engine
  4. Build x402 endpoint: POST /shield/scan ($0.01)
  5. Test with known drain transaction patterns (use devnet)

Deliverables:
  ✅ Can parse any unsigned Solana transaction
  ✅ Flags dangerous instructions with explanations
  ✅ x402 scan endpoint live
  ✅ Tested against 10 known drain patterns

Dependencies:
  - @solana/web3.js or @solana/kit for tx parsing
  - Known drain tx hashes for testing (from public reports)
```

## PHASE 3: INTELLIGENCE LAYER (Week 3-4, Apr 21 - May 2)

**Goal: Connect to deployer forensics, MiroFish, Wallet Guard**

```
Tasks:
  1. Wire Shield → ATV identity (deployer verification)
  2. Wire Shield → Helius adapter (deployer tx history)
  3. Wire Shield → Rug-O-Meter (HeyAnon security scoring)
  4. Wire Shield → Wallet Guard (DANGER = auto-BLOCK)
  5. Wire Shield → MiroFish (high-value trigger)
  6. Build community report endpoint (accept drain reports)
  7. Build Shield stats endpoint (public dashboard data)
  8. Add Shield to Service Catalog (Service #23)
  9. Register on Bankr x402 Cloud (3 new endpoints)
  10. Submit buzz-shield Solana Agent Skill (separate from buzz-token-intelligence)

Deliverables:
  ✅ Full pipeline: Shield → Wallet Guard → BuzzReputation
  ✅ Community can report drain patterns
  ✅ Stats dashboard data available
  ✅ On Bankr x402 Cloud
  ✅ Solana Agent Skill published

Dependencies:
  - Wallet Guard schemas locked (Aldo, already done)
  - Helius API active (Task 19)
  - ATV_IDENTITY flag flipped true
```

## PHASE 4: FRONTIER DEMO (Week 4-5, May 2-11)

**Goal: Full demo flow for Colosseum Frontier submission**

```
Demo script:
  1. Agent discovers new Solana token via ARIA
  2. Buzz scores it: 87/100 (HOT)
  3. MiroFish simulates: 0.78 belief (PROCEED)
  4. Agent prepares swap transaction
  5. Buzz Shield scans: "Program deployed 2 days ago, bytecode
     matches owner_reassign_combo pattern — DANGER"
  6. Wallet Guard: BLOCK (based on Shield DANGER)
  7. Agent does NOT execute
  8. BuzzReputation: records Shield blocked a drain attempt
  9. Shield receipt stored on-chain

Narrative:
  "While other agents trade fast, Buzz trades safe.
   And then it sells that safety to every other agent."

  "A chef built a security intelligence layer that protects
   250,000 AI agents from the $45M+ in exploits happening right now.
   Token scoring + wallet shielding = complete trust layer.
   The only agent in Frontier that makes OTHER agents safer."
```

## PHASE 5: SCALE (Post-Frontier, May-June)

**Goal: Enterprise tier, Claw Wallet integration, continuous monitoring**

```
Tasks:
  1. Continuous wallet monitoring ($1/day per wallet)
  2. Enterprise tier ($500/mo — exchange/treasury wallets)
  3. Claw Wallet partnership (they launched Apr 2, timing is perfect)
  4. Pattern database auto-learning from scan results
  5. ShieldStorage smart contract on Base (on-chain receipts)
  6. AIBTC marketplace: buzz-shield skill (600 sats/scan)
  7. Agent trust scoring (cross-agent reputation)
  8. Expand to EVM chains (Base, ETH, BSC)
```

---

# PART 10: REVENUE MODEL

## Free Tier (community moat)

```
Purpose: Build pattern database + distribution + community goodwill
Cost to Buzz: ~$0.001 per scan (Helius API call)
Value to Buzz: Every scan teaches the pattern matcher
Rate limits: 10-20 scans/day per IP

Free scans → more data → better patterns → more trust → more paid scans
```

## Paid Tier (x402 micropayments)

```
Pre-Action Scan:    $0.01/scan
Program Audit:      $0.05/audit
Wallet Forensics:   $0.10/report
Continuous Monitor: $1.00/day per wallet
Enterprise Shield:  $500/month per client
```

## Revenue Projection (12 months)

```
MONTH 1-3 (post-launch):
  Free: 100 scans/day (building database)
  Paid: 10 scans/day × $0.01 = $0.10/day
  Revenue: ~$3/month
  Value: Pattern database growing

MONTH 3-6 (Solana Agent Skill adopted):
  Free: 1,000 scans/day
  Paid: 100 scans/day × $0.01 = $1/day
  + 20 audits/day × $0.05 = $1/day
  Revenue: ~$60/month
  Value: Known as "the Shield" in agent ecosystem

MONTH 6-12 (enterprise + monitoring):
  Free: 5,000 scans/day
  Paid: 500 scans × $0.01 = $5/day
  + 50 audits × $0.05 = $2.50/day
  + 10 forensics × $0.10 = $1/day
  + 20 wallets monitored × $1/day = $20/day
  + 2 enterprise clients × $500/mo = $1,000/mo
  Revenue: ~$1,850/month

COMBINED WITH TOKEN INTELLIGENCE:
  Token scoring: ~$450/month (projected)
  Shield: ~$1,850/month
  AIBTC signals: ~$200/month
  HSaaS audits: ~$1,500/month
  TOTAL: ~$4,000/month by Month 12
```

---

# PART 11: SOLANA AGENT SKILL (buzz-shield)

Separate skill from buzz-token-intelligence:

```
buzz-shield-skill/
├── skill/
│   ├── SKILL.md  — "How to check if what your agent is about to do is safe"
│   └── references/
│       ├── drain-patterns.md — Top 20 patterns with detection rules
│       ├── program-scoring.md — Program risk scoring methodology
│       └── integration-guide.md — How to wire Shield into your agent
├── README.md
├── install.sh
└── LICENSE
```

Install: `npx skills add https://github.com/buzzbysolcex/buzz-shield-skill`

**This is the distribution play.** Every Claude Code developer building on Solana installs this skill. Their agent automatically knows how to check programs and transactions before interacting. And it calls Buzz's x402 endpoint for the deep scans. Free distribution → paid conversion.

---

# PART 12: PARTNERSHIP TARGETS

```
IMMEDIATE (April):
  1. Aldo (AION) — Already collaborating. Shield extends Wallet Guard.
  2. Flying Whale (AIBTC) — buzz-shield as second skill on marketplace

WEEK 2-3 (April):
  3. Claw Wallet — Launched Apr 2. They're the wallet, we're the intelligence.
     Contact: Jason Li (jasonlee@bitslab.xyz)
  4. SAID Protocol — On-chain identity for agents. Complementary to Shield.

PRE-FRONTIER (May):
  5. Blockaid — Data sharing on drain patterns (they have the largest database)
  6. Helius — Deeper integration for program analysis (already using their API)
  7. Solana Foundation — Second community skill submission (buzz-shield)

POST-FRONTIER:
  8. Coinbase Agentic Wallets — Shield as safety layer for agent wallets
  9. Virtuals Protocol — Agent Security skill for ACP
  10. ChainUp — Enterprise security infrastructure
```

---

# PART 13: FRONTIER POSITIONING

```
BEFORE SHIELD:
  Buzz = "AI agent that scores tokens for exchange listing"
  Competition: Other scoring tools, other listing services

AFTER SHIELD:
  Buzz = "AI agent security intelligence platform"
  Competition: Nobody. New category.

  The pitch:
  "Buzz doesn't just score tokens. It protects the agents that trade them.
   250,000 AI agents are on-chain. $45M was drained this year.
   Google DeepMind identified 6 categories of agent attacks.
   We built defenses for all 6.

   Free tier: any agent, any framework, install with one command.
   Paid tier: $0.01 per scan, USDC on Base, no API keys.

   Token intelligence + agent security = complete trust layer.
   Built by a chef. Used by agents. Verified on-chain."

JUDGE PERSPECTIVE:
  Other submissions: "We built a trading bot" or "We built a DeFi tool"
  Buzz: "We built the safety layer that every other agent needs"

  That's infrastructure. That wins hackathons.
```

---

# PART 14: ADR-023

```markdown
# ADR-023: Buzz Shield — Agent Security Intelligence

## Status: PROPOSED

## Context

250,000+ AI agents on-chain. $45M+ drained in 2026.
Google DeepMind published 6 attack categories.
Anthropic warned agents can exploit contracts autonomously.
Claw Wallet launched Apr 2 as first "B2A" wallet.
Nobody builds the intelligence layer between agent and action.

## Decision

Build Buzz Shield as a new module:

- Program risk scorer (0-100)
- Instruction scanner (parse unsigned Solana transactions)
- Drain pattern library (20 initial patterns)
- Shield verdict engine (SAFE/CAUTION/WARNING/DANGER)
- Free tier (community safety) + x402 paid tier
- Solana Agent Skill for distribution
- Integration with Wallet Guard, MiroFish, scoring engine

## Architecture

5 new tables, 7 new endpoints (3 free + 3 x402 + 1 stats),
10 feature flags, wired to PULSE + autoDream.

## Consequences

- Buzz becomes agent security infrastructure (not just token scoring)
- New revenue stream ($0.01-$0.10 per scan + enterprise $500/mo)
- Frontier differentiator (only submission protecting OTHER agents)
- Free tier builds community moat (more scans = better detection)
- Partnership path with Claw Wallet, Blockaid, Solana Foundation
```

---

_Buzz Shield Build Plan | April 4, 2026_
_AI Agent Security Intelligence_
_Security before performance. Intelligence before execution._
_250,000 agents need this. $45M says they need it now._
_Free for the community. Paid for the power users._
_Built by a chef. Protecting agents. Bismillah 🤲_
