#!/usr/bin/env python3
"""Local qwen3:8b classifier helper — FREE LOCAL LLM (BUZZ_RULES #5). Bankr stays OFF.

Calls ollama at localhost:11434 with thinking DISABLED (fast). Shared by the P3 v1.2
precision-filter and the Gate-0 LLM-matcher. Resident model survives reboot via the
@reboot `ollama serve` crontab entry (2026-06-01).
"""
import json
import urllib.request

OLLAMA = "http://localhost:11434/api/chat"
MODEL = "qwen3:8b"


# RETIRED 2026-06-03 (Ogie msg 8129 — disk reclaim; qwen NOT load-bearing). The model is deleted and
# ollama serve is stopped. These functions now DEGRADE GRACEFULLY (no crash) to the same "uncertain ->
# WR-review" / v1.1-keyword path the consumers already use. Re-enable per brain/qwen-retired-2026-06-03.md.
# Live crons never called these (Gate-0 = structural match_finding; P3 = v1.1 classify_post).
QWEN_RETIRED = True


def chat(prompt, system=None, num_predict=60, timeout=120):
    if QWEN_RETIRED:
        raise RuntimeError("qwen retired 2026-06-03 (disk reclaim) — see brain/qwen-retired-2026-06-03.md")
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": "/no_think " + prompt})
    body = json.dumps({
        "model": MODEL, "think": False, "stream": False, "keep_alive": "25m",
        "options": {"num_predict": num_predict, "temperature": 0},
        "messages": msgs,
    }).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        d = json.loads(r.read())
    return ((d.get("message") or {}).get("content") or "").strip()


def verdict_keep_drop(cls, body):
    """P3 v1.2 precision-filter: is this post GENUINE <cls> signal or keyword-noise?"""
    p = (f"A Bitcointalk post was keyword-flagged as security class '{cls}'. Is it GENUINELY that "
         f"(GROUND_TRUTH=a real crypto exploit/theft/hack; RUG_PATTERN=a real scam/rug/exit post-mortem; "
         f"METHODOLOGY=a real security practice; DETECTOR_SEED=a real detection/monitoring idea) — or NOISE "
         f"(casual chatter, price talk, the word used in passing, off-topic)? "
         f"Reply EXACTLY: KEEP or DROP, then a <=6-word reason.\n\nPOST: {body[:300]}")
    try:
        out = chat(p, num_predict=24, timeout=200)
    except Exception as e:
        # qwen retired → v1.2 LLM filter disabled; KEEP (don't drop) + defer to v1.1 keyword + WR-review (safe).
        return ("KEEP", f"qwen-retired: v1.1 keyword kept, WR-review ({type(e).__name__})")
    u = out.upper()
    keep = u.lstrip().startswith("KEEP") or (u.find("KEEP") != -1 and (u.find("DROP") == -1 or u.find("KEEP") < u.find("DROP")))
    return ("KEEP" if keep else "DROP"), out[:140]


def gate0_mechanism_match(finding, known_issue):
    """Gate-0 LLM-matcher: does the program's accepted-risk entry COVER this finding's mechanism?
    Returns (verdict, reasoning) — verdict in KNOWN-NEGATE / NOVEL-VARIANT-REVIEW / NO-MATCH."""
    p = ("You are a bug-bounty triage assistant. A program documents this ACCEPTED-RISK / known non-issue:\n"
         f"  CLASS: {known_issue.get('class')}\n  MECHANISM: {known_issue.get('mechanism')}\n  IMPACT: {known_issue.get('impact')}\n\n"
         "A researcher's candidate finding:\n"
         f"  CLASS: {finding.get('class')}\n  MECHANISM: {finding.get('mechanism')}\n  IMPACT: {finding.get('impact')}\n\n"
         "Decide by IMPACT / END-STATE equivalence, NOT by how similarly the mechanism is worded. "
         "If the accepted-risk IMPACT already describes the SAME end-state reached through the SAME class of action "
         "(e.g. an admin re-enabling a transceiver so a prior attestation counts toward a later quorum), that is "
         "KNOWN-NEGATE even when the finding spells out the internal steps (bitmap, index, ordering) in more detail. "
         "Reserve NOVEL-VARIANT-REVIEW for a genuinely DIFFERENT end-state, or a path the accepted-risk does not reach. "
         "Reply EXACTLY one of: KNOWN-NEGATE / NOVEL-VARIANT-REVIEW / NO-MATCH. "
         "Then ONE concise sentence of MECHANISM-level reasoning (not keyword overlap).")
    try:
        out = chat(p, num_predict=80, timeout=300)
    except Exception as e:
        # qwen retired → LLM-matcher disabled; default to the structural gate's safe verdict (uncertain -> WR-review).
        return ("NOVEL-VARIANT-REVIEW", f"qwen-retired: structural-only, uncertain->WR-review ({type(e).__name__})")
    u = out.upper()
    if "KNOWN-NEGATE" in u:
        v = "KNOWN-NEGATE"
    elif "NOVEL-VARIANT" in u or "NOVEL" in u:
        v = "NOVEL-VARIANT-REVIEW"
    elif "NO-MATCH" in u or "NO MATCH" in u:
        v = "NO-MATCH-PROCEED"
    else:
        v = "NOVEL-VARIANT-REVIEW"  # safe default (bias: uncertain -> review)
    return v, out[:400]


if __name__ == "__main__":
    print("qwen3 helper self-test:", chat("/no_think reply with: HELPER_OK", num_predict=12))
