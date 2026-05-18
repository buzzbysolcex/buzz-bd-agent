/**
 * HeyAnon Wallet Module — READ-ONLY Operations
 * v8.3.0 | Day 42 | Bismillah
 *
 * EVM: ethers.js v6 — balance checks, ERC-20 reads, message signing
 * SOL: @solana/web3.js — balance checks, SPL token reads
 *
 * SAFETY: READ ONLY. No swaps, transfers, staking.
 * All writes require Ogie approval via War Room.
 * NEVER log, print, or commit private keys.
 */

const { ethers } = require("ethers");
const { Connection, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// ─── ENV LOADING ─────────────────────────────────────
const ENV_PATH = "/home/claude-code/.env.heyanon";

function loadKeys() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error("HeyAnon env file not found");
  }
  const lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const [key, ...val] = line.split("=");
    if (key && val.length) env[key.trim()] = val.join("=").trim();
  }
  return env;
}

// ─── RPC ENDPOINTS (public, no auth needed) ──────────
const RPC = {
  ethereum: "https://eth.llamarpc.com",
  base: "https://mainnet.base.org",
  bsc: "https://bsc-dataseed1.binance.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  polygon: "https://polygon-rpc.com",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  solana: "https://api.mainnet-beta.solana.com",
};

// ─── ERC-20 ABI (minimal read-only) ─────────────────
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function totalSupply() view returns (uint256)",
];

// ─── EVM FUNCTIONS ───────────────────────────────────

function getProvider(chain = "ethereum") {
  const url = RPC[chain];
  if (!url) throw new Error(`Unsupported EVM chain: ${chain}`);
  return new ethers.JsonRpcProvider(url);
}

async function getEVMBalance(chain = "ethereum") {
  const env = loadKeys();
  const provider = getProvider(chain);
  const balance = await provider.getBalance(env.HEYANON_EVM_ADDRESS);
  return {
    chain,
    address: env.HEYANON_EVM_ADDRESS,
    balance_wei: balance.toString(),
    balance_eth: ethers.formatEther(balance),
  };
}

async function getERC20Balance(tokenAddress, chain = "ethereum") {
  const env = loadKeys();
  const provider = getProvider(chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [balance, decimals, symbol, name] = await Promise.all([
    contract.balanceOf(env.HEYANON_EVM_ADDRESS),
    contract.decimals(),
    contract.symbol().catch(() => "UNKNOWN"),
    contract.name().catch(() => "Unknown Token"),
  ]);
  return {
    chain,
    token: tokenAddress,
    symbol,
    name,
    balance_raw: balance.toString(),
    balance: ethers.formatUnits(balance, decimals),
    decimals: Number(decimals),
  };
}

async function getERC20Info(tokenAddress, chain = "ethereum") {
  const provider = getProvider(chain);
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [decimals, symbol, name, totalSupply] = await Promise.all([
    contract.decimals(),
    contract.symbol().catch(() => "UNKNOWN"),
    contract.name().catch(() => "Unknown Token"),
    contract.totalSupply(),
  ]);
  return {
    chain,
    address: tokenAddress,
    symbol,
    name,
    decimals: Number(decimals),
    total_supply: ethers.formatUnits(totalSupply, decimals),
  };
}

// ─── SOLANA FUNCTIONS ────────────────────────────────

function getSolConnection() {
  return new Connection(RPC.solana, "confirmed");
}

async function getSOLBalance() {
  const env = loadKeys();
  const conn = getSolConnection();
  const pubkey = new PublicKey(env.HEYANON_SOL_ADDRESS);
  const balance = await conn.getBalance(pubkey);
  return {
    chain: "solana",
    address: env.HEYANON_SOL_ADDRESS,
    balance_lamports: balance,
    balance_sol: balance / 1e9,
  };
}

async function getSPLTokenBalances() {
  const env = loadKeys();
  const conn = getSolConnection();
  const pubkey = new PublicKey(env.HEYANON_SOL_ADDRESS);
  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });
  return tokenAccounts.value
    .map((ta) => {
      const info = ta.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: info.tokenAmount.uiAmount,
        decimals: info.tokenAmount.decimals,
      };
    })
    .filter((t) => t.balance > 0);
}

// ─── MULTI-CHAIN BALANCE CHECK ───────────────────────

async function getAllBalances() {
  const results = { evm: {}, solana: null, errors: [] };

  // EVM chains in parallel
  const evmChains = [
    "ethereum",
    "base",
    "bsc",
    "arbitrum",
    "optimism",
    "polygon",
  ];
  const evmResults = await Promise.allSettled(
    evmChains.map((chain) => getEVMBalance(chain)),
  );
  evmChains.forEach((chain, i) => {
    if (evmResults[i].status === "fulfilled") {
      results.evm[chain] = evmResults[i].value;
    } else {
      results.errors.push({ chain, error: evmResults[i].reason?.message });
    }
  });

  // Solana
  try {
    results.solana = await getSOLBalance();
  } catch (e) {
    results.errors.push({ chain: "solana", error: e.message });
  }

  return results;
}

// ─── WALLET STATUS ───────────────────────────────────

function getWalletStatus() {
  try {
    const env = loadKeys();
    const hasEvmKey = !!env.HEYANON_EVM_PRIVATE_KEY;
    const hasSolKey = !!env.HEYANON_SOL_PRIVATE_KEY;
    return {
      configured: true,
      evm_address: env.HEYANON_EVM_ADDRESS,
      sol_address: env.HEYANON_SOL_ADDRESS,
      ton_address: env.HEYANON_TON_ADDRESS,
      evm_key_present: hasEvmKey,
      sol_key_present: hasSolKey,
      env_permissions: fs.statSync(ENV_PATH).mode & 0o777,
    };
  } catch (e) {
    return { configured: false, error: e.message };
  }
}

module.exports = {
  getEVMBalance,
  getERC20Balance,
  getERC20Info,
  getSOLBalance,
  getSPLTokenBalances,
  getAllBalances,
  getWalletStatus,
  RPC,
};
