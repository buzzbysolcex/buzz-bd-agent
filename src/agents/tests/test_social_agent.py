# src/agents/tests/test_social_agent.py
import json
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

SERPER_API_URL = "https://google.serper.dev/search"

MOCK_SERPER_POSITIVE = {
    "organic": [
        {"title": "BONK Token Review - Legit Meme Coin Growing Fast", "snippet": "BONK is a legitimate Solana meme coin with a growing community.", "link": "https://coindesk.com/bonk-review"},
        {"title": "BONK Partnership with Major Exchange", "snippet": "BONK announces innovative partnership with top exchange.", "link": "https://cointelegraph.com/bonk-partnership"},
        {"title": "Is BONK a Good Investment?", "snippet": "BONK token shows bullish signs and growing adoption.", "link": "https://example.com/bonk-analysis"},
    ]
}

MOCK_SERPER_NEGATIVE = {
    "organic": [
        {"title": "BONK Token Scam Warning", "snippet": "Multiple reports of BONK being a rug pull scam.", "link": "https://example.com/bonk-scam"},
        {"title": "BONK Fraud Alert - Avoid This Token", "snippet": "Users report fraud and ponzi-like behavior from BONK.", "link": "https://example.com/bonk-fraud"},
        {"title": "BONK Rugpull Evidence Found", "snippet": "Evidence suggests BONK is a rugpull scheme. Avoid!", "link": "https://example.com/bonk-rug"},
    ]
}

MOCK_SERPER_EMPTY = {"organic": []}

MOCK_SERPER_MIXED = {
    "organic": [
        {"title": "BONK Review - Growing Community", "snippet": "BONK has a legit growing community.", "link": "https://example.com/good"},
        {"title": "Is BONK a Scam?", "snippet": "Some say BONK is a scam but evidence is weak.", "link": "https://example.com/scam-q"},
    ]
}


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


class TestSearchSerper:
    async def test_skipped_in_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent._search_serper("BONK", "abc123", "solana", "quick")
        assert result["available"] is False

    async def test_positive_results_score_well(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert result["available"] is True
        assert result["positive_mentions"] > 0
        assert result["scam_mentions"] == 0
        assert result["score"] >= 10
        assert "clean_reputation" in result["green_flags"]

    async def test_negative_results_with_scam(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_NEGATIVE)
            result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert result["available"] is True
        assert result["scam_mentions"] >= 3
        assert "scam_reports" in result["red_flags"]
        assert "negative_press" in result["red_flags"]

    async def test_empty_results(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_EMPTY)
            result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert result["available"] is True
        assert result["total_results"] == 0
        assert result["score"] == 0

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, status=500)
            result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert result["available"] is False

    async def test_no_api_key_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.delenv("SERPER_API_KEY", raising=False)
        agent = SocialAgent()
        result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert result["available"] is False

    async def test_detects_news_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent._search_serper("BONK", "abc123", "solana", "standard")
        assert len(result["news_sources"]) >= 1
        assert any("coindesk" in s for s in result["news_sources"])


GROK_API_URL = "https://api.x.ai/v1/chat/completions"

MOCK_GROK_POSITIVE = {
    "choices": [{
        "message": {
            "content": json.dumps({
                "sentiment": "positive",
                "follower_estimate": 55000,
                "engagement_level": "high",
                "tweet_frequency": "active",
                "bot_suspicion": 0.1,
                "red_flags": [],
                "summary": "BONK has a strong and active Twitter community with genuine engagement.",
            })
        }
    }]
}

MOCK_GROK_SUSPICIOUS = {
    "choices": [{
        "message": {
            "content": json.dumps({
                "sentiment": "suspicious",
                "follower_estimate": 500,
                "engagement_level": "low",
                "tweet_frequency": "dormant",
                "bot_suspicion": 0.95,
                "red_flags": ["fake_engagement", "bot_farm"],
                "summary": "Token shows signs of bot activity and fake engagement.",
            })
        }
    }]
}

MOCK_GROK_NEUTRAL = {
    "choices": [{
        "message": {
            "content": json.dumps({
                "sentiment": "neutral",
                "follower_estimate": 5000,
                "engagement_level": "medium",
                "tweet_frequency": "moderate",
                "bot_suspicion": 0.3,
                "red_flags": [],
                "summary": "Average crypto project with moderate Twitter presence.",
            })
        }
    }]
}


class TestSearchGrok:
    async def test_skipped_in_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent._search_grok("BONK", "abc123", "solana", "quick")
        assert result["available"] is False

    async def test_skipped_in_standard_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        result = await agent._search_grok("BONK", "abc123", "solana", "standard")
        assert result["available"] is False

    async def test_positive_sentiment_scores_high(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(GROK_API_URL, payload=MOCK_GROK_POSITIVE)
            result = await agent._search_grok("BONK", "abc123", "solana", "deep")
        assert result["available"] is True
        assert result["sentiment"] == "positive"
        assert result["follower_estimate"] == 55000
        assert result["twitter_score"] >= 20
        assert result["community_score"] >= 15
        assert "positive_sentiment" in result["green_flags"]
        assert "established_presence" in result["green_flags"]
        assert "active_community" in result["green_flags"]

    async def test_suspicious_with_bots_detected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(GROK_API_URL, payload=MOCK_GROK_SUSPICIOUS)
            result = await agent._search_grok("SCAM", "xyz789", "solana", "deep")
        assert result["available"] is True
        assert result["bot_suspicion"] > 0.9
        assert "bot_farm" in result["red_flags"]
        assert "fake_engagement" in result["red_flags"]
        assert "dormant_social" in result["red_flags"]

    async def test_api_error_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(GROK_API_URL, status=500)
            result = await agent._search_grok("BONK", "abc123", "solana", "deep")
        assert result["available"] is False

    async def test_no_api_key_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.delenv("XAI_API_KEY", raising=False)
        agent = SocialAgent()
        result = await agent._search_grok("BONK", "abc123", "solana", "deep")
        assert result["available"] is False

    async def test_malformed_json_returns_unavailable(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(GROK_API_URL, payload={"choices": [{"message": {"content": "not json"}}]})
            result = await agent._search_grok("BONK", "abc123", "solana", "deep")
        assert result["available"] is False
