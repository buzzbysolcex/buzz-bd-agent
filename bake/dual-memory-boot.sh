#!/bin/bash
# Dual Memory Boot Script — Honcho + Supermemory
# Runs after OpenClaw gateway starts (30s delay)
# Persists across container restarts via /data/ volume

sleep 30
n# Generate credentials from env vars on every boot
[ -f /data/credential-gen.sh ] && bash /data/credential-gen.sh
echo "[dual-memory] $(date -u) Starting dual-memory boot..."

STOCK=/usr/local/lib/node_modules/openclaw/extensions

# 1. Install Supermemory plugin if missing
if [ ! -f /data/.openclaw/extensions/openclaw-supermemory/openclaw.plugin.json ]; then
  echo "[dual-memory] Installing Supermemory plugin..."
  mkdir -p /data/.openclaw/extensions/openclaw-supermemory
  cd /tmp && npm pack @supermemory/openclaw-supermemory 2>/dev/null
  tar xzf supermemory-openclaw-supermemory-*.tgz -C /data/.openclaw/extensions/openclaw-supermemory --strip-components=1 2>/dev/null
  cd /data/.openclaw/extensions/openclaw-supermemory && npm install --production 2>/dev/null
  echo "[dual-memory] Supermemory plugin installed"
fi

# 2. Install Honcho plugin if missing
if [ ! -f /data/.openclaw/extensions/openclaw-honcho/openclaw.plugin.json ]; then
  echo "[dual-memory] Installing Honcho plugin..."
  mkdir -p /data/.openclaw/extensions/openclaw-honcho
  cd /tmp && npm pack @honcho-ai/openclaw-honcho 2>/dev/null
  tar xzf honcho-ai-openclaw-honcho-*.tgz -C /data/.openclaw/extensions/openclaw-honcho --strip-components=1 2>/dev/null
  cd /data/.openclaw/extensions/openclaw-honcho && npm install --production 2>/dev/null
  echo "[dual-memory] Honcho plugin installed"
fi

# 3. Copy plugins into stock extensions dir (survives gateway restarts)
if [ -d /data/.openclaw/extensions/openclaw-honcho ]; then
  cp -r /data/.openclaw/extensions/openclaw-honcho $STOCK/openclaw-honcho 2>/dev/null
fi
if [ -d /data/.openclaw/extensions/openclaw-supermemory ]; then
  cp -r /data/.openclaw/extensions/openclaw-supermemory $STOCK/openclaw-supermemory 2>/dev/null
fi

# 4. Change Honcho plugin kind to "tools" in manifest to allow dual loading
# (OpenClaw enforces exclusive "memory" slot)
node -e '
const fs = require("fs");
const f = "'$STOCK'/openclaw-honcho/openclaw.plugin.json";
try {
  const p = JSON.parse(fs.readFileSync(f, "utf8"));
  p.kind = "tools";
  fs.writeFileSync(f, JSON.stringify(p, null, 2));
} catch(e) {}
'

# 5. Patch openclaw.json with dual-memory config
node -e '
const fs = require("fs");
const f = "/data/.openclaw/openclaw.json";
try {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));

  if (!j.plugins) j.plugins = {};
  const existing = j.plugins.allow || [];
  j.plugins.allow = [...new Set([...existing, "openclaw-supermemory", "openclaw-honcho", "telegram"])];

  if (!j.pluginConfig) j.pluginConfig = {};
  j.pluginConfig["openclaw-honcho"] = {
    baseUrl: "http://127.0.0.1:8000",
    workspaceId: "buzz-bd",
    apiKey: "local-no-auth"
  };
  j.pluginConfig["openclaw-supermemory"] = {
    autoRecall: true, autoCapture: true, maxRecallResults: 10, profileFrequency: 10,
    captureMode: "all", enableCustomContainerTags: true,
    customContainers: [
      {tag: "bd-scans", description: "BD scan results, company profiles, market analysis"},
      {tag: "token-patterns", description: "Token launch patterns, price movements, trading signals"},
      {tag: "bags-intelligence", description: "Bags.fm portfolio data, token holdings, PnL tracking"},
      {tag: "operator", description: "System instructions, operator preferences, workflow configs"}
    ],
    customContainerInstructions: "Route by type: BD scans -> bd-scans. Token data -> token-patterns. Bags.fm -> bags-intelligence. System config -> operator."
  };

  if (j.channels && j.channels.telegram) {
    j.channels.telegram.dmPolicy = "open";
    j.channels.telegram.groupPolicy = "open";
    j.channels.telegram.allowFrom = ["*"];
    j.channels.telegram.groupAllowFrom = ["*"];
  }

  fs.writeFileSync(f, JSON.stringify(j, null, 2));
  console.log("[dual-memory] Config patched OK");
} catch (e) {
  console.error("[dual-memory] Error:", e.message);
}
'

echo "[dual-memory] $(date -u) Dual-memory boot complete"
