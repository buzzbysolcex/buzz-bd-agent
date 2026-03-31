# Solana Smart Contracts — Deployment Skill

> Anchor framework (Rust) on Solana mainnet. Dual-chain proof: Base + Solana.
> ADR-009. Frontier hackathon alignment. ScoreStorage priority.

---

## TOOLCHAIN

```
Rust: rustup (latest stable)
Solana CLI: solana-cli 2.x+ (via anza.xyz installer)
Anchor: latest via avm (Anchor Version Manager)
Workspace: /home/claude-code/buzz-solana-contracts
Keypair: .env.heyanon → HeyAnon SOL wallet (BNS48CGg...Zn9A)
Network: Solana mainnet-beta (NOT devnet)
Explorer: solana.fm or explorer.solana.com
```

## WALLET REGISTRY (Solana)

| Wallet | Purpose | Key Location |
|--------|---------|-------------|
| HeyAnon SOL | BNS48CGg2mgP7sdBY4VVTiDyK6jVqRBi9Y71jqhxZn9A — Deployer + DeFi ops | .env.heyanon |
| 8004 SOL | 9pQ6K...XUBS — Agent identity | existing |

**Lobster (5iC7p...mo5Jp) is DEAD — private key wiped. Do NOT use.**

**Safety:** HeyAnon SOL wallet keys in .env.heyanon (chmod 600). Use as Solana program deployer. READ operations autonomous. ALL transfers/deploys require Ogie Telegram approval.

## SMART CONTRACTS (Solana Mainnet)

| Program | Status | Function |
|---------|--------|----------|
| buzz_score_storage | **BUILD** | PDA per token. Store score/safety/liquidity/social/timestamp. Owner-gated write. |
| buzz_listing_oracle | **BUILD** | CPI read from ScoreStorage. SOL payment gate. Stateless query layer. |
| buzz_listing_escrow | PHASE 2 | SPL Token deposits. Deposit/confirm/refund. Time-locked release. |
| buzz_reputation | PHASE 2 | PDA per agent. Prediction accuracy tracking. Tied to 8004 identity. |

## SCORESTORAGE PDA DESIGN

```
Seeds: [b"score", token_address.as_bytes()]
Bump: auto-derived by Anchor

Account Data (ScoreData):
  token_address: String (max 64 chars — Solana mint address)
  score: u8 (0-100)
  safety: u8
  liquidity: u8
  social: u8
  scorer: Pubkey (authority who wrote the score)
  timestamp: i64 (Unix timestamp)

Space: 8 (discriminator) + 4+64 + 1+1+1+1 + 32 + 8 = 120 bytes
Rent: ~0.00156 SOL per account (~$0.22)
```

## BUILD & DEPLOY COMMANDS

```bash
# First time setup (run once on Hetzner)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
cargo install --git https://github.com/coral-xyz/anchor avm --force
avm install latest && avm use latest

# Configure for mainnet
solana config set --url mainnet-beta

# Export HeyAnon SOL keypair for Anchor use
# Extract from .env.heyanon → /opt/buzz/.solana-deployer.json
# BNS48CGg2mgP7sdBY4VVTiDyK6jVqRBi9Y71jqhxZn9A
# Fund with SOL if needed (~5 SOL for first program deploy)

# Project commands
cd /home/claude-code/buzz-solana-contracts
anchor build                              # Compile Rust → BPF
anchor keys list                          # Get program IDs
# Update declare_id!() in lib.rs with program ID
# Update Anchor.toml [programs.mainnet] with program ID
anchor build                              # Rebuild with correct ID
anchor test                               # Test on local validator
anchor deploy --provider.cluster mainnet   # Deploy to mainnet
```

## ANCHOR.TOML TEMPLATE

```toml
[toolchain]
anchor_version = "0.31.0"

[features]
seeds = true

[programs.mainnet]
buzz_score_storage = "PROGRAM_ID_HERE"
buzz_listing_oracle = "PROGRAM_ID_HERE"

[provider]
cluster = "mainnet"
wallet = "/opt/buzz/.solana-deployer.json"   # exported from .env.heyanon (HeyAnon SOL)

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

## DUAL-CHAIN WRITE PATTERN

When Buzz scores a token, write to BOTH chains:

```
1. Score token via v2_8rules engine (existing)
2. Write to Base ScoreStorage (existing — Foundry/ethers.js)
3. Write to Solana ScoreStorage (new — Anchor client/web3.js)
4. Store both TX hashes in pipeline_tokens table
5. HSaaS report shows both chain proofs
```

API endpoint update:
```
POST /api/v1/score-token
  → existing Base write (0xbf81...88Fb)
  → NEW Solana write (buzz_score_storage program)
  → response includes: { base_tx, solana_tx, score }
```

## KEY DIFFERENCES FROM BASE

| Concept | Base (Foundry) | Solana (Anchor) |
|---------|---------------|-----------------|
| State | Inside contract | Separate PDA accounts |
| Deploy | forge script | anchor deploy |
| Test | forge test | anchor test (TypeScript) |
| Cost/TX | ~$0.01 | ~$0.00025 |
| Deploy cost | ~$0.025 | ~2-5 SOL (refundable rent) |
| Client | ethers.js | @solana/web3.js + @coral-xyz/anchor |
| Upgrade | Proxy pattern | Built-in upgrade authority |

## SECURITY RULES

1. Deployer keypair: .env.solana, chmod 600, NEVER in Git
2. Upgrade authority: deployer wallet (can make immutable later)
3. Owner check: only deployer can write scores (authority = Signer)
4. Read is public: anyone can derive PDA and read score data
5. Test on local validator BEFORE mainnet deploy
6. Add Solana keypair patterns to check-safety.sh hook
7. NEVER log, print, or transmit the deployer private key

## FRONTIER HACKATHON ALIGNMENT

- ScoreStorage on Solana mainnet = core demo artifact
- buzzbd.ai/audit writes score → Solana TX → verifiable on Explorer
- Loom video shows: "Score written to Solana mainnet" + TX link
- ELS-1 becomes cross-chain: Base contracts + Solana contracts
- Dual-chain = stronger than either chain alone

---

*Skill: solana-contracts | ADR-009 | Anchor + Rust | Mainnet direct*
*Priority: ScoreStorage → ListingOracle → Escrow → Reputation*
*Bismillah* 🤲
