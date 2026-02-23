# src/agents/tests/test_wallet_agent.py
import pytest
from unittest.mock import AsyncMock, patch
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


# --- Task 7: Forensics analysis tests ---

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


# --- Task 8: Verdict and scoring engine tests ---

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
        liq = {**self._make_result(20), "total_liquidity": 500000, "lp_locked": True, "lp_lock_duration_days": 200, "lp_burned": False, "buy_sell_ratio": 1.0}
        hld = {**self._make_result(0, available=False), "top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0}
        dep = {**self._make_result(0, available=False), "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False}
        txf = {**self._make_result(10), "organic_score": 0.7, "unique_buyers_24h": 80, "unique_sellers_24h": 60, "avg_tx_size": 300.0}
        for_ = {**self._make_result(0, available=False), "bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False}
        result = agent._compute_verdict("dep", "tok", "solana", "quick", liq, hld, dep, txf, for_)
        assert result["wallet_score"] == 75  # 30/40*100 = 75
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
        assert 35 <= result["wallet_score"] < 80


# --- Task 9: Depth gating integration tests ---

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


# --- Task 10: Auto-escalation tests ---

class TestAutoEscalation:
    async def test_escalates_quick_to_standard_on_red_flags(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = WalletAgent()
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


# --- Task 11: Full execute() integration tests ---

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
