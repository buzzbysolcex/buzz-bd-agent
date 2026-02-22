# src/agents/scanner_agent.py
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEFAULT_CHAINS = ["solana", "ethereum", "base"]


class ScannerAgent(BaseAgent):
    def __init__(self, chains: Optional[List[str]] = None):
        super().__init__(name="scanner")
        self.chains = chains or DEFAULT_CHAINS

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
