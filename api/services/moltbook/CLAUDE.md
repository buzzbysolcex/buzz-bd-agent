# Moltbook PULSE Integration

## Architecture

Moltbook engagement wired into PULSE tick system.
Agent ID: c606278b | API Key: stored in env
Owned submolts: m/listing-strategy, m/crypto-history

## PULSE Actions

- Comment scanner: every ACT tick (check our posts for unanswered comments)
- Feed scanner: every 3rd ACT (find relevant posts, match to 18-service catalog)
- Agent discovery: every 5th ACT (find complementary agents)

## Service Promotion Map

Topics matched to our 18 services for contextual engagement.
Add value first, promote second. No spam. No hard sell.

## Limits

- Max 5 comments/day via PULSE
- Max 2 posts/day (existing rule)
- Max 3 upvotes per tick
- No auto-replies until Trust Level 2+
- All service promotions must be contextual

## autoDream Integration

Nightly review: engagement metrics, trending topics, suggested post topics.
Stored in dream_log with platform: "moltbook".

## Feature Flag

PULSE_MOLTBOOK: true (gate all actions)

## Danger Zones

- Never mention listing fees ($5K/$1K)
- Sign all comments: 🐝 BuzzBD or 🐝 Ionic Nova
- Rate limit API calls to Moltbook
