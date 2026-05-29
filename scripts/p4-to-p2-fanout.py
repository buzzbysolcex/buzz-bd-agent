#!/usr/bin/env python3
"""P4 → P2 cross-pollination fan-out.

Authority: Ogie msg 7896 (2026-05-27 23:56 UTC) — Day 28 first task.

Reads a Gate hunt file, extracts the verdict + brain compound proposals +
high-novelty R8-tagged findings, and emits up to 3 templated content
drafts for the Pillar 2 (HSaaS / @BuzzBySolCex / Moltbook) approval
queue:

  1. Tweet differentiator   — always generated (every Gate has a story)
  2. Moltbook methodology   — only on NEW/PROMOTED doctrines / canonical
                              sub-patterns (high-quality threshold)
  3. HSaaS outreach proof   — only on closed-state findings (FORECLOSE
                              / NEGATE / WATCHLIST-PARK / DEDUP — never
                              on PROCEED-pre-disclosure)

Drafts land at:
  data/pillar2/content-drafts/<YYYY-MM-DD>/<hunt-id>-{tweet,moltbook,outreach}.md

Ledger at:
  data/pillar2/content-drafts/p4-p2-fanout-ledger.md

Invocation:
  - PostToolUse Write hook (via .claude/hooks/p4-to-p2-fanout.sh) on
    hunts/*-gate*.md writes
  - Manual / backfill: python3 scripts/p4-to-p2-fanout.py <hunt-file>
    or python3 scripts/p4-to-p2-fanout.py --backfill-today
"""

import datetime
import os
import re
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
OUT_ROOT = WORKSPACE / "data" / "lane1" / "p4-p2-drafts"
LEDGER = OUT_ROOT / "p4-p2-fanout-ledger.md"

VERDICT_PATTERNS = [
    ("PROCEED-DOWN-TO-GATE-2", "PROCEED"),
    ("PROCEED-TO-GATE-2", "PROCEED"),
    ("DEDUP-FORECLOSURE-RECEIPT", "DEDUP"),
    ("FORECLOSE-WITH-RECEIPT", "FORECLOSE"),
    ("ARCHITECTURAL-FORECLOSURE-RECEIPT", "FORECLOSE"),
    ("STRUCTURAL-FORECLOSE", "FORECLOSE"),
    ("FORECLOSURE-RECEIPT", "FORECLOSE"),
    ("STANDARD-FORECLOSE", "FORECLOSE"),
    ("FORECLOSED", "FORECLOSE"),
    ("NEGATED", "NEGATE"),
    ("WATCHLIST-PARK", "WATCHLIST"),
    ("KILL_DOCTRINE", "KILL"),
    ("KILL_DUPLICATE", "KILL"),
]

# Doctrine / sub-pattern keywords that gate Moltbook generation
PROMOTION_TRIGGERS = [
    r"\bCANONICAL\b",
    r"\bPROMOTE.*PERMANENT\b",
    r"\bpromoted to (CANONICAL|PERMANENT)\b",
    r"\bnew (sub-pattern|doctrine|CANDIDATE-[A-Z])\b",
    r"\bDoctrine #\d+ Sub-Type [AB] (added|promoted)\b",
    r"\bAnchor #\d+\b",  # multi-anchor accumulation
    r"\bDC-\d+ EXCLUSION\b",
]


def parse_args():
    raw = [a for a in sys.argv[1:] if a not in ("--no-notify",)]
    if not raw:
        print(
            "usage: p4-to-p2-fanout.py [--no-notify] <hunt-file>...\n"
            "       p4-to-p2-fanout.py --backfill-today",
            file=sys.stderr,
        )
        sys.exit(1)
    if raw[0] == "--backfill-today":
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        hunts = sorted((WORKSPACE / "hunts").glob(f"{today}-*-gate*.md"))
        hunts += sorted((WORKSPACE / "hunts").glob(f"{today}-*foreclosure*.md"))
        hunts += sorted((WORKSPACE / "hunts").glob(f"{today}-*DEDUP*.md"))
        return [h for h in hunts if "-gate" in h.name.lower() or "foreclosure" in h.name.lower() or "DEDUP" in h.name]
    return [Path(p) for p in raw]


def extract_target(path: Path) -> str:
    """`hunts/2026-05-27-cap-c1-gate2-foreclosure.md` -> `cap-c1`"""
    name = path.stem
    m = re.match(r"\d{4}-\d{2}-\d{2}-(.+?)-(gate\d+|c\d+|immunefi|cantina|sherlock).*", name, re.IGNORECASE)
    if m:
        return m.group(1)
    parts = name.split("-")
    return "-".join(parts[3:5]) if len(parts) >= 5 else name


def extract_verdict(text: str) -> str:
    # Count occurrences of each label in the full file. Terminal-state
    # verdicts (FORECLOSE/NEGATE/DEDUP/WATCHLIST/KILL) get the win on ties
    # against PROCEED, because hunt files often contain "Phase X PROCEED"
    # as a phase-descriptor mid-file before settling on a terminal verdict
    # in the final summary section.
    counts: dict[str, int] = {}
    for needle, label in VERDICT_PATTERNS:
        n = len(re.findall(rf"\b{re.escape(needle)}\b", text, re.IGNORECASE))
        if n:
            counts[label] = counts.get(label, 0) + n
    if not counts:
        return "UNKNOWN"
    terminal = {k: v for k, v in counts.items() if k != "PROCEED"}
    if terminal:
        # Among terminals, prefer the highest-count one. Ties broken by
        # specificity order (most-specific terminal class first).
        order = {"FORECLOSE": 5, "NEGATE": 4, "WATCHLIST": 3, "DEDUP": 2, "KILL": 1}
        return max(terminal.items(), key=lambda kv: (kv[1], order.get(kv[0], 0)))[0]
    return "PROCEED"


def extract_brain_compounds(text: str) -> list[str]:
    """Pull bullet/numbered items from a 'Brain compound' section."""
    compounds = []
    section_match = re.search(
        r"(?:#+\s*)?(?:Brain[- ]compound|brain[- ]compound)[^\n]*\n((?:[-*0-9.][^\n]*\n?)+)",
        text, re.IGNORECASE,
    )
    if section_match:
        block = section_match.group(1)
        for line in block.splitlines():
            line = line.strip()
            if not line or not re.match(r"^[-*0-9.]", line):
                continue
            cleaned = re.sub(r"^[-*0-9.]+\s*", "", line).strip()
            if len(cleaned) > 10:
                compounds.append(cleaned[:300])
    return compounds[:6]


def extract_top_finding(text: str) -> str | None:
    """First high-novelty R8 finding line."""
    for line in text.splitlines():
        if re.search(r"\bH[1-9]\b.*\[(INSPECTED|EXECUTED)\]", line):
            return line.strip()[:250]
    return None


def has_promotion_trigger(text: str) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in PROMOTION_TRIGGERS)


def short_target_for_audience(target: str) -> str:
    parts = target.replace("-", " ").split()
    return " ".join(w.capitalize() for w in parts[:3])


def render_tweet(target: str, verdict: str, top_finding: str | None, compounds: list[str]) -> str:
    """Short methodology tweet. ≤280 chars body. No specific vuln details."""
    display = short_target_for_audience(target)
    leading_compound = compounds[0] if compounds else None

    if verdict == "CONFIRM":
        body = (
            f"🐝 Confirmed finding on {display} — PoC verified, paste-ready.\n"
            f"Under operator review for responsible submission.\n"
            f"Methodology now; specifics post-disclosure.\n"
            f"shield.buzzbd.ai/audit\n#BugBounty #HonestScoring"
        )
    elif verdict == "PROCEED":
        body = (
            f"🐝 Gate cleared on {display} — proceeding to PoC verification.\n"
            f"Methodology not bug details. Findings disclosed post-triage.\n"
            f"Honest calibration > LLM throughput.\n"
            f"shield.buzzbd.ai/audit\n#BugBounty #HonestScoring"
        )
    elif verdict in ("DEDUP", "FORECLOSE", "NEGATE", "WATCHLIST", "KILL"):
        why = leading_compound.split(" — ")[0] if leading_compound and " — " in leading_compound else "compound brain stack"
        body = (
            f"🐝 Filtered {display} via {why}.\n"
            f"Verdict: {verdict}. No false-positive submission burned.\n"
            f"This is the discipline behind our scoring engine — pre-paid pattern recognition, not retroactive triage.\n"
            f"shield.buzzbd.ai/audit\n#HonestScoring"
        )
    else:
        body = (
            f"🐝 {display}: methodology pass complete. "
            f"More verdicts at shield.buzzbd.ai/audit\n#HonestScoring"
        )
    return body


def render_moltbook(target: str, verdict: str, compounds: list[str], top_finding: str | None) -> str:
    """Long-form methodology explainer. Only generated on promotion triggers."""
    display = short_target_for_audience(target)
    compound_list = "\n".join(f"- {c}" for c in compounds[:5]) if compounds else "- (no specific compounds captured)"
    finding_block = f"\n**Surface call** — {top_finding}\n" if top_finding else ""
    return f"""# Methodology drop — {display} gate, {verdict} verdict

We file an audit pass per target through a 6-step intake + a 5-target quality checklist. Every pass produces evidence — either a Gate 2 PoC candidate, or a brain-compound that filters the next target faster.

## What today's pass produced
{compound_list}
{finding_block}
## Why this matters

Each compound is pre-paid attack-surface knowledge. The next time a target with the same shape comes through the pipeline, the matching anchor cuts the verdict-time from hours to minutes. Our scoring stack isn't more LLM tokens; it's a compounded library of defenses, exclusions, and audit-regression patterns that fire BEFORE the Foundry harness gets built.

## The verdict on {display}: {verdict}

{"This one survived initial screening — Foundry verification next, paste-ready if confirmed." if verdict == "PROCEED" else
 "We didn't submit. The defenses held under structured review, so we recorded the pattern and moved on. False-positive submissions hurt triage credibility — we'd rather over-filter."}

## The thesis

Honest calibration scales. LLM throughput doesn't. Every doctrine we file makes the next pass smaller; every anchor we accumulate widens the gap between calibrated audit-and-score and pattern-blind triage.

Full audit-tier surface: shield.buzzbd.ai/audit
Public scoring leaderboard: buzzbd.ai/scores

— @BuzzBySolCex
"""


def render_outreach(target: str, verdict: str, compounds: list[str], top_finding: str | None) -> str:
    """HSaaS outreach proof point — only for closed-state findings."""
    display = short_target_for_audience(target)
    return f"""**Outreach proof-point — for HSaaS prospect emails**

Subject hook: "How we filtered [false-positive class] on {display} before it hit your inbox"

Body inline:

> Our internal audit pipeline ran a 10-layer pass on {display} today. Verdict: {verdict}. We didn't ship a submission. Here's why:
>
> {compounds[0] if compounds else "Multi-anchor brain-stack analysis showed the surface was already defended at the canonical anchor level."}
>
> This is what we sell — calibration discipline, not LLM throughput. Every defense we file pre-pays the next audit. By the time your token reaches our scoring stack, the false-positive classes are already filtered.
>
> Full report tier (Quick Scan $500 / Full Analysis $1.5K / 1000-agent Swarm $2.5K): shield.buzzbd.ai/audit

— Buzz by SolCex
"""


def fan_out_one(hunt_path: Path, notify_war_room: bool = False) -> dict:
    """Generate drafts for one hunt file. Returns summary dict."""
    text = hunt_path.read_text(errors="replace")
    target = extract_target(hunt_path)
    verdict = extract_verdict(text)
    # CONFIRM override (Ogie msg 7997): a "*-paste-ready.md" FILE is an
    # unambiguous confirmed, PoC-verified finding — use the FILENAME signal
    # ONLY. Text-based signals ("3/3 tests PASS", "paste-ready", "CONFIRM")
    # are too noisy: foreclosure files cross-reference confirmed siblings and
    # were mislabeled CONFIRM (regression caught + fixed 2026-05-29). Filename
    # is precise. Also fixes the prior UNKNOWN on the Hyp-C paste-ready.
    if "paste-ready" in hunt_path.name.lower():
        verdict = "CONFIRM"
    compounds = extract_brain_compounds(text)
    top_finding = extract_top_finding(text)
    promotion = has_promotion_trigger(text)

    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    out_dir = OUT_ROOT / today

    base = hunt_path.stem
    written = []
    moltbook_path = None
    outreach_path = None

    # PRIVATE-PROGRAM SUPPRESSION (Ogie msg 8019, 2026-05-29): private platforms
    # (HackenProof / Cantina-private / direct) require PLATFORM-ONLY disclosure —
    # generate ZERO public content drafts. A hunt file self-marks private via the
    # sentinel below; the hunt is still ledgered (processed) but emits no draft.
    PRIVATE_MARKERS = ("P4P2-PRIVATE-SUPPRESS", "PLATFORM-ONLY DISCLOSURE")
    is_private = any(m in text for m in PRIVATE_MARKERS)

    # CONTENT-ELIGIBILITY FILTER (Ogie msg 7997, 2026-05-29): only hunts that
    # produced a real, postable result get content drafts. FORECLOSE / NEGATE /
    # DEDUP / KILL / UNKNOWN = no public finding → NO drafts (still ledgered as
    # processed below, so the backstop never reprocesses them).
    GENERATE_VERDICTS = ("PROCEED", "WATCHLIST", "CONFIRM")
    if verdict in GENERATE_VERDICTS and not is_private:
        out_dir.mkdir(parents=True, exist_ok=True)

        tweet_path = out_dir / f"{base}-tweet.md"
        tweet_path.write_text(render_tweet(target, verdict, top_finding, compounds))
        written.append(tweet_path)

        if promotion:
            moltbook_path = out_dir / f"{base}-moltbook.md"
            moltbook_path.write_text(render_moltbook(target, verdict, compounds, top_finding))
            written.append(moltbook_path)

        # Outreach only for WATCHLIST (closed-but-tracked). CONFIRM / PROCEED
        # are pre-disclosure — no proof-point until the finding is public.
        if verdict == "WATCHLIST":
            outreach_path = out_dir / f"{base}-outreach.md"
            outreach_path.write_text(render_outreach(target, verdict, compounds, top_finding))
            written.append(outreach_path)

    hunt_abs = hunt_path.resolve()
    summary = {
        "hunt": str(hunt_abs.relative_to(WORKSPACE)) if WORKSPACE in hunt_abs.parents else str(hunt_path),
        "target": target,
        "verdict": verdict,
        "promotion_trigger": promotion,
        "drafts": [str(p.relative_to(WORKSPACE)) for p in written],
    }

    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    with open(LEDGER, "a") as f:
        # Base the type summary on what was ACTUALLY written (not hardcoded) —
        # skipped (content-ineligible) hunts log "(skipped)" but are still
        # ledgered as processed.
        types_summary = "+".join(p.stem.split("-")[-1] for p in written) or ("(private-suppressed)" if is_private else "(skipped-ineligible)")
        f.write(
            f"- {today} | {target} | {verdict} | "
            f"{types_summary} | promotion={promotion} | {hunt_path.name}\n"
        )

    return summary


def notify(message: str) -> None:
    """Send a War Room nudge. Silent on failure (cron-safe)."""
    bot_env = Path.home() / ".claude" / "channels" / "telegram" / ".env"
    if not bot_env.exists():
        return
    env = {}
    for ln in bot_env.read_text().splitlines():
        if "=" in ln and not ln.lstrip().startswith("#"):
            k, _, v = ln.partition("=")
            env[k.strip()] = v.strip().strip('"').strip("'")
    token = env.get("TELEGRAM_BOT_TOKEN")
    chat_id = env.get("TELEGRAM_CHAT_ID")
    if not (token and chat_id):
        return
    try:
        subprocess.run(
            [
                "curl", "-s", "-X", "POST",
                f"https://api.telegram.org/bot{token}/sendMessage",
                "-d", f"chat_id={chat_id}",
                "--data-urlencode", f"text={message}",
            ],
            check=False, capture_output=True, timeout=15,
        )
    except Exception:
        pass


def main():
    hunts = parse_args()
    backfill_mode = "--backfill-today" in sys.argv or "--no-notify" in sys.argv

    results = []
    for h in hunts:
        if not h.exists():
            print(f"[p4-p2-fanout] missing: {h}", file=sys.stderr)
            continue
        results.append(fan_out_one(h, notify_war_room=False))

    print(f"[p4-p2-fanout] processed {len(results)} hunt(s)")
    for r in results:
        types = "+".join(d.split("-")[-1].split(".")[0] for d in r["drafts"])
        print(f"  {r['target']:30s} {r['verdict']:10s} {types}")

    # SINGLE batched notification per fanout cycle (per Ogie msg 7924
    # 2026-05-28 — replaces the per-hunt notify that flooded War Room).
    if results and not backfill_mode:
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        verdict_counts: dict[str, int] = {}
        total_drafts = 0
        for r in results:
            verdict_counts[r["verdict"]] = verdict_counts.get(r["verdict"], 0) + 1
            total_drafts += len(r["drafts"])
        breakdown = ", ".join(
            f"{n} {v}" for v, n in sorted(verdict_counts.items(), key=lambda kv: -kv[1])
        )
        out_path = OUT_ROOT.relative_to(WORKSPACE) if WORKSPACE in OUT_ROOT.parents else OUT_ROOT
        notify(
            f"📝 P4→P2 fanout: {total_drafts} drafts across {len(results)} hunt(s) "
            f"({breakdown}) → {out_path}/{today}/. Approval queue."
        )


if __name__ == "__main__":
    main()
