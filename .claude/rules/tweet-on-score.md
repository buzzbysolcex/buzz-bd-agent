# RULE: Tweet-on-Score — Tag Project Owners with On-Chain Proof
# Location: .claude/rules/tweet-on-score.md
# Trigger: When a token is scored, re-scored, or flagged
# Version: 1.0 — March 30, 2026

## CONDITIONS
Apply this rule when:
- A token receives a new score from the scoring engine
- A token's score changes significantly (±15 points)
- A token is flagged by Rug-O-Meter or adversarial simulation
- A previously scored token dumps/rugs (catch validation)
- Weekly batch: tweet top 5 and bottom 5 scored tokens

## TWEET TEMPLATES

### High Score (70+):
"🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100
Scored across 31 sources, 19 chains. On-chain verified.
@[project_twitter] — passed honest calibration.
buzzbd.ai/scores | #HonestScoring #TokenAudit"
Card: score-card template attached

### Watch Score (50-69):
"🐝 BUZZ SCORE: [TOKEN] — [SCORE]/100
[One-line weakness identified]
@[project_twitter] — full adversarial report available.
buzzbd.ai/scores | #HonestScoring"
Card: score-card template attached

### Flagged / Caught:
"🐝 FLAGGED: [TOKEN] scored [SCORE]/100.
[What the engine caught]
On-chain proof: [basescan link]
We catch what others miss.
buzzbd.ai/scores | #HonestScoring #TokenAudit"
Card: signal-alert template attached
PRIORITY: Post IMMEDIATELY — don't wait

### Calibration Before/After:
"🐝 HONEST CALIBRATION: [TOKEN]
Before: [OLD]/100 ✅ After: [NEW]/100 ❌
[Penalty rule that triggered: FDV gap / honeypot / ghost / etc.]
Every exchange would have listed this. We wouldn't.
@[project_twitter] | buzzbd.ai/scores"
Card: score-card template attached

## FINDING PROJECT TWITTER HANDLES
1. DexScreener token page → social links
2. CoinGecko token page → links section
3. dev-browser contact screener
4. If no handle found → tag chain ecosystem (@solana, @base, etc.)

## RULES
- Visual card REQUIRED on every score tweet
- NFA disclaimer: never give financial advice
- Frame as data, not recommendation
- For rug catches: post SAME DAY, don't wait
- All score tweets → War Room for Ogie approval first
- Tag project handle when available
- Link to buzzbd.ai/scores always
- Maximum 3 score tweets per day (quality over spam)
