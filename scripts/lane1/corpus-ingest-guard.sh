#!/usr/bin/env bash
# corpus-ingest-guard.sh — the DISK-SAFE compounding discipline (Ogie msg 957).
#
# CORE RULE: the corpus's value is the EXTRACT (brain/ doctrine/fragility/GT), NOT the raw text.
# So every ingest run: scrape raw → EXTRACT to brain → COMPRESS or DISCARD raw. Brain grows;
# raw footprint stays BOUNDED. This guard enforces the bound so compounding never re-bloats disk
# (we just cleared 94%→81% by retiring qwen + gzipping a 631M raw batch).
#
# HARD CAPS:
#   • RAW_CEIL  — uncompressed corpus *.jsonl total must stay under this; gzip oldest until under.
#   • gzip >7d  — any corpus *.jsonl older than 7 days is compressed (raw is transient post-extract).
#   • disk halt — if disk >= HALT%, refuse new raw ingest (extract-from-existing only).
#
# Usage: corpus-ingest-guard.sh [--enforce]   (default = report; --enforce = gzip to bound)
set -euo pipefail
CORPUS=/home/claude-code/buzz-workspace/data/lane4/corpus
RAW_CEIL_MB=400            # uncompressed raw corpus ceiling
HALT_PCT=86               # refuse new raw ingest at/above this (below the 88% hard halt)
disk_pct(){ df -P / | awk 'NR==2{gsub("%","",$5);print $5}'; }
raw_mb(){ find "$CORPUS" -name '*.jsonl' -printf '%s\n' 2>/dev/null | awk '{s+=$1}END{printf "%d", s/1048576}'; }

echo "== corpus-ingest-guard == disk $(disk_pct)% | raw(uncompressed) $(raw_mb)MB / ceil ${RAW_CEIL_MB}MB"
# 1. gzip anything >7d (raw is transient once extracted)
find "$CORPUS" -name '*.jsonl' -mtime +7 2>/dev/null | while read -r f; do
  [ "${1:-}" = "--enforce" ] && { gzip -f "$f" && echo "  gzip(>7d): ${f##*/}"; } || echo "  would-gzip(>7d): ${f##*/}"
done
# 2. enforce RAW_CEIL: gzip oldest uncompressed until under ceiling
if [ "${1:-}" = "--enforce" ]; then
  while [ "$(raw_mb)" -gt "$RAW_CEIL_MB" ]; do
    oldest=$(find "$CORPUS" -name '*.jsonl' -printf '%T@ %p\n' 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)
    [ -z "$oldest" ] && break
    gzip -f "$oldest" && echo "  gzip(ceil): ${oldest##*/}"
  done
fi
# 3. ingest-admission signal (callers check this before scraping new raw)
if [ "$(disk_pct)" -ge "$HALT_PCT" ]; then
  echo "  ADMIT=NO (disk $(disk_pct)% >= ${HALT_PCT}% — extract-from-existing only, NO new raw scrape)"; exit 3
fi
echo "  ADMIT=YES (disk ok; new raw ingest permitted, must extract+compress same run)"
