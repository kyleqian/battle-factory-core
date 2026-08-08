#!/usr/bin/env node --experimental-strip-types
/**
 * Precise batch selector for battleScene.ts canonical split slice 4.
 *
 * Unlike battlescene-split-topo.ts, this strips comments and string/template
 * literals from each declaration body before scanning identifiers, and it
 * expands destructured consts, so references are real code deps.
 *
 * A symbol is a batch candidate only if every identifier it references that is
 * NOT already in battleSceneCanonical.ts is either:
 *   (a) importable from a non-battleScene module (see IMPORTABLE check below),
 *       or
 *   (b) a type-only reference (import { type X } from battleScene.ts is erased
 *       at runtime -> no cycle).
 *
 * We approximate (b) by classifying an identifier as a type if it is an
 * interface/type/class in battleScene.ts OR is used in a type position. For
 * safety we require all non-moved references to be importable from a source
 * module; anything defined in battleScene.ts itself (font, charmap, drawSprite
 * Sheet, ...) blocks the move.
 */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BATTLE_SCENE_PATH = join(ROOT, "src/engine/battleScene.ts");
const CANONICAL_PATH = join(ROOT, "src/engine/battleSceneCanonical.ts");
const ENGINE_DIR = join(ROOT, "src/engine");

type DeclKind = "function" | "const" | "let" | "interface" | "type";
interface Decl { name: string; kind: DeclKind; startIdx: number; endIdx: number; }

function scanDeclarationEnd(source: string, startIdx: number, kind: DeclKind): number {
  let i = startIdx; let paren = 0; let bracket = 0; let brace = 0;
  let inStr: "'" | '"' | null = null; let inTmpl = false;
  let inLineComment = false; let inBlockComment = false;
  const n = source.length;
  const bodyOpen = kind === "function" || kind === "interface";
  let bodyOpened = false;
  const prevSig = (index: number): string => { let j = index - 1; while (j >= 0 && /\s/.test(source[j]!)) j -= 1; return j >= 0 ? source[j]! : ""; };
  while (i < n) {
    const c = source[i]!; const next = source[i + 1]!;
    if (inLineComment) { if (c === "\n") inLineComment = false; i += 1; continue; }
    if (inBlockComment) { if (c === "*" && next === "/") { inBlockComment = false; i += 2; } else i += 1; continue; }
    if (inStr !== null) { if (c === "\\") i += 2; else if (c === inStr) { inStr = null; i += 1; } else i += 1; continue; }
    if (inTmpl) { if (c === "\\") i += 2; else if (c === "`") { inTmpl = false; i += 1; } else i += 1; continue; }
    if (c === "/" && next === "/") { inLineComment = true; i += 2; continue; }
    if (c === "/" && next === "*") { inBlockComment = true; i += 2; continue; }
    if (c === '"' || c === "'") { inStr = c; i += 1; continue; }
    if (c === "`") { inTmpl = true; i += 1; continue; }
    if (bodyOpen) {
      if (c === "(") paren += 1;
      else if (c === ")") paren -= 1;
      else if (c === "{" && paren === 0) {
        if (!bodyOpened && prevSig(i) === ":") { brace += 1; } else { bodyOpened = true; brace += 1; }
      } else if (c === "}" && paren === 0 && brace > 0) { brace -= 1; if (brace === 0 && bodyOpened) return i + 1; }
    } else {
      if (c === "(") paren += 1; else if (c === ")") paren -= 1;
      else if (c === "[") bracket += 1; else if (c === "]") bracket -= 1;
      else if (c === "{") brace += 1; else if (c === "}") brace -= 1;
      else if (c === ";" && paren === 0 && bracket === 0 && brace === 0) return i + 1;
    }
    i += 1;
  }
  return n;
}

const FUNC_RE = /^(?:export )?function ([A-Za-z_$][\w$]*)/;
const IFACE_RE = /^(?:export )?interface ([A-Za-z_$][\w$]*)/;
const TYPE_RE = /^(?:export )?type ([A-Za-z_$][\w$]*)/;
const CONST_NAME_RE = /^(?:export )?const ([A-Za-z_$][\w$]*)/;
const LET_NAME_RE = /^(?:export )?let ([A-Za-z_$][\w$]*)/;
const DESTRUCT_RE = /^(?:export )?const \[/;
const IDENT_RE = /[A-Za-z_$][\w$]*/g;

function destructureNames(line: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IDENT_RE.exec(line)) !== null) names.push(m[0]);
  return names;
}

function parseTopLevelDecls(source: string): Decl[] {
  const decls: Decl[] = [];
  const srcLength = source.length;
  let idx = 0;
  while (idx < srcLength) {
    const lineEnd = source.indexOf("\n", idx);
    const line = source.slice(idx, lineEnd < 0 ? srcLength : lineEnd);
    let kind: DeclKind | null = null; let name: string | null = null;
    const exported = /^export /.test(line);
    const stripped = exported ? line.slice("export ".length) : line;
    const funcMatch = FUNC_RE.exec(stripped);
    const ifaceMatch = IFACE_RE.exec(stripped);
    const typeMatch = TYPE_RE.exec(stripped);
    const constMatch = CONST_NAME_RE.exec(stripped);
    const letMatch = LET_NAME_RE.exec(stripped);
    if (funcMatch) { kind = "function"; name = funcMatch[1]!; }
    else if (ifaceMatch) { kind = "interface"; name = ifaceMatch[1]!; }
    else if (typeMatch) { kind = "type"; name = typeMatch[1]!; }
    else if (constMatch) { kind = "const"; name = constMatch[1]!; }
    else if (letMatch) { kind = "let"; name = letMatch[1]!; }
    if (kind === null || name === null) {
      const nl = source.indexOf("\n", idx);
      idx = nl < 0 ? srcLength : nl + 1;
      continue;
    }
    const endIdx = scanDeclarationEnd(source, idx, kind);
    decls.push({ name, kind, startIdx: idx, endIdx });
    idx = endIdx;
  }
  return decls;
}

// Parse destructured const decls too, as pseudo-decls sharing the span.
function parseTopLevelDeclsWithDestructure(source: string): Decl[] {
  const decls: Decl[] = [];
  const srcLength = source.length;
  let idx = 0;
  while (idx < srcLength) {
    const lineEnd = source.indexOf("\n", idx);
    const line = source.slice(idx, lineEnd < 0 ? srcLength : lineEnd);
    let kind: DeclKind | null = null; let name: string | null = null;
    const stripped = line.replace(/^export /, "");
    const funcMatch = FUNC_RE.exec(stripped);
    const ifaceMatch = IFACE_RE.exec(stripped);
    const typeMatch = TYPE_RE.exec(stripped);
    const constMatch = CONST_NAME_RE.exec(stripped);
    const letMatch = LET_NAME_RE.exec(stripped);
    if (funcMatch) { kind = "function"; name = funcMatch[1]!; }
    else if (ifaceMatch) { kind = "interface"; name = ifaceMatch[1]!; }
    else if (typeMatch) { kind = "type"; name = typeMatch[1]!; }
    else if (constMatch) { kind = "const"; name = constMatch[1]!; }
    else if (letMatch) { kind = "let"; name = letMatch[1]!; }
    else if (DESTRUCT_RE.test(stripped)) {
      kind = "const";
      const endIdx = scanDeclarationEnd(source, idx, "const");
      const names = destructureNames(line.slice(line.indexOf("["), line.indexOf("]")));
      for (const n of names) decls.push({ name: n, kind, startIdx: idx, endIdx });
      idx = endIdx;
      continue;
    }
    if (kind === null || name === null) {
      const nl = source.indexOf("\n", idx);
      idx = nl < 0 ? srcLength : nl + 1;
      continue;
    }
    const endIdx = scanDeclarationEnd(source, idx, kind);
    decls.push({ name, kind, startIdx: idx, endIdx });
    idx = endIdx;
  }
  return decls;
}

// Strip // and /* */ comments and string/template literals.
function stripCommentsAndStrings(code: string): string {
  let out = "";
  let i = 0;
  const n = code.length;
  let inStr: "'" | '"' | null = null;
  let inTmpl = false;
  while (i < n) {
    const c = code[i]!;
    const next = code[i + 1]!;
    if (inStr !== null) {
      if (c === "\\") { i += 2; continue; }
      if (c === inStr) { inStr = null; i += 1; continue; }
      i += 1; continue;
    }
    if (inTmpl) {
      if (c === "\\") { i += 2; continue; }
      if (c === "`") { inTmpl = false; i += 1; continue; }
      i += 1; continue;
    }
    if (c === "/" && next === "/") { while (i < n && code[i] !== "\n") i += 1; continue; }
    if (c === "/" && next === "*") { i += 2; while (i < n && !(code[i] === "*" && code[i + 1] === "/")) i += 1; i += 2; continue; }
    if (c === '"' || c === "'") { inStr = c; i += 1; continue; }
    if (c === "`") { inTmpl = true; i += 1; continue; }
    out += c;
    i += 1;
  }
  return out;
}

function identifiersIn(code: string): Set<string> {
  const set = new Set<string>();
  const re = /[A-Za-z_$][\w$]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) set.add(m[0]);
  return set;
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectTsFiles(path, out);
    else if (entry.name.endsWith(".ts")) out.push(path);
  }
  return out;
}

// Every non-battleScene module's exported names.
const EXPORT_RE = /export\s+(?:const|let|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const EXPORT_LIST_RE = /export\s*\{([^}]+)\}/g;
const EXPORT_TYPE_RE = /export\s+type\s+([A-Za-z_$][\w$]*)/g;

function moduleExports(filePath: string): Set<string> {
  const text = readFileSync(filePath, "utf8");
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(EXPORT_RE.source, "g");
  while ((m = re.exec(text)) !== null) set.add(m[1]!);
  const re2 = new RegExp(EXPORT_TYPE_RE.source, "g");
  while ((m = re2.exec(text)) !== null) set.add(m[1]!);
  const re3 = new RegExp(EXPORT_LIST_RE.source, "g");
  while ((m = re3.exec(text)) !== null) {
    for (const spec of m[1]!.split(",")) {
      const s = spec.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim();
      if (/^[A-Za-z_$][\w$]*$/.test(s)) set.add(s);
    }
  }
  return set;
}

function main(): void {
  const source = readFileSync(BATTLE_SCENE_PATH, "utf8");
  const canonicalSource = readFileSync(CANONICAL_PATH, "utf8");
  const decls = parseTopLevelDeclsWithDestructure(source);
  const byName = new Map<string, Decl>();
  for (const decl of decls) {
    if (byName.has(decl.name)) throw new Error(`duplicate top-level ${decl.name}`);
    byName.set(decl.name, decl);
  }
  const moved = new Set<string>();
  for (const d of parseTopLevelDeclsWithDestructure(canonicalSource)) moved.add(d.name);

  // All exportable names from non-battleScene modules (importable without cycle).
  const importable = new Set<string>();
  for (const f of collectTsFiles(ENGINE_DIR)) {
    if (f.endsWith("battleScene.ts") || f.endsWith("battleSceneCanonical.ts")) continue;
    for (const name of moduleExports(f)) importable.add(name);
  }
  // Also union of module exports across src/ top level (assets, data) - cheap.
  for (const dir of ["src/assets/gen", "src/data/gen"]) {
    const full = join(ROOT, dir);
    try {
      for (const f of readdirSync(full)) {
        if (!f.endsWith(".json")) continue;
        // JSON default exports are referenced via a local const -> the const's
        // own import line is not in the body, so no cross-module ref surfaces.
      }
    } catch { /* ignore */ }
  }

  // Type names declared in battleScene.ts itself (interface/type decls).
  const battleSceneTypes = new Set<string>();
  for (const d of decls) if (d.kind === "interface" || d.kind === "type") battleSceneTypes.add(d.name);

  const FORBIDDEN = new Set([
    "ONIX_SITRUS_ROTATE_RENDER_LAG",
    "ONIX_SITRUS_IDENTITY_RENDER_TICK",
    "onixSitrusRotateMatrix",
    "turn5SitrusRingMatrix",
    "turn10OnixDarkPaletteCache",
    "menuHealthboxPlayerContentMask",
  ]);

  // Build canonical bucket via partition script (authoritative).
  const stdout = execFileSync(process.execPath, ["--experimental-strip-types", join(ROOT, "tools/report/battlescene-split-partition.ts")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const canonicalBucket = new Set<string>();
  const sharedBucket = new Set<string>();
  const lines = stdout.split("\n");
  let inCanonical = false; let inShared = false;
  for (const line of lines) {
    if (line.startsWith("CANONICAL (")) { inCanonical = true; inShared = false; continue; }
    if (line.startsWith("SHARED (")) { inShared = true; inCanonical = false; continue; }
    if ((inCanonical || inShared) && line.trim() === "") { inCanonical = false; inShared = false; continue; }
    if (/^[A-Za-z_$][\w$]*$/.test(line.trim())) {
      if (inCanonical) canonicalBucket.add(line.trim());
      else if (inShared) sharedBucket.add(line.trim());
    }
  }
  // destructured consts count as canonical if their first name is canonical.
  // Add all decls to canonical/unknown bucket heuristically via partition list only.

  const linesOut: string[] = [];
  const blockerMap = new Map<string, string[]>();
  const canonicalOnlyBlockersMap = new Map<string, string[]>();
  for (const name of canonicalBucket) {
    const decl = byName.get(name);
    if (!decl) { linesOut.push(`${name} | NOT-PARSED`); continue; }
    const body = stripCommentsAndStrings(source.slice(decl.startIdx, decl.endIdx));
    const ids = identifiersIn(body);
    ids.delete(name);
    const blockers: string[] = [];
    const canonicalOnlyBlockers: string[] = [];
    for (const id of ids) {
      if (moved.has(id)) continue;
      if (battleSceneTypes.has(id)) continue;
      if (importable.has(id)) continue;
      if (byName.has(id)) {
        blockers.push(id);
        if (canonicalBucket.has(id)) canonicalOnlyBlockers.push(id);
      }
    }
    blockerMap.set(name, blockers);
    canonicalOnlyBlockersMap.set(name, canonicalOnlyBlockers);
  }

  // Find minimal self-contained clusters: a set S of canonical symbols such
  // that every s in S has blockers(s) - (already moved/importable/types) all
  // within S (i.e. no blocker outside S). Greedy: grow from each unassigned
  // symbol, adding any blocker; then check all blockers stay inside.
  const clusters: string[][] = [];
  const assigned = new Set<string>();
  for (const name of canonicalBucket) {
    if (assigned.has(name)) continue;
    const cluster = new Set<string>([name]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const member of [...cluster]) {
        for (const b of blockerMap.get(member) ?? []) {
          if (canonicalBucket.has(b) && !cluster.has(b)) { cluster.add(b); grew = true; }
        }
      }
    }
    // external blockers = blockers of members not in cluster and not moved/importable/type
    const external = new Set<string>();
    for (const member of cluster) {
      for (const b of blockerMap.get(member) ?? []) {
        if (!cluster.has(b) && !moved.has(b) && !battleSceneTypes.has(b) && !importable.has(b)) external.add(b);
      }
    }
    const ok = external.size === 0;
    if (ok) {
      clusters.push([...cluster]);
      for (const m of cluster) assigned.add(m);
    } else {
      // leave unassigned - report as blocked cluster
      clusters.push([...cluster, `__EXTERNAL:${[...external].join(",")}`]);
      for (const m of cluster) assigned.add(m);
    }
  }

  const cleanClusters = clusters.filter((c) => !c.some((x) => x.startsWith("__EXTERNAL")));
  cleanClusters.sort((a, b) => b.length - a.length);
  console.log(`SELF-CONTAINED CLUSTERS (${cleanClusters.length}):`);
  let total = 0;
  for (const c of cleanClusters) {
    total += c.length;
    console.log(`  [${c.length}] ${c.join(", ")}`);
  }
  console.log(`total cluster symbols: ${total}`);
  console.log("");
}

main();
