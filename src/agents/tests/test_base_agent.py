# src/agents/tests/test_base_agent.py
import pytest
from typing import Dict
from src.agents.base_agent import BaseAgent


class TestBaseAgentABC:
    def test_cannot_instantiate_directly(self):
        """BaseAgent is abstract — instantiating it raises TypeError."""
        with pytest.raises(TypeError):
            BaseAgent(name="test")


class StubAgent(BaseAgent):
    """Concrete subclass for testing BaseAgent functionality."""
    async def execute(self, params: Dict) -> Dict:
        return {"stub": True}


class TestBaseAgentInit:
    def test_name_is_set(self):
        agent = StubAgent(name="test_agent")
        assert agent.name == "test_agent"

    def test_initial_status_is_idle(self):
        agent = StubAgent(name="test_agent")
        assert agent.status == "idle"

    def test_events_list_starts_empty(self):
        agent = StubAgent(name="test_agent")
        assert agent.events == []
