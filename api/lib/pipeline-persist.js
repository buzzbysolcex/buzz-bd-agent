/**
 * Pipeline Persistence Bridge — Day 32B Fix
 *
 * Reads scanner discovery MD files from /data/workspace/memory/pipeline/
 * and INSERTs/UPSERTs them into pipeline_tokens table with real contract addresses.
 *
 * Called by: boot sync, scan cron post-hook, manual trigger
 */

const fs = require('fs');
const path = require('path');
const { getDB } = require('../db');

const PIPELINE_DIR = process.env.PIPELINE_DIR || '/data/workspace/memory/pipeline';

const ADDRESS_FORMAT = {
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/,
  base: /^0x[a-fA-F0-9]{40}$/,
  arbitrum: /^0x[a-fA-F0-9]{40}$/,
};

function parsePipelineMD(content, filename) {
  const lines = content.split('\n');

  const extract = (label) => {
    const line = lines.find(l => l.includes(`**${label}:**`));
    if (!line) return null;
    return line.split(`**${label}:**`)[1]?.trim() || null;
  };

  const name = extract('Name');
  const symbol = extract('Symbol');
  const chain = (extract('Chain') || 'solana').toLowerCase();
  const contract = extract('Contract');
  const dex = extract('DEX');

  // Extract score — look for "Score: XX" pattern
  const scoreLine = lines.find(l => /Score:\s*\d+/.test(l));
  let score = null;
  if (scoreLine) {
    const match = scoreLine.match(/Score:\s*(\d+)/);
    score = match ? Math.min(parseInt(match[1]), 100) : null; // CAP AT 100
  }

  // Extract status from filename (e.g., LUCIA-solana-HOT.md)
  const parts = filename.replace('.md', '').split('-');
  const status = parts[parts.length - 1]; // HOT, QUALIFIED, WATCH

  // Extract category/source
  const categoryLine = lines.find(l => l.includes('*Category:'));
  const source = categoryLine ? categoryLine.replace(/\*Category:\s*/, '').replace(/\*/, '').trim() : 'scanner';

  // Extract timestamp
  const addedLine = lines.find(l => l.includes('*Added:') || l.includes('*Updated:'));
  const timestamp = addedLine ? addedLine.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/)?.[0] : null;

  return { name, symbol, chain, contract, dex, score, status, source, timestamp };
}

function validateAddress(address, chain) {
  if (!address) return false;
  const format = ADDRESS_FORMAT[chain];
  if (!format) return true; // Unknown chain — allow
  return format.test(address);
}

function isPumpFun(address) {
  return typeof address === 'string' && address.toLowerCase().endsWith('pump');
}

function syncPipelineFiles() {
  const db = getDB();

  if (!fs.existsSync(PIPELINE_DIR)) {
    console.log('[pipeline-persist] Pipeline dir not found:', PIPELINE_DIR);
    return { synced: 0, skipped: 0, errors: 0 };
  }

  const files = fs.readdirSync(PIPELINE_DIR).filter(f => f.endsWith('.md'));
  let synced = 0, skipped = 0, errors = 0;
  const results = [];

  const upsert = db.prepare(`
    INSERT INTO pipeline_tokens (address, chain, ticker, name, stage, score, source, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(address, chain) DO UPDATE SET
      ticker = COALESCE(excluded.ticker, pipeline_tokens.ticker),
      name = COALESCE(excluded.name, pipeline_tokens.name),
      stage = CASE WHEN excluded.score > COALESCE(pipeline_tokens.score, 0) THEN excluded.stage ELSE pipeline_tokens.stage END,
      score = CASE WHEN excluded.score > COALESCE(pipeline_tokens.score, 0) THEN excluded.score ELSE pipeline_tokens.score END,
      source = COALESCE(excluded.source, pipeline_tokens.source),
      updated_at = datetime('now')
  `);

  const syncAll = db.transaction(() => {
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(PIPELINE_DIR, file), 'utf8');
        const token = parsePipelineMD(content, file);

        if (!token.contract) {
          skipped++;
          continue;
        }

        if (!validateAddress(token.contract, token.chain)) {
          skipped++;
          results.push({ file, reason: 'invalid_address_format', address: token.contract });
          continue;
        }

        // Map status to pipeline stage
        const stageMap = { HOT: 'scored', QUALIFIED: 'scored', WATCH: 'discovered', COLD: 'discovered' };
        const stage = stageMap[token.status] || 'discovered';

        const pumpFlag = isPumpFun(token.contract) ? ' [pump.fun]' : '';
        const notes = `${token.dex || ''}${pumpFlag} | ${token.source || 'scanner'}`;

        upsert.run(
          token.contract,
          token.chain,
          token.symbol || null,
          token.name || null,
          stage,
          token.score ? Math.min(token.score, 100) : null,
          token.source || 'scanner',
          notes,
          token.timestamp || new Date().toISOString()
        );

        synced++;
        results.push({ file, symbol: token.symbol, chain: token.chain, score: token.score, address: token.contract.substring(0, 12) + '...' });
      } catch (e) {
        errors++;
        results.push({ file, error: e.message });
      }
    }
  });

  syncAll();

  const total = db.prepare('SELECT COUNT(*) as c FROM pipeline_tokens').get().c;
  console.log(`[pipeline-persist] Synced ${synced} tokens from ${files.length} MD files (${skipped} skipped, ${errors} errors). Total in DB: ${total}`);

  return { synced, skipped, errors, total, results };
}

module.exports = { syncPipelineFiles, parsePipelineMD, validateAddress, isPumpFun };
