# src/agents/tests/test_wallet_agent.py
import pytest
from unittest.mock import AsyncMock
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
        agent._analyze_liquidity = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_holders = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_deployer = AsyncMock(return_value={"available": False, "score": 0})
        agent._analyze_tx_flow = AsyncMock(return_value={"available": False, "score": 0})
        agent._run_forensics = AsyncMock(return_value={"available": False, "score": 0})
        result = await agent.execute({"deployer_address": "dep123", "token_address": "abc123", "chain": "solana"})
        assert result["depth"] == "standard"


# --- Task 3: DexScreener liquidity analysis tests ---
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
        assert result["score"] >= 8
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
