# x402 → CDP Facilitator + Bazaar Discovery + GET Stub

**Date written**: 2026-04-21 (for execution 2026-04-22)
**Status**: PLAN ONLY — do not ship tonight
**Owner**: Buzz BD Agent
**Scope**: api/middleware/x402-paywall.js, api/routes/premium.js, api/routes/shield-audit-routes.js, api/routes/shield-routes.js
**Deliverable**: 1 commit, 1 GHA run. All 5 premium endpoints discoverable on Coinbase CDP bazaar + probeable by 402index.io GET crawler.

---

## 1. Context

- x402 paywall middleware currently returns a 402 that is x402 v2 compliant, but the middleware itself does NOT verify payment proofs — it accepts any non-empty `X-PAYMENT` / `payment-signature` header. Comment on line 97-98: "TODO: Verify payment proof via Coinbase CDP facilitator".
- Coinbase CDP now offers a hosted facilitator (`https://api.cdp.coinbase.com/platform/v2/x402`) that does EIP-3009 USDC verification + settlement on Base. Without wiring it, we are accepting unverified "payment" headers — effectively free.
- Coinbase Bazaar (the agent-discoverable service marketplace) crawls facilitator-registered endpoints + reads extra metadata fields from the 402 response. If we send the extended discovery fields, endpoints auto-index.
- 402index.io registration succeeded for pipeline/score/sim/mining (all GET-probeable). It failed for `/shield/audit/full` because the route is POST-only — crawler GET → 404 → reg rejected.

## 2. CDP facilitator wiring

**Env source**: `/data/buzz/persistent/env/.env.cdp` (chmod 600, root:root).
Mounted in container at `/data/env/.env.cdp` via existing `/data/buzz/persistent → /data` volume mount.

**Boot wire-up** (entrypoint.sh, BEFORE node server.js):

```bash
[ -f /data/env/.env.cdp ] && export $(grep -v '^#' /data/env/.env.cdp | xargs) && echo "[boot] ✓ CDP env loaded"
```

**Required env keys** (confirm these exist in the .env.cdp file Ogie placed — read as root):

- `CDP_API_KEY_ID`
- `CDP_API_KEY_SECRET`
- `CDP_FACILITATOR_URL` (default `https://api.cdp.coinbase.com/platform/v2/x402`)

**Middleware changes** (`api/middleware/x402-paywall.js`):

1. Replace the current "accept any non-empty payment header" with a real verification call:

```js
const CDP_FACILITATOR_URL =
  process.env.CDP_FACILITATOR_URL ||
  "https://api.cdp.coinbase.com/platform/v2/x402";
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

async function verifyPaymentWithCDP(paymentHeader, paymentRequirements) {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
    // fallback: current permissive behavior + WARN log (dev/preview only)
    console.warn("[x402] CDP creds missing — accepting unverified payment");
    return { isValid: true, verified: false };
  }
  const res = await fetch(`${CDP_FACILITATOR_URL}/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: cdpJwt(), // EIP-3009 JWT — use @coinbase/cdp-sdk or hand-rolled
    },
    body: JSON.stringify({
      paymentPayload: paymentHeader,
      paymentRequirements,
    }),
  });
  if (!res.ok) return { isValid: false, error: `cdp_${res.status}` };
  const body = await res.json();
  return { isValid: body.isValid === true, verified: true, ...body };
}

// After successful verify, optionally call /settle for immediate on-chain settlement.
// EIP-3009 transferWithAuthorization semantics — CDP handles gas + submission.
```

2. Middleware body becomes async. Express v4 handles async middleware only if errors are forwarded, so:

```js
return async (req, res, next) => {
  try {
    // admin/localhost bypasses unchanged
    if (paymentHeader) {
      const verification = await verifyPaymentWithCDP(paymentHeader, paymentRequirements);
      if (!verification.isValid) {
        return res.status(402).json({ ...paymentRequired, error: `payment_invalid:${verification.error || "unknown"}` });
      }
      // record w/ verified flag
      recordPayment({ ..., verified: verification.verified });
      return next();
    }
    // ... 402 response unchanged
  } catch (err) {
    console.error("[x402] verify threw:", err);
    return res.status(503).json({ error: "payment_verification_unavailable" });
  }
};
```

3. `x402_payments` schema may need a `verified INTEGER DEFAULT 0` column. Check migration list first — if absent, add migration 031-x402-verified.js.

**CDP JWT** — Coinbase uses an ES256 JWT per request. Options:

- `@coinbase/cdp-sdk` (npm) — handles auth headers automatically
- Hand-rolled: `jsonwebtoken` with CDP_API_KEY_SECRET as private key, `{kid: CDP_API_KEY_ID, iss: "cdp", sub: CDP_API_KEY_ID, aud: "cdp_service"}` claims

Prefer the SDK — less to maintain, official support.

## 3. Bazaar discovery extensions

The x402 spec allows arbitrary fields in `accepts[].extra`. Coinbase Bazaar's crawler reads:

- `extra.name` — display name (already sending)
- `extra.provider` — provider name (already sending)
- `extra.category` — taxonomy tag (NEW) — e.g. `"data/crypto"`, `"security/audit"`
- `extra.tags` — array of keywords (NEW) — e.g. `["btc","mining","intel"]`
- `extra.docs` — URL to human docs (NEW) — e.g. `"https://buzzbd.ai/x402/mining"`
- `extra.sampleResponse` — truncated JSON snippet or URL (NEW)
- `extra.supportEmail` — contact (NEW)
- `extra.rateLimit` — object `{perMinute, perDay}` (NEW)

Also on the top-level of the 402 response:

- `discoverable: true` flag (some crawlers read this)

**Proposal**: extend the `x402Paywall` options interface:

```js
x402Paywall({
  price,
  resource,
  description,
  category, // NEW
  tags, // NEW (array)
  docsUrl, // NEW
  sampleResponse, // NEW (optional)
});
```

Then update all 5 call sites with sensible metadata:

| Endpoint             | category          | tags                                               |
| -------------------- | ----------------- | -------------------------------------------------- |
| `/premium/pipeline`  | `data/crypto`     | `["scoring","tokens","pipeline","multi-chain"]`    |
| `/premium/score`     | `data/crypto`     | `["scoring","token","verification"]`               |
| `/premium/sim`       | `data/simulation` | `["mirofish","agent","adversarial","list-reject"]` |
| `/premium/mining`    | `data/crypto`     | `["btc","mining","pool","intel","pulse"]`          |
| `/shield/audit/full` | `security/audit`  | `["pashov","evm","deep-audit","paid"]`             |
| `/shield/scan`       | `security/scan`   | `["drain-patterns","threat-matrix","free-tier"]`   |

## 4. GET stub for /shield/audit/full

**Problem**: 402index.io + Bazaar crawl with GET. Shield route is POST-only → 404 → reg rejected.

**Fix** (5-line patch in `api/routes/shield-audit-routes.js`):

```js
// Above the existing POST /full:
router.get("/full", (req, res) => {
  // Always trigger paywall on GET — used by x402 crawlers for discovery.
  // Real audits require POST with body.
  req.tier = "paid";
  return shieldPaidPaywall(req, res, () => {
    // If somehow they paid via GET, point them to the real endpoint.
    res.status(405).json({
      error: "method_not_allowed",
      message: "Paid audits require POST with body.address + body.chain.",
      usage: {
        method: "POST",
        contentType: "application/json",
        body: { tier: "paid", address: "0x...", chain: "base" },
      },
    });
  });
});
```

Alternative: `router.all("/full", ...)` + check `req.method === "GET"` to always return 402. Cleaner, less code duplication. Prefer this.

## 5. 402index.io re-registration (post-deploy)

After GHA green:

```bash
curl -s -X POST "https://402index.io/api/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.buzzbd.ai/api/v1/shield/audit/full","name":"Buzz Shield V4 - Paid Deep Audit","protocol":"x402"}'
```

Expect HTTP 201 + `domain_verified:true`. Log service_id to claim_audit.

## 6. Testing

1. Local (no CDP creds): boot with `CDP_API_KEY_ID=` unset → middleware WARNs + accepts → no regression.
2. Preview (CDP creds set, mock payment header): `verifyPaymentWithCDP` called → `isValid:false` for bogus header → 402 returned with `payment_invalid:*` reason.
3. Production probe: GET /shield/audit/full → expect 402 with extended `accepts[].extra` fields.
4. Integration: use `npx awal x402 details https://api.buzzbd.ai/api/v1/premium/mining` → confirm new `extra.category` + `extra.tags` surface in the awal output.
5. Bazaar discovery: 24-72h after deploy, check `awal bazaar search buzz` + agentic.market — endpoints should auto-index without manual submission.

## 7. Risk + rollback

- **Risk**: CDP /verify becomes a hard dependency in the hot path. If CDP is down, all paid endpoints fail.
  - Mitigation: 503 + retry-after header, don't serve free. Ogie gets PULSE alert.
  - Fallback flag: `X402_VERIFICATION_MODE=cdp|permissive|off` — default `cdp` in prod, `permissive` in dev.
- **Risk**: CDP creds leak via logs.
  - Mitigation: never log the JWT, never log the raw SDK response (contains nothing sensitive, but belt-and-suspenders).
- **Risk**: @coinbase/cdp-sdk is a new dependency — supply chain.
  - Mitigation: pin exact version, add to security-rotation audit list.
- **Rollback**: single commit revert. No migration changes if we skip the `verified` column; if we add it, the column is nullable + backwards-compatible.

## 8. Out of scope for this commit

- Coinbase Bazaar seller registration (browser-gated CDP auth on Mac — Ogie action).
- x402 protocol v3 migration (not released yet as of 2026-04-21).
- Per-tier pricing (pro vs enterprise) on paid shield — current design has a single $0.50 price.
- x402 refunds / dispute handling.

## 9. Order of operations (tomorrow's checklist)

1. [ ] `cat /data/buzz/persistent/env/.env.cdp` (as root) — confirm 3 keys present
2. [ ] Add `[ -f /data/env/.env.cdp ] && export …` to entrypoint.sh
3. [ ] `npm install @coinbase/cdp-sdk` (or pick hand-roll path — decide at start)
4. [ ] Edit `api/middleware/x402-paywall.js` — add verifyPaymentWithCDP, make middleware async, extend options
5. [ ] Edit `api/routes/premium.js` — add category/tags to all 4 x402Paywall calls
6. [ ] Edit `api/routes/shield-routes.js` — add category/tags to shield scan paywall
7. [ ] Edit `api/routes/shield-audit-routes.js` — add category/tags + router.all("/full", …) GET stub
8. [ ] (Optional) Migration 031-x402-verified.js — `ALTER TABLE x402_payments ADD COLUMN verified INTEGER DEFAULT 0`
9. [ ] Local smoke: start container, probe each endpoint with GET + POST
10. [ ] Commit + push + GHA watch
11. [ ] Post-deploy: curl POST /api/v1/register on 402index for /shield/audit/full
12. [ ] Write claim_audit rows for all 5 endpoint metadata updates + shield reg
13. [ ] War Room report with 5 endpoint URLs + bazaar-ready confirmation

Estimated wall-clock: 90 min for coding, 30 min for testing, 15 min for deploy + reg = 2h15m.
