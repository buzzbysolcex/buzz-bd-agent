# src/scorers/quillshield.py
import asyncio
import os
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


async def _fetch_dexscreener(address: str) -> Dict:
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.get(f"{DEXSCREENER_TOKENS_URL}/{address}") as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                pair = data.get("pairs", [{}])[0]
                txns = pair.get("txns", {}).get("h24", {})
                return {
                    "liquidity_usd": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                    "market_cap": float(pair.get("marketCap", 0) or 0),
                    "can_buy": txns.get("buys", 0) > 0,
                    "can_sell": txns.get("sells", 0) > 0,
                    "tax_pct": 0.0,
                    "verified": False,
                    "suspicious_transfers": False,
                    "lp_locked": False,
                    "lp_burned": False,
                }
    except Exception:
        return {}


async def _fetch_helius(address: str) -> Dict:
    api_key = os.environ.get("HELIUS_API_KEY", "")
    if not api_key:
        return {}
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.post(
                f"{HELIUS_API_URL}?api-key={api_key}",
                json={"mintAccounts": [address]},
            ) as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                if not data:
                    return {}
                item = data[0]
                parsed = (item.get("onChainAccountInfo", {})
                          .get("accountInfo", {})
                          .get("data", {})
                          .get("parsed", {})
                          .get("info", {}))
                metadata = (item.get("onChainMetadata", {})
                            .get("metadata", {}))
                return {
                    "mint_authority": parsed.get("mintAuthority"),
                    "freeze_authority": parsed.get("freezeAuthority"),
                    "update_authority": metadata.get("updateAuthority"),
                }
    except Exception:
        return {}


async def _fetch_solana_fm(address: str) -> Dict:
    try:
        async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
            async with session.get(f"{SOLANA_FM_URL}/{address}/holders") as resp:
                if resp.status != 200:
                    return {}
                data = await resp.json()
                holders = data.get("result", [])
                total_supply = data.get("totalSupply", 0)
                if not holders or total_supply <= 0:
                    return {}

                amounts = sorted(
                    [h.get("info", {}).get("amount", 0) for h in holders],
                    reverse=True,
                )
                top_10_total = sum(amounts[:10])
                top_10_pct = (top_10_total / total_supply) * 100
                creator_pct = (amounts[0] / total_supply) * 100 if amounts else 100
                max_single_pct = (max(amounts) / total_supply) * 100 if amounts else 100

                return {
                    "top_10_pct": top_10_pct,
                    "creator_pct": creator_pct,
                    "max_single_pct": max_single_pct,
                }
    except Exception:
        return {}


def _collect_flags(authority: int, liquidity: int, holders: int, contract: int) -> List[str]:
    flags = []
    threshold = 13
    if authority < threshold:
        flags.append("authority_risk")
    if liquidity < threshold:
        flags.append("lp_not_locked")
    if holders < threshold:
        flags.append("top_holders_concentrated")
    if contract < threshold:
        flags.append("contract_risk")
    return flags


async def score(address: str, chain: str) -> Dict:
    """Run QuillShield safety analysis on a token. Returns 0-100 score."""
    try:
        dex_data, helius_data, holders_data = await asyncio.gather(
            _fetch_dexscreener(address),
            _fetch_helius(address),
            _fetch_solana_fm(address),
        )
    except Exception:
        return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    if not dex_data and not helius_data and not holders_data:
        return {"score": 0, "breakdown": {"authority": 0, "liquidity": 0, "holders": 0, "contract": 0}, "flags": [], "available": False}

    contract_data = dict(dex_data)
    if helius_data:
        contract_data["verified"] = helius_data.get("update_authority") is None

    authority = _score_authority(helius_data)
    liquidity = _score_liquidity(dex_data)
    holders = _score_holders(holders_data)
    contract = _score_contract(contract_data)

    total = authority + liquidity + holders + contract
    flags = _collect_flags(authority, liquidity, holders, contract)

    return {
        "score": total,
        "breakdown": {
            "authority": authority,
            "liquidity": liquidity,
            "holders": holders,
            "contract": contract,
        },
        "flags": flags,
        "available": True,
    }
