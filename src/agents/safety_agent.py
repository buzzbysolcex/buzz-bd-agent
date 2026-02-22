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
