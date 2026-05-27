#!/bin/bash
# Lane 4 Corpus Phase 2 Consumer — Pillar 3 weekly digest (thin wrapper)
#
# Delegates to scripts/lane4-corpus-phase2-consumer.py for actual work.
# Wrapper preserves cron-entry stability while the Python implementation
# eliminates shell-heredoc escape-hell (per HSaaS draft-generator lesson).
#
# Cron entry (operator install when ready):
#   0 6 * * 3 cd /home/claude-code/buzz-workspace && bash scripts/lane4-corpus-phase2-consumer.sh
#
# Per `brain/Corpus-Digest-Log.md` §5 + `four-pillar-loop.md` Pillar 3.

set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/lane4-corpus-phase2-consumer.py "$@"
