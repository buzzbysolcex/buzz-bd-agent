# src/agents/base_agent.py
import json
import os
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

VALID_EVENT_TYPES = {"action", "observation", "error", "decision"}


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
        self.status: str = "idle"
        self.events: List[Dict] = []
        scratchpad_base = os.environ.get("BUZZ_SCRATCHPAD_DIR", "data/scratchpad")
        self.scratchpad_dir = os.path.join(scratchpad_base, name)
        os.makedirs(self.scratchpad_dir, exist_ok=True)
        self._events_path = os.path.join(self.scratchpad_dir, "events.jsonl")

    def log_event(self, event_type: str, description: str, data: Optional[Dict] = None) -> Dict:
        if event_type not in VALID_EVENT_TYPES:
            raise ValueError(f"Invalid event type '{event_type}'. Must be one of: {VALID_EVENT_TYPES}")
        event = {
            "type": event_type,
            "description": description,
            "data": data or {},
            "timestamp": time.time(),
            "agent": self.name,
        }
        self.events.append(event)
        with open(self._events_path, "a") as f:
            f.write(json.dumps(event) + "\n")
        return event

    @abstractmethod
    async def execute(self, params: Dict) -> Dict:
        ...
