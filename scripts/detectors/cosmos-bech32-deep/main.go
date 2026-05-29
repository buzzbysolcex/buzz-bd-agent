// Detector #165 — Cosmos bech32 deep scanner
//
// Cosmos SDK / Heimdall family. Flags bech32 / address-canonicalization
// hazards that bite consensus + validator code:
//
//   C165-RAW-BECH32        direct bech32.Decode / Encode / ConvertBits — bypasses
//                          the sdk canonical Acc/Val/ConsAddress round-trip.
//   C165-BECH32-STRCMP     address compared via .String() equality (==/!=) — two
//                          non-canonical string forms (or a valoper vs acc string)
//                          can compare unequal/equal incorrectly; compare BYTES.
//   C165-ADDR-FROM-BYTES   sdk.{Acc,Val,Cons}Address(x) cast from raw bytes with no
//                          length (20/32) validation nearby — malformed addr.
//   C165-FROMBECH32-NOPREFIX  {Acc,Val,Cons}AddressFromBech32 in a function that
//                          never checks the HRP/prefix — cross-prefix confusion
//                          (a valoper string accepted where an acc addr is meant).
//   C165-HARDCODED-HRP     hardcoded bech32 HRP/prefix literal — config-driven
//                          prefixes preferred; hardcoding breaks on chain re-config.
//   C165-CONSUMES-C129     file flagged by detector #129 (esp. C129-BECH32).
//
// Why it matters on Heimdall v2: validator/proposer addresses cross the
// Heimdall↔Bor↔Ethereum boundary; a non-canonical or cross-prefix address
// comparison can mis-attribute votes, checkpoints, or slashing.
//
// Output: JSON to stdout (same shape as #129/#137/#138).
//
// USAGE:
//   go run main.go --path /path/to/heimdall-v2 [--from-c129 c129.json]
//       [--json] [--include-tests] [--scope-files-only]
//
// AUTHORITY: Ogie msg 7976 — Sherlock x Polygon Heimdall v2 prep, detector
// priming (critical-path before Jun 15). Companion: #129, #137, #138.
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

const (
	IDRawBech32      = "C165-RAW-BECH32"
	IDBech32StrCmp   = "C165-BECH32-STRCMP"
	IDAddrFromBytes  = "C165-ADDR-FROM-BYTES"
	IDFromBech32NoPx = "C165-FROMBECH32-NOPREFIX"
	IDHardcodedHRP   = "C165-HARDCODED-HRP"
	IDConsumesC129   = "C165-CONSUMES-C129"
)

type finding struct {
	ID       string `json:"id"`
	File     string `json:"file"`
	Line     int    `json:"line"`
	Func     string `json:"func,omitempty"`
	Note     string `json:"note,omitempty"`
	C129Gate bool   `json:"c129_gate,omitempty"`
}

type report struct {
	Target          string         `json:"target"`
	FilesScanned    int            `json:"files_scanned"`
	FilesSkipped    int            `json:"files_skipped"`
	Findings        []finding      `json:"findings"`
	Summary         map[string]int `json:"summary"`
	FromC129        string         `json:"from_c129,omitempty"`
	ScopeFilesOnly  bool           `json:"scope_files_only"`
	C129FilesLoaded int            `json:"c129_files_loaded"`
	ElapsedMs       int64          `json:"elapsed_ms"`
}

type c129Finding struct {
	ID   string `json:"id"`
	File string `json:"file"`
}
type c129Report struct {
	Findings []c129Finding `json:"findings"`
}

var (
	flagPath        = flag.String("path", ".", "Project root to scan")
	flagFromC129    = flag.String("from-c129", "", "Consume detector #129 JSON for bech32 surface gate")
	flagScopeOnly   = flag.Bool("scope-files-only", false, "Restrict scan to files flagged by #129 (requires --from-c129)")
	flagJSON        = flag.Bool("json", false, "Emit JSON only")
	flagIncludeTest = flag.Bool("include-tests", false, "Include _test.go files (default skip)")
)

var skipDirs = map[string]bool{
	"vendor": true, "third_party": true, "node_modules": true,
	".git": true, "build": true, "dist": true, "docs": true,
}

var (
	rawBech32Re   = regexp.MustCompile(`\bbech32\.(Decode|Encode|ConvertBits|DecodeAndConvert|ConvertAndEncode)\b`)
	hardcodedHRPRe = regexp.MustCompile(`"(heimdall|cosmos|matic|polygon|bor)(valoperpub|valconspub|valoper|valcons|pub)?"`)
	addrNameRe     = regexp.MustCompile(`(?i)addr|address|signer|proposer|validator|delegator|operator|owner|recipient|sender`)
	// NOTE: must NOT include bare "bech32" — that would match the
	// AddressFromBech32 calls themselves (the thing being guarded, not the
	// guard). "Bech32Prefix" still matches via "prefix".
	prefixCheckRe  = regexp.MustCompile(`(?i)prefix|hrp|verifyaddressformat|getconfig`)
	fromBech32Re   = regexp.MustCompile(`(Acc|Val|Cons)?AddressFromBech32`)
	addrCastRe     = regexp.MustCompile(`^(Acc|Val|Cons)Address$`)
)

func main() {
	flag.Parse()
	start := time.Now()
	if *flagScopeOnly && *flagFromC129 == "" {
		fmt.Fprintln(os.Stderr, "FATAL: --scope-files-only requires --from-c129")
		os.Exit(1)
	}
	rep := &report{Target: *flagPath, Findings: []finding{}, Summary: map[string]int{}, FromC129: *flagFromC129, ScopeFilesOnly: *flagScopeOnly}

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
		if strings.Contains(f.ID, "BECH32") || strings.HasPrefix(f.ID, "C129-KEEPER") || strings.HasPrefix(f.ID, "C129-HANDLER") {
			dest[f.File] = true
			abs, _ := filepath.Abs(f.File)
			dest[abs] = true
		}
	}
	rep.C129FilesLoaded = len(dest)
}

func record(rep *report, id, file string, line int, fn, note string, gate bool) {
	rep.Findings = append(rep.Findings, finding{ID: id, File: file, Line: line, Func: fn, Note: note, C129Gate: gate})
	rep.Summary[id]++
}

func lineOf(s string, off int) int {
	if off < 0 || off > len(s) {
		return 0
	}
	return strings.Count(s[:off], "\n") + 1
}

// addrLikeStringCall reports whether e is `<addr-like>.String()`.
func addrLikeStringCall(e ast.Expr) bool {
	call, ok := e.(*ast.CallExpr)
	if !ok || len(call.Args) != 0 {
		return false
	}
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok || sel.Sel.Name != "String" {
		return false
	}
	// receiver identifier name looks address-like
	switch r := sel.X.(type) {
	case *ast.Ident:
		return addrNameRe.MatchString(r.Name)
	case *ast.SelectorExpr:
		return addrNameRe.MatchString(r.Sel.Name)
	case *ast.CallExpr:
		if s2, ok := r.Fun.(*ast.SelectorExpr); ok {
			return addrNameRe.MatchString(s2.Sel.Name)
		}
	}
	return false
}

func scanFile(path string, rep *report, c129Files map[string]bool) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, 0)
	if err != nil {
		rep.FilesSkipped++
		return
	}
	rep.FilesScanned++

	abs, _ := filepath.Abs(path)
	gate := c129Files[path] || c129Files[abs]
	if gate {
		record(rep, IDConsumesC129, path, fset.Position(file.Package).Line, "", "file flagged by detector #129 (bech32/keeper surface)", true)
	}

	raw, _ := os.ReadFile(path)
	rawText := string(raw)

	// Regex passes — raw bech32 + hardcoded HRP literals.
	for _, m := range rawBech32Re.FindAllStringIndex(rawText, -1) {
		record(rep, IDRawBech32, path, lineOf(rawText, m[0]), "", "direct bech32.* call — prefer sdk Acc/Val/ConsAddress canonical round-trip", gate)
	}
	for _, m := range hardcodedHRPRe.FindAllStringIndex(rawText, -1) {
		tok := rawText[m[0]:m[1]]
		record(rep, IDHardcodedHRP, path, lineOf(rawText, m[0]), "", "hardcoded bech32 HRP/prefix "+tok+" — config-driven prefix preferred", gate)
	}

	// AST passes — per-function FromBech32-no-prefix + file-wide strcmp + addr-cast.
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Body == nil {
			continue
		}
		fname := ""
		if fn.Name != nil {
			fname = fn.Name.Name
		}
		var fromBech32Sites []token.Pos
		hasPrefixCheck := false

		ast.Inspect(fn.Body, func(n ast.Node) bool {
			switch x := n.(type) {
			case *ast.BinaryExpr:
				if x.Op == token.EQL || x.Op == token.NEQ {
					if addrLikeStringCall(x.X) || addrLikeStringCall(x.Y) {
						record(rep, IDBech32StrCmp, path, fset.Position(x.Pos()).Line, fname,
							"address compared via .String() equality — compare canonical Bytes()/Equals() instead (non-canonical/cross-prefix string risk)", gate)
					}
				}
			case *ast.CallExpr:
				if sel, ok := x.Fun.(*ast.SelectorExpr); ok {
					if fromBech32Re.MatchString(sel.Sel.Name) {
						fromBech32Sites = append(fromBech32Sites, x.Pos())
					}
					if prefixCheckRe.MatchString(sel.Sel.Name) {
						hasPrefixCheck = true
					}
					// sdk.AccAddress(x) / sdk.ValAddress(x) cast from non-literal
					if addrCastRe.MatchString(sel.Sel.Name) && len(x.Args) == 1 {
						if _, isLit := x.Args[0].(*ast.BasicLit); !isLit {
							if _, isCall := x.Args[0].(*ast.CallExpr); !isCall { // skip FromBech32(...) results
								record(rep, IDAddrFromBytes, path, fset.Position(x.Pos()).Line, fname,
									sel.Sel.Name+"([]byte) cast with no length (20/32) validation nearby — verify VerifyAddressFormat / len check", gate)
							}
						}
					}
				}
				// bare AccAddress(x) (no selector) — same cast hazard
				if id, ok := x.Fun.(*ast.Ident); ok && addrCastRe.MatchString(id.Name) && len(x.Args) == 1 {
					if _, isLit := x.Args[0].(*ast.BasicLit); !isLit {
						if _, isCall := x.Args[0].(*ast.CallExpr); !isCall {
							record(rep, IDAddrFromBytes, path, fset.Position(x.Pos()).Line, fname,
								id.Name+"([]byte) cast with no length validation nearby", gate)
						}
					}
				}
			}
			return true
		})

		if len(fromBech32Sites) > 0 && !hasPrefixCheck {
			for _, p := range fromBech32Sites {
				record(rep, IDFromBech32NoPx, path, fset.Position(p).Line, fname,
					"AddressFromBech32 with no HRP/prefix check in the function — cross-prefix confusion (valoper vs acc) risk", gate)
			}
		}
	}
}

func emitHumanSummary(rep *report) {
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "=== Detector #165 Cosmos bech32 deep ===")
	fmt.Fprintf(os.Stderr, "Target:  %s\n", rep.Target)
	fmt.Fprintf(os.Stderr, "Scanned: %d files (skipped %d)\n", rep.FilesScanned, rep.FilesSkipped)
	if rep.FromC129 != "" {
		fmt.Fprintf(os.Stderr, "C129:    %s (%d files)\n", rep.FromC129, rep.C129FilesLoaded)
	}
	fmt.Fprintf(os.Stderr, "Elapsed: %d ms\n\n", rep.ElapsedMs)
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
		fmt.Fprintf(os.Stderr, "  %-26s %d\n", k, rep.Summary[k])
	}
}
