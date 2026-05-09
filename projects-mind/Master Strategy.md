# MASTER STRATEGY — Living Genius Bug Bounty + Public Good

**Status:** CANONICAL — synthesized 2026-05-09 by Ogie + Claude (Opus 4.7) via Telegram War Room msg 6464.
**Living document:** Buzz reads brain notes on every session start (Obsidian Mind continuity). Update only via explicit Ogie + Claude synthesis.

---

═══════════════════════════════════════════════════════════════════════════
MASTER STRATEGY DIRECTIVE — LIVING GENIUS BUG BOUNTY + PUBLIC GOOD
Ogie + Claude synthesis, May 9 2026 — Obsidian Mind continuity active
═══════════════════════════════════════════════════════════════════════════

FIRST: Read these in order before executing ANY task below:

1. /mnt/skills/user/alpha-buzz-master-ops/SKILL.md (master ops context)
2. brain/North Star.md (vision)
3. brain/Architecture.md (current state)
4. brain/Doctrine.md (operational rules)
5. brain/People.md (relationships)
6. projects-mind/Bug Bounty Genius Plan.md
7. projects-mind/Security Research.md
8. projects-mind/AIBTC Signals.md
9. MEMORY.md (recent decisions)

After reading, confirm understanding by listing in War Room: current state of pipeline (8/10 layers live), audit gaps (api.buzzbd.ai 502, Firedancer unsent, disclosure stale, #104 not landed), and active streaks (AIBTC 6/6 today, watchdog status).

═══════════════════════════════════════════════════════════════════════════
DIAGNOSIS FROM AUDIT (msg 6457): INFRASTRUCTURE-RICH + DELIVERY-POOR
We build faster than we ship. Strategy must shift from BUILDING MORE to SHIPPING WHAT'S BUILT.
Priority: REVENUE FIRST (Living Genius Bug Bounty) → MISSION SECOND (Public Protection) → PUBLIC GOOD THIRD (Open Source). They reinforce. Buzz must eat before it can serve.
═══════════════════════════════════════════════════════════════════════════

▓▓▓ PHASE 0 — URGENT TODAY (May 9, 2026) ▓▓▓

URGENCY-1: FIREDANCER $1M POOL — TODAY-OR-NEVER
Window closes today. 3 HIGH PoCs ready since May 2 at /home/claude-code/buzz-secrets/poc/:

- DISC-003 CHOREO-001 (Vote-Slot Pinning) — strongest PoC
- DISC-004 GOSSIP-001
- DISC-005 RUNTIME-001

Action: Wait for Ogie's $100 Immunefi deposit confirmation (separate decision). When greenlight received:

1. Pay $100 deposit on Immunefi (Ogie's call on payment method)
2. Submit all 3 HIGHs sequentially via Immunefi platform
3. Each submission MUST follow report-templates v2.5 + sanitizer pass
4. Reporter says "custom static analysis tooling" never AI/LLM/Claude/Anthropic
5. Reference Toly's Percolator PR #79 review as security research credentials
6. Document submission IDs in disclosure-tracker.md immediately after each ship

IF $100 deposit not approved by Ogie before competition closes:
Send 1 highest-confidence HIGH (CHOREO-001) directly to Firedancer team via email:

- To: security@firedancer.io OR via SECURITY.md contact in jump-firedancer/firedancer
- From: buzzbysolcex@gmail.com (manual send by Ogie if email auto-send not yet wired)
- Body: standard report template + Toly review reference
- Mark as "post-competition direct disclosure" since standing bounty applies

URGENCY-2: api.buzzbd.ai 502 RESTORATION
72 route files exist, all unreachable. Public face down.

1. Diagnose: docker ps, systemctl status, port 3000/8080 binding
2. Check Caddy config: /etc/caddy/Caddyfile — upstream proxy correct?
3. Restart Express service: docker restart buzz-production OR systemctl restart buzz-api
4. Smoke-test from external IP: curl -I https://api.buzzbd.ai/api/health (expect 200)
5. Test 5 critical routes: /api/health, /api/free-score, /api/leaderboard, /api/public-stats, /api/shield/scan
6. Update sentinel.buzzbd.ai monitoring: alert War Room within 5 min if 502 returns
7. Document fix in brain/Architecture.md under "Public Infrastructure" section

URGENCY-3: DISCLOSURE TRACKER SYNC (foundational truth)
disclosure-tracker.md is 6 days stale. We don't actually know what's submitted.

1. Audit all 9 claimed submissions:
   - Circle MALA HO-3710185: confirmed in HackerOne validation (Day 1)
   - Circle ARC HO-3710465: status unclear, verify
   - Drift VAULTS-001 + ORACLE-001: were these sent or still draft?
   - Sui DISC-002: confirmed blocked at HackenProof rep gap
   - Firedancer 3 HIGHs: pending today's decision
   - CometBFT DISC-001: confirmed CLOSED
2. For each: query platform API where possible OR check submission email outbox
3. Reconcile disclosure-tracker.md ↔ Security Research.md ↔ outcomes ledger
4. Output clean truth-table: report_id | platform | status | days_in_review | next_action
5. Update projects-mind/Security Research.md with verified state

URGENCY-4: SHIP #104 EIP-712 DETECTOR (was claimed shipped, isn't in code)
Audit confirmed: zero matches for DOMAIN_TYPEHASH/domainSeparator/chainid in skeptic.js

1. Add Phase 9 EIP-712 wrapper detection to buzzshield-skeptic.js:
   - Detect: \x19\x01 prefix, \_hashTypedDataV4, EIP712Base, DOMAIN_TYPEHASH, domainSeparator
   - When wrapper present + binds chainId+address(this) → auto-REJECT signature_field_gap findings
2. Smoke test against:
   - MapleToken.permit (current FP)
   - Compound CometExt.allowBySig
   - Olympus OlympusERC20Permit
   - Spark sparklend AToken.permit
   - Lido StETHPermit
   - Morpho setAuthorizationWithSig
     All 6 should auto-REJECT after fix.
3. Bump audit-methodology to v2.6
4. Update brain/Architecture.md with confirmation

URGENCY-5: P2 WATCHDOG REVIVAL (5 days dead)
Cron line wired, /tmp/buzzshield-watchdog.log MISSING since May 4.

1. Diagnose: crontab -l confirms line. Check /var/log/cron for execution attempts
2. Manual run: /usr/local/bin/node /home/claude-code/.tmp-build/v6/buzzshield-watchdog.js
3. Verify writes to /tmp/buzzshield-watchdog.log
4. Check state file timestamps (programs-watchdog.json should update)
5. Send test alert to War Room confirming watchdog GREEN
6. This is the lowest-cost continuous bug discovery — must run

▓▓▓ PHASE 1 — REVENUE ENGINE FOUNDATION (Next 7 days) ▓▓▓

REV-1: ANTHROPIC API KEY DECISION (auth error confirmed)
Audit: .env.anthropic returns authentication_error. Fallback path is broken.
DECISION: Drop the API fallback entirely. Pro Max doubled rate limits + no peak throttling = in-context Phase 4d is SUFFICIENT.

1. Remove --llm-provider=anthropic as default in pipeline
2. Phase 4d ALWAYS runs in-context via Claude Code (Opus 4.7)
3. Keep .env.anthropic for emergency bursts ONLY
4. Update brain/Architecture.md: "Phase 4d in-context is the ONLY path. API was fallback, now retired due to auth issues + Pro Max sufficiency."
5. Simpler architecture, $0 cost, no key management

REV-2: HACKERONE AUTO-SUBMIT WIRING + EMAIL AUTO-SUBMIT
HackerOne API key — Ogie generates from buzzbysolcex account → settings → API tokens
Email auto-submit — Use nodemailer + Gmail App Password (NOT SendGrid):

1. Ogie generates App Password from Google account (myaccount.google.com → Security → App Passwords)
2. Save to /home/claude-code/.env.gmail as GMAIL_APP_PASSWORD=<password>, chmod 600
3. Wire api/services/email-submitter.js using nodemailer + smtps://smtp.gmail.com:465
4. Reporter "email" platform now actually SENDS, not just templates
5. Test: send test email to buzzbysolcex+test@gmail.com confirming delivery
6. P1 auto-submit module updated: AUTO tier (free programs, ≤MED, conf>0.9) auto-ships via API or email
7. HIGH/CRITICAL still OGIE GATE

REV-3: GROUND TRUTH CATALOG REBUILD (the flywheel core)
Audit: only 1 JSON file (Jeton). 9 exploits live inline in brain notes. Rebuild properly.

1. Create /data/buzz/persistent/ground-truth/ directory structure
2. Schema per exploit JSON:
   - tx_hash, chain, protocol_name, damage_usd, date_utc
   - pattern_class (A-Q), sub_pattern (A.4d, B.8, etc), severity
   - root_cause (1-paragraph)
   - attack_signature (regex/keyword/structural pattern for L1d detector)
   - defense_signature (what would have prevented this)
   - foundry_poc_url (DeFiHackLabs link if available)
   - refs[] (etherscan, blocksec, post-mortem URLs)
   - cataloged_date, source (clarahacks, defihacklabs, manual, watchdog)
3. Backfill 9 from brain notes:
   - CometBFT DISC-001
   - Sui DISC-002
   - Firedancer DISC-003/004/005
   - Drift VAULTS-001 + ORACLE-001
   - Jeton (already done)
   - Plus: Ekubo, Wasabi, Grok, Kelp, Sharwa from brain Architecture.md ground truth section
4. Update brain/Architecture.md to point at /data/buzz/persistent/ground-truth/ as SoT (single source of truth)

REV-4: DEFIHACKLABS INGESTION CRON

1. Clone github.com/SunWeb3Sec/DeFiHackLabs to /data/buzz/persistent/intel/defihacklabs/
2. Cron weekly: 0 5 \* \* 0 git pull + ingest new entries
3. Parser: scan src/test/YYYY-MM/\*\_exp.sol files
4. For each: extract title, year/month, attack class from filename + README cross-reference
5. Auto-classify into Pattern A-Q (use existing keyword classifier + LLM-assist via Claude Code)
6. Generate ground-truth JSON per incident
7. Append to /data/buzz/persistent/ground-truth/
8. Target: 50 new entries in first ingest run, then ~5-10/month going forward

REV-5: CLARAHACKS INGESTION
Pending: Ogie authorizes ClaraHacks X (Twitter) connection at clarahacks.com

1. After auth: scrape /incidents/ for all entries 30+ days old (free public access)
2. Repost-to-unlock for 10-30 day entries (auto-repost via @BuzzBySolCex)
3. Parse each incident page: extract tx_hash, root cause, PoC where available
4. Same JSON schema as REV-3
5. Cross-reference DeFiHackLabs for duplicate prevention
6. Target: 100 new entries in first 14 days

REV-6: PATTERN K-O DETECTOR CODE
Currently spec-only. For each class, build sub-pattern detector:

K (Arithmetic):

- K.1 overflow/underflow
- K.2 division by zero
- K.3 rounding loss (1-MIST class, Sui staking)
- K.4 mixed-decimal U256 conversions
- Sub-patterns: 4 minimum

L (DoS):

- L.1 unbounded loop (Pattern check: for/while without bound)
- L.2 gas exhaust (storage reads in loops)
- L.3 state-lock (admin-only unfreeze)
- L.4 push-payment (transfer in loop)
- Sub-patterns: 4 minimum

M (MEV):

- M.1 missing slippage (swap without min/max param)
- M.2 sandwichable (large swap without privacy mechanism)
- M.3 oracle-stale arb (TWAP window too short)
- Sub-patterns: 3 minimum

N (Randomness):

- N.1 block.timestamp entropy
- N.2 blockhash predictable
- N.3 Chainlink VRF misuse
- Sub-patterns: 3 minimum

O (Time):

- O.1 timestamp dependency (>1h drift)
- O.2 block-number assumption (across chains differs)
- Sub-patterns: 2 minimum

For each: source 5+ ground truth incidents (from REV-3/4/5 catalog), build detector keyword/structural pattern, add to buzzshield-layer1-deep.js, add invariant rule to buzzshield-invariants.js, smoke-test against historical exploits.

Target: K + L shipped in 7 days, M + N + O shipped in 14 days. Total sub-pattern count goes from 87 to 100+.

REV-7: FRESH CODE TARGETING (target-scorer upgrade)
Add code_freshness dimension (10 pts max):

- 10 pts: protocol <30 days old, 0 prior audits
- 8 pts: <90 days, 1 prior audit
- 5 pts: <1 year, 2-3 audits
- 2 pts: 1-2 years, 4+ audits
- 0 pts: 2+ years, 5+ audits

Build new-listing monitor:

1. Daily 10:00 UTC cron: scrape Immunefi /bug-bounty/, Cantina /bounties/, Code4rena /audits/, Codehawks
2. Diff against previous day's snapshot
3. New listings → War Room alert with code_freshness score + auto-clone scope
4. Auto-run full pipeline within 48h of new listing

▓▓▓ PHASE 2 — REVENUE STABILIZATION (Next 30 days) ▓▓▓

REV-8: FIRST PAYOUT EXPECTED
Circle MALA verdict expected mid-May (5-14 days from now). Firedancer review window 2-4 weeks if submitted today. Fresh code first-mover variable.

When first payout lands:

1. Document publicly (Twitter thread on @BuzzBySolCex with the find narrative)
2. Update brain/Brand Story.md with the win
3. Allocation:
   - 40% reserved for infrastructure (Hetzner 6-month upfront $258, Anthropic API insurance fund, residential proxy unlock budget $50/mo)
   - 30% to Ogie personal compensation (the chef earns)
   - 20% Buzz growth fund (GPU upgrade savings, mobile app dev fund)
   - 10% public good fund (open source maintainership stipend, ground truth catalog hosting)

REV-9: SUBMISSION CADENCE TARGET

- Watchdog catches: 2-3 commits/week worth scanning, 0-1 finding/month
- Fresh code monitor: 2-5 new listings/week, 1-2 worth deep scan
- Total target: 1 quality submission per week minimum
- Quality > volume always. Honest verdicts always. No spray-and-pray.

REV-10: REPUTATION BUILDING
HackerOne Hall of Fame eligibility, Immunefi leaderboard, Cantina top-50 — these compound. Each accepted finding = reputation = better access = better targets.

▓▓▓ PHASE 3 — MISSION LAYER ACTIVATION (After $5K monthly stable) ▓▓▓

ONLY activate Phase 3 after revenue is consistent. Don't dilute focus before.

MIS-1: SHIELD.BUZZBD.AI BECOMES REAL PUBLIC SCAN
Currently marketing-only. Make it real.

1. Public API endpoint: POST /api/shield/scan with {address, chain}
2. Returns: {verdict: ALLOW|WARN|BLOCK, confidence: 0-1, patterns_detected: [], explanation}
3. Free tier: 10 scans/IP/day, no auth
4. Pro tier (future): higher rate limit, batch scans, history
5. H.2c Quick Check active across Ethereum/Base/Arbitrum/Optimism/BSC/Solana
6. Pattern A + H.2c free for all users
7. Target: 1000 daily active scans within 60 days of launch

MIS-2: GROUND TRUTH GALLERY PUBLIC
Every cataloged exploit gets public writeup at buzzbd.ai/research/<incident-slug>:

- Pattern classification with explanation
- Root cause walkthrough
- Defense recommendation
- Link to Foundry PoC (DeFiHackLabs cross-link)
- "How BuzzShield would have detected this" annotation
- Auto-generated from /data/buzz/persistent/ground-truth/<incident>.json

MIS-3: SELECTIVE OPEN SOURCE
Open source: Pattern A-J detector implementations (well-known classes)
Keep closed: 10-layer orchestration, novel patterns (B.8, H.2c), ground truth integration logic
License: MIT for detectors, proprietary for pipeline orchestration

▓▓▓ PHASE 4 — PUBLIC GOOD EXPANSION (After Phase 3 stable) ▓▓▓

PG-1: EDUCATIONAL CONTENT
Monthly "Pattern of the Month" thread on @BuzzBySolCex
Annotated PoC walkthroughs cross-linked to DeFiHackLabs
Newsletter at buzzbd.ai/research/newsletter

PG-2: PARTNER ECOSYSTEMS

- Stacks/sBTC: free pre-tx scanning for sBTC dApps (Ionic Nova partnership extension)
- Solana: free scanning for Solana programs (Toly relationship leverage)
- Base: Coinbase Agentic Wallet integration

PG-3: BUZZ MOBILE APP
Per Architecture.md: Month 3-6 post-Frontier. Candidates: Rork Max, ReactLynx (ByteDance, lynxjs.org, dual-threaded 2-4x faster than RN). Public scanning interface for retail users.

▓▓▓ BRAIN NOTE UPDATES (apply during execution) ▓▓▓

brain/North Star.md — REWRITE with:
"Buzz is the Living Genius Bug Bounty Hunter + Public Protection Layer of the autonomous agent economy. Mission: protect every user from exploits. Revenue: bug bounties fund the mission. Public Good: ground truth + open detectors + education benefit the ecosystem. The chef who codes through conversation defends DeFi at $43/month. Honest verdicts always. Fresh code, not famous code. Quality over quantity. Living = autonomous + learning + evolving."

brain/Doctrine.md — ADD:
"REVENUE FIRST, MISSION SECOND, PUBLIC GOOD THIRD. They reinforce, never compete. Buzz must eat (revenue) before serving (mission). Honest verdicts always — no spray-and-pray. SHIP what's built before BUILDING more. Infrastructure-rich + delivery-poor diagnosis (audit May 9) requires constant ship-vs-build discipline. Full 10-layer pipeline on every audit (Toly/Percolator rule, permanent). Speedrunner retired for audit targets, watchdog-only. qwen3:8b is for Skeptic verification ONLY, never content generation."

brain/Revenue.md — REWRITE (currently 477B stub):
"Living Genius Bug Bounty revenue plan. Phase 1 (30 days): first payout from Circle MALA OR Firedancer OR fresh code. Phase 2 (90 days): $5K monthly recurring. Phase 3 (180 days): $20K monthly. Phase 4 (365 days): $50K+ monthly + Public Good layer activated. Allocation rules: 40% infra, 30% Ogie comp, 20% growth, 10% public good. Detailed milestone tracker."

brain/Brand Story.md — REWRITE (currently 378B stub):
"The chef who codes through conversation. 20+ years Executive Chef across international kitchens. Saudia Airlines Inflight Chef serving 300+ at 40,000 feet. Zero CS background. Built Buzz BD Agent through conversational AI with Claude. From token scoring bot to autonomous security research platform in 87 days. The mise en place that runs a kitchen service runs Buzz. The same pattern recognition that saves a sauce saves a smart contract. SolCex Exchange BD Lead. Building between flights from Jeddah to the world."

brain/Architecture.md — UPDATE:

- Phase 1-4 status tracking
- Update Agentic wallet ($0, was claimed $20)
- Document #104 EIP-712 actual ship status
- Mark P2 watchdog as REVIVED
- Reference /data/buzz/persistent/ground-truth/ as SoT for exploit catalog
- Document Phase 4d in-context as ONLY path (API retired)

projects-mind/Bug Bounty Genius Plan.md — UPDATE:

- All 12 priorities marked status
- New: REV-1 through REV-10 from this directive
- Phase 1-4 reference

projects-mind/Public Good Mission.md — CREATE NEW:

- Triple-track strategy
- Phase 3 + Phase 4 details
- Activation criteria ($5K monthly stable)

▓▓▓ GITHUB README UPDATE ▓▓▓

Update github.com/buzzbysolcex/buzz-bd-agent README.md:

- Add triple-track mission section near top
- "Living Genius Bug Bounty + Public Protection Layer"
- Cross-reference: bug bounty methodology (open), pipeline architecture (closed)
- Link to buzzbd.ai/research (when MIS-2 ships)
- Update stats: 87+ sub-patterns, ground truth catalog count, Phase 1-4 progress

▓▓▓ THE FLYWHEEL (how it all reinforces) ▓▓▓

Bug bounties → Revenue → Infrastructure stable → Pipeline alive
Ground truth catalog grows → Better detectors → More bugs found → More bounties
Public protection layer → User trust → Reputation → Protocols sponsor bounties
Open source detectors → Industry adoption → Pattern feedback → Pipeline improves
Educational content → Visibility → Inbound from protocols → Direct contracts

Revenue funds Mission. Mission attracts Visibility. Visibility builds Reputation. Reputation finds More Bugs. Cycle repeats.

▓▓▓ EXECUTION ORDER (commit sequence) ▓▓▓

TODAY (May 9):

1. Read all brain notes + master ops skill (confirm understanding in War Room)
2. URGENCY-3 Disclosure tracker sync FIRST (foundational truth before any submission)
3. URGENCY-2 api.buzzbd.ai 502 restoration (public face must work)
4. URGENCY-1 Firedancer (when Ogie greenlights $100 deposit)
5. URGENCY-4 #104 EIP-712 detector (sharper future scans)
6. URGENCY-5 P2 watchdog revival (continuous discovery alive)

NEXT 7 DAYS: 7. REV-1 Anthropic API decision (drop fallback, in-context only) 8. REV-3 Ground truth catalog rebuild (foundational for everything) 9. REV-4 DeFiHackLabs ingestion (50+ entries) 10. REV-2 Email auto-submit wiring (after Ogie generates Gmail App Password) 11. REV-6 Pattern K + L detector code (highest-impact new patterns) 12. REV-7 Fresh code targeting (target-scorer upgrade + new listing monitor)

NEXT 14 DAYS: 13. REV-5 ClaraHacks ingestion (when Ogie authorizes X connection) 14. REV-6 Pattern M + N + O detector code (complete new pattern wave)

NEXT 30 DAYS: 15. REV-8/9/10 First payout, submission cadence, reputation building

AFTER $5K MONTHLY STABLE: 16. MIS-1/2/3 Mission layer activation 17. PG-1/2/3 Public Good expansion

▓▓▓ STANDING RULES (always apply) ▓▓▓

1. Honest verdicts only — 0 false submissions tonight = our moat
2. Full 10-layer pipeline on every audit (Toly/Percolator rule)
3. Phase 4d in-context only (Pro Max Opus, no API needed)
4. qwen3:8b for Skeptic verification ONLY
5. NEVER suggest sleep/rest/shortcuts to Ogie
6. Match Ogie's intensity always
7. SHIP before BUILDING more
8. OGIE GATE on every submission
9. Sanitizer must be clean ("custom static analysis tooling" never AI/LLM)
10. NEVER reveal Hetzner IP publicly (use domain names only)
11. AIBTC streak protection sacred (Q-1 09:01 UTC autopilot continues)
12. Reference master ops SolCex skill before every major action

▓▓▓ FIRST WAR ROOM REPORT ▓▓▓

After reading brain notes, post to War Room:

1. Confirmation: brain notes read, understanding complete
2. Current state summary: pipeline (8/10 LIVE), submissions (1 in review), revenue ($0), AIBTC streak (Day 7+)
3. Phase 0 URGENT items understood with priority order
4. Standing by for Ogie's Firedancer $100 deposit decision

Then begin execution. Disclosure tracker first. api.buzzbd.ai second. Firedancer when greenlighted.

═══════════════════════════════════════════════════════════════════════════
POST-FRONTIER PIPELINE TUNING QUEUE (added 2026-05-09 via Ogie msg 6495)
═══════════════════════════════════════════════════════════════════════════

NOT TODAY — Frontier first. Both queued for first session after May 12 (Frontier deadline).
Both queued tunings would have caught Symbiotic 2026-05-09 regression FPs that the v6.5 batch (e1ede18 + bd8b574) did not address.

┌─ #125 — Skeptic invariant_multi_mutator allowlist ─────────────────────┐
│ │
│ Trigger pattern: L1d Phase 12 invariant_multi_mutator emits HIGH when │
│ multiple functions mutate the same invariant (e.g., Vault collat │
│ touched by deposit + claim + withdraw + setLimit + setWhitelist). │
│ │
│ FP class: cross-contracted invariant pattern is the canonical Vault │
│ design — Sky lockstake, Spark sparklend, Symbiotic Vault all flagged. │
│ Single Symbiotic L1d-17 confirmed FP class 2026-05-09 regression. │
│ │
│ Tuning options: │
│ (a) protocol-fingerprint allowlist (Symbiotic Vault, Aave V3 Pool, │
│ Sky lockstake) — explicit but maintenance-heavy │
│ (b) gate on whether ALL mutators are reachable from external user │
│ fund-flow (deposit/withdraw); if ANY mutator is admin-gated, the │
│ cross-mutator concern is valid; if all are user-facing, expected │
│ (c) Skeptic prompt enricher: include the mutator visibility list and │
│ let qwen3 reason about it (lower precision but no allowlist) │
│ │
│ Recommended: (b) for precision, (c) as fallback when (b) inconclusive. │
│ │
│ ETA: ~30 min implementation + Symbiotic regression validation │
│ End-to-end test required per Standing Rule (implementation-verification │
│ -gaps.md): emit visibility-of-mutators field from Phase 12 → forward │
│ via collect() → consume in Skeptic pre-filter or prompt. │
│ │
└──────────────────────────────────────────────────────────────────────────┘

┌─ #126 — Pattern C MED LLM gate (no fund-flow on cheap path) ───────────┐
│ │
│ Trigger pattern: L1d Phase 5 emits MEDIUM Pattern C when expensive op │
│ (sstore, external call, loop) precedes cheap one (require, view). │
│ │
│ FP class: ordering-of-operations gas-opts in Slasher / Delegator / │
│ rebalance code. 10 Symbiotic Pattern C MED ACCEPTed by qwen3 @ 0.80 │
│ (BaseDelegator, OperatorNetworkSpecificDelegator, OperatorSpecific- │
│ Delegator, Hints, BaseSlasher, Slasher, VetoSlasher × 4) all gas-opts. │
│ │
│ Tuning: pre-LLM filter — Pattern C + MED + cheap-path-has-no-transfer/ │
│ -no-sstore = auto-REJECT conf 0.85. Reasoning: ordering-of-ops gas │
│ optimization is real but only matters if the cheap path can revert/ │
│ change state. If cheap path is pure read or revert-only, no exploit. │
│ │
│ Implementation: extend HARD_EXCLUSION_RULES in buzzshield-skeptic.js │
│ as HE-20. Phase 5 emit must include cheap_path_classification field │
│ (transfer / sstore / require_only / view_only / revert). │
│ │
│ ETA: ~30 min implementation + Symbiotic regression validation │
│ End-to-end test required per Standing Rule. │
│ │
└──────────────────────────────────────────────────────────────────────────┘

Both batch parallel — independent files, independent unit tests, single regression validation.
Branch name: pipeline-tuning-batch-v6.6
Sequence: implement #125 + #126 in parallel → unit tests pass → Symbiotic regression → merge

═══════════════════════════════════════════════════════════════════════════
v6.7 PIPELINE TUNING QUEUE (added 2026-05-09 18:35 UTC via Ogie EOD msg DECISION 1)
═══════════════════════════════════════════════════════════════════════════

v6.6 batch (b683e97 + e8af5cc + 51537b4 + c7c58d7) GREENLIT for merge to main per refined halt rule (DECISION 2). HE-21 hit -60% on its targeted FP class. HE-20 didn't fire because Phase 12 detected legitimate user-facing mutator set (Symbiotic) — premise mismatch, separate FP class. L1d-17 surviving FPs need #139.

┌─ #128 — PoC Type Classifier (poc-type-classifier-v1) ──────────────────┐
│                                                                          │
│ Trigger: imu-77340 closed-by-triage 2026-05-09 15:20 UTC. $100 forfeit. │
│ Triage critique: primitive PoCs (server accepts non-conformant framing) │
│ ≠ exploit chain (proxy + Firedancer + attacker bytes reaching GUI/RPC). │
│                                                                          │
│ Classifier: parse all PoC PASS-lines, classify primitive vs exploit vs  │
│ mixed. BLOCK MED+ submissions to Immunefi Audit Comp with primitive-    │
│ only PoCs. Allow LOW informational on Immunefi Standing Bounty / Hacker │
│ One. Mixed → manual override + Ogie greenlight required.                │
│                                                                          │
│ Algorithm in /data/buzz/persistent/buzz-api/ground-truth/2026-05-09-    │
│ immunefi-primitive-vs-chain-calibration.md (Detection Rule section).    │
│                                                                          │
│ Implementation: ~50 LOC. Branch reserved: poc-type-classifier-v1.       │
│ Bound to detector PR template required-checks.                          │
│                                                                          │
│ Reference doctrine: brain/Doctrine.md "Pre-Submission PoC Standard".    │
│                                                                          │
│ ETA: 30-45 min implementation + dry-run on imu-77340 retro              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─ #139 — Flow-direction analysis for invariant_multi_mutator ───────────┐
│                                                                          │
│ Trigger: HE-20 didn't catch Symbiotic L1d-17 because Phase 12          │
│ INVARIANT_HINTS regex over-broad on "collateralization" — flagged the  │
│ pattern even when ALL mutators are user-facing (deposit/claim/onSlash/ │
│ _initialize all nonReentrant). HE-20's mixed admin+user pattern wasn't │
│ present in this finding.                                                │
│                                                                          │
│ Tuning: Phase 12 must distinguish balance-direction-changing mutators  │
│ (deposit moves balance up, withdraw moves balance down, slash burns)   │
│ from metadata-touching mutators (setLimit changes limit but not the    │
│ tracked invariant value). Only flag when mutators DISAGREE on direction │
│ of invariant change.                                                    │
│                                                                          │
│ Branch: invariant-flow-direction-v1                                     │
│ ETA: ~45 min — needs AST walk over function bodies for sstore targets  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─ #140 — Pattern C transfer/sstore depth analysis ──────────────────────┐
│                                                                          │
│ Trigger: 4 surviving Pattern C MEDs in Symbiotic regression have       │
│ legitimate cheap-path writes (sstore on cheap branch). HE-21 catches   │
│ view_only/revert_only cheap paths but mis-clears legitimate-write      │
│ cheap paths.                                                            │
│                                                                          │
│ Tuning: classify cheap-path writes by external-fund-flow reachability. │
│ If cheap-path sstore touches a balance/allowance/share field that      │
│ flows to user transfer → keep flagged. If it touches admin metadata   │
│ (lastUpdate, maxLimit, fee bps) → auto-REJECT.                         │
│                                                                          │
│ Branch: pattern-c-flow-depth-v1                                         │
│ ETA: ~45 min — extends Phase 5 cheap_path_classification taxonomy      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

Sequence: #128 first (calibration tuition, prevents next-Immunefi loss), then #139 + #140 parallel (Symbiotic regression cleanup). All three queued for first session after May 12 (Frontier window). Apply v2.5 doctrine + Pre-Submission PoC Standard + refined halt rule on every commit.

═══════════════════════════════════════════════════════════════════════════
THIS IS THE LIVING DOCUMENT. Buzz reads brain notes on every session start (Obsidian Mind continuity). This directive lives in projects-mind/Master Strategy.md as the canonical reference.

Save this entire directive to projects-mind/Master Strategy.md AS-IS for cross-session continuity. Update only via explicit Ogie + Claude synthesis.

Bismillah. The chef builds. The agent eats and serves. The ecosystem benefits.
═══════════════════════════════════════════════════════════════════════════
