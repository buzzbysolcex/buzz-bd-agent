# src/agents/scanner_agent.py
import aiohttp
from typing import Dict, List, Optional
from src.agents.base_agent import BaseAgent

DEFAULT_CHAINS = ["solana", "ethereum", "base"]

DEXSCREENER_BOOSTS_URL = "https://api.dexscreener.com/token-boosts/latest/v1"
DEXSCREENER_TOKENS_URL = "https://api.dexscreener.com/latest/dex/tokens"
COINGECKO_TRENDING_URL = "https://api.coingecko.com/api/v3/search/trending"
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

    async def _fetch_coingecko(self) -> List[Dict]:
        self.log_event("action", "Fetching CoinGecko trending")
        try:
            async with aiohttp.ClientSession(timeout=SOURCE_TIMEOUT) as session:
                async with session.get(COINGECKO_TRENDING_URL) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"CoinGecko returned {resp.status}")
                    data = await resp.json()

            tokens = []
            for coin in data.get("coins", []):
                item = coin.get("item", {})
                platforms = item.get("platforms", {})
                if not platforms:
                    continue

                # Take the first platform with an address
                for chain, address in platforms.items():
                    if not address:
                        continue
                    market_data = item.get("data", {})
                    tokens.append({
                        "contract_address": address,
                        "chain": chain,
                        "name": item.get("name", ""),
                        "symbol": item.get("symbol", ""),
                        "mcap": self._parse_dollar_string(market_data.get("market_cap", "0")),
                        "volume_24h": self._parse_dollar_string(market_data.get("total_volume", "0")),
                        "liquidity": 0.0,  # CoinGecko trending doesn't provide liquidity
                        "source": "coingecko",
                        "source_url": f"https://www.coingecko.com/en/coins/{item.get('id', '')}",
                    })
                    break  # one entry per coin

            self.log_event("observation", f"CoinGecko returned {len(tokens)} tokens")
            return tokens

        except Exception as e:
            self.log_event("error", f"CoinGecko fetch failed: {e}")
            return []

    async def _fetch_aixbt(self) -> List[Dict]:
        self.log_event("decision", "AIXBT source stubbed — endpoint not verified as JSON API")
        return []

    def _deduplicate(self, tokens: List[Dict]) -> List[Dict]:
        seen: Dict[tuple, Dict] = {}
        for token in tokens:
            key = (token["chain"].lower(), token["contract_address"].lower())
            if key in seen:
                existing = seen[key]
                existing["sources"].append(token["source"])
                # Keep the higher value for numeric fields
                for field in ("mcap", "volume_24h", "liquidity"):
                    existing[field] = max(existing[field], token.get(field, 0.0))
            else:
                token_copy = dict(token)
                token_copy["sources"] = [token_copy.pop("source")]
                seen[key] = token_copy
        return list(seen.values())

    @staticmethod
    def _parse_dollar_string(value) -> float:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.replace("$", "").replace(",", "").strip()
            try:
                return float(cleaned)
            except ValueError:
                return 0.0
        return 0.0
