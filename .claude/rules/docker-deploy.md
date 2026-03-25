---
paths: ["Dockerfile", "docker-compose*", ".github/workflows/*", "entrypoint*"]
---
# Docker & Deploy Rules
- ah-managed containers ONLY — never docker run on port 3000
- Docker image: buzzbd/buzz-bd-agent on Docker Hub
- CI/CD: push main → GitHub Actions → Docker Hub → Hetzner SSH → ah restart
- NEVER hot-patch production containers
- Test locally before push. Sentinel GREEN = only deploy truth.
- Prune old images periodically: docker image prune -a
- Bot restart cycle ~45min — no setInterval > 15min
