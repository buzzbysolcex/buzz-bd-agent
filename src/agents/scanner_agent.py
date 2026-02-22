# src/agents/scanner_agent.py
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEFAULT_CHAINS = ["solana", "ethereum", "base"]

DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
SOURCE_TIMEOUT = aiohttp.ClientTimeout(total=10)


class ScannerAgent(BaseAgent):
    def __init__(self, chains: Optional[List[str]] = None):
        super().__init__(name="scanner")
        self.chains = chains or DEFAULT_CHAINS

    async def execute(self, params: Dict) -> Dict:
        raise NotImplementedError("TODO")

    async def _fetch_dexscreener(self, chains: List[str]) -> List[Dict]:
        self.log_event("action", "Fetching DexScreener boosts", {"chains": chains})
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                # Step 1: Get boosted token addresses
                async with session.get(DEXSCREENER_BOOSTS_URL) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"DexScreener boosts returned {resp.status}")
                    boosts = await resp.json()

                # Filter by requested chains
                chain_set = set(c.lower() for c in chains)
                filtered = [b for b in boosts if b.get("chainId", "").lower() in chain_set]

                # Step 2: Look up token details for each address
                tokens = []
                for boost in filtered[:20]:  # cap at 20 to avoid hammering API
                    address = boost.get("tokenAddress", "")
                    if not address:
                        continue
                    try:
                        async with session.get(f"{DEXSCREENER_TOKENS_URL}/{address}") as detail_resp:
                            if detail_resp.status != 200:
                                continue
                            detail = await detail_resp.json()
                            for pair in detail.get("pairs", [])[:1]:  # take first pair
                                tokens.append({
                                    "contract_address": pair.get("baseToken", {}).get("address", address),
                                    "chain": pair.get("chainId", boost.get("chainId", "")),
                                    "name": pair.get("baseToken", {}).get("name", ""),
                                    "symbol": pair.get("baseToken", {}).get("symbol", ""),
                                    "mcap": float(pair.get("marketCap", 0) or 0),
                                    "volume_24h": float(pair.get("volume", {}).get("h24", 0) or 0),
                                    "liquidity": float(pair.get("liquidity", {}).get("usd", 0) or 0),
                                    "source": "dexscreener",
                                    "source_url": pair.get("url", boost.get("url", "")),
                                })
                    except Exception:
                        continue  # skip individual token failures

                self.log_event("observation", f"DexScreener returned {len(tokens)} tokens")
                return tokens

        except Exception as e:
            self.log_event("error", f"DexScreener fetch failed: {e}")
            return []
