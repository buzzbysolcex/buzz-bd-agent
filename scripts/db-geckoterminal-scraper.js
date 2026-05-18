// GeckoTerminal Scraper — dev-browser script
// Replaces DexTools as Tier 1 source for circulating MCap, holder data, trust score
// Usage: dev-browser --headless --timeout 30 < scripts/db-geckoterminal-scraper.js
//
// Set CHAIN and ADDRESS before running:
// Chains: eth, bsc, solana, base, arbitrum, polygon_pos

const CHAIN = "eth";
const ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933"; // PEPE

const page = await browser.getPage("geckoterminal");

// Step 1: API call via browser (avoids CORS, uses browser fetch)
const apiUrl = `https://api.geckoterminal.com/api/v2/networks/${CHAIN}/tokens/${ADDRESS}`;
await page.goto(apiUrl);
await new Promise((r) => setTimeout(r, 2000));

const apiData = await page.evaluate(() => {
  try {
    return JSON.parse(document.body.innerText);
  } catch {
    return null;
  }
});

// Step 2: Get pool/pair data
const poolUrl = `https://api.geckoterminal.com/api/v2/networks/${CHAIN}/tokens/${ADDRESS}/pools?page=1`;
await page.goto(poolUrl);
await new Promise((r) => setTimeout(r, 2000));

const poolData = await page.evaluate(() => {
  try {
    return JSON.parse(document.body.innerText);
  } catch {
    return null;
  }
});

// Step 3: Visit the UI page for richer data (trust score, top holders)
const uiUrl = `https://www.geckoterminal.com/${CHAIN}/pools/${ADDRESS}`;
await page.goto(uiUrl);
await new Promise((r) => setTimeout(r, 4000));

const uiData = await page.evaluate(() => {
  const bodyText = document.body.innerText;

  const extractMetric = (label) => {
    const regex = new RegExp(label + "[:\\s]*([\\$]?[\\d,.]+[KMBTkmbt]?)", "i");
    const match = bodyText.match(regex);
    return match ? match[1] : null;
  };

  return {
    title: document.title,
    trustScore: extractMetric("Trust Score") || extractMetric("GT Score"),
    marketCap: extractMetric("Market Cap") || extractMetric("FDV"),
    circulatingMcap:
      extractMetric("Circ.*MCap") || extractMetric("Circulating"),
    holders: extractMetric("Holders") || extractMetric("Holder"),
    totalSupply: extractMetric("Total Supply"),
    circulatingSupply: extractMetric("Circ.*Supply"),
    volume24h: extractMetric("24h Volume") || extractMetric("Volume"),
    liquidity: extractMetric("Liquidity") || extractMetric("Reserve"),
    poolCreated: extractMetric("Pool Created") || extractMetric("Age"),
    txns24h: extractMetric("24h Txns") || extractMetric("Transactions"),
    buys24h: extractMetric("Buys"),
    sells24h: extractMetric("Sells"),
  };
});

// Combine API + UI data
const token = apiData?.data?.attributes || {};
const pools = (poolData?.data || []).map((p) => ({
  name: p.attributes?.name,
  dex: p.relationships?.dex?.data?.id,
  reserve_usd: p.attributes?.reserve_in_usd,
  volume_24h: p.attributes?.volume_usd?.h24,
  price_change_24h: p.attributes?.price_change_percentage?.h24,
  pool_created: p.attributes?.pool_created_at,
}));

const result = {
  address: ADDRESS,
  chain: CHAIN,
  source: "geckoterminal",
  api: {
    name: token.name,
    symbol: token.symbol,
    price_usd: token.price_usd,
    fdv_usd: token.fdv_usd,
    market_cap_usd: token.market_cap_usd,
    total_supply: token.total_supply,
    circulating_supply: token.circulating_supply,
    volume_24h: token.volume_usd?.h24,
    decimals: token.decimals,
    coingecko_coin_id: token.coingecko_coin_id,
    gt_score: token.gt_score,
    // Derived
    fdv_gap:
      token.fdv_usd && token.market_cap_usd && parseFloat(token.fdv_usd) > 0
        ? (
            ((parseFloat(token.fdv_usd) - parseFloat(token.market_cap_usd)) /
              parseFloat(token.fdv_usd)) *
            100
          ).toFixed(1) + "%"
        : null,
  },
  pools: pools.slice(0, 5),
  pool_count: pools.length,
  ui_enrichment: uiData,
  scraped_at: new Date().toISOString(),
};

console.log(JSON.stringify(result, null, 2));
