/**
 * Buzz BD Agent — Memory Search (FTS5)
 * v7.3.1 | Full-text search on SQLite via better-sqlite3
 *
 * CREATE VIRTUAL TABLE memory_fts USING fts5(content, source, timestamp)
 * BM25 ranking for relevance scoring
 */

const path = require('path');

let _db = null;
let _initialized = false;

/**
 * Initialize FTS5 virtual table
 * @param {object} db - better-sqlite3 instance
 */
function initFTS(db) {
  if (_initialized) return;
  _db = db;

  // Create FTS5 virtual table if not exists
  _db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      content,
      source,
      timestamp,
      tokenize='porter unicode61'
    )
  `);

  _initialized = true;
}

/**
 * Index a memory document into FTS5
 * @param {string} content - text content to index
 * @param {string} source - source identifier (e.g., 'pipeline', 'receipt', 'skill')
 * @returns {object}
 */
function indexMemory(content, source) {
  if (!_initialized) return { success: false, error: 'FTS not initialized — call initFTS(db) first' };
  if (!content) return { success: false, error: 'content is required' };

  const timestamp = new Date().toISOString();
  const src = source || 'manual';

  try {
    _db.prepare('INSERT INTO memory_fts (content, source, timestamp) VALUES (?, ?, ?)').run(content, src, timestamp);
    return { success: true, source: src, timestamp, content_length: content.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Search indexed memories using FTS5 with BM25 ranking
 * @param {string} query - search query
 * @param {object} [options]
 * @param {number} [options.limit=10] - max results
 * @param {string} [options.source] - filter by source
 * @returns {object}
 */
function searchMemory(query, options = {}) {
  if (!_initialized) return { success: false, error: 'FTS not initialized — call initFTS(db) first' };
  if (!query) return { success: false, error: 'query is required' };

  const limit = Math.min(options.limit || 10, 50);

  try {
    let sql, params;

    if (options.source) {
      sql = `
        SELECT content, source, timestamp, rank
        FROM memory_fts
        WHERE memory_fts MATCH ?
        AND source = ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [query, options.source, limit];
    } else {
      sql = `
        SELECT content, source, timestamp, rank
        FROM memory_fts
        WHERE memory_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      params = [query, limit];
    }

    const results = _db.prepare(sql).all(...params);

    return {
      success: true,
      query,
      count: results.length,
      results: results.map(r => ({
        content: r.content.substring(0, 500),
        source: r.source,
        timestamp: r.timestamp,
        bm25_score: r.rank
      }))
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get FTS index statistics
 * @returns {object}
 */
function getStats() {
  if (!_initialized) return { success: false, error: 'FTS not initialized — call initFTS(db) first' };

  try {
    const total = _db.prepare('SELECT COUNT(*) as count FROM memory_fts').get();
    const bySrc = _db.prepare('SELECT source, COUNT(*) as count FROM memory_fts GROUP BY source ORDER BY count DESC').all();
    const latest = _db.prepare('SELECT timestamp FROM memory_fts ORDER BY rowid DESC LIMIT 1').get();

    return {
      success: true,
      total_documents: total.count,
      by_source: bySrc.reduce((acc, r) => { acc[r.source] = r.count; return acc; }, {}),
      latest_indexed: latest?.timestamp || null
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { initFTS, indexMemory, searchMemory, getStats };
