FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="8.1.0"
LABEL features="Opus Brain, Express Cron Executor, 39+ crons, dual-gate scoring, 135 endpoints, AIBTC + Moltbook presence"

# ══════════════════════════════════════════════════
# SYSTEM DEPENDENCIES
# ══════════════════════════════════════════════════
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git jq python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*

# ══════════════════════════════════════════════════
# GLOBAL NPM PACKAGES
# ══════════════════════════════════════════════════
# OpenClaw REMOVED (v8.1.0 — Opus Brain replaces all LLM orchestration)
RUN npm install -g @bankr/cli \
    && npm install -g tsx \
    && npm install -g @bnb-chain/mcp \
    && npm install -g helius-mcp \
    && npm install -g nansen-cli

# ══════════════════════════════════════════════════
# BINANCE + CMC AI SKILLS (OpenClaw Skills Hub)
# ══════════════════════════════════════════════════
RUN npx skills add binance/binance-skills-hub 2>/dev/null || echo "Binance skills: will install at runtime"
RUN npx clawhub@latest install cmc-api-exchange 2>/dev/null || echo "CMC skills: will install at runtime"
RUN npx skills add bitget/bitget-skill 2>/dev/null || echo "Bitget skills: will install at runtime"
RUN npm install -g bitget-client 2>/dev/null || echo "Bitget CLI: will install at runtime"

# Solana 8004 SDK (install separately — large dependency tree)
RUN npm install -g 8004-solana @solana/web3.js 2>/dev/null || echo "⚠️ 8004-solana install failed — will install at runtime"

# AgentProof SDK (Python package, not npm)
RUN pip install agentproof --break-system-packages 2>/dev/null || true

# ══════════════════════════════════════════════════
# DIRECTORY STRUCTURE
# ══════════════════════════════════════════════════
RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/.npm-global \
    && mkdir -p /data/logs \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-config \
    && mkdir -p /opt/buzz-prompts \
    && mkdir -p /opt/buzz-api \
    && mkdir -p /opt/buzz-acp

# ══════════════════════════════════════════════════
# COPY SKILLS (baked into image)
# ══════════════════════════════════════════════════
# Original skills from repo
COPY skills/ /opt/buzz-skills/

# All workspace skills exported from live container (orchestrator, pipeline-scan, 
# twitter-poster, bankr, bankr-partner, bankr-signals, atv-batch, 
# buzz-scan-formatter, content-filter, data-failover, master-ops, quillshield, etc.)
COPY bake/skills/ /opt/buzz-workspace-skills/

# ══════════════════════════════════════════════════
# BAKE: Cron schedule (38+ jobs), memory, pipeline data
# ══════════════════════════════════════════════════
COPY bake/memory/ /opt/buzz-memory/

# Persistent directive (repo-managed)
COPY memory/ /opt/buzz-memory-repo/
COPY bake/cron/ /opt/buzz-cron/

# ══════════════════════════════════════════════════
# BAKE: Twitter Bot v3.0 config & data
# ══════════════════════════════════════════════════
COPY bake/twitter-bot/ /opt/buzz-twitter-bot/

# Config reference
COPY bake/config/ /opt/buzz-config/

# ══════════════════════════════════════════════════
# v7.0: Strategic Orchestrator config, prompts, skills
# ══════════════════════════════════════════════════
COPY config/ /opt/buzz-config/
COPY prompts/ /opt/buzz-prompts/
COPY skills/cost-guard/ /opt/buzz-workspace-skills/cost-guard/
COPY skills/agent-contexts/ /opt/buzz-workspace-skills/agent-contexts/
COPY skills/notification-filter/ /opt/buzz-workspace-skills/notification-filter/

# ══════════════════════════════════════════════════
# REST API — Express + SQLite (baked into image)
# ══════════════════════════════════════════════════
COPY api/ /opt/buzz-api/
WORKDIR /opt/buzz-api
RUN npm install --production --build-from-source
WORKDIR /

# ══════════════════════════════════════════════════
# ACP SKILL — Virtuals Protocol Agent Commerce
# Clone openclaw-acp and install dependencies
# ══════════════════════════════════════════════════
RUN git clone --depth 1 https://github.com/Virtual-Protocol/openclaw-acp.git /opt/buzz-acp/openclaw-acp \
    && cd /opt/buzz-acp/openclaw-acp \
    && npm install --production --ignore-scripts \
    && npx tsc --skipLibCheck 2>/dev/null || true

# Copy ACP service offerings (our 4 services)
COPY acp/offerings/ /opt/buzz-acp/offerings/

# Copy ACP config template (populated at runtime from env vars)
COPY acp/config.json.template /opt/buzz-acp/config.json.template

# Copy ACP auto-start script
COPY acp/start-acp.sh /opt/buzz-acp/start-acp.sh
RUN chmod +x /opt/buzz-acp/start-acp.sh

# ══════════════════════════════════════════════════
# ENTRYPOINT
# ══════════════════════════════════════════════════
COPY entrypoint.sh /entrypoint.sh
COPY BUZZ_RULES.md /opt/BUZZ_RULES.md
RUN chmod +x /entrypoint.sh

# ══════════════════════════════════════════════════
# PORTS
# ══════════════════════════════════════════════════
# 3000 = REST API (OpenClaw 18789 REMOVED in v8.1.0)
EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
