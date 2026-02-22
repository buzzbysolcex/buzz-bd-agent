# src/agents/base_agent.py
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    async def execute(self, params: Dict) -> Dict:
        ...
