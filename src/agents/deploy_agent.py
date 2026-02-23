import asyncio
import os
import time
import aiohttp
from typing import Dict
from src.agents.base_agent import BaseAgent

HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"
HELIUS_DAS_URL = "https://mainnet.helius-rpc.com"
ALLIUM_API_URL = "https://api.allium.so/api/v1/query"

VALID_DEPTHS = {"quick", "standard", "deep"}

DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=8),
    "deep": aiohttp.ClientTimeout(total=15),
}

MAX_DEPLOYMENT_HISTORY = 30
MAX_FINANCIAL_HEALTH = 20
MAX_CROSS_CHAIN = 30
MAX_REPUTATION = 20


class DeployAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="deploy")

    def _empty_result(self, deployer: str = "", chain: str = "", depth: str = "standard") -> Dict:
        return {
            "deployer_address": deployer,
            "chain": chain,
            "depth": depth,
            "deploy_score": 0,
            "risk_level": "critical",
            "cross_chain_reputation": "unknown",
            "chains_active": [],
            "total_deployments": 0,
            "breakdown": {
                "cross_chain_activity": 0,
                "deployment_history": 0,
                "financial_health": 0,
                "reputation": 0,
            },
            "deployment_analysis": {
                "total_deployments": 0,
                "deployment_frequency": "first_time",
                "wallet_age_days": 0,
                "oldest_tx_timestamp": None,
                "available": False,
            },
            "portfolio_analysis": {
                "total_tokens_held": 0,
                "estimated_value_usd": 0.0,
                "has_significant_holdings": False,
                "available": False,
            },
            "cross_chain_analysis": {
                "chains_detected": [],
                "total_cross_chain_txns": 0,
                "cross_chain_pnl_usd": 0.0,
                "available": False,
            },
            "red_flags": [],
            "green_flags": [],
            "sources_used": [],
        }

    async def _analyze_deployments(self, deployer: str, chain: str, depth: str) -> Dict:
        """Analyze deployment history via Helius enhanced transactions."""
        empty = {
            "available": False, "score": 0,
            "total_deployments": 0, "deployment_frequency": "first_time",
            "wallet_age_days": 0, "oldest_tx_timestamp": None,
            "red_flags": [], "green_flags": [],
        }

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping deployment analysis")
            return empty

        self.log_event("action", "Analyzing deployments via Helius", {"deployer": deployer})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            url = HELIUS_TXN_URL.format(address=deployer)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{url}?api-key={api_key}&limit=100") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius txns returned {resp.status}")
                    txns = await resp.json()

            if not txns:
                return empty

            timestamps = [tx.get("timestamp", 0) for tx in txns if tx.get("timestamp")]
            if not timestamps:
                return empty

            oldest_ts = min(timestamps)
            now = int(time.time())
            wallet_age_days = (now - oldest_ts) // 86400

            total_deployments = len(txns)

            if total_deployments >= 10:
                deployment_frequency = "prolific"
            elif total_deployments >= 5:
                deployment_frequency = "moderate"
            elif total_deployments >= 2:
                deployment_frequency = "occasional"
            else:
                deployment_frequency = "first_time"

            # Deployment History scoring (0-30 pts)
            score = 0
            red_flags = []
            green_flags = []

            if total_deployments >= 10:
                score += 10
            elif total_deployments >= 5:
                score += 7
            elif total_deployments >= 2:
                score += 4

            if wallet_age_days >= 365:
                score += 10
            elif wallet_age_days >= 180:
                score += 7
            elif wallet_age_days >= 30:
                score += 4

            if deployment_frequency in ("prolific", "moderate"):
                score += 5
            elif deployment_frequency == "occasional":
                score += 3

            score = min(MAX_DEPLOYMENT_HISTORY, score)

            self.log_event("observation", f"Deployments: count={total_deployments}, age={wallet_age_days}d, freq={deployment_frequency}, score={score}/30")
            return {
                "available": True, "score": score,
                "total_deployments": total_deployments,
                "deployment_frequency": deployment_frequency,
                "wallet_age_days": wallet_age_days,
                "oldest_tx_timestamp": str(oldest_ts),
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Deployment analysis failed: {e}")
            return empty

    async def execute(self, params: Dict) -> Dict:
        deployer = params.get("deployer_address", "")
        chain = params.get("chain", "")
        depth = params.get("depth", "standard")

        if depth not in VALID_DEPTHS:
            depth = "standard"

        if not deployer or not chain:
            self.log_event("error", "Missing deployer_address or chain")
            return self._empty_result(deployer, chain, depth)

        try:
            self.log_event("action", f"Starting deploy analysis for {deployer} on {chain}", {"depth": depth})
            # Analysis methods will be added in subsequent tasks
            return self._empty_result(deployer, chain, depth)
        except Exception as e:
            self.log_event("error", f"Deploy analysis failed unexpectedly: {e}")
            empty = self._empty_result(deployer, chain, depth)
            empty["red_flags"].append("all_sources_failed")
            return empty
