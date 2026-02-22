from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

LIQUIDITY_THRESHOLDS = [
    (500_000, 30),
    (250_000, 22),
    (100_000, 15),
    (50_000, 8),
]

VOLUME_THRESHOLDS = [
    (1_000_000, 25),
    (500_000, 18),
    (100_000, 12),
    (50_000, 6),
]

COMMUNITY_FACTORS = {
    "twitter_followers": {"weight": 0.3, "threshold": 10_000},
    "telegram_members": {"weight": 0.3, "threshold": 5_000},
    "discord_members": {"weight": 0.2, "threshold": 3_000},
    "engagement_rate": {"weight": 0.2, "threshold": 0.05},
}

SAFETY_CHECKS = [
    "verified_source",
    "no_honeypot",
    "renounced_ownership",
    "locked_liquidity",
    "audit_report",
]
SAFETY_POINTS_PER_CHECK = 3

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
            return 0       # too new
        if 3 <= age_days < 7:
            return 10      # new but stable
        if 7 <= age_days <= 30:
            return 15      # optimal
        if 30 < age_days <= 90:
            return 10      # mature
        return 5           # too old (>90)

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

    def _apply_catalysts(self, catalysts: Dict) -> Dict:
        bonus = 0
        applied = []
        for flag, points, label in CATALYST_BONUSES + CATALYST_PENALTIES:
            if catalysts.get(flag, False):
                bonus += points
                applied.append(label)
        return {"bonus": bonus, "applied": applied}

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

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
