# ScorerAgent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build ScorerAgent — the Layer 2 (Score & Qualify) sub-agent that applies a 100-point scoring engine to token candidates and returns status/recommendation.

**Architecture:** ScorerAgent inherits BaseAgent. Private scorer methods for each of 5 dimensions (Liquidity 30 + Volume 25 + Age 15 + Community 15 + Safety 15 = 100 base points). Catalyst bonuses/penalties and DFlow modifiers adjust the total. Auto-reject criteria gate entry. Final score clamped 0-100, mapped to HOT/QUALIFIED/WATCH/SKIP status.

**Tech Stack:** Python 3.9+, BaseAgent from src/agents/base_agent.py. No external packages.

**Design doc:** `docs/plans/2026-02-23-scorer-agent-design.md`

---

### Task 1: ScorerAgent Skeleton

**Files:**
- Create: `src/agents/tests/test_scorer_agent.py`
- Create: `src/agents/scorer_agent.py`

**Step 1: Write the failing tests**

```python
# src/agents/tests/test_scorer_agent.py
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestScorerAgentInit -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'src.agents.scorer_agent'`

**Step 3: Create minimal scorer_agent.py**

```python
# src/agents/scorer_agent.py
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent


class ScorerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="scorer")

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestScorerAgentInit -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add ScorerAgent skeleton inheriting BaseAgent"
```

---

### Task 2: Liquidity and Volume Scorers

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

Both use the same threshold-stepping pattern from scoring.json.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestScoreLiquidity src/agents/tests/test_scorer_agent.py::TestScoreVolume -v`
Expected: FAIL — `AttributeError: 'ScorerAgent' object has no attribute '_score_liquidity'`

**Step 3: Implement _score_liquidity and _score_volume**

Add these constants at module level in `src/agents/scorer_agent.py`:

```python
# Liquidity thresholds (0-30 points)
LIQUIDITY_THRESHOLDS = [
    (500_000, 30),
    (250_000, 22),
    (100_000, 15),
    (50_000, 8),
]

# Volume 24h thresholds (0-25 points)
VOLUME_THRESHOLDS = [
    (1_000_000, 25),
    (500_000, 18),
    (100_000, 12),
    (50_000, 6),
]
```

Add these methods to `ScorerAgent`:

```python
def _score_liquidity(self, liquidity: float) -> int:
    for min_val, points in LIQUIDITY_THRESHOLDS:
        if liquidity >= min_val:
            return points
    return 0

def _score_volume(self, volume_24h: float) -> int:
    for min_val, points in VOLUME_THRESHOLDS:
        if volume_24h >= min_val:
            return points
    return 0
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: 15 PASSED (3 init + 7 liquidity + 5 volume)

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add liquidity and volume threshold scorers"
```

---

### Task 3: Age Scorer

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

Age scoring uses ranges rather than simple thresholds.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestScoreAge -v`
Expected: FAIL — `AttributeError: 'ScorerAgent' object has no attribute '_score_age'`

**Step 3: Implement _score_age**

Add this method to `ScorerAgent`:

```python
def _score_age(self, age_days: Optional[float]) -> int:
    if age_days is None:
        return 0
    if age_days < 2:
        return 0       # too new
    if 3 <= age_days < 7:
        return 10      # new but stable
    if 7 <= age_days <= 30:
        return 15      # optimal
    if 30 < age_days <= 90:
        return 10      # mature
    return 5           # too old (>90)
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: 27 PASSED (3 + 7 + 5 + 12)

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add age range scorer"
```

---

### Task 4: Community and Safety Scorers

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

Community uses weighted proportional scoring. Safety uses flag-based addition.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`:

```python
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
        # 0.3 * 15 = 4.5, rounded = 4 or 5
        score = agent._score_community(socials)
        assert score == round(15 * 0.3)

    def test_proportional_twitter_half(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        socials = {"twitter_followers": 5000}  # half of 10K threshold
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestScoreCommunity src/agents/tests/test_scorer_agent.py::TestScoreSafety -v`
Expected: FAIL — `AttributeError`

**Step 3: Implement _score_community and _score_safety**

Add these constants at module level:

```python
# Community scoring weights and thresholds
COMMUNITY_FACTORS = {
    "twitter_followers": {"weight": 0.3, "threshold": 10_000},
    "telegram_members": {"weight": 0.3, "threshold": 5_000},
    "discord_members": {"weight": 0.2, "threshold": 3_000},
    "engagement_rate": {"weight": 0.2, "threshold": 0.05},
}

# Contract safety checks (3 points each)
SAFETY_CHECKS = [
    "verified_source",
    "no_honeypot",
    "renounced_ownership",
    "locked_liquidity",
    "audit_report",
]
SAFETY_POINTS_PER_CHECK = 3
```

Add these methods to `ScorerAgent`:

```python
def _score_community(self, socials: Dict) -> int:
    if not socials:
        return 0
    score = 0.0
    for factor, config in COMMUNITY_FACTORS.items():
        value = socials.get(factor, 0)
        if value >= config["threshold"]:
            score += 15 * config["weight"]
        elif value > 0:
            score += 15 * config["weight"] * (value / config["threshold"])
    return round(score)

def _score_safety(self, contract: Dict) -> int:
    if not contract:
        return 0
    score = 0
    for check in SAFETY_CHECKS:
        if contract.get(check, False):
            score += SAFETY_POINTS_PER_CHECK
    return score
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: 36 PASSED (3 + 7 + 5 + 12 + 5 + 4)

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add community and safety scorers"
```

---

### Task 5: Catalyst System

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`:

```python
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
            "viral_moment": True,       # +10
            "kol_mention": True,        # +10
            "suspicious_volume": True,  # -10
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestApplyCatalysts -v`
Expected: FAIL — `AttributeError`

**Step 3: Implement _apply_catalysts**

Add this constant at module level:

```python
# Catalyst bonuses and penalties: (flag_name, points, label)
CATALYST_BONUSES = [
    ("hackathon_winner", 10, "+hackathon"),
    ("viral_moment", 10, "+viral"),
    ("kol_mention", 10, "+kol"),
    ("aixbt_high_conviction", 10, "+aixbt"),
    ("dexscreener_trending", 5, "+trending"),
    ("x402_verified", 5, "+x402"),
]

CATALYST_PENALTIES = [
    ("x402_blocked", -20, "-blocked"),
    ("major_cex_listed", -15, "-cex"),
    ("liquidity_dropping", -15, "-liq"),
    ("team_inactive", -15, "-inactive"),
    ("recent_dump", -15, "-dump"),
    ("suspicious_volume", -10, "-sus"),
]
```

Add this method to `ScorerAgent`:

```python
def _apply_catalysts(self, catalysts: Dict) -> Dict:
    bonus = 0
    applied = []
    for flag, points, label in CATALYST_BONUSES + CATALYST_PENALTIES:
        if catalysts.get(flag, False):
            bonus += points
            applied.append(label)
    return {"bonus": bonus, "applied": applied}
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: 42 PASSED

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add catalyst bonus/penalty system"
```

---

### Task 6: DFlow Modifier, Auto-Reject, Status, and Recommendation

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

Four small methods grouped together.

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`:

```python
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
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestApplyDflow src/agents/tests/test_scorer_agent.py::TestCheckAutoReject src/agents/tests/test_scorer_agent.py::TestGetStatus src/agents/tests/test_scorer_agent.py::TestGetRecommendation -v`
Expected: FAIL — `AttributeError`

**Step 3: Implement all four methods**

Add these methods to `ScorerAgent`:

```python
def _apply_dflow(self, dflow_data: Dict) -> int:
    if not dflow_data:
        return 0
    routes = dflow_data.get("routes_available", 0)
    quality = dflow_data.get("slippage_quality", "")
    if quality == "poor":
        return -8
    if routes >= 3 and quality == "excellent":
        return 13
    return 0

def _check_auto_reject(self, token_data: Dict) -> Dict:
    liquidity = token_data.get("liquidity", 0)
    if liquidity < 100_000:
        return {"rejected": True, "reason": "liquidity_too_low"}

    age_days = token_data.get("age_days")
    if age_days is not None and age_days < 0.083:
        return {"rejected": True, "reason": "too_new"}

    mcap = token_data.get("mcap", 0)
    volume = token_data.get("volume_24h", 0)
    if mcap > 0 and volume / mcap > 10:
        return {"rejected": True, "reason": "suspicious_volume"}

    return {"rejected": False, "reason": None}

def _get_status(self, score: int) -> str:
    if score >= 85:
        return "HOT"
    if score >= 70:
        return "QUALIFIED"
    if score >= 50:
        return "WATCH"
    return "SKIP"

def _get_recommendation(self, status: str) -> str:
    if status in ("HOT", "QUALIFIED"):
        return "PIPELINE"
    if status == "WATCH":
        return "WATCH"
    return "SKIP"
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: 63 PASSED (42 + 6 + 5 + 4*2 + 4)

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add DFlow modifier, auto-reject, status, and recommendation"
```

---

### Task 7: execute() Orchestration

**Files:**
- Modify: `src/agents/tests/test_scorer_agent.py`
- Modify: `src/agents/scorer_agent.py`

**Step 1: Write the failing tests**

Add to `src/agents/tests/test_scorer_agent.py`. First, add a shared fixture near the top:

```python
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
```

Then add the test class:

```python
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
        assert breakdown["liquidity"] == 30   # 800K >= 500K
        assert breakdown["volume"] == 25      # 1.2M >= 1M
        assert breakdown["age"] == 15         # 14 days optimal
        assert breakdown["community"] == 15   # all above thresholds
        assert breakdown["safety"] == 15      # all checks pass

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
        data["catalysts"] = {"suspicious_volume": True}  # -10
        result = await agent.execute({"token_data": data})
        assert result["catalysts"]["bonus"] == -10
        assert result["total_score"] == 90  # 100 - 10

    async def test_dflow_applied(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        data = dict(MOCK_TOKEN_DATA)
        data["dflow"] = {"routes_available": 5, "slippage_quality": "poor"}
        result = await agent.execute({"token_data": data})
        assert result["dflow_modifier"] == -8
        assert result["total_score"] == 92  # 100 - 8

    async def test_score_clamped_to_0_100(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = ScorerAgent()
        data = dict(MOCK_TOKEN_DATA)
        data["catalysts"] = {"viral_moment": True, "kol_mention": True}  # +20
        result = await agent.execute({"token_data": data})
        assert result["total_score"] == 100  # clamped, not 120

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
        assert result["breakdown"]["age"] == 0       # missing
        assert result["breakdown"]["community"] == 0  # missing
        assert result["breakdown"]["safety"] == 0     # missing
```

**Step 2: Run tests to verify they fail**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestExecute -v`
Expected: FAIL — `NotImplementedError: TODO`

**Step 3: Replace the execute() placeholder**

Replace the `execute` method in `ScorerAgent`:

```python
async def execute(self, params: Dict) -> Dict:
    token_data = params.get("token_data", {})
    address = token_data.get("contract_address", "")
    symbol = token_data.get("symbol", "")

    # Auto-reject check
    reject = self._check_auto_reject(token_data)
    if reject["rejected"]:
        self.log_event("decision", f"Auto-rejected {symbol}: {reject['reason']}")
        result = {
            "contract_address": address,
            "chain": token_data.get("chain", ""),
            "name": token_data.get("name", ""),
            "symbol": symbol,
            "total_score": 0,
            "breakdown": {"liquidity": 0, "volume": 0, "age": 0, "community": 0, "safety": 0},
            "catalysts": {"bonus": 0, "applied": []},
            "dflow_modifier": 0,
            "status": "SKIP",
            "recommendation": "SKIP",
            "auto_rejected": True,
            "reject_reason": reject["reason"],
        }
        self.write_scratchpad(f"score_{address}", result)
        return result

    # Score each dimension
    breakdown = {
        "liquidity": self._score_liquidity(token_data.get("liquidity", 0)),
        "volume": self._score_volume(token_data.get("volume_24h", 0)),
        "age": self._score_age(token_data.get("age_days")),
        "community": self._score_community(token_data.get("socials", {})),
        "safety": self._score_safety(token_data.get("contract", {})),
    }
    base_score = sum(breakdown.values())

    # Apply modifiers
    catalysts = self._apply_catalysts(token_data.get("catalysts", {}))
    dflow_mod = self._apply_dflow(token_data.get("dflow", {}))

    # Clamp total
    total = max(0, min(100, base_score + catalysts["bonus"] + dflow_mod))

    status = self._get_status(total)
    recommendation = self._get_recommendation(status)

    self.log_event("observation", f"Scored {symbol}: {total} ({status})", {
        "total_score": total,
        "breakdown": breakdown,
        "status": status,
    })

    result = {
        "contract_address": address,
        "chain": token_data.get("chain", ""),
        "name": token_data.get("name", ""),
        "symbol": symbol,
        "total_score": total,
        "breakdown": breakdown,
        "catalysts": catalysts,
        "dflow_modifier": dflow_mod,
        "status": status,
        "recommendation": recommendation,
        "auto_rejected": False,
        "reject_reason": None,
    }

    self.write_scratchpad(f"score_{address}", result)
    return result
```

**Step 4: Run tests to verify they pass**

Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py::TestExecute -v`
Expected: 11 PASSED

Also run ALL scorer tests:
Run: `python3 -m pytest src/agents/tests/test_scorer_agent.py -v`
Expected: All tests PASSED (3 + 7 + 5 + 12 + 5 + 4 + 6 + 6 + 5 + 4*2 + 4 + 11 = ~74)

**Step 5: Commit**

```bash
git add src/agents/scorer_agent.py src/agents/tests/test_scorer_agent.py
git commit -m "feat: add execute() with full scoring pipeline"
```

---

### Task 8: Full Test Suite Verification

**Files:** None (verification only)

**Step 1: Run ALL tests (BaseAgent + ScannerAgent + ScorerAgent)**

Run: `python3 -m pytest src/agents/tests/ -v`
Expected: All tests PASS (~60 existing + ~74 new = ~134 total)

**Step 2: Verify no scratchpad leaked**

Run: `ls data/scratchpad/ 2>/dev/null && echo "LEAK" || echo "CLEAN"`
Expected: `CLEAN`

---

### Final File State Reference

After all tasks, `src/agents/scorer_agent.py` should contain approximately:

```python
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

# Liquidity thresholds (0-30 points)
LIQUIDITY_THRESHOLDS = [
    (500_000, 30),
    (250_000, 22),
    (100_000, 15),
    (50_000, 8),
]

# Volume 24h thresholds (0-25 points)
VOLUME_THRESHOLDS = [
    (1_000_000, 25),
    (500_000, 18),
    (100_000, 12),
    (50_000, 6),
]

# Community scoring weights and thresholds
COMMUNITY_FACTORS = {
    "twitter_followers": {"weight": 0.3, "threshold": 10_000},
    "telegram_members": {"weight": 0.3, "threshold": 5_000},
    "discord_members": {"weight": 0.2, "threshold": 3_000},
    "engagement_rate": {"weight": 0.2, "threshold": 0.05},
}

# Contract safety checks (3 points each)
SAFETY_CHECKS = [
    "verified_source",
    "no_honeypot",
    "renounced_ownership",
    "locked_liquidity",
    "audit_report",
]
SAFETY_POINTS_PER_CHECK = 3

# Catalyst bonuses and penalties
CATALYST_BONUSES = [
    ("hackathon_winner", 10, "+hackathon"),
    ("viral_moment", 10, "+viral"),
    ("kol_mention", 10, "+kol"),
    ("aixbt_high_conviction", 10, "+aixbt"),
    ("dexscreener_trending", 5, "+trending"),
    ("x402_verified", 5, "+x402"),
]

CATALYST_PENALTIES = [
    ("x402_blocked", -20, "-blocked"),
    ("major_cex_listed", -15, "-cex"),
    ("liquidity_dropping", -15, "-liq"),
    ("team_inactive", -15, "-inactive"),
    ("recent_dump", -15, "-dump"),
    ("suspicious_volume", -10, "-sus"),
]


class ScorerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="scorer")

    async def execute(self, params: Dict) -> Dict:
        # ... orchestration (see Task 7)

    def _score_liquidity(self, liquidity: float) -> int:
        for min_val, points in LIQUIDITY_THRESHOLDS:
            if liquidity >= min_val:
                return points
        return 0

    def _score_volume(self, volume_24h: float) -> int:
        for min_val, points in VOLUME_THRESHOLDS:
            if volume_24h >= min_val:
                return points
        return 0

    def _score_age(self, age_days: Optional[float]) -> int:
        if age_days is None:
            return 0
        if age_days < 2:
            return 0
        if 3 <= age_days < 7:
            return 10
        if 7 <= age_days <= 30:
            return 15
        if 30 < age_days <= 90:
            return 10
        return 5

    def _score_community(self, socials: Dict) -> int:
        # ... weighted proportional scoring

    def _score_safety(self, contract: Dict) -> int:
        # ... flag-based 3pts each

    def _apply_catalysts(self, catalysts: Dict) -> Dict:
        # ... bonuses + penalties

    def _apply_dflow(self, dflow_data: Dict) -> int:
        # ... +13, 0, or -8

    def _check_auto_reject(self, token_data: Dict) -> Dict:
        # ... liquidity/age/volume checks

    def _get_status(self, score: int) -> str:
        # ... HOT/QUALIFIED/WATCH/SKIP

    def _get_recommendation(self, status: str) -> str:
        # ... PIPELINE/WATCH/SKIP
```
