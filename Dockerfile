FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="6.1.0"
LABEL openclaw.version="2026.3.1"

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git jq \
    && rm -rf /var/lib/apt/lists/*

# OpenClaw v2026.3.1 — Telegram DM topics, sub-agent typed events,
# cron light-context, health endpoints, thinking fallback, chunking fix
RUN npm install -g openclaw@2026.3.1

# Bankr CLI for token deploys
RUN npm install -g @bankr/cli || true

RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory/pipeline \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/.npm-global \
    && mkdir -p /data/pipeline \
    && mkdir -p /data/bankr/deploys \
    && mkdir -p /data/logs \
    && mkdir -p /data/outreach/drafts \
    && mkdir -p /data/atv \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-workspace-init \
    && mkdir -p /opt/buzz-scripts \
    && mkdir -p /opt/buzz-config

COPY skills/ /opt/buzz-skills/
COPY workspace-init/ /opt/buzz-workspace-init/
COPY twitter-bot.js /opt/buzz-scripts/twitter-bot.js
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 18789

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
