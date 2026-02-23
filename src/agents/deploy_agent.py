import asyncio
import os
import time
import aiohttp
from typing import Dict
from src.agents.base_agent import BaseAgent

HELIUS_TXN_URL = "https://api.helius.xyz/v0/addresses/{address}/transactions"
HELIUS_DAS_URL = "https://mainnet.helius-rpc.com"

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

            # TODO: filter by tx type (CREATE, token mint patterns) for accurate
            # deployment count. Currently counts all txns — matches WalletAgent pattern.
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

    async def _analyze_portfolio(self, deployer: str, depth: str) -> Dict:
        """Analyze deployer portfolio via Helius DAS (getAssetsByOwner)."""
        empty = {
            "available": False, "score": 0,
            "total_tokens_held": 0, "estimated_value_usd": 0.0,
            "has_significant_holdings": False,
            "red_flags": [], "green_flags": [],
        }

        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping portfolio analysis")
            return empty

        self.log_event("action", "Analyzing portfolio via Helius DAS", {"deployer": deployer})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            payload = {
                "jsonrpc": "2.0", "id": 1,
                "method": "getAssetsByOwner",
                "params": {"ownerAddress": deployer, "page": 1, "limit": 100},
            }
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f"{HELIUS_DAS_URL}/?api-key={api_key}",
                    json=payload,
                ) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius DAS returned {resp.status}")
                    data = await resp.json()

            items = data.get("result", {}).get("items", [])
            total_tokens_held = len(items)

            estimated_value_usd = 0.0
            for item in items:
                price = item.get("token_info", {}).get("price_info", {}).get("total_price", 0)
                estimated_value_usd += float(price or 0)

            has_significant_holdings = estimated_value_usd >= 1000

            # Financial Health scoring (0-20 pts)
            score = 0
            red_flags = []
            green_flags = []

            if total_tokens_held >= 10:
                score += 5
            elif total_tokens_held >= 3:
                score += 3

            if estimated_value_usd >= 10000:
                score += 8
            elif estimated_value_usd >= 1000:
                score += 5
            elif estimated_value_usd >= 100:
                score += 3

            if has_significant_holdings:
                score += 7

            score = min(MAX_FINANCIAL_HEALTH, score)

            self.log_event("observation", f"Portfolio: {total_tokens_held} tokens, ${estimated_value_usd:,.0f}, score={score}/20")
            return {
                "available": True, "score": score,
                "total_tokens_held": total_tokens_held,
                "estimated_value_usd": round(estimated_value_usd, 2),
                "has_significant_holdings": has_significant_holdings,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Portfolio analysis failed: {e}")
            return empty

    async def _analyze_cross_chain(self, deployer: str, chain: str, depth: str) -> Dict:
        """Analyze cross-chain activity via Allium API — STUBBED.

        When implemented, this will use Allium's async query+poll pattern:
        1. POST https://api.allium.so/api/v1/query with SQL + deployer param
        2. Get run_id from response
        3. Poll GET /api/v1/query/{run_id}/results until complete

        Planned SQL queries:

        Query 1 — Cross-chain activity:
            SELECT chain, COUNT(*) as tx_count, SUM(value_usd) as total_value
            FROM crosschain.transactions
            WHERE from_address = :deployer
            GROUP BY chain
            ORDER BY tx_count DESC

        Query 2 — Deployer PnL:
            SELECT SUM(CASE WHEN direction='in' THEN value_usd ELSE -value_usd END) as pnl_usd
            FROM crosschain.token_transfers
            WHERE address = :deployer
            AND block_timestamp > NOW() - INTERVAL '1 year'

        Auth: Authorization: Bearer {ALLIUM_API_KEY}
        """
        empty = {
            "available": False, "score": 0,
            "chains_detected": [], "total_cross_chain_txns": 0,
            "cross_chain_pnl_usd": 0.0,
            "red_flags": [], "green_flags": [],
        }

        if depth != "deep":
            return empty

        self.log_event("action", "Allium cross-chain API not yet implemented (stub)")
        return empty

    def _compute_verdict(self, deployer: str, chain: str, depth: str,
                         deploy_r: Dict, portfolio_r: Dict, cross_chain_r: Dict) -> Dict:
        analyses = [
            (deploy_r, MAX_DEPLOYMENT_HISTORY),
            (portfolio_r, MAX_FINANCIAL_HEALTH),
            (cross_chain_r, MAX_CROSS_CHAIN),
        ]

        raw_score = 0
        available_points = 0
        for result, max_pts in analyses:
            if result.get("available", False):
                raw_score += result.get("score", 0)
                available_points += max_pts

        # Reputation scoring (0-20 pts) — derived from deployment + portfolio data
        reputation_score = 0
        deploy_available = deploy_r.get("available", False)
        portfolio_available = portfolio_r.get("available", False)

        if deploy_available:
            wallet_age = deploy_r.get("wallet_age_days", 0)
            total_deps = deploy_r.get("total_deployments", 0)
            if wallet_age >= 365 and total_deps >= 5:
                reputation_score += 10
            elif wallet_age >= 180 and total_deps >= 2:
                reputation_score += 6

            # No failed/rugged tokens — assume clean (no rug detection yet)
            reputation_score += 5

        if portfolio_available and portfolio_r.get("has_significant_holdings", False):
            reputation_score += 5

        reputation_score = min(MAX_REPUTATION, reputation_score)

        if deploy_available or portfolio_available:
            raw_score += reputation_score
            available_points += MAX_REPUTATION

        if available_points > 0:
            deploy_score = round((raw_score / available_points) * 100)
        else:
            deploy_score = 0
        deploy_score = max(0, min(100, deploy_score))

        # Verdict mapping
        if deploy_score >= 80:
            risk_level = "low"
            cross_chain_reputation = "established"
        elif deploy_score >= 60:
            risk_level = "medium"
            cross_chain_reputation = "moderate"
        elif deploy_score >= 30:
            risk_level = "high"
            cross_chain_reputation = "new"
        else:
            risk_level = "critical"
            cross_chain_reputation = "unknown"

        # Aggregate flags
        red_flags = []
        green_flags = []
        for result, _ in analyses:
            red_flags.extend(result.get("red_flags", []))
            green_flags.extend(result.get("green_flags", []))

        if available_points == 0:
            red_flags.append("all_sources_failed")

        # Detect red/green flags from data
        if deploy_available:
            wallet_age = deploy_r.get("wallet_age_days", 0)
            total_deps = deploy_r.get("total_deployments", 0)

            if wallet_age < 7:
                red_flags.append("fresh_wallet")
            if total_deps == 1 and wallet_age < 30:
                red_flags.append("first_time_deployer")
            if total_deps >= 10:
                green_flags.append("prolific_deployer")
            if wallet_age >= 365 and total_deps >= 5:
                green_flags.append("established_history")

        # TODO: high_failure_rate — requires rug/failure detection not yet available
        # Spec: "more than 50% of deployments are dead/zero-value tokens"

        if portfolio_available:
            tokens_held = portfolio_r.get("total_tokens_held", 0)
            value_usd = portfolio_r.get("estimated_value_usd", 0.0)

            if tokens_held == 0 and value_usd == 0:
                red_flags.append("empty_wallet")
            if value_usd >= 1000:
                green_flags.append("positive_pnl")
            if deploy_available and deploy_r.get("total_deployments", 0) >= 3 and value_usd < 10:
                red_flags.append("negative_pnl")
            if tokens_held >= 10:
                green_flags.append("diversified_portfolio")

        if cross_chain_r.get("available", False):
            chains = cross_chain_r.get("chains_detected", [])
            if len(chains) >= 3:
                green_flags.append("multi_chain_active")
            if len(chains) == 1:
                red_flags.append("single_chain_deployer")

        # Chains active
        chains_active = [chain]
        if cross_chain_r.get("available", False):
            chains_active = cross_chain_r.get("chains_detected", [chain])
            if chain not in chains_active:
                chains_active.append(chain)

        total_deployments = deploy_r.get("total_deployments", 0)

        # Sources used
        sources_used = []
        if deploy_available or portfolio_available:
            sources_used.append("helius")
        if cross_chain_r.get("available", False):
            sources_used.append("allium")

        breakdown = {
            "cross_chain_activity": cross_chain_r.get("score", 0),
            "deployment_history": deploy_r.get("score", 0),
            "financial_health": portfolio_r.get("score", 0),
            "reputation": reputation_score,
        }

        return {
            "deployer_address": deployer,
            "chain": chain,
            "depth": depth,
            "deploy_score": deploy_score,
            "risk_level": risk_level,
            "cross_chain_reputation": cross_chain_reputation,
            "chains_active": chains_active,
            "total_deployments": total_deployments,
            "breakdown": breakdown,
            "deployment_analysis": {
                "total_deployments": total_deployments,
                "deployment_frequency": deploy_r.get("deployment_frequency", "first_time"),
                "wallet_age_days": deploy_r.get("wallet_age_days", 0),
                "oldest_tx_timestamp": deploy_r.get("oldest_tx_timestamp"),
                "available": deploy_available,
            },
            "portfolio_analysis": {
                "total_tokens_held": portfolio_r.get("total_tokens_held", 0),
                "estimated_value_usd": portfolio_r.get("estimated_value_usd", 0.0),
                "has_significant_holdings": portfolio_r.get("has_significant_holdings", False),
                "available": portfolio_available,
            },
            "cross_chain_analysis": {
                "chains_detected": cross_chain_r.get("chains_detected", []),
                "total_cross_chain_txns": cross_chain_r.get("total_cross_chain_txns", 0),
                "cross_chain_pnl_usd": cross_chain_r.get("cross_chain_pnl_usd", 0.0),
                "available": cross_chain_r.get("available", False),
            },
            "red_flags": red_flags,
            "green_flags": green_flags,
            "sources_used": sources_used,
        }

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

            deploy_r, portfolio_r, cross_chain_r = await asyncio.gather(
                self._analyze_deployments(deployer, chain, depth),
                self._analyze_portfolio(deployer, depth),
                self._analyze_cross_chain(deployer, chain, depth),
            )

            result = self._compute_verdict(deployer, chain, depth,
                                           deploy_r, portfolio_r, cross_chain_r)

            self.log_event("decision", f"Deploy score: {result['deploy_score']} ({result['risk_level']})", {
                "deploy_score": result["deploy_score"],
                "risk_level": result["risk_level"],
                "red_flags": result["red_flags"],
            })

            self.write_scratchpad(f"deploy_{deployer}", result)
            return result
        except Exception as e:
            self.log_event("error", f"Deploy analysis failed unexpectedly: {e}")
            empty = self._empty_result(deployer, chain, depth)
            empty["red_flags"].append("all_sources_failed")
            return empty
