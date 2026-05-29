// Detector #138 — No-Overwrite-Guard scanner
//
// Cosmos SDK / Heimdall family. Flags state WRITES (`store.Set` / `k.Set*`)
// performed inside CREATE-semantic functions (Add / Create / New / Insert /
// Register / Submit / Append) that do NOT first check existence (Has / Exists
// / Get-then-found-check). On a create path, a missing existence guard means a
// caller can silently OVERWRITE committed state.
//
// Why this is high-value on Heimdall v2 / Cosmos SDK consensus chains:
//   - Checkpoint modules: AddCheckpoint / SetCheckpointBuffer that overwrite an
//     in-flight checkpoint can drop or replace a validator-signed checkpoint.
//   - Sequence / nonce state: a SetSequence/SetAck without a monotonic guard
//     lets an older value overwrite a newer one → replay / double-spend window.
//   - Validator records: an AddValidator that overwrites an existing validator
//     can reset power / jail state.
//
// Two sub-findings:
//   C138-SET-NO-HAS       Set in a create-semantic fn with no existence guard.
//   C138-CHECKPOINT-OVER  ^ where the Set target/fn references checkpoint /
//                         header / snapshot / buffer (consensus-critical).
//   C138-SEQ-NO-MONOTONIC Set on a sequence/nonce/index/ack/height target with
//                         no `>`/`>=` comparison in the function (no monotonic
//                         guard → backwards-overwrite).
//   C138-CONSUMES-C129    file was flagged by detector #129 (keeper/handler).
//
// Output: JSON to stdout, same shape as detectors #129/#137.
//
// USAGE:
//   go run main.go --path /path/to/heimdall-v2 [--from-c129 c129.json]
//       [--json] [--include-tests] [--scope-files-only]
//
// AUTHORITY: Ogie msg 7976 (Sherlock x Polygon Heimdall v2 prep, detector
// priming — critical-path before Jun 15 contest). Companion: detector #129
// cosmos-sdk-go-ast, #137 cross-module-canonicalization.
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
	IDSetNoHas      = "C138-SET-NO-HAS"
	IDCheckpointOver = "C138-CHECKPOINT-OVER"
	IDSeqNoMonotonic = "C138-SEQ-NO-MONOTONIC"
	IDConsumesC129   = "C138-CONSUMES-C129"
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
	flagFromC129    = flag.String("from-c129", "", "Consume detector #129 JSON output for keeper/handler gate signal")
	flagScopeOnly   = flag.Bool("scope-files-only", false, "Restrict scan to files flagged by #129 (requires --from-c129)")
	flagJSON        = flag.Bool("json", false, "Emit JSON only (no human-readable summary)")
	flagIncludeTest = flag.Bool("include-tests", false, "Include _test.go files (default skip)")
)

var skipDirs = map[string]bool{
	"vendor": true, "third_party": true, "node_modules": true,
	".git": true, "build": true, "dist": true, "docs": true,
}

// CREATE-semantic function-name prefixes (overwrite-on-create = bug). Excludes
// Set*/Update*/Upsert*/Overwrite* (those legitimately overwrite by contract).
var createNameRe = regexp.MustCompile(`^(Create|Add|New|Insert|Register|Submit|Append|Enqueue|Mint|Open|Init)[A-Z]?`)
var setterNameRe = regexp.MustCompile(`^(Set|Update|Upsert|Overwrite|Store|Save|Put|Write)`)

// Consensus-critical / sequence keywords (matched case-insensitively against
// the Set method name + the enclosing function name).
var checkpointKw = regexp.MustCompile(`(?i)checkpoint|header|snapshot|buffer|milestone|noack`)
var sequenceKw = regexp.MustCompile(`(?i)sequence|nonce|\bindex\b|\back\b|height|counter|lastid|\bcount\b`)

func main() {
	flag.Parse()
	start := time.Now()

	if *flagScopeOnly && *flagFromC129 == "" {
		fmt.Fprintln(os.Stderr, "FATAL: --scope-files-only requires --from-c129")
		os.Exit(1)
	}

	rep := &report{
		Target: *flagPath, Findings: []finding{}, Summary: map[string]int{},
		FromC129: *flagFromC129, ScopeFilesOnly: *flagScopeOnly,
	}

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
		if strings.HasPrefix(f.ID, "C129-KEEPER") || strings.HasPrefix(f.ID, "C129-HANDLER") ||
			strings.HasPrefix(f.ID, "C129-MSG") || f.ID == "C129-CROSS-MODULE" {
			dest[f.File] = true
			abs, _ := filepath.Abs(f.File)
			dest[abs] = true
		}
	}
	rep.C129FilesLoaded = len(dest)
}

func record(rep *report, id, file string, line int, fn, note string, gate bool) {
	rep.Findings = append(rep.Findings, finding{
		ID: id, File: file, Line: line, Func: fn, Note: note, C129Gate: gate,
	})
	rep.Summary[id]++
}

// funcScan collects per-function signals in one pass over the body.
type funcScan struct {
	hasStrongGuard bool // Has*/Exists/Contains/IsSet call present
	hasGet         bool // Get* call present
	hasIf          bool // any IfStmt present
	hasGtCmp       bool // a `>` or `>=` BinaryExpr present (monotonic guard)
	sets           []setSite
}

type setSite struct {
	pos        token.Pos
	methodName string
	argHint    string // textual hint from the first arg (key name) for classification
}

// exprName pulls a classification hint from an expression: identifier name,
// called-function name, or selector field — covers `store.Set(SequenceKey, …)`,
// `store.Set(ackSequenceKey(), …)`, `store.Set(types.CheckpointKey, …)`.
func exprName(e ast.Expr) string {
	switch x := e.(type) {
	case *ast.Ident:
		return x.Name
	case *ast.CallExpr:
		return exprName(x.Fun)
	case *ast.SelectorExpr:
		return x.Sel.Name
	}
	return ""
}

func scanFunc(fn *ast.FuncDecl) funcScan {
	var fs funcScan
	if fn.Body == nil {
		return fs
	}
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.IfStmt:
			fs.hasIf = true
		case *ast.BinaryExpr:
			if x.Op == token.GTR || x.Op == token.GEQ || x.Op == token.LSS || x.Op == token.LEQ {
				fs.hasGtCmp = true
			}
		case *ast.CallExpr:
			sel, ok := x.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			m := sel.Sel.Name
			switch {
			case m == "Has" || strings.HasPrefix(m, "Has") ||
				m == "Exists" || strings.HasPrefix(m, "Exists") ||
				m == "Contains" || m == "IsSet" || strings.HasPrefix(m, "Is"):
				fs.hasStrongGuard = true
			case m == "Get" || strings.HasPrefix(m, "Get"):
				fs.hasGet = true
			case m == "Set" || (strings.HasPrefix(m, "Set") && len(m) > 3):
				hint := ""
				if len(x.Args) > 0 {
					hint = exprName(x.Args[0])
				}
				fs.sets = append(fs.sets, setSite{pos: x.Pos(), methodName: m, argHint: hint})
			}
		}
		return true
	})
	return fs
}

func (fs funcScan) guarded() bool {
	// Strong: explicit Has/Exists/Contains. Soft: Get* paired with an If
	// (the `_, found := k.GetX(); if !found {` create pattern).
	return fs.hasStrongGuard || (fs.hasGet && fs.hasIf)
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
		record(rep, IDConsumesC129, path, fset.Position(file.Package).Line, "", "file flagged by detector #129 (keeper/handler/msg surface)", true)
	}

	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Name == nil {
			continue
		}
		name := fn.Name.Name
		isCreate := createNameRe.MatchString(name) && !setterNameRe.MatchString(name)
		fs := scanFunc(fn)
		if len(fs.sets) == 0 {
			continue
		}
		guarded := fs.guarded()

		for _, s := range fs.sets {
			line := fset.Position(s.pos).Line
			combined := name + " " + s.methodName + " " + s.argHint
			isSeq := sequenceKw.MatchString(combined)
			isCkpt := checkpointKw.MatchString(combined)

			// Sequence/nonce write with no monotonic comparison anywhere in the
			// function → backwards-overwrite risk (independent of create-name).
			if isSeq && !fs.hasGtCmp {
				record(rep, IDSeqNoMonotonic, path, line, name,
					fmt.Sprintf("%s writes sequence/nonce-class state with no >/>= monotonic guard in the function — older value can overwrite newer", s.methodName), gate)
				continue
			}

			// Create-semantic write with no existence guard → overwrite-on-create.
			if isCreate && !guarded {
				if isCkpt {
					record(rep, IDCheckpointOver, path, line, name,
						fmt.Sprintf("create-fn %s calls %s on checkpoint/header/snapshot state with no Has/Exists guard — committed checkpoint can be silently overwritten", name, s.methodName), gate)
				} else {
					record(rep, IDSetNoHas, path, line, name,
						fmt.Sprintf("create-fn %s calls %s with no Has/Exists/Get-found guard — existing record can be silently overwritten", name, s.methodName), gate)
				}
			}
		}
	}
}

func emitHumanSummary(rep *report) {
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "=== Detector #138 No-Overwrite-Guard ===")
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
		fmt.Fprintf(os.Stderr, "  %-22s %d\n", k, rep.Summary[k])
	}
}
