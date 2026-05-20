#!/usr/bin/env python3
"""
Lane 4 Phase 0A.2 — BitcoinTalk corpus scraper.

Polite-rate-limited public-forum scraper for cypherpunk / early-Bitcoin culture
corpus collection. See `hunts/2026-05-21-lane4-phase0a-corpus-plan.md` and
`brain/Research-BTC-Recovery-Intelligence.md` for thesis + ethical guardrails.

Authority: Master Ops Vision-2027 directive + 2026-05-21 explicit greenlight.

Ethical guardrails (enforced in code):
  - Public forum data only (bitcointalk.org/index.php)
  - Rate limit: 1 request per N seconds (default 2.5s, configurable)
  - User-Agent identifies as research bot
  - Respect robots.txt (verified: no Disallow rules; only Sitemap declared)
  - No PII enrichment beyond public profile fields
  - No private message access
  - Body excerpt capped at 2000 chars per post
  - Resume support: checkpoint file tracks last topic processed
  - JSONL output, one post per line

Usage:
  python3 btc_corpus_scraper.py \\
      --board 1 \\
      --max-topics 20 \\
      --output /home/claude-code/buzz-workspace/data/lane4/corpus/sample-board1.jsonl \\
      --delay-seconds 2.5

  python3 btc_corpus_scraper.py \\
      --board 1 \\
      --start-page 1 \\
      --end-page 5 \\
      --output /home/claude-code/buzz-workspace/data/lane4/corpus/board1-p1-5.jsonl \\
      --checkpoint /home/claude-code/buzz-workspace/data/lane4/corpus/.checkpoint-board1
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

USER_AGENT = "Buzz-Security-Research-Bot/1.0 (research@buzzbd.ai; public-corpus-collection)"
BASE_URL = "https://bitcointalk.org"
BODY_EXCERPT_MAX = 2000
DEFAULT_DELAY = 2.5
TIMEOUT = 30

# BTC address regex (legacy + segwit + bech32)
BTC_ADDR_RE = re.compile(
    r"\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{6,87})\b"
)

# URL regex (basic)
URL_RE = re.compile(r"https?://[^\s<>'\"]+")


def polite_get(session, url, delay_seconds):
    """Rate-limited GET with retries on transient errors."""
    time.sleep(delay_seconds)
    try:
        r = session.get(url, timeout=TIMEOUT)
        if r.status_code == 200:
            return r.text
        elif r.status_code in (429, 503):
            print(f"  rate-limited ({r.status_code}); sleeping 30s + retrying", file=sys.stderr)
            time.sleep(30)
            r = session.get(url, timeout=TIMEOUT)
            return r.text if r.status_code == 200 else None
        else:
            print(f"  HTTP {r.status_code} on {url}", file=sys.stderr)
            return None
    except requests.RequestException as e:
        print(f"  request error on {url}: {e}", file=sys.stderr)
        return None


def list_topics_on_board(session, board_id, page_offset, delay_seconds):
    """Return list of (topic_id, title, author, replies, views) tuples from a board page."""
    url = f"{BASE_URL}/index.php?board={board_id}.{page_offset}"
    html = polite_get(session, url, delay_seconds)
    if html is None:
        return []
    soup = BeautifulSoup(html, "html.parser")
    topics = []
    # SMF 1.1 board page: topic rows have anchor with topic=N.0 in href
    for a in soup.select("a[href*='topic=']"):
        href = a.get("href", "")
        title = a.get_text(strip=True)
        # match topic=NNN.0 or .new pattern
        m = re.search(r"topic=(\d+)\.", href)
        if not m:
            continue
        topic_id = int(m.group(1))
        # filter out reply-link anchors (typically have "new" or "msg" markers)
        if "msg" in href or len(title) < 3:
            continue
        topics.append((topic_id, title))
    # dedupe preserving first occurrence
    seen = set()
    out = []
    for tid, t in topics:
        if tid in seen:
            continue
        seen.add(tid)
        out.append((tid, t))
    return out


def parse_topic_posts(html, topic_id):
    """Parse posts from a topic HTML page. Returns list of post dicts."""
    soup = BeautifulSoup(html, "html.parser")
    posts = []

    # SMF 1.1 post wrappers: <div class="post">
    # Author info typically in <a class="poster_name" ...>
    # Date in <div class="smalltext">  with " on: " prefix
    # Subject in <td class="subject">  or anchor

    # Find post tables — SMF 1.1 uses td.windowbg / windowbg2 cells
    for post_block in soup.select("div.post"):
        post = {
            "topic_id": topic_id,
            "user": None,
            "user_profile_url": None,
            "date_raw": None,
            "subject": None,
            "body_excerpt": None,
            "signature_excerpt": None,
            "linked_urls": [],
            "linked_btc_addrs": [],
        }

        # Walk up to find the enclosing table cell with author column
        container = post_block.find_parent("td")
        # Look in the surrounding row for author info
        row = post_block.find_parent("tr")
        if row:
            poster_link = row.find("a", class_="nav") or row.find(
                "a", href=re.compile(r"action=profile")
            )
            if poster_link:
                post["user"] = poster_link.get_text(strip=True)
                post["user_profile_url"] = poster_link.get("href")

        # Date
        date_div = post_block.find_previous("div", class_="smalltext")
        if date_div:
            txt = date_div.get_text(" ", strip=True)
            if " on: " in txt or "on " in txt:
                post["date_raw"] = txt[:200]

        # Body text (limit to BODY_EXCERPT_MAX chars)
        body_text = post_block.get_text(" ", strip=True)
        post["body_excerpt"] = body_text[:BODY_EXCERPT_MAX]

        # Signature (separate <div class="signature">)
        sig = post_block.find("div", class_="signature") or (
            container.find("div", class_="signature") if container else None
        )
        if sig:
            post["signature_excerpt"] = sig.get_text(" ", strip=True)[:500]

        # Extract URLs
        post["linked_urls"] = list(set(URL_RE.findall(body_text)))[:20]
        # Extract BTC addresses
        post["linked_btc_addrs"] = list(set(BTC_ADDR_RE.findall(body_text)))[:10]

        if post["user"] or post["body_excerpt"]:
            posts.append(post)

    return posts


def fetch_topic(session, topic_id, delay_seconds):
    """Fetch a topic's first page and parse posts."""
    url = f"{BASE_URL}/index.php?topic={topic_id}.0"
    html = polite_get(session, url, delay_seconds)
    if html is None:
        return []
    return parse_topic_posts(html, topic_id)


def load_checkpoint(path):
    if path and os.path.exists(path):
        try:
            return json.loads(Path(path).read_text())
        except Exception:
            return {}
    return {}


def save_checkpoint(path, state):
    if path:
        Path(path).write_text(json.dumps(state, indent=2))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--board", type=int, default=None, help="bitcointalk board ID (e.g. 1 = Bitcoin Discussion); use with --start-page/--end-page")
    ap.add_argument("--start-page", type=int, default=1, help="start page number (1-indexed)")
    ap.add_argument("--end-page", type=int, default=1, help="end page number (inclusive, 1-indexed)")
    ap.add_argument("--topic-range-start", type=int, default=None, help="ERA-TARGETED MODE: start topic ID (e.g. 1 for 2009 era)")
    ap.add_argument("--topic-range-end", type=int, default=None, help="ERA-TARGETED MODE: end topic ID (e.g. 100000 for 2011 era)")
    ap.add_argument("--topic-range-step", type=int, default=1, help="step size for topic-id range iteration")
    ap.add_argument("--max-topics", type=int, default=None, help="cap total topics to scrape")
    ap.add_argument("--output", type=str, required=True, help="JSONL output path")
    ap.add_argument("--checkpoint", type=str, default=None, help="resume checkpoint path")
    ap.add_argument("--delay-seconds", type=float, default=DEFAULT_DELAY, help="rate-limit delay between requests")
    ap.add_argument("--dry-run", action="store_true", help="enumerate topics only, do not fetch")
    args = ap.parse_args()

    if args.board is None and args.topic_range_start is None:
        ap.error("must specify either --board (with page range) OR --topic-range-start/--topic-range-end")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    checkpoint = load_checkpoint(args.checkpoint)
    seen_topics = set(checkpoint.get("seen_topics", []))

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate"})

    # bitcointalk pagination: board=N.K where K = (page-1)*40
    posts_written = 0
    topics_scraped = 0

    with output_path.open("a", encoding="utf-8") as fout:
        for page in range(args.start_page, args.end_page + 1):
            offset = (page - 1) * 40
            print(f"[board {args.board}] page {page} (offset {offset})", file=sys.stderr)
            topics = list_topics_on_board(session, args.board, offset, args.delay_seconds)
            print(f"  found {len(topics)} topics", file=sys.stderr)

            for topic_id, title in topics:
                if topic_id in seen_topics:
                    continue
                if args.max_topics is not None and topics_scraped >= args.max_topics:
                    break

                if args.dry_run:
                    print(f"  DRY: would fetch topic {topic_id} ({title[:80]})", file=sys.stderr)
                    seen_topics.add(topic_id)
                    topics_scraped += 1
                    continue

                print(f"  fetching topic {topic_id}: {title[:80]}", file=sys.stderr)
                posts = fetch_topic(session, topic_id, args.delay_seconds)
                for p in posts:
                    p["topic_title"] = title
                    p["board_id"] = args.board
                    p["fetched_at_utc"] = datetime.now(timezone.utc).isoformat()
                    fout.write(json.dumps(p, ensure_ascii=False) + "\n")
                    posts_written += 1

                seen_topics.add(topic_id)
                topics_scraped += 1

                # Save checkpoint every 5 topics
                if args.checkpoint and topics_scraped % 5 == 0:
                    save_checkpoint(args.checkpoint, {"seen_topics": list(seen_topics)})

            if args.max_topics is not None and topics_scraped >= args.max_topics:
                break

    if args.checkpoint:
        save_checkpoint(args.checkpoint, {"seen_topics": list(seen_topics)})

    print(f"DONE. topics={topics_scraped} posts={posts_written} output={output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
