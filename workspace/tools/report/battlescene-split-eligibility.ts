#!/usr/bin/env node --experimental-strip-types
/**
 * battleScene.ts canonical-split eligibility scan (main lane, decision (a)).
 *
 * `battlescene-split-partition.ts` computes the CANONICAL bucket (symbols
 * still in battleScene.ts reachable only from the canonical entry points)
 * but is blind to two hazard classes a human has to hand-check per
 * candidate (ISSUES #39, PROGRESS #1350):
 *
 *   H1 (eval-read)      -- a module-eval-time read (a top-level `const`
 *                           initializer, or battleScene.ts's own remaining
 *                           top-level executable code such as an `if`
 *                           invariant guard) of a binding that would become
 *                           a cross-file import. Both directions matter:
 *                           the candidate reading a still-resident symbol
 *                           eagerly, or battleScene.ts's own remaining
 *                           top-level code eagerly reading the candidate.
 *                           `function`-kind candidates are categorically
 *                           exempt from the *forward* direction (decision
 *                           (a)): every reference inside a function body is
 *                           a deferred, call-time read, never module-eval.
 *   H2 (animation-import) -- the candidate's body references an identifier
 *                           battleScene.ts imports from `src/animation/*`.
 *                           Moving it would make battleSceneCanonical.ts
 *                           import from `src/animation/*` directly, tripping
 *                           `tests/animation/animationBoundaryRatchet.test.ts`
 *                           (design doc `docs/battlescene-canonical-split-
 *                           design.md` §7 hazard 1). This is a static
 *                           import-boundary rule, independent of read timing.
 *
 *   H3 (let-write)       -- a function-kind candidate's body ASSIGNS to a
 *                           module-level `let` that stays behind (every
 *                           top-level `let` does -- see let-cache below).
 *                           Moving the function turns that assignment into
 *                           a write to an imported binding -- illegal ESM,
 *                           TDZ/runtime failure. Reads and method calls
 *                           (`.get()`/`.set()`) on the binding are not
 *                           writes and do not trigger this (PROGRESS #1352
 *                           batch 8: `turn10OnixDarkPalette` and
 *                           `getMenuHealthboxPlayerContentMask` cost a
 *                           wasted move+revert before this hazard existed).
 *
 * Plus two named, non-negotiable exclusions:
 *   let-cache           -- `let`-kind candidates. Their consumers reassign
 *                           them; an ES import binding cannot be assigned
 *                           to from the importing side, so no decision can
 *                           unblock these short of moving every reassigning
 *                           call site in the same breath (ISSUES #39).
 *   ONIX-Sitrus-cluster  -- cosmetic re-label (not a distinct hazard rule)
 *                           applied when an H1/H2-blocked name matches
 *                           /sitrus|grantingstar/i, so the report reads the
 *                           same way three PROGRESS entries already describe
 *                           this specific, previously-hand-identified group.
 *
 * Non-`function` candidates (const/interface/type, and destructured consts)
 * are conservatively excluded this round unless fully self-contained (zero
 * references to any other battleScene.ts top-level symbol): classifying
 * their eval-time safety needs the same cross-check this script performs
 * for functions, not yet attempted (PROGRESS #1350's still-open item (1)).
 * `interface`/`type` candidates are erased at compile time (never a runtime
 * TDZ hazard) so only H2 applies to them.
 *
 * Output: one line per CANONICAL-only symbol (name | kind | ELIGIBLE|hazard
 * | offending identifier(s)), then the sorted ELIGIBLE-function list a batch
 * worker can select from directly, then any WARNING lines for top-level
 * battleScene.ts content this script did not recognize (residual scan --
 * see ISSUES #39's "prior false-certification bug" caution: an unrecognized
 * top-level statement is exactly the shape of bug that already happened
 * once here, so this script fails loud rather than silently skipping it).
 *
 * Rerun: node --experimental-strip-types tools/report/battlescene-split-eligibility.ts
 * Self-check: tests/tools/battlescenSplitEligibility.test.ts pins this
 * script's output against the known batch-5/6 exclusion set.
 */
import { readFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_BATTLE_SCENE_PATH = join(ROOT, "src/engine/battleScene.ts");
const PARTITION_SCRIPT = join(ROOT, "tools/report/battlescene-split-partition.ts");

type DeclKind = "function" | "const" | "let" | "interface" | "type";

interface Decl {
  name: string;
  kind: DeclKind;
  startLine: number;
  startIdx: number;
  endIdx: number;
}

interface Span {
  startIdx: number;
  endIdx: number;
}

// ---------------------------------------------------------------------------
// Shared char-level scanner (same state machine as battlescene-split-
// partition.ts / -move.ts / -precise.ts / -topo.ts -- deliberately
// duplicated rather than imported, matching this directory's existing
// convention of self-contained sibling tools).
// ---------------------------------------------------------------------------
function scanBalancedEnd(source: string, startIdx: number, bodyOpen: boolean): number {
  let i = startIdx;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let inStr: "'" | '"' | null = null;
  let inTmpl = false;
  let inLineComment = false;
  let inBlockComment = false;
  const n = source.length;
  let bodyOpened = false;

  const previousSignificant = (index: number): string => {
    let j = index - 1;
    while (j >= 0 && /\s/.test(source[j]!)) j -= 1;
    return j >= 0 ? source[j]! : "";
  };

  while (i < n) {
    const c = source[i]!;
    const next = source[i + 1]!;
    if (inLineComment) {
      if (c === "\n") inLineComment = false;
      i += 1;
      continue;
    }
    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    if (inStr !== null) {
      if (c === "\\") i += 2;
      else if (c === inStr) {
        inStr = null;
        i += 1;
      } else i += 1;
      continue;
    }
    if (inTmpl) {
      if (c === "\\") i += 2;
      else if (c === "`") {
        inTmpl = false;
        i += 1;
      } else i += 1;
      continue;
    }
    if (c === "/" && next === "/") { inLineComment = true; i += 2; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'") { inStr = c; i += 1; continue; }
    if (c === "`") { inTmpl = true; i += 1; continue; }

    if (bodyOpen) {
      if (c === "(") paren += 1;
      else if (c === ")") paren -= 1;
      else if (c === "{" && paren === 0) {
        if (!bodyOpened && previousSignificant(i) === ":") {
          brace += 1;
        } else {
          bodyOpened = true;
          brace += 1;
        }
      } else if (c === "}" && paren === 0 && brace > 0) {
        brace -= 1;
        if (brace === 0 && bodyOpened) return i + 1;
      }
    } else {
      if (c === "(") paren += 1;
      else if (c === ")") paren -= 1;
      else if (c === "[") bracket += 1;
      else if (c === "]") bracket -= 1;
      else if (c === "{") brace += 1;
      else if (c === "}") brace -= 1;
      else if (c === ";" && paren === 0 && bracket === 0 && brace === 0) return i + 1;
    }
    i += 1;
  }
  return n;
}

function lineOf(source: string, idx: number): number {
  let line = 1;
  for (let i = 0; i < idx && i < source.length; i += 1) if (source[i] === "\n") line += 1;
  return line;
}

function extractDestructureNames(source: string, openIdx: number): string[] {
  const names: string[] = [];
  let i = openIdx + 1;
  let inStr: "'" | '"' | null = null;
  let inTmpl = false;
  while (i < source.length) {
    const c = source[i]!;
    if (inStr !== null) {
      if (c === "\\") i += 2;
      else if (c === inStr) { inStr = null; i += 1; } else i += 1;
      continue;
    }
    if (inTmpl) {
      if (c === "\\") i += 2;
      else if (c === "`") { inTmpl = false; i += 1; } else i += 1;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; i += 1; continue; }
    if (c === "`") { inTmpl = true; i += 1; continue; }
    if (c === "]") break;
    if (/[A-Za-z_$]/.test(c)) {
      let j = i;
      while (j < source.length && /[\w$]/.test(source[j]!)) j += 1;
      names.push(source.slice(i, j));
      i = j;
      continue;
    }
    i += 1;
  }
  return names;
}

const FUNC_RE = /^(?:export )?function ([A-Za-z_$][\w$]*)/;
const IFACE_RE = /^(?:export )?interface ([A-Za-z_$][\w$]*)/;
const TYPE_RE = /^(?:export )?type ([A-Za-z_$][\w$]*)/;
const CONST_NAME_RE = /^(?:export )?const ([A-Za-z_$][\w$]*)/;
const CONST_DESTRUCTURE_RE = /^(?:export )?const \[/;
const LET_NAME_RE = /^(?:export )?let ([A-Za-z_$][\w$]*)/;
const IMPORT_RE = /^import\b/;
const EXPORT_FROM_RE = /^export\s+(?:type\s+)?\{/;
const IF_GUARD_RE = /^if\s*\(/;

interface WalkResult {
  decls: Decl[];
  importSpans: Span[];
  guardSpans: Span[];
  residualLines: { line: number; text: string }[];
}

/**
 * Single pass over battleScene.ts's top-level structure: every top-level
 * decl (function/const/let/interface/type, including destructured consts),
 * every top-level import statement, and every top-level `if (...) {...}`
 * "module-eval guard" (the class slice 1/batch 6 found invisible to a
 * decl-only parser). Anything left over that is not blank/comment is a
 * residual -- a real hazard this script does not yet understand, reported
 * rather than silently skipped.
 */
function walkTopLevel(source: string): WalkResult {
  const decls: Decl[] = [];
  const importSpans: Span[] = [];
  const guardSpans: Span[] = [];
  const residualLines: { line: number; text: string }[] = [];
  const n = source.length;
  let idx = 0;
  let inBlockComment = false;

  while (idx < n) {
    const lineEnd = source.indexOf("\n", idx);
    const rawLine = source.slice(idx, lineEnd < 0 ? n : lineEnd);
    const line = rawLine;
    const trimmed = line.trim();
    const advanceOneLine = (): number => (lineEnd < 0 ? n : lineEnd + 1);

    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      idx = advanceOneLine();
      continue;
    }
    if (trimmed === "") { idx = advanceOneLine(); continue; }
    if (trimmed.startsWith("//")) { idx = advanceOneLine(); continue; }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      idx = advanceOneLine();
      continue;
    }
    if (trimmed.startsWith("*")) { idx = advanceOneLine(); continue; } // JSDoc continuation line

    const funcMatch = FUNC_RE.exec(line);
    const ifaceMatch = IFACE_RE.exec(line);
    const typeMatch = TYPE_RE.exec(line);
    const constMatch = CONST_NAME_RE.exec(line);
    const letMatch = LET_NAME_RE.exec(line);

    let kind: DeclKind | null = null;
    let name: string | null = null;
    let names: string[] | null = null;

    if (funcMatch) { kind = "function"; name = funcMatch[1]!; }
    else if (ifaceMatch) { kind = "interface"; name = ifaceMatch[1]!; }
    else if (typeMatch) { kind = "type"; name = typeMatch[1]!; }
    else if (constMatch) { kind = "const"; name = constMatch[1]!; }
    else if (CONST_DESTRUCTURE_RE.test(line)) {
      kind = "const";
      names = extractDestructureNames(source, idx + line.indexOf("["));
    } else if (letMatch) { kind = "let"; name = letMatch[1]!; }

    if (kind !== null) {
      const bodyOpen = kind === "function" || kind === "interface";
      const endIdx = scanBalancedEnd(source, idx, bodyOpen);
      const startLine = lineOf(source, idx);
      if (names !== null) {
        for (const nm of names) decls.push({ name: nm, kind, startLine, startIdx: idx, endIdx });
      } else if (name !== null) {
        decls.push({ name, kind, startLine, startIdx: idx, endIdx });
      }
      idx = endIdx;
      continue;
    }

    if (IMPORT_RE.test(trimmed) || EXPORT_FROM_RE.test(trimmed)) {
      const endIdx = scanBalancedEnd(source, idx, false);
      importSpans.push({ startIdx: idx, endIdx });
      idx = endIdx;
      continue;
    }

    if (IF_GUARD_RE.test(trimmed)) {
      const endIdx = scanBalancedEnd(source, idx, true);
      guardSpans.push({ startIdx: idx, endIdx });
      idx = endIdx;
      continue;
    }

    // Unrecognized top-level content -- surfaced, not silently dropped.
    residualLines.push({ line: lineOf(source, idx), text: trimmed.slice(0, 100) });
    idx = advanceOneLine();
  }

  return { decls, importSpans, guardSpans, residualLines };
}

// ---------------------------------------------------------------------------
// Animation-import surface: identifiers battleScene.ts imports from
// src/animation/* (named or default), with their source path for reporting.
// ---------------------------------------------------------------------------
function animationImportSurface(source: string, importSpans: Span[]): Map<string, string> {
  const bySpecifier = new Map<string, string>();
  const NAMED_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/;
  const DEFAULT_RE = /import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s+from\s*["']([^"']+)["']/;
  for (const span of importSpans) {
    const text = source.slice(span.startIdx, span.endIdx);
    const path = /from\s*["']([^"']+)["']/.exec(text)?.[1];
    if (!path || !path.includes("/animation/")) continue;
    const named = NAMED_RE.exec(text);
    if (named) {
      for (const raw of named[1]!.split(",")) {
        const spec = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
        if (/^[A-Za-z_$][\w$]*$/.test(spec)) bySpecifier.set(spec, path);
      }
      continue;
    }
    const def = DEFAULT_RE.exec(text);
    if (def) bySpecifier.set(def[1]!, path);
  }
  return bySpecifier;
}

// ---------------------------------------------------------------------------
// Let-write surface (H3): does a function body ASSIGN to a given module-
// level `let` binding (=, compound assignment, ++/--), as opposed to only
// reading it or calling a method on it? A bare identifier immediately
// followed by an assignment operator, or immediately preceded/followed by
// ++/--, counts; an identifier followed by `.` or `(`/`[` (member access,
// method call, index) does not -- calling a method on an imported binding
// is legal ESM, rebinding it is not.
// ---------------------------------------------------------------------------
const ASSIGN_OP_ALTERNATION =
  "\\*\\*=|\\+=|-=|\\*=|/=|%=|&&=|\\|\\|=|\\?\\?=|&=|\\|=|\\^=|<<=|>>>=|>>=|=(?![=>])";

function assignsToBinding(body: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const notMemberAccess = "(?!\\s*[.([])";
  const re = new RegExp(
    `\\b${escaped}\\b${notMemberAccess}\\s*(?:\\+\\+|--|${ASSIGN_OP_ALTERNATION})` +
      `|(?:\\+\\+|--)\\s*\\b${escaped}\\b${notMemberAccess}`,
  );
  return re.test(body);
}

// ---------------------------------------------------------------------------
// CANONICAL bucket (authoritative source: battlescene-split-partition.ts).
// ---------------------------------------------------------------------------
function canonicalBucket(): Set<string> {
  const out = new Set<string>();
  const stdout = execFileSync(process.execPath, ["--experimental-strip-types", PARTITION_SCRIPT], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const lines = stdout.split("\n");
  // Two separate list blocks both belong to the CANONICAL bucket: the
  // strict "CANONICAL (N symbols):" list, and "residual unreachable
  // symbols (N):" -- symbols reachable from NO entry surface at all. The
  // partition script's own summary explicitly folds residual into
  // CANONICAL's total ("of which R are reachable from NO entry surface --
  // folded in here"); a symbol lands there when its only remaining
  // battleScene.ts-internal referrer already moved out under decision (a)
  // (the internal-adjacency reachability check can't see the cross-file
  // read that still keeps it alive), not because it stopped being
  // canonical-only.
  let section: "canonical" | "residual" | null = null;
  for (const line of lines) {
    if (line.startsWith("CANONICAL (")) { section = "canonical"; continue; }
    if (line.startsWith("residual unreachable symbols (")) { section = "residual"; continue; }
    if (section !== null && line.trim() === "") { section = null; continue; }
    if (section !== null && /^[A-Za-z_$][\w$]*$/.test(line.trim())) out.add(line.trim());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Eligibility classification.
// ---------------------------------------------------------------------------
export interface EligibilityRow {
  name: string;
  kind: DeclKind;
  eligible: boolean;
  hazard: string | null;
  offending: string[];
}

export interface EligibilityResult {
  rows: EligibilityRow[];
  eligibleFunctions: string[];
  residualLines: { line: number; text: string }[];
  guardCount: number;
}

const CLUSTER_NAME_RE = /sitrus|grantingstar/i;

// The four canonical entry points (design doc §6 "Final slice"). They are
// mechanically CANONICAL-only and would otherwise read as eligible
// function-kind leaves, but moving them is the explicitly out-of-scope
// final slice (core.ts + ~46 importers' path updates), not a decision-(a)
// batch move -- excluded here so a batch worker never mistakes them for a
// normal candidate.
const FINAL_SLICE_ENTRY_POINTS = new Set([
  "renderBattleScene",
  "advanceBattleScene",
  "INITIAL_BATTLE_SCENE_STATE",
  "BattleSceneState",
]);

export function computeEligibility(): EligibilityResult {
  const source = readFileSync(DEFAULT_BATTLE_SCENE_PATH, "utf8");
  const { decls, importSpans, guardSpans, residualLines } = walkTopLevel(source);

  const byName = new Map<string, Decl>();
  for (const decl of decls) {
    if (byName.has(decl.name)) throw new Error(`battlescene eligibility: duplicate top-level symbol ${decl.name}`);
    byName.set(decl.name, decl);
  }

  const animationImports = animationImportSurface(source, importSpans);

  // Internal adjacency: which of battleScene.ts's own top-level names does
  // each decl's body reference (same over-approximation as the partition
  // script: whole-word identifier match over the declaration's own text).
  const adjacency = new Map<string, Set<string>>();
  for (const decl of decls) {
    const body = source.slice(decl.startIdx, decl.endIdx);
    const refs = new Set<string>();
    for (const other of byName.keys()) {
      if (other === decl.name) continue;
      const re = new RegExp(`\\b${other.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(body)) refs.add(other);
    }
    adjacency.set(decl.name, refs);
  }

  // Animation refs per decl (H2).
  const animationRefsOf = new Map<string, string[]>();
  for (const decl of decls) {
    const body = source.slice(decl.startIdx, decl.endIdx);
    const hits: string[] = [];
    for (const [spec, path] of animationImports) {
      const re = new RegExp(`\\b${spec.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(body)) hits.push(`${spec} (${path})`);
    }
    if (hits.length > 0) animationRefsOf.set(decl.name, hits.sort());
  }

  // H3: function bodies that assign to a stay-behind top-level `let`. Every
  // top-level `let` stays behind permanently (let-cache blocks all of them
  // unconditionally below), so the full decl-level `let` set is the target.
  const letNames = decls.filter((d) => d.kind === "let").map((d) => d.name);
  const letWriteRefsOf = new Map<string, string[]>();
  for (const decl of decls) {
    if (decl.kind !== "function") continue;
    const body = source.slice(decl.startIdx, decl.endIdx);
    const hits = letNames.filter((letName) => assignsToBinding(body, letName));
    if (hits.length > 0) letWriteRefsOf.set(decl.name, hits.sort());
  }

  // Reverse-direction H1: battleScene.ts's own remaining top-level module-
  // eval guards reading a CANONICAL-only candidate eagerly.
  const guardReferenced = new Map<string, number>(); // name -> guard line
  for (const span of guardSpans) {
    const text = source.slice(span.startIdx, span.endIdx);
    const guardLine = lineOf(source, span.startIdx);
    for (const name of byName.keys()) {
      const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(text)) guardReferenced.set(name, guardLine);
    }
  }

  const canonicalOnly = canonicalBucket();

  const rows: EligibilityRow[] = [];
  for (const name of [...canonicalOnly].sort()) {
    const decl = byName.get(name);
    if (!decl) {
      rows.push({ name, kind: "const", eligible: false, hazard: "unparsed", offending: [] });
      continue;
    }
    const animRefs = animationRefsOf.get(name) ?? [];
    const guardLine = guardReferenced.get(name);
    const letWriteRefs = letWriteRefsOf.get(name) ?? [];

    let eligible: boolean;
    let hazard: string | null;
    let offending: string[];

    if (FINAL_SLICE_ENTRY_POINTS.has(name)) {
      eligible = false;
      hazard = "final-slice-entry-point";
      offending = ["one of the four canonical entry points; moving is the reserved final slice, not a batch move"];
    } else if (decl.kind === "let") {
      eligible = false;
      hazard = "let-cache";
      offending = ["reassigned by a consumer; an ES import binding cannot be assigned to"];
    } else if (animRefs.length > 0) {
      eligible = false;
      hazard = "H2-animation-import";
      offending = animRefs;
    } else if (guardLine !== undefined) {
      eligible = false;
      hazard = "H1-eval-read";
      offending = [`read by battleScene.ts's own top-level module-eval guard at line ${guardLine}`];
    } else if (decl.kind === "function" && letWriteRefs.length > 0) {
      eligible = false;
      hazard = "H3-let-write";
      offending = letWriteRefs.map((n) => `assigns to stay-behind let ${n}`);
    } else if (decl.kind === "function") {
      eligible = true;
      hazard = null;
      offending = [];
    } else if (decl.kind === "interface" || decl.kind === "type") {
      // Erased at compile time -- never a runtime TDZ hazard.
      eligible = true;
      hazard = null;
      offending = [];
    } else {
      // const (incl. destructured) / unparsed: conservatively require zero
      // references to any other battleScene.ts top-level symbol (a genuine
      // eval-time leaf). Anything else needs the eval-time-vs-deferred
      // classification PROGRESS #1350 left open -- not attempted here.
      const refs = [...(adjacency.get(name) ?? [])];
      if (refs.length === 0) {
        eligible = true;
        hazard = null;
        offending = [];
      } else {
        eligible = false;
        hazard = "H1-eval-read";
        offending = [`const initializer references (module-eval time): ${refs.sort().join(", ")}`];
      }
    }

    if (!eligible && hazard !== "let-cache" && CLUSTER_NAME_RE.test(name)) {
      hazard = `ONIX-Sitrus-cluster (${hazard})`;
    }

    rows.push({ name, kind: decl.kind, eligible, hazard, offending });
  }

  const eligibleFunctions = rows.filter((r) => r.eligible && r.kind === "function").map((r) => r.name).sort();

  return { rows, eligibleFunctions, residualLines, guardCount: guardSpans.length };
}

function main(): void {
  const result = computeEligibility();
  const out: string[] = [];
  out.push("battleScene.ts split eligibility (decision (a))");
  out.push("================================================");
  out.push("");
  out.push(`CANONICAL-only symbols: ${result.rows.length}`);
  out.push(`Top-level module-eval guards found: ${result.guardCount}`);
  if (result.residualLines.length > 0) {
    out.push("");
    out.push(`WARNING: ${result.residualLines.length} unrecognized top-level line(s) -- review by hand:`);
    for (const r of result.residualLines) out.push(`  line ${r.line}: ${r.text}`);
  }
  out.push("");
  out.push("name | kind | eligible | hazard | offending");
  for (const row of result.rows) {
    out.push(
      `${row.name} | ${row.kind} | ${row.eligible ? "ELIGIBLE" : "blocked"} | ${row.hazard ?? "-"} | ${row.offending.join("; ")}`,
    );
  }
  out.push("");
  const eligibleCount = result.rows.filter((r) => r.eligible).length;
  const blockedCount = result.rows.length - eligibleCount;
  out.push(`Summary: ${eligibleCount} eligible (${result.eligibleFunctions.length} of them function-kind), ${blockedCount} blocked`);
  const hazardCounts = new Map<string, number>();
  for (const row of result.rows) {
    if (row.hazard) hazardCounts.set(row.hazard, (hazardCounts.get(row.hazard) ?? 0) + 1);
  }
  for (const [hazard, count] of [...hazardCounts].sort()) out.push(`  ${hazard}: ${count}`);
  out.push("");
  out.push(`ELIGIBLE function-kind symbols (${result.eligibleFunctions.length}), batch-selection order (sorted):`);
  out.push(result.eligibleFunctions.join("\n"));

  console.log(out.join("\n"));
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) main();
