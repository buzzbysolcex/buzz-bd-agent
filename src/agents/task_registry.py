# src/agents/task_registry.py
import fcntl
import json
import os
import tempfile
import threading
import time
import uuid
from typing import Dict, List, Optional

DEFAULT_PATH = "/data/workspace/memory/active-tasks.json"
MAX_RETRIES = 3


class TaskRegistry:
    def __init__(self, path: str = DEFAULT_PATH):
        self._path = path
        self._lock = threading.Lock()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            self._write([])

    def create_task(self, agent_name: str, params: Dict) -> Dict:
        task = {
            "id": str(uuid.uuid4()),
            "agent_name": agent_name,
            "status": "queued",
            "started_at": time.time(),
            "completed_at": None,
            "params": params,
            "result_summary": "",
            "retry_count": 0,
            "error": None,
        }
        with self._lock:
            tasks = self._read()
            tasks.append(task)
            self._write(tasks)
        return task

    def update_status(
        self,
        task_id: str,
        status: str,
        result_summary: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        with self._lock:
            tasks = self._read()
            for task in tasks:
                if task["id"] == task_id:
                    task["status"] = status
                    if result_summary is not None:
                        task["result_summary"] = result_summary
                    if error is not None:
                        task["error"] = error
                    if status == "failed":
                        task["retry_count"] += 1
                        task["completed_at"] = time.time()
                    if status == "done":
                        task["completed_at"] = time.time()
                    self._write(tasks)
                    return
            raise KeyError(f"Task not found: {task_id}")

    def get_active(self) -> List[Dict]:
        tasks = self._read()
        return [t for t in tasks if t["status"] in ("queued", "running")]

    def get_failed(self) -> List[Dict]:
        tasks = self._read()
        return [
            t for t in tasks
            if t["status"] == "failed" and t["retry_count"] < MAX_RETRIES
        ]

    def get_retryable(self) -> List[Dict]:
        return self.get_failed()

    def cleanup_stale(self, timeout_minutes: int = 30) -> None:
        with self._lock:
            tasks = self._read()
            cutoff = time.time() - timeout_minutes * 60
            changed = False
            for task in tasks:
                if task["status"] == "running" and task["started_at"] < cutoff:
                    task["status"] = "failed"
                    task["error"] = "Stale: timed out after inactivity"
                    task["retry_count"] += 1
                    task["completed_at"] = time.time()
                    changed = True
            if changed:
                self._write(tasks)

    def get_summary(self) -> Dict[str, int]:
        tasks = self._read()
        summary = {"queued": 0, "running": 0, "done": 0, "failed": 0}
        for task in tasks:
            status = task["status"]
            if status in summary:
                summary[status] += 1
        return summary

    def clear_completed(self, older_than_hours: int = 24) -> None:
        with self._lock:
            tasks = self._read()
            cutoff = time.time() - older_than_hours * 3600
            tasks = [
                t for t in tasks
                if not (t["status"] == "done" and t.get("completed_at", 0) < cutoff)
            ]
            self._write(tasks)

    def _read(self) -> List[Dict]:
        with open(self._path, "r") as f:
            fcntl.flock(f, fcntl.LOCK_SH)
            try:
                return json.load(f)
            finally:
                fcntl.flock(f, fcntl.LOCK_UN)

    def _write(self, tasks: List[Dict]) -> None:
        dir_name = os.path.dirname(self._path)
        fd, tmp_path = tempfile.mkstemp(dir=dir_name, suffix=".tmp")
        try:
            with os.fdopen(fd, "w") as f:
                json.dump(tasks, f, indent=2)
            os.replace(tmp_path, self._path)
        except BaseException:
            os.unlink(tmp_path)
            raise
