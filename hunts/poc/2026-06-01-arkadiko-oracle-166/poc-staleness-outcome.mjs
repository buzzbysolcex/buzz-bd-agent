// Gate-2 TASK-2 PoC — Arkadiko missing oracle price-staleness in the consumer.
// Shows get-collateral-to-debt (REAL arkadiko-vaults-helpers-v1-1) consuming an arbitrarily
// STALE last-price with NO age rejection, and quantifies the conditional bad-debt.
import { initSimnet } from "@hirosystems/clarinet-sdk";
import { Cl, cvToString } from "@stacks/transactions";

const ORACLE = "arkadiko-oracle-v2-3", HELP = "arkadiko-vaults-helpers-v1-1";
const simnet = await initSimnet("./Clarinet.toml");
const d = simnet.deployer;
const TOK = `${d}.stub-vaults-tokens`, DAT = `${d}.stub-vaults-data`, ORC = `${d}.${ORACLE}`;
const cp = (full) => { const [addr, name] = full.split("."); return Cl.contractPrincipal(addr, name); };

// price scale: decimals=100 (so $3.00 -> last-price 300). collateral=100, debt=150, liq-ratio=15000(=150%).
const setPrice = (p) => simnet.callPublicFn(ORACLE, "update-price-owner", [Cl.uint(1), Cl.uint(p), Cl.uint(100)], d);
const ctd = () => simnet.callPublicFn(HELP, "get-collateral-to-debt",
  [cp(TOK), cp(DAT), cp(ORC), Cl.principal(d), Cl.principal(d), Cl.uint(100), Cl.uint(150)], d);
const lastBlock = () => cvToString(simnet.callReadOnlyFn(ORACLE, "get-price", [Cl.stringAscii("STX")], d).result);

console.log("=== TASK-2: missing consumer staleness ===");
setPrice(300);                                   // $3.00
console.log("price set: $3.00 (last-price=300, scale=100)");
console.log("burn height now:", Number(simnet.burnBlockHeight), "| oracle:", lastBlock());
const fresh = ctd();
console.log("\nFRESH get-collateral-to-debt:", cvToString(fresh.result), " <-- ratio 20000 (=200%), valid true (healthy)");

simnet.mineEmptyBurnBlocks ? simnet.mineEmptyBurnBlocks(500) : simnet.mineEmptyBlocks(500);
console.log("\n--- mined 500 burn blocks, NO oracle update ---");
console.log("burn height now:", Number(simnet.burnBlockHeight), "| oracle last-block UNCHANGED:", lastBlock());
const stale = ctd();
console.log("STALE get-collateral-to-debt:", cvToString(stale.result), " <-- IDENTICAL ratio, STILL valid true: no age rejection");

// quantified conditional loss
console.log("\n=== quantified conditional outcome ===");
console.log("  on-chain (stale $3.00): ratio = 100*300*100/150 = 20000 (=200%) -> valid=true -> liquidate() reverts ERR_CAN_NOT_LIQUIDATE [INSPECTED mgr L98]");
console.log("  real price $1.00:        ratio = 100*100*100/150 =  6666 (=66%)  -> under-collateralized; collateral value $100 < debt $150");
console.log("  => locked bad debt = debt - real collateral value = 150 - 100 = 50 USDA per vault (scales with vault size + price move)");
console.log("  CONDITIONAL on a SUSTAINED oracle stall (see #1) across the price move — escapable on Stacks' miner-ordered mempool, so NOT a guaranteed exploit.");

const freshValid = cvToString(fresh.result).includes("valid true)");
const staleValid = cvToString(stale.result).includes("valid true)");
const same = cvToString(fresh.result) === cvToString(stale.result);
console.log(`\n=== RESULT === [${freshValid && staleValid && same ? "PASS" : "FAIL"}] consumer uses a 500-block-stale price identically to a fresh one — NO staleness gate [EXECUTED]`);
