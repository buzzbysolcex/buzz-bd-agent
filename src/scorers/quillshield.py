# src/scorers/quillshield.py
import asyncio
import aiohttp
from typing import Dict, List

HELIUS_API_URL = "https://api.helius.xyz/v0/token-metadata"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
SOLANA_FM_URL = "https://api.solana.fm/v0/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)


def _score_authority(token_info: Dict) -> int:
    score = 0
    if "mint_authority" in token_info and token_info["mint_authority"] is None:
        score += 10
    elif "mint_authority" in token_info:
        score -= 10
    if "freeze_authority" in token_info and token_info["freeze_authority"] is None:
        score += 10
    elif "freeze_authority" in token_info:
        score -= 10
    if "update_authority" in token_info and token_info["update_authority"] is None:
        score += 5
    return max(0, min(25, score))
