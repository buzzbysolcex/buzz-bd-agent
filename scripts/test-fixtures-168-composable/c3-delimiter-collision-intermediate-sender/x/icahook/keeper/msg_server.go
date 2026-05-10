package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/example/c3/x/icahook/types"
)

type msgServer struct {
	Keeper
}

// RecordIntermediateSender msg_server passes msg.ChannelId and
// msg.OriginalSender from a relayed memo packet — `OriginalSender`
// is FREE-FORM (memo strings can carry arbitrary content), which
// is what makes the delimiter-collision exploitable.
func (k msgServer) RecordIntermediateSender(
	ctx context.Context,
	msg *types.MsgRecordIntermediateSender,
) (*types.MsgRecordIntermediateSenderResponse, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	if err := k.Keeper.RecordIntermediateSender(sdkCtx, msg.ChannelId, msg.OriginalSender, msg.State); err != nil {
		return nil, err
	}
	return &types.MsgRecordIntermediateSenderResponse{}, nil
}
