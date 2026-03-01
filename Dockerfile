FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="6.0.15"
LABEL openclaw.version="2026.2.26"

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git jq \
    && rm -rf /var/lib/apt/lists/*

# OpenClaw + Bankr CLI (no ClawRouter)
RUN npm install -g openclaw@2026.2.26 @bankr/cli

RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/.npm-global \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-config

COPY skills/ /opt/buzz-skills/
COPY openclaw.json.template /opt/buzz-config/openclaw.json.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 18789

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
