#!/bin/bash
# Wallet Guard Live Demo — Aldo (AION) / Thursday Apr 9 2026
#
# Walks the 3-state frozen interface (ALLOW / WARN / BLOCK) via
# POST /api/v1/guard/evaluate. Requires GUARD_DEMO_MODE=1 on buzz-production
# for realtime War Room mirroring.
#
# Usage:
#   BUZZ_API_ADMIN_KEY=... ./scripts/wallet-guard-demo.sh
#   BASE_URL=https://api.buzzbd.ai BUZZ_API_ADMIN_KEY=... ./scripts/wallet-guard-demo.sh

set -eu

BASE_URL="${BASE_URL:-https://api.buzzbd.ai}"
EVAL="${BASE_URL}/api/v1/guard/evaluate"

if [ -z "${BUZZ_API_ADMIN_KEY:-}" ]; then
  echo "ERROR: BUZZ_API_ADMIN_KEY required" >&2
  exit 1
fi

hdr() {
  echo
  echo "============================================================"
  echo "  $1"
  echo "============================================================"
}

call() {
  local label="$1"
  local payload="$2"
  echo "→ ${label}"
  echo "  payload: ${payload}"
  curl -sS -X POST "$EVAL" \
    -H "Content-Type: application/json" \
    -H "X-API-Key: ${BUZZ_API_ADMIN_KEY}" \
    -d "$payload" \
  | python3 -m json.tool
  echo
  sleep 2
}

hdr "Wallet Guard Demo — 3-State Frozen Interface"
echo "Endpoint: $EVAL"
echo "Expect: every call also mirrors to War Room Telegram (GUARD_DEMO_MODE=1)"

# ------------------------------------------------------------
# Case 1 — ALLOW (self-transfer, benign)
# ------------------------------------------------------------
hdr "Case 1/3 — ALLOW (self-transfer)"
call "self-transfer low-risk" '{
  "action": "transfer",
  "target": "bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze",
  "chain": "bitcoin",
  "buzz_score": 95,
  "sim_consensus": 0.92,
  "context": {
    "kind": "self_transfer",
    "amount_sats": 10000,
    "note": "self transfer — identity match"
  }
}'

# ------------------------------------------------------------
# Case 2 — WARN (first-time destination, requires War Room review)
# ------------------------------------------------------------
hdr "Case 2/3 — WARN (first-time destination)"
call "outreach to unseen destination" '{
  "action": "outreach",
  "target": "team@unknown-project.xyz",
  "chain": "n/a",
  "buzz_score": 72,
  "sim_consensus": 0.58,
  "context": {
    "kind": "first_contact",
    "source": "dexscreener",
    "token_symbol": "DEMO",
    "note": "first_time_destination — cold lead"
  }
}'

# ------------------------------------------------------------
# Case 3 — BLOCK (institutional value transfer, constitutional policy)
# ------------------------------------------------------------
hdr "Case 3/3 — BLOCK (institutional value transfer)"
call "high-value escrow to flagged counterparty" '{
  "action": "escrow",
  "target": "0x0000000000000000000000000000000000dead",
  "chain": "base",
  "buzz_score": 28,
  "sim_consensus": 0.14,
  "context": {
    "kind": "value_transfer",
    "amount_usd": 50000,
    "note": "institutional policy pack expected to block"
  }
}'

# ------------------------------------------------------------
# Tail — show last 3 receipts persisted
# ------------------------------------------------------------
hdr "Persistence Check — last 3 receipts"
curl -sS "${BASE_URL}/api/v1/guard/receipts?limit=3" \
  -H "X-API-Key: ${BUZZ_API_ADMIN_KEY}" \
  | python3 -m json.tool

hdr "Aggregate Stats"
curl -sS "${BASE_URL}/api/v1/guard/stats" \
  -H "X-API-Key: ${BUZZ_API_ADMIN_KEY}" \
  | python3 -m json.tool

echo
echo "Demo complete. Schema frozen per .claude agreement Apr 5 2026."
