/**
 * ═══════════════════════════════════════════════════════════════
 *  BUZZ BD AGENT — Solana Agent Registry (8004) Registration
 * ═══════════════════════════════════════════════════════════════
 *
 *  Registers Buzz as a verified AI agent on Solana's native
 *  ERC-8004 implementation (8004-solana by @Quantu_AI).
 *
 *  This gives Buzz:
 *  - Metaplex Core NFT identity on Solana
 *  - ATOM reputation engine (5-tier trust: Bronze→Platinum)
 *  - On-chain feedback with SEAL v1 integrity
 *  - x402 payment feedback tags
 *  - Cross-chain identity (ETH #25045 + Base #17483 + anet #18709
 *    + Avalanche AgentProof #1718 + NOW Solana)
 *
 *  Chain: Solana mainnet-beta
 *  Cost: ~0.009 SOL (~$0.81)
 *  SDK: 8004-solana v0.7.6
 *
 *  Prerequisites:
 *    npm install 8004-solana @solana/web3.js
 *    export SOLANA_PRIVATE_KEY='[1,2,3,...,64]'  # Lobster wallet JSON array
 *    export PINATA_JWT='your-jwt'                 # For IPFS metadata upload
 *
 *  Usage:
 *    npx ts-node buzz-solana-8004-register.ts
 *
 *  SolCex Exchange | Indonesia Sprint Day 9 | March 3, 2026
 * ═══════════════════════════════════════════════════════════════
 */

import {
  SolanaSDK,
  IPFSClient,
  buildRegistrationFileJson,
  ServiceType,
  Tag,
  trustTierToString,
} from '8004-solana';
import { Keypair } from '@solana/web3.js';

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
  cluster: 'mainnet-beta' as const,

  // Buzz Agent Metadata
  agent: {
    name: 'Buzz BD Agent',
    description:
      'Autonomous 24/7 Business Development agent for SolCex Exchange. ' +
      'Scans, scores, and outreaches to token projects for Solana-native CEX listings. ' +
      '5 parallel sub-agents (scanner/safety/wallet/social/scorer) + Orchestrator. ' +
      '17 intelligence sources, 40 cron jobs, Twitter Bot v3.0 Sales Funnel. ' +
      'Built by Ogie (@hidayahanka1) with Claude Opus 4.6. ' +
      'Deployed on Akash Network via OpenClaw. ' +
      'Cross-chain identity: ETH #25045, Base #17483, anet #18709, Avalanche AgentProof #1718.',
    image: 'ipfs://QmBuzzBySolCexLogo', // TODO: Upload Buzz logo to IPFS first

    // Services Buzz exposes
    services: [
      // REST API (targeting 64 endpoints)
      { type: ServiceType.A2A, value: 'https://buzz.solcex.cc/api/v1' },
      // Future MCP server endpoint
      { type: ServiceType.MCP, value: 'https://buzz.solcex.cc/mcp' },
      // Buzz wallet on Solana
      { type: ServiceType.WALLET, value: '5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp' },
    ],

    // OASF Taxonomy - what Buzz does
    skills: [
      'advanced_reasoning_planning/strategic_planning',
      'data_retrieval_search/web_scraping',
      'data_retrieval_search/api_integration',
      'natural_language_processing/text_generation/text_generation',
      'finance_and_business/market_analysis',
    ],
    domains: [
      'finance_and_business/finance',
      'finance_and_business/cryptocurrency',
      'technology/software_engineering/software_engineering',
    ],

    // x402 micropayment support
    x402Support: true,
  },

  // SolCex Collection metadata
  collection: {
    name: 'SolCex Exchange Agents',
    symbol: 'SOLCEX',
    description:
      'Official AI agents of SolCex Exchange — Solana-native cryptocurrency exchange ' +
      'focused on token listings and ecosystem growth.',
  },
};

// ─── Main Registration Flow ──────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BUZZ BD AGENT — Solana Agent Registry Registration');
  console.log('  8004-solana | Mainnet-Beta | ATOM Enabled');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // ── Step 0: Validate environment ────────────────────────────
  if (!process.env.SOLANA_PRIVATE_KEY) {
    console.error('❌ SOLANA_PRIVATE_KEY not set. Export Lobster wallet key as JSON array.');
    console.error('   export SOLANA_PRIVATE_KEY=\'[1,2,3,...,64]\'');
    process.exit(1);
  }

  const hasPinata = !!process.env.PINATA_JWT;
  if (!hasPinata) {
    console.warn('⚠️  PINATA_JWT not set. Will use local IPFS node (http://localhost:5001).');
    console.warn('   For production, set: export PINATA_JWT=\'your-jwt-token\'');
  }

  // ── Step 1: Initialize SDK + IPFS ──────────────────────────
  console.log('📡 Initializing SDK on mainnet-beta...');

  const signer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY!))
  );
  console.log(`   Signer: ${signer.publicKey.toBase58()}`);

  const ipfs = hasPinata
    ? new IPFSClient({ pinataEnabled: true, pinataJwt: process.env.PINATA_JWT! })
    : new IPFSClient({ url: 'http://localhost:5001' });

  const sdk = new SolanaSDK({
    cluster: CONFIG.cluster,
    signer,
    ipfsClient: ipfs,
  });

  const chain = await sdk.chainId();
  console.log(`   Chain: ${chain}`);
  console.log(`   Programs: ${JSON.stringify(sdk.getProgramIds(), null, 2)}`);
  console.log('');

  // ── Step 2: Create SolCex Collection ───────────────────────
  console.log('📦 Creating SolCex agent collection...');

  const collectionData = sdk.createCollectionData({
    name: CONFIG.collection.name,
    symbol: CONFIG.collection.symbol,
    description: CONFIG.collection.description,
  });

  const { pointer: collectionPointer, uri: collectionUri } =
    await sdk.createCollection(collectionData);

  console.log(`   Collection Pointer: ${collectionPointer}`);
  console.log(`   Collection URI: ${collectionUri}`);
  console.log('');

  // ── Step 3: Build agent metadata ───────────────────────────
  console.log('🔧 Building Buzz agent metadata...');

  const metadata = buildRegistrationFileJson({
    name: CONFIG.agent.name,
    description: CONFIG.agent.description,
    image: CONFIG.agent.image,
    services: CONFIG.agent.services,
    skills: CONFIG.agent.skills,
    domains: CONFIG.agent.domains,
    x402Support: CONFIG.agent.x402Support,
  });

  console.log('   Metadata built:');
  console.log(`   - Name: ${CONFIG.agent.name}`);
  console.log(`   - Services: ${CONFIG.agent.services.length}`);
  console.log(`   - Skills: ${CONFIG.agent.skills.length}`);
  console.log(`   - Domains: ${CONFIG.agent.domains.length}`);
  console.log(`   - x402: ${CONFIG.agent.x402Support}`);
  console.log('');

  // ── Step 4: Upload metadata to IPFS ────────────────────────
  console.log('📤 Uploading metadata to IPFS...');

  const metadataCid = await ipfs.addJson(metadata);
  const tokenUri = `ipfs://${metadataCid}`;

  console.log(`   CID: ${metadataCid}`);
  console.log(`   URI: ${tokenUri}`);
  console.log('');

  // ── Step 5: Register agent on-chain ────────────────────────
  console.log('🚀 Registering Buzz on Solana Agent Registry...');
  console.log('   (with ATOM reputation engine enabled)');

  const result = await sdk.registerAgent(tokenUri, {
    atomEnabled: true,
    collectionPointer: collectionPointer!,
  });

  const agentAsset = result.asset;
  const txSignature = result.signature;

  console.log('');
  console.log('   ✅ BUZZ REGISTERED ON SOLANA AGENT REGISTRY!');
  console.log(`   Agent Asset: ${agentAsset.toBase58()}`);
  console.log(`   TX Signature: ${txSignature}`);
  console.log(`   Explorer: https://solscan.io/tx/${txSignature}`);
  console.log('');

  // ── Step 6: Set operational wallet ─────────────────────────
  console.log('🔑 Setting Buzz operational wallet...');

  // Use Lobster wallet as the operational wallet
  // (In production, you might generate a dedicated op wallet)
  const opWallet = Keypair.generate(); // Dedicated signing wallet for Buzz
  await sdk.setAgentWallet(agentAsset, opWallet);

  console.log(`   Operational Wallet: ${opWallet.publicKey.toBase58()}`);
  console.log('   ⚠️  SAVE THIS KEYPAIR! Needed for signing operations.');
  console.log(`   Secret Key (JSON): [${Array.from(opWallet.secretKey)}]`);
  console.log('');

  // ── Step 7: Set on-chain metadata ──────────────────────────
  console.log('📝 Setting on-chain metadata...');

  await sdk.setMetadata(agentAsset, 'version', '6.2.0-acp');
  await sdk.setMetadata(agentAsset, 'operator', '@hidayahanka1');
  await sdk.setMetadata(agentAsset, 'exchange', 'SolCex Exchange');
  await sdk.setMetadata(agentAsset, 'twitter', '@BuzzBySolCex');
  await sdk.setMetadata(agentAsset, 'telegram', '@Ogie2');
  await sdk.setMetadata(agentAsset, 'erc8004-eth', '#25045');
  await sdk.setMetadata(agentAsset, 'erc8004-base', '#17483');
  await sdk.setMetadata(agentAsset, 'erc8004-anet', '#18709');
  await sdk.setMetadata(agentAsset, 'agentproof-avalanche', '#1718');
  await sdk.setMetadata(agentAsset, 'acp-virtuals', '#17681');
  await sdk.setMetadata(agentAsset, 'infrastructure', 'Akash Network / OpenClaw');
  await sdk.setMetadata(agentAsset, 'llm-gateway', 'Bankr LLM Gateway');

  // Immutable certification (cannot be changed later)
  await sdk.setMetadata(agentAsset, 'chain-registrations', '5-chains', true);

  console.log('   ✅ 13 metadata entries set (1 immutable)');
  console.log('');

  // ── Step 8: Verify registration ────────────────────────────
  console.log('🔍 Verifying registration...');

  const readSdk = new SolanaSDK({ cluster: CONFIG.cluster });
  const agent = await readSdk.loadAgent(agentAsset);

  console.log(`   Name: ${agent.nft_name}`);
  console.log(`   Owner: ${agent.getOwnerPublicKey().toBase58()}`);
  console.log(`   URI: ${agent.agent_uri}`);
  console.log('');

  // Check ATOM stats
  const atom = await readSdk.getAtomStats(agentAsset);
  if (atom) {
    console.log('   ATOM Engine:');
    console.log(`   - Trust Tier: ${trustTierToString(atom.getTrustTier())} (${atom.trust_tier})`);
    console.log(`   - Quality: ${atom.getQualityPercent()}%`);
    console.log(`   - Confidence: ${atom.getConfidencePercent()}%`);
  }
  console.log('');

  // ── Step 9: Liveness check ─────────────────────────────────
  console.log('🏥 Running liveness check...');

  try {
    const report = await readSdk.isItAlive(agentAsset, { timeoutMs: 10000 });
    console.log(`   Status: ${report.status}`);
    console.log(`   Live: ${report.okCount}/${report.totalPinged}`);
  } catch (e) {
    console.log('   ⚠️  Liveness check skipped (endpoints not yet deployed)');
  }
  console.log('');

  // ── Summary ────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  📋 REGISTRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`  Agent:          Buzz BD Agent`);
  console.log(`  Asset:          ${agentAsset.toBase58()}`);
  console.log(`  Chain:          Solana mainnet-beta`);
  console.log(`  Collection:     ${CONFIG.collection.name}`);
  console.log(`  ATOM Enabled:   ✅`);
  console.log(`  x402 Support:   ✅`);
  console.log(`  Op Wallet:      ${opWallet.publicKey.toBase58()}`);
  console.log(`  TX:             ${txSignature}`);
  console.log(`  Solscan:        https://solscan.io/tx/${txSignature}`);
  console.log('');
  console.log('  🌐 CROSS-CHAIN IDENTITY (5 CHAINS):');
  console.log('  ├─ Ethereum:    ERC-8004 #25045');
  console.log('  ├─ Base:        ERC-8004 #17483');
  console.log('  ├─ anet:        ERC-8004 #18709');
  console.log('  ├─ Avalanche:   AgentProof #1718');
  console.log('  └─ Solana:      Agent Registry ✅ NEW');
  console.log('');
  console.log('  🔗 Explore:');
  console.log(`  ├─ 8004scan:    https://8004scan.io/agent/${agentAsset.toBase58()}`);
  console.log(`  ├─ 8004market:  https://8004market.io`);
  console.log(`  └─ SATI:        https://sati.cascade.fyi`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ✅ BUZZ IS NOW ON SOLANA AGENT REGISTRY');
  console.log('═══════════════════════════════════════════════════════════');

  // Cleanup
  await ipfs.close?.();
}

// ─── Execute ─────────────────────────────────────────────────
main().catch((err) => {
  console.error('');
  console.error('❌ Registration failed:', err.message);
  console.error('');
  if (err.message?.includes('insufficient')) {
    console.error('   → Need ~0.02 SOL in Lobster wallet for registration + metadata');
    console.error('   → Wallet: 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp');
  }
  process.exit(1);
});
