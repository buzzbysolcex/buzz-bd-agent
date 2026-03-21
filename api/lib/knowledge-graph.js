/**
 * Knowledge Graph Layer
 * Entity-relationship intelligence for pipeline tokens
 *
 * Extracts entities (projects, chains, deployers, VCs) from pipeline data,
 * builds relationships, and computes graph-based risk/quality scores.
 *
 * Used by: /api/v1/kg/* routes, cron sweeps, on-demand scoring
 */

const crypto = require('crypto');
const { getDB } = require('../db');

// ─── Helpers ──────────────────────────────────────────

/**
 * Generate a deterministic entity ID from type + name
 * @param {string} type - Entity type (project, chain, deployer, etc.)
 * @param {string} name - Entity name or identifier
 * @returns {string} 16-char hex hash
 */
function makeEntityId(type, name) {
  return crypto.createHash('sha256').update(type + ':' + name).digest('hex').slice(0, 16);
}

/**
 * Safely parse a JSON string, returning fallback on failure
 * @param {string} str - JSON string
 * @param {*} fallback - Default value
 * @returns {*}
 */
function safeParse(str, fallback = {}) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ─── Entity Extraction ────────────────────────────────

/**
 * Extract entities from a pipeline_tokens row
 * @param {object} tokenData - Row from pipeline_tokens table
 * @returns {Array<object>} Array of entity objects ready for upsert
 */
function extractEntities(tokenData) {
  const entities = [];

  // 1. Project entity (from ticker/name)
  const projectName = tokenData.ticker || tokenData.name || tokenData.address;
  const projectId = makeEntityId('project', projectName);
  entities.push({
    entity_id: projectId,
    entity_type: 'project',
    name: projectName,
    metadata_json: JSON.stringify({
      address: tokenData.address,
      chain: tokenData.chain,
      ticker: tokenData.ticker,
      full_name: tokenData.name,
      stage: tokenData.stage,
      score: tokenData.score,
      source: tokenData.source,
    }),
  });

  // 2. Chain entity
  if (tokenData.chain) {
    const chainId = makeEntityId('chain', tokenData.chain.toLowerCase());
    entities.push({
      entity_id: chainId,
      entity_type: 'chain',
      name: tokenData.chain.toLowerCase(),
      metadata_json: JSON.stringify({ chain: tokenData.chain.toLowerCase() }),
    });
  }

  // 3. Deployer entity (if available in score_breakdown or notes metadata)
  const breakdown = safeParse(tokenData.score_breakdown, null);
  const deployer = breakdown?.deployer || breakdown?.deployer_address || null;
  if (deployer) {
    const deployerId = makeEntityId('deployer', deployer);
    entities.push({
      entity_id: deployerId,
      entity_type: 'deployer',
      name: deployer,
      metadata_json: JSON.stringify({
        address: deployer,
        chain: tokenData.chain,
      }),
    });
  }

  // 4. VC/backer entities (if available in metadata)
  const backers = breakdown?.backers || breakdown?.investors || [];
  if (Array.isArray(backers)) {
    for (const backer of backers) {
      const backerName = typeof backer === 'string' ? backer : backer.name;
      if (!backerName) continue;
      const backerId = makeEntityId('vc', backerName);
      entities.push({
        entity_id: backerId,
        entity_type: 'vc',
        name: backerName,
        metadata_json: JSON.stringify({ vc_name: backerName }),
      });
    }
  }

  return entities;
}

// ─── Relationship Building ────────────────────────────

/**
 * Build relationships between extracted entities for a token
 * Checks for shared deployers across the existing graph
 * @param {Array<object>} entities - Entities extracted from extractEntities()
 * @param {string} tokenAddress - The pipeline token address
 * @returns {Array<object>} Array of relationship objects ready for upsert
 */
function buildRelationships(entities, tokenAddress) {
  const db = getDB();
  const relationships = [];

  const project = entities.find(e => e.entity_type === 'project');
  if (!project) return relationships;

  const chain = entities.find(e => e.entity_type === 'chain');
  const deployer = entities.find(e => e.entity_type === 'deployer');
  const vcs = entities.filter(e => e.entity_type === 'vc');

  // Project -> Chain (same_chain)
  if (chain) {
    relationships.push({
      source_entity_id: project.entity_id,
      target_entity_id: chain.entity_id,
      relationship_type: 'same_chain',
      confidence: 1.0,
      evidence_json: JSON.stringify({ token_address: tokenAddress }),
    });
  }

  // Project -> Deployer (deployed_by)
  if (deployer) {
    relationships.push({
      source_entity_id: project.entity_id,
      target_entity_id: deployer.entity_id,
      relationship_type: 'deployed_by',
      confidence: 0.95,
      evidence_json: JSON.stringify({ token_address: tokenAddress }),
    });

    // Check for shared deployers — other projects with the same deployer
    try {
      const existingProjects = db.prepare(`
        SELECT r.source_entity_id, e.name
        FROM kg_relationships r
        JOIN kg_entities e ON e.entity_id = r.source_entity_id
        WHERE r.target_entity_id = ?
          AND r.relationship_type = 'deployed_by'
          AND r.source_entity_id != ?
      `).all(deployer.entity_id, project.entity_id);

      for (const other of existingProjects) {
        relationships.push({
          source_entity_id: project.entity_id,
          target_entity_id: other.source_entity_id,
          relationship_type: 'shares_deployer',
          confidence: 0.9,
          evidence_json: JSON.stringify({
            deployer: deployer.name,
            token_address: tokenAddress,
          }),
        });
      }
    } catch (e) { /* table may not exist yet during first run */ }
  }

  // Project -> VC (backed_by)
  for (const vc of vcs) {
    relationships.push({
      source_entity_id: project.entity_id,
      target_entity_id: vc.entity_id,
      relationship_type: 'backed_by',
      confidence: 0.8,
      evidence_json: JSON.stringify({ token_address: tokenAddress }),
    });
  }

  return relationships;
}

// ─── Persistence ──────────────────────────────────────

/**
 * Upsert entities into kg_entities table
 * @param {Array<object>} entities
 */
function upsertEntities(entities) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO kg_entities (entity_id, entity_type, name, metadata_json, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);

  const tx = db.transaction((items) => {
    for (const e of items) {
      stmt.run(e.entity_id, e.entity_type, e.name, e.metadata_json || '{}');
    }
  });
  tx(entities);
}

/**
 * Upsert relationships into kg_relationships table
 * Uses INSERT OR IGNORE to avoid duplicates on the UNIQUE constraint
 * @param {Array<object>} relationships
 */
function upsertRelationships(relationships) {
  const db = getDB();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO kg_relationships
      (source_entity_id, target_entity_id, relationship_type, confidence, evidence_json)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((items) => {
    for (const r of items) {
      stmt.run(
        r.source_entity_id,
        r.target_entity_id,
        r.relationship_type,
        r.confidence || 0.8,
        r.evidence_json || '{}'
      );
    }
  });
  tx(relationships);
}

// ─── Graph Queries ────────────────────────────────────

/**
 * BFS traversal from an entity up to `depth` hops
 * @param {string} entityId - Starting entity ID
 * @param {number} depth - Max hops (default 2)
 * @returns {{ entities: Array, relationships: Array }}
 */
function queryConnections(entityId, depth = 2) {
  const db = getDB();
  const visitedEntities = new Set();
  const collectedRels = [];
  let frontier = [entityId];

  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const nextFrontier = [];
    for (const nodeId of frontier) {
      if (visitedEntities.has(nodeId)) continue;
      visitedEntities.add(nodeId);

      // Find all relationships where this entity is source or target
      const rels = db.prepare(`
        SELECT * FROM kg_relationships
        WHERE source_entity_id = ? OR target_entity_id = ?
      `).all(nodeId, nodeId);

      for (const rel of rels) {
        collectedRels.push(rel);
        const neighbor = rel.source_entity_id === nodeId
          ? rel.target_entity_id
          : rel.source_entity_id;
        if (!visitedEntities.has(neighbor)) {
          nextFrontier.push(neighbor);
        }
      }
    }
    frontier = nextFrontier;
  }

  // Collect remaining frontier nodes (visited but not yet added)
  for (const nodeId of frontier) {
    visitedEntities.add(nodeId);
  }

  // Fetch full entity records
  const entityIds = [...visitedEntities];
  const entities = [];
  const entityStmt = db.prepare('SELECT * FROM kg_entities WHERE entity_id = ?');
  for (const eid of entityIds) {
    const entity = entityStmt.get(eid);
    if (entity) entities.push(entity);
  }

  // Deduplicate relationships by rel_id
  const uniqueRels = [];
  const seenRelIds = new Set();
  for (const r of collectedRels) {
    if (!seenRelIds.has(r.rel_id)) {
      seenRelIds.add(r.rel_id);
      uniqueRels.push(r);
    }
  }

  return { entities, relationships: uniqueRels };
}

/**
 * Compute a graph-based relationship score for a token address
 * Checks deployer history, VC backing, shared deployers, risk flags
 * @param {string} tokenAddress - Token contract address
 * @returns {{ graph_score: number, connections: Array, risk_flags: Array }}
 */
function getRelationshipScore(tokenAddress) {
  const db = getDB();

  // Find the project entity for this token
  const entities = db.prepare(`
    SELECT * FROM kg_entities
    WHERE entity_type = 'project'
      AND metadata_json LIKE ?
  `).all(`%${tokenAddress}%`);

  if (!entities.length) {
    return { graph_score: 50, connections: [], risk_flags: ['no_graph_data'] };
  }

  const project = entities[0];
  const { entities: connected, relationships } = queryConnections(project.entity_id, 2);

  let score = 50; // Base score
  const connections = [];
  const riskFlags = [];

  // Analyze deployer connections
  const deployerRels = relationships.filter(r => r.relationship_type === 'deployed_by');
  for (const rel of deployerRels) {
    const deployerId = rel.target_entity_id;

    // Check if deployer has other successful listings (stage = listed or approved)
    const deployerProjects = db.prepare(`
      SELECT r.source_entity_id, e.metadata_json
      FROM kg_relationships r
      JOIN kg_entities e ON e.entity_id = r.source_entity_id
      WHERE r.target_entity_id = ?
        AND r.relationship_type = 'deployed_by'
        AND r.source_entity_id != ?
    `).all(deployerId, project.entity_id);

    for (const dp of deployerProjects) {
      const meta = safeParse(dp.metadata_json);
      if (meta.stage === 'listed' || meta.stage === 'approved') {
        score += 15;
        connections.push({ type: 'deployer_success', entity: dp.source_entity_id, stage: meta.stage });
      }
      if (meta.stage === 'rejected') {
        score -= 30;
        riskFlags.push(`deployer_rugged:${meta.ticker || dp.source_entity_id}`);
      }
    }
  }

  // Analyze VC backing
  const vcRels = relationships.filter(r => r.relationship_type === 'backed_by');
  for (const rel of vcRels) {
    const vc = connected.find(e => e.entity_id === rel.target_entity_id);
    if (vc) {
      score += 10;
      connections.push({ type: 'vc_backing', entity: vc.entity_id, name: vc.name });
    }
  }

  // Analyze shared deployer risk
  const sharedDeployerRels = relationships.filter(r => r.relationship_type === 'shares_deployer');
  if (sharedDeployerRels.length > 3) {
    riskFlags.push('serial_deployer');
    score -= 5;
  }

  // Clamp score to 0-100
  const graphScore = Math.max(0, Math.min(100, score));

  return {
    graph_score: graphScore,
    connections,
    risk_flags: riskFlags,
  };
}

// ─── Stats ────────────────────────────────────────────

/**
 * Get knowledge graph statistics
 * @returns {{ entity_counts: object, relationship_counts: object, total_entities: number, total_relationships: number }}
 */
function getStats() {
  const db = getDB();

  const entityCounts = db.prepare(`
    SELECT entity_type, COUNT(*) as count
    FROM kg_entities
    GROUP BY entity_type
  `).all();

  const relCounts = db.prepare(`
    SELECT relationship_type, COUNT(*) as count
    FROM kg_relationships
    GROUP BY relationship_type
  `).all();

  const totalEntities = db.prepare('SELECT COUNT(*) as count FROM kg_entities').get();
  const totalRels = db.prepare('SELECT COUNT(*) as count FROM kg_relationships').get();

  return {
    total_entities: totalEntities.count,
    total_relationships: totalRels.count,
    entity_counts: entityCounts.reduce((acc, r) => { acc[r.entity_type] = r.count; return acc; }, {}),
    relationship_counts: relCounts.reduce((acc, r) => { acc[r.relationship_type] = r.count; return acc; }, {}),
  };
}

// ─── Orchestrator ─────────────────────────────────────

/**
 * Build the full knowledge graph for a single token
 * Looks up token in pipeline_tokens, extracts entities, builds relationships, upserts all
 * @param {string} tokenAddress - Token contract address
 * @returns {{ entities_count: number, relationships_count: number, entity_ids: string[] }}
 */
function buildGraphForToken(tokenAddress) {
  const db = getDB();

  // Look up token in pipeline
  const token = db.prepare(`
    SELECT * FROM pipeline_tokens WHERE address = ?
  `).get(tokenAddress);

  if (!token) {
    return { entities_count: 0, relationships_count: 0, entity_ids: [], error: 'Token not found in pipeline' };
  }

  // Extract entities from token data
  const entities = extractEntities(token);

  // Build relationships (includes shared deployer detection)
  const relationships = buildRelationships(entities, tokenAddress);

  // Persist
  upsertEntities(entities);
  upsertRelationships(relationships);

  return {
    entities_count: entities.length,
    relationships_count: relationships.length,
    entity_ids: entities.map(e => e.entity_id),
  };
}

module.exports = {
  makeEntityId,
  extractEntities,
  buildRelationships,
  upsertEntities,
  upsertRelationships,
  queryConnections,
  getRelationshipScore,
  getStats,
  buildGraphForToken,
};
