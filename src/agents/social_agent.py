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
        project = params.get("project_name", "")
        token = params.get("token_address", "")
        chain = params.get("chain", "")
        deployer = params.get("deployer_address", "")
        depth = params.get("depth", "standard")

        if depth not in VALID_DEPTHS:
            depth = "standard"

        if not project or not token or not chain:
            self.log_event("error", "Missing project_name, token_address, or chain")
            return self._empty_result(project, token, chain, depth)

        try:
            self.log_event("action", f"Starting social analysis for {project} ({token}) on {chain}", {"depth": depth})

            grok_r, atv_r, serper_r = await asyncio.gather(
                self._search_grok(project, token, chain, depth),
                self._search_atv(deployer, depth),
                self._search_serper(project, token, chain, depth),
            )

            result = self._compute_verdict(project, token, chain, depth, grok_r, atv_r, serper_r)

            self.log_event("decision", f"Social score: {result['social_score']} ({result['sentiment']})", {
                "social_score": result["social_score"],
                "sentiment": result["sentiment"],
                "red_flags": result["red_flags"],
            })

            self.write_scratchpad(f"social_{token}", result)
            return result
        except Exception as e:
            self.log_event("error", f"Social analysis failed unexpectedly: {e}")
            empty = self._empty_result(project, token, chain, depth)
            empty["red_flags"].append("all_sources_failed")
            return empty

    async def _search_grok(self, project: str, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0, "twitter_score": 0, "community_score": 0,
            "red_flags": [], "green_flags": [],
            "sentiment": "suspicious", "follower_estimate": 0, "engagement_level": "none",
            "tweet_frequency": "none", "bot_suspicion": 0.0, "summary": "",
        }
        if depth != "deep":
            return empty

        api_key = os.environ.get("XAI_API_KEY", "")
        if not api_key:
            self.log_event("error", "XAI_API_KEY not set, skipping Grok analysis")
            return empty

        self.log_event("action", "Analyzing Twitter presence via Grok/xAI", {"project": project})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["deep"])
        try:
            prompt = GROK_PROMPT_TEMPLATE.format(
                project_name=project, token_address=token, chain=chain,
            )
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": GROK_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            }

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(GROK_API_URL, headers=headers, json=payload) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Grok API returned {resp.status}")
                    data = await resp.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            try:
                parsed = json.loads(content)
            except (json.JSONDecodeError, TypeError):
                self.log_event("error", "Grok returned invalid JSON")
                return empty

            sentiment = parsed.get("sentiment", "suspicious")
            follower_estimate = int(parsed.get("follower_estimate", 0) or 0)
            engagement_level = parsed.get("engagement_level", "none")
            tweet_frequency = parsed.get("tweet_frequency", "none")
            bot_suspicion = float(parsed.get("bot_suspicion", 0.0) or 0.0)
            summary = parsed.get("summary", "")

            # Twitter score (0-30)
            twitter_score = 0
            if follower_estimate >= 50000:
                twitter_score += 12
            elif follower_estimate >= 10000:
                twitter_score += 8
            elif follower_estimate >= 1000:
                twitter_score += 4

            if engagement_level == "high":
                twitter_score += 8
            elif engagement_level == "medium":
                twitter_score += 5

            if tweet_frequency == "active":
                twitter_score += 5
            elif tweet_frequency == "moderate":
                twitter_score += 3

            if bot_suspicion < 0.3:
                twitter_score += 5

            twitter_score = min(MAX_TWITTER, twitter_score)

            # Community score (0-25)
            community_score = 0
            if sentiment == "positive":
                community_score += 10
            elif sentiment == "neutral":
                community_score += 5

            if engagement_level in ("high", "medium"):
                community_score += 8

            if tweet_frequency in ("active", "moderate"):
                community_score += 7

            community_score = min(MAX_COMMUNITY, community_score)

            red_flags = []
            green_flags = []

            if bot_suspicion > 0.9:
                red_flags.append("bot_farm")
            if bot_suspicion > 0.7:
                red_flags.append("fake_engagement")
            if tweet_frequency == "dormant":
                red_flags.append("dormant_social")

            if sentiment == "positive":
                green_flags.append("positive_sentiment")
            if follower_estimate >= 10000:
                green_flags.append("established_presence")
            if engagement_level in ("high", "medium") and tweet_frequency == "active":
                green_flags.append("active_community")

            total_score = twitter_score + community_score

            self.log_event("observation", f"Grok: sentiment={sentiment}, followers~{follower_estimate}, bots={bot_suspicion}, score={total_score}/55")
            return {
                "available": True, "score": total_score,
                "twitter_score": twitter_score, "community_score": community_score,
                "red_flags": red_flags, "green_flags": green_flags,
                "sentiment": sentiment, "follower_estimate": follower_estimate,
                "engagement_level": engagement_level, "tweet_frequency": tweet_frequency,
                "bot_suspicion": bot_suspicion, "summary": summary,
            }
        except Exception as e:
            self.log_event("error", f"Grok analysis failed: {e}")
            return empty

    async def _search_atv(self, deployer: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0, "red_flags": [], "green_flags": [],
            "ens_name": None, "has_ens": False, "twitter_handle": None,
            "github_handle": None, "discord_handle": None, "identity_count": 0,
        }
        if not deployer:
            return empty

        self.log_event("action", "Looking up deployer identity via ATV", {"deployer": deployer})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{ATV_API_URL}?addresses={deployer}&include=name,twitter,github,discord"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"ATV returned {resp.status}")
                    data = await resp.json()

            ens_name = None
            twitter_handle = None
            github_handle = None
            discord_handle = None

            if data and isinstance(data, list) and len(data) > 0:
                entry = data[0]
                ens_name = entry.get("name")
                twitter_handle = entry.get("twitter")
                github_handle = entry.get("github")
                discord_handle = entry.get("discord")

            has_ens = ens_name is not None and ens_name != ""
            identities = [has_ens, twitter_handle, github_handle, discord_handle]
            identity_count = sum(1 for i in identities if i)

            score = 0
            red_flags = []
            green_flags = []

            if has_ens:
                score += 10
            if twitter_handle:
                score += 5
            if github_handle:
                score += 5
            if discord_handle:
                score += 3
            if identity_count >= 3:
                score += 2

            score = min(MAX_TEAM_IDENTITY, score)

            if identity_count == 0:
                red_flags.append("anonymous_team")
            if has_ens and identity_count >= 2:
                green_flags.append("verified_team")
            if identity_count >= 3:
                green_flags.append("multi_platform")

            self.log_event("observation", f"ATV: ENS={ens_name}, identities={identity_count}, score={score}/25")
            return {
                "available": True, "score": score, "red_flags": red_flags, "green_flags": green_flags,
                "ens_name": ens_name, "has_ens": has_ens, "twitter_handle": twitter_handle,
                "github_handle": github_handle, "discord_handle": discord_handle,
                "identity_count": identity_count,
            }
        except Exception as e:
            self.log_event("error", f"ATV identity lookup failed: {e}")
            return empty

    async def _search_serper(self, project: str, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0, "red_flags": [], "green_flags": [],
            "total_results": 0, "positive_mentions": 0, "negative_mentions": 0,
            "scam_mentions": 0, "news_sources": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("SERPER_API_KEY", "")
        if not api_key:
            self.log_event("error", "SERPER_API_KEY not set, skipping web search")
            return empty

        self.log_event("action", "Searching web via Serper", {"project": project})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            query = f'"{project}" crypto token review'
            headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    SERPER_API_URL,
                    headers=headers,
                    json={"q": query},
                ) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Serper returned {resp.status}")
                    data = await resp.json()

            organic = data.get("organic", [])
            total_results = len(organic)

            if total_results == 0:
                self.log_event("observation", "Serper: 0 results, score=0/20")
                return {
                    "available": True, "score": 0, "red_flags": [], "green_flags": [],
                    "total_results": 0, "positive_mentions": 0,
                    "negative_mentions": 0, "scam_mentions": 0,
                    "news_sources": [],
                }

            positive_mentions = 0
            negative_mentions = 0
            scam_mentions = 0
            news_sources = []

            for result in organic:
                text = (result.get("title", "") + " " + result.get("snippet", "")).lower()
                link = result.get("link", "")

                if any(kw in text for kw in POSITIVE_KEYWORDS):
                    positive_mentions += 1
                if any(kw in text for kw in NEGATIVE_KEYWORDS):
                    negative_mentions += 1
                if any(kw in text for kw in SCAM_KEYWORDS):
                    scam_mentions += 1

                for domain in KNOWN_NEWS_DOMAINS:
                    if domain in link:
                        news_sources.append(domain)
                        break

            news_sources = list(set(news_sources))

            score = 0
            red_flags = []
            green_flags = []

            if total_results >= 20:
                score += 5
            elif total_results >= 5:
                score += 3

            if positive_mentions > negative_mentions:
                score += 5
            if scam_mentions == 0:
                score += 5
            if news_sources:
                score += 5

            if scam_mentions >= 3:
                score -= 5
                red_flags.append("scam_reports")
            if negative_mentions > positive_mentions * 2 and negative_mentions > 0:
                score -= 5
                red_flags.append("negative_press")

            score = max(0, min(MAX_WEB_REPUTATION, score))

            if scam_mentions == 0 and positive_mentions > negative_mentions:
                green_flags.append("clean_reputation")

            self.log_event("observation", f"Serper: {total_results} results, +{positive_mentions}/-{negative_mentions} scam={scam_mentions}, score={score}/20")
            return {
                "available": True, "score": score, "red_flags": red_flags, "green_flags": green_flags,
                "total_results": total_results, "positive_mentions": positive_mentions,
                "negative_mentions": negative_mentions, "scam_mentions": scam_mentions,
                "news_sources": news_sources,
            }
        except Exception as e:
            self.log_event("error", f"Serper search failed: {e}")
            return empty

    def _compute_verdict(self, project: str, token: str, chain: str, depth: str,
                         grok_r: Dict, atv_r: Dict, serper_r: Dict) -> Dict:
        return self._empty_result(project, token, chain, depth)
