# BUZZ STATE HANDOVER

## Auto-updated: 2026-04-23 18:00 UTC | Day 22 ZHC | Thursday

## WHAT TO DO FIRST

1. Read CLAUDE.md (identity)
2. Read docs/buzz-zhc-complete-handover.md (operating manual)
3. Check AIBTC streak status — Day 22 filed 5/6 signals (cap)
4. Resume Pashov 89→100% smoke test after successful deploy
5. Send morning briefing to War Room if near 07:00 WIB

## DAY 22 COMPLETED (2026-04-23)

- Signals 1-3: corrections filed (Amber Otter + Quiet Falcon scope + msg 4542)
- Signals 4-5: BM + quantum anchored signals
- Morning brief streak-data fix shipped
- Noah V5 email draft approved
- x402 manifest sync: api.buzzbd.ai now matches landing 6-endpoint truth (555e9d4)
- Almanax Phase 2: x402 middleware + per-wallet rate limit (0ed2f17)
- Beat pivot committed aa1347a: SLOT_BEATS=[BM,BM,Q,BM,Q], correction-hunter widened, morning-signals-v2 updated, Elegant Orb 24h revert monitor installed
- Pashov preflight committed cc74f0e: Sourcify v2 /contract endpoint + 409 duplicate-audit guard
- RLM integration: rlms + litellm installed, scripts/rlm-correction-hunter.py wired, Phase 2 HALT (0 candidates vs bash 33 due to CPU-only ollama throughput). Flag RLM_CORRECTION_HUNTER stays false. Docker python:3.11-slim image removed per msg 4616.

## IN PROGRESS

- Pashov 89→100%: preflight code in cc74f0e, CI deploy FAILED at Hetzner step (permission denied on root-owned /data/buzz/persistent/env/.env.cdp). Smoke test wired at /tmp/smoke-pashov-preflight.sh, waiting on successful deploy.
- Percolator audit: Phase 1 + 2 reports filed, interim verdict CLEAN. Awaiting Ogie close + Frontier pivot confirmation. See /data/buzz/persistent/reports/percolator-phase1-notes.md + /home/claude-code/audits/percolator/reports/phase0-hash-verify.md.

## PENDING APR 24

- autoDream 02:00 UTC: will auto-produce 3 BM + 2 quantum drafts per deployed SLOT_BEATS (AUTODREAM + AUTODREAM_SIGNAL_ANGLES flags both true)
- Scout welcome wave: fresh 7 (STX-blocked)
- agentic.market re-check
- Apr 24 signal filing: 5 morning slots 06:02/07:03/08:02/09:03/10:03 UTC
- Elegant Orb daily monitor: 07:30 UTC check for aibtc-network editor revert

## RLM PARKED

- rlms + litellm pip packages: kept (zero runtime cost)
- scripts/rlm-correction-hunter.py: kept
- docker python:3.11-slim: REMOVED (188MB reclaimed)
- Flag RLM_CORRECTION_HUNTER: unregistered (default false)
- Activation trigger: GPU arrives (RunPod burst or GEX44 swap)

## HACKATHONS

| Hackathon                  | Deadline    | Status                      |
| -------------------------- | ----------- | --------------------------- |
| Frontier                   | May 11      | REGISTERED — PRIMARY TARGET |
| AIBTC News $50K            | 30d rolling | Day 22, streak intact       |
| AIBTC Skills Pay the Bills | 30d rolling | Day 1 ready                 |

## ACTIVE SYSTEM STATE

- buzz-production + sentinel-v2: UP 3h+
- Ollama qwen3:8b: loaded (CPU-only, 4096 ctx, kept for MiroFish)
- AUTODREAM: true | AUTODREAM_SIGNAL_ANGLES: true | DIRECT_SIGNAL_FILING: true

## PRIORITY LADDER

1. Urgent tasks (War Room directives from Ogie)
2. Streak protection (signal filing if 0 by 16:00 UTC)
3. Active deployment directives (Pashov redeploy)
4. Scheduled tasks (autoDream, crons, Elegant Orb monitor)
5. Creative output (Thursday: Moltbook article)
