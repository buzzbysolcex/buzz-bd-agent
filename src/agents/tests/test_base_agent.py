# src/agents/tests/test_base_agent.py
import pytest
from src.agents.base_agent import BaseAgent


class TestBaseAgentABC:
    def test_cannot_instantiate_directly(self):
        """BaseAgent is abstract — instantiating it raises TypeError."""
        with pytest.raises(TypeError):
            BaseAgent(name="test")
