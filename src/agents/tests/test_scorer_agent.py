import pytest
from src.agents.scorer_agent import ScorerAgent
from src.agents.base_agent import BaseAgent

MOCK_TOKEN_DATA = {
    "contract_address": "abc123solana",
    "chain": "solana",
    "name": "Token A",
    "symbol": "TKNA",
    "mcap": 5000000,
    "volume_24h": 1200000,
    "liquidity": 800000,
    "age_days": 14,
    "socials": {
        "twitter_followers": 20000,
        "telegram_members": 10000,
        "discord_members": 5000,
        "engagement_rate": 0.10,
    },
    "contract": {
        "verified_source": True,
        "no_honeypot": True,
        "renounced_ownership": True,
        "locked_liquidity": True,
        "audit_report": True,
    },
    "catalysts": {},
    "dflow": {},
}


class TestScorerAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_scorer(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent.name == "scorer"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent.status == "idle"


class TestScoreLiquidity:
    def test_excellent_500k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(500000) == 30

    def test_excellent_above_500k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(1000000) == 30

    def test_good_250k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(250000) == 22

    def test_fair_100k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(100000) == 15

    def test_poor_50k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(50000) == 8

    def test_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(0) == 0

    def test_below_50k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_liquidity(49999) == 0


class TestScoreVolume:
    def test_excellent_1m(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_volume(1000000) == 25

    def test_good_500k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_volume(500000) == 18

    def test_fair_100k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_volume(100000) == 12

    def test_poor_50k(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_volume(50000) == 6

    def test_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_volume(0) == 0


class TestScoreAge:
    def test_optimal_7_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(7) == 15

    def test_optimal_15_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(15) == 15

    def test_optimal_30_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(30) == 15

    def test_new_but_stable_3_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(3) == 10

    def test_new_but_stable_5_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(5) == 10

    def test_mature_60_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(60) == 10

    def test_mature_90_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(90) == 10

    def test_too_new_1_day(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(1) == 0

    def test_too_new_0_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(0) == 0

    def test_too_old_91_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(91) == 5

    def test_too_old_365_days(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(365) == 5

    def test_none_returns_0(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_age(None) == 0


class TestScoreCommunity:
    def test_all_above_thresholds(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        socials = {
            "twitter_followers": 20000,
            "telegram_members": 10000,
            "discord_members": 5000,
            "engagement_rate": 0.10,
        }
        assert agent._score_community(socials) == 15

    def test_all_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_community({}) == 0

    def test_partial_twitter_only(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        socials = {"twitter_followers": 10000}
        score = agent._score_community(socials)
        assert score == round(15 * 0.3)

    def test_proportional_twitter_half(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        socials = {"twitter_followers": 5000}
        score = agent._score_community(socials)
        assert score == round(15 * 0.3 * 0.5)

    def test_empty_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_community({}) == 0


class TestScoreSafety:
    def test_all_checks_pass(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        contract = {
            "verified_source": True,
            "no_honeypot": True,
            "renounced_ownership": True,
            "locked_liquidity": True,
            "audit_report": True,
        }
        assert agent._score_safety(contract) == 15

    def test_no_checks_pass(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        contract = {
            "verified_source": False,
            "no_honeypot": False,
            "renounced_ownership": False,
            "locked_liquidity": False,
            "audit_report": False,
        }
        assert agent._score_safety(contract) == 0

    def test_partial_checks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        contract = {
            "verified_source": True,
            "no_honeypot": True,
            "renounced_ownership": False,
            "locked_liquidity": False,
            "audit_report": False,
        }
        assert agent._score_safety(contract) == 6

    def test_empty_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._score_safety({}) == 0


class TestApplyCatalysts:
    def test_no_catalysts(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({})
        assert result["bonus"] == 0
        assert result["applied"] == []

    def test_single_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({"viral_moment": True})
        assert result["bonus"] == 10
        assert "+viral" in result["applied"]

    def test_single_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({"major_cex_listed": True})
        assert result["bonus"] == -15
        assert "-cex" in result["applied"]

    def test_mixed_bonuses_and_penalties(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({
            "viral_moment": True,
            "kol_mention": True,
            "suspicious_volume": True,
        })
        assert result["bonus"] == 10
        assert len(result["applied"]) == 3

    def test_false_flags_ignored(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({"viral_moment": False})
        assert result["bonus"] == 0
        assert result["applied"] == []

    def test_x402_blocked_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._apply_catalysts({"x402_blocked": True})
        assert result["bonus"] == -20


class TestApplyDflow:
    def test_excellent_with_3_routes(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({"routes_available": 3, "slippage_quality": "excellent"}) == 13

    def test_excellent_with_5_routes(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({"routes_available": 5, "slippage_quality": "excellent"}) == 13

    def test_poor_slippage(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({"routes_available": 5, "slippage_quality": "poor"}) == -8

    def test_good_slippage_no_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({"routes_available": 5, "slippage_quality": "good"}) == 0

    def test_excellent_but_fewer_than_3_routes(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({"routes_available": 2, "slippage_quality": "excellent"}) == 0

    def test_empty_dict(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._apply_dflow({}) == 0


class TestCheckAutoReject:
    def test_low_liquidity_rejected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._check_auto_reject({"liquidity": 50000, "volume_24h": 100000, "mcap": 1000000})
        assert result["rejected"] is True
        assert result["reason"] == "liquidity_too_low"

    def test_too_new_rejected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._check_auto_reject({"liquidity": 500000, "age_days": 0.05, "volume_24h": 100000, "mcap": 1000000})
        assert result["rejected"] is True
        assert result["reason"] == "too_new"

    def test_suspicious_volume_rejected(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._check_auto_reject({"liquidity": 500000, "volume_24h": 11000000, "mcap": 1000000})
        assert result["rejected"] is True
        assert result["reason"] == "suspicious_volume"

    def test_passes_all_checks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._check_auto_reject({"liquidity": 500000, "volume_24h": 500000, "mcap": 1000000, "age_days": 10})
        assert result["rejected"] is False

    def test_zero_mcap_skips_volume_ratio(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = agent._check_auto_reject({"liquidity": 500000, "volume_24h": 500000, "mcap": 0})
        assert result["rejected"] is False


class TestGetStatus:
    def test_hot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_status(85) == "HOT"
        assert agent._get_status(100) == "HOT"

    def test_qualified(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_status(70) == "QUALIFIED"
        assert agent._get_status(84) == "QUALIFIED"

    def test_watch(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_status(50) == "WATCH"
        assert agent._get_status(69) == "WATCH"

    def test_skip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_status(0) == "SKIP"
        assert agent._get_status(49) == "SKIP"


class TestGetRecommendation:
    def test_hot_is_pipeline(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_recommendation("HOT") == "PIPELINE"

    def test_qualified_is_pipeline(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_recommendation("QUALIFIED") == "PIPELINE"

    def test_watch_is_watch(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_recommendation("WATCH") == "WATCH"

    def test_skip_is_skip(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        assert agent._get_recommendation("SKIP") == "SKIP"


class TestExecute:
    async def test_returns_total_score(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = await agent.execute({"token_data": MOCK_TOKEN_DATA})
        assert "total_score" in result
        assert isinstance(result["total_score"], int)

    async def test_returns_breakdown(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = await agent.execute({"token_data": MOCK_TOKEN_DATA})
        breakdown = result["breakdown"]
        assert breakdown["liquidity"] == 30
        assert breakdown["volume"] == 25
        assert breakdown["age"] == 15
        assert breakdown["community"] == 15
        assert breakdown["safety"] == 15

    async def test_perfect_score_is_100(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = await agent.execute({"token_data": MOCK_TOKEN_DATA})
        assert result["total_score"] == 100

    async def test_returns_status_and_recommendation(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = await agent.execute({"token_data": MOCK_TOKEN_DATA})
        assert result["status"] == "HOT"
        assert result["recommendation"] == "PIPELINE"

    async def test_auto_rejected_token(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        low_liq = dict(MOCK_TOKEN_DATA, liquidity=50000)
        result = await agent.execute({"token_data": low_liq})
        assert result["auto_rejected"] is True
        assert result["total_score"] == 0
        assert result["status"] == "SKIP"

    async def test_catalysts_applied(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        data = dict(MOCK_TOKEN_DATA)
        data["catalysts"] = {"suspicious_volume": True}
        result = await agent.execute({"token_data": data})
        assert result["catalysts"]["bonus"] == -10
        assert result["total_score"] == 90

    async def test_dflow_applied(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        data = dict(MOCK_TOKEN_DATA)
        data["dflow"] = {"routes_available": 5, "slippage_quality": "poor"}
        result = await agent.execute({"token_data": data})
        assert result["dflow_modifier"] == -8
        assert result["total_score"] == 92

    async def test_score_clamped_to_0_100(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        data = dict(MOCK_TOKEN_DATA)
        data["catalysts"] = {"viral_moment": True, "kol_mention": True}
        result = await agent.execute({"token_data": data})
        assert result["total_score"] == 100

    async def test_writes_to_scratchpad(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        await agent.execute({"token_data": MOCK_TOKEN_DATA})
        saved = agent.read_scratchpad("score_abc123solana")
        assert saved is not None
        assert saved["total_score"] == 100

    async def test_returns_token_identity(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        result = await agent.execute({"token_data": MOCK_TOKEN_DATA})
        assert result["contract_address"] == "abc123solana"
        assert result["chain"] == "solana"
        assert result["name"] == "Token A"
        assert result["symbol"] == "TKNA"

    async def test_minimal_token_data(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        minimal = {
            "contract_address": "xyz789",
            "chain": "ethereum",
            "name": "Minimal",
            "symbol": "MIN",
            "mcap": 1000000,
            "volume_24h": 500000,
            "liquidity": 250000,
        }
        result = await agent.execute({"token_data": minimal})
        assert result["total_score"] >= 0
        assert result["breakdown"]["liquidity"] == 22
        assert result["breakdown"]["volume"] == 18
        assert result["breakdown"]["age"] == 0
        assert result["breakdown"]["community"] == 0
        assert result["breakdown"]["safety"] == 0
