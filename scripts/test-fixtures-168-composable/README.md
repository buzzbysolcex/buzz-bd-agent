# #168 Composable XCVM Cross-Pollination Fixtures

Validation corpus for BuzzShield #168 — checks whether the three Composable
XCVM cross-pollination findings (C-1 / C-2 / C-3 from
`/data/buzz/persistent/buzz-api/audits/2026-05-10-mmr-sweep-composable.md`)
expand the existing #165 cosmos-bech32-canon-detector corpus or seed new
detector classes.

Mirrors the directory shape of `test-fixtures-bech32-canon/positive-h4/`:
each fixture is a self-contained `x/<module>/{keeper,types}/*.go` tree
that #165 can walk via `--target <fixture-dir>`.

## Fixture Map

### c1-substrate-bech32-encoding-bug (NEW_DETECTOR_CLASS)

Captures the essence of Composable C-1: `pallet-multihop-xcm-ibc/src/lib.rs:365-378`

- `:619-650` calls `u5::try_from_u8(byte)` on every byte of a raw 32-byte
  Substrate AccountId32. Since `u5::try_from_u8` only accepts byte values 0..=31,
  ~88% of all bytes fail (DoS). Where bytes happen to slip through (~10^-29),
  the bech32 encoder produces output unrelated to the canonical Cosmos address
  derivation pipeline — funds sent to a deterministically wrong address.

The Cosmos-Go analogue here mirrors the SHAPE: a keeper that accepts a raw
`[]byte` Substrate AccountId32 and writes `store.Set(rawAccountId, ...)`
without any bech32 normalization, because the (broken) bech32 conversion was
applied off-chain upstream. `MsgAddRoute.RawAccountId` is a `[]byte` field,
NOT a `string` field, so #165 does not recognize the input shape — and even
if it did, the bug is at the encoding boundary (wrong API call), not at any
storage canonicalization gate. **Expected: #165 emits zero findings.** Pattern
needs its own detector (Substrate-side `u5::try_from_u8` misuse, or Cosmos-Go
keepers writing raw 32-byte AccountId32 payloads as KV keys without any bech32
canonicalization step).

### c2-relayed-remote-address-raw-key (EXPANDS_165_CORPUS)

Captures the essence of Composable C-2: `cvm/lib/core/src/accounts.rs:90-95`

- `:162-180` define `RemoteAddress.address: String` and
  `RelayedRequestPacket { address, account, request }` where both address fields
  are raw UTF-8 strings. The downstream CW gateway compares strings byte-for-byte
  during the recovery-list contains-check — so two valid bech32 encodings of
  the same canonical 20-byte payload (case, padding, Bech32 vs Bech32m variant)
  key separately, allowing the recovery flow to no-op while the caller believes
  recovery has been authorized.

The Cosmos-Go analogue is structurally identical to dYdX H4: a keeper
`SetRecoveryAddress(ctx, owner, recoveryAddr string)` that does
`store.Set([]byte(recoveryAddr), []byte(owner))`. `MsgSetRecoveryAddress`
has a `RecoveryAddress: string` field. `ValidateBasic` canonicalizes
`Owner` only — the S-1 pattern (VB exists but skips the field that flows
into the storage key). **Expected: #165 emits ONE HIGH finding @ confidence
0.78 with `validate_basic_status=exists_but_field_skipped`.** No new detector
needed; corpus enrichment via this fixture extends the regression set.

### c3-delimiter-collision-intermediate-sender (NEW_DETECTOR_CLASS)

Captures the essence of Composable C-3: `cvm/lib/core/src/cosmos.rs:5-17`

- `cvm/lib/core/src/transport/ibc/ics20/hook.rs:39-49`. The Substrate code
  builds `sender_str = format!("{}/{}", channel, original_sender)` and feeds
  it through `addess_hash(SENDER_PREFIX, sender_str.as_bytes())`. The `/`
  delimiter is the only separator — no length-prefix, no escape. Two distinct
  `(channel, sender)` pairs that collide under string concatenation (e.g.,
  `("channel-1", "/foo/bar")` vs `("channel-1/foo", "/bar")`) produce identical
  hash inputs. If `original_sender` arrives from a free-form Memo string,
  attacker-controlled inputs collide with victim-channel intermediate-senders.

The Cosmos-Go analogue uses the same shape: `RecordIntermediateSender(ctx,
channelId, originalSender string, state []byte)` builds
`fmt.Sprintf("%s/%s", channelId, originalSender)`, hashes it via
`sha256.Sum256(...)`, and writes `store.Set(h[:], state)`. **Critical:**
the storage key is the HASH OUTPUT, not raw `[]byte(<string>)`. #165
specifically matches `Set([]byte(<msg-derived-string>), ...)` patterns —
the `sha256.Sum256(...)` wrapper opaques the dataflow from the byte-pattern
matcher. **Expected: #165 emits zero findings.** Pattern needs its own
detector targeting hash-input formatting collisions where `fmt.Sprintf` /
`format!` concatenates user-controlled strings via single-character
delimiters before hashing.

## Running

```
node scripts/test-168-composable-vs-165.js
```

Each fixture is invoked via the test runner; the runner asserts the
expected verdict per C-N (zero findings for C-1/C-3, one HIGH on
RecoveryAddress for C-2). All 8 assertions PASS as of 2026-05-10.

## Verdict Summary

| Fixture | #165 result | Verdict            | Follow-up                                                                     |
| ------- | ----------- | ------------------ | ----------------------------------------------------------------------------- |
| C-1     | 0 findings  | NEW_DETECTOR_CLASS | Spec a Substrate-side u5/raw-AccountId32 detector (P1 #180-class)             |
| C-2     | 1 HIGH      | EXPANDS_165_CORPUS | None — fixture added to regression corpus                                     |
| C-3     | 0 findings  | NEW_DETECTOR_CLASS | Spec a delimiter-collision detector for hash-input formatting (P1 #181-class) |
