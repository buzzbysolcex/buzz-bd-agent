# ═══════════════════════════════════════════════════════════════
# Dockerfile Changes for Buzz v7.0 — Strategic Orchestrator
# 
# These are the ADDITIONS to the existing Dockerfile.
# Apply these changes to your existing ~/buzz-bd-agent/Dockerfile
# ═══════════════════════════════════════════════════════════════

# ─── ADD AFTER existing COPY commands ───
# (After: COPY skills/ /opt/buzz-skills/)

# v7.0: Strategic Orchestrator config files
COPY config/ /opt/buzz-config/

# v7.0: Enhanced sub-agent prompts
COPY prompts/ /opt/buzz-prompts/

# v7.0: Strategic orchestrator module + tests
# (api/ directory is already copied — these files go inside it)
# The api/lib/, api/routes/, api/migrations/ directories 
# are included when you COPY api/ /opt/buzz-api/


# ─── FULL DOCKERFILE REFERENCE (v7.0) ───
# Below is the complete Dockerfile structure for reference.
# Your existing Dockerfile should be very similar — just add the
# two new COPY lines for config/ and prompts/.

# FROM node:22-slim
# 
# RUN apt-get update && apt-get install -y \
#   tini curl ca-certificates git jq python3 make g++ \
#   build-essential libopus-dev \
#   && rm -rf /var/lib/apt/lists/*
# 
# RUN npm install -g openclaw@2026.3.1
# 
# # Create directories
# RUN mkdir -p /data/.openclaw /data/workspace/skills \
#   /data/workspace/memory /data/workspace/memory/pipeline \
#   /data/workspace/memory/receipts /data/workspace/twitter-bot \
#   /data/logs /data/buzz-api \
#   /opt/buzz-skills /opt/buzz-config /opt/buzz-prompts \
#   /opt/buzz-workspace-init /opt/buzz-api /opt/buzz-acp \
#   /opt/buzz-twitter-bot /opt/buzz-cron
# 
# # Brain files (seeded on first boot)
# COPY workspace-init/ /opt/buzz-workspace-init/
# 
# # Skills baked into image
# COPY skills/ /opt/buzz-workspace-skills/
# 
# # REST API (with v7.0 strategic modules)
# COPY api/ /opt/buzz-api/
# 
# # v7.0: Strategic Orchestrator config
# COPY config/ /opt/buzz-config/
# 
# # v7.0: Enhanced sub-agent prompts
# COPY prompts/ /opt/buzz-prompts/
# 
# # Twitter Bot
# COPY twitter-bot/ /opt/buzz-twitter-bot/
# 
# # ACP skill
# COPY acp/ /opt/buzz-acp/
# 
# # Cron jobs
# COPY cron/ /opt/buzz-cron/
# 
# # Entrypoint
# COPY entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh
# 
# # Install API dependencies (Linux native — NOT Mac cached!)
# WORKDIR /opt/buzz-api
# RUN npm install --production --build-from-source
# 
# WORKDIR /
# EXPOSE 18789 3000
# ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
