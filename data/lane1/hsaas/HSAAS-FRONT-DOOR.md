# Tier-3 HSaaS Front-Door — Phase 1 (BUILD THE WIRE, POPULATE-ONLY, NO SENDS)

> Ogie msg 8114. Sending = Phase 2 (operator-gated: Ogie's channel + legal call). Leak-safe HARD RULE:
> NEVER reference a held/undisclosed finding about a recipient (shakedown line — forbidden, same as P4→P2).

## TASK 1 — RE-SCORE FINDINGS (honest, see `scripts/lane1/hsaas-prospect-rescore.py` + `qualified.jsonl`)
- **The named "12,956" (`target_scores_v2_hsaas`, 13,813 rows) is UNUSABLE for HSaaS-fit:** it's the v1-BOUNTY-corpus re-tagged — contract / mcap / liquidity / github ALL NULL. The 4 axes can't be evaluated on it.
- **Real scored pool = `token_scores` (277).** 4-axis result: deployed 277 · funded(mcap≥$500K or liq≥$100K) 30 · contactable 258 · thin-audit 277 → **QUALIFIED = 30.**
- **Product-fit caveat (the real finding):** the 30 are mostly **memecoins** (OFFICIAL TRUMP, Pippin, Banana) + already-audited majors (Raydium, EURC) — standard tokens with *no custom codebase to audit*. The token-scorer surfaces memecoins; the HSaaS **audit** product needs **custom-contract DeFi protocols**. → **prospect-sourcing is mismatched to the product.** RIGHT source = protocol-discovery (the Clarity deploy-watch already built + a DeFiLlama-protocol feed), filtered to has-custom-code + thin-audit + funded + reachable. **Recommendation: re-point the front-door's sourcing before scaling outreach.**

## TASK 2 — PRODUCT TIERS + DELIVERABLE (reuse existing hunt pipeline; NO new engine)
Fulfillment = the existing Gate-0→Gate-1→Gate-2 hunt pipeline pointed at an **AUTHORIZED client codebase** → human-reviewed report. Two tiers (collapsing the v2 3-tier into the directive's 2):

| Tier | Price | What runs | Deliverable |
|------|-------|-----------|-------------|
| **T-LITE** | ~$500 | Automated X-ray: clone → Gate-0 known-issues corpus → arsenal-lens surface scan (CANDIDATE-A..R, DC-1..20) → auto-report | Scan report: surface map, lens-hits, severity-tagged [INSPECTED] candidates, known-issue dedup. No PoC. |
| **T-REVIEW** | ~$1.5–2.5K | Deeper arsenal pass + **human-reviewed findings** + [EXECUTED] PoC on any confirmed candidate (Foundry/clarinet-sdk/sui-move-test) | Full report: per-finding mechanism + PoC + remediation, R8 evidence tags, exec summary. Re-test of fixes. |

### CLIENT REPORT TEMPLATE (both tiers)
```
# Security X-Ray — <Client> — <date> — Buzz HSaaS (Tier <LITE|REVIEW>)
SCOPE: <repo@commit> · <chains> · <LOC, contracts in scope> · AUTHORIZATION: <client grant ref>
METHODOLOGY: Gate-0 known-issues pre-flight → arsenal lenses (N classes) → [Tier-REVIEW: Gate-2 PoC]
SUMMARY: <n> findings — <c> Critical / <h> High / <m> Medium / <l> Low / <i> Info. Overall posture: <…>
KNOWN-ISSUE DEDUP: matched against <client audits / SECURITY.md / accepted-risk> — <k> pre-excluded.
FINDINGS: per finding → Title · Severity · [INSPECTED|EXECUTED] · Mechanism · Impact (Doctrine #14: outcome proven, not just vector) · PoC (Tier-REVIEW) · Remediation.
LIMITATIONS: what was/wasn't covered (honest scoping — no silent caps).
```

## TASK 3 — POSITIONING + OUTREACH TEMPLATES (the legal spine — leak-safe)
**Pitch the SERVICE + GENERIC track record ONLY.** NEVER a held/undisclosed finding about the recipient.

**Channel-agnostic core (generic, leak-safe):**
> Buzz runs an autonomous security-research pipeline (Gate-0 known-issues pre-flight → multi-lens arsenal → executed PoCs) across EVM, Solana, Clarity & Move. We offer two engagement tiers — a $500 automated X-ray and a $1.5–2.5K human-reviewed deep pass with working PoCs. We publish honest scores and don't manufacture findings. If a security review is on your roadmap, here's where to start: <intake link>.

**Personalized hook (per lead — GENERIC observable facts only, NO held findings):**
> `<Protocol>` (<chain>, ~$<mcap>M mcap / $<liq>K liq) — a funded protocol without a public top-tier audit on record. That profile is exactly our sweet spot.
(Allowed: public mcap/liq, "no public audit on record", chain. FORBIDDEN: "we found X in your contract", any held/undisclosed vuln, any scare line.)

**Opt-out (mandatory on every send):**
> Not interested? Reply STOP and we won't contact you again.

## TASK 4 — INBOUND / REPLY PATH
- **Intake:** a simple hosted form / booking link (e.g. `shield.buzzbd.ai/audit` already referenced in tweet-on-score.md, or a Cal.com link) → captures protocol + repo + authorization + tier interest.
- **Reply-capture:** any reply (email/DM) → routed to **Ogie's inbox** (Ogie closes — BD strength). A lightweight `hsaas_inbound` log row per interested lead → surfaced in the daily WR digest.
- **Flow:** interested lead → intake/reply → Ogie scopes + closes → authorized engagement → existing hunt pipeline fulfils → human-reviewed report. Buzz drafts + populates; **Ogie sends + closes**.

## TASK 5 — SCORER→OUTREACH DRAFT QUEUE (POPULATE-ONLY, NEVER SENDS)
- Wire: qualified subset → `data/lane1/hsaas/draft-queue.jsonl`, one **DRAFT** per lead, `status="DRAFT_PENDING_OPERATOR"`, `sent=false`. **Zero auto-send** (mirrors Stranded-Funds 4B + P4→P2 suppression). The `hsaas_outreach_ledger` table gets a row ONLY when Ogie actually sends (Phase 2).
- Every send is operator-gated: **Ogie picks the channel, WR-approves the batch, Ogie sends.**
- See `draft-queue.jsonl` for the populated drafts + the 3 samples in the WR report.
- **Honest queue note:** populated from the 30 token_scores-qualified, but per the TASK-1 product-fit finding most are memecoins (no custom code to audit) → the queue is a DEMONSTRATION of the wire, not a ready-to-send list. Re-point sourcing to protocol-discovery before a real batch.
