# Rule: Solana Contract Deployment Safety

> Applies when: working with Solana programs, Anchor, keypairs, or deploying to Solana mainnet

---

## MANDATORY

1. **NEVER** commit Solana keypair files to Git — exported .solana-deployer.json must be in .gitignore
2. **NEVER** log, print, echo, or transmit deployer private key bytes
3. **NEVER** deploy to Solana mainnet without `anchor test` passing locally first
4. **NEVER** change upgrade authority without Ogie Telegram approval
5. **ALWAYS** verify program ID matches between declare_id!(), Anchor.toml, and deployed program
6. **ALWAYS** dual-write: score goes to BOTH Base and Solana (never one without the other)
7. **ALWAYS** store both TX hashes (base_tx + solana_tx) in pipeline_tokens table
8. Deployer = HeyAnon SOL wallet (BNS48CGg...Zn9A), keypair exported from .env.heyanon
9. Lobster wallet (5iC7p...mo5Jp) is DEAD — private key wiped. NEVER reference as active
10. Keypair file permissions: chmod 600, owner root or claude-code only
11. Add keypair patterns and `SOL_DEPLOY` to check-safety.sh blocklist
12. Solana RPC: use mainnet-beta official endpoint or verified RPC provider only

## DEPLOY CHECKLIST

Before every `anchor deploy --provider.cluster mainnet`:

- [ ] `anchor test` passes (all green on local validator)
- [ ] Program ID in declare_id!() matches Anchor.toml [programs.mainnet]
- [ ] Deployer wallet has sufficient SOL (check: `solana balance`)
- [ ] No secrets in source code (grep for private keys, mnemonics)
- [ ] Git status clean — all changes committed
- [ ] Ogie notified in War Room before mainnet deploy

---

*Rule: solana-deploy | Security + deployment safety*
