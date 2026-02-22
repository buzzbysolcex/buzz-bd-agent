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
        address = params.get("contract_address", "")
        chain = params.get("chain", "")
        if not address or not chain:
            self.log_event("error", "Missing contract_address or chain")
            return {
                "contract_address": address,
                "chain": chain,
                "safety_score": 0,
                "is_safe": False,
                "sources": {
                    "rugcheck": {"score": 0, "is_honeypot": False, "risks": [], "available": False},
                    "quillshield": {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False},
                    "dflow": {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0.0, "available": False},
                },
                "risk_flags": [],
                "dflow_modifier": 0,
            }
        self.log_event("action", f"Starting safety check for {address} on {chain}")
        rugcheck, quillshield, dflow = await asyncio.gather(
            self._fetch_rugcheck(address, chain),
            self._fetch_quillshield(address, chain),
            self._fetch_dflow(address, chain),
        )
        dflow_modifier = self._calculate_dflow_modifier(dflow)
        risk_flags = self._collect_risk_flags(rugcheck, quillshield, dflow)
        if not rugcheck.get("available") and not quillshield.get("available") and not dflow.get("available"):
            risk_flags.append("all_sources_failed")
        safety_score = self._aggregate_score(rugcheck, quillshield, dflow_modifier)
        is_safe = safety_score >= 60
        safe_label = "SAFE" if is_safe else "UNSAFE"
        self.log_event("decision", f"Safety score: {safety_score} ({safe_label}), {len(risk_flags)} risk flags", {
            "safety_score": safety_score,
            "is_safe": is_safe,
            "risk_flags": risk_flags,
        })
        result = {
            "contract_address": address,
            "chain": chain,
            "safety_score": safety_score,
            "is_safe": is_safe,
            "sources": {"rugcheck": rugcheck, "quillshield": quillshield, "dflow": dflow},
            "risk_flags": risk_flags,
            "dflow_modifier": dflow_modifier,
        }
        self.write_scratchpad(f"safety_{address}", result)
        return result

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

    async def _fetch_dflow(self, address: str, chain: str) -> Dict:
        self.log_event("decision", "DFlow MCP stubbed — integration pending")
        return {
            "routes_found": 0,
            "best_slippage": 0.0,
            "best_dex": "",
            "orderbook_depth": 0.0,
            "available": False,
        }

    async def _fetch_quillshield(self, address: str, chain: str) -> Dict:
        self.log_event("action", "Running QuillShield analysis", {"address": address})
        try:
            from src.scorers.quillshield import score as qs_score
            result = await qs_score(address, chain)
            self.log_event("observation", f"QuillShield score: {result.get('score', 0)}")
            return result
        except Exception as e:
            self.log_event("error", f"QuillShield failed: {e}")
            return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    def _calculate_dflow_modifier(self, dflow_result: Dict) -> int:
        if not dflow_result.get("available", False):
            return 0
        modifier = 0
        routes = dflow_result.get("routes_found", 0)
        slippage = dflow_result.get("best_slippage", 0.0)
        dex = dflow_result.get("best_dex", "").lower()
        orderbook = dflow_result.get("orderbook_depth", 0.0)
        if routes >= 3:
            modifier += 5
        if slippage > 0 and slippage < 1.0:
            modifier += 3
        if dex in TIER_1_DEXES:
            modifier += 3
        if orderbook > 50000:
            modifier += 2
        if routes == 0:
            modifier -= 5
        if slippage > 5.0:
            modifier -= 3
        return modifier

    def _collect_risk_flags(self, rugcheck: Dict, quillshield: Dict, dflow: Dict) -> List[str]:
        flags = []
        if rugcheck.get("available", False):
            if rugcheck.get("is_honeypot", False):
                flags.append("honeypot_detected")
            for risk in rugcheck.get("risks", []):
                name = risk.lower() if isinstance(risk, str) else ""
                if "mint" in name and "authority" in name:
                    flags.append("mint_authority_active")
                elif "freeze" in name and "authority" in name:
                    flags.append("freeze_authority_active")
        if quillshield.get("available", False):
            flags.extend(quillshield.get("flags", []))
        if dflow.get("available", False):
            if dflow.get("routes_found", 0) == 0:
                flags.append("no_swap_routes")
            if dflow.get("best_slippage", 0) > 5.0:
                flags.append("high_slippage")
            if dflow.get("orderbook_depth", 0) < 10000:
                flags.append("low_orderbook_depth")
        return flags

    def _aggregate_score(self, rugcheck: Dict, quillshield: Dict, dflow_modifier: int) -> int:
        sources = []
        if rugcheck.get("available", False):
            sources.append((rugcheck["score"], RUGCHECK_WEIGHT))
        if quillshield.get("available", False):
            sources.append((quillshield["score"], QUILLSHIELD_WEIGHT))
        if not sources:
            return 0
        total_weight = sum(w for _, w in sources)
        weighted_avg = sum(s * (w / total_weight) for s, w in sources)
        score = round(weighted_avg) + dflow_modifier
        return max(0, min(100, score))
