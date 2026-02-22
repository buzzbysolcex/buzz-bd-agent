import asyncio
import aiohttp
from typing import Dict, List
from src.agents.base_agent import BaseAgent

RUGCHECK_API_URL = "https://api.rugcheck.xyz/v1/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)

TIER_1_DEXES = {"jupiter", "raydium", "orca", "uniswap", "sushiswap", "curve", "pancakeswap"}

RUGCHECK_WEIGHT = 0.3
QUILLSHIELD_WEIGHT = 0.5


class SafetyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="safety")

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")

    def _map_rugcheck_score(self, report: Dict) -> int:
        score = 100
        risks = report.get("risks", [])
        for risk in risks:
            name = risk.get("name", "").lower()
            if "honeypot" in name:
                score -= 40
            elif "mint" in name and "authority" in name:
                score -= 20
            elif "freeze" in name and "authority" in name:
                score -= 15
            else:
                score -= 10
        return max(0, score)

    async def _fetch_rugcheck(self, address: str, chain: str) -> Dict:
        empty = {"score": 0, "is_honeypot": False, "risks": [], "available": False}
        if chain.lower() != "solana":
            self.log_event("decision", f"RugCheck skipped — chain '{chain}' not supported")
            return empty
        self.log_event("action", "Calling RugCheck API", {"address": address})
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                async with session.get(f"{RUGCHECK_API_URL}/{address}/report") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"RugCheck returned {resp.status}")
                    report = await resp.json()
            risk_names = [r.get("name", "") for r in report.get("risks", [])]
            is_honeypot = any("honeypot" in n.lower() for n in risk_names)
            score = self._map_rugcheck_score(report)
            self.log_event("observation", f"RugCheck score: {score}, honeypot: {is_honeypot}")
            return {"score": score, "is_honeypot": is_honeypot, "risks": risk_names, "available": True}
        except Exception as e:
            self.log_event("error", f"RugCheck API failed: {e}")
            return empty
