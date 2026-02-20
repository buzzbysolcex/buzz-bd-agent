FROM openclaw/openclaw:v2026.2.19

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="5.2.0"
LABEL openclaw.version="2026.2.19"
LABEL org.opencontainers.image.source="https://github.com/buzzbysolcex/buzz-bd-agent"

# Pre-install plugins (baked in = faster boot, no npm dependency at runtime)
RUN npm install -g @openclaw/eliza-adapter \
    && npm install -g @buzzbd/plugin-solcex-bd@1.0.0 \
    && echo "Plugins installed successfully"

# Create required directories
RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/.npm-global

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Gateway port
EXPOSE 18789

# tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
