package fixtures

// POSITIVE — models the Zebra GHSA-4m69-67m6-prqp pattern (zebra-state
// service.rs): the block hash is added to the seen/sent set BEFORE contextual
// validation, and the validation-FAILURE path does NOT remove it. A later
// legitimate block carrying the same hash is then rejected as a duplicate.
// MUST FIRE: C166-CACHE-BEFORE-VALIDATE.
func (k Keeper) QueueAndCommitBlock(ctx Context, block Block) error {
	hash := block.Hash()

	// insert into the seen-set BEFORE validation
	k.SetSeenBlock(ctx, hash, true)

	if err := k.VerifyBlockContextual(ctx, block); err != nil {
		// BUG: the error path does not remove the seen-set entry
		return err
	}

	k.commit(ctx, block)
	return nil
}

// POSITIVE — IBC packet-receipt set BEFORE proof verification, no removal on
// the verify-failure branch. MUST FIRE: C166-CACHE-BEFORE-VALIDATE.
func (k Keeper) RecvPacketBuggy(ctx Context, packet Packet, proof []byte) error {
	k.SetPacketReceipt(ctx, packet.DestPort, packet.DestChannel, packet.Sequence)

	if err := k.connectionKeeper.VerifyPacketCommitment(ctx, packet, proof); err != nil {
		return err // BUG: receipt not removed
	}
	return nil
}

// POSITIVE — map-index nonce insert before a guard-return, no delete.
// MUST FIRE: C166-NO-CLEANUP-ON-ERR (guard-return, no explicit verify call).
func (k Keeper) HandleNonceBuggy(ctx Context, id Hash, sig Sig) error {
	k.processedNonces[id] = true

	if !sig.Recover(id) {
		return ErrBadSig // BUG: processedNonces[id] left set -> legit retry blocked
	}
	return nil
}
