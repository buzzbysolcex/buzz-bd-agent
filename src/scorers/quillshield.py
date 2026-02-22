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


def _score_liquidity(pair_data: Dict) -> int:
    score = 0
    liquidity = pair_data.get("liquidity_usd", 0)
    mcap = pair_data.get("market_cap", 0)
    if mcap > 0 and (liquidity / mcap) >= 0.10:
        score += 10
    if pair_data.get("lp_locked", False):
        score += 10
    if pair_data.get("lp_burned", False):
        score += 5
    return min(25, score)


def _score_holders(holders_data: Dict) -> int:
    score = 0
    if holders_data.get("top_10_pct", 100) < 30:
        score += 10
    if holders_data.get("creator_pct", 100) < 5:
        score += 10
    if holders_data.get("max_single_pct", 100) <= 10:
        score += 5
    return min(25, score)


def _score_contract(contract_data: Dict) -> int:
    score = 0
    if contract_data.get("can_buy", False) and contract_data.get("can_sell", False):
        score += 10
    if contract_data.get("tax_pct", 100) <= 5:
        score += 5
    if contract_data.get("verified", False):
        score += 5
    if not contract_data.get("suspicious_transfers", True):
        score += 5
    return min(25, score)
