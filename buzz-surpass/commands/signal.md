---
name: signal
description: File AIBTC signal as Ionic Nova identity. Signal Factory v4.0 Genome Stack. 7 beats, daily filing, streak protection.
---

# /signal — AIBTC Signal Filing

File signals to AIBTC as Ionic Nova identity.

## Usage
```
/signal file TOPIC              # File a signal for today
/signal status                  # Check today's signal count + streak
/signal beats                   # List available beats
/signal emergency               # File emergency signal (streak protection)
```

## Beats
agent-security, agent-infrastructure, defi, agent-governance,
agent-commerce, market-intelligence, protocol-analysis

## Rules
- Signals MUST connect data to agent activity (not self-referential)
- Duplicate check mandatory before filing
- Streak protection: emergency file by 16:00 UTC if signals_today = 0
- Current streak: ~Day 10-12 range
- Revenue: $25 per brief inclusion ($200 total)
