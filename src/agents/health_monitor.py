# src/agents/health_monitor.py
import json
import os
import time
from typing import Any, Dict, List, Optional


class HealthMonitor:
    def __init__(
        self,
        tasks_path: str = "/data/workspace/memory/active-tasks.json",
        crons_path: str = "/data/workspace/memory/cron-schedule.json",
        pipeline_path: str = "/data/workspace/memory/pipeline/active.json",
        memory_dir: str = "/data/workspace/memory/",
    ):
        self._tasks_path = tasks_path
        self._crons_path = crons_path
        self._pipeline_path = pipeline_path
        self._memory_dir = memory_dir

    def check_stale_tasks(self, timeout_minutes: int = 30) -> List[Dict]:
        tasks = self._read_json(self._tasks_path, default=[])
        cutoff = time.time() - timeout_minutes * 60
        return [
            t for t in tasks
            if t.get("status") == "running" and t.get("started_at", 0) < cutoff
        ]

    def check_crons(self, expected_count: int = 36) -> Dict:
        jobs = self._read_json(self._crons_path, default=[])
        total = len(jobs)
        missing = max(0, expected_count - total)
        status = "green" if total >= expected_count else "red"
        return {"total": total, "missing": missing, "status": status}

    def check_last_scan(self, max_hours: int = 6) -> Dict:
        log_path = os.path.join(self._memory_dir, "daily-log.json")
        entries = self._read_json(log_path, default=[])
        scan_entries = [e for e in entries if e.get("type") == "scan"]

        if not scan_entries:
            return {"last_scan": None, "hours_ago": None, "status": "red"}

        latest_ts = max(e["timestamp"] for e in scan_entries)
        hours_ago = (time.time() - latest_ts) / 3600

        if hours_ago > max_hours:
            status = "red"
        elif hours_ago > max_hours / 2:
            status = "yellow"
        else:
            status = "green"

        return {"last_scan": latest_ts, "hours_ago": round(hours_ago, 2), "status": status}

    def check_pipeline(self) -> Dict[str, int]:
        entries = self._read_json(self._pipeline_path, default=[])
        counts: Dict[str, int] = {}
        for entry in entries:
            stage = entry.get("stage", "UNKNOWN")
            counts[stage] = counts.get(stage, 0) + 1
        return counts

    def full_health_check(self) -> Dict:
        stale = self.check_stale_tasks()
        tasks_status = "red" if stale else "green"
        tasks_report = {"stale_count": len(stale), "status": tasks_status}

        crons_report = self.check_crons()
        scans_report = self.check_last_scan()
        pipeline_report = self.check_pipeline()

        components = {
            "tasks": tasks_report,
            "crons": crons_report,
            "scans": scans_report,
            "pipeline": pipeline_report,
        }

        statuses = [tasks_status, crons_report["status"], scans_report["status"]]
        if "red" in statuses:
            overall = "red"
        elif "yellow" in statuses:
            overall = "yellow"
        else:
            overall = "green"

        return {
            "overall": overall,
            "components": components,
            "timestamp": time.time(),
        }

    def format_telegram_alert(self, health_report: Dict) -> Optional[str]:
        if health_report["overall"] == "green":
            return None

        level = health_report["overall"].upper()
        components = health_report["components"]
        lines = [f"\u26a0\ufe0f *Health Alert: {level}*", ""]

        tasks = components.get("tasks", {})
        if tasks.get("stale_count", 0) > 0:
            lines.append(f"\u231b Stale tasks: {tasks['stale_count']}")

        crons = components.get("crons", {})
        if crons.get("status") != "green":
            lines.append(f"\u23f0 Crons: {crons.get('total', 0)} loaded, {crons.get('missing', 0)} missing")

        scans = components.get("scans", {})
        if scans.get("status") != "green":
            hours = scans.get("hours_ago")
            if hours is not None:
                lines.append(f"\U0001f50d Last scan: {hours:.1f}h ago")
            else:
                lines.append("\U0001f50d Last scan: none found")

        pipeline = components.get("pipeline", {})
        if pipeline:
            stages = ", ".join(f"{k}: {v}" for k, v in pipeline.items())
            lines.append(f"\U0001f4e6 Pipeline: {stages}")

        return "\n".join(lines)

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
