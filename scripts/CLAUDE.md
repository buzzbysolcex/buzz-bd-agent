# Browser Scripts (dev-browser)

## db-geckoterminal-scraper.js
- Replaces DexTools (blocked by Cloudflare from datacenter IPs)
- Extracts: circulating MCap, FDV, volume, pool data, gt_score
- FDV gap calculation built in
- Uses GeckoTerminal API (no Cloudflare blocking)
- CONFIRMED WORKING — tested with PEPE

## db-contact-screener.js
- Automates BD Phase 4 contact extraction
- Input: project website URL + Twitter handle
- Extracts: team page, social links, email, follower count, bio
- Output: Phase 4.2 contact template JSON
- 10-second runs (was 30-min manual)
- CONFIRMED WORKING — tested with PEPE (759K followers extracted)

## Both scripts use dev-browser
- QuickJS WASM sandbox (no host filesystem/network access)
- Persistent named pages (survive between runs)
- Path: /home/claude-code/.local/bin/dev-browser
