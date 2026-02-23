# src/agents/orchestrator.py
import asyncio
from typing import Any, Dict, List, Optional

from src.agents.base_agent import BaseAgent
from src.agents.scanner_agent import ScannerAgent
from src.agents.scorer_agent import ScorerAgent
from src.agents.safety_agent import SafetyAgent
from src.agents.wallet_agent import WalletAgent
from src.agents.social_agent import SocialAgent
from src.agents.deploy_agent import DeployAgent


class OrchestratorAgent(BaseAgent):
    AGENT_WEIGHTS = {
        "safety": 0.25,
        "wallet": 0.25,
        "social": 0.20,
        "scorer": 0.15,
        "deploy": 0.15,
    }

    STRONG_LIST_THRESHOLD = 80
    LIST_THRESHOLD = 60
    REVIEW_THRESHOLD = 40

    STANDARD_ESCALATION = 50
    DEEP_ESCALATION = 70

    AGENT_TIMEOUT = 30  # seconds

    CRITICAL_FLAGS = frozenset({
        "safety:honeypot_detected",
        "wallet:serial_rugger",
        "wallet:bundled_wallets",
    })

    SCORE_KEYS = {
        "scorer": "total_score",
        "safety": "safety_score",
        "wallet": "wallet_score",
        "social": "social_score",
        "deploy": "deploy_score",
    }

    def __init__(self):
        super().__init__(name="orchestrator")
        self._scanner = ScannerAgent()
        self._agents = {
            "scorer": ScorerAgent(),
            "safety": SafetyAgent(),
            "wallet": WalletAgent(),
            "social": SocialAgent(),
            "deploy": DeployAgent(),
        }

    async def execute(self, params: Dict) -> Dict:
        mode = params.get("mode", "scan")
        if mode == "scan":
            return await self._run_scan_pipeline(params)
        elif mode == "evaluate":
            return await self._evaluate_single_token(
                params["token_data"],
                depth=params.get("depth", "quick"),
            )
        else:
            raise ValueError(f"Unknown mode: {mode}")

    async def _run_scan_pipeline(self, params: Dict) -> Dict:
        self.log_event("action", "Starting token scan")
        scan_result = await self._scanner.run(params)
        tokens = scan_result.get("tokens", [])
        self.log_event("observation", f"Scanner found {len(tokens)} tokens")

        results = []
        for token in tokens:
            token_data = {
                "token_address": token["contract_address"],
                "deployer_address": token.get("deployer_address", ""),
                "chain": token["chain"],
                "project_name": token.get("name", ""),
                "market_data": {
                    "mcap": token.get("mcap", 0),
                    "volume_24h": token.get("volume_24h", 0),
                    "liquidity": token.get("liquidity", 0),
                },
            }
            result = await self._evaluate_single_token(token_data, depth="quick")
            results.append(result)

        self.write_scratchpad("last_scan_results", {
            "tokens_scanned": len(tokens),
            "results": results,
        })

        summary = self._build_summary(results)
        self.log_event("observation", f"Scan complete: {summary}")

        return {
            "tokens_scanned": len(tokens),
            "results": results,
            "summary": summary,
        }

    def _build_summary(self, results: List[Dict]) -> Dict:
        summary = {"strong_list": 0, "list": 0, "review": 0, "reject": 0, "avg_score": 0}
        for r in results:
            v = r["unified_verdict"].lower()
            summary[v] = summary.get(v, 0) + 1
        if results:
            summary["avg_score"] = round(
                sum(r["unified_score"] for r in results) / len(results)
            )
        return summary

    def _redistribute_weights(self, failed_agents: List[str]) -> Dict[str, float]:
        surviving = {
            name: weight
            for name, weight in self.AGENT_WEIGHTS.items()
            if name not in failed_agents
        }
        if not surviving:
            return {}
        total = sum(surviving.values())
        return {name: weight / total for name, weight in surviving.items()}

    def _compute_unified_verdict(self, score: int, red_flags: List[str]) -> str:
        if self.CRITICAL_FLAGS.intersection(red_flags):
            return "REJECT"
        if score >= self.STRONG_LIST_THRESHOLD:
            return "STRONG_LIST"
        if score >= self.LIST_THRESHOLD:
            return "LIST"
        if score >= self.REVIEW_THRESHOLD:
            return "REVIEW"
        return "REJECT"

    def _merge_results(self, agent_results: Dict[str, Optional[Dict]], token_data: Dict) -> Dict:
        available = {}
        failed_agents = []
        for name, result in agent_results.items():
            if result is not None:
                key = self.SCORE_KEYS[name]
                available[name] = result.get(key, 0)
            else:
                failed_agents.append(name)

        weights = self._redistribute_weights(failed_agents)

        if available:
            unified_score = sum(available[name] * weights[name] for name in available)
            unified_score = max(0, min(100, round(unified_score)))
        else:
            unified_score = 0

        all_red_flags = []
        all_green_flags = []
        for name, result in agent_results.items():
            if result is not None:
                for flag in result.get("red_flags", []):
                    all_red_flags.append(f"{name}:{flag}")
                for flag in result.get("green_flags", []):
                    all_green_flags.append(f"{name}:{flag}")

        unified_verdict = self._compute_unified_verdict(unified_score, all_red_flags)

        return {
            "token_address": token_data.get("token_address", ""),
            "chain": token_data.get("chain", ""),
            "project_name": token_data.get("project_name", ""),
            "unified_score": unified_score,
            "unified_verdict": unified_verdict,
            "weights_used": weights,
            "agent_scores": available,
            "failed_agents": failed_agents,
            "red_flags": all_red_flags,
            "green_flags": all_green_flags,
            "agent_results": {
                name: result for name, result in agent_results.items()
                if result is not None
            },
        }

    async def _run_agents_parallel(self, agent_params: Dict[str, Dict]) -> Dict[str, Optional[Dict]]:
        async def _run_with_timeout(name: str, params: Dict):
            try:
                result = await asyncio.wait_for(
                    self._agents[name].run(params),
                    timeout=self.AGENT_TIMEOUT,
                )
                return (name, result)
            except asyncio.TimeoutError:
                self.log_event("error", f"{name} timed out after {self.AGENT_TIMEOUT}s")
                return (name, None)
            except Exception as e:
                self.log_event("error", f"{name} failed: {str(e)}")
                return (name, None)

        tasks = [_run_with_timeout(name, params) for name, params in agent_params.items()]
        results = await asyncio.gather(*tasks)
        return dict(results)

    def _build_agent_params(self, token_data: Dict, depth: str) -> Dict[str, Dict]:
        return {
            "scorer": {
                "token_data": {
                    "contract_address": token_data["token_address"],
                    "chain": token_data["chain"],
                    "name": token_data.get("project_name", ""),
                    "symbol": token_data.get("symbol", ""),
                    "liquidity": token_data.get("market_data", {}).get("liquidity", 0),
                    "volume_24h": token_data.get("market_data", {}).get("volume_24h", 0),
                },
            },
            "safety": {
                "contract_address": token_data["token_address"],
                "chain": token_data["chain"],
            },
            "wallet": {
                "deployer_address": token_data.get("deployer_address", ""),
                "token_address": token_data["token_address"],
                "chain": token_data["chain"],
                "depth": depth,
            },
            "social": {
                "project_name": token_data.get("project_name", ""),
                "token_address": token_data["token_address"],
                "chain": token_data["chain"],
                "deployer_address": token_data.get("deployer_address", ""),
                "depth": depth,
            },
            "deploy": {
                "deployer_address": token_data.get("deployer_address", ""),
                "chain": token_data["chain"],
                "depth": depth,
            },
        }

    async def _evaluate_single_token(self, token_data: Dict, depth: str = "quick") -> Dict:
        self.log_event("action", f"Evaluating {token_data.get('token_address', '?')} at depth={depth}")

        agent_params = self._build_agent_params(token_data, depth)
        agent_results = await self._run_agents_parallel(agent_params)
        merged = self._merge_results(agent_results, token_data)

        # Depth escalation (only from quick)
        if depth == "quick" and merged["unified_score"] >= self.DEEP_ESCALATION:
            self.log_event("decision", f"Escalating to deep (score={merged['unified_score']})")
            return await self._evaluate_single_token(token_data, depth="deep")
        elif depth == "quick" and merged["unified_score"] >= self.STANDARD_ESCALATION:
            self.log_event("decision", f"Escalating to standard (score={merged['unified_score']})")
            return await self._evaluate_single_token(token_data, depth="standard")

        addr = token_data.get("token_address", "unknown")
        self.write_scratchpad(f"eval_{addr}", merged)

        return merged

    def format_scan_result(self, scan_result: Dict) -> str:
        summary = scan_result.get("summary", {})
        results = scan_result.get("results", [])

        lines = [
            "\U0001f50d *Scan Complete*",
            f"Tokens scanned: {scan_result.get('tokens_scanned', 0)}",
            f"Strong List: {summary.get('strong_list', 0)} | List: {summary.get('list', 0)}",
            f"Review: {summary.get('review', 0)} | Reject: {summary.get('reject', 0)}",
            "",
        ]

        top = [r for r in results if r["unified_verdict"] in ("STRONG_LIST", "LIST")]
        for r in top[:10]:
            emoji = "\U0001f7e2" if r["unified_verdict"] == "STRONG_LIST" else "\U0001f7e1"
            flags = f" \u26a0\ufe0f {len(r['red_flags'])}" if r["red_flags"] else ""
            lines.append(
                f"{emoji} *{r['project_name']}* | "
                f"Score: {r['unified_score']} | "
                f"{r['unified_verdict']}{flags}"
            )

        return "\n".join(lines)

    def format_evaluate_result(self, eval_result: Dict) -> str:
        verdict_emoji = {
            "STRONG_LIST": "\U0001f7e2",
            "LIST": "\U0001f7e1",
            "REVIEW": "\U0001f7e0",
            "REJECT": "\U0001f534",
        }
        v = eval_result["unified_verdict"]

        emoji = verdict_emoji.get(v, "⚪")
        name = eval_result.get("project_name", "Unknown")
        lines = [
            f"{emoji} *{name}*",
            f"Score: *{eval_result['unified_score']}*/100 \u2192 {v}",
            "",
            "*Agent Breakdown:*",
        ]

        for agent_name, score in eval_result.get("agent_scores", {}).items():
            weight = eval_result.get("weights_used", {}).get(agent_name, 0)
            lines.append(f"  {agent_name}: {score}/100 (w={weight:.0%})")

        if eval_result.get("failed_agents"):
            lines.append(f"\n\u26a0\ufe0f Failed: {', '.join(eval_result['failed_agents'])}")

        if eval_result.get("red_flags"):
            lines.append("\n\U0001f6a9 *Red Flags:*")
            for flag in eval_result["red_flags"][:10]:
                lines.append(f"  \u2022 {flag}")

        if eval_result.get("green_flags"):
            lines.append("\n\u2705 *Green Flags:*")
            for flag in eval_result["green_flags"][:10]:
                lines.append(f"  \u2022 {flag}")

        return "\n".join(lines)
