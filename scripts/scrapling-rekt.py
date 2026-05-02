#!/usr/bin/env python3
"""
scrapling-rekt.py — fetch rekt.news article list using Scrapling StealthyFetcher.

Wired into rug_watch handler (see api/services/cron/rug-watch.js or
scripts/schedule-handlers/). Returns top-N articles as JSON.
"""
import json, sys

try:
    from scrapling.fetchers import StealthyFetcher
except Exception as e:
    print(json.dumps({"error": f"scrapling import failed: {e}", "results": []}))
    sys.exit(1)

try:
    page = StealthyFetcher.fetch('https://rekt.news', headless=True)
except Exception as e:
    print(json.dumps({"error": f"fetch failed: {e}", "results": []}))
    sys.exit(1)

# Try multiple selectors (rekt.news layout has shifted historically)
articles = page.css('article') or page.css('.post') or page.css('[class*="article"]') or []

def first(sel_list):
    return sel_list[0] if sel_list else None

results = []
for a in articles[:10]:
    title_el = (
        first(a.css('h2'))
        or first(a.css('h3'))
        or first(a.css('.title'))
        or first(a.css('[class*="title"]'))
    )
    link_el = first(a.css('a[href]'))
    date_el = (
        first(a.css('time'))
        or first(a.css('.date'))
        or first(a.css('[class*="date"]'))
    )

    results.append({
        'title': (title_el.get_all_text(strip=True) if title_el else None),
        'url': (link_el.attrib.get('href', '') if link_el else None),
        'date': (date_el.get_all_text(strip=True) if date_el else None),
    })

print(json.dumps({"source": "rekt.news", "fetched_at": __import__("datetime").datetime.utcnow().isoformat()+"Z", "count": len(results), "results": results}, indent=2))
