# SOLCEX MASTER OPS — BD SCREENING WORKFLOW
## From HOT Token → Verified Lead → Outreach Ready
## Permanent Process Document | v1.0 | Day 39
## Bismillah 🤲

---

## OVERVIEW

This workflow activates when pipeline-scorer classifies a token as HOT (85+) or when we compile the Top 20 for the Listing Intelligence Report. Every token must pass through this screening before BD outreach.

**The goal:** By the time we send a DM, we know the token's real market cap, security status, team contact info, and whether SolCex is the right fit.

---

## PHASE 1: DUAL-SOURCE VERIFICATION (pipeline-verifier)

### Step 1.1: DexScreener Pull
```
API: https://api.dexscreener.com/latest/dex/search?q={TOKEN}
     https://api.dexscreener.com/token-pairs/v1/{chainId}/{tokenAddress}

Extract:
- Price USD
- Market Cap (shown) — WARNING: this may be FDV, not circulating
- FDV
- 24h Volume
- Liquidity USD
- Txns (buys vs sells, 5m/1h/6h/24h)
- Price change % (5m/1h/6h/24h)
- Pair age
- Number of pairs
- Boosts active
- Security: Go+ Security, Quick Intel, Token Sniffer, Honeypot.is
- Social links + website URLs
```

### Step 1.2: DexTools Pull
```
URL: https://www.dextools.io/app/en/{chain}/pair-explorer/{pairAddress}

Extract:
- Price
- Market Cap (CIRCULATING — this is the real number)
- Total Market Cap (FDV)
- Liquidity
- Circulating Supply vs Total Supply
- % Circulating Supply
- Holders count
- Total TX count
- Volatility score
- DEXTscore
- Pooled amounts (WBNB/WETH/SOL + TOKEN)
- Pool created date
```

### Step 1.3: FDV Gap Check (NEW PERMANENT RULE)
```
FDV Gap = 1 - (Circulating MCap / FDV)

If FDV Gap < 30%:  ✅ No penalty
If FDV Gap 30-50%: ⚠️ -5 wallet penalty
If FDV Gap 50-75%: 🔶 -10 wallet penalty
If FDV Gap > 75%:  🔴 -15 wallet penalty + RED FLAG
If FDV Gap > 90%:  🚨 -20 wallet penalty + REQUIRES MANUAL REVIEW

Data source priority:
- Tier 1: DexTools circulating supply (on-chain verified)
- Tier 2: DexScreener (often shows FDV as MCap for low-circ tokens)
- Tier 3: CMC/CoinGecko (aggregated, least reliable for circ data)
```

### Step 1.4: Auto-Exclusion Rules (NEW)
```
AUTO-EXCLUDE from pipeline (no manual review needed):
- Known stablecoins: USDC, USDT, EURC, DAI, FRAX, TUSD, BUSD
- Ghost tokens: < 10 holders OR < $100 daily volume
- Phantom tokens: No DexScreener/DexTools pair found
- Honeypot detected: Honeypot.is returns positive

AUTO-FLAG for manual review:
- Token Sniffer < 30/100
- Go+ Security > 3 issues
- Sell tax > 2%
- DEXTscore < 50
- Top wallet holds > 50% supply
```

---

## PHASE 2: SECURITY DEEP DIVE (pipeline-verifier)

### Step 2.1: Security Score Matrix

| Check | Source | Pass | Caution | Fail |
|-------|--------|------|---------|------|
| Token Sniffer | DexScreener | ≥ 70/100 | 30-69 | < 30 |
| Go+ Security | DexScreener | 0 issues | 1-2 issues | 3+ issues |
| Quick Intel | DexScreener | 0 issues | 1-2 issues | 3+ issues |
| Honeypot | Honeypot.is | No | — | Yes (auto-exclude) |
| Sell Tax | Go+ / DexTools | 0% | 0.1-2% | > 2% |
| DEXTscore | DexTools | ≥ 70 | 50-69 | < 50 |

### Step 2.2: Scoring Penalties

| Condition | Penalty | Example |
|-----------|---------|---------|
| Token Sniffer 0/100 | -25 composite | BANANAS31, VELO, MEMECARD |
| Go+ issues > 3 | -30 composite | wkeyDAO2 (5 issues) |
| Sell tax > 2% | -20 composite | wkeyDAO2 (3.99%) |
| DEXTscore < 50 | -15 composite | wkeyDAO2 (47) |
| < 10 holders | AUTO-EXCLUDE | MEMECARD (2 holders) |
| < $100 daily volume | AUTO-EXCLUDE | MEMECARD ($0 volume) |

### Step 2.3: Contradictory Audit Resolution
When audit sources disagree (e.g., VELO: Token Sniffer 0/100 but DEXTscore 99):
1. Flag the contradiction in pipeline notes
2. Use the LOWER (more cautious) assessment
3. Require manual investigation before BD outreach
4. Do NOT send outreach until contradiction is resolved

---

## PHASE 3: BD READINESS CLASSIFICATION (bd-proposer)

### Step 3.1: Classification Matrix

| Classification | Criteria | Action |
|---------------|----------|--------|
| **BD SWEET SPOT** | Circ MCap $500K-$50M, 2-8 exchanges, Liquidity >$100K, Security clean, Active community | IMMEDIATE OUTREACH |
| **POTENTIAL** | Meets most criteria but 1-2 concerns (e.g., low liq, some security flags) | INVESTIGATE THEN OUTREACH |
| **TOO BIG** | MCap >$100M OR on 10+ exchanges OR on Binance/Coinbase | MONITOR ONLY (unless they approach us) |
| **TOO RISKY** | Security fails, ghost token, honeypot, <10 holders | EXCLUDE FROM BD |
| **DATA MISSING** | Not found on DexScreener/DexTools | REQUIRE CONTRACT ADDRESS, verify before adding |

### Step 3.2: Audit Results Applied to Current Top 10

| Token | Chain | Classification | Rationale |
|-------|-------|---------------|-----------|
| BANANAS31 | BSC | POTENTIAL* | Real circ $1.37M = sweet spot range, BUT Token Sniffer 0/100, 1% circ |
| TRUMP | SOL | TOO BIG | $629M, 19+ exchanges, celebrity token |
| VELO | BSC | TOO BIG / LOW LIQ | $64M, 8+ exchanges, $55K pair liq, TS 0/100 |
| EURC | SOL | EXCLUDE | Stablecoin, not a BD target |
| PIPPIN | SOL | **BD SWEET SPOT** | $54M, $5.2M liq, 45K holders, clean audits, 100% circ |
| Max | SOL | DATA MISSING | Not found on any DEX. Verify contract. |
| BANANA | SOL | DATA MISSING | No Solana pairs found. Verify. |
| wkeyDAO2 | BSC | TOO BIG + RISKY | $676M, Go+ 5 issues, 3.99% sell tax |
| POOPALIEN | ? | DATA MISSING | Not found anywhere. Remove or verify. |
| MEMECARD | ETH | TOO RISKY | 2 holders, zero volume, ghost token |

---

## PHASE 4: CONTACT SCREENING (NEW — bd-proposer)

### Step 4.1: Find Team Contact Info

For every BD SWEET SPOT and POTENTIAL token, extract contact data:

```
CONTACT EXTRACTION CHECKLIST:

□ Twitter/X handle — from DexScreener social links or token website
□ Telegram group — from DexScreener social links or token website
□ Discord server — from DexScreener social links or token website
□ Email address — check:
  - Token website "Contact" or "About" page
  - GitHub repo (look for SECURITY.md, README, or commit authors)
  - Twitter bio
  - Telegram pinned messages
  - CoinGecko/CMC project page
□ Team members — identifiable individuals:
  - Founder/CEO Twitter
  - Dev lead GitHub
  - Community manager Telegram
  - LinkedIn profiles
□ Website URL — from DexScreener info section
□ GitHub repo — if exists, note last commit date
□ Medium/Blog — for content and team visibility
```

### Step 4.2: Contact Data Template

For each BD-ready token, populate:

```json
{
  "token": "PIPPIN",
  "chain": "SOL",
  "contract": "[full address]",
  "score": 85,
  "classification": "BD_SWEET_SPOT",
  "contacts": {
    "twitter": "@[handle]",
    "telegram": "[group link]",
    "discord": "[invite link]",
    "email": "[if found]",
    "website": "[url]",
    "github": "[repo url]"
  },
  "team": {
    "founder": "[name/handle if known]",
    "dev": "[name/handle if known]",
    "community": "[name/handle if known]"
  },
  "outreach_plan": {
    "primary_channel": "Twitter DM",
    "fallback_channel": "Telegram",
    "message_template": "BD Sweet Spot — first contact",
    "urgency": "Include in Sunday report"
  },
  "data_sources": {
    "dexscreener": "[pair URL]",
    "dextools": "[pair URL]",
    "coingecko": "[token URL]"
  }
}
```

### Step 4.3: Outreach Channel Priority
1. **Twitter DM** — highest response rate in crypto
2. **Telegram group** — public message or admin DM
3. **Discord** — find BD or partnerships channel
4. **Email** — formal, good for follow-ups
5. **GitHub issue** — for dev-focused teams (last resort)

---

## PHASE 5: OUTREACH EXECUTION (bd-proposer → bd-follower)

### Step 5.1: Message Templates by Classification

**BD Sweet Spot — First Contact:**
```
Hi [TOKEN] team 👋

Buzz BD Agent here — autonomous listing intelligence for SolCex Exchange.

Your token scored [SCORE]/100 in our pipeline — [CLASSIFICATION] across 
[TOTAL] tokens on [N] chains. [1-SENTENCE SPECIFIC STRENGTH].

We're featuring the Top 20 in our Listing Intelligence Report [this Sunday / weekly].

SolCex offers:
→ Free market making (3 months)
→ 450 whale wallet airdrop
→ 10-14 day fast-track listing

Interested? Full scoring breakdown at buzzbd.ai
```

**Potential — Cautious First Contact:**
```
Hi [TOKEN] team 👋

Buzz BD Agent — SolCex Exchange. Your token scored [SCORE]/100 in our 
autonomous pipeline. [SPECIFIC STRENGTH].

We noticed [SPECIFIC CONCERN — e.g., "low DEX liquidity" or "supply 
concentration"]. Would be happy to discuss how a SolCex listing could 
address this.

Details at buzzbd.ai
```

### Step 5.2: Post-Send Tracking (bd-follower)

```
After every outreach:
1. Log in bd-follower: token, channel, timestamp, message hash
2. Set 48h follow-up reminder
3. Update deal stage: PROSPECT → CONTACTED
4. Report to War Room: "[TOKEN] contacted via [CHANNEL] at [TIME]"

Follow-up cadence:
- 48h: Follow-up #1 (new data point + Sunday report angle)
- 96h: Follow-up #2 (re-frame value, different angle)
- 7d:  Follow-up #3 (final, "closing the loop")
- After 3 with no response: Mark STALE, archive with reason
```

---

## PHASE 6: REPORTING (war-room-reporter)

### Weekly BD Pipeline Report (every Sunday evening)

```
📊 BD PIPELINE REPORT — Week of [DATE]

SCREENING RESULTS:
- Tokens screened: [N]
- BD Sweet Spot: [N] — [list]
- Potential: [N] — [list]
- Too Big: [N]
- Too Risky: [N]
- Data Missing: [N]

OUTREACH STATUS:
- New contacts this week: [N]
- Follow-ups sent: [N]
- Responses received: [N]
- Deals in negotiation: [N]
- Deals closed: [N]

PIPELINE HEALTH:
- Conversion: contacted → responded: [N]%
- Conversion: responded → negotiating: [N]%
- Avg response time: [N] hours
- Top objection: [reason]

REVENUE:
- Listing deals: $[N]
- Signals: $[N]
- Total: $[N]
```

---

## PHASE 7: CONTINUOUS IMPROVEMENT (Auto-Learning)

### Track These Metrics
1. **Response rate by channel:** Which outreach channel gets most responses?
2. **Response rate by message type:** Which template works best?
3. **Score-to-deal correlation:** Do higher-scored tokens convert better?
4. **FDV gap accuracy:** Did our gap predictions match reality?
5. **Security flag accuracy:** Did flagged tokens actually have problems?
6. **Classification accuracy:** Did "BD Sweet Spot" tokens actually engage?

### Monthly Calibration
- Review all predictions vs outcomes
- Adjust scoring weights based on conversion data
- Update templates based on response analysis
- Recalibrate classification thresholds if needed

---

## 8 NEW SCORING RULES (from Cowork Audit)

These are PERMANENT additions to pipeline-scorer:

1. **CIRC SUPPLY CHECK:** Always use DexTools circulating MCap when circ supply < 50%. DexScreener shows FDV as MCap for low-circ tokens.

2. **FDV GAP PENALTY:** <30% = no penalty, 30-50% = -5, 50-75% = -10, >75% = -15, >90% = -20 + RED FLAG.

3. **STABLECOIN EXCLUSION:** Auto-exclude USDC, USDT, EURC, DAI, FRAX, TUSD, BUSD from pipeline.

4. **GHOST TOKEN EXCLUSION:** Auto-exclude tokens with <10 holders OR <$100 daily volume.

5. **PHANTOM TOKEN RULE:** Require valid DexScreener/DexTools pair URL before adding to pipeline. "NOT FOUND" = cannot score.

6. **SECURITY PENALTY:** Token Sniffer <30 = -25pts. Go+ >3 issues = -30pts. Sell tax >2% = -20pts. DEXTscore <50 = -15pts.

7. **LIQUIDITY CROSS-REF:** Cross-reference liquidity across DexScreener and DexTools. Use highest confirmed pool. Flag if difference >10x.

8. **CONTRADICTORY AUDIT HOLD:** When audit sources disagree significantly (e.g., TS 0/100 but DEXTscore 99), use lower assessment and require manual investigation before outreach.

---

## IMMEDIATE ACTION: PIPELINE CLEANUP

Based on audit findings, execute NOW:

```
REMOVE from pipeline:
- EURC (stablecoin)
- MEMECARD (ghost token: 2 holders, $0 volume)
- POOPALIEN (phantom: not found anywhere)

REQUIRE VERIFICATION:
- Max (Solana): Need contract address
- BANANA (Solana): Need contract address, "no pairs" confirmed

RE-SCORE with corrections:
- BANANAS31: Use $1.37M circ MCap, apply -20 wallet penalty (99% gap), apply -25 security penalty (TS 0/100). New score: ~50-60 (was 95)
- TRUMP: Apply -15 wallet penalty (77% gap). Still TOO BIG regardless.
- VELO: Apply -25 security penalty (TS 0/100). Investigate TS vs DEXTscore contradiction.
- wkeyDAO2: Apply -30 Go+ penalty, -20 sell tax penalty. New score: ~30-40 (was 88).

PROMOTE to BD priority:
- PIPPIN: Confirmed BD SWEET SPOT. Score validated. Begin contact screening (Phase 4) immediately.
```

---

## DIRECTIVE FOR BUZZ

```
MASTER OPS UPDATE — BD SCREENING WORKFLOW v1.0

1. Save this document as /home/claude-code/buzz-workspace/docs/MASTER-OPS-BD-SCREENING.md
2. Add to CLAUDE.md startup read order (after BUZZ-ZHC-HANDOVER-v3.md)
3. Implement 8 new scoring rules in pipeline-scorer
4. Execute pipeline cleanup (remove EURC, MEMECARD, POOPALIEN)
5. Re-score BANANAS31, TRUMP, VELO, wkeyDAO2 with corrections
6. Begin Phase 4 (Contact Screening) for PIPPIN immediately
7. Report corrected pipeline stats to War Room

This workflow is PERMANENT. Every HOT token and every Top 20 entry 
goes through Phases 1-5 before outreach. No exceptions.
```

---

*Bismillah* 🤲
*Master Ops BD Screening Workflow v1.0*
*Sprint Day 39 | March 28, 2026*
*Based on Cowork Pipeline Audit (DexScreener + DexTools deep scrape)*
