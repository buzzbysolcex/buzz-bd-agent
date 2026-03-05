# Buzz Job Verification Receipt (JVR) System

## Description
Universal job receipt system for every Buzz operation. Produces tamper-proof verification receipts with unique codes (AAB-XXXXXX-XXXXX), SHA-256 hashes, and Telegram notifications.

## Trigger
Keywords: receipt, verification, job done, job complete, audit, receipt code, verify receipt

## Usage

### Create a receipt (call at end of every task)
```javascript
const ReceiptManager = require('./buzz-jvr-system');
const receipts = new ReceiptManager();

await receipts.createReceipt({
  category: 'scan',           // scan|safety|wallet|social|score|orchestrate|cron|api|twitter|deploy|system
  session: 'scanner-agent',   // which sub-agent handled it
  status: 'completed',        // completed|failed|partial|skipped
  summary: 'Scanned 80 candidates, 5 boosted tokens found',
  tokenSymbol: 'GORK',
  chain: 'solana',
  duration_ms: 4200,
  sources: ['DexScreener', 'GeckoTerminal', 'AIXBT'],
  details: { candidates: 80, boosted: 5 },
});
```

### Query receipts
```javascript
receipts.queryReceipts({ category: 'scan', limit: 10 });
receipts.getStats();
receipts.verifyReceipt('AAB-140434-21819');
```

## REST API Endpoints
- POST   /api/v1/receipts          — create receipt
- GET    /api/v1/receipts          — query with filters
- GET    /api/v1/receipts/stats    — aggregated stats
- GET    /api/v1/receipts/:code    — single receipt
- GET    /api/v1/receipts/:code/verify — integrity check

## 16 Job Categories
scan, safety, wallet, social, score, orchestrate, outreach, cron, api, deploy, twitter, pipeline, reputation, x402, system, manual

## Storage
`/data/workspace/memory/receipts/` — organized by date, indexed for fast queries
