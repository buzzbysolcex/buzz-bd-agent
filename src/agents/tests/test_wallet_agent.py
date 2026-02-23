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
