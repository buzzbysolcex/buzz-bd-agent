# src/agents/tests/test_wallet_agent.py
import pytest
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
