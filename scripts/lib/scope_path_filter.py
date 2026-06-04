#!/usr/bin/env python3
"""Canonical path-based scope filter — test/mock/shim/devnet/script = OUT OF SCOPE by construction.

Authority: Ogie msg 8149 (2026-06-04), Doctrine #48. Origin: Watchman E.1 flagged
`base/base .../DevnetSwapRouterShim.sol:93 quoteExactInput` as a candidate — a DEVNET test
shim (simplified mock for local testing, not production, no funds, not deployed) = FALSE POSITIVE.

THE RULE: non-production scaffolding (test / mock / shim / devnet / script / example / fixture)
is NEVER a real finding. Apply this filter BEFORE any flag at every surfacing layer
(Watchman, Gate-0, V6 detectors). This module is the SINGLE SOURCE OF TRUTH — import it,
do not re-hardcode the list.

Companion: #45 cap-trap filter (don't surface dense/blue-chip/contest-combed REPOS as hunt
targets) is enforced separately by thin-pool-discovery-scorer.py (is_combed -> DENSE +
validation gate) and clarity-deploy-watch.py classify() (DENSE_DEMOTE fold). This module is
the PATH dimension; that is the REPO dimension. Both run before a candidate is surfaced.
"""
import re

# Non-production directory segments (operator's list + obvious siblings). Vendored dirs
# (lib/ interfaces/ certora/ forge-std/ foundry_tests/) are handled by HE-03b separately.
OOS_DIR_SEGMENTS = frozenset({
    "test", "tests", "test-utils", "testutils",
    "mock", "mocks",
    "devnet",
    "script", "scripts",
    "example", "examples",
    "fixture", "fixtures",
})

# Non-production filename markers. Case-SENSITIVE on the PascalCase marker so production
# names that merely contain the lowercase substring (Contest, Attestation, Latest, Manifest)
# are NOT excluded — only capitalized Test/Mock/Shim tokens are.
OOS_FILE_MARKERS = (
    re.compile(r"[Ss]him\.sol$"),                              # *Shim.sol (the DevnetSwapRouterShim anchor)
    re.compile(r"\.t\.sol$", re.I),                            # Foundry test files
    re.compile(r"\.s\.sol$", re.I),                            # Foundry script files
    re.compile(r"(?:^|[A-Za-z0-9._/-])(Test|Mock|Shim)(?:[A-Z._-]|s?\.sol$|$)"),  # *Test*/*Mock*/*Shim* PascalCase
)

_SEG = re.compile(r"[\\/]")


def is_out_of_scope_path(path):
    """Return (True, reason) if `path` is non-production-by-construction, else (False, None).

    Accepts a path, a `path:line` string, or a descriptive component containing a path.
    Directory segments are matched case-insensitively; filename markers keep original case
    (the PascalCase Test/Mock/Shim convention is the signal).
    """
    if not path:
        return (False, None)
    raw = str(path).split(":", 1)[0].replace("\\", "/").strip()
    segs = [s for s in _SEG.split(raw) if s]
    for s in segs:
        if s.lower() in OOS_DIR_SEGMENTS:
            return (True, "path segment '%s/' = non-production scaffolding (Doctrine #48)" % s.lower())
    fname = segs[-1] if segs else raw
    for rx in OOS_FILE_MARKERS:
        if rx.search(fname):
            return (True, "filename '%s' matches non-production marker /%s/ (Doctrine #48)" % (fname, rx.pattern))
    return (False, None)


if __name__ == "__main__":
    # Self-test (detector-pr-template: positive + negative fixtures, run before wiring).
    POSITIVE = [
        "crates/utilities/test-utils/src/DevnetSwapRouterShim.sol:93",  # the anchor FP
        "contracts/mocks/MockOracle.sol",
        "test/Foo.t.sol",
        "script/Deploy.s.sol",
        "src/devnet/Faucet.sol",
        "packages/examples/Demo.sol",
        "test/fixtures/Data.sol",
        "TokenTest.sol",
        "FooMock.sol",
    ]
    NEGATIVE = [
        "src/facility/Facility.sol:254",
        "contracts/Vault.sol",
        "src/request/Request.sol",
        "core/Pool.sol",
        "src/Contest.sol",       # contains lowercase 'test' — must NOT match
        "src/Attestation.sol",   # contains lowercase 'test' — must NOT match
        "src/Latest.sol",        # contains lowercase 'test' — must NOT match
        "src/Manifest.sol",      # contains lowercase 'est' — must NOT match
        "",  # empty -> not OOS
    ]
    ok = True
    for p in POSITIVE:
        oos, reason = is_out_of_scope_path(p)
        if not oos:
            print("FAIL (expected OOS):", p); ok = False
        else:
            print("OOS  ✓", p, "::", reason)
    for p in NEGATIVE:
        oos, reason = is_out_of_scope_path(p)
        if oos:
            print("FAIL (expected in-scope):", p, "::", reason); ok = False
        else:
            print("IN   ✓", p or "<empty>")
    print("\nSELF-TEST", "PASS" if ok else "FAIL")
    raise SystemExit(0 if ok else 1)
