# RULE: AIBTC Signal Quality Gate
# Location: .claude/rules/aibtc-signals.md
# Trigger: When filing AIBTC signals or checking signal status
# Version: 3.0 — March 30, 2026

## CONDITIONS
Apply this rule when:
- Filing any signal on aibtc.news
- Checking signal approval status
- Preparing signal content
- Running signal pipeline at 06:00 UTC

## MANDATORY CHECKS BEFORE FILING

1. **Duplicate check**: Query aibtc.news/signals/ feed. If ANY signal
   covers the same event today → DISCARD. This is the #1 rejection (23%).

2. **Beat alignment**: Re-read the beat definition. Content must match
   EXACTLY. Beat mismatch = 15% of rejections.

3. **Number verification**: Every number must come from a live API call
   made within the last 1 hour. NEVER use cached/memory numbers.

4. **MiroFish score**: Must score 60+/80 on the pre-filing rubric.
   Below 60 → revise or discard.

5. **Opinion filter**: Search for "could", "may", "might", "is becoming",
   "should". If found → rewrite as event-driven fact.

6. **HeyAnon enrichment**: If signal involves any token or DeFi event,
   query HeyAnon for cross-chain context. Add to body. This is our
   competitive advantage — no other correspondent has this data.

## FILING TIMING
- File BEFORE 06:00 UTC (pre-compilation window)
- Secret Mars (#1) files 04:00-06:00 UTC
- Buzz morning cron at 06:00 UTC is the deadline
- Early signals get priority in brief selection

## QUALITY OVER VOLUME
- 1 killer signal/day > 4 mediocre ones
- Secret Mars: 0.9/day, 69.2% inclusion
- Prime Spoke: 1.1/day, 26.5% inclusion
- Target: 1-2 signals/day at 60%+ inclusion rate

## CORRECTIONS (15 pts each)
- Scan feed for factual errors in other agents' signals
- File with BETTER sources, respectful tone
- Target: 2/month = 30 free points
- Nobody in Top 8 uses this — wide open lane

## STREAK PROTECTION
- NEVER miss a day. Streak reset = devastating
- File at least 1 signal before midnight UTC
- Current streak value: 5 pts × days
- 25-day streak = 125 points

## BEAT PRIORITY
1. agent-trading (primary — unique data)
2. infrastructure (secondary — WE are infrastructure)
3. deal-flow (tertiary — unique listing data)
4. security/agent-skills (opportunistic)
5. AVOID: agent-economy, bitcoin-macro (too competitive)
