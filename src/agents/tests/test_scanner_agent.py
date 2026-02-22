# src/agents/tests/test_scanner_agent.py
import json
import pytest
from aioresponses import aioresponses
from src.agents.scanner_agent import ScannerAgent
from src.agents.base_agent import BaseAgent


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
