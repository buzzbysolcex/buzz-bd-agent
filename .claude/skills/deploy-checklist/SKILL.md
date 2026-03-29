# Deploy Checklist

## Pre-Deploy
1. git status — working tree must be clean
2. Check for secrets: grep -rn 'API_KEY\|PRIVATE_KEY\|fc-c1fe0fd8' --include='*.js' .
3. Verify .env is in .gitignore
4. Run health check: curl localhost:3000/api/v1/health

## Deploy
1. git add -A
2. git commit -m "feat/fix/chore: [description]"
3. git push origin main
4. CI/CD auto-triggers (GitHub Actions -> Hetzner)
5. Wait for green check on GitHub Actions

## Post-Deploy
1. Verify endpoints: curl api.buzzbd.ai/api/v1/health
2. Verify ARIA: curl api.buzzbd.ai/api/v1/aria/status
3. Verify /agent: curl api.buzzbd.ai/agent
4. Check Sentinel status
5. Report to War Room: "Deploy #[N] complete. [summary]"
