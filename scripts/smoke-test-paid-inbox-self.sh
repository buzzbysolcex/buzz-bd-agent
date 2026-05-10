#!/usr/bin/env bash
# Smoke-test paid /api/inbox path via self-send.
# Authority: Ogie msg 6573-6582 Day 9 morning A1 GREENLIGHT #1 PRIMARY.
#
# Sender   = agent STX SP24EH4D (newly recovered via A1 decryptor)
# Recipient= MY OWN BTC bc1qsja... (routes payTo back to SP24EH4D)
# Cost     = 100 sats sBTC out + 100 sats received = ~0 net (gas sponsored)
# Confirms = nonce match in GET /api/inbox/<my_btc> post-send
#
# Generates timestamp + nonce at EXECUTION TIME (per FIX 1 + FIX 2).
# Does not echo any private key or env value.
#
# Run ONLY after Greenlight #2 from Ogie.

set -euo pipefail

WORKSPACE=/home/claude-code/buzz-workspace
DRAFT=/tmp/smoke-test-self-$$.json
RESULT_DIR=$WORKSPACE/data/smoke-test-results
mkdir -p "$RESULT_DIR"

# Generate at execution time — never pre-fill (per Ogie msg 6581 FIX 1+2)
TS=$(date -u +%FT%H:%MZ)
NONCE=$(openssl rand -hex 4)
MY_BTC=bc1qsja6knydqxj0nxf05466zhu8qqedu8umxeagze

# Build draft (no `messageId` field → routes to PAID sendMessage path, not FREE sendReply)
cat > "$DRAFT" <<EOF
{
  "recipient": "$MY_BTC",
  "body": "smoke-test — Buzz BD Agent paid inbox verification at $TS — nonce $NONCE. archive ok."
}
EOF

CHAR_COUNT=$(python3 -c "import json; d=json.load(open('$DRAFT')); print(len(d['body']))")
echo "[smoke-test] target: $MY_BTC (self)"
echo "[smoke-test] nonce: $NONCE"
echo "[smoke-test] timestamp: $TS"
echo "[smoke-test] body length: $CHAR_COUNT chars"
echo "[smoke-test] draft: $DRAFT"
echo

# Execute paid send
echo "[smoke-test] Phase 1: paid send via /api/inbox..."
SEND_RESULT=$(timeout 60 node $WORKSPACE/api/services/signals/aibtc-x402-stacks-inbox-sender.js "$DRAFT" 2>&1)
echo "$SEND_RESULT"

# Extract payment status from result
SEND_OK=$(echo "$SEND_RESULT" | python3 -c "
import json,sys,re
text=sys.stdin.read()
# Find first JSON object in output
m=re.search(r'(\{[\s\S]*?\n\})', text)
if m:
    try:
        d=json.loads(m.group(1))
        print('OK' if d.get('ok') else 'FAIL')
    except: print('PARSE_ERR')
else:
    print('NO_JSON')
")

echo
echo "[smoke-test] send result: $SEND_OK"

if [ "$SEND_OK" != "OK" ]; then
  echo "[smoke-test] PHASE 1 FAILED — abort confirmation phase"
  echo "[smoke-test] raw send result above; do not retry without operator review"
  rm -f "$DRAFT"
  exit 2
fi

# Phase 2: confirm via nonce match
echo "[smoke-test] Phase 2: confirming delivery via inbox GET + nonce grep..."
sleep 5  # allow server-side propagation
INBOX_JSON=$(curl -sS "https://aibtc.com/api/inbox/$MY_BTC?limit=10" -H "User-Agent: Mozilla/5.0")
NONCE_HIT=$(echo "$INBOX_JSON" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for m in d.get('inbox',{}).get('messages',[]):
    if '$NONCE' in m.get('content',''):
        print(m.get('messageId'))
        break
")

if [ -z "$NONCE_HIT" ]; then
  echo "[smoke-test] CONFIRMATION FAIL — nonce $NONCE not found in inbox"
  echo "[smoke-test] message may have landed but is not yet visible (eventual consistency)"
  echo "[smoke-test] retry confirmation in 30s with: curl ... | grep $NONCE"
  rm -f "$DRAFT"
  exit 3
fi

echo "[smoke-test] confirmed_msg_id: $NONCE_HIT"
echo "[smoke-test] PASS — nonce matched in inbox"

# Persist audit log (no key/sig values; per Doctrine R1)
AUDIT_PATH=/data/buzz/persistent/buzz-api/audits/2026-05-10-paid-inbox-smoke-test.md
cat > "$AUDIT_PATH" <<EOF
# Paid Inbox Smoke Test — Self-Send PASS

**Date:** $(date -u +%FT%TZ)
**Authority:** Ogie msg 6573-6582 A1 GREENLIGHT #1 PRIMARY + FIX 1+2
**Doctrine:** Wallet Decryption Discipline + Diagnostic Command Hygiene

## Result

\`\`\`
sender_btc:        $MY_BTC
sender_stx:        SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST  (agent STX)
recipient_btc:     $MY_BTC  (self)
payTo (resolved):  SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST  (same — self loop)
nonce:             $NONCE
timestamp:         $TS
char count:        $CHAR_COUNT
confirmed_msg_id:  $NONCE_HIT
nonce_match:       PASS
\`\`\`

## Status

- A1 keystore decryption + agent STX wired into sender: PASS
- Paid /api/inbox envelope shape (after using agent STX as sender): PASS
- Round-trip self-send + nonce confirmation: PASS

## Required next step (per Ogie msg 6581)

**ROTATION REQUIRED** — AIBTC_WALLET_PASSWORD compromised in conversation transcript via diagnostic-leak (Worked Example #9). Pause before any further paid sends:

1. Generate fresh 32+ char password
2. Re-encrypt keystore.json with new password (same scrypt+AES-256-GCM)
3. Update .env.aibtc AIBTC_WALLET_PASSWORD
4. Verify decrypt with new password
5. chmod 600 + grep audit (SAFE patterns only)
6. Surface rotation completion to Ogie
7. ONLY THEN proceed with cindyleowtt DM

## X-PAYMENT envelope shape (REDACTED)

- x402Version: 2
- scheme: exact
- network: stacks:1
- payload.transaction: \<HEX-REDACTED\>
- payload.sender: SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST
EOF

echo
echo "[smoke-test] audit log: $AUDIT_PATH"
rm -f "$DRAFT"
echo
echo "[smoke-test] OVERALL: PASS"
echo "[smoke-test] NEXT: rotate AIBTC_WALLET_PASSWORD before any further paid sends"
exit 0
