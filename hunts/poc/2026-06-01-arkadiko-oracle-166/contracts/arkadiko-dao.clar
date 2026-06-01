;; Minimal stub of arkadiko-dao for the oracle PoC.
;; The real contract returns the configured DAO owner; for the PoC we return
;; tx-sender so the test deployer can register trusted oracles (setup only).
;; The finding (update-price-multi) does NOT call this contract.
(define-read-only (get-dao-owner) tx-sender)
