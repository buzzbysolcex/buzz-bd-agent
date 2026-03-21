/**
 * Knowledge Graph Routes
 * 5 endpoints for entity/relationship browsing and graph intelligence
 *
 * GET /entities           — list entities (paginated, filterable by type)
 * GET /entity/:id         — single entity + all relationships
 * GET /connections/:address — graph connections for a token address
 * GET /shared-deployers   — deployers linked to >1 project
 * GET /stats              — entity/relationship counts
 */

const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const {
  queryConnections,
  getRelationshipScore,
  getStats,
  buildGraphForToken,
  makeEntityId,
} = require('../lib/knowledge-graph');

// GET /kg/entities — list all entities, paginated
router.get('/entities', (req, res) => {
  try {
    const db = getDB();
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type || null;

    let rows, total;
    if (type) {
      rows = db.prepare(
        'SELECT * FROM kg_entities WHERE entity_type = ? ORDER BY last_updated DESC LIMIT ? OFFSET ?'
      ).all(type, limit, offset);
      total = db.prepare(
        'SELECT COUNT(*) as count FROM kg_entities WHERE entity_type = ?'
      ).get(type).count;
    } else {
      rows = db.prepare(
        'SELECT * FROM kg_entities ORDER BY last_updated DESC LIMIT ? OFFSET ?'
      ).all(limit, offset);
      total = db.prepare('SELECT COUNT(*) as count FROM kg_entities').get().count;
    }

    // Parse metadata_json for each entity
    const entities = rows.map(r => ({
      ...r,
      metadata: safeParseJson(r.metadata_json),
    }));

    res.json({ success: true, total, limit, offset, entities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kg/entity/:id — single entity + relationships
router.get('/entity/:id', (req, res) => {
  try {
    const db = getDB();
    const entityId = req.params.id;

    const entity = db.prepare('SELECT * FROM kg_entities WHERE entity_id = ?').get(entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entity not found', code: 'ENTITY_NOT_FOUND' });
    }

    // Get all relationships where this entity is source or target
    const asSource = db.prepare(`
      SELECT r.*, e.name as target_name, e.entity_type as target_type
      FROM kg_relationships r
      JOIN kg_entities e ON e.entity_id = r.target_entity_id
      WHERE r.source_entity_id = ?
    `).all(entityId);

    const asTarget = db.prepare(`
      SELECT r.*, e.name as source_name, e.entity_type as source_type
      FROM kg_relationships r
      JOIN kg_entities e ON e.entity_id = r.source_entity_id
      WHERE r.target_entity_id = ?
    `).all(entityId);

    res.json({
      success: true,
      entity: {
        ...entity,
        metadata: safeParseJson(entity.metadata_json),
      },
      relationships: {
        outgoing: asSource.map(r => ({ ...r, evidence: safeParseJson(r.evidence_json) })),
        incoming: asTarget.map(r => ({ ...r, evidence: safeParseJson(r.evidence_json) })),
      },
      total_connections: asSource.length + asTarget.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kg/connections/:address — graph connections for a token address
router.get('/connections/:address', (req, res) => {
  try {
    const address = req.params.address;
    const depth = Math.min(parseInt(req.query.depth) || 2, 4);
    const buildFirst = req.query.build === 'true';

    // Optionally build the graph first (on-demand)
    if (buildFirst) {
      buildGraphForToken(address);
    }

    // Find the project entity for this address
    const db = getDB();
    const entities = db.prepare(`
      SELECT * FROM kg_entities
      WHERE entity_type = 'project'
        AND metadata_json LIKE ?
    `).all(`%${address}%`);

    if (!entities.length) {
      return res.json({
        success: true,
        address,
        message: 'No graph data for this token. Use ?build=true to build on demand.',
        graph: { entities: [], relationships: [] },
        score: null,
      });
    }

    const project = entities[0];
    const graph = queryConnections(project.entity_id, depth);
    const score = getRelationshipScore(address);

    // Parse JSON fields for cleaner output
    graph.entities = graph.entities.map(e => ({
      ...e,
      metadata: safeParseJson(e.metadata_json),
    }));
    graph.relationships = graph.relationships.map(r => ({
      ...r,
      evidence: safeParseJson(r.evidence_json),
    }));

    res.json({
      success: true,
      address,
      project_entity: project.entity_id,
      graph,
      score,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kg/shared-deployers — deployers with >1 project
router.get('/shared-deployers', (req, res) => {
  try {
    const db = getDB();

    const deployers = db.prepare(`
      SELECT
        e.entity_id,
        e.name,
        e.metadata_json,
        COUNT(r.rel_id) as project_count,
        GROUP_CONCAT(r.source_entity_id, ',') as project_ids
      FROM kg_entities e
      JOIN kg_relationships r ON r.target_entity_id = e.entity_id
        AND r.relationship_type = 'deployed_by'
      WHERE e.entity_type = 'deployer'
      GROUP BY e.entity_id
      HAVING project_count > 1
      ORDER BY project_count DESC
    `).all();

    // Enrich with project names
    const enriched = deployers.map(d => {
      const projectIds = d.project_ids.split(',');
      const projects = [];
      const stmt = db.prepare('SELECT entity_id, name, metadata_json FROM kg_entities WHERE entity_id = ?');
      for (const pid of projectIds) {
        const p = stmt.get(pid);
        if (p) {
          projects.push({
            entity_id: p.entity_id,
            name: p.name,
            metadata: safeParseJson(p.metadata_json),
          });
        }
      }
      return {
        deployer_id: d.entity_id,
        deployer_address: d.name,
        metadata: safeParseJson(d.metadata_json),
        project_count: d.project_count,
        projects,
      };
    });

    res.json({
      success: true,
      total: enriched.length,
      shared_deployers: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /kg/stats — entity and relationship counts
router.get('/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Helpers ──────────────────────────────────────────

function safeParseJson(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

module.exports = router;
