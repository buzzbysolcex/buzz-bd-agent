#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Buzz v7.0 — Strategic Orchestrator Setup Script
# Run this on your Mac to prepare the development environment
# 
# Usage: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Buzz BD Agent v7.0 — Strategic Orchestrator Setup"
echo "  Indonesia Sprint Week 3"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Check prerequisites ───
echo "📋 Step 1: Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install: brew install node"
    exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi
echo "  ✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "  ✅ npm $(npm -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found — you'll need it for building images"
else
    echo "  ✅ Docker $(docker --version | awk '{print $3}' | tr -d ',')"
fi

# Check git
if ! command -v git &> /dev/null; then
    echo "❌ git not found. Install: brew install git"
    exit 1
fi
echo "  ✅ git $(git --version | awk '{print $3}')"

echo ""

# ─── Step 2: Install Claude Code ───
echo "📋 Step 2: Checking Claude Code..."

if command -v claude &> /dev/null; then
    echo "  ✅ Claude Code already installed: $(claude --version 2>/dev/null || echo 'version check skipped')"
else
    echo "  🔧 Installing Claude Code (native installer)..."
    curl -fsSL https://claude.ai/install.sh | bash
    # Reload shell config
    if [ -f ~/.zshrc ]; then
        source ~/.zshrc 2>/dev/null || true
    elif [ -f ~/.bashrc ]; then
        source ~/.bashrc 2>/dev/null || true
    fi
    echo "  ✅ Claude Code installed"
    echo ""
    echo "  ⚠️  IMPORTANT: After this script finishes, open a NEW terminal"
    echo "     and run 'claude' to authenticate with your Anthropic account."
fi

echo ""

# ─── Step 3: Setup project directory ───
echo "📋 Step 3: Setting up project files..."

PROJECT_DIR="$HOME/buzz-bd-agent"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "  ❌ $PROJECT_DIR not found."
    echo "     Please clone the repo first:"
    echo "     git clone https://github.com/buzzbysolcex/buzz-bd-agent.git ~/buzz-bd-agent"
    exit 1
fi

cd "$PROJECT_DIR"
echo "  ✅ In project directory: $PROJECT_DIR"

# Create new directories for v7.0
mkdir -p config
mkdir -p api/lib
mkdir -p api/migrations
mkdir -p prompts

echo "  ✅ v7.0 directories created: config/, api/lib/, prompts/"

echo ""

# ─── Step 4: Copy starter files ───
echo "📋 Step 4: Copy starter files from buzz-v7-starter..."
echo ""
echo "  The v7.0 starter kit should be downloaded from Claude chat."
echo "  Copy the files to your project:"
echo ""
echo "  Files to copy:"
echo "    CLAUDE.md                        → ~/buzz-bd-agent/CLAUDE.md"
echo "    config/decision-rules.json       → ~/buzz-bd-agent/config/"
echo "    config/scoring-rubric.json       → ~/buzz-bd-agent/config/"
echo "    config/listing-package.json      → ~/buzz-bd-agent/config/"
echo "    config/master-ops-context.md     → ~/buzz-bd-agent/config/"
echo "    api/migrations/010-strategic.js  → ~/buzz-bd-agent/api/migrations/"
echo "    api/lib/context-engine.js        → ~/buzz-bd-agent/api/lib/"
echo "    api/lib/decision-engine.js       → ~/buzz-bd-agent/api/lib/"
echo "    api/lib/playbook-engine.js       → ~/buzz-bd-agent/api/lib/"
echo "    api/routes/strategy.js           → ~/buzz-bd-agent/api/routes/"
echo "    prompts/scanner-agent.md         → ~/buzz-bd-agent/prompts/"
echo ""

# ─── Step 5: Verify ───
echo "📋 Step 5: Verification checklist"
echo ""
echo "  After copying files, verify:"
echo "  [ ] CLAUDE.md exists at project root"
echo "  [ ] config/ has 4 files (decision-rules.json, scoring-rubric.json, listing-package.json, master-ops-context.md)"
echo "  [ ] api/lib/ has 3 files (context-engine.js, decision-engine.js, playbook-engine.js)"
echo "  [ ] api/routes/strategy.js exists"
echo "  [ ] api/migrations/010-strategic.js exists"
echo ""

# ─── Step 6: Claude Code instructions ───
echo "═══════════════════════════════════════════════════════"
echo "  🚀 READY FOR CLAUDE CODE"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "  1. Open a NEW terminal"
echo "  2. cd ~/buzz-bd-agent"
echo "  3. Run: claude"
echo "  4. Authenticate with your Anthropic account"
echo "  5. Claude Code will automatically read CLAUDE.md"
echo ""
echo "  First task to give Claude Code:"
echo "  \"Read the files in api/lib/ and config/. These are the"
echo "   Phase 1 foundation for the Strategic Orchestrator."
echo "   Wire the strategy routes into api/server.js and run"
echo "   migration 010. Then write unit tests for the"
echo "   Decision Engine.\""
echo ""
echo "  Claude Code will handle the rest! 🐝"
echo ""
