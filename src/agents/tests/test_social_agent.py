# src/agents/tests/test_social_agent.py
import pytest
from unittest.mock import AsyncMock, patch
from src.agents.social_agent import SocialAgent
from src.agents.base_agent import BaseAgent


class TestSocialAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_social(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        assert agent.name == "social"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        assert agent.status == "idle"


class TestInputValidation:
    async def test_missing_project_name(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent.execute({"token_address": "abc123", "chain": "solana", "deployer_address": "dep123"})
        assert result["social_score"] == 0
        assert result["sentiment"] == "suspicious"

    async def test_missing_token_address(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent.execute({"project_name": "BONK", "chain": "solana", "deployer_address": "dep123"})
        assert result["social_score"] == 0

    async def test_missing_chain(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent.execute({"project_name": "BONK", "token_address": "abc123", "deployer_address": "dep123"})
        assert result["social_score"] == 0

    async def test_default_depth_is_standard(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        agent._search_grok = AsyncMock(return_value={"available": False, "score": 0, "red_flags": [], "green_flags": []})
        agent._search_atv = AsyncMock(return_value={"available": False, "score": 0, "red_flags": [], "green_flags": []})
        agent._search_serper = AsyncMock(return_value={"available": False, "score": 0, "red_flags": [], "green_flags": []})
        result = await agent.execute({
            "project_name": "BONK", "token_address": "abc123",
            "chain": "solana", "deployer_address": "dep123",
        })
        assert result["depth"] == "standard"
