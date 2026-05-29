package fixtures

// NEGATIVE (no-FP control) — models Hyperbridge EvmHost.dispatchIncoming
// done-right: the receipt is written, then DELETED on the module-call failure
// branch (cleanup-on-failure PRESENT). The exact piece Zebra lacked.
// MUST NOT FIRE.
func (k Keeper) DispatchIncoming(ctx Context, request Request, relayer Address) {
	commitment := request.Hash()
	k.SetRequestReceipt(ctx, commitment, relayer)

	if err := k.callModule(ctx, request, relayer); err != nil {
		// cleanup-on-failure PRESENT -> retryable
		k.DeleteRequestReceipt(ctx, commitment)
		return
	}
}

// NEGATIVE — map-index receipt insert with builtin delete() on the failure
// branch. MUST NOT FIRE.
func (k Keeper) RecvWithUnwind(ctx Context, packet Packet, proof []byte) error {
	k.receipts[packet.Sequence] = true

	if err := k.VerifyMembership(ctx, packet, proof); err != nil {
		delete(k.receipts, packet.Sequence)
		return err
	}
	return nil
}

// NEGATIVE — validate-THEN-cache (the correct order): the verify + the dedup
// Has-check happen BEFORE the insert, so there is no validation AFTER the
// insert. MUST NOT FIRE. (Mirrors Hyperbridge HandlerV2: verify -> dedup-read
// -> store.)
func (k Keeper) HandlePostRequest(ctx Context, req Request, proof []byte) error {
	if err := k.VerifyProof(ctx, req, proof); err != nil {
		return err
	}
	if k.HasRequestReceipt(ctx, req.Hash()) {
		return ErrDuplicate
	}
	k.SetRequestReceipt(ctx, req.Hash(), req.Relayer)
	return nil
}

// NEGATIVE — pure setter on non-dedup (balance) state, no validation after.
// MUST NOT FIRE (not dedup-class + no fallible op after).
func (k Keeper) SetBalance(ctx Context, addr Address, amount int) {
	k.balanceStore.Set(addr, amount)
}

// NEGATIVE — dedup insert but NO fallible op after it (the function just
// returns). MUST NOT FIRE.
func (k Keeper) MarkProcessedNoValidation(ctx Context, id Hash) {
	k.SetProcessed(ctx, id, true)
}
