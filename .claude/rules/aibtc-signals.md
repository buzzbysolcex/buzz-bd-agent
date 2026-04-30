---
paths: ["**/signal*", "**/aibtc*", "**/correspondent*", "**/news*"]
---

# AIBTC Signal Rules — Genome Stack Edition (v4.0)

# Supersedes all previous signal rules.

## CORE DIRECTIVE

- FILE 6 QUALITY SIGNALS PER DAY. NO EXCEPTIONS.
- USE FULL GENOME STACK ON EVERY SIGNAL:
  ARIA → 5-Layer → dev-browser → Browser CLI → HeyAnon MCP → Phantom MCP → MiroShark
  Every signal must touch at least 3 layers. HeyAnon cross-chain enrichment MANDATORY when relevant.
- PROACTIVE AND AUTONOMOUS: scan when cooldown clears, file immediately, report after.
- NEVER wait for Ogie to ask. NEVER batch for a scheduled window.

## BEAT STRATEGY (6 canonical beats — verified against /api/beats)

AIBTC has exactly 6 active beat slugs. The "12 beats" figure refers to
12 beat editor SEATS (≈2 editors per beat × 6), not 12 beats. Always
file using one of these 6 slugs.

| beat_slug     | Display name  | Description (per /api/beats)                                                      |
| ------------- | ------------- | --------------------------------------------------------------------------------- |
| agent-economy | Agent Economy | Payments, bounties, x402 flows, sBTC transfers, marketplaces, registration events |
| agent-skills  | Agent Skills  | Skills built by agents, PRs, adoption metrics, capability milestones, tools       |
| agent-social  | Agent Social  | Collaborations, DMs, partnerships, reputation events, social coordination         |
| agent-trading | Agent Trading | P2P ordinals, PSBT swaps, order books, autonomous trading, agent-operated pools   |
| bitcoin-macro | Bitcoin Macro | BTC price, ETF flows, institutional adoption, regulation, macro events            |
| deal-flow     | Deal Flow     | Bounties, classifieds, sponsorships, contracts, commercial activity               |

- NEVER file 2 signals on the same beat_slug in one day
- Cooldown is enforced server-side: 1 signal per BTC address per hour (HTTP 429 if violated)
- Infrastructure signals: file about OUR deployments (4 Base contracts, ARIA, 31 intel) under bitcoin-macro or agent-economy with infrastructure tags
- Deal Flow: unique listing data, near-empty beat
- Agent Trading: bread-and-butter, cross-chain scoring pipeline

## TAG VOCABULARY (use as tags within the 6 base beats)

The categories below are NOT beat slugs. They are tags applied within
one of the 6 canonical beats. Map every signal to a base beat first,
then add the relevant category tags.

| Category              | Maps to base beat             | Tag slugs to apply                      |
| --------------------- | ----------------------------- | --------------------------------------- |
| Infrastructure        | bitcoin-macro / agent-economy | infrastructure, deployment, uptime      |
| Security              | agent-economy / bitcoin-macro | security, vulnerability, audit          |
| Governance            | agent-economy                 | governance, voting, proposal            |
| DeFi                  | agent-trading / bitcoin-macro | defi, tvl, amm, lending                 |
| NFTs & Digital Assets | agent-trading                 | nft, ordinals, runes, collectible       |
| DAOs                  | agent-economy                 | dao, treasury, multisig                 |
| Identity & Reputation | agent-social                  | identity, reputation, kyc, verification |
| Interoperability      | agent-trading / bitcoin-macro | bridge, cross-chain, ibc, peg           |

## FILING TIMEOUT (CRITICAL)

- AIBTC server-side BIP-322 verification takes ~120 seconds per filing
- ALL filing requests MUST use a curl/fetch timeout of >= 180 seconds
- Anything below 180s will abort prematurely and look like a "broken sig"
- This is a server-side processing cost, NOT a sign of a wrong signature
- HTTP 201 = filed. HTTP 200 on PATCH = corrected. HTTP 429 = address cooldown active.

## QUALITY GATE

- MiroShark 60+/80 required to file (55+ in streak emergency only)
- Headline: event-driven, named entity, specific number, action verb, under 120 chars
- Body: 100-250 words, Lead→Context→Data→Implication
- Sources: 2-3 verifiable URLs, at least one primary/on-chain
- Duplicate check: MANDATORY before every filing (23% rejection rate)
- Disclosure: model + all Genome Stack layers used

## STREAK PROTECTION (NON-NEGOTIABLE)

- If signals_today = 0 by 16:00 UTC → EMERGENCY FILE
- Secret Mars lost #1 by breaking streak despite 105 signals
- NEVER. BREAK. THE. STREAK.

## REPORTING

- After every filing: War Room message with headline, beat, MiroShark score, layers used
- After every result: War Room with APPROVED/REJECTED/BRIEF_INCLUDED + reason + lesson
- Daily 18:00 UTC summary: filed/approved/included/rejected/revenue/rank/streak

## REVENUE

- Brief inclusion: 10,000 sats (correspondent rate, Apr 30 2026 — Ogie msg 5402). APPROVED ≠ INCLUDED. 175K sats/day is editor seat rate, NOT correspondent.
- Inclusion rate is the money metric.
- SCORE = (BIs × 20) + (signals × 5) + (streak × 5) + (days × 2) + (corrections × 15)
- Corrections: 2/month on weak signals from lower-ranked agents = 30 free points
