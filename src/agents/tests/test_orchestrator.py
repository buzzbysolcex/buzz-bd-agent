# src/agents/tests/test_orchestrator.py
import asyncio
import json
import time
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from src.agents.orchestrator import OrchestratorAgent
from src.agents.orchestrator import AgentOutcome, DelegationResult
from src.agents.base_agent import BaseAgent
from src.agents.task_registry import TaskRegistry
from src.agents.memory_manager import MemoryManager
from src.agents.health_monitor import HealthMonitor


class TestOrchestratorInit:
    def test_inherits_base_agent(self):
        agent = OrchestratorAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_orchestrator(self):
        agent = OrchestratorAgent()
        assert agent.name == "orchestrator"
        assert agent.status == "idle"

    def test_subagents_instantiated(self):
        agent = OrchestratorAgent()
        assert agent._scanner is not None
        assert agent._scanner.name == "scanner"
        assert set(agent._agents.keys()) == {"scorer", "safety", "wallet", "social", "deploy"}
        for name, sub in agent._agents.items():
            assert sub.name == name

    def test_class_constants(self):
        weights = OrchestratorAgent.AGENT_WEIGHTS
        assert abs(sum(weights.values()) - 1.0) < 1e-9
        assert weights == {"safety": 0.25, "wallet": 0.25, "social": 0.20, "scorer": 0.15, "deploy": 0.15}
        assert OrchestratorAgent.STRONG_LIST_THRESHOLD == 80
        assert OrchestratorAgent.LIST_THRESHOLD == 60
        assert OrchestratorAgent.REVIEW_THRESHOLD == 40
        assert OrchestratorAgent.STANDARD_ESCALATION == 50
        assert OrchestratorAgent.DEEP_ESCALATION == 70
        assert OrchestratorAgent.AGENT_TIMEOUT == 30

    def test_depth_timeouts_constant(self):
        assert OrchestratorAgent.DEPTH_TIMEOUTS == {"quick": 10, "standard": 20, "deep": 45}



class TestDataclasses:
    def test_agent_outcome_fields(self):
        outcome = AgentOutcome(
            agent_name="safety",
            score=85,
            result={"safety_score": 85},
            elapsed_ms=123.4,
            error=None,
        )
        assert outcome.agent_name == "safety"
        assert outcome.score == 85
        assert outcome.result == {"safety_score": 85}
        assert outcome.elapsed_ms == 123.4
        assert outcome.error is None

    def test_agent_outcome_failed(self):
        outcome = AgentOutcome(
            agent_name="wallet",
            score=None,
            result=None,
            elapsed_ms=30000.0,
            error="Timed out after 30s",
        )
        assert outcome.score is None
        assert outcome.result is None
        assert outcome.error == "Timed out after 30s"

    def test_delegation_result_fields(self):
        outcome = AgentOutcome("safety", 85, {"safety_score": 85}, 100.0, None)
        dr = DelegationResult(
            agent_outcomes={"safety": outcome},
            depth="quick",
            timeout_used=10,
            started_at=1000.0,
            elapsed_ms=150.0,
            escalation_path=["quick"],
        )
        assert dr.depth == "quick"
        assert dr.timeout_used == 10
        assert dr.elapsed_ms == 150.0
        assert dr.escalation_path == ["quick"]
        assert "safety" in dr.agent_outcomes

    def test_delegation_result_escalation_path(self):
        dr = DelegationResult(
            agent_outcomes={},
            depth="deep",
            timeout_used=45,
            started_at=1000.0,
            elapsed_ms=500.0,
            escalation_path=["quick", "deep"],
        )
        assert dr.escalation_path == ["quick", "deep"]


class TestRedistributeWeights:
    def test_no_failures(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights([])
        assert weights == OrchestratorAgent.AGENT_WEIGHTS

    def test_one_failure(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["safety"])
        assert "safety" not in weights
        assert abs(sum(weights.values()) - 1.0) < 1e-9
        assert abs(weights["wallet"] - 0.25 / 0.75) < 1e-9
        assert abs(weights["social"] - 0.20 / 0.75) < 1e-9

    def test_two_failures(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["safety", "wallet"])
        assert "safety" not in weights
        assert "wallet" not in weights
        assert abs(sum(weights.values()) - 1.0) < 1e-9
        surviving_total = 0.20 + 0.15 + 0.15
        assert abs(weights["social"] - 0.20 / surviving_total) < 1e-9

    def test_four_failures(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["safety", "wallet", "social", "deploy"])
        assert len(weights) == 1
        assert "scorer" in weights
        assert abs(weights["scorer"] - 1.0) < 1e-9

    def test_all_failures(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["safety", "wallet", "social", "scorer", "deploy"])
        assert weights == {}

    def test_preserves_ratios(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["scorer"])
        assert abs(weights["safety"] / weights["wallet"] - 1.0) < 1e-9
        assert abs(weights["safety"] / weights["social"] - 1.25) < 1e-9


class TestComputeUnifiedVerdict:
    def test_strong_list(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(85, []) == "STRONG_LIST"

    def test_list(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(65, []) == "LIST"

    def test_review(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(45, []) == "REVIEW"

    def test_reject(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(30, []) == "REJECT"

    def test_honeypot_overrides_to_reject(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(95, ["safety:honeypot_detected"]) == "REJECT"

    def test_serial_rugger_overrides_to_reject(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(90, ["wallet:serial_rugger"]) == "REJECT"

    def test_bundled_wallets_overrides_to_reject(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(85, ["wallet:bundled_wallets"]) == "REJECT"

    def test_boundary_80_is_strong_list(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(80, []) == "STRONG_LIST"

    def test_boundary_60_is_list(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(60, []) == "LIST"

    def test_boundary_40_is_review(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(40, []) == "REVIEW"

    def test_boundary_39_is_reject(self):
        agent = OrchestratorAgent()
        assert agent._compute_unified_verdict(39, []) == "REJECT"


def _make_agent_result(agent_name, score, red_flags=None, green_flags=None):
    """Helper to build a mock agent result dict."""
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
    """Helper to build a token_data dict."""
    data = {
        "token_address": "0xtoken123",
        "deployer_address": "0xdep456",
        "chain": "solana",
        "project_name": "TestToken",
        "market_data": {"mcap": 1000000, "volume_24h": 500000, "liquidity": 250000},
    }
    data.update(overrides)
    return data


class TestMergeResults:
    def test_all_agents_succeed(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": _make_agent_result("safety", 70),
            "wallet": _make_agent_result("wallet", 60),
            "social": _make_agent_result("social", 50),
            "deploy": _make_agent_result("deploy", 90),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 68
        assert merged["unified_verdict"] == "LIST"
        assert merged["failed_agents"] == []
        assert len(merged["agent_scores"]) == 5

    def test_with_one_failure(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": None,
            "wallet": _make_agent_result("wallet", 60),
            "social": _make_agent_result("social", 50),
            "deploy": _make_agent_result("deploy", 90),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert merged["failed_agents"] == ["safety"]
        assert "safety" not in merged["agent_scores"]
        assert abs(sum(merged["weights_used"].values()) - 1.0) < 1e-9
        assert merged["unified_score"] == 67

    def test_compiles_red_flags_namespaced(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 50),
            "safety": _make_agent_result("safety", 40, red_flags=["honeypot_detected"]),
            "wallet": _make_agent_result("wallet", 30, red_flags=["unlocked_lp", "whale_concentration"]),
            "social": _make_agent_result("social", 60),
            "deploy": _make_agent_result("deploy", 70),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "safety:honeypot_detected" in merged["red_flags"]
        assert "wallet:unlocked_lp" in merged["red_flags"]
        assert "wallet:whale_concentration" in merged["red_flags"]
        assert len(merged["red_flags"]) == 3

    def test_compiles_green_flags_namespaced(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": _make_agent_result("safety", 90, green_flags=["verified_source"]),
            "wallet": _make_agent_result("wallet", 85, green_flags=["lp_burned"]),
            "social": _make_agent_result("social", 70),
            "deploy": _make_agent_result("deploy", 75),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "safety:verified_source" in merged["green_flags"]
        assert "wallet:lp_burned" in merged["green_flags"]

    def test_score_clamped_0_100(self):
        agent = OrchestratorAgent()
        results = {name: _make_agent_result(name, 0) for name in ["scorer", "safety", "wallet", "social", "deploy"]}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 0

        results = {name: _make_agent_result(name, 100) for name in ["scorer", "safety", "wallet", "social", "deploy"]}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 100

    def test_all_agents_failed(self):
        agent = OrchestratorAgent()
        results = {name: None for name in ["scorer", "safety", "wallet", "social", "deploy"]}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 0
        assert merged["unified_verdict"] == "REJECT"
        assert len(merged["failed_agents"]) == 5

    def test_includes_agent_results(self):
        agent = OrchestratorAgent()
        scorer_result = _make_agent_result("scorer", 80)
        results = {
            "scorer": scorer_result,
            "safety": None,
            "wallet": _make_agent_result("wallet", 60),
            "social": None,
            "deploy": _make_agent_result("deploy", 70),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "scorer" in merged["agent_results"]
        assert "wallet" in merged["agent_results"]
        assert "deploy" in merged["agent_results"]
        assert "safety" not in merged["agent_results"]
        assert "social" not in merged["agent_results"]

    def test_includes_token_metadata(self):
        agent = OrchestratorAgent()
        results = {name: _make_agent_result(name, 50) for name in ["scorer", "safety", "wallet", "social", "deploy"]}
        td = _make_token_data(token_address="0xabc", chain="ethereum", project_name="FooToken")
        merged = agent._merge_results(results, td)
        assert merged["token_address"] == "0xabc"
        assert merged["chain"] == "ethereum"
        assert merged["project_name"] == "FooToken"


class TestRunAgentsParallel:
    @pytest.mark.asyncio
    async def test_all_succeed(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert len(results) == 5
        for name in agent._agents:
            assert results[name] is not None

    @pytest.mark.asyncio
    async def test_one_timeout(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        async def hang(*args, **kwargs):
            await asyncio.sleep(999)
        agent._agents["safety"].run = hang
        agent.AGENT_TIMEOUT = 0.1

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["safety"] is None
        assert results["scorer"] is not None
        assert results["wallet"] is not None

    @pytest.mark.asyncio
    async def test_one_exception(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["wallet"].run = AsyncMock(side_effect=RuntimeError("API down"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["wallet"] is None
        assert results["scorer"] is not None
        assert results["safety"] is not None

    @pytest.mark.asyncio
    async def test_all_fail(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(side_effect=RuntimeError("fail"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        for name in agent._agents:
            assert results[name] is None

    @pytest.mark.asyncio
    async def test_multiple_failures(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["safety"].run = AsyncMock(side_effect=RuntimeError("fail"))
        agent._agents["social"].run = AsyncMock(side_effect=RuntimeError("fail"))
        agent._agents["deploy"].run = AsyncMock(side_effect=RuntimeError("fail"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["safety"] is None
        assert results["social"] is None
        assert results["deploy"] is None
        assert results["scorer"] is not None
        assert results["wallet"] is not None

    @pytest.mark.asyncio
    async def test_timeout_uses_constant(self):
        agent = OrchestratorAgent()
        agent.AGENT_TIMEOUT = 0.05
        async def slow(*args, **kwargs):
            await asyncio.sleep(1)
        for name, sub in agent._agents.items():
            sub.run = slow

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        for name in agent._agents:
            assert results[name] is None

    @pytest.mark.asyncio
    async def test_agents_run_concurrently(self):
        import time
        agent = OrchestratorAgent()
        async def slow_agent(params):
            await asyncio.sleep(0.1)
            return _make_agent_result("scorer", 50)
        for name, sub in agent._agents.items():
            sub.run = slow_agent

        params = {name: {} for name in agent._agents}
        start = time.monotonic()
        await agent._run_agents_parallel(params)
        elapsed = time.monotonic() - start
        assert elapsed < 0.3

    @pytest.mark.asyncio
    async def test_respects_timeout_parameter(self):
        agent = OrchestratorAgent()
        async def hang(*args, **kwargs):
            await asyncio.sleep(999)
        for name, sub in agent._agents.items():
            sub.run = hang

        params = {name: {} for name in agent._agents}
        start = time.monotonic()
        results = await agent._run_agents_parallel(params, timeout=0.05)
        elapsed = time.monotonic() - start
        assert elapsed < 1.0
        for name in agent._agents:
            assert results[name] is None


class TestBuildAgentParams:
    def test_builds_all_five(self):
        agent = OrchestratorAgent()
        td = _make_token_data()
        params = agent._build_agent_params(td, "standard")
        assert set(params.keys()) == {"scorer", "safety", "wallet", "social", "deploy"}

    def test_scorer_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(token_address="0xabc", chain="solana", project_name="Foo")
        td["market_data"] = {"mcap": 100, "volume_24h": 200, "liquidity": 300}
        params = agent._build_agent_params(td, "standard")
        sp = params["scorer"]
        assert sp["token_data"]["contract_address"] == "0xabc"
        assert sp["token_data"]["chain"] == "solana"
        assert sp["token_data"]["name"] == "Foo"
        assert sp["token_data"]["liquidity"] == 300
        assert sp["token_data"]["volume_24h"] == 200

    def test_safety_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(token_address="0xabc", chain="ethereum")
        params = agent._build_agent_params(td, "standard")
        assert params["safety"] == {"contract_address": "0xabc", "chain": "ethereum"}

    def test_wallet_params_include_depth(self):
        agent = OrchestratorAgent()
        td = _make_token_data(deployer_address="0xdep")
        params = agent._build_agent_params(td, "deep")
        assert params["wallet"]["depth"] == "deep"
        assert params["wallet"]["deployer_address"] == "0xdep"

    def test_social_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(project_name="Bar", deployer_address="0xd")
        params = agent._build_agent_params(td, "quick")
        assert params["social"]["project_name"] == "Bar"
        assert params["social"]["deployer_address"] == "0xd"
        assert params["social"]["depth"] == "quick"

    def test_deploy_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(deployer_address="0xdep", chain="base")
        params = agent._build_agent_params(td, "standard")
        assert params["deploy"]["deployer_address"] == "0xdep"
        assert params["deploy"]["chain"] == "base"
        assert params["deploy"]["depth"] == "standard"



class TestDelegate:
    @pytest.mark.asyncio
    async def test_returns_delegation_result(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        td = _make_token_data()
        dr = await agent.delegate(td, depth="quick")
        assert isinstance(dr, DelegationResult)
        assert dr.depth == "quick"
        assert dr.timeout_used == 10
        assert dr.escalation_path == ["quick"]
        assert len(dr.agent_outcomes) == 5

    @pytest.mark.asyncio
    async def test_agent_outcomes_have_scores(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 80))
        td = _make_token_data()
        dr = await agent.delegate(td, depth="standard")
        for name, outcome in dr.agent_outcomes.items():
            assert isinstance(outcome, AgentOutcome)
            assert outcome.score == 80
            assert outcome.error is None
            assert outcome.elapsed_ms >= 0

    @pytest.mark.asyncio
    async def test_agent_subset(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        td = _make_token_data()
        dr = await agent.delegate(td, depth="quick", agents=["safety", "wallet"])
        assert set(dr.agent_outcomes.keys()) == {"safety", "wallet"}
        agent._agents["scorer"].run.assert_not_called()
        agent._agents["social"].run.assert_not_called()
        agent._agents["deploy"].run.assert_not_called()

    @pytest.mark.asyncio
    async def test_failed_agent_outcome(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        agent._agents["wallet"].run = AsyncMock(side_effect=RuntimeError("API down"))
        td = _make_token_data()
        dr = await agent.delegate(td, depth="quick")
        assert dr.agent_outcomes["wallet"].score is None
        assert dr.agent_outcomes["wallet"].result is None
        assert dr.agent_outcomes["wallet"].error == "API down"

    @pytest.mark.asyncio
    async def test_timed_out_agent_outcome(self):
        agent = OrchestratorAgent()
        agent.DEPTH_TIMEOUTS = {"quick": 0.05, "standard": 0.1, "deep": 0.2}
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        async def hang(*args, **kwargs):
            await asyncio.sleep(999)
        agent._agents["safety"].run = hang
        td = _make_token_data()
        dr = await agent.delegate(td, depth="quick")
        assert dr.agent_outcomes["safety"].score is None
        assert dr.agent_outcomes["safety"].error is not None
        assert "imed out" in dr.agent_outcomes["safety"].error

    @pytest.mark.asyncio
    async def test_uses_depth_specific_timeout(self):
        agent = OrchestratorAgent()
        td = _make_token_data()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        dr_quick = await agent.delegate(td, depth="quick")
        assert dr_quick.timeout_used == 10
        dr_deep = await agent.delegate(td, depth="deep")
        assert dr_deep.timeout_used == 45

    @pytest.mark.asyncio
    async def test_elapsed_ms_populated(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        td = _make_token_data()
        dr = await agent.delegate(td, depth="quick")
        assert dr.elapsed_ms >= 0
        assert dr.started_at > 0

    @pytest.mark.asyncio
    async def test_invalid_agent_name_raises(self):
        agent = OrchestratorAgent()
        td = _make_token_data()
        with pytest.raises(ValueError, match="Unknown agents"):
            await agent.delegate(td, depth="quick", agents=["nonexistent"])


class TestEvaluateSingleToken:
    @pytest.mark.asyncio
    async def test_returns_merged_result(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="standard")
        assert "unified_score" in result
        assert "unified_verdict" in result
        assert result["token_address"] == td["token_address"]

    @pytest.mark.asyncio
    async def test_persists_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 50))
        td = _make_token_data(token_address="0xpersist")
        await agent._evaluate_single_token(td, depth="standard")
        saved = agent.read_scratchpad("eval_0xpersist")
        assert saved is not None
        assert saved["token_address"] == "0xpersist"


class TestDepthEscalation:
    @pytest.mark.asyncio
    async def test_quick_stays_quick_below_50(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert result["unified_score"] == 30
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_quick_escalates_to_standard_above_50(self):
        agent = OrchestratorAgent()
        call_depths = []

        def _make_mock(agent_name):
            async def mock_run(params):
                depth = params.get("depth", "none")
                call_depths.append(depth)
                return _make_agent_result(agent_name, 55)
            return mock_run

        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)

        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert "standard" in call_depths

    @pytest.mark.asyncio
    async def test_quick_escalates_to_deep_above_70(self):
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
        result = await agent._evaluate_single_token(td, depth="quick")
        assert "deep" in call_depths

    @pytest.mark.asyncio
    async def test_standard_no_escalation(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 90))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="standard")
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_deep_no_escalation(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 95))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="deep")
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_escalation_passes_depth_to_agents(self):
        agent = OrchestratorAgent()
        captured_params = {}

        def _make_mock(agent_name):
            async def capture_run(params):
                if "depth" in params:
                    captured_params[params["depth"]] = True
                return _make_agent_result(agent_name, 55)
            return capture_run

        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="quick")
        assert "quick" in captured_params
        assert "standard" in captured_params



class TestEscalationPath:
    @pytest.mark.asyncio
    async def test_no_escalation_path_is_single_depth(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert result["escalation_path"] == ["quick"]

    @pytest.mark.asyncio
    async def test_escalation_to_standard_tracked(self):
        agent = OrchestratorAgent()
        call_count = {"n": 0}
        def _make_mock(agent_name):
            async def mock_run(params):
                call_count["n"] += 1
                return _make_agent_result(agent_name, 55)
            return mock_run
        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert result["escalation_path"] == ["quick", "standard"]

    @pytest.mark.asyncio
    async def test_escalation_to_deep_tracked(self):
        agent = OrchestratorAgent()
        def _make_mock(agent_name):
            async def mock_run(params):
                return _make_agent_result(agent_name, 75)
            return mock_run
        for name, sub in agent._agents.items():
            sub.run = _make_mock(name)
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert result["escalation_path"] == ["quick", "deep"]

    @pytest.mark.asyncio
    async def test_standard_depth_no_escalation_path(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 90))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="standard")
        assert result["escalation_path"] == ["standard"]

    @pytest.mark.asyncio
    async def test_delegation_meta_in_result(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert "delegation_meta" in result
        assert result["delegation_meta"]["depth"] == "quick"
        assert result["delegation_meta"]["timeout_used"] == 10
        assert result["delegation_meta"]["elapsed_ms"] >= 0


class TestExecute:
    @pytest.mark.asyncio
    async def test_scan_mode(self):
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xtok1", "chain": "solana", "name": "Token1",
                 "mcap": 1000000, "volume_24h": 500000, "liquidity": 250000},
                {"contract_address": "0xtok2", "chain": "solana", "name": "Token2",
                 "mcap": 500000, "volume_24h": 200000, "liquidity": 100000},
            ],
            "total": 2,
            "source_counts": {"dexscreener": 2},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        result = await agent.execute({"mode": "scan"})
        assert result["tokens_scanned"] == 2
        assert len(result["results"]) == 2
        assert "summary" in result
        agent._scanner.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_evaluate_mode(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 65))
        td = _make_token_data()
        result = await agent.execute({"mode": "evaluate", "token_data": td, "depth": "standard"})
        assert "unified_score" in result
        assert "unified_verdict" in result

    @pytest.mark.asyncio
    async def test_invalid_mode_raises(self):
        agent = OrchestratorAgent()
        with pytest.raises(ValueError, match="Unknown mode"):
            await agent.execute({"mode": "invalid"})

    @pytest.mark.asyncio
    async def test_scan_persists_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xtok1", "chain": "solana", "name": "T1",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
            ],
            "total": 1,
            "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        await agent.execute({"mode": "scan"})
        saved = agent.read_scratchpad("last_scan_results")
        assert saved is not None
        assert saved["tokens_scanned"] == 1

    @pytest.mark.asyncio
    async def test_scan_builds_summary(self):
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": f"0xtok{i}", "chain": "solana", "name": f"T{i}",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100}
                for i in range(3)
            ],
            "total": 3,
            "source_counts": {},
        })
        scores = [85, 65, 30]
        call_count = {"n": 0}
        original_evaluate = agent._evaluate_single_token

        async def mock_evaluate(token_data, depth="quick"):
            idx = call_count["n"]
            call_count["n"] += 1
            for name, sub in agent._agents.items():
                sub.run = AsyncMock(return_value=_make_agent_result(name, scores[idx]))
            return await original_evaluate(token_data, depth="standard")

        agent._evaluate_single_token = mock_evaluate
        result = await agent.execute({"mode": "scan"})
        s = result["summary"]
        assert s["strong_list"] == 1
        assert s["list"] == 1
        assert s["reject"] == 1

    @pytest.mark.asyncio
    async def test_default_mode_is_scan(self):
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [], "total": 0, "source_counts": {},
        })
        result = await agent.execute({})
        assert result["tokens_scanned"] == 0
        assert result["results"] == []


class TestTelegramFormatting:
    def test_format_scan_result(self):
        agent = OrchestratorAgent()
        scan_result = {
            "tokens_scanned": 5,
            "summary": {"strong_list": 1, "list": 2, "review": 1, "reject": 1, "avg_score": 62},
            "results": [
                {"project_name": "Alpha", "unified_score": 85, "unified_verdict": "STRONG_LIST",
                 "red_flags": [], "green_flags": ["safety:verified"]},
                {"project_name": "Beta", "unified_score": 65, "unified_verdict": "LIST",
                 "red_flags": ["wallet:unlocked_lp"], "green_flags": []},
                {"project_name": "Gamma", "unified_score": 45, "unified_verdict": "REVIEW",
                 "red_flags": [], "green_flags": []},
            ],
        }
        text = agent.format_scan_result(scan_result)
        assert "Scan Complete" in text
        assert "5" in text
        assert "Strong List: 1" in text
        assert "Alpha" in text
        assert "Beta" in text
        assert "Gamma" not in text

    def test_format_scan_result_empty(self):
        agent = OrchestratorAgent()
        scan_result = {
            "tokens_scanned": 0,
            "summary": {"strong_list": 0, "list": 0, "review": 0, "reject": 0, "avg_score": 0},
            "results": [],
        }
        text = agent.format_scan_result(scan_result)
        assert "Scan Complete" in text
        assert "0" in text

    def test_format_evaluate_strong_list(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "GoodToken",
            "unified_score": 85,
            "unified_verdict": "STRONG_LIST",
            "agent_scores": {"scorer": 90, "safety": 80, "wallet": 85, "social": 75, "deploy": 95},
            "weights_used": {"scorer": 0.15, "safety": 0.25, "wallet": 0.25, "social": 0.20, "deploy": 0.15},
            "failed_agents": [],
            "red_flags": [],
            "green_flags": ["safety:verified_source", "wallet:lp_burned"],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "GoodToken" in text
        assert "85" in text
        assert "STRONG_LIST" in text
        assert "scorer: 90" in text
        assert "lp_burned" in text
        assert "Failed" not in text

    def test_format_evaluate_reject(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "BadToken",
            "unified_score": 25,
            "unified_verdict": "REJECT",
            "agent_scores": {"scorer": 20, "safety": 10},
            "weights_used": {"scorer": 0.15, "safety": 0.25},
            "failed_agents": ["wallet", "social", "deploy"],
            "red_flags": ["safety:honeypot_detected", "scorer:suspicious_volume"],
            "green_flags": [],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "BadToken" in text
        assert "REJECT" in text
        assert "honeypot_detected" in text
        assert "Failed" in text
        assert "wallet" in text

    def test_format_evaluate_with_failures(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "PartialToken",
            "unified_score": 60,
            "unified_verdict": "LIST",
            "agent_scores": {"scorer": 70, "safety": 65, "wallet": 55},
            "weights_used": {"scorer": 0.27, "safety": 0.45, "wallet": 0.27},
            "failed_agents": ["social", "deploy"],
            "red_flags": [],
            "green_flags": [],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "Failed" in text
        assert "social" in text
        assert "deploy" in text


class TestTaskRegistryProperty:
    def test_has_task_registry_property(self, tmp_path):
        agent = OrchestratorAgent(task_registry_path=str(tmp_path / "tasks.json"))
        assert isinstance(agent.task_registry, TaskRegistry)

    def test_task_registry_uses_configured_path(self, tmp_path):
        path = str(tmp_path / "custom.json")
        agent = OrchestratorAgent(task_registry_path=path)
        assert agent.task_registry._path == path


class TestTaskRegistryIntegration:
    @pytest.mark.asyncio
    async def test_creates_task_per_agent(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        data = json.loads((tmp_path / "tasks.json").read_text())
        agent_names = [t["agent_name"] for t in data]
        for name in agent._agents:
            assert name in agent_names

    @pytest.mark.asyncio
    async def test_successful_agents_marked_done(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        data = json.loads((tmp_path / "tasks.json").read_text())
        for task in data:
            assert task["status"] == "done"

    @pytest.mark.asyncio
    async def test_successful_agent_has_result_summary(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        data = json.loads((tmp_path / "tasks.json").read_text())
        for task in data:
            assert task["result_summary"] != ""

    @pytest.mark.asyncio
    async def test_timed_out_agent_marked_failed(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        agent.AGENT_TIMEOUT = 0.05
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        async def hang(*args, **kwargs):
            await asyncio.sleep(999)

        agent._agents["safety"].run = hang

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        data = json.loads((tmp_path / "tasks.json").read_text())
        safety_tasks = [t for t in data if t["agent_name"] == "safety"]
        assert len(safety_tasks) == 1
        assert safety_tasks[0]["status"] == "failed"
        assert safety_tasks[0]["error"] is not None

    @pytest.mark.asyncio
    async def test_exception_agent_marked_failed(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["wallet"].run = AsyncMock(side_effect=RuntimeError("API down"))

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        data = json.loads((tmp_path / "tasks.json").read_text())
        wallet_tasks = [t for t in data if t["agent_name"] == "wallet"]
        assert len(wallet_tasks) == 1
        assert wallet_tasks[0]["status"] == "failed"
        assert "API down" in wallet_tasks[0]["error"]

    @pytest.mark.asyncio
    async def test_registry_summary_after_mixed_results(self, tmp_path):
        path = str(tmp_path / "tasks.json")
        agent = OrchestratorAgent(task_registry_path=path)
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["safety"].run = AsyncMock(side_effect=RuntimeError("fail"))
        agent._agents["deploy"].run = AsyncMock(side_effect=RuntimeError("fail"))

        params = {name: {} for name in agent._agents}
        await agent._run_agents_parallel(params)
        summary = agent.task_registry.get_summary()
        assert summary["done"] == 3
        assert summary["failed"] == 2


# ---------------------------------------------------------------------------
# Helpers for MemoryManager/HealthMonitor wiring tests
# ---------------------------------------------------------------------------

def _make_orchestrator_with_memory(tmp_path, monkeypatch):
    """Create an OrchestratorAgent with MemoryManager and HealthMonitor wired in."""
    mem_dir = str(tmp_path / "memory")
    tasks_path = str(tmp_path / "memory" / "active-tasks.json")
    crons_path = str(tmp_path / "memory" / "cron-schedule.json")
    pipeline_path = str(tmp_path / "memory" / "pipeline" / "active.json")
    monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
    agent = OrchestratorAgent(
        memory_manager_dir=mem_dir,
        health_monitor_paths={
            "tasks_path": tasks_path,
            "crons_path": crons_path,
            "pipeline_path": pipeline_path,
            "memory_dir": mem_dir,
        },
    )
    return agent


class TestMemoryManagerProperty:
    def test_has_memory_manager_when_dir_provided(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        assert isinstance(agent.memory_manager, MemoryManager)

    def test_no_memory_manager_by_default(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        assert agent.memory_manager is None


class TestHealthMonitorProperty:
    def test_has_health_monitor_when_paths_provided(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        assert isinstance(agent.health_monitor, HealthMonitor)

    def test_no_health_monitor_by_default(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        assert agent.health_monitor is None


class TestScanModeWritesDailyLog:
    @pytest.mark.asyncio
    async def test_scan_writes_daily_log(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xtok1", "chain": "solana", "name": "T1",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
            ],
            "total": 1,
            "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        await agent.execute({"mode": "scan"})
        log = agent.memory_manager.read_daily_log()
        assert log is not None
        assert "SCAN" in log

    @pytest.mark.asyncio
    async def test_scan_log_contains_summary(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xt1", "chain": "solana", "name": "T1",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
                {"contract_address": "0xt2", "chain": "solana", "name": "T2",
                 "mcap": 200, "volume_24h": 200, "liquidity": 200},
            ],
            "total": 2,
            "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        await agent.execute({"mode": "scan"})
        log = agent.memory_manager.read_daily_log()
        # Should mention how many tokens were scanned
        assert "2" in log


class TestScanModeUpdatesPipeline:
    @pytest.mark.asyncio
    async def test_high_score_prospects_added_to_pipeline(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xhigh", "chain": "solana", "name": "HighToken",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
            ],
            "total": 1,
            "source_counts": {},
        })
        # Score 80 => unified_score=80 => above 70 threshold
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 80))

        await agent.execute({"mode": "scan"})
        pipeline = agent.memory_manager.read_pipeline()
        assert len(pipeline) >= 1
        addrs = [p.get("contract_address") or p.get("token_address") for p in pipeline]
        assert "0xhigh" in addrs

    @pytest.mark.asyncio
    async def test_low_score_prospects_not_in_pipeline(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xlow", "chain": "solana", "name": "LowToken",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
            ],
            "total": 1,
            "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        await agent.execute({"mode": "scan"})
        pipeline = agent.memory_manager.read_pipeline()
        assert len(pipeline) == 0


class TestHealthMode:
    @pytest.mark.asyncio
    async def test_health_mode_returns_report(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        # Write crons so health check can find them
        crons_path = tmp_path / "memory" / "cron-schedule.json"
        crons_path.write_text(json.dumps(
            [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(36)]
        ))
        # Write a daily log so scan check isn't red
        mem_dir = tmp_path / "memory"
        (mem_dir / "daily-log.json").write_text(json.dumps(
            [{"type": "scan", "timestamp": time.time()}]
        ))

        result = await agent.execute({"mode": "health"})
        assert "overall" in result
        assert "components" in result
        assert result["overall"] in ("green", "yellow", "red")

    @pytest.mark.asyncio
    async def test_health_mode_without_monitor_raises(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        with pytest.raises(ValueError, match="health_monitor"):
            await agent.execute({"mode": "health"})


class TestBootMode:
    @pytest.mark.asyncio
    async def test_boot_mode_returns_report(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        crons_path = tmp_path / "memory" / "cron-schedule.json"
        crons_path.write_text(json.dumps(
            [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(36)]
        ))

        result = await agent.execute({"mode": "boot"})
        assert "crons_ok" in result
        assert "status" in result
        assert result["crons_ok"] is True
        assert result["status"] == "green"

    @pytest.mark.asyncio
    async def test_boot_mode_without_manager_raises(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path / "scratchpad"))
        agent = OrchestratorAgent()
        with pytest.raises(ValueError, match="memory_manager"):
            await agent.execute({"mode": "boot"})

    @pytest.mark.asyncio
    async def test_boot_mode_red_with_missing_crons(self, tmp_path, monkeypatch):
        agent = _make_orchestrator_with_memory(tmp_path, monkeypatch)
        # No cron file exists
        result = await agent.execute({"mode": "boot"})
        assert result["status"] == "red"
        assert result["crons_ok"] is False
