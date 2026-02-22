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

    async def run(self, params: Dict) -> Dict:
        self.status = "running"
        self.log_event("action", f"{self.name} starting")
        try:
            result = await self.execute(params)
            self.status = "complete"
            self.log_event("observation", f"{self.name} completed")
            return result
        except Exception as e:
            self.status = "error"
            self.log_event("error", str(e))
            raise

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

    def write_scratchpad(self, key: str, data: Any) -> None:
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

    def read_scratchpad(self, key: str) -> Optional[Any]:
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None

    def context(self, max_events: int = 10) -> Dict:
        return {
            "agent": self.name,
            "status": self.status,
            "recent_events": self.events[-max_events:],
            "scratchpad_keys": self._list_scratchpad_keys(),
        }

    def _list_scratchpad_keys(self) -> List[str]:
        keys = []
        if os.path.isdir(self.scratchpad_dir):
            for filename in sorted(os.listdir(self.scratchpad_dir)):
                if filename.endswith(".json"):
                    keys.append(filename[:-5])
        return keys

    @abstractmethod
    async def execute(self, params: Dict) -> Dict:
        ...
