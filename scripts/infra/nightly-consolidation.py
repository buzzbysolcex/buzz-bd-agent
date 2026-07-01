#!/usr/bin/env python3
"""nightly-consolidation.py — compaction WITHOUT loss (Doctrine #80).

Stops append-only bloat by rolling up cold episodic data nightly, while treating
every high-value store (doctrines, the paid-outcome ledger, semantic facts,
identity) as READ-ONLY. Guaranteed recall is preserved: nothing is destroyed,
only summarized-with-pointer and moved to a cold, restorable archive.

Two safety architectures, layered:
  1. ALLOWLIST  — only operational logs may be physically rolled up. Nothing
     else is even a candidate for a destructive/archive op.
  2. FORBIDDEN GUARD — a hard denylist that ABORTS if any archive target ever
     resolves onto a doctrine / paid-ledger / identity / .env / weights file.
Semantic dedup, doctrine staleness, and scoreboard stats are REPORT-ONLY in all
modes — they detect and flag for human review; they never write to those stores.

Modes:
  (default) --dry-run : compute everything, write the report, ZERO archive ops.
  --apply             : additionally perform the episodic rollup (allowlist only).
Idempotent: after rollup a source drops below the candidate threshold and the
manifest records what was archived, so a re-run compacts nothing new.

THE EVICTION SEAM — evict(candidate) -> action — is where a future ratified
eviction policy (Xcode's triage rule) slots in. Today it returns ARCHIVE always.
DELETE is not a permitted return until reviewed.
"""
import argparse, glob, gzip, hashlib, json, os, re, sys, time
from datetime import datetime, timezone

ROOT = os.environ.get("BUZZ_ROOT", "/home/claude-code/buzz-workspace")
ARCHIVE_ROOT = os.path.join(ROOT, "brain/archive/consolidation")
MANIFEST = os.path.join(ARCHIVE_ROOT, "manifest.json")
DOCTRINE_FILE = os.path.join(ROOT, "brain/Doctrine.md")
SCOREBOARD = os.path.join(ROOT, "brain/scoreboard.json")
EV_WEIGHTS = os.path.join(ROOT, "brain/ev-weights.json")
SEMANTIC_DIR = os.environ.get(
    "BUZZ_SEMANTIC_DIR",
    "/home/claude-code/.claude/projects/-home-claude-code-buzz-workspace/memory")

# --- ALLOWLIST: the ONLY paths eligible for physical rollup (operational logs) ---
EPISODIC_ALLOW = [
    "logs/**/*.log",
    "data/infra-logs/*.log",
    "data/lane1-logs/*.log",
    "data/lane2/**/*.log",
]
# --- FORBIDDEN GUARD: archiving anything matching these is a hard abort ---
FORBIDDEN_SUBSTR = [
    "brain/Doctrine.md",
    "brain/Security-Research-Submission-Ledger.md",   # paid-outcome ledger
    "brain/scoreboard.json", "brain/ev-weights.json", # weights (post-mortem's job)
    "brain/People.md",
    "CLAUDE.md", "BUZZ_RULES.md",
    ".env", "identity",
]

# Candidate thresholds + retention
MIN_LINES = int(os.environ.get("CONSOLIDATE_MIN_LINES", "1500"))
MIN_BYTES = int(os.environ.get("CONSOLIDATE_MIN_BYTES", "100000"))
RETAIN_LINES = int(os.environ.get("CONSOLIDATE_RETAIN_LINES", "500"))
SEMANTIC_DUP_RATIO = float(os.environ.get("CONSOLIDATE_DUP_RATIO", "0.85"))


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def sha256_text(t):
    return hashlib.sha256(t.encode("utf-8", "replace")).hexdigest()


def is_forbidden(path):
    rel = os.path.relpath(os.path.realpath(path), ROOT)
    for bad in FORBIDDEN_SUBSTR:
        if bad in rel or bad in path:
            return True
    return False


def under_allowlist(path):
    rel = os.path.relpath(path, ROOT)
    for pat in EPISODIC_ALLOW:
        # fnmatch-style with ** support via glob translation
        rx = re.escape(pat).replace(r"\*\*/", ".*").replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
        if re.fullmatch(rx, rel):
            return True
    return False


# ============================================================================
# THE EVICTION SEAM
# ============================================================================
def evict(candidate):
    """Xcode triage rule slots here — must return ARCHIVE or KEEP; DELETE is not
    a permitted return until reviewed.

    `candidate` = {path, lines, bytes, age_days?}. DEFAULT NOW: always ARCHIVE
    (move to cold store), NEVER hard-delete. This preserves guaranteed recall
    until a real eviction policy is ratified. When Xcode's rule lands, replace
    the body below; the contract (return value in {"ARCHIVE","KEEP"}) is frozen.
    """
    return "ARCHIVE"


def _load_manifest():
    if os.path.exists(MANIFEST):
        try:
            with open(MANIFEST) as f:
                return json.load(f)
        except Exception:
            pass
    return {"runs": [], "archived": {}}  # archived: path -> [entries]


def _save_manifest(m):
    os.makedirs(ARCHIVE_ROOT, exist_ok=True)
    tmp = MANIFEST + ".tmp"
    with open(tmp, "w") as f:
        json.dump(m, f, indent=2)
    os.replace(tmp, MANIFEST)


def find_episodic_candidates():
    out = []
    for pat in EPISODIC_ALLOW:
        for p in glob.glob(os.path.join(ROOT, pat), recursive=True):
            if not os.path.isfile(p):
                continue
            try:
                sz = os.path.getsize(p)
            except OSError:
                continue
            if sz < MIN_BYTES:
                continue
            out.append(p)
    return sorted(set(out))


def rollup_episodic(apply, manifest):
    results = []
    for p in find_episodic_candidates():
        with open(p, "r", errors="replace") as f:
            lines = f.readlines()
        if len(lines) < MIN_LINES:
            continue
        cand = {"path": p, "lines": len(lines), "bytes": os.path.getsize(p)}
        action = evict(cand)
        if action == "KEEP":
            results.append({**cand, "action": "KEEP", "archived_lines": 0})
            continue
        if action != "ARCHIVE":
            raise RuntimeError("evict() returned illegal action %r for %s" % (action, p))

        keep = lines[-RETAIN_LINES:]
        archive_lines = lines[:-RETAIN_LINES]
        if not archive_lines:
            continue
        archive_text = "".join(archive_lines)
        sha = sha256_text(archive_text)
        name = os.path.basename(p)
        seq = len(manifest["archived"].get(os.path.relpath(p, ROOT), []))
        adir = os.path.join(ARCHIVE_ROOT, today())
        apath = os.path.join(adir, "%s.%02d.gz" % (name, seq))
        rel_ap = os.path.relpath(apath, ROOT)
        reclaimed = len(archive_text.encode("utf-8", "replace"))

        entry = {
            "source": os.path.relpath(p, ROOT), "archive": rel_ap, "sha256": sha,
            "archived_lines": len(archive_lines), "kept_lines": len(keep),
            "bytes_reclaimed": reclaimed, "ts": now_iso(),
            "restore": "gunzip -c %s" % rel_ap, "applied": bool(apply),
        }

        if apply:
            # DOUBLE SAFETY: never touch a forbidden path, only allowlisted ones.
            if is_forbidden(p) or not under_allowlist(p):
                raise RuntimeError("REFUSED: %s is forbidden or off-allowlist" % p)
            os.makedirs(adir, exist_ok=True)
            with gzip.open(apath, "wt", encoding="utf-8") as gz:
                gz.write(archive_text)
            # verify the archive before we shrink the source (restorability gate)
            with gzip.open(apath, "rt", encoding="utf-8") as gz:
                if sha256_text(gz.read()) != sha:
                    raise RuntimeError("archive verify FAILED for %s — source untouched" % p)
            stub = (
                "# ── CONSOLIDATED %s (Doctrine #80: archive, never delete) ──\n"
                "# %d older lines rolled up -> %s (sha256:%s)\n"
                "# restore: gunzip -c %s   |   manifest: %s\n"
                "# recent %d lines kept below for hot context.\n"
                % (today(), len(archive_lines), rel_ap, sha[:16], rel_ap,
                   os.path.relpath(MANIFEST, ROOT), len(keep))
            )
            tmp = p + ".consolidate.tmp"
            with open(tmp, "w") as f:
                f.write(stub)
                f.writelines(keep)
            os.replace(tmp, p)
            manifest["archived"].setdefault(os.path.relpath(p, ROOT), []).append(entry)

        results.append({**cand, "action": "ARCHIVE", **entry})
    return results


def dedupe_semantic():
    """REPORT-ONLY: flag near-identical memory files. Never edits/deletes."""
    import difflib
    files = sorted(glob.glob(os.path.join(SEMANTIC_DIR, "*.md")))
    bodies = {}
    for p in files:
        try:
            with open(p, errors="replace") as f:
                txt = f.read()
        except Exception:
            continue
        body = re.sub(r"^---.*?---", "", txt, flags=re.S)  # strip frontmatter
        body = re.sub(r"\s+", " ", body).strip().lower()
        if body:
            bodies[p] = body[:4000]
    pairs = []
    names = list(bodies)
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            r = difflib.SequenceMatcher(None, bodies[names[i]], bodies[names[j]]).ratio()
            if r >= SEMANTIC_DUP_RATIO:
                pairs.append((round(r, 3), os.path.basename(names[i]), os.path.basename(names[j])))
    pairs.sort(reverse=True)
    return {"files_scanned": len(files), "dup_candidates": pairs}


def flag_doctrines():
    """REPORT-ONLY: flag never-referenced (stale) + near-duplicate doctrines for
    HUMAN review. NEVER edits Doctrine.md."""
    import difflib
    if not os.path.exists(DOCTRINE_FILE):
        return {"error": "Doctrine.md not found"}
    with open(DOCTRINE_FILE, errors="replace") as f:
        txt = f.read()
    hdr = re.compile(r"^##\s*Doctrine\s*#(\d+[a-z]?(?:\.\d+)?)\s*[—-]\s*(.+)$", re.M)
    doctrines = [(m.group(1), m.group(2).split("(added")[0].strip()) for m in hdr.finditer(txt)]

    # "last-fired" proxy: is the doctrine number referenced OUTSIDE Doctrine.md?
    corpus_files = glob.glob(os.path.join(ROOT, "hunts/**/*.md"), recursive=True) \
        + glob.glob(os.path.join(ROOT, "brain/*.md")) \
        + glob.glob(os.path.join(ROOT, "logs/**/*"), recursive=True)
    corpus = ""
    for cf in corpus_files:
        if os.path.abspath(cf) == os.path.abspath(DOCTRINE_FILE) or not os.path.isfile(cf):
            continue
        try:
            with open(cf, errors="replace") as f:
                corpus += f.read()
        except Exception:
            continue
    never_fired = []
    for num, title in doctrines:
        if not re.search(r"(Doctrine\s*#|#)%s\b" % re.escape(num), corpus):
            never_fired.append((num, title[:80]))
    # near-duplicate titles
    dup_titles = []
    for i in range(len(doctrines)):
        for j in range(i + 1, len(doctrines)):
            r = difflib.SequenceMatcher(None, doctrines[i][1].lower(), doctrines[j][1].lower()).ratio()
            if r >= 0.75:
                dup_titles.append((round(r, 3), "#" + doctrines[i][0], "#" + doctrines[j][0]))
    dup_titles.sort(reverse=True)
    return {"total_doctrines": len(doctrines),
            "never_referenced_candidates": never_fired,
            "near_duplicate_title_candidates": dup_titles[:15]}


def rollup_scoreboard():
    """REPORT-ONLY stats echo. No weight changes (that is post-mortem.py's job)."""
    out = {}
    for label, path in (("scoreboard", SCOREBOARD), ("ev_weights", EV_WEIGHTS)):
        try:
            with open(path) as f:
                d = json.load(f)
            if label == "scoreboard":
                out["scoreboard_totals"] = d.get("totals", {})
            else:
                out["ev_weights_meta"] = {"last_updated": d.get("last_updated"),
                                          "exploration_slice": d.get("exploration_slice", {}).get("pct_of_cycles")}
        except Exception as e:
            out[label + "_error"] = repr(e)
    return out


def build_report(mode, episodic, semantic, doctrines, scoreboard):
    total_reclaimed = sum(e.get("bytes_reclaimed", 0) for e in episodic if e.get("action") == "ARCHIVE")
    total_lines = sum(e.get("archived_lines", 0) for e in episodic if e.get("action") == "ARCHIVE")
    lines = []
    lines.append("# Nightly Consolidation Report — %s" % now_iso())
    lines.append("")
    lines.append("**Mode:** `%s`  ·  **Archive root:** `%s`" % (mode, os.path.relpath(ARCHIVE_ROOT, ROOT)))
    lines.append("")
    lines.append("## Episodic rollup (operational logs — allowlist only)")
    lines.append("- Candidates rolled up: **%d**" % len([e for e in episodic if e.get("action") == "ARCHIVE"]))
    lines.append("- Lines archived: **%d**  ·  Hot bytes reclaimed: **%s KB**" % (total_lines, "%.1f" % (total_reclaimed/1024)))
    for e in episodic:
        if e.get("action") == "ARCHIVE":
            lines.append("  - `%s` → `%s` (%d→archive, keep %d) sha `%s` restore: `%s`%s"
                         % (e["path"].replace(ROOT+"/", ""), e["archive"], e["archived_lines"],
                            e["kept_lines"], e["sha256"][:12], e["restore"],
                            "" if e["applied"] else "  _[dry-run: not written]_"))
    lines.append("")
    lines.append("## Semantic memory — dedup candidates (REPORT-ONLY, no edits)")
    lines.append("- Files scanned: %d  ·  Near-identical pairs (≥%.2f): %d"
                 % (semantic["files_scanned"], SEMANTIC_DUP_RATIO, len(semantic["dup_candidates"])))
    for r, a, b in semantic["dup_candidates"][:20]:
        lines.append("  - %.3f  `%s` ~ `%s`  → human review" % (r, a, b))
    lines.append("")
    lines.append("## Doctrines — stale/dup FLAGS (REPORT-ONLY, never edited)")
    if "error" in doctrines:
        lines.append("  - " + doctrines["error"])
    else:
        lines.append("- Total doctrines: %d" % doctrines["total_doctrines"])
        lines.append("- Never-referenced-outside-Doctrine.md (possible stale — HUMAN review): %d"
                     % len(doctrines["never_referenced_candidates"]))
        for num, title in doctrines["never_referenced_candidates"][:30]:
            lines.append("  - #%s — %s" % (num, title))
        lines.append("- Near-duplicate title candidates (HUMAN review): %d"
                     % len(doctrines["near_duplicate_title_candidates"]))
        for r, a, b in doctrines["near_duplicate_title_candidates"]:
            lines.append("  - %.3f  %s ~ %s" % (r, a, b))
    lines.append("")
    lines.append("## Scoreboard / ev-weights (stats echo — NO weight changes)")
    lines.append("```json")
    lines.append(json.dumps(scoreboard, indent=2))
    lines.append("```")
    lines.append("")
    lines.append("_Doctrine #80: compaction summarizes-with-pointer + archives; it never destroys recall. "
                 "Doctrines, the paid-outcome ledger, identity, and weights are read-only here._")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--dry-run", action="store_true", help="default; compute + report, no archive ops")
    g.add_argument("--apply", action="store_true", help="perform episodic rollup (allowlist only)")
    ap.add_argument("--report-out", default=None)
    ap.add_argument("--warroom", action="store_true", help="send a summary to the War Room")
    args = ap.parse_args()
    apply = bool(args.apply)
    mode = "APPLY" if apply else "DRY-RUN"

    manifest = _load_manifest()
    episodic = rollup_episodic(apply, manifest)
    semantic = dedupe_semantic()
    doctrines = flag_doctrines()
    scoreboard = rollup_scoreboard()

    report = build_report(mode, episodic, semantic, doctrines, scoreboard)
    os.makedirs(ARCHIVE_ROOT, exist_ok=True)
    out_path = args.report_out or os.path.join(ARCHIVE_ROOT, "report-%s.md" % today())
    with open(out_path, "w") as f:
        f.write(report)

    if apply:
        manifest["runs"].append({"ts": now_iso(), "mode": mode,
                                 "reclaimed_bytes": sum(e.get("bytes_reclaimed", 0)
                                                        for e in episodic if e.get("action") == "ARCHIVE"),
                                 "report": os.path.relpath(out_path, ROOT)})
        _save_manifest(manifest)

    print(report)
    print("\n[report written to %s]" % out_path)

    if args.warroom:
        reclaimed_kb = sum(e.get("bytes_reclaimed", 0) for e in episodic if e.get("action") == "ARCHIVE")/1024
        nref = 0 if "error" in doctrines else len(doctrines["never_referenced_candidates"])
        ndup = 0 if "error" in doctrines else len(doctrines["near_duplicate_title_candidates"])
        summ = ("\U0001F9F9 Nightly Consolidation (%s) — %s\n"
                "• episodic rolled up: %d logs, %.1f KB hot-reclaimed\n"
                "• semantic dup candidates: %d (report-only)\n"
                "• doctrine flags for review: %d stale?, %d near-dup (never auto-edited)\n"
                "• archive: %s  ·  report: %s"
                % (mode, today(),
                   len([e for e in episodic if e.get("action") == "ARCHIVE"]), reclaimed_kb,
                   len(semantic["dup_candidates"]), nref, ndup,
                   os.path.relpath(ARCHIVE_ROOT, ROOT), os.path.relpath(out_path, ROOT)))
        wr = os.path.join(ROOT, "scripts/infra/warroom-send.sh")
        os.system('%s %s' % (wr, json_arg(summ)))


def json_arg(s):
    import shlex
    return shlex.quote(s)


if __name__ == "__main__":
    main()
