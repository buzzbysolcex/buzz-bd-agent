# Token Rug Patterns — Cross-Pillar Compound

**Purpose:** Catalog the failure patterns that flag tokens in the scoring engine (Pillar 1) as rug-risk, and map each pattern to its cross-pillar relevance for bug research (Pillar 4). This file is the FIRST cross-pollination compound between Pillar 1 and Pillar 4.

**Authority:** Created 2026-05-27 as Phase 1 of Four-Pillar Loop (Ogie operator directive). Companion to `npm-scorer/lib/scorer.js` (canonical 11-rule engine).

**Maintenance rule:** every Pillar 1 scoring cron cycle that produces a <30 score MUST append the token as an example. Every Pillar 4 Gate 2 confirm should be checked against this catalog for cross-pillar penalty-rule augmentation.

**Versioning:** v1.0 = initial 11-rule baseline (extracted from `npm-scorer/lib/scorer.js`). v1.1+ = adds Pillar 4 cross-feed rules.

---

## Pattern catalog (11 baseline rules, mapped to Pillar 4 lenses)

### TRP-1 — FDV Gap (Insider Allocation Pre-Dilution)

**Pillar 1 signature:** `FDV / marketCap > 5` → −15 points; `> 3` → −8.

**Mechanism:** A large fully-diluted-value vs. circulating-market-cap gap indicates a heavy unlocked supply waiting in team/insider wallets. When unlocked, that supply dilutes holders without proportional buy-side demand. Classic exit-liquidity-for-insiders setup.

**Pillar 4 cross-applicability:** **None direct** — FDV-gap is a tokenomics signal, not a code-level vulnerability. Bug research targets typically have audited tokens with disclosed schedules. However: if a Lane 5 target's governance token has a hidden mint path (DC-9 sub-1: unchecked-mint without timelock) AND the token's published FDV omits the mint-able supply, the token would score FDV-gap-style penalty on a re-evaluation, AND the bug-research surfaces the mint mechanism. **Cross-feed**: a confirmed mint-without-timelock finding in Pillar 4 should trigger a Pillar 1 FDV re-evaluation of any affected token.

**Anchor target list:** (populated by cron cycles — empty at v1.0)

---

### TRP-2 — Stablecoin Misclassification

**Pillar 1 signature:** Symbol matches major stablecoin list (USDT/USDC/DAI/BUSD/TUSD/FRAX/LUSD/GUSD/USDP/PYUSD) → −100 (instant-kill).

**Mechanism:** Stablecoins are not scoring candidates (they're peg-targeting, not appreciation-targeting). Excludes them from the funnel.

**Pillar 4 cross-applicability:** This is a SCOPE filter, not a vulnerability pattern. But the inverse signal IS valuable: a token claiming to be a stablecoin that fails depeg invariants is the entire CDP/LST family Pillar 4 has been hunting (Notional V3, Stader ETHx, Lista lisUSD). **Cross-feed**: when a stablecoin has Doctrine #29 v1.1 MIN-cap defense ABSENT in Pillar 4, surface to Pillar 1 as a "stablecoin-with-depeg-risk" override that re-enters the scoring pipeline with a different rule set.

**Anchor target list:** (populated by cron cycles)

---

### TRP-3 — Ghost Token (No Real Activity)

**Pillar 1 signature:** `txns24h < 10 AND volume24h < 1000` → −100 (instant-kill).

**Mechanism:** Token has been deployed but has effectively zero trading. Either abandoned launch, pre-launch staging, or honeypot waiting to bait holders.

**Pillar 4 cross-applicability:** **DIRECT** — Ghost tokens often pair with honeypot mechanisms. The Pillar 4 detector class DC-13 (notification-callback admits attacker-controlled notifee) + DC-3 (access control) often surfaces in honeypot contracts. **Cross-feed**: Pillar 1 Ghost-Token + Security flags ≥ 2 + new-deployer should auto-queue the contract for Pillar 4 quick-scan (`shield/audit/full` via local instance) to extract the honeypot mechanism into the brain corpus.

**Anchor target list:** (populated by cron cycles)

---

### TRP-4 — Contradictory Audit (Conflict-of-Sources)

**Pillar 1 signature:** `securityFlags.length > 0 AND securityClean = true` → −20.

**Mechanism:** One source flags security issues; another source reports clean. The contradiction itself is the signal — either a stale audit, a half-implemented fix, or a manipulated data source.

**Pillar 4 cross-applicability:** **STRONG** — this is the same META-pattern Buzz's Self-Correction Layer Contradictions Register tracks at the doctrine level. When a target carries conflicting external-source signals, the Phase 0 audit-dedup discipline (post-Stader lesson) demands resolution before paste-ready investment. **Cross-feed**: Contradictory-audit tokens whose contracts are in a Lane 5 program's scope should automatically trigger an enhanced Phase 0 dedup pass (read ALL conflicting sources, not just the most recent).

**Anchor target list:** (populated by cron cycles)

---

### TRP-5 — Security Penalty (Honeypot / Multiple Flags)

**Pillar 1 signature:** Honeypot flag → −50; `flags.length > 2` → −25; any flag → −10.

**Mechanism:** Direct security-tool flags from RugCheck / GoPlus / TokenSniffer / on-chain probe. Includes honeypot detection (can buy but can't sell), buy-tax > 50%, blacklist functions, mint-without-cap, pause functions, upgradeable proxies without timelock.

**Pillar 4 cross-applicability:** **DIRECT, MULTIPLE LENSES**:
- Honeypot: DC-3 (access control denying sell-path conditional on caller identity)
- High buy/sell tax: not a Pillar 4 pattern (it's documented behavior)
- Blacklist functions: DC-9 sub-1 (privileged state mutation without defense-in-depth)
- Mint-without-cap: DC-9 sub-1 (the canonical anchor — affects $320M+ combined exposure in active Lane 5 surface)
- Pause functions: governance-class, Pillar 4 only cares if pause is exploitable
- Upgradeable proxies without timelock: DC-9 sub-3 (canonical upgradeable-hook-no-timelock anchor)

**Cross-feed**: any token scoring −25 or below on TRP-5 with a deployer that ALSO deploys contracts in active Lane 5 scope (cross-ref via `Deployer-Crossref.md`) should escalate to Pillar 4 emergency Gate 1 (skip queue, immediate dispatch).

**Anchor target list:** (populated by cron cycles)

---

### TRP-6 — Low Liquidity (Pump-and-Dump Setup)

**Pillar 1 signature:** `liquidity < $10,000` → −20; `liquidity > $1M` → +10 (bonus).

**Mechanism:** Low liquidity tokens can be moved with small capital — both up (pump) and down (dump). Combined with TRP-9 (Ghost Volume / wash trading), this is the classic memecoin manipulation profile.

**Pillar 4 cross-applicability:** **NONE direct** — but the inverse is operationally relevant: Pillar 4 protocols with HIGH TVL on a token that scores TRP-6 penalty have a tail-risk surface (liquidation thresholds may be unmet under realistic price-impact scenarios for the underlying). **Cross-feed**: Pillar 4 Gate 1 surface-map should include "what is the dominant collateral token's TRP-6 score?" as a 6th target-class addition to the 5-Target Quality Checklist (under "Liquidation/Oracle").

**Anchor target list:** (populated by cron cycles)

---

### TRP-7 — Age Bonus (NOT a rug pattern; counter-signal)

**Pillar 1 signature:** `ageDays > 365` → +10; `> 90` → +5.

**Mechanism:** Older deployments have survived more potential rug windows. Strong positive signal.

**Pillar 4 cross-applicability:** **INVERSE — codebase staleness signal.** A protocol with `ageDays > 1000` AND `0 commits to scope contracts in past 180 days` is the Doctrine #32 v1.1 cycle-2 FAIL pattern (foreclose). But same protocol if `product-deployment-activity > 0` is Doctrine #37 Sub-Type B PROCEED. **Cross-feed**: TRP-7 high age + Lane 5 monitoring of product activity = Doctrine #37 sub-type classifier input.

**Anchor target list:** (populated by cron cycles — rhinofi 440d frozen + product-live = anchor)

---

### TRP-8 — Volume Threshold (Below Minimum Trading Activity)

**Pillar 1 signature:** `volume24h < $5,000` → −15; `> $1M` → +10.

**Mechanism:** Low 24h volume = no real market participation. Strong-volume = healthy market.

**Pillar 4 cross-applicability:** **NONE direct** — volume is a market signal, not a code property. Indirect: low-volume tokens are unlikely to have bounty programs (no economic incentive to attack), so cross-reference with Lane 5 is unlikely to surface anything.

**Anchor target list:** (none expected)

---

### TRP-9 — Ghost Volume (Wash Trading)

**Pillar 1 signature:** `volume24h > $100K AND txns24h < 50` → −20 (suspected wash trading).

**Mechanism:** High volume from few wallets indicates the same actor trading with themselves to inflate the volume metric. Pre-listing-exchange manipulation.

**Pillar 4 cross-applicability:** **WEAK direct, STRONG indirect.** Wash trading isn't a code vulnerability. But: wash-trading is the market-side signal that the underlying token has a CENTRALIZED operator. If that operator's contracts are in Lane 5 scope, the operator's wallet is a single point of compromise. **Cross-feed**: TRP-9 + deployer wallet that's also a multi-sig signer on a Lane 5-scoped contract = elevated DC-3 (access-control) priority for that protocol.

**Anchor target list:** (populated by cron cycles)

---

### TRP-10 — Community Takeover Flag

**Pillar 1 signature:** `cto = true OR description contains "community takeover"` → −10.

**Mechanism:** CTO = original team abandoned the project, community took over the token (typically marketing/social, not contract). Contracts remain as deployed; trust shifts from team to community. Higher governance-risk.

**Pillar 4 cross-applicability:** **MEDIUM direct.** A CTO'd token's contract is fixed (no updates, no fixes), so any latent vulnerability stays exploitable indefinitely. **Cross-feed**: CTO'd tokens with TVL > $1M in DeFi protocols (lending/AMM) are PERMANENT Lane 5 watchlist candidates — the vulnerability surface won't be patched.

**Anchor target list:** (populated by cron cycles)

---

### TRP-11 — Volume/Liquidity Ratio Spike

**Pillar 1 signature:** `volume24h / liquidity > 10` → −15 (suspicious).

**Mechanism:** Volume disproportionately high relative to pool liquidity = wash trading OR coordinated pump. Either way, the price action is not organic.

**Pillar 4 cross-applicability:** **NONE direct** — pure market signal. Indirect: under-collateralized lending pools that allow user-supplied tokens with high V/L ratio as collateral are vulnerable to manipulated-collateral-value attacks (similar to the Mango Markets incident). **Cross-feed**: Pillar 4 lending-protocol Gate 1 should check the collateral whitelist for any TRP-11-flagged tokens.

**Anchor target list:** (populated by cron cycles)

---

## Cross-pollination summary (Pillar 1 ↔ Pillar 4 wiring)

| TRP rule | Pillar 4 lens | Wire-strength | Cross-feed trigger |
|---|---|---|---|
| TRP-1 FDV Gap | DC-9 sub-1 mint without timelock | Indirect | Pillar 4 mint-finding → re-eval Pillar 1 FDV |
| TRP-2 Stablecoin | Doctrine #29 v1.1 MIN-cap | Strong | Pillar 4 MIN-cap-absent → Pillar 1 depeg-risk override |
| TRP-3 Ghost Token | DC-13 honeypot + DC-3 access | Direct | TRP-3 + new-deployer → auto-queue Pillar 4 quick-scan |
| TRP-4 Contradictory Audit | Self-Correction Layer Contradictions Register | Strong-meta | Contradictory-audit tokens → enhanced Phase 0 dedup |
| TRP-5 Security Penalty | DC-3 + DC-9 sub-1/sub-3 | Direct multiple | TRP-5 −25+ + Lane 5 scope deployer → emergency Gate 1 |
| TRP-6 Low Liquidity | (none direct) | Inverse | Pillar 4 collateral-token check (6th target-class) |
| TRP-7 Age (counter) | Doctrine #32 v1.1 + #37 sub-types | Strong-classifier | Age + product-activity → sub-type input |
| TRP-8 Volume Threshold | (none) | None | — |
| TRP-9 Ghost Volume | DC-3 single-operator | Strong-indirect | TRP-9 + multi-sig overlap → elevated DC-3 priority |
| TRP-10 CTO | DC-3 (unpatchable) | Medium | CTO + TVL > $1M → PERMANENT Lane 5 watchlist |
| TRP-11 Vol/Liq Spike | (none direct) | Indirect | Lending collateral whitelist check |

---

## Maintenance loop

**Daily cron (Pillar 1 scoring cycles):**
- For every token scored < 30: append a row to the corresponding TRP-N anchor target list
- Format: `<address> | <chain> | <ticker> | <score> | <triggered_rules>`
- File via the scoring cron output handler (not yet wired — Phase 1 task)

**Per Pillar 4 Gate 2 confirm:**
- Check the exploit pattern against the 11 TRP rules
- If a new exploit pattern is NOT covered by any existing rule, draft a TRP-12+ proposal
- File under "Brain compounds queued" in the paste-ready submission and surface to operator

**Weekly synthesis review:**
- Count of <30 tokens caught by each TRP rule
- Cross-pillar trigger events fired in the week
- Promotion candidates (TRP rule with 10+ anchors in a single week → consider weight increase)

---

_Brain Token Rug Patterns | v1.0 | 2026-05-27 | 11 rules baselined from `npm-scorer/lib/scorer.js`. Cross-pillar wiring documented. Anchor target lists empty pending cron wire-up._
