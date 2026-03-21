/**
 * Migration 023: Knowledge Graph Layer
 * Entity-relationship graph for tokens, deployers, VCs, chains, exchanges
 * Feature 1: cross-token intelligence via shared deployers, backers, chains
 */

const migrations = [
  {
    name: '023_knowledge_graph',
    sql: `
      CREATE TABLE IF NOT EXISTS kg_entities (
        entity_id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        name TEXT NOT NULL,
        metadata_json TEXT DEFAULT '{}',
        first_seen TEXT DEFAULT (datetime('now')),
        last_updated TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS kg_relationships (
        rel_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        confidence REAL DEFAULT 0.8,
        evidence_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (source_entity_id) REFERENCES kg_entities(entity_id),
        FOREIGN KEY (target_entity_id) REFERENCES kg_entities(entity_id),
        UNIQUE(source_entity_id, target_entity_id, relationship_type)
      );

      CREATE INDEX IF NOT EXISTS idx_kg_rel_source ON kg_relationships(source_entity_id);
      CREATE INDEX IF NOT EXISTS idx_kg_rel_target ON kg_relationships(target_entity_id);
      CREATE INDEX IF NOT EXISTS idx_kg_rel_type ON kg_relationships(relationship_type);
      CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(entity_type);
    `,
  },
];

module.exports = { migrations };
