---
name: scan
description: Scan a token by contract address or symbol. Pulls data from DexScreener API, runs through 11 scoring rules, returns score + classification + breakdown.
---

# /scan — Quick Token Score (UNVERIFIED)

Quick-score a token from DexScreener data. Single-source, no security deep dive.

**This is a QUICK SCORE, not a pipeline-verified score.**

- Does NOT run dual-source verification (DexScreener + DexTools)
- Does NOT run security deep dive (Go+, QuickIntel, TokenSniffer, Honeypot.is)
- Does NOT apply dual-gate check (fundamentals >= 42 AND market >= 18)
- Does NOT qualify for BD screening or HOT classification

For verified scoring, use the full pipeline: `/screen` or `POST /api/v1/score-token`

## Usage

```
/scan PEPE
/scan 0x6982508145454Ce325dDbE47a25d4ec3d2311933
/scan PEPE --chain base
```

## What It Does

1. Resolves token via DexScreener API search (single source)
2. Pulls price, volume, liquidity, FDV data
3. Runs through 11 scoring rules (lightweight, no external auditors)
4. Returns 0-100 QUICK SCORE with COLD/WARM/WATCH classification
5. Labels output as "QUICK SCORE — NOT PIPELINE VERIFIED"

## Classification (Quick Score)

- 70+: WARM (promising — submit for full pipeline verification)
- 40-69: WATCH (monitor)
- <40: COLD (skip)
- NOTE: Quick scan NEVER returns "HOT" — only verified pipeline can classify HOT

## Rules Applied

FDV_GAP_PENALTY, STABLECOIN_EXCLUSION, GHOST_TOKEN, CONTRADICTORY_AUDIT,
SECURITY_PENALTY, LIQUIDITY_CROSSREF, AGE_BONUS, VOLUME_THRESHOLD,
GHOST_VOLUME, CTO_FLAG, VOLUME_LIQUIDITY_RATIO

## Output

Quick score, classification, breakdown, flags, and link to full pipeline scoring.
Zero LLM cost — pure rule-based. NOT BD-screening qualified.
