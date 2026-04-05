#!/bin/bash
# Buzz Crypto BD — Install Script
# Usage: ./install.sh [profile] [options]
# Profiles: full | scorer | guard | screening
# Options: --target cursor|codex|opencode
#
# Built by a chef. Shipped as a plugin. Bismillah.

set -e

VERSION="9.2.0"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
RED='\033[0;31m'
DIM='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

PROFILE="${1:-full}"
TARGET="claude"

# Parse options
for arg in "$@"; do
  case $arg in
    --target)
      shift
      TARGET="$1"
      shift
      ;;
    --target=*)
      TARGET="${arg#*=}"
      shift
      ;;
  esac
done

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}BUZZ CRYPTO BD AGENT${NC} — v${VERSION}                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  Token Scoring • Wallet Guard • BD Screening • Security  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${DIM}Built by a chef. Kitchen runs itself.${NC}                   ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect Claude Code config directory
if [ "$TARGET" = "claude" ]; then
  CONFIG_DIR="$HOME/.claude"
elif [ "$TARGET" = "cursor" ]; then
  CONFIG_DIR=".cursor"
elif [ "$TARGET" = "codex" ]; then
  CONFIG_DIR=".codex"
elif [ "$TARGET" = "opencode" ]; then
  CONFIG_DIR=".opencode"
else
  echo -e "${RED}Unknown target: $TARGET${NC}"
  echo "Valid targets: claude, cursor, codex, opencode"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${DIM}Profile:${NC} ${BOLD}$PROFILE${NC}"
echo -e "${DIM}Target:${NC}  ${BOLD}$TARGET${NC}"
echo -e "${DIM}Config:${NC}  ${BOLD}$CONFIG_DIR${NC}"
echo ""

# Create directories
mkdir -p "$CONFIG_DIR/rules/common"
mkdir -p "$CONFIG_DIR/rules/crypto"
mkdir -p "$CONFIG_DIR/commands"
mkdir -p "$CONFIG_DIR/skills"
mkdir -p "$CONFIG_DIR/agents"

installed=0

# --- CORE (always installed) ---
echo -e "${AMBER}Installing core rules...${NC}"
cp -r "$SCRIPT_DIR/rules/common/"* "$CONFIG_DIR/rules/common/" 2>/dev/null && installed=$((installed+1))
cp -r "$SCRIPT_DIR/rules/crypto/"* "$CONFIG_DIR/rules/crypto/" 2>/dev/null && installed=$((installed+1))
echo -e "  ${GREEN}✓${NC} Security rules (wallet safety, key protection)"
echo -e "  ${GREEN}✓${NC} Context optimization rules"

# --- HOOKS (Claude Code only) ---
if [ "$TARGET" = "claude" ]; then
  echo -e "${AMBER}Installing hooks...${NC}"
  if [ -f "$SCRIPT_DIR/hooks/hooks.json" ]; then
    mkdir -p "$CONFIG_DIR/../hooks"
    cp "$SCRIPT_DIR/hooks/hooks.json" "./hooks/hooks.json" 2>/dev/null || \
    cp "$SCRIPT_DIR/hooks/hooks.json" "$CONFIG_DIR/../hooks/hooks.json" 2>/dev/null
    cp -r "$SCRIPT_DIR/hooks/scripts/"* "$CONFIG_DIR/../hooks/scripts/" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} SessionStart (auto-read state)"
    echo -e "  ${GREEN}✓${NC} PreToolUse:Bash (block dangerous commands)"
    echo -e "  ${GREEN}✓${NC} PostToolUse:Edit (auto-lint)"
    echo -e "  ${GREEN}✓${NC} Stop (save HANDOVER)"
    installed=$((installed+1))
  fi
fi

# --- PROFILE-BASED INSTALL ---
case $PROFILE in
  full)
    echo -e "${AMBER}Installing ALL skills + commands (full profile)...${NC}"
    cp -r "$SCRIPT_DIR/skills/"* "$CONFIG_DIR/skills/" 2>/dev/null
    cp -r "$SCRIPT_DIR/commands/"* "$CONFIG_DIR/commands/" 2>/dev/null
    cp -r "$SCRIPT_DIR/agents/"* "$CONFIG_DIR/agents/" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Token Scorer (11 rules, zero LLM cost)"
    echo -e "  ${GREEN}✓${NC} Wallet Guard (3-state BLOCK/WARN/ALLOW)"
    echo -e "  ${GREEN}✓${NC} BD Screening (7-phase pipeline)"
    echo -e "  ${GREEN}✓${NC} BuzzShield Security Scanner"
    echo -e "  ${GREEN}✓${NC} 15 slash commands"
    echo -e "  ${GREEN}✓${NC} 12 agents"
    installed=$((installed+10))
    ;;

  scorer)
    echo -e "${AMBER}Installing Token Scorer only...${NC}"
    cp -r "$SCRIPT_DIR/skills/token-scorer" "$CONFIG_DIR/skills/"
    cp "$SCRIPT_DIR/commands/score.md" "$CONFIG_DIR/commands/"
    cp "$SCRIPT_DIR/commands/scan.md" "$CONFIG_DIR/commands/"
    cp "$SCRIPT_DIR/commands/leaderboard.md" "$CONFIG_DIR/commands/"
    echo -e "  ${GREEN}✓${NC} Token Scorer skill"
    echo -e "  ${GREEN}✓${NC} /score, /scan, /leaderboard commands"
    installed=$((installed+4))
    ;;

  guard)
    echo -e "${AMBER}Installing Wallet Guard only...${NC}"
    cp -r "$SCRIPT_DIR/skills/wallet-guard" "$CONFIG_DIR/skills/"
    cp "$SCRIPT_DIR/commands/guard.md" "$CONFIG_DIR/commands/"
    cp "$SCRIPT_DIR/commands/security-scan.md" "$CONFIG_DIR/commands/"
    echo -e "  ${GREEN}✓${NC} Wallet Guard skill"
    echo -e "  ${GREEN}✓${NC} /guard, /security-scan commands"
    installed=$((installed+3))
    ;;

  screening)
    echo -e "${AMBER}Installing BD Screening only...${NC}"
    cp -r "$SCRIPT_DIR/skills/bd-screening" "$CONFIG_DIR/skills/"
    cp "$SCRIPT_DIR/commands/screen.md" "$CONFIG_DIR/commands/"
    cp "$SCRIPT_DIR/commands/outreach.md" "$CONFIG_DIR/commands/"
    echo -e "  ${GREEN}✓${NC} BD Screening skill"
    echo -e "  ${GREEN}✓${NC} /screen, /outreach commands"
    installed=$((installed+3))
    ;;

  *)
    echo -e "${RED}Unknown profile: $PROFILE${NC}"
    echo "Valid profiles: full, scorer, guard, screening"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}INSTALLED${NC} — $installed components for $TARGET               ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Quick start:${NC}"
echo -e "  ${CYAN}/score${NC}          — Score a token instantly"
echo -e "  ${CYAN}/scan${NC}           — Scan token from contract address"
echo -e "  ${CYAN}/guard${NC}          — Check wallet transaction safety"
echo -e "  ${CYAN}/screen${NC}         — Full BD screening pipeline"
echo -e "  ${CYAN}/security-scan${NC}  — Run BuzzShield on your config"
echo ""
echo -e "${DIM}Docs:${NC}  https://buzzbd.ai"
echo -e "${DIM}API:${NC}   https://api.buzzbd.ai"
echo -e "${DIM}Score:${NC} https://buzzbd.ai/score"
echo ""
echo -e "${DIM}Built by a chef. Kitchen runs itself. Bismillah 🤲${NC}"
