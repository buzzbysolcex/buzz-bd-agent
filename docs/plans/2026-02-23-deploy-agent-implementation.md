# DeployAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Layer 2 deployer intelligence agent that analyzes deployer cross-chain reputation using Helius APIs (live) and Allium API (stubbed), returning a 0-100 deploy_score with risk assessment.

**Architecture:** Monolithic single-file agent (`src/agents/deploy_agent.py`) inheriting from `BaseAgent`. Three analysis methods (`_analyze_deployments`, `_analyze_portfolio`, `_analyze_cross_chain`) run via `asyncio.gather` with depth gating. Scoring uses weight redistribution so skipped methods don't penalize the score. Allium is fully stubbed with detailed SQL contracts for plug-and-play later.

**Tech Stack:** Python, asyncio, aiohttp, pytest, pytest-asyncio, aioresponses, monkeypatch

---

## Reference Files

- **Inherit from:** `src/agents/base_agent.py` -- `BaseAgent(ABC)` with `__init__(name)`, `execute(params)`, `log_event()`, `write_scratchpad()`, `read_scratchpad()`
- **Pattern reference:** `src/agents/wallet_agent.py` -- Helius API integration, Allium stub, depth gating, aiohttp usage, `_compute_verdict` weight redistribution
- **Pattern reference:** `src/agents/social_agent.py` -- Latest agent, clean pattern for constants, empty result, flag aggregation
- **Design spec:** `docs/plans/2026-02-23-deploy-agent-design.md`

## Constants Reference

```python
HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"
HELIUS_DAS_URL = "https://mainnet.helius-rpc.com"
ALLIUM_API_URL = "https://api.allium.so/api/v1/query"

VALID_DEPTHS = {"quick", "standard", "deep"}
DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=8),
    "deep": aiohttp.ClientTimeout(total=15),
}

MAX_DEPLOYMENT_HISTORY = 30
MAX_FINANCIAL_HEALTH = 20
MAX_CROSS_CHAIN = 30
MAX_REPUTATION = 20
```

---

### Task 1: Skeleton + Constructor (3 tests)

**Files:**
- Create: `src/agents/deploy_agent.py`
- Create: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
# src/agents/tests/test_deploy_agent.py
import pytest
from src.agents.deploy_agent import DeployAgent
from src.agents.base_agent import BaseAgent


class TestDeployAgentInit:
    def test_inherits_base_agent(self):
        agent = DeployAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_deploy(self):
        agent = DeployAgent()
        assert agent.name == "deploy"

    def test_empty_result_structure(self):
        agent = DeployAgent()
        result = agent._empty_result("0xabc", "solana", "standard")
        assert result["deployer_address"] == "0xabc"
        assert result["chain"] == "solana"
        assert result["depth"] == "standard"
        assert result["deploy_score"] == 0
        assert result["risk_level"] == "critical"
        assert result["cross_chain_reputation"] == "unknown"
        assert result["chains_active"] == []
        assert result["total_deployments"] == 0
        assert result["breakdown"]["cross_chain_activity"] == 0
        assert result["breakdown"]["deployment_history"] == 0
        assert result["breakdown"]["financial_health"] == 0
        assert result["breakdown"]["reputation"] == 0
        assert result["deployment_analysis"]["available"] is False
        assert result["portfolio_analysis"]["available"] is False
        assert result["cross_chain_analysis"]["available"] is False
        assert result["red_flags"] == []
        assert result["green_flags"] == []
        assert result["sources_used"] == []
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'src.agents.deploy_agent'`

**Step 3: Write minimal implementation**

```python
# src/agents/deploy_agent.py
import asyncio
import os
import time
import aiohttp
from typing import Dict
from src.agents.base_agent import BaseAgent

HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"
HELIUS_DAS_URL = "https://mainnet.helius-rpc.com"
ALLIUM_API_URL = "https://api.allium.so/api/v1/query"

VALID_DEPTHS = {"quick", "standard", "deep"}

DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=8),
    "deep": aiohttp.ClientTimeout(total=15),
}

MAX_DEPLOYMENT_HISTORY = 30
MAX_FINANCIAL_HEALTH = 20
MAX_CROSS_CHAIN = 30
MAX_REPUTATION = 20


class DeployAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="deploy")

    def _empty_result(self, deployer: str = "", chain: str = "", depth: str = "standard") -> Dict:
        return {
            "deployer_address": deployer,
            "chain": chain,
            "depth": depth,
            "deploy_score": 0,
            "risk_level": "critical",
            "cross_chain_reputation": "unknown",
            "chains_active": [],
            "total_deployments": 0,
            "breakdown": {
                "cross_chain_activity": 0,
                "deployment_history": 0,
                "financial_health": 0,
                "reputation": 0,
            },
            "deployment_analysis": {
                "total_deployments": 0,
                "deployment_frequency": "first_time",
                "wallet_age_days": 0,
                "oldest_tx_timestamp": None,
                "available": False,
            },
            "portfolio_analysis": {
                "total_tokens_held": 0,
                "estimated_value_usd": 0.0,
                "has_significant_holdings": False,
                "available": False,
            },
            "cross_chain_analysis": {
                "chains_detected": [],
                "total_cross_chain_txns": 0,
                "cross_chain_pnl_usd": 0.0,
                "available": False,
            },
            "red_flags": [],
            "green_flags": [],
            "sources_used": [],
        }

    async def execute(self, params: Dict) -> Dict:
        return self._empty_result()
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 3 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add DeployAgent skeleton with constructor and empty result"
```

---

### Task 2: Input Validation (4 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py`
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
class TestInputValidation:
    @pytest.mark.asyncio
    async def test_missing_deployer_address(self):
        agent = DeployAgent()
        result = await agent.execute({"chain": "solana"})
        assert result["deploy_score"] == 0
        assert result["risk_level"] == "critical"

    @pytest.mark.asyncio
    async def test_missing_chain(self):
        agent = DeployAgent()
        result = await agent.execute({"deployer_address": "0xabc"})
        assert result["deploy_score"] == 0
        assert result["risk_level"] == "critical"

    @pytest.mark.asyncio
    async def test_invalid_depth_defaults_to_standard(self):
        agent = DeployAgent()
        result = await agent.execute({"deployer_address": "0xabc", "chain": "solana", "depth": "ultra"})
        assert result["depth"] == "standard"

    @pytest.mark.asyncio
    async def test_empty_params(self):
        agent = DeployAgent()
        result = await agent.execute({})
        assert result["deploy_score"] == 0
        assert result["deployer_address"] == ""
        assert result["chain"] == ""
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestInputValidation -v`
Expected: FAIL (execute returns empty without validation)

**Step 3: Update execute() with validation**

Replace the `execute` method:

```python
async def execute(self, params: Dict) -> Dict:
    deployer = params.get("deployer_address", "")
    chain = params.get("chain", "")
    depth = params.get("depth", "standard")

    if depth not in VALID_DEPTHS:
        depth = "standard"

    if not deployer or not chain:
        self.log_event("error", "Missing deployer_address or chain")
        return self._empty_result(deployer, chain, depth)

    try:
        self.log_event("action", f"Starting deploy analysis for {deployer} on {chain}", {"depth": depth})
        # Analysis methods will be added in subsequent tasks
        return self._empty_result(deployer, chain, depth)
    except Exception as e:
        self.log_event("error", f"Deploy analysis failed unexpectedly: {e}")
        empty = self._empty_result(deployer, chain, depth)
        empty["red_flags"].append("all_sources_failed")
        return empty
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 7 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add input validation for DeployAgent"
```

---

### Task 3: _analyze_deployments (7 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py`
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

Add these test fixtures at the top of the test file (after imports):

```python
from aioresponses import aioresponses

HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"

# 12 txns, oldest 400 days ago — prolific deployer with old wallet
def _make_helius_txns(count=12, oldest_age_days=400, types=None):
    import time
    now = int(time.time())
    txns = []
    for i in range(count):
        ts = now - (oldest_age_days * 86400) + (i * 3600)
        tx_type = "CREATE" if types is None else types[i % len(types)]
        txns.append({
            "timestamp": ts,
            "type": tx_type,
            "feePayer": "0xdep123",
            "tokenTransfers": [{"mint": f"token{i}"}] if tx_type == "CREATE" else [],
        })
    return txns
```

```python
class TestAnalyzeDeployments:
    @pytest.mark.asyncio
    async def test_prolific_deployer_high_score(self, monkeypatch):
        """10+ deployments, 365+ day old wallet, prolific frequency → high score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=12, oldest_age_days=400)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is True
        assert result["score"] >= 20  # 10 (deploys) + 10 (age) + 5 (prolific) = 25
        assert result["total_deployments"] >= 10
        assert result["wallet_age_days"] >= 365
        assert result["deployment_frequency"] == "prolific"

    @pytest.mark.asyncio
    async def test_moderate_deployer(self, monkeypatch):
        """5-9 deployments, 180+ day wallet → moderate score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=7, oldest_age_days=200)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is True
        assert result["score"] >= 14  # 7 (deploys) + 7 (age)
        assert result["deployment_frequency"] == "moderate"

    @pytest.mark.asyncio
    async def test_first_time_deployer(self, monkeypatch):
        """Single deployment, fresh wallet → low score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=1, oldest_age_days=5)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is True
        assert result["total_deployments"] == 1
        assert result["deployment_frequency"] == "first_time"
        assert result["score"] <= 5

    @pytest.mark.asyncio
    async def test_no_api_key_returns_unavailable(self, monkeypatch):
        """Missing HELIUS_API_KEY → available: False."""
        monkeypatch.delenv("HELIUS_API_KEY", raising=False)
        agent = DeployAgent()
        result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False
        assert result["score"] == 0

    @pytest.mark.asyncio
    async def test_api_error_returns_unavailable(self, monkeypatch):
        """Helius returns 500 → available: False."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", status=500)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_empty_txns_returns_unavailable(self, monkeypatch):
        """Helius returns empty array → available: False."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=[])
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_occasional_deployer(self, monkeypatch):
        """2-4 deployments → occasional frequency."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=3, oldest_age_days=50)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is True
        assert result["deployment_frequency"] == "occasional"
        assert result["score"] >= 7  # 4 (deploys) + 4 (age 30+) + 3 (occasional) = 11
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestAnalyzeDeployments -v`
Expected: FAIL with `AttributeError: 'DeployAgent' object has no attribute '_analyze_deployments'`

**Step 3: Write _analyze_deployments implementation**

Add to `DeployAgent` class:

```python
async def _analyze_deployments(self, deployer: str, chain: str, depth: str) -> Dict:
    """Analyze deployment history via Helius enhanced transactions."""
    empty = {
        "available": False, "score": 0,
        "total_deployments": 0, "deployment_frequency": "first_time",
        "wallet_age_days": 0, "oldest_tx_timestamp": None,
        "red_flags": [], "green_flags": [],
    }

    api_key = os.environ.get("HELIUS_API_KEY", "")
    if not api_key:
        self.log_event("error", "HELIUS_API_KEY not set, skipping deployment analysis")
        return empty

    self.log_event("action", "Analyzing deployments via Helius", {"deployer": deployer})
    timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
    try:
        url = HELIUS_TXN_URL.format(address=deployer)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(f"{url}?api-key={api_key}&limit=100") as resp:
                if resp.status != 200:
                    raise aiohttp.ClientError(f"Helius txns returned {resp.status}")
                txns = await resp.json()

        if not txns:
            return empty

        timestamps = [tx.get("timestamp", 0) for tx in txns if tx.get("timestamp")]
        if not timestamps:
            return empty

        oldest_ts = min(timestamps)
        now = int(time.time())
        wallet_age_days = (now - oldest_ts) // 86400

        total_deployments = len(txns)

        if total_deployments >= 10:
            deployment_frequency = "prolific"
        elif total_deployments >= 5:
            deployment_frequency = "moderate"
        elif total_deployments >= 2:
            deployment_frequency = "occasional"
        else:
            deployment_frequency = "first_time"

        # Deployment History scoring (0-30 pts)
        score = 0
        red_flags = []
        green_flags = []

        if total_deployments >= 10:
            score += 10
        elif total_deployments >= 5:
            score += 7
        elif total_deployments >= 2:
            score += 4

        if wallet_age_days >= 365:
            score += 10
        elif wallet_age_days >= 180:
            score += 7
        elif wallet_age_days >= 30:
            score += 4

        if deployment_frequency in ("prolific", "moderate"):
            score += 5
        elif deployment_frequency == "occasional":
            score += 3

        score = min(MAX_DEPLOYMENT_HISTORY, score)

        self.log_event("observation", f"Deployments: count={total_deployments}, age={wallet_age_days}d, freq={deployment_frequency}, score={score}/30")
        return {
            "available": True, "score": score,
            "total_deployments": total_deployments,
            "deployment_frequency": deployment_frequency,
            "wallet_age_days": wallet_age_days,
            "oldest_tx_timestamp": str(oldest_ts),
            "red_flags": red_flags, "green_flags": green_flags,
        }
    except Exception as e:
        self.log_event("error", f"Deployment analysis failed: {e}")
        return empty
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 10 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add _analyze_deployments with Helius enhanced transactions"
```

---

### Task 4: _analyze_portfolio (6 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py`
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

Add a DAS fixture helper at the top of the test file:

```python
HELIUS_DAS_URL = "https://mainnet.helius-rpc.com"

def _make_das_response(token_count=15, total_value=5000.0):
    """Build a Helius DAS getAssetsByOwner response."""
    items = []
    value_per_token = total_value / token_count if token_count > 0 else 0
    for i in range(token_count):
        items.append({
            "id": f"token{i}",
            "content": {"metadata": {"name": f"Token{i}"}},
            "token_info": {"price_info": {"total_price": value_per_token}},
        })
    return {
        "jsonrpc": "2.0",
        "id": 1,
        "result": {"items": items, "total": token_count},
    }
```

```python
class TestAnalyzePortfolio:
    @pytest.mark.asyncio
    async def test_skip_on_quick_depth(self, monkeypatch):
        """Portfolio analysis skipped in quick mode."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        result = await agent._analyze_portfolio("0xdep123", "standard")
        # quick returns unavailable — but this test sends "standard" which should NOT skip
        # Let's test quick:
        result = await agent._analyze_portfolio("0xdep123", "quick")
        assert result["available"] is False
        assert result["score"] == 0

    @pytest.mark.asyncio
    async def test_wealthy_deployer_high_score(self, monkeypatch):
        """15 tokens, $5000 value → high financial health score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        das_resp = _make_das_response(token_count=15, total_value=5000.0)
        with aioresponses() as mocked:
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent._analyze_portfolio("0xdep123", "standard")
        assert result["available"] is True
        assert result["total_tokens_held"] == 15
        assert result["estimated_value_usd"] == pytest.approx(5000.0, rel=0.01)
        assert result["has_significant_holdings"] is True
        assert result["score"] >= 13  # 5 (tokens>=10) + 5 (value>=1000) + 7 (significant) = 17

    @pytest.mark.asyncio
    async def test_modest_portfolio(self, monkeypatch):
        """5 tokens, $500 value → moderate score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        das_resp = _make_das_response(token_count=5, total_value=500.0)
        with aioresponses() as mocked:
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent._analyze_portfolio("0xdep123", "standard")
        assert result["available"] is True
        assert result["total_tokens_held"] == 5
        assert result["has_significant_holdings"] is False
        assert result["score"] >= 6  # 3 (tokens>=3) + 3 (value>=100) = 6

    @pytest.mark.asyncio
    async def test_no_api_key(self, monkeypatch):
        """Missing HELIUS_API_KEY → unavailable."""
        monkeypatch.delenv("HELIUS_API_KEY", raising=False)
        agent = DeployAgent()
        result = await agent._analyze_portfolio("0xdep123", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_api_error(self, monkeypatch):
        """DAS API returns 500 → unavailable."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        with aioresponses() as mocked:
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", status=500)
            result = await agent._analyze_portfolio("0xdep123", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_empty_portfolio(self, monkeypatch):
        """No tokens held → empty portfolio, low score."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        das_resp = _make_das_response(token_count=0, total_value=0.0)
        with aioresponses() as mocked:
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent._analyze_portfolio("0xdep123", "standard")
        assert result["available"] is True
        assert result["total_tokens_held"] == 0
        assert result["estimated_value_usd"] == 0.0
        assert result["score"] == 0
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestAnalyzePortfolio -v`
Expected: FAIL with `AttributeError: 'DeployAgent' object has no attribute '_analyze_portfolio'`

**Step 3: Write _analyze_portfolio implementation**

Add to `DeployAgent` class:

```python
async def _analyze_portfolio(self, deployer: str, depth: str) -> Dict:
    """Analyze deployer portfolio via Helius DAS (getAssetsByOwner)."""
    empty = {
        "available": False, "score": 0,
        "total_tokens_held": 0, "estimated_value_usd": 0.0,
        "has_significant_holdings": False,
        "red_flags": [], "green_flags": [],
    }

    if depth == "quick":
        return empty

    api_key = os.environ.get("HELIUS_API_KEY", "")
    if not api_key:
        self.log_event("error", "HELIUS_API_KEY not set, skipping portfolio analysis")
        return empty

    self.log_event("action", "Analyzing portfolio via Helius DAS", {"deployer": deployer})
    timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
    try:
        payload = {
            "jsonrpc": "2.0", "id": 1,
            "method": "getAssetsByOwner",
            "params": {"ownerAddress": deployer, "page": 1, "limit": 100},
        }
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                f"{HELIUS_DAS_URL}/?api-key={api_key}",
                json=payload,
            ) as resp:
                if resp.status != 200:
                    raise aiohttp.ClientError(f"Helius DAS returned {resp.status}")
                data = await resp.json()

        items = data.get("result", {}).get("items", [])
        total_tokens_held = len(items)

        estimated_value_usd = 0.0
        for item in items:
            price = item.get("token_info", {}).get("price_info", {}).get("total_price", 0)
            estimated_value_usd += float(price or 0)

        has_significant_holdings = estimated_value_usd >= 1000

        # Financial Health scoring (0-20 pts)
        score = 0
        red_flags = []
        green_flags = []

        if total_tokens_held >= 10:
            score += 5
        elif total_tokens_held >= 3:
            score += 3

        if estimated_value_usd >= 10000:
            score += 8
        elif estimated_value_usd >= 1000:
            score += 5
        elif estimated_value_usd >= 100:
            score += 3

        if has_significant_holdings:
            score += 7

        score = min(MAX_FINANCIAL_HEALTH, score)

        self.log_event("observation", f"Portfolio: {total_tokens_held} tokens, ${estimated_value_usd:,.0f}, score={score}/20")
        return {
            "available": True, "score": score,
            "total_tokens_held": total_tokens_held,
            "estimated_value_usd": round(estimated_value_usd, 2),
            "has_significant_holdings": has_significant_holdings,
            "red_flags": red_flags, "green_flags": green_flags,
        }
    except Exception as e:
        self.log_event("error", f"Portfolio analysis failed: {e}")
        return empty
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 16 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add _analyze_portfolio with Helius DAS API"
```

---

### Task 5: _analyze_cross_chain Stub (4 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py`
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
class TestAnalyzeCrossChain:
    @pytest.mark.asyncio
    async def test_stub_returns_unavailable(self):
        """Cross-chain stub always returns available: False."""
        agent = DeployAgent()
        result = await agent._analyze_cross_chain("0xdep123", "solana", "deep")
        assert result["available"] is False
        assert result["score"] == 0

    @pytest.mark.asyncio
    async def test_stub_has_correct_structure(self):
        """Stub result has all required fields."""
        agent = DeployAgent()
        result = await agent._analyze_cross_chain("0xdep123", "solana", "deep")
        assert "chains_detected" in result
        assert "total_cross_chain_txns" in result
        assert "cross_chain_pnl_usd" in result
        assert result["chains_detected"] == []
        assert result["total_cross_chain_txns"] == 0
        assert result["cross_chain_pnl_usd"] == 0.0

    @pytest.mark.asyncio
    async def test_stub_skip_on_non_deep(self):
        """Cross-chain stub skips entirely on quick/standard depth."""
        agent = DeployAgent()
        for depth in ("quick", "standard"):
            result = await agent._analyze_cross_chain("0xdep123", "solana", depth)
            assert result["available"] is False

    @pytest.mark.asyncio
    async def test_stub_logs_event(self):
        """Stub logs an action event about Allium not being implemented."""
        agent = DeployAgent()
        await agent._analyze_cross_chain("0xdep123", "solana", "deep")
        action_events = [e for e in agent.events if e["type"] == "action"]
        assert any("Allium" in e["description"] or "stub" in e["description"].lower() for e in action_events)
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestAnalyzeCrossChain -v`
Expected: FAIL with `AttributeError`

**Step 3: Write _analyze_cross_chain stub**

Add to `DeployAgent` class:

```python
async def _analyze_cross_chain(self, deployer: str, chain: str, depth: str) -> Dict:
    """Analyze cross-chain activity via Allium API — STUBBED.

    When implemented, this will use Allium's async query+poll pattern:
    1. POST https://api.allium.so/api/v1/query with SQL + deployer param
    2. Get run_id from response
    3. Poll GET /api/v1/query/{run_id}/results until complete

    Planned SQL queries:

    Query 1 — Cross-chain activity:
        SELECT chain, COUNT(*) as tx_count, SUM(value_usd) as total_value
        FROM crosschain.transactions
        WHERE from_address = :deployer
        GROUP BY chain
        ORDER BY tx_count DESC

    Query 2 — Deployer PnL:
        SELECT SUM(CASE WHEN direction='in' THEN value_usd ELSE -value_usd END) as pnl_usd
        FROM crosschain.token_transfers
        WHERE address = :deployer
        AND block_timestamp > NOW() - INTERVAL '1 year'

    Auth: Authorization: Bearer {ALLIUM_API_KEY}
    """
    empty = {
        "available": False, "score": 0,
        "chains_detected": [], "total_cross_chain_txns": 0,
        "cross_chain_pnl_usd": 0.0,
        "red_flags": [], "green_flags": [],
    }

    if depth != "deep":
        return empty

    self.log_event("action", "Allium cross-chain API not yet implemented (stub)")
    return empty
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 20 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add _analyze_cross_chain Allium stub with SQL contracts"
```

---

### Task 6: _compute_verdict (5 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py`
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

Add helper functions at top of test file:

```python
def _make_deployment_result(score=0, available=True, total_deployments=5,
                            deployment_frequency="moderate", wallet_age_days=200,
                            **kwargs):
    return {
        "available": available, "score": score,
        "total_deployments": total_deployments,
        "deployment_frequency": deployment_frequency,
        "wallet_age_days": wallet_age_days,
        "oldest_tx_timestamp": "1000000",
        "red_flags": kwargs.get("red_flags", []),
        "green_flags": kwargs.get("green_flags", []),
    }

def _make_portfolio_result(score=0, available=True, total_tokens_held=5,
                           estimated_value_usd=500.0, has_significant_holdings=False,
                           **kwargs):
    return {
        "available": available, "score": score,
        "total_tokens_held": total_tokens_held,
        "estimated_value_usd": estimated_value_usd,
        "has_significant_holdings": has_significant_holdings,
        "red_flags": kwargs.get("red_flags", []),
        "green_flags": kwargs.get("green_flags", []),
    }

def _make_cross_chain_result(score=0, available=False, **kwargs):
    return {
        "available": available, "score": score,
        "chains_detected": kwargs.get("chains_detected", []),
        "total_cross_chain_txns": kwargs.get("total_cross_chain_txns", 0),
        "cross_chain_pnl_usd": kwargs.get("cross_chain_pnl_usd", 0.0),
        "red_flags": kwargs.get("red_flags", []),
        "green_flags": kwargs.get("green_flags", []),
    }
```

```python
class TestComputeVerdict:
    def test_high_score_low_risk(self):
        """High raw scores → deploy_score >=80, risk_level=low, reputation=established."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=25, wallet_age_days=400, total_deployments=12)
        portfolio_r = _make_portfolio_result(score=17, has_significant_holdings=True, estimated_value_usd=5000)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert result["deploy_score"] >= 80
        assert result["risk_level"] == "low"
        assert result["cross_chain_reputation"] == "established"

    def test_medium_score(self):
        """Moderate scores → 60-79, risk_level=medium, reputation=moderate."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=15)
        portfolio_r = _make_portfolio_result(score=8)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        # 23/50 available → round(23/50*100) = 46 — that's high risk
        # Let's pick values that land in 60-79: need raw/available ~ 0.6-0.79
        # 30 + 20 avail = 50. Need raw 30-39 → score 60-78
        deploy_r = _make_deployment_result(score=22)
        portfolio_r = _make_portfolio_result(score=12)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        # 34/50 = 68
        assert 60 <= result["deploy_score"] <= 79
        assert result["risk_level"] == "medium"
        assert result["cross_chain_reputation"] == "moderate"

    def test_all_sources_failed(self):
        """No available sources → score 0, critical, unknown, all_sources_failed flag."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(available=False, score=0)
        portfolio_r = _make_portfolio_result(available=False, score=0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert result["deploy_score"] == 0
        assert result["risk_level"] == "critical"
        assert result["cross_chain_reputation"] == "unknown"
        assert "all_sources_failed" in result["red_flags"]

    def test_weight_redistribution(self):
        """Score normalizes to 0-100 regardless of which methods ran."""
        agent = DeployAgent()
        # Only deployments available (30 max): score 25/30 → 83%
        deploy_r = _make_deployment_result(score=25)
        portfolio_r = _make_portfolio_result(available=False, score=0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "quick",
                                        deploy_r, portfolio_r, cross_r)
        assert result["deploy_score"] == 83  # round(25/30 * 100)

    def test_sources_used_populated(self):
        """sources_used reflects which APIs returned data."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=20)
        portfolio_r = _make_portfolio_result(score=10)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert "helius" in result["sources_used"]
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestComputeVerdict -v`
Expected: FAIL with `AttributeError`

**Step 3: Write _compute_verdict implementation**

Add to `DeployAgent` class:

```python
def _compute_verdict(self, deployer: str, chain: str, depth: str,
                     deploy_r: Dict, portfolio_r: Dict, cross_chain_r: Dict) -> Dict:
    analyses = [
        (deploy_r, MAX_DEPLOYMENT_HISTORY),
        (portfolio_r, MAX_FINANCIAL_HEALTH),
        (cross_chain_r, MAX_CROSS_CHAIN),
    ]

    raw_score = 0
    available_points = 0
    for result, max_pts in analyses:
        if result.get("available", False):
            raw_score += result.get("score", 0)
            available_points += max_pts

    # Reputation scoring (0-20 pts) — derived from deployment + portfolio data
    reputation_score = 0
    deploy_available = deploy_r.get("available", False)
    portfolio_available = portfolio_r.get("available", False)

    if deploy_available:
        wallet_age = deploy_r.get("wallet_age_days", 0)
        total_deps = deploy_r.get("total_deployments", 0)
        if wallet_age >= 365 and total_deps >= 5:
            reputation_score += 10
        elif wallet_age >= 180 and total_deps >= 2:
            reputation_score += 6

        # No failed/rugged tokens — assume clean (no rug detection yet)
        reputation_score += 5

    if portfolio_available and portfolio_r.get("has_significant_holdings", False):
        reputation_score += 5

    reputation_score = min(MAX_REPUTATION, reputation_score)

    if deploy_available or portfolio_available:
        raw_score += reputation_score
        available_points += MAX_REPUTATION

    if available_points > 0:
        deploy_score = round((raw_score / available_points) * 100)
    else:
        deploy_score = 0
    deploy_score = max(0, min(100, deploy_score))

    # Verdict mapping
    if deploy_score >= 80:
        risk_level = "low"
        cross_chain_reputation = "established"
    elif deploy_score >= 60:
        risk_level = "medium"
        cross_chain_reputation = "moderate"
    elif deploy_score >= 30:
        risk_level = "high"
        cross_chain_reputation = "new"
    else:
        risk_level = "critical"
        cross_chain_reputation = "unknown"

    # Aggregate flags
    red_flags = []
    green_flags = []
    for result, _ in analyses:
        red_flags.extend(result.get("red_flags", []))
        green_flags.extend(result.get("green_flags", []))

    if available_points == 0:
        red_flags.append("all_sources_failed")

    # Detect red/green flags from data
    if deploy_available:
        wallet_age = deploy_r.get("wallet_age_days", 0)
        total_deps = deploy_r.get("total_deployments", 0)
        dep_freq = deploy_r.get("deployment_frequency", "first_time")

        if wallet_age < 7:
            red_flags.append("fresh_wallet")
        if total_deps == 1 and wallet_age < 30:
            red_flags.append("first_time_deployer")
        if total_deps >= 10:
            green_flags.append("prolific_deployer")
        if wallet_age >= 365 and total_deps >= 5:
            green_flags.append("established_history")

    if portfolio_available:
        tokens_held = portfolio_r.get("total_tokens_held", 0)
        value_usd = portfolio_r.get("estimated_value_usd", 0.0)
        has_significant = portfolio_r.get("has_significant_holdings", False)

        if tokens_held == 0 and value_usd == 0:
            red_flags.append("empty_wallet")
        if value_usd >= 1000:
            green_flags.append("positive_pnl")
        if deploy_available and deploy_r.get("total_deployments", 0) >= 3 and value_usd < 10:
            red_flags.append("negative_pnl")
        if tokens_held >= 10:
            green_flags.append("diversified_portfolio")

    if cross_chain_r.get("available", False):
        chains = cross_chain_r.get("chains_detected", [])
        if len(chains) >= 3:
            green_flags.append("multi_chain_active")
        if len(chains) == 1:
            red_flags.append("single_chain_deployer")

    # Chains active
    chains_active = [chain]
    if cross_chain_r.get("available", False):
        chains_active = cross_chain_r.get("chains_detected", [chain])
        if chain not in chains_active:
            chains_active.append(chain)

    total_deployments = deploy_r.get("total_deployments", 0)

    # Sources used
    sources_used = []
    if deploy_available or portfolio_available:
        sources_used.append("helius")
    if cross_chain_r.get("available", False):
        sources_used.append("allium")

    breakdown = {
        "cross_chain_activity": cross_chain_r.get("score", 0),
        "deployment_history": deploy_r.get("score", 0),
        "financial_health": portfolio_r.get("score", 0),
        "reputation": reputation_score,
    }

    return {
        "deployer_address": deployer,
        "chain": chain,
        "depth": depth,
        "deploy_score": deploy_score,
        "risk_level": risk_level,
        "cross_chain_reputation": cross_chain_reputation,
        "chains_active": chains_active,
        "total_deployments": total_deployments,
        "breakdown": breakdown,
        "deployment_analysis": {
            "total_deployments": total_deployments,
            "deployment_frequency": deploy_r.get("deployment_frequency", "first_time"),
            "wallet_age_days": deploy_r.get("wallet_age_days", 0),
            "oldest_tx_timestamp": deploy_r.get("oldest_tx_timestamp"),
            "available": deploy_available,
        },
        "portfolio_analysis": {
            "total_tokens_held": portfolio_r.get("total_tokens_held", 0),
            "estimated_value_usd": portfolio_r.get("estimated_value_usd", 0.0),
            "has_significant_holdings": portfolio_r.get("has_significant_holdings", False),
            "available": portfolio_available,
        },
        "cross_chain_analysis": {
            "chains_detected": cross_chain_r.get("chains_detected", []),
            "total_cross_chain_txns": cross_chain_r.get("total_cross_chain_txns", 0),
            "cross_chain_pnl_usd": cross_chain_r.get("cross_chain_pnl_usd", 0.0),
            "available": cross_chain_r.get("available", False),
        },
        "red_flags": red_flags,
        "green_flags": green_flags,
        "sources_used": sources_used,
    }
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 25 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: add _compute_verdict with weight redistribution and flag detection"
```

---

### Task 7: Red/Green Flag Detection (4 tests)

**Files:**
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
class TestFlagDetection:
    def test_fresh_wallet_red_flag(self):
        """wallet_age_days < 7 triggers fresh_wallet."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=5, wallet_age_days=3, total_deployments=1)
        portfolio_r = _make_portfolio_result(available=False, score=0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "quick",
                                        deploy_r, portfolio_r, cross_r)
        assert "fresh_wallet" in result["red_flags"]
        assert "first_time_deployer" in result["red_flags"]

    def test_empty_wallet_red_flag(self):
        """0 tokens and $0 value triggers empty_wallet."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=10)
        portfolio_r = _make_portfolio_result(score=0, total_tokens_held=0, estimated_value_usd=0.0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert "empty_wallet" in result["red_flags"]

    def test_established_green_flags(self):
        """Old wallet + many deploys + rich portfolio → multiple green flags."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=25, wallet_age_days=400, total_deployments=12)
        portfolio_r = _make_portfolio_result(score=17, total_tokens_held=15,
                                            estimated_value_usd=5000.0,
                                            has_significant_holdings=True)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert "prolific_deployer" in result["green_flags"]
        assert "established_history" in result["green_flags"]
        assert "positive_pnl" in result["green_flags"]
        assert "diversified_portfolio" in result["green_flags"]

    def test_negative_pnl_red_flag(self):
        """3+ deployments but portfolio < $10 → negative_pnl."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=10, total_deployments=5)
        portfolio_r = _make_portfolio_result(score=0, total_tokens_held=1,
                                            estimated_value_usd=5.0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert "negative_pnl" in result["red_flags"]
```

**Step 2: Run tests to verify they pass (flags already implemented in Task 6)**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestFlagDetection -v`
Expected: 4 passed (flag logic was implemented in `_compute_verdict`)

**Step 3: Commit**

```bash
git add src/agents/tests/test_deploy_agent.py
git commit -m "test: add red/green flag detection tests for DeployAgent"
```

---

### Task 8: Depth Gating (5 tests)

**Files:**
- Modify: `src/agents/deploy_agent.py` (wire up execute with asyncio.gather)
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
class TestDepthGating:
    @pytest.mark.asyncio
    async def test_quick_only_runs_deployments(self, monkeypatch):
        """Quick depth: only _analyze_deployments runs."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent.execute({"deployer_address": "0xdep123", "chain": "solana", "depth": "quick"})
        assert result["deployment_analysis"]["available"] is True
        assert result["portfolio_analysis"]["available"] is False
        assert result["cross_chain_analysis"]["available"] is False

    @pytest.mark.asyncio
    async def test_standard_runs_deployments_and_portfolio(self, monkeypatch):
        """Standard depth: deployments + portfolio run."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        das_resp = _make_das_response(token_count=5, total_value=500.0)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent.execute({"deployer_address": "0xdep123", "chain": "solana", "depth": "standard"})
        assert result["deployment_analysis"]["available"] is True
        assert result["portfolio_analysis"]["available"] is True
        assert result["cross_chain_analysis"]["available"] is False

    @pytest.mark.asyncio
    async def test_deep_runs_all_three(self, monkeypatch):
        """Deep depth: all 3 methods run (cross-chain still unavailable as stub)."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        das_resp = _make_das_response(token_count=5, total_value=500.0)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent.execute({"deployer_address": "0xdep123", "chain": "solana", "depth": "deep"})
        assert result["deployment_analysis"]["available"] is True
        assert result["portfolio_analysis"]["available"] is True
        # Cross-chain is stubbed, so still unavailable
        assert result["cross_chain_analysis"]["available"] is False

    @pytest.mark.asyncio
    async def test_quick_score_normalized_to_100(self, monkeypatch):
        """Quick mode: score normalizes using only deployment max (30)."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=12, oldest_age_days=400)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            result = await agent.execute({"deployer_address": "0xdep123", "chain": "solana", "depth": "quick"})
        # Only deployment (30) + reputation (20) = 50 available
        # High deploy score should normalize well
        assert result["deploy_score"] > 0
        assert result["deploy_score"] <= 100

    @pytest.mark.asyncio
    async def test_default_depth_is_standard(self, monkeypatch):
        """No depth param defaults to standard."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        das_resp = _make_das_response(token_count=5, total_value=500.0)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent.execute({"deployer_address": "0xdep123", "chain": "solana"})
        assert result["depth"] == "standard"
        assert result["deployment_analysis"]["available"] is True
        assert result["portfolio_analysis"]["available"] is True
```

**Step 2: Run tests to verify they fail**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestDepthGating -v`
Expected: FAIL (execute doesn't call analysis methods yet)

**Step 3: Wire up execute() with asyncio.gather**

Replace the `execute` method in `DeployAgent`:

```python
async def execute(self, params: Dict) -> Dict:
    deployer = params.get("deployer_address", "")
    chain = params.get("chain", "")
    depth = params.get("depth", "standard")

    if depth not in VALID_DEPTHS:
        depth = "standard"

    if not deployer or not chain:
        self.log_event("error", "Missing deployer_address or chain")
        return self._empty_result(deployer, chain, depth)

    try:
        self.log_event("action", f"Starting deploy analysis for {deployer} on {chain}", {"depth": depth})

        deploy_r, portfolio_r, cross_chain_r = await asyncio.gather(
            self._analyze_deployments(deployer, chain, depth),
            self._analyze_portfolio(deployer, depth),
            self._analyze_cross_chain(deployer, chain, depth),
        )

        result = self._compute_verdict(deployer, chain, depth,
                                       deploy_r, portfolio_r, cross_chain_r)

        self.log_event("decision", f"Deploy score: {result['deploy_score']} ({result['risk_level']})", {
            "deploy_score": result["deploy_score"],
            "risk_level": result["risk_level"],
            "red_flags": result["red_flags"],
        })

        self.write_scratchpad(f"deploy_{deployer}", result)
        return result
    except Exception as e:
        self.log_event("error", f"Deploy analysis failed unexpectedly: {e}")
        empty = self._empty_result(deployer, chain, depth)
        empty["red_flags"].append("all_sources_failed")
        return empty
```

**Step 4: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 29 passed

**Step 5: Commit**

```bash
git add src/agents/deploy_agent.py src/agents/tests/test_deploy_agent.py
git commit -m "feat: wire up execute() with asyncio.gather and depth gating"
```

---

### Task 9: Full execute() Integration (4 tests)

**Files:**
- Modify: `src/agents/tests/test_deploy_agent.py`

**Step 1: Write the failing tests**

```python
class TestExecuteIntegration:
    @pytest.mark.asyncio
    async def test_happy_path_all_fields(self, monkeypatch):
        """Standard depth with good data → all output fields present and correct types."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        txns = _make_helius_txns(count=12, oldest_age_days=400)
        das_resp = _make_das_response(token_count=15, total_value=5000.0)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=das_resp)
            result = await agent.execute({
                "deployer_address": "0xdep123",
                "chain": "solana",
                "depth": "standard",
            })
        # Structure checks
        assert isinstance(result["deploy_score"], int)
        assert 0 <= result["deploy_score"] <= 100
        assert result["risk_level"] in ("low", "medium", "high", "critical")
        assert result["cross_chain_reputation"] in ("established", "moderate", "new", "unknown")
        assert isinstance(result["chains_active"], list)
        assert isinstance(result["total_deployments"], int)
        assert isinstance(result["breakdown"], dict)
        assert isinstance(result["red_flags"], list)
        assert isinstance(result["green_flags"], list)
        assert isinstance(result["sources_used"], list)
        assert "helius" in result["sources_used"]

    @pytest.mark.asyncio
    async def test_all_apis_fail_gracefully(self, monkeypatch):
        """All API calls fail → score 0, critical, all_sources_failed."""
        monkeypatch.delenv("HELIUS_API_KEY", raising=False)
        agent = DeployAgent()
        result = await agent.execute({
            "deployer_address": "0xdep123",
            "chain": "solana",
            "depth": "standard",
        })
        assert result["deploy_score"] == 0
        assert result["risk_level"] == "critical"
        assert result["cross_chain_reputation"] == "unknown"
        assert "all_sources_failed" in result["red_flags"]

    @pytest.mark.asyncio
    async def test_scratchpad_written(self, monkeypatch, tmp_path):
        """Results written to scratchpad after execute."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=_make_das_response())
            await agent.execute({"deployer_address": "0xdep123", "chain": "solana"})
        saved = agent.read_scratchpad("deploy_0xdep123")
        assert saved is not None
        assert saved["deployer_address"] == "0xdep123"

    @pytest.mark.asyncio
    async def test_no_scratchpad_leak(self, monkeypatch, tmp_path):
        """Scratchpad does not leak internal state."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = DeployAgent()
        txns = _make_helius_txns(count=5, oldest_age_days=100)
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=txns)
            mocked.post(f"{HELIUS_DAS_URL}/?api-key=test-key", payload=_make_das_response())
            await agent.execute({"deployer_address": "0xdep123", "chain": "solana"})
        saved = agent.read_scratchpad("deploy_0xdep123")
        saved_str = str(saved)
        assert "api-key" not in saved_str.lower()
        assert "test-key" not in saved_str
```

**Step 2: Run tests to verify they pass**

Run: `pytest src/agents/tests/test_deploy_agent.py::TestExecuteIntegration -v`
Expected: 4 passed (all integration wiring was done in Task 8)

**Step 3: Run full test suite to verify everything**

Run: `pytest src/agents/tests/test_deploy_agent.py -v`
Expected: 42 passed

Run: `pytest --tb=short`
Expected: All project tests pass (310 prior + 42 new = 352)

**Step 4: Commit**

```bash
git add src/agents/tests/test_deploy_agent.py
git commit -m "test: add execute() integration tests for DeployAgent"
```

---

## Verification Checklist

After all tasks, verify:

1. `pytest src/agents/tests/test_deploy_agent.py -v` → 42 passed
2. `pytest --tb=short` → all project tests pass
3. No scratchpad or API key leaks
4. `_analyze_cross_chain` is fully stubbed with Allium SQL contracts in docstring
5. Weight redistribution normalizes score regardless of depth mode
6. All red/green flags from design spec are detected
7. Output structure matches `docs/plans/2026-02-23-deploy-agent-design.md`
