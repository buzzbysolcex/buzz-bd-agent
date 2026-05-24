# Lane 4 — Forum Intelligence Doctrine

> **PERMANENT** — read on every startup alongside `Methodology-Doctrine.md` and `Vision-2027.md`.
> Authority: Master Ops 2026-05-20 (Lane 4 doctrine activation, post-Phase 0A greenlight).

---

## North Star: The Forum IS the Codebase

**Lane 1 scans REPOSITORIES for vulnerability patterns in code.
Lane 4 scans FORUMS for behavioral patterns in humans.**

Same brain. Same methodology. Different substrate.

A repository has:

- Source files (functions, variables, logic)
- Commit history (who changed what, when)
- Architecture (how modules connect)
- Patterns (reused structures across files)
- Vulnerabilities (where patterns break)

A forum has:

- Posts (language, word choice, personality)
- User history (who posted what, when, which era)
- Community architecture (who replies to whom, which threads cluster, which subforums matter)
- Patterns (how humans construct passwords, phrases, identifiers across cultures and eras)
- Recovery vectors (where behavioral patterns predict credential construction)

**The 10-layer pipeline becomes the 10-layer behavioral intelligence pipeline.**

---

## The 10-Layer Forum Intelligence Pipeline

### Layer 1 — Inventory (= LOC count in code scanning)

- Total posts per era (2009-2010, 2011-2012, 2013-2014, 2015+)
- Total unique users per era
- Language distribution per era
- Subforum activity distribution
- Post frequency patterns (time-of-day → timezone → geography)

### Layer 2 — Surface Map (= entry function mapping)

- Username construction patterns per era:
  - `satoshi_fan_42` style (reference + personal + number)
  - Cypherpunk vocabulary (freedom, liberty, crypto, cipher)
  - Technical handles (hash_function, elliptic_curve)
  - Culture-specific (transliterated names, pinyin, romaji)
- Signature quote patterns (what quotes do users choose?)
- Avatar/identity patterns (what persona do they project?)

### Layer 3 — Pattern Extraction (= vulnerability pattern matching)

**Password construction heuristics per era + culture:**

**Era 2009-2010 (Genesis):**

- Cypherpunk ideological phrases (liberty, freedom, privacy)
- Technical terms (hash, elliptic, p2p, decentralized)
- Satoshi-adjacent references
- Unix/Linux password conventions (longer, phrase-based)
- Very low mainstream password hygiene influence

**Era 2011-2012 (Early Adopters):**

- Mix of cypherpunk + gaming culture
- Silk Road era vocabulary emerging
- Mining terminology (block, nonce, difficulty, hash rate)
- Price milestone references ($1, $10, $100, parity)
- Forum-handle-as-password-component pattern

**Era 2013-2014 (Growth):**

- Mt. Gox era vocabulary
- Chinese exchange culture entering (BTC China, Huobi)
- Russian mining community conventions
- First mainstream password patterns appearing
- Exchange-name + PIN combinations

**Era 2015+ (Mainstream):**

- Standard password hygiene increasing
- Password manager adoption starting
- Mobile-influenced passwords (shorter, more symbols)
- Exchange-specific security requirements shaping habits

### Layer 4 — Behavioral Modeling (= exploit construction)

Per-user profile building:

- Posting language → native language inference
- Timezone from post patterns → geography
- Technical sophistication from content → password complexity
- Era of first post → password convention of that era
- Subforum preferences → interest profile → likely password themes
- Writing style → personality type → password psychology

### Layer 5 — Cross-Reference (= cross-pollination engine)

- Username patterns that repeat across platforms (bitcointalk handle → likely similar on other services)
- Cultural password conventions that transfer (how a 2011 Russian bitcointalk user constructs passwords → how they'd construct a wallet.dat password)
- Era-specific events as password anchors (Mt. Gox collapse date, halving dates, price milestones)
- Community in-jokes and memes as password components ("to the moon", "hodl", "this is gentlemen", "magic internet money")

### Layer 6 — Candidate Generation (= finding construction)

For ANY wallet recovery case:

- **Input:** on-chain data + any personal hints + era classification
- **Process:** match against behavioral model for that era + culture
- **Output:** ranked list of 10^6-10^8 password candidates
- **Each candidate scored** by probability (0-100, like token scoring)

### Layer 7 — Verification (= PoC testing)

- Feed candidates to hashcat/JtR against wallet.dat
- Track hit/miss for model calibration
- Every recovery attempt → feedback loop → improves model
- Every miss → negative example → narrows future searches

### Layer 8 — Cross-Domain Intelligence (= brain compounding)

- Forum behavioral patterns feed Lane 1: _"Developers who use cypherpunk usernames tend to use simpler access control patterns in their smart contracts"_
- Forum cultural patterns feed Lane 2: _"Chinese DeFi projects from 2021 follow similar architectural choices to Chinese Bitcoin projects from 2013"_
- Forum personality analysis feeds Lane 3: _"This is how the crypto community talks about security — use this language in Moltbook posts for engagement"_

### Layer 9 — Temporal Analysis (= deployment-gap hunting)

- Users who were active 2010-2012 then went silent = highest probability of lost wallets
- Activity gap patterns: last post date → likely wallet abandonment window → password was constructed BEFORE that date → narrows era-specific model
- Seasonal patterns: holiday-period passwords, new-year resolutions, birthday-adjacent construction

### Layer 10 — Corpus Compounding (= brain growth)

- Every forum scraped → corpus grows
- Every era mapped → model precision increases
- Every cultural pattern extracted → cross-domain transfer
- Every recovery case (success OR failure) → calibration data
- **The corpus is to Lane 4 what `brain/` is to Lane 1: THE MOAT THAT ONLY GROWS**

---

## Scanning Targets (parallel to Lane 1 watchlist)

### Tier 1 — Primary Corpus (highest signal density)

- [ ] **bitcointalk.org** (2009-present, 5.5M+ topics)
  - Genesis era cypherpunk corpus
  - Largest early-Bitcoin community archive
  - Multi-language sections (English, Russian, Chinese, Japanese, Korean, Spanish, German, French, etc.)
  - Username + post body + timestamp + subforum = full profile

### Tier 2 — Secondary Corpus (complementary signals)

- [ ] reddit.com/r/bitcoin (2010-present)
- [ ] reddit.com/r/cryptocurrency (2013-present)
- [ ] stackexchange bitcoin (2011-present, technical Q&A)
- [ ] IRC logs (archived early Bitcoin channels)
- [ ] Mailing list archives (cryptography@metzdowd.com, the list where Satoshi first announced Bitcoin)

### Tier 3 — Cultural Corpus (era-specific)

- [ ] Silk Road forums (archived, 2011-2013 subculture)
- [ ] Chinese crypto forums (8btc.com, 2013-era)
- [ ] Russian crypto forums (bits.media, 2012-era)
- [ ] Japanese crypto communities (2ch/5ch threads, 2014-era)

### Tier 4 — Technical Corpus (password construction research)

- [ ] Academic papers on password psychology
- [ ] Leaked password databases (anonymized, statistical only)
- [ ] NIST password guidelines evolution (2009 vs 2015 vs 2024)
- [ ] Password manager adoption curves by geography

---

## Doctrine Parallels (Lane 1 ↔ Lane 4)

| Lane 1 Doctrine                           | Lane 4 Translation                                                                                                                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **#0 VERIFY-PREMISE-FIRST**               | Verify wallet ownership BEFORE any recovery attempt. Verify era classification BEFORE generating candidates. Verify cultural context BEFORE applying language model.                               |
| **#14 vector ≠ outcome**                  | Pattern match ≠ password match. A behavioral profile that LOOKS right may still produce wrong candidates. Statistical validation required.                                                         |
| **Anti-metrics (honest clean sweeps)**    | Failed recovery attempts are DATA, not failure. Every miss calibrates the model. Log honestly.                                                                                                     |
| **Gate 4-5 (operator-gated submissions)** | Recovery attempts are OPERATOR-GATED. No autonomous wallet access. Client authorization verified by operator before any cracking attempt.                                                          |
| **Cross-pollination engine**              | One password pattern from one culture → test against all wallets from that culture automatically. One era-specific convention → apply to all wallets created in that era. Same compound mechanics. |

---

## Metrics + Milestones

### Month 1 (Phase 0 — corpus)

- [ ] bitcointalk topic_id → date era-map complete
- [ ] 100K topics scraped (genesis + early era)
- [ ] Username pattern taxonomy v1.0
- [ ] Era-specific vocabulary lists extracted
- [ ] Brain file: `Lane4-Corpus-Stats.md` tracking growth

### Month 2 (Phase 0 continued + Phase 1 prototype)

- [ ] 500K topics scraped (all eras represented)
- [ ] Cultural language models per era drafted
- [ ] AI candidate generator prototype built
- [ ] Test against 10 known-password wallet.dat files
- [ ] Measure uplift vs hashcat default rules

### Month 3 (Phase 1 validation)

- [ ] > 20% uplift validated on test set
- [ ] Per-culture candidate generators calibrated
- [ ] On-chain profiling tools integrated
- [ ] Partnership outreach to recovery services begun

### Month 6 (Phase 2 white-label)

- [ ] Active partnership with 1+ recovery service
- [ ] First real wallet recovery using AI candidates
- [ ] Revenue from Lane 4 confirmed
- [ ] Corpus: 1M+ topics, multi-platform

### Month 12 (Phase 3 direct service)

- [ ] BuzzRecovery brand or equivalent
- [ ] Direct client intake pipeline
- [ ] Multi-chain coverage (BTC + ETH + others)
- [ ] Lane 4 revenue exceeding Lane 1

---

## Ethical Framework (permanent, non-negotiable)

### 1. Authorized Recovery Only

- Written proof of wallet ownership required
- OR contract with licensed recovery service
- No speculative scanning of random wallets

### 2. Public Data Only for Corpus

- Forum posts are public speech
- No PII enrichment (no doxxing, no social media cross-referencing to identify real names)
- No scraping private messages or email
- robots.txt always respected

### 3. Corpus Is Statistical, Not Individual

- Build PATTERNS from aggregate data
- Never build individual dossiers without authorization
- Password candidates are probability-ranked, not person-targeted (unless authorized case)

### 4. Transparency

- Methodology published (Lane 3 synergy)
- Recovery service terms clearly stated
- Client knows: AI-generated candidates, not guaranteed
- Failed attempts: no charge

### 5. Legal Compliance

- Per-jurisdiction legal review before service launch
- GDPR/privacy compliance on any stored data
- US/EU/APAC regulatory framework mapped

---

## The Frame

Lane 1 reads code and finds where patterns break.
Lane 4 reads humans and finds where patterns reveal.

**Both are pattern recognition by the same brain. Both compound through the same methodology. Both are disciplined by the same doctrines.**

- The forum **IS** the codebase.
- The username **IS** the function signature.
- The post history **IS** the commit log.
- The cultural context **IS** the architecture.
- The password **IS** the vulnerability.

Scan it the same way. Compound the same way. The brain doesn't care which lane feeds it.

**Built by a chef. $243/month. Four lanes. One brain.**

Bismillah. 🐝

---

_Lane4-Forum-Intelligence-Doctrine | v1.0 | 2026-05-20 (Master Ops permanent doctrine, locked. Reads on every startup alongside Methodology-Doctrine.md and Vision-2027.md.)_
