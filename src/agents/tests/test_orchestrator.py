# src/agents/tests/test_orchestrator.py
import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.agents.orchestrator import OrchestratorAgent
from src.agents.base_agent import BaseAgent


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
