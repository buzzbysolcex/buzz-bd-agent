import pytest
from src.agents.scorer_agent import ScorerAgent
from src.agents.base_agent import BaseAgent


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
