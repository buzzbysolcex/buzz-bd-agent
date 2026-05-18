# Service Catalog

21 services across 4 categories (scoring, execution, automation, orchestration).
Wired into PULSE engine and autoDream for service discovery and pricing.

## Usage

```js
const {
  SERVICES,
  getService,
  getByCategory,
  getReady,
  getStats,
} = require("./service-registry");
```

## Categories

- **scoring** (8): Token analysis and intelligence services
- **execution** (6): DeFi trade execution via HeyAnon (HEYANON_EXEC gated)
- **automation** (3): Automated triggers and protection
- **orchestration** (4): Multi-step pipelines and monitoring

## Status Flow

`pending` -> `ready` -> `live` | `pre_frontier` (waiting on feature flag) | `with_aldo` (external dependency)
