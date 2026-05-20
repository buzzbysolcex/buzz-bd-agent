# Lane 4 — Phase 0A: BitcoinTalk Corpus Collection Plan

> Date: 2026-05-21 (filed per Vision 2027 directive — Lane 4 Phase 0 "start NOW, free, compounds all lanes")
> Status: PLAN ONLY — no scraping initiated. Operator greenlight required before execution.
> Companion to: `brain/Research-BTC-Recovery-Intelligence.md` (feasibility filed 2026-05-21)

---

## TL;DR

Phase 0A's goal is to build the cypherpunk-culture corpus that informs:

- **Lane 4** — era-specific password candidate generation
- **Lane 1** — developer mindset modeling (how early DeFi devs think → how they write access control)
- **Lane 3** — content (era stories for Moltbook m/crypto and Twitter)

The corpus must be collected ethically (public forum posts), efficiently (target depth, not breadth), and reproducibly (data + scripts + provenance tracked).

**Concrete first deliverable:** ~10K-50K extracted forum posts indexed by era + author + topic, queryable by LLM prompt augmentation. Target completion: 2 weeks at low-effort cadence.

---

## 0. Sources

### 0.1 Primary corpus targets

| Source                                  | Era covered         | URL pattern                                          | Format        | Notes                                          |
| --------------------------------------- | ------------------- | ---------------------------------------------------- | ------------- | ---------------------------------------------- |
| **BitcoinTalk forum**                   | 2009-2015+          | `bitcointalk.org/index.php?topic=<id>`               | HTML threaded | THE primary cypherpunk + early-Bitcoin archive |
| **bitcointalk.org/forum**               | indexed             | `bitcointalk.org/index.php?board=<id>`               | HTML lists    | Use board IDs for topic enumeration            |
| **Internet Archive Wayback**            | 2009-2015 snapshots | `web.archive.org/web/<date>/bitcointalk.org/<topic>` | HTML          | Useful for posts since edited/deleted          |
| **MetzDowd cryptography mailing list**  | 1992-2012           | archive at `metzdowd.com/pipermail/cryptography/`    | flat text     | Where Satoshi originally posted                |
| **Cypherpunks mailing list archive**    | 1992-2001           | `cypherpunks.venona.com`                             | flat text     | Tim May, Hal Finney, etc.                      |
| **Bitcointalk pre-2011 archive (rare)** | 2009-2010           | mirror at `bitcointalk-archive.com` (partial)        | varies        | Pre-major-rebrand period                       |

### 0.2 What to extract per post

| Field                                        | Why                                            | Lane                                        |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| Username                                     | identifies pseudonyms, cultural patterns       | Lane 1 + 4                                  |
| Post date (UTC)                              | era classification                             | Lane 4 (era tagging)                        |
| Subforum / topic                             | filters for relevance (tech vs noobs)          | Lane 4 (focus)                              |
| Signature block                              | quote/manifesto preference reveals personality | Lane 4 (passphrase candidates)              |
| Linked addresses (BTC)                       | on-chain ID tying user → address               | Lane 4 (chain intel) + Lane 1 (BD lead gen) |
| Linked URLs (GitHub, blogs)                  | technical sophistication                       | Lane 1 (BD lead gen)                        |
| Language code (English/Russian/Chinese/etc.) | linguistic prior                               | Lane 4 (language-specific candidates)       |
| Body text (limited excerpt)                  | vocabulary modeling for LLM training           | Lane 4 (per-era language model)             |

**EXCLUDE** personally identifiable contact info beyond the public forum profile; this is public archive scraping, not OSINT.

### 0.3 Ethical guardrails

- **Public forum only** — bitcointalk.org allows public read; no auth bypass
- **No PII enrichment** — don't cross-reference forum username with real-name data brokers
- **No private message scraping** — forum PMs are not in scope
- **Rate-limited polite scraping** — 1 req/2sec max, identify as research agent in User-Agent
- **No spam/bot accounts** — filter by minimum-post-count + minimum-account-age
- **Robots.txt respected** — currently bitcointalk allows /index.php access with rate limit
- **No redistribution of corpus** — internal Buzz use only, no public dataset publication

---

## 1. Implementation plan (4 sub-phases)

### Phase 0A.1 — Inventory + sampling (Day 1-2, ~2hr work)

Goal: confirm scraping is feasible + estimate corpus size.

Tasks:

1. WebFetch `bitcointalk.org/robots.txt` and `bitcointalk.org/index.php?action=help` — confirm scraping ToS
2. Pull a sample 100-thread index from "Bitcoin Discussion" subforum
3. Sample 100 random topics, extract first post + last post
4. Measure: avg post length, language distribution, username conventions
5. Estimate full-archive size

Output: `data/lane4/corpus/sample-bitcointalk-100.json`

### Phase 0A.2 — Era-tagged topic crawler (Day 3-5, ~5hr work)

Goal: build a respectful scraper that enumerates topics by era + extracts post metadata.

Tasks:

1. Script (Python/Node): `scripts/lane4/btc-corpus-scraper.py`
2. Input: subforum ID + date range
3. Output: JSONL per topic, one JSON object per post: `{user, date_utc, language, body_excerpt, signature, linked_urls, linked_btc_addrs}`
4. Respect rate limit (1 req/2sec, configurable)
5. Skip private/deleted threads
6. Resume support (checkpoint last_topic_id)

Output: `scripts/lane4/btc-corpus-scraper.py` (+ docs)

### Phase 0A.3 — Targeted era extraction (Day 6-10, scraper runs background)

Goal: extract bounded corpus per era.

| Era                       | Subforum focus                   | Target posts  | Reason                                    |
| ------------------------- | -------------------------------- | ------------- | ----------------------------------------- |
| 2009-2010 (genesis)       | Bitcoin Discussion (early)       | ~2,000 posts  | Small population, dense signal            |
| 2011-2012 (early adopter) | Speculation, Mining, Development | ~10,000 posts | Cypherpunk peak, password culture forming |
| 2013-2014 (growth)        | Altcoin Discussion, Trading      | ~15,000 posts | Mining boom, Asian wave                   |
| 2015 (mainstream entry)   | Newbies, Beginners               | ~5,000 posts  | Retail vocabulary shift                   |

Total target: ~32K posts. Fits in <500MB JSONL + adjustable.

Output: `data/lane4/corpus/btc-corpus-<era>.jsonl` (4 files)

### Phase 0A.4 — Aggregation + LLM-ready format (Day 11-14, ~3hr)

Goal: convert raw corpus to LLM-prompt-augmentation format.

Tasks:

1. Per-era summary stats (top vocab, top usernames, language distribution)
2. Quote-extraction utility: pull notable signatures + manifesto-style posts
3. Build era-specific "vocabulary primer" docs for LLM prompt injection
4. Index by `(era, language, topic_category)` for query-time retrieval

Output: `data/lane4/corpus/era-primer-<era>.md` (4 files) + `data/lane4/corpus/corpus-index.json`

---

## 2. Cross-lane value (the directive's whole point)

### 2.1 → Lane 1 (security research)

- **Developer mindset map**: BitcoinTalk users 2011-2013 = developers who became DeFi 2017-2020. Their forum posts about cryptography + security reveal how they think. This maps to predicting which access-control patterns they'll use in code.
- **Worked example**: scan a Solana protocol whose authors were active in BitcoinTalk's "Project Development" subforum 2013-2014. Cross-reference their forum posts about "what makes a good crypto interface" with their actual Anchor account structures. Detect the gap.
- **BD lead generation**: BTC addresses + GitHub URLs scraped from forum profiles → on-chain wallet profiling → identify whales / protocol founders → target list for HSaaS outreach.

### 2.2 → Lane 2 (HSaaS)

- **Founder profiling**: HSaaS pilots benefit from knowing the founder's background. A protocol whose founder posted on BitcoinTalk 2012 has different security priors than one whose founder is a 2024 entrant.
- **Outreach personalization**: "I noticed you were active on BitcoinTalk in the gen-2 era — same crowd that built [reference project]. Curious if your audit thinking still tracks with cypherpunk principles."

### 2.3 → Lane 3 (visibility)

- **Moltbook m/crypto content**: "What 2011 BitcoinTalk culture got right (and wrong) about security" — era stories with corpus excerpts.
- **Twitter narrative**: "Buzz reads BitcoinTalk so you don't have to" — methodology positioning.
- **Cypherpunk legitimacy signal**: showing brand familiarity with the culture builds trust with early-adopter customer segment.

### 2.4 → Lane 4 (recovery)

- **Direct corpus for LLM prompting**: era + culture + linguistic primers feed candidate generation.
- **Pattern validation**: known recovered wallets (from public news) — verify the era/culture patterns match the password style.
- **Username → password style**: BitcoinTalk users often reuse handle prefixes in passwords. Username scraping is the most direct candidate-set primer.

---

## 3. Risks + constraints

### Risk 1 — Scraping ToS / rate limits

**Mitigation:** rate-limit at 1 req/2sec, respect robots.txt, User-Agent identifies as research, halt if blocked.

### Risk 2 — Disk usage

**Current:** 82% on root partition. Corpus target ~500MB (JSONL compressed) → ~1.5% disk usage. Within budget.

**Mitigation:** corpus lives on `/data/buzz/persistent/lane4/corpus/` (separate from `/`) — already mounted. No root-disk impact.

### Risk 3 — Drift into PII-enrichment

**Mitigation:** strict "public forum data only" rule. No cross-reference with HaveIBeenPwned / Spokeo / data brokers. No re-identification.

### Risk 4 — Time-cost vs value

**Mitigation:** time-boxed to 2 weeks low-effort cadence (~10-15hr total). Most work is scraper-running unattended; manual review is ~3-5hr.

### Risk 5 — Operator priority deflection

**Mitigation:** Phase 0A is BACKGROUND — does not interrupt Lane 1 submission queue (Veda RESUBMIT today, Ethena tomorrow, Yearn Gate 2). Scheduled as low-priority overnight cron once scraper is built.

---

## 4. Decision gate

**Operator approval required before Phase 0A.2 (scraper build).** Phase 0A.1 (inventory + sampling) is research-only and within current authority. Will proceed with 0A.1 when next idle window allows.

**Greenlight to ask:**

- [ ] OK to build a polite-rate-limited scraper for bitcointalk.org public posts?
- [ ] OK to store ~500MB corpus on `/data/buzz/persistent/lane4/corpus/`?
- [ ] OK to extract usernames + post bodies (no PII enrichment beyond public profile)?
- [ ] OK to run scraper as overnight cron?

If any answer is NO, Phase 0A halts; alternative is to use ONLY pre-existing public corpora (Internet Archive snapshots, academic datasets) which is slower but zero-active-scraping.

---

## 5. Cross-pollination compounding metric

Phase 0A success criterion = corpus + era primers usable by EVERY lane:

- Lane 1: at least 3 founder profiles successfully cross-referenced (forum post + GitHub + Solidity style)
- Lane 2: at least 2 HSaaS outreach drafts using founder-profile personalization
- Lane 3: at least 1 Moltbook post drafted using corpus excerpts
- Lane 4: at least 1 era-specific candidate generation prompt template tested

If 4-of-4 → corpus is compounding as designed. If <4 → re-scope Phase 0A.4 to better serve the under-served lane.

---

_Lane 4 Phase 0A corpus collection plan filed. Operator greenlight pending. 0A.1 inventory + sampling will proceed in next idle window as research-only._
