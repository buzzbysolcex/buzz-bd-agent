FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="5.2.0"
LABEL openclaw.version="2026.2.19"

# Install tini for proper signal handling + basic tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

# Install OpenClaw globally (includes bundled plugins)
RUN npm install -g openclaw@2026.2.19

# Create required directories
RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/.npm-global \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-config

# Copy skills (ClawRouter + QuillShield)
COPY skills/ /opt/buzz-skills/

# Copy config template
COPY openclaw.json.template /opt/buzz-config/openclaw.json.template

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Gateway port
EXPOSE 18789

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
