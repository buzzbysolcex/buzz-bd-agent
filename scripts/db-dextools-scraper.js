// DexTools Scraper — dev-browser script
// Extracts: circulating MCap, DEXTscore, holder count, circ supply %, pool created date
// Usage: dev-browser --headless --timeout 30 < scripts/db-dextools-scraper.js
// Or pipe with address: echo 'ADDRESS=0x...; CHAIN=ether;' | cat - scripts/db-dextools-scraper.js | dev-browser --headless
//
// Set these before running (or hardcode for testing):
// const CHAIN = "ether";  // ether, bsc, solana, base, arbitrum
// const ADDRESS = "0x...";

const CHAIN = "ether";
const ADDRESS = "0x6982508145454Ce325dDbE47a25d4ec3d2311933"; // PEPE as test

const page = await browser.getPage("dextools-scraper");

// Navigate to DexTools pair explorer
const url = `https://www.dextools.io/app/en/${CHAIN}/pair-explorer/${ADDRESS}`;
await page.goto(url);

// Wait for page to load (DexTools is JS-heavy)
await new Promise((r) => setTimeout(r, 5000));

// Extract data from the page
const data = await page.evaluate(() => {
  const getText = (sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : null;
  };

  const getAll = (sel) => {
    return Array.from(document.querySelectorAll(sel)).map((el) =>
      el.textContent.trim(),
    );
  };

  // Get page text for keyword extraction
  const bodyText = document.body.innerText;

  // Extract key metrics by searching for patterns in the page
  const extractMetric = (label) => {
    const regex = new RegExp(label + "[:\\s]*([\\d,.]+[KMB]?)", "i");
    const match = bodyText.match(regex);
    return match ? match[1] : null;
  };

  // Try to find specific data points
  const result = {
    url: window.location.href,
    title: document.title,
    // Look for common DexTools elements
    dextScore: null,
    marketCap: null,
    circulatingSupply: null,
    totalSupply: null,
    holders: null,
    poolCreated: null,
    price: null,
    volume24h: null,
    liquidity: null,
    // Raw extraction attempts
    allNumbers: [],
  };

  // DexTools score
  const scoreEl =
    document.querySelector('[class*="score"]') ||
    document.querySelector('[class*="dext"]');
  if (scoreEl) result.dextScore = scoreEl.textContent.trim();

  // Market cap variations
  result.marketCap =
    extractMetric("Market Cap") ||
    extractMetric("MCap") ||
    extractMetric("Mkt Cap");
  result.circulatingSupply =
    extractMetric("Circ.*Supply") || extractMetric("Circulating");
  result.totalSupply = extractMetric("Total Supply");
  result.holders = extractMetric("Holders") || extractMetric("Holder");
  result.price = extractMetric("Price");
  result.volume24h = extractMetric("Volume") || extractMetric("Vol");
  result.liquidity = extractMetric("Liquidity") || extractMetric("Liq");

  // Pool creation date
  const dateRegex =
    /(?:Created|Pool Created|Pair Created)[:\s]*(\d{4}[-/]\d{2}[-/]\d{2}|\w+ \d+,?\s*\d{4})/i;
  const dateMatch = bodyText.match(dateRegex);
  if (dateMatch) result.poolCreated = dateMatch[1];

  // Grab any structured data cards
  const cards = document.querySelectorAll(
    '[class*="stat"], [class*="info"], [class*="metric"]',
  );
  cards.forEach((card) => {
    const label = card.querySelector(
      '[class*="label"], [class*="title"], small, span:first-child',
    );
    const value = card.querySelector(
      '[class*="value"], [class*="amount"], strong, span:last-child',
    );
    if (label && value && label !== value) {
      result.allNumbers.push({
        label: label.textContent.trim(),
        value: value.textContent.trim(),
      });
    }
  });

  return result;
});

console.log(JSON.stringify(data, null, 2));
