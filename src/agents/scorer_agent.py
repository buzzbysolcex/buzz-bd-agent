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

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
