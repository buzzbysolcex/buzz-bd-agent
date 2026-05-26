#!/usr/bin/env python3
"""
Lane 5 — Automated Bounty Scope Monitor ("Subfinder for DeFi bounties")

Authority: Ogie msg 7782 (2026-05-26 02:36 UTC).

Three data sources: Immunefi, Cantina, Sherlock.
Runs every 6h, diffs against SQLite state, alerts on:
  - NEW programs with critical cap >= $50K
  - Scope expansions on Watchlist-Candidate-Crossmap targets
  - Vault funding increases >= $10K

Flags:
  --backfill          populate initial state silently (no Telegram alerts)
  --dry-run           scrape + diff but no DB writes, no alerts
  --source <name>     limit to one source (immunefi|cantina|sherlock)
  --daemon            run 6h scheduler loop (for pm2)

R8 evidence-tagging in alerts:
  [INSPECTED] — field decoded from live HTTP response / API JSON
  [ASSUMED]   — heuristic classification (Doctrine #32 filter pass/fail, etc.)

Standards: never log/print/echo secrets (Telegram bot token, GitHub PAT).
"""

from __future__ import annotations

import argparse
import json
import logging
import logging.handlers
import os
import re
import signal
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Iterable

# ---------------------------------------------------------------------------
# Constants & paths
# ---------------------------------------------------------------------------

WORKSPACE = Path("/home/claude-code/buzz-workspace")
DB_PATH = WORKSPACE / "data" / "lane5" / "scope-monitor.db"
LOCK_PATH = WORKSPACE / "data" / "lane5" / ".scope-monitor.lock"
LOG_PATH = WORKSPACE / "data" / "infra-logs" / "lane5-scope-monitor.log"
WATCHLIST_PATH = WORKSPACE / "brain" / "Watchlist-Candidate-Crossmap.md"

TELEGRAM_ENV_PATH = Path("/home/claude-code/.claude/channels/telegram/.env")
GITHUB_ENV_PATH = Path("/home/claude-code/.env.github")
WAR_ROOM_CHAT_ID = "-1003701758077"

# Source URLs (best-effort starting points; fail-soft per source)
IMMUNEFI_LIST_URL = "https://immunefi.com/explore/"
IMMUNEFI_API_URL = "https://immunefi.com/public-api/bounty"
CANTINA_LIST_URL = "https://cantina.xyz/bounties"
CANTINA_API_URL = "https://cantina.xyz/api/v0/bounties"
SHERLOCK_LIST_URL = "https://audits.sherlock.xyz/contests"
SHERLOCK_API_URL = "https://mainnet-contest.sherlock.xyz/contests"

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
HTTP_TIMEOUT = 30

ALERT_NEW_PROGRAM_FLOOR_USD = 50_000.0
ALERT_VAULT_DELTA_FLOOR_USD = 10_000.0
DOCTRINE_32_AUDIT_AGE_DAYS = 180
SIX_HOURS_SECONDS = 6 * 60 * 60

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

def _setup_logging() -> logging.Logger:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("lane5-scope-monitor")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    fh = logging.handlers.RotatingFileHandler(
        LOG_PATH, maxBytes=5 * 1024 * 1024, backupCount=3
    )
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(sh)
    return logger


log = _setup_logging()

# ---------------------------------------------------------------------------
# Env loading (never log secret values)
# ---------------------------------------------------------------------------

def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    try:
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v
    except Exception as e:
        # never log secret bodies; just acknowledge failure
        log.warning("env load failed for %s: %s", path.name, type(e).__name__)


_load_env_file(TELEGRAM_ENV_PATH)
_load_env_file(GITHUB_ENV_PATH)

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GITHUB_PAT = os.environ.get("GITHUB_PAT", "")

# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------

def http_get_json(url: str, headers: dict | None = None, timeout: int = HTTP_TIMEOUT) -> dict | list | None:
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec - public bounty platforms
            status = resp.status
            body = resp.read()
            if status >= 400:
                log.warning("http %s on %s", status, url)
                return None
            ctype = resp.headers.get("Content-Type", "")
            if "json" not in ctype and not body.lstrip().startswith((b"{", b"[")):
                log.debug("non-json body from %s ctype=%s len=%d", url, ctype, len(body))
                return None
            return json.loads(body.decode("utf-8", errors="replace"))
    except Exception as e:
        log.warning("http_get_json failed url=%s err=%s", url, type(e).__name__)
        return None


def http_get_text(url: str, headers: dict | None = None, timeout: int = HTTP_TIMEOUT) -> str | None:
    hdrs = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*"}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # nosec
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        log.warning("http_get_text failed url=%s err=%s", url, type(e).__name__)
        return None

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Program:
    platform: str                       # "immunefi" / "cantina" / "sherlock"
    program_name: str                   # canonical name
    max_critical_reward: float | None   # USD
    vault_balance: float | None         # USD if known
    assets_count: int | None
    url: str | None = None
    status: str = "live"
    raw: dict = field(default_factory=dict)

# ---------------------------------------------------------------------------
# DB layer
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  program_name TEXT NOT NULL,
  max_critical_reward REAL,
  vault_balance REAL,
  assets_count INTEGER,
  last_updated TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  status TEXT DEFAULT 'live',
  url TEXT,
  raw_json TEXT,
  UNIQUE(platform, program_name)
);
CREATE INDEX IF NOT EXISTS idx_programs_platform ON programs(platform);
CREATE INDEX IF NOT EXISTS idx_programs_last_updated ON programs(last_updated);

CREATE TABLE IF NOT EXISTS changes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  detected_at TEXT NOT NULL,
  alerted INTEGER DEFAULT 0,
  alert_sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_changes_detected_at ON changes(detected_at);
CREATE INDEX IF NOT EXISTS idx_changes_alerted ON changes(alerted);
"""


def get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    # idempotent migrations for Immunefi-enrichment columns (added 2026-05-26)
    _existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(programs)")}
    for col, ddl in (
        ("kyc_required", "INTEGER"),
        ("chains_json", "TEXT"),
        ("languages_json", "TEXT"),
        ("last_updated_program", "TEXT"),
    ):
        if col not in _existing_cols:
            try:
                conn.execute(f"ALTER TABLE programs ADD COLUMN {col} {ddl}")
            except sqlite3.OperationalError as e:
                log.debug("alter add %s skipped: %s", col, e)
    conn.commit()
    return conn


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ---------------------------------------------------------------------------
# File lock (prevent concurrent runs)
# ---------------------------------------------------------------------------

@contextmanager
def acquire_lock():
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    if LOCK_PATH.exists():
        try:
            pid = int(LOCK_PATH.read_text().strip())
            try:
                os.kill(pid, 0)
                log.warning("another instance running pid=%d; aborting", pid)
                raise SystemExit(0)
            except ProcessLookupError:
                log.info("stale lock from pid=%d removed", pid)
                LOCK_PATH.unlink(missing_ok=True)
        except Exception:
            LOCK_PATH.unlink(missing_ok=True)
    LOCK_PATH.write_text(str(os.getpid()))
    try:
        yield
    finally:
        LOCK_PATH.unlink(missing_ok=True)

# ---------------------------------------------------------------------------
# Scrapers — each returns list[Program] or [] (fail-soft)
# ---------------------------------------------------------------------------

_IMMUNEFI_SLUG_RE = re.compile(r'/bug-bounty/([a-zA-Z0-9_\-]+)/information')
_IMMUNEFI_MAXBOUNTY_RE = re.compile(r'"maxBounty\\":(\d+(?:\.\d+)?)')
_IMMUNEFI_KYC_RE = re.compile(r'"kyc\\":(true|false)')
_IMMUNEFI_VAULT_RE = re.compile(r'"vaultBalance\\":(\d+(?:\.\d+)?)')
_IMMUNEFI_PROJECTNAME_RE = re.compile(r'"projectName\\":\\"([^"\\]{1,80})\\"')
_IMMUNEFI_PROJECTNAMESAFE_RE = re.compile(r'"projectNameSafe\\":\\"([^"\\]{1,80})\\"')
_IMMUNEFI_ECOSYSTEM_RE = re.compile(r'"ecosystem\\":\[((?:\\"[^"\\]+\\",?\s*)+)\]')
_IMMUNEFI_TECH_RE = re.compile(r'"technologies\\":\[((?:\\"[^"\\]+\\",?\s*)*)\]')
_IMMUNEFI_ASSET_MARKER_RE = re.compile(r'"addedAt\\":\\"\d{4}-\d{2}-\d{2}')
_IMMUNEFI_FIRSTSEEN_RE = re.compile(r'"firstSeen\\":\\"(\d{4}-\d{2}-\d{2}[^"\\]*)')
_IMMUNEFI_LASTUPDATED_RE = re.compile(r'"lastUpdated\\":\\"(\d{4}-\d{2}-\d{2}[^"\\]*)')


def _immunefi_extract_string_list(blob: str) -> list[str]:
    """Parse the inner-of-array body of an RSC-encoded ['ETH','BSC'] field."""
    out = []
    for m in re.finditer(r'\\"([^"\\]+)\\"', blob or ""):
        v = m.group(1).strip()
        if v:
            out.append(v)
    return out


def _immunefi_fetch_detail(slug: str) -> Program | None:
    """Fetch the /bug-bounty/<slug>/information detail page and extract structured fields.

    The detail page is a static SSR-rendered React Server Component shell where
    bounty metadata is embedded as escaped JSON in `self.__next_f.push([...])` chunks.
    All numeric fields (`maxBounty`, `vaultBalance`) and booleans (`kyc`) are recoverable
    via regex without needing JSON-tree reconstruction — RSC always escapes `"` as `\"`.
    """
    url = f"https://immunefi.com/bug-bounty/{slug}/information/"
    html = http_get_text(url, timeout=25)
    if not html:
        return None
    # max critical reward
    max_critical = None
    m = _IMMUNEFI_MAXBOUNTY_RE.search(html)
    if m:
        try:
            max_critical = float(m.group(1))
        except ValueError:
            pass
    # kyc
    kyc_required = None
    m_kyc = _IMMUNEFI_KYC_RE.search(html)
    if m_kyc:
        kyc_required = (m_kyc.group(1) == "true")
    # vault balance
    vault = None
    m_v = _IMMUNEFI_VAULT_RE.search(html)
    if m_v:
        try:
            vault = float(m_v.group(1))
        except ValueError:
            pass
    # display name — prefer projectName, fall back to projectNameSafe, then slug
    name = None
    m_n = _IMMUNEFI_PROJECTNAME_RE.search(html)
    if m_n:
        name = m_n.group(1).strip()
    if not name:
        m_n2 = _IMMUNEFI_PROJECTNAMESAFE_RE.search(html)
        if m_n2:
            name = m_n2.group(1).strip()
    if not name:
        name = slug
    # asset count — every in-scope asset has its own `addedAt` timestamp
    # (cap at 999 to ignore unrelated `addedAt` references from program-history blobs)
    asset_markers = len(_IMMUNEFI_ASSET_MARKER_RE.findall(html))
    assets_count = asset_markers if 0 < asset_markers < 1000 else None
    # ecosystem / chains
    chains: list[str] = []
    m_eco = _IMMUNEFI_ECOSYSTEM_RE.search(html)
    if m_eco:
        chains = _immunefi_extract_string_list(m_eco.group(1))
    # languages / technologies (often empty array)
    languages: list[str] = []
    m_tech = _IMMUNEFI_TECH_RE.search(html)
    if m_tech:
        languages = _immunefi_extract_string_list(m_tech.group(1))
    # last_updated from page (program-side, not row-side)
    last_updated_program = None
    m_lu = _IMMUNEFI_LASTUPDATED_RE.search(html)
    if m_lu:
        last_updated_program = m_lu.group(1)

    raw: dict[str, Any] = {
        "slug": slug,
        "source": "immunefi_detail_html",
        "max_critical_usd": max_critical,
        "kyc_required": kyc_required,
        "vault_balance_usd": vault,
        "assets_count": assets_count,
        "chains": chains,
        "languages": languages,
        "project_name": name,
    }
    if last_updated_program:
        raw["last_updated_program"] = last_updated_program

    return Program(
        platform="immunefi",
        program_name=name,
        max_critical_reward=max_critical,
        vault_balance=vault,
        assets_count=assets_count,
        url=url,
        status="live",
        raw=raw,
    )


def scrape_immunefi() -> list[Program]:
    """Immunefi — fetch /bug-bounty/ explore page, harvest slugs, fetch each detail page.

    The explore page is a Next.js App Router shell where per-program URLs render as
    `<Link href="/bug-bounty/<slug>/information/">`. Each detail page is a regular
    SSR-rendered React Server Component page with bounty metadata embedded as escaped
    JSON in `self.__next_f.push(...)` blobs. Regex-extract `maxBounty`, `kyc`,
    `vaultBalance`, `projectName`, plus chain + language arrays.

    Concurrency: 8 threads × 25s timeout — full 219-program crawl runs in ~30-60s.
    Stdlib-only (urllib + concurrent.futures), no new pip deps.
    """
    html = http_get_text(IMMUNEFI_LIST_URL)
    if not html:
        # legacy fallback: try /bug-bounty (same content, different canonical URL)
        html = http_get_text("https://immunefi.com/bug-bounty/")
    if not html:
        log.info("immunefi: explore page unreachable — deferred to next cycle")
        return []
    slugs = sorted(set(_IMMUNEFI_SLUG_RE.findall(html)))
    if not slugs:
        log.info("immunefi: no slugs found on explore page — page shape may have changed")
        return []
    log.info("immunefi: discovered %d slugs on explore page; fetching details serially @ 0.4s spacing", len(slugs))

    programs: list[Program] = []
    failed_slugs: list[str] = []
    started = time.time()

    # SERIAL fetch with 0.4s spacing — empirically the Immunefi WAF rate-limits
    # concurrent requests aggressively (≥4 parallel triggers 403/429 cascade).
    # 219 × 0.4s ≈ 90s; the retry pass historically recovered 189/192 stragglers.
    for slug in slugs:
        time.sleep(0.4)
        try:
            p = _immunefi_fetch_detail(slug)
            if p is not None:
                programs.append(p)
            else:
                failed_slugs.append(slug)
        except Exception as e:
            log.debug("immunefi: detail fetch crashed slug=%s err=%s", slug, type(e).__name__)
            failed_slugs.append(slug)

    # Retry pass with longer back-off (1.5s) for stragglers
    if failed_slugs:
        log.info("immunefi: retrying %d failed slugs with 1.5s back-off", len(failed_slugs))
        recovered = 0
        for slug in failed_slugs[:]:
            time.sleep(1.5)
            try:
                p = _immunefi_fetch_detail(slug)
                if p is not None:
                    programs.append(p)
                    recovered += 1
            except Exception:
                pass
        log.info("immunefi: retry recovered %d/%d", recovered, len(failed_slugs))

    elapsed = time.time() - started
    log.info(
        "immunefi: scraped %d / %d programs in %.1fs",
        len(programs), len(slugs), elapsed,
    )
    return programs


_CANTINA_CARD_TITLE_RE = re.compile(r"<h2[^>]*>([^<]+)</h2>")
_CANTINA_CARD_AMOUNT_RE = re.compile(
    r"<p[^>]*>([\d,]+)</p>\s*<p[^>]*>in <!-- -->([A-Z][A-Z0-9]*)"
)
_CANTINA_HREF_RE = re.compile(r'href="/bounties/([a-f0-9-]{36})"')


def _parse_cantina_amount_to_usd(amount_str: str, token: str) -> float | None:
    """Convert '7,500,000' + 'USDC' → 7500000.0. Stablecoins only."""
    try:
        n = float(amount_str.replace(",", ""))
    except (ValueError, AttributeError):
        return None
    stable = {"USDC", "USDT", "USDG", "DAI", "BUSD", "USDS", "FDUSD", "USD"}
    if token.upper() in stable:
        return n
    # for non-stable tokens, retain numeric magnitude with caveat (raw_json carries token)
    return n


def scrape_cantina() -> list[Program]:
    """Cantina /bounties — HTML server-rendered, parse card blocks.

    Each bounty is rendered as an <a href="/bounties/UUID"> ... </a> card with
    a chakra-heading <h2> for the title and (optionally) a <p>amount</p><p>in TOKEN</p>
    reward pair. Cards without explicit amount fall back to URL-only entries.
    """
    html = http_get_text(CANTINA_LIST_URL)
    if not html:
        log.info("cantina: page unreachable — deferred to manual-fetch")
        return []
    # split into card-blocks by href anchor
    blocks = re.split(r'(?=href="/bounties/[a-f0-9-]{36}")', html)
    programs: list[Program] = []
    seen: set[str] = set()
    for b in blocks:
        m_uuid = _CANTINA_HREF_RE.search(b)
        if not m_uuid:
            continue
        uuid = m_uuid.group(1)
        if uuid in seen:
            continue
        seen.add(uuid)
        m_title = _CANTINA_CARD_TITLE_RE.search(b)
        if not m_title:
            continue
        title = m_title.group(1).strip()
        m_amt = _CANTINA_CARD_AMOUNT_RE.search(b)
        max_critical = None
        raw_extras: dict[str, Any] = {"uuid": uuid}
        if m_amt:
            max_critical = _parse_cantina_amount_to_usd(m_amt.group(1), m_amt.group(2))
            raw_extras["amount_raw"] = m_amt.group(1)
            raw_extras["token"] = m_amt.group(2)
        url = f"https://cantina.xyz/bounties/{uuid}"
        programs.append(
            Program(
                platform="cantina",
                program_name=title,
                max_critical_reward=max_critical,
                vault_balance=None,  # vault balance not exposed on listing page
                assets_count=None,
                url=url,
                status="live",
                raw=raw_extras,
            )
        )
    log.info("cantina: scraped %d programs", len(programs))
    return programs


def scrape_sherlock() -> list[Program]:
    """Sherlock contests — public API returns paginated items list.

    Response shape: {"page": N, "next_page": M|null, "items": [...], "has_next": bool}.
    Iterate pages until has_next=false. FINISHED contests dropped via STATUS preflight.
    """
    programs: list[Program] = []
    page = 1
    max_pages = 50  # safety cap; Sherlock has ~10/page so 50 = 500 contests
    while page <= max_pages:
        url = f"{SHERLOCK_API_URL}?page={page}"
        data = http_get_json(url)
        if not data:
            if page == 1:
                log.info("sherlock: api unreachable — deferred to manual-fetch")
                return []
            break
        items = data if isinstance(data, list) else (data.get("items") if isinstance(data, dict) else None) or []
        if not isinstance(items, list) or not items:
            break
        for entry in items:
            if not isinstance(entry, dict):
                continue
            name = entry.get("title") or entry.get("name") or entry.get("slug")
            if not name:
                continue
            status_raw = (entry.get("status") or "live").lower()
            # Sherlock statuses: SHERLOCK_JUDGING, RUNNING, ESCALATING, FINISHED, COMPLETED
            if "finished" in status_raw or "completed" in status_raw or status_raw in ("ended", "closed"):
                continue
            max_critical = None
            for k in ("rewards", "prize_pool", "prizePool", "maxReward"):
                v = entry.get(k)
                if isinstance(v, (int, float)):
                    max_critical = float(v)
                    break
            vault_raw = entry.get("prize_pool") or entry.get("prizePool")
            vault: float | None = None
            if isinstance(vault_raw, (int, float)):
                vault = float(vault_raw)
            elif isinstance(vault_raw, str):
                try:
                    vault = float(re.sub(r"[^0-9.\-]", "", vault_raw))
                except ValueError:
                    vault = None
            assets_count = entry.get("assets_count") or entry.get("assetsCount")
            if not isinstance(assets_count, int):
                scope = entry.get("scope") or entry.get("contracts")
                assets_count = len(scope) if isinstance(scope, list) else None
            slug = entry.get("slug") or entry.get("id") or name
            page_url = f"https://audits.sherlock.xyz/contests/{slug}"
            programs.append(
                Program(
                    platform="sherlock",
                    program_name=str(name).strip(),
                    max_critical_reward=max_critical,
                    vault_balance=vault,
                    assets_count=assets_count,
                    url=page_url,
                    status=status_raw,
                    raw=entry,
                )
            )
        # advance pagination
        has_next = data.get("has_next") if isinstance(data, dict) else False
        if not has_next:
            break
        page += 1
    log.info("sherlock: scraped %d programs across %d pages", len(programs), page)
    return programs


SCRAPERS = {
    "immunefi": scrape_immunefi,
    "cantina": scrape_cantina,
    "sherlock": scrape_sherlock,
}

# ---------------------------------------------------------------------------
# Standing-Intake Step 1 STATUS preflight (lightweight)
# ---------------------------------------------------------------------------

def status_preflight(p: Program) -> str:
    """Return one of: LIVE / FINISHED / UNKNOWN. Cap/Flying Tulip waste avoidance."""
    s = (p.status or "").lower()
    if s in ("finished", "completed", "ended", "closed"):
        return "FINISHED"
    if s in ("live", "active", "running", "open", "judging", "escalating"):
        return "LIVE"
    return "UNKNOWN"

# ---------------------------------------------------------------------------
# Doctrine #32 v1.1 lightweight filter (audit-age via GitHub API)
# ---------------------------------------------------------------------------

GITHUB_REPO_RE = re.compile(r"github\.com/([A-Za-z0-9_\-.]+)/([A-Za-z0-9_\-.]+)")


def extract_github_repos(entry: dict) -> list[tuple[str, str]]:
    """Return list of (owner, repo) tuples discovered in scope assets / urls."""
    text = json.dumps(entry, default=str)
    seen: set[tuple[str, str]] = set()
    for m in GITHUB_REPO_RE.finditer(text):
        owner = m.group(1)
        repo = m.group(2).rstrip(".git").rstrip("/")
        # filter obviously-non-target garbage
        if owner.lower() in ("immunefi-team", "immunefi", "cantinaxyz", "sherlock-protocol"):
            continue
        seen.add((owner, repo))
    return list(seen)[:3]  # cap depth to 3 to bound HTTP cost


def doctrine_32_filter(p: Program) -> tuple[str, str]:
    """Lightweight Doctrine #32 v1.1 check.

    Returns (verdict, reason). verdict in {PASS, FAIL, INSUFFICIENT_DATA}.
    """
    repos = extract_github_repos(p.raw)
    if not repos:
        return ("INSUFFICIENT_DATA", "no github repo found in scope")
    owner, repo = repos[0]
    hdrs = {"Accept": "application/vnd.github+json"}
    if GITHUB_PAT:
        hdrs["Authorization"] = f"Bearer {GITHUB_PAT}"
    repo_json = http_get_json(
        f"https://api.github.com/repos/{owner}/{repo}", headers=hdrs, timeout=15
    )
    if not repo_json or not isinstance(repo_json, dict):
        return ("INSUFFICIENT_DATA", f"github api unreachable for {owner}/{repo}")
    pushed = repo_json.get("pushed_at")
    head_age_days = None
    if pushed:
        try:
            dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
            head_age_days = (datetime.now(timezone.utc) - dt).days
        except Exception:
            pass

    # check audits/ dir
    audit_age_days = None
    for cand in ("audits", "audit", "audit-reports"):
        adir = http_get_json(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{cand}",
            headers=hdrs,
            timeout=15,
        )
        if isinstance(adir, list) and adir:
            # find newest file by name-prefix YYYY-MM or use first entry's last commit
            # cheap heuristic: head_age_days approximates if audits dir exists and recent commits
            audit_age_days = head_age_days
            break

    if audit_age_days is not None and audit_age_days <= DOCTRINE_32_AUDIT_AGE_DAYS:
        return ("PASS", f"audits/ dir present, head age {audit_age_days}d <= 180d")
    if audit_age_days is None:
        return ("FAIL", "no audits/ directory found in primary repo")
    return ("FAIL", f"audit_age {audit_age_days}d > 180d")

# ---------------------------------------------------------------------------
# Watchlist match (Watchlist-Candidate-Crossmap.md)
# ---------------------------------------------------------------------------

_WATCHLIST_CACHE: set[str] | None = None


def load_watchlist_names() -> set[str]:
    global _WATCHLIST_CACHE
    if _WATCHLIST_CACHE is not None:
        return _WATCHLIST_CACHE
    names: set[str] = set()
    if WATCHLIST_PATH.exists():
        try:
            text = WATCHLIST_PATH.read_text(encoding="utf-8", errors="replace")
            for m in re.finditer(r"\*\*([A-Za-z][A-Za-z0-9_\- ]{1,30})\*\*\s*\(", text):
                nm = m.group(1).strip()
                if nm and len(nm) >= 2:
                    names.add(nm.lower())
        except Exception as e:
            log.warning("watchlist load failed: %s", type(e).__name__)
    _WATCHLIST_CACHE = names
    log.info("watchlist loaded: %d names", len(names))
    return names


def is_watchlisted(name: str) -> bool:
    names = load_watchlist_names()
    n = name.lower().strip()
    if n in names:
        return True
    # token-substring fuzzy match for "Lido Finance" ~ "lido"
    for w in names:
        if len(w) >= 3 and (w in n or n in w):
            return True
    return False

# ---------------------------------------------------------------------------
# Diff & change detection
# ---------------------------------------------------------------------------

def diff_and_record(conn: sqlite3.Connection, programs: list[Program], dry_run: bool, backfill: bool) -> list[dict]:
    """Diff scraped programs against DB state. Insert/update programs, record changes."""
    now = now_utc_iso()
    changes_recorded: list[dict] = []

    for p in programs:
        cur = conn.execute(
            "SELECT * FROM programs WHERE platform=? AND program_name=?",
            (p.platform, p.program_name),
        )
        row = cur.fetchone()
        raw_json_str = json.dumps(p.raw, default=str)[:64_000]  # cap forensic blob
        # extract enrichment fields (only Immunefi currently populates these)
        kyc_raw = p.raw.get("kyc_required") if isinstance(p.raw, dict) else None
        kyc_int = (1 if kyc_raw is True else (0 if kyc_raw is False else None))
        chains_val = p.raw.get("chains") if isinstance(p.raw, dict) else None
        chains_json_str = json.dumps(chains_val) if isinstance(chains_val, list) and chains_val else None
        langs_val = p.raw.get("languages") if isinstance(p.raw, dict) else None
        langs_json_str = json.dumps(langs_val) if isinstance(langs_val, list) and langs_val else None
        last_updated_program = p.raw.get("last_updated_program") if isinstance(p.raw, dict) else None

        if row is None:
            # NEW program
            if not dry_run:
                conn.execute(
                    """INSERT INTO programs
                       (platform, program_name, max_critical_reward, vault_balance,
                        assets_count, last_updated, first_seen, status, url, raw_json,
                        kyc_required, chains_json, languages_json, last_updated_program)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (
                        p.platform,
                        p.program_name,
                        p.max_critical_reward,
                        p.vault_balance,
                        p.assets_count,
                        now,
                        now,
                        p.status,
                        p.url,
                        raw_json_str,
                        kyc_int,
                        chains_json_str,
                        langs_json_str,
                        last_updated_program,
                    ),
                )
            ch = {
                "platform": p.platform,
                "program_name": p.program_name,
                "change_type": "new_program",
                "old_value": None,
                "new_value": json.dumps({
                    "max_critical_reward": p.max_critical_reward,
                    "vault_balance": p.vault_balance,
                    "assets_count": p.assets_count,
                    "url": p.url,
                }),
                "detected_at": now,
                "program": p,
            }
            changes_recorded.append(ch)
            continue

        # EXISTING — diff fields
        diffs = []
        if (p.max_critical_reward or 0) and row["max_critical_reward"] != p.max_critical_reward:
            diffs.append(("reward_tier_change", row["max_critical_reward"], p.max_critical_reward))
        old_vault = row["vault_balance"] or 0
        new_vault = p.vault_balance or 0
        if new_vault and abs(new_vault - old_vault) >= 1:  # any nontrivial delta
            ctype = "vault_increase" if new_vault > old_vault else "vault_decrease"
            diffs.append((ctype, old_vault, new_vault))
        old_assets = row["assets_count"] or 0
        new_assets = p.assets_count or 0
        if new_assets > old_assets:
            diffs.append(("scope_expansion", old_assets, new_assets))
        old_status = (row["status"] or "").lower()
        new_status = (p.status or "").lower()
        if old_status and new_status and old_status != new_status:
            diffs.append(("status_change", old_status, new_status))

        for ctype, oldv, newv in diffs:
            ch = {
                "platform": p.platform,
                "program_name": p.program_name,
                "change_type": ctype,
                "old_value": str(oldv),
                "new_value": str(newv),
                "detected_at": now,
                "program": p,
            }
            changes_recorded.append(ch)

        if not dry_run:
            conn.execute(
                """UPDATE programs
                   SET max_critical_reward=?, vault_balance=?, assets_count=?,
                       last_updated=?, status=?, url=?, raw_json=?,
                       kyc_required=COALESCE(?, kyc_required),
                       chains_json=COALESCE(?, chains_json),
                       languages_json=COALESCE(?, languages_json),
                       last_updated_program=COALESCE(?, last_updated_program)
                   WHERE platform=? AND program_name=?""",
                (
                    p.max_critical_reward if p.max_critical_reward is not None else row["max_critical_reward"],
                    p.vault_balance if p.vault_balance is not None else row["vault_balance"],
                    p.assets_count if p.assets_count is not None else row["assets_count"],
                    now,
                    p.status,
                    p.url,
                    raw_json_str,
                    kyc_int,
                    chains_json_str,
                    langs_json_str,
                    last_updated_program,
                    p.platform,
                    p.program_name,
                ),
            )

    if not dry_run:
        for ch in changes_recorded:
            conn.execute(
                """INSERT INTO changes
                   (program_name, platform, change_type, old_value, new_value,
                    detected_at, alerted, alert_sent_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    ch["program_name"],
                    ch["platform"],
                    ch["change_type"],
                    ch["old_value"],
                    ch["new_value"],
                    ch["detected_at"],
                    1 if backfill else 0,
                    "backfill" if backfill else None,
                ),
            )
        conn.commit()
    return changes_recorded

# ---------------------------------------------------------------------------
# Alert layer
# ---------------------------------------------------------------------------

def should_alert(ch: dict) -> bool:
    p: Program = ch["program"]
    ct = ch["change_type"]
    if ct == "new_program":
        return bool(p.max_critical_reward and p.max_critical_reward >= ALERT_NEW_PROGRAM_FLOOR_USD)
    if ct == "scope_expansion":
        return is_watchlisted(p.program_name)
    if ct == "vault_increase":
        try:
            delta = float(ch["new_value"]) - float(ch["old_value"] or 0)
        except (TypeError, ValueError):
            return False
        return delta >= ALERT_VAULT_DELTA_FLOOR_USD
    return False


def format_alert(ch: dict) -> str:
    p: Program = ch["program"]
    ct = ch["change_type"]
    cap = p.max_critical_reward or 0
    vault = p.vault_balance or 0
    assets = p.assets_count if p.assets_count is not None else "?"
    url = p.url or "(no url)"

    extra = ""
    if ct == "new_program":
        verdict, reason = doctrine_32_filter(p)
        extra = (
            f"\nDoctrine #32 v1.1 filter: {verdict}\n"
            f"  reason: {reason} [INSPECTED]"
        )
    elif ct == "scope_expansion":
        extra = (
            f"\nAssets: {ch['old_value']} → {ch['new_value']} (delta +"
            f"{int(ch['new_value']) - int(ch['old_value'] or 0)})"
            f"\nWatchlist hit: [INSPECTED]"
        )
    elif ct == "vault_increase":
        try:
            delta = float(ch["new_value"]) - float(ch["old_value"] or 0)
        except (TypeError, ValueError):
            delta = 0
        extra = (
            f"\nVault: ${float(ch['old_value'] or 0):,.0f} → ${float(ch['new_value']):,.0f}"
            f"\nDelta: +${delta:,.0f} [INSPECTED]"
        )

    return (
        f"🎯 SCOPE CHANGE — {p.platform.upper()}\n\n"
        f"Program: {p.program_name}\n"
        f"Change: {ct}\n"
        f"Critical cap: ${cap:,.0f}\n"
        f"Vault: ${vault:,.0f}\n"
        f"Assets: {assets}\n"
        f"Link: {url}\n"
        f"{extra}\n\n"
        "First 48h = highest priority per sentinel-sec playbook."
    )


def telegram_send(text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN:
        log.warning("telegram: no bot token loaded; skip send")
        return False
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = urllib.parse.urlencode({
        "chat_id": WAR_ROOM_CHAT_ID,
        "text": text,
        "disable_web_page_preview": "true",
    }).encode("utf-8")
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            ok = resp.status == 200
            if not ok:
                log.warning("telegram send non-200 status=%d", resp.status)
            return ok
    except Exception as e:
        log.warning("telegram send failed err=%s", type(e).__name__)
        return False


def dispatch_alerts(conn: sqlite3.Connection, changes: list[dict], dry_run: bool) -> int:
    sent = 0
    for ch in changes:
        if not should_alert(ch):
            continue
        text = format_alert(ch)
        if dry_run:
            log.info("DRY-RUN alert preview:\n%s", text)
            sent += 1
            continue
        ok = telegram_send(text)
        if ok:
            sent += 1
            conn.execute(
                """UPDATE changes
                   SET alerted=1, alert_sent_at=?
                   WHERE program_name=? AND platform=? AND change_type=? AND detected_at=?
                     AND alerted=0""",
                (now_utc_iso(), ch["program_name"], ch["platform"], ch["change_type"], ch["detected_at"]),
            )
            conn.commit()
    return sent

# ---------------------------------------------------------------------------
# Run orchestration
# ---------------------------------------------------------------------------

def run_once(backfill: bool, dry_run: bool, source_filter: str | None) -> dict:
    started = time.time()
    sources = [source_filter] if source_filter else list(SCRAPERS.keys())

    all_programs: list[Program] = []
    per_source_count: dict[str, int] = {}
    per_source_status: dict[str, str] = {}
    for src in sources:
        scraper = SCRAPERS.get(src)
        if not scraper:
            log.warning("unknown source: %s", src)
            per_source_status[src] = "unknown"
            continue
        try:
            scraped = scraper()
            # status preflight pass — drop FINISHED before diffing
            kept = []
            dropped = 0
            for p in scraped:
                if status_preflight(p) == "FINISHED":
                    dropped += 1
                    continue
                kept.append(p)
            if dropped:
                log.info("%s: dropped %d FINISHED entries via STATUS preflight", src, dropped)
            all_programs.extend(kept)
            per_source_count[src] = len(kept)
            per_source_status[src] = "ok" if kept else "deferred-to-manual-fetch"
        except Exception as e:
            log.exception("scraper %s crashed: %s", src, type(e).__name__)
            per_source_status[src] = f"error:{type(e).__name__}"

    conn = get_db()
    changes = diff_and_record(conn, all_programs, dry_run=dry_run, backfill=backfill)
    alerts_sent = 0
    if not backfill:
        alerts_sent = dispatch_alerts(conn, changes, dry_run=dry_run)
    else:
        log.info("backfill mode: %d changes recorded silently", len(changes))
    conn.close()

    duration = time.time() - started
    summary = {
        "started_at": now_utc_iso(),
        "duration_s": round(duration, 2),
        "sources": per_source_status,
        "programs_per_source": per_source_count,
        "programs_total": len(all_programs),
        "changes_detected": len(changes),
        "alerts_sent": alerts_sent,
        "mode": "backfill" if backfill else ("dry-run" if dry_run else "live"),
    }
    log.info("RUN SUMMARY: %s", json.dumps(summary))
    return summary

# ---------------------------------------------------------------------------
# Daemon loop
# ---------------------------------------------------------------------------

_stop = False


def _sig_handler(signum, frame):
    global _stop
    _stop = True
    log.info("signal %d received; stopping daemon", signum)


def run_daemon() -> None:
    signal.signal(signal.SIGTERM, _sig_handler)
    signal.signal(signal.SIGINT, _sig_handler)
    log.info("lane5-scope-monitor daemon started; cadence=6h")
    while not _stop:
        try:
            run_once(backfill=False, dry_run=False, source_filter=None)
        except Exception as e:
            log.exception("daemon iteration crashed: %s", type(e).__name__)
        # sleep up to 6h, interruptible
        slept = 0
        while slept < SIX_HOURS_SECONDS and not _stop:
            time.sleep(min(60, SIX_HOURS_SECONDS - slept))
            slept += 60
    log.info("daemon exited cleanly")

# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Lane 5 Automated Bounty Scope Monitor")
    ap.add_argument("--backfill", action="store_true", help="populate initial state silently")
    ap.add_argument("--dry-run", action="store_true", help="no DB writes, no telegram")
    ap.add_argument("--source", choices=list(SCRAPERS.keys()), help="run only one source")
    ap.add_argument("--daemon", action="store_true", help="6h scheduler loop (pm2 mode)")
    args = ap.parse_args(argv)

    if args.daemon:
        with acquire_lock():
            run_daemon()
        return 0

    with acquire_lock():
        summary = run_once(
            backfill=args.backfill,
            dry_run=args.dry_run,
            source_filter=args.source,
        )
    # exit 0 even with deferred sources (fail-soft)
    return 0


if __name__ == "__main__":
    sys.exit(main())
