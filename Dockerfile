FROM node:22-slim

LABEL maintainer="Ogie @ SolCex Exchange"
LABEL description="Buzz BD Agent — Autonomous AI Business Development on Akash Network"
LABEL version="5.3.2"
LABEL openclaw.version="2026.2.19"
LABEL clawrouter.version="0.9.39"

RUN apt-get update && apt-get install -y --no-install-recommends \
    tini curl ca-certificates git jq \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@2026.2.19

RUN mkdir -p /data/.openclaw \
    && mkdir -p /data/workspace/memory \
    && mkdir -p /data/workspace/skills \
    && mkdir -p /data/.npm-global \
    && mkdir -p /opt/buzz-skills \
    && mkdir -p /opt/buzz-config \
    && mkdir -p /opt/buzz-clawrouter

RUN mkdir -p /tmp/clawrouter-install/.openclaw && \
    HOME=/tmp/clawrouter-install openclaw plugins install @blockrun/clawrouter && \
    cp -r /tmp/clawrouter-install/.openclaw/extensions/clawrouter /opt/buzz-clawrouter/ && \
    rm -rf /tmp/clawrouter-install && \
    echo "[docker] ClawRouter pre-installed"

COPY skills/ /opt/buzz-skills/
COPY openclaw.json.template /opt/buzz-config/openclaw.json.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 18789

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
