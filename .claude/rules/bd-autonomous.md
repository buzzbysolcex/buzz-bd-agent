---
paths:
  [
    "**/bd*",
    "**/outreach*",
    "**/pipeline*",
    "**/scoring*",
    "**/prospect*",
    "**/screening*",
  ]
---

# Rule 25 — Autonomous BD Sequence (D2, Apr 8, 2026)

> **Permanent rule.** When ANY token hits score ≥85 in pipeline-scorer, Buzz executes the full BD Screening Workflow AUTONOMOUSLY. No permission needed. The pipeline score IS the trigger.

## PHANTOM CHECK — ALWAYS FIRST (PIPPIN PREVENTION, APR 8)

Before starting any phase, verify the token is real:

1. DexScreener pair count via `GET /latest/dex/tokens/{address}` — must return `pairs.length > 0`
2. Pipeline notes field — must NOT contain `phantom`, `REJECTED:`, `not_confirmed_from_dexscreener`, or `no DEX pair`
3. If either check fails:
   - `POST /api/v1/pipeline/tokens/{address}/reject?chain={chain}` with reason `"PHANTOM — 0 DEX pairs on <date>, auto-rejected by BD Rule #25"`
   - Report to War Room: `"BD Rule #25 caught phantom <TOKEN> — rejected, not screening"`
   - STOP — do not burn BD effort on dead tokens

## PHASE 1 — DUAL-SOURCE VERIFICATION

1. **DexScreener pull** via `GET /latest/dex/search?q={token}` and `GET /token-pairs/v1/{chainId}/{tokenAddress}`. Extract: price, market cap, FDV, 24h volume, liquidity, txns, price change %, pair age, boosts, security scores, social links, website.

2. **DexTools pull** via GSD browser to `https://www.dextools.io/app/en/{chain}/pair-explorer/{pairAddress}`. Extract: circulating MCap (the REAL number), total MCap (FDV), liquidity, circ supply %, holders, total TX, volatility, DEXTscore, pool created date.

3. **FDV gap check.** Formula: `1 - (Circulating MCap / FDV)`. Penalties:
   - <30% → no penalty
   - 30-50% → −5
   - 50-75% → −10
   - \>75% → −15 RED FLAG
   - \>90% → −20 + MANUAL REVIEW

   Source priority: DexTools circ (Tier 1) > DexScreener (Tier 2) > CMC/CoinGecko (Tier 3).

4. **Auto-exclusion check.** Any of the following → STOP sequence, reject, report:
   - Known stablecoin
   - Ghost token: <10 holders OR <$100 daily volume
   - Phantom: no DexScreener/DexTools pair
   - Honeypot detected

## PHASE 2 — SECURITY DEEP DIVE (only if Phase 1 passes)

| Check         | Source       | Pass     | Caution | Fail |
| ------------- | ------------ | -------- | ------- | ---- |
| Token Sniffer | DexScreener  | ≥70/100  | 30-69   | <30  |
| Go+ Security  | DexScreener  | 0 issues | 1-2     | 3+   |
| Quick Intel   | DexScreener  | 0 issues | 1-2     | 3+   |
| Honeypot      | honeypot.is  | No       | —       | Yes  |
| Sell Tax      | Go+/DexTools | 0%       | 0.1-2%  | >2%  |
| DEXTscore     | DexTools     | ≥70      | 50-69   | <50  |

**Scoring penalties (composite score adjustment):**

- Token Sniffer 0/100 → −25
- Go+ issues >3 → −30
- Sell tax >2% → −20
- DEXTscore <50 → −15
- <10 holders → AUTO-EXCLUDE
- <$100 daily volume → AUTO-EXCLUDE

**Contradictory audit resolution.** When audit sources disagree (e.g., Token Sniffer 0/100 but DEXTscore 99):

1. Flag contradiction in pipeline notes
2. Use the LOWER (more cautious) assessment
3. Require manual investigation before BD outreach
4. Do NOT proceed to Phase 5 until the contradiction is resolved
5. Report to War Room: `"AUDIT CONFLICT on <TOKEN> — <details>"`

If final classification = TOO RISKY → log, report, STOP.

## PHASE 3 — BD READINESS CLASSIFICATION (only if Phase 2 passes)

| Classification    | Criteria                                                    | Action                 |
| ----------------- | ----------------------------------------------------------- | ---------------------- |
| **BD SWEET SPOT** | Circ MCap $500K-$50M, 2-8 exchanges, Liq >$100K, clean      | → PHASE 4              |
| **POTENTIAL**     | Meets most but 1-2 concerns (low liq, some security flags)  | → PHASE 4 (cautious)   |
| **TOO BIG**       | MCap >$100M OR 10+ exchanges OR already on Binance/Coinbase | MONITOR ONLY, STOP     |
| **TOO RISKY**     | Security fails, ghost, honeypot, <10 holders                | EXCLUDE, STOP          |
| **DATA MISSING**  | Not found on DexScreener/DexTools                           | REQUIRE CONTRACT, STOP |

Only `BD SWEET SPOT` and `POTENTIAL` proceed to Phase 4.

## PHASE 4 — CONTACT SCREENING (for BD SWEET SPOT / POTENTIAL only)

Use **GSD browser as primary** for all web scraping.

1. **Project website scan** — homepage, About/Team, Contact. Extract team names, roles, emails, socials.
2. **DexScreener social links** — Twitter, Telegram, Discord, website.
3. **Cross-reference minimum 3 sources:** CoinGecko, CoinMarketCap, GitHub (check SECURITY.md/README/commit authors), Twitter bio, Telegram pinned, LinkedIn.
4. **Email verification — 3-source minimum.** Look for `team@`, `info@`, `contact@`, `hello@`, `partnerships@`. NEVER use personal emails — team/business addresses only.
5. **Populate contact template:**

```json
{
  "token": "<NAME>",
  "chain": "<CHAIN>",
  "contract": "<ADDRESS>",
  "score": 00,
  "classification": "<BD_SWEET_SPOT|POTENTIAL>",
  "contacts": {
    "twitter": "@handle",
    "telegram": "group_link",
    "discord": "invite_link",
    "email": "found@address",
    "website": "url",
    "github": "repo_url"
  },
  "team": {
    "founder": "name/handle",
    "dev": "name/handle",
    "community": "name/handle"
  },
  "data_sources": {
    "dexscreener": "pair_url",
    "dextools": "pair_url",
    "coingecko": "token_url"
  }
}
```

## PHASE 5 — OUTREACH EXECUTION (only after Phase 4 contact data populated)

**Channel priority — email first:**

1. **Email** — Gmail OAuth `buzzbysolcex@gmail.com`, HTML signature + logo
2. Twitter DM — DEAD CHANNEL, do not invest (Standing Rule)
3. Telegram group — public message or admin DM
4. Discord — BD / partnerships channel
5. GitHub issue — dev-focused teams, last resort

**Template selection:**

- BD SWEET SPOT → "BD Sweet Spot — First Contact" template (dual-funnel)
- POTENTIAL → "Potential — Cautious First Contact" template

**CC ON EVERY OUTREACH — NO EXCEPTIONS:**

- `ogie.solcexexchange@gmail.com` (Ogie)
- `dino@solcex.cc` (Dino)

This applies at **all trust levels**, including Level 4.

**Outreach constraints:**

- Max 10 emails per day (spam prevention)
- Template-only for auto sends — no LLM-generated email bodies
- NEVER mention listing fees ($5K / $1K) in automated emails
- NEVER send to personal email addresses

**Approval gate:**

- **Trust Level 0 (current):** draft → War Room → WAIT for Ogie approval → send
- **Trust Level 1+:** silence-consent per trust-gates rules (4h auto-send)

**War Room draft format:**

```
BD OUTREACH DRAFT:
Token: <NAME> (<CHAIN>)
Score: <SCORE>/100
Classification: <BD_SWEET_SPOT|POTENTIAL>
Contact: <EMAIL/CHANNEL>
CC: Ogie + Dino
Template: <TEMPLATE_NAME>
Subject: <SUBJECT LINE>
Body: <FULL BODY>
Sources verified: <LIST>

AWAITING APPROVAL. Reply "send" to execute.
```

## POST-SEND TRACKING

1. Log in `bd-follower`: token, channel, timestamp, message hash
2. Create dynamic cron: 48h follow-up (maxRuns: 1, self-deactivating)
3. Create dynamic cron: 7d breakup follow-up (maxRuns: 1, self-deactivating)
4. Update deal stage: `PROSPECT` → `CONTACTED`
5. Report to War Room: `"<TOKEN> contacted via <CHANNEL> at <TIME> — CC Ogie + Dino"`
6. Emit event: `BD_OUTREACH_SENT` (for event bus subscribers)

## EVENT BUS INTEGRATION

The autonomous BD sequence is triggered by the event bus. When scoring-agent emits `TOKEN_HOT` (score ≥85):

```js
subscribe("bd-agent", EVENT_TYPES.TOKEN_HOT, async (event) => {
  // Phantom check first (PIPPIN prevention)
  // Phase 1: Dual-Source Verification
  // Full sequence runs autonomously from here
});
```

Wire this in `server.js` event subscription handler.

## SUMMARY

- Pipeline score ≥85 is the ONLY trigger needed
- Phantom check is ALWAYS first (learned from PIPPIN, Apr 8)
- Full 5-phase sequence runs without human permission
- CC Ogie + Dino on all outreach — no exceptions
- War Room approval gate at current Trust Level 0
- The pipeline exists to generate leads. Buzz exists to work them.

---

_Rule 25 | Permanent | Apr 8, 2026 directive package | Bismillah_
