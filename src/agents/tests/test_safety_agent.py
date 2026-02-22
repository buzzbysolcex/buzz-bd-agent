import pytest
from aioresponses import aioresponses
from src.agents.safety_agent import SafetyAgent
from src.agents.base_agent import BaseAgent


RUGCHECK_API_URL = "https://api.rugcheck.xyz/v1/tokens"

MOCK_RUGCHECK_SAFE = {
    "mint": "abc123",
    "risks": [],
    "score": 10,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}

MOCK_RUGCHECK_RISKY = {
    "mint": "abc123",
    "risks": [
        {"name": "Mutable metadata", "level": "warn", "description": "..."},
        {"name": "Low liquidity", "level": "danger", "description": "..."},
    ],
    "score": 800,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}

MOCK_RUGCHECK_HONEYPOT = {
    "mint": "abc123",
    "risks": [
        {"name": "Honeypot", "level": "danger", "description": "Cannot sell"},
    ],
    "score": 3000,
    "tokenMeta": {"name": "Token A", "symbol": "TKNA"},
}


class TestSafetyAgentInit:
    def test_inherits_base_agent(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert isinstance(agent, BaseAgent)

    def test_name_is_safety(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.name == "safety"

    def test_initial_status_is_idle(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent.status == "idle"


class TestMapRugcheckScore:
    def test_no_risks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent._map_rugcheck_score(MOCK_RUGCHECK_SAFE) == 100

    def test_some_risks(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        score = agent._map_rugcheck_score(MOCK_RUGCHECK_RISKY)
        assert score == 80  # 100 - 10 - 10

    def test_honeypot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        score = agent._map_rugcheck_score(MOCK_RUGCHECK_HONEYPOT)
        assert score == 60  # 100 - 40 (honeypot deduction)

    def test_empty_report(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        assert agent._map_rugcheck_score({}) == 100


class TestFetchRugcheck:
    async def test_returns_result_for_solana(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        with aioresponses() as mocked:
            mocked.get(f"{RUGCHECK_API_URL}/abc123/report", payload=MOCK_RUGCHECK_SAFE)
            result = await agent._fetch_rugcheck("abc123", "solana")
        assert result["available"] is True
        assert result["score"] == 100
        assert result["is_honeypot"] is False

    async def test_detects_honeypot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        with aioresponses() as mocked:
            mocked.get(f"{RUGCHECK_API_URL}/abc123/report", payload=MOCK_RUGCHECK_HONEYPOT)
            result = await agent._fetch_rugcheck("abc123", "solana")
        assert result["is_honeypot"] is True

    async def test_returns_unavailable_for_non_solana(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_rugcheck("abc123", "ethereum")
        assert result["available"] is False
        assert result["score"] == 0

    async def test_returns_unavailable_on_api_error(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        with aioresponses() as mocked:
            mocked.get(f"{RUGCHECK_API_URL}/abc123/report", status=500)
            result = await agent._fetch_rugcheck("abc123", "solana")
        assert result["available"] is False

    async def test_extracts_risk_names(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        with aioresponses() as mocked:
            mocked.get(f"{RUGCHECK_API_URL}/abc123/report", payload=MOCK_RUGCHECK_RISKY)
            result = await agent._fetch_rugcheck("abc123", "solana")
        assert "Mutable metadata" in result["risks"]
        assert "Low liquidity" in result["risks"]


class TestFetchDflow:
    async def test_returns_unavailable_stub(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_dflow("abc123", "solana")
        assert result["available"] is False

    async def test_returns_expected_structure(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = await agent._fetch_dflow("abc123", "solana")
        assert "routes_found" in result
        assert "best_slippage" in result
        assert "best_dex" in result
        assert "orderbook_depth" in result


class TestCalculateDflowModifier:
    def test_3_plus_routes_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 3, "best_slippage": 2.0, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 5

    def test_low_slippage_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 0.5, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 3

    def test_tier1_dex_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 2.0, "best_dex": "jupiter", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 3

    def test_high_orderbook_bonus(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 2.0, "best_dex": "unknown", "orderbook_depth": 60000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 2

    def test_no_routes_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": True}
        assert agent._calculate_dflow_modifier(result) == -5

    def test_high_slippage_penalty(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 1, "best_slippage": 6.0, "best_dex": "unknown", "orderbook_depth": 10000, "available": True}
        assert agent._calculate_dflow_modifier(result) == -3

    def test_all_bonuses_stacked(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 5, "best_slippage": 0.3, "best_dex": "jupiter", "orderbook_depth": 100000, "available": True}
        assert agent._calculate_dflow_modifier(result) == 13

    def test_unavailable_returns_zero(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 0.0, "best_dex": "", "orderbook_depth": 0, "available": False}
        assert agent._calculate_dflow_modifier(result) == 0

    def test_no_routes_and_high_slippage(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        result = {"routes_found": 0, "best_slippage": 7.0, "best_dex": "", "orderbook_depth": 0, "available": True}
        assert agent._calculate_dflow_modifier(result) == -8


class TestCollectRiskFlags:
    def test_no_flags_when_all_clean(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert flags == []

    def test_honeypot_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": True, "risks": ["Honeypot"], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "honeypot_detected" in flags

    def test_quillshield_flags_forwarded(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 5, "liquidity": 5, "holders": 5, "contract": 5}, "flags": ["authority_risk", "lp_not_locked", "top_holders_concentrated", "contract_risk"], "available": True}
        dflow = {"routes_found": 3, "best_slippage": 0.5, "orderbook_depth": 60000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "authority_risk" in flags
        assert "lp_not_locked" in flags

    def test_dflow_no_routes_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 0, "best_slippage": 0.0, "orderbook_depth": 0, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "no_swap_routes" in flags

    def test_dflow_high_slippage_flag(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"is_honeypot": False, "risks": [], "available": True}
        quillshield = {"breakdown": {"authority": 20, "liquidity": 20, "holders": 20, "contract": 20}, "flags": [], "available": True}
        dflow = {"routes_found": 1, "best_slippage": 6.0, "orderbook_depth": 5000, "available": True}
        flags = agent._collect_risk_flags(rugcheck, quillshield, dflow)
        assert "high_slippage" in flags
        assert "low_orderbook_depth" in flags


class TestAggregateScore:
    def test_both_sources_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 60, "available": True}
        # weights 0.3 and 0.5, total 0.8. Redistributed: 0.3/0.8=0.375, 0.5/0.8=0.625
        # 80*0.375 + 60*0.625 = 30 + 37.5 = 67.5 -> round(67.5) = 68
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 68

    def test_only_rugcheck_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 0, "available": False}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 80

    def test_only_quillshield_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 0, "available": False}
        quillshield = {"score": 70, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 70

    def test_neither_available(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 0, "available": False}
        quillshield = {"score": 0, "available": False}
        score = agent._aggregate_score(rugcheck, quillshield, 0)
        assert score == 0

    def test_dflow_modifier_applied(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 80, "available": True}
        quillshield = {"score": 60, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 13)
        assert score == 81  # 68 + 13

    def test_score_clamped_to_100(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 100, "available": True}
        quillshield = {"score": 100, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, 13)
        assert score == 100

    def test_score_clamped_to_0(self, tmp_path, monkeypatch):
        monkeypatch.setenv("BUZZ_SCRATCHPAD_DIR", str(tmp_path))
        agent = SafetyAgent()
        rugcheck = {"score": 5, "available": True}
        quillshield = {"score": 5, "available": True}
        score = agent._aggregate_score(rugcheck, quillshield, -8)
        assert score == 0
