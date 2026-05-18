---
name: screen
description: Run the full 7-phase BD screening pipeline on a HOT token. Dual-source verification, security deep dive, contact discovery, outreach readiness classification.
---

# /screen — BD Screening Pipeline

Full 7-phase screening for exchange listing candidates.

## Usage

```
/screen PEPE                    # Full 7-phase screen
/screen 0x... --phase 1-2       # Verification + security only
/screen --report                # Generate Sunday Listing Intelligence Report
/screen --pipeline              # Show pipeline stats (363 tokens, 66 scored)
```

## Phases

1. Dual-Source Verification (DexScreener + DexTools)
2. Security Deep Dive (Go+, Quick Intel, Token Sniffer, Honeypot.is)
3. BD Readiness Classification (Sweet Spot / Watch / Pass)
4. Contact Screening (3-source: website, Twitter, GitHub)
5. Outreach Execution (email-first, 4 templates, trust-gated)
6. Reporting (receipt logged, weekly report updated)
7. Auto-Learning (failed patterns → new scoring rules)

## Requires

Score 85+ (HOT classification) to activate full pipeline.
Tokens scoring 70-84 (WARM) enter Watch mode with 7-day re-screen.
