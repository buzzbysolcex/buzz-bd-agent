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
