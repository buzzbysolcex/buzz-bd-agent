import pytest
from src.agents.safety_agent import SafetyAgent
from src.agents.base_agent import BaseAgent


class TestSafetyAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_safety(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.name == "safety"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.status == "idle"
