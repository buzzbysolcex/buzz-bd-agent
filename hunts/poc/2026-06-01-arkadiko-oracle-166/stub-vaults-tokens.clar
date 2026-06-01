(impl-trait .arkadiko-vaults-tokens-trait-v1-1.vaults-tokens-trait)
(define-read-only (get-token-list) (ok (list)))
(define-read-only (get-token (token principal))
  (ok { token-name: "STX", max-debt: u1000000000, vault-min-debt: u0, stability-fee: u0,
        liquidation-ratio: u15000, liquidation-penalty: u1000,
        redemption-fee-min: u0, redemption-fee-max: u0, redemption-fee-block-interval: u0, redemption-fee-block-rate: u0 }))
