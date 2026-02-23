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
