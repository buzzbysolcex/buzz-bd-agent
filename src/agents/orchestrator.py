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
