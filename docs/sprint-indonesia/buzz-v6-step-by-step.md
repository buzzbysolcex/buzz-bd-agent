# 🐝 BUZZ v6.0 — STEP-BY-STEP IMPLEMENTATION GUIDE
## From Current v5.3.8 → v6.0 Sub-Agent Architecture
## Follow This Exact Order. Each Step Builds on the Previous.

---

## PREREQUISITES (Before Starting)

```bash
# On your Mac in Indonesia:
git clone https://github.com/buzzbysolcex/buzz-bd-agent.git
cd buzz-bd-agent
git checkout -b v6.0-subagent-architecture

# Install Claude Code + Superpowers
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

---

## WEEK 1: FOUNDATION (Feb 25 - Mar 2)

---

### DAY 1 (Feb 25): Create the Sub-Agent Base Class

**What:** Build the foundation class that ALL sub-agents inherit from.

**Step 1:** Create the directory structure:
```bash
mkdir -p src/agents
mkdir -p src/agents/tests
mkdir -p data/scratchpad
touch src/agents/__init__.py
touch src/agents/base_agent.py
touch src/agents/tests/__init__.py
touch src/agents/tests/test_base_agent.py
```

**Step 2:** Write the test FIRST (TDD — Red/Green/Refactor):
```python
# src/agents/tests/test_base_agent.py
import pytest
import asyncio
from src.agents.base_agent import BaseAgent

class TestBaseAgent:
    
    def test_agent_has_name(self):
        agent = BaseAgent(name="test_agent")
        assert agent.name == "test_agent"
    
    def test_agent_has_status(self):
        agent = BaseAgent(name="test_agent")
        assert agent.status == "idle"
    
    def test_agent_logs_events(self):
        agent = BaseAgent(name="test_agent")
        agent.log_event("action", "Scanned token", {"ca": "0x123"})
        assert len(agent.events) == 1
        assert agent.events[0]["type"] == "action"
    
    def test_agent_writes_to_scratchpad(self):
        agent = BaseAgent(name="test_agent")
        agent.write_scratchpad("scan_result", {"score": 85})
        result = agent.read_scratchpad("scan_result")
        assert result["score"] == 85
    
    @pytest.mark.asyncio
    async def test_agent_execute_is_abstract(self):
        agent = BaseAgent(name="test_agent")
        with pytest.raises(NotImplementedError):
            await agent.execute({})
```

**Step 3:** Run test — watch it FAIL (Red):
```bash
pytest src/agents/tests/test_base_agent.py -v
# Should fail: ModuleNotFoundError
```

**Step 4:** Write minimal code to make it pass (Green):
```python
# src/agents/base_agent.py
import json
import os
import time
from typing import Any, Dict, List, Optional

class BaseAgent:
    """Base class for all Buzz sub-agents.
    
    Follows Manus pattern:
    - Structured event logging
    - File-based scratchpad (persistent memory)
    - One tool call per iteration
    """
    
    def __init__(self, name: str):
        self.name = name
        self.status = "idle"  # idle | running | complete | error
        self.events: List[Dict] = []
        self.scratchpad_dir = f"data/scratchpad/{name}"
        os.makedirs(self.scratchpad_dir, exist_ok=True)
    
    def log_event(self, event_type: str, description: str, data: Dict = None):
        """Log a structured event (Manus pattern: typed events)."""
        event = {
            "type": event_type,  # action | observation | error | decision
            "description": description,
            "data": data or {},
            "timestamp": time.time(),
            "agent": self.name
        }
        self.events.append(event)
        return event
    
    def write_scratchpad(self, key: str, data: Any):
        """Write data to file-based scratchpad (Manus: externalize memory)."""
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
    
    def read_scratchpad(self, key: str) -> Optional[Any]:
        """Read data from file-based scratchpad."""
        filepath = os.path.join(self.scratchpad_dir, f"{key}.json")
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return None
    
    async def execute(self, params: Dict) -> Dict:
        """Override in subclass. Each sub-agent implements its own logic."""
        raise NotImplementedError(f"{self.name} must implement execute()")
```

**Step 5:** Run test — watch it PASS (Green):
```bash
pytest src/agents/tests/test_base_agent.py -v
# All 5 tests should pass ✅
```

**Step 6:** Commit:
```bash
git add -A
git commit -m "feat: add BaseAgent class with event logging and scratchpad"
```

---

### DAY 2 (Feb 26): Scanner Agent (DexScreener)

**What:** First sub-agent — scans DexScreener for trending tokens.

**Step 1:** Write test:
```python
# src/agents/tests/test_scanner_agent.py
import pytest
from src.agents.scanner_agent import ScannerAgent

class TestScannerAgent:
    
    def test_scanner_inherits_base(self):
        agent = ScannerAgent()
        assert agent.name == "scanner"
    
    def test_scanner_has_chains(self):
        agent = ScannerAgent()
        assert "solana" in agent.chains
        assert "ethereum" in agent.chains
        assert "base" in agent.chains
    
    @pytest.mark.asyncio
    async def test_scanner_returns_tokens(self):
        agent = ScannerAgent()
        result = await agent.execute({"chain": "solana", "limit": 5})
        assert "tokens" in result
        assert isinstance(result["tokens"], list)
    
    @pytest.mark.asyncio
    async def test_scanner_logs_events(self):
        agent = ScannerAgent()
        await agent.execute({"chain": "solana", "limit": 3})
        assert len(agent.events) >= 1
        assert agent.events[0]["type"] == "action"
    
    @pytest.mark.asyncio
    async def test_scanner_saves_to_scratchpad(self):
        agent = ScannerAgent()
        await agent.execute({"chain": "solana", "limit": 3})
        saved = agent.read_scratchpad("last_scan")
        assert saved is not None
```

**Step 2:** Implement:
```python
# src/agents/scanner_agent.py
import aiohttp
from typing import Dict, List
from src.agents.base_agent import BaseAgent

class ScannerAgent(BaseAgent):
    """Scans DexScreener for trending tokens.
    
    Intelligence Source: DexScreener API (Layer 1 - Discovery)
    Trigger: Every 4 hours via cron, or on-demand
    """
    
    DEXSCREENER_API = "https://api.dexscreener.com/token-boosts/top/v1"
    DEXSCREENER_SEARCH = "https://api.dexscreener.com/latest/dex/search"
    
    def __init__(self):
        super().__init__(name="scanner")
        self.chains = ["solana", "ethereum", "base", "bsc", "arbitrum", "avalanche"]
    
    async def execute(self, params: Dict) -> Dict:
        """Scan DexScreener for trending tokens."""
        self.status = "running"
        chain = params.get("chain", "solana")
        limit = params.get("limit", 10)
        
        self.log_event("action", f"Scanning {chain} for top {limit} tokens")
        
        try:
            tokens = await self._fetch_trending(chain, limit)
            
            self.log_event("observation", f"Found {len(tokens)} tokens", {
                "chain": chain,
                "count": len(tokens)
            })
            
            # Save to scratchpad (Manus: externalize memory)
            self.write_scratchpad("last_scan", {
                "chain": chain,
                "tokens": tokens,
                "count": len(tokens)
            })
            
            self.status = "complete"
            return {"tokens": tokens, "chain": chain}
            
        except Exception as e:
            # Leave errors in context (Manus pattern)
            self.log_event("error", f"Scan failed: {str(e)}", {
                "chain": chain,
                "error": str(e)
            })
            self.status = "error"
            return {"tokens": [], "chain": chain, "error": str(e)}
    
    async def _fetch_trending(self, chain: str, limit: int) -> List[Dict]:
        """Fetch trending tokens from DexScreener."""
        async with aiohttp.ClientSession() as session:
            # First try boosted tokens
            async with session.get(self.DEXSCREENER_API) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    # Filter by chain and limit
                    filtered = [
                        {
                            "address": t.get("tokenAddress", ""),
                            "chain": t.get("chainId", ""),
                            "description": t.get("description", ""),
                            "url": t.get("url", ""),
                            "links": t.get("links", [])
                        }
                        for t in data
                        if t.get("chainId", "").lower() == chain.lower()
                    ][:limit]
                    return filtered
                return []
```

**Step 3:** Test → Pass → Commit:
```bash
pytest src/agents/tests/test_scanner_agent.py -v
git add -A
git commit -m "feat: add ScannerAgent with DexScreener integration"
```

---

### DAY 3 (Feb 27): Scorer Agent (100-Point Algorithm)

**What:** Takes a token from Scanner, evaluates it with 100-point scoring.

```python
# src/agents/scorer_agent.py
from src.agents.base_agent import BaseAgent

class ScorerAgent(BaseAgent):
    """100-point token scoring algorithm.
    
    Intelligence Source: Internal algorithm (Layer 2 - Evaluation)
    Scoring Breakdown:
      - Liquidity (0-20): Pool depth, lock status
      - Volume (0-15): 24h trading volume relative to mcap  
      - Holders (0-15): Distribution, whale concentration
      - Contract (0-20): Verified, renounced, no honeypot
      - Social (0-15): Twitter followers, Telegram, website
      - Team (0-15): Doxxed, previous projects, reputation
    """
    
    def __init__(self):
        super().__init__(name="scorer")
    
    async def execute(self, params: Dict) -> Dict:
        self.status = "running"
        token_data = params.get("token_data", {})
        
        self.log_event("action", f"Scoring token {token_data.get('address', 'unknown')}")
        
        scores = {
            "liquidity": self._score_liquidity(token_data),
            "volume": self._score_volume(token_data),
            "holders": self._score_holders(token_data),
            "contract": self._score_contract(token_data),
            "social": self._score_social(token_data),
            "team": self._score_team(token_data),
        }
        
        total = sum(scores.values())
        
        result = {
            "address": token_data.get("address", ""),
            "scores": scores,
            "total_score": total,
            "grade": self._get_grade(total),
            "recommendation": "PIPELINE" if total >= 70 else "WATCH" if total >= 50 else "SKIP"
        }
        
        self.write_scratchpad(f"score_{token_data.get('address', 'unknown')[:8]}", result)
        self.log_event("observation", f"Score: {total}/100 → {result['recommendation']}")
        self.status = "complete"
        return result
    
    def _get_grade(self, score: int) -> str:
        if score >= 80: return "A"
        if score >= 70: return "B"
        if score >= 60: return "C"
        if score >= 50: return "D"
        return "F"
    
    # Implement each scoring function...
    def _score_liquidity(self, data): return min(20, int(data.get("liquidity_score", 0)))
    def _score_volume(self, data): return min(15, int(data.get("volume_score", 0)))
    def _score_holders(self, data): return min(15, int(data.get("holders_score", 0)))
    def _score_contract(self, data): return min(20, int(data.get("contract_score", 0)))
    def _score_social(self, data): return min(15, int(data.get("social_score", 0)))
    def _score_team(self, data): return min(15, int(data.get("team_score", 0)))
```

---

### DAY 4 (Feb 28): Safety Agent + Wallet Agent

**Safety Agent** — RugCheck + QuillShield + DFlow:
```python
# src/agents/safety_agent.py
class SafetyAgent(BaseAgent):
    """Contract safety verification.
    Intelligence Sources: RugCheck, QuillShield, DFlow MCP (Layer 3 - Safety)
    """
    def __init__(self):
        super().__init__(name="safety")
    
    async def execute(self, params: Dict) -> Dict:
        address = params.get("address", "")
        chain = params.get("chain", "solana")
        
        self.log_event("action", f"Safety check on {address[:10]}...")
        
        # Run all safety checks in parallel
        results = await asyncio.gather(
            self._check_rugcheck(address, chain),
            self._check_quillshield(address, chain),
            self._check_dflow(address, chain),
            return_exceptions=True
        )
        
        safety_score = self._aggregate_safety(results)
        
        return {
            "address": address,
            "rugcheck": results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])},
            "quillshield": results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])},
            "dflow": results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])},
            "safety_score": safety_score,
            "is_safe": safety_score >= 60
        }
```

**Wallet Agent** — Helius forensics:
```python
# src/agents/wallet_agent.py
class WalletAgent(BaseAgent):
    """Deployer wallet forensics via Helius API.
    Intelligence Source: Helius (Layer 2 - Evaluation)
    """
    def __init__(self, helius_api_key: str):
        super().__init__(name="wallet")
        self.api_key = helius_api_key
    
    async def execute(self, params: Dict) -> Dict:
        wallet_address = params.get("wallet", "")
        self.log_event("action", f"Analyzing wallet {wallet_address[:10]}...")
        
        # Fetch transaction history, token holdings, PnL
        history = await self._get_transaction_history(wallet_address)
        holdings = await self._get_token_holdings(wallet_address)
        
        return {
            "wallet": wallet_address,
            "tx_count": len(history),
            "holdings": holdings,
            "risk_flags": self._detect_risk_flags(history),
            "deployer_score": self._score_deployer(history, holdings)
        }
```

---

### DAY 5 (Mar 1): Social Agent + Deploy Agent

**Social Agent** — Grok + ATV + Serper:
```python
# src/agents/social_agent.py
class SocialAgent(BaseAgent):
    """Social media research.
    Intelligence Sources: Grok, ATV Web3 Identity, Serper (Layer 2)
    """
    async def execute(self, params: Dict) -> Dict:
        project_name = params.get("project", "")
        
        results = await asyncio.gather(
            self._search_grok(project_name),
            self._search_atv(project_name),
            self._search_serper(project_name),
            return_exceptions=True
        )
        
        return {
            "project": project_name,
            "grok_sentiment": results[0],
            "atv_identity": results[1],
            "serper_web": results[2],
            "social_score": self._aggregate_social(results)
        }
```

**Deploy Agent** — Allium 16-chain deployer intel:
```python
# src/agents/deploy_agent.py  
class DeployAgent(BaseAgent):
    """Deployer cross-chain intelligence via Allium.
    Intelligence Source: Allium (Layer 2 - Evaluation)
    """
    async def execute(self, params: Dict) -> Dict:
        deployer_address = params.get("deployer", "")
        
        cross_chain = await self._query_allium(deployer_address)
        
        return {
            "deployer": deployer_address,
            "chains_active": cross_chain.get("chains", []),
            "total_deployments": cross_chain.get("count", 0),
            "risk_level": self._assess_deployer_risk(cross_chain)
        }
```

---

### DAY 6-7 (Mar 2-3): THE ORCHESTRATOR 🔥

**This is the key piece — ties everything together:**

```python
# src/agents/orchestrator.py
import asyncio
from typing import Dict, List
from src.agents.base_agent import BaseAgent
from src.agents.scanner_agent import ScannerAgent
from src.agents.scorer_agent import ScorerAgent
from src.agents.safety_agent import SafetyAgent
from src.agents.wallet_agent import WalletAgent
from src.agents.social_agent import SocialAgent
from src.agents.deploy_agent import DeployAgent

class BuzzOrchestrator(BaseAgent):
    """Main orchestrator — Manus-style parallel sub-agent dispatch.
    
    Flow:
    1. Scanner finds tokens
    2. For EACH token, spawn parallel sub-agents:
       - Scorer, Safety, Wallet, Social, Deploy
    3. Aggregate all results
    4. Update pipeline for tokens scoring > 70
    5. Alert Ogie via Telegram for tokens scoring > 80
    """
    
    def __init__(self, config: Dict):
        super().__init__(name="orchestrator")
        self.scanner = ScannerAgent()
        self.scorer = ScorerAgent()
        self.safety = SafetyAgent()
        self.wallet = WalletAgent(config.get("helius_api_key", ""))
        self.social = SocialAgent()
        self.deploy = DeployAgent()
        self.config = config
    
    async def execute(self, params: Dict) -> Dict:
        """Full token evaluation pipeline."""
        self.status = "running"
        chain = params.get("chain", "solana")
        
        # Step 1: SCAN — find tokens
        self.log_event("action", f"Starting scan on {chain}")
        scan_result = await self.scanner.execute({"chain": chain, "limit": 10})
        tokens = scan_result.get("tokens", [])
        
        if not tokens:
            self.log_event("observation", "No tokens found")
            self.status = "complete"
            return {"evaluated": 0, "results": []}
        
        # Step 2: EVALUATE EACH TOKEN IN PARALLEL
        self.log_event("action", f"Evaluating {len(tokens)} tokens in parallel")
        
        evaluation_tasks = [
            self._evaluate_single_token(token) 
            for token in tokens
        ]
        
        results = await asyncio.gather(*evaluation_tasks, return_exceptions=True)
        
        # Step 3: FILTER AND PIPELINE
        valid_results = [r for r in results if isinstance(r, dict)]
        pipeline_worthy = [r for r in valid_results if r.get("total_score", 0) >= 70]
        
        # Step 4: UPDATE PIPELINE + TODO.MD
        self._update_pipeline(pipeline_worthy)
        self._update_todo(valid_results)
        
        # Step 5: ALERT FOR HIGH SCORES
        for r in valid_results:
            if r.get("total_score", 0) >= 80:
                await self._alert_telegram(r)
        
        self.status = "complete"
        self.log_event("observation", f"Evaluated {len(valid_results)} tokens, "
                       f"{len(pipeline_worthy)} pipeline-worthy")
        
        return {
            "evaluated": len(valid_results),
            "pipeline_worthy": len(pipeline_worthy),
            "results": valid_results
        }
    
    async def _evaluate_single_token(self, token: Dict) -> Dict:
        """Evaluate ONE token using ALL sub-agents in parallel.
        
        This is the Manus "Wide Research" pattern:
        - Each sub-agent has isolated context
        - Errors in one don't affect others
        - All run simultaneously for speed
        """
        address = token.get("address", "")
        
        # Spawn ALL sub-agents for this token simultaneously
        sub_results = await asyncio.gather(
            self.scorer.execute({"token_data": token}),
            self.safety.execute({"address": address, "chain": token.get("chain", "")}),
            self.wallet.execute({"wallet": token.get("deployer", address)}),
            self.social.execute({"project": token.get("name", "")}),
            self.deploy.execute({"deployer": token.get("deployer", address)}),
            return_exceptions=True
        )
        
        # Aggregate results from all sub-agents
        return {
            "address": address,
            "token": token,
            "score": sub_results[0] if isinstance(sub_results[0], dict) else {},
            "safety": sub_results[1] if isinstance(sub_results[1], dict) else {},
            "wallet": sub_results[2] if isinstance(sub_results[2], dict) else {},
            "social": sub_results[3] if isinstance(sub_results[3], dict) else {},
            "deploy": sub_results[4] if isinstance(sub_results[4], dict) else {},
            "total_score": sub_results[0].get("total_score", 0) if isinstance(sub_results[0], dict) else 0,
            "is_safe": sub_results[1].get("is_safe", False) if isinstance(sub_results[1], dict) else False,
        }
    
    def _update_pipeline(self, prospects: List[Dict]):
        """Update BD pipeline with new prospects."""
        self.write_scratchpad("pipeline", {
            "prospects": prospects,
            "updated_at": time.time(),
            "count": len(prospects)
        })
    
    def _update_todo(self, results: List[Dict]):
        """Update todo.md — Manus live checklist pattern."""
        todo_lines = ["# Buzz BD Pipeline — Todo\n\n"]
        for r in results:
            score = r.get("total_score", 0)
            safe = "✅" if r.get("is_safe") else "❌"
            addr = r.get("address", "")[:10]
            status = "PIPELINE" if score >= 70 else "WATCH" if score >= 50 else "SKIP"
            todo_lines.append(f"- [{status}] {addr}... Score: {score}/100 Safe: {safe}\n")
        
        with open("data/scratchpad/todo.md", "w") as f:
            f.writelines(todo_lines)
    
    async def _alert_telegram(self, result: Dict):
        """Send high-score alert to Ogie via Telegram."""
        # Implement telegram bot notification
        pass
```

---

## WEEK 2: INTEGRATION + TESTING (Mar 3-9)

### DAY 8: Wire Orchestrator to Existing Cron Jobs
```python
# src/cron_handler.py — Add to existing cron system
async def cron_full_scan():
    """Runs every 4 hours — replaces old sequential scan."""
    orchestrator = BuzzOrchestrator(config=load_config())
    
    for chain in ["solana", "ethereum", "base"]:
        result = await orchestrator.execute({"chain": chain})
        print(f"[{chain}] Evaluated: {result['evaluated']}, "
              f"Pipeline: {result['pipeline_worthy']}")
```

### DAY 9: Integration Tests
```bash
# Run full pipeline test with real APIs
pytest src/agents/tests/ -v --timeout=120

# Test parallel execution speed
python -c "
import asyncio, time
from src.agents.orchestrator import BuzzOrchestrator
async def bench():
    o = BuzzOrchestrator(config=load_config())
    start = time.time()
    r = await o.execute({'chain': 'solana'})
    elapsed = time.time() - start
    print(f'Evaluated {r[\"evaluated\"]} tokens in {elapsed:.1f}s')
asyncio.run(bench())
"
# Target: <60s for 10 tokens
```

### DAY 10-11: Docker Build + GHCR Push
```bash
# Standard workflow: Mac → Docker → GHCR → Akash
docker build -t buzz-bd-agent:v6.0-alpha .
docker tag buzz-bd-agent:v6.0-alpha ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0-alpha
docker push ghcr.io/buzzbysolcex/buzz-bd-agent:v6.0-alpha
```

### DAY 12-14: Akash Deploy + 72h Stability Test
```bash
# Deploy to Akash
# Update SDL with new image tag
# Monitor for 72 hours
# Check all 36 cron jobs execute
# Verify sub-agents complete without errors
```

---

## WEEK 3-4: REFINEMENT (Mar 10-31)

- Polish error handling
- Optimize LLM cascade for each sub-agent
- Add inline keyboards to Telegram commands
- Write Vitto/ERC-8004 article
- Get PR #263 merged
- Test x402 agent-to-agent commerce
- Final deploy as v6.0 stable

---

## QUICK REFERENCE — FILE STRUCTURE

```
buzz-bd-agent/
├── src/
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── base_agent.py          ← Day 1
│   │   ├── scanner_agent.py       ← Day 2
│   │   ├── scorer_agent.py        ← Day 3
│   │   ├── safety_agent.py        ← Day 4
│   │   ├── wallet_agent.py        ← Day 4
│   │   ├── social_agent.py        ← Day 5
│   │   ├── deploy_agent.py        ← Day 5
│   │   ├── orchestrator.py        ← Day 6-7
│   │   └── tests/
│   │       ├── test_base_agent.py
│   │       ├── test_scanner_agent.py
│   │       ├── test_scorer_agent.py
│   │       └── test_orchestrator.py
│   ├── cron_handler.py            ← Day 8
│   └── llm_cascade.py            ← Existing
├── data/
│   └── scratchpad/                ← Manus file memory
│       ├── scanner/
│       ├── scorer/
│       ├── safety/
│       ├── wallet/
│       ├── social/
│       ├── deploy/
│       ├── orchestrator/
│       └── todo.md                ← Live pipeline checklist
├── docs/
│   └── plans/
│       └── 2026-02-25-v6-subagent.md
├── Dockerfile
├── entrypoint.sh
└── requirements.txt
```

---

## THE RULE: FOR EVERY STEP

```
1. Write test FIRST → Watch it FAIL (Red)
2. Write minimal code → Watch it PASS (Green)  
3. Refactor if needed
4. Commit with descriptive message
5. Move to next step

NEVER write code before writing the test.
NEVER skip the failing test step.
```

---

*Start Day 1 on Feb 25. One agent per day. Orchestrator on weekend.*
*Bismillah 🐝🇮🇩*
