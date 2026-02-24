# src/agents/tests/test_telegram_bridge.py
import pytest
from unittest.mock import AsyncMock, MagicMock, PropertyMock
from src.agents.telegram_bridge import TelegramBridge


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_orchestrator():
    orch = AsyncMock()
    orch.format_scan_result = MagicMock(return_value="scan formatted")
    orch.format_evaluate_result = MagicMock(return_value="eval formatted")

    # Wire up sub-component properties
    memory = MagicMock()
    task_reg = MagicMock()
    health = MagicMock()

    type(orch).memory_manager = PropertyMock(return_value=memory)
    type(orch).task_registry = PropertyMock(return_value=task_reg)
    type(orch).health_monitor = PropertyMock(return_value=health)

    return orch, memory, task_reg, health


def _make_bridge():
    orch, memory, task_reg, health = _make_orchestrator()
    bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
    return bridge, orch, memory, task_reg, health


# ---------------------------------------------------------------------------
# Constructor
# ---------------------------------------------------------------------------

class TestConstructor:
    def test_stores_orchestrator(self):
        orch, *_ = _make_orchestrator()
        bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
        assert bridge.orchestrator is orch

    def test_stores_chat_id(self):
        orch, *_ = _make_orchestrator()
        bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
        assert bridge.chat_id == 950395553


# ---------------------------------------------------------------------------
# /help command
# ---------------------------------------------------------------------------

class TestHelpCommand:
    @pytest.mark.asyncio
    async def test_help_returns_string(self):
        bridge, *_ = _make_bridge()
        result = await bridge.handle_command("/help")
        assert isinstance(result, str)

    @pytest.mark.asyncio
    async def test_help_lists_all_commands(self):
        bridge, *_ = _make_bridge()
        result = await bridge.handle_command("/help")
        for cmd in ["/scan", "/score", "/health", "/boot", "/pipeline",
                    "/tasks", "/retry", "/experience", "/status", "/help"]:
            assert cmd in result


# ---------------------------------------------------------------------------
# /scan command
# ---------------------------------------------------------------------------

class TestScanCommand:
    @pytest.mark.asyncio
    async def test_scan_calls_execute_with_scan_mode(self):
        bridge, orch, *_ = _make_bridge()
        orch.execute.return_value = {"tokens_scanned": 5, "results": [], "summary": {}}
        await bridge.handle_command("/scan")
        orch.execute.assert_called_once_with({"mode": "scan"})

    @pytest.mark.asyncio
    async def test_scan_formats_result(self):
        bridge, orch, *_ = _make_bridge()
        scan_result = {"tokens_scanned": 5, "results": [], "summary": {}}
        orch.execute.return_value = scan_result
        orch.format_scan_result.return_value = "formatted scan"
        result = await bridge.handle_command("/scan")
        orch.format_scan_result.assert_called_once_with(scan_result)
        assert result == "formatted scan"


# ---------------------------------------------------------------------------
# /score command
# ---------------------------------------------------------------------------

class TestScoreCommand:
    @pytest.mark.asyncio
    async def test_score_calls_execute_with_evaluate_mode(self):
        bridge, orch, *_ = _make_bridge()
        orch.execute.return_value = {"unified_score": 75, "unified_verdict": "LIST"}
        await bridge.handle_command("/score 0xABC123 ethereum")
        orch.execute.assert_called_once_with({
            "mode": "evaluate",
            "token_data": {
                "token_address": "0xABC123",
                "chain": "ethereum",
            },
            "depth": "standard",
        })

    @pytest.mark.asyncio
    async def test_score_formats_result(self):
        bridge, orch, *_ = _make_bridge()
        eval_result = {"unified_score": 75, "unified_verdict": "LIST"}
        orch.execute.return_value = eval_result
        orch.format_evaluate_result.return_value = "formatted eval"
        result = await bridge.handle_command("/score 0xABC123 ethereum")
        orch.format_evaluate_result.assert_called_once_with(eval_result)
        assert result == "formatted eval"

    @pytest.mark.asyncio
    async def test_score_missing_args_returns_usage(self):
        bridge, orch, *_ = _make_bridge()
        result = await bridge.handle_command("/score")
        orch.execute.assert_not_called()
        assert "Usage" in result or "usage" in result

    @pytest.mark.asyncio
    async def test_score_missing_chain_returns_usage(self):
        bridge, orch, *_ = _make_bridge()
        result = await bridge.handle_command("/score 0xABC123")
        orch.execute.assert_not_called()
        assert "Usage" in result or "usage" in result


# ---------------------------------------------------------------------------
# /health command
# ---------------------------------------------------------------------------

class TestHealthCommand:
    @pytest.mark.asyncio
    async def test_health_calls_execute(self):
        bridge, orch, *_ = _make_bridge()
        orch.execute.return_value = {
            "overall": "green",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 1.0, "status": "green"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        await bridge.handle_command("/health")
        orch.execute.assert_called_once_with({"mode": "health"})

    @pytest.mark.asyncio
    async def test_health_returns_formatted_report(self):
        bridge, orch, *_ = _make_bridge()
        report = {
            "overall": "green",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 1.0, "status": "green"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        orch.execute.return_value = report
        result = await bridge.handle_command("/health")
        assert isinstance(result, str)
        assert "Health" in result or "health" in result


# ---------------------------------------------------------------------------
# /boot command
# ---------------------------------------------------------------------------

class TestBootCommand:
    @pytest.mark.asyncio
    async def test_boot_calls_execute(self):
        bridge, orch, *_ = _make_bridge()
        orch.execute.return_value = {
            "crons_ok": True,
            "crons_found": 36,
            "crons_expected": 36,
            "crons_missing": [],
            "experience_loaded": 5,
            "pipeline_loaded": 10,
            "status": "green",
        }
        await bridge.handle_command("/boot")
        orch.execute.assert_called_once_with({"mode": "boot"})

    @pytest.mark.asyncio
    async def test_boot_returns_formatted_report(self):
        bridge, orch, *_ = _make_bridge()
        report = {
            "crons_ok": True,
            "crons_found": 36,
            "crons_expected": 36,
            "crons_missing": [],
            "experience_loaded": 5,
            "pipeline_loaded": 10,
            "status": "green",
        }
        orch.execute.return_value = report
        result = await bridge.handle_command("/boot")
        assert isinstance(result, str)
        assert "Boot" in result or "boot" in result


# ---------------------------------------------------------------------------
# /pipeline command
# ---------------------------------------------------------------------------

class TestPipelineCommand:
    @pytest.mark.asyncio
    async def test_pipeline_calls_memory_manager(self):
        bridge, orch, memory, *_ = _make_bridge()
        memory.get_pipeline_summary.return_value = {"DISCOVERED": 3, "OUTREACH_SENT": 1}
        await bridge.handle_command("/pipeline")
        memory.get_pipeline_summary.assert_called_once()

    @pytest.mark.asyncio
    async def test_pipeline_formats_counts(self):
        bridge, orch, memory, *_ = _make_bridge()
        memory.get_pipeline_summary.return_value = {"DISCOVERED": 3, "OUTREACH_SENT": 1}
        result = await bridge.handle_command("/pipeline")
        assert "DISCOVERED" in result
        assert "3" in result
        assert "OUTREACH_SENT" in result

    @pytest.mark.asyncio
    async def test_pipeline_empty(self):
        bridge, orch, memory, *_ = _make_bridge()
        memory.get_pipeline_summary.return_value = {}
        result = await bridge.handle_command("/pipeline")
        assert "empty" in result.lower() or "no " in result.lower() or "0" in result


# ---------------------------------------------------------------------------
# /tasks command
# ---------------------------------------------------------------------------

class TestTasksCommand:
    @pytest.mark.asyncio
    async def test_tasks_calls_registry(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        task_reg.get_summary.return_value = {"queued": 2, "running": 1, "done": 10, "failed": 0}
        await bridge.handle_command("/tasks")
        task_reg.get_summary.assert_called_once()

    @pytest.mark.asyncio
    async def test_tasks_formats_summary(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        task_reg.get_summary.return_value = {"queued": 2, "running": 1, "done": 10, "failed": 0}
        result = await bridge.handle_command("/tasks")
        assert "queued" in result.lower() or "2" in result
        assert "running" in result.lower() or "1" in result
        assert "done" in result.lower() or "10" in result


# ---------------------------------------------------------------------------
# /retry command
# ---------------------------------------------------------------------------

class TestRetryCommand:
    @pytest.mark.asyncio
    async def test_retry_calls_registry(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        task_reg.get_retryable.return_value = [
            {"id": "abc", "agent_name": "scorer", "error": "timeout", "retry_count": 1}
        ]
        await bridge.handle_command("/retry")
        task_reg.get_retryable.assert_called_once()

    @pytest.mark.asyncio
    async def test_retry_lists_retryable_tasks(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        task_reg.get_retryable.return_value = [
            {"id": "abc", "agent_name": "scorer", "error": "timeout", "retry_count": 1}
        ]
        result = await bridge.handle_command("/retry")
        assert "scorer" in result
        assert "timeout" in result

    @pytest.mark.asyncio
    async def test_retry_no_retryable(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        task_reg.get_retryable.return_value = []
        result = await bridge.handle_command("/retry")
        assert "no " in result.lower() or "none" in result.lower() or "0" in result


# ---------------------------------------------------------------------------
# /experience command
# ---------------------------------------------------------------------------

class TestExperienceCommand:
    @pytest.mark.asyncio
    async def test_experience_calls_memory_manager(self):
        bridge, orch, memory, *_ = _make_bridge()
        memory.read_experience.return_value = [
            {"pattern": "honeypot detected", "learned_at": 1000},
            {"pattern": "low liquidity rug", "learned_at": 2000},
        ]
        await bridge.handle_command("/experience")
        memory.read_experience.assert_called_once()

    @pytest.mark.asyncio
    async def test_experience_shows_last_5(self):
        bridge, orch, memory, *_ = _make_bridge()
        patterns = [{"pattern": f"pattern_{i}", "learned_at": i * 1000} for i in range(10)]
        memory.read_experience.return_value = patterns
        result = await bridge.handle_command("/experience")
        # Should show last 5, not all 10
        assert "pattern_9" in result
        assert "pattern_5" in result

    @pytest.mark.asyncio
    async def test_experience_empty(self):
        bridge, orch, memory, *_ = _make_bridge()
        memory.read_experience.return_value = []
        result = await bridge.handle_command("/experience")
        assert "no " in result.lower() or "none" in result.lower() or "empty" in result.lower()


# ---------------------------------------------------------------------------
# /status command
# ---------------------------------------------------------------------------

class TestStatusCommand:
    @pytest.mark.asyncio
    async def test_status_combines_health_pipeline_tasks(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        health.full_health_check.return_value = {
            "overall": "green",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 1.0, "status": "green"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        memory.get_pipeline_summary.return_value = {"DISCOVERED": 3}
        task_reg.get_summary.return_value = {"queued": 1, "running": 0, "done": 5, "failed": 0}

        result = await bridge.handle_command("/status")
        # Should contain data from all three sources
        assert "green" in result.lower() or "\U0001f7e2" in result
        assert "DISCOVERED" in result or "pipeline" in result.lower()
        assert "queued" in result.lower() or "task" in result.lower()

    @pytest.mark.asyncio
    async def test_status_calls_all_three(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        health.full_health_check.return_value = {
            "overall": "green",
            "components": {},
            "timestamp": 1000,
        }
        memory.get_pipeline_summary.return_value = {}
        task_reg.get_summary.return_value = {"queued": 0, "running": 0, "done": 0, "failed": 0}

        await bridge.handle_command("/status")
        health.full_health_check.assert_called_once()
        memory.get_pipeline_summary.assert_called_once()
        task_reg.get_summary.assert_called_once()


# ---------------------------------------------------------------------------
# Unknown command
# ---------------------------------------------------------------------------

class TestUnknownCommand:
    @pytest.mark.asyncio
    async def test_unknown_returns_helpful_message(self):
        bridge, *_ = _make_bridge()
        result = await bridge.handle_command("/foobar")
        assert "unknown" in result.lower() or "help" in result.lower()

    @pytest.mark.asyncio
    async def test_empty_command_returns_help(self):
        bridge, *_ = _make_bridge()
        result = await bridge.handle_command("")
        assert isinstance(result, str)


# ---------------------------------------------------------------------------
# format_health_report
# ---------------------------------------------------------------------------

class TestFormatHealthReport:
    def test_green_shows_green_emoji(self):
        bridge, *_ = _make_bridge()
        report = {
            "overall": "green",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 1.0, "status": "green"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        result = bridge.format_health_report(report)
        assert "\U0001f7e2" in result  # green circle

    def test_yellow_shows_yellow_emoji(self):
        bridge, *_ = _make_bridge()
        report = {
            "overall": "yellow",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 4.0, "status": "yellow"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        result = bridge.format_health_report(report)
        assert "\U0001f7e1" in result  # yellow circle

    def test_red_shows_red_emoji(self):
        bridge, *_ = _make_bridge()
        report = {
            "overall": "red",
            "components": {
                "tasks": {"stale_count": 3, "status": "red"},
                "crons": {"total": 20, "missing": 16, "status": "red"},
                "scans": {"last_scan": None, "hours_ago": None, "status": "red"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        result = bridge.format_health_report(report)
        assert "\U0001f534" in result  # red circle

    def test_shows_component_details(self):
        bridge, *_ = _make_bridge()
        report = {
            "overall": "red",
            "components": {
                "tasks": {"stale_count": 2, "status": "red"},
                "crons": {"total": 30, "missing": 6, "status": "red"},
                "scans": {"last_scan": 1000, "hours_ago": 8.5, "status": "red"},
                "pipeline": {"DISCOVERED": 5},
            },
            "timestamp": 1000,
        }
        result = bridge.format_health_report(report)
        assert "2" in result  # stale count
        assert "30" in result or "6" in result  # crons detail


# ---------------------------------------------------------------------------
# format_boot_report
# ---------------------------------------------------------------------------

class TestFormatBootReport:
    def test_green_boot(self):
        bridge, *_ = _make_bridge()
        report = {
            "crons_ok": True,
            "crons_found": 36,
            "crons_expected": 36,
            "crons_missing": [],
            "experience_loaded": 5,
            "pipeline_loaded": 10,
            "status": "green",
        }
        result = bridge.format_boot_report(report)
        assert "\U0001f7e2" in result  # green emoji
        assert "36" in result
        assert "5" in result  # experience count
        assert "10" in result  # pipeline count

    def test_red_boot_shows_missing_crons(self):
        bridge, *_ = _make_bridge()
        report = {
            "crons_ok": False,
            "crons_found": 30,
            "crons_expected": 36,
            "crons_missing": ["job_30", "job_31"],
            "experience_loaded": 0,
            "pipeline_loaded": 0,
            "status": "red",
        }
        result = bridge.format_boot_report(report)
        assert "\U0001f534" in result  # red emoji
        assert "30" in result


# ---------------------------------------------------------------------------
# format_pipeline_summary
# ---------------------------------------------------------------------------

class TestFormatPipelineSummary:
    def test_formats_stages(self):
        bridge, *_ = _make_bridge()
        summary = {"DISCOVERED": 5, "OUTREACH_SENT": 2, "QUALIFIED": 1}
        result = bridge.format_pipeline_summary(summary)
        assert "DISCOVERED" in result
        assert "5" in result
        assert "OUTREACH_SENT" in result
        assert "2" in result

    def test_empty_pipeline(self):
        bridge, *_ = _make_bridge()
        result = bridge.format_pipeline_summary({})
        assert "empty" in result.lower() or "no " in result.lower()


# ---------------------------------------------------------------------------
# format_status_overview
# ---------------------------------------------------------------------------

class TestFormatStatusOverview:
    @pytest.mark.asyncio
    async def test_overview_includes_all_sections(self):
        bridge, orch, memory, task_reg, health = _make_bridge()
        health.full_health_check.return_value = {
            "overall": "green",
            "components": {
                "tasks": {"stale_count": 0, "status": "green"},
                "crons": {"total": 36, "missing": 0, "status": "green"},
                "scans": {"last_scan": 1000, "hours_ago": 1.0, "status": "green"},
                "pipeline": {},
            },
            "timestamp": 1000,
        }
        memory.get_pipeline_summary.return_value = {"DISCOVERED": 2}
        task_reg.get_summary.return_value = {"queued": 1, "running": 0, "done": 3, "failed": 0}

        result = await bridge.format_status_overview()
        assert isinstance(result, str)
        # Should have sections for health, pipeline, tasks
        assert "health" in result.lower() or "\U0001f7e2" in result
        assert "pipeline" in result.lower() or "DISCOVERED" in result
        assert "task" in result.lower() or "queued" in result.lower()


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

class TestErrorHandling:
    @pytest.mark.asyncio
    async def test_execute_error_returns_error_message(self):
        bridge, orch, *_ = _make_bridge()
        orch.execute.side_effect = Exception("connection failed")
        result = await bridge.handle_command("/scan")
        assert "error" in result.lower() or "failed" in result.lower()

    @pytest.mark.asyncio
    async def test_missing_memory_manager_for_pipeline(self):
        orch = AsyncMock()
        type(orch).memory_manager = PropertyMock(return_value=None)
        type(orch).task_registry = PropertyMock(return_value=None)
        type(orch).health_monitor = PropertyMock(return_value=None)
        bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
        result = await bridge.handle_command("/pipeline")
        assert "not configured" in result.lower() or "unavailable" in result.lower()

    @pytest.mark.asyncio
    async def test_missing_task_registry_for_tasks(self):
        orch = AsyncMock()
        type(orch).memory_manager = PropertyMock(return_value=None)
        type(orch).task_registry = PropertyMock(return_value=None)
        type(orch).health_monitor = PropertyMock(return_value=None)
        bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
        result = await bridge.handle_command("/tasks")
        assert "not configured" in result.lower() or "unavailable" in result.lower()

    @pytest.mark.asyncio
    async def test_missing_health_monitor_for_status(self):
        orch = AsyncMock()
        type(orch).memory_manager = PropertyMock(return_value=MagicMock())
        type(orch).task_registry = PropertyMock(return_value=MagicMock())
        type(orch).health_monitor = PropertyMock(return_value=None)
        bridge = TelegramBridge(orchestrator=orch, chat_id=950395553)
        # /status needs health_monitor
        result = await bridge.handle_command("/status")
        assert "not configured" in result.lower() or "unavailable" in result.lower()
