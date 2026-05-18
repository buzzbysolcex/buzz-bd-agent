# Browser Research Skill

## Three Tools, Three Purposes

- gsd-browser = EXTRACTION + AUTOMATION (63 commands, Rust native, fastest, JSON output)
- dev-browser = LEGACY SCRIPTS (QuickJS sandbox, persistent pages, existing scripts)
- Browser Use CLI = VISUAL PROOF (Chrome/146, screenshots for War Room/Ogie)

RULE: gsd-browser for new tasks. dev-browser for existing scripts. Browser Use CLI for visual proof.

## gsd-browser Usage (NEW — preferred for new tasks)

```bash
# Start daemon for fast repeated commands
gsd-browser daemon start

# Declarative extraction (replaces page.evaluate scripts)
gsd-browser navigate https://example.com --json
gsd-browser extract --schema '{
  "title": {"_selector": "h1"},
  "price": {"_selector": ".price"}
}' --json

# Deterministic element interaction
gsd-browser snapshot
gsd-browser click-ref @v1:e1
gsd-browser fill-ref @v1:e2 --value "data"

# Network control
gsd-browser block-urls "rate-limited-api.com"
gsd-browser mock-route --url "*/api/*" --body '{}' --status 200

# Cleanup
gsd-browser daemon stop
```

## dev-browser Usage (EXISTING scripts — don't change)

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("research");
await page.goto("https://example.com");
const data = await page.evaluate(() => ({
  title: document.title,
}));
console.log(JSON.stringify(data));
EOF
```

## Key Capabilities

- dev-browser: Named persistent pages, page.snapshotForAI(), page.evaluate(), QuickJS sandbox
- gsd-browser: 63 commands, extract --schema, snapshot refs, network mock, visual-diff, auth vault, daemon mode
- Browser Use CLI: Full Chrome/146, screenshots, visual proof

## Where Each Tool Is Used

| Layer          | gsd-browser (NEW)        | dev-browser (EXISTING)           | Browser Use CLI            |
| -------------- | ------------------------ | -------------------------------- | -------------------------- |
| Safety (L1)    | Token Sniffer extraction | Token Sniffer scripts            | Screenshot for evidence    |
| Wallet (L2)    | —                        | Deployer forensics, Bubble Maps  | Bubble Map visual          |
| Technical (L3) | GitHub extraction        | GitHub activity scripts          | —                          |
| Social (L4)    | —                        | Twitter followers, Telegram      | Profile screenshot         |
| Market (L5)    | GeckoTerminal extraction | GeckoTerminal scripts            | DexScreener visual         |
| Contact (P4)   | — (migrate later)        | Full contact extraction (10 sec) | Project website screenshot |
| Signal Feed    | AIBTC duplicate check    | —                                | —                          |
| Deploy Verify  | visual-diff baseline     | —                                | —                          |
| MiroFish       | Persona web research     | —                                | —                          |
