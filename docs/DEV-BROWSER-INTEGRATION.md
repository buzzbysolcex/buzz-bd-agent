---
name: dev-browser-integration
description: >
  dev-browser integration plan for Buzz BD Agent. Complement-then-migrate strategy
  from Browser Use CLI to dev-browser (QuickJS WASM sandbox, persistent named pages,
  batched scripts). Phase 1: install + test. Phase 2: War Room commands. Phase 3: migrate
  crons. Phase 4: BD research automation. Gives Buzz structured data extraction, persistent
  browser sessions, and multi-step workflows in single scripts. Post-Sprint evaluation item.
license: Internal — SolCex Exchange
---

# dev-browser × Buzz Integration Analysis

> Sprint Day 39 | Mar 28, 2026 | Post-Sprint Evaluation Item
> For: Ogie (CEO, SolCex) | From: Claude Opus (Strategy)

---

## 1. WHY dev-browser

Browser Use CLI (current): Agent sends individual commands (go, click, type) and gets back screenshots/DOM after each one. Each step = 1 tool call + 1 context payload. No persistence between sessions.

dev-browser: Agent writes a script that runs multiple steps in one shot. Browser stays alive between scripts. Named pages persist. Returns structured JSON, not screenshots.

Key stats: ~14% faster, ~39% cheaper per task, ~29 turns vs ~51 turns per task. WASM sandbox (no host filesystem/network access). $0 cost.

---

## 2. INSTALLATION (Phase 1)

```bash
# On Hetzner host
npm install -g dev-browser
dev-browser install  # installs Playwright + Chromium

# Test headless mode
dev-browser --headless <<'EOF'
const page = await browser.getPage("test");
await page.goto("https://buzzbd.ai");
console.log(await page.title());
EOF

# Test CDP connect to existing Chrome/146 on port 9222
dev-browser --connect <<'EOF'
const tabs = await browser.listPages();
console.log(JSON.stringify(tabs, null, 2));
EOF
```

Use `--connect` mode to attach to Chrome/146 on port 9222. Zero additional Chrome memory.

---

## 3. WAR ROOM COMMANDS (Phase 2)

| Command | Function |
|---------|----------|
| `/dbrun <script>` | Execute dev-browser script (headless), return output |
| `/dbconnect <script>` | Execute against existing Chrome/146 session |
| `/dbpage <name> <url>` | Create/navigate a persistent named page |
| `/dbscrape <name>` | Run extraction script on named page |
| `/dblist` | List all persistent pages |

Coexist with existing `/browse`, `/scrape`, `/click`. No breaking changes.

---

## 4. CRON MIGRATION (Phase 3)

Replace cron #29 (DexScreener visual) and #30 (Virtuals daily) with dev-browser scripts:

```javascript
// Cron #29 replacement: DexScreener trending (runs every 4h)
const page = await browser.getPage("dex-trending");
await page.goto("https://dexscreener.com/solana");
await page.waitForTimeout(3000);

const trending = await page.evaluate(() => {
  const rows = document.querySelectorAll('[data-testid="pair-row"]');
  return Array.from(rows).slice(0, 20).map(row => ({
    name: row.querySelector('.pair-name')?.textContent?.trim(),
    price: row.querySelector('.price')?.textContent?.trim(),
    change: row.querySelector('.change-24h')?.textContent?.trim(),
    volume: row.querySelector('.volume')?.textContent?.trim()
  }));
});

console.log(JSON.stringify(trending));
```

Advantages: structured JSON output, persistent page (faster reload), one script vs multiple tool calls, data feeds pipeline directly.

---

## 5. BD RESEARCH AUTOMATION (Phase 4)

```javascript
// BD research: Full token project investigation
const page = await browser.getPage("bd-research");

// Step 1: Check project website
await page.goto(projectUrl);
const siteData = await page.evaluate(() => ({
  hasTeamPage: !!document.querySelector('a[href*="team"]'),
  hasDocs: !!document.querySelector('a[href*="docs"]'),
  hasGitHub: !!document.querySelector('a[href*="github"]'),
  socialLinks: Array.from(document.querySelectorAll('a[href*="twitter"], a[href*="telegram"], a[href*="discord"]'))
    .map(a => a.href)
}));

// Step 2: Check Twitter (same session)
await page.goto(siteData.socialLinks.find(l => l.includes('twitter')) || '');
const twitterData = await page.evaluate(() => ({
  followers: document.querySelector('[data-testid="followers"]')?.textContent,
  lastPost: document.querySelector('time')?.getAttribute('datetime')
}));

// Step 3: Return combined BD intel
console.log(JSON.stringify({ site: siteData, twitter: twitterData }));
```

Three pages, one script, zero screenshots. Structured JSON to bd-proposer.

---

## 6. RESOURCE IMPACT

| Resource | Current | After dev-browser |
|----------|---------|-------------------|
| RAM (16GB) | ~1.2GB Chrome + Docker + Claude Code | +200-400MB (shared if `--connect`) |
| CPU (8 vCPU) | Comfortable | QuickJS = lightweight |
| Disk | ~40GB | +~500MB for Playwright/Chromium |
| Monthly cost | $0 | $0 |

CX43 handles both easily. `--connect` mode = zero additional Chrome memory.

---

## 7. SECURITY

| Concern | Browser Use CLI | dev-browser |
|---------|----------------|-------------|
| Host filesystem | Full access (Python) | NO access (WASM sandbox) |
| Host network | Full access | NO access |
| File writes | Anywhere on host | ~/.dev-browser/tmp/ only |

dev-browser is objectively more secure for autonomous browser tasks.

---

## 8. TIMELINE

| When | Action | Effort |
|------|--------|--------|
| Now (Day 41) | Install + test on Hetzner | 30 min |
| Post-Sprint Week 1 | Test --connect to Chrome/146 | 1 hour |
| Post-Sprint Week 2 | Add /dbrun and /dblist War Room commands | 2-3 hours |
| Post-Sprint Week 3 | Rewrite cron #29 (DexScreener) as dev-browser script | 2 hours |
| Post-Sprint Week 3 | Rewrite cron #30 (Virtuals) as dev-browser script | 1 hour |
| Post-Sprint Week 4 | BD Contact Screening automation (Phase 4) | 3-4 hours |
| Month 2 | Deprecate Browser Use CLI commands | When ready |

Total: ~15 hours over 4-6 weeks.

---

## 9. KEY CAPABILITIES TO RESEARCH

- Persistent named pages: `browser.getPage("name")` survives between script runs
- `page.snapshotForAI()`: accessibility tree snapshots with semantic roles + stable refs (better than DOM scraping)
- Script reuse: write once, call again with different parameters
- `page.evaluate()`: run JS in browser context, return structured data
- Multi-page workflows: navigate multiple sites in single script execution

---

*Complement then migrate. No rushing. No breaking what works.*
*This gives Buzz real hands and eyes — structured data, not screenshots.*
*Built by Opus | For Ogie | Bismillah* 🤲
