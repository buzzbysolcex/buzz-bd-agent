#!/usr/bin/env python3
"""Lasso prompt-injection-defender hook for Claude Code.

Runs as a PostToolUse hook on Bash tool calls. Reads the tool output
from stdin (JSON) and scans for common prompt-injection patterns that
could hijack the agent's behaviour.

Exit codes:
  0  - safe (no injection detected)
  2  - blocked (injection pattern found, stderr sent to Claude)
  other - non-blocking error (logged, execution continues)
"""

import json
import re
import sys
from typing import List, Optional

INJECTION_PATTERNS = [
    # Direct instruction overrides
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    r"forget\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)",
    # Role hijacking
    r"you\s+are\s+now\s+(a|an|the)\s+",
    r"act\s+as\s+(a|an|the)\s+",
    r"pretend\s+(you\s+are|to\s+be)\s+",
    r"switch\s+to\s+.{0,30}\s+mode",
    # System prompt extraction
    r"(print|output|show|reveal|display)\s+(your\s+)?(system\s+prompt|instructions|rules)",
    r"what\s+(are|is)\s+your\s+(system\s+prompt|instructions|rules)",
    # Hidden instructions in tool output
    r"<\s*system\s*>",
    r"\[INST\]",
    r"\[\/INST\]",
    r"<<\s*SYS\s*>>",
    # Dangerous command patterns that might be injected
    r"curl\s+.*\|\s*(ba)?sh",
    r"wget\s+.*\|\s*(ba)?sh",
    r"eval\s*\(\s*base64",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in INJECTION_PATTERNS]


def scan_text(text: str) -> Optional[str]:
    """Return the first matching injection pattern description, or None."""
    for pattern in COMPILED_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(0)
    return None


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            sys.exit(0)

        data = json.loads(raw)
    except (json.JSONDecodeError, Exception):
        # Can't parse input - don't block, just exit cleanly
        sys.exit(0)

    # Collect text fields to scan from the tool response
    texts_to_scan = []  # type: List[str]

    tool_response = data.get("tool_response", {})
    if isinstance(tool_response, str):
        texts_to_scan.append(tool_response)
    elif isinstance(tool_response, dict):
        for value in tool_response.values():
            if isinstance(value, str):
                texts_to_scan.append(value)

    # Also scan stdout/stderr if present
    for key in ("stdout", "stderr", "output"):
        val = tool_response.get(key, "") if isinstance(tool_response, dict) else ""
        if isinstance(val, str) and val:
            texts_to_scan.append(val)

    # Scan all collected text
    for text in texts_to_scan:
        finding = scan_text(text)
        if finding:
            msg = f"Prompt-injection pattern detected in Bash output: '{finding}'"
            print(msg, file=sys.stderr)
            sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
