#!/usr/bin/env python3
"""P4 → P1 scoring rule auto-generator.

Authority: Ogie msg "execute P4→P1 wiring in gaps between hunts per Day
29-30 plan" (2026-05-28). Builds on P4→P2 fanout (8f2cc63) precedent.

Reads recent brain/ commits to find NEW canonical doctrines, NEW
sub-patterns promoted to CANONICAL, NEW DC-* entries, and NEW
CANDIDATE-* entries. For each, drafts a candidate Pillar 1 (token
scoring engine) penalty/bonus rule and writes it to:

  data/lane1/p4-p1-rule-proposals/<YYYY-MM-DD>/<rule-id>.md

Proposals are NOT auto-applied to the scoring engine. Operator
approves via War Room review, then a follow-up edits
`api/services/scoring/v2_8rules.js` (or equivalent) to add the rule.

Invocation:
  python3 scripts/p4-to-p1-rule-generator.py
    → scans last 7d brain commits, emits proposals for any unprocessed
  python3 scripts/p4-to-p1-rule-generator.py --since 2026-05-27
    → scan from a specific date
  python3 scripts/p4-to-p1-rule-generator.py --commit <SHA>
    → scan a single commit's brain/ changes
"""

import datetime
import re
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent
OUT_ROOT = WORKSPACE / "data" / "lane1" / "p4-p1-rule-proposals"
LEDGER = OUT_ROOT / "p4-p1-rule-proposals-ledger.md"

# Pattern extractors — find NEW brain entries worth scoring-rule treatment
PATTERN_EXTRACTORS = [
    # NEW Doctrine entries
    (
        r"Doctrine #(\d+)\s+(PERMANENT|CANONICAL|NEW|sub-rule [#0-9a-z.]+|sub-class [a-z]+ Anchor #\d+)",
        "doctrine",
    ),
    # NEW DC-* entries / CANONICAL promotions
    (
        r"DC-(\d+)\s+(EXCLUSION|CANONICAL|NEW sub-pattern|sub-pattern [#0-9])",
        "defense_class",
    ),
    # NEW CANDIDATE-* entries
    (
        r"CANDIDATE-([A-Z]+)\s*\.?\s*(\d+)?\s*(NEW|PROMOTED|CANONICAL|sub-pattern)",
        "candidate",
    ),
    # NEW Pattern entries (Pattern A-J family)
    (
        r"Pattern ([A-J])\s+(NEW|promoted|sub-pattern|anti-anchor)",
        "pattern",
    ),
]


def parse_args():
    raw = sys.argv[1:]
    since = None
    commit = None
    i = 0
    while i < len(raw):
        if raw[i] == "--since" and i + 1 < len(raw):
            since = raw[i + 1]
            i += 2
        elif raw[i] == "--commit" and i + 1 < len(raw):
            commit = raw[i + 1]
            i += 2
        else:
            i += 1
    if not since and not commit:
        since = (
            datetime.datetime.utcnow() - datetime.timedelta(days=7)
        ).strftime("%Y-%m-%d")
    return since, commit


def git_brain_commits(since: str | None, commit: str | None) -> list[str]:
    """Return commit SHAs touching brain/ since <date> (or just <commit>)."""
    if commit:
        return [commit]
    try:
        out = subprocess.run(
            [
                "git", "-C", str(WORKSPACE),
                "log", f"--since={since}",
                "--format=%H", "--", "brain/",
            ],
            capture_output=True, text=True, check=True, timeout=15,
        ).stdout
        return [c for c in out.strip().splitlines() if c]
    except Exception as e:
        print(f"[p4-p1-rules] git log failed: {e}", file=sys.stderr)
        return []


def git_show_brain_diff(sha: str) -> str:
    try:
        return subprocess.run(
            ["git", "-C", str(WORKSPACE), "show", sha, "--", "brain/"],
            capture_output=True, text=True, check=True, timeout=15,
        ).stdout
    except Exception:
        return ""


def extract_new_entries(diff_text: str) -> list[dict]:
    """Pull NEW pattern/doctrine/DC/CANDIDATE entries from a brain diff."""
    entries = []
    # Only scan added lines (start with `+` in diff, excluding `+++`)
    added = "\n".join(
        ln[1:] for ln in diff_text.splitlines()
        if ln.startswith("+") and not ln.startswith("+++")
    )
    for pattern, kind in PATTERN_EXTRACTORS:
        for m in re.finditer(pattern, added, re.IGNORECASE):
            label = m.group(0).strip()
            # Capture a chunk of surrounding context for the rule body
            idx = added.find(label)
            ctx_start = max(0, idx - 100)
            ctx_end = min(len(added), idx + 500)
            context = added[ctx_start:ctx_end].strip()
            entries.append({
                "kind": kind,
                "label": label[:120],
                "context": context[:1500],
                "rule_id": f"{kind}-{label.replace(' ', '-').replace('#', '').lower()[:60]}",
            })
    # Deduplicate by rule_id
    seen = set()
    unique = []
    for e in entries:
        if e["rule_id"] in seen:
            continue
        seen.add(e["rule_id"])
        unique.append(e)
    return unique


def render_rule_proposal(entry: dict, sha: str) -> str:
    kind = entry["kind"]
    label = entry["label"]
    context = entry["context"]

    direction_guidance = {
        "doctrine": (
            "Doctrines describe meta-process rules (saturation discount, "
            "MIN-cap defense, audit-regression cycle). Most doctrines do "
            "NOT map directly to a token-scoring rule. The exception: "
            "doctrines about deployer-side patterns (e.g., DC-9 sub-2 "
            "DEFENSE PATTERN = multi-sig timelock posture) CAN translate "
            "to a deployer-trust scoring bonus."
        ),
        "defense_class": (
            "Defense classes are the highest-yield → P1 translation source. "
            "If a DC-X pattern requires a specific defensive code shape "
            "(e.g., DC-9 sub-2 multi-sig + timelock), then DEPLOYERS who "
            "ship contracts WITHOUT that defense get a -10 to -25 penalty. "
            "Conversely, deployers WITH the defense get a small +5 bonus."
        ),
        "candidate": (
            "CANDIDATE-* entries are exploitation-pattern catalog. Map: a "
            "deployer wallet that has historically shipped contracts "
            "exhibiting CANDIDATE-X vulnerability class (per "
            "brain/Deployer-Crossref.md) gets a -15 penalty. Multi-incident "
            "deployers stack the penalty up to -40."
        ),
        "pattern": (
            "Pattern A-J family is the foundation alphabet for vuln types. "
            "Pattern A (access control / guard_asymmetry) is the most "
            "common deployer-trust signal: contracts shipping with "
            "Pattern A surfaces without compensating controls = -5 to -20."
        ),
    }

    return f"""# P4 → P1 scoring rule proposal — {label}

**Status:** DRAFT (operator approval pending → War Room)
**Source brain commit:** `{sha}`
**Pattern kind:** {kind}
**Auto-generated:** {datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}

---

## Source brain context

> {context}

---

## Proposed scoring rule

**Direction guidance ({kind}):**
{direction_guidance.get(kind, "Generic — review case-by-case.")}

**Candidate rule (operator review required before append to scoring engine):**

```js
// scoring-rule candidate — DO NOT auto-apply
// {label}
{{
  id: "{entry['rule_id']}",
  weight: TBD (operator-decide: -25 to +5 range per direction guidance),
  description: "Apply when token's deployer wallet has historical "
               "association with the {label} pattern per "
               "brain/Deployer-Crossref.md or contract source exhibits "
               "the un-defended surface shape.",
  check: (token, scoring_ctx) => {{
    // TODO: implement check against deployer-crossref + contract surface
  }},
}}
```

## Cross-pillar wiring

- **Trigger:** scoring engine evaluates this rule when a token enters the pipeline
- **Data source:** `brain/Deployer-Crossref.md` for deployer-side check; contract source-fetch (Sourcify / Etherscan / equivalent) for surface check
- **Cascade:** if the rule fires HIGH penalty, escalate to Pillar 4 watchlist (deployer wallet → Lane 5 target candidate)

## Operator decisions required

1. Approve the weight value (or reject the rule entirely)
2. Confirm the data-source path (deployer-crossref vs contract source vs both)
3. Edit `api/services/scoring/v2_8rules.js` (or equivalent file) to implement the check
4. Add unit test covering: positive case (rule should fire), negative case (rule should NOT fire on un-related token)

## Ledger entry

- Rule ID: `{entry['rule_id']}`
- Status: PROPOSED (autonomous generation)
- Source: brain commit `{sha[:8]}`
- Operator decision: pending
"""


def write_proposal(entry: dict, sha: str) -> Path:
    today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    out_dir = OUT_ROOT / today
    out_dir.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", entry["rule_id"])
    path = out_dir / f"{safe}.md"
    if path.exists():
        # already proposed today — skip duplicate
        return path
    path.write_text(render_rule_proposal(entry, sha))
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    with open(LEDGER, "a") as f:
        f.write(
            f"- {today} | {entry['kind']} | {entry['label'][:60]} | "
            f"{sha[:8]} | {path.relative_to(WORKSPACE)}\n"
        )
    return path


def notify(message: str) -> None:
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
    since, commit = parse_args()
    shas = git_brain_commits(since, commit)
    if not shas:
        print(f"[p4-p1-rules] no brain/ commits since {since}", file=sys.stderr)
        return

    written = []
    for sha in shas:
        diff = git_show_brain_diff(sha)
        if not diff:
            continue
        for entry in extract_new_entries(diff):
            path = write_proposal(entry, sha)
            written.append((sha, entry, path))

    print(f"[p4-p1-rules] processed {len(shas)} commit(s), wrote {len(written)} proposal(s)")
    for sha, entry, path in written[:10]:
        print(f"  {sha[:8]} {entry['kind']:15s} {entry['label'][:40]:40s} → {path.name}")

    if written and "--no-notify" not in sys.argv:
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        kinds: dict[str, int] = {}
        for _, e, _ in written:
            kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
        breakdown = ", ".join(f"{n} {k}" for k, n in sorted(kinds.items(), key=lambda kv: -kv[1]))
        out_path = OUT_ROOT.relative_to(WORKSPACE) if WORKSPACE in OUT_ROOT.parents else OUT_ROOT
        notify(
            f"⚙️ P4→P1 rule generator: {len(written)} candidate rules "
            f"({breakdown}) from {len(shas)} brain commit(s) → "
            f"{out_path}/{today}/. Operator review queue."
        )


if __name__ == "__main__":
    main()
