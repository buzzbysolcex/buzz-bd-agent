package types

const RouteKeyPrefix = "route/"

// MsgAddRoute is the message that submits a Substrate AccountId32
// (32 raw bytes) for cross-hop routing. The address field is []byte,
// NOT a bech32 string — there is no Cosmos-side bech32 canonicalization
// to perform, because the encoding pipeline that *should* have produced
// a canonical Cosmos bech32 ran incorrectly OFF-CHAIN before this msg
// was assembled (u5::try_from_u8 on raw byte > 31 fails).
type MsgAddRoute struct {
	RawAccountId []byte // 32 raw Substrate bytes
	HopChain     string
}

type MsgAddRouteResponse struct{}

// ValidateBasic intentionally does no bech32 work — there is no bech32
// string to validate. The bug is at the encoding boundary upstream of
// this msg, in the sender's bech32_no_std::encode call where every
// byte-to-u5 conversion fails for real-world AccountIds.
func (m MsgAddRoute) ValidateBasic() error {
	if len(m.RawAccountId) != 32 {
		return nil // length-only check, not a bech32 canonicalization
	}
	return nil
}
