# src/agents/tests/test_task_registry.py
import json
import time
import pytest
from src.agents.task_registry import TaskRegistry, DEFAULT_PATH


class TestTaskRegistryInit:
    def test_creates_empty_registry_file(self, tmp_path):
        path = tmp_path / "tasks.json"
        registry = TaskRegistry(str(path))
        assert path.exists()
        assert json.loads(path.read_text()) == []

    def test_loads_existing_file(self, tmp_path):
        path = tmp_path / "tasks.json"
        existing = [{"id": "abc", "agent_name": "scorer", "status": "queued"}]
        path.write_text(json.dumps(existing))
        registry = TaskRegistry(str(path))
        tasks = registry.get_active()
        assert len(tasks) == 1
        assert tasks[0]["id"] == "abc"

    def test_creates_parent_directories(self, tmp_path):
        path = tmp_path / "nested" / "deep" / "tasks.json"
        registry = TaskRegistry(str(path))
        assert path.exists()

    def test_default_path(self):
        assert DEFAULT_PATH == "/data/workspace/memory/active-tasks.json"


class TestCreateTask:
    def test_returns_task_dict(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {"token": "0xabc"})
        assert isinstance(task, dict)

    def test_task_has_uuid_id(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert isinstance(task["id"], str)
        assert len(task["id"]) == 36  # UUID format

    def test_task_has_agent_name(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("safety", {"chain": "solana"})
        assert task["agent_name"] == "safety"

    def test_task_status_is_queued(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert task["status"] == "queued"

    def test_task_has_started_at_timestamp(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        before = time.time()
        task = registry.create_task("scorer", {})
        after = time.time()
        assert before <= task["started_at"] <= after

    def test_task_completed_at_is_none(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert task["completed_at"] is None

    def test_task_has_params(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        params = {"token": "0xabc", "chain": "solana"}
        task = registry.create_task("scorer", params)
        assert task["params"] == params

    def test_task_result_summary_is_empty(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert task["result_summary"] == ""

    def test_task_retry_count_is_zero(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert task["retry_count"] == 0

    def test_task_error_is_none(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        assert task["error"] is None

    def test_task_persisted_to_file(self, tmp_path):
        path = tmp_path / "tasks.json"
        registry = TaskRegistry(str(path))
        task = registry.create_task("scorer", {"x": 1})
        data = json.loads(path.read_text())
        assert len(data) == 1
        assert data[0]["id"] == task["id"]

    def test_multiple_tasks_have_unique_ids(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        t1 = registry.create_task("scorer", {})
        t2 = registry.create_task("safety", {})
        t3 = registry.create_task("wallet", {})
        assert len({t1["id"], t2["id"], t3["id"]}) == 3


class TestUpdateStatus:
    def test_updates_status(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "running"

    def test_updates_to_done_with_summary(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "done", result_summary="score=85")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "done"
        assert data[0]["result_summary"] == "score=85"

    def test_updates_to_done_sets_completed_at(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        before = time.time()
        registry.update_status(task["id"], "done")
        after = time.time()
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert before <= data[0]["completed_at"] <= after

    def test_updates_to_failed_with_error(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="API timeout")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "failed"
        assert data[0]["error"] == "API timeout"

    def test_failed_increments_retry_count(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err1")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["retry_count"] == 1

    def test_multiple_failures_increment_retry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err1")
        registry.update_status(task["id"], "failed", error="err2")
        registry.update_status(task["id"], "failed", error="err3")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["retry_count"] == 3

    def test_raises_on_unknown_task_id(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        with pytest.raises(KeyError):
            registry.update_status("nonexistent-id", "running")

    def test_sets_completed_at_on_failed(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err")
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["completed_at"] is not None


class TestGetActive:
    def test_empty_registry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        assert registry.get_active() == []

    def test_returns_queued_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        registry.create_task("scorer", {})
        active = registry.get_active()
        assert len(active) == 1
        assert active[0]["status"] == "queued"

    def test_returns_running_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        active = registry.get_active()
        assert len(active) == 1
        assert active[0]["status"] == "running"

    def test_excludes_done_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "done")
        assert registry.get_active() == []

    def test_excludes_failed_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err")
        assert registry.get_active() == []

    def test_mixed_statuses(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        t1 = registry.create_task("scorer", {})
        t2 = registry.create_task("safety", {})
        t3 = registry.create_task("wallet", {})
        registry.update_status(t1["id"], "running")
        registry.update_status(t2["id"], "done")
        # t3 stays queued
        active = registry.get_active()
        ids = [t["id"] for t in active]
        assert t1["id"] in ids
        assert t3["id"] in ids
        assert t2["id"] not in ids


class TestGetFailed:
    def test_empty_registry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        assert registry.get_failed() == []

    def test_returns_failed_under_max_retries(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err")
        failed = registry.get_failed()
        assert len(failed) == 1

    def test_excludes_tasks_at_max_retries(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="e1")
        registry.update_status(task["id"], "failed", error="e2")
        registry.update_status(task["id"], "failed", error="e3")
        failed = registry.get_failed()
        assert len(failed) == 0

    def test_excludes_non_failed_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        t1 = registry.create_task("scorer", {})
        t2 = registry.create_task("safety", {})
        registry.update_status(t1["id"], "done")
        # t2 stays queued
        assert registry.get_failed() == []


class TestGetRetryable:
    def test_empty_registry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        assert registry.get_retryable() == []

    def test_returns_failed_with_retries_left(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="err")
        retryable = registry.get_retryable()
        assert len(retryable) == 1
        assert retryable[0]["retry_count"] < 3

    def test_excludes_max_retries(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        for _ in range(3):
            registry.update_status(task["id"], "failed", error="err")
        assert registry.get_retryable() == []

    def test_two_retries_still_retryable(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "failed", error="e1")
        registry.update_status(task["id"], "failed", error="e2")
        retryable = registry.get_retryable()
        assert len(retryable) == 1
        assert retryable[0]["retry_count"] == 2


class TestCleanupStale:
    def test_marks_old_running_as_failed(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        # Manually backdate the started_at
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["started_at"] = time.time() - 3600  # 1 hour ago
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        registry.cleanup_stale(timeout_minutes=30)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "failed"
        assert "stale" in data[0]["error"].lower()

    def test_does_not_touch_recent_running(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        registry.cleanup_stale(timeout_minutes=30)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "running"

    def test_does_not_touch_queued_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        # Backdate
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["started_at"] = time.time() - 3600
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        registry.cleanup_stale(timeout_minutes=30)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "queued"

    def test_custom_timeout(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        # Backdate to 10 minutes ago
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["started_at"] = time.time() - 600
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        # 15-min timeout: should NOT clean up
        registry.cleanup_stale(timeout_minutes=15)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "running"
        # 5-min timeout: should clean up
        registry.cleanup_stale(timeout_minutes=5)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["status"] == "failed"

    def test_stale_cleanup_increments_retry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "running")
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["started_at"] = time.time() - 3600
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        registry.cleanup_stale(timeout_minutes=30)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert data[0]["retry_count"] == 1


class TestGetSummary:
    def test_empty_registry(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        summary = registry.get_summary()
        assert summary == {"queued": 0, "running": 0, "done": 0, "failed": 0}

    def test_counts_by_status(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        t1 = registry.create_task("scorer", {})
        t2 = registry.create_task("safety", {})
        t3 = registry.create_task("wallet", {})
        t4 = registry.create_task("social", {})
        registry.update_status(t1["id"], "running")
        registry.update_status(t2["id"], "done")
        registry.update_status(t3["id"], "failed", error="err")
        # t4 stays queued
        summary = registry.get_summary()
        assert summary == {"queued": 1, "running": 1, "done": 1, "failed": 1}

    def test_multiple_of_same_status(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        for _ in range(5):
            registry.create_task("scorer", {})
        summary = registry.get_summary()
        assert summary["queued"] == 5


class TestClearCompleted:
    def test_removes_old_done_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "done")
        # Backdate completed_at to 48 hours ago
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["completed_at"] = time.time() - 48 * 3600
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        registry.clear_completed(older_than_hours=24)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 0

    def test_keeps_recent_done_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "done")
        registry.clear_completed(older_than_hours=24)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 1

    def test_does_not_touch_non_done_tasks(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        t1 = registry.create_task("scorer", {})
        t2 = registry.create_task("safety", {})
        registry.update_status(t1["id"], "running")
        registry.update_status(t2["id"], "failed", error="err")
        registry.clear_completed(older_than_hours=0)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 2

    def test_custom_hours_threshold(self, tmp_path):
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})
        registry.update_status(task["id"], "done")
        # Backdate to 2 hours ago
        data = json.loads((tmp_path / "tasks.json").read_text())
        data[0]["completed_at"] = time.time() - 2 * 3600
        (tmp_path / "tasks.json").write_text(json.dumps(data))
        # 4-hour threshold: should keep
        registry.clear_completed(older_than_hours=4)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 1
        # 1-hour threshold: should remove
        registry.clear_completed(older_than_hours=1)
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 0


class TestThreadSafety:
    def test_concurrent_creates(self, tmp_path):
        """Multiple creates should not lose data."""
        import threading
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        ids = []
        lock = threading.Lock()

        def create_task(n):
            task = registry.create_task(f"agent_{n}", {"n": n})
            with lock:
                ids.append(task["id"])

        threads = [threading.Thread(target=create_task, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(ids) == 10
        assert len(set(ids)) == 10
        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 10

    def test_concurrent_create_and_update(self, tmp_path):
        """Create and update should not corrupt file."""
        import threading
        registry = TaskRegistry(str(tmp_path / "tasks.json"))
        task = registry.create_task("scorer", {})

        def update_task():
            registry.update_status(task["id"], "running")

        def create_another():
            registry.create_task("safety", {})

        t1 = threading.Thread(target=update_task)
        t2 = threading.Thread(target=create_another)
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        data = json.loads((tmp_path / "tasks.json").read_text())
        assert len(data) == 2
