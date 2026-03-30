/**
 * HeyAnon DeFi Intelligence — READ-ONLY
 * v8.3.0 | Day 42 | Bismillah
 *
 * Public API queries for ARIA enrichment:
 * - Hyperliquid OI + funding rates (public REST)
 * - Aave V3 positions (read-only contract calls)
 * - Token prices across chains (public RPC)
 * - Multi-DEX LP detection (public reads)
 *
 * SAFETY: All read-only. No auth needed for public data.
 */

let ethers;
try {
  ethers = require('ethers');
} catch {
  // ethers not installed — EVM contract reads disabled, Hyperliquid still works
}

let RPC;
try {
  ({ RPC } = require('./heyanon-wallet'));
} catch {
  RPC = {
    ethereum: 'https://eth.llamarpc.com',
    base: 'https://mainnet.base.org',
    bsc: 'https://bsc-dataseed1.binance.org',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    optimism: 'https://mainnet.optimism.io',
    polygon: 'https://polygon-rpc.com'
  };
}

// ─── HYPERLIQUID (public API, no auth) ───────────────

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

async function getHyperliquidOI(symbol = 'BTC') {
  const resp = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' })
  });
  const data = await resp.json();
  if (!data || !Array.isArray(data) || data.length < 2) {
    return { symbol, found: false };
  }

  const [meta, contexts] = data;
  const idx = meta.universe?.findIndex(u => u.name === symbol);
  if (idx === -1 || idx === undefined) {
    return { symbol, found: false, available: meta.universe?.map(u => u.name).slice(0, 20) };
  }

  const ctx = contexts[idx];
  return {
    symbol,
    found: true,
    open_interest: parseFloat(ctx.openInterest || 0),
    funding_rate: parseFloat(ctx.funding || 0),
    mark_price: parseFloat(ctx.markPx || 0),
    oracle_price: parseFloat(ctx.oraclePx || 0),
    volume_24h: parseFloat(ctx.dayNtlVlm || 0),
    premium: ctx.premium || null
  };
}

async function getHyperliquidAllOI() {
  const resp = await fetch(HYPERLIQUID_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' })
  });
  const data = await resp.json();
  if (!data || !Array.isArray(data) || data.length < 2) return [];

  const [meta, contexts] = data;
  return meta.universe.map((u, i) => ({
    symbol: u.name,
    open_interest: parseFloat(contexts[i].openInterest || 0),
    funding_rate: parseFloat(contexts[i].funding || 0),
    mark_price: parseFloat(contexts[i].markPx || 0),
    volume_24h: parseFloat(contexts[i].dayNtlVlm || 0)
  })).sort((a, b) => b.open_interest - a.open_interest);
}

// ─── AAVE V3 (read-only contract calls) ──────────────

const AAVE_V3_POOL = {
  ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  arbitrum: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  base: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  optimism: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  polygon: '0x794a61358D6845594F94dc1DB02A252b5b4814aD'
};

const AAVE_POOL_ABI = [
  'function getReservesList() view returns (address[])',
  'function getReserveData(address) view returns (tuple(uint256,uint128,uint128,uint128,uint128,uint128,uint40,uint16,address,address,address,address,uint128,uint128,uint128))'
];

async function getAaveMarkets(chain = 'ethereum') {
  if (!ethers) return { chain, supported: false, error: 'ethers not installed' };
  const poolAddr = AAVE_V3_POOL[chain];
  if (!poolAddr) return { chain, supported: false };

  try {
    const provider = new ethers.JsonRpcProvider(RPC[chain]);
    const pool = new ethers.Contract(poolAddr, AAVE_POOL_ABI, provider);
    const reserves = await pool.getReservesList();
    return {
      chain,
      supported: true,
      reserves_count: reserves.length,
      reserves: reserves.slice(0, 10).map(r => r.toLowerCase())
    };
  } catch (e) {
    return { chain, supported: true, error: e.message };
  }
}

async function checkLendingMarkets(tokenAddress) {
  const chains = Object.keys(AAVE_V3_POOL);
  const results = await Promise.allSettled(
    chains.map(async (chain) => {
      const markets = await getAaveMarkets(chain);
      if (!markets.reserves) return { chain, listed: false };
      const listed = markets.reserves.includes(tokenAddress.toLowerCase());
      return { chain, listed };
    })
  );

  const lending = results
    .filter(r => r.status === 'fulfilled' && r.value.listed)
    .map(r => r.value.chain);

  return {
    token: tokenAddress,
    lending_markets: lending,
    lending_count: lending.length,
    has_lending: lending.length > 0
  };
}

// ─── DEX LP DETECTION (public reads) ─────────────────

const UNISWAP_V3_FACTORY = {
  ethereum: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
  base: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
  arbitrum: '0x1F98431c8aD98523631AE4a59f267346ea31F984'
};

const FACTORY_ABI = [
  'function getPool(address,address,uint24) view returns (address)'
];

const WETH = {
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  base: '0x4200000000000000000000000000000000000006',
  arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
};

const FEE_TIERS = [500, 3000, 10000];

async function checkDEXLiquidity(tokenAddress, chain = 'ethereum') {
  if (!ethers) return { chain, pools_found: 0, error: 'ethers not installed' };
  const factoryAddr = UNISWAP_V3_FACTORY[chain];
  const weth = WETH[chain];
  if (!factoryAddr || !weth) return { chain, pools_found: 0 };

  try {
    const provider = new ethers.JsonRpcProvider(RPC[chain]);
    const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, provider);
    const pools = await Promise.allSettled(
      FEE_TIERS.map(fee => factory.getPool(tokenAddress, weth, fee))
    );

    const activePools = pools
      .filter(r => r.status === 'fulfilled' && r.value !== ethers.ZeroAddress)
      .map((r, i) => ({ fee: FEE_TIERS[i], pool: r.value }));

    return {
      chain,
      dex: 'uniswap_v3',
      pools_found: activePools.length,
      pools: activePools
    };
  } catch (e) {
    return { chain, dex: 'uniswap_v3', pools_found: 0, error: e.message };
  }
}

async function checkMultiDEXPresence(tokenAddress) {
  const chains = Object.keys(UNISWAP_V3_FACTORY);
  const results = await Promise.allSettled(
    chains.map(chain => checkDEXLiquidity(tokenAddress, chain))
  );

  const dexes = results
    .filter(r => r.status === 'fulfilled' && r.value.pools_found > 0)
    .map(r => r.value);

  return {
    token: tokenAddress,
    dex_count: dexes.length,
    total_pools: dexes.reduce((sum, d) => sum + d.pools_found, 0),
    chains_with_lp: dexes.map(d => d.chain),
    details: dexes
  };
}

// ─── ARIA DEPTH SCORE ────────────────────────────────

async function calculateARIADepth(tokenAddress, symbol) {
  let score = 0;
  const factors = [];

  // +5: Hyperliquid perps listing
  try {
    const perps = await getHyperliquidOI(symbol);
    if (perps.found) {
      score += 5;
      factors.push({ factor: 'hyperliquid_perps', points: 5, data: { oi: perps.open_interest } });
    }
  } catch {}

  // +3: Lending markets active
  if (tokenAddress && tokenAddress.startsWith('0x')) {
    try {
      const lending = await checkLendingMarkets(tokenAddress);
      if (lending.has_lending) {
        score += 3;
        factors.push({ factor: 'lending_markets', points: 3, data: { chains: lending.lending_markets } });
      }
    } catch {}
  }

  // +3: LP on 2+ DEXs
  if (tokenAddress && tokenAddress.startsWith('0x')) {
    try {
      const dex = await checkMultiDEXPresence(tokenAddress);
      if (dex.dex_count >= 2) {
        score += 3;
        factors.push({ factor: 'multi_dex_lp', points: 3, data: { count: dex.dex_count } });
      }
    } catch {}
  }

  // +5: Multi-chain presence (detected via DexScreener, stored in pipeline)
  // This is checked externally and passed in

  // +2: CEX listing (checked via CoinGecko tickers, stored in pipeline)
  // This is checked externally and passed in

  // +2: Active staking (checked via protocol-specific APIs)
  // This is checked externally and passed in

  return {
    token: tokenAddress,
    symbol,
    aria_depth_score: score,
    max_score: 20,
    factors,
    calculated_at: new Date().toISOString()
  };
}

module.exports = {
  getHyperliquidOI,
  getHyperliquidAllOI,
  getAaveMarkets,
  checkLendingMarkets,
  checkDEXLiquidity,
  checkMultiDEXPresence,
  calculateARIADepth
};
