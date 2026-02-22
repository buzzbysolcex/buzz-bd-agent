# ScannerAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ScannerAgent — the Layer 1 (Cast the Net) sub-agent that queries DexScreener, CoinGecko, and AIXBT in parallel and returns deduplicated token candidates.

**Architecture:** ScannerAgent inherits BaseAgent. Three private async fetcher methods run via asyncio.gather(). Each fetcher normalizes results to a common token schema. A _deduplicate method merges by (chain, contract_address) and tracks which sources found each token.

**Tech Stack:** Python 3.9+, aiohttp (HTTP client), aioresponses (test mocking), BaseAgent from src/agents/base_agent.py.

**Design doc:** `docs/plans/2026-02-23-scanner-agent-design.md`

---

### Task 1: Add aiohttp and aioresponses Dependencies

**Files:**
- Modify: `requirements-dev.txt`

**Step 1: Add aiohttp and aioresponses to requirements-dev.txt**

The file currently contains:
```
pytest>=7.0
pytest-asyncio>=0.21
```

Update it to:
```
pytest>=7.0
pytest-asyncio>=0.21
aiohttp>=3.9
aioresponses>=0.7
```

**Step 2: Install dependencies**

Run: `pip3 install -r requirements-dev.txt`
Expected: Successfully installed aiohttp and aioresponses

**Step 3: Verify imports work**

Run: `python3 -c "import aiohttp; import aioresponses; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add requirements-dev.txt
git commit -m "chore: add aiohttp and aioresponses dependencies"
```

---

### Task 2: Test — ScannerAgent Inherits BaseAgent

**Files:**
- Create: `src/agents/tests/test_scanner_agent.py`
- Create: `src/agents/scanner_agent.py`

**Step 1: Write the failing tests**

```python
# src/agents/tests/test_scanner_agent.py
import pytest
from src.agents.scanner_agent import ScannerAgent
from src.agents.base_agent import BaseAgent


class TestScannerAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_scanner(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        assert agent.name == "scanner"

    def test_default_chains(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        assert agent.chains == ["solana", "ethereum", "base"]

    def test_custom_chains(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])
        assert agent.chains == ["solana"]

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        assert agent.status == "idle"
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestScannerAgentInit -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.agents.scanner_agent'`

**Step 3: Create minimal scanner_agent.py**

```python
# src/agents/scanner_agent.py
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEFAULT_CHAINS = ["solana", "ethereum", "base"]


class ScannerAgent(BaseAgent):
    def __init__(self, chains: Optional[List[str]] = None):
        super().__init__(name="scanner")
        self.chains = chains or DEFAULT_CHAINS

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestScannerAgentInit -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add ScannerAgent skeleton inheriting BaseAgent"
```

---

### Task 3: Test — DexScreener Fetcher

**Files:**
- Modify: `src/agents/tests/test_scanner_agent.py`
- Modify: `src/agents/scanner_agent.py`

This task tests the `_fetch_dexscreener` method using aioresponses to mock the HTTP calls.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scanner_agent.py`:

```python
import json
from aioresponses import aioresponses


DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1"

MOCK_DEXSCREENER_BOOSTS = [
    {
        "url": "https://dexscreener.com/solana/abc123",
        "chainId": "solana",
        "tokenAddress": "abc123solana",
        "description": "Test Token A",
        "icon": "",
        "links": []
    },
    {
        "url": "https://dexscreener.com/ethereum/def456",
        "chainId": "ethereum",
        "tokenAddress": "def456eth",
        "description": "Test Token B",
        "icon": "",
        "links": []
    },
    {
        "url": "https://dexscreener.com/bsc/ghi789",
        "chainId": "bsc",
        "tokenAddress": "ghi789bsc",
        "description": "BSC Token (should be filtered out)",
        "icon": "",
        "links": []
    }
]

# DexScreener search returns pair data with mcap/volume/liquidity
MOCK_DEXSCREENER_SEARCH = {
    "pairs": [
        {
            "chainId": "solana",
            "baseToken": {"address": "abc123solana", "name": "Token A", "symbol": "TKNA"},
            "priceUsd": "0.50",
            "marketCap": 5000000,
            "liquidity": {"usd": 800000},
            "volume": {"h24": 1200000},
            "url": "https://dexscreener.com/solana/abc123"
        }
    ]
}


class TestFetchDexscreener:
    async def test_returns_list_of_tokens(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            tokens = await agent._fetch_dexscreener(["solana"])

        assert isinstance(tokens, list)
        assert len(tokens) >= 1

    async def test_token_has_required_fields(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            tokens = await agent._fetch_dexscreener(["solana"])

        token = tokens[0]
        assert "contract_address" in token
        assert "chain" in token
        assert "name" in token
        assert "symbol" in token
        assert "mcap" in token
        assert "volume_24h" in token
        assert "liquidity" in token
        assert "source" in token
        assert token["source"] == "dexscreener"

    async def test_filters_by_chain(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            tokens = await agent._fetch_dexscreener(["solana"])

        chains = [t["chain"] for t in tokens]
        assert "bsc" not in chains

    async def test_returns_empty_on_error(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, status=500)
            tokens = await agent._fetch_dexscreener(["solana"])

        assert tokens == []

    async def test_logs_error_event_on_failure(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, status=500)
            await agent._fetch_dexscreener(["solana"])

        error_events = [e for e in agent.events if e["type"] == "error"]
        assert len(error_events) >= 1
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchDexscreener -v`
Expected: FAIL — `AttributeError: 'ScannerAgent' object has no attribute '_fetch_dexscreener'`

**Step 3: Implement _fetch_dexscreener**

Add to `src/agents/scanner_agent.py`:

```python
import asyncio
import aiohttp

DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)
```

Add this method to `ScannerAgent`:

```python
async def _fetch_dexscreener(self, chains: List[str]) -> List[Dict]:
    self.log_event("action", "Fetching DexScreener boosts", {"chains": chains})
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            # Step 1: Get boosted token addresses
            async with session.get(DEXSCREENER_BOOSTS_URL) as resp:
                if resp.status != 200:
                    raise aiohttp.ClientError(f"DexScreener boosts returned {resp.status}")
                boosts = await resp.json()

            # Filter by requested chains
            chain_set = set(c.lower() for c in chains)
            filtered = [b for b in boosts if b.get("chainId", "").lower() in chain_set]

            # Step 2: Look up token details for each address
            tokens = []
            for boost in filtered[:20]:  # cap at 20 to avoid hammering API
                address = boost.get("tokenAddress", "")
                if not address:
                    continue
                try:
                    async with session.get(f"{DEXSCREENER_TOKENS_URL}/{address}") as detail_resp:
                        if detail_resp.status != 200:
                            continue
                        detail = await detail_resp.json()
                        for pair in detail.get("pairs", [])[:1]:  # take first pair
                            tokens.append({
                                "contract_address": pair.get("baseToken", {}).get("address", address),
                                "chain": pair.get("chainId", boost.get("chainId", "")),
                                "name": pair.get("baseToken", {}).get("name", ""),
                                "symbol": pair.get("baseToken", {}).get("symbol", ""),
                                "mcap": float(pair.get("marketCap", 0) or 0),
                                "volume_24h": float(pair.get("volume", {}).get("h24", 0) or 0),
                                "liquidity": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                                "source": "dexscreener",
                                "source_url": pair.get("url", boost.get("url", "")),
                            })
                except Exception:
                    continue  # skip individual token failures

            self.log_event("observation", f"DexScreener returned {len(tokens)} tokens")
            return tokens

    except Exception as e:
        self.log_event("error", f"DexScreener fetch failed: {e}")
        return []
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchDexscreener -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add DexScreener fetcher with chain filtering"
```

---

### Task 4: Test — CoinGecko Fetcher

**Files:**
- Modify: `src/agents/tests/test_scanner_agent.py`
- Modify: `src/agents/scanner_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scanner_agent.py`:

```python
COINGECKO_TRENDING_URL = "https://api.coingecko.com/api/v3/search/trending"

MOCK_COINGECKO_TRENDING = {
    "coins": [
        {
            "item": {
                "id": "token-a",
                "name": "Token A",
                "symbol": "TKNA",
                "market_cap_rank": 150,
                "platforms": {"solana": "abc123solana"},
                "data": {
                    "market_cap": "$5,000,000",
                    "total_volume": "$1,200,000",
                    "price": "$0.50"
                }
            }
        },
        {
            "item": {
                "id": "token-b",
                "name": "Token B",
                "symbol": "TKNB",
                "market_cap_rank": 300,
                "platforms": {"ethereum": "def456eth"},
                "data": {
                    "market_cap": "$2,000,000",
                    "total_volume": "$500,000",
                    "price": "$1.00"
                }
            }
        },
        {
            "item": {
                "id": "no-platform-token",
                "name": "No Platform",
                "symbol": "NOPE",
                "market_cap_rank": 500,
                "platforms": {},
                "data": {
                    "market_cap": "$100,000",
                    "total_volume": "$10,000",
                    "price": "$0.01"
                }
            }
        }
    ]
}


class TestFetchCoingecko:
    async def test_returns_list_of_tokens(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)
            tokens = await agent._fetch_coingecko()

        assert isinstance(tokens, list)
        assert len(tokens) >= 1

    async def test_token_has_required_fields(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)
            tokens = await agent._fetch_coingecko()

        token = tokens[0]
        assert "contract_address" in token
        assert "chain" in token
        assert "name" in token
        assert "symbol" in token
        assert token["source"] == "coingecko"

    async def test_skips_tokens_without_platform(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)
            tokens = await agent._fetch_coingecko()

        names = [t["name"] for t in tokens]
        assert "No Platform" not in names

    async def test_returns_empty_on_error(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(COINGECKO_TRENDING_URL, status=429)
            tokens = await agent._fetch_coingecko()

        assert tokens == []
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchCoingecko -v`
Expected: FAIL — `AttributeError: 'ScannerAgent' object has no attribute '_fetch_coingecko'`

**Step 3: Implement _fetch_coingecko**

Add this constant at module level in `src/agents/scanner_agent.py`:

```python
COINGECKO_TRENDING_URL = "https://api.coingecko.com/api/v3/search/trending"
```

Add this method to `ScannerAgent`:

```python
async def _fetch_coingecko(self) -> List[Dict]:
    self.log_event("action", "Fetching CoinGecko trending")
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.get(COINGECKO_TRENDING_URL) as resp:
                if resp.status != 200:
                    raise aiohttp.ClientError(f"CoinGecko returned {resp.status}")
                data = await resp.json()

        tokens = []
        for coin in data.get("coins", []):
            item = coin.get("item", {})
            platforms = item.get("platforms", {})
            if not platforms:
                continue

            # Take the first platform with an address
            for chain, address in platforms.items():
                if not address:
                    continue
                market_data = item.get("data", {})
                tokens.append({
                    "contract_address": address,
                    "chain": chain,
                    "name": item.get("name", ""),
                    "symbol": item.get("symbol", ""),
                    "mcap": self._parse_dollar_string(market_data.get("market_cap", "0")),
                    "volume_24h": self._parse_dollar_string(market_data.get("total_volume", "0")),
                    "liquidity": 0.0,  # CoinGecko trending doesn't provide liquidity
                    "source": "coingecko",
                    "source_url": f"https://www.coingecko.com/en/coins/{item.get('id', '')}",
                })
                break  # one entry per coin

        self.log_event("observation", f"CoinGecko returned {len(tokens)} tokens")
        return tokens

    except Exception as e:
        self.log_event("error", f"CoinGecko fetch failed: {e}")
        return []
```

Also add this helper method to `ScannerAgent`:

```python
@staticmethod
def _parse_dollar_string(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return 0.0
    return 0.0
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchCoingecko -v`
Expected: 4 PASSED

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add CoinGecko trending fetcher"
```

---

### Task 5: Test — AIXBT Stub Fetcher

**Files:**
- Modify: `src/agents/tests/test_scanner_agent.py`
- Modify: `src/agents/scanner_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scanner_agent.py`:

```python
class TestFetchAixbt:
    async def test_returns_empty_list(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = await agent._fetch_aixbt()
        assert tokens == []

    async def test_logs_decision_event(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        await agent._fetch_aixbt()
        decision_events = [e for e in agent.events if e["type"] == "decision"]
        assert len(decision_events) == 1
        assert "stub" in decision_events[0]["description"].lower()
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchAixbt -v`
Expected: FAIL — `AttributeError: 'ScannerAgent' object has no attribute '_fetch_aixbt'`

**Step 3: Implement _fetch_aixbt**

Add this method to `ScannerAgent`:

```python
async def _fetch_aixbt(self) -> List[Dict]:
    self.log_event("decision", "AIXBT source stubbed — endpoint not verified as JSON API")
    return []
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestFetchAixbt -v`
Expected: 2 PASSED

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add AIXBT stub fetcher with decision event"
```

---

### Task 6: Test — Deduplication

**Files:**
- Modify: `src/agents/tests/test_scanner_agent.py`
- Modify: `src/agents/scanner_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scanner_agent.py`:

```python
class TestDeduplicate:
    def test_removes_duplicates_by_chain_and_address(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = [
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 80.0, "source": "dexscreener", "source_url": "url1"},
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 0.0, "source": "coingecko", "source_url": "url2"},
        ]
        result = agent._deduplicate(tokens)
        assert len(result) == 1

    def test_merged_token_has_sources_list(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = [
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 80.0, "source": "dexscreener", "source_url": "url1"},
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 0.0, "source": "coingecko", "source_url": "url2"},
        ]
        result = agent._deduplicate(tokens)
        assert "dexscreener" in result[0]["sources"]
        assert "coingecko" in result[0]["sources"]

    def test_keeps_richest_data(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = [
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 80.0, "source": "dexscreener", "source_url": "url1"},
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 200.0, "volume_24h": 0.0,
             "liquidity": 0.0, "source": "coingecko", "source_url": "url2"},
        ]
        result = agent._deduplicate(tokens)
        # Should keep the higher mcap and higher liquidity
        assert result[0]["mcap"] == 200.0
        assert result[0]["liquidity"] == 80.0

    def test_different_chains_not_deduped(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = [
            {"contract_address": "abc123", "chain": "solana", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 80.0, "source": "dexscreener", "source_url": "url1"},
            {"contract_address": "abc123", "chain": "ethereum", "name": "Token A",
             "symbol": "TKNA", "mcap": 100.0, "volume_24h": 50.0,
             "liquidity": 80.0, "source": "dexscreener", "source_url": "url2"},
        ]
        result = agent._deduplicate(tokens)
        assert len(result) == 2

    def test_unique_tokens_unchanged(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()
        tokens = [
            {"contract_address": "abc", "chain": "solana", "name": "A",
             "symbol": "A", "mcap": 1.0, "volume_24h": 1.0,
             "liquidity": 1.0, "source": "dexscreener", "source_url": "url1"},
            {"contract_address": "def", "chain": "solana", "name": "B",
             "symbol": "B", "mcap": 2.0, "volume_24h": 2.0,
             "liquidity": 2.0, "source": "coingecko", "source_url": "url2"},
        ]
        result = agent._deduplicate(tokens)
        assert len(result) == 2
        # Each should have a sources list with one entry
        assert result[0]["sources"] == ["dexscreener"]
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestDeduplicate -v`
Expected: FAIL — `AttributeError: 'ScannerAgent' object has no attribute '_deduplicate'`

**Step 3: Implement _deduplicate**

Add this method to `ScannerAgent`:

```python
def _deduplicate(self, tokens: List[Dict]) -> List[Dict]:
    seen: Dict[tuple, Dict] = {}
    for token in tokens:
        key = (token["chain"].lower(), token["contract_address"].lower())
        if key in seen:
            existing = seen[key]
            existing["sources"].append(token["source"])
            # Keep the higher value for numeric fields
            for field in ("mcap", "volume_24h", "liquidity"):
                existing[field] = max(existing[field], token.get(field, 0.0))
        else:
            token_copy = dict(token)
            token_copy["sources"] = [token_copy.pop("source")]
            seen[key] = token_copy
    return list(seen.values())
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestDeduplicate -v`
Expected: 5 PASSED

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add deduplication by (chain, contract_address)"
```

---

### Task 7: Test — execute() Orchestrates Everything

**Files:**
- Modify: `src/agents/tests/test_scanner_agent.py`
- Modify: `src/agents/scanner_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scanner_agent.py`:

```python
class TestExecute:
    async def test_returns_tokens_list(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)

            result = await agent.execute({"chains": ["solana"]})

        assert "tokens" in result
        assert isinstance(result["tokens"], list)

    async def test_returns_total_count(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)

            result = await agent.execute({"chains": ["solana"]})

        assert "total" in result
        assert isinstance(result["total"], int)

    async def test_returns_source_counts(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)

            result = await agent.execute({"chains": ["solana"]})

        assert "source_counts" in result
        assert isinstance(result["source_counts"], dict)

    async def test_writes_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)

            await agent.execute({"chains": ["solana"]})

        saved = agent.read_scratchpad("last_scan")
        assert saved is not None
        assert "tokens" in saved

    async def test_survives_all_sources_failing(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent()

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, status=500)
            mocked.get(COINGECKO_TRENDING_URL, status=500)

            result = await agent.execute({})

        assert result["tokens"] == []
        assert result["total"] == 0

    async def test_uses_params_chains_over_default(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScannerAgent(chains=["solana", "ethereum", "base"])

        with aioresponses() as mocked:
            mocked.get(DEXSCREENER_BOOSTS_URL, payload=MOCK_DEXSCREENER_BOOSTS)
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123solana",
                payload=MOCK_DEXSCREENER_SEARCH,
            )
            mocked.get(COINGECKO_TRENDING_URL, payload=MOCK_COINGECKO_TRENDING)

            result = await agent.execute({"chains": ["solana"]})

        # All returned tokens should be solana
        for token in result["tokens"]:
            assert token["chain"] == "solana"
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestExecute -v`
Expected: FAIL — `NotImplementedError: TODO`

**Step 3: Replace the execute() placeholder with the real implementation**

Replace the `execute` method in `ScannerAgent`:

```python
async def execute(self, params: Dict) -> Dict:
    chains = params.get("chains", self.chains)
    self.log_event("action", f"Scanning {len(chains)} chains", {"chains": chains})

    # Gather all sources in parallel
    dex_results, cg_results, aixbt_results = await asyncio.gather(
        self._fetch_dexscreener(chains),
        self._fetch_coingecko(),
        self._fetch_aixbt(),
    )

    # Filter CoinGecko results by requested chains
    chain_set = set(c.lower() for c in chains)
    cg_filtered = [t for t in cg_results if t["chain"].lower() in chain_set]

    # Flatten and deduplicate
    all_tokens = dex_results + cg_filtered + aixbt_results
    unique_tokens = self._deduplicate(all_tokens)

    # Count per source
    source_counts = {}
    for token in unique_tokens:
        for src in token.get("sources", []):
            source_counts[src] = source_counts.get(src, 0) + 1

    self.log_event("observation", f"Found {len(unique_tokens)} unique tokens", {
        "total": len(unique_tokens),
        "source_counts": source_counts,
    })

    # Persist to scratchpad
    self.write_scratchpad("last_scan", {
        "tokens": unique_tokens,
        "total": len(unique_tokens),
        "source_counts": source_counts,
    })

    return {
        "tokens": unique_tokens,
        "total": len(unique_tokens),
        "source_counts": source_counts,
    }
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py::TestExecute -v`
Expected: 6 PASSED

Also run ALL scanner tests:
Run: `python3 -m pytest src/agents/tests/test_scanner_agent.py -v`
Expected: All tests PASSED (5 + 5 + 4 + 2 + 5 + 6 = 27)

**Step 5: Commit**

```bash
git add src/agents/scanner_agent.py src/agents/tests/test_scanner_agent.py
git commit -m "feat: add execute() with parallel source gathering and dedup"
```

---

### Task 8: Full Test Suite Verification

**Files:** None (verification only)

**Step 1: Run ALL tests (BaseAgent + ScannerAgent)**

Run: `python3 -m pytest src/agents/tests/ -v`
Expected: All ~60 tests PASS (33 BaseAgent + ~27 ScannerAgent)

**Step 2: Verify no scratchpad leaked**

Run: `ls data/scratchpad/ 2>/dev/null && echo "LEAK" || echo "CLEAN"`
Expected: `CLEAN`

---

### Final File State Reference

After all tasks, `src/agents/scanner_agent.py` should contain approximately:

```python
import asyncio
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEFAULT_CHAINS = ["solana", "ethereum", "base"]
DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
COINGECKO_TRENDING_URL = "https://api.coingecko.com/api/v3/search/trending"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)


class ScannerAgent(BaseAgent):
    def __init__(self, chains: Optional[List[str]] = None):
        super().__init__(name="scanner")
        self.chains = chains or DEFAULT_CHAINS

    async def execute(self, params: Dict) -> Dict:
        chains = params.get("chains", self.chains)
        self.log_event("action", f"Scanning {len(chains)} chains", {"chains": chains})

        dex_results, cg_results, aixbt_results = await asyncio.gather(
            self._fetch_dexscreener(chains),
            self._fetch_coingecko(),
            self._fetch_aixbt(),
        )

        chain_set = set(c.lower() for c in chains)
        cg_filtered = [t for t in cg_results if t["chain"].lower() in chain_set]

        all_tokens = dex_results + cg_filtered + aixbt_results
        unique_tokens = self._deduplicate(all_tokens)

        source_counts = {}
        for token in unique_tokens:
            for src in token.get("sources", []):
                source_counts[src] = source_counts.get(src, 0) + 1

        self.log_event("observation", f"Found {len(unique_tokens)} unique tokens", {
            "total": len(unique_tokens),
            "source_counts": source_counts,
        })

        self.write_scratchpad("last_scan", {
            "tokens": unique_tokens,
            "total": len(unique_tokens),
            "source_counts": source_counts,
        })

        return {
            "tokens": unique_tokens,
            "total": len(unique_tokens),
            "source_counts": source_counts,
        }

    async def _fetch_dexscreener(self, chains: List[str]) -> List[Dict]:
        self.log_event("action", "Fetching DexScreener boosts", {"chains": chains})
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                async with session.get(DEXSCREENER_BOOSTS_URL) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener boosts returned {resp.status}")
                    boosts = await resp.json()

                chain_set = set(c.lower() for c in chains)
                filtered = [b for b in boosts if b.get("chainId", "").lower() in chain_set]

                tokens = []
                for boost in filtered[:20]:
                    address = boost.get("tokenAddress", "")
                    if not address:
                        continue
                    try:
                        async with session.get(f"{DEXSCREENER_TOKENS_URL}/{address}") as detail_resp:
                            if detail_resp.status != 200:
                                continue
                            detail = await detail_resp.json()
                            for pair in detail.get("pairs", [])[:1]:
                                tokens.append({
                                    "contract_address": pair.get("baseToken", {}).get("address", address),
                                    "chain": pair.get("chainId", boost.get("chainId", "")),
                                    "name": pair.get("baseToken", {}).get("name", ""),
                                    "symbol": pair.get("baseToken", {}).get("symbol", ""),
                                    "mcap": float(pair.get("marketCap", 0) or 0),
                                    "volume_24h": float(pair.get("volume", {}).get("h24", 0) or 0),
                                    "liquidity": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                                    "source": "dexscreener",
                                    "source_url": pair.get("url", boost.get("url", "")),
                                })
                    except Exception:
                        continue

                self.log_event("observation", f"DexScreener returned {len(tokens)} tokens")
                return tokens

        except Exception as e:
            self.log_event("error", f"DexScreener fetch failed: {e}")
            return []

    async def _fetch_coingecko(self) -> List[Dict]:
        self.log_event("action", "Fetching CoinGecko trending")
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                async with session.get(COINGECKO_TRENDING_URL) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"CoinGecko returned {resp.status}")
                    data = await resp.json()

            tokens = []
            for coin in data.get("coins", []):
                item = coin.get("item", {})
                platforms = item.get("platforms", {})
                if not platforms:
                    continue

                for chain, address in platforms.items():
                    if not address:
                        continue
                    market_data = item.get("data", {})
                    tokens.append({
                        "contract_address": address,
                        "chain": chain,
                        "name": item.get("name", ""),
                        "symbol": item.get("symbol", ""),
                        "mcap": self._parse_dollar_string(market_data.get("market_cap", "0")),
                        "volume_24h": self._parse_dollar_string(market_data.get("total_volume", "0")),
                        "liquidity": 0.0,
                        "source": "coingecko",
                        "source_url": f"https://www.coingecko.com/en/coins/{item.get('id', '')}",
                    })
                    break

            self.log_event("observation", f"CoinGecko returned {len(tokens)} tokens")
            return tokens

        except Exception as e:
            self.log_event("error", f"CoinGecko fetch failed: {e}")
            return []

    async def _fetch_aixbt(self) -> List[Dict]:
        self.log_event("decision", "AIXBT source stubbed — endpoint not verified as JSON API")
        return []

    def _deduplicate(self, tokens: List[Dict]) -> List[Dict]:
        seen: Dict[tuple, Dict] = {}
        for token in tokens:
            key = (token["chain"].lower(), token["contract_address"].lower())
            if key in seen:
                existing = seen[key]
                existing["sources"].append(token["source"])
                for field in ("mcap", "volume_24h", "liquidity"):
                    existing[field] = max(existing[field], token.get(field, 0.0))
            else:
                token_copy = dict(token)
                token_copy["sources"] = [token_copy.pop("source")]
                seen[key] = token_copy
        return list(seen.values())

    @staticmethod
    def _parse_dollar_string(value) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.replace("$", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0
        return 0.0
```
