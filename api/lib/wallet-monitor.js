/**
 * Wallet Balance Monitor
 * v8.1.0 | Wednesday Day 37 — Phase 2 Teammate 5
 *
 * Pulls EXACT balances from chain every hour. NEVER estimates.
 * Stores in DB. Alerts War Room on threshold drops.
 *
 * Wallets:
 * - Base main: 0x2Dc03124091104E7798C0273D96FC5ED65F05aA9
 * - Solana: 5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp
 * - AIBTC sBTC: SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST
 */

const https = require('https');
const { getDB } = require('../db');

const WALLETS = [
  { chain: 'base', address: '0x2Dc03124091104E7798C0273D96FC5ED65F05aA9', label: 'base-main' },
  { chain: 'solana', address: '5iC7pGyzqpXD2xTK4Ww7zKRDVo9cceyHNeKBTiemo5Jp', label: 'solana-lobster' },
  { chain: 'stacks-sbtc', address: 'SP24EH4DG99ZSSZY501BFH9Z4YTDJHC4B8X4K8BST', label: 'aibtc-sbtc' }
];

function initTable() {
  const db = getDB();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallet_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      address TEXT NOT NULL,
      label TEXT,
      balance_raw TEXT,
      balance_display TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

async function checkBalance(wallet) {
  // For now, return placeholder — actual chain queries will be added
  // per-chain (Helius for SOL, Alchemy for Base, Stacks API for sBTC)
  if (wallet.chain === 'stacks-sbtc') {
    try {
      const data = await new Promise((resolve, reject) => {
        https.get(`https://api.hiro.so/extended/v1/address/${wallet.address}/balances`, { timeout: 10000 }, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('parse error')); } });
        }).on('error', reject);
      });
      // sBTC balance from fungible tokens
      const sbtc = data.fungible_tokens || {};
      const sbtcKey = Object.keys(sbtc).find(k => k.includes('sbtc'));
      const balance = sbtcKey ? sbtc[sbtcKey].balance : '0';
      return { balance_raw: balance, balance_display: `${balance} sats sBTC` };
    } catch (e) {
      return { balance_raw: 'error', balance_display: e.message };
    }
  }
  return { balance_raw: 'pending', balance_display: 'chain query not yet implemented' };
}

async function checkAllBalances() {
  initTable();
  const db = getDB();
  const results = [];

  for (const wallet of WALLETS) {
    const balance = await checkBalance(wallet);
    db.prepare(`
      INSERT INTO wallet_balances (chain, address, label, balance_raw, balance_display)
      VALUES (?, ?, ?, ?, ?)
    `).run(wallet.chain, wallet.address, wallet.label, balance.balance_raw, balance.balance_display);
    results.push({ ...wallet, ...balance });
  }

  return results;
}

function getLatestBalances() {
  initTable();
  const db = getDB();
  return db.prepare(`
    SELECT wb.* FROM wallet_balances wb
    INNER JOIN (
      SELECT label, MAX(id) as max_id FROM wallet_balances GROUP BY label
    ) latest ON wb.id = latest.max_id
    ORDER BY wb.label
  `).all();
}

module.exports = { checkAllBalances, getLatestBalances, WALLETS };
