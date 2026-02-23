# src/agents/wallet_agent.py
import asyncio
import os
import time
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
HELIUS_API_BASE = "https://api.helius.xyz"
ALLIUM_API_URL = "https://api.allium.so/api/v1/query"

VALID_DEPTHS = {"quick", "standard", "deep"}
VALID_VERDICTS = {"CLEAN", "CAUTION", "SUSPICIOUS", "RUG_RISK"}

DEPTH_TIMEOUTS = {
    "quick": aiohttp.ClientTimeout(total=3),
    "standard": aiohttp.ClientTimeout(total=8),
    "deep": aiohttp.ClientTimeout(total=15),
}

MAX_LIQUIDITY = 25
MAX_HOLDERS = 25
MAX_DEPLOYER = 20
MAX_TX_FLOW = 15
MAX_FORENSICS = 15

LP_LOCK_ADDRESSES = {
    "team.finance", "unicrypt", "pinksale",
    "6ggge4qs14ezgde4wrfccexnhagbpqzpgpmhyqrsqm",
}

BURN_ADDRESSES = {
    "0x000000000000000000000000000000000000dead",
    "0x0000000000000000000000000000000000000000",
    "1nc1nerator11111111111111111111111111111111",
}


class WalletAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="wallet")

    def _empty_result(self, deployer: str = "", token: str = "", chain: str = "", depth: str = "standard") -> Dict:
        return {
            "deployer_address": deployer,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "wallet_score": 0,
            "risk_level": "critical",
            "verdict": "RUG_RISK",
            "breakdown": {"liquidity": 0, "holders": 0, "deployer": 0, "tx_flow": 0, "forensics": 0},
            "liquidity_health": {"total_liquidity": 0.0, "lp_locked": False, "lp_lock_duration_days": None, "lp_burned": False, "buy_sell_ratio": 0.0, "available": False},
            "holder_distribution": {"top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0, "available": False},
            "deployer_reputation": {"age_days": 0, "total_tokens_deployed": 0, "rug_count": 0, "cross_chain_activity": False, "available": False},
            "tx_flow": {"organic_score": 0.0, "unique_buyers_24h": 0, "unique_sellers_24h": 0, "avg_tx_size": 0.0, "available": False},
            "forensics": {"bundled_wallets": [], "sybil_clusters": [], "wash_trading_detected": False, "same_funding_source": False, "available": False},
            "red_flags": [],
            "green_flags": [],
            "sources_used": [],
        }

    async def execute(self, params: Dict) -> Dict:
        deployer = params.get("deployer_address", "")
        token = params.get("token_address", "")
        chain = params.get("chain", "")
        depth = params.get("depth", "standard")

        if depth not in VALID_DEPTHS:
            depth = "standard"

        if not deployer or not token or not chain:
            self.log_event("error", "Missing deployer_address, token_address, or chain")
            return self._empty_result(deployer, token, chain, depth)

        try:
            self.log_event("action", f"Starting wallet analysis for {token} (deployer: {deployer}) on {chain}", {"depth": depth})

            liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r = await asyncio.gather(
                self._analyze_liquidity(token, chain, depth),
                self._analyze_holders(token, deployer, chain, depth),
                self._analyze_deployer(deployer, chain, depth),
                self._analyze_tx_flow(token, chain, depth),
                self._run_forensics(token, deployer, chain, depth),
            )

            result = self._compute_verdict(
                deployer, token, chain, depth,
                liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r,
            )

            if depth == "quick" and params.get("depth", "standard") == "quick" and len(result["red_flags"]) >= 2:
                self.log_event("decision", f"Auto-escalating from quick to standard: {len(result['red_flags'])} red flags")
                depth = "standard"
                liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r = await asyncio.gather(
                    self._analyze_liquidity(token, chain, depth),
                    self._analyze_holders(token, deployer, chain, depth),
                    self._analyze_deployer(deployer, chain, depth),
                    self._analyze_tx_flow(token, chain, depth),
                    self._run_forensics(token, deployer, chain, depth),
                )
                result = self._compute_verdict(
                    deployer, token, chain, depth,
                    liquidity_r, holders_r, deployer_r, tx_flow_r, forensics_r,
                )

            self.log_event("decision", f"Wallet score: {result['wallet_score']} ({result['verdict']})", {
                "wallet_score": result["wallet_score"],
                "verdict": result["verdict"],
                "red_flags": result["red_flags"],
            })

            self.write_scratchpad(f"wallet_{token}", result)
            return result
        except Exception as e:
            self.log_event("error", f"Wallet analysis failed unexpectedly: {e}")
            empty = self._empty_result(deployer, token, chain, depth)
            empty["red_flags"].append("all_sources_failed")
            return empty

    async def _analyze_liquidity(self, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "total_liquidity": 0.0, "lp_locked": False, "lp_lock_duration_days": None,
            "lp_burned": False, "buy_sell_ratio": 0.0,
            "red_flags": [], "green_flags": [],
        }
        self.log_event("action", "Analyzing liquidity via DexScreener", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{DEXSCREENER_TOKENS_URL}/{token}") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener returned {resp.status}")
                    data = await resp.json()

            pairs = data.get("pairs", [])
            if not pairs:
                self.log_event("observation", "No pairs found on DexScreener")
                return empty

            pair = pairs[0]
            liquidity_usd = float(pair.get("liquidity", {}).get("usd", 0) or 0)
            txns = pair.get("txns", {}).get("h24", {})
            buys = int(txns.get("buys", 0) or 0)
            sells = int(txns.get("sells", 0) or 0)
            buy_sell_ratio = buys / sells if sells > 0 else (float("inf") if buys > 0 else 0.0)

            labels = [l.lower() if isinstance(l, str) else "" for l in pair.get("labels", [])]
            lp_locked = any(lbl in LP_LOCK_ADDRESSES for lbl in labels)
            lp_burned = any(lbl in BURN_ADDRESSES for lbl in labels)

            score = 0
            red_flags = []
            green_flags = []

            if liquidity_usd >= 500000:
                score += 8
            elif liquidity_usd >= 100000:
                score += 5
            elif liquidity_usd >= 50000:
                score += 3

            if lp_burned:
                green_flags.append("lp_burned")
                if lp_locked:
                    score += 7  # burned AND locked
                    green_flags.append("lp_locked_long")
                else:
                    score += 5  # burned only
            elif lp_locked:
                score += 7
                green_flags.append("lp_locked_long")
            else:
                red_flags.append("unlocked_lp")

            if 0.7 <= buy_sell_ratio <= 1.5:
                score += 5
            elif buy_sell_ratio > 5.0:
                red_flags.append("honeypot_risk")

            score = min(MAX_LIQUIDITY, score)

            self.log_event("observation", f"Liquidity: ${liquidity_usd:,.0f}, score: {score}/25")
            return {
                "available": True, "score": score,
                "total_liquidity": liquidity_usd,
                "lp_locked": lp_locked, "lp_lock_duration_days": None,
                "lp_burned": lp_burned,
                "buy_sell_ratio": round(buy_sell_ratio, 2) if buy_sell_ratio != float("inf") else 999.0,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Liquidity analysis failed: {e}")
            return empty


    async def _analyze_holders(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "top10_pct": 0.0, "deployer_pct": 0.0, "unique_holders": 0, "whale_count": 0,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping holder analysis")
            return empty

        self.log_event("action", "Analyzing holders via Helius", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/tokens/{token}/holders?api-key={api_key}&limit=50"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius holders returned {resp.status}")
                    data = await resp.json()

            result_data = data.get("result", {})
            accounts = result_data.get("token_accounts", [])
            total_supply = result_data.get("total_supply", 0)

            if not accounts or total_supply <= 0:
                return empty

            amounts = sorted([a.get("amount", 0) for a in accounts], reverse=True)
            owners = [a.get("owner", "") for a in accounts]
            unique_holders = len(set(owners))

            top10_total = sum(amounts[:10])
            top10_pct = round((top10_total / total_supply) * 100, 1)

            deployer_amount = 0
            for a in accounts:
                if a.get("owner", "") == deployer:
                    deployer_amount = a.get("amount", 0)
                    break
            deployer_pct = round((deployer_amount / total_supply) * 100, 1)

            whale_threshold = total_supply * 0.02
            whale_count = sum(1 for amt in amounts if amt > whale_threshold)

            score = 0
            red_flags = []
            green_flags = []

            if top10_pct < 20:
                score += 10
                green_flags.append("well_distributed")
            elif top10_pct < 30:
                score += 7
            elif top10_pct < 50:
                score += 4
            else:
                red_flags.append("whale_concentration")

            if deployer_pct < 5:
                score += 5
            elif deployer_pct < 10:
                score += 3
            else:
                red_flags.append("dev_heavy_bag")

            if unique_holders >= 1000:
                score += 5
                green_flags.append("broad_holder_base")
            elif unique_holders >= 500:
                score += 3

            max_single_pct = (amounts[0] / total_supply) * 100 if amounts else 0
            if max_single_pct <= 5:
                score += 5

            score = min(MAX_HOLDERS, score)

            self.log_event("observation", f"Holders: top10={top10_pct}%, deployer={deployer_pct}%, holders={unique_holders}, score={score}/25")
            return {
                "available": True, "score": score,
                "top10_pct": top10_pct, "deployer_pct": deployer_pct,
                "unique_holders": unique_holders, "whale_count": whale_count,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Holder analysis failed: {e}")
            return empty

    async def _fetch_allium(self, deployer_address: str) -> Dict:
        """Allium cross-chain API — STUBBED."""
        self.log_event("action", "Allium API not yet implemented")
        return {"available": False}

    async def _analyze_deployer(self, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "age_days": 0, "total_tokens_deployed": 0, "rug_count": 0,
            "cross_chain_activity": False,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping deployer analysis")
            return empty

        self.log_event("action", "Analyzing deployer via Helius", {"deployer": deployer})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/addresses/{deployer}/transactions?api-key={api_key}&limit=100"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius deployer txs returned {resp.status}")
                    txs = await resp.json()

            if not txs:
                return empty

            timestamps = [tx.get("timestamp", 0) for tx in txs if tx.get("timestamp")]
            if not timestamps:
                return empty

            earliest = min(timestamps)
            now = int(time.time())
            age_days = (now - earliest) // 86400
            rug_count = 0
            total_tokens_deployed = len(txs)

            cross_chain = False
            if depth == "deep":
                allium = await self._fetch_allium(deployer)
                if allium.get("available"):
                    cross_chain = len(allium.get("chains_active", [])) > 1
                    rug_count = allium.get("rug_indicators", 0)

            score = 0
            red_flags = []
            green_flags = []

            if age_days > 365:
                score += 8
                green_flags.append("established_deployer")
            elif age_days > 180:
                score += 5
            elif age_days > 90:
                score += 3

            if rug_count == 0:
                score += 7
            elif rug_count >= 2:
                score -= 10
                red_flags.append("serial_rugger")

            if cross_chain:
                score += 5

            score = max(0, min(MAX_DEPLOYER, score))

            self.log_event("observation", f"Deployer: age={age_days}d, rugs={rug_count}, score={score}/20")
            return {
                "available": True, "score": score,
                "age_days": age_days, "total_tokens_deployed": total_tokens_deployed,
                "rug_count": rug_count, "cross_chain_activity": cross_chain,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Deployer analysis failed: {e}")
            return empty

    async def _analyze_tx_flow(self, token: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "organic_score": 0.0, "unique_buyers_24h": 0, "unique_sellers_24h": 0,
            "avg_tx_size": 0.0, "red_flags": [], "green_flags": [],
        }
        self.log_event("action", "Analyzing TX flow", {"token": token, "depth": depth})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get(f"{DEXSCREENER_TOKENS_URL}/{token}") as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener returned {resp.status}")
                    data = await resp.json()

            pairs = data.get("pairs", [])
            if not pairs:
                return empty

            pair = pairs[0]
            txns = pair.get("txns", {})
            h24 = txns.get("h24", {})
            h6 = txns.get("h6", {})
            h1 = txns.get("h1", {})

            buys_24h = int(h24.get("buys", 0) or 0)
            sells_24h = int(h24.get("sells", 0) or 0)
            buys_1h = int(h1.get("buys", 0) or 0)
            sells_1h = int(h1.get("sells", 0) or 0)

            volume_24h = float(pair.get("volume", {}).get("h24", 0) or 0)
            total_txns_24h = buys_24h + sells_24h

            organic_score = 0.0
            if total_txns_24h > 0:
                expected_h1 = total_txns_24h / 24
                actual_h1 = buys_1h + sells_1h
                if expected_h1 > 0:
                    time_ratio = min(actual_h1 / expected_h1, 3.0) / 3.0
                    time_score = 1.0 - abs(time_ratio - 0.33) / 0.67
                else:
                    time_score = 0.0
                tx_diversity = min(total_txns_24h / 100, 1.0)
                organic_score = round((time_score * 0.4 + tx_diversity * 0.6), 2)
                organic_score = max(0.0, min(1.0, organic_score))

            avg_tx_size = round(volume_24h / total_txns_24h, 2) if total_txns_24h > 0 else 0.0

            score = 0
            red_flags = []
            green_flags = []

            if organic_score > 0.8:
                score += 8
                green_flags.append("organic_trading")
            elif organic_score > 0.5:
                score += 5

            if organic_score < 0.3:
                red_flags.append("artificial_demand")

            if buys_24h > 100:
                score += 4
            elif buys_24h > 50:
                score += 2

            if avg_tx_size > 0 and total_txns_24h > 20:
                score += 3

            score = min(MAX_TX_FLOW, score)

            self.log_event("observation", f"TX Flow: organic={organic_score}, buyers={buys_24h}, score={score}/15")
            return {
                "available": True, "score": score,
                "organic_score": organic_score,
                "unique_buyers_24h": buys_24h,
                "unique_sellers_24h": sells_24h,
                "avg_tx_size": avg_tx_size,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"TX flow analysis failed: {e}")
            return empty

    async def _run_forensics(self, token: str, deployer: str, chain: str, depth: str) -> Dict:
        empty = {
            "available": False, "score": 0,
            "bundled_wallets": [], "sybil_clusters": [],
            "wash_trading_detected": False, "same_funding_source": False,
            "red_flags": [], "green_flags": [],
        }
        if depth == "quick":
            return empty

        api_key = os.environ.get("HELIUS_API_KEY", "")
        if not api_key:
            self.log_event("error", "HELIUS_API_KEY not set, skipping forensics")
            return empty

        self.log_event("action", "Running forensics analysis", {"token": token})
        timeout = DEPTH_TIMEOUTS.get(depth, DEPTH_TIMEOUTS["standard"])
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                url = f"{HELIUS_API_BASE}/v0/addresses/{token}/transactions?api-key={api_key}&limit=100&type=SWAP"
                async with session.get(url) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"Helius forensics returned {resp.status}")
                    txs = await resp.json()

            if not txs:
                return {**empty, "available": True, "score": MAX_FORENSICS}

            by_timestamp: Dict[int, list] = {}
            for tx in txs:
                ts = tx.get("timestamp", 0)
                payer = tx.get("feePayer", "")
                if ts and payer:
                    by_timestamp.setdefault(ts, []).append(payer)

            bundled_wallets = []
            for ts, payers in by_timestamp.items():
                unique_payers = list(set(payers))
                if len(unique_payers) >= 2:
                    bundled_wallets.extend(unique_payers)
            bundled_wallets = list(set(bundled_wallets))

            # Stubbed — requires cross-referencing funding txs (planned for deep mode)
            sybil_clusters: list = []
            wash_trading_detected = False
            same_funding_source = False  # TODO: detect in deep mode via shared funding source analysis

            score = 0
            red_flags = []
            green_flags = []

            if not bundled_wallets:
                score += 5
            else:
                score -= 5
                red_flags.append("bundled_wallets")

            if not sybil_clusters:
                score += 5

            if not wash_trading_detected:
                score += 5

            if same_funding_source:
                score -= 3

            score = max(0, min(MAX_FORENSICS, score))

            self.log_event("observation", f"Forensics: bundled={len(bundled_wallets)}, score={score}/15")
            return {
                "available": True, "score": score,
                "bundled_wallets": bundled_wallets,
                "sybil_clusters": sybil_clusters,
                "wash_trading_detected": wash_trading_detected,
                "same_funding_source": same_funding_source,
                "red_flags": red_flags, "green_flags": green_flags,
            }
        except Exception as e:
            self.log_event("error", f"Forensics analysis failed: {e}")
            return empty

    def _compute_verdict(self, deployer: str, token: str, chain: str, depth: str,
                         liquidity_r: Dict, holders_r: Dict, deployer_r: Dict,
                         tx_flow_r: Dict, forensics_r: Dict) -> Dict:
        analyses = [
            (liquidity_r, MAX_LIQUIDITY),
            (holders_r, MAX_HOLDERS),
            (deployer_r, MAX_DEPLOYER),
            (tx_flow_r, MAX_TX_FLOW),
            (forensics_r, MAX_FORENSICS),
        ]

        raw_score = 0
        available_points = 0
        for result, max_pts in analyses:
            if result.get("available", False):
                raw_score += result.get("score", 0)
                available_points += max_pts

        if available_points > 0:
            wallet_score = round((raw_score / available_points) * 100)
        else:
            wallet_score = 0

        wallet_score = max(0, min(100, wallet_score))

        if wallet_score >= 80:
            risk_level = "low"
            verdict = "CLEAN"
        elif wallet_score >= 60:
            risk_level = "medium"
            verdict = "CAUTION"
        elif wallet_score >= 35:
            risk_level = "high"
            verdict = "SUSPICIOUS"
        else:
            risk_level = "critical"
            verdict = "RUG_RISK"

        red_flags = []
        green_flags = []
        for result, _ in analyses:
            red_flags.extend(result.get("red_flags", []))
            green_flags.extend(result.get("green_flags", []))

        if available_points == 0:
            red_flags.append("all_sources_failed")

        sources_used = []
        if liquidity_r.get("available") or tx_flow_r.get("available"):
            sources_used.append("dexscreener")
        if holders_r.get("available") or deployer_r.get("available") or forensics_r.get("available"):
            sources_used.append("helius")
        if deployer_r.get("cross_chain_activity", False):
            sources_used.append("allium")

        breakdown = {
            "liquidity": liquidity_r.get("score", 0),
            "holders": holders_r.get("score", 0),
            "deployer": deployer_r.get("score", 0),
            "tx_flow": tx_flow_r.get("score", 0),
            "forensics": forensics_r.get("score", 0),
        }

        return {
            "deployer_address": deployer,
            "token_address": token,
            "chain": chain,
            "depth": depth,
            "wallet_score": wallet_score,
            "risk_level": risk_level,
            "verdict": verdict,
            "breakdown": breakdown,
            "liquidity_health": {
                "total_liquidity": liquidity_r.get("total_liquidity", 0.0),
                "lp_locked": liquidity_r.get("lp_locked", False),
                "lp_lock_duration_days": liquidity_r.get("lp_lock_duration_days"),
                "lp_burned": liquidity_r.get("lp_burned", False),
                "buy_sell_ratio": liquidity_r.get("buy_sell_ratio", 0.0),
                "available": liquidity_r.get("available", False),
            },
            "holder_distribution": {
                "top10_pct": holders_r.get("top10_pct", 0.0),
                "deployer_pct": holders_r.get("deployer_pct", 0.0),
                "unique_holders": holders_r.get("unique_holders", 0),
                "whale_count": holders_r.get("whale_count", 0),
                "available": holders_r.get("available", False),
            },
            "deployer_reputation": {
                "age_days": deployer_r.get("age_days", 0),
                "total_tokens_deployed": deployer_r.get("total_tokens_deployed", 0),
                "rug_count": deployer_r.get("rug_count", 0),
                "cross_chain_activity": deployer_r.get("cross_chain_activity", False),
                "available": deployer_r.get("available", False),
            },
            "tx_flow": {
                "organic_score": tx_flow_r.get("organic_score", 0.0),
                "unique_buyers_24h": tx_flow_r.get("unique_buyers_24h", 0),
                "unique_sellers_24h": tx_flow_r.get("unique_sellers_24h", 0),
                "avg_tx_size": tx_flow_r.get("avg_tx_size", 0.0),
                "available": tx_flow_r.get("available", False),
            },
            "forensics": {
                "bundled_wallets": forensics_r.get("bundled_wallets", []),
                "sybil_clusters": forensics_r.get("sybil_clusters", []),
                "wash_trading_detected": forensics_r.get("wash_trading_detected", False),
                "same_funding_source": forensics_r.get("same_funding_source", False),
                "available": forensics_r.get("available", False),
            },
            "red_flags": red_flags,
            "green_flags": green_flags,
            "sources_used": sources_used,
        }
