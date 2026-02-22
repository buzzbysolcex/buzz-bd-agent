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
    def test_name_is_set(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        assert agent.name == "test_agent"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        assert agent.status == "idle"

    def test_events_list_starts_empty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        assert agent.events == []


class TestEventLogging:
    def test_log_event_appends_to_events(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scanning tokens")
        assert len(agent.events) == 1

    def test_log_event_has_correct_type(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scanning tokens")
        assert agent.events[0]["type"] == "action"

    def test_log_event_has_description(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("observation", "found 5 tokens")
        assert agent.events[0]["description"] == "found 5 tokens"

    def test_log_event_has_data(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan", {"chain": "solana"})
        assert agent.events[0]["data"] == {"chain": "solana"}

    def test_log_event_data_defaults_to_empty_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert agent.events[0]["data"] == {}

    def test_log_event_has_timestamp(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert isinstance(agent.events[0]["timestamp"], float)

    def test_log_event_has_agent_name(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "scan")
        assert agent.events[0]["agent"] == "test_agent"

    def test_log_event_validates_type(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        with pytest.raises(ValueError):
            agent.log_event("invalid_type", "bad event")

    def test_multiple_events_append_in_order(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
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


class TestScratchpad:
    def test_write_and_read_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.write_scratchpad("scan_result", {"score": 85, "chain": "solana"})
        result = agent.read_scratchpad("scan_result")
        assert result == {"score": 85, "chain": "solana"}

    def test_read_nonexistent_key_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        assert agent.read_scratchpad("nonexistent") is None

    def test_scratchpad_writes_json_file(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.write_scratchpad("my_key", {"data": 1})

        filepath = tmp_path / "test_agent" / "my_key.json"
        assert filepath.exists()
        assert json.loads(filepath.read_text()) == {"data": 1}

    def test_scratchpad_overwrites_existing_key(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.write_scratchpad("key", {"v": 1})
        agent.write_scratchpad("key", {"v": 2})
        assert agent.read_scratchpad("key") == {"v": 2}


class FailingAgent(BaseAgent):
    """Agent that raises during execute()."""
    async def execute(self, params: Dict) -> Dict:
        raise RuntimeError("API call failed")


class StatusCapturingAgent(BaseAgent):
    """Agent that captures status during execute()."""
    async def execute(self, params: Dict) -> Dict:
        self.captured_status = self.status
        return {}


class TestRunLifecycle:
    async def test_run_returns_execute_result(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        result = await agent.run({"input": "data"})
        assert result == {"stub": True}

    async def test_run_sets_status_to_running_then_complete(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        await agent.run({})
        assert agent.status == "complete"

    async def test_run_sets_status_to_error_on_exception(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = FailingAgent(name="failing_agent")
        with pytest.raises(RuntimeError):
            await agent.run({})
        assert agent.status == "error"

    async def test_run_logs_start_event(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        await agent.run({})
        assert agent.events[0]["type"] == "action"
        assert "test_agent" in agent.events[0]["description"]

    async def test_run_logs_error_event_on_failure(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = FailingAgent(name="failing_agent")
        with pytest.raises(RuntimeError):
            await agent.run({})
        error_events = [e for e in agent.events if e["type"] == "error"]
        assert len(error_events) == 1
        assert "API call failed" in error_events[0]["description"]

    async def test_run_logs_completion_event(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        await agent.run({})
        assert agent.events[-1]["type"] == "observation"
        assert "complete" in agent.events[-1]["description"].lower()

    async def test_status_is_running_during_execute(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StatusCapturingAgent(name="test_agent")
        await agent.run({})
        assert agent.captured_status == "running"


class TestContext:
    def test_context_returns_agent_name(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        ctx = agent.context()
        assert ctx["agent"] == "test_agent"

    def test_context_returns_status(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        ctx = agent.context()
        assert ctx["status"] == "idle"

    def test_context_returns_recent_events(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        for i in range(15):
            agent.log_event("action", f"event {i}")
        ctx = agent.context(max_events=5)
        assert len(ctx["recent_events"]) == 5
        assert ctx["recent_events"][0]["description"] == "event 10"

    def test_context_returns_scratchpad_keys(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.write_scratchpad("scan_result", {"data": 1})
        agent.write_scratchpad("score", {"data": 2})
        ctx = agent.context()
        assert "scan_result" in ctx["scratchpad_keys"]
        assert "score" in ctx["scratchpad_keys"]

    def test_context_excludes_events_jsonl_from_scratchpad_keys(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        agent.log_event("action", "test")
        agent.write_scratchpad("data", {"v": 1})
        ctx = agent.context()
        assert "events" not in ctx["scratchpad_keys"]

    def test_context_defaults_to_10_events(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = StubAgent(name="test_agent")
        for i in range(20):
            agent.log_event("action", f"event {i}")
        ctx = agent.context()
        assert len(ctx["recent_events"]) == 10
