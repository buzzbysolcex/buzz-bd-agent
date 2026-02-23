# src/agents/tests/test_social_agent.py
import pytest
from unittest.mock import AsyncMock, patch
from aioresponses import aioresponses
from src.agents.social_agent import SocialAgent
from src.agents.base_agent import BaseAgent

ATV_API_URL = "https://api.web3identity.com/api/ens/batch-resolve"

MOCK_ATV_FULL_IDENTITY = [
    {
        "address": "0xdep123",
        "name": "vitalik.eth",
        "twitter": "VitalikButerin",
        "github": "vbuterin",
        "discord": "vitalik#1234",
    }
]

MOCK_ATV_ENS_ONLY = [
    {
        "address": "0xdep123",
        "name": "anon.eth",
        "twitter": None,
        "github": None,
        "discord": None,
    }
]

MOCK_ATV_NO_IDENTITY = [
    {
        "address": "0xdep123",
        "name": None,
        "twitter": None,
        "github": None,
        "discord": None,
    }
]

MOCK_ATV_EMPTY = []


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


class TestSearchAtv:
    async def test_full_identity_scores_max(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            result = await agent._search_atv("0xdep123", "quick")
        assert result["available"] is True
        assert result["has_ens"] is True
        assert result["twitter_handle"] == "VitalikButerin"
        assert result["github_handle"] == "vbuterin"
        assert result["discord_handle"] == "vitalik#1234"
        assert result["identity_count"] == 4  # ENS + Twitter + GitHub + Discord
        assert result["score"] == 25  # 10+5+5+3+2 = 25 (capped)
        assert "verified_team" in result["green_flags"]
        assert "multi_platform" in result["green_flags"]

    async def test_ens_only_partial_score(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_ENS_ONLY,
            )
            result = await agent._search_atv("0xdep123", "standard")
        assert result["available"] is True
        assert result["has_ens"] is True
        assert result["identity_count"] == 1
        assert result["score"] == 10  # ENS only

    async def test_no_identity_returns_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_NO_IDENTITY,
            )
            result = await agent._search_atv("0xdep123", "quick")
        assert result["available"] is True
        assert result["has_ens"] is False
        assert result["identity_count"] == 0
        assert result["score"] == 0
        assert "anonymous_team" in result["red_flags"]

    async def test_empty_response(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_EMPTY,
            )
            result = await agent._search_atv("0xdep123", "quick")
        assert result["available"] is True
        assert result["identity_count"] == 0
        assert "anonymous_team" in result["red_flags"]

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                status=500,
            )
            result = await agent._search_atv("0xdep123", "quick")
        assert result["available"] is False
        assert result["score"] == 0

    async def test_no_deployer_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent._search_atv("", "quick")
        assert result["available"] is False

    async def test_runs_in_all_depth_modes(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        for depth in ["quick", "standard", "deep"]:
            with aioresponses() as mocked:
                mocked.get(
                    f"{ATV_API_URL}?addresses=0xdep123&include=name,twitter,github,discord",
                    payload=MOCK_ATV_FULL_IDENTITY,
                )
                result = await agent._search_atv("0xdep123", depth)
            assert result["available"] is True
