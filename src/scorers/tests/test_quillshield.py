# src/scorers/tests/test_quillshield.py
import os
import pytest
from unittest.mock import patch, AsyncMock
from aioresponses import aioresponses
from src.scorers.quillshield import _score_authority, _score_liquidity, _score_holders, _score_contract


MOCK_DEXSCREENER_RESPONSE = {
    "pairs": [{
        "liquidity": {"usd": 600000},
        "marketCap": 5000000,
        "txns": {"h24": {"buys": 100, "sells": 80}},
    }]
}

MOCK_HELIUS_RESPONSE = [{
    "onChainAccountInfo": {
        "accountInfo": {
            "data": {
                "parsed": {
                    "info": {
                        "mintAuthority": None,
                        "freezeAuthority": None,
                    }
                }
            }
        }
    },
    "onChainMetadata": {
        "metadata": {
            "updateAuthority": None,
        }
    }
}]

MOCK_SOLANA_FM_RESPONSE = {
    "result": [
        {"info": {"owner": "wallet1", "amount": 200000}},
        {"info": {"owner": "wallet2", "amount": 100000}},
        {"info": {"owner": "wallet3", "amount": 80000}},
        {"info": {"owner": "wallet4", "amount": 70000}},
        {"info": {"owner": "wallet5", "amount": 60000}},
        {"info": {"owner": "wallet6", "amount": 50000}},
        {"info": {"owner": "wallet7", "amount": 40000}},
        {"info": {"owner": "wallet8", "amount": 30000}},
        {"info": {"owner": "wallet9", "amount": 20000}},
        {"info": {"owner": "wallet10", "amount": 10000}},
    ],
    "totalSupply": 1000000,
}

class TestScoreAuthority:
    def test_all_revoked(self):
        data = {"mint_authority": None, "freeze_authority": None, "update_authority": None}
        assert _score_authority(data) == 25

    def test_none_revoked(self):
        data = {"mint_authority": "wallet1", "freeze_authority": "wallet2", "update_authority": "wallet3"}
        assert _score_authority(data) == 0

    def test_mint_only_revoked(self):
        data = {"mint_authority": None, "freeze_authority": "wallet2", "update_authority": "wallet3"}
        assert _score_authority(data) == 0  # 10 + (-10) + 0 = 0, clamped

    def test_both_authorities_revoked_no_update(self):
        data = {"mint_authority": None, "freeze_authority": None, "update_authority": "wallet3"}
        assert _score_authority(data) == 20  # 10 + 10 + 0

    def test_empty_dict(self):
        assert _score_authority({}) == 0  # no keys present, no points added or subtracted


class TestScoreLiquidity:
    def test_good_ratio_locked_burned(self):
        data = {"liquidity_usd": 600000, "market_cap": 5000000, "lp_locked": True, "lp_burned": True}
        assert _score_liquidity(data) == 25

    def test_good_ratio_not_locked(self):
        data = {"liquidity_usd": 600000, "market_cap": 5000000, "lp_locked": False, "lp_burned": False}
        assert _score_liquidity(data) == 10

    def test_low_ratio(self):
        data = {"liquidity_usd": 10000, "market_cap": 5000000, "lp_locked": True, "lp_burned": True}
        assert _score_liquidity(data) == 15

    def test_zero_mcap(self):
        data = {"liquidity_usd": 100000, "market_cap": 0, "lp_locked": False, "lp_burned": False}
        assert _score_liquidity(data) == 0

    def test_empty_dict(self):
        assert _score_liquidity({}) == 0


class TestScoreHolders:
    def test_well_distributed(self):
        data = {"top_10_pct": 20.0, "creator_pct": 3.0, "max_single_pct": 5.0}
        assert _score_holders(data) == 25

    def test_concentrated(self):
        data = {"top_10_pct": 50.0, "creator_pct": 10.0, "max_single_pct": 15.0}
        assert _score_holders(data) == 0

    def test_partial_good(self):
        data = {"top_10_pct": 20.0, "creator_pct": 10.0, "max_single_pct": 5.0}
        assert _score_holders(data) == 15

    def test_empty_dict(self):
        assert _score_holders({}) == 0


class TestScoreContract:
    def test_all_good(self):
        data = {"can_buy": True, "can_sell": True, "tax_pct": 2.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 25

    def test_honeypot(self):
        data = {"can_buy": True, "can_sell": False, "tax_pct": 2.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 15

    def test_high_tax(self):
        data = {"can_buy": True, "can_sell": True, "tax_pct": 10.0, "verified": True, "suspicious_transfers": False}
        assert _score_contract(data) == 20

    def test_all_bad(self):
        data = {"can_buy": True, "can_sell": False, "tax_pct": 10.0, "verified": False, "suspicious_transfers": True}
        assert _score_contract(data) == 0

    def test_empty_dict(self):
        assert _score_contract({}) == 0


class TestScore:
    async def test_returns_score_and_breakdown(self, monkeypatch):
        from src.scorers.quillshield import score
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                payload=MOCK_DEXSCREENER_RESPONSE,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                payload=MOCK_HELIUS_RESPONSE,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                payload=MOCK_SOLANA_FM_RESPONSE,
            )
            result = await score("abc123", "solana")

        assert "score" in result
        assert "breakdown" in result
        assert "available" in result
        assert result["available"] is True
        assert result["breakdown"]["authority"] == 25

    async def test_returns_flags_list(self, monkeypatch):
        from src.scorers.quillshield import score
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                payload=MOCK_DEXSCREENER_RESPONSE,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                payload=MOCK_HELIUS_RESPONSE,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                payload=MOCK_SOLANA_FM_RESPONSE,
            )
            result = await score("abc123", "solana")

        assert "flags" in result
        assert isinstance(result["flags"], list)

    async def test_returns_unavailable_on_all_errors(self, monkeypatch):
        from src.scorers.quillshield import score
        monkeypatch.setenv("HELIUS_API_KEY", "test-key")
        with aioresponses() as mocked:
            mocked.get(
                "https://api.dexscreener.com/latest/dex/tokens/abc123",
                status=500,
            )
            mocked.post(
                "https://api.helius.xyz/v0/token-metadata?api-key=test-key",
                status=500,
            )
            mocked.get(
                "https://api.solana.fm/v0/tokens/abc123/holders",
                status=500,
            )
            result = await score("abc123", "solana")

        assert result["available"] is False
        assert result["score"] == 0
