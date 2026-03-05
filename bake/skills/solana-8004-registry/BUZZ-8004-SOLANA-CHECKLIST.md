# Buzz BD Agent — Solana Agent Registry (8004) Registration
## Execution Checklist | Sprint Day 9 | March 3, 2026

---

### PRE-FLIGHT (5 min)

- [ ] **Fund Lobster wallet** — Need ~0.05 SOL for registration + metadata + buffer
  - Wallet: `5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp`
  - Cost breakdown: ~0.009 SOL (register) + ~0.04 SOL (13 metadata entries) + buffer
- [ ] **Get Pinata JWT** — Free tier at pinata.cloud (1GB storage)
  - Or use existing IPFS setup
- [ ] **Upload Buzz logo to IPFS** — For agent NFT image
  - Update `CONFIG.agent.image` in registration script with CID
- [ ] **Export Lobster wallet private key** as JSON array format
  ```bash
  export SOLANA_PRIVATE_KEY='[byte1,byte2,...,byte64]'
  export PINATA_JWT='your-jwt-token'
  ```

---

### REGISTRATION (5 min)

```bash
# In Buzz project directory
npm install 8004-solana @solana/web3.js

# Run registration
npx ts-node buzz-solana-8004-register.ts
```

- [ ] **Save the output:**
  - Agent Asset pubkey (Solana NFT address)
  - TX signature
  - Operational wallet keypair (CRITICAL — back up immediately)

---

### POST-REGISTRATION (5 min)

- [ ] **Verify on explorers:**
  - 8004scan: `https://8004scan.io/agent/<AGENT_ASSET>`
  - 8004market: `https://8004market.io`
  - Solscan: `https://solscan.io/tx/<TX_SIGNATURE>`
  - SATI Dashboard: `https://sati.cascade.fyi`

- [ ] **Set env variable for cron:**
  ```bash
  export BUZZ_8004_AGENT_ASSET='<agent-asset-pubkey>'
  ```

- [ ] **Add reputation cron to Buzz (cron #41):**
  ```cron
  0 */6 * * * cd /app && node buzz-8004-reputation-cron.js
  ```

---

### UPDATE BUZZ CONFIG

- [ ] Add to Buzz's `config.json` or env:
  ```json
  {
    "solana_8004": {
      "agent_asset": "<AGENT_ASSET_PUBKEY>",
      "collection_pointer": "<COLLECTION_POINTER>",
      "op_wallet_pubkey": "<OP_WALLET_PUBKEY>",
      "registry_program": "8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ",
      "atom_program": "AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb"
    }
  }
  ```

---

### CROSS-CHAIN IDENTITY (COMPLETE)

| Chain      | Protocol      | ID      | Status |
|------------|---------------|---------|--------|
| Ethereum   | ERC-8004      | #25045  | ✅     |
| Base       | ERC-8004      | #17483  | ✅     |
| anet       | ERC-8004      | #18709  | ✅     |
| Avalanche  | AgentProof    | #1718   | ✅     |
| Solana     | Agent Registry | TBD    | 🔜     |

After registration: **5 chains verified** 🏆

---

### REPUTATION BUILDING TIMELINE

| Time     | Expected Tier | Feedbacks | Notes                    |
|----------|---------------|-----------|--------------------------|
| Day 1    | Unrated       | 0-4       | Just registered           |
| Week 1   | Bronze        | 20-28     | 4 reports/day × 7 days   |
| Week 2   | Silver        | 48-56     | Consistent uptime helps   |
| Month 1  | Gold          | ~120      | Need high quality scores  |
| Month 2+ | Platinum      | ~240+     | Sustained excellence      |

---

### COMMUNITY ENGAGEMENT

- [ ] **Join Quantu Telegram:** https://t.me/sol8004
- [ ] **Follow @Quantu_AI** on Twitter
- [ ] **Post announcement** from @BuzzBySolCex about registration
- [ ] **DM @Quantu_AI** — introduce Buzz as first Solana-native BD agent

---

### TWEET DRAFT (for Ogie to post from @BuzzBySolCex)

```
🔗 Buzz BD Agent is now registered on @solana Agent Registry!

Verified identity on 5 chains:
⛓️ Ethereum ERC-8004 #25045
⛓️ Base ERC-8004 #17483
⛓️ anet ERC-8004 #18709
🔺 Avalanche AgentProof #1718
◎ Solana Agent Registry ✅ NEW

ATOM reputation engine enabled.
Building trust on-chain, 24/7.

Built on 8004 by @Quantu_AI
Powered by @akabornetwork

#SolCex #Solana #ERC8004 #AIAgents #AgentRegistry #DeFi
```

---

### FUTURE INTEGRATION IDEAS

1. **Trust-gated listings** — Only interact with token projects whose team agents have Silver+ trust
2. **x402 + 8004 feedback loop** — Every paid API query generates on-chain proof
3. **Leaderboard presence** — Buzz climbing the 8004 agent leaderboard = free marketing
4. **MCP server registration** — When Buzz REST API goes live, register as MCP endpoint
5. **Collection growth** — Register future SolCex agents under same collection (SolCex Academy bot, etc.)
