// Detector #166 — Cache-Before-Validate-No-Cleanup scanner
//
// Cosmos SDK / Tendermint / Heimdall family. SHERLOCK ARSENAL (joins #138 +
// #165 for the June Polygon-Heimdall hunt). Ground-truth-spec'd from Zebra
// GHSA-4m69-67m6-prqp (zebra-state service.rs queue_and_commit L659-714 +
// hash-added-before-validation L797-802): a dedup identifier is inserted into a
// seen/receipt/nonce/processed set BEFORE validation, and the validation-FAILURE
// branch does NOT unwind the insert. A later LEGITIMATE item carrying the same
// identifier is then rejected as a duplicate -> lockout / DoS (CWE-459/460).
//
// CONTROL-FLOW heuristic (not pure-syntactic). Per function:
//   1. find dedup-class INSERTS (Set*/Add/Insert/store-to-map on a target whose
//      method/receiver/map-name matches a dedup keyword: receipt/seen/sent/
//      nonce/processed/ack/commitment/replay/used/spent/claimed/packet/...).
//   2. find a VALIDATION or fallible early-exit AFTER the insert (a Verify/
//      Validate/Check/Prove call, or an `if ... { return }` guard).
//   3. FLAG if NO Delete/Remove (or builtin `delete(m,k)`) appears after the
//      insert -> the failure path never unwinds the cache entry.
//
// Two sub-findings:
//   C166-CACHE-BEFORE-VALIDATE  dedup insert precedes a Verify/Validate/Check
//                               call, with no unwinding delete (the Zebra shape).
//   C166-NO-CLEANUP-ON-ERR      dedup insert precedes a guard-return (fallible
//                               early-exit) with no unwinding delete.
//   C166-CONSUMES-C129          file was flagged by detector #129 (keeper/handler).
//
// CANDIDATE-surfacing (flag-for-source-read), tuned for low FP on done-right
// cleanup (see fixtures/negative_hyperbridge.go: receipt written then DELETED on
// the module-call failure branch -> must NOT fire).
//
// HEIMDALL-INTENDED dedup surfaces (June hunt priming): checkpoint dedup,
// validator-set-update dedup, statesync nonce/chunk sets, span/milestone dedup,
// IBC packet-receipt (SetPacketReceipt / SetPacketAcknowledgement). See README.
//
// USAGE:
//   go run main.go --path /path/to/heimdall-v2 [--from-c129 c129.json]
//       [--json] [--include-tests] [--scope-files-only]
//
// AUTHORITY: Ogie msg 8021 + 8023 (Zebra ground-truth intake -> Detector #166
// Go-AST build, Heimdall arsenal). Companion: #129 cosmos-sdk-go-ast,
// #137 cross-module-canonicalization, #138 no-overwrite-guard, #165 bech32-deep.
// Doctrine #44 (Identity-vs-Content Binding Gap) is the paired primitive.
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
	IDCacheBeforeValidate = "C166-CACHE-BEFORE-VALIDATE"
	IDNoCleanupOnErr      = "C166-NO-CLEANUP-ON-ERR"
	IDConsumesC129        = "C166-CONSUMES-C129"
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

// INSERT-semantic method prefixes. A dedup-context gate (dedupKw) filters out
// the vast majority of generic Set* calls.
var insertMethodRe = regexp.MustCompile(`^(Set|Add|Insert|Store|Save|Put|Mark|Record|Append|Register|Track|Flag)`)

// DELETE / unwind method prefixes + builtin delete() handled separately.
var deleteMethodRe = regexp.MustCompile(`^(Delete|Remove|Del|Unset|Clear|Discard|Drop|Prune|Evict|Reset|Rollback|Revert|Undo)`)

// VALIDATION / fallible-operation method names. "check" uses `check([^p]|$)`
// to EXCLUDE the "checkpoint" substring (rampant in Cosmos consensus chains ->
// FP, real-target-discovered on Babylon checkpointing). "confirm" dropped
// (status/hook noise: AfterRaw*Confirmed). Hook/event/log/read prefixes are
// excluded by nonValidatePrefixRe in the classifier.
var validateMethodRe = regexp.MustCompile(`(?i)(verify|validate|prove|ensure|assert|authenticate|attest|sanity|check([^p]|$))`)

// Method-name prefixes that are NEVER validations even if they substring-match
// (hooks, event emitters, logging, reads) — cuts the dominant Cosmos FP class.
var nonValidatePrefixRe = regexp.MustCompile(`^(After|Before|Emit|Event|Log|On|Get|Has|Is)`)

// DEDUP-class keyword — matched against the insert method name, receiver name,
// map name, and arg-key hint. This is what makes an insert "dedup-relevant".
var dedupKw = regexp.MustCompile(`(?i)(receipt|seen|sent|nonce|processed|\back\b|commitment|dedup|duplicate|replay|used|spent|claimed|known|recorded|executed|finalized|packet|consumed|handled|delivered|submitted|registered|completed|cached)`)

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

type evKind int

const (
	evInsert evKind = iota
	evDelete
	evValidate
	evGuardReturn
)

type event struct {
	kind evKind
	pos  token.Pos
	blob string // method/receiver/key text for hint + note
}

// exprName pulls a name hint from an expression.
func exprName(e ast.Expr) string {
	switch x := e.(type) {
	case *ast.Ident:
		return x.Name
	case *ast.CallExpr:
		return exprName(x.Fun)
	case *ast.SelectorExpr:
		return x.Sel.Name
	case *ast.IndexExpr:
		return exprName(x.X)
	}
	return ""
}

func recvName(sel *ast.SelectorExpr) string {
	if id, ok := sel.X.(*ast.Ident); ok {
		return id.Name
	}
	return exprName(sel.X)
}

func argBlob(args []ast.Expr) string {
	parts := make([]string, 0, len(args))
	for _, a := range args {
		if n := exprName(a); n != "" {
			parts = append(parts, n)
		}
	}
	return strings.Join(parts, " ")
}

// collectEvents walks a function body once and records ordered events.
func collectEvents(fn *ast.FuncDecl) []event {
	var evs []event
	if fn.Body == nil {
		return evs
	}
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		switch x := n.(type) {
		case *ast.IfStmt:
			// guard-return: an `if ... { ...; return ... }` (or else-branch return)
			if blockHasReturn(x.Body) || elseHasReturn(x.Else) {
				evs = append(evs, event{kind: evGuardReturn, pos: x.Pos(), blob: "if-guard-return"})
			}
		case *ast.AssignStmt:
			// map-index insert: dedupMap[key] = val
			for _, lhs := range x.Lhs {
				if ix, ok := lhs.(*ast.IndexExpr); ok {
					mapName := exprName(ix.X)
					keyName := exprName(ix.Index)
					if dedupKw.MatchString(mapName) || dedupKw.MatchString(keyName) {
						evs = append(evs, event{kind: evInsert, pos: x.Pos(),
							blob: mapName + "[" + keyName + "]"})
					}
				}
			}
		case *ast.CallExpr:
			// builtin delete(m, k)
			if id, ok := x.Fun.(*ast.Ident); ok && id.Name == "delete" {
				evs = append(evs, event{kind: evDelete, pos: x.Pos(), blob: "delete(" + argBlob(x.Args) + ")"})
				return true
			}
			sel, ok := x.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			m := sel.Sel.Name
			recv := recvName(sel)
			hint := argBlob(x.Args)
			ctx := m + " " + recv + " " + hint
			switch {
			case deleteMethodRe.MatchString(m):
				evs = append(evs, event{kind: evDelete, pos: x.Pos(), blob: m + " " + hint})
			case validateMethodRe.MatchString(m) && !nonValidatePrefixRe.MatchString(m):
				evs = append(evs, event{kind: evValidate, pos: x.Pos(), blob: m})
			case insertMethodRe.MatchString(m) && dedupKw.MatchString(ctx):
				evs = append(evs, event{kind: evInsert, pos: x.Pos(), blob: m + "(" + hint + ")"})
			}
		}
		return true
	})
	return evs
}

func blockHasReturn(b *ast.BlockStmt) bool {
	if b == nil {
		return false
	}
	for _, s := range b.List {
		if _, ok := s.(*ast.ReturnStmt); ok {
			return true
		}
	}
	return false
}

func elseHasReturn(e ast.Stmt) bool {
	switch x := e.(type) {
	case *ast.BlockStmt:
		return blockHasReturn(x)
	case *ast.IfStmt:
		return blockHasReturn(x.Body) || elseHasReturn(x.Else)
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
		record(rep, IDConsumesC129, path, fset.Position(file.Package).Line, "", "file flagged by detector #129 (keeper/handler/msg surface)", true)
	}

	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Name == nil {
			continue
		}
		evs := collectEvents(fn)
		if len(evs) == 0 {
			continue
		}

		for _, ins := range evs {
			if ins.kind != evInsert {
				continue
			}
			// Look for the FIRST validation / guard-return AFTER this insert,
			// and whether ANY delete/unwind appears after the insert.
			validateAfter := false
			guardAfter := false
			deleteAfter := false
			for _, e := range evs {
				if e.pos <= ins.pos {
					continue
				}
				switch e.kind {
				case evValidate:
					validateAfter = true
				case evGuardReturn:
					guardAfter = true
				case evDelete:
					deleteAfter = true
				}
			}
			if deleteAfter {
				continue // cleanup-on-failure present -> done-right, no flag
			}
			if !validateAfter && !guardAfter {
				continue // pure setter / no fallible op after the insert -> no flag
			}
			line := fset.Position(ins.pos).Line
			if validateAfter {
				record(rep, IDCacheBeforeValidate, path, line, fn.Name.Name,
					fmt.Sprintf("dedup insert %s precedes a verify/validate/check call with NO unwinding delete on the failure path — a later legit same-id item is rejected as duplicate (lockout/DoS, CWE-459/460)", ins.blob), gate)
			} else {
				record(rep, IDNoCleanupOnErr, path, line, fn.Name.Name,
					fmt.Sprintf("dedup insert %s precedes a fallible early-return guard with NO unwinding delete — failure path leaves the cache entry, blocking the legit retry (CWE-460)", ins.blob), gate)
			}
		}
	}
}

func emitHumanSummary(rep *report) {
	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, "=== Detector #166 Cache-Before-Validate-No-Cleanup ===")
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
