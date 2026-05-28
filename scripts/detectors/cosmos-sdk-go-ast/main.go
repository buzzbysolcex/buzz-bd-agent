// Detector #129 — Cosmos SDK Go AST surface mapper
//
// Walks a Go project directory, parses each .go file with go/parser, and
// emits structured findings on Cosmos SDK + Tendermint patterns relevant
// to bug-bounty hunting (validator surfaces, message handlers, BeginBlocker/
// EndBlocker hooks, governance params, cross-module keeper references,
// bech32 address handling, Tendermint evidence, slashing, plus Heimdall-
// specific checkpoint + state-sync hints).
//
// Output: JSON to stdout. Format:
//
//	{
//	  "target": "<dir>",
//	  "files_scanned": N,
//	  "files_skipped": M,
//	  "findings": [
//	    {"id": "C129-KEEPER", "file": "path", "line": 42, "name": "MyKeeper"},
//	    ...
//	  ],
//	  "summary": {"C129-IMPORT": 3, "C129-KEEPER": 5, ...},
//	  "is_cosmos_sdk": true,
//	  "elapsed_ms": 42
//	}
//
// USAGE:
//
//	go run main.go --path /path/to/heimdall-v2 [--json] [--include-tests]
//
// AUTHORITY: Operator directive 2026-05-28 (Sherlock x Polygon Heimdall v2
// prep, CRITICAL PATH to lift Doctrine #36 P-floor binding before Jun 15).
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
	IDImport       = "C129-IMPORT"        // Cosmos SDK import present (gate signal)
	IDKeeper       = "C129-KEEPER"        // Type ending in Keeper with state fields
	IDMsg          = "C129-MSG"           // sdk.Msg implementer
	IDHandler      = "C129-HANDLER"       // (ctx sdk.Context, msg ...) handler
	IDBeginBlock   = "C129-BEGIN"         // BeginBlocker hook
	IDEndBlock     = "C129-END"           // EndBlocker hook
	IDParamSet     = "C129-PARAM-SET"     // k.SetParams write
	IDParamGet     = "C129-PARAM-GET"     // k.GetParams read
	IDCrossModule  = "C129-CROSS-MODULE"  // Keeper.<Other>Keeper field ref
	IDBech32       = "C129-BECH32"        // sdk.AccAddressFromBech32 / ValAddressFromBech32
	IDEvidence     = "C129-EVIDENCE"      // cometbft evidence imports / types
	IDSlash        = "C129-SLASH"         // .Slash( call (slashing or staking)
	IDCheckpoint   = "C129-CHECKPOINT"    // Heimdall-specific checkpoint heuristic
	IDStateSync    = "C129-STATESYNC"     // Heimdall-Bor state-sync heuristic
	IDGovProposal  = "C129-GOV-PROPOSAL"  // gov.Keeper.SubmitProposal calls
	IDInvariant    = "C129-INVARIANT"     // RegisterInvariants / AssertInvariants
)

type finding struct {
	ID   string `json:"id"`
	File string `json:"file"`
	Line int    `json:"line"`
	Name string `json:"name,omitempty"`
	Note string `json:"note,omitempty"`
}

type report struct {
	Target       string         `json:"target"`
	FilesScanned int            `json:"files_scanned"`
	FilesSkipped int            `json:"files_skipped"`
	Findings     []finding      `json:"findings"`
	Summary      map[string]int `json:"summary"`
	IsCosmosSDK  bool           `json:"is_cosmos_sdk"`
	ElapsedMs    int64          `json:"elapsed_ms"`
}

var (
	flagPath        = flag.String("path", ".", "Project root to scan")
	flagJSON        = flag.Bool("json", false, "Emit JSON only (no human-readable summary)")
	flagIncludeTest = flag.Bool("include-tests", false, "Include _test.go files (default skip)")
)

// Skipped directory names — never recurse into these.
var skipDirs = map[string]bool{
	"vendor":       true,
	"third_party":  true,
	"node_modules": true,
	".git":         true,
	"build":        true,
	"dist":         true,
	"docs":         true,
}

// Cosmos SDK import substrings — any of these in an import path = Cosmos SDK gate hit.
var cosmosImports = []string{
	"github.com/cosmos/cosmos-sdk",
	"cosmossdk.io/",
	"github.com/cometbft/cometbft",
	"github.com/tendermint/tendermint",
}

// Cross-module keeper field name pattern: any Keeper struct field ending in `Keeper`.
var crossModuleKeeperRe = regexp.MustCompile(`^[A-Z][A-Za-z0-9]*Keeper$`)

// Heimdall-specific function-name heuristics.
var checkpointRe = regexp.MustCompile(`(?i)^(submit|validate|propose|ack|noack)?check[Pp]oint|^heimdall.*submit`)
var stateSyncRe = regexp.MustCompile(`(?i)state.?sync|statesyncer`)
var bech32Re = regexp.MustCompile(`(?:AccAddress|ValAddress|ConsAddress)FromBech32`)

func main() {
	flag.Parse()
	start := time.Now()

	rep := &report{
		Target:   *flagPath,
		Findings: []finding{},
		Summary:  map[string]int{},
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
		scanFile(path, rep)
		return nil
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL walk: %v\n", err)
		os.Exit(2)
	}

	// Finalize summary + Cosmos SDK gate
	rep.IsCosmosSDK = rep.Summary[IDImport] > 0
	rep.ElapsedMs = time.Since(start).Milliseconds()

	// Sort findings for stable output
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

func scanFile(path string, rep *report) {
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
	if err != nil {
		rep.FilesSkipped++
		return
	}
	rep.FilesScanned++

	// Pass 1: imports → C129-IMPORT + C129-EVIDENCE (cometbft evidence)
	for _, imp := range file.Imports {
		v := strings.Trim(imp.Path.Value, `"`)
		for _, prefix := range cosmosImports {
			if strings.HasPrefix(v, prefix) {
				record(rep, IDImport, fset, imp.Pos(), v, "")
				break
			}
		}
		if strings.Contains(v, "cometbft/cometbft/types") || strings.Contains(v, "tendermint/types") {
			record(rep, IDEvidence, fset, imp.Pos(), v, "tendermint/cometbft types import")
		}
	}

	// Pass 2: type declarations → Keeper structs + Msg types + cross-module keeper fields
	for _, decl := range file.Decls {
		gen, ok := decl.(*ast.GenDecl)
		if !ok || gen.Tok != token.TYPE {
			continue
		}
		for _, spec := range gen.Specs {
			ts, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}
			name := ts.Name.Name
			if strings.HasSuffix(name, "Keeper") && name != "Keeper" {
				record(rep, IDKeeper, fset, ts.Pos(), name, "type ends in Keeper")
			}
			if strings.HasPrefix(name, "Msg") && name != "Msg" {
				// Heuristic: types starting with Msg are likely sdk.Msg request shapes
				record(rep, IDMsg, fset, ts.Pos(), name, "msg request shape")
			}
			// Inspect struct fields for cross-module keeper references
			if st, ok := ts.Type.(*ast.StructType); ok && st.Fields != nil {
				for _, field := range st.Fields.List {
					if len(field.Names) == 0 {
						continue
					}
					for _, fname := range field.Names {
						if crossModuleKeeperRe.MatchString(fname.Name) && name != fname.Name {
							record(rep, IDCrossModule, fset, fname.Pos(), name+"."+fname.Name, "cross-module keeper field")
						}
					}
				}
			}
		}
	}

	// Pass 3: function declarations → handlers + BeginBlocker/EndBlocker + Heimdall heuristics + invariants
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		name := fn.Name.Name

		// BeginBlocker / EndBlocker
		switch name {
		case "BeginBlocker", "BeginBlock":
			record(rep, IDBeginBlock, fset, fn.Pos(), name, "block-start hook")
		case "EndBlocker", "EndBlock":
			record(rep, IDEndBlock, fset, fn.Pos(), name, "block-end hook")
		case "RegisterInvariants", "AllInvariants":
			record(rep, IDInvariant, fset, fn.Pos(), name, "invariant registration")
		}

		// Heimdall-specific heuristics
		if checkpointRe.MatchString(name) {
			record(rep, IDCheckpoint, fset, fn.Pos(), name, "checkpoint-related fn (heuristic)")
		}
		if stateSyncRe.MatchString(name) {
			record(rep, IDStateSync, fset, fn.Pos(), name, "state-sync-related fn (heuristic)")
		}

		// Message handler heuristic: (k <Keeper>) Name(ctx sdk.Context, msg *Msg<X>) (*Msg<X>Response, error)
		if isMsgHandler(fn) {
			record(rep, IDHandler, fset, fn.Pos(), name, "(ctx, msg) handler")
		}
	}

	// Pass 4: walk body for call expressions — SetParams/GetParams, .Slash(, *FromBech32, SubmitProposal
	ast.Inspect(file, func(n ast.Node) bool {
		call, ok := n.(*ast.CallExpr)
		if !ok {
			return true
		}
		sel, ok := call.Fun.(*ast.SelectorExpr)
		if !ok {
			return true
		}
		sname := sel.Sel.Name
		switch sname {
		case "SetParams":
			record(rep, IDParamSet, fset, call.Pos(), sname, "param write")
		case "GetParams":
			record(rep, IDParamGet, fset, call.Pos(), sname, "param read")
		case "Slash":
			record(rep, IDSlash, fset, call.Pos(), sname, "slashing call")
		case "SubmitProposal":
			record(rep, IDGovProposal, fset, call.Pos(), sname, "gov SubmitProposal")
		default:
			if bech32Re.MatchString(sname) {
				record(rep, IDBech32, fset, call.Pos(), sname, "bech32 address parse")
			}
		}
		return true
	})
}

// isMsgHandler — heuristic: receiver-method whose first arg is sdk.Context and second is *Msg<X>.
func isMsgHandler(fn *ast.FuncDecl) bool {
	if fn.Recv == nil || fn.Type == nil || fn.Type.Params == nil {
		return false
	}
	params := fn.Type.Params.List
	if len(params) < 2 {
		return false
	}
	if !isSdkContext(params[0].Type) {
		return false
	}
	// Second arg should look like *Msg<Something>
	star, ok := params[1].Type.(*ast.StarExpr)
	if !ok {
		// Could be a non-pointer Msg type
		if ident, ok := params[1].Type.(*ast.Ident); ok && strings.HasPrefix(ident.Name, "Msg") {
			return true
		}
		return false
	}
	if ident, ok := star.X.(*ast.Ident); ok && strings.HasPrefix(ident.Name, "Msg") {
		return true
	}
	return false
}

// isSdkContext — matches `sdk.Context`, `types.Context`, or bare `Context`.
func isSdkContext(e ast.Expr) bool {
	switch t := e.(type) {
	case *ast.SelectorExpr:
		if ident, ok := t.X.(*ast.Ident); ok {
			if (ident.Name == "sdk" || ident.Name == "types") && t.Sel.Name == "Context" {
				return true
			}
		}
	case *ast.Ident:
		if t.Name == "Context" {
			return true
		}
	}
	return false
}

func record(rep *report, id string, fset *token.FileSet, pos token.Pos, name, note string) {
	p := fset.Position(pos)
	rep.Findings = append(rep.Findings, finding{
		ID:   id,
		File: p.Filename,
		Line: p.Line,
		Name: name,
		Note: note,
	})
	rep.Summary[id]++
}

func emitHumanSummary(rep *report) {
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintf(os.Stderr, "=== C129 Cosmos SDK Go AST surface map ===\n")
	fmt.Fprintf(os.Stderr, "target: %s\n", rep.Target)
	fmt.Fprintf(os.Stderr, "files scanned: %d  skipped: %d  elapsed: %dms\n",
		rep.FilesScanned, rep.FilesSkipped, rep.ElapsedMs)
	fmt.Fprintf(os.Stderr, "is_cosmos_sdk: %v\n", rep.IsCosmosSDK)
	if len(rep.Summary) == 0 {
		fmt.Fprintln(os.Stderr, "no Cosmos SDK / Tendermint / Heimdall signatures detected")
		return
	}
	keys := make([]string, 0, len(rep.Summary))
	for k := range rep.Summary {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	fmt.Fprintln(os.Stderr, "signature counts:")
	for _, k := range keys {
		fmt.Fprintf(os.Stderr, "  %-22s  %d\n", k, rep.Summary[k])
	}
}
