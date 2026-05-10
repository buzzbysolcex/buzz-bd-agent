package keeper

import (
	"crypto/sha256"
	"fmt"

	storetypes "cosmossdk.io/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c3/x/icahook/types"
)

type Keeper struct {
	storeKey storetypes.StoreKey
}

// DeriveIntermediateSender is the closest Cosmos-Go analogue of
// Composable C-3 (cvm/lib/core/src/cosmos.rs:5-17 +
// cvm/lib/core/src/transport/ibc/ics20/hook.rs:39-49).
//
// The original Substrate code does:
//
//	let sender_str = format!("{}/{}", channel, original_sender);
//	addess_hash(SENDER_PREFIX, sender_str.as_bytes())
//
// The bug class is delimiter collision: ("channel-1", "/foo/bar") and
// ("channel-1/foo", "/bar") produce identical hash inputs. If
// `original_sender` arrives from a free-form Memo string (not a
// validated bech32 Addr), an attacker can craft inputs that collide
// with a victim channel's intermediate sender.
//
// Critical: the KVStore Set here uses the HASH OUTPUT as key, not
// the raw bech32 string. #165 specifically looks for
// `Set([]byte(<msg-derived-string>), ...)` — it will NOT fire on
// `Set(hash, ...)` because the hash() wrapper hides the dataflow
// from the byte-pattern matcher. The bug is in the input-to-hash
// formatting, not in any storage canonicalization gate.
func (k Keeper) RecordIntermediateSender(
	ctx sdk.Context,
	channelId string,
	originalSender string,
	state []byte,
) error {
	// Vulnerable formatting: "/" delimiter alone, no length-prefix or escape.
	senderStr := fmt.Sprintf("%s/%s", channelId, originalSender)
	h := sha256.Sum256(append([]byte(types.SenderPrefix), []byte(senderStr)...))
	store := ctx.KVStore(k.storeKey)
	// Note: store.Set(h[:], state) — the key is the hash, not a raw
	// bech32 string. #165 cannot trace through sha256.Sum256 to the
	// underlying Sprintf-with-msg-field because the byte-pattern
	// matcher only sees `Set(h[:], ...)` where h is a [32]byte literal
	// from a hash function.
	store.Set(h[:], state)
	return nil
}

// GetIntermediateSender is the symmetric read path. Same hash
// formatting, so same collision class on lookup.
func (k Keeper) GetIntermediateSender(
	ctx sdk.Context,
	channelId string,
	originalSender string,
) []byte {
	senderStr := fmt.Sprintf("%s/%s", channelId, originalSender)
	h := sha256.Sum256(append([]byte(types.SenderPrefix), []byte(senderStr)...))
	store := ctx.KVStore(k.storeKey)
	return store.Get(h[:])
}
