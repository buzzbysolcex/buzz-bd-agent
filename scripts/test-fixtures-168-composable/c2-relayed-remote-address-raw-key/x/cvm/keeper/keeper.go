package keeper

import (
	"cosmossdk.io/store/prefix"
	storetypes "cosmossdk.io/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c2/x/cvm/types"
)

type Keeper struct {
	storeKey storetypes.StoreKey
}

// SetRecoveryAddress is the closest Cosmos-Go analogue of Composable C-2
// (cvm/lib/core/src/accounts.rs:90-95 + 162-180 +
// downstream gateway compare in CW contract).
//
// In the Substrate CVM stack, RemoteAddress.address: String and
// RelayedRequestPacket.address: String are stored AND compared raw —
// no addr_canonicalize / decode-to-payload step. The CW gateway's
// recovery-list contains-check matches strings byte-for-byte, so an
// attacker who can register a recovery address with one valid bech32
// encoding (case, padding, Bech32 vs Bech32m variant) and later submit
// a DropAccount with a DIFFERENT valid encoding of the same canonical
// 20-byte payload evades the recovery-list match — OR conversely
// registers two distinct strings that decode to the same payload,
// each surviving the "uniqueness" check.
//
// Cosmos-Go shape: keeper writes the raw `recoveryAddr` string
// directly into prefix-store under []byte(recoveryAddr) — same H4
// shape as dYdX `RegisterAffiliate`.
func (k Keeper) SetRecoveryAddress(
	ctx sdk.Context,
	owner string,
	recoveryAddr string,
) error {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), []byte(types.RecoveryKeyPrefix))
	// Raw []byte(recoveryAddr) — no sdk.AccAddressFromBech32 anywhere.
	// Bech32 mixed-case / Bech32 vs Bech32m variant collisions both
	// produce distinct keys for the same canonical 20-byte payload.
	store.Set([]byte(recoveryAddr), []byte(owner))
	return nil
}

// DropAccount is the consumer leg — looks up the recovery address by
// raw bytes too. If SetRecoveryAddress stored under one encoding and
// DropAccount looks up under another, the recovery flow no-ops while
// the caller believes recovery has been authorized.
func (k Keeper) DropAccount(
	ctx sdk.Context,
	address string,
) bool {
	store := prefix.NewStore(ctx.KVStore(k.storeKey), []byte(types.RecoveryKeyPrefix))
	return store.Has([]byte(address))
}
