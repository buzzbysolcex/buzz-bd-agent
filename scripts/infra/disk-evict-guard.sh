#!/usr/bin/env bash
# disk-evict-guard.sh — the executable disk-eviction RULE the evictor must obey.
#
# Authority: Ogie msg 8097 (2026-06-01) — "make qwen3 reclaim-EXEMPT as a hard rule
# in whatever does auto-eviction; not a flag, a rule the evictor obeys. Point eviction
# at expendable targets first; the model is never the eviction target."
#
# The "evictor" is the agent's behavioral disk-management loop (autonomy-boundary.md:
# 85% -> purge foreclosed clones, 87% -> aggressive, 88% -> HALT new clones). This script
# makes that rule EXECUTABLE + ENFORCED: every purge MUST pass `--guard <path>` first, and
# nothing under an EXEMPT path can ever be returned as a target.
#
# Usage:
#   disk-evict-guard.sh --list                 # dry-run: exempt set + tiered targets + sizes (DEFAULT)
#   disk-evict-guard.sh --guard <path>         # exit 2 if EXEMPT (refuse), 0 if evictable
#   disk-evict-guard.sh --purge [TARGET_PCT]   # evict tier-by-tier until disk<PCT (default 80); exempt-enforced
set -euo pipefail

HOME_DIR="/home/claude-code"
WORKSPACE="$HOME_DIR/buzz-workspace"
MODEL_DIR="$HOME_DIR/.ollama"                         # qwen3 lives here — HARD EXEMPT
MANIFEST="$WORKSPACE/data/infra-logs/foreclosed-clones.txt"  # opt-in TIER-1 deletion list
TARGET_PCT="${2:-80}"

# ── EXEMPT: paths the evictor may NEVER target (hard rule, top of precedence) ──
# Order matters: the model is listed FIRST and called out explicitly.
EXEMPT_PREFIXES=(
  "$MODEL_DIR"                       # 1. qwen3 model weights — NEVER the eviction target
  "$WORKSPACE/.git"                  # 2. repo history
  "$WORKSPACE/brain"                 # 3. persistent truth (never delete, only update)
  "$HOME_DIR/buzz-secrets"           # 4. secrets
  "$HOME_DIR/hyp-c-submission"       # 5. active submission artifacts
  "$WORKSPACE/data/lane1/gate0"      # 6. Gate-0 known-issues corpus (cheap, load-bearing)
  "$HOME_DIR/.tmp-build"             # 7. V6 CANONICAL code (.tmp-build/v6; scripts/v6 symlinks here) — NOT a clone
  "$HOME_DIR/.tmp-playwright"        # 8. chromium-headless-shell for contest-monitor cron — re-install is costly
)
# .env* files anywhere under home are exempt by pattern (checked in is_exempt).

is_exempt() {  # exit 0 = EXEMPT (do not evict); exit 1 = evictable
  local p; p="$(readlink -m "$1")"
  case "$p" in
    *"/.env"*|*".env.") return 0 ;;
  esac
  local e
  for e in "${EXEMPT_PREFIXES[@]}"; do
    [[ "$p" == "$e" || "$p" == "$e/"* ]] && return 0
  done
  return 1
}

disk_pct() { df -P / | awk 'NR==2{gsub("%","",$5); print $5}'; }
sz() { du -sh "$1" 2>/dev/null | cut -f1; }

# ── TIER 1: foreclosed Gate-2 clones (most expendable — re-cloneable on demand) ──
# Temp sweep/clone dirs + anything the hunt loop logged as foreclosed in MANIFEST.
tier1_targets() {
  shopt -s nullglob
  for d in "$HOME_DIR"/.tmp-*; do [[ -d "$d" ]] && ! is_exempt "$d" && echo "$d"; done
  if [[ -f "$MANIFEST" ]]; then
    while IFS= read -r d; do
      [[ -n "$d" && -d "$d" ]] && ! is_exempt "$d" && echo "$d"
    done < "$MANIFEST"
  fi
}
# ── TIER 2: rotated/stale logs (>14d) ──
tier2_targets() {
  find "$WORKSPACE/data" "$HOME_DIR" -maxdepth 4 -name "*.log" -mtime +14 2>/dev/null \
    | while IFS= read -r f; do is_exempt "$f" || echo "$f"; done
}
# ── TIER 3: stale corpus — COMPRESS (gzip), never delete (archive-don't-delete rule) ──
tier3_targets() {
  find "$WORKSPACE/data/lane4/corpus" -name "*.jsonl" -mtime +7 2>/dev/null \
    | while IFS= read -r f; do is_exempt "$f" || echo "$f"; done
}

cmd_list() {
  echo "== DISK EVICT GUARD — dry-run (disk now: $(disk_pct)%) =="
  echo
  echo "EXEMPT (never evicted, in precedence order):"
  printf '  • %s  (%s)\n' "$MODEL_DIR" "$(sz "$MODEL_DIR") — qwen3, HARD EXEMPT"
  for e in "${EXEMPT_PREFIXES[@]:1}"; do printf '  • %s\n' "$e"; done
  echo "  • **/.env*  (pattern)"
  echo
  echo "EVICTION TARGET-ORDER (expendable first):"
  echo "  TIER 1 — foreclosed clones / .tmp sweeps (delete):"
  tier1_targets | while read -r d; do printf '    - %s  (%s)\n' "$d" "$(sz "$d")"; done
  [[ -z "$(tier1_targets)" ]] && echo "    (none)"
  echo "  TIER 2 — rotated logs >14d (delete):"
  tier2_targets | head -20 | while read -r f; do printf '    - %s  (%s)\n' "$f" "$(sz "$f")"; done
  [[ -z "$(tier2_targets)" ]] && echo "    (none)"
  echo "  TIER 3 — corpus jsonl >7d (gzip, never delete):"
  tier3_targets | while read -r f; do printf '    - %s  (%s)\n' "$f" "$(sz "$f")"; done
  [[ -z "$(tier3_targets)" ]] && echo "    (none)"
}

cmd_purge() {
  echo "== PURGE to <${TARGET_PCT}% (disk now: $(disk_pct)%) =="
  for d in $(tier1_targets); do
    [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && { echo "reached target"; return 0; }
    is_exempt "$d" && { echo "REFUSE (exempt): $d"; continue; }
    echo "rm -rf $d ($(sz "$d"))"; rm -rf "$d"
  done
  for f in $(tier2_targets); do
    [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && return 0
    is_exempt "$f" && continue
    echo "rm $f"; rm -f "$f"
  done
  for f in $(tier3_targets); do
    [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && return 0
    is_exempt "$f" && continue
    echo "gzip $f"; gzip -f "$f"
  done
  echo "post-purge disk: $(disk_pct)%"
}

case "${1:---list}" in
  --list)  cmd_list ;;
  --guard) is_exempt "${2:?path required}" && { echo "EXEMPT — refuse to evict: $2"; exit 2; } || { echo "evictable: $2"; exit 0; } ;;
  --purge) cmd_purge ;;
  *) echo "usage: $0 [--list | --guard <path> | --purge [PCT]]"; exit 1 ;;
esac
