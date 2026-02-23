# Orchestrator Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build OrchestratorAgent that inherits from BaseAgent, coordinates all sub-agents (Scanner + 5 Layer 2 evaluators), merges results into unified scores/verdicts, and formats output for Telegram.

**Architecture:** Flat Orchestrator pattern — single class in `src/agents/orchestrator.py`. ScannerAgent runs first (Layer 1) to discover tokens, then 5 Layer 2 agents (ScorerAgent, SafetyAgent, WalletAgent, SocialAgent, DeployAgent) run in parallel via `asyncio.gather` with per-agent timeouts. Results merged into weighted score with proportional redistribution on failures.

**Tech Stack:** Python 3.11+, asyncio, pytest, pytest-asyncio, unittest.mock (AsyncMock for sub-agent mocking — no HTTP mocking needed since we mock at agent boundary)

---

### Task 1: Constructor & Setup Tests

**Files:**
- Create: `src/agents/tests/test_orchestrator.py`
- Create: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestOrchestratorInit -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.agents.orchestrator'`

**Step 3: Write minimal implementation**

```python
# src/agents/orchestrator.py
import asyncio
from typing import Any, Dict, List, Optional

from src.agents.base_agent import BaseAgent
from src.agents.scanner_agent import ScannerAgent
from src.agents.scorer_agent import ScorerAgent
from src.agents.safety_agent import SafetyAgent
from src.agents.wallet_agent import WalletAgent
from src.agents.social_agent import SocialAgent
from src.agents.deploy_agent import DeployAgent


class OrchestratorAgent(BaseAgent):
    AGENT_WEIGHTS = {
        "safety": 0.25,
        "wallet": 0.25,
        "social": 0.20,
        "scorer": 0.15,
        "deploy": 0.15,
    }

    STRONG_LIST_THRESHOLD = 80
    LIST_THRESHOLD = 60
    REVIEW_THRESHOLD = 40

    STANDARD_ESCALATION = 50
    DEEP_ESCALATION = 70

    AGENT_TIMEOUT = 30  # seconds

    def __init__(self):
        super().__init__(name="orchestrator")
        self._scanner = ScannerAgent()
        self._agents = {
            "scorer": ScorerAgent(),
            "safety": SafetyAgent(),
            "wallet": WalletAgent(),
            "social": SocialAgent(),
            "deploy": DeployAgent(),
        }

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestOrchestratorInit -v`
Expected: 4 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add constructor with sub-agent wiring and constants"
```

---

### Task 2: Weight Redistribution Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
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
        # Original ratios: wallet=0.25, social=0.20, scorer=0.15, deploy=0.15
        # Total surviving = 0.75, so wallet = 0.25/0.75 = 0.3333...
        assert abs(weights["wallet"] - 0.25 / 0.75) < 1e-9
        assert abs(weights["social"] - 0.20 / 0.75) < 1e-9

    def test_two_failures(self):
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["safety", "wallet"])
        assert "safety" not in weights
        assert "wallet" not in weights
        assert abs(sum(weights.values()) - 1.0) < 1e-9
        surviving_total = 0.20 + 0.15 + 0.15  # 0.50
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
        """Relative ratios between surviving agents are maintained."""
        agent = OrchestratorAgent()
        weights = agent._redistribute_weights(["scorer"])
        # safety:wallet should still be 0.25:0.25 = 1:1
        assert abs(weights["safety"] / weights["wallet"] - 1.0) < 1e-9
        # safety:social should still be 0.25:0.20 = 1.25:1
        assert abs(weights["safety"] / weights["social"] - 1.25) < 1e-9
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestRedistributeWeights -v`
Expected: FAIL with `AttributeError: 'OrchestratorAgent' object has no attribute '_redistribute_weights'`

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class in `src/agents/orchestrator.py`:

```python
    def _redistribute_weights(self, failed_agents: List[str]) -> Dict[str, float]:
        surviving = {
            name: weight
            for name, weight in self.AGENT_WEIGHTS.items()
            if name not in failed_agents
        }
        if not surviving:
            return {}
        total = sum(surviving.values())
        return {name: weight / total for name, weight in surviving.items()}
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestRedistributeWeights -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add proportional weight redistribution"
```

---

### Task 3: Verdict Logic Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestComputeUnifiedVerdict -v`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class:

```python
    CRITICAL_FLAGS = frozenset({
        "safety:honeypot_detected",
        "wallet:serial_rugger",
        "wallet:bundled_wallets",
    })

    def _compute_unified_verdict(self, score: int, red_flags: List[str]) -> str:
        if self.CRITICAL_FLAGS.intersection(red_flags):
            return "REJECT"
        if score >= self.STRONG_LIST_THRESHOLD:
            return "STRONG_LIST"
        if score >= self.LIST_THRESHOLD:
            return "LIST"
        if score >= self.REVIEW_THRESHOLD:
            return "REVIEW"
        return "REJECT"
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestComputeUnifiedVerdict -v`
Expected: 11 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add unified verdict with critical flag overrides"
```

---

### Task 4: Result Merging Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
def _make_agent_result(agent_name, score, red_flags=None, green_flags=None):
    """Helper to build a mock agent result dict."""
    score_keys = {
        "scorer": "total_score",
        "safety": "safety_score",
        "wallet": "wallet_score",
        "social": "social_score",
        "deploy": "deploy_score",
    }
    return {
        score_keys[agent_name]: score,
        "red_flags": red_flags or [],
        "green_flags": green_flags or [],
    }


def _make_token_data(**overrides):
    """Helper to build a token_data dict."""
    data = {
        "token_address": "0xtoken123",
        "deployer_address": "0xdep456",
        "chain": "solana",
        "project_name": "TestToken",
        "market_data": {"mcap": 1000000, "volume_24h": 500000, "liquidity": 250000},
    }
    data.update(overrides)
    return data


class TestMergeResults:
    def test_all_agents_succeed(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": _make_agent_result("safety", 70),
            "wallet": _make_agent_result("wallet", 60),
            "social": _make_agent_result("social", 50),
            "deploy": _make_agent_result("deploy", 90),
        }
        merged = agent._merge_results(results, _make_token_data())
        # 80*0.15 + 70*0.25 + 60*0.25 + 50*0.20 + 90*0.15 = 12+17.5+15+10+13.5 = 68
        assert merged["unified_score"] == 68
        assert merged["unified_verdict"] == "LIST"
        assert merged["failed_agents"] == []
        assert len(merged["agent_scores"]) == 5

    def test_with_one_failure(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": None,
            "wallet": _make_agent_result("wallet", 60),
            "social": _make_agent_result("social", 50),
            "deploy": _make_agent_result("deploy", 90),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert merged["failed_agents"] == ["safety"]
        assert "safety" not in merged["agent_scores"]
        assert abs(sum(merged["weights_used"].values()) - 1.0) < 1e-9
        # Redistributed weights: scorer=0.15/0.75, wallet=0.25/0.75, social=0.20/0.75, deploy=0.15/0.75
        # 80*(0.2) + 60*(0.333) + 50*(0.267) + 90*(0.2) = 16+20+13.33+18 = 67.33 -> 67
        assert merged["unified_score"] == 67

    def test_compiles_red_flags_namespaced(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 50),
            "safety": _make_agent_result("safety", 40, red_flags=["honeypot_detected"]),
            "wallet": _make_agent_result("wallet", 30, red_flags=["unlocked_lp", "whale_concentration"]),
            "social": _make_agent_result("social", 60),
            "deploy": _make_agent_result("deploy", 70),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "safety:honeypot_detected" in merged["red_flags"]
        assert "wallet:unlocked_lp" in merged["red_flags"]
        assert "wallet:whale_concentration" in merged["red_flags"]
        assert len(merged["red_flags"]) == 3

    def test_compiles_green_flags_namespaced(self):
        agent = OrchestratorAgent()
        results = {
            "scorer": _make_agent_result("scorer", 80),
            "safety": _make_agent_result("safety", 90, green_flags=["verified_source"]),
            "wallet": _make_agent_result("wallet", 85, green_flags=["lp_burned"]),
            "social": _make_agent_result("social", 70),
            "deploy": _make_agent_result("deploy", 75),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "safety:verified_source" in merged["green_flags"]
        assert "wallet:lp_burned" in merged["green_flags"]

    def test_score_clamped_0_100(self):
        """Score never goes below 0 or above 100."""
        agent = OrchestratorAgent()
        # All agents score 0
        results = {name: _make_agent_result(name, 0) for name in agent._agents}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 0

        # All agents score 100
        results = {name: _make_agent_result(name, 100) for name in agent._agents}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 100

    def test_all_agents_failed(self):
        agent = OrchestratorAgent()
        results = {name: None for name in agent._agents}
        merged = agent._merge_results(results, _make_token_data())
        assert merged["unified_score"] == 0
        assert merged["unified_verdict"] == "REJECT"
        assert len(merged["failed_agents"]) == 5

    def test_includes_agent_results(self):
        agent = OrchestratorAgent()
        scorer_result = _make_agent_result("scorer", 80)
        results = {
            "scorer": scorer_result,
            "safety": None,
            "wallet": _make_agent_result("wallet", 60),
            "social": None,
            "deploy": _make_agent_result("deploy", 70),
        }
        merged = agent._merge_results(results, _make_token_data())
        assert "scorer" in merged["agent_results"]
        assert "wallet" in merged["agent_results"]
        assert "deploy" in merged["agent_results"]
        assert "safety" not in merged["agent_results"]
        assert "social" not in merged["agent_results"]

    def test_includes_token_metadata(self):
        agent = OrchestratorAgent()
        results = {name: _make_agent_result(name, 50) for name in agent._agents}
        td = _make_token_data(token_address="0xabc", chain="ethereum", project_name="FooToken")
        merged = agent._merge_results(results, td)
        assert merged["token_address"] == "0xabc"
        assert merged["chain"] == "ethereum"
        assert merged["project_name"] == "FooToken"
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestMergeResults -v`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class:

```python
    SCORE_KEYS = {
        "scorer": "total_score",
        "safety": "safety_score",
        "wallet": "wallet_score",
        "social": "social_score",
        "deploy": "deploy_score",
    }

    def _merge_results(self, agent_results: Dict[str, Optional[Dict]], token_data: Dict) -> Dict:
        available = {}
        failed_agents = []
        for name, result in agent_results.items():
            if result is not None:
                key = self.SCORE_KEYS[name]
                available[name] = result.get(key, 0)
            else:
                failed_agents.append(name)

        weights = self._redistribute_weights(failed_agents)

        if available:
            unified_score = sum(available[name] * weights[name] for name in available)
            unified_score = max(0, min(100, round(unified_score)))
        else:
            unified_score = 0

        all_red_flags = []
        all_green_flags = []
        for name, result in agent_results.items():
            if result is not None:
                for flag in result.get("red_flags", []):
                    all_red_flags.append(f"{name}:{flag}")
                for flag in result.get("green_flags", []):
                    all_green_flags.append(f"{name}:{flag}")

        unified_verdict = self._compute_unified_verdict(unified_score, all_red_flags)

        return {
            "token_address": token_data.get("token_address", ""),
            "chain": token_data.get("chain", ""),
            "project_name": token_data.get("project_name", ""),
            "unified_score": unified_score,
            "unified_verdict": unified_verdict,
            "weights_used": weights,
            "agent_scores": available,
            "failed_agents": failed_agents,
            "red_flags": all_red_flags,
            "green_flags": all_green_flags,
            "agent_results": {
                name: result for name, result in agent_results.items()
                if result is not None
            },
        }
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestMergeResults -v`
Expected: 8 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add result merging with namespaced flags"
```

---

### Task 5: Parallel Execution Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
class TestRunAgentsParallel:
    @pytest.mark.asyncio
    async def test_all_succeed(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert len(results) == 5
        for name in agent._agents:
            assert results[name] is not None

    @pytest.mark.asyncio
    async def test_one_timeout(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        # Make safety hang
        async def hang(*args, **kwargs):
            await asyncio.sleep(999)
        agent._agents["safety"].run = hang
        agent.AGENT_TIMEOUT = 0.1  # speed up test

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["safety"] is None
        assert results["scorer"] is not None
        assert results["wallet"] is not None

    @pytest.mark.asyncio
    async def test_one_exception(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["wallet"].run = AsyncMock(side_effect=RuntimeError("API down"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["wallet"] is None
        assert results["scorer"] is not None
        assert results["safety"] is not None

    @pytest.mark.asyncio
    async def test_all_fail(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(side_effect=RuntimeError("fail"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        for name in agent._agents:
            assert results[name] is None

    @pytest.mark.asyncio
    async def test_multiple_failures(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 75))
        agent._agents["safety"].run = AsyncMock(side_effect=RuntimeError("fail"))
        agent._agents["social"].run = AsyncMock(side_effect=RuntimeError("fail"))
        agent._agents["deploy"].run = AsyncMock(side_effect=RuntimeError("fail"))

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        assert results["safety"] is None
        assert results["social"] is None
        assert results["deploy"] is None
        assert results["scorer"] is not None
        assert results["wallet"] is not None

    @pytest.mark.asyncio
    async def test_timeout_uses_constant(self):
        """Verify wait_for uses AGENT_TIMEOUT."""
        agent = OrchestratorAgent()
        agent.AGENT_TIMEOUT = 0.05
        async def slow(*args, **kwargs):
            await asyncio.sleep(1)
        for name, sub in agent._agents.items():
            sub.run = slow

        params = {name: {} for name in agent._agents}
        results = await agent._run_agents_parallel(params)
        for name in agent._agents:
            assert results[name] is None  # all timed out at 0.05s

    @pytest.mark.asyncio
    async def test_agents_run_concurrently(self):
        """5 agents sleeping 0.1s each should complete in ~0.1s, not 0.5s."""
        agent = OrchestratorAgent()
        async def slow_agent(params):
            await asyncio.sleep(0.1)
            return _make_agent_result("scorer", 50)
        for name, sub in agent._agents.items():
            sub.run = slow_agent

        params = {name: {} for name in agent._agents}
        import time
        start = time.monotonic()
        await agent._run_agents_parallel(params)
        elapsed = time.monotonic() - start
        assert elapsed < 0.3  # 5 sequential = 0.5s, parallel should be ~0.1s
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestRunAgentsParallel -v`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class:

```python
    async def _run_agents_parallel(self, agent_params: Dict[str, Dict]) -> Dict[str, Optional[Dict]]:
        async def _run_with_timeout(name: str, params: Dict):
            try:
                result = await asyncio.wait_for(
                    self._agents[name].run(params),
                    timeout=self.AGENT_TIMEOUT,
                )
                return (name, result)
            except asyncio.TimeoutError:
                self.log_event("error", f"{name} timed out after {self.AGENT_TIMEOUT}s")
                return (name, None)
            except Exception as e:
                self.log_event("error", f"{name} failed: {str(e)}")
                return (name, None)

        tasks = [_run_with_timeout(name, params) for name, params in agent_params.items()]
        results = await asyncio.gather(*tasks)
        return dict(results)
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestRunAgentsParallel -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add parallel agent execution with timeouts"
```

---

### Task 6: Build Agent Params & Evaluate Single Token Tests

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
class TestBuildAgentParams:
    def test_builds_all_five(self):
        agent = OrchestratorAgent()
        td = _make_token_data()
        params = agent._build_agent_params(td, "standard")
        assert set(params.keys()) == {"scorer", "safety", "wallet", "social", "deploy"}

    def test_scorer_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(token_address="0xabc", chain="solana", project_name="Foo")
        td["market_data"] = {"mcap": 100, "volume_24h": 200, "liquidity": 300}
        params = agent._build_agent_params(td, "standard")
        sp = params["scorer"]
        assert sp["token_data"]["contract_address"] == "0xabc"
        assert sp["token_data"]["chain"] == "solana"
        assert sp["token_data"]["name"] == "Foo"
        assert sp["token_data"]["liquidity"] == 300
        assert sp["token_data"]["volume_24h"] == 200

    def test_safety_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(token_address="0xabc", chain="ethereum")
        params = agent._build_agent_params(td, "standard")
        assert params["safety"] == {"contract_address": "0xabc", "chain": "ethereum"}

    def test_wallet_params_include_depth(self):
        agent = OrchestratorAgent()
        td = _make_token_data(deployer_address="0xdep")
        params = agent._build_agent_params(td, "deep")
        assert params["wallet"]["depth"] == "deep"
        assert params["wallet"]["deployer_address"] == "0xdep"

    def test_social_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(project_name="Bar", deployer_address="0xd")
        params = agent._build_agent_params(td, "quick")
        assert params["social"]["project_name"] == "Bar"
        assert params["social"]["deployer_address"] == "0xd"
        assert params["social"]["depth"] == "quick"

    def test_deploy_params(self):
        agent = OrchestratorAgent()
        td = _make_token_data(deployer_address="0xdep", chain="base")
        params = agent._build_agent_params(td, "standard")
        assert params["deploy"]["deployer_address"] == "0xdep"
        assert params["deploy"]["chain"] == "base"
        assert params["deploy"]["depth"] == "standard"


class TestEvaluateSingleToken:
    @pytest.mark.asyncio
    async def test_returns_merged_result(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 70))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="standard")
        assert "unified_score" in result
        assert "unified_verdict" in result
        assert result["token_address"] == td["token_address"]

    @pytest.mark.asyncio
    async def test_persists_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 50))
        td = _make_token_data(token_address="0xpersist")
        await agent._evaluate_single_token(td, depth="standard")
        saved = agent.read_scratchpad("eval_0xpersist")
        assert saved is not None
        assert saved["token_address"] == "0xpersist"
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestBuildAgentParams src/agents/tests/test_orchestrator.py::TestEvaluateSingleToken -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class:

```python
    def _build_agent_params(self, token_data: Dict, depth: str) -> Dict[str, Dict]:
        return {
            "scorer": {
                "token_data": {
                    "contract_address": token_data["token_address"],
                    "chain": token_data["chain"],
                    "name": token_data.get("project_name", ""),
                    "symbol": token_data.get("symbol", ""),
                    "liquidity": token_data.get("market_data", {}).get("liquidity", 0),
                    "volume_24h": token_data.get("market_data", {}).get("volume_24h", 0),
                },
            },
            "safety": {
                "contract_address": token_data["token_address"],
                "chain": token_data["chain"],
            },
            "wallet": {
                "deployer_address": token_data.get("deployer_address", ""),
                "token_address": token_data["token_address"],
                "chain": token_data["chain"],
                "depth": depth,
            },
            "social": {
                "project_name": token_data.get("project_name", ""),
                "token_address": token_data["token_address"],
                "chain": token_data["chain"],
                "deployer_address": token_data.get("deployer_address", ""),
                "depth": depth,
            },
            "deploy": {
                "deployer_address": token_data.get("deployer_address", ""),
                "chain": token_data["chain"],
                "depth": depth,
            },
        }

    async def _evaluate_single_token(self, token_data: Dict, depth: str = "quick") -> Dict:
        self.log_event("action", f"Evaluating {token_data.get('token_address', '?')} at depth={depth}")

        agent_params = self._build_agent_params(token_data, depth)
        agent_results = await self._run_agents_parallel(agent_params)
        merged = self._merge_results(agent_results, token_data)

        # Depth escalation (only from quick)
        if depth == "quick" and merged["unified_score"] >= self.DEEP_ESCALATION:
            self.log_event("decision", f"Escalating to deep (score={merged['unified_score']})")
            return await self._evaluate_single_token(token_data, depth="deep")
        elif depth == "quick" and merged["unified_score"] >= self.STANDARD_ESCALATION:
            self.log_event("decision", f"Escalating to standard (score={merged['unified_score']})")
            return await self._evaluate_single_token(token_data, depth="standard")

        addr = token_data.get("token_address", "unknown")
        self.write_scratchpad(f"eval_{addr}", merged)

        return merged
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestBuildAgentParams src/agents/tests/test_orchestrator.py::TestEvaluateSingleToken -v`
Expected: 8 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add _build_agent_params and _evaluate_single_token"
```

---

### Task 7: Depth Escalation Tests

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
class TestDepthEscalation:
    @pytest.mark.asyncio
    async def test_quick_stays_quick_below_50(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        # score = 30, below STANDARD_ESCALATION (50), no escalation
        assert result["unified_score"] == 30
        # Each agent.run called exactly once
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_quick_escalates_to_standard_above_50(self):
        agent = OrchestratorAgent()
        call_depths = []
        async def mock_run(params):
            depth = params.get("depth", "none")
            call_depths.append(depth)
            return _make_agent_result("scorer", 55)  # score 55 => triggers standard

        for name, sub in agent._agents.items():
            sub.run = mock_run

        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        # Should have been called twice: once at quick, once at standard
        # 5 agents * 2 rounds = 10 calls, but we check for "standard" in depths
        assert "standard" in call_depths

    @pytest.mark.asyncio
    async def test_quick_escalates_to_deep_above_70(self):
        agent = OrchestratorAgent()
        call_depths = []
        async def mock_run(params):
            depth = params.get("depth", "none")
            call_depths.append(depth)
            return _make_agent_result("scorer", 75)  # score 75 => triggers deep

        for name, sub in agent._agents.items():
            sub.run = mock_run

        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="quick")
        assert "deep" in call_depths

    @pytest.mark.asyncio
    async def test_standard_no_escalation(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 90))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="standard")
        # Even with score 90, standard should not escalate
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_deep_no_escalation(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 95))
        td = _make_token_data()
        result = await agent._evaluate_single_token(td, depth="deep")
        for sub in agent._agents.values():
            assert sub.run.call_count == 1

    @pytest.mark.asyncio
    async def test_escalation_passes_depth_to_agents(self):
        agent = OrchestratorAgent()
        captured_params = {}
        async def capture_run(params):
            name = "wallet"  # we'll capture wallet's depth
            if "depth" in params:
                captured_params[params["depth"]] = True
            return _make_agent_result("scorer", 55)

        for name, sub in agent._agents.items():
            sub.run = capture_run

        td = _make_token_data()
        await agent._evaluate_single_token(td, depth="quick")
        # wallet/social/deploy receive depth param, should see both "quick" and "standard"
        assert "quick" in captured_params
        assert "standard" in captured_params
```

**Step 2: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestDepthEscalation -v`
Expected: 6 PASSED (implementation already handles this from Task 6)

**Step 3: Commit**

```bash
git add src/agents/tests/test_orchestrator.py
git commit -m "test(orchestrator): add depth escalation tests"
```

---

### Task 8: Pipeline / execute() Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
class TestExecute:
    @pytest.mark.asyncio
    async def test_scan_mode(self):
        agent = OrchestratorAgent()
        # Mock scanner to return 2 tokens
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xtok1", "chain": "solana", "name": "Token1",
                 "mcap": 1000000, "volume_24h": 500000, "liquidity": 250000},
                {"contract_address": "0xtok2", "chain": "solana", "name": "Token2",
                 "mcap": 500000, "volume_24h": 200000, "liquidity": 100000},
            ],
            "total": 2,
            "source_counts": {"dexscreener": 2},
        })
        # Mock all Layer 2 agents
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        result = await agent.execute({"mode": "scan"})
        assert result["tokens_scanned"] == 2
        assert len(result["results"]) == 2
        assert "summary" in result
        agent._scanner.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_evaluate_mode(self):
        agent = OrchestratorAgent()
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 65))
        td = _make_token_data()
        result = await agent.execute({"mode": "evaluate", "token_data": td, "depth": "standard"})
        assert "unified_score" in result
        assert "unified_verdict" in result

    @pytest.mark.asyncio
    async def test_invalid_mode_raises(self):
        agent = OrchestratorAgent()
        with pytest.raises(ValueError, match="Unknown mode"):
            await agent.execute({"mode": "invalid"})

    @pytest.mark.asyncio
    async def test_scan_persists_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": "0xtok1", "chain": "solana", "name": "T1",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100},
            ],
            "total": 1,
            "source_counts": {},
        })
        for name, sub in agent._agents.items():
            sub.run = AsyncMock(return_value=_make_agent_result(name, 30))

        await agent.execute({"mode": "scan"})
        saved = agent.read_scratchpad("last_scan_results")
        assert saved is not None
        assert saved["tokens_scanned"] == 1

    @pytest.mark.asyncio
    async def test_scan_builds_summary(self):
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [
                {"contract_address": f"0xtok{i}", "chain": "solana", "name": f"T{i}",
                 "mcap": 100, "volume_24h": 100, "liquidity": 100}
                for i in range(3)
            ],
            "total": 3,
            "source_counts": {},
        })
        # First token scores 85 (STRONG_LIST), second 65 (LIST), third 30 (REJECT)
        scores = [85, 65, 30]
        call_count = {"n": 0}
        original_evaluate = agent._evaluate_single_token

        async def mock_evaluate(token_data, depth="quick"):
            idx = call_count["n"]
            call_count["n"] += 1
            for name, sub in agent._agents.items():
                sub.run = AsyncMock(return_value=_make_agent_result(name, scores[idx]))
            return await original_evaluate(token_data, depth="standard")  # skip escalation

        agent._evaluate_single_token = mock_evaluate
        result = await agent.execute({"mode": "scan"})
        s = result["summary"]
        assert s["strong_list"] == 1
        assert s["list"] == 1
        assert s["reject"] == 1

    @pytest.mark.asyncio
    async def test_default_mode_is_scan(self):
        agent = OrchestratorAgent()
        agent._scanner.run = AsyncMock(return_value={
            "tokens": [], "total": 0, "source_counts": {},
        })
        result = await agent.execute({})
        assert result["tokens_scanned"] == 0
        assert result["results"] == []
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestExecute -v`
Expected: FAIL with `NotImplementedError`

**Step 3: Write minimal implementation**

Replace the `execute` and add `_run_scan_pipeline` and `_build_summary` in `OrchestratorAgent`:

```python
    async def execute(self, params: Dict) -> Dict:
        mode = params.get("mode", "scan")
        if mode == "scan":
            return await self._run_scan_pipeline(params)
        elif mode == "evaluate":
            return await self._evaluate_single_token(
                params["token_data"],
                depth=params.get("depth", "quick"),
            )
        else:
            raise ValueError(f"Unknown mode: {mode}")

    async def _run_scan_pipeline(self, params: Dict) -> Dict:
        self.log_event("action", "Starting token scan")
        scan_result = await self._scanner.run(params)
        tokens = scan_result.get("tokens", [])
        self.log_event("observation", f"Scanner found {len(tokens)} tokens")

        results = []
        for token in tokens:
            token_data = {
                "token_address": token["contract_address"],
                "deployer_address": token.get("deployer_address", ""),
                "chain": token["chain"],
                "project_name": token.get("name", ""),
                "market_data": {
                    "mcap": token.get("mcap", 0),
                    "volume_24h": token.get("volume_24h", 0),
                    "liquidity": token.get("liquidity", 0),
                },
            }
            result = await self._evaluate_single_token(token_data, depth="quick")
            results.append(result)

        self.write_scratchpad("last_scan_results", {
            "tokens_scanned": len(tokens),
            "results": results,
        })

        summary = self._build_summary(results)
        self.log_event("observation", f"Scan complete: {summary}")

        return {
            "tokens_scanned": len(tokens),
            "results": results,
            "summary": summary,
        }

    def _build_summary(self, results: List[Dict]) -> Dict:
        summary = {"strong_list": 0, "list": 0, "review": 0, "reject": 0, "avg_score": 0}
        for r in results:
            v = r["unified_verdict"].lower()
            summary[v] = summary.get(v, 0) + 1
        if results:
            summary["avg_score"] = round(
                sum(r["unified_score"] for r in results) / len(results)
            )
        return summary
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestExecute -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add execute() with scan/evaluate modes and summary"
```

---

### Task 9: Telegram Formatting Tests & Implementation

**Files:**
- Modify: `src/agents/tests/test_orchestrator.py`
- Modify: `src/agents/orchestrator.py`

**Step 1: Write the failing tests**

Append to `src/agents/tests/test_orchestrator.py`:

```python
class TestTelegramFormatting:
    def test_format_scan_result(self):
        agent = OrchestratorAgent()
        scan_result = {
            "tokens_scanned": 5,
            "summary": {"strong_list": 1, "list": 2, "review": 1, "reject": 1, "avg_score": 62},
            "results": [
                {"project_name": "Alpha", "unified_score": 85, "unified_verdict": "STRONG_LIST",
                 "red_flags": [], "green_flags": ["safety:verified"]},
                {"project_name": "Beta", "unified_score": 65, "unified_verdict": "LIST",
                 "red_flags": ["wallet:unlocked_lp"], "green_flags": []},
                {"project_name": "Gamma", "unified_score": 45, "unified_verdict": "REVIEW",
                 "red_flags": [], "green_flags": []},
            ],
        }
        text = agent.format_scan_result(scan_result)
        assert "Scan Complete" in text
        assert "5" in text  # tokens scanned
        assert "Strong List: 1" in text
        assert "Alpha" in text
        assert "Beta" in text
        assert "Gamma" not in text  # REVIEW tokens not shown in top results

    def test_format_scan_result_empty(self):
        agent = OrchestratorAgent()
        scan_result = {
            "tokens_scanned": 0,
            "summary": {"strong_list": 0, "list": 0, "review": 0, "reject": 0, "avg_score": 0},
            "results": [],
        }
        text = agent.format_scan_result(scan_result)
        assert "Scan Complete" in text
        assert "0" in text

    def test_format_evaluate_strong_list(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "GoodToken",
            "unified_score": 85,
            "unified_verdict": "STRONG_LIST",
            "agent_scores": {"scorer": 90, "safety": 80, "wallet": 85, "social": 75, "deploy": 95},
            "weights_used": {"scorer": 0.15, "safety": 0.25, "wallet": 0.25, "social": 0.20, "deploy": 0.15},
            "failed_agents": [],
            "red_flags": [],
            "green_flags": ["safety:verified_source", "wallet:lp_burned"],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "GoodToken" in text
        assert "85" in text
        assert "STRONG_LIST" in text
        assert "scorer: 90" in text
        assert "lp_burned" in text
        assert "Failed" not in text

    def test_format_evaluate_reject(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "BadToken",
            "unified_score": 25,
            "unified_verdict": "REJECT",
            "agent_scores": {"scorer": 20, "safety": 10},
            "weights_used": {"scorer": 0.15, "safety": 0.25},
            "failed_agents": ["wallet", "social", "deploy"],
            "red_flags": ["safety:honeypot_detected", "scorer:suspicious_volume"],
            "green_flags": [],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "BadToken" in text
        assert "REJECT" in text
        assert "honeypot_detected" in text
        assert "Failed" in text
        assert "wallet" in text

    def test_format_evaluate_with_failures(self):
        agent = OrchestratorAgent()
        eval_result = {
            "project_name": "PartialToken",
            "unified_score": 60,
            "unified_verdict": "LIST",
            "agent_scores": {"scorer": 70, "safety": 65, "wallet": 55},
            "weights_used": {"scorer": 0.27, "safety": 0.45, "wallet": 0.27},
            "failed_agents": ["social", "deploy"],
            "red_flags": [],
            "green_flags": [],
        }
        text = agent.format_evaluate_result(eval_result)
        assert "Failed" in text
        assert "social" in text
        assert "deploy" in text
```

**Step 2: Run tests to verify they fail**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestTelegramFormatting -v`
Expected: FAIL with `AttributeError`

**Step 3: Write minimal implementation**

Add to `OrchestratorAgent` class:

```python
    def format_scan_result(self, scan_result: Dict) -> str:
        summary = scan_result.get("summary", {})
        results = scan_result.get("results", [])

        lines = [
            "🔍 *Scan Complete*",
            f"Tokens scanned: {scan_result.get('tokens_scanned', 0)}",
            f"Strong List: {summary.get('strong_list', 0)} | List: {summary.get('list', 0)}",
            f"Review: {summary.get('review', 0)} | Reject: {summary.get('reject', 0)}",
            "",
        ]

        top = [r for r in results if r["unified_verdict"] in ("STRONG_LIST", "LIST")]
        for r in top[:10]:
            emoji = "🟢" if r["unified_verdict"] == "STRONG_LIST" else "🟡"
            flags = f" ⚠️ {len(r['red_flags'])}" if r["red_flags"] else ""
            lines.append(
                f"{emoji} *{r['project_name']}* | "
                f"Score: {r['unified_score']} | "
                f"{r['unified_verdict']}{flags}"
            )

        return "\n".join(lines)

    def format_evaluate_result(self, eval_result: Dict) -> str:
        verdict_emoji = {
            "STRONG_LIST": "🟢",
            "LIST": "🟡",
            "REVIEW": "🟠",
            "REJECT": "🔴",
        }
        v = eval_result["unified_verdict"]

        lines = [
            f"{verdict_emoji.get(v, '⚪')} *{eval_result.get('project_name', 'Unknown')}*",
            f"Score: *{eval_result['unified_score']}*/100 → {v}",
            "",
            "*Agent Breakdown:*",
        ]

        for agent_name, score in eval_result.get("agent_scores", {}).items():
            weight = eval_result.get("weights_used", {}).get(agent_name, 0)
            lines.append(f"  {agent_name}: {score}/100 (w={weight:.0%})")

        if eval_result.get("failed_agents"):
            lines.append(f"\n⚠️ Failed: {', '.join(eval_result['failed_agents'])}")

        if eval_result.get("red_flags"):
            lines.append("\n🚩 *Red Flags:*")
            for flag in eval_result["red_flags"][:10]:
                lines.append(f"  • {flag}")

        if eval_result.get("green_flags"):
            lines.append("\n✅ *Green Flags:*")
            for flag in eval_result["green_flags"][:10]:
                lines.append(f"  • {flag}")

        return "\n".join(lines)
```

**Step 4: Run tests to verify they pass**

Run: `python -m pytest src/agents/tests/test_orchestrator.py::TestTelegramFormatting -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/orchestrator.py src/agents/tests/test_orchestrator.py
git commit -m "feat(orchestrator): add Telegram formatting for scan and evaluate results"
```

---

### Task 10: Run Full Test Suite & Final Verification

**Files:**
- No new files

**Step 1: Run the complete test file**

Run: `python -m pytest src/agents/tests/test_orchestrator.py -v --tb=short`
Expected: 47+ tests PASSED (4 + 6 + 11 + 8 + 7 + 6 + 2 + 6 + 6 + 1 + 5 = ~62 total including subtests)

**Step 2: Run all agent tests to verify no regressions**

Run: `python -m pytest src/agents/tests/ -v --tb=short`
Expected: All tests PASSED across all agent test files

**Step 3: Commit (final tag)**

```bash
git add -A
git commit -m "test(orchestrator): full test suite passing - 47+ tests"
```

---

## Test Count Summary

| Category | Tests |
|---|---|
| Constructor & Setup | 4 |
| Weight Redistribution | 6 |
| Verdict Logic | 11 |
| Result Merging | 8 |
| Parallel Execution | 7 |
| Build Params + Evaluate | 8 |
| Depth Escalation | 6 |
| Pipeline / execute() | 6 |
| Telegram Formatting | 5 |
| **Total** | **61** |
