---
name: scan
description: Scan a token by contract address or symbol. Pulls data from DexScreener API, runs through 11 scoring rules, returns score + classification + breakdown.
---

# /scan — Token Scanner

Scan a token and get an instant Buzz score.

## Usage
```
/scan PEPE
/scan 0x6982508145454Ce325dDbE47a25d4ec3d2311933
/scan PEPE --chain base
```

## What It Does
1. Resolves token via DexScreener API search
2. Pulls price, volume, liquidity, FDV, security data
3. Runs through 11 permanent scoring rules (v2_8rules + 3 new)
4. Returns 0-100 score with COLD/WARM/HOT classification
5. Logs result to token_pipeline table
6. If HOT (85+): triggers BD screening workflow notification

## Rules Applied
FDV_GAP_PENALTY, STABLECOIN_EXCLUSION, GHOST_TOKEN, CONTRADICTORY_AUDIT,
SECURITY_PENALTY, LIQUIDITY_CROSSREF, AGE_BONUS, VOLUME_THRESHOLD,
GHOST_VOLUME, CTO_FLAG, VOLUME_LIQUIDITY_RATIO

## Output
Score, classification, breakdown by category, flags triggered, and API link.
Zero LLM cost — pure rule-based scoring.
