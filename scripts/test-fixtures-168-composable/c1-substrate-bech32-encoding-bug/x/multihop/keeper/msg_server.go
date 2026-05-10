package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c1/x/multihop/types"
)

type msgServer struct {
	Keeper
}

// AddRoute msg_server passes through `msg.RawAccountId` ([]byte) and
// `msg.HopChain` (string) directly to the keeper. There is NO bech32
// pipeline here at all — the bug is encoding, not canonicalization.
func (k msgServer) AddRoute(
	ctx context.Context,
	msg *types.MsgAddRoute,
) (*types.MsgAddRouteResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if err := k.Keeper.AddRoute(sdkCtx, msg.RawAccountId, msg.HopChain); err != nil {
		return nil, err
	}
	return &types.MsgAddRouteResponse{}, nil
}
