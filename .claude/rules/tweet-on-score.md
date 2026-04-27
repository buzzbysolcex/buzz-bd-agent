# RULE: Tweet-on-Score — Tag Project Owners with On-Chain Proof

# Location: .claude/rules/tweet-on-score.md

# Trigger: When a token is scored, re-scored, or flagged

# Version: 2.1 — April 27, 2026 (added contract-address line per msg 4969)

## CONDITIONS

Apply this rule when:

- A token receives a new score from the scoring engine
- A token's score changes significantly (±15 points)
- A token is flagged by Rug-O-Meter or adversarial simulation
- A previously scored token dumps/rugs (catch validation)
- Weekly batch: tweet top 5 and bottom 5 scored tokens

## TWEET TEMPLATES

### High Score (70+):

```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100
📋 Contract: [ADDR_PREFIX]...[ADDR_SUFFIX] ([CHAIN])

[Category breakdown in visual card]

Scored across 31 sources on 19 chains.
1000-agent swarm simulation. On-chain verified.

@[project_twitter] — your token passed honest calibration.
Full report: buzzbd.ai/scores

#BuildInPublic #TokenAudit #HonestScoring
```

Card: score-card template attached (full address rendered on card)

### Watch Score (50-69):

```
🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100
📋 Contract: [ADDR_PREFIX]...[ADDR_SUFFIX] ([CHAIN])

[Specific weakness identified]

Not a fail. Not a pass. Worth watching.

@[project_twitter] — want the full 1000-agent swarm report?
DM open or request at buzzbd.ai

#HonestScoring
```

Card: score-card template attached (full address rendered on card)

### Flagged / Caught:

```
🐝 FLAGGED: [TOKEN] scored [SCORE]/100 on [DATE].
📋 Contract: [ADDR_PREFIX]...[ADDR_SUFFIX] ([CHAIN])

[What the scoring engine caught]
[What happened since]

Our 1000-agent swarm simulation predicted this.
On-chain proof: [basescan link]

"11 tokens passed every other audit. We caught them anyway."

buzzbd.ai/scores
#HonestScoring #TokenAudit
```

Card: signal-alert template attached (full address rendered on card)
PRIORITY: Post IMMEDIATELY — don't wait

### Calibration Before/After:

```
🐝 HONEST CALIBRATION: [TOKEN]
📋 Contract: [ADDR_PREFIX]...[ADDR_SUFFIX] ([CHAIN])

Before: [OLD_SCORE]/100 ✅ "Looks great"
After: [NEW_SCORE]/100 ❌ Caught by [N] penalty rules

[What changed: FDV gap / honeypot / ghost / concentration / etc.]

Every exchange would have listed this. We wouldn't.

@[project_twitter]
buzzbd.ai/scores
```

Card: score-card template attached (full address rendered on card)

## FINDING PROJECT TWITTER HANDLES

1. DexScreener token page → social links
2. CoinGecko token page → links section
3. dev-browser contact screener
4. If no handle found → tag chain ecosystem (@solana, @base, etc.)

## UPSELL IN REPLIES

When projects or followers engage with score tweets:

- Free score: "Paste any token address at buzzbd.ai/score — instant score, free."
- Paid tiers: "Full reports start at $500 (Quick Scan) up to $2,500 (1000-agent Swarm Audit)."
- Badge: "Tokens that pass get an Honest Calibration badge — verified on Base."

## RULES

- Visual card REQUIRED on every score tweet
- NFA disclaimer: never give financial advice
- Frame as data, not recommendation
- For rug catches: post SAME DAY, don't wait
- All score tweets → War Room for Ogie approval first
- Tag project handle when available
- Link to buzzbd.ai/scores always
- Maximum 3 score tweets per day (quality over spam)
- Mention "1000-agent swarm" in flagged/caught tweets (differentiator)
- When mentioning audit tiers, use: Quick Scan ($500) / Full Analysis ($1,500) / Swarm ($2,500)

## CHANGELOG

- v2.0 (Mar 31, 2026): Updated all templates from "50-agent" to "1000-agent swarm". Added upsell section with 3-tier pricing. Aligned with HSaaS Go-to-Market v2.0.
- v1.0 (Mar 30, 2026): Initial rule from Juno strategy session.
