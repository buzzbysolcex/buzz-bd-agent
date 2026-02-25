# src/agents/memory_manager.py
import json
import os
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

NEVER_PURGE_KEYS = frozenset({
    "active_outreach",
    "high_score_prospects",
    "api_keys",
    "cron_schedule",
    "experience_patterns",
    "partnerships",
    "erc_8004_data",
})

PROTECTED_STAGES = frozenset({"OUTREACH_SENT", "WARM_UP", "QUALIFIED"})

PURGE_SCORE_THRESHOLD = 50
PURGE_AGE_HOURS = 48
HIGH_SCORE_THRESHOLD = 70
EXPECTED_CRONS = 36

# 6-field cron format: seconds minutes hours dom month dow
# The OpenClaw gateway uses node-cron which requires the seconds field.
# Previous 5-field format ("*/5 * * * *") was silently rejected.
DEFAULT_CRON_EXPRESSION = "0 */5 * * * *"

# AST = UTC-4
AST_OFFSET = timedelta(hours=-4)


class MemoryManager:
    def __init__(self, memory_dir: str = "/data/workspace/memory/"):
        self._memory_dir = memory_dir
        self._pipeline_path = os.path.join(memory_dir, "pipeline", "active.json")
        self._experience_path = os.path.join(memory_dir, "experience.json")
        self._crons_path = os.path.join(memory_dir, "cron-schedule.json")

        for subdir in [
            "pipeline",
            "contacts",
            "security",
            os.path.join("reports", "weekly"),
        ]:
            os.makedirs(os.path.join(memory_dir, subdir), exist_ok=True)

    # ------------------------------------------------------------------
    # Daily log
    # ------------------------------------------------------------------

    def write_daily_log(self, action: str, result: str) -> None:
        now_ast = datetime.now(timezone(AST_OFFSET))
        date_str = now_ast.strftime("%Y-%m-%d")
        time_str = now_ast.strftime("%H:%M")
        line = f"[{time_str} AST] {action}: {result}\n"
        path = os.path.join(self._memory_dir, f"{date_str}.md")
        with open(path, "a") as f:
            f.write(line)

    def read_daily_log(self, date: Optional[str] = None) -> Optional[str]:
        if date is None:
            now_ast = datetime.now(timezone(AST_OFFSET))
            date = now_ast.strftime("%Y-%m-%d")
        path = os.path.join(self._memory_dir, f"{date}.md")
        if not os.path.exists(path):
            return None
        with open(path, "r") as f:
            return f.read()

    # ------------------------------------------------------------------
    # Experience patterns
    # ------------------------------------------------------------------

    def read_experience(self) -> List[Dict]:
        return self._read_json(self._experience_path, default=[])

    def write_experience(self, pattern_dict: Dict) -> None:
        patterns = self.read_experience()
        patterns.append(pattern_dict)
        self._write_json(self._experience_path, patterns)

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------

    def read_pipeline(self) -> List[Dict]:
        return self._read_json(self._pipeline_path, default=[])

    def update_pipeline(self, prospect_dict: Dict) -> None:
        prospects = self.read_pipeline()
        addr = prospect_dict["contract_address"]
        for i, p in enumerate(prospects):
            if p.get("contract_address") == addr:
                prospects[i] = prospect_dict
                self._write_json(self._pipeline_path, prospects)
                return
        prospects.append(prospect_dict)
        self._write_json(self._pipeline_path, prospects)

    def get_pipeline_summary(self) -> Dict[str, int]:
        prospects = self.read_pipeline()
        counts: Dict[str, int] = {}
        for p in prospects:
            stage = p.get("stage", "UNKNOWN")
            counts[stage] = counts.get(stage, 0) + 1
        return counts

    # ------------------------------------------------------------------
    # Compression (section 16 rules)
    # ------------------------------------------------------------------

    def compress_day(self, date: Optional[str] = None) -> Dict[str, int]:
        prospects = self.read_pipeline()
        if not prospects:
            return {"kept": 0, "purged": 0}

        cutoff = time.time() - PURGE_AGE_HOURS * 3600
        kept = []
        purged = 0

        for p in prospects:
            score = p.get("score", 0)
            ts = p.get("timestamp", time.time())
            stage = p.get("stage", "")

            # Never purge: active outreach, 70+ prospects, protected stages
            if stage in PROTECTED_STAGES:
                kept.append(p)
            elif score >= HIGH_SCORE_THRESHOLD:
                kept.append(p)
            elif score < PURGE_SCORE_THRESHOLD and ts < cutoff:
                purged += 1
            else:
                kept.append(p)

        self._write_json(self._pipeline_path, kept)
        return {"kept": len(kept), "purged": purged}

    # ------------------------------------------------------------------
    # Boot recovery (section 11.4)
    # ------------------------------------------------------------------

    def on_boot(self) -> Dict:
        # Crons
        crons = self._read_json(self._crons_path, default=[])
        crons_found = len(crons)
        crons_ok = crons_found >= EXPECTED_CRONS

        crons_missing = []
        if not crons_ok:
            existing_names = {j.get("name") for j in crons}
            expected_names = {f"job_{i}" for i in range(EXPECTED_CRONS)}
            crons_missing = sorted(expected_names - existing_names)

        # Experience
        experience = self.read_experience()

        # Pipeline
        pipeline = self.read_pipeline()

        status = "green" if crons_ok else "red"

        return {
            "crons_ok": crons_ok,
            "crons_found": crons_found,
            "crons_expected": EXPECTED_CRONS,
            "crons_missing": crons_missing,
            "experience_loaded": len(experience),
            "pipeline_loaded": len(pipeline),
            "status": status,
        }

    # ------------------------------------------------------------------
    # Never-purge keys
    # ------------------------------------------------------------------

    def generate_default_crons(self, count: int = EXPECTED_CRONS) -> List[Dict]:
        return [
            {"name": f"job_{i}", "schedule": DEFAULT_CRON_EXPRESSION}
            for i in range(count)
        ]

    def get_never_purge_keys(self) -> frozenset:
        return NEVER_PURGE_KEYS

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _read_json(self, path: str, default: Any = None) -> Any:
        if not os.path.exists(path):
            return default
        try:
            with open(path, "r") as f:
                content = f.read()
                if not content.strip():
                    return default
                return json.loads(content)
        except (json.JSONDecodeError, OSError):
            return default

    def _write_json(self, path: str, data: Any) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
