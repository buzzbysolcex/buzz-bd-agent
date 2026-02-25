# src/agents/tests/test_memory_manager.py
import json
import os
import re
import time
from datetime import datetime, timezone, timedelta
import pytest
from src.agents.memory_manager import MemoryManager


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_manager(tmp_path):
    return MemoryManager(memory_dir=str(tmp_path))


def _write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f)


def _read_json(path):
    with open(path, "r") as f:
        return json.load(f)


def _make_prospect(contract_address, score=75, stage="DISCOVERED", timestamp=None):
    return {
        "contract_address": contract_address,
        "score": score,
        "stage": stage,
        "timestamp": timestamp or time.time(),
    }


def _make_cron_jobs(count=36):
    return [{"name": f"job_{i}", "schedule": "0 */5 * * * *"} for i in range(count)]


# ---------------------------------------------------------------------------
# TestInit
# ---------------------------------------------------------------------------

class TestMemoryManagerInit:
    def test_creates_directory_structure(self, tmp_path):
        _make_manager(tmp_path)
        assert (tmp_path / "pipeline").is_dir()
        assert (tmp_path / "contacts").is_dir()
        assert (tmp_path / "security").is_dir()
        assert (tmp_path / "reports" / "weekly").is_dir()

    def test_does_not_extend_base_agent(self, tmp_path):
        from src.agents.base_agent import BaseAgent
        mgr = _make_manager(tmp_path)
        assert not isinstance(mgr, BaseAgent)

    def test_stores_memory_dir(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr._memory_dir == str(tmp_path)

    def test_idempotent_on_existing_dirs(self, tmp_path):
        (tmp_path / "pipeline").mkdir()
        (tmp_path / "contacts").mkdir()
        (tmp_path / "security").mkdir()
        (tmp_path / "reports" / "weekly").mkdir(parents=True)
        mgr = _make_manager(tmp_path)
        assert (tmp_path / "pipeline").is_dir()


# ---------------------------------------------------------------------------
# TestWriteDailyLog
# ---------------------------------------------------------------------------

class TestWriteDailyLog:
    def test_creates_log_file_for_today(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("scan_tokens", "found 15 new tokens")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        assert (tmp_path / f"{today}.md").exists()

    def test_entry_contains_timestamp(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("scan_tokens", "found 5 tokens")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        content = (tmp_path / f"{today}.md").read_text()
        # Should match [HH:MM AST] pattern
        assert re.search(r"\[\d{2}:\d{2} AST\]", content)

    def test_entry_contains_action_and_result(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("evaluate_token", "score=85")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        content = (tmp_path / f"{today}.md").read_text()
        assert "evaluate_token" in content
        assert "score=85" in content

    def test_appends_multiple_entries(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("action_1", "result_1")
        mgr.write_daily_log("action_2", "result_2")
        mgr.write_daily_log("action_3", "result_3")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        content = (tmp_path / f"{today}.md").read_text()
        lines = [l for l in content.strip().split("\n") if l.strip()]
        assert len(lines) == 3
        assert "action_1" in lines[0]
        assert "action_3" in lines[2]

    def test_format_is_bracket_time_action_colon_result(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("my_action", "my_result")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        content = (tmp_path / f"{today}.md").read_text().strip()
        # Expected: "[HH:MM AST] my_action: my_result"
        assert re.match(r"\[\d{2}:\d{2} AST\] my_action: my_result", content)


# ---------------------------------------------------------------------------
# TestReadDailyLog
# ---------------------------------------------------------------------------

class TestReadDailyLog:
    def test_reads_today_by_default(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("test_action", "test_result")
        content = mgr.read_daily_log()
        assert "test_action" in content

    def test_reads_specific_date(self, tmp_path):
        mgr = _make_manager(tmp_path)
        (tmp_path / "2025-01-15.md").write_text("[10:00 AST] old_action: old_result\n")
        content = mgr.read_daily_log(date="2025-01-15")
        assert "old_action" in content

    def test_returns_none_for_missing_date(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr.read_daily_log(date="1999-01-01") is None

    def test_returns_none_for_no_log_today(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr.read_daily_log() is None


# ---------------------------------------------------------------------------
# TestExperience
# ---------------------------------------------------------------------------

class TestReadExperience:
    def test_returns_empty_list_if_missing(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr.read_experience() == []

    def test_returns_patterns_from_file(self, tmp_path):
        mgr = _make_manager(tmp_path)
        patterns = [{"pattern": "high volume before rug", "confidence": 0.8}]
        _write_json(str(tmp_path / "experience.json"), patterns)
        result = mgr.read_experience()
        assert len(result) == 1
        assert result[0]["pattern"] == "high volume before rug"

    def test_returns_empty_list_on_corrupt_json(self, tmp_path):
        mgr = _make_manager(tmp_path)
        (tmp_path / "experience.json").write_text("not valid json!!!")
        assert mgr.read_experience() == []


class TestWriteExperience:
    def test_appends_pattern(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_experience({"pattern": "pattern_1", "confidence": 0.9})
        result = mgr.read_experience()
        assert len(result) == 1
        assert result[0]["pattern"] == "pattern_1"

    def test_appends_to_existing(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_experience({"pattern": "p1"})
        mgr.write_experience({"pattern": "p2"})
        mgr.write_experience({"pattern": "p3"})
        result = mgr.read_experience()
        assert len(result) == 3
        assert [p["pattern"] for p in result] == ["p1", "p2", "p3"]

    def test_creates_file_if_missing(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert not (tmp_path / "experience.json").exists()
        mgr.write_experience({"pattern": "new"})
        assert (tmp_path / "experience.json").exists()

    def test_never_deletes_experience_file(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_experience({"pattern": "keep_me"})
        mgr.write_experience({"pattern": "keep_me_too"})
        # File must always exist after writes
        assert (tmp_path / "experience.json").exists()
        result = mgr.read_experience()
        assert len(result) == 2


# ---------------------------------------------------------------------------
# TestPipeline
# ---------------------------------------------------------------------------

class TestReadPipeline:
    def test_returns_empty_if_missing(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr.read_pipeline() == []

    def test_returns_prospects(self, tmp_path):
        mgr = _make_manager(tmp_path)
        prospects = [_make_prospect("0xabc"), _make_prospect("0xdef")]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.read_pipeline()
        assert len(result) == 2

    def test_returns_empty_on_corrupt_json(self, tmp_path):
        mgr = _make_manager(tmp_path)
        (tmp_path / "pipeline" / "active.json").write_text("{{bad")
        assert mgr.read_pipeline() == []


class TestUpdatePipeline:
    def test_adds_new_prospect(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.update_pipeline(_make_prospect("0xabc", score=80))
        result = mgr.read_pipeline()
        assert len(result) == 1
        assert result[0]["contract_address"] == "0xabc"

    def test_upserts_by_contract_address(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.update_pipeline(_make_prospect("0xabc", score=60, stage="DISCOVERED"))
        mgr.update_pipeline(_make_prospect("0xabc", score=85, stage="SCORED"))
        result = mgr.read_pipeline()
        assert len(result) == 1
        assert result[0]["score"] == 85
        assert result[0]["stage"] == "SCORED"

    def test_does_not_affect_other_prospects(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.update_pipeline(_make_prospect("0xaaa", score=60))
        mgr.update_pipeline(_make_prospect("0xbbb", score=70))
        mgr.update_pipeline(_make_prospect("0xaaa", score=90))
        result = mgr.read_pipeline()
        assert len(result) == 2
        by_addr = {p["contract_address"]: p for p in result}
        assert by_addr["0xaaa"]["score"] == 90
        assert by_addr["0xbbb"]["score"] == 70

    def test_creates_file_if_missing(self, tmp_path):
        mgr = _make_manager(tmp_path)
        pipeline_path = tmp_path / "pipeline" / "active.json"
        if pipeline_path.exists():
            pipeline_path.unlink()
        mgr.update_pipeline(_make_prospect("0xnew"))
        assert pipeline_path.exists()


class TestGetPipelineSummary:
    def test_empty_pipeline(self, tmp_path):
        mgr = _make_manager(tmp_path)
        assert mgr.get_pipeline_summary() == {}

    def test_counts_by_stage(self, tmp_path):
        mgr = _make_manager(tmp_path)
        prospects = [
            _make_prospect("0x1", stage="DISCOVERED"),
            _make_prospect("0x2", stage="DISCOVERED"),
            _make_prospect("0x3", stage="SCORED"),
            _make_prospect("0x4", stage="QUALIFIED"),
            _make_prospect("0x5", stage="WARM_UP"),
            _make_prospect("0x6", stage="OUTREACH_SENT"),
        ]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        summary = mgr.get_pipeline_summary()
        assert summary["DISCOVERED"] == 2
        assert summary["SCORED"] == 1
        assert summary["QUALIFIED"] == 1
        assert summary["WARM_UP"] == 1
        assert summary["OUTREACH_SENT"] == 1


# ---------------------------------------------------------------------------
# TestCompressDay
# ---------------------------------------------------------------------------

class TestCompressDay:
    def test_keeps_high_score_prospects(self, tmp_path):
        mgr = _make_manager(tmp_path)
        old = time.time() - 72 * 3600  # 3 days ago
        prospects = [_make_prospect("0xgood", score=75, timestamp=old)]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["kept"] >= 1
        remaining = mgr.read_pipeline()
        assert any(p["contract_address"] == "0xgood" for p in remaining)

    def test_purges_low_score_after_48h(self, tmp_path):
        mgr = _make_manager(tmp_path)
        old = time.time() - 72 * 3600  # 3 days ago
        prospects = [_make_prospect("0xbad", score=40, timestamp=old)]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["purged"] >= 1
        remaining = mgr.read_pipeline()
        assert not any(p["contract_address"] == "0xbad" for p in remaining)

    def test_keeps_low_score_within_48h(self, tmp_path):
        mgr = _make_manager(tmp_path)
        recent = time.time() - 12 * 3600  # 12 hours ago
        prospects = [_make_prospect("0xrecent", score=30, timestamp=recent)]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["purged"] == 0
        remaining = mgr.read_pipeline()
        assert len(remaining) == 1

    def test_never_purges_experience(self, tmp_path):
        mgr = _make_manager(tmp_path)
        patterns = [{"pattern": "valuable", "confidence": 0.95}]
        _write_json(str(tmp_path / "experience.json"), patterns)
        mgr.compress_day()
        assert (tmp_path / "experience.json").exists()
        assert _read_json(str(tmp_path / "experience.json")) == patterns

    def test_never_purges_cron_schedule(self, tmp_path):
        mgr = _make_manager(tmp_path)
        jobs = _make_cron_jobs(36)
        _write_json(str(tmp_path / "cron-schedule.json"), jobs)
        mgr.compress_day()
        assert (tmp_path / "cron-schedule.json").exists()
        assert len(_read_json(str(tmp_path / "cron-schedule.json"))) == 36

    def test_mixed_prospects(self, tmp_path):
        mgr = _make_manager(tmp_path)
        old = time.time() - 72 * 3600
        recent = time.time() - 6 * 3600
        prospects = [
            _make_prospect("0xhigh_old", score=85, timestamp=old),
            _make_prospect("0xlow_old", score=30, timestamp=old),
            _make_prospect("0xlow_recent", score=25, timestamp=recent),
            _make_prospect("0xhigh_recent", score=90, timestamp=recent),
        ]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["kept"] == 3
        assert result["purged"] == 1
        remaining = mgr.read_pipeline()
        addrs = [p["contract_address"] for p in remaining]
        assert "0xhigh_old" in addrs
        assert "0xlow_old" not in addrs
        assert "0xlow_recent" in addrs
        assert "0xhigh_recent" in addrs

    def test_empty_pipeline_returns_zero(self, tmp_path):
        mgr = _make_manager(tmp_path)
        result = mgr.compress_day()
        assert result == {"kept": 0, "purged": 0}

    def test_keeps_active_outreach_regardless_of_score(self, tmp_path):
        mgr = _make_manager(tmp_path)
        old = time.time() - 72 * 3600
        prospects = [
            _make_prospect("0xoutreach", score=20, timestamp=old),
        ]
        prospects[0]["stage"] = "OUTREACH_SENT"
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["purged"] == 0
        remaining = mgr.read_pipeline()
        assert remaining[0]["contract_address"] == "0xoutreach"

    def test_keeps_warm_up_regardless_of_score(self, tmp_path):
        mgr = _make_manager(tmp_path)
        old = time.time() - 72 * 3600
        prospects = [_make_prospect("0xwarm", score=10, timestamp=old)]
        prospects[0]["stage"] = "WARM_UP"
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        result = mgr.compress_day()
        assert result["purged"] == 0


# ---------------------------------------------------------------------------
# TestOnBoot
# ---------------------------------------------------------------------------

class TestOnBoot:
    def test_green_with_full_crons(self, tmp_path):
        mgr = _make_manager(tmp_path)
        _write_json(str(tmp_path / "cron-schedule.json"), _make_cron_jobs(36))
        _write_json(str(tmp_path / "experience.json"), [{"pattern": "p1"}])
        _write_json(str(tmp_path / "pipeline" / "active.json"), [_make_prospect("0x1")])
        report = mgr.on_boot()
        assert report["status"] == "green"
        assert report["crons_ok"] is True
        assert report["crons_found"] == 36
        assert report["crons_expected"] == 36
        assert report["experience_loaded"] == 1
        assert report["pipeline_loaded"] == 1

    def test_red_with_missing_crons(self, tmp_path):
        mgr = _make_manager(tmp_path)
        _write_json(str(tmp_path / "cron-schedule.json"), _make_cron_jobs(30))
        report = mgr.on_boot()
        assert report["status"] == "red"
        assert report["crons_ok"] is False
        assert report["crons_found"] == 30
        assert isinstance(report["crons_missing"], list)
        assert len(report["crons_missing"]) == 6

    def test_red_with_no_cron_file(self, tmp_path):
        mgr = _make_manager(tmp_path)
        report = mgr.on_boot()
        assert report["status"] == "red"
        assert report["crons_ok"] is False
        assert report["crons_found"] == 0

    def test_loads_experience_count(self, tmp_path):
        mgr = _make_manager(tmp_path)
        _write_json(str(tmp_path / "cron-schedule.json"), _make_cron_jobs(36))
        patterns = [{"pattern": f"p{i}"} for i in range(5)]
        _write_json(str(tmp_path / "experience.json"), patterns)
        report = mgr.on_boot()
        assert report["experience_loaded"] == 5

    def test_loads_pipeline_count(self, tmp_path):
        mgr = _make_manager(tmp_path)
        _write_json(str(tmp_path / "cron-schedule.json"), _make_cron_jobs(36))
        prospects = [_make_prospect(f"0x{i}") for i in range(8)]
        _write_json(str(tmp_path / "pipeline" / "active.json"), prospects)
        report = mgr.on_boot()
        assert report["pipeline_loaded"] == 8

    def test_graceful_with_all_missing_files(self, tmp_path):
        mgr = _make_manager(tmp_path)
        report = mgr.on_boot()
        assert report["status"] == "red"
        assert report["crons_found"] == 0
        assert report["experience_loaded"] == 0
        assert report["pipeline_loaded"] == 0

    def test_missing_crons_lists_expected_names(self, tmp_path):
        mgr = _make_manager(tmp_path)
        # 34 jobs present, 2 missing
        jobs = _make_cron_jobs(34)
        _write_json(str(tmp_path / "cron-schedule.json"), jobs)
        report = mgr.on_boot()
        assert report["crons_ok"] is False
        assert len(report["crons_missing"]) == 2

    def test_extra_crons_still_green(self, tmp_path):
        mgr = _make_manager(tmp_path)
        _write_json(str(tmp_path / "cron-schedule.json"), _make_cron_jobs(40))
        report = mgr.on_boot()
        assert report["crons_ok"] is True
        assert report["status"] == "green"


# ---------------------------------------------------------------------------
# TestGetNeverPurgeKeys
# ---------------------------------------------------------------------------

class TestGetNeverPurgeKeys:
    def test_returns_frozenset(self, tmp_path):
        mgr = _make_manager(tmp_path)
        keys = mgr.get_never_purge_keys()
        assert isinstance(keys, frozenset)

    def test_contains_required_categories(self, tmp_path):
        mgr = _make_manager(tmp_path)
        keys = mgr.get_never_purge_keys()
        assert "active_outreach" in keys
        assert "high_score_prospects" in keys
        assert "api_keys" in keys
        assert "cron_schedule" in keys
        assert "experience_patterns" in keys
        assert "partnerships" in keys
        assert "erc_8004_data" in keys

    def test_is_immutable(self, tmp_path):
        mgr = _make_manager(tmp_path)
        keys = mgr.get_never_purge_keys()
        with pytest.raises(AttributeError):
            keys.add("new_key")


# ---------------------------------------------------------------------------
# TestEdgeCases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_corrupt_pipeline_json(self, tmp_path):
        mgr = _make_manager(tmp_path)
        (tmp_path / "pipeline" / "active.json").write_text("not json")
        summary = mgr.get_pipeline_summary()
        assert summary == {}

    def test_empty_pipeline_file(self, tmp_path):
        mgr = _make_manager(tmp_path)
        (tmp_path / "pipeline" / "active.json").write_text("")
        assert mgr.read_pipeline() == []

    def test_compress_with_no_pipeline_file(self, tmp_path):
        mgr = _make_manager(tmp_path)
        if (tmp_path / "pipeline" / "active.json").exists():
            (tmp_path / "pipeline" / "active.json").unlink()
        result = mgr.compress_day()
        assert result == {"kept": 0, "purged": 0}

    def test_write_daily_log_with_special_characters(self, tmp_path):
        mgr = _make_manager(tmp_path)
        mgr.write_daily_log("scan", "found token: 0x123 (chain=solana)")
        content = mgr.read_daily_log()
        assert "0x123" in content
        assert "solana" in content


# ---------------------------------------------------------------------------
# TestCronFormat
# ---------------------------------------------------------------------------

class TestCronFormat:
    def test_default_cron_expression_has_six_fields(self, tmp_path):
        """OpenClaw gateway expects 6-field cron (with seconds)."""
        from src.agents.memory_manager import DEFAULT_CRON_EXPRESSION
        fields = DEFAULT_CRON_EXPRESSION.strip().split()
        assert len(fields) == 6, (
            f"Expected 6-field cron (sec min hr dom mon dow), got {len(fields)}: "
            f"'{DEFAULT_CRON_EXPRESSION}'"
        )

    def test_default_cron_expression_starts_with_zero_seconds(self, tmp_path):
        """First field (seconds) should be '0' so cron fires at top of interval."""
        from src.agents.memory_manager import DEFAULT_CRON_EXPRESSION
        seconds_field = DEFAULT_CRON_EXPRESSION.strip().split()[0]
        assert seconds_field == "0", f"Seconds field should be '0', got '{seconds_field}'"

    def test_generate_default_crons_returns_expected_count(self, tmp_path):
        mgr = _make_manager(tmp_path)
        crons = mgr.generate_default_crons()
        assert len(crons) == 36

    def test_generate_default_crons_uses_six_field_format(self, tmp_path):
        mgr = _make_manager(tmp_path)
        crons = mgr.generate_default_crons()
        for job in crons:
            fields = job["schedule"].strip().split()
            assert len(fields) == 6, (
                f"Job '{job['name']}' has {len(fields)}-field cron, expected 6"
            )

    def test_generate_default_crons_has_name_and_schedule(self, tmp_path):
        mgr = _make_manager(tmp_path)
        crons = mgr.generate_default_crons()
        for job in crons:
            assert "name" in job
            assert "schedule" in job

    def test_cron_fires_at_expected_interval(self, tmp_path):
        """Verify the default cron expression fires every 5 minutes.

        Parse the 6-field cron '0 */5 * * * *' and confirm that within a
        60-minute window there are exactly 12 fire times (every 5 min).
        """
        from src.agents.memory_manager import DEFAULT_CRON_EXPRESSION
        fields = DEFAULT_CRON_EXPRESSION.strip().split()
        # fields: [seconds, minutes, hours, dom, month, dow]
        seconds_field = fields[0]
        minutes_field = fields[1]

        # Parse minutes that match the expression
        fire_minutes = _expand_cron_field(minutes_field, 0, 59)

        # Should fire at 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
        assert fire_minutes == list(range(0, 60, 5))
        assert seconds_field == "0"


def _expand_cron_field(field: str, min_val: int, max_val: int) -> list:
    """Expand a single cron field into the list of matching values."""
    if field == "*":
        return list(range(min_val, max_val + 1))
    if field.startswith("*/"):
        step = int(field[2:])
        return list(range(min_val, max_val + 1, step))
    if "," in field:
        return sorted(int(v) for v in field.split(","))
    return [int(field)]
