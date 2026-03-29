# API Routes

## Authentication
- ALL routes require apiKeyAuth middleware (X-API-Key header)
- Admin key stored in .env as BUZZ_API_ADMIN_KEY

## Route Groups
- /api/v1/aria/* — ARIA discovery intelligence (5 endpoints)
- /api/v1/simulate-listing — MiroFish simulation (rate limited 5/hour)
- /api/v1/listing-report/:address — Full listing readiness report
- /api/v1/premium/* — x402 paid endpoints (USDC on Base)
- /api/v1/pipeline/* — Token pipeline operations
- /api/v1/score-token — Scoring endpoint
- /agent — Public JSON-LD agent identity (NO auth required)

## Rate Limits
- Simulation: 5/hour
- Premium endpoints: x402 payment required
- Pipeline operations: no rate limit (internal use)

## Danger Zones
- server.js is the main entry point — changes here affect EVERYTHING
- Route registration order matters for middleware
- /agent endpoint is PUBLIC — never include secrets
