from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent


class ScorerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="scorer")

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")
