#!/usr/bin/env bash
# smoke-x402-malformed.sh
# Per Ogie War Room msg 4510 Part 5 — Almanax Phase 2 smoke test.
# Hits each of the 6 canonical x402 endpoints with malformed X-402-Payment
# headers and asserts HTTP 400 (client-error) rather than 500 (server-error).
#
# Modes:
#   ./smoke-x402-malformed.sh             → test live api.buzzbd.ai
#   ./smoke-x402-malformed.sh --local     → test http://localhost:3000 (in-container)
#   ./smoke-x402-malformed.sh --unit      → node unit-level test via middleware direct
#
# Exit 0 on all pass, 1 on any failure.

set -uo pipefail

BASE="${BASE:-https://api.buzzbd.ai}"
MODE="${1:-live}"
if [ "$MODE" = "--local" ]; then BASE="http://localhost:3000"; fi

# 6 canonical endpoints (method, path)
ENDPOINTS=(
  "GET /api/v1/premium/pipeline"
  "GET /api/v1/premium/score/0x0000000000000000000000000000000000000000"
  "GET /api/v1/premium/sim/0x0000000000000000000000000000000000000000"
  "GET /api/v1/premium/mining"
  "GET /api/v1/shield/scan?token=0x0000000000000000000000000000000000000000&chain=base"
  "POST /api/v1/shield/audit/full"
)

# Malformed payment header variants (each should yield 400 not 500)
MALFORMED=(
  "!!!notbase64!!!"
  "$(printf 'hello' | base64)"
  "$(printf '{"not":"x402"}' | base64)"
  "$(printf 'A%.0s' {1..20000} | base64)"
)

FAILS=0
PASSES=0

if [ "$MODE" = "--unit" ]; then
  # Unit mode: exercise the middleware directly without going through HTTP.
  cd "$(dirname "$0")/.." || exit 1
  node -e '
    const m = require("./api/middleware/x402-paywall");
    const cases = [
      { label: "empty", raw: "" },
      { label: "not string", raw: {} },
      { label: "garbage", raw: "!!!" },
      { label: "valid base64 not JSON", raw: Buffer.from("hello").toString("base64") },
      { label: "JSON no payer", raw: Buffer.from(JSON.stringify({foo: "bar"})).toString("base64") },
      { label: "oversize", raw: Buffer.from("A".repeat(20000)).toString("base64") },
    ];
    let fail = 0;
    for (const c of cases) {
      const r = m.validatePaymentHeader(c.raw);
      const ok = !r.ok && r.reason; // should reject with a reason
      console.log((ok ? "PASS" : "FAIL") + "  " + c.label + " -> " + JSON.stringify(r));
      if (!ok) fail++;
    }
    const good = m.validatePaymentHeader(
      Buffer.from(JSON.stringify({payload: {signer: "0xABC"}, tx_hash: "0xdead"})).toString("base64")
    );
    console.log((good.ok ? "PASS" : "FAIL") + "  valid-with-signer -> ok=" + good.ok);
    if (!good.ok) fail++;
    process.exit(fail === 0 ? 0 : 1);
  '
  exit $?
fi

for ep in "${ENDPOINTS[@]}"; do
  METHOD="${ep%% *}"
  PATH_ONLY="${ep#* }"
  URL="${BASE}${PATH_ONLY}"
  for header in "${MALFORMED[@]}"; do
    # Only log first 30 chars of header for output brevity.
    HDR_SHORT="${header:0:30}..."
    CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X "$METHOD" \
      -H "X-402-Payment: $header" \
      --max-time 20 \
      "$URL")
    # Expected: 400 (malformed). 402 is tolerable (bare payment-required) only when
    # the header is bypassed entirely, not for our malformed-body test cases.
    if [ "$CODE" = "400" ]; then
      echo "PASS  $METHOD $PATH_ONLY  header=$HDR_SHORT -> $CODE"
      PASSES=$((PASSES+1))
    else
      echo "FAIL  $METHOD $PATH_ONLY  header=$HDR_SHORT -> $CODE (want 400)"
      FAILS=$((FAILS+1))
    fi
  done
done

echo
echo "Result: $PASSES pass / $FAILS fail ($(( PASSES + FAILS )) total)"
exit $(( FAILS > 0 ? 1 : 0 ))
