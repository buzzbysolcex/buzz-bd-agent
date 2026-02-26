#!/bin/bash
# ═══════════════════════════════════════════════════════
# BUZZ v5.3.8 LOCAL TEST SUITE
# Run on Mac BEFORE Docker build
# Usage: cd ~/buzz-bd-agent && bash test-v538.sh
# ═══════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════"
echo "  Buzz v5.3.8 Local Test Suite"
echo "═══════════════════════════════════════════════"
echo ""

PASS=0
FAIL=0

check() {
  if [ $1 -eq 0 ]; then
    echo "  ✅ PASS: $2"
    PASS=$((PASS + 1))
  else
    echo "  ❌ FAIL: $2"
    FAIL=$((FAIL + 1))
  fi
}

# ─── TEST 1: File Structure ───
echo "📁 TEST 1: File Structure"

[ -f "Dockerfile" ]
check $? "Dockerfile exists"

[ -f "entrypoint.sh" ]
check $? "entrypoint.sh exists"

[ -d "skills" ]
check $? "skills/ directory exists"

[ -d "modules" ]
check $? "modules/ directory exists"

[ -d "modules/bankr-deploy" ]
check $? "modules/bankr-deploy/ exists"

[ -f "modules/bankr-deploy/bankr-deploy.js" ]
check $? "bankr-deploy.js exists"

[ -d "workspace-init" ]
check $? "workspace-init/ directory exists"

[ -f "workspace-init/BOOT.md" ]
check $? "workspace-init/BOOT.md exists"

[ -f "workspace-init/memory/experience.json" ]
check $? "workspace-init/memory/experience.json exists"

[ -f "workspace-init/memory/pipeline/active.json" ]
check $? "workspace-init/memory/pipeline/active.json exists"

echo ""

# ─── TEST 2: Dockerfile Checks ───
echo "📦 TEST 2: Dockerfile"

grep -q "5.3.8" Dockerfile
check $? "Version label is 5.3.8"

grep -q "COPY skills/" Dockerfile
check $? "COPY skills/ present"

grep -q "COPY modules/" Dockerfile
check $? "COPY modules/ present"

grep -q "COPY workspace-init/" Dockerfile
check $? "COPY workspace-init/ present"

grep -q "COPY entrypoint.sh" Dockerfile
check $? "COPY entrypoint.sh present"

grep -q "tini" Dockerfile
check $? "tini process manager present"

echo ""

# ─── TEST 3: Entrypoint Checks ───
echo "⚙️  TEST 3: Entrypoint.sh"

grep -q "v5.3.8" entrypoint.sh
check $? "Version banner is v5.3.8"

grep -q "memoryFlush" entrypoint.sh
check $? "memoryFlush config present"

grep -q "reserveTokensFloor" entrypoint.sh
check $? "reserveTokensFloor present"

grep -q "session-memory" entrypoint.sh
check $? "session-memory hook present"

grep -q "boot-md" entrypoint.sh
check $? "boot-md hook present"

grep -q "buzz-modules" entrypoint.sh
check $? "Module sync present"

grep -q "buzz-workspace-init" entrypoint.sh
check $? "Workspace init sync present"

grep -q "BOOT.md" entrypoint.sh
check $? "BOOT.md check in self-check"

grep -q "DIRECTIVE" entrypoint.sh
check $? "DIRECTIVE check in self-check"

grep -q "experience.json" entrypoint.sh
check $? "experience.json check in self-check"

grep -q "pipeline" entrypoint.sh
check $? "pipeline check in self-check"

grep -q "BANKR_PARTNER_KEY" entrypoint.sh
check $? "BANKR_PARTNER_KEY env check"

grep -q "NODE_OPTIONS" entrypoint.sh
check $? "NODE_OPTIONS memory limit set"

echo ""

# ─── TEST 4: BOOT.md Content ───
echo "📋 TEST 4: BOOT.md Content"

grep -q "Buzz" workspace-init/BOOT.md
check $? "Buzz identity present"

grep -q "SolCex" workspace-init/BOOT.md
check $? "SolCex mission present"

grep -q "3 PILLARS" workspace-init/BOOT.md
check $? "3 Pillars defined"

grep -q "INBOUND" workspace-init/BOOT.md
check $? "Pillar 1 (Inbound) present"

grep -q "WARM OUTREACH" workspace-init/BOOT.md
check $? "Pillar 2 (Warm) present"

grep -q "PARTNERSHIPS" workspace-init/BOOT.md
check $? "Pillar 3 (Partnerships) present"

grep -q "CEX LISTING CHECK" workspace-init/BOOT.md
check $? "CEX listing check (PUNCH lesson)"

grep -q "CTO DETECTION" workspace-init/BOOT.md
check $? "CTO detection (PUNCH lesson)"

grep -q "VOLATILITY CHECK" workspace-init/BOOT.md
check $? "Volatility check (PUNCH lesson)"

grep -q "DIRECTIVE" workspace-init/BOOT.md
check $? "Points to DIRECTIVE file"

grep -q "experience.json" workspace-init/BOOT.md
check $? "Points to experience.json"

grep -q "Prayer" workspace-init/BOOT.md
check $? "Prayer schedule present"

grep -q "NEVER share" workspace-init/BOOT.md
check $? "Commission secrecy rule"

echo ""

# ─── TEST 5: Experience JSON ───
echo "🧠 TEST 5: Experience Engine Template"

python3 -c "import json; json.load(open('workspace-init/memory/experience.json'))" 2>/dev/null
check $? "experience.json is valid JSON"

grep -q "sourceHitRate" workspace-init/memory/experience.json
check $? "sourceHitRate tracking present"

grep -q "safetyPatterns" workspace-init/memory/experience.json
check $? "safetyPatterns tracking present"

grep -q "scoringAccuracy" workspace-init/memory/experience.json
check $? "scoringAccuracy tracking present"

grep -q "walletForensics" workspace-init/memory/experience.json
check $? "walletForensics tracking present"

grep -q "bankrDeploys" workspace-init/memory/experience.json
check $? "bankrDeploys tracking present"

grep -q "experienceLearnings" workspace-init/memory/experience.json
check $? "experienceLearnings array present"

echo ""

# ─── TEST 6: Pipeline JSON ───
echo "📊 TEST 6: Pipeline Template"

python3 -c "import json; json.load(open('workspace-init/memory/pipeline/active.json'))" 2>/dev/null
check $? "active.json is valid JSON"

grep -q "prospects" workspace-init/memory/pipeline/active.json
check $? "prospects array present"

echo ""

# ─── TEST 7: BankrDeploy Module ───
echo "🏦 TEST 7: BankrDeploy Module"

[ -f "modules/bankr-deploy/bankr-deploy.js" ]
check $? "bankr-deploy.js exists"

grep -q "BANKR_PARTNER_KEY" modules/bankr-deploy/bankr-deploy.js 2>/dev/null
check $? "Uses BANKR_PARTNER_KEY env var"

grep -q "simulate" modules/bankr-deploy/bankr-deploy.js 2>/dev/null
check $? "Has simulation function"

grep -q "api.bankr.bot" modules/bankr-deploy/bankr-deploy.js 2>/dev/null
check $? "Uses correct Bankr API endpoint"

echo ""

# ─── TEST 8: Entrypoint Script Execution ───
echo "🔧 TEST 8: Entrypoint Syntax"

bash -n entrypoint.sh 2>/dev/null
check $? "entrypoint.sh has valid bash syntax"

echo ""

# ─── RESULTS ───
echo "═══════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "  🎉 ALL TESTS PASSED — Ready to build!"
  echo ""
  echo "  Next steps:"
  echo "  1. docker build --platform linux/amd64 -t ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.8 -t ghcr.io/buzzbysolcex/buzz-bd-agent:latest ."
  echo "  2. docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v5.3.8"
  echo "  3. docker push ghcr.io/buzzbysolcex/buzz-bd-agent:latest"
  echo "  4. Update Akash SDL image to v5.3.8 → Update Deployment"
  echo ""
else
  echo ""
  echo "  ⚠️  Fix $FAIL failures before building!"
  echo ""
fi
