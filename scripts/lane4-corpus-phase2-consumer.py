#!/usr/bin/env python3
"""Lane 4 Corpus Phase 2 Consumer — Pillar 3 weekly digest run.

Streams JSONL records from `data/lane4/corpus/*.jsonl` since the last
checkpoint, classifies each post via keyword pass v1.0 (no LLM cost),
groups by author for corroboration thresholds (per RULE 7 in
`brain/Self-Correction-Filing-Rules.md`), and writes brain-file PROPOSAL
blocks to disk for operator review.

Routing (RULE 7):
    GROUND_TRUTH   → brain/Ground-Truth-Catalog.md     (1 post = entry)
    RUG_PATTERN    → brain/Token-Rug-Patterns.md       (≥2 corroborating)
    METHODOLOGY    → brain/Doctrine.md                 (≥3 distinct authors)
    DETECTOR_SEED  → brain/Patterns-Defense-Classes.md (≥3 distinct authors)

≥5 corroborating posts triggers Open-Question entry recommending promotion review.

Cron entry (operator to install):
    0 6 * * 3 cd /home/claude-code/buzz-workspace && bash scripts/lane4-corpus-phase2-consumer.sh

Manual:
    python3 scripts/lane4-corpus-phase2-consumer.py             # production run
    python3 scripts/lane4-corpus-phase2-consumer.py --dry-run   # no writes, no Telegram

LLM cost discipline (BUZZ_RULES.md #5): keyword-only v1.0; LLM enrichment deferred to v1.1.

Streaming: line-by-line via `for line in open(path)`. Never loads full JSONL.
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import warnings
from collections import defaultdict
from pathlib import Path

# Silence the noisy 3.13 utcnow() DeprecationWarning — we use UTC-naive
# timestamps for consistency with sibling Pillar scripts.
warnings.filterwarnings("ignore", category=DeprecationWarning)

WORKSPACE = Path(__file__).resolve().parent.parent
CORPUS_DIR = WORKSPACE / "data" / "lane4" / "corpus"
CHECKPOINT_PATH = CORPUS_DIR / ".checkpoint-phase2-consumer"
BRAIN_DIR = WORKSPACE / "brain"
PROPOSAL_DIR = WORKSPACE / "data" / "lane4" / "phase2-proposals"
DIGEST_LOG = BRAIN_DIR / "Corpus-Digest-Log.md"

TODAY = datetime.datetime.utcnow().strftime("%Y-%m-%d")
NOW_ISO = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
NOW_HM = datetime.datetime.utcnow().strftime("%H:%M")

# Per RULE 7 promotion thresholds
THRESHOLD_RUG_PATTERN = 2          # ≥2 corroborating posts (any author)
THRESHOLD_METHODOLOGY = 3          # ≥3 distinct authors
THRESHOLD_DETECTOR_SEED = 3        # ≥3 distinct authors
THRESHOLD_OPEN_QUESTION = 5        # ≥5 corroborating posts triggers promotion review

# Per task constraint: cap output volume; sample top-N if exceeded
MAX_FINDINGS_PER_CLASS = 100

# Keyword catalog v1.1 — HIGH/WEAK split (anti-noise, Ogie msg 8085 Tier-2).
# v1.0 single-broad-keyword-anywhere produced massive FPs ("watch for the little
# bow" -> DETECTOR_SEED; any MtGox mention -> GROUND_TRUTH; any "scam" -> RUG).
# v1.1 rule: a post qualifies for a class iff it matches ONE HIGH-signal phrase,
# OR >=2 DISTINCT WEAK keywords (corroboration within the post). Pure-FP terms
# ("watch for", "trigger on", bare "rug") removed. Broad single words ("scam",
# "hacker", bare "mt.gox") demoted to WEAK (need a 2nd signal). This is the
# precision step BELOW an eventual v1.2 LLM filter — still NO canonical-brain
# auto-file (proposals + digest only); keyword precision is insufficient to inject
# into Doctrine/Patterns/Ground-Truth without review.
KEYWORDS = {
    "GROUND_TRUTH": {
        "high": [
            r"\bexploit(?:ed|ing)?\b", r"\bdrained?\b", r"\bhacked\b",
            r"\bwallet compromise[d]?\b", r"\bcompromised wallet\b",
            r"\brogue exchange\b", r"\bexchange hack\b", r"\bbitfinex hack\b",
            r"\blinode breach\b", r"\bconfirmed lost\b", r"\bconfirmed exploit\b",
            r"\bverified theft\b", r"\bstole(?:n)? (?:my|the|all) (?:coins?|btc|bitcoins?|funds|wallet)\b",
        ],
        "weak": [
            r"\bstolen\b", r"\bhacker\b", r"\blost coins?\b", r"\blost btc\b",
            r"\blost bitcoins?\b", r"\blost funds\b", r"\bprivate keys?\b",
            r"\bprivkey\b", r"\bphishing\b", r"\bphished?\b", r"\bmt\.? ?gox\b",
            r"\ballinvain\b",
        ],
    },
    "RUG_PATTERN": {
        "high": [
            r"\brug[- ]?pulls?\b", r"\bexit scam\b", r"\bponzi\b",
            r"\bpyramid scheme\b", r"\bfake exchange\b", r"\btoken failure\b",
            r"\bcoin failed\b", r"\brug post[- ]mortem\b", r"\bdisappeared with\b",
            r"\bvanished with\b", r"\babandon(?:ed)? (?:the )?project\b",
        ],
        "weak": [
            r"\bscam(?:mer|med|ming)?\b", r"\babandon(?:ed|ing)?\b",
        ],
    },
    "METHODOLOGY": {
        "high": [
            r"\bsecurity audit\b", r"\bcode review\b", r"\bsmart contract audit\b",
            r"\bcold storage\b", r"\bmultisig\b", r"\bmulti[- ]signature\b",
            r"\bbrain wallet\b", r"\bdeterministic wallet\b",
            r"\bhierarchical deterministic\b", r"\bkey derivation\b",
            r"\bprivate[- ]key management\b", r"\bchecksum verification\b",
            r"\baddress verification\b",
        ],
        "weak": [
            r"\banalyze the code\b", r"\bverify the math\b", r"\bverify deposits\b",
            r"\bhot wallet\b",
        ],
    },
    "DETECTOR_SEED": {
        "high": [
            r"\bautomated check\b", r"\bmonitoring script\b", r"\bdetection pattern\b",
            r"\bautomate(?:d)? detection\b", r"\bauto[- ]flag\b", r"\bsanity check\b",
            r"\balert when\b",
        ],
        "weak": [
            r"\bwe should check\b", r"\bneeds verification\b",
        ],
    },
}

# Pre-compile regex for speed (high + weak per class)
COMPILED_KEYWORDS = {
    cls: {band: [re.compile(p, re.IGNORECASE) for p in pats] for band, pats in bands.items()}
    for cls, bands in KEYWORDS.items()
}

# Classification priority — first match wins (highest-signal first).
CLASSIFICATION_PRIORITY = ["GROUND_TRUTH", "RUG_PATTERN", "METHODOLOGY", "DETECTOR_SEED"]


def classify_post(post):
    """Return (classification, matched_signal) or (None, None).

    Keyword pass v1.1: a post qualifies for a class iff it matches ONE HIGH-signal
    phrase OR >=2 DISTINCT WEAK keywords. First-priority-class wins. Empty/short
    body -> None.
    """
    body = post.get("body_excerpt") or ""
    if not body or len(body) < 40:  # too-short posts are signal-low
        return None, None
    for cls in CLASSIFICATION_PRIORITY:
        for pat in COMPILED_KEYWORDS[cls]["high"]:
            m = pat.search(body)
            if m:
                return cls, m.group(0).lower()
        weak_hits = {pat.pattern for pat in COMPILED_KEYWORDS[cls]["weak"] if pat.search(body)}
        if len(weak_hits) >= 2:
            return cls, "weak2:" + "+".join(sorted(w.strip(r"\b")[:18] for w in weak_hits)[:2])
    return None, None


def read_checkpoint():
    """Returns dict {jsonl_path: last_line_processed}. Missing file = empty."""
    if not CHECKPOINT_PATH.exists():
        return {}
    try:
        with open(CHECKPOINT_PATH) as f:
            return json.load(f)
    except Exception as e:
        print(f"[phase2] checkpoint read failed ({e}) — treating as fresh", file=sys.stderr)
        return {}


def write_checkpoint(checkpoint, dry_run=False):
    if dry_run:
        return
    CHECKPOINT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CHECKPOINT_PATH, "w") as f:
        json.dump(checkpoint, f, indent=2)


def list_corpus_files():
    """All .jsonl files in corpus dir, excluding empty samples."""
    if not CORPUS_DIR.exists():
        return []
    files = []
    for p in sorted(CORPUS_DIR.glob("*.jsonl")):
        try:
            if p.stat().st_size > 1024:  # skip empty / sample files
                files.append(p)
        except OSError:
            continue
    return files


def stream_classify(jsonl_path, start_line, max_lines=None):
    """Generator: yields (line_no, post, classification, keyword) for each
    line above start_line that classifies.

    Streams via for-line — never loads full file.
    """
    line_no = 0
    with open(jsonl_path, "r", errors="replace") as f:
        for line_no, line in enumerate(f, start=1):
            if line_no <= start_line:
                continue
            if max_lines and (line_no - start_line) > max_lines:
                break
            line = line.strip()
            if not line:
                continue
            try:
                post = json.loads(line)
            except json.JSONDecodeError:
                continue
            cls, kw = classify_post(post)
            if cls:
                yield (line_no, post, cls, kw)
    # Caller reads final line_no via .gi_frame.f_locals after exhaustion;
    # we instead return via separate helper below.


def process_file(jsonl_path, start_line):
    """Stream a file from start_line, classify each post, return
    (findings, final_line_no).
    """
    findings = []
    final_line = start_line
    with open(jsonl_path, "r", errors="replace") as f:
        for line_no, line in enumerate(f, start=1):
            final_line = line_no
            if line_no <= start_line:
                continue
            line = line.strip()
            if not line:
                continue
            try:
                post = json.loads(line)
            except json.JSONDecodeError:
                continue
            cls, kw = classify_post(post)
            if cls:
                findings.append({
                    "line_no": line_no,
                    "topic_id": post.get("topic_id"),
                    "user": post.get("user") or "unknown",
                    "date_raw": post.get("date_raw"),
                    "subject": post.get("subject"),
                    "body_excerpt": (post.get("body_excerpt") or "")[:500],
                    "classification": cls,
                    "matched_keyword": kw,
                    "source_file": jsonl_path.name,
                })
    return findings, final_line


def group_corroboration(findings_for_class):
    """For each (matched_keyword OR topic_id family), count corroborating
    posts and distinct authors. Returns list of groups sorted by
    (distinct_authors_desc, total_posts_desc).
    """
    by_keyword = defaultdict(list)
    for f in findings_for_class:
        by_keyword[f["matched_keyword"]].append(f)
    groups = []
    for kw, posts in by_keyword.items():
        authors = {p["user"] for p in posts}
        groups.append({
            "keyword": kw,
            "total_posts": len(posts),
            "distinct_authors": len(authors),
            "authors": sorted(authors)[:10],  # cap for display
            "posts": posts,
        })
    groups.sort(
        key=lambda g: (g["distinct_authors"], g["total_posts"]),
        reverse=True,
    )
    return groups


def cap_findings(findings):
    """If a single class exceeds MAX_FINDINGS_PER_CLASS, sample top by
    (author-distinctness × keyword-density). We score each post by:
        keyword_freq_in_body × (1 / author_post_count_in_class)
    and keep top MAX_FINDINGS_PER_CLASS.
    """
    if len(findings) <= MAX_FINDINGS_PER_CLASS:
        return findings, 0
    # Count posts per author
    author_count = defaultdict(int)
    for f in findings:
        author_count[f["user"]] += 1
    # Score each post
    def score(f):
        body = f["body_excerpt"]
        # Recount keyword density (cheap)
        kw_pat = re.compile(re.escape(f["matched_keyword"]), re.IGNORECASE)
        density = len(kw_pat.findall(body))
        rarity = 1.0 / max(1, author_count[f["user"]])
        return density * rarity
    findings.sort(key=score, reverse=True)
    dropped = len(findings) - MAX_FINDINGS_PER_CLASS
    return findings[:MAX_FINDINGS_PER_CLASS], dropped


def make_post_ref(f):
    """Stable wikilink-friendly reference for a post."""
    return f"forum/topic={f['topic_id']}/file={f['source_file']}/line={f['line_no']}"


def make_brain_proposal_GROUND_TRUTH(findings):
    """1 post = entry. No threshold."""
    lines = []
    lines.append(f"# Ground-Truth Catalog — Phase 2 Proposals ({TODAY})\n")
    lines.append(f"_Generated by `scripts/lane4-corpus-phase2-consumer.py` at {NOW_ISO}_\n")
    lines.append(f"_Routing per Self-Correction-Filing-Rules RULE 7: GROUND_TRUTH 1-post-per-entry._\n")
    lines.append(f"_Total entries proposed: {len(findings)}_\n\n---\n")
    for f in findings:
        lines.append(f"\n## GT-{f['topic_id']}-{f['line_no']} — {f['matched_keyword']}\n")
        lines.append(f"- **Source:** {make_post_ref(f)}\n")
        lines.append(f"- **User:** {f['user']}\n")
        lines.append(f"- **Date raw:** {f['date_raw'] or 'not parsed'}\n")
        lines.append(f"- **Subject:** {f['subject'] or '(none)'}\n")
        lines.append(f"- **Matched keyword:** `{f['matched_keyword']}`\n")
        lines.append(f"- **Body excerpt (≤500c):**\n  > {f['body_excerpt'].replace(chr(10), ' ')}\n")
    return "".join(lines)


def make_brain_proposal_grouped(class_name, findings, threshold, threshold_field):
    """RUG_PATTERN / METHODOLOGY / DETECTOR_SEED — threshold-gated by group."""
    groups = group_corroboration(findings)
    qualifying = []
    deferred = []
    for g in groups:
        if g[threshold_field] >= threshold:
            qualifying.append(g)
        else:
            deferred.append(g)

    lines = []
    lines.append(f"# {class_name} — Phase 2 Proposals ({TODAY})\n")
    lines.append(f"_Generated by `scripts/lane4-corpus-phase2-consumer.py` at {NOW_ISO}_\n")
    lines.append(
        f"_Routing per RULE 7: {class_name} requires ≥{threshold} {threshold_field.replace('_', ' ')}._\n"
    )
    lines.append(f"_Qualifying groups: {len(qualifying)} | Deferred (below threshold): {len(deferred)}_\n\n---\n")

    if qualifying:
        lines.append(f"\n## QUALIFYING (recommend brain-file append)\n")
        for g in qualifying:
            promote_flag = ""
            if g["total_posts"] >= THRESHOLD_OPEN_QUESTION:
                promote_flag = " — **TRIGGERS Open-Question promotion review (≥5 posts)**"
            lines.append(
                f"\n### `{g['keyword']}`{promote_flag}\n"
                f"- **Total posts:** {g['total_posts']}\n"
                f"- **Distinct authors:** {g['distinct_authors']}\n"
                f"- **Authors (top 10):** {', '.join(g['authors'])}\n"
                f"- **Top corroborating posts (≤3 shown):**\n"
            )
            for p in g["posts"][:3]:
                lines.append(
                    f"  - {make_post_ref(p)} — {p['user']} — `{p['body_excerpt'][:200].replace(chr(10), ' ')}…`\n"
                )

    if deferred:
        lines.append(f"\n## DEFERRED (below threshold — log only)\n")
        for g in deferred[:30]:
            lines.append(
                f"- `{g['keyword']}` — {g['total_posts']} posts / {g['distinct_authors']} authors\n"
            )

    return "".join(lines), len(qualifying), len(deferred)


def make_open_question_proposals(class_name, findings, threshold_field):
    """Generate Open-Question entries for groups ≥5 posts."""
    groups = group_corroboration(findings)
    questions = [g for g in groups if g["total_posts"] >= THRESHOLD_OPEN_QUESTION]
    if not questions:
        return None
    lines = []
    lines.append(f"# Open-Question Proposals from {class_name} ({TODAY})\n\n")
    lines.append(
        f"_The following {class_name} groups crossed the ≥5-post operator-decision "
        f"threshold (RULE 7). Operator review recommended for promotion._\n\n"
    )
    for g in questions:
        lines.append(
            f"## Q: Should `{g['keyword']}` ({class_name}) be promoted to canonical?\n"
            f"- **Anchor count:** {g['total_posts']} posts / {g['distinct_authors']} authors\n"
            f"- **Why this surfaces now:** crossed ≥5 corroborating posts in {TODAY} Phase 2 run\n"
            f"- **Decision needed:** promote to permanent brain entry, OR adjust keyword (FP), OR defer pending stronger anchor\n"
            f"- **Top author exemplars (≤3):**\n"
        )
        for p in g["posts"][:3]:
            lines.append(
                f"  - {p['user']} — {make_post_ref(p)} — `{p['body_excerpt'][:200].replace(chr(10), ' ')}…`\n"
            )
        lines.append("\n")
    return "".join(lines)


def append_digest_log_row(stats, dry_run=False):
    """Append a new row to Corpus-Digest-Log.md §1."""
    if dry_run:
        return
    if not DIGEST_LOG.exists():
        return
    runtime_s = stats["runtime_s"]
    runtime = f"{runtime_s:.1f}s" if runtime_s < 60 else f"{runtime_s/60:.1f}m"
    mix = stats["classification_mix"]
    mix_str = (
        f"GT={mix.get('GROUND_TRUTH', 0)}/"
        f"RP={mix.get('RUG_PATTERN', 0)}/"
        f"MTH={mix.get('METHODOLOGY', 0)}/"
        f"DS={mix.get('DETECTOR_SEED', 0)}"
    )
    row = (
        f"| {TODAY} | Phase 2 | extension-batch + carry-forward | "
        f"{stats['lines_processed']} new lines | {stats['total_findings']} findings | "
        f"{mix_str} | proposals only (no brain writes) | {runtime} |\n"
    )

    text = DIGEST_LOG.read_text()
    # Find Section 1 table — insert row before the next "---" or before "## Section 2"
    marker = "| 2026-05-20 | Phase 1 | 2009-2011 (topic IDs 1-30000) |"
    if marker in text:
        # Append after this row, before the next blank line + "---"
        idx = text.find(marker)
        end_of_line = text.find("\n", idx) + 1
        new_text = text[:end_of_line] + row + text[end_of_line:]
        DIGEST_LOG.write_text(new_text)
    else:
        # Fallback: append at end of file
        with open(DIGEST_LOG, "a") as f:
            f.write("\n<!-- phase2 row -->\n" + row)


def notify_war_room(message, dry_run=False):
    if dry_run:
        return
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
    except Exception as e:
        print(f"[phase2] war-room notify failed: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No checkpoint writes, no proposal writes, no Telegram",
    )
    parser.add_argument(
        "--max-lines-per-file",
        type=int,
        default=None,
        help="Cap lines scanned per JSONL file (debugging)",
    )
    args = parser.parse_args()

    start = datetime.datetime.utcnow()
    checkpoint = read_checkpoint()
    corpus_files = list_corpus_files()

    if not corpus_files:
        print("[phase2] no corpus files found — aborting")
        return 1

    all_findings = []
    lines_processed = 0
    new_checkpoint = dict(checkpoint)

    print(f"[phase2] starting Phase 2 consumer (dry_run={args.dry_run})")
    print(f"[phase2] corpus dir: {CORPUS_DIR}")
    print(f"[phase2] files queued: {len(corpus_files)}")

    for jsonl_path in corpus_files:
        last_line = checkpoint.get(str(jsonl_path), 0)
        print(f"[phase2] processing {jsonl_path.name} from line {last_line + 1}")
        if args.max_lines_per_file:
            print(f"[phase2]   (capped at {args.max_lines_per_file} lines for this file)")

        # process with optional max-lines
        findings_this_file = []
        final_line = last_line
        try:
            with open(jsonl_path, "r", errors="replace") as f:
                for line_no, line in enumerate(f, start=1):
                    final_line = line_no
                    if line_no <= last_line:
                        continue
                    if args.max_lines_per_file and (line_no - last_line) > args.max_lines_per_file:
                        break
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        post = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    cls, kw = classify_post(post)
                    if cls:
                        findings_this_file.append({
                            "line_no": line_no,
                            "topic_id": post.get("topic_id"),
                            "user": post.get("user") or "unknown",
                            "date_raw": post.get("date_raw"),
                            "subject": post.get("subject"),
                            "body_excerpt": (post.get("body_excerpt") or "")[:500],
                            "classification": cls,
                            "matched_keyword": kw,
                            "source_file": jsonl_path.name,
                        })
        except OSError as e:
            print(f"[phase2] ERROR reading {jsonl_path}: {e}", file=sys.stderr)
            continue

        new_processed = final_line - last_line
        lines_processed += new_processed
        all_findings.extend(findings_this_file)
        new_checkpoint[str(jsonl_path)] = final_line
        print(
            f"[phase2]   processed {new_processed} new lines, "
            f"{len(findings_this_file)} findings (file final line={final_line})"
        )

    # Bucket findings by class
    by_class = defaultdict(list)
    for f in all_findings:
        by_class[f["classification"]].append(f)

    # Cap volume per class
    capped = {}
    dropped_counts = {}
    for cls in CLASSIFICATION_PRIORITY:
        capped[cls], dropped_counts[cls] = cap_findings(by_class.get(cls, []))

    # Build proposal directory for this run
    run_dir = PROPOSAL_DIR / TODAY
    if not args.dry_run:
        run_dir.mkdir(parents=True, exist_ok=True)

    proposals_written = {}
    qualifying_counts = {}

    # GROUND_TRUTH — every post = entry
    if capped["GROUND_TRUTH"]:
        gt_content = make_brain_proposal_GROUND_TRUTH(capped["GROUND_TRUTH"])
        if not args.dry_run:
            gt_path = run_dir / "Ground-Truth-Catalog-proposals.md"
            gt_path.write_text(gt_content)
            proposals_written["GROUND_TRUTH"] = str(gt_path)
        qualifying_counts["GROUND_TRUTH"] = len(capped["GROUND_TRUTH"])

    # RUG_PATTERN — ≥2 corroborating posts (any author)
    if capped["RUG_PATTERN"]:
        rp_content, rp_qual, rp_def = make_brain_proposal_grouped(
            "RUG_PATTERN", capped["RUG_PATTERN"],
            THRESHOLD_RUG_PATTERN, "total_posts",
        )
        if not args.dry_run:
            rp_path = run_dir / "Token-Rug-Patterns-proposals.md"
            rp_path.write_text(rp_content)
            proposals_written["RUG_PATTERN"] = str(rp_path)
        qualifying_counts["RUG_PATTERN"] = rp_qual

    # METHODOLOGY — ≥3 distinct authors
    if capped["METHODOLOGY"]:
        m_content, m_qual, m_def = make_brain_proposal_grouped(
            "METHODOLOGY", capped["METHODOLOGY"],
            THRESHOLD_METHODOLOGY, "distinct_authors",
        )
        if not args.dry_run:
            m_path = run_dir / "Doctrine-METHODOLOGY-candidates.md"
            m_path.write_text(m_content)
            proposals_written["METHODOLOGY"] = str(m_path)
        qualifying_counts["METHODOLOGY"] = m_qual

    # DETECTOR_SEED — ≥3 distinct authors
    if capped["DETECTOR_SEED"]:
        ds_content, ds_qual, ds_def = make_brain_proposal_grouped(
            "DETECTOR_SEED", capped["DETECTOR_SEED"],
            THRESHOLD_DETECTOR_SEED, "distinct_authors",
        )
        if not args.dry_run:
            ds_path = run_dir / "Patterns-Defense-Classes-CANDIDATE.md"
            ds_path.write_text(ds_content)
            proposals_written["DETECTOR_SEED"] = str(ds_path)
        qualifying_counts["DETECTOR_SEED"] = ds_qual

    # Open-Question proposals (any class with ≥5 corroborating posts)
    oq_blocks = []
    for cls in ("RUG_PATTERN", "METHODOLOGY", "DETECTOR_SEED"):
        oq = make_open_question_proposals(cls, capped[cls], "total_posts")
        if oq:
            oq_blocks.append(oq)
    if oq_blocks and not args.dry_run:
        oq_path = run_dir / "Open-Question-promotion-review.md"
        oq_path.write_text("\n---\n".join(oq_blocks))
        proposals_written["OPEN_QUESTIONS"] = str(oq_path)

    # Stats
    runtime_s = (datetime.datetime.utcnow() - start).total_seconds()
    stats = {
        "lines_processed": lines_processed,
        "total_findings": len(all_findings),
        "classification_mix": {cls: len(by_class[cls]) for cls in CLASSIFICATION_PRIORITY},
        "capped_mix": {cls: len(capped[cls]) for cls in CLASSIFICATION_PRIORITY},
        "dropped_by_cap": dropped_counts,
        "qualifying_counts": qualifying_counts,
        "runtime_s": runtime_s,
        "proposals_written": proposals_written,
    }

    # Print summary
    print()
    print(f"=== Phase 2 Consumer Summary ({TODAY} {NOW_HM}Z) ===")
    print(f"Lines processed (new since last checkpoint): {lines_processed}")
    print(f"Total findings: {len(all_findings)}")
    print(f"Classification mix:")
    for cls in CLASSIFICATION_PRIORITY:
        cap_drop = dropped_counts.get(cls, 0)
        cap_note = f" (capped from {len(by_class[cls])}, dropped {cap_drop})" if cap_drop else ""
        print(f"  {cls:15s} = {len(by_class[cls]):6d}{cap_note}")
    print(f"Qualifying (≥threshold) groups:")
    for cls, qc in qualifying_counts.items():
        print(f"  {cls:15s} = {qc}")
    print(f"Runtime: {runtime_s:.1f}s")
    print(f"Dry-run: {args.dry_run}")

    # Top findings per class (for dry-run report)
    print()
    print("Top 5 findings per classification:")
    for cls in CLASSIFICATION_PRIORITY:
        print(f"  --- {cls} ---")
        if cls == "GROUND_TRUTH":
            for f in capped[cls][:5]:
                print(f"    {f['user'][:20]:<20s} | kw='{f['matched_keyword']}' | t={f['topic_id']} | {f['body_excerpt'][:80]}")
        else:
            groups = group_corroboration(capped[cls])
            for g in groups[:5]:
                print(f"    kw='{g['keyword']}' | {g['total_posts']} posts | {g['distinct_authors']} authors | top: {', '.join(g['authors'][:3])}")

    # Persist checkpoint & digest log
    write_checkpoint(new_checkpoint, dry_run=args.dry_run)
    append_digest_log_row(stats, dry_run=args.dry_run)

    # Notify
    if not args.dry_run:
        msg = (
            f"🧠 P3 Phase 2 digest — {TODAY} {NOW_HM}Z\n"
            f"Lines processed: {lines_processed}\n"
            f"Findings: GT={stats['classification_mix']['GROUND_TRUTH']} "
            f"RP={stats['classification_mix']['RUG_PATTERN']} "
            f"MTH={stats['classification_mix']['METHODOLOGY']} "
            f"DS={stats['classification_mix']['DETECTOR_SEED']}\n"
            f"Qualifying groups: {sum(qualifying_counts.values())}\n"
            f"Proposals: data/lane4/phase2-proposals/{TODAY}/\n"
            f"Runtime: {runtime_s:.1f}s\n"
            f"Brain writes: DEFERRED — operator review proposals before append."
        )
        notify_war_room(msg, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    sys.exit(main())
