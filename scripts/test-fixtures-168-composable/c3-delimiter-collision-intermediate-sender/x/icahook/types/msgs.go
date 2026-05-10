package types

const SenderPrefix = "intermediate-sender/"

// MsgRecordIntermediateSender carries a channel id + a free-form
// memo string for `OriginalSender`. Neither field is bech32 — the
// vulnerability class is delimiter collision in hash-input
// formatting, distinct from the bech32 KV key class that #165
// detects.
type MsgRecordIntermediateSender struct {
	ChannelId      string
	OriginalSender string
	State          []byte
}

type MsgRecordIntermediateSenderResponse struct{}

// ValidateBasic does no work here — neither field is bech32-shaped
// and there is no canonicalization that would prevent the
// collision in any case (canonicalizing `OriginalSender` as bech32
// doesn't help when `ChannelId` can also contain `/`).
func (m MsgRecordIntermediateSender) ValidateBasic() error {
	return nil
}
