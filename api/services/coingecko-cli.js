/**
 * CoinGecko CLI Wrapper — Intel Source #23
 * Wraps the coingecko-cli npm package for terminal-based price data
 */
const { execSync } = require('child_process');

function cgExec(cmd, timeout = 30000) {
  try {
    const raw = execSync(`cg ${cmd}`, { timeout, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    try { return { success: true, data: JSON.parse(raw) }; }
    catch { return { success: true, data: raw.trim() }; }
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200) };
  }
}

function getPrice(coinId) {
  return cgExec(`price --ids ${coinId} --vs_currencies usd`);
}

function getTrending() {
  return cgExec('trending');
}

function getHistory(coinId, days = 30) {
  return cgExec(`history --id ${coinId} --days ${days}`);
}

function getMarkets(total = 100) {
  return cgExec(`markets --vs_currency usd --per_page ${Math.min(total, 250)}`);
}

function searchCoin(query) {
  return cgExec(`search --query ${query}`);
}

function getStatus() {
  try {
    execSync('which cg', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { installed: true, source: 'coingecko-cli', intel_number: 23 };
  } catch {
    return { installed: false, source: 'coingecko-cli', intel_number: 23, note: 'cg command not found — install with npm i -g coingecko-cli' };
  }
}

module.exports = { getPrice, getTrending, getHistory, getMarkets, searchCoin, getStatus, cgExec };
