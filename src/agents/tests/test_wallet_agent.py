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


# --- Task 4: Helius holder distribution analysis tests ---

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
        assert result["score"] >= 15
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
        assert result["deployer_pct"] == 20.0
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
        many_holders = {"result": {"token_accounts": [{"owner": f"w{i}", "amount": 100} for i in range(50)], "total_supply": 100000}}
        with aioresponses() as mocked:
            mocked.get(
                f"{HELIUS_API_BASE}/v0/tokens/abc123/holders?api-key=test-key&limit=50",
                payload=many_holders,
            )
            result = await agent._analyze_holders("abc123", "nobody", "solana", "standard")
        assert result["available"] is True
        assert result["unique_holders"] == 50


# --- Task 5: Deployer analysis tests ---
import time as time_module

MOCK_HELIUS_DEPLOYER_ESTABLISHED = [
    {"type": "TRANSFER", "timestamp": int(time_module.time()) - (400 * 86400), "description": "old tx"},
    {"type": "TRANSFER", "timestamp": int(time_module.time()) - (200 * 86400), "description": "mid tx"},
    {"type": "UNKNOWN", "timestamp": int(time_module.time()) - (10 * 86400), "description": "recent tx"},
]

MOCK_HELIUS_DEPLOYER_NEW = [
    {"type": "TRANSFER", "timestamp": int(time_module.time()) - (5 * 86400), "description": "new deployer tx"},
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
        assert result["cross_chain_activity"] is False


# --- Task 6: TX flow analysis tests ---

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
