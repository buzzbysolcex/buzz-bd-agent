# src/agents/social_agent.py
import asyncio
import json
import os
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

GROK_API_URL = "https://api.x.ai/v1/chat/completions"
GROK_MODEL = "grok-3-mini"
ATV_API_URL = "https://api.web3identity.com/api/ens/batch-resolve"
SERPER_API_URL = "https://google.serper.dev/search"

VALID_DEPTHS = {"quick", "standard", "deep"}

DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=5),
    "deep": aiohttp.ClientTimeout(total=10),
}

MAX_TWITTER = 30
MAX_COMMUNITY = 25
MAX_TEAM_IDENTITY = 25
MAX_WEB_REPUTATION = 20

NEGATIVE_KEYWORDS = {"scam", "rug", "rugpull", "hack", "exploit", "fraud", "ponzi", "warning", "avoid", "fake"}
POSITIVE_KEYWORDS = {"review", "legit", "legitimate", "growing", "bullish", "innovative", "partnership", "audit"}
SCAM_KEYWORDS = {"scam", "rug", "rugpull", "fraud", "ponzi"}

KNOWN_NEWS_DOMAINS = {
    "coindesk.com", "cointelegraph.com", "theblock.co", "decrypt.co",
    "bloomberg.com", "reuters.com", "forbes.com", "techcrunch.com",
}

GROK_PROMPT_TEMPLATE = """Analyze the Twitter/X presence for the crypto project "{project_name}" (token: {token_address} on {chain}).

Return a JSON object with exactly these fields:
- "sentiment": one of "positive", "neutral", "negative", "suspicious"
- "follower_estimate": integer estimate of Twitter followers (0 if unknown)
- "engagement_level": one of "high", "medium", "low", "none"
- "tweet_frequency": one of "active", "moderate", "dormant", "none"
- "bot_suspicion": float 0.0-1.0 (0=definitely real, 1=definitely bots)
- "red_flags": list of strings (any concerns found)
- "summary": 1-2 sentence summary of findings

Return ONLY valid JSON, no other text."""


class SocialAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="social")

    def _empty_result(self, project: str = "", token: str = "", chain: str = "", depth: str = "standard") -> Dict:
        return {
            "project_name": project,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "social_score": 0,
            "sentiment": "suspicious",
            "community_health": "F",
            "team_verified": False,
            "breakdown": {"twitter": 0, "community": 0, "team_identity": 0, "web_reputation": 0},
            "grok_analysis": {
                "sentiment": "suspicious", "follower_estimate": 0,
                "engagement_level": "none", "tweet_frequency": "none",
                "bot_suspicion": 0.0, "summary": "", "available": False,
            },
            "team_identity": {
                "ens_name": None, "has_ens": False,
                "twitter_handle": None, "github_handle": None, "discord_handle": None,
                "identity_count": 0, "available": False,
            },
            "web_reputation": {
                "total_results": 0, "positive_mentions": 0, "negative_mentions": 0,
                "scam_mentions": 0, "news_sources": [], "available": False,
            },
            "red_flags": [],
            "green_flags": [],
            "sources_used": [],
        }

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("execute not yet implemented")
