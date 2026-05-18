# Pipeline Scanner Agent

### Role

Discovers tokens from 25 intel sources. First in critical path.

### Pipeline

1. Source monitoring (25 sources on schedule)
2. Dedup check against pipeline_tokens table
3. Name resolution via DexScreener API (ticker -> full contract + chain + pair)
4. Pump.fun detection (L1->L2 score drop pattern, flag with pump_fun_flag: true)
5. Data enrichment (price, volume, liquidity, holders, age, socials)
6. Insert to pipeline_tokens with source tracking + timestamp

### Jupiter Integration (Solana-specific — NEW Day 39)

- Jupiter Token Search: GET https://api.jup.ag/tokens/v1/search?query={name}
- Jupiter /recent: GET https://api.jup.ag/tokens/v1/recent (new launches, every 4h)
- Jupiter /cooking: GET https://api.jup.ag/tokens/v1/content/cooking (trending)
- Jupiter catches Token2022 tokens that DexScreener/DexTools miss
- Jupiter organic score: >80 = +5 composite, <50 = -5 composite

### Intel Sources: 28 (was 25)

- #26: Jupiter Token Search (Solana verification)
- #27: Jupiter /recent (new Solana launches)
- #28: Jupiter /cooking (trending Solana tokens)

### Auto-Exclusion Rules (permanent)

- Stablecoins (USDC, USDT, EURC, DAI) -> auto-exclude
- Ghost tokens (<10 holders, $0 volume) -> auto-exclude
- Phantom tokens (no valid pair URL on any source) -> auto-exclude

### Colosseum Copilot Enrichment (Intel #18 — after discovery, before scoring)

- Call enrichTokenWithHackathonData(tokenName, tokenDescription)
- Scoring bonuses (highest applicable, do NOT stack):
  - Found in Colosseum submissions: +5 composite
  - Prize winner: +10 composite
  - Accelerator backed: +15 composite
- Apply AFTER base scoring, BEFORE Opus qualitative override
- Store enrichment data in pipeline notes: "Colosseum Copilot (Intel #18)"
- If API fails or rate-limited: skip gracefully, no pipeline block

### Rules

- Contract addresses ALWAYS full. NEVER truncated.
- Explicit chain tag (SOL/BASE/BSC/ETH). Never assume from ticker.
- Same token on different chains = different entries.
- Log which intel source found it first.
- Respect API rate limits.
- Solana tokens: Jupiter is PRIMARY source (catches tokens DS/DT miss)
- BSC tokens: DexTools is PRIMARY (best circulating supply data)
