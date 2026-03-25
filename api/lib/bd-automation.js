/**
 * BD Automation — Auto-proposal generation for PROCEED tokens
 * v8.1.0 | Wednesday Day 37 — Phase 2 Teammate 2
 *
 * When auto-score finds 85+ dual-gate-pass token:
 * 1. Generate proposal from template
 * 2. Save to DB
 * 3. Alert War Room
 * 4. Track in pending-followups with due dates
 */

const { getDB } = require('../db');
const fs = require('fs');
const path = require('path');

function generateProposal(token, scoreData) {
  const ticker = token.ticker || 'UNKNOWN';
  const chain = token.chain || 'solana';
  const score = token.score || 0;

  return {
    address: token.address,
    chain,
    ticker,
    score,
    status: 'draft',
    created_at: new Date().toISOString(),
    proposal_text: `SolCex Exchange Listing Proposal — $${ticker} (${chain.toUpperCase()})

Score: ${score}/100 (Buzz BD Agent 5-layer autonomous scoring)
Chain: ${chain.toUpperCase()}
Contract: ${token.address}

This token has been identified as a strong listing candidate by Buzz BD Agent's autonomous scoring pipeline. The score reflects composite analysis across safety, wallet forensics, technical indicators, social sentiment, and market metrics.

Dual-gate verified: both fundamentals and market metrics independently cleared the 60% threshold.

Next steps:
1. Team verification and due diligence
2. Listing fee discussion
3. Market making setup
4. Go-live timeline (10-14 days)

Contact: @hidayahanka1 on X | @Ogie2 on Telegram
SolCex Exchange | buzzbd.ai`,
    outreach_channels: ['twitter_dm', 'telegram'],
    followup_due: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  };
}

function saveProposal(proposal) {
  const db = getDB();

  // Create proposals table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      chain TEXT DEFAULT 'solana',
      ticker TEXT,
      score INTEGER,
      status TEXT DEFAULT 'draft',
      proposal_text TEXT,
      outreach_channels TEXT,
      followup_due TEXT,
      sent_at TEXT,
      response_at TEXT,
      outcome TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(address, chain)
    )
  `);

  try {
    db.prepare(`
      INSERT INTO proposals (address, chain, ticker, score, status, proposal_text, outreach_channels, followup_due, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(address, chain) DO UPDATE SET
        score = excluded.score,
        proposal_text = excluded.proposal_text,
        updated_at = datetime('now')
    `).run(
      proposal.address,
      proposal.chain,
      proposal.ticker,
      proposal.score,
      proposal.status,
      proposal.proposal_text,
      JSON.stringify(proposal.outreach_channels),
      proposal.followup_due,
      proposal.created_at
    );
    return true;
  } catch (e) {
    console.error('[bd-automation] Failed to save proposal:', e.message);
    return false;
  }
}

function getOverdueFollowups() {
  const db = getDB();
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT, chain TEXT, ticker TEXT, score INTEGER,
      status TEXT, proposal_text TEXT, outreach_channels TEXT,
      followup_due TEXT, sent_at TEXT, response_at TEXT, outcome TEXT,
      created_at TEXT, updated_at TEXT, UNIQUE(address, chain)
    )`);
    return db.prepare(`
      SELECT * FROM proposals
      WHERE status IN ('sent', 'draft') AND followup_due < datetime('now')
      ORDER BY followup_due ASC
    `).all();
  } catch { return []; }
}

module.exports = { generateProposal, saveProposal, getOverdueFollowups };
