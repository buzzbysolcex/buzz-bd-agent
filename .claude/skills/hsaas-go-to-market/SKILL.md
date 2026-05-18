# PERMANENT DIRECTIVE: HSaaS GO-TO-MARKET STRATEGY

# Location: .claude/skills/hsaas-go-to-market.md

# Also save to: docs/HSAAS-GO-TO-MARKET.md

# Source: Juno (ZHC Discord AI) strategy sessions — March 30-31, 2026

# Must survive ALL restarts

# Version 2.0 — Updated March 31, 2026 (Post-Sprint Day 1)

---

## MISSION

Honest Scoring as a Service (HSaaS) — the world's first on-chain token
audit with 1000-agent swarm simulation and 19-chain DeFi intelligence.
Revenue target: $5K/month within 8 weeks.
"We catch what others miss."

---

## CURRENT STATE (as of v8.4.0 / Post-Sprint Day 1)

- **Pipeline:** 363 tokens (66 scored, 0 HOT — honest)
- **MiroFish:** 1000 agents (200 LLM + 800 heuristic), Dual-Brain 90% Opus / 10% Ollama
- **Monte Carlo:** 1000×100 simulations in 26ms
- **Smart Contracts:** 4 on Base mainnet (ScoreStorage v2, ListingOracle, ListingEscrow, BuzzReputation)
- **Intel Sources:** 31 across 19 chains
- **Server:** Hetzner CPX62 (16 vCPU, 32GB RAM) — MiroFish sidecar on port 5000
- **Revenue:** $200 (8 AIBTC brief inclusions @ $25 each)
- **AIBTC:** #14, 8-day signal streak
- **Factory Floor:** Submitted (pending review) — factoryfloor.dev
- **IZHC:** Active member, Tom Osman creating bot-only channel — Buzz invited
- **Frontier Hackathon:** Registered, deadline May 11

---

## POSITIONING

**Core brand:** Trust through automation.
**Pitch:** "Our scores live on-chain forever — we can't fake it."
**Case study:** "11 tokens passed every other audit. We caught them anyway."
**Differentiator:** On-chain recording + 1000-agent swarm simulation + 31 sources across 19 chains + Monte Carlo in 26ms.

DO NOT position as "we analyze well." Position as "proof, not opinion."

**Pricing philosophy (from Juno):** You're not charging for agents. You're charging for RESOLUTION. 1000 agents catches failure modes 100 agents miss. That's the value.

---

## THE GOLDEN CASE STUDY

11 tokens scored 85+ on initial evaluation. After honest calibration with
8 penalty rules, ALL dropped below 50. This is the single most powerful
sales tool in the entire stack.

**Frame it everywhere:**

- Landing page headline: "11 tokens passed every other audit. We caught them anyway."
- buzzbd.ai/scores: show the before/after scores
- Tweet every catch: "Our simulation flagged [TOKEN] 3 weeks before the dump."
- Pilot audit proposals: "Here's what happened when we scored honestly."

Numbers beat features. Every time.

---

## PRICING TIERS

### Free Tier: Signal Access ($0)

- Basic scores for top 20 tokens on buzzbd.ai/scores
- Limited intel sources (5 of 31)
- Daily updates
- Purpose: Build adoption, prove accuracy, capture retail funnel

### Free Tier: Score Funnel ($0)

- Paste any token address → get basic 11-factor score instantly
- buzzbd.ai/score?address=<token>
- Shows: overall score, category breakdown, pass/fail status
- GATES behind payment: swarm simulation, on-chain recording, full report
- Purpose: Lead capture machine running 24/7
- Implementation: ~50 lines of code on existing pipeline

### Subscription: Professional ($200-400/month)

- Full 31-source scoring across all 19 chains
- 100-agent adversarial reports
- On-chain score history access
- Weekly audit summaries
- API access (rate-limited)
- Purpose: Traders, analysts, smaller funds

### Audit Tier 1: Quick Scan ($500)

- 100-agent adversarial simulation
- Basic token audit with on-chain verification
- Score recorded to ScoreStorage on Base mainnet
- Summary report
- Purpose: Independent devs, small teams
- LAUNCH: Use as pilot price for first 3 audits

### Audit Tier 2: Full Analysis ($1,500)

- 500-agent adversarial simulation
- Complete token audit with on-chain verification
- Smart contract risk scoring
- Branded PDF audit report
- "Honest Calibration" badge if passed
- Purpose: Protocols seeking exchange listing
- LAUNCH: Base price after 3 pilots complete

### Audit Tier 3: Swarm Audit ($2,500-3,000)

- Full 1000-agent swarm simulation (200 LLM + 800 heuristic)
- Monte Carlo stress testing (1000×100 in 26ms)
- Comprehensive failure mode detection
- Complete token audit with on-chain verification
- Smart contract risk scoring + liquidity depth analysis
- Branded PDF audit report + executive summary
- "Honest Calibration" badge if passed
- On-chain proof of simulation results
- Purpose: Exchanges, VC firms, serious protocols
- NOTE: 1000 agents catches failure modes 500 agents miss — that's the resolution premium

### Enterprise ($3-5K/month)

- White-label API access
- Real-time data feeds
- Unlimited swarm simulations
- Audit badges for their tokens
- Quarterly strategy reviews
- Purpose: Exchanges, VC firms, larger protocols

---

## REVENUE STACK ($5K/month target)

### Conservative (launch month):

| Source               | Target                   | Monthly     |
| -------------------- | ------------------------ | ----------- |
| AIBTC signals        | 30 inclusions @ 30K sats | ~$350       |
| Quick Scan pilots    | 3 @ $500                 | $1,500      |
| Signal subscriptions | 5 @ $200                 | $1,000      |
| **Total**            |                          | **~$2,850** |

### Target (month 2 — after case studies):

| Source               | Target                   | Monthly     |
| -------------------- | ------------------------ | ----------- |
| AIBTC signals        | 30 inclusions @ 30K sats | ~$350       |
| Swarm audits         | 1 @ $2,500               | $2,500      |
| Full Analysis audits | 1 @ $1,500               | $1,500      |
| Subscriptions        | 5 @ $200                 | $1,000      |
| **Total**            |                          | **~$5,350** |

### Scale (month 3+):

| Source               | Target        | Monthly      |
| -------------------- | ------------- | ------------ |
| AIBTC signals        | 30 inclusions | ~$350        |
| Swarm audits         | 2 @ $2,500    | $5,000       |
| Full Analysis audits | 2 @ $1,500    | $3,000       |
| Subscriptions        | 10 @ $200     | $2,000       |
| API access           | 3 @ $500      | $1,500       |
| **Total**            |               | **~$11,850** |

---

## LAUNCH SEQUENCE (4 weeks)

### Week 1 (Apr 1-6): SHOW THE DATA

- [ ] Ship buzzbd.ai/scores — public leaderboard of 363 tokens (66 scored)
- [ ] Show score distribution, top/bottom tokens, category breakdowns
- [ ] Add "11 tokens caught" case study to buzzbd.ai landing page
- [ ] Wire HeyAnon cross-chain data into signal pipeline
- [ ] File cross-chain sentiment signals (bridge outflows = new signal type)
- [ ] Build /api/v1/audit/request endpoint skeleton
- [ ] Tweet scored tokens tagging project owners
- [ ] Engage in Tom Osman's bot-only channel (IZHC Discord)
- [ ] Monitor Factory Floor review status

### Week 2 (Apr 7-13): LAUNCH MVP

- [ ] HSaaS MVP live — accept token address, run full pipeline, return score
- [ ] Free Score funnel: buzzbd.ai/score?address=<token> (basic score free)
- [ ] 3 pilot audits at $500 Quick Scan (post in Discord #get-listed + IZHC)
- [ ] "Honest Calibration" badge concept designed
- [ ] Document first pilot audit step-by-step (becomes case study)
- [ ] buzzbd.ai/scores public leaderboard refined
- [ ] Highlight 1000-agent swarm as headline capability

### Week 3 (Apr 14-20): CASE STUDIES + SUBSCRIPTIONS

- [ ] Publish first paid audit case study (with on-chain proof)
- [ ] Signal subscription tier live ($200/mo)
- [ ] API access tier scoped ($500/mo)
- [ ] Frontier hackathon prep (May 11)
- [ ] "We caught [TOKEN] before the dump" content if applicable
- [ ] Introduce Full Analysis tier at $1,500

### Week 4 (Apr 21-27): FULL PRICING + SCALE

- [ ] All 3 tiers live: Quick Scan ($500) / Full Analysis ($1,500) / Swarm ($2,500)
- [ ] API subscriptions open
- [ ] Target: first $1K month
- [ ] Enterprise tier scoped for larger exchanges/VCs
- [ ] Leverage Factory Floor listing (if approved) for credibility

---

## TWEET-ON-SCORE STRATEGY (Tag Project Owners)

### When Buzz scores a token, tweet the result:

**Template A — High Score (70+):**

```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100

[Category breakdown in visual card]

Scored across 31 sources on 19 chains.
1000-agent swarm simulation. On-chain verified.

@[project_twitter] — your token passed honest calibration.
Full report: buzzbd.ai/scores

#BuildInPublic #TokenAudit #HonestScoring
```

**Template B — Watch Score (50-69):**

```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100

[Specific weakness identified]

Not a fail. Not a pass. Worth watching.

@[project_twitter] — want the full 1000-agent swarm report?
DM open or request at buzzbd.ai

#HonestScoring
```

**Template C — Caught a Rug / Failed Token:**

```
🐝 FLAGGED: [TOKEN] scored [SCORE]/100 on [DATE].

[What the scoring engine caught]
[What happened since]

Our 1000-agent swarm simulation predicted this.
On-chain proof: [basescan link]

"11 tokens passed every other audit. We caught them anyway."

buzzbd.ai/scores
#HonestScoring #TokenAudit
```

**Template D — Before/After Calibration:**

```
🐝 HONEST CALIBRATION: [TOKEN]

Before: [OLD_SCORE]/100 ✅ "Looks great"
After: [NEW_SCORE]/100 ❌ Caught by 8 penalty rules

[What changed: FDV gap / honeypot / ghost token / etc.]

Every exchange would have listed this. We wouldn't.

@[project_twitter]
buzzbd.ai/scores
```

### Rules:

- EVERY scored token gets a tweet (visual card attached)
- Tag the project's Twitter handle when known
- Use score-card template with cyberpunk branding
- Link to buzzbd.ai/scores for the public leaderboard
- For rug catches: post IMMEDIATELY, don't wait
- For high scores: frame as "passed honest calibration" (not "we recommend")
- NEVER give financial advice — "this is data, not a recommendation"
- NFA disclaimer on every score tweet
- Maximum 3 score tweets per day (quality over spam)

### Finding Project Twitter Handles:

- DexScreener token page → social links
- CoinGecko token page → links section
- dev-browser contact screener → extract from project site
- If no handle found, tag the chain ecosystem (@solana, @base, etc.)

---

## FREE SCORE FUNNEL (Technical Spec)

### Frontend: buzzbd.ai/score

```
Input: Token address (text field)
Output: Basic score card showing:
  - Overall score (0-100)
  - 4 category scores (Market, Safety, Community, Technical)
  - Pass/Fail badge
  - "Want the full report?" CTA → links to audit request
  - Show tier options: Quick Scan ($500) / Full Analysis ($1,500) / Swarm ($2,500)

DOES NOT SHOW (gated behind payment):
  - 1000-agent swarm simulation results
  - Monte Carlo stress test output
  - Detailed factor-by-factor breakdown
  - On-chain recording
  - PDF report
  - "Honest Calibration" badge
```

### Backend: GET /api/v1/score/free/:address

```
- Calls existing pipeline-scorer (rule-based, zero LLM cost)
- Returns: { score, categories, pass_fail, timestamp }
- Rate limit: 10 free scores per IP per day
- Logs to free_score_requests table (lead tracking)
- If token already in DB, return cached score instantly
- If new token, trigger quick scan (DexScreener + CoinGecko only)
```

### Why This Works:

- Zero marginal cost (rule-based scoring, no LLM)
- Every free score is a lead
- Projects that score well will WANT the badge
- Projects that score poorly will WANT to know why
- Both paths lead to a paid audit
- Tier display creates natural upsell: "What does the 1000-agent swarm catch that basic doesn't?"

---

## "HONEST CALIBRATION" BADGE

### Concept:

A visual badge that projects can display after passing a full Buzz audit.

### Design:

- Cyberpunk style matching buzzbd.ai aesthetic
- Shows: score, date, on-chain TX hash, simulation tier (100/500/1000 agents)
- Verifiable: anyone can check the score on basescan
- Embeddable: HTML/image snippet for project websites
- Revocable: if token later fails re-scoring, badge updates

### Badge Tiers:

- 🟢 VERIFIED (85+) — "Passed Honest Calibration"
- 🟡 QUALIFIED (70-84) — "Qualified with Conditions"
- No badge below 70 — but projects get the full report
- Badge shows simulation tier: "100-agent scan" vs "1000-agent swarm" — premium badge has more weight

### Revenue Impact:

- Projects PAY for the audit to GET the badge
- The badge is marketing for THEM and for US
- Every project displaying the badge is a walking advertisement
- "Audited by Buzz BD Agent — Score: 87/100 — 1000-Agent Swarm Verified on Base"
- Swarm badge carries more credibility → incentivizes $2,500 tier

---

## AIRDROP HUNTER AUDIENCE (Base ecosystem)

Airdrop hunters on Base are obsessed with scoring systems. They:

- Track which tokens are likely to be listed on CEXs
- Monitor new token launches for early entry
- Share scoring tools in their communities
- Will amplify any tool that catches a rug

### How to capture this audience:

1. buzzbd.ai/scores public leaderboard — they'll bookmark it
2. Tweet every significant score change (especially drops)
3. When a flagged token dumps, POST IMMEDIATELY with on-chain proof
4. "Our 1000-agent swarm caught [TOKEN] before the dump" goes viral in airdrop groups
5. The free score funnel captures them as leads

---

## DISTRIBUTION CHANNELS (Updated)

| Channel               | Status                     | Action                                                 |
| --------------------- | -------------------------- | ------------------------------------------------------ |
| AIBTC News            | LIVE, #14, 8-day streak    | Keep filing, diversify signal types                    |
| Factory Floor         | SUBMITTED                  | Monitor review, leverage if approved                   |
| IZHC Discord          | ACTIVE                     | Tom Osman bot-only channel — Buzz invited              |
| Buzz Discord          | LIVE                       | 5 categories, 14 channels — post pilots in #get-listed |
| Twitter @BuzzBySolCex | AUTONOMOUS                 | Tweet-on-score rule active                             |
| buzzbd.ai             | LIVE                       | Add scores page, free funnel, case study               |
| Colosseum Frontier    | REGISTERED                 | Deadline May 11 — HSaaS is the demo                    |
| x402                  | 3 endpoints on 402index.io | Premium score access behind x402 paywall               |

---

## KEY METRICS TO TRACK

| Metric                    | Week 1 | Week 2 | Week 3 | Week 4 |
| ------------------------- | ------ | ------ | ------ | ------ |
| Free scores served        | —      | 50     | 200    | 500    |
| Pilot audits completed    | 0      | 1      | 3      | 3      |
| Case studies published    | 0      | 0      | 1      | 3      |
| Subscription signups      | 0      | 0      | 2      | 10     |
| API clients               | 0      | 0      | 0      | 3      |
| Monthly revenue           | $200   | $700   | $1,500 | $3,000 |
| Tokens tweeted (scored)   | 10     | 25     | 50     | 100    |
| buzzbd.ai/scores visitors | —      | 100    | 500    | 2,000  |

---

## JUNO'S KEY QUOTES (Reference)

### Session 1 (March 30):

1. "Your edge isn't just the tech — it's trust through automation."
2. "Position audits as proof, not opinion."
3. "11 tokens passed every other audit. We caught them anyway."
4. "Lead with protocol audits at $1,500-2K. It's your differentiated product."
5. "The honest positioning is your brand. Own it."
6. "Case studies trump features."
7. "50 lines of code for a lead capture machine that runs 24/7."
8. "Scored leaderboard before MVP. Show the data first."
9. "When you catch that first rug, don't wait to announce it."
10. "You're 4 weeks from $1K. The math is there."

### Session 2 (March 31 — pricing update):

11. "50 → 1000 agents at 26ms isn't just more — it's a different product tier entirely."
12. "You're not charging for agents. You're charging for resolution."
13. "1000 agents catches failure modes 500 agents miss. That's the value."
14. "$1,500 for 1000-agent swarm is underpriced for what it actually does."
15. "The 26ms execution time is your differentiator — most can't run this fast at this scale."
16. "Don't leave money on the table. The swarm simulation is genuinely worth $2,500+."
17. "Launch $1,500 as the base, make 1000-agent the headline, then add premium tier with case studies."
18. "First, get those 3 pilots. Then tier up."

---

## CHANGELOG

### v2.0 (March 31, 2026) — Post-Sprint Day 1

- MiroFish upgraded: 50-agent → 1000-agent swarm (200 LLM + 800 heuristic)
- Monte Carlo: 1000×100 simulations in 26ms
- Pipeline: 256 → 363 tokens (66 scored)
- Server: CX43 → CPX62 (16 vCPU, 32GB RAM)
- 3-tier audit pricing: Quick Scan $500 / Full Analysis $1,500 / Swarm $2,500-3,000
- "Resolution, not agents" pricing philosophy from Juno Session 2
- Factory Floor submitted
- Tom Osman bot-only channel (IZHC) — Buzz invited
- Distribution channels section added
- Revenue stack updated with conservative/target/scale projections
- Badge shows simulation tier for upsell incentive

### v1.0 (March 30, 2026) — Sprint Day 42

- Initial go-to-market from Juno strategy session
- 4-tier pricing model
- Launch sequence (4 weeks)
- Tweet-on-score strategy
- Free score funnel spec

---

_HSaaS Go-to-Market v2.0 | Source: Juno (ZHC Discord) Strategy Sessions_
_"Trust through automation. Proof, not opinion. We catch what others miss."_
_"You're not charging for agents. You're charging for resolution."_
_4 weeks to $1K. The math is there. Go ship._ 🐝
