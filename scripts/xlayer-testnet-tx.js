/**
 * X Layer Testnet Transaction — OKX Hackathon Proof
 * Chain ID 195, RPC: https://xlayertestrpc.okx.com
 * Sends 0-value tx to self as proof of integration
 */

async function main() {
  // Check for ethers
  let ethers;
  try {
    ethers = require("ethers");
  } catch {
    console.log("ethers not installed. Run: npm install ethers");
    process.exit(1);
  }

  const PRIVATE_KEY = process.env.XLAYER_TESTNET_PK;
  if (!PRIVATE_KEY) {
    console.log(
      "ESCALATE: Ogie manual tx needed — XLAYER_TESTNET_PK env var not set",
    );
    console.log("Steps for Ogie:");
    console.log(
      "1. Get X Layer testnet OKB from faucet: https://www.okx.com/xlayer/faucet",
    );
    console.log("2. Send 0-value tx on X Layer testnet (chain ID 195)");
    console.log("3. Save tx hash for hackathon submission");
    process.exit(0);
  }

  const provider = new ethers.JsonRpcProvider(
    "https://xlayertestrpc.okx.com",
    195,
  );
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const address = wallet.address;

  console.log(`Wallet: ${address}`);
  console.log("Chain: X Layer Testnet (195)");

  try {
    const tx = await wallet.sendTransaction({
      to: address,
      value: 0,
      data: "0x42757a7a2042442041676e74202d204d69726f46697368205374616765203120505643", // "Buzz BD Agent - MiroFish Stage 1 PVC" hex
    });
    console.log(`TX Hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`Confirmed in block: ${receipt.blockNumber}`);
    console.log(
      `Explorer: https://www.okx.com/explorer/xlayer-test/tx/${tx.hash}`,
    );
  } catch (err) {
    console.log(`TX failed: ${err.message}`);
    console.log("ESCALATE: Ogie manual tx may be needed");
  }
}

main();
