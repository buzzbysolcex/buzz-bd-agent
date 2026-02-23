# WalletAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build WalletAgent — the Layer 2 (Wallet Forensics) sub-agent that runs 5 analyses in parallel via asyncio.gather, then computes a verdict. Returns wallet_score 0-100, risk_level, verdict, and detailed breakdowns.

**Architecture:** WalletAgent inherits BaseAgent. Five private analysis methods run via `asyncio.gather()`, then `_compute_verdict()` aggregates sequentially. DexScreener API (all depths), Helius API (standard+deep), Allium API (deep only, stubbed). Depth gating controls which sources are called. Auto-escalation from quick->standard on 2+ red flags. Scoring: Liquidity 0-25, Holders 0-25, Deployer 0-20, TX Flow 0-15, Forensics 0-15. Weight redistribution for skipped sources.

**Tech Stack:** Python 3.9+, aiohttp for HTTP, BaseAgent from src/agents/base_agent.py. Testing: pytest + pytest-asyncio + aioresponses + monkeypatch.

**Design doc:** `docs/plans/2026-02-23-wallet-agent-design.md`

---

### Task 1: WalletAgent Skeleton + Constructor Tests

**Files:**
- Create: `src/agents/wallet_agent.py`
- Create: `src/agents/tests/test_wallet_agent.py`

**Step 1: Write the failing tests**

```python
# src/agents/tests/test_wallet_agent.py
import pytest
from src.agents.wallet_agent import WalletAgent
from src.agents.base_agent import BaseAgent


class TestWalletAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_wallet(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        assert agent.name == "wallet"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        assert agent.status == "idle"
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestWalletAgentInit -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.agents.wallet_agent'`

**Step 3: Create minimal wallet_agent.py**

```python
# src/agents/wallet_agent.py
import asyncio
import os
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
HELIUS_API_BASE = "https://api.helius.xyz"
ALLIUM_API_URL = "https://api.allium.so/api/v1/query"

VALID_DEPTHS = {"quick", "standard", "deep"}
VALID_VERDICTS = {"CLEAN", "CAUTION", "SUSPICIOUS", "RUG_RISK"}

# Timeouts per depth
DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=8),
    "deep": aiohttp.ClientTimeout(total=15),
}

# Max points per category
MAX_LIQUIDITY = 25
MAX_HOLDERS = 25
MAX_DEPLOYER = 20
MAX_TX_FLOW = 15
MAX_FORENSICS = 15

# Known LP lock contract addresses
LP_LOCK_ADDRESSES = {
    "team.finance", "unicrypt", "pinksale",
    "6ggge4qs14ezgde4wrfccexnhagbpqzpgpmhyqrsqm",  # Team.Finance Solana
}

# Known dead/burn addresses
BURN_ADDRESSES = {
    "0x000000000000000000000000000000000000dead",
    "0x0000000000000000000000000000000000000000",
    "1nc1nerator11111111111111111111111111111111",  # Solana burn
}


class WalletAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="wallet")

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestWalletAgentInit -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add WalletAgent skeleton inheriting BaseAgent"
```

---

### Task 2: Input Validation

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
class TestInputValidation:
    async def test_missing_deployer_address(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent.execute({"token_address": "abc123", "chain": "solana"})
        assert result["wallet_score"] == 0
        assert result["verdict"] == "RUG_RISK"

    async def test_missing_token_address(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent.execute({"deployer_address": "dep123", "chain": "solana"})
        assert result["wallet_score"] == 0
        assert result["verdict"] == "RUG_RISK"

    async def test_missing_chain(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent.execute({"deployer_address": "dep123", "token_address": "abc123"})
        assert result["wallet_score"] == 0
        assert result["verdict"] == "RUG_RISK"

    async def test_default_depth_is_standard(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        # Mock all analysis methods to return defaults
        from unittest.mock import AsyncMock
        agent._analyze_liquidity = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_holders = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_deployer = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_tx_flow = AsyncMock(return_value={"available": False, "score": 0})
        agent._run_forensics = AsyncMock(return_value={"available": False, "score": 0})
        result = await agent.execute({"deployer_address": "dep123", "token_address": "abc123", "chain": "solana"})
        assert result["depth"] == "standard"
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestInputValidation -v`
Expected: FAIL — `NotImplementedError: TODO`

**Step 3: Implement input validation and execute() skeleton**

Replace `execute()` in `src/agents/wallet_agent.py`:

```python
    def _empty_result(self, deployer: str = "", token: str = "", chain: str = "", depth: str = "standard") -> Dict:
        return {
            "deployer_address": deployer,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "wallet_score": 0,
            "risk_level": "critical",
            "verdict": "RUG_RISK",
            "breakdown": {"liquidity": 0, "holders": 0, "deployer": 0, "tx_flow": 0, "forensics": 0},
            "liquidity_health": {"total_liquidity": 0.0, "lp_locked": False, "lp_lock_duration_days": None, "lp_burned": False, "buy_sell_ratio": 0.0, "available": False},
            "holder_distribution": {"top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0, "available": False},
            "deployer_reputation": {"age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False, "available": False},
            "tx_flow": {"organic_score": 0.0, "unique_buyers_24h": 0, "unique_sellers_24h": 0, "avg_tx_size": 0.0, "available": False},
            "forensics": {"bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False, "available": False},
            "red_flags": [],
            "green_flags": [],
            "sources_used": [],
        }

    async def execute(self, params: Dict) -> Dict:
        deployer = params.get("deployer_address", "")
        token = params.get("token_address", "")
        chain = params.get("chain", "")
        depth = params.get("depth", "standard")

        if depth not in VALID_DEPTHS:
            depth = "standard"

        if not deployer or not token or not chain:
            self.log_event("error", "Missing deployer_address, token_address, or chain")
            return self._empty_result(deployer, token, chain, depth)

        self.log_event("action", f"Starting wallet analysis for {token} (deployer: {deployer}) on {chain}", {"depth": depth})

        # Run 5 analyses in parallel
        liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r = await asyncio.gather(
            self._analyze_liquidity(token, chain, depth),
            self._analyze_holders(token, deployer, chain, depth),
            self._analyze_deployer(deployer, chain, depth),
            self._analyze_tx_flow(token, chain, depth),
            self._run_forensics(token, deployer, chain, depth),
        )

        # Compute verdict sequentially
        result = self._compute_verdict(
            deployer, token, chain, depth,
            liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r,
        )

        # Auto-escalation: quick -> standard if 2+ red flags
        if depth == "quick" and params.get("depth", "standard") == "quick" and len(result["red_flags"]) >= 2:
            self.log_event("decision", f"Auto-escalating from quick to standard: {len(result['red_flags'])} red flags")
            depth = "standard"
            liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r = await asyncio.gather(
                self._analyze_liquidity(token, chain, depth),
                self._analyze_holders(token, deployer, chain, depth),
                self._analyze_deployer(deployer, chain, depth),
                self._analyze_tx_flow(token, chain, depth),
                self._run_forensics(token, deployer, chain, depth),
            )
            result = self._compute_verdict(
                deployer, token, chain, depth,
                liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r,
            )

        self.log_event("decision", f"Wallet score: {result['wallet_score']} ({result['verdict']})", {
            "wallet_score": result["wallet_score"],
            "verdict": result["verdict"],
            "red_flags": result["red_flags"],
        })

        self.write_scratchpad(f"wallet_{token}", result)
        return result

    async def _analyze_liquidity(self, token: str, chain: str, depth: str) -> Dict:
        return {"available": False, "score": 0}

    async def _analyze_holders(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        if depth == "quick":
            return {"available": False, "score": 0}
        return {"available": False, "score": 0}

    async def _analyze_deployer(self, deployer: str, chain: str, depth: str) -> Dict:
        if depth == "quick":
            return {"available": False, "score": 0}
        return {"available": False, "score": 0}

    async def _analyze_tx_flow(self, token: str, chain: str, depth: str) -> Dict:
        return {"available": False, "score": 0}

    async def _run_forensics(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        if depth == "quick":
            return {"available": False, "score": 0}
        return {"available": False, "score": 0}

    def _compute_verdict(self, deployer: str, token: str, chain: str, depth: str,
                         liquidity_r: Dict, holders_r: Dict, deployer_r: Dict,
                         tx_flow_r: Dict, forensics_r: Dict) -> Dict:
        return self._empty_result(deployer, token, chain, depth)
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py -v`
Expected: 7 PASSED (3 init + 4 validation)

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add WalletAgent input validation and execute skeleton"
```

---

### Task 3: _analyze_liquidity with DexScreener

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
from aioresponses import aioresponses

DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"

MOCK_DEXSCREENER_HEALTHY = {
    "pairs": [{
        "liquidity": {"usd": 600000},
        "marketCap": 5000000,
        "txns": {"h24": {"buys": 120, "sells": 100}},
        "pairCreatedAt": 1700000000000,
        "info": {"socials": []},
        "labels": ["v2"],
        "liquidity": {"usd": 600000},
    }]
}

MOCK_DEXSCREENER_LOW_LIQ = {
    "pairs": [{
        "liquidity": {"usd": 30000},
        "marketCap": 500000,
        "txns": {"h24": {"buys": 10, "sells": 50}},
        "pairCreatedAt": 1700000000000,
        "info": {"socials": []},
        "labels": [],
    }]
}

MOCK_DEXSCREENER_EMPTY = {"pairs": []}


class TestAnalyzeLiquidity:
    async def test_high_liquidity_scores_well(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert result["available"] is True
        assert result["score"] >= 8  # at least liquidity tier points
        assert result["total_liquidity"] == 600000.0

    async def test_low_liquidity_low_score(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert result["available"] is True
        assert result["total_liquidity"] == 30000.0

    async def test_healthy_buy_sell_ratio(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert 0.7 <= result["buy_sell_ratio"] <= 1.5

    async def test_skewed_buy_sell_ratio(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        # buys=10/sells=50 = 0.2, outside healthy range
        assert result["buy_sell_ratio"] < 0.7

    async def test_empty_pairs_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_EMPTY)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert result["available"] is False

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", status=500)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert result["available"] is False
        assert result["score"] == 0

    async def test_returns_lp_locked_field(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert "lp_locked" in result
        assert "lp_burned" in result

    async def test_returns_red_green_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            result = await agent._analyze_liquidity("abc123", "solana", "quick")
        assert "red_flags" in result
        assert "green_flags" in result
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeLiquidity -v`
Expected: FAIL — results don't match expected structure

**Step 3: Implement _analyze_liquidity**

Replace `_analyze_liquidity` in `src/agents/wallet_agent.py`:

```python
    async def _analyze_liquidity(self, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "total_liquidity": 0.0, "lp_locked": False, "lp_lock_duration_days": None,
            "lp_burned": False, "buy_sell_ratio": 0.0,
            "red_flags": [], "green_flags": [],
        }
        self.log_event("action", "Analyzing liquidity via DexScreener", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{DEXSCREENER_TOKENS_URL}/{token}") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener returned {resp.status}")
                    data = await resp.json()

            pairs = data.get("pairs", [])
            if not pairs:
                self.log_event("observation", "No pairs found on DexScreener")
                return empty

            pair = pairs[0]
            liquidity_usd = float(pair.get("liquidity", {}).get("usd", 0) or 0)
            txns = pair.get("txns", {}).get("h24", {})
            buys = int(txns.get("buys", 0) or 0)
            sells = int(txns.get("sells", 0) or 0)
            buy_sell_ratio = buys / sells if sells > 0 else (float("inf") if buys > 0 else 0.0)

            # LP lock/burn detection from labels or known addresses
            labels = [l.lower() if isinstance(l, str) else "" for l in pair.get("labels", [])]
            lp_locked = any(lbl in LP_LOCK_ADDRESSES for lbl in labels)
            lp_burned = any(lbl in BURN_ADDRESSES for lbl in labels)

            # Score calculation
            score = 0
            red_flags = []
            green_flags = []

            # Liquidity tier
            if liquidity_usd >= 500000:
                score += 8
            elif liquidity_usd >= 100000:
                score += 5
            elif liquidity_usd >= 50000:
                score += 3

            # LP lock
            if lp_locked:
                score += 7
                green_flags.append("lp_locked_long")
            elif lp_burned:
                score += 7
                green_flags.append("lp_burned")
            else:
                red_flags.append("unlocked_lp")

            # Buy/sell ratio
            if 0.7 <= buy_sell_ratio <= 1.5:
                score += 5
            elif buy_sell_ratio > 5.0:
                red_flags.append("honeypot_risk")

            score = min(MAX_LIQUIDITY, score)

            self.log_event("observation", f"Liquidity: ${liquidity_usd:,.0f}, score: {score}/25")
            return {
                "available": True, "score": score,
                "total_liquidity": liquidity_usd,
                "lp_locked": lp_locked, "lp_lock_duration_days": None,
                "lp_burned": lp_burned,
                "buy_sell_ratio": round(buy_sell_ratio, 2) if buy_sell_ratio != float("inf") else 999.0,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Liquidity analysis failed: {e}")
            return empty
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeLiquidity -v`
Expected: 8 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _analyze_liquidity with DexScreener integration"
```

---

### Task 4: _analyze_holders with Helius

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
HELIUS_API_BASE = "https://api.helius.xyz"

MOCK_HELIUS_HOLDERS_DISTRIBUTED = {
    "result": {
        "token_accounts": [
            {"owner": "wallet1", "amount": 50000},
            {"owner": "wallet2", "amount": 30000},
            {"owner": "wallet3", "amount": 20000},
            {"owner": "wallet4", "amount": 15000},
            {"owner": "wallet5", "amount": 12000},
            {"owner": "wallet6", "amount": 10000},
            {"owner": "wallet7", "amount": 8000},
            {"owner": "wallet8", "amount": 7000},
            {"owner": "wallet9", "amount": 6000},
            {"owner": "wallet10", "amount": 5000},
        ],
        "total_supply": 1000000,
    }
}

MOCK_HELIUS_HOLDERS_CONCENTRATED = {
    "result": {
        "token_accounts": [
            {"owner": "deployer1", "amount": 200000},
            {"owner": "whale2", "amount": 150000},
            {"owner": "whale3", "amount": 100000},
            {"owner": "w4", "amount": 50000},
            {"owner": "w5", "amount": 30000},
            {"owner": "w6", "amount": 20000},
            {"owner": "w7", "amount": 10000},
            {"owner": "w8", "amount": 5000},
            {"owner": "w9", "amount": 3000},
            {"owner": "w10", "amount": 2000},
        ],
        "total_supply": 1000000,
    }
}


class TestAnalyzeHolders:
    async def test_skipped_in_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent._analyze_holders("abc123", "dep123", "solana", "quick")
        assert result["available"] is False

    async def test_well_distributed_scores_high(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED,
            )
            result = await agent._analyze_holders("abc123", "deployer_xyz", "solana", "standard")
        assert result["available"] is True
        assert result["score"] >= 15  # well distributed
        assert result["top10_pct"] < 20.0

    async def test_concentrated_scores_low(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                payload=MOCK_HELIUS_HOLDERS_CONCENTRATED,
            )
            result = await agent._analyze_holders("abc123", "deployer1", "solana", "standard")
        assert result["available"] is True
        assert result["top10_pct"] > 50.0
        assert "whale_concentration" in result["red_flags"]

    async def test_deployer_heavy_bag_detected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                payload=MOCK_HELIUS_HOLDERS_CONCENTRATED,
            )
            result = await agent._analyze_holders("abc123", "deployer1", "solana", "standard")
        assert result["deployer_pct"] == 20.0  # 200000/1000000
        assert "dev_heavy_bag" in result["red_flags"]

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                status=500,
            )
            result = await agent._analyze_holders("abc123", "dep123", "solana", "standard")
        assert result["available"] is False

    async def test_no_api_key_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.delenv("HELIUS_API_KEY", raising=False)
        agent = WalletAgent()
        result = await agent._analyze_holders("abc123", "dep123", "solana", "standard")
        assert result["available"] is False

    async def test_broad_holder_base_green_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        # Create mock with many holders
        many_holders = {"result": {"token_accounts": [{"owner": f"w{i}", "amount": 100} for i in range(50)], "total_supply": 100000}}
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                payload=many_holders,
            )
            result = await agent._analyze_holders("abc123", "nobody", "solana", "standard")
        assert result["available"] is True
        assert result["unique_holders"] == 50
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeHolders -v`
Expected: FAIL — results don't match expected structure

**Step 3: Implement _analyze_holders**

Replace `_analyze_holders` in `src/agents/wallet_agent.py`:

```python
    async def _analyze_holders(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping holder analysis")
            return empty

        self.log_event("action", "Analyzing holders via Helius", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/tokens/{token}/holders?api-key={api_key}&limit=50"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius holders returned {resp.status}")
                    data = await resp.json()

            result_data = data.get("result", {})
            accounts = result_data.get("token_accounts", [])
            total_supply = result_data.get("total_supply", 0)

            if not accounts or total_supply <= 0:
                return empty

            amounts = sorted([a.get("amount", 0) for a in accounts], reverse=True)
            owners = [a.get("owner", "") for a in accounts]
            unique_holders = len(set(owners))

            top10_total = sum(amounts[:10])
            top10_pct = round((top10_total / total_supply) * 100, 1)

            # Find deployer's holdings
            deployer_amount = 0
            for a in accounts:
                if a.get("owner", "") == deployer:
                    deployer_amount = a.get("amount", 0)
                    break
            deployer_pct = round((deployer_amount / total_supply) * 100, 1)

            # Count whales (>2% of supply)
            whale_threshold = total_supply * 0.02
            whale_count = sum(1 for amt in amounts if amt > whale_threshold)

            # Scoring
            score = 0
            red_flags = []
            green_flags = []

            if top10_pct < 20:
                score += 10
                green_flags.append("well_distributed")
            elif top10_pct < 30:
                score += 7
            elif top10_pct < 50:
                score += 4
            else:
                red_flags.append("whale_concentration")

            if deployer_pct < 5:
                score += 5
            elif deployer_pct < 10:
                score += 3
            else:
                red_flags.append("dev_heavy_bag")

            if unique_holders >= 1000:
                score += 5
                green_flags.append("broad_holder_base")
            elif unique_holders >= 500:
                score += 3

            # No single whale > 5%
            max_single_pct = (amounts[0] / total_supply) * 100 if amounts else 0
            if max_single_pct <= 5:
                score += 5

            score = min(MAX_HOLDERS, score)

            self.log_event("observation", f"Holders: top10={top10_pct}%, deployer={deployer_pct}%, holders={unique_holders}, score={score}/25")
            return {
                "available": True, "score": score,
                "top10_pct": top10_pct, "deployer_pct": deployer_pct,
                "unique_holders": unique_holders, "whale_count": whale_count,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Holder analysis failed: {e}")
            return empty
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeHolders -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _analyze_holders with Helius holder distribution"
```

---

### Task 5: _analyze_deployer with Helius

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
import time

MOCK_HELIUS_DEPLOYER_ESTABLISHED = [
    {"type": "TRANSFER", "timestamp": int(time.time()) - (400 * 86400), "description": "old tx"},
    {"type": "TRANSFER", "timestamp": int(time.time()) - (200 * 86400), "description": "mid tx"},
    {"type": "UNKNOWN", "timestamp": int(time.time()) - (10 * 86400), "description": "recent tx"},
]

MOCK_HELIUS_DEPLOYER_NEW = [
    {"type": "TRANSFER", "timestamp": int(time.time()) - (5 * 86400), "description": "new deployer tx"},
]

MOCK_HELIUS_DEPLOYER_EMPTY = []


class TestAnalyzeDeployer:
    async def test_skipped_in_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent._analyze_deployer("dep123", "solana", "quick")
        assert result["available"] is False

    async def test_established_deployer_scores_high(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100",
                payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED,
            )
            result = await agent._analyze_deployer("dep123", "solana", "standard")
        assert result["available"] is True
        assert result["age_days"] >= 390
        assert result["score"] >= 8
        assert "established_deployer" in result["green_flags"]

    async def test_new_deployer_scores_low(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100",
                payload=MOCK_HELIUS_DEPLOYER_NEW,
            )
            result = await agent._analyze_deployer("dep123", "solana", "standard")
        assert result["available"] is True
        assert result["age_days"] <= 10

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100",
                status=500,
            )
            result = await agent._analyze_deployer("dep123", "solana", "standard")
        assert result["available"] is False

    async def test_empty_history_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100",
                payload=MOCK_HELIUS_DEPLOYER_EMPTY,
            )
            result = await agent._analyze_deployer("dep123", "solana", "standard")
        assert result["available"] is False

    async def test_allium_stub_in_deep_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100",
                payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED,
            )
            result = await agent._analyze_deployer("dep123", "solana", "deep")
        assert result["available"] is True
        assert result["cross_chain_activity"] is False  # Allium stubbed
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeDeployer -v`
Expected: FAIL

**Step 3: Implement _analyze_deployer and _fetch_allium**

Replace `_analyze_deployer` in `src/agents/wallet_agent.py` and add `_fetch_allium`:

```python
    async def _fetch_allium(self, deployer_address: str) -> Dict:
        """
        Planned input: deployer wallet address
        Planned output: {
            "chains_active": List[str],
            "total_pnl_usd": float,
            "tokens_deployed": int,
            "rug_indicators": int,
            "available": True
        }
        Planned endpoint: POST https://api.allium.so/api/v1/query
        Auth: Bearer token in header
        """
        self.log_event("action", "Allium API not yet implemented")
        return {"available": False}

    async def _analyze_deployer(self, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0,
            "cross_chain_activity": False,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping deployer analysis")
            return empty

        self.log_event("action", "Analyzing deployer via Helius", {"deployer": deployer})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/addresses/{deployer}/transactions?api-key={api_key}&limit=100"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius deployer txs returned {resp.status}")
                    txs = await resp.json()

            if not txs:
                return empty

            # Calculate account age from earliest transaction
            timestamps = [tx.get("timestamp", 0) for tx in txs if tx.get("timestamp")]
            if not timestamps:
                return empty

            earliest = min(timestamps)
            now = int(time.time())
            age_days = (now - earliest) // 86400

            # Estimate rug count from transaction patterns (heuristic)
            # For now, simple: count is 0 (would need cross-referencing token histories)
            rug_count = 0
            total_tokens_deployed = len(txs)  # rough proxy

            # Cross-chain from Allium (deep mode only)
            cross_chain = False
            if depth == "deep":
                allium = await self._fetch_allium(deployer)
                if allium.get("available"):
                    cross_chain = len(allium.get("chains_active", [])) > 1
                    rug_count = allium.get("rug_indicators", 0)

            # Scoring
            score = 0
            red_flags = []
            green_flags = []

            if age_days > 365:
                score += 8
                green_flags.append("established_deployer")
            elif age_days > 180:
                score += 5
            elif age_days > 90:
                score += 3

            if rug_count == 0:
                score += 7
            elif rug_count >= 2:
                score -= 10
                red_flags.append("serial_rugger")

            if cross_chain:
                score += 5

            score = max(0, min(MAX_DEPLOYER, score))

            self.log_event("observation", f"Deployer: age={age_days}d, rugs={rug_count}, score={score}/20")
            return {
                "available": True, "score": score,
                "age_days": age_days, "total_tokens_deployed": total_tokens_deployed,
                "rug_count": rug_count, "cross_chain_activity": cross_chain,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Deployer analysis failed: {e}")
            return empty
```

Also add at the top of wallet_agent.py:

```python
import time
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeDeployer -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _analyze_deployer with Helius tx history and Allium stub"
```

---

### Task 6: _analyze_tx_flow

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
MOCK_DEXSCREENER_TX_ORGANIC = {
    "pairs": [{
        "liquidity": {"usd": 500000},
        "marketCap": 5000000,
        "txns": {
            "h24": {"buys": 150, "sells": 120},
            "h6": {"buys": 40, "sells": 35},
            "h1": {"buys": 8, "sells": 6},
        },
        "volume": {"h24": 800000},
    }]
}

MOCK_DEXSCREENER_TX_INORGANIC = {
    "pairs": [{
        "liquidity": {"usd": 100000},
        "marketCap": 500000,
        "txns": {
            "h24": {"buys": 5, "sells": 2},
            "h6": {"buys": 5, "sells": 2},
            "h1": {"buys": 5, "sells": 2},
        },
        "volume": {"h24": 400000},
    }]
}


class TestAnalyzeTxFlow:
    async def test_organic_trading_scores_high(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent._analyze_tx_flow("abc123", "solana", "quick")
        assert result["available"] is True
        assert result["organic_score"] > 0.5

    async def test_inorganic_trading_detected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_INORGANIC)
            result = await agent._analyze_tx_flow("abc123", "solana", "quick")
        assert result["available"] is True
        assert result["organic_score"] < 0.5

    async def test_unique_buyers_counted(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent._analyze_tx_flow("abc123", "solana", "quick")
        assert result["unique_buyers_24h"] == 150
        assert result["unique_sellers_24h"] == 120

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", status=500)
            result = await agent._analyze_tx_flow("abc123", "solana", "quick")
        assert result["available"] is False

    async def test_returns_red_flag_for_artificial(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_INORGANIC)
            result = await agent._analyze_tx_flow("abc123", "solana", "quick")
        assert "artificial_demand" in result["red_flags"]
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeTxFlow -v`
Expected: FAIL

**Step 3: Implement _analyze_tx_flow**

Replace `_analyze_tx_flow` in `src/agents/wallet_agent.py`:

```python
    async def _analyze_tx_flow(self, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "organic_score": 0.0, "unique_buyers_24h": 0, "unique_sellers_24h": 0,
            "avg_tx_size": 0.0, "red_flags": [], "green_flags": [],
        }
        self.log_event("action", "Analyzing TX flow", {"token": token, "depth": depth})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{DEXSCREENER_TOKENS_URL}/{token}") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener returned {resp.status}")
                    data = await resp.json()

            pairs = data.get("pairs", [])
            if not pairs:
                return empty

            pair = pairs[0]
            txns = pair.get("txns", {})
            h24 = txns.get("h24", {})
            h6 = txns.get("h6", {})
            h1 = txns.get("h1", {})

            buys_24h = int(h24.get("buys", 0) or 0)
            sells_24h = int(h24.get("sells", 0) or 0)
            buys_6h = int(h6.get("buys", 0) or 0)
            sells_6h = int(h6.get("sells", 0) or 0)
            buys_1h = int(h1.get("buys", 0) or 0)
            sells_1h = int(h1.get("sells", 0) or 0)

            volume_24h = float(pair.get("volume", {}).get("h24", 0) or 0)
            total_txns_24h = buys_24h + sells_24h

            # Organic score heuristic:
            # - Healthy tokens have distributed trading across time windows
            # - Inorganic: all trades happen in one window, uniform sizes
            organic_score = 0.0
            if total_txns_24h > 0:
                # Time distribution: if h1 is proportional to h24/24, it's organic
                expected_h1 = total_txns_24h / 24
                actual_h1 = buys_1h + sells_1h
                if expected_h1 > 0:
                    time_ratio = min(actual_h1 / expected_h1, 3.0) / 3.0
                    time_score = 1.0 - abs(time_ratio - 0.33) / 0.67  # peaks at ~1/3
                else:
                    time_score = 0.0

                # Volume per tx (uniform = suspicious)
                avg_tx = volume_24h / total_txns_24h if total_txns_24h > 0 else 0
                # More txns with reasonable volume = more organic
                tx_diversity = min(total_txns_24h / 100, 1.0)

                organic_score = round((time_score * 0.4 + tx_diversity * 0.6), 2)
                organic_score = max(0.0, min(1.0, organic_score))

            avg_tx_size = round(volume_24h / total_txns_24h, 2) if total_txns_24h > 0 else 0.0

            # Scoring
            score = 0
            red_flags = []
            green_flags = []

            if organic_score > 0.8:
                score += 8
                green_flags.append("organic_trading")
            elif organic_score > 0.5:
                score += 5

            if organic_score < 0.3:
                red_flags.append("artificial_demand")

            if buys_24h > 100:
                score += 4
            elif buys_24h > 50:
                score += 2

            # Reasonable avg tx size (not all same size)
            if avg_tx_size > 0 and total_txns_24h > 20:
                score += 3

            score = min(MAX_TX_FLOW, score)

            self.log_event("observation", f"TX Flow: organic={organic_score}, buyers={buys_24h}, score={score}/15")
            return {
                "available": True, "score": score,
                "organic_score": organic_score,
                "unique_buyers_24h": buys_24h,
                "unique_sellers_24h": sells_24h,
                "avg_tx_size": avg_tx_size,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"TX flow analysis failed: {e}")
            return empty
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAnalyzeTxFlow -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _analyze_tx_flow with organic trading detection"
```

---

### Task 7: _run_forensics

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
MOCK_HELIUS_BUNDLED_TXS = [
    {"type": "SWAP", "timestamp": 1700000100, "feePayer": "bundler1", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "bundler1", "toUserAccount": "pool", "mint": "abc123"}]},
    {"type": "SWAP", "timestamp": 1700000100, "feePayer": "bundler2", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "bundler2", "toUserAccount": "pool", "mint": "abc123"}]},
    {"type": "SWAP", "timestamp": 1700000100, "feePayer": "bundler3", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "bundler3", "toUserAccount": "pool", "mint": "abc123"}]},
]

MOCK_HELIUS_CLEAN_TXS = [
    {"type": "SWAP", "timestamp": 1700000100, "feePayer": "buyer1", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "buyer1", "toUserAccount": "pool", "mint": "abc123"}]},
    {"type": "SWAP", "timestamp": 1700005000, "feePayer": "buyer2", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "buyer2", "toUserAccount": "pool", "mint": "abc123"}]},
    {"type": "SWAP", "timestamp": 1700010000, "feePayer": "buyer3", "description": "buy token",
     "tokenTransfers": [{"fromUserAccount": "buyer3", "toUserAccount": "pool", "mint": "abc123"}]},
]


class TestRunForensics:
    async def test_skipped_in_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        result = await agent._run_forensics("abc123", "dep123", "solana", "quick")
        assert result["available"] is False

    async def test_detects_bundled_wallets(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP",
                payload=MOCK_HELIUS_BUNDLED_TXS,
            )
            result = await agent._run_forensics("abc123", "dep123", "solana", "standard")
        assert result["available"] is True
        assert len(result["bundled_wallets"]) >= 2
        assert "bundled_wallets" in result["red_flags"]

    async def test_clean_transactions(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP",
                payload=MOCK_HELIUS_CLEAN_TXS,
            )
            result = await agent._run_forensics("abc123", "dep123", "solana", "standard")
        assert result["available"] is True
        assert result["bundled_wallets"] == []

    async def test_sybil_clusters_stubbed(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP",
                payload=MOCK_HELIUS_CLEAN_TXS,
            )
            result = await agent._run_forensics("abc123", "dep123", "solana", "standard")
        assert result["sybil_clusters"] == []
        assert result["wash_trading_detected"] is False

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP",
                status=500,
            )
            result = await agent._run_forensics("abc123", "dep123", "solana", "standard")
        assert result["available"] is False
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestRunForensics -v`
Expected: FAIL

**Step 3: Implement _run_forensics**

Replace `_run_forensics` in `src/agents/wallet_agent.py`:

```python
    async def _run_forensics(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "bundled_wallets": [], "sybil_clusters": [],
            "wash_trading_detected": False, "same_funding_source": False,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping forensics")
            return empty

        self.log_event("action", "Running forensics analysis", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/addresses/{token}/transactions?api-key={api_key}&limit=100&type=SWAP"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius forensics returned {resp.status}")
                    txs = await resp.json()

            if not txs:
                return {**empty, "available": True, "score": MAX_FORENSICS}

            # Bundled wallet detection: multiple buys in the same second
            by_timestamp: Dict[int, list] = {}
            for tx in txs:
                ts = tx.get("timestamp", 0)
                payer = tx.get("feePayer", "")
                if ts and payer:
                    by_timestamp.setdefault(ts, []).append(payer)

            bundled_wallets = []
            for ts, payers in by_timestamp.items():
                unique_payers = list(set(payers))
                if len(unique_payers) >= 2:
                    bundled_wallets.extend(unique_payers)
            bundled_wallets = list(set(bundled_wallets))

            # Sybil clusters — stubbed
            sybil_clusters: list = []

            # Wash trading — stubbed
            wash_trading_detected = False

            # Same funding source — basic check (deep mode)
            same_funding_source = False

            # Scoring
            score = 0
            red_flags = []
            green_flags = []

            if not bundled_wallets:
                score += 5
            else:
                score -= 5
                red_flags.append("bundled_wallets")

            if not sybil_clusters:
                score += 5

            if not wash_trading_detected:
                score += 5

            if same_funding_source:
                score -= 3

            score = max(0, min(MAX_FORENSICS, score))

            self.log_event("observation", f"Forensics: bundled={len(bundled_wallets)}, score={score}/15")
            return {
                "available": True, "score": score,
                "bundled_wallets": bundled_wallets,
                "sybil_clusters": sybil_clusters,
                "wash_trading_detected": wash_trading_detected,
                "same_funding_source": same_funding_source,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Forensics analysis failed: {e}")
            return empty
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestRunForensics -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _run_forensics with bundled wallet detection"
```

---

### Task 8: _compute_verdict + Scoring Engine

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
class TestComputeVerdict:
    def _make_result(self, score, available=True, red_flags=None, green_flags=None):
        return {
            "available": available, "score": score,
            "red_flags": red_flags or [], "green_flags": green_flags or [],
        }

    def test_clean_verdict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        liq = {**self._make_result(20), "total_liquidity": 600000, "lp_locked": True, "lp_lock_duration_days": 200, "lp_burned": False, "buy_sell_ratio": 1.1}
        hld = {**self._make_result(20), "top10_pct": 15.0, "deployer_pct": 3.0, "unique_holders": 1200, "whale_count": 1}
        dep = {**self._make_result(15), "age_days": 400, "total_tokens_deployed": 5, "rug_count": 0, "cross_chain_activity": False}
        txf = {**self._make_result(12), "organic_score": 0.9, "unique_buyers_24h": 150, "unique_sellers_24h": 120, "avg_tx_size": 500.0}
        for_ = {**self._make_result(15), "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "standard", liq, hld, dep, txf, for_)
        assert result["wallet_score"] >= 80
        assert result["verdict"] == "CLEAN"
        assert result["risk_level"] == "low"

    def test_rug_risk_verdict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        liq = {**self._make_result(3, red_flags=["unlocked_lp"]), "total_liquidity": 30000, "lp_locked": False, "lp_lock_duration_days": None, "lp_burned": False, "buy_sell_ratio": 0.1}
        hld = {**self._make_result(0, red_flags=["whale_concentration", "dev_heavy_bag"]), "top10_pct": 70.0, "deployer_pct": 25.0, "unique_holders": 50, "whale_count": 5}
        dep = {**self._make_result(0, red_flags=["serial_rugger"]), "age_days": 5, "total_tokens_deployed": 10, "rug_count": 3, "cross_chain_activity": False}
        txf = {**self._make_result(0, red_flags=["artificial_demand"]), "organic_score": 0.1, "unique_buyers_24h": 5, "unique_sellers_24h": 2, "avg_tx_size": 10000.0}
        for_ = {**self._make_result(0, red_flags=["bundled_wallets"]), "bundled_wallets": ["w1", "w2"], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": True}
        result = agent._compute_verdict("dep", "tok", "solana", "standard", liq, hld, dep, txf, for_)
        assert result["wallet_score"] < 35
        assert result["verdict"] == "RUG_RISK"
        assert result["risk_level"] == "critical"

    def test_weight_redistribution_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        # Quick: only liquidity and tx_flow available
        liq = {**self._make_result(20), "total_liquidity": 500000, "lp_locked": True, "lp_lock_duration_days": 200, "lp_burned": False, "buy_sell_ratio": 1.0}
        hld = {**self._make_result(0, available=False), "top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0}
        dep = {**self._make_result(0, available=False), "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False}
        txf = {**self._make_result(10), "organic_score": 0.7, "unique_buyers_24h": 80, "unique_sellers_24h": 60, "avg_tx_size": 300.0}
        for_ = {**self._make_result(0, available=False), "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "quick", liq, hld, dep, txf, for_)
        # 20+10=30 raw out of 25+15=40 available => 30/40*100=75
        assert result["wallet_score"] == 75
        assert result["verdict"] == "CAUTION"

    def test_all_sources_failed(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        unavail = self._make_result(0, available=False)
        liq = {**unavail, "total_liquidity": 0.0, "lp_locked": False, "lp_lock_duration_days": None, "lp_burned": False, "buy_sell_ratio": 0.0}
        hld = {**unavail, "top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0}
        dep = {**unavail, "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False}
        txf = {**unavail, "organic_score": 0.0, "unique_buyers_24h": 0, "unique_sellers_24h": 0, "avg_tx_size": 0.0}
        for_ = {**unavail, "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "standard", liq, hld, dep, txf, for_)
        assert result["wallet_score"] == 0
        assert result["verdict"] == "RUG_RISK"
        assert "all_sources_failed" in result["red_flags"]

    def test_red_and_green_flags_aggregated(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        liq = {**self._make_result(15, green_flags=["lp_locked_long"]), "total_liquidity": 200000, "lp_locked": True, "lp_lock_duration_days": 200, "lp_burned": False, "buy_sell_ratio": 1.0}
        hld = {**self._make_result(10, red_flags=["whale_concentration"]), "top10_pct": 55.0, "deployer_pct": 4.0, "unique_holders": 300, "whale_count": 3}
        dep = {**self._make_result(10), "age_days": 200, "total_tokens_deployed": 3, "rug_count": 0, "cross_chain_activity": False}
        txf = {**self._make_result(8, green_flags=["organic_trading"]), "organic_score": 0.85, "unique_buyers_24h": 120, "unique_sellers_24h": 90, "avg_tx_size": 400.0}
        for_ = {**self._make_result(15), "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "standard", liq, hld, dep, txf, for_)
        assert "lp_locked_long" in result["green_flags"]
        assert "organic_trading" in result["green_flags"]
        assert "whale_concentration" in result["red_flags"]

    def test_caution_verdict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        liq = {**self._make_result(15), "total_liquidity": 200000, "lp_locked": True, "lp_lock_duration_days": 100, "lp_burned": False, "buy_sell_ratio": 1.2}
        hld = {**self._make_result(12), "top10_pct": 28.0, "deployer_pct": 6.0, "unique_holders": 400, "whale_count": 2}
        dep = {**self._make_result(10), "age_days": 200, "total_tokens_deployed": 3, "rug_count": 0, "cross_chain_activity": False}
        txf = {**self._make_result(8), "organic_score": 0.6, "unique_buyers_24h": 70, "unique_sellers_24h": 50, "avg_tx_size": 300.0}
        for_ = {**self._make_result(10), "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "standard", liq, hld, dep, txf, for_)
        # 15+12+10+8+10 = 55 out of 100 available
        assert 35 <= result["wallet_score"] < 80
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestComputeVerdict -v`
Expected: FAIL — returns empty result from stub

**Step 3: Implement _compute_verdict**

Replace `_compute_verdict` in `src/agents/wallet_agent.py`:

```python
    def _compute_verdict(self, deployer: str, token: str, chain: str, depth: str,
                         liquidity_r: Dict, holders_r: Dict, deployer_r: Dict,
                         tx_flow_r: Dict, forensics_r: Dict) -> Dict:
        analyses = [
            (liquidity_r, MAX_LIQUIDITY),
            (holders_r, MAX_HOLDERS),
            (deployer_r, MAX_DEPLOYER),
            (tx_flow_r, MAX_TX_FLOW),
            (forensics_r, MAX_FORENSICS),
        ]

        # Calculate raw score and available points
        raw_score = 0
        available_points = 0
        for result, max_pts in analyses:
            if result.get("available", False):
                raw_score += result.get("score", 0)
                available_points += max_pts

        # Weight redistribution: normalize to 0-100
        if available_points > 0:
            wallet_score = round((raw_score / available_points) * 100)
        else:
            wallet_score = 0

        wallet_score = max(0, min(100, wallet_score))

        # Map to risk level and verdict
        if wallet_score >= 80:
            risk_level = "low"
            verdict = "CLEAN"
        elif wallet_score >= 60:
            risk_level = "medium"
            verdict = "CAUTION"
        elif wallet_score >= 35:
            risk_level = "high"
            verdict = "SUSPICIOUS"
        else:
            risk_level = "critical"
            verdict = "RUG_RISK"

        # Aggregate flags from all analyses
        red_flags = []
        green_flags = []
        for result, _ in analyses:
            red_flags.extend(result.get("red_flags", []))
            green_flags.extend(result.get("green_flags", []))

        # Check if all sources failed
        if available_points == 0:
            red_flags.append("all_sources_failed")

        # Collect sources used
        source_names = ["dexscreener", "helius", "allium"]
        sources_used = []
        if liquidity_r.get("available") or tx_flow_r.get("available"):
            sources_used.append("dexscreener")
        if holders_r.get("available") or deployer_r.get("available") or forensics_r.get("available"):
            sources_used.append("helius")
        if deployer_r.get("cross_chain_activity", False):
            sources_used.append("allium")

        # Build breakdown
        breakdown = {
            "liquidity": liquidity_r.get("score", 0),
            "holders": holders_r.get("score", 0),
            "deployer": deployer_r.get("score", 0),
            "tx_flow": tx_flow_r.get("score", 0),
            "forensics": forensics_r.get("score", 0),
        }

        return {
            "deployer_address": deployer,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "wallet_score": wallet_score,
            "risk_level": risk_level,
            "verdict": verdict,
            "breakdown": breakdown,
            "liquidity_health": {
                "total_liquidity": liquidity_r.get("total_liquidity", 0.0),
                "lp_locked": liquidity_r.get("lp_locked", False),
                "lp_lock_duration_days": liquidity_r.get("lp_lock_duration_days"),
                "lp_burned": liquidity_r.get("lp_burned", False),
                "buy_sell_ratio": liquidity_r.get("buy_sell_ratio", 0.0),
                "available": liquidity_r.get("available", False),
            },
            "holder_distribution": {
                "top10_pct": holders_r.get("top10_pct", 0.0),
                "deployer_pct": holders_r.get("deployer_pct", 0.0),
                "unique_holders": holders_r.get("unique_holders", 0),
                "whale_count": holders_r.get("whale_count", 0),
                "available": holders_r.get("available", False),
            },
            "deployer_reputation": {
                "age_days": deployer_r.get("age_days", 0),
                "total_tokens_deployed": deployer_r.get("total_tokens_deployed", 0),
                "rug_count": deployer_r.get("rug_count", 0),
                "cross_chain_activity": deployer_r.get("cross_chain_activity", False),
                "available": deployer_r.get("available", False),
            },
            "tx_flow": {
                "organic_score": tx_flow_r.get("organic_score", 0.0),
                "unique_buyers_24h": tx_flow_r.get("unique_buyers_24h", 0),
                "unique_sellers_24h": tx_flow_r.get("unique_sellers_24h", 0),
                "avg_tx_size": tx_flow_r.get("avg_tx_size", 0.0),
                "available": tx_flow_r.get("available", False),
            },
            "forensics": {
                "bundled_wallets": forensics_r.get("bundled_wallets", []),
                "sybil_clusters": forensics_r.get("sybil_clusters", []),
                "wash_trading_detected": forensics_r.get("wash_trading_detected", False),
                "same_funding_source": forensics_r.get("same_funding_source", False),
                "available": forensics_r.get("available", False),
            },
            "red_flags": red_flags,
            "green_flags": green_flags,
            "sources_used": sources_used,
        }
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestComputeVerdict -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/wallet_agent.py src/agents/tests/test_wallet_agent.py
git commit -m "feat: add _compute_verdict with scoring engine and weight redistribution"
```

---

### Task 9: Depth Gating Logic

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`
- Modify: `src/agents/wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
from unittest.mock import AsyncMock, patch


class TestDepthGating:
    async def test_quick_skips_holders_deployer_forensics(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "quick",
            })
        assert result["holder_distribution"]["available"] is False
        assert result["deployer_reputation"]["available"] is False
        assert result["forensics"]["available"] is False

    async def test_quick_runs_liquidity_and_tx_flow(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "quick",
            })
        assert result["liquidity_health"]["available"] is True

    async def test_standard_runs_helius_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_CLEAN_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        assert result["holder_distribution"]["available"] is True
        assert result["deployer_reputation"]["available"] is True

    async def test_deep_calls_allium_stub(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_CLEAN_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "deep",
            })
        # Allium is stubbed, so cross_chain should be False
        assert result["deployer_reputation"]["cross_chain_activity"] is False

    async def test_invalid_depth_defaults_to_standard(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        agent._analyze_liquidity = AsyncMock(return_value={"available": False, "score": 0, "total_liquidity": 0, "lp_locked": False, "lp_lock_duration_days": None, "lp_burned": False, "buy_sell_ratio": 0, "red_flags": [], "green_flags": []})
        agent._analyze_holders = AsyncMock(return_value={"available": False, "score": 0, "top10_pct": 0, "deployer_pct": 0, "unique_holders": 0, "whale_count": 0, "red_flags": [], "green_flags": []})
        agent._analyze_deployer = AsyncMock(return_value={"available": False, "score": 0, "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False, "red_flags": [], "green_flags": []})
        agent._analyze_tx_flow = AsyncMock(return_value={"available": False, "score": 0, "organic_score": 0, "unique_buyers_24h": 0, "unique_sellers_24h": 0, "avg_tx_size": 0, "red_flags": [], "green_flags": []})
        agent._run_forensics = AsyncMock(return_value={"available": False, "score": 0, "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False, "red_flags": [], "green_flags": []})
        result = await agent.execute({
            "deployer_address": "dep123", "token_address": "abc123",
            "chain": "solana", "depth": "invalid",
        })
        assert result["depth"] == "standard"

    async def test_sources_used_tracks_active_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_CLEAN_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        assert "dexscreener" in result["sources_used"]
        assert "helius" in result["sources_used"]
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestDepthGating -v`
Expected: Some may pass, some may fail depending on mock setup

**Step 3: No implementation changes needed**

The depth gating is already implemented in the individual analysis methods and execute(). These tests verify the integration works correctly.

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestDepthGating -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/tests/test_wallet_agent.py
git commit -m "test: add depth gating integration tests"
```

---

### Task 10: Auto-Escalation

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
class TestAutoEscalation:
    async def test_escalates_quick_to_standard_on_red_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        # First call (quick): returns 2 red flags from liquidity + tx_flow
        with aioresponses() as mocked:
            # Quick mode calls
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_INORGANIC)
            # Standard mode re-calls after escalation
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_INORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_CONCENTRATED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_NEW)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_BUNDLED_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "quick",
            })
        assert result["depth"] == "standard"  # escalated

    async def test_no_escalation_when_clean(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "quick",
            })
        assert result["depth"] == "quick"  # no escalation

    async def test_no_escalation_from_standard(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_LOW_LIQ)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_INORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_CONCENTRATED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_NEW)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_BUNDLED_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        assert result["depth"] == "standard"  # never escalates from standard
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestAutoEscalation -v`
Expected: 3 PASSED (auto-escalation already in execute())

**Step 3: Commit**

```bash
git add src/agents/tests/test_wallet_agent.py
git commit -m "test: add auto-escalation tests for quick-to-standard depth"
```

---

### Task 11: Full execute() Integration Tests

**Files:**
- Modify: `src/agents/tests/test_wallet_agent.py`

**Step 1: Write the integration tests**

Add to `src/agents/tests/test_wallet_agent.py`:

```python
class TestExecuteIntegration:
    async def test_happy_path_returns_all_fields(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_CLEAN_TXS)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        # Verify all top-level fields exist
        assert "wallet_score" in result
        assert "risk_level" in result
        assert "verdict" in result
        assert "breakdown" in result
        assert "liquidity_health" in result
        assert "holder_distribution" in result
        assert "deployer_reputation" in result
        assert "tx_flow" in result
        assert "forensics" in result
        assert "red_flags" in result
        assert "green_flags" in result
        assert "sources_used" in result
        assert 0 <= result["wallet_score"] <= 100

    async def test_writes_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", payload=MOCK_HELIUS_HOLDERS_DISTRIBUTED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", payload=MOCK_HELIUS_DEPLOYER_ESTABLISHED)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", payload=MOCK_HELIUS_CLEAN_TXS)
            await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        saved = agent.read_scratchpad("wallet_abc123")
        assert saved is not None
        assert "wallet_score" in saved

    async def test_all_apis_fail_gracefully(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", status=500)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", status=500)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", status=500)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", status=500)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", status=500)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        assert result["wallet_score"] == 0
        assert result["verdict"] == "RUG_RISK"
        assert "all_sources_failed" in result["red_flags"]

    async def test_partial_api_failure_still_scores(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            mocked.get(f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50", status=500)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/dep123/transactions?api-key=test-key&limit=100", status=500)
            mocked.get(f"{HELIUS_API_BASE}/v0/addresses/abc123/transactions?api-key=test-key&limit=100&type=SWAP", status=500)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "standard",
            })
        assert result["wallet_score"] > 0  # DexScreener succeeded
        assert "dexscreener" in result["sources_used"]

    async def test_echoes_input_params(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = WalletAgent()
        with aioresponses() as mocked:
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_HEALTHY)
            mocked.get(f"{DEXSCREENER_TOKENS_URL}/abc123", payload=MOCK_DEXSCREENER_TX_ORGANIC)
            result = await agent.execute({
                "deployer_address": "dep123", "token_address": "abc123",
                "chain": "solana", "depth": "quick",
            })
        assert result["deployer_address"] == "dep123"
        assert result["token_address"] == "abc123"
        assert result["chain"] == "solana"
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py::TestExecuteIntegration -v`
Expected: 5 PASSED

**Step 3: Commit**

```bash
git add src/agents/tests/test_wallet_agent.py
git commit -m "test: add full execute() integration tests for WalletAgent"
```

---

### Task 12: Full Suite Verification

**Files:** None (verification only)

**Step 1: Run ALL wallet agent tests**

Run: `python3 -m pytest src/agents/tests/test_wallet_agent.py -v`
Expected: 58 PASSED (3+4+8+7+6+5+5+6+6+3+5)

**Step 2: Run ALL project tests**

Run: `python3 -m pytest src/ -v`
Expected: All tests PASS (base + scanner + scorer + safety + quillshield + wallet)

**Step 3: Verify no scratchpad leaked**

Run: `ls data/scratchpad/ 2>/dev/null && echo "LEAK" || echo "CLEAN"`
Expected: `CLEAN`

---

### Final File State Reference

After all tasks, the project should have these new files:

```
src/agents/
    wallet_agent.py                    # WalletAgent class (~400 lines)
    tests/
        test_wallet_agent.py           # 58 tests (~600 lines)
```

`src/agents/wallet_agent.py` contains:
- Constants: `DEXSCREENER_TOKENS_URL`, `HELIUS_API_BASE`, `ALLIUM_API_URL`, `VALID_DEPTHS`, `DEPTH_TIMEOUTS`, `MAX_*`, `LP_LOCK_ADDRESSES`, `BURN_ADDRESSES`
- `WalletAgent(BaseAgent)` with:
  - `execute(params)` — orchestrates 5 analyses + verdict + auto-escalation
  - `_empty_result(...)` — default empty result dict
  - `_analyze_liquidity(token, chain, depth)` — DexScreener liquidity + LP analysis
  - `_analyze_holders(token, deployer, chain, depth)` — Helius holder distribution
  - `_analyze_deployer(deployer, chain, depth)` — Helius deployer reputation
  - `_analyze_tx_flow(token, chain, depth)` — DexScreener TX flow + organic detection
  - `_run_forensics(token, deployer, chain, depth)` — Helius bundled wallet detection
  - `_fetch_allium(deployer)` — stubbed Allium cross-chain API
  - `_compute_verdict(...)` — scoring engine with weight redistribution
