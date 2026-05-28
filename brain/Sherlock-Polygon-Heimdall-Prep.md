# Sherlock x Polygon Heimdall v2 — Prep Package

**Engagement:** Sherlock x Polygon Heimdall v2 AI Auditor / Agent
**Application channel:** buzzbysolcex@gmail.com (acceptance pending; expect invite by email)
**Contest window:** June 15 – July 6 2026
**Rewards:** Six figures guaranteed
**Substrate:** Cosmos SDK + Tendermint, Go, consensus/validator layer (checkpoints → Ethereum + Bor sidechain integration)
**Engagement exclusivity:** Polygon/Heimdall **MUST NOT** be hunted on Immunefi during prep window. Findings go to Sherlock only.
**Authority:** Operator directive 2026-05-28 deep night.

---

## TASK STATUS

| Task | Status | Notes |
|---|---|---|
| 1. Brain audit Cosmos SDK | IN PROGRESS | Sections below |
| 2. Substrate research Heimdall v2 | DEFERRED — needs invite + repo access | Pre-work: identify public repo URL |
| 3. Detector priming | IN PROGRESS | Maps below |
| 4. Go toolchain verify | DONE: Go 1.22.2 + semgrep ✓ | staticcheck + gosec install running background |
| 5. Sherlock format intel | TODO | Search prior contest formats |
| 6. Wallet/USDC deposit ($250/sub) | TODO | Check post Firedancer payout |
| 7. KILL_LIST Polygon/Heimdall add | DONE | See §KILL_LIST below |

---

## §1 BRAIN AUDIT — Cosmos SDK applicable doctrines

### From dYdX V4 + Stride + Bifrost (Polkadot) + THORChain Bifrost intake history:

| Brain compound | Source anchor | Sherlock-Heimdall applicability |
|---|---|---|
| **Doctrine #36 PERMANENT — Substrate-Coverage Gate** (P-floor 0.05 binds for substrate-blind hunts) | dYdX V4 Cosmos-Go + Bifrost Polkadot-Substrate-Rust + Hydration | **APPLIES.** Heimdall is Cosmos-SDK-Go. Without Go AST detector coverage, P(finding) floor binds at 0.05. **CRITICAL: prep MUST build detectors #129/#137/#138/#165 to LIFT the floor before Jun 15.** |
| **Doctrine #34 sub-class b** (post-audit composition multiplier, 5+ anchors OPERATIONALLY PERMANENT) | Sky + Alchemix + DeFi Saver + Cap C1 + Cap C3 + Gnosis Chain + Flux + Spark | **APPLIES.** Heimdall v2 = post-v1 composition. Identify v1→v2 module additions. Highest-EV surface class. |
| **Doctrine #37 Sub-Type C CANDIDATE** (Unaudited-and-Active) | FRAX V3 frxUSD 2026-05-28 | **TBD.** Heimdall v2 has audits (Halborn 2023, Code4rena 2024 are common Polygon vendors); if v2 modules added post-audit, Sub-Type C applies. |
| **Doctrine #38** (Pure Pass-Through *WithSig STRUCTURAL FORECLOSE) | DeFi Saver | **LOW APPLICABILITY.** Cosmos SDK doesn't use EIP-712. Equivalent: Tendermint signatures (ed25519/secp256k1) — separate class. |
| **Doctrine #39 CANDIDATE + DC-13 sub-5** (Notification Path ≠ Authorization Path) | Filecoin DISC-020 | **APPLIES.** Cosmos SDK BeginBlocker/EndBlocker hooks vs ABCI message handlers — separate authorization paths. Pre-Gate-2 Phase 0 gate. |
| **Doctrine #27 F MAXIMUM** (33-audit ceiling 0.20×) | Euler + Gearbox + Spark (3-anchor PERMANENT 2026-05-28) | **TBD.** Probe Heimdall audit count + firm coverage at Step 1 PROFILE. Polygon ecosystem likely has 5-10 audits across Halborn + Hexens + others. |
| **Doctrine #29 v1.1 consumer-transfer logic** | LayerZero V2 CONSUMER hunts | **APPLIES (via Bor).** Heimdall→Bor state-sync is consumer-of-Heimdall pattern. Verify message-passing trust boundary. |
| **DC-7 EXCLUSION CANONICAL** (3-anchor PERMANENT) | Cap C1 + Function FBTC H1 + Gearbox H2 | **APPLIES.** Validator-only operations + checkpoint hash verification likely fit deterministic-derivation pattern. Pre-emptive exclusion filter. |
| **DC-9 family** (privilege escalation, sub-1..6) | Multiple anchors | **APPLIES.** Validator admin functions = DC-9 sub-2 (admin-no-timelock). Heimdall governance = DC-9 sub-3 (upgradeable-hook-no-timelock). |
| **DC-6 cross-domain** | Cross-chain bridges | **APPLIES.** Heimdall↔Bor↔Ethereum is 3-domain. Bridge boundaries each carry trust assumptions. |
| **CANDIDATE-A bridge sig-replay** | Flying Tulip + Midas | **APPLIES.** Heimdall→Ethereum checkpoint signature path. |
| **CANDIDATE-D state machine** | KyberSwap CLMM | **APPLIES.** Validator lifecycle states (active/jailed/unbonding/unbonded). |
| **CANDIDATE-J state-machine cooldown** | top-3 saturated 2026-05-28 (Aave V3 + Comet + FRAX) | **APPLIES.** Cosmos SDK unbonding period + slashing window + validator rotation. Fresh substrate for CANDIDATE-J. |
| **Pattern A access control** | LayerZero V2 (KILLED) + multiple | **APPLIES.** Validator-only operations, governance-only setters, admin functions. |
| **CANDIDATE-W ERC2771 _msgSender()** | origin-dollar 2026-05-21 | **DOES NOT APPLY.** Cosmos SDK uses ctx.MsgSigners() not msg.sender. |
| **CANDIDATE-V Reward Accumulator** | origin-dollar | **MAY APPLY.** Cosmos staking module distributes rewards — verify per-validator and per-delegator accumulator hygiene. |
| **CANDIDATE-G Solana off-chain cosigner** | Indentura PL Vault | **DOES NOT APPLY** (Solana-specific). |
| **CANDIDATE-Y from==to self-transfer accounting mutation** | origin-dollar | **MAY APPLY.** x/bank self-transfer accounting in Cosmos SDK is a known edge — verify. |

### Substrate-specific gaps (NOT YET COVERED — must build before Jun 15):

**Consensus-specific attack classes** (NEW DETECTOR FAMILY — must seed brain):

| Pattern | Class statement | Heimdall surface |
|---|---|---|
| **Equivocation / double-signing** | Validator signs two conflicting blocks at same height — detected via duplicate-vote evidence | Tendermint evidence module; Heimdall slashing module enforcement |
| **Long-range attack** | Adversary buys old validator keys and forks chain history from genesis | Heimdall checkpoint finality vs Ethereum-anchored checkpoints (mitigated by L1 anchor) |
| **Nothing-at-stake** | Validators sign multiple forks because no cost — mitigated by slashing | Heimdall slashing parameters + minimum self-bond enforcement |
| **Validator key compromise** | Single-key validator compromised → equivocation OR vote-extraction | Heimdall key rotation + remote-signer integration |
| **Checkpoint forgery** | Adversary submits invalid Heimdall checkpoint to Ethereum | Checkpoint signature validation + 2/3 voting power threshold |
| **Bor↔Heimdall state-sync replay** | Adversary replays state-sync message to Bor from old Heimdall block | StateSyncer nonce / sequence enforcement |
| **Governance proposal hijack** | Governance vote passes adversarial parameter change (e.g., reduce slashing) | Heimdall x/gov module parameter constraints |
| **Tendermint ABCI ordering** | Adversary exploits ABCI message-handler ordering (DeliverTx / BeginBlock / EndBlock) | Heimdall custom ABCI handler interactions |

---

## §2 SUBSTRATE RESEARCH — Heimdall v2 (preliminary, pre-clone)

**Likely repo:** `0xPolygon/heimdall-v2` (or `maticnetwork/heimdall-v2`)
**Likely chain:** Cosmos SDK Tendermint-based, Go
**Companion repos:**
- Bor (Polygon PoS execution layer; Go fork of Geth) — `maticnetwork/bor`
- StateSync contracts on Ethereum — checkpoint submission + reward distribution

**Six target classes to map post-invite (per operator directive):**
1. Checkpoint submission and validation logic (Polygon → Ethereum bridge)
2. Validator set management (staking, slashing, rotation)
3. Governance module (parameter changes, upgrades)
4. Bor chain integration (sidechain block production)
5. Heimdall bridge state sync (Heimdall ↔ Bor)
6. Cosmos SDK module boundaries (auth, bank, staking, gov, IBC if present)

**Pre-clone preparation tasks** (autonomous now):
- [ ] Identify Heimdall v2 public repo URL once invite arrives
- [ ] Search dYdX V4 ground-truth findings for transferable patterns (Cosmos SDK shared substrate)
- [ ] Pull Polygon's prior bug bounty disclosed findings (Immunefi historical Polygon program — DELISTED per engagement exclusivity, but disclosed-findings catalog still informational)

---

## §3 DETECTOR PRIMING — existing detector specs to BUILD before Jun 15

**Already-filed-but-unbuilt detector specs** (per Open-Questions-Tracker.md #27 + brain/Doctrine.md detector spec list):

| Detector | Spec source | Build status | Sherlock-Heimdall fit |
|---|---|---|---|
| **#129 Cosmos SDK / Go coverage AST** | dYdX V4 PRE-CLONE-HALT, Open-Q #27 | NOT BUILT | **CRITICAL — must build to lift Doctrine #36 P-floor before Jun 15** |
| **#137 cross-module canonicalization mismatch** | dYdX V4 brain audit | NOT BUILT | **HIGH — fits Heimdall x/bank + x/staking + x/gov inter-module** |
| **#138 no-overwrite-guard** | dYdX V4 brain audit | NOT BUILT | **HIGH — fits Heimdall checkpoint state updates** |
| **#165 cosmos-bech32 address handling** | dYdX V4 Doctrine.md:900 | NOT BUILT | **MEDIUM — fits Heimdall validator-address canonicalization** |

**NEW detector seeds (consensus-specific) — file as CANDIDATE prior to Jun 15:**

| Detector | Class statement | Build complexity |
|---|---|---|
| Equivocation evidence verification | Walk Tendermint evidence module: are duplicate-vote / light-client-attack evidence types parsed + slashed correctly? | Medium (Tendermint protobuf walk) |
| Validator-jail bypass | Are jailed validators excluded from EndBlocker reward distribution + checkpoint signing? | Low (state-machine walk) |
| Checkpoint signature aggregation | Walk Heimdall checkpoint module: is 2/3 voting power threshold enforced on aggregated signatures? Off-by-one? Stake-weighted vs count-weighted? | Medium (BLS / ed25519 verification path) |
| Bor↔Heimdall state-sync nonce | Is StateSyncer nonce monotonic + non-replayable on Bor receive side? | Low (sequence-number walk) |
| Governance parameter bounds | Are critical parameter changes (slashing fraction, unbonding period, min-self-bond) bounded? Can governance set them to invariant-breaking values? | Low (param walk + bounds check) |

---

## §4 GO TOOLCHAIN STATUS (probed 2026-05-28 deep night)

| Tool | Status | Path |
|---|---|---|
| go | ✓ 1.22.2 linux/amd64 | /usr/bin/go |
| GOPATH | ✓ /home/claude-code/go | — |
| semgrep | ✓ installed | /home/claude-code/.local/bin/semgrep |
| staticcheck | INSTALLING (background, 2026-05-28 deep night) | TBD /home/claude-code/go/bin/staticcheck |
| gosec | INSTALLING (background) | TBD /home/claude-code/go/bin/gosec |
| gopls | NOT INSTALLED | install command: `go install golang.org/x/tools/gopls@latest` |

**Buzz Go capability:**
- ✓ Can clone Go projects (git clone — same path as Solidity)
- ✓ Can run `go vet` (stdlib)
- ✓ Can run `go build` (validates project compiles)
- ✓ Can run `go test ./...` (verify test suite passes baseline)
- ✓ Can write Foundry-equivalent test (Go test files) to demonstrate PoC
- TBD `staticcheck` — pending install
- TBD `gosec` — pending install
- ✓ Can run `semgrep --config=auto` (already on server)

---

## §5 SHERLOCK COMPETITION FORMAT (TODO — research before Jun 15)

**Known intel (PAG Discord 2026-05-21 + Sherlock prior contests):**
- Submission requires $250 USDC deposit per finding (per Day 27 PAG intel)
- Severity classifications: Critical / High / Medium / Low / Info
- Duplicates handled via "primary submission" selection — judges pick best-written + earliest valid submission
- Judging timeline: usually 2-4 weeks post contest close
- Awards: USDC primary; specific rewards/escrow per contest

**Research tasks before Jun 15:**
- [ ] Read prior Sherlock contests (especially Cap, Flying Tulip, Symbiotic) for format examples
- [ ] Identify Sherlock contest submission portal + dashboard
- [ ] Understand judge-comment workflow (rebuttal window?)
- [ ] Confirm $250 deposit refund policy (refundable on accepted finding?)

---

## §6 BUDGET (operator-confirmed 2026-05-28 deep night)

**Required:**
- $250 USDC deposit × N submissions
- **Operator estimate: 5-10 submissions × $250 = $1,250 – $2,500 USDC working capital** (narrower than initial 5-15 range; operator-set ceiling)
- Deposits REFUND on valid submission, forfeit on abusive/spam

**Funding decision tree (operator-confirmed):**
1. **Firedancer #77340 payout (KYC pending)** — IF payout lands before Jun 15, allocate portion to Sherlock deposits. PRIMARY funding source.
2. **Ops wallet fallback** — IF Firedancer does NOT pay pre-Jun-15, fund from ops wallet. Operator handles transfer when triggered.
3. **Cantina/Immunefi payouts** — none confirmed in queue; not a planning assumption.

**Action items:**
- [ ] Monitor Firedancer #77340 KYC status weekly (next check 2026-06-04)
- [ ] Trigger ops-wallet fallback request to operator by 2026-06-10 if Firedancer not paid
- [ ] Pre-Jun-15: confirm $1,250 minimum USDC in ops wallet

---

## §7 KILL_LIST UPDATE

**ACTION:** Add `0xPolygon/heimdall-v2` + `maticnetwork/heimdall` + `maticnetwork/bor` to propagation engine KILL_LIST. Reason: engagement exclusivity for Sherlock x Polygon Heimdall June 15 contest. Any propagation-engine hits during prep window must NOT surface as Immunefi-Gate-1 candidates.

**Location:** `/home/claude-code/.tmp-build/v6/buzzshield-propagation.js` (canonical via `scripts/v6/` symlink)

**Status:** PENDING THIS COMMIT.

---

## CROSS-PILLAR INTEGRATION

**Pillar 1 (token scoring):** **NO change to MATIC/POL scoring** per operator clarification 2026-05-28 deep night. Polygon tokens can still be scored + leaderboard-published + tweeted normally per tweet-on-score.md v2.2. The engagement exclusivity is SECURITY-FINDING-SCOPE only, not token-scoring-scope.

**Pillar 2 (tweet generation) — exclusivity scope NARROWED 2026-05-28 deep night:**
- ✓ ALLOWED: MATIC/POL score tweets (HOT/QUALIFIED/WATCH bands per v2.2)
- ✓ ALLOWED: standard "passed honest calibration" / "Not a fail. Not a pass." framings
- ✗ FORBIDDEN until 2026-07-07: any tweet hinting at security findings on Polygon ecosystem (Heimdall, Bor, PoS validators, checkpoint contracts, staking manager, governance contracts)
- ✗ FORBIDDEN until 2026-07-07: "Caught" template tweets for any Polygon-affiliated contract
- ✗ FORBIDDEN until 2026-07-07: "FLAGGED" or "Calibration Before/After" templates on any Polygon contract
- Implementation: add a content filter on Pillar-2 tweet drafter that flags any Polygon-ecosystem contract address in a SECURITY-framing draft for operator review (not score-framing — score-framing is fine).

**Pillar 2 (HSaaS):** Mention Sherlock x Polygon Heimdall participation in outreach (when public, post-Jul-7) as case-study of AI-Auditor positioning. Increase HSaaS Tier-3 (Swarm) value proposition.

**Pillar 3 (corpus):** Phase 2 consumer should prioritize Cosmos SDK + Tendermint + Polygon historical exploit corpus for Heimdall-class pattern extraction.

**Pillar 4 (bug research):** This file IS the Pillar 4 prep dossier. Future Heimdall hunts MUST reference brain compounds here.

---

## TIMELINE TO JUN 15 (18 days remaining as of 2026-05-28)

| Days | Milestone |
|---|---|
| 17 | Install Go tooling (staticcheck + gosec + gopls); receive Sherlock invite (expected) |
| 14 | Build detectors #129 + #137 + #138 + #165 (lift Doctrine #36 P-floor); identify Heimdall v2 public repo |
| 10 | Clone Heimdall v2; map 6 target classes; first source-read pass |
| 7 | Surface map complete; identify 3-5 candidate hypotheses |
| 5 | Phase 0 audit-dedup on each candidate; Foundry-equivalent Go test scaffolding |
| 3 | Foundry-equivalent PoC for top-2 candidates |
| 1 | Final paste-ready drafts for Sherlock submission portal |
| 0 (Jun 15) | Contest opens — submit on Day 1 if findings ready |
| -7 (Jun 22) | Mid-contest checkpoint — refine + add findings |
| -21 (Jul 6) | Contest closes |

---

_Brain Sherlock-Polygon-Heimdall-Prep | v1.0 | 2026-05-28 deep night | Operator directive received; substrate research deferred to post-invite; brain audit + detector priming + Go tooling + KILL_LIST update + Sherlock format research IN PROGRESS. Authority: operator msg 2026-05-28 deep night._
