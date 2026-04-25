# BUZZ STATE HANDOVER

## DATE: 2026-04-25 (Saturday) | SESSION: Day 25 — CAP MAXED 6/6

## COMPLETED TODAY (Day 25 — final tally)

- Correction 2 quantum filed 08:43:09Z — signal_id `0a452005-0136-4d90-a941-9eeefb1b0c60` (qs=78)
- Slot 2 BM filed 09:46:09Z — signal_id `83f86a44-d496-40cf-ae61-db757d558f1e` (qs=93 ⭐ top of day)
- Slot 3 quantum filed 10:48:43Z — signal_id `ee7c68fa-08bb-4394-a060-21f65be0a231` (qs=78). First attempt 400'd on headline=122c, trimmed to 111c, retry succeeded.
- Slot 4 BM filed 11:51:16Z — signal_id `d2ebc390-2d20-4898-8eed-e277e3484630` (qs=88)
- Signal A BM filed 20:59:17Z — signal_id `1e08c1d7-66de-4499-89e0-95b1bbfcab82` (qs=88). Mempool/fee decoupling angle. Client timed out at 20s but server completed BIP-322 verification and the signal landed — recovered via /api/signals lookup.
- Signal B BM correction filed 21:59:50Z — signal_id `a1ac1e21-3968-4a2e-9cbc-50ae6576194a` (qs=83). Caught Little Lux signal 7ff4519e's 100x decimal misread (claimed -242.65% prior retarget, actual is -2.43%).
- Twitter Option A posted — tweet_id `2047983222349287806` (X HTTP 201)

## COMMITS PUSHED (4)

- `c163fb5` fix(signals): preflight enforces AIBTC headline ≤120c + source.title ≤200c
- `738707d` fix(autodream): F2 — Phase 6 fetches fallback sources, restores sources≥1 guard
- `8becedc` chore(day25): EOD handover (early version, 12:00 UTC)
- `a923d03` fix(signals): direct-filer fetch timeout 20s → 180s for BIP-322 verification

## DAILY CAP — 6/6 MAXED

| #   | signal_id | beat          | qs  |
| --- | --------- | ------------- | --- |
| 1   | 0a452005  | Quantum       | 78  |
| 2   | 83f86a44  | Bitcoin Macro | 93  |
| 3   | ee7c68fa  | Quantum       | 78  |
| 4   | d2ebc390  | Bitcoin Macro | 88  |
| 5   | 1e08c1d7  | Bitcoin Macro | 88  |
| 6   | a1ac1e21  | Bitcoin Macro | 83  |

Avg qs 84.67 / 100. Beat mix: 4 BM + 2 quantum. Streak Day 25 ✅. Rank #29 / 100.

## SPEC FINDINGS (added to memory)

- AIBTC `POST /api/signals` does NOT accept `correction_of` field — that field is exclusive to `PATCH /api/signals/{id}` (original-author self-correction). Cross-agent corrections (calling out factual errors in another agent's signal) MUST be filed via POST with "Correction:" prefix in headline. Confirmed via aibtc.news/llms.txt + retroactive check on signal 0a452005 (correction_of stored as None despite our local JSON).
- Score formula's `corrections×15` bucket only counts PATCH-based self-corrections, not POST-based cross-agent callouts. Cross-agent corrections earn standard `signals×5`.
- AIBTC BIP-322 verification can take ~120s server-side. Filer fetch timeout MUST be ≥180s. Was 20s, now 180s.
- AIBTC API caps: headline ≤120c, source.title ≤200c. Both now enforced in preflight.
- New memory file: `reference_aibtc_headline_cap.md`

## PENDING

- **Tomorrow's autoDream cycle** (02:00 UTC Sun Apr 26) — first run with F2 fallback fetcher + restored sources≥1 guard. Should write 5 fileable drafts (3 BM + 2 quantum) with real fetched URLs. Watch /data/buzz/persistent/buzz-api/signal-filing.log at 06:02/07:03/08:02/09:03/10:03 UTC.
- **Pashov 89→100%** (task #27) — still queued, need 5-step plan from Ogie
- **Percolator audit Phase 2** (task #29) — I-3 partial review at /data/buzz/persistent/reports/percolator-phase1-notes.md
- **Image drift investigation** (task #33)

## BLOCKERS

- none

## ACTIVE STATE

- Container: buzz-production UP
- Deploy: run #252 success (738707d) at ~12:01 UTC; a923d03 timeout fix on host filer (not container-deploy-needed since script runs from host)
- F2 + preflight + 180s timeout: live in container + host scripts
- AgentCash discovery: 6 endpoints, warnings=[]
- Pashov tweet 2047392626035331457: 32 imp / 2 likes / 1 RT / 0 replies (flat)

## TOP 5 PROSPECTS

- BALLWARS: 95 (solana) — scored
- BANANAS31: 95 (bsc) — scored
- Max: 95 (solana) — scored
- TRUMP: 95 (solana) — scored
- VELO: 95 (bsc) — scored

## ACTIVE DEALS

- BANANAS31 (BSC, score 95) — outreach sent 2026-03-23
- $COW (BSC, score 84) — outreach sent 2026-03-23
