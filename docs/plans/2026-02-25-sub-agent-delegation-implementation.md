# Sub-Agent Delegation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a formal `delegate()` public method with `AgentOutcome`/`DelegationResult` dataclasses, per-depth timeouts, selective agent subsets, and escalation path tracking to OrchestratorAgent.

**Architecture:** Introduce two dataclasses (`AgentOutcome`, `DelegationResult`) at the top of `orchestrator.py`. Add a public `delegate()` method that builds agent params, filters to requested subset, runs agents via `_run_agents_parallel` with depth-specific timeouts, and wraps results. Refactor `_evaluate_single_token` to call `delegate()` and track escalation paths. Replace flat `AGENT_TIMEOUT` with `DEPTH_TIMEOUTS` dict.

**Tech Stack:** Python 3.9+, asyncio, dataclasses, pytest + pytest-asyncio

---

### Task 1: Add AgentOutcome and DelegationResult dataclasses

**Files:**
- Modify: `src/agents/orchestrator.py:1-15` (imports + new dataclasses before class)
- Test: `src/agents/tests/test_orchestrator.py`

**Step 1: Write the failing tests**

Add at the top of test file (after existing imports):

```python
from src.agents.orchestrator import AgentOutcome, DelegationResult
```

Then add a new test class after `TestOrchestratorInit`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_orchestrator.py::TestDataclasses -v`
Expected: FAIL with `ImportError: cannot import name 'AgentOutcome'`

**Step 3: Write minimal implementation**

Add to `src/agents/orchestrator.py` after the existing imports (before the class):

```python
import time
from dataclasses import dataclass

@dataclass
class AgentOutcome:
    agent_name: str
    score: Optional[int]
    result: Optional[Dict]
    elapsed_ms: float
    error: Optional[str]

@dataclass
class DelegationResult:
    agent_outcomes: Dict[str, 'AgentOutcome']
    depth: str
    timeout_used: int
    started_at: float
    elapsed_ms: float
    escalation_path: List[str]
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_orchestrator.py::TestDataclasses -v`
Expected: PASS (4 tests)

**Step 5: Run full test suite for regressions**

Run: `pytest src/agents/tests/test_orchestrator.py -v`
Expected: All existing tests still pass

**Step 6: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add AgentOutcome and DelegationResult dataclasses"
```

---

### Task 2: Add DEPTH_TIMEOUTS constant and update _run_agents_parallel

**Files:**
- Modify: `src/agents/orchestrator.py:33` (replace AGENT_TIMEOUT)
- Modify: `src/agents/orchestrator.py:233-265` (_run_agents_parallel signature)
- Test: `src/agents/tests/test_orchestrator.py`

**Step 1: Write the failing test**

Add to `TestOrchestratorInit.test_class_constants` (replace the `AGENT_TIMEOUT` assertion):

```python
    def test_depth_timeouts_constant(self):
        assert OrchestratorAgent.DEPTH_TIMEOUTS == {"quick": 10, "standard": 20, "deep": 45}
```

Add a new test to `TestRunAgentsParallel`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_orchestrator.py::TestOrchestratorInit::test_depth_timeouts_constant src/agents/tests/test_orchestrator.py::TestRunAgentsParallel::test_respects_timeout_parameter -v`
Expected: FAIL

**Step 3: Write minimal implementation**

In `orchestrator.py`, replace:
```python
    AGENT_TIMEOUT = 30  # seconds
```
with:
```python
    AGENT_TIMEOUT = 30  # seconds (legacy, used as fallback)

    DEPTH_TIMEOUTS = {"quick": 10, "standard": 20, "deep": 45}
```

Update `_run_agents_parallel` signature from:
```python
    async def _run_agents_parallel(self, agent_params: Dict[str, Dict]) -> Dict[str, Optional[Dict]]:
```
to:
```python
    async def _run_agents_parallel(self, agent_params: Dict[str, Dict], timeout: Optional[int] = None) -> Dict[str, Optional[Dict]]:
```

Inside `_run_with_timeout`, change:
```python
                    timeout=self.AGENT_TIMEOUT,
```
to:
```python
                    timeout=timeout if timeout is not None else self.AGENT_TIMEOUT,
```

And update the timeout error messages similarly:
```python
                self.log_event("error", f"{name} timed out after {timeout if timeout is not None else self.AGENT_TIMEOUT}s")
```
and:
```python
                    self._task_registry.update_status(
                        task_ids[name], "failed", error=f"Timed out after {timeout if timeout is not None else self.AGENT_TIMEOUT}s"
                    )
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_orchestrator.py::TestOrchestratorInit::test_depth_timeouts_constant src/agents/tests/test_orchestrator.py::TestRunAgentsParallel::test_respects_timeout_parameter -v`
Expected: PASS

**Step 5: Run full test suite for regressions**

Run: `pytest src/agents/tests/test_orchestrator.py -v`
Expected: All tests pass (existing tests use AGENT_TIMEOUT as fallback)

**Step 6: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add DEPTH_TIMEOUTS and timeout param to _run_agents_parallel"
```

---

### Task 3: Add the public delegate() method

**Files:**
- Modify: `src/agents/orchestrator.py` (add delegate method after `_build_agent_params`)
- Test: `src/agents/tests/test_orchestrator.py`

**Step 1: Write the failing tests**

Add new test class:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_orchestrator.py::TestDelegate -v`
Expected: FAIL with `AttributeError: 'OrchestratorAgent' object has no attribute 'delegate'`

**Step 3: Write minimal implementation**

Add to `orchestrator.py` after `_build_agent_params` method (before `_evaluate_single_token`):

```python
    async def delegate(
        self,
        token_data: Dict,
        depth: str = "quick",
        agents: Optional[List[str]] = None,
    ) -> 'DelegationResult':
        if agents is not None:
            unknown = set(agents) - set(self._agents.keys())
            if unknown:
                raise ValueError(f"Unknown agents: {unknown}")

        timeout = self.DEPTH_TIMEOUTS.get(depth, self.AGENT_TIMEOUT)
        started_at = time.monotonic()

        agent_params = self._build_agent_params(token_data, depth)
        if agents is not None:
            agent_params = {k: v for k, v in agent_params.items() if k in agents}

        # Run agents and collect per-agent timing
        agent_timings: Dict[str, float] = {}
        agent_errors: Dict[str, str] = {}

        original_run_parallel = self._run_agents_parallel

        async def _timed_run(ap, to):
            tasks_start = {}
            results_raw = {}

            async def _run_one(name, params):
                t0 = time.monotonic()
                try:
                    result = await asyncio.wait_for(
                        self._agents[name].run(params),
                        timeout=to,
                    )
                    agent_timings[name] = (time.monotonic() - t0) * 1000
                    return (name, result)
                except asyncio.TimeoutError:
                    agent_timings[name] = (time.monotonic() - t0) * 1000
                    agent_errors[name] = f"Timed out after {to}s"
                    self.log_event("error", f"{name} timed out after {to}s")
                    return (name, None)
                except Exception as e:
                    agent_timings[name] = (time.monotonic() - t0) * 1000
                    agent_errors[name] = str(e)
                    self.log_event("error", f"{name} failed: {str(e)}")
                    return (name, None)

            tasks = [_run_one(name, params) for name, params in ap.items()]
            raw = await asyncio.gather(*tasks)
            return dict(raw)

        raw_results = await _timed_run(agent_params, timeout)

        elapsed_ms = (time.monotonic() - started_at) * 1000

        agent_outcomes = {}
        for name in agent_params:
            result = raw_results.get(name)
            score = None
            if result is not None:
                score_key = self.SCORE_KEYS.get(name)
                if score_key:
                    score = result.get(score_key)
            agent_outcomes[name] = AgentOutcome(
                agent_name=name,
                score=score,
                result=result,
                elapsed_ms=agent_timings.get(name, 0.0),
                error=agent_errors.get(name),
            )

        return DelegationResult(
            agent_outcomes=agent_outcomes,
            depth=depth,
            timeout_used=timeout,
            started_at=started_at,
            elapsed_ms=elapsed_ms,
            escalation_path=[depth],
        )
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_orchestrator.py::TestDelegate -v`
Expected: PASS (8 tests)

**Step 5: Run full test suite for regressions**

Run: `pytest src/agents/tests/test_orchestrator.py -v`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add public delegate() method with per-depth timeouts"
```

---

### Task 4: Refactor _evaluate_single_token to use delegate() with escalation tracking

**Files:**
- Modify: `src/agents/orchestrator.py:303-321` (_evaluate_single_token)
- Test: `src/agents/tests/test_orchestrator.py`

**Step 1: Write the failing tests**

Add new test class:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_orchestrator.py::TestEscalationPath -v`
Expected: FAIL with `KeyError: 'escalation_path'`

**Step 3: Write minimal implementation**

Replace `_evaluate_single_token` in `orchestrator.py`:

```python
    async def _evaluate_single_token(
        self, token_data: Dict, depth: str = "quick", _escalation_path: Optional[List[str]] = None,
    ) -> Dict:
        self.log_event("action", f"Evaluating {token_data.get('token_address', '?')} at depth={depth}")

        escalation_path = list(_escalation_path) if _escalation_path else []
        escalation_path.append(depth)

        dr = await self.delegate(token_data, depth=depth)
        # Convert DelegationResult back to raw dict for _merge_results
        agent_results = {
            name: outcome.result
            for name, outcome in dr.agent_outcomes.items()
        }
        merged = self._merge_results(agent_results, token_data)

        # Depth escalation (only from quick)
        if depth == "quick" and merged["unified_score"] >= self.DEEP_ESCALATION:
            self.log_event("decision", f"Escalating to deep (score={merged['unified_score']})")
            return await self._evaluate_single_token(
                token_data, depth="deep", _escalation_path=escalation_path,
            )
        elif depth == "quick" and merged["unified_score"] >= self.STANDARD_ESCALATION:
            self.log_event("decision", f"Escalating to standard (score={merged['unified_score']})")
            return await self._evaluate_single_token(
                token_data, depth="standard", _escalation_path=escalation_path,
            )

        merged["escalation_path"] = escalation_path
        merged["delegation_meta"] = {
            "depth": dr.depth,
            "timeout_used": dr.timeout_used,
            "elapsed_ms": dr.elapsed_ms,
        }

        addr = token_data.get("token_address", "unknown")
        self.write_scratchpad(f"eval_{addr}", merged)

        return merged
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_orchestrator.py::TestEscalationPath -v`
Expected: PASS (5 tests)

**Step 5: Run full test suite for regressions**

Run: `pytest src/agents/tests/test_orchestrator.py -v`
Expected: All tests pass (including existing escalation and evaluate tests)

**Step 6: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): refactor _evaluate_single_token to use delegate() with escalation tracking"
```

---

### Task 5: Update existing test that checks AGENT_TIMEOUT constant

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py:42` (update constant assertion)

**Step 1: Update the constant test**

In `TestOrchestratorInit.test_class_constants`, the line:
```python
        assert OrchestratorAgent.AGENT_TIMEOUT == 30
```
should remain (it's still there as legacy fallback). But add:
```python
        assert OrchestratorAgent.DEPTH_TIMEOUTS == {"quick": 10, "standard": 20, "deep": 45}
```

(This may already be covered by `test_depth_timeouts_constant` from Task 2. If the test was added as a separate method, just ensure both exist.)

**Step 2: Run full test suite**

Run: `pytest src/agents/tests/test_orchestrator.py -v`
Expected: All tests pass

**Step 3: Run integration tests**

Run: `pytest src/agents/tests/test_integration.py -v`
Expected: All 36 integration tests pass

**Step 4: Commit (if any changes)**

```bash
git add src/agents/tests/test_orchestrator.py
git commit -m "test(orchestrator): add DEPTH_TIMEOUTS assertion to constant tests"
```

---

### Task 6: Final verification and cleanup

**Step 1: Run full agent test suite**

Run: `pytest src/agents/tests/ -v`
Expected: All 450+ tests pass

**Step 2: Verify no regressions in integration tests**

Run: `pytest src/agents/tests/test_integration.py -v`
Expected: All 36 tests pass

**Step 3: Commit any final cleanup**

Only if there are unstaged changes.
