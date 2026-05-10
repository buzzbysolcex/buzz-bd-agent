package keeper

import (
	storetypes "cosmossdk.io/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c1/x/multihop/types"
)

type Keeper struct {
	storeKey storetypes.StoreKey
}

// AddRoute is the closest Cosmos-Go analogue to Composable C-1
// (pallet-multihop-xcm-ibc create_memo / deposit_asset). The original
// Substrate code in Rust does:
//
//	let data: Vec<u5> = address.into_iter()
//	    .map(|byte| u5::try_from_u8(byte).map_err(...))
//	    .collect::<Result<_, _>>()?;
//	bech32_no_std::encode(&name, data, ...)
//
// where `address` is a 32-byte raw Substrate AccountId32 — but
// u5::try_from_u8 only accepts bytes 0..=31, so ~88% of real addresses
// either fail (DoS) or, statistically-never, produce a bech32 string
// with no relation to the canonical Cosmos address derivation pipeline.
//
// In Go-keeper shape: the keeper accepts a pre-converted `bech32Address`
// string built off-chain by the same broken pipeline. The KEY fact
// is that the bech32 conversion is wrong AT THE ENCODING BOUNDARY
// before this keeper is called — there is no `string` field carrying
// the user-supplied address through ValidateBasic on a Cosmos Msg.
// The bug is upstream of any KVStore Set in keeper code.
//
// The keeper's storage write itself uses a `[]byte(rawAccountId)` raw
// 32-byte payload as key (mimicking the Substrate side which doesn't
// route address-bytes through bech32 canonicalization either).
func (k Keeper) AddRoute(
	ctx sdk.Context,
	rawAccountId []byte,
	hopChain string,
) error {
	store := ctx.KVStore(k.storeKey)
	// Raw 32-byte payload as KV key — bypasses any bech32 normalization
	// because the bech32 encoding itself was applied incorrectly upstream
	// (u5::try_from_u8 on raw byte > 31 FAILS).
	store.Set(rawAccountId, []byte(hopChain))
	_ = types.RouteKeyPrefix
	return nil
}

// DepositAsset is the second leg of C-1 — also writes a key derived
// from raw Substrate bytes, this time prefixed and length-tagged.
// Even here, the relevant bug is the encoding-boundary one above;
// this keeper is just a passive sink.
func (k Keeper) DepositAsset(
	ctx sdk.Context,
	rawAddressTo [32]byte,
	chainHop uint8,
) error {
	store := ctx.KVStore(k.storeKey)
	key := append([]byte{chainHop}, rawAddressTo[:]...)
	store.Set(key, []byte("pending"))
	return nil
}
