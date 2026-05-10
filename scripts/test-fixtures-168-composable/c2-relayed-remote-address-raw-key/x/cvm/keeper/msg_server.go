package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c2/x/cvm/types"
)

type msgServer struct {
	Keeper
}

// SetRecoveryAddress msg_server passes msg.Owner + msg.RecoveryAddress
// straight to the keeper. The relay-style packet `RelayedRequestPacket`
// in the original Composable XCVM has the same shape: { address: String,
// account: String, request: ... } — both address fields are user-supplied
// raw strings, neither canonicalized.
func (k msgServer) SetRecoveryAddress(
	ctx context.Context,
	msg *types.MsgSetRecoveryAddress,
) (*types.MsgSetRecoveryAddressResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if err := k.Keeper.SetRecoveryAddress(sdkCtx, msg.Owner, msg.RecoveryAddress); err != nil {
		return nil, err
	}
	return &types.MsgSetRecoveryAddressResponse{}, nil
}
