# src/scorers/tests/test_quillshield.py
import pytest
from src.scorers.quillshield import _score_authority


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
