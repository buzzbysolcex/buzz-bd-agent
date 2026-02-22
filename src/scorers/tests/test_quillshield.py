# src/scorers/tests/test_quillshield.py
import pytest
from src.scorers.quillshield import _score_authority, _score_liquidity, _score_holders, _score_contract


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
        assert _score_authority({}) == 0  # all treated as not revoked: -10 + -10 + 0 = -20, clamped to 0


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
