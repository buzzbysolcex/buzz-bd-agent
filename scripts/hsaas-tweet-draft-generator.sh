#!/bin/bash
# HSaaS Tweet Draft Generator — Pillar 2 Phase 1 (thin wrapper)
#
# Delegates to scripts/hsaas-tweet-draft-generator.py for actual work.
# Wrapper preserves existing cron entry (15 0,6,12,18 * * *) while
# the Python implementation eliminates the shell-heredoc escape-hell
# that caused the original bash version to silently crash post-mkdir.
#
# Per .claude/rules/tweet-on-score.md v2.2.

set -euo pipefail
cd "$(dirname "$0")/.."
exec python3 scripts/hsaas-tweet-draft-generator.py "$@"
