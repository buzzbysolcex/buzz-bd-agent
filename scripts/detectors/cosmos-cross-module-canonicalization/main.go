// Detector #137 — Cross-module canonicalization bypass scanner
//
// Cosmos SDK / Heimdall family. Consumes the C129-CROSS-MODULE surface
// emitted by detector #129 (cosmos-sdk-go-ast) and walks AST + line text
// to flag write/read paths that bypass another module's canonical accessor.
//
// Why this class of bug is high-value on Heimdall v2 and Cosmos SDK chains:
// multi-module state (checkpoints, topups, clerk state, bank balances) is
// supposed to be mutated only through the owning module's keeper, so the
// owner's Validate / param-space normalization / event emission runs. When
// cross-module callers skip those wrappers — direct KVStore writes, struct
// literals, raw byte casts on bech32 — invariants the owner module enforces
// can be silently violated.
//
// Output: JSON to stdout, same shape as detector #129 (target, files_scanned,
// findings[], summary, elapsed_ms). Findings are sortable + diffable.
//
// USAGE:
//
//	go run main.go --path /path/to/heimdall-v2 [--from-c129 path/c129.json]
//	    [--json] [--include-tests] [--scope-files-only]
//
// --from-c129    consume detector #129 JSON output. Findings inside files
//                that #129 flagged as C129-CROSS-MODULE get the
//                `cross_module_gate=true` annotation, boosting confidence.
// --scope-files-only  restrict scan to files that #129 flagged. Requires
//                     --from-c129.
//
// AUTHORITY: Operator directive 2026-05-28 msg 7956 (build #137 in parallel
// with Wormhole NTT G2 PoCs, Sherlock x Polygon Heimdall v2 prep —
// critical-path before Jun 15 contest window).
//
// COMPANION: detector #129 cosmos-sdk-go-ast (../cosmos-sdk-go-ast/main.go).
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// Finding ids — keep in sync with brain/Sherlock-Polygon-Heimdall-Prep.md §3.
const (
	IDDirectKVStore   = "C137-DIRECT-KVSTORE"    // ctx.KVStore(k.X.storeKey) cross-pkg
	IDCoinLiteral     = "C137-COIN-LITERAL"      // sdk.Coin{...} literal (skips NewCoin denom validation)
	IDAddrBytes       = "C137-ADDR-BYTES"        // .Bytes() on bech32 addr (skips canonical re-encode)
	IDCrossWrite      = "C137-CROSS-WRITE"       // k.<Other>Keeper.Field = ... direct field write
	IDValidateSkip    = "C137-VALIDATE-SKIP"     // cross-module call without .Validate()/.ValidateBasic()
	IDParamDirect     = "C137-PARAM-DIRECT"      // k.paramSpace.Set(ctx,...) bypass
	IDBech32PrefixRaw = "C137-BECH32-PREFIX-RAW" // hardcoded bech32 prefix string
	IDDecLiteral      = "C137-DEC-LITERAL"       // sdk.Dec{} literal vs NewDec
	IDIntCast         = "C137-INT-CAST"          // sdk.NewInt(int64(uint...)) overflow path
	IDConsumesC129    = "C137-CONSUMES-C129"     // file flagged by C129-CROSS-MODULE
)

type finding struct {
	ID              string `json:"id"`
	File            string `json:"file"`
	Line            int    `json:"line"`
	Name            string `json:"name,omitempty"`
	Note            string `json:"note,omitempty"`
	CrossModuleGate bool   `json:"cross_module_gate,omitempty"`
}

type report struct {
	Target           string         `json:"target"`
	FilesScanned     int            `json:"files_scanned"`
	FilesSkipped     int            `json:"files_skipped"`
	Findings         []finding      `json:"findings"`
	Summary          map[string]int `json:"summary"`
	FromC129         string         `json:"from_c129,omitempty"`
	ScopeFilesOnly   bool           `json:"scope_files_only"`
	C129FilesLoaded  int            `json:"c129_files_loaded"`
	ElapsedMs        int64          `json:"elapsed_ms"`
}

type c129Finding struct {
	ID   string `json:"id"`
	File string `json:"file"`
	Line int    `json:"line"`
}

type c129Report struct {
	Findings []c129Finding `json:"findings"`
}

var (
	flagPath        = flag.String("path", ".", "Project root to scan")
	flagFromC129    = flag.String("from-c129", "", "Consume detector #129 JSON output for cross-module gate signal")
	flagScopeOnly   = flag.Bool("scope-files-only", false, "Restrict scan to files flagged by C129-CROSS-MODULE (requires --from-c129)")
	flagJSON        = flag.Bool("json", false, "Emit JSON only (no human-readable summary)")
	flagIncludeTest = flag.Bool("include-tests", false, "Include _test.go files (default skip)")
)

var skipDirs = map[string]bool{
	"vendor":       true,
	"third_party":  true,
	"node_modules": true,
	".git":         true,
	"build":        true,
	"dist":         true,
	"docs":         true,
}

// Regex helpers — declared once, reused per file.
var (
	storeKeyRe   = regexp.MustCompile(`ctx\.KVStore\([a-zA-Z_][a-zA-Z0-9_]*\.([a-zA-Z_][a-zA-Z0-9_]*Keeper)\.storeKey\)`)
	crossKeeperRe = regexp.MustCompile(`^[A-Z][A-Za-z0-9]*Keeper$`)
	bech32PrefixRe = regexp.MustCompile(`"(heimdall(valoper|pub)?|cosmos(valoper|pub)?|matic(valoper|pub)?|polygon)"`)
	uintCastRe     = regexp.MustCompile(`(?:sdk|types|sdkmath)\.NewInt\s*\(\s*int64\s*\(\s*[a-zA-Z_][a-zA-Z0-9_]*\s*\)\s*\)`)
)

func main() {
	flag.Parse()
	start := time.Now()

	if *flagScopeOnly && *flagFromC129 == "" {
		fmt.Fprintln(os.Stderr, "FATAL: --scope-files-only requires --from-c129")
		os.Exit(1)
	}

	rep := &report{
		Target:         *flagPath,
		Findings:       []finding{},
		Summary:        map[string]int{},
		FromC129:       *flagFromC129,
		ScopeFilesOnly: *flagScopeOnly,
	}

	// Load C129 surface if requested.
	c129Files := map[string]bool{}
	if *flagFromC129 != "" {
		loadC129(*flagFromC129, c129Files, rep)
	}

	err := filepath.WalkDir(*flagPath, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if skipDirs[d.Name()] {
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		if !*flagIncludeTest && strings.HasSuffix(path, "_test.go") {
			rep.FilesSkipped++
			return nil
		}
		if *flagScopeOnly {
			abs, _ := filepath.Abs(path)
			if !c129Files[abs] && !c129Files[path] {
				rep.FilesSkipped++
				return nil
			}
		}
		scanFile(path, rep, c129Files)
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL walk: %v\n", err)
		os.Exit(2)
	}

	rep.ElapsedMs = time.Since(start).Milliseconds()

	sort.Slice(rep.Findings, func(i, j int) bool {
		if rep.Findings[i].File != rep.Findings[j].File {
			return rep.Findings[i].File < rep.Findings[j].File
		}
		return rep.Findings[i].Line < rep.Findings[j].Line
	})

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(rep); err != nil {
		fmt.Fprintf(os.Stderr, "FATAL encode: %v\n", err)
		os.Exit(3)
	}

	if !*flagJSON {
		emitHumanSummary(rep)
	}
}

func loadC129(path string, dest map[string]bool, rep *report) {
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "WARN: failed to read --from-c129 %s: %v\n", path, err)
		return
	}
	var c129 c129Report
	if err := json.Unmarshal(data, &c129); err != nil {
		fmt.Fprintf(os.Stderr, "WARN: failed to parse --from-c129 JSON: %v\n", err)
		return
	}
	for _, f := range c129.Findings {
		if f.ID == "C129-CROSS-MODULE" {
			dest[f.File] = true
			abs, _ := filepath.Abs(f.File)
			dest[abs] = true
		}
	}
	rep.C129FilesLoaded = len(dest)
}

func scanFile(path string, rep *report, c129Files map[string]bool) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		rep.FilesSkipped++
		return
	}
	rep.FilesScanned++

	// Determine cross-module gate signal for this file.
	abs, _ := filepath.Abs(path)
	crossModuleGate := c129Files[path] || c129Files[abs]
	if crossModuleGate {
		record(rep, IDConsumesC129, fset, file.Package, path, "file flagged by C129-CROSS-MODULE", true)
	}

	// Read raw bytes for regex-only passes (storeKey, bech32 prefix, int cast).
	raw, _ := os.ReadFile(path)
	rawText := string(raw)

	// Pass A: regex-only on raw text — direct KVStore + bech32 prefix + int cast.
	for _, m := range storeKeyRe.FindAllStringIndex(rawText, -1) {
		line := lineOf(rawText, m[0])
		record(rep, IDDirectKVStore, fset, token.NoPos, path, "ctx.KVStore(<Other>Keeper.storeKey) — cross-module raw KV access", crossModuleGate).withLine(line)
		// withLine is a no-op since record already encoded a finding; re-emit with line manually below
	}
	// Re-walk to inject lines for raw-regex hits (record() defaulted to file.Package line).
	patchLines(rep, IDDirectKVStore, storeKeyRe, rawText, path)

	patchLines(rep, IDBech32PrefixRaw, bech32PrefixRe, rawText, path)
	for _, m := range bech32PrefixRe.FindAllStringSubmatchIndex(rawText, -1) {
		_ = m
		line := lineOf(rawText, m[0])
		token := rawText[m[0]:m[1]]
		record(rep, IDBech32PrefixRaw, fset, 0, path, "hardcoded bech32 prefix "+token+" — config-driven preferred", crossModuleGate).withLine(line)
	}
	patchLines(rep, IDIntCast, uintCastRe, rawText, path)
	for _, m := range uintCastRe.FindAllStringIndex(rawText, -1) {
		line := lineOf(rawText, m[0])
		record(rep, IDIntCast, fset, 0, path, "sdk.NewInt(int64(x)) — verify x is bounded int64 to prevent overflow", crossModuleGate).withLine(line)
	}

	// Pass B: AST walk — composite literals + selector exprs + call exprs.
	ast.Inspect(file, func(n ast.Node) bool {
		switch x := n.(type) {

		case *ast.CompositeLit:
			// {sdk,types,sdkmath}.Coin{Denom: ..., Amount: ...} / .Dec{...}
			if sel, ok := x.Type.(*ast.SelectorExpr); ok {
				if id, ok := sel.X.(*ast.Ident); ok && isCosmosAlias(id.Name) {
					switch sel.Sel.Name {
					case "Coin":
						record(rep, IDCoinLiteral, fset, x.Pos(), path,
							id.Name+".Coin{} literal — use NewCoin(denom,amt) for denom regex validation", crossModuleGate)
					case "Dec":
						record(rep, IDDecLiteral, fset, x.Pos(), path,
							id.Name+".Dec{} literal — use NewDec / NewDecFromStr for precision-safe construction", crossModuleGate)
					}
				}
			}

		case *ast.CallExpr:
			// .Bytes() on a likely bech32 address.
			if sel, ok := x.Fun.(*ast.SelectorExpr); ok {
				if sel.Sel.Name == "Bytes" && len(x.Args) == 0 {
					if id, ok := sel.X.(*ast.Ident); ok {
						lname := strings.ToLower(id.Name)
						if strings.Contains(lname, "addr") || strings.HasSuffix(lname, "address") {
							record(rep, IDAddrBytes, fset, x.Pos(), path,
								id.Name+".Bytes() — verify canonical bech32 round-trip on cross-module reads", crossModuleGate)
						}
					}
				}
				// k.paramSpace.Set(...) direct call.
				if sel.Sel.Name == "Set" {
					if inner, ok := sel.X.(*ast.SelectorExpr); ok {
						if inner.Sel.Name == "paramSpace" || inner.Sel.Name == "paramstore" || inner.Sel.Name == "ps" {
							record(rep, IDParamDirect, fset, x.Pos(), path,
								"paramSpace/ps.Set(...) — confirm caller is module-owner; cross-module Set bypasses param-owner validation", crossModuleGate)
						}
					}
				}
			}
			// Cross-module call where arg of struct type lacks .Validate()/.ValidateBasic() upstream.
			// Heuristic: call like k.<Other>Keeper.<Method>(ctx, msg) where msg is a struct literal.
			if sel, ok := x.Fun.(*ast.SelectorExpr); ok {
				if inner, ok := sel.X.(*ast.SelectorExpr); ok {
					if crossKeeperRe.MatchString(inner.Sel.Name) {
						hasStructLit := false
						for _, a := range x.Args {
							if _, ok := a.(*ast.CompositeLit); ok {
								hasStructLit = true
							}
						}
						if hasStructLit {
							record(rep, IDValidateSkip, fset, x.Pos(), path,
								"cross-module call "+inner.Sel.Name+"."+sel.Sel.Name+" with inline struct literal — confirm Validate/ValidateBasic called upstream", crossModuleGate)
						}
					}
				}
			}

		case *ast.AssignStmt:
			// k.<Other>Keeper.<Field> = ... direct field assignment.
			for _, lhs := range x.Lhs {
				if sel, ok := lhs.(*ast.SelectorExpr); ok {
					if inner, ok := sel.X.(*ast.SelectorExpr); ok {
						if crossKeeperRe.MatchString(inner.Sel.Name) {
							record(rep, IDCrossWrite, fset, x.Pos(), path,
								"direct field write on "+inner.Sel.Name+"."+sel.Sel.Name+" — confirm owner module's Set<Field> not bypassed", crossModuleGate)
						}
					}
				}
			}
		}
		return true
	})
}

// finding-builder helper for chainable line patching from regex-only passes.
type findingRef struct {
	rep *report
	idx int
}

func (f *findingRef) withLine(line int) {
	if f == nil || f.rep == nil || f.idx < 0 || f.idx >= len(f.rep.Findings) {
		return
	}
	if line > 0 {
		f.rep.Findings[f.idx].Line = line
	}
}

func record(rep *report, id string, fset *token.FileSet, pos token.Pos, file string, note string, gate bool) *findingRef {
	line := 0
	if fset != nil && pos != token.NoPos && pos != 0 {
		line = fset.Position(pos).Line
	}
	rep.Findings = append(rep.Findings, finding{
		ID:              id,
		File:            file,
		Line:            line,
		Note:            note,
		CrossModuleGate: gate,
	})
	rep.Summary[id]++
	return &findingRef{rep: rep, idx: len(rep.Findings) - 1}
}

// patchLines re-walks regex-only findings and sets the .Line field for the
// latest emitted ones whose Line is still zero. It is conservative — it only
// patches findings of the given ID whose Line is currently zero, in the order
// they were emitted by the regex, in the file under scan.
func patchLines(rep *report, id string, re *regexp.Regexp, rawText, file string) {
	// Collect matches in order.
	matches := re.FindAllStringIndex(rawText, -1)
	if len(matches) == 0 {
		return
	}
	mi := 0
	for i := range rep.Findings {
		f := &rep.Findings[i]
		if f.ID != id || f.File != file || f.Line != 0 {
			continue
		}
		if mi >= len(matches) {
			break
		}
		f.Line = lineOf(rawText, matches[mi][0])
		mi++
	}
}

// isCosmosAlias recognizes common import aliases for Cosmos SDK types pkg.
// Typical: import sdk "github.com/cosmos/cosmos-sdk/types" (alias sdk)
// or import types "github.com/cosmos/cosmos-sdk/types" (default name types)
// or sdkmath "cosmossdk.io/math".
func isCosmosAlias(name string) bool {
	switch name {
	case "sdk", "types", "sdkmath", "math":
		return true
	}
	return false
}

func lineOf(s string, off int) int {
	if off < 0 || off > len(s) {
		return 0
	}
	return strings.Count(s[:off], "\n") + 1
}

func emitHumanSummary(rep *report) {
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "=== Detector #137 Cross-Module Canonicalization Bypass ===")
	fmt.Fprintf(os.Stderr, "Target:   %s\n", rep.Target)
	fmt.Fprintf(os.Stderr, "Scanned:  %d files\n", rep.FilesScanned)
	fmt.Fprintf(os.Stderr, "Skipped:  %d files\n", rep.FilesSkipped)
	if rep.FromC129 != "" {
		fmt.Fprintf(os.Stderr, "C129 src: %s (%d files loaded)\n", rep.FromC129, rep.C129FilesLoaded)
	}
	fmt.Fprintf(os.Stderr, "Elapsed:  %d ms\n", rep.ElapsedMs)
	fmt.Fprintln(os.Stderr, "")
	if len(rep.Summary) == 0 {
		fmt.Fprintln(os.Stderr, "No findings.")
		return
	}
	keys := make([]string, 0, len(rep.Summary))
	for k := range rep.Summary {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(os.Stderr, "  %-25s  %d\n", k, rep.Summary[k])
	}
}
