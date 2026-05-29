package bls12381

import "testing"

// TestBitmapBindingPoC proves the load-bearing claim behind the Babylon
// checkpointing PARK-residual NEGATE: a checkpoint's validator-bitmap is
// cryptographically bound to the actual aggregate signature. VerifyMultiSig
// verifies IFF the supplied pubkey set EXACTLY equals the real signer set.
// Therefore a forged bitmap that claims a non-signer (to fabricate a >2/3
// quorum) makes verification FAIL.
//
// Threat modeled: VerifyRawCheckpoint (x/checkpointing/keeper/keeper.go L173)
//   signerSet = ValidatorSet.FindSubset(ckpt.Bitmap)
//   sum(power over signerSet) ; require sum*3 > totalPower*2
//   VerifyMultiSig(ckpt.BlsMultiSig, pubkeys(signerSet), GetSignBytes(epoch,hash))
func TestBitmapBindingPoC(t *testing.T) {
	msg := []byte("epoch=7||blockhash=deadbeef") // GetSignBytes(epoch,hash) analogue

	// 3 honest validators A,B (signers) and C (did NOT sign).
	skA, pkA := GenKeyPair()
	skB, pkB := GenKeyPair()
	_, pkC := GenKeyPair() // attacker wants to claim C's power without C's sig

	sigA := Sign(skA, msg)
	sigB := Sign(skB, msg)
	aggSig, err := AggrSigList([]Signature{sigA, sigB})
	if err != nil {
		t.Fatalf("aggregate failed: %v", err)
	}

	// (1) Honest: bitmap selects exactly {A,B} -> MUST verify.
	if ok, err := VerifyMultiSig(aggSig, []PublicKey{pkA, pkB}, msg); err != nil || !ok {
		t.Fatalf("honest {A,B} must verify, got ok=%v err=%v", ok, err)
	}

	// (2) FORGED QUORUM: bitmap adds C's bit to inflate the power tally past 2/3.
	//     Verification MUST fail (agg pubkey now includes C, but aggSig has no C).
	if ok, _ := VerifyMultiSig(aggSig, []PublicKey{pkA, pkB, pkC}, msg); ok {
		t.Fatal("FORGED-QUORUM SURVIVED: {A,B,C} verified against agg(A,B) — binding BROKEN")
	}

	// (3) Dropped signer: bitmap claims only {A}. MUST fail.
	if ok, _ := VerifyMultiSig(aggSig, []PublicKey{pkA}, msg); ok {
		t.Fatal("subset {A} verified against agg(A,B) — binding BROKEN")
	}

	// (4) Wrong message (cross-epoch replay): same agg, different sign-bytes. MUST fail.
	if ok, _ := VerifyMultiSig(aggSig, []PublicKey{pkA, pkB}, []byte("epoch=8||blockhash=deadbeef")); ok {
		t.Fatal("cross-epoch replay verified — epoch binding BROKEN")
	}

	t.Log("BINDING SOUND: multisig verifies iff pubkey-set == signer-set AND message matches; forged bitmap fails")
}

// TestPoPRejectsRogueKey proves the rogue-key defense the NEGATE depends on:
// a rogue BLS key crafted to cancel honest keys in an aggregate cannot produce
// a valid Proof-of-Possession, because the registrant does not know its secret
// key. (pop.IsValid runs PopVerify under DST_POP, enforced at registration via
// MsgWrappedCreateValidator.ValidateBasic -> baseapp validateBasicTxMsgs.)
func TestPoPRejectsRogueKey(t *testing.T) {
	// Honest validator H.
	skH, pkH := GenKeyPair()

	// Genuine PoP for H over its own pubkey: possession-provable.
	popH := PopProve(skH, pkH)
	if ok, _ := PopVerify(popH, pkH, pkH); !ok {
		t.Fatal("genuine PoP for an honestly-generated key must verify")
	}

	// A "rogue" public key the attacker did not generate via KeyGen (no known sk).
	// We model it as an unrelated/garbage pubkey: the attacker cannot produce a
	// PopProve for it. Demonstrate that the honest PoP does not transfer to it.
	_, pkRogue := GenKeyPair() // stands in for g^a*(prod pk)^-1; attacker lacks its sk
	if ok, _ := PopVerify(popH, pkRogue, pkH); ok {
		t.Fatal("PoP for H verified under a different pubkey — PoP not key-binding")
	}

	// A domain-separated checkpoint signature (DST) must not pass as a PoP (DST_POP).
	ckptSig := Sign(skH, pkH) // DST
	if ok, _ := PopVerify(ckptSig, pkH, pkH); ok {
		t.Fatal("checkpoint sig (DST) accepted as PoP (DST_POP) — domain separation BROKEN")
	}

	t.Log("PoP is key-binding and domain-separated; rogue cancel-keys cannot register")
}
