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
        raise NotImplementedError

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
