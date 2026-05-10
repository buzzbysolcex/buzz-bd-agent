// Mock subagent deliverable #2 — test file (all-pass fixture)
// Synthesized fixture: pretends to be a Jest/Mocha test harness.

const assert = require("assert");
const { exampleHandler } = require("./all-pass-source.js");

function run() {
  const r = exampleHandler({ a: 1 });
  assert.strictEqual(r.ok, true);
  console.log("all-pass-test: PASS");
}

if (require.main === module) run();
