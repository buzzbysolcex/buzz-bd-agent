import pytest
from src.agents.scorer_agent import ScorerAgent
from src.agents.base_agent import BaseAgent


class TestScorerAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_scorer(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent.name == "scorer"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent.status == "idle"
