# SocialAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Layer 2 SocialAgent that performs social media research and community analysis via Grok/xAI, ATV Web3 Identity, and Serper APIs.

**Architecture:** Monolithic single-file agent in `src/agents/social_agent.py` inheriting from `BaseAgent`. Three parallel analysis methods (`_search_grok`, `_search_atv`, `_search_serper`) run via `asyncio.gather()`, then `_compute_verdict` aggregates scores. Supports 3 depth modes: quick (ATV only), standard (+Serper), deep (+Grok).

**Tech Stack:** Python 3.9+, asyncio, aiohttp, pytest, pytest-asyncio, aioresponses

**Design doc:** `docs/plans/2026-02-23-social-agent-design.md`

**Existing patterns to follow:** `src/agents/wallet_agent.py`, `src/agents/safety_agent.py`

---

### Task 1: SocialAgent Skeleton + Constructor Tests

**Files:**
- Create: `src/agents/social_agent.py`
- Create: `src/agents/tests/test_social_agent.py`

**Step 1: Write the failing tests**

Create `src/agents/tests/test_social_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSocialAgentInit -v`
Expected: FAIL with ImportError (social_agent module does not exist)

**Step 3: Write minimal implementation**

Create `src/agents/social_agent.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSocialAgentInit -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add SocialAgent skeleton inheriting BaseAgent"
```

---

### Task 2: Input Validation + Execute Skeleton

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`
- Modify: `src/agents/social_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestInputValidation -v`
Expected: FAIL

**Step 3: Implement execute skeleton**

Replace `execute` in `src/agents/social_agent.py`:

```python
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
        return {"available": False, "score": 0, "twitter_score": 0, "community_score": 0, "red_flags": [], "green_flags": [],
                "sentiment": "suspicious", "follower_estimate": 0, "engagement_level": "none",
                "tweet_frequency": "none", "bot_suspicion": 0.0, "summary": ""}

    async def _search_atv(self, deployer: str, depth: str) -> Dict:
        return {"available": False, "score": 0, "red_flags": [], "green_flags": [],
                "ens_name": None, "has_ens": False, "twitter_handle": None,
                "github_handle": None, "discord_handle": None, "identity_count": 0}

    async def _search_serper(self, project: str, token: str, chain: str, depth: str) -> Dict:
        return {"available": False, "score": 0, "red_flags": [], "green_flags": [],
                "total_results": 0, "positive_mentions": 0, "negative_mentions": 0,
                "scam_mentions": 0, "news_sources": []}

    def _compute_verdict(self, project: str, token: str, chain: str, depth: str,
                         grok_r: Dict, atv_r: Dict, serper_r: Dict) -> Dict:
        return self._empty_result(project, token, chain, depth)
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py -v`
Expected: 7 PASSED (3 init + 4 validation)

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add SocialAgent input validation and execute skeleton"
```

---

### Task 3: _search_atv (ATV Web3 Identity)

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`
- Modify: `src/agents/social_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
from aioresponses import aioresponses

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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchAtv -v`
Expected: FAIL (stub returns unavailable)

**Step 3: Implement _search_atv**

Replace `_search_atv` in `src/agents/social_agent.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchAtv -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add _search_atv with ATV Web3 Identity integration"
```

---

### Task 4: _search_serper (Serper Web Search)

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`
- Modify: `src/agents/social_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchSerper -v`
Expected: FAIL

**Step 3: Implement _search_serper**

Replace `_search_serper` in `src/agents/social_agent.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchSerper -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add _search_serper with web reputation analysis"
```

---

### Task 5: _search_grok (Grok/xAI Sentiment Analysis)

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`
- Modify: `src/agents/social_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
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
```

Note: You need to add `import json` at the top of the test file.

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchGrok -v`
Expected: FAIL

**Step 3: Implement _search_grok**

Replace `_search_grok` in `src/agents/social_agent.py`:

```python
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
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSearchGrok -v`
Expected: 7 PASSED

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add _search_grok with xAI sentiment analysis"
```

---

### Task 6: _compute_verdict + Scoring Engine

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`
- Modify: `src/agents/social_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
class TestComputeVerdict:
    def _make_grok(self, twitter_score=0, community_score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": twitter_score + community_score,
            "twitter_score": twitter_score, "community_score": community_score,
            "red_flags": [], "green_flags": [],
            "sentiment": "neutral", "follower_estimate": 0, "engagement_level": "none",
            "tweet_frequency": "none", "bot_suspicion": 0.0, "summary": "",
        }
        defaults.update(kwargs)
        return defaults

    def _make_atv(self, score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": score, "red_flags": [], "green_flags": [],
            "ens_name": None, "has_ens": False, "twitter_handle": None,
            "github_handle": None, "discord_handle": None, "identity_count": 0,
        }
        defaults.update(kwargs)
        return defaults

    def _make_serper(self, score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": score, "red_flags": [], "green_flags": [],
            "total_results": 0, "positive_mentions": 0, "negative_mentions": 0,
            "scam_mentions": 0, "news_sources": [],
        }
        defaults.update(kwargs)
        return defaults

    def test_high_score_positive_sentiment(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(twitter_score=25, community_score=20, sentiment="positive",
                               green_flags=["positive_sentiment", "active_community"])
        atv = self._make_atv(score=20, has_ens=True, identity_count=3,
                             green_flags=["verified_team"])
        serper = self._make_serper(score=15, green_flags=["clean_reputation"])
        result = agent._compute_verdict("BONK", "abc123", "solana", "deep", grok, atv, serper)
        assert result["social_score"] >= 80
        assert result["sentiment"] == "positive"
        assert result["community_health"] == "A"

    def test_low_score_suspicious_sentiment(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(twitter_score=2, community_score=0, sentiment="suspicious",
                               red_flags=["bot_farm", "fake_engagement"])
        atv = self._make_atv(score=0, red_flags=["anonymous_team"])
        serper = self._make_serper(score=0, red_flags=["scam_reports", "negative_press"])
        result = agent._compute_verdict("SCAM", "xyz789", "solana", "deep", grok, atv, serper)
        assert result["social_score"] < 20
        assert result["sentiment"] == "suspicious"
        assert result["community_health"] == "F"

    def test_weight_redistribution_quick_mode(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(available=False)  # skipped in quick
        atv = self._make_atv(score=20)
        serper = self._make_serper(available=False)  # skipped in quick
        result = agent._compute_verdict("BONK", "abc123", "solana", "quick", grok, atv, serper)
        # 20 raw out of 25 available = 80
        assert result["social_score"] == 80
        assert result["community_health"] == "A"

    def test_all_sources_failed(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(available=False)
        atv = self._make_atv(available=False)
        serper = self._make_serper(available=False)
        result = agent._compute_verdict("BONK", "abc123", "solana", "standard", grok, atv, serper)
        assert result["social_score"] == 0
        assert result["sentiment"] == "suspicious"
        assert result["community_health"] == "F"
        assert "all_sources_failed" in result["red_flags"]

    def test_team_verified_from_atv(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(available=False)
        atv = self._make_atv(score=15, has_ens=True, identity_count=2,
                             green_flags=["verified_team"])
        serper = self._make_serper(available=False)
        result = agent._compute_verdict("BONK", "abc123", "solana", "quick", grok, atv, serper)
        assert result["team_verified"] is True

    def test_red_and_green_flags_aggregated(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(twitter_score=15, community_score=10,
                               green_flags=["positive_sentiment"], red_flags=["fake_engagement"])
        atv = self._make_atv(score=10, green_flags=["verified_team"])
        serper = self._make_serper(score=5, red_flags=["negative_press"])
        result = agent._compute_verdict("BONK", "abc123", "solana", "deep", grok, atv, serper)
        assert "positive_sentiment" in result["green_flags"]
        assert "verified_team" in result["green_flags"]
        assert "fake_engagement" in result["red_flags"]
        assert "negative_press" in result["red_flags"]
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestComputeVerdict -v`
Expected: FAIL

**Step 3: Implement _compute_verdict**

Replace `_compute_verdict` in `src/agents/social_agent.py`:

```python
    def _compute_verdict(self, project: str, token: str, chain: str, depth: str,
                         grok_r: Dict, atv_r: Dict, serper_r: Dict) -> Dict:
        # Grok covers twitter (0-30) + community (0-25) = 55 total
        # ATV covers team_identity (0-25)
        # Serper covers web_reputation (0-20)
        analyses = []
        twitter_score = 0
        community_score = 0

        if grok_r.get("available", False):
            twitter_score = grok_r.get("twitter_score", 0)
            community_score = grok_r.get("community_score", 0)
            analyses.append((twitter_score, MAX_TWITTER))
            analyses.append((community_score, MAX_COMMUNITY))

        atv_score = 0
        if atv_r.get("available", False):
            atv_score = atv_r.get("score", 0)
            analyses.append((atv_score, MAX_TEAM_IDENTITY))

        serper_score = 0
        if serper_r.get("available", False):
            serper_score = serper_r.get("score", 0)
            analyses.append((serper_score, MAX_WEB_REPUTATION))

        raw_score = sum(s for s, _ in analyses)
        available_points = sum(m for _, m in analyses)

        if available_points > 0:
            social_score = round((raw_score / available_points) * 100)
        else:
            social_score = 0
        social_score = max(0, min(100, social_score))

        # Sentiment mapping
        if social_score >= 80:
            sentiment = "positive"
            community_health = "A"
        elif social_score >= 60:
            sentiment = "positive" if grok_r.get("sentiment") == "positive" else "neutral"
            community_health = "B"
        elif social_score >= 40:
            sentiment = "neutral"
            community_health = "C"
        elif social_score >= 20:
            sentiment = "negative"
            community_health = "D"
        else:
            sentiment = "suspicious"
            community_health = "F"

        # Override sentiment from Grok if available and score is not at extremes
        if grok_r.get("available") and 20 <= social_score < 80:
            grok_sentiment = grok_r.get("sentiment", "neutral")
            if grok_sentiment == "suspicious":
                sentiment = "suspicious"

        # Team verified
        team_verified = atv_r.get("has_ens", False) and atv_r.get("identity_count", 0) >= 2

        # Aggregate flags
        red_flags = []
        green_flags = []
        for source in [grok_r, atv_r, serper_r]:
            red_flags.extend(source.get("red_flags", []))
            green_flags.extend(source.get("green_flags", []))

        if available_points == 0:
            red_flags.append("all_sources_failed")

        # Check cross-source red flag: no_social_presence
        grok_has_data = grok_r.get("available", False) and grok_r.get("follower_estimate", 0) > 0
        atv_has_data = atv_r.get("available", False) and atv_r.get("identity_count", 0) > 0
        if not grok_has_data and not atv_has_data and grok_r.get("available", False):
            red_flags.append("no_social_presence")

        # Sources used
        sources_used = []
        if grok_r.get("available"):
            sources_used.append("grok")
        if atv_r.get("available"):
            sources_used.append("atv")
        if serper_r.get("available"):
            sources_used.append("serper")

        breakdown = {
            "twitter": twitter_score,
            "community": community_score,
            "team_identity": atv_score,
            "web_reputation": serper_score,
        }

        return {
            "project_name": project,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "social_score": social_score,
            "sentiment": sentiment,
            "community_health": community_health,
            "team_verified": team_verified,
            "breakdown": breakdown,
            "grok_analysis": {
                "sentiment": grok_r.get("sentiment", "suspicious"),
                "follower_estimate": grok_r.get("follower_estimate", 0),
                "engagement_level": grok_r.get("engagement_level", "none"),
                "tweet_frequency": grok_r.get("tweet_frequency", "none"),
                "bot_suspicion": grok_r.get("bot_suspicion", 0.0),
                "summary": grok_r.get("summary", ""),
                "available": grok_r.get("available", False),
            },
            "team_identity": {
                "ens_name": atv_r.get("ens_name"),
                "has_ens": atv_r.get("has_ens", False),
                "twitter_handle": atv_r.get("twitter_handle"),
                "github_handle": atv_r.get("github_handle"),
                "discord_handle": atv_r.get("discord_handle"),
                "identity_count": atv_r.get("identity_count", 0),
                "available": atv_r.get("available", False),
            },
            "web_reputation": {
                "total_results": serper_r.get("total_results", 0),
                "positive_mentions": serper_r.get("positive_mentions", 0),
                "negative_mentions": serper_r.get("negative_mentions", 0),
                "scam_mentions": serper_r.get("scam_mentions", 0),
                "news_sources": serper_r.get("news_sources", []),
                "available": serper_r.get("available", False),
            },
            "red_flags": red_flags,
            "green_flags": green_flags,
            "sources_used": sources_used,
        }
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestComputeVerdict -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add src/agents/social_agent.py src/agents/tests/test_social_agent.py
git commit -m "feat: add _compute_verdict with scoring engine and weight redistribution"
```

---

### Task 7: Depth Gating Integration Tests

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`

**Step 1: Write the tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
class TestDepthGating:
    async def test_quick_only_runs_atv(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "quick",
            })
        assert result["team_identity"]["available"] is True
        assert result["grok_analysis"]["available"] is False
        assert result["web_reputation"]["available"] is False

    async def test_standard_runs_atv_and_serper(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "standard",
            })
        assert result["team_identity"]["available"] is True
        assert result["web_reputation"]["available"] is True
        assert result["grok_analysis"]["available"] is False

    async def test_deep_runs_all_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            mocked.post(GROK_API_URL, payload=MOCK_GROK_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "deep",
            })
        assert result["team_identity"]["available"] is True
        assert result["web_reputation"]["available"] is True
        assert result["grok_analysis"]["available"] is True

    async def test_invalid_depth_defaults_to_standard(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        agent._search_grok = AsyncMock(return_value={"available": False, "score": 0, "twitter_score": 0, "community_score": 0, "red_flags": [], "green_flags": [], "sentiment": "suspicious", "follower_estimate": 0, "engagement_level": "none", "tweet_frequency": "none", "bot_suspicion": 0.0, "summary": ""})
        agent._search_atv = AsyncMock(return_value={"available": False, "score": 0, "red_flags": [], "green_flags": [], "ens_name": None, "has_ens": False, "twitter_handle": None, "github_handle": None, "discord_handle": None, "identity_count": 0})
        agent._search_serper = AsyncMock(return_value={"available": False, "score": 0, "red_flags": [], "green_flags": [], "total_results": 0, "positive_mentions": 0, "negative_mentions": 0, "scam_mentions": 0, "news_sources": []})
        result = await agent.execute({
            "project_name": "BONK", "token_address": "abc123",
            "chain": "solana", "deployer_address": "dep123", "depth": "invalid",
        })
        assert result["depth"] == "standard"

    async def test_sources_used_tracks_active_sources(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "standard",
            })
        assert "atv" in result["sources_used"]
        assert "serper" in result["sources_used"]
        assert "grok" not in result["sources_used"]

    async def test_missing_deployer_still_runs_serper(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "", "depth": "standard",
            })
        assert result["web_reputation"]["available"] is True
        assert result["team_identity"]["available"] is False
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestDepthGating -v`
Expected: 6 PASSED

**Step 3: Commit**

```bash
git add src/agents/tests/test_social_agent.py
git commit -m "test: add depth gating integration tests for SocialAgent"
```

---

### Task 8: Red/Green Flag Detection Tests

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`

**Step 1: Write the tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
class TestFlagDetection:
    async def test_no_social_presence_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        # Grok returns available but no followers, ATV returns no identity
        grok_empty = {
            "choices": [{
                "message": {
                    "content": json.dumps({
                        "sentiment": "suspicious", "follower_estimate": 0,
                        "engagement_level": "none", "tweet_frequency": "none",
                        "bot_suspicion": 0.0, "red_flags": [], "summary": "No Twitter presence found.",
                    })
                }
            }]
        }
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_NO_IDENTITY,
            )
            mocked.post(GROK_API_URL, payload=grok_empty)
            result = await agent.execute({
                "project_name": "GHOST", "token_address": "ghost123",
                "chain": "solana", "deployer_address": "dep123", "depth": "deep",
            })
        assert "no_social_presence" in result["red_flags"]
        assert "anonymous_team" in result["red_flags"]

    async def test_verified_team_green_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "quick",
            })
        assert "verified_team" in result["green_flags"]
        assert result["team_verified"] is True

    async def test_bot_farm_and_scam_combined(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_NO_IDENTITY,
            )
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_NEGATIVE)
            mocked.post(GROK_API_URL, payload=MOCK_GROK_SUSPICIOUS)
            result = await agent.execute({
                "project_name": "SCAM", "token_address": "scam123",
                "chain": "solana", "deployer_address": "dep123", "depth": "deep",
            })
        assert "bot_farm" in result["red_flags"]
        assert "scam_reports" in result["red_flags"]
        assert "anonymous_team" in result["red_flags"]
        assert result["social_score"] < 30

    async def test_clean_reputation_green_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(
                f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord",
                payload=MOCK_ATV_FULL_IDENTITY,
            )
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "standard",
            })
        assert "clean_reputation" in result["green_flags"]
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestFlagDetection -v`
Expected: 4 PASSED

**Step 3: Commit**

```bash
git add src/agents/tests/test_social_agent.py
git commit -m "test: add red/green flag detection tests for SocialAgent"
```

---

### Task 9: Sentiment & Community Health Mapping Tests

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`

**Step 1: Write the tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
class TestSentimentMapping:
    def _make_grok(self, twitter_score=0, community_score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": twitter_score + community_score,
            "twitter_score": twitter_score, "community_score": community_score,
            "red_flags": [], "green_flags": [],
            "sentiment": "neutral", "follower_estimate": 0, "engagement_level": "none",
            "tweet_frequency": "none", "bot_suspicion": 0.0, "summary": "",
        }
        defaults.update(kwargs)
        return defaults

    def _make_atv(self, score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": score, "red_flags": [], "green_flags": [],
            "ens_name": None, "has_ens": False, "twitter_handle": None,
            "github_handle": None, "discord_handle": None, "identity_count": 0,
        }
        defaults.update(kwargs)
        return defaults

    def _make_serper(self, score=0, available=True, **kwargs):
        defaults = {
            "available": available, "score": score, "red_flags": [], "green_flags": [],
            "total_results": 0, "positive_mentions": 0, "negative_mentions": 0,
            "scam_mentions": 0, "news_sources": [],
        }
        defaults.update(kwargs)
        return defaults

    def test_grade_c_neutral(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(twitter_score=10, community_score=8, available=True)
        atv = self._make_atv(score=10)
        serper = self._make_serper(score=8)
        result = agent._compute_verdict("BONK", "abc123", "solana", "deep", grok, atv, serper)
        # raw=36 out of 100 available => 36%
        assert result["community_health"] == "D" or result["community_health"] == "C"
        assert result["sentiment"] in ("neutral", "negative")

    def test_grade_d_negative(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(twitter_score=3, community_score=2, available=True, sentiment="negative")
        atv = self._make_atv(score=5)
        serper = self._make_serper(score=2)
        result = agent._compute_verdict("BONK", "abc123", "solana", "deep", grok, atv, serper)
        # raw=12 out of 100 => 12%
        assert result["community_health"] == "F"
        assert result["sentiment"] == "suspicious"

    def test_grade_b_with_atv_serper_only(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        grok = self._make_grok(available=False)
        atv = self._make_atv(score=20)
        serper = self._make_serper(score=15)
        result = agent._compute_verdict("BONK", "abc123", "solana", "standard", grok, atv, serper)
        # raw=35 out of 45 available => 78%
        assert result["community_health"] == "B"
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestSentimentMapping -v`
Expected: 3 PASSED

**Step 3: Commit**

```bash
git add src/agents/tests/test_social_agent.py
git commit -m "test: add sentiment and community health mapping tests"
```

---

### Task 10: Full execute() Integration Tests

**Files:**
- Modify: `src/agents/tests/test_social_agent.py`

**Step 1: Write the tests**

Add to `src/agents/tests/test_social_agent.py`:

```python
class TestExecuteIntegration:
    async def test_happy_path_returns_all_fields(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord", payload=MOCK_ATV_FULL_IDENTITY)
            mocked.post(SERPER_API_URL, payload=MOCK_SERPER_POSITIVE)
            mocked.post(GROK_API_URL, payload=MOCK_GROK_POSITIVE)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "deep",
            })
        for field in ["social_score", "sentiment", "community_health", "team_verified",
                       "breakdown", "grok_analysis", "team_identity", "web_reputation",
                       "red_flags", "green_flags", "sources_used"]:
            assert field in result
        assert 0 <= result["social_score"] <= 100

    async def test_writes_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord", payload=MOCK_ATV_FULL_IDENTITY)
            await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "quick",
            })
        saved = agent.read_scratchpad("social_abc123")
        assert saved is not None
        assert "social_score" in saved

    async def test_all_apis_fail_gracefully(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        monkeypatch.setenv("XAI_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord", status=500)
            mocked.post(SERPER_API_URL, status=500)
            mocked.post(GROK_API_URL, status=500)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "deep",
            })
        assert result["social_score"] == 0
        assert result["sentiment"] == "suspicious"
        assert "all_sources_failed" in result["red_flags"]

    async def test_partial_failure_still_scores(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        monkeypatch.setenv("SERPER_API_KEY", "test-key")
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord", payload=MOCK_ATV_FULL_IDENTITY)
            mocked.post(SERPER_API_URL, status=500)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "standard",
            })
        assert result["social_score"] > 0
        assert "atv" in result["sources_used"]

    async def test_echoes_input_params(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SocialAgent()
        with aioresponses() as mocked:
            mocked.get(f"{ATV_API_URL}?addresses=dep123&include=name,twitter,github,discord", payload=MOCK_ATV_FULL_IDENTITY)
            result = await agent.execute({
                "project_name": "BONK", "token_address": "abc123",
                "chain": "solana", "deployer_address": "dep123", "depth": "quick",
            })
        assert result["project_name"] == "BONK"
        assert result["token_address"] == "abc123"
        assert result["chain"] == "solana"
```

**Step 2: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py::TestExecuteIntegration -v`
Expected: 5 PASSED

**Step 3: Commit**

```bash
git add src/agents/tests/test_social_agent.py
git commit -m "test: add full execute() integration tests for SocialAgent"
```

---

### Task 11: Full Suite Verification

**Files:** None (verification only)

**Step 1: Run ALL social agent tests**

Run: `python3 -m pytest src/agents/tests/test_social_agent.py -v`
Expected: 52 PASSED (3+4+7+7+7+6+6+4+3+5)

**Step 2: Run ALL project tests**

Run: `python3 -m pytest src/ -v`
Expected: All tests PASS (base + scanner + scorer + safety + quillshield + wallet + social)

**Step 3: Verify no scratchpad leaked**

Run: `ls data/scratchpad/ 2>/dev/null && echo "LEAK" || echo "CLEAN"`
Expected: `CLEAN`

---

### Final File State Reference

After all tasks, the project should have these new files:

```
src/agents/social_agent.py            (~400 lines)
src/agents/tests/test_social_agent.py (~800 lines, 52 tests)
docs/plans/2026-02-23-social-agent-design.md
docs/plans/2026-02-23-social-agent-implementation.md
```

Test count by class:

| Class | Tests |
|-------|-------|
| TestSocialAgentInit | 3 |
| TestInputValidation | 4 |
| TestSearchAtv | 7 |
| TestSearchSerper | 7 |
| TestSearchGrok | 7 |
| TestComputeVerdict | 6 |
| TestDepthGating | 6 |
| TestFlagDetection | 4 |
| TestSentimentMapping | 3 |
| TestExecuteIntegration | 5 |
| **Total** | **52** |
