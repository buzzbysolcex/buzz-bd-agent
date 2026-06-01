#!/usr/bin/env bash
# disk-evict-guard.sh — INVERTED (allowlist) disk-eviction rule. Default = PROTECT EVERYTHING.
#
# Authority: Ogie msg 8097 (exemption) + msg 8108 (INVERSION). A blacklist is always one
# workload behind (the .tmp-clones near-miss proved it). So: NOTHING is evictable unless it
# matches an explicit EVICTABLE allowlist. Any new/unknown dir is protected by construction.
#
# EVICTABLE (the ONLY purgeable things):
#   TIER 1 — foreclosed clones: a dir is evictable ONLY if its path is listed in the MANIFEST
#            (data/infra-logs/foreclosed-clones.txt). Foreclosure is opt-IN, never glob-inferred.
#   TIER 2 — log files: *.log with mtime>14d, under known log dirs only.
#   TIER 3 — corpus: *.jsonl with mtime>7d under data/lane4/corpus (GZIP, never delete).
# Everything else (qwen3 model, brain/, secrets, **/.env*, Gate-0 corpus, ACTIVE clones,
# next month's .tmp-whatever) is PROTECTED by default — not by prediction.
#
# Usage:
#   disk-evict-guard.sh --list                 # dry-run: what's evictable + protected-by-default proof (DEFAULT)
#   disk-evict-guard.sh --guard <path>         # exit 0 if EVICTABLE, exit 2 if PROTECTED (default)
#   disk-evict-guard.sh --purge [TARGET_PCT]   # evict allowlist matches tier-by-tier until disk<PCT (default 80)
set -euo pipefail

HOME_DIR="/home/claude-code"
WORKSPACE="$HOME_DIR/buzz-workspace"
MANIFEST="$WORKSPACE/data/infra-logs/foreclosed-clones.txt"   # TIER-1 opt-in foreclosure list
CORPUS_DIR="$WORKSPACE/data/lane4/corpus"
LOG_DIRS=("$WORKSPACE/data/lane1-logs" "$WORKSPACE/data/infra-logs" "$WORKSPACE/data/lane1/v12-validation" "$HOME_DIR")
TARGET_PCT="${2:-80}"

disk_pct() { df -P / | awk 'NR==2{gsub("%","",$5); print $5}'; }
sz() { du -sh "$1" 2>/dev/null | cut -f1; }
norm() { readlink -m "$1"; }

# ── the ALLOWLIST: a path is EVICTABLE iff it matches one of these tiers ──
manifest_dirs() {  # TIER 1 — only what's explicitly foreclosed
  [[ -f "$MANIFEST" ]] || return 0
  while IFS= read -r d; do
    d="${d%%#*}"; d="$(echo -n "$d" | xargs 2>/dev/null || true)"   # strip comments/space
    [[ -n "$d" ]] && echo "$(norm "$d")"
  done < "$MANIFEST"
}
tier1() { manifest_dirs | while read -r d; do [[ -e "$d" ]] && echo "$d"; done; }
tier2() { for D in "${LOG_DIRS[@]}"; do find "$D" -maxdepth 1 -name "*.log" -mtime +14 2>/dev/null; done; }
tier3() { find "$CORPUS_DIR" -name "*.jsonl" -mtime +7 2>/dev/null; }

is_evictable() {  # exit 0 = EVICTABLE (in allowlist); exit 1 = PROTECTED (default)
  local p; p="$(norm "$1")"
  local d
  # TIER 1: path is, or is under, a manifest-foreclosed dir
  while read -r d; do [[ -n "$d" && ( "$p" == "$d" || "$p" == "$d/"* ) ]] && return 0; done < <(manifest_dirs)
  # TIER 2: a >14d *.log under a known log dir
  if [[ "$p" == *.log ]]; then
    for D in "${LOG_DIRS[@]}"; do
      [[ "$p" == "$(norm "$D")"/*.log && -f "$p" ]] && [[ -n "$(find "$p" -mtime +14 2>/dev/null)" ]] && return 0
    done
  fi
  # TIER 3: a >7d *.jsonl under the corpus dir
  if [[ "$p" == "$(norm "$CORPUS_DIR")"/*.jsonl && -f "$p" ]] && [[ -n "$(find "$p" -mtime +7 2>/dev/null)" ]]; then return 0; fi
  return 1   # default: PROTECTED
}

cmd_list() {
  echo "== DISK EVICT GUARD (INVERTED / allowlist) — disk now: $(disk_pct)% =="
  echo "DEFAULT = PROTECT. Only the allowlist below is evictable; everything else is protected by construction."
  echo
  echo "EVICTABLE — TIER 1 (manifest-foreclosed clones, opt-in via $MANIFEST):"
  tier1 | while read -r d; do printf '  - %s  (%s)\n' "$d" "$(sz "$d")"; done; [[ -z "$(tier1)" ]] && echo "  (none listed)"
  echo "EVICTABLE — TIER 2 (logs >14d in known dirs):"
  tier2 | head -20 | while read -r f; do printf '  - %s  (%s)\n' "$f" "$(sz "$f")"; done; [[ -z "$(tier2)" ]] && echo "  (none)"
  echo "EVICTABLE — TIER 3 (corpus jsonl >7d, GZIP only):"
  tier3 | while read -r f; do printf '  - %s  (%s)\n' "$f" "$(sz "$f")"; done; [[ -z "$(tier3)" ]] && echo "  (none)"
}

cmd_purge() {
  echo "== PURGE to <${TARGET_PCT}% (disk now: $(disk_pct)%) — allowlist-only =="
  for d in $(tier1); do
    [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && { echo "reached target"; return 0; }
    is_evictable "$d" && { echo "rm -rf $d ($(sz "$d"))"; rm -rf "$d"; } || echo "SKIP (not evictable): $d"
  done
  for f in $(tier2); do [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && return 0; is_evictable "$f" && { echo "rm $f"; rm -f "$f"; }; done
  for f in $(tier3); do [[ "$(disk_pct)" -lt "$TARGET_PCT" ]] && return 0; is_evictable "$f" && { echo "gzip $f"; gzip -f "$f"; }; done
  echo "post-purge disk: $(disk_pct)%"
}

case "${1:---list}" in
  --list)  cmd_list ;;
  --guard) is_evictable "${2:?path required}" && { echo "EVICTABLE: $2"; exit 0; } || { echo "PROTECTED (default): $2"; exit 2; } ;;
  --purge) cmd_purge ;;
  *) echo "usage: $0 [--list | --guard <path> | --purge [PCT]]"; exit 1 ;;
esac
