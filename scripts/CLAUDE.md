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

## gsd-browser (NEW — Rust native)

- 63-command browser automation CLI (Chrome DevTools Protocol)
- Single Rust binary, no Node.js runtime
- JSON output on every command (--json flag)
- Daemon mode: persistent Chrome connection for fast repeated operations
- Path: /home/claude-code/.gsd-browser/bin/gsd-browser
- Config: gsd-browser.toml in project root (headless = true for Hetzner)
- Skill: .claude/skills/gsd-browser/SKILL.md
- CONFIRMED WORKING on Hetzner CPX62 (headless Linux)

## Three Browser Tools — When to Use Each

| Tool            | Speed   | Best For                                                               | Runtime             |
| --------------- | ------- | ---------------------------------------------------------------------- | ------------------- |
| gsd-browser     | Fastest | New extraction, screenshots, network mock, forms, signal feed scanning | Rust native binary  |
| dev-browser     | Fast    | Existing scripts, quick evaluate, persistent pages                     | QuickJS sandbox     |
| Browser Use CLI | Slow    | Visual proof screenshots, authenticated site navigation                | Chrome/146 + Python |

RULE: gsd-browser for new tasks. dev-browser for existing scripts. Browser Use CLI for visual proof only.
