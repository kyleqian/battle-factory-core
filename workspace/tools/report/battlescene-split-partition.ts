#!/usr/bin/env node --experimental-strip-types
/**
 * battleScene.ts split partition (main-lane, Battle Scene OFF contract).
 *
 * Computes a mechanical partition of every top-level symbol in
 * `src/engine/battleScene.ts` (36,897 lines, 280 export declarations, 448
 * top-level functions -- 199 of which are turn-of-the-record canonical
 * ground truth) into three buckets:
 *
 *   LIVE      -- reachable from the generated-orchestrator route: the
 *                transitive closure of the symbols the 5 live engine files
 *                import from battleScene.ts, MINUS the canonical entry
 *                points and MINUS anything reachable only from them.
 *   CANONICAL -- reachable from the canonical entry points
 *                (`renderBattleScene` / `advanceBattleScene` /
 *                `INITIAL_BATTLE_SCENE_STATE` / `BattleSceneState`) and/or
 *                from tests/ + tools/probe/ imports, but NOT reachable from
 *                the generated-orchestrator route.
 *   SHARED    -- genuinely reachable from BOTH routes. This bucket is the
 *                whole difficulty of the task; it is reported explicitly
 *                (full list) rather than hidden by arbitrary assignment.
 *
 * The "generated-orchestrator route" surface is defined as the unique set of
 * battleScene.ts symbols imported by the five live engine files:
 * core.ts, summaryInfoPage.ts, factoryBattleStartIntro.ts,
 * factoryRoundBattleOrchestrator.ts, stagedBattleTurn.ts.
 *
 * Method: identifier-based reachability over the file's own internal
 * references. A symbol's referenced set is every top-level symbol name that
 * appears as a whole word in that symbol's own declaration text. This is a
 * deliberate, honest over-approximation: a same-named local variable or a
 * mention inside a string/comment counts as a reference. It can only ever
 * inflate a bucket, never shrink one, and it is the documented limitation in
 * docs/battlescene-canonical-split-design.md.
 *
 * Closures are computed as fixed points over that reference graph from each
 * entry surface. Deterministic for an unchanged tree: no network, no oracle,
 * no Math.random, no filesystem iteration order dependence (all lists are
 * sorted before use).
 *
 * Rerun: node --experimental-strip-types tools/report/battlescene-split-partition.ts
 * Output: stdout report (see README-style block at the end of this header).
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const BATTLE_SCENE_PATH = join(ROOT, "src/engine/battleScene.ts");
const ENGINE_DIR = join(ROOT, "src/engine");
const TESTS_DIR = join(ROOT, "tests");
const PROBE_DIR = join(ROOT, "tools/probe");

// ---------------------------------------------------------------------------
// Top-level declaration extraction
// ---------------------------------------------------------------------------

type DeclKind = "function" | "const" | "let" | "interface" | "type";

interface Decl {
  name: string;
  kind: DeclKind;
  exported: boolean;
  startLine: number;
  endLine: number;
  startIdx: number;
  endIdx: number;
}

/**
 * Character scanner that locates the end of a top-level declaration.
 *
 * - function/interface: ends at the matching `}` of the body/interface
 *   block. A `{` at paren depth 0 whose previous significant character is
 *   `:` is treated as an object-literal return type (e.g.
 *   `function f(t: number): { top: number } | null {`) and skipped via its
 *   own matching `}`, so the body brace is the one we actually close on.
 * - const/let/type: ends at the first `;` at (paren, bracket, brace) depth 0.
 *
 * String literals, template literals and comments are skipped so braces and
 * semicolons inside them never affect depth.
 */
function scanDeclarationEnd(source: string, startIdx: number, kind: DeclKind): number {
  let i = startIdx;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  let inStr: "'" | '"' | null = null;
  let inTmpl = false;
  let inLineComment = false;
  let inBlockComment = false;
  const n = source.length;

  const bodyOpen = kind === "function" || kind === "interface";
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
          // Object-literal return type (function) -- count its own braces but
          // do not treat it as the body.
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
  for (let i = 0; i < idx && i < source.length; i += 1) {
    if (source[i] === "\n") line += 1;
  }
  return line;
}

function extractDestructureNames(source: string, openIdx: number, closeChar: "]"): string[] {
  // openIdx points at the '[' char. Collect identifiers until the matching ']'.
  const names: string[] = [];
  let i = openIdx + 1;
  let inStr: "'" | '"' | null = null;
  let inTmpl = false;
  while (i < source.length) {
    const c = source[i]!;
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
    if (c === '"' || c === "'") { inStr = c; i += 1; continue; }
    if (c === "`") { inTmpl = true; i += 1; continue; }
    if (c === closeChar) break;
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
const LET_NAME_RE = /^(?:export )?let ([A-Za-z_$][\w$]*)/;

function parseTopLevelDecls(source: string): Decl[] {
  const decls: Decl[] = [];
  const srcLength = source.length;
  let idx = 0;
  while (idx < srcLength) {
    const lineStart = idx;
    const lineEnd = source.indexOf("\n", idx);
    const line = source.slice(idx, lineEnd < 0 ? srcLength : lineEnd);
    let kind: DeclKind | null = null;
    let name: string | null = null;
    let names: string[] | null = null;

    const exported = /^export /.test(line);
    const stripped = exported ? line.slice("export ".length) : line;

    const funcMatch = FUNC_RE.exec(line);
    const ifaceMatch = IFACE_RE.exec(line);
    const typeMatch = TYPE_RE.exec(line);
    const constMatch = CONST_NAME_RE.exec(line);
    const letMatch = LET_NAME_RE.exec(line);

    if (funcMatch) {
      kind = "function";
      name = funcMatch[1]!;
    } else if (ifaceMatch) {
      kind = "interface";
      name = ifaceMatch[1]!;
    } else if (typeMatch) {
      kind = "type";
      name = typeMatch[1]!;
    } else if (constMatch) {
      kind = "const";
      name = constMatch[1]!;
    } else if (/^(?:export )?const \[/.test(line)) {
      kind = "const";
      const openIdx = line.indexOf("[");
      const bracketIdx = idx + openIdx;
      names = extractDestructureNames(source, bracketIdx, "]");
      name = null;
    } else if (letMatch) {
      kind = "let";
      name = letMatch[1]!;
    }

    if (kind === null) {
      const nl = source.indexOf("\n", idx);
      idx = nl < 0 ? srcLength : nl + 1;
      continue;
    }

    const endIdx = scanDeclarationEnd(source, idx, kind);
    const endLine = lineOf(source, Math.min(endIdx, srcLength) - 1);
    const startLine = lineOf(source, idx);
    if (names !== null) {
      if (names.length === 0) {
        throw new Error(`battleScene partition: destructured const at line ${startLine} yielded no names`);
      }
      for (const n of names) {
        decls.push({
          name: n,
          kind,
          exported,
          startLine,
          endLine,
          startIdx: idx,
          endIdx,
        });
      }
    } else if (name !== null) {
      decls.push({ name, kind, exported, startLine, endLine, startIdx: idx, endIdx });
    } else {
      throw new Error(`battleScene partition: unrecognized declaration at line ${startLine}`);
    }

    idx = endIdx;
  }
  return decls;
}

// ---------------------------------------------------------------------------
// Import surface extraction (which symbols do external files take?)
// ---------------------------------------------------------------------------

function extractSpecifiers(block: string): string[] {
  return block
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/^type\s+/, ""))
    .map((s) => s.split(/\s+as\s+/)[0]!.trim())
    .filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));
}

const IMPORT_BLOCK_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']*battleScene(?:\.ts)?)["']/g;

function importsFromBattleScene(filePath: string): Set<string> {
  const sourceText = readFileSync(filePath, "utf8");
  const symbols = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(IMPORT_BLOCK_RE.source, "g");
  while ((match = re.exec(sourceText)) !== null) {
    for (const spec of extractSpecifiers(match[1]!)) symbols.add(spec);
  }
  return symbols;
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(path, out);
    else if (entry.name.endsWith(".ts")) out.push(path);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Reachability / classification
// ---------------------------------------------------------------------------

function transitiveClosure(start: ReadonlySet<string>, adjacency: ReadonlyMap<string, Set<string>>): Set<string> {
  const seen = new Set<string>();
  const queue = [...start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

const CANONICAL_ENTRIES: readonly string[] = Object.freeze([
  "renderBattleScene",
  "advanceBattleScene",
  "INITIAL_BATTLE_SCENE_STATE",
  "BattleSceneState",
]);

function main(): void {
  const source = readFileSync(BATTLE_SCENE_PATH, "utf8");
  const decls = parseTopLevelDecls(source);

  // Universe of top-level symbols, keyed by name. Duplicate names at top
  // level are a real coding bug (or a merge artifact) -- treat as fatal.
  const byName = new Map<string, Decl>();
  for (const decl of decls) {
    if (byName.has(decl.name)) {
      throw new Error(`battleScene partition: duplicate top-level symbol ${decl.name}`);
    }
    byName.set(decl.name, decl);
  }

  // Build the reference adjacency over internal references. A symbol
  // references every universe name that appears as a whole word in its own
  // declaration text (identifier-based; over-approximates on same-named
  // locals and string/comment mentions -- documented limitation).
  const adjacency = new Map<string, Set<string>>();
  for (const decl of decls) {
    const body = source.slice(decl.startIdx, decl.endIdx);
    const refs = new Set<string>();
    for (const other of byName.keys()) {
      const re = new RegExp(`\\b${other.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(body)) refs.add(other);
    }
    adjacency.set(decl.name, refs);
  }

  // Engine import surface (the five live engine files).
  const engineImportSources = [
    join(ENGINE_DIR, "core.ts"),
    join(ENGINE_DIR, "summaryInfoPage.ts"),
    join(ENGINE_DIR, "factoryBattleStartIntro.ts"),
    join(ENGINE_DIR, "factoryRoundBattleOrchestrator.ts"),
    join(ENGINE_DIR, "stagedBattleTurn.ts"),
  ];
  const engineImports = new Set<string>();
  for (const file of engineImportSources) {
    for (const symbol of importsFromBattleScene(file)) engineImports.add(symbol);
  }

  // Test + probe import surface.
  const testProbeImports = new Set<string>();
  for (const file of [...collectTsFiles(TESTS_DIR), ...collectTsFiles(PROBE_DIR)]) {
    for (const symbol of importsFromBattleScene(file)) testProbeImports.add(symbol);
  }

  // Validation against the supervisor's measured facts.
  const enginePerFile = engineImportSources.map((file) => ({
    file: file.slice(ENGINE_DIR.length + 1),
    symbols: [...importsFromBattleScene(file)].sort(),
  }));
  const engineUnique = [...engineImports].sort();

  const canonicalEntrySet = new Set(CANONICAL_ENTRIES);
  const liveSurface = new Set([...engineImports].filter((s) => !canonicalEntrySet.has(s)));

  const liveClosure = transitiveClosure(liveSurface, adjacency);
  const canonicalClosure = transitiveClosure(canonicalEntrySet, adjacency);
  const testProbeClosure = transitiveClosure(testProbeImports, adjacency);

  const shared = new Set<string>();
  for (const name of liveClosure) if (canonicalClosure.has(name)) shared.add(name);

  const live = new Set<string>();
  for (const name of liveClosure) if (!shared.has(name)) live.add(name);

  const canonical = new Set<string>();
  const residual: string[] = [];
  const allReached = new Set([...liveClosure, ...canonicalClosure, ...testProbeClosure]);
  for (const name of byName.keys()) {
    if (liveClosure.has(name) || shared.has(name)) continue;
    if (canonicalClosure.has(name) || testProbeClosure.has(name)) canonical.add(name);
    else residual.push(name);
  }

  // LOC accounting: each source line belongs to the declaration that spans
  // it. Destructured declarations contribute one declaration span regardless
  // of how many names they bind; the span is charged to the bucket of its
  // first name (both names always land in the same bucket by construction).
  const locByBucket = { live: 0, canonical: 0, shared: 0, residual: 0, unassigned: 0 };
  const declaredLines = new Set<number>();
  const bucketOf = new Map<string, string>();
  for (const name of live) bucketOf.set(name, "live");
  for (const name of canonical) bucketOf.set(name, "canonical");
  for (const name of shared) bucketOf.set(name, "shared");
  for (const name of residual) bucketOf.set(name, "residual");

  const handledDeclIds = new Set<number>();
  for (const decl of decls) {
    const declKey = `${decl.startIdx}:${decl.endIdx}`;
    if (handledDeclIds.has(declKey)) continue; // destructure sibling
    handledDeclIds.add(declKey);
    const bucket = bucketOf.get(decl.name) ?? "unassigned";
    for (let line = decl.startLine; line <= decl.endLine; line += 1) {
      declaredLines.add(line);
      if (bucket === "live") locByBucket.live += 1;
      else if (bucket === "canonical") locByBucket.canonical += 1;
      else if (bucket === "shared") locByBucket.shared += 1;
      else if (bucket === "residual") locByBucket.residual += 1;
      else locByBucket.unassigned += 1;
    }
  }
  for (let line = 1; line <= source.split("\n").length; line += 1) {
    if (!declaredLines.has(line)) locByBucket.unassigned += 1;
  }

  const bucketList = (set: Set<string>): string[] => [...set].sort();

  // Bucket-acyclicity validation: a CANONICAL-only symbol (CANONICAL minus
  // SHARED) must never be referenced from a LIVE or SHARED symbol, or the
  // cut would not be clean (moving CANONICAL out would create an import
  // cycle with battleScene.ts). SHARED/LIVE may reference each other and
  // CANONICAL-only symbols may reference SHARED/LIVE; the forbidden edge is
  // the reverse.
  const canonicalOnly = new Set<string>();
  for (const name of canonical) if (!shared.has(name)) canonicalOnly.add(name);
  const leakedEdges: string[] = [];
  for (const name of byName.keys()) {
    if (!live.has(name) && !shared.has(name)) continue;
    for (const ref of adjacency.get(name) ?? []) {
      if (canonicalOnly.has(ref)) leakedEdges.push(`${name} -> ${ref}`);
    }
  }
  const acyclic = leakedEdges.length === 0;

  const totalSymbols = decls.length;
  const locTotal = locByBucket.live + locByBucket.canonical + locByBucket.shared + locByBucket.residual + locByBucket.unassigned;

  // -------------------------------------------------------------------------
  // Report
  // -------------------------------------------------------------------------
  const out: string[] = [];
  out.push("battleScene.ts split partition");
  out.push("==============================");
  out.push("");
  out.push(`File: src/engine/battleScene.ts (${source.split("\n").length} lines)`);
  out.push(`Total top-level symbols: ${totalSymbols}`);
  out.push(
    `  functions ${decls.filter((d) => d.kind === "function").length}, `
    + `const/let ${decls.filter((d) => d.kind === "const" || d.kind === "let").length}, `
    + `interfaces ${decls.filter((d) => d.kind === "interface").length}, `
    + `types ${decls.filter((d) => d.kind === "type").length}`,
  );
  out.push(`Total top-level export declarations: ${decls.filter((d) => d.exported).length}`);
  out.push("");
  out.push("Entry surfaces:");
  out.push(`  canonical entry points: ${CANONICAL_ENTRIES.join(", ")}`);
  out.push("  live engine import surface (per file):");
  for (const { file, symbols } of enginePerFile) {
    out.push(`    ${file}: ${symbols.length} symbol(s) -- ${symbols.join(", ")}`);
  }
  out.push(`  live engine import surface (unique): ${engineUnique.length} -- ${engineUnique.join(", ")}`);
  out.push(
    `  tests/ + tools/probe/ import surface: ${testProbeImports.size} unique symbol(s) across `
    + `${collectTsFiles(TESTS_DIR).filter((f) => importsFromBattleScene(f).size > 0).length} test files and `
    + `${collectTsFiles(PROBE_DIR).filter((f) => importsFromBattleScene(f).size > 0).length} probe files`,
  );
  out.push("");
  out.push("Buckets (symbols):");
  out.push(`  LIVE       ${live.size}`);
  out.push(`  CANONICAL  ${canonical.size + residual.length}  (of which ${residual.length} are reachable from NO entry surface -- `);
  out.push(`              ${residual.length === 0 ? "" : `${residual.map((r) => r).join(", ")} -- `}folded in here; see below)`);
  out.push(`  SHARED     ${shared.size}`);
  out.push("");
  out.push(`Three-bucket total: ${live.size + canonical.size + residual.length + shared.size} == ${totalSymbols} top-level symbols -- `
    + (live.size + canonical.size + residual.length + shared.size === totalSymbols ? "RECONCILED" : "MISMATCH"));
  out.push(`  (strict partition: LIVE ${live.size} + CANONICAL ${canonical.size} + SHARED ${shared.size} + residual ${residual.length})`);
  out.push("");
  out.push(`Bucket-acyclicity (cut feasibility): ${acyclic ? "CLEAN -- no LIVE/SHARED symbol references a CANONICAL-only symbol" : "ENTANGLED -- see leaked edges below"}`);
  if (leakedEdges.length > 0) {
    out.push(leakedEdges.join("\n"));
  }
  out.push("");
  out.push("Buckets (declaration lines):");
  out.push(`  LIVE       ${locByBucket.live}`);
  out.push(`  CANONICAL  ${locByBucket.canonical + locByBucket.residual}  (incl. ${locByBucket.residual} residual lines)`);
  out.push(`  SHARED     ${locByBucket.shared}`);
  out.push(`  unassigned ${locByBucket.unassigned} (imports / module header / blank lines)`);
  out.push(`  LOC total  ${locTotal}`);
  out.push("");
  out.push(`SHARED (${shared.size} symbols):`);
  out.push(bucketList(shared).join("\n"));
  out.push("");
  out.push(`residual unreachable symbols (${residual.length}):`);
  out.push(bucketList(new Set(residual)).join("\n"));
  out.push("");
  out.push(`LIVE (${live.size} symbols):`);
  out.push(bucketList(live).join("\n"));
  out.push("");
  out.push(`CANONICAL (${canonical.size} symbols):`);
  out.push(bucketList(canonical).join("\n"));
  out.push("");

  console.log(out.join("\n"));
}

main();
