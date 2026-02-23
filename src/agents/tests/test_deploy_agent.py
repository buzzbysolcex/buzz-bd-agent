import pytest
from aioresponses import aioresponses
from src.agents.deploy_agent import DeployAgent
from src.agents.base_agent import BaseAgent

HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"


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


class TestAnalyzeDeployments:
    @pytest.mark.asyncio
    async def test_prolific_deployer_high_score(self, monkeypatch):
        """10+ deployments, 365+ day old wallet, prolific frequency -> high score."""
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
        """5-9 deployments, 180+ day wallet -> moderate score."""
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
        """Single deployment, fresh wallet -> low score."""
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
        """Missing HELIUS_API_KEY -> available: False."""
        monkeypatch.delenv("HELIUS_API_KEY", raising=False)
        agent = DeployAgent()
        result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False
        assert result["score"] == 0

    @pytest.mark.asyncio
    async def test_api_error_returns_unavailable(self, monkeypatch):
        """Helius returns 500 -> available: False."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", status=500)
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_empty_txns_returns_unavailable(self, monkeypatch):
        """Helius returns empty array -> available: False."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
        url = HELIUS_TXN_URL.format(address="0xdep123")
        with aioresponses() as mocked:
            mocked.get(f"{url}?api-key=test-key&limit=100", payload=[])
            result = await agent._analyze_deployments("0xdep123", "solana", "standard")
        assert result["available"] is False

    @pytest.mark.asyncio
    async def test_occasional_deployer(self, monkeypatch):
        """2-4 deployments -> occasional frequency."""
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


class TestAnalyzePortfolio:
    @pytest.mark.asyncio
    async def test_skip_on_quick_depth(self, monkeypatch):
        """Portfolio analysis skipped in quick mode."""
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        agent = DeployAgent()
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


class TestComputeVerdict:
    def test_high_score_low_risk(self):
        """High raw scores -> deploy_score >=80, risk_level=low, reputation=established."""
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
        """Moderate scores -> 60-79, risk_level=medium, reputation=moderate."""
        agent = DeployAgent()
        cross_r = _make_cross_chain_result(available=False)
        deploy_r = _make_deployment_result(score=22)
        portfolio_r = _make_portfolio_result(score=12)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert 60 <= result["deploy_score"] <= 79
        assert result["risk_level"] == "medium"
        assert result["cross_chain_reputation"] == "moderate"

    def test_all_sources_failed(self):
        """No available sources -> score 0, critical, unknown, all_sources_failed flag."""
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
        deploy_r = _make_deployment_result(score=25)
        portfolio_r = _make_portfolio_result(available=False, score=0)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "quick",
                                        deploy_r, portfolio_r, cross_r)
        assert 0 < result["deploy_score"] <= 100

    def test_sources_used_populated(self):
        """sources_used reflects which APIs returned data."""
        agent = DeployAgent()
        deploy_r = _make_deployment_result(score=20)
        portfolio_r = _make_portfolio_result(score=10)
        cross_r = _make_cross_chain_result(available=False)
        result = agent._compute_verdict("0xdep123", "solana", "standard",
                                        deploy_r, portfolio_r, cross_r)
        assert "helius" in result["sources_used"]
