# PERMANENT DIRECTIVE: HSaaS GO-TO-MARKET STRATEGY
# Location: .claude/skills/hsaas-go-to-market.md
# Also save to: docs/HSAAS-GO-TO-MARKET.md
# Source: Juno (ZHC Discord AI) strategy session — March 30, 2026
# Must survive ALL restarts
# Version 1.0

---

## MISSION

Honest Scoring as a Service (HSaaS) — the world's first on-chain token
audit with 19-chain DeFi intelligence. Revenue target: $5K/month within
8 weeks. "We catch what others miss."

---

## POSITIONING

**Core brand:** Trust through automation.
**Pitch:** "Our scores live on-chain forever — we can't fake it."
**Case study:** "11 tokens passed every other audit. We caught them anyway."
**Differentiator:** On-chain recording + 50-agent adversarial simulation + 31 sources across 19 chains.

DO NOT position as "we analyze well." Position as "proof, not opinion."

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

### Tier 1: Free Signal Access ($0)
- Basic scores for top 20 tokens on buzzbd.ai/scores
- Limited intel sources (5 of 31)
- Daily updates
- Purpose: Build adoption, prove accuracy, capture retail funnel

### Tier 2: Free Score Funnel ($0)
- Paste any token address → get basic 11-factor score instantly
- buzzbd.ai/score?address=<token>
- Shows: overall score, category breakdown, pass/fail status
- GATES behind payment: adversarial simulation, on-chain recording, full report
- Purpose: Lead capture machine running 24/7
- Implementation: ~50 lines of code on existing pipeline

### Tier 3: Professional ($200-400/month)
- Full 31-source scoring across all 19 chains
- 50-agent adversarial reports
- On-chain score history access
- Weekly audit summaries
- API access (rate-limited)
- Purpose: Traders, analysts, smaller funds

### Tier 4: Protocol Audit ($500 pilot → $1,500-2K full)
- Complete token audit with on-chain verification
- Smart contract risk scoring
- 50-agent adversarial simulation (full report)
- Score recorded to ScoreStorage on Base mainnet
- Branded PDF audit report
- "Honest Calibration" badge if passed
- Purpose: Teams launching tokens who need credibility
- LAUNCH PRICE: $500/audit (first 3 pilots, discounted from $1,500)

### Tier 5: Enterprise ($2-5K/month)
- White-label API access
- Real-time data feeds
- Dedicated adversarial simulations
- Audit badges for their tokens
- Quarterly strategy reviews
- Purpose: Exchanges, VC firms, larger protocols

---

## REVENUE STACK ($5K/month target)

| Source | Target | Monthly |
|--------|--------|---------|
| AIBTC signals | 30 inclusions @ 30K sats | ~$350 |
| Pilot protocol audits | 2 @ $500 | $1,000 |
| Signal subscriptions | 10 @ $200 | $2,000 |
| API access | 3 @ $500 | $1,500 |
| **Total** | | **~$4,850** |

---

## LAUNCH SEQUENCE (4 weeks)

### Week 1 (Apr 1-6): SHOW THE DATA
- [ ] Ship buzzbd.ai/scores — public leaderboard of 256 scored tokens
- [ ] Show score distribution, top/bottom tokens, category breakdowns
- [ ] Add "11 tokens caught" case study to buzzbd.ai landing page
- [ ] Wire HeyAnon cross-chain data into signal pipeline
- [ ] File cross-chain sentiment signals (bridge outflows = new signal type)
- [ ] Build /api/v1/audit/request endpoint skeleton
- [ ] Tweet scored tokens tagging project owners

### Week 2 (Apr 7-13): LAUNCH MVP
- [ ] HSaaS MVP live — accept token address, run full pipeline, return score
- [ ] Free Score funnel: buzzbd.ai/score?address=<token> (basic score free)
- [ ] 3 pilot audits at $500 (post in Discord #get-listed)
- [ ] "Honest Calibration" badge concept designed
- [ ] Document first pilot audit step-by-step (becomes case study)
- [ ] buzzbd.ai/scores public leaderboard refined

### Week 3 (Apr 14-20): CASE STUDIES + SUBSCRIPTIONS
- [ ] Publish first paid audit case study (with on-chain proof)
- [ ] Signal subscription tier live ($200/mo)
- [ ] API access tier scoped ($500/mo)
- [ ] Frontier hackathon prep (May 11)
- [ ] "We caught [TOKEN] before the dump" content if applicable

### Week 4 (Apr 21-27): FULL PRICING + SCALE
- [ ] HSaaS at full $1,500 pricing with 3 case studies as proof
- [ ] API subscriptions open
- [ ] Target: first $1K month
- [ ] Enterprise tier scoped for larger exchanges/VCs

---

## TWEET-ON-SCORE STRATEGY (Tag Project Owners)

### When Buzz scores a token, tweet the result:

**Template A — High Score (70+):**
```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100

[Category breakdown in visual card]

Scored across 31 sources on 19 chains.
On-chain at [basescan link].

@[project_twitter] — your token passed honest calibration.
Full report: buzzbd.ai/scores

#BuildInPublic #TokenAudit
```

**Template B — Watch Score (50-69):**
```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100

[Specific weakness identified]

Not a fail. Not a pass. Worth watching.

@[project_twitter] — want the full 50-agent adversarial report?
DM open or request at buzzbd.ai

#HonestScoring
```

**Template C — Caught a Rug / Failed Token:**
```
🐝 FLAGGED: [TOKEN] scored [SCORE]/100 on [DATE].

[What the scoring engine caught]
[What happened since]

Our 50-agent simulation predicted this.
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

DOES NOT SHOW (gated behind payment):
  - 50-agent adversarial simulation results
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

---

## "HONEST CALIBRATION" BADGE

### Concept:
A visual badge that projects can display after passing a full Buzz audit.

### Design:
- Cyberpunk style matching buzzbd.ai aesthetic
- Shows: score, date, on-chain TX hash
- Verifiable: anyone can check the score on basescan
- Embeddable: HTML/image snippet for project websites
- Revocable: if token later fails re-scoring, badge updates

### Badge Tiers:
- 🟢 VERIFIED (85+) — "Passed Honest Calibration"
- 🟡 QUALIFIED (70-84) — "Qualified with Conditions"
- No badge below 70 — but projects get the full report

### Revenue Impact:
- Projects PAY for the audit to GET the badge
- The badge is marketing for THEM and for US
- Every project displaying the badge is a walking advertisement
- "Audited by Buzz BD Agent — Score: 87/100 — Verified on Base"

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
4. "Our simulation caught [TOKEN] before the dump" goes viral in airdrop Telegram groups
5. The free score funnel captures them as leads

---

## KEY METRICS TO TRACK

| Metric | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|--------|--------|--------|--------|
| Free scores served | — | 50 | 200 | 500 |
| Pilot audits completed | 0 | 1 | 3 | 3 |
| Case studies published | 0 | 0 | 1 | 3 |
| Subscription signups | 0 | 0 | 2 | 10 |
| API clients | 0 | 0 | 0 | 3 |
| Monthly revenue | $200 | $700 | $1,500 | $3,000 |
| Tokens tweeted (scored) | 10 | 25 | 50 | 100 |
| buzzbd.ai/scores visitors | — | 100 | 500 | 2,000 |

---

## JUNO'S KEY QUOTES (Reference)

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

---

*HSaaS Go-to-Market v1.0 | Source: Juno (ZHC Discord) Strategy Session*
*"Trust through automation. Proof, not opinion. We catch what others miss."*
*4 weeks to $1K. The math is there. Go ship.* 🐝
