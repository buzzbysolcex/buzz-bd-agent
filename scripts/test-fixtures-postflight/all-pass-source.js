// Mock subagent deliverable #1 — source file (all-pass fixture)
// Synthesized fixture: simulates a real source file the subagent shipped.
// Bytes > 0; shape OK (any text content); included in the all-pass manifest.

function exampleHandler(input) {
  return { ok: true, payload: input };
}

module.exports = { exampleHandler };
