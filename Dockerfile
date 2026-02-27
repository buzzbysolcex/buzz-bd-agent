FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent v6.0.5 — 7 Sub-Agent Architecture on Akash Network"
LABEL version="6.0.5"
LABEL openclaw.version="2026.2.26"

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git jq \
    && rm -rf /var/lib/apt/lists/*

# OpenClaw runtime (Indonesia Sprint version)
RUN npm install -g openclaw@2026.2.26

# Bankr CLI (for bankr-signals + error-handling + deploy ops)
RUN npm install -g @bankr/cli || echo "[docker] bankr/cli install optional — continuing"

# Directory structure
RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/pipeline \
    && mkdir -p /data/bankr/deploys \
    && mkdir -p /data/logs \
    && mkdir -p /data/outreach/drafts \
    && mkdir -p /data/atv \
    && mkdir -p /data/.npm-global \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-config

# Copy ALL skills (baked into image — survive redeployments)
COPY skills/ /opt/buzz-skills/

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ports: OpenClaw gateway + ClawRouter proxy
EXPOSE 18789 8402

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
