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
