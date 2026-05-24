---
type: brain-compound
source: clarahacks.com free tier (8 pages, ~400 incidents 2020-02 → 2026-05)
intake_date: 2026-05-24
authority: Ogie msg 7692
scope: pure brain compound — NO submission gates, NO publish gates, NO Telegram surfacing during work
r8_methodology: every classification tagged [INSPECTED] (Clara text directly evidenced primitive) OR [ASSUMED] (inferred from attack_type label, no primitive read)
---

# Clara Ground-Truth Bulk Intake — v1.0

## Methodology

### Scraping
- **Tool**: WebFetch read-only, no clones (per operator disk discipline at 84%)
- **Pages**: 8 (`clarahacks.com/?page=1` through `?page=8`), all returned 200, no failures
- **Per-page yield**: 50, 50, 50, 50, 50, 50, 50, 50 = **400 incidents extracted**
- **Per-incident fields extracted**: name, date, chain (mostly `unknown` — Clara doesn't surface chain on index), attack_type (Clara's own label), tokens_lost, usd_estimate, root_cause (Clara's own classification or `unknown`)
- **Time-range**: 2020-02-15 (bZx/Fulcrum WBTC manipulation) → 2024-05-21 (PNT Burner). Note: Clara's free tier appears to cap at exploits up to ~mid-2024; no 2025-2026 incidents on the free tier (the recent intake corpus already documented in `brain/Ground-Truth-Exploits.md` covers 2026 events from operator-supplied intel)

### Buzz classification methodology
For each Clara incident, apply **Standing-Intake Step 2 brain overlap lens**:
1. Map Clara's attack_type label → Buzz taxonomy via synonym table (below)
2. Test against active DC catalog (DC-1..DC-10)
3. Test against CANDIDATE pool (A, D, E, H, I, J, K, L, M, O, P, Q, R, S)
4. Score: HIGH (3+ direct matches), MEDIUM (1-2), LOW (0 matches → gap class)
5. R8 tag: `[INSPECTED]` if Clara's text-evidence directly demonstrates the diagnostic primitive of the matched class; `[ASSUMED]` if the match is inferred from the attack_type label alone without primitive-verification

### Clara → Buzz Synonym Table (mapping primitive)

| Clara label                                          | Buzz primitive                                                | Maps to                                  |
| ---------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| "Reentrancy" / "Callback drain"                      | external call before state mutation                           | DC-1 sub (CEI) / CANDIDATE-M             |
| "Flash loan attack/exploit" + price/oracle           | spot-oracle manipulation with flash-borrow substrate          | CANDIDATE-O substrate / Pattern E        |
| "Oracle manipulation" / "Spot-oracle"                | single-block price-read on shallow venue                      | CANDIDATE-O / Sharwa-class               |
| "Donation inflation" / "Share inflation"             | balanceOf(this) accounting + user-fungible shares             | CANDIDATE-I (Compound-cToken family)     |
| "Approval drain" / "Allowance drain"                 | router/proxy with arbitrary `transferFrom` from caller        | CANDIDATE pool (no exact DC, gap)        |
| "Initializer takeover" / "Reinit drain"              | uninitialized proxy, public `initialize()`                    | DC-9 sub-1 (admin-state mutation no DiD) |
| "Self-transfer drain" / "Pair drain"                 | token transfer overwrites `from==to` accounting               | gap class (recurrent)                    |
| "Reflection drain" / "Tax-swap dump"                 | custom `_update`/`_transfer` mutates LP pair                  | CANDIDATE-R (proposed)                   |
| "Migration drain" / "Migration arbitrage"            | old→new contract bridge with stale-state                      | DC-9 sub-2 (zero-timelock migration)     |
| "Burn drain" / "Burn exploit" / "burnFrom bug"       | unrestricted burn or asymmetric burn-accounting               | gap class                                |
| "Signature replay" / "Replay attack"                 | nonce missing / chainId missing                               | DC-10 sub-2 (scope omission) / DC-5      |
| "Admin key compromise" / "Governance takeover"       | single role + no timelock / multisig captured                 | DC-9 / CANDIDATE-P                       |
| "Decimal mismatch" / "Mis-scaled invariant"          | unit-of-measure asymmetry                                     | gap class (CANDIDATE-H sibling)          |
| "Read-only reentrancy"                               | oracle read inside reenterable callback                       | DC-1 sub (read-side CEI)                 |
| "Arbitrary `from` theft" / "Spoof burn"              | trusted-forwarder / ERC2771 misuse                            | gap class                                |
| "Bridge drain" / "Cross-chain drain"                 | message-binding gap on destination                            | DC-10                                    |
| "Governance flash-loan takeover"                     | single-block voting power w/ no snapshot delay                | CANDIDATE-J sibling (state-machine race) |

### R8 grading distribution (all 400)
- `[INSPECTED]` (primitive directly evidenced in Clara label): ~30% (Clara's label names the primitive — "Reentrancy", "Oracle manipulation", "Initializer takeover")
- `[ASSUMED]` (inferred from label + protocol context, primitive not text-evidenced): ~70%
- This skew is honest: Clara's index-page labels are short ("Drain", "Treasury drain", "Pair drain") and don't always disclose the diagnostic primitive. Per-incident writeups would lift `[INSPECTED]` ratio, but those are paywalled / require deeper navigation. Intake stays at index-page R8 grade.

---

## Section 0 — Per-incident table (all 400 incidents, 8 pages)

> Tagging convention: `dc:X` = active DC-X match (Buzz catalog); `cand:Y` = CANDIDATE-Y match; `gap:<class>` = no current Buzz coverage, proposed gap class name. R8: `[I]` = INSPECTED, `[A]` = ASSUMED. Multiple tags = multi-class composition.

### Page 1 (2024-05-21 → 2024-02-23, 50 incidents)

| #   | Name                | Date       | Chain    | Attack type                   | Tokens / USD                | Buzz class                | R8  |
| --- | ------------------- | ---------- | -------- | ----------------------------- | --------------------------- | ------------------------- | --- |
| 1   | PNT Burner          | 2024-05-21 | unknown  | Price manipulation            | 1.55 ETH+ / $6,527          | cand:O                    | [A] |
| 2   | TCHtoken            | 2024-05-16 | unknown  | Replay attack                 | 19,839 USDT / $19.8K        | dc:10 sub-2 / dc:5        | [A] |
| 3   | Sonne soVELO        | 2024-05-14 | unknown  | Token inflation               | 2,353 VELO+724K USDC/$727K  | cand:I                    | [I] |
| 4   | PredyPool           | 2024-05-14 | unknown  | Reserve manipulation          | 83.9 WETH+219K USDC/$464K   | cand:O                    | [A] |
| 5   | TGC                 | 2024-05-11 | unknown  | Price manipulation            | 36.5K USDT+/$36.6K          | cand:O                    | [A] |
| 6   | TSURUWrapper        | 2024-05-10 | unknown  | Unbacked token minting        | 137.8 ETH+167M TSURU/$417K  | dc:9 sub-1                | [I] |
| 7   | Galaxy Fox          | 2024-05-10 | unknown  | Claim root manipulation       | 1.3B GFOX                   | gap:merkle-root-overwrite | [A] |
| 8   | GPU                 | 2024-05-08 | unknown  | Token inflation               | 32.4K USDT                  | cand:I                    | [A] |
| 9   | UUPS                | 2024-04-30 | unknown  | Initializer takeover          | 479 ETH / $1.4M             | dc:9 sub-1                | [I] |
| 10  | Yield Strategy      | 2024-04-30 | unknown  | Redemption attack             | $107                        | gap:redemption-self-bal   | [A] |
| 11  | BNBX                | 2024-04-27 | unknown  | Allowance drain               | 858K BNBX                   | gap:approval-drain        | [A] |
| 12  | XBridge STC         | 2024-04-24 | unknown  | Escrow drain                  | 482M STC                    | dc:10                     | [A] |
| 13  | SpotVault           | 2024-04-24 | unknown  | Zero-share exploit            | 75.6K USDC+0.52 BTCB/$257K  | cand:I                    | [I] |
| 14  | Rico Bank           | 2024-04-20 | unknown  | Flash loan drain              | 10.4K USDC+2.5K ARB/$16K    | cand:O                    | [A] |
| 15  | Hedgey              | 2024-04-19 | unknown  | Allowance drain               | 1.3M USDC / $1.3M           | gap:approval-drain        | [A] |
| 16  | Public Executor     | 2024-04-17 | unknown  | Treasury drain                | 18.3 ETH / $55.6K           | dc:9 sub-1                | [A] |
| 17  | SATX                | 2024-04-16 | unknown  | Pair accounting exploit       | 49.3 WBNB / $26K            | gap:pair-accounting       | [A] |
| 18  | MinterProxyV2       | 2024-04-15 | unknown  | Approval drain                | 20.5K USDT+0.76 BTCB/$140K  | gap:approval-drain        | [A] |
| 19  | BEP20Token          | 2024-04-14 | unknown  | Reward fabrication            | 14.7K USDT                  | dc:9 sub-1                | [A] |
| 20  | Hackathon Pair      | 2024-04-14 | unknown  | Token inflation               | 21K USDT                    | cand:I                    | [A] |
| 21  | Sumer               | 2024-04-12 | unknown  | Timelock bypass               | 310K USDC+10.9 wstETH/$353K | dc:9 sub-2                | [I] |
| 22  | FIL314              | 2024-04-12 | unknown  | Reserve drain                 | 20.2 BNB / $12.4K           | gap:pair-accounting       | [A] |
| 23  | BigBangSwap         | 2024-04-10 | unknown  | Reward drain                  | 7K USDT+32K BBG / $7K       | gap:reward-drain          | [A] |
| 24  | UPS                 | 2024-04-08 | unknown  | Hook exploit                  | 30.3K USDT                  | cand:M                    | [A] |
| 25  | SquidTokenSwap      | 2024-04-08 | unknown  | Migration drain               | 163M SQUIDV2                | dc:9 sub-2                | [A] |
| 26  | GROKD               | 2024-04-06 | unknown  | Reward drain                  | 1.3M GROKD                  | gap:reward-drain          | [A] |
| 27  | WSM                 | 2024-04-04 | unknown  | Price manipulation (presale)  | 2.77M WSM                   | cand:O                    | [A] |
| 28  | HOPPY               | 2024-04-02 | unknown  | MEV sandwich                  | 0.36 ETH / $1,190           | cand:O substrate          | [A] |
| 29  | OpenLeverage        | 2024-04-01 | unknown  | Debt forgiveness              | 33.1 WBNB / $19.7K          | gap:debt-forgive          | [A] |
| 30  | Ethernal Finance II | 2024-03-29 | unknown  | Forced buyback                | 2.6 BNB / $1.6K             | gap:forced-buyback        | [A] |
| 31  | Wrapper Oracle      | 2024-03-28 | Arbitrum | Oracle inflation              | 20.3 ETH+77K USDC/$307K     | cand:O                    | [I] |
| 32  | Prisma              | 2024-03-28 | unknown  | Callback theft                | 1,282 wstETH / $5.3M        | cand:M / dc:1             | [I] |
| 33  | ZZF / ZONGZI        | 2024-03-25 | unknown  | Reward drain                  | 383 WBNB / $224K            | gap:reward-drain          | [A] |
| 34  | Curio               | 2024-03-23 | unknown  | Governance takeover           | 26 WETH+18.7K DAI/$180K     | dc:9 / cand:P             | [I] |
| 35  | ARK                 | 2024-03-23 | unknown  | Reserve collapse              | 348 WBNB / $194.9K          | gap:pair-accounting       | [A] |
| 36  | SSS                 | 2024-03-21 | unknown  | Self-transfer drain           | 1,310 WETH / $4.6M          | gap:self-transfer-acct    | [I] |
| 37  | ParaSwap            | 2024-03-19 | unknown  | Callback theft                | 12.5K OPSEC                 | cand:M / gap:approval     | [A] |
| 38  | IntrospectionToken  | 2024-03-13 | unknown  | Pair drain                    | 12.4K USDT                  | gap:pair-accounting       | [A] |
| 39  | Public Borrow Path  | 2024-03-12 | unknown  | Borrow exploitation           | 745K USDT / $745K           | dc:9 sub-1                | [A] |
| 40  | BloomBeans          | 2024-03-12 | unknown  | Registry takeover             | 5 WETH / $20K               | dc:9 sub-1                | [A] |
| 41  | JUICE               | 2024-03-09 | unknown  | Staking bonus drain           | 895K JUICE                  | gap:reward-drain          | [A] |
| 42  | Unizen Router       | 2024-03-08 | unknown  | Approval drain                | 40 DMTR+41.6K VRA           | gap:approval-drain        | [A] |
| 43  | Ghost               | 2024-03-07 | unknown  | Unrestricted transferFrom     | 15.4 WETH / $58.7K          | gap:approval-drain        | [I] |
| 44  | StableCoinVault     | 2024-03-06 | unknown  | Public swap drain             | 10.6K USDT                  | dc:9 sub-1                | [A] |
| 45  | TGBS                | 2024-03-06 | unknown  | Pair reserve drain            | 367 WBNB / $149.5K          | gap:pair-accounting       | [A] |
| 46  | WooPPV2             | 2024-03-05 | unknown  | Oracle self-manipulation      | 2.55M WOO+522 WETH/$2.1M    | cand:O                    | [I] |
| 47  | Seneca Chamber      | 2024-02-28 | unknown  | Approval drain                | 1,385 PT-rsETH-27JUN2024    | gap:approval-drain        | [A] |
| 48  | Zoomer              | 2024-02-23 | unknown  | Flash loan exploit            | 17.2 ETH / $50.2K           | cand:O                    | [A] |
| 49  | Compound (frozen)   | 2024-02-23 | unknown  | Frozen UNI borrow             | 2.4K USDC / $2,441          | gap:frozen-borrow-bug     | [A] |
| 50  | Blueberry           | 2024-02-23 | unknown  | Decimal mismatch              | 8.6K OHM+913K USDC/$1.3M    | gap:decimal-mismatch      | [I] |

### Page 2 (2024-02-22 → 2023-11-29, 50 incidents)

| #   | Name                       | Date       | Chain    | Attack type                | Tokens / USD                  | Buzz class                | R8  |
| --- | -------------------------- | ---------- | -------- | -------------------------- | ----------------------------- | ------------------------- | --- |
| 51  | XToken Wrapper             | 2024-02-22 | unknown  | Drain                      | 7.7K DAI                      | gap:wrapper-acct          | [A] |
| 52  | DeezNutz                   | 2024-02-21 | unknown  | Self-Transfer Drain        | 58.7 WETH / $170K             | gap:self-transfer-acct    | [A] |
| 53  | GAIN                       | 2024-02-21 | unknown  | Pair Drain                 | 6.4 WETH / $18.7K             | gap:pair-accounting       | [A] |
| 54  | RuggedMarket               | 2024-02-19 | unknown  | Custody Drain              | 11 RUG                        | dc:9 sub-1                | [A] |
| 55  | Zero-Amount ERC1155        | 2024-02-15 | unknown  | Redemption Drain           | 285K Token                    | gap:zero-amount-erc1155   | [I] |
| 56  | Venus dLINK                | 2024-02-15 | unknown  | Donation Inflation         | 912 USDT+50 WBNB/$38.2K       | cand:I                    | [I] |
| 57  | MINER                      | 2024-02-14 | unknown  | Self-Transfer Inflation    | 28.2 WETH / $77.7K            | gap:self-transfer-acct    | [I] |
| 58  | Recursive Auction          | 2024-02-12 | unknown  | Refund Drain               | 11.2 ETH / $29.3K             | cand:M                    | [A] |
| 59  | FILX Vesting               | 2024-02-10 | unknown  | Proxy Drain                | 685K FILX                     | dc:9 sub-1                | [A] |
| 60  | PandorasNodes404           | 2024-02-08 | unknown  | TransferFrom Drain         | 7.6 WETH / $18.5K             | gap:approval-drain        | [A] |
| 61  | BurnsDeFi                  | 2024-02-05 | unknown  | Burn Reward Drain          | 289 BNB / $87.7K              | gap:burn-acct             | [A] |
| 62  | MainPool                   | 2024-02-02 | unknown  | Step-Income Drain          | 21.1 ETH / $48.5K             | gap:reward-drain          | [A] |
| 63  | Affine                     | 2024-02-01 | unknown  | Flash-Loan Callback        | 33.7 aEthwstETH               | cand:M / dc:1             | [A] |
| 64  | GGGTOKEN                   | 2024-01-30 | unknown  | Repeated LP Burn           | 61.7K USDT                    | dc:9 sub-4                | [I] |
| 65  | CauldronV4                 | 2024-01-30 | unknown  | Debt Rebase Exploit        | 4.7M MIM / $4.7M              | gap:rebase-acct           | [I] |
| 66  | Peapods                    | 2024-01-29 | unknown  | Flash-Bond Inflation       | 23.2 PEAS                     | cand:I                    | [A] |
| 67  | Barley                     | 2024-01-28 | unknown  | Flash-Bond Share Infl.     | 7.9M BARL                     | cand:I                    | [I] |
| 68  | Citadel                    | 2024-01-27 | unknown  | Oracle Manipulation        | 24.8 WETH / $56.2K            | cand:O                    | [A] |
| 69  | Nebula NblNftStake         | 2024-01-25 | unknown  | Reentrancy                 | 1.77B NBL                     | dc:1 (CEI) / cand:M       | [I] |
| 70  | Bullrun Helper             | 2024-01-22 | unknown  | Unauthorized Redemption    | 2.8K BUI                      | dc:9 sub-1                | [A] |
| 71  | BMIZapper                  | 2024-01-17 | unknown  | USDC Allowance Drain       | 114K USDC                     | gap:approval-drain        | [A] |
| 72  | SocketGateway              | 2024-01-16 | unknown  | Route 406 USDC Drain       | 2.57M USDC / $2.6M            | gap:approval-drain        | [I] |
| 73  | WiseLending                | 2024-01-12 | unknown  | Share-Price Inflation      | 104 wstETH+9K USDC/$321K      | cand:I                    | [I] |
| 74  | FreeDom                    | 2024-01-10 | unknown  | Pair-Fee Drain             | 60.3 WBNB / $17.7K            | gap:pair-accounting       | [A] |
| 75  | Hypervisor                 | 2024-01-04 | unknown  | Share Inflation            | 212 WETH / $472K              | cand:I                    | [I] |
| 76  | MIC                        | 2024-01-02 | unknown  | Temp-LP Fee Hijack         | 179 MIC+2.6K USDT             | gap:lp-fee-hijack         | [A] |
| 77  | Channels                   | 2023-12-31 | unknown  | Dust-Share Drain           | 3.1K USDC+1.3K BUSD           | cand:I                    | [A] |
| 78  | CCV Treasury               | 2023-12-28 | unknown  | Rebalancer Attack          | 6.5K CCV+896 USDT             | gap:rebalancer            | [A] |
| 79  | Telcoin Wallet             | 2023-12-25 | unknown  | Reinitialization Drain     | 141.8M TEL+4.2K MATIC         | dc:9 sub-1                | [I] |
| 80  | Polygon Uninit Clone       | 2023-12-25 | Polygon  | Wallet Takeover            | 3.24B TEL                     | dc:9 sub-1                | [I] |
| 81  | Transit Router V5          | 2023-12-20 | unknown  | Drain                      | 43.8K USDT                    | gap:approval-drain        | [A] |
| 82  | BOBO                       | 2023-12-17 | unknown  | Dual-Market Drain          | 3 WBNB / $726                 | cand:O                    | [A] |
| 83  | Flooring extMulticall      | 2023-12-17 | unknown  | Approval Drain             | 12 WETH+14 BAYC               | gap:approval-drain        | [A] |
| 84  | GoodDollar                 | 2023-12-16 | unknown  | Fake-Interest Mint         | 625K DAI / $625K              | dc:9 sub-1                | [I] |
| 85  | BatchSwap                  | 2023-12-16 | unknown  | Counterpart Reentrancy     | 5 CloneX                      | dc:1 (CEI)                | [A] |
| 86  | KEKESANTA                  | 2023-12-16 | unknown  | Pair-to-Router Drain       | 9.2 WBNB / $2.3K              | gap:pair-accounting       | [A] |
| 87  | PHIL                       | 2023-12-14 | unknown  | Public Mint Drain          | 2.1 WBNB                      | dc:9 sub-1                | [A] |
| 88  | Hypr Bridge                | 2023-12-13 | unknown  | Reinit Drain               | 2.57M HYPR                    | dc:9 sub-1                | [A] |
| 89  | BCT                        | 2023-12-09 | unknown  | Referral Treasury Drain    | 1.13M BCT+10 WBNB             | gap:reward-drain          | [A] |
| 90  | DominoTT                   | 2023-12-07 | unknown  | Forwarder Burn Exploit     | 1.15 WBNB+2M DominoTT         | gap:erc2771-misuse        | [I] |
| 91  | thirdweb                   | 2023-12-07 | unknown  | Sender Spoof Burn          | 3.6 WBNB+18T HNet             | gap:erc2771-misuse        | [I] |
| 92  | TIME                       | 2023-12-06 | unknown  | ERC2771 Burn Exploit       | 89.5 WETH+62B TIME / $199K    | gap:erc2771-misuse        | [I] |
| 93  | Elephant                   | 2023-12-06 | unknown  | Treasury Sweep Sandwich    | 114K BUSD                     | cand:O substrate          | [A] |
| 94  | Bearn                      | 2023-12-05 | unknown  | Dust Sweep Exploit         | 761K BUSD / $761K             | gap:sweep-bug             | [A] |
| 95  | Matmo MAMO                 | 2023-12-05 | unknown  | Treasury Drain             | 5.7K USDT                     | dc:9 sub-1                | [A] |
| 96  | bZx iYFI                   | 2023-12-02 | unknown  | Donation Inflation         | 38 WETH+0.23 WBTC/$210K       | cand:I                    | [I] |
| 97  | TRUST/FCN                  | 2023-12-01 | unknown  | Flash-Swap Reward Exploit  | 503K BSC-USD+251 FCN/$503K    | cand:O                    | [A] |
| 98  | EEECOIN                    | 2023-11-30 | unknown  | Public Helper LP Drain     | 69.9K USDT                    | gap:pair-accounting       | [A] |
| 99  | Flashstake                 | 2023-11-29 | unknown  | LP Share Inflation         | 1.6K USDC+0.79 WETH           | cand:I                    | [A] |
| 100 | CAROL                      | 2023-11-29 | unknown  | Reward Inflation Drain     | 33.6 WETH / $68.2K            | gap:reward-drain          | [A] |

### Page 3 (2023-11-29 → 2023-09-05, 50 incidents)

| #   | Name                | Date       | Chain   | Attack type                       | Tokens / USD              | Buzz class             | R8  |
| --- | ------------------- | ---------- | ------- | --------------------------------- | ------------------------- | ---------------------- | --- |
| 101 | AISPACE             | 2023-11-29 | unknown | Pair Spoofing + Vault Drain       | 62.2K USDT                | gap:pair-spoof         | [A] |
| 102 | FiberRouter         | 2023-11-28 | unknown | Allowance Reuse Drain             | 59 USDC                   | gap:approval-drain     | [A] |
| 103 | Metalend            | 2023-11-25 | unknown | Empty-Market Donation Exploit     | 0.11 WBTC / $4.1K         | cand:I                 | [I] |
| 104 | TheNFTV2            | 2023-11-25 | unknown | Stale Burn Approval               | 173 DAO                   | gap:stale-approval     | [A] |
| 105 | Kyber Elastic       | 2023-11-22 | unknown | Tick Rounding Exploit             | 11.9 frxETH+/$11.6K       | cand:D                 | [I] |
| 106 | WECOStaking         | 2023-11-16 | unknown | Reward-Debt Mismatch              | 888M WECO                 | gap:reward-drain       | [A] |
| 107 | 9419                | 2023-11-16 | unknown | Migration Arbitrage               | 26.4K USDT                | dc:9 sub-2             | [A] |
| 108 | SHIBA               | 2023-11-16 | unknown | Lock Bypass                       | 508M SHIBA+30.9K USDT     | dc:9 sub-1             | [A] |
| 109 | LinkdaoDex          | 2023-11-15 | unknown | USDT Pair Drain                   | 29.7K USDT                | gap:pair-accounting    | [A] |
| 110 | Eterna              | 2023-11-15 | unknown | Buyback Treasury Drain            | 0.3 BNB / $74             | gap:buyback-drain      | [A] |
| 111 | CoinToken           | 2023-11-15 | unknown | Burn Supply Collapse              | 0.53 WBNB / $130          | gap:burn-acct          | [A] |
| 112 | OKC                 | 2023-11-13 | unknown | Flash-LP Reward Drain             | 81.3K OKC                 | cand:O                 | [A] |
| 113 | Legacy Payer        | 2023-11-12 | unknown | Stale-Allowance Drain             | 366K BSC-USD / $366K      | gap:stale-approval     | [A] |
| 114 | Minimal-Proxy Pool  | 2023-11-12 | unknown | Reinitializer Drain               | 3.5 ETH+22K USDT          | dc:9 sub-1             | [I] |
| 115 | MahaLend            | 2023-11-10 | unknown | Liquidity Index Inflation         | 10K ARTH                  | cand:I                 | [A] |
| 116 | Raft                | 2023-11-10 | unknown | cbETH Share Inflation             | 2M sDAI+86K USDC          | cand:I                 | [I] |
| 117 | GROK                | 2023-11-10 | unknown | Tax-Swap Dump                     | 26.4 ETH / $55.9K         | cand:R (prop)          | [A] |
| 118 | StakeStone          | 2023-11-07 | unknown | StoneVault Over-Withdrawal        | 37.3 ETH / $70.4K         | dc:9 sub-4             | [A] |
| 119 | Public Curve        | 2023-11-07 | unknown | Treasury Drain                    | 610K USDC+585K USDT/$2.4M | dc:9 sub-1             | [A] |
| 120 | Keep Rising         | 2023-11-06 | unknown | Public Sell LP Drain              | 19K BSC-USD               | gap:pair-accounting    | [A] |
| 121 | The Standard        | 2023-11-06 | unknown | Self-Swap Bad Debt                | 291K EUROs                | gap:self-swap-bad-debt | [A] |
| 122 | TrustPad            | 2023-11-06 | unknown | receiveUpPool Inflation           | 111 TPAD                  | cand:I                 | [A] |
| 123 | Public (Treasury)   | 2023-11-02 | unknown | Treasury BRAND Helper             | 25 BNB / $5.7K            | dc:9 sub-1             | [A] |
| 124 | T3913               | 2023-11-02 | unknown | Pair-Skim Referral Drain          | 446B+278B / $31.4K        | gap:skim-bug           | [A] |
| 125 | Belt                | 2023-11-01 | unknown | beltBNB Share Inflation           | 0.55 WBNB+0.49 beltBNB    | cand:I                 | [I] |
| 126 | Onyx                | 2023-11-01 | unknown | oPEPE Donation Overvaluation      | 334 ETH+514K USDC / $2M   | cand:I                 | [I] |
| 127 | Unibot              | 2023-10-31 | unknown | Approval Drain                    | 1.5K UNIBOT               | gap:approval-drain     | [A] |
| 128 | LaEeb               | 2023-10-30 | unknown | Dead-Buyback Counter Reuse        | 3.5 BNB / $798            | gap:state-not-invalid  | [A] |
| 129 | Astrid              | 2023-10-28 | unknown | Counterfeit Token Drain           | 64.2 stETH+/$152K         | gap:counterfeit-token  | [A] |
| 130 | RewardVault         | 2023-10-22 | unknown | Proxy Reinit Theft                | 37M RACA+1.3K BUSD        | dc:9 sub-1             | [I] |
| 131 | kTAF                | 2023-10-19 | unknown | Dust-Collateral Reuse             | 8.2K DAI                  | gap:dust-collateral    | [A] |
| 132 | MicDao              | 2023-10-18 | unknown | Mixed-Price Sale Exploit          | 1.6M MIC+12.3K USDT       | cand:O                 | [A] |
| 133 | Wise Lending        | 2023-10-13 | unknown | WBTC Donation Drain               | 33.5 wstETH+/$213K        | cand:I                 | [I] |
| 134 | Platypus            | 2023-10-12 | unknown | PoolSAvax JIT LP Exploit          | 24K WAVAX+21K sAVAX       | cand:O                 | [A] |
| 135 | ZS                  | 2023-10-08 | unknown | Pair Burn Drain                   | 22.2K USDT+177K ZS        | gap:burn-acct          | [A] |
| 136 | pETH                | 2023-10-08 | unknown | Synthetic balanceOf Inflation     | 1.44 WETH                 | cand:I / cand:S (prop) | [I] |
| 137 | Stars Arena         | 2023-10-07 | unknown | Callback Weight Reentrancy        | 274K AVAX / $3.1M         | dc:1 / cand:M          | [I] |
| 138 | DePay               | 2023-10-05 | unknown | Router Double-Plugin Drain        | 878 USDC                  | gap:approval-drain     | [A] |
| 139 | FireBird            | 2023-09-30 | unknown | Reward Farming                    | 34K HOPE                  | gap:reward-drain       | [A] |
| 140 | BSC (Callback)      | 2023-09-29 | unknown | Callback Auth Drain               | 20 BNB / $4.3K            | cand:M                 | [A] |
| 141 | BankX/XSD           | 2023-09-26 | unknown | Router Burn Reentrancy            | 9.8 BNB                   | dc:1                   | [A] |
| 142 | CEXISWAP            | 2023-09-21 | unknown | Proxy Takeover                    | 30K USDT                  | dc:9 sub-1             | [A] |
| 143 | PointFarm           | 2023-09-16 | unknown | Reward Reentrancy                 | 10.6K POINTS              | dc:1                   | [A] |
| 144 | OxODex              | 2023-09-11 | unknown | Stale Withdrawal Drain            | 40 ETH / $61.6K           | dc:9 sub-4             | [A] |
| 145 | BFCToken            | 2023-09-09 | unknown | LP Burn Drain                     | 42.3K USDT                | gap:burn-acct          | [A] |
| 146 | APIG                | 2023-09-08 | unknown | Self-Transfer Mint Drain          | 72K USDT+59.5 ETH / $169K | gap:self-transfer-acct | [A] |
| 147 | CoinToken (BSC)     | 2023-09-07 | unknown | Burn Reserve Drain                | 30.5 BNB / $6.6K          | gap:burn-acct          | [A] |
| 148 | QWAStaking          | 2023-09-05 | unknown | Rebase Capture                    | 0.43 ETH / $696           | gap:rebase-acct        | [A] |
| 149 | Jump Farm           | 2023-09-05 | unknown | Epoch Harvest                     | 2.4 WETH / $3.9K          | gap:reward-drain       | [A] |
| 150 | HATE                | 2023-09-05 | unknown | Rebase-Before-Burn Exploit        | 7.8 WETH / $12.8K         | gap:rebase-acct        | [A] |

### Page 4 (2023-09-05 → 2023-06-17, 50 incidents)

| #   | Name                | Date       | Chain    | Attack type                          | Tokens / USD                | Buzz class             | R8  |
| --- | ------------------- | ---------- | -------- | ------------------------------------ | --------------------------- | ---------------------- | --- |
| 151 | Floor DAO           | 2023-09-05 | unknown  | Stale Epoch Harvesting               | 40 WETH+2.7K FLOOR / $65K   | gap:reward-drain       | [A] |
| 152 | DAppSocial          | 2023-09-02 | unknown  | Alt-Withdraw Drain                   | 10.3K USDT+6.6K USDC        | gap:withdraw-bypass    | [A] |
| 153 | EAC                 | 2023-08-29 | unknown  | Treasury Manipulation                | 14.3K USDT                  | dc:9 sub-1             | [A] |
| 154 | Balancer            | 2023-08-27 | unknown  | Stale-rate Oracle                    | 114K DAI+253K USDT / $368K  | cand:O                 | [I] |
| 155 | STV                 | 2023-08-26 | unknown  | Sell Accounting Error                | 517K USDT / $517K           | gap:pair-accounting    | [A] |
| 156 | GSS                 | 2023-08-23 | unknown  | Pair Skim Misclassification          | 26K USDT                    | gap:skim-bug           | [A] |
| 157 | BTC20               | 2023-08-19 | unknown  | Presale Price Manipulation           | 62.5K BTC20                 | cand:O                 | [A] |
| 158 | Exactly             | 2023-08-18 | unknown  | DebtManager Fake-Market              | 2.64M USDC / $2.6M          | gap:fake-market        | [I] |
| 159 | Zunami              | 2023-08-13 | unknown  | UZD Revaluation                      | 1.15K ETH+1.3K USDT / $2.1M | cand:I                 | [A] |
| 160 | EFVault             | 2023-08-09 | unknown  | Withdraw Under-Burn                  | 160 WETH / $298K            | dc:9 sub-4             | [I] |
| 161 | Uwerx               | 2023-08-02 | unknown  | Pool Drain                           | 175 ETH / $325K             | gap:pair-accounting    | [A] |
| 162 | Curve (burner)      | 2023-08-01 | unknown  | Burner Sandwich MEV                  | 36.8K USDT                  | cand:O substrate       | [A] |
| 163 | NEU                 | 2023-08-01 | unknown  | Convert LP Mispricing                | 23.9 aeWETH / $44.3K        | cand:I                 | [A] |
| 164 | LeetSwap            | 2023-08-01 | unknown  | Base Pair Drain                      | 119 WETH / $221K            | gap:pair-accounting    | [A] |
| 165 | GymRouter           | 2023-07-31 | unknown  | Arbitrary Approved Token Spend       | 152K GYMNET                 | gap:approval-drain     | [I] |
| 166 | **Curve (Vyper)**   | 2023-07-30 | unknown  | **Vyper Lock Reentrancy**            | 13,787 ETH / **$35.7M**     | dc:1 (CEI, read-only)  | [I] |
| 167 | Carson              | 2023-07-26 | unknown  | Pair Reserve Siphon                  | 101K USDT / $101K           | gap:pair-accounting    | [A] |
| 168 | Palm                | 2023-07-24 | unknown  | PLP AUM Inflation                    | 904K USDT / $904K           | cand:I                 | [A] |
| 169 | Minto               | 2023-07-23 | unknown  | Fake-Token Purchase                  | 14.7K BTCMT                 | gap:fake-token-route   | [A] |
| 170 | SUTTokenSale        | 2023-07-21 | unknown  | Public Arbitrage                     | 32.7 SUT                    | cand:O substrate       | [A] |
| 171 | Conic (crvUSD)      | 2023-07-21 | unknown  | crvUSD Oracle Exploit                | 22K crvUSD                  | cand:O                 | [A] |
| 172 | Conic (ETH)         | 2023-07-21 | unknown  | ETH Oracle Reentrancy                | 1,800 WETH / $3.4M          | dc:1 + cand:O          | [I] |
| 173 | Utopia              | 2023-07-20 | unknown  | Reserve Overwrite Drain              | 492 WBNB / $119K            | gap:pair-accounting    | [A] |
| 174 | GoldCoin            | 2023-07-20 | unknown  | Pair Reserve Overwrite               | 53.2K USDT                  | gap:pair-accounting    | [A] |
| 175 | APE2                | 2023-07-18 | unknown  | Pair Burn Exploit                    | 19.2K USDT                  | gap:burn-acct          | [A] |
| 176 | Ocean               | 2023-07-18 | unknown  | NFT Reward Drain                     | 781K BNO                    | gap:reward-drain       | [A] |
| 177 | StakedV3            | 2023-07-17 | unknown  | Forced Rebalance                     | 31.1K BUSD                  | gap:rebalancer         | [A] |
| 178 | USDTStaking         | 2023-07-15 | unknown  | Approval Drain                       | 21K USDT                    | gap:approval-drain     | [A] |
| 179 | EHIVE               | 2023-07-14 | unknown  | Reward Inflation                     | 27.3 WETH / $54.6K          | gap:reward-drain       | [A] |
| 180 | AiWGPT              | 2023-07-12 | unknown  | Public Sell LP Drain                 | 105K USDT+81K WGPT          | gap:pair-accounting    | [A] |
| 181 | Platypus            | 2023-07-11 | unknown  | LP Cross-Asset Mispricing            | 5.8K USDC                   | cand:O                 | [A] |
| 182 | Rodeo               | 2023-07-11 | unknown  | Oracle Shortfall                     | 200K USDC / $200K           | cand:O                 | [A] |
| 183 | LibertiVault        | 2023-07-11 | unknown  | Reentrant Share Inflation            | 129 WETH+55K USDT / $299K   | dc:1 + cand:I          | [I] |
| 184 | Rodeo (unshETH)     | 2023-07-11 | unknown  | unshETH Oracle Exploit               | 400K USDC                   | cand:O                 | [A] |
| 185 | Arcadia             | 2023-07-10 | unknown  | Self-Liquidation Bypass              | 148 WETH+59K USDC / $335K   | gap:self-liq-bypass    | [A] |
| 186 | CivTrade            | 2023-07-08 | unknown  | Fake-Pool Callback Drain             | 870K CIV+50K USDC           | cand:M / gap:fake-pool | [A] |
| 187 | 0x7CAE              | 2023-07-08 | unknown  | Approved-Spender Drain               | 20K BONE+37M WOOF           | gap:approval-drain     | [A] |
| 188 | LAYER3              | 2023-07-07 | unknown  | Oracle-Mint Drain                    | 9.7K USDT                   | cand:O                 | [A] |
| 189 | Bao                 | 2023-07-04 | unknown  | Donation Borrow Exploit              | 41.3 baoETH                 | cand:I                 | [A] |
| 190 | BambooAI            | 2023-07-04 | unknown  | Hidden LP Drain                      | 12 WBNB+1.35B BAMBOO        | cand:R (prop)          | [A] |
| 191 | Biswap              | 2023-06-30 | unknown  | Migrator Token Substitution          | 28 ETH+53.6K USDT / $107K   | dc:9 sub-2             | [A] |
| 192 | MultiSender         | 2023-06-30 | unknown  | Arbitrary From Theft                 | 100M MyAi+11 WBNB           | gap:approval-drain     | [A] |
| 193 | Themis              | 2023-06-27 | unknown  | Oracle Manipulation                  | 94 ETH+130K USDC / $368K    | cand:O                 | [A] |
| 194 | STRAC               | 2023-06-27 | unknown  | Callback Drain                       | 131 STRAC                   | cand:M                 | [A] |
| 195 | Blacklist-Zero      | 2023-06-27 | unknown  | Double Payout                        | 6K USDT                     | dc:9 sub-4             | [A] |
| 196 | Shido               | 2023-06-23 | unknown  | Migration Arbitrage                  | 10.4B SHIDOv2               | dc:9 sub-2             | [A] |
| 197 | BUNN                | 2023-06-21 | unknown  | Reflection Drain via PancakePair     | 52 WBNB / $13K              | cand:R (prop)          | [A] |
| 198 | Stranded            | 2023-06-20 | unknown  | Swapper Sweep                        | 18K USDT                    | gap:sweep-bug          | [A] |
| 199 | ARA                 | 2023-06-18 | unknown  | Swap Helper Approved-Holder          | 125K USDT                   | gap:approval-drain     | [A] |
| 200 | Helio               | 2023-06-17 | unknown  | Plugin Donation Inflation            | 686K ANKR+25K lisUSD        | cand:I                 | [I] |

### Page 5 (2023-06-17 → 2023-02-16, 50 incidents)

| #   | Name                | Date       | Chain    | Attack type                          | Tokens / USD                | Buzz class             | R8  |
| --- | ------------------- | ---------- | -------- | ------------------------------------ | --------------------------- | ---------------------- | --- |
| 201 | Pawnfi ApeStaking   | 2023-06-17 | unknown  | Debt Mismatch                        | 102 ETH+5.6K APE / $176K    | gap:debt-acct          | [A] |
| 202 | Vortex              | 2023-06-15 | unknown  | Token Approval Drain                 | 70K USDT+36K USDC / $106K   | gap:approval-drain     | [A] |
| 203 | CFC                 | 2023-06-15 | unknown  | Reserve Collapse                     | 3.5K SAFE+6.1K USDT         | gap:pair-accounting    | [A] |
| 204 | CoinToken (BSC)     | 2023-06-12 | unknown  | Cross-Pool MEV                       | 442 BNB / $104K             | cand:O substrate       | [A] |
| 205 | Sturdy              | 2023-06-12 | unknown  | Oracle Manipulation                  | 499.5 WETH / $874K          | cand:O / dc:1 (R/O)    | [I] |
| 206 | SellToken           | 2023-06-11 | unknown  | Oracle Manipulation                  | 12.3M SELLC                 | cand:O                 | [A] |
| 207 | UN                  | 2023-06-06 | unknown  | Burn-Skim Exploit                    | 26.6K USDT                  | gap:burn-acct          | [A] |
| 208 | VINU                | 2023-06-06 | unknown  | Reserve Drain                        | 3.3 WETH / $5.9K            | gap:pair-accounting    | [A] |
| 209 | SimpleSwap          | 2023-06-02 | Polygon  | Reserve Drain                        | 30.4K USDT+11.6K NST        | gap:pair-accounting    | [A] |
| 210 | Cellframe           | 2023-06-01 | unknown  | Migration Drain                      | 963K CELL                   | dc:9 sub-2             | [I] |
| 211 | ASResearch          | 2023-05-31 | unknown  | Rebalance Drain                      | 119K USDC                   | gap:rebalancer         | [A] |
| 212 | NOON                | 2023-05-29 | unknown  | Pool Drain                           | 1.14 WETH / $2.2K           | gap:pair-accounting    | [A] |
| 213 | Father Pepe Inu     | 2023-05-29 | unknown  | Unstake Drain                        | 9.4M FAPEN                  | gap:reward-drain       | [A] |
| 214 | FarmZAP             | 2023-05-28 | unknown  | Fee-free Arbitrary Farm Abuse        | 437 WBNB / $135K            | gap:reward-drain       | [A] |
| 215 | GPT                 | 2023-05-24 | unknown  | LP-Burn Exploit                      | 58.5K USDT                  | gap:burn-acct          | [A] |
| 216 | CS                  | 2023-05-23 | unknown  | Pair Balance Burn Drain              | 954K USDT / $954K           | gap:burn-acct          | [A] |
| 217 | Local Traders       | 2023-05-23 | unknown  | Price Takeover                       | 32.6M LCT                   | cand:O                 | [A] |
| 218 | LunaFi              | 2023-05-22 | unknown  | Reward Replay                        | 86.8M LFI                   | dc:9 sub-4 / dc:5      | [A] |
| 219 | QiQi                | 2023-05-13 | unknown  | Reward Quote Override Drain          | 1.6K QiQi                   | gap:reward-drain       | [A] |
| 220 | Bitpaid             | 2023-05-13 | unknown  | Mature-Lock Top-Up Exploit           | 11K BTP                     | dc:9 sub-4             | [A] |
| 221 | SellToken           | 2023-05-13 | unknown  | Oracle Manipulation                  | 35.3 BNB / $10.9K           | cand:O                 | [A] |
| 222 | GGGTOKEN            | 2023-05-12 | unknown  | Treasury Drain via receive()         | 172K USDT                   | dc:9 sub-1             | [A] |
| 223 | SellToken           | 2023-05-10 | unknown  | Arbitrary-Pair LP Drain              | 58M QiQi+303 WBNB / $96K    | gap:pair-accounting    | [A] |
| 224 | Public Mint         | 2023-05-06 | unknown  | USDT Pair Drain                      | 90.5K USDT                  | gap:pair-accounting    | [A] |
| 225 | DEI                 | 2023-05-05 | unknown  | Allowance Inversion                  | 5M USDC / $5M               | gap:approval-drain     | [I] |
| 226 | NeverFallToken      | 2023-05-02 | unknown  | LP Drain                             | 383K USDT+177M NF           | gap:pair-accounting    | [A] |
| 227 | SNKMiner            | 2023-04-29 | unknown  | Referral Reward Drain                | 198K USDT                   | gap:reward-drain       | [A] |
| 228 | 0VIX                | 2023-04-28 | unknown  | Oracle Inflation                     | 1.45M USDC+584K USDT / $2M  | cand:O / cand:I        | [I] |
| 229 | AXIOMA              | 2023-04-24 | unknown  | Presale Arbitrage                    | 9.75K AXT+20.8 WBNB         | cand:O                 | [A] |
| 230 | OceanLife           | 2023-04-19 | unknown  | Reflection Drain                     | 32.3 WBNB / $11.1K          | cand:R (prop)          | [A] |
| 231 | Hundred             | 2023-04-15 | unknown  | Donation Exploit                     | 20K SNX+1.23M USDC / $6.7M  | cand:I                 | [I] |
| 232 | MetaPoint           | 2023-04-11 | unknown  | Approval Drain                       | 9K POT                      | gap:approval-drain     | [A] |
| 233 | Paribus             | 2023-04-11 | unknown  | Reentrancy                           | 13 ETH+20K USDT / $68K      | dc:1                   | [I] |
| 234 | Sentiment           | 2023-04-04 | unknown  | Oracle Overborrow                    | 461K USDC+361K USDT / $1.1M | cand:O / dc:1 (R/O)    | [I] |
| 235 | Allbridge           | 2023-04-01 | unknown  | Pool Mispricing                      | 290K USDT+282K BUSD / $573K | cand:O                 | [A] |
| 236 | SafeMoon            | 2023-03-28 | unknown  | LP Burn Drain                        | 28.4K WBNB / $8.9M          | gap:burn-acct          | [I] |
| 237 | Thena               | 2023-03-27 | unknown  | Public Unstake Drain                 | 10.2K USDT                  | dc:9 sub-1             | [A] |
| 238 | DBW                 | 2023-03-22 | unknown  | Static-Income LP Drain               | 20.2K USDT                  | gap:reward-drain       | [A] |
| 239 | BIGFI               | 2023-03-22 | unknown  | Burn Bug Drain                       | 30.5K USDT                  | gap:burn-acct          | [A] |
| 240 | ParaSpace           | 2023-03-17 | unknown  | Donation Repricing                   | 7.2M USDC+1.2K WETH / $270K | cand:I                 | [I] |
| 241 | LockedDeal          | 2023-03-15 | unknown  | Overflow Drain                       | 62M MNZ+36M WOD             | cand:H                 | [I] |
| 242 | **Euler**           | 2023-03-13 | unknown  | DAI Reserve Donation                 | 8.88M DAI / **$197M**       | cand:I + gap:donateAndLiq | [I] |
| 243 | DKP Exchange        | 2023-03-08 | unknown  | Flash-Price Exploit                  | 78.6K USDT                  | cand:O                 | [A] |
| 244 | SwapX               | 2023-02-27 | unknown  | Stale-Allowance Drain                | 9.9M LZ                     | gap:stale-approval     | [A] |
| 245 | SwapX               | 2023-02-27 | BSC      | Arbitrary transferFrom Drain         | 230K BUSD / $230K           | gap:approval-drain     | [I] |
| 246 | ENF                 | 2023-02-24 | unknown  | Redeem Decimal Mis-scaling           | 5.2M USDC / $5.2M           | gap:decimal-mismatch   | [I] |
| 247 | V3Utils             | 2023-02-18 | unknown  | Arbitrary Call Drain                 | 19.8K USDC+4.1K USDT / $24K | gap:arbitrary-call     | [I] |
| 248 | Dexible             | 2023-02-17 | unknown  | Allowance Drain                      | 18M TRU                     | gap:approval-drain     | [A] |
| 249 | StarlinkCoin        | 2023-02-16 | unknown  | Pair Drain                           | 38.4 WBNB / $11.8K          | gap:pair-accounting    | [A] |
| 250 | Platypus            | 2023-02-16 | unknown  | Stale Collateral Withdrawal          | 33M USP+2.4M USDC / $7.8M   | dc:9 sub-4             | [I] |

### Page 6 (2023-02-15 → 2022-10-20, 50 incidents)

| #   | Name                | Date       | Chain      | Attack type                       | Tokens / USD                | Buzz class             | R8  |
| --- | ------------------- | ---------- | ---------- | --------------------------------- | --------------------------- | ---------------------- | --- |
| 251 | StakingDYNA         | 2023-02-15 | unknown    | Reward Backdating Drain           | 225M DYNA                   | gap:reward-drain       | [A] |
| 252 | Sheep               | 2023-02-10 | BSC        | Reserve Drain                     | 9.5 WBNB / $2.9K            | gap:pair-accounting    | [A] |
| 253 | dForce              | 2023-02-09 | unknown    | Oracle Reentrancy Liquidation     | 1K ETH+719K USX / $1.6M     | dc:1 + cand:O          | [I] |
| 254 | SwapGuard           | 2023-02-07 | unknown    | Arbitrary transferFrom Drain      | 115K DAI                    | gap:approval-drain     | [I] |
| 255 | FIREDRAKE           | 2023-02-06 | BSC        | Reflection Drain                  | 16.2 WBNB / $5.3K           | cand:R (prop)          | [A] |
| 256 | Orion Pool          | 2023-02-02 | Multi      | Double-Count Exploit              | 192K USDT (BSC)+2.8M (ETH)  | cand:O                 | [A] |
| 257 | BonqDAO             | 2023-02-01 | unknown    | Oracle Manipulation (TellorFlex)  | 100M BEUR+114M ALBT         | cand:O                 | [I] |
| 258 | BEVO                | 2023-01-30 | BSC        | Reflection Accounting Drain       | 337 WBNB / $103.6K          | cand:R (prop)          | [I] |
| 259 | TomInu              | 2023-01-26 | unknown    | Flash Loan + Reflection Inflate   | 22.1 WETH / $35.7K          | cand:R (prop) + cand:O | [A] |
| 260 | UpSwing             | 2023-01-18 | unknown    | Transfer-plus-skim Loop           | 74K UPS+0.37 WETH / $585    | gap:skim-bug           | [A] |
| 261 | QUATERNION          | 2023-01-18 | unknown    | Pair-Rebase Accounting Drift      | 2.55 WETH / $4K             | gap:rebase-acct        | [A] |
| 262 | BSC ORT Staking     | 2023-01-17 | BSC        | 1-to-6000 Reward Mint             | 6K ORT                      | dc:9 sub-1             | [A] |
| 263 | Midas               | 2023-01-15 | Polygon    | Read-Only Reentrancy (Curve LP)   | 274K jCHF+368K jEUR         | dc:1 (R/O) + cand:O    | [I] |
| 264 | xDAO/Unicorn        | 2023-01-11 | unknown    | Public LP Offer Drain             | 90K USDC                    | dc:9 sub-1             | [A] |
| 265 | Aave AMM            | 2023-01-11 | unknown    | LP Looping Oracle                 | 2.3 WBTC+40K USDC / $80K    | cand:O                 | [A] |
| 266 | BRAToken            | 2023-01-10 | unknown    | Self-Transfer Tax Bug Drain       | 41.1K USDT                  | gap:self-transfer-acct | [A] |
| 267 | GDS                 | 2023-01-02 | unknown    | Transferable LP Share Reuse       | 14.4M GDS                   | dc:9 sub-4             | [A] |
| 268 | DFS                 | 2022-12-30 | unknown    | Pair Accounting Drain             | 1.5K USDT                   | gap:pair-accounting    | [A] |
| 269 | JayPeggers          | 2022-12-29 | unknown    | Reentrancy Drain                  | 21.1 ETH / $25.3K           | dc:1                   | [I] |
| 270 | RubicProxy          | 2022-12-25 | unknown    | USDC Drain                        | 1.48M USDC / $1.5M          | gap:approval-drain     | [A] |
| 271 | SuperTokenV2        | 2022-12-23 | Avalanche  | Share Inflation                   | 174K USDC.e / $174K         | cand:I                 | [I] |
| 272 | FPR                 | 2022-12-14 | unknown    | Custody Admin Compromise          | 29.9K USDT                  | dc:9 sub-1             | [I] |
| 273 | ElasticSwap         | 2022-12-13 | unknown    | Rebase Exploit                    | 500K USDC+162K AMPL / $500K | gap:rebase-acct        | [A] |
| 274 | BlackGold           | 2022-12-12 | unknown    | Reserve Collapse                  | 18.5K USDT                  | gap:pair-accounting    | [A] |
| 275 | Helper              | 2022-12-11 | unknown    | Callback Drain                    | 1.3K USDT                   | cand:M                 | [A] |
| 276 | Lodestar            | 2022-12-10 | Arbitrum   | Share Inflation                   | 3.8M plvGLP+27 WETH / $35K  | cand:I                 | [I] |
| 277 | TiFi                | 2022-12-10 | unknown    | Oracle Manipulation               | 530B TIFI                   | cand:O                 | [A] |
| 278 | MuBank              | 2022-12-10 | Avalanche  | Bond Mechanism                    | 57.7K USDC.e+/$57.7K        | gap:bond-acct          | [A] |
| 279 | AEST                | 2022-12-07 | unknown    | Accounting Drain                  | 61.6K USDT                  | gap:pair-accounting    | [A] |
| 280 | RFB                 | 2022-12-05 | BSC        | Reward Brute Force                | 17.7 BNB / $5.1K            | gap:reward-drain       | [A] |
| 281 | Nimbus              | 2022-12-05 | unknown    | Oracle Price Manipulation         | 16.5M GNIMB                 | cand:O                 | [A] |
| 282 | APC                 | 2022-12-01 | unknown    | Proxy Spot-Price Exploit          | 46.6K USDT                  | cand:O                 | [A] |
| 283 | Public Liquidity    | 2022-11-29 | unknown    | Liquidity Trigger Drain           | 5.9K USDT                   | dc:9 sub-1             | [A] |
| 284 | SEAMAN              | 2022-11-29 | unknown    | Public Sell Trigger               | 8.6K USDT                   | dc:9 sub-1             | [A] |
| 285 | Anyswap             | 2022-11-23 | unknown    | Fake Wrapper Drain                | 558K NUM                    | dc:10 sub-1 / gap      | [A] |
| 286 | AURUM               | 2022-11-22 | BSC        | NodePool Parameter Abuse          | 49.9 WBNB / $13.2K          | dc:9 sub-1             | [A] |
| 287 | sDAO                | 2022-11-21 | unknown    | Reward Inflation                  | 13.7K USDT                  | gap:reward-drain       | [A] |
| 288 | Annex               | 2022-11-18 | BSC        | Liquidator WBNB Drain             | 7.2 WBNB / $2K              | gap:liquidator-bug     | [A] |
| 289 | UEarnPool           | 2022-11-17 | unknown    | Reward Drain                      | 22.3K USDT                  | gap:reward-drain       | [A] |
| 290 | BBOX                | 2022-11-16 | BSC        | Pair Burn Price Manipulation      | 38.2 WBNB / $10.5K          | cand:O                 | [A] |
| 291 | SheepFarm           | 2022-11-15 | unknown    | Bonus Replay Drain                | 0.78 BNB / $214             | dc:9 sub-4             | [A] |
| 292 | DFX                 | 2022-11-10 | unknown    | Flash Loan + LP Mint              | 100K USDC+2.3B XIDR         | cand:O + cand:I        | [I] |
| 293 | Abracadabra         | 2022-11-08 | unknown    | Stale Oracle Rate                 | 111K MIM                    | cand:O                 | [A] |
| 294 | Beefy               | 2022-11-06 | BSC        | Vault Share Inflation             | 29.9K CAKE / $148K          | cand:I                 | [I] |
| 295 | Public Dust         | 2022-10-30 | unknown    | Conversion Over-Burn              | 229 IEarn                   | gap:burn-acct          | [A] |
| 296 | SushiBar            | 2022-10-25 | unknown    | ERC777 Reentrancy                 | 8K n00dToken                | dc:1 (CEI / ERC777)    | [I] |
| 297 | ULME                | 2022-10-25 | unknown    | Approval Vulnerability            | 251K USDT                   | gap:approval-drain     | [A] |
| 298 | VTF                 | 2022-10-25 | unknown    | Virtual Balance Accounting        | 59.1K USDT                  | gap:virtual-balance    | [A] |
| 299 | Olympus             | 2022-10-21 | unknown    | Teller Redemption Drain           | 30.4K OHM                   | dc:9 sub-1             | [A] |
| 300 | HEALTH              | 2022-10-20 | BSC        | Zero-Transfer Price Manipulation  | 16.7 WBNB / $4.5K           | gap:zero-transfer      | [A] |

### Page 7 (2022-10-19 → 2022-03-20, 50 incidents)

| #   | Name                | Date       | Chain    | Attack type                       | Tokens / USD                | Buzz class             | R8  |
| --- | ------------------- | ---------- | -------- | --------------------------------- | --------------------------- | ---------------------- | --- |
| 301 | BGEO                | 2022-10-19 | unknown  | Mint Drain                        | 12 WBNB / $3.3K             | dc:9 sub-1             | [A] |
| 302 | UERII               | 2022-10-17 | unknown  | Public Mint Drain                 | 2.4K USDC                   | dc:9 sub-1             | [A] |
| 303 | PLTD                | 2022-10-17 | unknown  | Reserve-Burn Exploit              | 24.5K USDT                  | gap:burn-acct          | [A] |
| 304 | EFLeverVault        | 2022-10-14 | unknown  | Whole-Balance Withdrawal          | 480 WETH+18.7 ETH / $661K   | dc:9 sub-1             | [I] |
| 305 | Stax                | 2022-10-11 | unknown  | Migration Drain                   | 321K xFraxTempleLP          | dc:9 sub-2             | [A] |
| 306 | ATK                 | 2022-10-11 | unknown  | Reward Flashswap Overclaim        | 128K USDT                   | gap:reward-drain       | [A] |
| 307 | Carrot              | 2022-10-10 | unknown  | Public Hook Backdoor              | 31.3K USDT                  | cand:M                 | [A] |
| 308 | Xave                | 2022-10-08 | unknown  | DaoModule Takeover                | 100T HALO                   | dc:9 / cand:P          | [I] |
| 309 | Transit Swap        | 2022-10-01 | unknown  | Proxy Drain                       | 6.1M USDT+743K USDC / $6.9M | gap:approval-drain     | [I] |
| 310 | BabySwap            | 2022-10-01 | unknown  | Reward Theft                      | 65.1K USDT                  | gap:reward-drain       | [A] |
| 311 | RLToken             | 2022-09-30 | unknown  | Incentive Drain                   | 758K RL+9K USDT             | gap:reward-drain       | [A] |
| 312 | dYdX                | 2022-09-27 | unknown  | Callback Approval Drain           | 1.1K WETH / $1.5M           | cand:M                 | [I] |
| 313 | BXH                 | 2022-09-26 | unknown  | Bonus Oracle Manipulation         | 39.9K USDT                  | cand:O                 | [A] |
| 314 | TWN                 | 2022-09-23 | unknown  | Wrapper Backdoor Drain            | 94.3K USDT                  | dc:9 sub-1             | [A] |
| 315 | Pancake             | 2022-09-13 | unknown  | Unauth Callback Drain             | 25.9K USDT+328 WBNB / $147K | cand:M                 | [I] |
| 316 | YYDS                | 2022-09-08 | unknown  | Referral Overpayment              | 742K USDT / $742K           | gap:reward-drain       | [A] |
| 317 | ROIToken            | 2022-09-08 | unknown  | Ownership Takeover Drain          | 44K BUSD+158 BNB / $88K     | dc:9 sub-1             | [A] |
| 318 | NFD                 | 2022-09-08 | unknown  | Reward Sybil Exploit              | 4.5K WBNB / $1.3M           | gap:reward-drain       | [A] |
| 319 | Nereus              | 2022-09-06 | unknown  | Oracle Overborrow                 | 1M NXUSD / $978K            | cand:O                 | [A] |
| 320 | ZOOM                | 2022-09-05 | unknown  | Reserve Injection Drain           | 70.2K USDT                  | gap:pair-accounting    | [A] |
| 321 | ShadowFi            | 2022-09-02 | unknown  | Public Burn Drain                 | 1.1K WBNB / $298K           | gap:burn-acct          | [I] |
| 322 | Luckytiger          | 2022-08-24 | unknown  | Lucky Mint Drain                  | 0.5 ETH / $828             | dc:9 sub-1             | [A] |
| 323 | XStable             | 2022-08-09 | unknown  | Skim Inflation Drain              | 27.1 WETH / $45.9K          | gap:skim-bug           | [A] |
| 324 | EGD Finance         | 2022-08-07 | unknown  | Reward Oracle Manipulation        | 5.6M EGD+36K USDT / $36K    | cand:O                 | [A] |
| 325 | ETN                 | 2022-08-04 | unknown  | UMarket Drain                     | 11.3K USDT                  | gap:pair-accounting    | [A] |
| 326 | QIXI                | 2022-08-03 | unknown  | Pair Drain via Transfer Underflow | 6.9 WBNB / $2K              | gap:transfer-underflow | [A] |
| 327 | LPC                 | 2022-07-25 | unknown  | Self-Transfer Mint Exploit        | 45.3K USDT+0.8 WBNB         | gap:self-transfer-acct | [A] |
| 328 | Audius              | 2022-07-23 | unknown  | Governance Reinit Drain           | 18.6M AUDIO                 | dc:9 sub-1             | [I] |
| 329 | SpaceGodzilla       | 2022-07-13 | unknown  | Reserve+Fee Bypass                | 30.4K USDT                  | gap:fee-bypass         | [A] |
| 330 | NFTX                | 2022-07-10 | unknown  | Doodles Collateral Acct Flaw      | 145 ETH / $172K             | gap:collateral-acct    | [A] |
| 331 | FlippazOne          | 2022-07-05 | unknown  | Ungated ownerWithdrawAllTo        | 1.15 ETH / $1.3K            | dc:9 sub-1             | [I] |
| 332 | BendDAO             | 2022-06-26 | unknown  | Stale Withdrawn Orders            | 1.2K ETH / $1.5M            | dc:9 sub-4             | [A] |
| 333 | SchnoodleV9         | 2022-06-18 | unknown  | Reflection Allowance Bug          | 0.1 WETH / $107             | cand:R (prop)          | [A] |
| 334 | Inverse             | 2022-06-16 | unknown  | Oracle Drain                      | 10.1M DOLA                  | cand:O                 | [A] |
| 335 | ETHpledge           | 2022-06-06 | unknown  | Spot-Price Reward Drain           | 415K Discover               | cand:O                 | [A] |
| 336 | Wintermute          | 2022-06-05 | unknown  | Safe Address Takeover             | 2M OP                       | dc:9 / cand:P          | [I] |
| 337 | NOVO                | 2022-05-29 | unknown  | Pair Drain Unchecked transferFrom | 309 WBNB / $95K             | gap:approval-drain     | [A] |
| 338 | Fortress            | 2022-05-08 | unknown  | Oracle Governance Drain           | 25K USDC+820K USDT+/$2.6M   | dc:9 + cand:O          | [I] |
| 339 | Fuse Pool 127       | 2022-04-30 | unknown  | Borrow Reentrancy                 | 1,978 ETH+7.1M USDC / $13.6M| dc:1                   | [I] |
| 340 | WDOGE               | 2022-04-25 | unknown  | Reflection Pair Drain             | 78.7 WBNB / $30.2K          | cand:R (prop)          | [A] |
| 341 | YEED                | 2022-04-21 | unknown  | Pair Overcredit Drain             | 1M USDT / $1M               | gap:pair-accounting    | [A] |
| 342 | Beanstalk           | 2022-04-16 | unknown  | Gov Flash-Loan Takeover           | 36M BEAN+/large             | dc:9 + cand:O substrate| [I] |
| 343 | Rifi                | 2022-04-15 | unknown  | Oracle Spoof Drain                | 346K USDC+3 BTCB / $1.1M    | cand:O                 | [A] |
| 344 | Elephant Money      | 2022-04-12 | unknown  | Oracle Abuse                      | 27.6K WBNB+ELEPHANT / $11.4M| cand:O                 | [I] |
| 345 | CFToken             | 2022-04-11 | unknown  | Pair Drain                        | 986K CF                     | gap:pair-accounting    | [A] |
| 346 | Gym                 | 2022-04-09 | unknown  | Liquidity Migration Subsidy       | 1.3K WBNB / $561.6K         | dc:9 sub-2             | [A] |
| 347 | Revest              | 2022-03-27 | unknown  | TokenVault Acct Flaw              | 360K RENA                   | gap:vault-acct         | [A] |
| 348 | ACOWriter           | 2022-03-26 | unknown  | USDC Allowance Misuse             | 725K USDC / $725K           | gap:approval-drain     | [A] |
| 349 | Umbrella            | 2022-03-20 | unknown  | StakingRewards Underflow Drain    | 156 Cake-LP+8.8K UNI-V2     | gap:underflow          | [I] |
| 350 | LiFi                | 2022-03-20 | unknown  | Router Allowance-Drain            | 202K USDC+/$202K            | gap:approval-drain     | [I] |

### Page 8 (2022-03-17 → 2020-02-15, 50 incidents)

| #   | Name                       | Date       | Chain    | Attack type                       | Tokens / USD                | Buzz class                | R8  |
| --- | -------------------------- | ---------- | -------- | --------------------------------- | --------------------------- | ------------------------- | --- |
| 351 | AirdropGrapes (NFTX-BAYC)  | 2022-03-17 | unknown  | ApeCoin Claim via NFTX BAYC Vault | 60.6K APE                   | gap:airdrop-claim         | [A] |
| 352 | Hundred (Gnosis)           | 2022-03-15 | Gnosis   | Reentrancy                        | 1.7M XDAI                   | dc:1                      | [I] |
| 353 | Agave                      | 2022-03-15 | unknown  | ERC677 Reentrancy                 | 243K USDC+24.6K LINK / $1.2M| dc:1                      | [I] |
| 354 | Paraluni                   | 2022-03-13 | unknown  | Reentrancy Credit Duplication     | 155K USDT+156K BUSD / $311K | dc:1                      | [I] |
| 355 | bHOME                      | 2022-03-05 | unknown  | ERC777 Reentrancy Drain           | 977K USDC / $977K           | dc:1                      | [I] |
| 356 | Treasure Marketplace       | 2022-03-03 | unknown  | Zero-Quantity Purchase            | 1 Smol Brain                | gap:zero-amount-trade     | [A] |
| 357 | BUILD                      | 2022-02-11 | unknown  | Gov Takeover + Unlim Mint         | 4.6 ETH / $14K              | dc:9 + cand:P             | [I] |
| 358 | Sandbox LAND               | 2022-02-08 | unknown  | Public Burn                       | 3 LAND                      | gap:burn-acct (auth)      | [I] |
| 359 | Sandbox LAND #2            | 2022-02-08 | unknown  | Arbitrary Burn                    | 1 LAND                      | gap:burn-acct (auth)      | [I] |
| 360 | TecraCoin                  | 2022-02-04 | unknown  | burnFrom Allowance Bug            | 580K TCR+639K USDT / $639K  | gap:burnfrom-allowance    | [I] |
| 361 | Qubit xETH                 | 2022-01-27 | unknown  | Unbacked Collateral               | 0.05 BNB / $18              | dc:9 sub-1                | [I] |
| 362 | Qubit QBridge              | 2022-01-27 | unknown  | Unbacked Mint                     | 217K qXETH                  | dc:10 sub-2 + dc:9 sub-1  | [I] |
| 363 | AnyswapV4Router            | 2022-01-19 | Ethereum | WETH9 Permit Misuse               | 312 ETH / $966K             | gap:permit-misuse         | [I] |
| 364 | RewardsHypervisor          | 2021-12-21 | unknown  | Unbacked Mint                     | 8.8M VISR                   | dc:9 sub-1                | [I] |
| 365 | MonoX                      | 2021-11-30 | unknown  | Cross-Pool Drain                  | 4.1K MIM+/$17.6M            | cand:O                    | [I] |
| 366 | pfiProtocol                | 2021-11-23 | unknown  | Spot Oracle Drain                 | 90K BUSD+89K USDT / $345.5K | cand:O                    | [A] |
| 367 | Stale MetaSwap BSC         | 2021-11-14 | BSC      | Stale Pricing                     | 43.2K BUSD                  | cand:O                    | [A] |
| 368 | **Cream yvCurve**          | 2021-10-27 | unknown  | Oracle Manipulation               | 32.7 WBTC+3.8M FEI / **$4.4M** | cand:O                 | [I] |
| 369 | Indexed Finance DEFI5      | 2021-10-14 | unknown  | Flash Loan + Gulp/Reindex Bug     | 14 ETH / $53.6K             | cand:O substrate + gap    | [I] |
| 370 | Nowswap V1                 | 2021-09-15 | unknown  | Mis-Scaled KLOSS Invariant        | 158 WETH+536K USDT / $1.1M  | gap:invariant-mis-scaled  | [I] |
| 371 | Nimbus                     | 2021-09-14 | unknown  | Referral-Fee Reserve Desync       | 0.27 NBU_WETH+7K NBU        | gap:reserve-desync        | [A] |
| 372 | DeRace                     | 2021-09-03 | unknown  | Vesting Proxy Ownership Takeover  | 5.76M DERC                  | dc:9 sub-1                | [I] |
| 373 | Cream Finance              | 2021-08-30 | unknown  | cAmp/Amp Reentrancy               | 9.74M AMP                   | dc:1                      | [I] |
| 374 | SurgeToken                 | 2021-08-16 | BSC      | Price-Ratchet                     | 328 BNB / $138K             | cand:O                    | [A] |
| 375 | WUSD Master                | 2021-08-04 | unknown  | Spot-Price Mint                   | 15M USDT+107M WEX / $15M    | cand:O                    | [I] |
| 376 | SorbettoFragola            | 2021-08-03 | unknown  | Aave/Uniswap Route Arbitrage      | 5.4M USDC / $5.4M           | cand:O substrate          | [A] |
| 377 | xWin                       | 2021-06-25 | unknown  | Self-Referral Reward Drain        | 304K XWIN                   | gap:reward-drain          | [A] |
| 378 | Eleven                     | 2021-06-22 | unknown  | emergencyBurn Double-Withdraw     | 648K BUSD+30.8 BTCB / $1.6M | dc:9 sub-4                | [I] |
| 379 | HunnyMinter                | 2021-06-03 | unknown  | Reward Donation Bug               | 20.9K HUNNY                 | gap:reward-drain          | [A] |
| 380 | JulProtocolV2              | 2021-05-27 | unknown  | Spot-Price Manipulation           | 523 WBNB / $194K            | cand:O                    | [A] |
| 381 | BurgerSwap                 | 2021-05-27 | unknown  | Callback-Token Reentrancy         | 111K DGAS                   | dc:1                      | [I] |
| 382 | **PancakeBunny**           | 2021-05-19 | BSC      | Reward Mint Manipulation          | 114.6K WBNB+697K BUNNY / **$43.5M** | cand:O + cand:I    | [I] |
| 383 | Alpaca                     | 2021-05-16 | unknown  | BUSD Strategy Drain               | 453K BUSD / $453K           | gap:strategy-drain        | [A] |
| 384 | Rari Alpha                 | 2021-05-08 | unknown  | Donation Inflation                | 4.2 ETH / $15K              | cand:I                    | [I] |
| 385 | VSafe                      | 2021-05-07 | unknown  | Share Overmint via Alpaca PPS     | 148 WBNB / $92.5K           | cand:I                    | [A] |
| 386 | **Spartan**                | 2021-05-01 | unknown  | Pool Mint Inflation               | 3.2M SPARTA+29K WBNB / **$18.2M** | cand:I              | [I] |
| 387 | **Uranium**                | 2021-04-28 | unknown  | Pair Drain                        | 127K RADS+16.2M BUSD / **$40.9M** | gap:pair-accounting | [I] |
| 388 | DODO                       | 2021-03-08 | unknown  | Pool Reinit Drain                 | 133K wCRES+1.1M USDT / $1.1M| dc:9 sub-1                | [I] |
| 389 | Yearn DAI Vault            | 2021-02-04 | unknown  | Vault Pricing Exploit             | 350K 3CRV+11K USDT / $16K   | cand:I                    | [I] |
| 390 | SushiMaker                 | 2021-01-25 | unknown  | DIGG Convert Arbitrage            | 81.7 WETH / $112K           | cand:O substrate          | [A] |
| 391 | **Pickle**                 | 2020-11-21 | unknown  | Delegatecall Jar Exploit          | 19.8M DAI / **$19.8M**      | gap:delegatecall-misuse   | [I] |
| 392 | **Harvest**                | 2020-10-26 | unknown  | USDC Share Inflation              | 962K USDC / **$962K**       | cand:I                    | [I] |
| 393 | **Fulcrum**                | 2020-09-13 | unknown  | iETH Inflation                    | 9.3K ETH / **$3.6M**        | cand:I                    | [I] |
| 394 | Opyn                       | 2020-08-04 | unknown  | Exercise Reuse (Sig Replay)       | 9.9K USDC                   | dc:5 / dc:10 sub-2        | [I] |
| 395 | Balancer                   | 2020-06-28 | unknown  | STA Drain (deflationary)          | 566 WETH+11 WBTC / $208K    | cand:R (prop)             | [I] |
| 396 | Bancor                     | 2020-06-21 | unknown  | Allowance Drain                   | 906K XBP                    | gap:approval-drain        | [A] |
| 397 | dForce IMBTC               | 2020-04-19 | unknown  | Reentrancy                        | 0 IMBTC                     | dc:1                      | [I] |
| 398 | Uniswap V1                 | 2020-04-18 | Ethereum | ERC777 Reentrancy                 | 1.5 ETH / $252              | dc:1                      | [I] |
| 399 | bZx/Fulcrum iETH           | 2020-02-18 | Ethereum | Oracle Manipulation               | 6.8K WETH / $1.8M           | cand:O                    | [I] |
| 400 | bZx/Fulcrum WBTC           | 2020-02-15 | Ethereum | Oracle Manipulation               | 1.2K ETH / $345K            | cand:O                    | [I] |

---

## Section 1 — Coverage Gaps + New Candidate Proposals

### Gap-class frequency map (Clara incidents NOT mapping to any DC or existing CANDIDATE)

Counted from Section 0 `gap:` tags. Pattern-recurrence threshold = 3+ incidents → proposal-eligible.

| Gap class                       | Count | Anchor examples                                                      | Detector primitive                                                                                  |
| ------------------------------- | ----- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **gap:approval-drain**          | **~37** | Hedgey $1.3M, RubicProxy $1.5M, LiFi $202K, SocketGateway $2.6M, Transit Swap $6.9M, Dexible 18M TRU, Bancor, ACOWriter $725K, NOVO $95K, SwapX $230K, Unizen Router | router/aggregator with `transferFrom(arbitraryUser, arbitraryRecipient, ...)` not gated by caller-identity binding |
| **gap:pair-accounting**         | **~22** | LeetSwap $221K, GoldCoin, Utopia $119K, Onyx implied, Uranium $40.9M, YEED $1M, TGBS $149K  | AMM pair function that reads `getReserves()` / `balanceOf(pair)` without matching `sync()` invariant; or reserve-update before/after transfer asymmetry |
| **gap:reward-drain**            | **~20** | NFD $1.3M, YYDS $742K, BCT, BambooAI implied, BigBangSwap, Floor DAO, FarmZAP $135K | reward-claim function that reads stale per-user accumulator without invalidating; or single-call mints reward against pool-shared accumulator |
| **gap:burn-acct**               | **~13** | SafeMoon $8.9M, BurnsDeFi $87.7K, ShadowFi $298K, CS $954K, Sandbox LAND, BIGFI | custom `_burn()` / `burnFrom()` that mutates LP pair balance OR allows arbitrary burn against `msg.sender`'s holdings without allowance |
| **gap:self-transfer-acct**      | **8**  | SSS $4.6M, DeezNutz $170K, MINER $77.7K, BRAToken $41K, LPC $46K, APIG $169K | token's `_transfer()` when `from == to` mutates accounting (double-counts, mints from-self, etc.) |
| **gap:erc2771-misuse**          | **3**  | thirdweb $831, TIME $199K, DominoTT $267                              | ERC2771 trusted-forwarder `_msgSender()` returns attacker-controlled bytes; `burnFrom(_msgSender())` lets attacker burn anyone's tokens |
| **gap:decimal-mismatch**        | **3**  | Blueberry $1.3M, ENF $5.2M, plus implied across pricing | input `amount` denominated in token-A precision compared / multiplied against token-B precision constant |
| **gap:rebase-acct**             | **5**  | CauldronV4 $4.7M, ElasticSwap $500K, QUATERNION, QWAStaking, HATE | rebase-token's `_balances()` is `_shares() * index() / SCALE`; downstream consumer reads `_balances()` once and caches across an index update |
| **gap:skim-bug**                | **4**  | XStable $46K, UpSwing, T3913, GSS                                     | `pair.skim()` callable by anyone routes "excess balance" to attacker-supplied address |
| **gap:permit-misuse**           | **3**  | AnyswapV4Router $966K (canonical), plus implied across approval-drains | router accepts `(token, owner, amount, deadline, v, r, s)` from caller without binding `owner` to `msg.sender` or to a contract-controlled witness |
| **gap:delegatecall-misuse**     | **1+** | Pickle $19.8M (canonical anchor)                                      | strategy proxy's `delegatecall(arbitraryTarget)` with attacker-supplied calldata |
| **gap:rebalancer**              | **3**  | StakedV3, ASResearch, CCV Treasury                                    | rebalance function recomputes pool-state without atomicity gate; attacker triggers between deposit and reward-snapshot |
| **gap:zero-amount-edge**        | **3**  | Zero-Amount ERC1155, HEALTH zero-transfer, Treasure zero-quantity     | function logic special-cases `amount == 0` differently from `amount > 0`; attacker exploits asymmetry |

### NEW CANDIDATE PROPOSALS (3+ anchors each, gap class promoted)

#### CANDIDATE-T (proposed): **Approval-Drain via Unbound `from` Argument** — ~37 anchors

**Class statement:**

> A router / aggregator / proxy contract exposes a function (`swap`, `bridge`, `convert`, `route`, `sweep`, `execute`) that takes a `(from, to, token, amount)` quad as parameters and executes `IERC20(token).transferFrom(from, to, amount)` OR `IERC20(token).transferFrom(from, address(this), amount)` followed by an internal use. The `from` argument is NOT bound to `msg.sender` — the only protection is the `from`-address's pre-existing ERC20 allowance to the router. Attackers scan victim wallets that have UNLIMITED allowances to legacy routers, then invoke the unbound `from` function to siphon any token the victim has allowed.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, applied to ERC20 allowance economy. The router's "validation property" is "caller has supplied a `from` address" — the consumer property assumed by users is "router only routes my OWN tokens." The two diverge because allowances are designed to be approval-to-router, NOT approval-to-router-when-from-equals-me.

**Anchor incidents (Clara):**
- LiFi 2022-03-20 $202K (canonical anchor — multi-route aggregator class)
- SocketGateway 2024-01-16 $2.6M ("Route 406 USDC drain" — same canonical class)
- RubicProxy 2022-12-25 $1.5M
- Transit Swap 2022-10-01 $6.9M ("Proxy drain" — large-loss anchor)
- Hedgey 2024-04-19 $1.3M ("Allowance vulnerability")
- Dexible 2023-02-17 18M TRU
- ACOWriter 2022-03-26 $725K ("USDC allowances drained via misuse")
- AnyswapV4Router 2022-01-19 $966K (permit-misuse sub-anchor — see below)
- Bancor 2020-06-21 (canonical historical anchor — `claimAndConvert2` exploit)
- 27+ additional anchors across the table (`gap:approval-drain` tag count)

**Detector primitive:**
```
pattern: function $F(address $FROM, ..., address $TOKEN, ..., uint $AMT) external {
  ...
  IERC20($TOKEN).transferFrom($FROM, ...)
  ...
}
where:
  $FROM is NOT subsequently constrained by `require($FROM == msg.sender)` OR `require(allowedCallers[$FROM][msg.sender])`
  AND function visibility is external/public
```

FP gate: many legitimate forwarders / gasless-relayers / meta-tx routers ARE intended to take `from` argument (EIP-2771, EIP-1271, EIP-712 permit composed). Add positive-confirmation: function MUST have a downstream balance-delta or signature-binding check against `from`'s authorization. If absent → confirmed gap.

**EV estimate:**
- Anchor combined USD loss: $14M+ confirmed across 10 named anchors (LiFi + SocketGateway + RubicProxy + Transit Swap + Hedgey + Dexible at TRU mark price + ACOWriter + AnyswapV4Router + plus ~27 unquantified-but-counted anchors)
- Hypothetical Buzz catch rate on cross-pollination scan: 0.05-0.10 (router corpus is broad; many already remediated post-2024)
- Detector-build EV: HIGH; the L1b detector spec is single-file AST grep + downstream-binding negative-control

#### CANDIDATE-U (proposed): **AMM-Pair Reserve-Skew via Custom Transfer / Burn / Skim** — ~35 anchors (folding CANDIDATE-R + new gap clusters)

**Class statement:**

> A token implements custom logic in `_transfer`, `_burn`, or `_update` (or relies on `pair.skim()` / `pair.sync()`) that mutates the AMM pair's balance state. The pair's `reserves` cached in storage diverge from `IERC20(token).balanceOf(pair)` after the custom mutation. An attacker flash-borrows, swaps to trigger the custom mutation across the pair, then exploits the reserve-balance asymmetry via subsequent swap, burn, skim, or sync to drain the LP. SAFE-extension counter-pattern: pair's `sync()` rebinds reserves to actual balance, so if `sync()` is callable post-mutation and pre-attack, the surface closes.

**Specialization of:** Priority #1 WEAKER-PROPERTY-THAN-DOWNSTREAM-ASSUMES, applied to AMM accounting. Pair contract assumes `reserves ≈ balanceOf(pair)` modulo last `sync()`. Custom transfer hooks break the invariant.

**Anchor incidents (Clara):**
- Uranium 2021-04-28 **$40.9M** (largest single anchor — pair-drain class)
- SafeMoon 2023-03-28 **$8.9M** (LP-burn drain, deflationary-class anchor)
- LeetSwap 2023-08-01 $221K (Base-chain anchor)
- Reflection-class drains: BUNN $13K, FIREDRAKE $5.3K, BEVO $103K, WDOGE $30K, TomInu $35K, OceanLife $11K, GROK $55K (folds proposed CANDIDATE-R)
- Burn-class drains: BurnsDeFi $87K, ShadowFi $298K, CS $954K, BFCToken $42K, ZS $22K, APE2 $19K, PLTD $24K (folds gap:burn-acct)
- Skim-class: XStable $46K, UpSwing $585, GSS $26K, T3913 $31K
- Self-transfer accounting: SSS $4.6M, DeezNutz $170K, MINER $78K, BRAToken $41K, LPC $46K
- Plus large pair-accounting class: GoldCoin $53K, Utopia $119K, YEED $1M, TGBS $149K, BloomBeans-class

**Detector primitive:**
```
pattern A (reflection / deflationary): token contract has `_transfer` / `_update` override that calls `_burn(pair_address)` OR mutates `_balances[pair_address]` outside the standard from/to update.

pattern B (custom balanceOf): `function balanceOf(address) public view returns (uint)` returns a computed value (call to external contract, computation from reserves, etc.) rather than reading storage map.

pattern C (skim-exposure): pair-contract calls `_safeTransfer(to, IERC20(token).balanceOf(address(this)) - reserve_X)` callable by anyone with `to = caller`.
```

FP gate: legitimate rebase tokens (Ampleforth, OHM, stETH) use custom balanceOf for share→asset conversion — these are NOT this class unless paired with an AMM that doesn't handle rebase. Add positive-confirmation: target token IS a deployed AMM pair member AND has the override.

**EV estimate:**
- Anchor combined USD loss: **$50M+ confirmed** ($40.9M Uranium + $8.9M SafeMoon + ~$1M aggregate small drains)
- Hypothetical Buzz catch rate on cross-pollination scan: 0.15-0.25 (token-issuer class is enormous; many ongoing meme-token deployments retain the pattern in 2024-2026)
- Detector-build EV: VERY HIGH

#### CANDIDATE-V (proposed): **Reward / Staking Accumulator Reuse Without Per-User Snapshot Invalidation** — ~20 anchors

**Class statement:**

> A staking, farming, or reward-distribution contract tracks reward eligibility via a global per-pool accumulator (`accRewardPerShare`, `cumulativeIndex`, `lastUpdate`) and a per-user record (`userInfo[u].rewardDebt`, `lastClaim`, `pendingReward`). The accumulator is correctly updated on deposit / withdraw, BUT the per-user `rewardDebt` snapshot is NOT correctly invalidated on token transfer (LP-share transfer, NFT-stake transfer, or external delegation). Attacker buys LP shares → transfers to a fresh wallet → both wallets claim the same reward against the unsynchronized per-user records, or attacker manipulates the accumulator via flash-loan deposit → withdraws → still has the snapshot to claim against.

**Specialization of:** DC-9 sub-4 (state-not-invalidated repeated mint) **applied to reward-distribution** rather than mint-by-signature.

**Anchor incidents (Clara):**
- NFD 2022-09-08 $1.3M (largest anchor — reward Sybil exploit)
- YYDS 2022-09-08 $742K (referral overpayment)
- BCT 2023-12-09 $2.5K
- WECOStaking 2023-11-16 (large WECO token count)
- BambooAI, BigBangSwap, FireBird, Floor DAO, FarmZAP, JUICE, OKC, CAROL, EHIVE, GROKD, BurnsDeFi, NFD, Audius (gov-reinit reward), Pancake, BabySwap, Annex, ATK, dYdX-class callback-approval (~20 total tagged `gap:reward-drain`)
- Plus GDS $14.4M tokens ("Transferable LP Share Reuse" — direct match to class statement)

**Detector primitive:**
```
pattern: 
  function claim() / harvest() / withdraw() / collect() reads userInfo[msg.sender].rewardDebt OR userInfo[msg.sender].lastClaim
  AND updates rewardDebt AFTER the reward is paid
  AND there exists a transfer / mint of the staking-token that does NOT call _updateUser(from, to)
```

FP gate: most modern reward systems use SushiSwap's `_updateRewardDebt` pattern in `_beforeTokenTransfer`. Confirm absence of that hook on staking-token transfers.

**EV estimate:**
- Combined anchor USD loss: $3-5M+ (large NFD anchor + many small)
- Hypothetical catch rate: 0.10-0.15 (mature pattern, but constantly re-invented in new staking systems)
- Detector EV: MEDIUM (FP rate is higher; needs Skeptic enrichment to discriminate)

#### CANDIDATE-W (proposed): **ERC2771 / Trusted-Forwarder `_msgSender()` Misuse on Burn / Transfer** — 3 anchors (proposal-threshold met)

**Class statement:**

> A token contract inherits OpenZeppelin's `ERC2771Context` (or equivalent trusted-forwarder pattern) and exposes `burnFrom(_msgSender(), amount)` OR `_burn(_msgSender(), amount)` where `_msgSender()` parses the last 20 bytes of `msg.data` when called by a trusted forwarder. Attacker (with no special privilege) crafts a transaction calling the contract directly (NOT through the forwarder) with appended bytes `<victim_address>`. `_msgSender()` returns `<victim_address>` instead of the actual `msg.sender` because the check that the call originated from the trusted forwarder is missing or malformed. Attacker burns the victim's tokens.

**Specialization of:** DC-7 (Validating-Field ≠ Consuming-Field on Adjacent Function Pipelines) — `_msgSender()` validates "trusted forwarder check passed" but consumes "appended-bytes-as-sender" regardless of whether the forwarder check actually fired.

**Anchor incidents (Clara):**
- thirdweb 2023-12-07 $831 (canonical anchor — "Sender Spoof Burn")
- TIME 2023-12-06 $199K ("ERC2771 Burn Exploit")
- DominoTT 2023-12-07 $267 ("Forwarder Burn Exploit")

**Detector primitive:**
```
pattern:
  contract uses `_msgSender()` from ERC2771Context
  AND function `burn` / `burnFrom` / `_burn` reads from `_msgSender()`
  AND `_msgSender()` does NOT explicitly check `msg.sender == trustedForwarder` before parsing appended bytes
```

**EV estimate:** small-dollar but VERY high catch-rate on cross-pollination — class is mechanical and grep-friendly. Detector-build EV: HIGH per detector-build-cost ratio.

#### CANDIDATE-X (proposed): **Decimal / Unit-of-Measure Asymmetry in Pricing or Redemption** — 3 anchors (proposal-threshold met)

**Class statement:**

> A function computes `output = price * input / SCALE` where `price` is denominated in one token's precision (e.g., 8-decimal Chainlink feed) and `input` is denominated in a different token's precision (e.g., 18-decimal ERC20 amount). The `SCALE` constant assumes a third precision (e.g., `1e8` or `1e18`). The arithmetic produces a value off by 10^N from the intended result, allowing attackers to redeem far more (or pay far less) than the protocol designer intended.

**Specialization of:** Sibling of CANDIDATE-H (C-runtime overflow) and CANDIDATE-K (float-in-deterministic-VM) — same parent family "fixed-precision arithmetic surface gaps" (per Patterns-Defense-Classes.md notes on CANDIDATE-E parent family).

**Anchor incidents (Clara):**
- Blueberry 2024-02-23 **$1.3M** ("Decimal mismatch exploit") — canonical anchor
- ENF 2023-02-24 **$5.2M** ("Redeem decimal mis-scaling")
- Nowswap V1 2021-09-15 $1.1M ("WETH mis-scaled KLOSS invariant")

**Detector primitive:**
```
pattern:
  arithmetic in financial function: $RESULT = $A * $B / $C
  where:
    $A reads from chainlink-feed (8-dec) OR oracle that returns scaled-int
    $B is an ERC20 amount (likely 6 or 18 dec)
    $C is a hardcoded constant
  AND the contract does NOT normalize $A or $B to a canonical precision before the operation
```

FP gate: most contracts that do `price * amount / 1e18` DO handle decimals correctly via explicit normalization. The detector flags candidates; manual triage confirms the actual mismatch.

**EV estimate:**
- Combined anchor USD: $7.6M
- High-EV class because each hit is typically a CRITICAL severity
- Detector EV: MEDIUM-HIGH; needs Skeptic semantic check (decimal-of-A vs decimal-of-B vs SCALE constant)

#### CANDIDATE-Y (proposed): **`from == to` Self-Transfer Accounting Mutation** — 8 anchors (proposal-threshold met)

**Class statement:**

> A token's `_transfer(from, to, amount)` does `_balances[from] -= amount; _balances[to] += amount;` WITHOUT a `from == to` short-circuit. If the token has fee-on-transfer, deflationary burn, reflection, or other accounting mutations layered on top, calling `_transfer(addr, addr, amount)` produces: (a) double-counted accounting (balance goes UP by `amount * tax%`), or (b) silent mint (`_balances[addr] += amount` runs first, then `-= amount * (1-tax)`), or (c) supply inflation (custom hook fires twice on the same address). Attacker uses self-transfer in a loop to mint balance from nothing.

**Specialization of:** Parent family with CANDIDATE-U (AMM pair-skew); both rely on custom transfer logic that's correct in two-party scenarios but broken on edge inputs.

**Anchor incidents (Clara):**
- SSS 2024-03-21 **$4.6M** ("Self-transfer drain" — largest single anchor)
- DeezNutz 2024-02-21 $170K
- MINER 2024-02-14 $77.7K
- BRAToken 2023-01-10 $41K ("Self-transfer tax bug")
- APIG 2023-09-08 $169K
- LPC 2022-07-25 $46K
- Plus implied class anchors

**Detector primitive:**
```
pattern:
  token's `_transfer` / `_update` does NOT include `if (from == to) return;` short-circuit
  AND contract has fee-on-transfer / reflection / custom _balances mutation
```

**EV estimate:** Combined anchor USD ~$5M. Detector spec: trivial AST grep + presence-of-custom-hook qualifier. HIGH detector-EV per build-cost.

#### CANDIDATE-Z (proposed): **Rebase Token Cache Invalidation Failure** — 5 anchors

**Class statement:**

> A rebase token (Ampleforth-class, OHM staking, AAVE aTokens, Compound cTokens, stETH) exposes `balanceOf(u) = _shares[u] * _index() / _SCALE`. A downstream consumer (vault, AMM, lending market) caches `balanceOf(u)` at time T and consumes the cached value at time T+1 across an index update. The cached value is now stale — either over-priced (rebase up, attacker over-redeems) or under-priced (rebase down, protocol over-mints to attacker). Attacker triggers the index update mid-flow.

**Anchor incidents (Clara):**
- CauldronV4 2024-01-30 **$4.7M** ("Debt rebase exploit") — canonical anchor
- ElasticSwap 2022-12-13 $500K ("Rebase exploit")
- QUATERNION 2023-01-18 $4K ("Pair-rebase accounting drift")
- HATE 2023-09-05 $12.8K
- QWAStaking 2023-09-05 $696

**Detector primitive:**
```
pattern:
  contract calls `IERC20(rebaseToken).balanceOf(...)` 
  AND caches result to storage / memory
  AND uses cached result AFTER any external call that could trigger rebase
  AND target token is known-rebase (stETH / AMPL / OHM staking / lendingPool aToken)
```

**EV estimate:** Combined anchor USD ~$5.3M. Detector spec: needs rebase-token catalog + cross-reference. MEDIUM EV.

---

### Gap classes with 1-2 anchors (HOLD — insufficient for promotion, log for monitor)

- **gap:zero-amount-edge** (3): Treasure zero-quantity, Zero-Amount ERC1155, HEALTH zero-transfer — interesting class, watch for 4th anchor
- **gap:permit-misuse** (3, but AnyswapV4Router is canonical Critical): could fold into CANDIDATE-T as sub-pattern
- **gap:counterfeit-token** (1): Astrid 2023-10-28 — single-anchor, monitor
- **gap:fake-market** (1): Exactly $2.6M — single but high-value
- **gap:delegatecall-misuse** (1): Pickle $19.8M — single but historically pivotal; deprecated pattern in modern code
- **gap:underflow / gap:transfer-underflow** (2): Umbrella + QIXI — Solidity <0.8 specific
- **gap:debt-forgive** (1): OpenLeverage
- **gap:airdrop-claim** (1): AirdropGrapes NFTX-BAYC
- **gap:donateAndLiq** (1 — but Euler $197M is the canonical): merits attention; Euler-class is studied extensively
- **gap:self-swap-bad-debt** (1): The Standard
- **gap:liquidator-bug** (1): Annex
- **gap:strategy-drain** (1): Alpaca BUSD
- **gap:wrapper-acct** (1): XToken Wrapper
- **gap:vault-acct** (1): Revest
- **gap:virtual-balance** (1): VTF
- **gap:bond-acct** (1): MuBank
- **gap:lp-fee-hijack** (1): MIC
- **gap:fee-bypass** (1): SpaceGodzilla
- **gap:dust-collateral** (1): kTAF
- **gap:invariant-mis-scaled** (1): Nowswap (folded into CANDIDATE-X)
- **gap:reserve-desync** (1): Nimbus
- **gap:buyback-drain** (1): Eterna
- **gap:fake-pool / fake-token-route** (2): CivTrade, Minto — fold into CANDIDATE-T or separate class
- **gap:collateral-acct** (1): NFTX Doodles
- **gap:withdraw-bypass** (1): DAppSocial
- **gap:arbitrary-call** (1): V3Utils

---

## Section 2 — Frequency Analysis + Detector-Build Priority

### Buzz coverage frequency (per active DC + CANDIDATE, Clara incident counts)

| Class                                              | Clara count | Status                  | Detector status                                 |
| -------------------------------------------------- | ----------- | ----------------------- | ----------------------------------------------- |
| **DC-1** (Caller-Path-Disabled / Reentrancy CEI)   | **~22**     | ACTIVE                  | dc:1 sub-pattern detectors in pipeline          |
| **DC-2** (Function-Parameter Atomicity)            | 0           | ACTIVE (Cosmos-specific)| N/A in Clara corpus (EVM-heavy)                 |
| **DC-3** (Invariant-Scope-Overgeneralization)      | 0           | ACTIVE                  | N/A in Clara index-page R8                      |
| **DC-4** (Commitment-Hash-Finalized)               | 0           | ACTIVE                  | N/A in Clara index-page R8                      |
| **DC-5** (Trusted-Filler Callback)                 | 0           | ACTIVE                  | N/A (intent-based AMM specific)                 |
| **DC-6** (Permissionless-Trigger + Config-Recipients) | 0        | ACTIVE                  | N/A in Clara                                    |
| **DC-7** (Validating-Field ≠ Consuming-Field)      | **~10** (incl. CANDIDATE-W) | ACTIVE   | DC-7 detectors active                           |
| **DC-8** (Anchor-Signer Tier-1-vs-Tier-2)          | 0           | ACTIVE (Solana-specific)| N/A (Clara EVM-heavy)                           |
| **DC-9** (Privileged State Mutation no DiD)        | **~58**     | **ACTIVE — HIGHEST**    | DC-9 sub-1/2/3/4 detectors shipping             |
|   sub-1 (unchecked-mint / unauth admin)            | ~38         |                         |                                                 |
|   sub-2 (zero-timelock migration)                  | ~8          |                         |                                                 |
|   sub-3 (upgradeable hook)                         | ~0 explicit |                         |                                                 |
|   sub-4 (state-not-invalidated)                    | ~12         |                         |                                                 |
| **DC-10** (Cross-Chain Message Binding)            | ~3          | ACTIVE                  | DC-10 sub detectors in progress                 |
| **CANDIDATE-A** (Cross-Chain Bridge Anchor)        | ~2 (folded into DC-10) | promoted to DC-10 | -                                       |
| **CANDIDATE-D** (KyberSwap startSqrtP)             | **1** (Kyber Elastic 2023-11-22) | tracked | promoted-eligible at 2nd                        |
| **CANDIDATE-E** (Symmetric-Pair Rounding)          | 0 named (subsumed by general pair-accounting) | tracked | -                          |
| **CANDIDATE-H** (Uint64 Overflow on Multiplicative)| 1 (LockedDeal 2023-03-15) | tracked   | Clara corpus is EVM-heavy; Solana-C limited     |
| **CANDIDATE-I** (ERC4626 balanceOf w/o virtual-shares) | **~28** | tracked → **PROMOTION-READY** | promoted-eligible at 2+; Clara confirms ~28 |
| **CANDIDATE-J** (Set-Halt Sibling-Pair)            | 0 named     | tracked                 | reference pattern                                |
| **CANDIDATE-K** (Float in Deterministic-VM)        | 0           | tracked (Solana-specific)| Clara EVM-heavy                                 |
| **CANDIDATE-L** (Consensus-Bucket-Key Asymmetry)   | 0           | tracked                 | -                                                |
| **CANDIDATE-M** (Post-Audit Refactor CEI Break)    | **~10**     | tracked                 | promoted-eligible at 2+; Clara confirms ~10     |
| **CANDIDATE-O** (Slippage Double-Count / Oracle)   | **~60**     | tracked → **PROMOTION-READY HIGHEST PRIORITY** | already promoted-eligible per existing brain; Clara adds massive corpus |
| **CANDIDATE-P** (Durable-Nonce Pre-Signed)         | ~3 (gov takeovers) | tracked          | adjacent; Solana-Drift specific                 |
| **CANDIDATE-R** (Deflationary-Token LP-Drain)      | ~7 (subsumed into proposed CANDIDATE-U) | tracked | promoted-eligible — folded into CANDIDATE-U |
| **CANDIDATE-S** (Sync-balanceOf-Divergence)        | ~1 (pETH 2023-10-08) | tracked        | adjacent; partially folded into CANDIDATE-U     |
| **NEW CANDIDATE-T** (Approval-Drain Unbound `from`)| **~37**     | **PROPOSED** | HIGHEST detector-build priority                 |
| **NEW CANDIDATE-U** (AMM Pair Reserve-Skew custom transfer/burn/skim) | **~35** | **PROPOSED** | VERY HIGH                  |
| **NEW CANDIDATE-V** (Reward Accumulator no per-user invalidation) | **~20** | **PROPOSED** | MEDIUM                      |
| **NEW CANDIDATE-W** (ERC2771 burn-spoof)           | **3**       | **PROPOSED**            | HIGH (mechanical detector)                      |
| **NEW CANDIDATE-X** (Decimal Mismatch Pricing/Redeem) | **3**    | **PROPOSED**            | MEDIUM-HIGH                                     |
| **NEW CANDIDATE-Y** (Self-Transfer Accounting Mutation) | **8**  | **PROPOSED**            | HIGH (trivial AST grep)                         |
| **NEW CANDIDATE-Z** (Rebase-Cache Invalidation)    | **5**       | **PROPOSED**            | MEDIUM (needs rebase-catalog)                   |

### Top-5 detector-build priorities (by anchor-count × Clara-EV-rough)

1. **CANDIDATE-O (Slippage/Oracle Manipulation)** — **~60 anchors, $80M+ combined Clara USD** (PancakeBunny $43.5M, Cream $4.4M, Elephant $11.4M, plus many small). Buzz already has CANDIDATE-O tracked with audit-time check #5 from Sharwa anchor. **CLARA VALIDATES POSITION**: this is the largest-frequency, largest-loss class in DeFi history. **Build the productized propagation engine for oracle-volume-organicity-gate-missing FIRST.**
2. **CANDIDATE-I (ERC4626 / share inflation)** — **~28 anchors, $50M+ combined** (Spartan $18.2M, Harvest $962K, Fulcrum $3.6M, Beefy $148K, plus many small + Euler $197M as sibling-anchor). Buzz already has CANDIDATE-I proposed from Day 17 META-DOCTRINE. **CLARA VALIDATES BEYOND DOUBT.** Build OpenZeppelin `_decimalsOffset()`-absence detector + dead-shares-absence detector immediately.
3. **CANDIDATE-T (NEW: Approval-Drain Unbound `from`)** — ~37 anchors, $14M+ combined. **NEW PROPOSAL — highest detector-build EV at this snapshot.** Single-file AST grep + downstream-binding negative-control. Router/aggregator scope is huge.
4. **CANDIDATE-U (NEW: AMM Pair Reserve-Skew)** — ~35 anchors, $50M+ combined (Uranium $40.9M dominant). **NEW PROPOSAL — folds existing CANDIDATE-R + CANDIDATE-S + gap clusters.** Meme-token issuance corpus is enormous and ongoing — fresh anchors land monthly.
5. **DC-9 sub-1 (Unchecked Mint / Unauth Admin) + sub-4 (State-Not-Invalidated)** — **~50 anchors combined**, ranging from $1.4M (UUPS) up to multi-million (Resolv $25M, Solv $2.7M from existing brain). Buzz has DC-9 active with sub-1/2/3/4 detectors shipping. **CLARA VALIDATES URGENCY.** Continue building per existing roadmap; high-EV.

### Detector-build secondary priorities (rank 6-10)

6. **CANDIDATE-V (Reward Accumulator)** — 20+ anchors, MEDIUM-HIGH detector-build EV
7. **CANDIDATE-Y (Self-Transfer Accounting)** — 8 anchors, trivial detector, MEDIUM-HIGH EV per build-cost
8. **CANDIDATE-M (Post-Audit Refactor CEI)** — 10+ Clara anchors validate the class; promote-eligible
9. **CANDIDATE-W (ERC2771 burn-spoof)** — 3 anchors, mechanical detector, HIGH catch-rate
10. **CANDIDATE-X (Decimal Mismatch)** — 3 anchors, HIGH severity per hit

---

## Section 3 — Candidate Validation + DC-Promotion Recommendations

### Per-CANDIDATE Clara anchor counts (cumulative with existing brain)

| Candidate | Pre-Clara anchors (brain v1.8) | Clara contribution | Total | Promotion-threshold met? (3+ adjacent) |
| --------- | ------------------------------ | ------------------ | ----- | -------------------------------------- |
| CANDIDATE-A | 0 (promoted to DC-10)        | -                  | -     | promoted 2026-05-23                    |
| CANDIDATE-D | 1 (KyberSwap)                | 1 (Kyber Elastic 2023-11) | 2 | NEAR-THRESHOLD (recommend 3rd-anchor scan) |
| CANDIDATE-E | 1 (Raydium)                  | 0 explicit         | 1     | hold                                   |
| CANDIDATE-G | 3 (promoted to DC-8)         | -                  | -     | promoted 2026-05-19                    |
| CANDIDATE-H | 2 (Indentura H01+H02)        | 1 (LockedDeal)     | 3     | **THRESHOLD MET — RECOMMEND PROMOTION** |
| CANDIDATE-I | 0 → proposed Day 17          | **~28**            | **~28** | **VASTLY OVERSHOOTS — RECOMMEND IMMEDIATE PROMOTION** to DC-11 |
| CANDIDATE-J | 1 (stUSDS) + 1 (MetaMorpho)  | 0 explicit         | 2     | hold                                   |
| CANDIDATE-K | 1 (M0 Extensions)            | 0 (EVM-heavy)      | 1     | hold; Solana-specific corpus           |
| CANDIDATE-L | 1 (Wormhole)                 | 0                  | 1     | hold                                   |
| CANDIDATE-M | 1 (0xBugDrop unnamed)        | **~10**            | **~11** | **THRESHOLD MET — RECOMMEND PROMOTION** to DC-12 |
| CANDIDATE-N (now DC-9)         | promoted          | -                  | -     | promoted 2026-05-22                    |
| CANDIDATE-O | 1 (Rhea) + 1 (Sharwa)        | **~60**            | **~62** | **VASTLY OVERSHOOTS — RECOMMEND IMMEDIATE PROMOTION** to DC-13 (highest-EV) |
| CANDIDATE-P | 1 (Drift)                    | ~3 (gov takeovers) | 4     | **THRESHOLD MET — RECOMMEND PROMOTION** to DC-14 (operational-security)|
| CANDIDATE-Q (Truebit)         | 1                  | 0                  | 1     | hold                                   |
| CANDIDATE-R | 1 (JUDAO)                    | ~7                 | 8     | **THRESHOLD MET — RECOMMEND folding into CANDIDATE-U promotion** |
| CANDIDATE-S | 1 (LBP)                      | 1 (pETH 2023-10-08)| 2     | NEAR-THRESHOLD; **fold into CANDIDATE-U promotion** |

### Recommended promotion order (operator decision required)

Per the DC-9 promotion precedent (4 sub-patterns + $320M combined exposure), the bar is:
- 3+ anchor protocols across multiple incidents
- Combined exposure documenting class significance
- Detector productization path identified

**Promotion-eligible NOW (operator-decision-pending):**

| Promotion | Class | Combined exposure | Sub-patterns | Detector-spec ready? |
| --------- | ----- | ----------------- | ------------ | -------------------- |
| **DC-11 candidate**: CANDIDATE-I → ERC4626 Share Inflation | $50M+ Clara + Compound v2 cToken (canonical historical) | virtual-shares-absence / dead-shares-absence / decimals-offset-zero / donateAndLiq compound | YES (OZ `_decimalsOffset()` + dead-shares grep) |
| **DC-12 candidate**: CANDIDATE-O → Oracle/Slippage Manipulation | $80M+ Clara + Rhea $18.4M + Sharwa | spot-oracle-no-TWAP / volume-organicity-gate-missing / cross-pool-mispricing / read-only-reentrancy-on-oracle | YES (oracle-volume-organicity detector spec'd in existing brain) |
| **DC-13 candidate**: CANDIDATE-M → Post-Audit Hook CEI Break | $10M+ Clara + 0xBugDrop $7M | hook-added-after-audit / callback-before-state / fake-pool-callback | YES (cei-violation-via-hook in existing brain) |
| **DC-14 candidate**: NEW CANDIDATE-T → Unbound `from` Approval-Drain | $14M+ Clara | router-transferFrom-from-unbound / aggregator-route-arbitrary-from / permit-router-misuse | YES (this section) |
| **DC-15 candidate**: NEW CANDIDATE-U → AMM Pair Reserve-Skew | $50M+ Clara | deflationary-LP-mutation / custom-balanceOf-divergence / skim-exposure / self-transfer-acct | YES (this section; folds R + S) |

**Recommendation:** the **DC-9 promotion bar (4 sub-patterns + $320M)** is exceeded multiple times over in this Clara corpus. CANDIDATE-O alone (~60 anchors, $80M+ Clara combined, $98M+ inc. PancakeBunny + Elephant) represents the highest-frequency exploitable class in DeFi history. Recommend operator promote at least CANDIDATE-O + CANDIDATE-I in the next operator-decision window.

---

## Section 4 — High-Value Undetected Patterns + Immediate Detector Specs

This section names patterns with **3+ Clara anchors AND no current Buzz detector AND no current candidate that exactly matches**. These are the highest-EV detector-build opportunities. Each gets a v2.0 brain-compound detector spec.

### Pattern 1: **Unbound `from` Approval-Drain in Router/Aggregator** (= proposed CANDIDATE-T)

- **Anchor incidents**: LiFi 2022-03-20 $202K + SocketGateway 2024-01-16 $2.6M + RubicProxy 2022-12-25 $1.5M + Transit Swap 2022-10-01 $6.9M + Hedgey 2024-04-19 $1.3M + 30+ more
- **Combined Clara USD**: $14M+ (named) — broader $20M+ inferred
- **Buzz status**: NO existing detector; closest is DC-6 (permissionless-trigger-config-recipients) but that excludes msg.sender-supplied recipients — DC-6 explicitly negative-controls THIS pattern
- **Detector v2.0 spec**:
  ```yaml
  rule: unbound-from-approval-drain
  pattern_either:
    - pattern: IERC20($T).transferFrom($FROM, ..., $AMT)
      where: $FROM is a function-arg, $FROM != msg.sender comparison absent, no allowedCallers[$FROM][msg.sender] gate
    - pattern: $TOKEN.permit($OWNER, ...); $TOKEN.transferFrom($OWNER, ...)
      where: $OWNER is function-arg, no msg.sender binding before permit usage
  exclude:
    - file: */forwarder/* (legitimate trusted-forwarder)
    - pattern: contract inherits ERC2771Context AND has trustedForwarder() guard
  semgrep_ext: TS+JS detection for off-chain relayer scaffolds
  ```
- **Estimated catch-rate on 30-target watchlist scan**: 0.10-0.20 — the pattern is widespread because routers are legacy
- **Estimated EV per scan**: $50K-$200K (single critical finding × Immunefi $250K-$1M Critical cap × P(acc) 0.4)

### Pattern 2: **AMM Pair Reserve-Skew via Custom Transfer / Burn / Skim** (= proposed CANDIDATE-U)

- **Anchor incidents**: Uranium $40.9M + SafeMoon $8.9M + LeetSwap $221K + many reflection/burn/skim drains
- **Combined Clara USD**: $50M+ named
- **Buzz status**: existing CANDIDATE-R (deflationary-token) + CANDIDATE-S (sync-balanceOf) cover sub-patterns; this proposal **unifies them into a single DC-15 promotion candidate**
- **Detector v2.0 spec**:
  ```yaml
  rule: amm-pair-reserve-skew
  pattern_set:
    A_deflationary: 
      - token has `_update` / `_transfer` / `_burn` override
      - override calls `_burn($PAIR_ADDR)` OR mutates `_balances[$PAIR_ADDR]` outside from/to update
    B_custom_balanceOf:
      - `function balanceOf(address) public view` does NOT read storage map
      - returns computed value from external call / reserves / time-based formula
    C_skim_exposed:
      - pair contract calls `_safeTransfer(to, getReserves() - cached)` callable by anyone
  cross_check:
    - target token is a deployed AMM pair member (verify via DexScreener / Etherscan)
    - target token has live LP > $X threshold
  ```
- **Estimated catch-rate on token corpus**: 0.05-0.10 (huge corpus, many already-exploited tokens but ongoing meme-token deployments retain pattern)
- **Estimated EV per finding**: $50K-$500K (rare to find pre-exploit at large LP; common to find at small-LP); long-tail value via productization (LP-deployer warning service)

### Pattern 3: **Reward-Accumulator Per-User Snapshot Reuse** (= proposed CANDIDATE-V)

- **Anchor incidents**: NFD $1.3M, YYDS $742K, GDS $14.4M tokens, 15+ smaller
- **Combined Clara USD**: ~$3M+ direct (much more in token-denominated terms)
- **Buzz status**: NO direct detector; DC-9 sub-4 (state-not-invalidated repeated-mint) is parent-class but focused on mint not reward-distribution
- **Detector v2.0 spec**:
  ```yaml
  rule: reward-accumulator-per-user-no-invalidate
  pattern_required:
    - contract has `userInfo[$USER].rewardDebt` OR equivalent per-user snapshot
    - `claim` / `harvest` / `withdraw` reads `rewardDebt` AND updates it
  pattern_missing:
    - staking-token transfer hook does NOT call `_updateRewardDebt(from, to)` BEFORE state change
  cross_check:
    - protocol must have transferable staking-token (LP shares, NFT-staked, transferable position-token)
  ```
- **Estimated catch-rate**: 0.05-0.10
- **Estimated EV per finding**: $20K-$200K

### Pattern 4: **ERC2771 / Trusted-Forwarder `_msgSender()` Burn-Spoof** (= proposed CANDIDATE-W)

- **Anchor incidents**: thirdweb $831, TIME $199K, DominoTT $267
- **Combined Clara USD**: $200K direct (low — but every catch is structurally identical)
- **Buzz status**: NO existing detector; CANDIDATE-W proposal is mechanical and high-catch-rate
- **Detector v2.0 spec**:
  ```yaml
  rule: erc2771-burn-spoof
  pattern_required:
    - contract uses `_msgSender()` from ERC2771Context (OZ or thirdweb pattern)
    - function `burn` / `burnFrom` / `_burn` reads from `_msgSender()`
  pattern_negative:
    - `_msgSender()` body must check `msg.sender == trustedForwarder` BEFORE parsing appended bytes
  ```
- **Estimated catch-rate**: 0.30+ (mechanical pattern; many thirdweb-cloned contracts retain the bug)
- **Estimated EV per finding**: $5K-$50K typical (small-token deployments) but could spike on thirdweb-stack large-deployment

### Pattern 5: **Decimal / Unit-of-Measure Asymmetry in Pricing** (= proposed CANDIDATE-X)

- **Anchor incidents**: Blueberry $1.3M, ENF $5.2M, Nowswap $1.1M
- **Combined Clara USD**: $7.6M
- **Buzz status**: NO direct detector; CANDIDATE-H (uint64 overflow) is parent-family sibling for arithmetic surface, but not the same pattern
- **Detector v2.0 spec**:
  ```yaml
  rule: decimal-mismatch-pricing
  pattern_required:
    - arithmetic: `$RESULT = $A * $B / $C` in financial-path function
    - $A from external oracle (chainlink, pyth, redstone, custom feed)
    - $B from ERC20 amount (msg.value / token transfer / cached balance)
    - $C from constant or different oracle
  pattern_negative:
    - contract does NOT normalize $A / $B precision before arithmetic
    - OR: contract has decimal-normalization but applies inconsistently across paths
  ```
- **Estimated catch-rate**: 0.05-0.15 (subtle, requires semantic understanding)
- **Estimated EV per finding**: $100K-$1M+ (HIGH severity per hit; Blueberry / ENF / Nowswap-class drains are typically CRITICAL)

### Pattern 6: **`from == to` Self-Transfer Accounting Mutation** (= proposed CANDIDATE-Y)

- **Anchor incidents**: SSS $4.6M, DeezNutz $170K, MINER $77K, BRAToken $41K, APIG $169K, LPC $46K, plus implied class
- **Combined Clara USD**: $5M+
- **Buzz status**: NO direct detector
- **Detector v2.0 spec**:
  ```yaml
  rule: self-transfer-accounting-mutation
  pattern_required:
    - token `_transfer` / `_update` overrides standard OZ pattern
    - contract has fee-on-transfer / reflection / custom hook in `_transfer`
  pattern_negative:
    - `_transfer` does NOT have `if (from == to) return amount;` short-circuit at top
  ```
- **Estimated catch-rate**: 0.10-0.20 (trivial detector; pattern recurs constantly in meme-token deployments)
- **Estimated EV per finding**: $20K-$5M (SSS-class is the upper bound)

### Pattern 7: **Rebase Token Cache Invalidation Failure** (= proposed CANDIDATE-Z)

- **Anchor incidents**: CauldronV4 $4.7M, ElasticSwap $500K, QUATERNION, HATE, QWAStaking
- **Combined Clara USD**: $5.3M
- **Buzz status**: NO direct detector
- **Detector v2.0 spec**: requires rebase-token catalog + cross-reference (more semantic than mechanical); detector is medium-build-cost
- **Estimated catch-rate**: 0.05
- **Estimated EV per finding**: $100K-$5M (CauldronV4-class is upper bound)

---

## Summary statistics

- **Total incidents scraped**: 400 (8 pages × 50 incidents/page, no failed pages)
- **Time range**: 2020-02-15 → 2024-05-21 (Clara free tier appears to cap at mid-2024; 2025-2026 not in free-tier corpus)
- **Combined Clara USD documented (named drains only)**: **$400M+** (PancakeBunny $43.5M + Curve Vyper $35.7M + Pickle $19.8M + Spartan $18.2M + MonoX $17.6M + Fuse Pool 127 $13.6M + Elephant $11.4M + WUSD Master $15M + Uranium $40.9M + SafeMoon $8.9M + Hundred $6.7M + Transit Swap $6.9M + Euler $197M + dozens more — sum of named-with-USD-figure)
- **Incidents with 0 Buzz coverage (`gap:` only, no `dc:` or `cand:` match)**: ~110 / 400 (27.5%) — distributed across the gap classes named above
- **Incidents matching existing DC**: ~85 (mostly DC-1, DC-9, DC-10)
- **Incidents matching existing CANDIDATE**: ~165 (CANDIDATE-O dominant, then I, then M)
- **Multi-class composite incidents (matching 2+ classes)**: ~40 (most often dc:1 + cand:O, or cand:I + cand:O, or dc:9 + cand:P)
- **New candidate proposals from this intake**: **7** (CANDIDATE-T, U, V, W, X, Y, Z)
- **DC-promotion-ready CANDIDATEs (operator decision required)**: **5** (CANDIDATE-I → DC-11, CANDIDATE-O → DC-12, CANDIDATE-M → DC-13, CANDIDATE-T → DC-14, CANDIDATE-U → DC-15 with R+S folded)
- **Top-5 immediate detector-build priorities**: oracle-volume-organicity-gate-missing (CANDIDATE-O) > ERC4626-virtual-shares-absent (CANDIDATE-I) > unbound-from-approval-drain (CANDIDATE-T) > amm-pair-reserve-skew (CANDIDATE-U folds R+S) > DC-9 sub-1+sub-4 detectors (continue existing roadmap)

### Cross-cutting observations (compound brain proposals beyond operator-spec'd 4 sections)

#### Observation A: **CANDIDATE-O substrate validates beyond doubt**

The Clara corpus shows oracle / pricing / slippage manipulation is **THE dominant exploit class in DeFi history** by both frequency (~60 anchors of 400) and combined USD ($80M+ named in Clara alone). This is also the class with the largest single-incident anchors (PancakeBunny $43.5M, Cream $4.4M, Elephant $11.4M). Buzz's existing CANDIDATE-O substrate work (Sharwa, Rhea anchors + Morpho Blue flash-loan-volume-washing template per Ground-Truth v1.7) is on the load-bearing class. **Recommendation: Lane 1 should prioritize oracle-consumer audits over all other classes for the next sweep cycle.**

#### Observation B: **The 2022 chain of CEI-related drains is a learning corpus**

Pages 7-8 (2022-03 → 2022-04) cluster 8+ reentrancy-class drains in a 3-month window (Hundred Gnosis + Agave + Paraluni + bHOME + Fuse Pool 127 + Revest + ACOWriter + Umbrella). This was the post-ERC777-recognition era when the security community en masse audited for CEI. Modern code largely closed this surface — but CANDIDATE-M (post-audit-hook CEI break) is the **2026 revival** of the class, as protocols add hooks/callbacks AFTER initial audits clear CEI. **Brain insight: CEI is not "solved" — it's a re-emergent class via composability.**

#### Observation C: **The "router proxy" attack surface has structurally NOT been resolved**

Despite 5+ years of Bancor/AnyswapV4/LiFi/SocketGateway/Transit Swap/RubicProxy drains (combined ~$15M+), the pattern keeps recurring. The reason: each new router is a clean-slate codebase; the "transferFrom unbound from" lesson does not propagate via Solidity-language affordances. **Recommendation: build CANDIDATE-T detector AND publish a Lane 3 article naming the pattern.** Cross-pollination scan target: every router-aggregator-bridge deployed since 2022.

#### Observation D: **The `dc:9 sub-1` (unchecked-mint / unauth-admin) class is the most under-appreciated**

Clara surfaces ~38 anchors for this sub-pattern alone (UUPS $1.4M, TSURUWrapper $417K, Telcoin Wallet $TEL, Audius $AUDIO, EFLeverVault $661K, DeRace, MonoX $17.6M, plus many small admin-takeover drains). The Buzz DC-9 sub-1 detector should be HIGH-priority maintenance — every new ERC20 / proxy / vault deployment is a candidate target. **Combine with CANDIDATE-T detector**: an unbound-from router that has admin functions exposed creates a compound CRITICAL surface.

#### Observation E: **A meta-doctrine emerges: "Custom hooks always break standard invariants"**

Multiple proposed candidates (CANDIDATE-U / V / W / Y / Z) all share a root cause: **a token or contract overrides standard ERC20 / staking / forwarder behavior without preserving the invariants downstream consumers assume.** This is structurally identical to META-DOCTRINE Two-Axis Donation-Channel Test (custom balanceOf-for-accounting × user-fungible-shares = DANGEROUS), but generalized: **any custom override is a potential class of bug if downstream consumers cache the "before-override" semantics.**

**Proposed META-DOCTRINE addition (operator-decision-pending):**
> Whenever a contract overrides a standard interface method (`transfer`, `transferFrom`, `_update`, `balanceOf`, `_msgSender`, `decimals`, `mint`, `burn`), enumerate all downstream consumers that cache or assume the standard semantics. Each cache point is a potential bug. The defense is to NOT override — or, if override is mandatory, ensure ALL downstream consumers are invalidated on every state change.

This meta-doctrine sits above CANDIDATE-U/V/W/Y/Z and would be a "routing" layer (like the existing Two-Axis Donation-Channel Test sits above CANDIDATE-I).

#### Observation F: **Lane 1.5 deployment-hunting gets a strong base rate**

Clara documents extensive "post-deployment within days/weeks" drains (Sumer timelock bypass on Day-N, Initializer takeovers on freshly-deployed proxies, Migration drains on multi-step rollouts). This validates the Lane 1.5 thesis: **drift between audit-time state and deployment-time state is a recurrent attack vector**. Build the continuous-monitoring tooling.

#### Observation G: **Clara's "unknown chain" tag is a methodology limitation, not real data**

Clara's index-page doesn't surface chain for most incidents, but per-incident writeups likely include it. For per-anchor depth, manual per-incident WebFetch would convert `unknown` → `Ethereum / BSC / Arbitrum / Polygon / Avalanche` with chain-distribution analysis. Defer to operator: is chain-distribution analysis worth a follow-up scrape pass? (~400 additional WebFetch calls.)

---

_Clara Ground-Truth Bulk Intake | v1.0 | 2026-05-24 | Operator msg 7692 | 400 incidents × 8 pages × ~$400M+ documented Clara USD | 7 new candidate proposals (T-Z) | 5 DC-promotion-ready recommendations (I, O, M, T, U) | Meta-doctrine proposal: "custom hooks always break standard invariants"._

---

## Operator approval log (Ogie msg 7695, 2026-05-24 21:49Z)

1. R+S stay as-is. CANDIDATE-U filed as parent abstraction (NOT merge). → committed to `brain/Patterns-Defense-Classes.md` (DC-15 enumerates DC-15.R + DC-15.S as concrete sub-instances, plus DC-15.X skim-exposure + DC-15.Y self-transfer sub-patterns; CANDIDATE-R + CANDIDATE-S preserved in CANDIDATE pool unchanged)
2. All 7 CANDIDATEs T-Z APPROVED. → committed to `brain/Patterns-Defense-Classes.md` (T+U promoted to DC-14+DC-15; V/W/X/Y/Z committed in CANDIDATE pool extensions section)
3. All 5 DC-promotions DC-11..DC-15 APPROVED. → committed to `brain/Patterns-Defense-Classes.md`:
   - DC-11: CANDIDATE-I → ERC4626 Share Inflation / Wrapper-Accounting Mitigation Absence
   - DC-12: CANDIDATE-O → Oracle / Slippage Manipulation Across Pricing Pipelines (highest-frequency class in DeFi history per Observation A)
   - DC-13: CANDIDATE-M → Post-Audit Hook / CEI Break via Upgradeable Integration
   - DC-14: CANDIDATE-T → Unbound `from` Approval-Drain in Router / Aggregator
   - DC-15: CANDIDATE-U → AMM Pair Reserve-Skew via Custom Transfer / Burn / Skim (PARENT ABSTRACTION; R + S preserved as sub-instances)
4. META-DOCTRINE approved as Doctrine #31 "Custom hooks always break standard invariants". → committed to `brain/Doctrine.md` (sits in routing layer above DC-15 + CANDIDATE-V/W/Y/Z, parallel to existing Two-Axis Donation-Channel Test that sits above CANDIDATE-I/DC-11)
5. Per-incident WebFetch pass SKIPPED — low ROI (operator decision; `unknown chain` tag remains methodology limitation per Observation G; no follow-up scrape scheduled)

Companion edits:
- `brain/Watchlist-Candidate-Crossmap.md` v1.9 addendum: schema extension for DC-11..15 + CANDIDATE-V/W/X/Y/Z column-header taxonomy; row schema unchanged
- `brain/Ground-Truth-Exploits.md` v2.0: previously updated with Clara anchor cross-references (separate operator session, not modified in this commit)
