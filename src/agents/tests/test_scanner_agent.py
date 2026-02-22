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
