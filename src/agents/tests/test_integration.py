# src/agents/tests/test_integration.py
"""Integration tests: full pipeline scan→score→safety→wallet→social→orchestrate."""
import asyncio
import json
import time
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.agents.orchestrator import OrchestratorAgent
from src.agents.task_registry import TaskRegistry
from src.agents.memory_manager import MemoryManager
from src.agents.health_monitor import HealthMonitor
from src.agents.telegram_bridge import TelegramBridge


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_agent_result(agent_name, score, red_flags=None, green_flags=None):
    """Build a mock agent result with the correct score key."""
    score_keys = {
        "scorer": "total_score",
        "safety": "safety_score",
        "wallet": "wallet_score",
        "social": "social_score",
        "deploy": "deploy_score",
    }
    return {
        score_keys[agent_name]: score,
        "red_flags": red_flags or [],
        "green_flags": green_flags or [],
    }


def _make_token_data(**overrides):
    """Build a standard token_data dict."""
    data = {
        "token_address": "0xtoken123",
        "deployer_address": "0xdep456",
        "chain": "solana",
        "project_name": "TestToken",
        "symbol": "TST",
        "market_data": {"mcap": 5_000_000, "volume_24h": 500_000, "liquidity": 250_000},
    }
    data.update(overrides)
    return data


def _make_scan_tokens(count=3):
    """Build a list of scanned tokens for mock scanner results."""
    return [
        {
            "contract_address": f"0xtoken{i}",
            "chain": "solana",
            "name": f"Token{i}",
            "symbol": f"TK{i}",
            "deployer_address": f"0xdep{i}",
            "mcap": 5_000_000 + i * 100_000,
            "volume_24h": 500_000 + i * 10_000,
            "liquidity": 250_000 + i * 5_000,
            "sources": ["dexscreener"],
        }
        for i in range(count)
    ]


def _wired_orchestrator(tmp_path, monkeypatch):
    """Create OrchestratorAgent with TaskRegistry, MemoryManager, HealthMonitor."""
    mem_dir = str(tmp_path / "memory")
    tasks_path = str(tmp_path / "memory" / "active-tasks.json")
    crons_path = str(tmp_path / "memory" / "cron-schedule.json")
    pipeline_path = str(tmp_path / "memory" / "pipeline" / "active.json")
    monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
    agent = OrchestratorAgent(
        task_registry_path=tasks_path,
        memory_manager_dir=mem_dir,
        health_monitor_paths={
            "tasks_path": tasks_path,
            "crons_path": crons_path,
            "pipeline_path": pipeline_path,
            "memory_dir": mem_dir,
        },
    )
    return agent


# ===========================================================================
# Test Class 1: TestFullScanPipeline
# ===========================================================================

class TestFullScanPipeline:
    """Test the complete scan flow through the orchestrator."""

    @pytest.mark.asyncio
    async def test_scan_discovers_tokens_and_scores_them(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        # Mock scanner returns 3 tokens
        tokens = _make_scan_tokens(3)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 3, "source_counts": {"dexscreener": 3},
        })

        # Mock all sub-agents to return scores
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 50))

        result = await agent.execute({"mode": "scan"})

        # Scanner was called
        agent._scanner.run.assert_called_once()
        # Each token was evaluated
        assert result["tokens_scanned"] == 3
        assert len(result["results"]) == 3

    @pytest.mark.asyncio
    async def test_scan_results_contain_expected_fields(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        tokens = _make_scan_tokens(2)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 2, "source_counts": {"dexscreener": 2},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 60))

        result = await agent.execute({"mode": "scan"})

        for token_result in result["results"]:
            assert "token_address" in token_result, "Missing token_address"
            assert "unified_score" in token_result, "Missing score"
            assert "unified_verdict" in token_result, "Missing verdict"
            assert "red_flags" in token_result, "Missing flags"

    @pytest.mark.asyncio
    async def test_scan_results_have_score_and_verdict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        tokens = _make_scan_tokens(1)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 1, "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        result = await agent.execute({"mode": "scan"})
        r = result["results"][0]
        assert isinstance(r["unified_score"], int)
        assert r["unified_verdict"] in ("STRONG_LIST", "LIST", "REVIEW", "REJECT")

    @pytest.mark.asyncio
    async def test_scan_summary_aggregates_verdicts(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        tokens = _make_scan_tokens(2)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 2, "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        result = await agent.execute({"mode": "scan"})
        summary = result["summary"]
        assert "reject" in summary or "review" in summary
        assert "avg_score" in summary


# ===========================================================================
# Test Class 2: TestFullEvaluatePipeline
# ===========================================================================

class TestFullEvaluatePipeline:
    """Test evaluate flow for a good token (score ~80)."""

    def _mock_good_token_agents(self, agent):
        """Mock all sub-agents with realistic good-token data."""
        agent._agents["scorer"].run = AsyncMock(return_value={
            "total_score": 80,
            "contract_address": "0xgood",
            "chain": "solana",
            "breakdown": {"liquidity": 22, "volume": 18, "age": 15, "community": 12, "safety": 12},
            "status": "QUALIFIED",
            "recommendation": "PIPELINE",
            "red_flags": [],
            "green_flags": [],
        })
        agent._agents["safety"].run = AsyncMock(return_value={
            "safety_score": 85,
            "contract_address": "0xgood",
            "chain": "solana",
            "is_safe": True,
            "sources": {
                "quillshield": {"score": 85, "flags": [], "available": True},
            },
            "risk_flags": [],
            "red_flags": [],
            "green_flags": ["verified_source"],
        })
        agent._agents["wallet"].run = AsyncMock(return_value={
            "wallet_score": 78,
            "deployer_address": "0xdep_clean",
            "token_address": "0xgood",
            "chain": "solana",
            "verdict": "CLEAN",
            "holder_distribution": {
                "top10_pct": 18.0, "deployer_pct": 8.0,
                "unique_holders": 2000, "whale_count": 3,
            },
            "deployer_reputation": {
                "age_days": 180, "rug_count": 0,
            },
            "liquidity_health": {
                "lp_locked": True, "lp_lock_duration_days": 90,
            },
            "red_flags": [],
            "green_flags": ["lp_locked_long", "well_distributed"],
        })
        agent._agents["social"].run = AsyncMock(return_value={
            "social_score": 72,
            "project_name": "GoodToken",
            "sentiment": "positive",
            "community_health": "B",
            "team_verified": True,
            "red_flags": [],
            "green_flags": ["active_community", "verified_team"],
        })
        agent._agents["deploy"].run = AsyncMock(return_value={
            "deploy_score": 80,
            "deployer_address": "0xdep_clean",
            "chain": "solana",
            "risk_level": "low",
            "total_deployments": 15,
            "red_flags": [],
            "green_flags": ["prolific_deployer", "established_history"],
        })

    @pytest.mark.asyncio
    async def test_good_token_score_in_range(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_good_token_agents(agent)
        td = _make_token_data(token_address="0xgood", project_name="GoodToken")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })

        # Weighted: 0.25*85 + 0.25*78 + 0.20*72 + 0.15*80 + 0.15*80
        # = 21.25 + 19.5 + 14.4 + 12 + 12 = 79.15 → 79
        assert 70 <= result["unified_score"] <= 90, \
            f"Expected score 70-90, got {result['unified_score']}"

    @pytest.mark.asyncio
    async def test_good_token_verdict_is_list_or_strong_list(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_good_token_agents(agent)
        td = _make_token_data(token_address="0xgood", project_name="GoodToken")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert result["unified_verdict"] in ("LIST", "STRONG_LIST"), \
            f"Expected LIST or STRONG_LIST, got {result['unified_verdict']}"

    @pytest.mark.asyncio
    async def test_good_token_no_critical_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_good_token_agents(agent)
        td = _make_token_data(token_address="0xgood", project_name="GoodToken")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        critical = {"safety:honeypot_detected", "wallet:serial_rugger", "wallet:bundled_wallets"}
        found_critical = critical.intersection(set(result["red_flags"]))
        assert not found_critical, f"Found critical flags: {found_critical}"

    @pytest.mark.asyncio
    async def test_good_token_has_green_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_good_token_agents(agent)
        td = _make_token_data(token_address="0xgood", project_name="GoodToken")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert len(result["green_flags"]) > 0, "Good token should have green flags"

    @pytest.mark.asyncio
    async def test_good_token_all_agents_succeed(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_good_token_agents(agent)
        td = _make_token_data(token_address="0xgood", project_name="GoodToken")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert result["failed_agents"] == [], \
            f"Expected no failures, got {result['failed_agents']}"
        assert len(result["agent_scores"]) == 5


# ===========================================================================
# Test Class 3: TestEvaluateBadToken
# ===========================================================================

class TestEvaluateBadToken:
    """Test evaluate flow for a bad/honeypot token (should reject)."""

    def _mock_bad_token_agents(self, agent):
        """Mock all sub-agents with honeypot/rugpull data."""
        agent._agents["scorer"].run = AsyncMock(return_value={
            "total_score": 20,
            "red_flags": ["suspicious_volume"],
            "green_flags": [],
        })
        agent._agents["safety"].run = AsyncMock(return_value={
            "safety_score": 10,
            "is_safe": False,
            "sources": {
                "quillshield": {
                    "score": 10, "flags": ["honeypot_risk", "critical_vulnerability"],
                    "available": True,
                },
                "rugcheck": {
                    "score": 15, "is_honeypot": True,
                    "risks": ["Honeypot Detected"], "available": True,
                },
            },
            "red_flags": ["honeypot_detected"],
            "green_flags": [],
        })
        agent._agents["wallet"].run = AsyncMock(return_value={
            "wallet_score": 8,
            "verdict": "RUG_RISK",
            "holder_distribution": {
                "deployer_pct": 40.0, "top10_pct": 85.0,
            },
            "liquidity_health": {
                "lp_locked": False, "lp_burned": False,
            },
            "deployer_reputation": {
                "age_days": 3, "rug_count": 3,
            },
            "red_flags": ["serial_rugger", "dev_heavy_bag", "unlocked_lp"],
            "green_flags": [],
        })
        agent._agents["social"].run = AsyncMock(return_value={
            "social_score": 5,
            "sentiment": "suspicious",
            "community_health": "F",
            "red_flags": ["anonymous_team", "no_social_presence"],
            "green_flags": [],
        })
        agent._agents["deploy"].run = AsyncMock(return_value={
            "deploy_score": 5,
            "risk_level": "critical",
            "red_flags": ["fresh_wallet", "first_time_deployer"],
            "green_flags": [],
        })

    @pytest.mark.asyncio
    async def test_bad_token_score_below_50(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_bad_token_agents(agent)
        td = _make_token_data(
            token_address="0xbad_honeypot",
            deployer_address="0xrug_deployer",
            project_name="RugToken",
        )

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert result["unified_score"] < 50, \
            f"Bad token score should be <50, got {result['unified_score']}"

    @pytest.mark.asyncio
    async def test_bad_token_verdict_is_reject(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_bad_token_agents(agent)
        td = _make_token_data(token_address="0xbad_honeypot")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert result["unified_verdict"] == "REJECT"

    @pytest.mark.asyncio
    async def test_bad_token_has_critical_honeypot_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_bad_token_agents(agent)
        td = _make_token_data(token_address="0xbad_honeypot")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert "safety:honeypot_detected" in result["red_flags"], \
            f"Expected safety:honeypot_detected in {result['red_flags']}"

    @pytest.mark.asyncio
    async def test_bad_token_has_serial_rugger_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_bad_token_agents(agent)
        td = _make_token_data(token_address="0xbad_honeypot")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert "wallet:serial_rugger" in result["red_flags"]

    @pytest.mark.asyncio
    async def test_bad_token_multiple_red_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        self._mock_bad_token_agents(agent)
        td = _make_token_data(token_address="0xbad_honeypot")

        result = await agent.execute({
            "mode": "evaluate", "token_data": td, "depth": "standard",
        })
        assert len(result["red_flags"]) >= 3, \
            f"Expected at least 3 red flags, got {len(result['red_flags'])}"


# ===========================================================================
# Test Class 4: TestDepthEscalation
# ===========================================================================

class TestDepthEscalation:
    """Test orchestrator depth escalation from quick→standard and quick→deep."""

    @pytest.mark.asyncio
    async def test_quick_to_standard_escalation(self, tmp_path, monkeypatch):
        """Score ~60 at quick depth should escalate to standard."""
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        call_depths = []

        def _make_mock(agent_name):
            async def mock_run(params):
                depth = params.get("depth", "none")
                call_depths.append(depth)
                return _make_agent_result(agent_name, 60)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="quick")

        # Should have quick calls followed by standard calls
        assert "quick" in call_depths, "Should start at quick depth"
        assert "standard" in call_depths, "Should escalate to standard"

    @pytest.mark.asyncio
    async def test_quick_to_deep_escalation(self, tmp_path, monkeypatch):
        """Score >=70 at quick depth should escalate directly to deep."""
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        call_depths = []

        def _make_mock(agent_name):
            async def mock_run(params):
                depth = params.get("depth", "none")
                call_depths.append(depth)
                return _make_agent_result(agent_name, 75)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="quick")

        assert "quick" in call_depths
        assert "deep" in call_depths, "Score >=70 should escalate to deep"

    @pytest.mark.asyncio
    async def test_standard_does_not_escalate(self, tmp_path, monkeypatch):
        """Starting at standard depth should never escalate."""
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 90))

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="standard")

        # Each agent should be called exactly once
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_below_threshold_no_escalation(self, tmp_path, monkeypatch):
        """Score <50 at quick should NOT escalate."""
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")

        assert result["unified_score"] == 30
        for sub in agent._agents.values():
            assert sub.run.call_count == 1, "No escalation should mean 1 call per agent"

    @pytest.mark.asyncio
    async def test_escalation_uses_new_depth_for_depth_aware_agents(self, tmp_path, monkeypatch):
        """After escalation, depth-aware agents (wallet, social, deploy) receive new depth."""
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        captured = {"standard_count": 0}

        def _make_mock(agent_name):
            async def mock_run(params):
                if params.get("depth") == "standard":
                    captured["standard_count"] += 1
                return _make_agent_result(agent_name, 55)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="quick")

        # wallet, social, deploy receive depth param; scorer and safety do not
        assert captured["standard_count"] == 3, \
            f"Expected 3 depth-aware agents at standard, got {captured['standard_count']}"


# ===========================================================================
# Test Class 5: TestParallelAgentExecution
# ===========================================================================

class TestParallelAgentExecution:
    """Verify agents run in parallel via asyncio.gather."""

    @pytest.mark.asyncio
    async def test_parallel_execution_faster_than_sequential(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        delays = {"scorer": 0.1, "safety": 0.2, "wallet": 0.3, "social": 0.1, "deploy": 0.15}

        def _make_delayed_mock(agent_name, delay):
            async def mock_run(params):
                await asyncio.sleep(delay)
                return _make_agent_result(agent_name, 50)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_delayed_mock(name, delays[name])

        params = {name: {} for name in agent._agents}
        start = time.monotonic()
        results = await agent._run_agents_parallel(params)
        elapsed = time.monotonic() - start

        # Sequential would be ~0.85s. Parallel should be ~0.3s (max delay).
        assert elapsed < 0.6, \
            f"Parallel execution took {elapsed:.2f}s — should be ~0.3s, not ~0.85s"

    @pytest.mark.asyncio
    async def test_all_agents_return_results(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        delays = {"scorer": 0.1, "safety": 0.2, "wallet": 0.3, "social": 0.1, "deploy": 0.15}

        def _make_delayed_mock(agent_name, delay):
            async def mock_run(params):
                await asyncio.sleep(delay)
                return _make_agent_result(agent_name, 50)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_delayed_mock(name, delays[name])

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)

        for name in agent._agents:
            assert results[name] is not None, f"Agent {name} returned None"

    @pytest.mark.asyncio
    async def test_parallel_timing_dominated_by_slowest_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()

        def _make_delayed_mock(agent_name, delay):
            async def mock_run(params):
                await asyncio.sleep(delay)
                return _make_agent_result(agent_name, 60)
            return mock_run

        # All fast except one slow agent
        for name, sub in agent._agents.items():
            delay = 0.3 if name == "wallet" else 0.05
            sub.run = _make_delayed_mock(name, delay)

        params = {name: {} for name in agent._agents}
        start = time.monotonic()
        await agent._run_agents_parallel(params)
        elapsed = time.monotonic() - start

        # Should take ~0.3s (wallet), not ~0.5s (sequential)
        assert elapsed < 0.5, f"Took {elapsed:.2f}s, should be ~0.3s"
        assert elapsed >= 0.25, f"Took {elapsed:.2f}s, seems too fast"


# ===========================================================================
# Test Class 6: TestTaskRegistryIntegration
# ===========================================================================

class TestTaskRegistryIntegration:
    """Wire TaskRegistry into OrchestratorAgent, verify task lifecycle."""

    @pytest.mark.asyncio
    async def test_scan_creates_tasks_for_sub_agents(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(1)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 1, "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 50))

        await agent.execute({"mode": "scan"})

        tasks_file = tmp_path / "memory" / "active-tasks.json"
        data = json.loads(tasks_file.read_text())
        agent_names = {t["agent_name"] for t in data}
        # Each sub-agent should have a task
        for name in agent._agents:
            assert name in agent_names, f"No task created for {name}"

    @pytest.mark.asyncio
    async def test_successful_agents_marked_done(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        td = _make_token_data()
        await agent.execute({"mode": "evaluate", "token_data": td, "depth": "standard"})

        tasks_file = tmp_path / "memory" / "active-tasks.json"
        data = json.loads(tasks_file.read_text())
        for task in data:
            assert task["status"] == "done", \
                f"Agent {task['agent_name']} status={task['status']}, expected done"

    @pytest.mark.asyncio
    async def test_timed_out_agent_marked_failed(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        agent.AGENT_TIMEOUT = 0.05

        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        async def hang(*args, **kwargs):
            await asyncio.sleep(999)

        agent._agents["safety"].run = hang

        td = _make_token_data()
        await agent.execute({"mode": "evaluate", "token_data": td, "depth": "standard"})

        tasks_file = tmp_path / "memory" / "active-tasks.json"
        data = json.loads(tasks_file.read_text())
        safety_tasks = [t for t in data if t["agent_name"] == "safety"]
        assert len(safety_tasks) == 1
        assert safety_tasks[0]["status"] == "failed"
        assert safety_tasks[0]["error"] is not None

    @pytest.mark.asyncio
    async def test_task_summary_reflects_outcomes(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)

        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["deploy"].run = AsyncMock(side_effect=RuntimeError("API down"))

        td = _make_token_data()
        await agent.execute({"mode": "evaluate", "token_data": td, "depth": "standard"})

        summary = agent.task_registry.get_summary()
        assert summary["done"] == 4, f"Expected 4 done, got {summary['done']}"
        assert summary["failed"] == 1, f"Expected 1 failed, got {summary['failed']}"


# ===========================================================================
# Test Class 7: TestMemoryManagerIntegration
# ===========================================================================

class TestMemoryManagerIntegration:
    """Wire MemoryManager into OrchestratorAgent, verify daily log and pipeline."""

    @pytest.mark.asyncio
    async def test_scan_writes_daily_log(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(2)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 2, "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 50))

        await agent.execute({"mode": "scan"})

        log = agent.memory_manager.read_daily_log()
        assert log is not None, "Daily log should be written after scan"
        assert "SCAN" in log

    @pytest.mark.asyncio
    async def test_high_score_token_added_to_pipeline(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(1)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 1, "source_counts": {},
        })
        # Score 80 => unified_score=80 => above pipeline threshold (70)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 80))

        await agent.execute({"mode": "scan"})

        pipeline = agent.memory_manager.read_pipeline()
        assert len(pipeline) >= 1, "High-score token should be in pipeline"
        addrs = [p.get("contract_address") for p in pipeline]
        assert "0xtoken0" in addrs

    @pytest.mark.asyncio
    async def test_low_score_token_not_in_pipeline(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(1)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 1, "source_counts": {},
        })
        # Score 40 => below pipeline threshold (70)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 40))

        await agent.execute({"mode": "scan"})

        pipeline = agent.memory_manager.read_pipeline()
        assert len(pipeline) == 0, \
            f"Low-score token should NOT be in pipeline, found {len(pipeline)}"

    @pytest.mark.asyncio
    async def test_pipeline_summary_after_mixed_scan(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(3)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 3, "source_counts": {},
        })

        scores = [80, 40, 85]
        call_count = {"n": 0}

        def _make_scored_mock(agent_name):
            async def mock_run(params):
                idx = call_count["n"] // 5  # 5 agents per token
                score = scores[min(idx, len(scores) - 1)]
                return _make_agent_result(agent_name, score)
            return mock_run

        for name, sub in agent._agents.items():
            original_run = sub.run

            async def counting_run(params, name=name):
                call_count["n"] += 1
                score_idx = (call_count["n"] - 1) // 5
                score = scores[min(score_idx, len(scores) - 1)]
                return _make_agent_result(name, score)

            sub.run = counting_run

        await agent.execute({"mode": "scan"})

        pipeline = agent.memory_manager.read_pipeline()
        # 80 and 85 tokens should be in pipeline, 40 should not
        assert len(pipeline) == 2, f"Expected 2 in pipeline, got {len(pipeline)}"


# ===========================================================================
# Test Class 8: TestTelegramBridgeIntegration
# ===========================================================================

class TestTelegramBridgeIntegration:
    """Wire TelegramBridge to a fully configured OrchestratorAgent."""

    @pytest.mark.asyncio
    async def test_scan_command_returns_formatted_results(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        tokens = _make_scan_tokens(2)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": tokens, "total": 2, "source_counts": {"dexscreener": 2},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 65))

        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/scan")

        assert isinstance(result, str)
        assert "Scan Complete" in result

    @pytest.mark.asyncio
    async def test_health_command_returns_report(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        # Write crons so health check passes
        crons_path = tmp_path / "memory" / "cron-schedule.json"
        crons_path.write_text(json.dumps(
            [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(36)]
        ))

        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/health")

        assert isinstance(result, str)
        assert "Health" in result

    @pytest.mark.asyncio
    async def test_status_command_returns_overview(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        # Write crons for health
        crons_path = tmp_path / "memory" / "cron-schedule.json"
        crons_path.write_text(json.dumps(
            [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(36)]
        ))

        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/status")

        assert isinstance(result, str)
        assert "Status" in result or "status" in result
        assert "Health" in result or "health" in result.lower()

    @pytest.mark.asyncio
    async def test_score_command_returns_evaluate_results(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))

        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/score 0xABC123 solana")

        assert isinstance(result, str)
        # Should contain score and verdict info
        assert "Score" in result or "score" in result

    @pytest.mark.asyncio
    async def test_help_command(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/help")

        assert isinstance(result, str)
        assert "/scan" in result
        assert "/score" in result
        assert "/health" in result

    @pytest.mark.asyncio
    async def test_unknown_command(self, tmp_path, monkeypatch):
        agent = _wired_orchestrator(tmp_path, monkeypatch)
        bridge = TelegramBridge(orchestrator=agent, chat_id=12345)
        result = await bridge.handle_command("/foobar")

        assert "unknown" in result.lower() or "Unknown" in result
