# BaseAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the BaseAgent ABC that all 6 Buzz v6.0 sub-agents inherit from.

**Architecture:** Abstract base class using Python's `abc` module. Provides `run()` lifecycle wrapper (status transitions), typed event logging with JSONL persistence, file-based scratchpad memory, and `context()` for LLM prompting. Sub-agents only implement `execute()`.

**Tech Stack:** Python 3.9+ stdlib only (`abc`, `json`, `os`, `time`, `typing`). pytest + pytest-asyncio for tests.

**Design doc:** `docs/plans/2026-02-23-base-agent-design.md`

---

### Task 1: Python Project Scaffolding

**Files:**
- Create: `pyproject.toml`
- Create: `requirements-dev.txt`

**Step 1: Create pyproject.toml with pytest config**

```toml
[project]
name = "buzz-bd-agent"
version = "6.0.0"
requires-python = ">=3.9"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["src"]
```

**Step 2: Create requirements-dev.txt**

```
pytest>=7.0
pytest-asyncio>=0.21
```

**Step 3: Install dev dependencies**

Run: `pip3 install -r requirements-dev.txt`
Expected: Successfully installed pytest and pytest-asyncio

**Step 4: Verify pytest works**

Run: `python3 -m pytest --version`
Expected: Shows pytest version 7.x+

**Step 5: Commit**

```bash
git add pyproject.toml requirements-dev.txt
git commit -m "chore: add Python project config and test dependencies"
```

---

### Task 2: Test — BaseAgent Cannot Be Instantiated Directly

**Files:**
- Create: `src/agents/tests/test_base_agent.py`

**Step 1: Write the failing test**

```python
# src/agents/tests/test_base_agent.py
import pytest
from src.agents.base_agent import BaseAgent


class TestBaseAgentABC:
    def test_cannot_instantiate_directly(self):
        """BaseAgent is abstract — instantiating it raises TypeError."""
        with pytest.raises(TypeError):
            BaseAgent(name="test")
```

**Step 2: Run test to verify it fails**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestBaseAgentABC::test_cannot_instantiate_directly -v`
Expected: FAIL — `ImportError` or `ModuleNotFoundError` (base_agent.py doesn't exist yet)

**Step 3: Create minimal base_agent.py to make test pass**

```python
# src/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def execute(self, params: Dict) -> Dict:
        ...
```

**Step 4: Run test to verify it passes**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestBaseAgentABC::test_cannot_instantiate_directly -v`
Expected: PASS

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: add BaseAgent ABC — cannot instantiate directly"
```

---

### Task 3: Test — Constructor Sets Name and Idle Status

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

We need a concrete subclass for testing. All subsequent tests use this helper.

**Step 1: Write the failing test**

Add to `src/agents/tests/test_base_agent.py`:

```python
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
```

Add the missing import at the top of the test file:

```python
from typing import Dict
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestBaseAgentInit -v`
Expected: FAIL — `AttributeError: 'StubAgent' object has no attribute 'status'`

**Step 3: Add status and events to __init__**

Update `BaseAgent.__init__` in `src/agents/base_agent.py`:

```python
def __init__(self, name: str):
    self.name = name
    self.status: str = "idle"
    self.events: List[Dict] = []
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestBaseAgentInit -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: BaseAgent init with name, status, events"
```

---

### Task 4: Test — Event Logging with Typed Events

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_base_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestEventLogging -v`
Expected: FAIL — `AttributeError: 'StubAgent' object has no attribute 'log_event'`

**Step 3: Implement log_event**

Add to `BaseAgent` in `src/agents/base_agent.py`:

```python
import time

VALID_EVENT_TYPES = {"action", "observation", "error", "decision"}

# Inside BaseAgent class:
def log_event(self, event_type: str, description: str, data: Optional[Dict] = None) -> Dict:
    if event_type not in VALID_EVENT_TYPES:
        raise ValueError(f"Invalid event type '{event_type}'. Must be one of: {VALID_EVENT_TYPES}")
    event = {
        "type": event_type,
        "description": description,
        "data": data or {},
        "timestamp": time.time(),
        "agent": self.name,
    }
    self.events.append(event)
    return event
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestEventLogging -v`
Expected: 9 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: add typed event logging (action/observation/error/decision)"
```

---

### Task 5: Test — JSONL Event Persistence

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_base_agent.py`:

```python
import json
import os


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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestEventPersistence -v`
Expected: FAIL — events.jsonl not created

**Step 3: Add JSONL persistence and env-var scratchpad path**

Update `BaseAgent.__init__` and `log_event` in `src/agents/base_agent.py`:

```python
def __init__(self, name: str):
    self.name = name
    self.status: str = "idle"
    self.events: List[Dict] = []
    scratchpad_base = os.environ.get("BUZZ_SCRATCHPAD_DIR", "data/scratchpad")
    self.scratchpad_dir = os.path.join(scratchpad_base, name)
    os.makedirs(self.scratchpad_dir, exist_ok=True)
    self._events_path = os.path.join(self.scratchpad_dir, "events.jsonl")
```

Add to end of `log_event`, before `return event`:

```python
    with open(self._events_path, "a") as f:
        f.write(json.dumps(event) + "\n")
```

Add `import json` to the top of the file.

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestEventPersistence -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: auto-persist events to JSONL on disk"
```

---

### Task 6: Test — Scratchpad Read/Write

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_base_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestScratchpad -v`
Expected: FAIL — `AttributeError: 'StubAgent' object has no attribute 'write_scratchpad'`

**Step 3: Implement write_scratchpad and read_scratchpad**

Add to `BaseAgent` in `src/agents/base_agent.py`:

```python
def write_scratchpad(self, key: str, data: Any) -> None:
    filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def read_scratchpad(self, key: str) -> Optional[Any]:
    filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return None
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestScratchpad -v`
Expected: 4 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: add file-based scratchpad read/write"
```

---

### Task 7: Test — run() Lifecycle Wrapper

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_base_agent.py`:

```python
class FailingAgent(BaseAgent):
    """Agent that raises during execute()."""
    async def execute(self, params: Dict) -> Dict:
        raise RuntimeError("API call failed")


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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestRunLifecycle -v`
Expected: FAIL — `AttributeError: 'StubAgent' object has no attribute 'run'`

**Step 3: Implement run()**

Add to `BaseAgent` in `src/agents/base_agent.py`:

```python
async def run(self, params: Dict) -> Dict:
    self.status = "running"
    self.log_event("action", f"{self.name} starting")
    try:
        result = await self.execute(params)
        self.status = "complete"
        self.log_event("observation", f"{self.name} completed")
        return result
    except Exception as e:
        self.status = "error"
        self.log_event("error", str(e))
        raise
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestRunLifecycle -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: add run() lifecycle wrapper with status transitions"
```

---

### Task 8: Test — context() Method

**Files:**
- Modify: `src/agents/tests/test_base_agent.py`
- Modify: `src/agents/base_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_base_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestContext -v`
Expected: FAIL — `AttributeError: 'StubAgent' object has no attribute 'context'`

**Step 3: Implement context() and _list_scratchpad_keys()**

Add to `BaseAgent` in `src/agents/base_agent.py`:

```python
def context(self, max_events: int = 10) -> Dict:
    return {
        "agent": self.name,
        "status": self.status,
        "recent_events": self.events[-max_events:],
        "scratchpad_keys": self._list_scratchpad_keys(),
    }

def _list_scratchpad_keys(self) -> List[str]:
    keys = []
    if os.path.isdir(self.scratchpad_dir):
        for filename in sorted(os.listdir(self.scratchpad_dir)):
            if filename.endswith(".json"):
                keys.append(filename[:-5])
    return keys
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py::TestContext -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/base_agent.py src/agents/tests/test_base_agent.py
git commit -m "feat: add context() for LLM prompting (Manus recency pattern)"
```

---

### Task 9: Run Full Test Suite and Verify

**Files:** None (verification only)

**Step 1: Run all tests**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py -v`
Expected: All 29 tests PASS

**Step 2: Run with coverage (optional)**

Run: `python3 -m pytest src/agents/tests/test_base_agent.py -v --tb=short`
Expected: 29 passed, 0 failed

---

### Final File State Reference

After all tasks, `src/agents/base_agent.py` should contain approximately:

```python
import json
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

VALID_EVENT_TYPES = {"action", "observation", "error", "decision"}


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
        self.status: str = "idle"
        self.events: List[Dict] = []
        scratchpad_base = os.environ.get("BUZZ_SCRATCHPAD_DIR", "data/scratchpad")
        self.scratchpad_dir = os.path.join(scratchpad_base, name)
        os.makedirs(self.scratchpad_dir, exist_ok=True)
        self._events_path = os.path.join(self.scratchpad_dir, "events.jsonl")

    async def run(self, params: Dict) -> Dict:
        self.status = "running"
        self.log_event("action", f"{self.name} starting")
        try:
            result = await self.execute(params)
            self.status = "complete"
            self.log_event("observation", f"{self.name} completed")
            return result
        except Exception as e:
            self.status = "error"
            self.log_event("error", str(e))
            raise

    @abstractmethod
    async def execute(self, params: Dict) -> Dict:
        ...

    def log_event(self, event_type: str, description: str, data: Optional[Dict] = None) -> Dict:
        if event_type not in VALID_EVENT_TYPES:
            raise ValueError(f"Invalid event type '{event_type}'. Must be one of: {VALID_EVENT_TYPES}")
        event = {
            "type": event_type,
            "description": description,
            "data": data or {},
            "timestamp": time.time(),
            "agent": self.name,
        }
        self.events.append(event)
        with open(self._events_path, "a") as f:
            f.write(json.dumps(event) + "\n")
        return event

    def write_scratchpad(self, key: str, data: Any) -> None:
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def read_scratchpad(self, key: str) -> Optional[Any]:
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None

    def context(self, max_events: int = 10) -> Dict:
        return {
            "agent": self.name,
            "status": self.status,
            "recent_events": self.events[-max_events:],
            "scratchpad_keys": self._list_scratchpad_keys(),
        }

    def _list_scratchpad_keys(self) -> List[str]:
        keys = []
        if os.path.isdir(self.scratchpad_dir):
            for filename in sorted(os.listdir(self.scratchpad_dir)):
                if filename.endswith(".json"):
                    keys.append(filename[:-5])
        return keys
```
