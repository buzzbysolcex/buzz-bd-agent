# src/agents/tests/test_health_monitor.py
import json
import time
import pytest
from src.agents.health_monitor import HealthMonitor


# ---------------------------------------------------------------------------
# Helpers — write sample JSON fixtures into tmp_path
# ---------------------------------------------------------------------------

def _write_tasks(tmp_path, tasks):
    path = tmp_path / "active-tasks.json"
    path.write_text(json.dumps(tasks))
    return str(path)


def _write_crons(tmp_path, jobs):
    path = tmp_path / "cron-schedule.json"
    path.write_text(json.dumps(jobs))
    return str(path)


def _write_pipeline(tmp_path, entries):
    pdir = tmp_path / "pipeline"
    pdir.mkdir(exist_ok=True)
    path = pdir / "active.json"
    path.write_text(json.dumps(entries))
    return str(path)


def _make_task(status="queued", started_at=None, agent_name="scorer"):
    return {
        "id": "fake-id",
        "agent_name": agent_name,
        "status": status,
        "started_at": started_at or time.time(),
        "completed_at": None,
        "params": {},
        "result_summary": "",
        "retry_count": 0,
        "error": None,
    }


def _make_cron_jobs(count=36):
    return [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(count)]


def _make_pipeline_entries(stages=None):
    if stages is None:
        stages = {"DISCOVERED": 5, "SCORED": 3, "QUALIFIED": 2, "LISTED": 1}
    entries = []
    for stage, count in stages.items():
        for i in range(count):
            entries.append({"token": f"0x{stage.lower()}{i}", "stage": stage})
    return entries


def _make_monitor(tmp_path, tasks=None, crons=None, pipeline=None, memory_dir=None):
    tasks_path = _write_tasks(tmp_path, tasks if tasks is not None else [])
    crons_path = _write_crons(tmp_path, crons if crons is not None else _make_cron_jobs())
    pipeline_path = _write_pipeline(tmp_path, pipeline if pipeline is not None else [])
    mem_dir = memory_dir or str(tmp_path / "memory")
    return HealthMonitor(
        tasks_path=tasks_path,
        crons_path=crons_path,
        pipeline_path=pipeline_path,
        memory_dir=mem_dir,
    )


# ---------------------------------------------------------------------------
# TestInit
# ---------------------------------------------------------------------------

class TestHealthMonitorInit:
    def test_stores_config_paths(self, tmp_path):
        monitor = _make_monitor(tmp_path)
        assert monitor._tasks_path.endswith("active-tasks.json")
        assert monitor._crons_path.endswith("cron-schedule.json")
        assert monitor._pipeline_path.endswith("active.json")

    def test_does_not_extend_base_agent(self, tmp_path):
        from src.agents.base_agent import BaseAgent
        monitor = _make_monitor(tmp_path)
        assert not isinstance(monitor, BaseAgent)


# ---------------------------------------------------------------------------
# TestCheckStaleTasks
# ---------------------------------------------------------------------------

class TestCheckStaleTasks:
    def test_empty_tasks_returns_empty(self, tmp_path):
        monitor = _make_monitor(tmp_path, tasks=[])
        assert monitor.check_stale_tasks() == []

    def test_recent_running_not_stale(self, tmp_path):
        tasks = [_make_task(status="running", started_at=time.time())]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        assert monitor.check_stale_tasks(timeout_minutes=30) == []

    def test_old_running_is_stale(self, tmp_path):
        tasks = [_make_task(status="running", started_at=time.time() - 3600)]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        stale = monitor.check_stale_tasks(timeout_minutes=30)
        assert len(stale) == 1
        assert stale[0]["status"] == "running"

    def test_queued_not_stale(self, tmp_path):
        tasks = [_make_task(status="queued", started_at=time.time() - 3600)]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        assert monitor.check_stale_tasks(timeout_minutes=30) == []

    def test_done_not_stale(self, tmp_path):
        tasks = [_make_task(status="done", started_at=time.time() - 7200)]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        assert monitor.check_stale_tasks(timeout_minutes=30) == []

    def test_custom_timeout(self, tmp_path):
        tasks = [_make_task(status="running", started_at=time.time() - 600)]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        assert monitor.check_stale_tasks(timeout_minutes=15) == []
        assert len(monitor.check_stale_tasks(timeout_minutes=5)) == 1

    def test_multiple_stale(self, tmp_path):
        old = time.time() - 3600
        tasks = [
            _make_task(status="running", started_at=old, agent_name="scorer"),
            _make_task(status="running", started_at=old, agent_name="safety"),
            _make_task(status="running", started_at=time.time(), agent_name="wallet"),
        ]
        monitor = _make_monitor(tmp_path, tasks=tasks)
        stale = monitor.check_stale_tasks(timeout_minutes=30)
        assert len(stale) == 2


# ---------------------------------------------------------------------------
# TestCheckCrons
# ---------------------------------------------------------------------------

class TestCheckCrons:
    def test_all_present(self, tmp_path):
        monitor = _make_monitor(tmp_path, crons=_make_cron_jobs(36))
        result = monitor.check_crons(expected_count=36)
        assert result["total"] == 36
        assert result["missing"] == 0
        assert result["status"] == "green"

    def test_some_missing(self, tmp_path):
        monitor = _make_monitor(tmp_path, crons=_make_cron_jobs(30))
        result = monitor.check_crons(expected_count=36)
        assert result["total"] == 30
        assert result["missing"] == 6
        assert result["status"] == "red"

    def test_zero_crons(self, tmp_path):
        monitor = _make_monitor(tmp_path, crons=[])
        result = monitor.check_crons(expected_count=36)
        assert result["total"] == 0
        assert result["missing"] == 36
        assert result["status"] == "red"

    def test_exact_count_is_green(self, tmp_path):
        monitor = _make_monitor(tmp_path, crons=_make_cron_jobs(10))
        result = monitor.check_crons(expected_count=10)
        assert result["status"] == "green"

    def test_extra_crons_still_green(self, tmp_path):
        monitor = _make_monitor(tmp_path, crons=_make_cron_jobs(40))
        result = monitor.check_crons(expected_count=36)
        assert result["total"] == 40
        assert result["missing"] == 0
        assert result["status"] == "green"


# ---------------------------------------------------------------------------
# TestCheckLastScan
# ---------------------------------------------------------------------------

class TestCheckLastScan:
    def test_recent_scan_is_green(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 1800}]  # 30 min ago
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "green"
        assert result["last_scan"] is not None
        assert result["hours_ago"] < 1

    def test_old_scan_is_yellow(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 5 * 3600}]  # 5h ago
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "yellow"
        assert 4 < result["hours_ago"] < 6

    def test_very_old_scan_is_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 8 * 3600}]  # 8h ago
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "red"
        assert result["hours_ago"] > 6

    def test_no_log_file_is_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "red"
        assert result["last_scan"] is None

    def test_log_with_no_scan_entries_is_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "evaluate", "timestamp": time.time()}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "red"
        assert result["last_scan"] is None

    def test_uses_most_recent_scan(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        now = time.time()
        log = [
            {"type": "scan", "timestamp": now - 7200},
            {"type": "scan", "timestamp": now - 600},
            {"type": "scan", "timestamp": now - 3600},
        ]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan(max_hours=6)
        assert result["status"] == "green"
        assert result["hours_ago"] < 0.5

    def test_custom_max_hours(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 2 * 3600}]  # 2h ago
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        assert monitor.check_last_scan(max_hours=1)["status"] == "red"
        assert monitor.check_last_scan(max_hours=6)["status"] == "green"


# ---------------------------------------------------------------------------
# TestCheckPipeline
# ---------------------------------------------------------------------------

class TestCheckPipeline:
    def test_counts_by_stage(self, tmp_path):
        stages = {"DISCOVERED": 5, "SCORED": 3, "QUALIFIED": 2, "LISTED": 1}
        entries = _make_pipeline_entries(stages)
        monitor = _make_monitor(tmp_path, pipeline=entries)
        result = monitor.check_pipeline()
        assert result["DISCOVERED"] == 5
        assert result["SCORED"] == 3
        assert result["QUALIFIED"] == 2
        assert result["LISTED"] == 1

    def test_empty_pipeline(self, tmp_path):
        monitor = _make_monitor(tmp_path, pipeline=[])
        result = monitor.check_pipeline()
        assert result == {}

    def test_single_stage(self, tmp_path):
        entries = [{"token": "0x1", "stage": "DISCOVERED"}]
        monitor = _make_monitor(tmp_path, pipeline=entries)
        result = monitor.check_pipeline()
        assert result == {"DISCOVERED": 1}

    def test_unknown_stages_counted(self, tmp_path):
        entries = [
            {"token": "0x1", "stage": "CUSTOM_STAGE"},
            {"token": "0x2", "stage": "CUSTOM_STAGE"},
        ]
        monitor = _make_monitor(tmp_path, pipeline=entries)
        result = monitor.check_pipeline()
        assert result["CUSTOM_STAGE"] == 2


# ---------------------------------------------------------------------------
# TestFullHealthCheck
# ---------------------------------------------------------------------------

class TestFullHealthCheck:
    def test_all_green(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 1800}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(
            tmp_path,
            tasks=[],
            crons=_make_cron_jobs(36),
            pipeline=_make_pipeline_entries(),
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["overall"] == "green"
        assert "tasks" in report["components"]
        assert "crons" in report["components"]
        assert "scans" in report["components"]
        assert "pipeline" in report["components"]
        assert isinstance(report["timestamp"], float)

    def test_red_if_any_component_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        # no scan log => scans red
        monitor = _make_monitor(
            tmp_path,
            tasks=[],
            crons=_make_cron_jobs(36),
            pipeline=[],
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["overall"] == "red"

    def test_yellow_if_any_component_yellow_none_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        # scan 5h ago => yellow (within 6h window but past halfway)
        log = [{"type": "scan", "timestamp": time.time() - 5 * 3600}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(
            tmp_path,
            tasks=[],
            crons=_make_cron_jobs(36),
            pipeline=[],
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["overall"] == "yellow"

    def test_red_overrides_yellow(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        # scan 5h ago => yellow, but crons missing => red
        log = [{"type": "scan", "timestamp": time.time() - 5 * 3600}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(
            tmp_path,
            tasks=[],
            crons=_make_cron_jobs(10),
            pipeline=[],
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["overall"] == "red"

    def test_stale_tasks_makes_red(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time() - 1800}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        stale_task = _make_task(status="running", started_at=time.time() - 3600)
        monitor = _make_monitor(
            tmp_path,
            tasks=[stale_task],
            crons=_make_cron_jobs(36),
            pipeline=[],
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["overall"] == "red"

    def test_components_contain_individual_results(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        log = [{"type": "scan", "timestamp": time.time()}]
        (mem_dir / "daily-log.json").write_text(json.dumps(log))
        monitor = _make_monitor(
            tmp_path,
            tasks=[],
            crons=_make_cron_jobs(36),
            pipeline=_make_pipeline_entries({"SCORED": 2}),
            memory_dir=str(mem_dir),
        )
        report = monitor.full_health_check()
        assert report["components"]["crons"]["total"] == 36
        assert report["components"]["pipeline"]["SCORED"] == 2
        assert report["components"]["scans"]["status"] == "green"


# ---------------------------------------------------------------------------
# TestFormatTelegramAlert
# ---------------------------------------------------------------------------

class TestFormatTelegramAlert:
    def test_returns_none_for_green(self, tmp_path):
        monitor = _make_monitor(tmp_path)
        report = {"overall": "green", "components": {}, "timestamp": time.time()}
        assert monitor.format_telegram_alert(report) is None

    def test_returns_string_for_yellow(self, tmp_path):
        monitor = _make_monitor(tmp_path)
        report = {
            "overall": "yellow",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": time.time() - 5 * 3600, "hours_ago": 5.0, "status": "yellow"},
                "pipeline": {"DISCOVERED": 3},
            },
            "timestamp": time.time(),
        }
        text = monitor.format_telegram_alert(report)
        assert isinstance(text, str)
        assert "yellow" in text.lower() or "YELLOW" in text

    def test_returns_string_for_red(self, tmp_path):
        monitor = _make_monitor(tmp_path)
        report = {
            "overall": "red",
            "components": {
                "tasks": {"stale_count": 2, "status": "red"},
                "crons": {"total": 30, "missing": 6, "status": "red"},
                "scans": {"last_scan": None, "hours_ago": None, "status": "red"},
                "pipeline": {},
            },
            "timestamp": time.time(),
        }
        text = monitor.format_telegram_alert(report)
        assert isinstance(text, str)
        assert len(text) > 10

    def test_alert_includes_component_details(self, tmp_path):
        monitor = _make_monitor(tmp_path)
        report = {
            "overall": "red",
            "components": {
                "tasks": {"stale_count": 2, "status": "red"},
                "crons": {"total": 30, "missing": 6, "status": "red"},
                "scans": {"last_scan": None, "hours_ago": None, "status": "red"},
                "pipeline": {"DISCOVERED": 5},
            },
            "timestamp": time.time(),
        }
        text = monitor.format_telegram_alert(report)
        assert "task" in text.lower() or "stale" in text.lower()
        assert "cron" in text.lower()


# ---------------------------------------------------------------------------
# TestEdgeCases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_missing_tasks_file(self, tmp_path):
        monitor = HealthMonitor(
            tasks_path=str(tmp_path / "nonexistent.json"),
            crons_path=_write_crons(tmp_path, _make_cron_jobs()),
            pipeline_path=_write_pipeline(tmp_path, []),
            memory_dir=str(tmp_path / "memory"),
        )
        assert monitor.check_stale_tasks() == []

    def test_missing_crons_file(self, tmp_path):
        monitor = HealthMonitor(
            tasks_path=_write_tasks(tmp_path, []),
            crons_path=str(tmp_path / "no-crons.json"),
            pipeline_path=_write_pipeline(tmp_path, []),
            memory_dir=str(tmp_path / "memory"),
        )
        result = monitor.check_crons()
        assert result["total"] == 0
        assert result["status"] == "red"

    def test_missing_pipeline_file(self, tmp_path):
        monitor = HealthMonitor(
            tasks_path=_write_tasks(tmp_path, []),
            crons_path=_write_crons(tmp_path, _make_cron_jobs()),
            pipeline_path=str(tmp_path / "no-pipeline.json"),
            memory_dir=str(tmp_path / "memory"),
        )
        result = monitor.check_pipeline()
        assert result == {}

    def test_empty_json_file_tasks(self, tmp_path):
        path = tmp_path / "empty.json"
        path.write_text("")
        monitor = HealthMonitor(
            tasks_path=str(path),
            crons_path=_write_crons(tmp_path, _make_cron_jobs()),
            pipeline_path=_write_pipeline(tmp_path, []),
            memory_dir=str(tmp_path / "memory"),
        )
        assert monitor.check_stale_tasks() == []

    def test_corrupt_json_tasks(self, tmp_path):
        path = tmp_path / "corrupt.json"
        path.write_text("{invalid json!!!")
        monitor = HealthMonitor(
            tasks_path=str(path),
            crons_path=_write_crons(tmp_path, _make_cron_jobs()),
            pipeline_path=_write_pipeline(tmp_path, []),
            memory_dir=str(tmp_path / "memory"),
        )
        assert monitor.check_stale_tasks() == []

    def test_corrupt_json_crons(self, tmp_path):
        path = tmp_path / "bad-crons.json"
        path.write_text("not json")
        monitor = HealthMonitor(
            tasks_path=_write_tasks(tmp_path, []),
            crons_path=str(path),
            pipeline_path=_write_pipeline(tmp_path, []),
            memory_dir=str(tmp_path / "memory"),
        )
        result = monitor.check_crons()
        assert result["total"] == 0
        assert result["status"] == "red"

    def test_corrupt_json_pipeline(self, tmp_path):
        pdir = tmp_path / "pipeline"
        pdir.mkdir()
        path = pdir / "active.json"
        path.write_text("{{bad")
        monitor = HealthMonitor(
            tasks_path=_write_tasks(tmp_path, []),
            crons_path=_write_crons(tmp_path, _make_cron_jobs()),
            pipeline_path=str(path),
            memory_dir=str(tmp_path / "memory"),
        )
        result = monitor.check_pipeline()
        assert result == {}

    def test_corrupt_daily_log(self, tmp_path):
        mem_dir = tmp_path / "memory"
        mem_dir.mkdir()
        (mem_dir / "daily-log.json").write_text("not valid json")
        monitor = _make_monitor(tmp_path, memory_dir=str(mem_dir))
        result = monitor.check_last_scan()
        assert result["status"] == "red"
        assert result["last_scan"] is None
