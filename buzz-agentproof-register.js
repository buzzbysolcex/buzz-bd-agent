const { ethers } = require('ethers');

const PRIVATE_KEY = process.env.AVAX_PRIVATE_KEY;
const METADATA_URI = process.env.BUZZ_METADATA_URI;
const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const RPC = 'https://api.avax.network/ext/bc/C/rpc';

const ABI = ['function registerAgent(string agentURI) external payable'];

async function main() {
  console.log('🐝 BUZZ AGENTPROOF REGISTRATION\n');
  if (!PRIVATE_KEY || !METADATA_URI) {
    console.error('❌ Set AVAX_PRIVATE_KEY and BUZZ_METADATA_URI');
    process.exit(1);
  }
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log('Wallet:', wallet.address);
  const bal = ethers.formatEther(await provider.getBalance(wallet.address));
  console.log('Balance:', bal, 'AVAX');
  if (parseFloat(bal) < 0.1) { console.error('❌ Need 0.1 AVAX'); process.exit(1); }
  const registry = new ethers.Contract(REGISTRY, ABI, wallet);
  console.log('\nRegistering with URI:', METADATA_URI);
  const tx = await registry.registerAgent(METADATA_URI, {
    value: ethers.parseEther('0.1'),
    gasLimit: 300000
  });
  console.log('TX sent:', tx.hash);
  console.log('Snowtrace: https://snowtrace.io/tx/' + tx.hash);
  const receipt = await tx.wait();
  if (receipt.status === 1) {
    console.log('\n🐝 ✅ BUZZ REGISTERED ON AGENTPROOF!');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
  } else {
    console.error('❌ Transaction failed');
  }
}
main().catch(e => console.error('❌', e.message));
