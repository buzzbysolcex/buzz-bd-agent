---
name: bd-workflow-v2-browser-enhanced
description: >
  Reconfigured BD Screening Workflow v2.0 with dev-browser + Browser Use CLI
  mapped across all 5 scoring layers. Integrates Bags.fm (168K tokens) and
  Colosseum Copilot (5,400 projects) as discovery sources. Both browser tools
  serve different purposes: dev-browser for structured data extraction (fast,
  scriptable, JSON output), Browser Use CLI for visual proof and screenshot
  verification (evidence for War Room). Pro Max unlimited compute = no budget
  constraint per agent. Focus: maximize intelligence quality from existing resources.
license: Internal — SolCex Exchange
---

# BD SCREENING WORKFLOW v2.0 — Browser-Enhanced

## Deep Research: How dev-browser + Browser Use CLI Map to Every Layer

## Day 41 | Mar 29, 2026

## Bismillah 🤲

---

## THE INSIGHT

Buzz has TWO browser tools + Pro Max unlimited compute. Most agents have neither.
The question isn't "which tool?" — it's "which tool WHERE in the pipeline?"

**dev-browser** = EXTRACTION (structured data, JSON, scriptable, fast, reusable)
**Browser Use CLI** = VERIFICATION (screenshots, visual proof, evidence for War Room/Ogie)

Both serve different purposes at different layers. Using both together creates
an intelligence depth that NO other BD agent in the 114K ERC-8004 ecosystem has.

---

## CURRENT 5-LAYER SCORING ARCHITECTURE

```
Layer 1: SAFETY      (max 25) — Contract security, honeypot, audit scores
Layer 2: WALLET      (max 25) — Deployer analysis, holder distribution, FDV gap
Layer 3: TECHNICAL   (max 20) — GitHub activity, contract verified, age
Layer 4: SOCIAL      (max 15) — Twitter followers, Telegram, community activity
Layer 5: SCORER      (max 30) — Market cap, volume, liquidity, exchange count
```

PLUS: Dual-gate (fundamental score must also pass)
PLUS: 8 BD Screening penalty rules
PLUS: Tri-source verification (DexScreener + DexTools + Jupiter/CoinGecko)

---

## RECONFIGURED: BROWSER TOOLS MAPPED TO EVERY LAYER

### LAYER 1: SAFETY (max 25)

**Current:** DexScreener API → Token Sniffer, Go+ Security, Quick Intel, Honeypot.is
**Problem:** API returns summary scores only. No deep contract analysis.

**ENHANCEMENT with dev-browser:**

```javascript
// Script: Deep safety audit for BD Sweet Spot candidates
const page = await browser.getPage("safety-audit");

// 1. Token Sniffer deep report (not just score)
await page.goto(`https://tokensniffer.com/token/${chain}/${address}`);
const tsData = await page.evaluate(() => ({
  score: document.querySelector(".score-value")?.textContent,
  issues: Array.from(document.querySelectorAll(".issue-item")).map(
    (i) => i.textContent,
  ),
  contractVerified: !!document.querySelector(".verified-badge"),
  ownershipRenounced: document.body.textContent.includes("renounced"),
  liquidityLocked: document.body.textContent.includes("locked"),
}));

// 2. Go+ Security detailed report
await page.goto(`https://gopluslabs.io/token-security/${chainId}/${address}`);
const gpData = await page.evaluate(() => ({
  isProxy: document.body.textContent.includes("Proxy Contract"),
  isMintable: document.body.textContent.includes("Mintable"),
  taxInfo: document.querySelector(".tax-info")?.textContent,
  holderInfo: document.querySelector(".holder-info")?.textContent,
}));

// 3. De.Fi scanner (additional source)
await page.goto(`https://de.fi/scanner/contract/${address}`);
const defiData = await page.evaluate(() => ({
  riskScore: document.querySelector(".risk-score")?.textContent,
  flags: Array.from(document.querySelectorAll(".flag-item")).map(
    (f) => f.textContent,
  ),
}));

console.log(
  JSON.stringify({ tokenSniffer: tsData, goPlus: gpData, deFi: defiData }),
);
```

**ENHANCEMENT with Browser Use CLI:**

```
/browse https://tokensniffer.com/token/{chain}/{address}
→ Screenshot to War Room (VISUAL PROOF of safety score for Ogie)
→ "Here's the Token Sniffer report — clean/flagged"
```

**Value:** dev-browser extracts the DETAILS (specific issues, proxy status, mintable).
Browser Use CLI provides the SCREENSHOT (proof for War Room and BD proposals).
Together: data + evidence. Nobody else does this.

---

### LAYER 2: WALLET (max 25)

**Current:** Helius API (Solana), DexScreener holder data, FDV gap calculation
**Problem:** Deployer wallet analysis is currently a hardcoded stub (always returns 3).

**ENHANCEMENT with dev-browser:**

```javascript
// Script: Deployer wallet forensics
const page = await browser.getPage("wallet-forensics");

// 1. Check deployer on Solscan/Basescan
await page.goto(`https://solscan.io/account/${deployerAddress}`);
const deployerData = await page.evaluate(() => ({
  totalTxns: document.querySelector(".total-txns")?.textContent,
  firstTxDate: document.querySelector(".first-tx-date")?.textContent,
  tokenCount: document.querySelector(".token-count")?.textContent,
  solBalance: document.querySelector(".sol-balance")?.textContent,
  // How many OTHER tokens has this deployer created?
  deployedContracts: Array.from(
    document.querySelectorAll(".deployed-contract"),
  ).map((c) => c.textContent),
}));

// 2. Check top holders on DexScreener (not available via API)
await page.goto(`https://dexscreener.com/${chain}/${pairAddress}`);
// Click "Holders" tab if available
const holderData = await page.evaluate(() => ({
  topHolderPercent: document.querySelector(".top-holder-pct")?.textContent,
  holderCount: document.querySelector(".holder-count")?.textContent,
  distribution: document.querySelector(".distribution-chart")?.textContent,
}));

// 3. Bubble Maps visualization check
await page.goto(`https://app.bubblemaps.io/${chain}/token/${address}`);
const bubbleData = await page.evaluate(() => ({
  clusterCount: document.querySelectorAll(".cluster").length,
  topClusterPercent: document.querySelector(".top-cluster")?.textContent,
  suspiciousPatterns: document.body.textContent.includes("suspicious"),
}));

console.log(
  JSON.stringify({
    deployer: deployerData,
    holders: holderData,
    bubbles: bubbleData,
  }),
);
```

**ENHANCEMENT with Browser Use CLI:**

```
/browse https://app.bubblemaps.io/{chain}/token/{address}
→ Screenshot of Bubble Map to War Room
→ VISUAL proof of wallet concentration (or distribution)
→ This screenshot goes into BD proposals as evidence
```

**Value:** dev-browser extracts deployer history (serial deployer = red flag), holder distribution data, and bubble map clusters. Browser Use CLI captures the VISUAL bubble map as evidence. The deployer analysis alone upgrades the wallet score from a hardcoded 3 to real forensics.

---

### LAYER 3: TECHNICAL (max 20)

**Current:** Binary CoinGecko check + contract age. Hardcoded stubs for most metrics.
**Problem:** No real GitHub activity check, no documentation quality assessment.

**ENHANCEMENT with dev-browser:**

```javascript
// Script: Technical depth analysis
const page = await browser.getPage("tech-analysis");

// 1. GitHub activity (if repo exists)
await page.goto(`https://github.com/${repoOwner}/${repoName}`);
const githubData = await page.evaluate(() => ({
  stars: document.querySelector('[data-view-component="true"] .Counter')
    ?.textContent,
  lastCommit: document.querySelector("relative-time")?.getAttribute("datetime"),
  contributors: document.querySelector('a[href*="contributors"] .Counter')
    ?.textContent,
  openIssues: document.querySelector('a[href*="issues"] .Counter')?.textContent,
  languages: Array.from(
    document.querySelectorAll(".color-fg-default.text-bold"),
  ).map((l) => l.textContent.trim()),
  hasReadme: !!document.querySelector("#readme"),
  hasLicense: !!document.querySelector(".octicon-law"),
}));

// 2. Documentation check (if docs site exists)
if (docsUrl) {
  await page.goto(docsUrl);
  const docsData = await page.evaluate(() => ({
    pageCount: document.querySelectorAll("nav a").length,
    hasApi: document.body.textContent.toLowerCase().includes("api"),
    hasSdk: document.body.textContent.toLowerCase().includes("sdk"),
    lastUpdated: document.querySelector('[class*="updated"]')?.textContent,
  }));
}

// 3. Contract verification on block explorer
await page.goto(`https://basescan.org/address/${contractAddress}#code`);
const contractData = await page.evaluate(() => ({
  verified: !!document.querySelector(".verified-contract"),
  compiler: document.querySelector(".compiler-version")?.textContent,
  optimized: document.body.textContent.includes("Optimization Enabled"),
  sourceLines: document.querySelector("#editor")?.textContent?.split("\n")
    .length,
}));

console.log(
  JSON.stringify({
    github: githubData,
    docs: docsData,
    contract: contractData,
  }),
);
```

**Value:** Transforms Layer 3 from binary checks to real technical analysis. GitHub commit recency, contributor count, documentation quality, contract verification details. This is data NO API provides — only browser extraction can get it.

---

### LAYER 4: SOCIAL (max 15)

**Current:** Binary CoinGecko check for social presence. No depth.
**Problem:** Can't distinguish a project with 100K real followers from one with 100K bots.

**ENHANCEMENT with dev-browser:**

```javascript
// Script: Social depth analysis
const page = await browser.getPage("social-analysis");

// 1. Twitter/X profile analysis
await page.goto(`https://x.com/${twitterHandle}`);
const twitterData = await page.evaluate(() => ({
  followers: document.querySelector('[data-testid="followers"] span')
    ?.textContent,
  following: document.querySelector('[data-testid="following"] span')
    ?.textContent,
  joinDate: document.querySelector('[data-testid="UserJoinDate"]')?.textContent,
  lastPostDate: document.querySelector("time")?.getAttribute("datetime"),
  verified: !!document.querySelector('[aria-label="Verified account"]'),
  bio: document.querySelector('[data-testid="UserDescription"]')?.textContent,
  pinnedTweet: document
    .querySelector('[data-testid="tweet"]')
    ?.textContent?.substring(0, 200),
}));

// 2. Telegram group (if link available)
// Note: Telegram web preview gives basic info without joining
await page.goto(`https://t.me/${telegramGroup}`);
const tgData = await page.evaluate(() => ({
  memberCount: document.querySelector(".tgme_page_extra")?.textContent,
  title: document.querySelector(".tgme_page_title")?.textContent,
  description: document.querySelector(".tgme_page_description")?.textContent,
}));

// 3. CoinGecko community data
await page.goto(`https://www.coingecko.com/en/coins/${tokenSlug}`);
const cgData = await page.evaluate(() => ({
  watchlistCount: document.querySelector(".watchlist-count")?.textContent,
  communityScore: document.querySelector(".community-score")?.textContent,
  socialLinks: Array.from(document.querySelectorAll(".coin-link a")).map(
    (a) => a.href,
  ),
}));

console.log(
  JSON.stringify({ twitter: twitterData, telegram: tgData, coingecko: cgData }),
);
```

**ENHANCEMENT with Browser Use CLI:**

```
/browse https://x.com/{twitterHandle}
→ Screenshot of Twitter profile to War Room
→ Visual proof of follower count, last activity, verified status
→ Goes into BD outreach as "we checked your socials"
```

**Value:** Transforms social scoring from "does CoinGecko show a Twitter link?" to actual analysis: follower count, join date, last post recency, Telegram member count. The visual screenshot of their Twitter profile goes into BD proposals as proof of due diligence.

---

### LAYER 5: SCORER / MARKET (max 30)

**Current:** DexScreener API for market cap, volume, liquidity, exchange count.
**Problem:** DexScreener API sometimes returns FDV as MCap. DexTools has circulating supply but no free API.

**ENHANCEMENT with dev-browser:**

```javascript
// Script: Deep market intelligence
const page = await browser.getPage("market-intel");

// 1. DexTools (NO API available — browser is the ONLY way)
await page.goto(
  `https://www.dextools.io/app/en/${chain}/pair-explorer/${pairAddress}`,
);
await page.waitForTimeout(5000); // DexTools is slow to load
const dextoolsData = await page.evaluate(() => ({
  price: document.querySelector('[class*="price"]')?.textContent,
  mcapCirc: document.querySelector('[class*="market-cap"]')?.textContent,
  fdv: document.querySelector('[class*="fdv"]')?.textContent,
  circSupply: document.querySelector('[class*="circ-supply"]')?.textContent,
  totalSupply: document.querySelector('[class*="total-supply"]')?.textContent,
  holders: document.querySelector('[class*="holders"]')?.textContent,
  dextScore: document.querySelector('[class*="dext-score"]')?.textContent,
  poolCreated: document.querySelector('[class*="created"]')?.textContent,
  txCount: document.querySelector('[class*="tx-count"]')?.textContent,
}));

// 2. CoinGecko exchange listings (which exchanges list this token?)
await page.goto(`https://www.coingecko.com/en/coins/${tokenSlug}#markets`);
const exchangeData = await page.evaluate(() => ({
  exchangeCount: document.querySelectorAll(".market-table tbody tr").length,
  exchanges: Array.from(document.querySelectorAll(".market-table tbody tr"))
    .slice(0, 10)
    .map((row) => ({
      name: row.querySelector(".exchange-name")?.textContent?.trim(),
      volume: row.querySelector(".volume")?.textContent?.trim(),
      pair: row.querySelector(".pair")?.textContent?.trim(),
    })),
}));

// 3. Bags.fm token data (if pre-graduation Solana token)
await page.goto(`https://bags.fm/token/${tokenAddress}`);
const bagsData = await page.evaluate(() => ({
  status: document.querySelector(".token-status")?.textContent,
  holders: document.querySelector(".holder-count")?.textContent,
  graduated: document.body.textContent.includes("graduated"),
  metadata: document.querySelector(".token-metadata")?.textContent,
}));

console.log(
  JSON.stringify({
    dextools: dextoolsData,
    exchanges: exchangeData,
    bags: bagsData,
  }),
);
```

**THIS IS THE KILLER FEATURE:** DexTools has NO free API. The ONLY way to get circulating MCap, DEXTscore, and holder count is via browser scraping. dev-browser makes this fast and scriptable. This single script solves the FDV gap problem that inflated our entire pipeline.

---

## DISCOVERY SOURCES — BROWSER-ENHANCED

### Source A: Bags.fm (168K tokens, Source #21)

**Current:** bags-scanner.js with REST endpoints, mostly pre-graduation tokens
**Enhancement:**

```javascript
// dev-browser: Bags.fm trending + graduated tokens
const page = await browser.getPage("bags-discovery");
await page.goto("https://bags.fm/trending");
const trending = await page.evaluate(() => ({
  tokens: Array.from(document.querySelectorAll(".token-card")).map((card) => ({
    name: card.querySelector(".token-name")?.textContent,
    ticker: card.querySelector(".token-ticker")?.textContent,
    mcap: card.querySelector(".mcap")?.textContent,
    status: card.querySelector(".status")?.textContent, // graduated vs pre-grad
    twitter: card.querySelector('a[href*="twitter"]')?.href,
    website: card.querySelector('a[href*="http"]')?.href,
  })),
}));
// Filter for GRADUATED tokens only — those have mainstream DEX pairs
const graduated = trending.tokens.filter((t) =>
  t.status?.includes("graduated"),
);
```

**Value:** Bags.fm as EARLY WARNING. Track pre-graduation projects with real teams. When they graduate to mainstream DEXes, Buzz scores them FIRST. Timing advantage.

### Source B: Colosseum Copilot (5,400+ projects, Source #29)

**Current:** Copilot API for hackathon project search
**Enhancement:**

```javascript
// dev-browser: Colosseum project deep dive
const page = await browser.getPage("colosseum-research");
await page.goto(`https://colosseum.org/project/${projectId}`);
const projectData = await page.evaluate(() => ({
  name: document.querySelector(".project-name")?.textContent,
  description: document.querySelector(".project-desc")?.textContent,
  team: Array.from(document.querySelectorAll(".team-member")).map((m) => ({
    name: m.querySelector(".name")?.textContent,
    role: m.querySelector(".role")?.textContent,
    twitter: m.querySelector('a[href*="twitter"]')?.href,
    github: m.querySelector('a[href*="github"]')?.href,
  })),
  hasToken: !!document.querySelector(".token-address"),
  tokenAddress: document.querySelector(".token-address")?.textContent,
  hackathonResult: document.querySelector(".result")?.textContent,
  demoUrl: document.querySelector('a[href*="demo"]')?.href,
}));
```

**Value:** Hackathon winners who launched tokens post-hackathon = best BD Sweet Spot candidates. Real teams, real products, verified by hackathon judges. dev-browser extracts team contacts, token address, and demo URLs in one script.

### Source C: CoinGecko Recently Added (quality filter)

```javascript
// dev-browser: CoinGecko recently added tokens in sweet spot range
const page = await browser.getPage("cg-discovery");
await page.goto("https://www.coingecko.com/en/new-cryptocurrencies");
const newTokens = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("table tbody tr")).map((row) => ({
    name: row.querySelector(".coin-name")?.textContent?.trim(),
    ticker: row.querySelector(".coin-symbol")?.textContent?.trim(),
    price: row.querySelector(".price")?.textContent?.trim(),
    mcap: row.querySelector(".market-cap")?.textContent?.trim(),
    volume: row.querySelector(".volume")?.textContent?.trim(),
    chain: row.querySelector(".chain")?.textContent?.trim(),
    addedDate: row.querySelector(".date-added")?.textContent?.trim(),
  }));
});
// Filter: $1M-$50M MCap, added in last 30 days
```

### Source D: DexScreener Boosted Tokens (projects spending money)

```javascript
// dev-browser: Tokens with active boosts = teams with budget
const page = await browser.getPage("dex-boosts");
await page.goto("https://dexscreener.com/boosts");
const boosted = await page.evaluate(() => {
  return Array.from(document.querySelectorAll(".boost-card")).map((card) => ({
    token: card.querySelector(".token-name")?.textContent,
    chain: card.querySelector(".chain")?.textContent,
    boostType: card.querySelector(".boost-type")?.textContent,
    impressions: card.querySelector(".impressions")?.textContent,
    pair: card.querySelector("a")?.href,
  }));
});
// Projects spending on boosts = projects that would pay for listings
```

---

## THE COMPLETE RECONFIGURED WORKFLOW

### Phase 0: DISCOVERY (NEW — browser-powered)

**Tool:** dev-browser (batch scripts)
**Sources:** Bags.fm graduated, Colosseum winners, CoinGecko recently added, DexScreener boosted
**Output:** List of candidate tokens with contract addresses and chain IDs
**Frequency:** Daily cron at 06:00 UTC

### Phase 1: DUAL-SOURCE VERIFICATION

**Tool:** DexScreener API (fast, structured) + dev-browser for DexTools (no API available)
**Enhancement:** dev-browser extracts DexTools circulating MCap, DEXTscore, holder count
**Output:** Verified market data with real circulating supply (not FDV as MCap)
**This alone fixes the inflation problem that corrupted the entire pipeline**

### Phase 2: SECURITY DEEP DIVE

**Tool:** DexScreener API (summary scores) + dev-browser for Token Sniffer details + Go+ details
**Enhancement:** dev-browser extracts specific security ISSUES (not just scores)
**Visual:** Browser Use CLI screenshots Token Sniffer report for War Room
**Output:** Detailed security assessment with specific flags

### Phase 3: BD READINESS CLASSIFICATION

**Tool:** Scoring engine (code) — uses data from Phases 1-2
**Enhancement:** With real DexTools data + real security details, classification is more accurate
**Output:** BD Sweet Spot / Potential / Too Big / Too Risky / Data Missing

### Phase 4: CONTACT SCREENING (dev-browser PRIMARY)

**Tool:** dev-browser for ALL contact extraction
**This is where dev-browser has the BIGGEST impact:**

```javascript
// Single script: Extract all contact info for a BD candidate
const page = await browser.getPage("contact-screening");

// Visit project website → extract team, socials, email
await page.goto(projectWebsite);
const siteContacts = await page.evaluate(() => ({
  team: /* extract team page */,
  socials: /* extract social links */,
  email: /* extract contact email */,
  github: /* extract GitHub link */
}));

// Visit their Twitter → extract follower count, last post, bio
await page.goto(twitterUrl);
const twitterInfo = await page.evaluate(() => (/* ... */));

// Visit their Telegram → extract member count
await page.goto(telegramUrl);
const tgInfo = await page.evaluate(() => (/* ... */));

// Return complete contact package
console.log(JSON.stringify({
  contacts: siteContacts,
  twitter: twitterInfo,
  telegram: tgInfo,
  outreach_ready: true
}));
```

**Visual:** Browser Use CLI screenshots the project website for War Room evidence
**Output:** Complete contact data template (Phase 4.2 from BD Screening Workflow)

### Phase 5: OUTREACH EXECUTION

**Tool:** War Room commands + Twitter API + Telegram
**Enhancement:** Browser Use CLI for visual proof of sent outreach
**Output:** Outreach logged, follow-up reminders set

---

## TOOL ASSIGNMENT MATRIX

| Phase                | Primary Tool                  | Secondary Tool  | Why                                                          |
| -------------------- | ----------------------------- | --------------- | ------------------------------------------------------------ |
| 0. Discovery         | dev-browser                   | Bags.fm API     | Batch scraping of 4 sources                                  |
| 1. Verification      | DexScreener API + dev-browser | Browser Use CLI | API for fast data, dev-browser for DexTools (no API)         |
| 2. Security          | DexScreener API + dev-browser | Browser Use CLI | API for scores, dev-browser for details, CLI for screenshots |
| 3. Classification    | Scoring engine (code)         | —               | Pure computation on Phase 1-2 data                           |
| 4. Contact Screening | dev-browser                   | Browser Use CLI | dev-browser extracts, CLI screenshots for evidence           |
| 5. Outreach          | War Room + Twitter API        | Browser Use CLI | Commands for sending, CLI for visual proof                   |

---

## WHERE MAX ENRICHMENT HAPPENS

**Ranked by impact on scoring accuracy:**

1. **Phase 1 + dev-browser for DexTools** = HIGHEST IMPACT
   - Fixes the FDV/MCap confusion that inflated the entire pipeline
   - DexTools has NO API — browser is the ONLY way to get circulating supply
   - This single enhancement would have prevented BANANAS31 scoring 95 instead of 55

2. **Phase 4 + dev-browser for Contact Screening** = HIGHEST IMPACT ON REVENUE
   - Currently Phase 4 is entirely manual
   - One dev-browser script extracts complete contact data from 3+ sources
   - Turns a 30-minute manual research task into a 30-second script

3. **Phase 2 + dev-browser for Security Details** = HIGH IMPACT ON QUALITY
   - Extracting specific security ISSUES (not just scores) catches problems earlier
   - The VELO contradiction (TS 0/100 vs DEXTscore 99) could be resolved automatically

4. **Phase 0 + dev-browser for Discovery** = HIGH IMPACT ON PIPELINE QUALITY
   - Bags.fm graduated tokens, Colosseum winners, CoinGecko recently added
   - Higher quality inputs = higher quality pipeline = more BD Sweet Spot candidates

5. **Phase 3 + Browser Use CLI for Visual Evidence** = MEDIUM IMPACT ON BD CLOSE RATE
   - Screenshots in BD proposals prove due diligence was done
   - Projects trust a BD agent that shows its work

---

## IMPLEMENTATION ORDER (post-sprint)

| Priority | Script                                     | Layer Impact          | Effort  |
| -------- | ------------------------------------------ | --------------------- | ------- |
| P0       | DexTools scraper (dev-browser)             | Layer 5 Market        | 2 hours |
| P0       | Contact extraction script (dev-browser)    | Phase 4 Contacts      | 2 hours |
| P1       | Token Sniffer deep audit (dev-browser)     | Layer 1 Safety        | 1 hour  |
| P1       | CoinGecko exchange count (dev-browser)     | Layer 5 Market        | 1 hour  |
| P1       | Discovery batch script (dev-browser)       | Phase 0 Discovery     | 3 hours |
| P2       | Twitter profile analysis (dev-browser)     | Layer 4 Social        | 1 hour  |
| P2       | GitHub activity check (dev-browser)        | Layer 3 Technical     | 1 hour  |
| P2       | Bubble Maps wallet forensics (dev-browser) | Layer 2 Wallet        | 1 hour  |
| P3       | Visual screenshot crons (Browser Use CLI)  | All layers (evidence) | 2 hours |

**Total: ~14 hours. Result: Every layer of the scoring pipeline produces REAL data instead of stubs or binary checks.**

---

## THE COMPETITIVE MOAT

After this reconfiguration, Buzz's scoring pipeline:

- Extracts data from 29 API sources + 10+ browser-scraped sources
- Verifies EVERY data point across multiple tools
- Produces VISUAL EVIDENCE of every assessment
- Automates contact discovery in 30 seconds per token
- Uses BOTH structured extraction AND visual proof

No other agent in the 114K ERC-8004 ecosystem does this.
The chef's mise en place: everything verified, everything in its place, before any outreach begins.

---

_dev-browser = the hands (extract data)_
_Browser Use CLI = the eyes (visual proof)_
_Together = the intelligence edge nobody else has_
_Pro Max unlimited compute = no budget constraint_
_Built by Chef | Powered by Opus | Bismillah_ 🤲
