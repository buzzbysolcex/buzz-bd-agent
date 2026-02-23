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
