package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const RecoveryKeyPrefix = "recovery/"

// MsgSetRecoveryAddress is the analogue of Composable XCVM's
// SetRecoveryAddress (called via gateway CW contract from CVM
// instructions). Both Owner AND RecoveryAddress are bech32 strings
// supplied by the relayed-request packet.
type MsgSetRecoveryAddress struct {
	Owner           string
	RecoveryAddress string
}

type MsgSetRecoveryAddressResponse struct{}

// ValidateBasic canonicalizes Owner only (mirrors S-1 pattern: VB
// exists but skips the field that flows into the storage key).
// In the original Composable code, neither field is canonicalized
// at packet-decode time; the gateway compares strings raw.
func (m MsgSetRecoveryAddress) ValidateBasic() error {
	if _, err := sdk.AccAddressFromBech32(m.Owner); err != nil {
		return err
	}
	// RecoveryAddress is intentionally not canonicalized — the H4-class
	// pattern. The keeper SetRecoveryAddress writes []byte(RecoveryAddress)
	// directly as KV key.
	return nil
}
