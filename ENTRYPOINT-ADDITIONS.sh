#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Entrypoint Additions for Buzz v7.0 — Strategic Orchestrator
# 
# ADD these blocks to your existing entrypoint.sh
# Place them AFTER the REST API startup and BEFORE the gateway exec
# ═══════════════════════════════════════════════════════════════

# ─── v7.0: Sync Strategic Config to Persistent Storage ───
echo "[v7.0] Syncing strategic config..."

# Copy config files to persistent storage (if not already there)
if [ -d /opt/buzz-config ]; then
  mkdir -p /data/buzz-config
  cp -n /opt/buzz-config/* /data/buzz-config/ 2>/dev/null
  echo "  ✅ Config synced to /data/buzz-config/"
else
  echo "  ⚠️  /opt/buzz-config not found in image"
fi

# Copy enhanced prompts to workspace skills
if [ -d /opt/buzz-prompts ]; then
  mkdir -p /data/workspace/skills/prompts
  cp -f /opt/buzz-prompts/*.md /data/workspace/skills/prompts/ 2>/dev/null
  echo "  ✅ Enhanced prompts synced to /data/workspace/skills/prompts/"
else
  echo "  ⚠️  /opt/buzz-prompts not found in image"
fi

# Set BUZZ_CONFIG_DIR environment variable for the engines
export BUZZ_CONFIG_DIR=/data/buzz-config

# ─── v7.0: Run Migration 010 if needed ───
echo "[v7.0] Checking database migrations..."

if [ -f /opt/buzz-api/migrations/010-strategic.js ]; then
  # Check if strategic_decisions table exists
  TABLE_CHECK=$(sqlite3 /data/buzz-api/buzz.db "SELECT name FROM sqlite_master WHERE type='table' AND name='strategic_decisions';" 2>/dev/null)
  
  if [ -z "$TABLE_CHECK" ]; then
    echo "  🔧 Running migration 010 (Strategic Orchestrator tables)..."
    node -e "
      const Database = require('better-sqlite3');
      const migration = require('/opt/buzz-api/migrations/010-strategic');
      const db = new Database('/data/buzz-api/buzz.db');
      db.pragma('journal_mode = WAL');
      migration.up(db);
      db.close();
      console.log('  ✅ Migration 010 complete');
    " 2>&1
  else
    echo "  ✅ Migration 010 already applied"
  fi
fi

# ─── v7.0: Seed Decision Rules to DB ───
echo "[v7.0] Syncing decision rules to database..."
if [ -f /data/buzz-config/decision-rules.json ]; then
  node -e "
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const db = new Database('/data/buzz-api/buzz.db');
    db.pragma('journal_mode = WAL');
    
    try {
      const config = JSON.parse(fs.readFileSync('/data/buzz-config/decision-rules.json', 'utf8'));
      const upsert = db.prepare(\`
        INSERT INTO decision_rules (id, name, priority, condition_json, action, playbook, description, auto_execute, escalate_to_ogie, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, priority=excluded.priority, condition_json=excluded.condition_json,
          action=excluded.action, playbook=excluded.playbook, description=excluded.description,
          auto_execute=excluded.auto_execute, escalate_to_ogie=excluded.escalate_to_ogie,
          enabled=excluded.enabled, updated_at=datetime('now')
      \`);
      
      const tx = db.transaction((rules) => {
        for (const r of rules) {
          upsert.run(r.id, r.name, r.priority || 5, JSON.stringify(r.condition), r.action,
            r.playbook || null, r.description || null, r.auto_execute ? 1 : 0,
            r.escalate_to_ogie ? 1 : 0, 1);
        }
      });
      
      tx(config.rules);
      console.log('  ✅ ' + config.rules.length + ' decision rules synced');
    } catch(e) {
      console.error('  ⚠️  Rule sync failed: ' + e.message);
    }
    db.close();
  " 2>&1
fi

# ─── v7.0: Boot Banner ───
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  🐝 Buzz BD Agent v7.0 — Strategic Orchestrator LIVE"
echo "  Decision Engine: $(ls /data/buzz-config/decision-rules.json 2>/dev/null && echo '✅' || echo '❌')"
echo "  Playbook Engine: PB-001 through PB-004 ready"
echo "  Context Engine:  Config at /data/buzz-config/"
echo "  Enhanced Prompts: $(ls /data/workspace/skills/prompts/*.md 2>/dev/null | wc -l) loaded"
echo "  REST API: 72 endpoints (64 existing + 8 strategy)"
echo "═══════════════════════════════════════════════════════"
echo ""
