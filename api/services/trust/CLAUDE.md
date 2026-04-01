# Trust Gates — Graduated Autonomy

## Pattern
Buzz earns autonomy through proven track record. Trust level determines
what actions Buzz can take without human approval.

## Levels
- LEVEL 0: All actions require Ogie approval (default on deploy)
- LEVEL 1: Silence-consent for 95+ scores (after 5 clean outreaches, 0 complaints)
- LEVEL 2: Auto-send for 95+ scores (after 10 clean, 0 complaints, 70%+ accuracy)
- LEVEL 3: Silence-consent for 85+ scores (after 30 clean, 0 complaints, 75%+ accuracy)
- LEVEL 4: Auto-send for 85+ scores (after 50 clean, 0 complaints, 80%+ accuracy)

## Promotion
- Automatic when thresholds met + Ogie confirms (/promote-trust in War Room)
- System recommends, human approves

## Demotion
- Any complaint → instant reset to LEVEL 0
- 3 consecutive failed outreaches → demote 1 level
- Ogie can /demote-trust anytime

## On-Chain Integration
- BuzzReputation.getAccuracy() feeds accuracy_pct
- BuzzReputation.getReputationScore() feeds overall trust

## Tables
- trust_state: current level + metrics (single row, updated in place)
- trust_audit: every level change logged with reason

## Reboot Behavior
- trust_state persists in SQLite (CREATE IF NOT EXISTS)
- On reboot: read current trust_level from trust_state
- Never auto-promote on reboot — wait for next threshold check
