# SafetyAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build SafetyAgent — the Layer 2 (Filter) sub-agent that runs 3 safety sources in parallel (RugCheck, QuillShield, DFlow) and returns a unified safety score with risk flags.

**Architecture:** SafetyAgent inherits BaseAgent. Three private fetch methods run via `asyncio.gather()`. RugCheck calls a real REST API (Solana-only). QuillShield is extracted to `src/scorers/quillshield.py` as a reusable module with its own API calls (DexScreener + Helius + Solana FM). DFlow is stubbed with correct interface. Scores are aggregated via weighted average (RugCheck 30%, QuillShield 50%) plus DFlow additive modifier (-8 to +13). Failed sources are excluded and weights redistributed.

**Tech Stack:** Python 3.9+, aiohttp for HTTP, BaseAgent from src/agents/base_agent.py. Testing: pytest + pytest-asyncio + aioresponses.

**Design doc:** `docs/plans/2026-02-23-safety-agent-design.md`

---

### Task 1: QuillShield Module Skeleton + Authority Scorer

**Files:**
- Create: `src/scorers/__init__.py`
- Create: `src/scorers/tests/__init__.py`
- Create: `src/scorers/tests/test_quillshield.py`
- Create: `src/scorers/quillshield.py`

**Step 1: Write the failing tests**

```python
# src/scorers/tests/test_quillshield.py
import pytest
from src.scorers.quillshield import _score_authority


class TestScoreAuthority:
    def test_all_revoked(self):
        data = {"mint_authority": None, "freeze_authority": None, "update_authority": None}
        assert _score_authority(data) == 25

    def test_none_revoked(self):
        data = {"mint_authority": "wallet1", "freeze_authority": "wallet2", "update_authority": "wallet3"}
        assert _score_authority(data) == 0

    def test_mint_only_revoked(self):
        data = {"mint_authority": None, "freeze_authority": "wallet2", "update_authority": "wallet3"}
        assert _score_authority(data) == 0  # 10 + (-10) + 0 = 0, clamped

    def test_both_authorities_revoked_no_update(self):
        data = {"mint_authority": None, "freeze_authority": None, "update_authority": "wallet3"}
        assert _score_authority(data) == 20  # 10 + 10 + 0

    def test_empty_dict(self):
        assert _score_authority({}) == 0  # all treated as not revoked: -10 + -10 + 0 = -20, clamped to 0
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py::TestScoreAuthority -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.scorers'`

**Step 3: Create package files and implement _score_authority**

```python
# src/scorers/__init__.py
```

```python
# src/scorers/tests/__init__.py
```

```python
# src/scorers/quillshield.py
import asyncio
import aiohttp
from typing import Dict, List

HELIUS_API_URL = "https://api.helius.xyz/v0/token-metadata"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
SOLANA_FM_URL = "https://api.solana.fm/v0/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)


def _score_authority(token_info: Dict) -> int:
    score = 0
    # Mint authority: None means revoked
    if token_info.get("mint_authority") is None:
        score += 10
    else:
        score -= 10
    # Freeze authority: None means revoked
    if token_info.get("freeze_authority") is None:
        score += 10
    else:
        score -= 10
    # Update authority: None means revoked
    if token_info.get("update_authority") is None:
        score += 5
    return max(0, min(25, score))
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py::TestScoreAuthority -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/scorers/__init__.py src/scorers/tests/__init__.py src/scorers/quillshield.py src/scorers/tests/test_quillshield.py
git commit -m "feat: add QuillShield module skeleton with authority scorer"
```

---

### Task 2: QuillShield Liquidity, Holders, and Contract Scorers

**Files:**
- Modify: `src/scorers/tests/test_quillshield.py`
- Modify: `src/scorers/quillshield.py`

**Step 1: Write the failing tests**

Add to `src/scorers/tests/test_quillshield.py`:

```python
from src.scorers.quillshield import _score_authority, _score_liquidity, _score_holders, _score_contract


class TestScoreLiquidity:
    def test_good_ratio_locked_burned(self):
        data = {"liquidity_usd": 600000, "market_cap": 5000000, "lp_locked": True, "lp_burned": True}
        assert _score_liquidity(data) == 25  # ratio 12% > 10% (+10), locked (+10), burned (+5)

    def test_good_ratio_not_locked(self):
        data = {"liquidity_usd": 600000, "market_cap": 5000000, "lp_locked": False, "lp_burned": False}
        assert _score_liquidity(data) == 10  # ratio only

    def test_low_ratio(self):
        data = {"liquidity_usd": 10000, "market_cap": 5000000, "lp_locked": True, "lp_burned": True}
        assert _score_liquidity(data) == 15  # ratio 0.2% < 10% (+0), locked (+10), burned (+5)

    def test_zero_mcap(self):
        data = {"liquidity_usd": 100000, "market_cap": 0, "lp_locked": False, "lp_burned": False}
        assert _score_liquidity(data) == 0  # can't calc ratio, nothing locked

    def test_empty_dict(self):
        assert _score_liquidity({}) == 0


class TestScoreHolders:
    def test_well_distributed(self):
        data = {"top_10_pct": 20.0, "creator_pct": 3.0, "max_single_pct": 5.0}
        assert _score_holders(data) == 25

    def test_concentrated(self):
        data = {"top_10_pct": 50.0, "creator_pct": 10.0, "max_single_pct": 15.0}
        assert _score_holders(data) == 0

    def test_partial_good(self):
        data = {"top_10_pct": 20.0, "creator_pct": 10.0, "max_single_pct": 5.0}
        assert _score_holders(data) == 15  # top10 good (+10), creator bad (+0), whale good (+5)

    def test_empty_dict(self):
        assert _score_holders({}) == 0


class TestScoreContract:
    def test_all_good(self):
        data = {"can_buy": True, "can_sell": True, "tax_pct": 2.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 25

    def test_honeypot(self):
        data = {"can_buy": True, "can_sell": False, "tax_pct": 2.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 15  # no both-ways (+0), low tax (+5), verified (+5), clean (+5)

    def test_high_tax(self):
        data = {"can_buy": True, "can_sell": True, "tax_pct": 10.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 20  # both-ways (+10), high tax (+0), verified (+5), clean (+5)

    def test_all_bad(self):
        data = {"can_buy": True, "can_sell": False, "tax_pct": 10.0, "verified": False, "suspicious_transfers": True}
        assert _score_contract(data) == 0

    def test_empty_dict(self):
        assert _score_contract({}) == 0
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py::TestScoreLiquidity src/scorers/tests/test_quillshield.py::TestScoreHolders src/scorers/tests/test_quillshield.py::TestScoreContract -v`
Expected: FAIL — `ImportError: cannot import name '_score_liquidity'`

**Step 3: Implement the three scorers**

Add to `src/scorers/quillshield.py`:

```python
def _score_liquidity(pair_data: Dict) -> int:
    score = 0
    liquidity = pair_data.get("liquidity_usd", 0)
    mcap = pair_data.get("market_cap", 0)
    if mcap > 0 and (liquidity / mcap) >= 0.10:
        score += 10
    if pair_data.get("lp_locked", False):
        score += 10
    if pair_data.get("lp_burned", False):
        score += 5
    return min(25, score)


def _score_holders(holders_data: Dict) -> int:
    score = 0
    if holders_data.get("top_10_pct", 100) < 30:
        score += 10
    if holders_data.get("creator_pct", 100) < 5:
        score += 10
    if holders_data.get("max_single_pct", 100) <= 10:
        score += 5
    return min(25, score)


def _score_contract(contract_data: Dict) -> int:
    score = 0
    if contract_data.get("can_buy", False) and contract_data.get("can_sell", False):
        score += 10
    if contract_data.get("tax_pct", 100) <= 5:
        score += 5
    if contract_data.get("verified", False):
        score += 5
    if not contract_data.get("suspicious_transfers", True):
        score += 5
    return min(25, score)
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py -v`
Expected: 18 PASSED (5 authority + 5 liquidity + 4 holders + 4 contract)

**Step 5: Commit**

```bash
git add src/scorers/quillshield.py src/scorers/tests/test_quillshield.py
git commit -m "feat: add QuillShield liquidity, holders, and contract scorers"
```

---

### Task 3: QuillShield score() Async Orchestrator

**Files:**
- Modify: `src/scorers/tests/test_quillshield.py`
- Modify: `src/scorers/quillshield.py`

**Step 1: Write the failing tests**

Add to `src/scorers/tests/test_quillshield.py`:

```python
import os
from unittest.mock import patch, AsyncMock
from aioresponses import aioresponses
from src.scorers.quillshield import score


MOCK_DEXSCREENER_RESPONSE = {
    "pairs": [{
        "liquidity": {"usd": 600000},
        "marketCap": 5000000,
        "txns": {"h24": {"buys": 100, "sells": 80}},
    }]
}

MOCK_HELIUS_RESPONSE = [{
    "onChainAccountInfo": {
        "accountInfo": {
            "data": {
                "parsed": {
                    "info": {
                        "mintAuthority": None,
                        "freezeAuthority": None,
                    }
                }
            }
        }
    },
    "onChainMetadata": {
        "metadata": {
            "updateAuthority": None,
        }
    }
}]

MOCK_SOLANA_FM_RESPONSE = {
    "result": [
        {"info": {"owner": "wallet1", "amount": 200000}},
        {"info": {"owner": "wallet2", "amount": 100000}},
        {"info": {"owner": "wallet3", "amount": 80000}},
        {"info": {"owner": "wallet4", "amount": 70000}},
        {"info": {"owner": "wallet5", "amount": 60000}},
        {"info": {"owner": "wallet6", "amount": 50000}},
        {"info": {"owner": "wallet7", "amount": 40000}},
        {"info": {"owner": "wallet8", "amount": 30000}},
        {"info": {"owner": "wallet9", "amount": 20000}},
        {"info": {"owner": "wallet10", "amount": 10000}},
    ],
    "totalSupply": 1000000,
}


class TestScore:
    async def test_returns_score_and_breakdown(self, monkeypatch):
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                payload=MOCK_DEXSCREENER_RESPONSE,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                payload=MOCK_HELIUS_RESPONSE,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                payload=MOCK_SOLANA_FM_RESPONSE,
            )
            result = await score("abc123", "solana")

        assert "score" in result
        assert "breakdown" in result
        assert "available" in result
        assert result["available"] is True
        assert result["breakdown"]["authority"] == 25

    async def test_returns_flags_list(self, monkeypatch):
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                payload=MOCK_DEXSCREENER_RESPONSE,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                payload=MOCK_HELIUS_RESPONSE,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                payload=MOCK_SOLANA_FM_RESPONSE,
            )
            result = await score("abc123", "solana")

        assert "flags" in result
        assert isinstance(result["flags"], list)

    async def test_returns_unavailable_on_all_errors(self, monkeypatch):
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                status=500,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                status=500,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                status=500,
            )
            result = await score("abc123", "solana")

        assert result["available"] is False
        assert result["score"] == 0
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py::TestScore -v`
Expected: FAIL — `ImportError: cannot import name 'score'`

**Step 3: Implement API fetchers and score() orchestrator**

Add to `src/scorers/quillshield.py`:

```python
import os


async def _fetch_dexscreener(address: str) -> Dict:
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.get(f"{DEXSCREENER_TOKENS_URL}/{address}") as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                pair = data.get("pairs", [{}])[0]
                txns = pair.get("txns", {}).get("h24", {})
                return {
                    "liquidity_usd": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                    "market_cap": float(pair.get("marketCap", 0) or 0),
                    "can_buy": txns.get("buys", 0) > 0,
                    "can_sell": txns.get("sells", 0) > 0,
                    "tax_pct": 0.0,  # DexScreener doesn't provide tax directly
                    "verified": False,  # determined from Helius
                    "suspicious_transfers": False,
                    "lp_locked": False,  # would need on-chain check
                    "lp_burned": False,
                }
    except Exception:
        return {}


async def _fetch_helius(address: str) -> Dict:
    api_key = os.environ.get("HELIUS_API_KEY", "")
    if not api_key:
        return {}
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.post(
                f"{HELIUS_API_URL}?api-key={api_key}",
                json={"mintAccounts": [address]},
            ) as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                if not data:
                    return {}
                item = data[0]
                parsed = (item.get("onChainAccountInfo", {})
                          .get("accountInfo", {})
                          .get("data", {})
                          .get("parsed", {})
                          .get("info", {}))
                metadata = (item.get("onChainMetadata", {})
                            .get("metadata", {}))
                return {
                    "mint_authority": parsed.get("mintAuthority"),
                    "freeze_authority": parsed.get("freezeAuthority"),
                    "update_authority": metadata.get("updateAuthority"),
                }
    except Exception:
        return {}


async def _fetch_solana_fm(address: str) -> Dict:
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.get(f"{SOLANA_FM_URL}/{address}/holders") as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                holders = data.get("result", [])
                total_supply = data.get("totalSupply", 0)
                if not holders or total_supply <= 0:
                    return {}

                amounts = sorted(
                    [h.get("info", {}).get("amount", 0) for h in holders],
                    reverse=True,
                )
                top_10_total = sum(amounts[:10])
                top_10_pct = (top_10_total / total_supply) * 100
                creator_pct = (amounts[0] / total_supply) * 100 if amounts else 100
                max_single_pct = (max(amounts) / total_supply) * 100 if amounts else 100

                return {
                    "top_10_pct": top_10_pct,
                    "creator_pct": creator_pct,
                    "max_single_pct": max_single_pct,
                }
    except Exception:
        return {}


def _collect_flags(authority: int, liquidity: int, holders: int, contract: int) -> List[str]:
    flags = []
    threshold = 13  # 50% of 25
    if authority < threshold:
        flags.append("authority_risk")
    if liquidity < threshold:
        flags.append("lp_not_locked")
    if holders < threshold:
        flags.append("top_holders_concentrated")
    if contract < threshold:
        flags.append("contract_risk")
    return flags


async def score(address: str, chain: str) -> Dict:
    """Run QuillShield safety analysis on a token. Returns 0-100 score."""
    try:
        dex_data, helius_data, holders_data = await asyncio.gather(
            _fetch_dexscreener(address),
            _fetch_helius(address),
            _fetch_solana_fm(address),
        )
    except Exception:
        return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    # If all sources failed, mark unavailable
    if not dex_data and not helius_data and not holders_data:
        return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    # Merge dex_data fields into contract_data for _score_contract
    contract_data = dict(dex_data)
    if helius_data:
        contract_data["verified"] = helius_data.get("update_authority") is None

    authority = _score_authority(helius_data)
    liquidity = _score_liquidity(dex_data)
    holders = _score_holders(holders_data)
    contract = _score_contract(contract_data)

    total = authority + liquidity + holders + contract
    flags = _collect_flags(authority, liquidity, holders, contract)

    return {
        "score": total,
        "breakdown": {
            "authority": authority,
            "liquidity": liquidity,
            "holders": holders,
            "contract": contract,
        },
        "flags": flags,
        "available": True,
    }
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/scorers/tests/test_quillshield.py -v`
Expected: 21 PASSED (18 unit + 3 integration)

**Step 5: Commit**

```bash
git add src/scorers/quillshield.py src/scorers/tests/test_quillshield.py
git commit -m "feat: add QuillShield score() orchestrator with API fetchers"
```

---

### Task 4: SafetyAgent Skeleton

**Files:**
- Create: `src/agents/tests/test_safety_agent.py`
- Create: `src/agents/safety_agent.py`

**Step 1: Write the failing tests**

```python
# src/agents/tests/test_safety_agent.py
import pytest
from src.agents.safety_agent import SafetyAgent
from src.agents.base_agent import BaseAgent


class TestSafetyAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_safety(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.name == "safety"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.status == "idle"
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestSafetyAgentInit -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.agents.safety_agent'`

**Step 3: Create minimal safety_agent.py**

```python
# src/agents/safety_agent.py
import asyncio
import aiohttp
from typing import Dict, List
from src.agents.base_agent import BaseAgent

RUGCHECK_API_URL = "https://api.rugcheck.xyz/v1/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)

TIER_1_DEXES = {"jupiter", "raydium", "orca", "uniswap", "sushiswap", "curve", "pancakeswap"}

RUGCHECK_WEIGHT = 0.3
QUILLSHIELD_WEIGHT = 0.5


class SafetyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="safety")

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestSafetyAgentInit -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/safety_agent.py src/agents/tests/test_safety_agent.py
git commit -m "feat: add SafetyAgent skeleton inheriting BaseAgent"
```

---

### Task 5: _fetch_rugcheck + _map_rugcheck_score

**Files:**
- Modify: `src/agents/tests/test_safety_agent.py`
- Modify: `src/agents/safety_agent.py`

RugCheck.xyz API returns contract safety data. Score mapping starts at 100 and deducts per risk.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_safety_agent.py`:

```python
from aioresponses import aioresponses

RUGCHECK_API_URL = "https://api.rugcheck.xyz/v1/tokens"

MOCK_RUGCHECK_SAFE = {
    "mint": "abc123",
    "risks": [],
    "score": 10,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}

MOCK_RUGCHECK_RISKY = {
    "mint": "abc123",
    "risks": [
        {"name": "Mutable metadata", "level": "warn", "description": "..."},
        {"name": "Low liquidity", "level": "danger", "description": "..."},
    ],
    "score": 800,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}

MOCK_RUGCHECK_HONEYPOT = {
    "mint": "abc123",
    "risks": [
        {"name": "Honeypot", "level": "danger", "description": "Cannot sell"},
    ],
    "score": 3000,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}


class TestMapRugcheckScore:
    def test_no_risks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent._map_rugcheck_score(MOCK_RUGCHECK_SAFE) == 100

    def test_some_risks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        score = agent._map_rugcheck_score(MOCK_RUGCHECK_RISKY)
        assert score == 80  # 100 - 10 - 10

    def test_honeypot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        score = agent._map_rugcheck_score(MOCK_RUGCHECK_HONEYPOT)
        assert score == 50  # 100 - 40 - 10

    def test_empty_report(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent._map_rugcheck_score({}) == 100


class TestFetchRugcheck:
    async def test_returns_result_for_solana(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with aioresponses() as mocked:
            mocked.get(
                f"{RUGCHECK_API_URL}/abc123/report",
                payload=MOCK_RUGCHECK_SAFE,
            )
            result = await agent._fetch_rugcheck("abc123", "solana")

        assert result["available"] is True
        assert result["score"] == 100
        assert result["is_honeypot"] is False

    async def test_detects_honeypot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with aioresponses() as mocked:
            mocked.get(
                f"{RUGCHECK_API_URL}/abc123/report",
                payload=MOCK_RUGCHECK_HONEYPOT,
            )
            result = await agent._fetch_rugcheck("abc123", "solana")

        assert result["is_honeypot"] is True

    async def test_returns_unavailable_for_non_solana(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_rugcheck("abc123", "ethereum")
        assert result["available"] is False
        assert result["score"] == 0

    async def test_returns_unavailable_on_api_error(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with aioresponses() as mocked:
            mocked.get(f"{RUGCHECK_API_URL}/abc123/report", status=500)
            result = await agent._fetch_rugcheck("abc123", "solana")

        assert result["available"] is False

    async def test_extracts_risk_names(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with aioresponses() as mocked:
            mocked.get(
                f"{RUGCHECK_API_URL}/abc123/report",
                payload=MOCK_RUGCHECK_RISKY,
            )
            result = await agent._fetch_rugcheck("abc123", "solana")

        assert "Mutable metadata" in result["risks"]
        assert "Low liquidity" in result["risks"]
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestMapRugcheckScore src/agents/tests/test_safety_agent.py::TestFetchRugcheck -v`
Expected: FAIL — `AttributeError: 'SafetyAgent' object has no attribute '_map_rugcheck_score'`

**Step 3: Implement _map_rugcheck_score and _fetch_rugcheck**

Add to `SafetyAgent` class in `src/agents/safety_agent.py`:

```python
    def _map_rugcheck_score(self, report: Dict) -> int:
        score = 100
        risks = report.get("risks", [])
        for risk in risks:
            name = risk.get("name", "").lower()
            if "honeypot" in name:
                score -= 40
            elif "mint" in name and "authority" in name:
                score -= 20
            elif "freeze" in name and "authority" in name:
                score -= 15
            else:
                score -= 10
        return max(0, score)

    async def _fetch_rugcheck(self, address: str, chain: str) -> Dict:
        empty = {"score": 0, "is_honeypot": False, "risks": [], "available": False}
        if chain.lower() != "solana":
            self.log_event("decision", f"RugCheck skipped — chain '{chain}' not supported")
            return empty

        self.log_event("action", "Calling RugCheck API", {"address": address})
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                async with session.get(f"{RUGCHECK_API_URL}/{address}/report") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"RugCheck returned {resp.status}")
                    report = await resp.json()

            risk_names = [r.get("name", "") for r in report.get("risks", [])]
            is_honeypot = any("honeypot" in n.lower() for n in risk_names)
            score = self._map_rugcheck_score(report)

            self.log_event("observation", f"RugCheck score: {score}, honeypot: {is_honeypot}")
            return {
                "score": score,
                "is_honeypot": is_honeypot,
                "risks": risk_names,
                "available": True,
            }
        except Exception as e:
            self.log_event("error", f"RugCheck API failed: {e}")
            return empty
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py -v`
Expected: 12 PASSED (3 init + 4 map + 5 fetch)

**Step 5: Commit**

```bash
git add src/agents/safety_agent.py src/agents/tests/test_safety_agent.py
git commit -m "feat: add RugCheck API fetch with score mapping"
```

---

### Task 6: _fetch_dflow Stub + _calculate_dflow_modifier

**Files:**
- Modify: `src/agents/tests/test_safety_agent.py`
- Modify: `src/agents/safety_agent.py`

DFlow is stubbed. Modifier calculation implements all 6 rules from Master Ops §6.3.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_safety_agent.py`:

```python
class TestFetchDflow:
    async def test_returns_unavailable_stub(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_dflow("abc123", "solana")
        assert result["available"] is False

    async def test_returns_expected_structure(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_dflow("abc123", "solana")
        assert "routes_found" in result
        assert "best_slippage" in result
        assert "best_dex" in result
        assert "orderbook_depth" in result


class TestCalculateDflowModifier:
    def test_3_plus_routes_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 3, "best_slippage": 2.0, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 5

    def test_low_slippage_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 0.5, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 3

    def test_tier1_dex_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 2.0, "best_dex": "jupiter", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 3

    def test_high_orderbook_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 2.0, "best_dex": "unknown", "orderbook_depth": 60000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 2

    def test_no_routes_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": True}
        assert agent._calculate_dflow_modifier(result) == -5

    def test_high_slippage_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 6.0, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == -3

    def test_all_bonuses_stacked(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 5, "best_slippage": 0.3, "best_dex": "jupiter", "orderbook_depth": 100000, "available": True}
        # +5 (routes) + +3 (slippage) + +3 (tier1) + +2 (orderbook) = +13
        assert agent._calculate_dflow_modifier(result) == 13

    def test_unavailable_returns_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
        assert agent._calculate_dflow_modifier(result) == 0

    def test_no_routes_and_high_slippage(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 7.0, "best_dex": "", "orderbook_depth": 0, "available": True}
        # -5 (no routes) + -3 (high slippage) = -8
        assert agent._calculate_dflow_modifier(result) == -8
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestFetchDflow src/agents/tests/test_safety_agent.py::TestCalculateDflowModifier -v`
Expected: FAIL — `AttributeError: 'SafetyAgent' object has no attribute '_fetch_dflow'`

**Step 3: Implement _fetch_dflow and _calculate_dflow_modifier**

Add to `SafetyAgent` class:

```python
    async def _fetch_dflow(self, address: str, chain: str) -> Dict:
        self.log_event("decision", "DFlow MCP stubbed — integration pending")
        return {
            "routes_found": 0,
            "best_slippage": 0.0,
            "best_dex": "",
            "orderbook_depth": 0.0,
            "available": False,
        }

    def _calculate_dflow_modifier(self, dflow_result: Dict) -> int:
        if not dflow_result.get("available", False):
            return 0

        modifier = 0
        routes = dflow_result.get("routes_found", 0)
        slippage = dflow_result.get("best_slippage", 0.0)
        dex = dflow_result.get("best_dex", "").lower()
        orderbook = dflow_result.get("orderbook_depth", 0.0)

        # Bonuses
        if routes >= 3:
            modifier += 5
        if slippage > 0 and slippage < 1.0:
            modifier += 3
        if dex in TIER_1_DEXES:
            modifier += 3
        if orderbook > 50000:
            modifier += 2

        # Penalties
        if routes == 0:
            modifier -= 5
        if slippage > 5.0:
            modifier -= 3

        return modifier
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py -v`
Expected: 23 PASSED (3 + 4 + 5 + 2 + 9)

**Step 5: Commit**

```bash
git add src/agents/safety_agent.py src/agents/tests/test_safety_agent.py
git commit -m "feat: add DFlow stub and modifier calculation with 6 rules"
```

---

### Task 7: _collect_risk_flags + _aggregate_score

**Files:**
- Modify: `src/agents/tests/test_safety_agent.py`
- Modify: `src/agents/safety_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_safety_agent.py`:

```python
class TestCollectRiskFlags:
    def test_no_flags_when_all_clean(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert flags == []

    def test_honeypot_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": True, "risks": ["Honeypot"], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "honeypot_detected" in flags

    def test_quillshield_flags_forwarded(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 5, "liquidity": 5, "holders": 5, "contract": 5}, "flags": ["authority_risk", "lp_not_locked", "top_holders_concentrated", "contract_risk"], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "authority_risk" in flags
        assert "lp_not_locked" in flags

    def test_dflow_no_routes_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 0, "best_slippage": 0.0, "orderbook_depth": 0, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "no_swap_routes" in flags

    def test_dflow_high_slippage_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 1, "best_slippage": 6.0, "orderbook_depth": 5000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "high_slippage" in flags
        assert "low_orderbook_depth" in flags


class TestAggregateScore:
    def test_both_sources_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 60, "available": True}
        # weighted: 80*0.375 + 60*0.625 = 30 + 37.5 = 67.5 -> 68
        # Wait — weights are 0.3 and 0.5, total 0.8. Redistributed: 0.3/0.8=0.375, 0.5/0.8=0.625
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 68  # round(80*0.375 + 60*0.625)

    def test_only_rugcheck_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 0, "available": False}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 80  # 100% weight on rugcheck

    def test_only_quillshield_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 0, "available": False}
        quillshield = {"score": 70, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 70  # 100% weight on quillshield

    def test_neither_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 0, "available": False}
        quillshield = {"score": 0, "available": False}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 0

    def test_dflow_modifier_applied(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 60, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 13)
        # 68 + 13 = 81
        assert score == 81

    def test_score_clamped_to_100(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 100, "available": True}
        quillshield = {"score": 100, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 13)
        assert score == 100

    def test_score_clamped_to_0(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 5, "available": True}
        quillshield = {"score": 5, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, -8)
        assert score == 0  # ~5 - 8 clamped to 0
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestCollectRiskFlags src/agents/tests/test_safety_agent.py::TestAggregateScore -v`
Expected: FAIL — `AttributeError`

**Step 3: Implement _collect_risk_flags and _aggregate_score**

Add to `SafetyAgent` class:

```python
    def _collect_risk_flags(self, rugcheck: Dict, quillshield: Dict, dflow: Dict) -> List[str]:
        flags = []

        # RugCheck flags
        if rugcheck.get("available", False):
            if rugcheck.get("is_honeypot", False):
                flags.append("honeypot_detected")
            for risk in rugcheck.get("risks", []):
                name = risk.lower() if isinstance(risk, str) else ""
                if "mint" in name and "authority" in name:
                    flags.append("mint_authority_active")
                elif "freeze" in name and "authority" in name:
                    flags.append("freeze_authority_active")

        # QuillShield flags (forwarded from module)
        if quillshield.get("available", False):
            flags.extend(quillshield.get("flags", []))

        # DFlow flags
        if dflow.get("available", False):
            if dflow.get("routes_found", 0) == 0:
                flags.append("no_swap_routes")
            if dflow.get("best_slippage", 0) > 5.0:
                flags.append("high_slippage")
            if dflow.get("orderbook_depth", 0) < 10000:
                flags.append("low_orderbook_depth")

        return flags

    def _aggregate_score(self, rugcheck: Dict, quillshield: Dict, dflow_modifier: int) -> int:
        sources = []
        if rugcheck.get("available", False):
            sources.append((rugcheck["score"], RUGCHECK_WEIGHT))
        if quillshield.get("available", False):
            sources.append((quillshield["score"], QUILLSHIELD_WEIGHT))

        if not sources:
            return 0

        total_weight = sum(w for _, w in sources)
        weighted_avg = sum(s * (w / total_weight) for s, w in sources)
        score = round(weighted_avg) + dflow_modifier
        return max(0, min(100, score))
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py -v`
Expected: 35 PASSED (3 + 4 + 5 + 2 + 9 + 5 + 7)

**Step 5: Commit**

```bash
git add src/agents/safety_agent.py src/agents/tests/test_safety_agent.py
git commit -m "feat: add risk flag collection and weighted score aggregation"
```

---

### Task 8: execute() with Full Pipeline

**Files:**
- Modify: `src/agents/tests/test_safety_agent.py`
- Modify: `src/agents/safety_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_safety_agent.py`:

```python
from unittest.mock import patch, AsyncMock


class TestExecute:
    async def test_returns_safety_score(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert "safety_score" in result
        assert isinstance(result["safety_score"], int)
        assert 0 <= result["safety_score"] <= 100

    async def test_returns_is_safe_boolean(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert "is_safe" in result
        assert result["is_safe"] is True  # score ~74 >= 60

    async def test_returns_individual_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert "sources" in result
        assert "rugcheck" in result["sources"]
        assert "quillshield" in result["sources"]
        assert "dflow" in result["sources"]

    async def test_returns_risk_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 50, "is_honeypot": True, "risks": ["Honeypot"], "available": True}
            mock_qs.return_value = {"score": 30, "breakdown": {"authority": 5, "liquidity": 5, "holders": 10, "contract": 10}, "flags": ["authority_risk", "lp_not_locked"], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert "honeypot_detected" in result["risk_flags"]
        assert "authority_risk" in result["risk_flags"]

    async def test_returns_dflow_modifier(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert "dflow_modifier" in result

    async def test_unsafe_token(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 20, "is_honeypot": True, "risks": ["Honeypot"], "available": True}
            mock_qs.return_value = {"score": 30, "breakdown": {"authority": 5, "liquidity": 5, "holders": 10, "contract": 10}, "flags": ["authority_risk"], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert result["is_safe"] is False  # score ~26 < 60

    async def test_writes_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            await agent.execute({"contract_address": "abc123", "chain": "solana"})

        saved = agent.read_scratchpad("safety_abc123")
        assert saved is not None
        assert "safety_score" in saved

    async def test_returns_contract_address_and_chain(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()

        with patch.object(agent, "_fetch_rugcheck", new_callable=AsyncMock) as mock_rc, \
             patch.object(agent, "_fetch_quillshield", new_callable=AsyncMock) as mock_qs, \
             patch.object(agent, "_fetch_dflow", new_callable=AsyncMock) as mock_df:
            mock_rc.return_value = {"score": 80, "is_honeypot": False, "risks": [], "available": True}
            mock_qs.return_value = {"score": 70, "breakdown": {"authority": 20, "liquidity": 15, "holders": 20, "contract": 15}, "flags": [], "available": True}
            mock_df.return_value = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
            result = await agent.execute({"contract_address": "abc123", "chain": "solana"})

        assert result["contract_address"] == "abc123"
        assert result["chain"] == "solana"

    async def test_missing_contract_address(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent.execute({"chain": "solana"})
        assert result["safety_score"] == 0
        assert result["is_safe"] is False

    async def test_missing_chain(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent.execute({"contract_address": "abc123"})
        assert result["safety_score"] == 0
        assert result["is_safe"] is False
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestExecute -v`
Expected: FAIL — `NotImplementedError: TODO`

**Step 3: Implement _fetch_quillshield and execute()**

Add `_fetch_quillshield` and replace `execute()` in `SafetyAgent`:

```python
    async def _fetch_quillshield(self, address: str, chain: str) -> Dict:
        self.log_event("action", "Running QuillShield analysis", {"address": address})
        try:
            from src.scorers.quillshield import score as qs_score
            result = await qs_score(address, chain)
            self.log_event("observation", f"QuillShield score: {result.get('score', 0)}")
            return result
        except Exception as e:
            self.log_event("error", f"QuillShield failed: {e}")
            return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    async def execute(self, params: Dict) -> Dict:
        address = params.get("contract_address", "")
        chain = params.get("chain", "")

        # Validate input
        if not address or not chain:
            self.log_event("error", "Missing contract_address or chain")
            return {
                "contract_address": address,
                "chain": chain,
                "safety_score": 0,
                "is_safe": False,
                "sources": {
                    "rugcheck": {"score": 0, "is_honeypot": False, "risks": [], "available": False},
                    "quillshield": {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False},
                    "dflow": {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0.0, "available": False},
                },
                "risk_flags": [],
                "dflow_modifier": 0,
            }

        self.log_event("action", f"Starting safety check for {address} on {chain}")

        # Run all sources in parallel
        rugcheck, quillshield, dflow = await asyncio.gather(
            self._fetch_rugcheck(address, chain),
            self._fetch_quillshield(address, chain),
            self._fetch_dflow(address, chain),
        )

        # Calculate DFlow modifier
        dflow_modifier = self._calculate_dflow_modifier(dflow)

        # Collect risk flags
        risk_flags = self._collect_risk_flags(rugcheck, quillshield, dflow)

        # Aggregate score
        safety_score = self._aggregate_score(rugcheck, quillshield, dflow_modifier)
        is_safe = safety_score >= 60

        safe_label = "SAFE" if is_safe else "UNSAFE"
        self.log_event("decision", f"Safety score: {safety_score} ({safe_label}), {len(risk_flags)} risk flags", {
            "safety_score": safety_score,
            "is_safe": is_safe,
            "risk_flags": risk_flags,
        })

        result = {
            "contract_address": address,
            "chain": chain,
            "safety_score": safety_score,
            "is_safe": is_safe,
            "sources": {
                "rugcheck": rugcheck,
                "quillshield": quillshield,
                "dflow": dflow,
            },
            "risk_flags": risk_flags,
            "dflow_modifier": dflow_modifier,
        }

        self.write_scratchpad(f"safety_{address}", result)
        return result
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_safety_agent.py::TestExecute -v`
Expected: 10 PASSED

Also run ALL safety agent tests:
Run: `python3 -m pytest src/agents/tests/test_safety_agent.py -v`
Expected: 45 PASSED (3 + 4 + 5 + 2 + 9 + 5 + 7 + 10)

**Step 5: Commit**

```bash
git add src/agents/safety_agent.py src/agents/tests/test_safety_agent.py
git commit -m "feat: add execute() with full safety pipeline"
```

---

### Task 9: Full Test Suite Verification

**Files:** None (verification only)

**Step 1: Run ALL tests (BaseAgent + ScannerAgent + ScorerAgent + SafetyAgent + QuillShield)**

Run: `python3 -m pytest src/ -v`
Expected: All tests PASS

**Step 2: Verify no scratchpad leaked**

Run: `ls data/scratchpad/ 2>/dev/null && echo "LEAK" || echo "CLEAN"`
Expected: `CLEAN`

---

### Final File State Reference

After all tasks, the project should have these new/modified files:

```
src/
├── scorers/
│   ├── __init__.py                        # empty
│   ├── quillshield.py                     # QuillShield scoring module
│   └── tests/
│       ├── __init__.py                    # empty
│       └── test_quillshield.py            # 21 tests
└── agents/
    ├── safety_agent.py                    # SafetyAgent class
    └── tests/
        └── test_safety_agent.py           # 45 tests
```

`src/scorers/quillshield.py` exports:
- `score(address, chain) -> Dict` (async, main entry point)
- `_score_authority(token_info) -> int`
- `_score_liquidity(pair_data) -> int`
- `_score_holders(holders_data) -> int`
- `_score_contract(contract_data) -> int`
- `_fetch_dexscreener(address) -> Dict`
- `_fetch_helius(address) -> Dict`
- `_fetch_solana_fm(address) -> Dict`
- `_collect_flags(authority, liquidity, holders, contract) -> List[str]`

`src/agents/safety_agent.py` contains:
- Constants: `RUGCHECK_API_URL`, `SOURCE_TIMEOUT`, `TIER_1_DEXES`, `RUGCHECK_WEIGHT`, `QUILLSHIELD_WEIGHT`
- `SafetyAgent(BaseAgent)` with:
  - `execute(params)` — orchestrates all sources via asyncio.gather
  - `_fetch_rugcheck(address, chain)` — real RugCheck API (Solana-only)
  - `_fetch_quillshield(address, chain)` — delegates to quillshield module
  - `_fetch_dflow(address, chain)` — stub returning unavailable
  - `_map_rugcheck_score(report)` — risk-based deduction from 100
  - `_calculate_dflow_modifier(dflow_result)` — 6 rules, range -8 to +13
  - `_collect_risk_flags(rugcheck, quillshield, dflow)` — flat list of risk strings
  - `_aggregate_score(rugcheck, quillshield, dflow_modifier)` — weighted average + modifier
