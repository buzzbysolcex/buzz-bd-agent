# src/agents/tests/test_base_agent.py
import json
import os
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


class TestEventLogging:
    def test_log_event_appends_to_events(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scanning tokens")
        assert len(agent.events) == 1

    def test_log_event_has_correct_type(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scanning tokens")
        assert agent.events[0]["type"] == "action"

    def test_log_event_has_description(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("observation", "found 5 tokens")
        assert agent.events[0]["description"] == "found 5 tokens"

    def test_log_event_has_data(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan", {"chain": "solana"})
        assert agent.events[0]["data"] == {"chain": "solana"}

    def test_log_event_data_defaults_to_empty_dict(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert agent.events[0]["data"] == {}

    def test_log_event_has_timestamp(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert isinstance(agent.events[0]["timestamp"], float)

    def test_log_event_has_agent_name(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert agent.events[0]["agent"] == "test_agent"

    def test_log_event_validates_type(self):
        agent = StubAgent(name="test_agent")
        with pytest.raises(ValueError):
            agent.log_event("invalid_type", "bad event")

    def test_multiple_events_append_in_order(self):
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "first")
        agent.log_event("observation", "second")
        agent.log_event("decision", "third")
        assert [e["type"] for e in agent.events] == ["action", "observation", "decision"]


class TestEventPersistence:
    def test_events_written_to_jsonl(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan started")

        events_file = tmp_path / "test_agent" / "events.jsonl"
        assert events_file.exists()

        lines = events_file.read_text().strip().split("\n")
        assert len(lines) == 1
        event = json.loads(lines[0])
        assert event["type"] == "action"
        assert event["description"] == "scan started"

    def test_multiple_events_append_to_jsonl(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "first")
        agent.log_event("observation", "second")

        events_file = tmp_path / "test_agent" / "events.jsonl"
        lines = events_file.read_text().strip().split("\n")
        assert len(lines) == 2

    def test_scratchpad_dir_created_from_env_var(self, tmp_path, monkeypatch):
        custom_dir = tmp_path / "custom"
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(custom_dir))
        agent = StubAgent(name="test_agent")
        assert (custom_dir / "test_agent").is_dir()
