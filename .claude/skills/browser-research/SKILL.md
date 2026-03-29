# Browser Research Skill

## Two Tools, Two Purposes
- dev-browser = EXTRACTION (structured JSON, scriptable, persistent pages, fast)
- Browser Use CLI = VERIFICATION (screenshots, visual proof for War Room/Ogie)

## dev-browser Usage
```bash
dev-browser --headless <<'SCRIPT'
const page = await browser.getPage("research");
await page.goto("https://example.com");
const data = await page.evaluate(() => ({
  title: document.title
}));
console.log(JSON.stringify(data));
SCRIPT
```

## Key Capabilities
- Named persistent pages: browser.getPage("name") survives between runs
- page.snapshotForAI(): semantic DOM snapshot (better than innerHTML)
- page.evaluate(): run JS in browser context, return structured data
- QuickJS sandbox: no require(), no fetch(), no fs access

## Where Each Tool Is Used
| Layer | dev-browser | Browser Use CLI |
|-------|-------------|----------------|
| Safety (L1) | Token Sniffer details | Screenshot for evidence |
| Wallet (L2) | Deployer forensics, Bubble Maps | Bubble Map visual |
| Technical (L3) | GitHub activity, docs check | — |
| Social (L4) | Twitter followers, Telegram members | Profile screenshot |
| Market (L5) | GeckoTerminal data, exchange count | DexScreener visual |
| Contact (P4) | Full contact extraction (10 sec) | Project website screenshot |
