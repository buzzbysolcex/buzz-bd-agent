# Filecoin Scope Triage Query — Operator Paste-Ready

> Status: DRAFTED 2026-05-25 — for operator to post on Immunefi program Q&A or message Filecoin triage directly.
> Authority: Veda OOS lesson + Standing-Intake Step 5.2 pre-flight scope check.
> Context: Gate 1 surfaced LEAD-1 (VERIFIED, paste-ready drafted) + LEAD-2 (FORECLOSED, mainnet never ran broken enum). Both leads live inside `filecoin-project/builtin-actors` — the Rust WASM actor set Lotus deploys via the `_load` system actor. Before sending the LEAD-1 paste-ready, we need explicit triage confirmation that `builtin-actors` is in-scope transitively via the in-scope Lotus miner node.

---

## OPERATOR PASTE-READY QUESTION

> **Subject:** Scope clarification — `filecoin-project/builtin-actors` in-scope transitively via Lotus?
>
> Hi Filecoin triage team,
>
> I'm preparing a submission against Lotus and want to confirm scope before I file. The Immunefi program page lists the Lotus miner / node Go implementation as in-scope, but the finding I have is in the Rust WASM actor set at `github.com/filecoin-project/builtin-actors` — specifically a serialization path in the system actors that Lotus loads at chain genesis (via the `_load` system actor) and executes inside its FVM runtime on every applicable epoch.
>
> The `builtin-actors` repo is not separately listed on the program page, but the WASM produced by it ships inside the Lotus binary distribution at the canonical genesis CIDs and is the canonical execution payload of every mainnet block — the finding is reachable from an unmodified mainnet Lotus node with no extra dependencies and triggers on consensus-critical state transitions.
>
> Can you confirm one of:
>
> **(a)** `builtin-actors` is **in-scope transitively** via the Lotus in-scope listing (because Lotus loads + executes builtin-actors WASM as its canonical execution payload), and I should file the finding against the Lotus program.
>
> **(b)** `builtin-actors` is **explicitly out-of-scope** despite the Lotus dependency, and I should not file.
>
> **(c)** `builtin-actors` is in-scope but as a **separate sub-target** under the Filecoin program, and I should structure the submission accordingly (with the builtin-actors commit SHA as the canonical reference).
>
> Happy to provide additional repo path / commit SHA / FIP reference offline if useful for the scope determination.
>
> Thanks!

---

## INTERNAL NOTES (do not paste, operator reference only)

- **Why this matters (Veda OOS lesson):** When Veda Manager was in-scope but the Decoder helper library was OOS, our prior submission was rejected as out-of-scope despite the finding being reachable from the in-scope Manager. Same risk pattern here: Lotus in-scope, builtin-actors arguably reachable-but-not-listed.
- **Why we expect (a):** Lotus is meaningless without the builtin-actors WASM — it's not a runtime dependency, it IS the execution payload. The same way the EVM Yellow Paper opcodes are in-scope for any EVM client, the FVM actor set is in-scope for any FVM client that ships them. The Filecoin team has historically treated builtin-actors as part of the consensus surface.
- **What we'd do under (b):** Foreclose LEAD-1 + LEAD-2 with explicit Filecoin OOS rationale. File the methodology learning to `brain/Operator-Brief-Reconciliation.md` axis 3 (scope reconciliation) — fourth canonical anchor for the family.
- **What we'd do under (c):** Restructure LEAD-1 paste-ready with the builtin-actors commit SHA as the canonical ref + Lotus version that ships it as the reachability proof. Cleaner submission either way.

---

## POST CHANNEL OPTIONS

1. **Immunefi public Q&A on the program page** — fastest, public, sets a precedent for future submitters (useful brain-compound for Lane 5 scope monitor)
2. **Direct DM to Immunefi triage team** — private, faster turnaround
3. **GitHub Discussions on filecoin-project/community** — public, slowest, but builds reputational signal

Recommendation: **Option 1 (Immunefi public Q&A)** — Lane 5 scope monitor can ingest the answer as a future scope-clarification training datum, and the public answer protects future Buzz submissions against scope-ambiguity rejection.

---

_Filecoin Scope Triage Query | v1.0 | 2026-05-25 | Drafted for operator paste-ready post on Immunefi program Q&A. Lane 5 ingest target post-answer._
