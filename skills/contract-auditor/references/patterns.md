# Contract Audit Pattern Library
# Buzz BD Agent — Contract Auditor Skill v1.0

Full pattern reference for EVM Solidity security analysis.
Referenced from SKILL.md Section 4.

---

## CRITICAL PATTERNS

### 1. HIDDEN_MINT
**Risk:** Unlimited token inflation — rug pull vector  
**Severity:** CRITICAL  
**Patterns to search:**
```
function mint(
_mint(
function issue(
function generate(
```
**Flag if:** Function exists, is not internal-only, is callable post-constructor by owner  
**Safe if:** Only called in constructor OR minter role is renounced address(0)  
**Evidence template:** `"function mint(address to, uint256 amount) external onlyOwner"`

---

### 2. BACKDOOR_TRANSFER
**Risk:** Owner can drain any wallet without consent  
**Severity:** CRITICAL  
**Patterns to search:**
```
function _transfer(address from, address to  // check for owner bypass
if (from == owner() || to == owner())       // suspicious exemptions
transferFrom(  // check if overridden with owner bypass
airdrop(address[] calldata  // bulk transfer function
```
**Flag if:** `_transfer` override skips allowance check for owner  
**Evidence template:** `"if(_isExcluded[from]) { _transferFromExcluded(from,to,amount); }"`

---

### 3. FEE_TRAP
**Risk:** Fees set to 100% = all sells/buys captured by contract  
**Severity:** CRITICAL  
**Patterns to search:**
```
_taxFee
_liquidityFee
buyFee
sellFee
setFee(
updateFees(
```
**Flag if:** Fee setter exists with no upper bound (`require(fee <= 25)` would be safe)  
**Flag if:** Fee is initialized > 25%  
**Evidence template:** `"function setTaxFee(uint256 taxFee) external onlyOwner { _taxFee = taxFee; }"`

---

### 4. BLACKLIST
**Risk:** Owner can freeze any wallet, blocking sells  
**Severity:** CRITICAL  
**Patterns to search:**
```
mapping(address => bool) private _isBlacklisted
blacklist[
bots[
bannedWallets
function addToBlacklist(
function setBots(
isBot[
```
**Flag if:** Owner can add arbitrary addresses to blacklist  
**Note:** Some projects have legitimate blacklists (OFAC compliance) — check context  
**Evidence template:** `"function blacklistAddress(address account, bool value) external onlyOwner"`

---

### 5. PAUSABLE
**Risk:** Owner can halt all token transfers indefinitely  
**Severity:** CRITICAL  
**Patterns to search:**
```
import "@openzeppelin/contracts/security/Pausable.sol"
function pause(
whenNotPaused
_paused
```
**Flag if:** `pause()` callable by owner with no timelock  
**Safe if:** Pausable is governed by multisig + timelock  
**Evidence template:** `"function pause() external onlyOwner { _pause(); }"`

---

### 6. UPGRADE_PROXY
**Risk:** Owner can replace contract logic post-deployment  
**Severity:** CRITICAL  
**Patterns to search:**
```
upgradeTo(
_upgradeTo(
_implementation
delegatecall
ProxyAdmin
UUPSUpgradeable
TransparentUpgradeableProxy
```
**Flag if:** Proxy upgrade not controlled by timelock or multisig  
**Note:** Proxies aren't inherently bad — check governance  
**Evidence template:** `"function upgradeTo(address newImplementation) external onlyOwner"`

---

### 7. UNVERIFIED_CONTRACT
**Risk:** Source code hidden — cannot audit what we cannot see  
**Severity:** CRITICAL (automatic)  
**Trigger:** Etherscan/Basescan returns `SourceCode: ""`  
**Action:** Immediate REJECT recommendation. Flag prominently in report.

---

### 8. LP_RUG
**Risk:** Owner can remove all liquidity instantly  
**Severity:** CRITICAL  
**Patterns to search:**
```
removeLiquidity(
removeLiquidityETH(
IUniswapV2Router
_uniswapV2Router.removeLiquidity
```
**Flag if:** Called by owner function without timelock  
**Safe if:** LP tokens locked in external locker (Team Finance, Unicrypt, etc.)  
**Cross-reference:** Check DexScreener for LP lock status

---

## HIGH PATTERNS

### 9. MAX_TX_MANIPULATION
**Risk:** Owner can set maxTxAmount to 0, halting all trading  
**Severity:** HIGH  
**Patterns:**
```
_maxTxAmount
maxTransactionAmount
setMaxTxAmount(
```
**Flag if:** Setter with no lower bound (`require(amount >= totalSupply/1000)` would be safer)

---

### 10. UNCHECKED_RETURN
**Risk:** Silent failure on ETH transfers — funds lost  
**Severity:** HIGH  
**Patterns:**
```
.call{value:
.call.value(
(bool success,  // check if success is verified
```
**Flag if:** `call{value:}` result is not checked  
**Safe pattern:** `(bool success, ) = addr.call{value: amount}(""); require(success);`

---

### 11. REENTRANCY
**Risk:** Classic reentrancy — attacker drains contract via callback  
**Severity:** HIGH  
**Pattern:**
```
// State change AFTER external call
externalContract.call(...)  // or .transfer() / .send()
balances[msg.sender] -= amount  // should be BEFORE the call
```
**Check:** Confirm Checks-Effects-Interactions pattern followed  
**Check:** ReentrancyGuard import present?

---

### 12. OLD_SOLIDITY_OVERFLOW
**Risk:** Integer overflow/underflow on token amounts  
**Severity:** HIGH  
**Trigger:** `pragma solidity ^0.6` or earlier WITHOUT SafeMath import  
**Solidity 0.8.0+:** Built-in overflow protection, safe  
**Evidence:** Check compiler version in source header

---

### 13. TX_ORIGIN_AUTH
**Risk:** Phishing attack surface — exploitable via malicious intermediary  
**Severity:** HIGH  
**Patterns:**
```
tx.origin == owner
require(tx.origin ==
```
**Always flag.** Should use `msg.sender` instead.

---

### 14. CENTRALIZED_PRICE_ORACLE
**Risk:** Owner-controlled price = instant manipulation  
**Severity:** HIGH  
**Patterns:**
```
function setPrice(
function updateRate(
pricePerToken
```
**Flag if:** Price setter is owner-only with no timelock or TWAP

---

## MEDIUM PATTERNS

### 15. OWNERSHIP_NOT_RENOUNCED
**Risk:** Single point of control — trust the team fully  
**Severity:** MEDIUM (HIGH if combined with other findings)  
**Check:** `owner()` returns `address(0)`? = renounced (GOOD)  
**Check:** Timelock contract? Multisig?  
**Evidence:** `"owner(): 0x1234...abcd (NOT renounced)"`

---

### 16. HARDCODED_ADDRESSES
**Risk:** Privileged address baked in — may be attacker-controlled  
**Severity:** MEDIUM  
**Patterns:** Any `0x` addresses hardcoded in function bodies (not just declarations)

---

### 17. MISSING_EVENTS
**Risk:** No audit trail for critical state changes  
**Severity:** MEDIUM  
**Check:** Major state changes (fee updates, blacklist, ownership) emit events?

---

### 18. EXCESSIVE_OWNER_PRIVILEGES
**Risk:** Too many `onlyOwner` functions without governance  
**Severity:** MEDIUM  
**Flag if:** More than 8 distinct `onlyOwner` functions present

---

## LOW / INFO PATTERNS

### 19. HONEYPOT_SIGNAL
**Risk:** Contract may prevent selling  
**Severity:** LOW (flag for human review)  
**Patterns:**
```
_isExcludedFromFee[uniswapV2Pair] = false
// Buy allowed, sell taxed to 100%
```
**Cross-reference with DexScreener:** Any sell transactions on-chain?

---

### 20. LARGE_SUPPLY
**Risk:** Psychological — not a vuln, but notable  
**Severity:** INFO  
**Flag if:** `totalSupply > 1_000_000_000_000_000` (quadrillion+)

---

## SCORING REFERENCE

```
contract_safety_score = 100

CRITICAL (each): -30, capped at -60 total
HIGH (each):     -15, capped at -30 total
MEDIUM (each):   -5
LOW (each):      -2
NOT_VERIFIED:    -25 flat
LARGE_CODEBASE:  -5 flat

Score ranges:
85-100: LOW RISK — Approve
65-84:  MEDIUM RISK — Conditional (flag findings to prospect)
40-64:  HIGH RISK — Reject or require fixes + re-audit
0-39:   CRITICAL RISK — Immediate reject, flag as potential rug
```

---

## QUICK CHECKLIST (copy for Telegram reports)

```
CONTRACT AUDIT CHECKLIST
========================
Chain: _____ | Address: 0x...
Verified: YES / NO
Lines: _____ | Compiler: _____

CRITICAL:
[ ] Hidden mint function
[ ] Backdoor transfer
[ ] Fee trap (settable to 100%)
[ ] Blacklist mechanism
[ ] Pausable (no timelock)
[ ] Upgradeable proxy (no governance)
[ ] LP removable by owner

HIGH:
[ ] Max TX manipulation
[ ] Unchecked .call return
[ ] Reentrancy risk
[ ] Old Solidity (<0.8) no SafeMath
[ ] tx.origin auth
[ ] Centralized price oracle

MEDIUM:
[ ] Ownership NOT renounced
[ ] Excessive owner privileges
[ ] Missing events

Score: ___/100
Recommendation: APPROVE / CONDITIONAL / REJECT / ESCALATE
```

---

*Pattern Library v1.0 — Indonesia Sprint Day 9*  
*Based on: Pashov Audit Group patterns, Consensys SWC Registry, Trail of Bits findings*  
*"AI catches what humans forget. Humans catch what AI cannot reason about. You need both."*
