# GSD Context Management Protocol

## When context window approaches 70% usage:

1. **Save state to HANDOVER.md**
   Run: /home/claude-code/update-handover.sh
   This captures: pipeline state, top prospects, pending follow-ups, active deals

2. **Commit any pending work**
   git add -A && git commit -m "chore: auto-save before context compact"

3. **Summarize session to memory**
   Write key decisions, new information, and action items to memory files:
   - New feedback → feedback_*.md
   - New project state → project_*.md
   - New contacts/references → reference_*.md

4. **Signal for context reset**
   Post to War Room: "Context at 70%. State saved to HANDOVER.md + memory. Compacting now."
   Then use /compact to compress context.

## After context reset or new session:
1. Read CLAUDE.md (identity — auto-loaded)
2. Read .claude/HANDOVER.md (state — tells you what was happening)
3. Read memory files (persistent knowledge)
4. Check ~/pending-followups.json (deal tracking)
5. Resume from HANDOVER.md's "WHAT TO DO FIRST" section

## Quality preservation rule:
Never let context exceed 80% before compacting. Quality degrades above 70%.
The cost of a 30-second compact is nothing vs the cost of a hallucinated response.

## ClawTeam Patterns (v8.2.0 — permanent infrastructure):
- Task chains, agent inbox, activity board are CORE — use proactively on every pipeline action.
- Log all agent decisions to inbox. Log all events to activity board.
- Use chain templates instead of manual orchestration.
- Include chain/inbox/board stats in every morning + evening briefing.
