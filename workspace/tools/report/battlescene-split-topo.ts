#!/usr/bin/env node --experimental-strip-types
/**
 * battleScene.ts canonical-split topological batch helper (main lane).
 *
 * For the CANONICAL bucket symbols still in battleScene.ts, computes which
 * other still-present canonical symbols each one references (identifier
 * based, same over-approximation as battlescene-split-partition.ts), so a
 * batch can be selected whose canonical-only dependencies have all already
 * moved to battleSceneCanonical.ts.
 *
 * Output per still-present canonical symbol:
 *   name | status | missing-canonical-deps (comma list) | referenced-moved-canonical
 * where status is MOVEABLE (all canonical deps already moved), WAIT (has
 * un-moved canonical deps, listed), or FORBIDDEN (the ONIX cluster / the two
 * let caches / animation imports, listed separately).
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BATTLE_SCENE_PATH = join(ROOT, "src/engine/battleScene.ts");
const CANONICAL_PATH = join(ROOT, "src/engine/battleSceneCanonical.ts");

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
    else if (/^(?:export )?const \[/.test(line)) { kind = "const"; name = null; } // destructured - skip
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

// Canonical bucket = read from partition script's stdout (authoritative).
function canonicalBucket(): Set<string> {
  const out = new Set<string>();
  const stdout = execFileSync(
    process.execPath,
    ["--experimental-strip-types", join(ROOT, "tools/report/battlescene-split-partition.ts")],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const lines = stdout.split("\n");
  let inCanonical = false;
  for (const line of lines) {
    if (line.startsWith("CANONICAL (")) { inCanonical = true; continue; }
    if (inCanonical && line.trim() === "") break;
    if (inCanonical && /^[A-Za-z_$][\w$]*$/.test(line.trim())) out.add(line.trim());
  }
  return out;
}

function main(): void {
  const source = readFileSync(BATTLE_SCENE_PATH, "utf8");
  const canonicalSource = readFileSync(CANONICAL_PATH, "utf8");
  const decls = parseTopLevelDecls(source);
  const byName = new Map<string, Decl>();
  for (const decl of decls) {
    if (byName.has(decl.name)) throw new Error(`duplicate top-level ${decl.name}`);
    byName.set(decl.name, decl);
  }

  // Symbols already in the canonical file (moved).
  const moved = new Set<string>();
  const canonicalDecls = parseTopLevelDecls(canonicalSource);
  for (const d of canonicalDecls) moved.add(d.name);

  const canonicalBucketSet = canonicalBucket();

  // Reference adjacency among still-present battleScene.ts symbols.
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

  // Detect animation imports needed: a canonical symbol whose body references
  // ../animation/* path strings. Over-approximate by scanning for `animation/`.
  // (We only flag; the real gate is whether the canonical file would import it.)

  const FORBIDDEN = new Set([
    "ONIX_SITRUS_ROTATE_RENDER_LAG",
    "ONIX_SITRUS_IDENTITY_RENDER_TICK",
    "onixSitrusRotateMatrix",
    "turn5SitrusRingMatrix",
    "turn10OnixDarkPaletteCache",
    "menuHealthboxPlayerContentMask",
  ]);

  const lines: string[] = [];
  for (const name of canonicalBucketSet) {
    const decl = byName.get(name);
    if (!decl) {
      lines.push(`${name} | NOT-PARSED | const | valueBackRefs:[] | allBackRefs:[]`);
      continue;
    }
    const body = source.slice(decl.startIdx, decl.endIdx);
    const missing: string[] = [];
    const backRefs: string[] = []; // refs to symbols still in battleScene.ts (shared/live/imports)
    const valueBackRefs: string[] = []; // ...that are VALUES (runtime import needed -> cycle)
    for (const ref of adjacency.get(name) ?? []) {
      if (!moved.has(ref) && canonicalBucketSet.has(ref) && ref !== name) missing.push(ref);
      if (!moved.has(ref) && !canonicalBucketSet.has(ref)) {
        backRefs.push(ref);
        const otherDecl = byName.get(ref);
        if (otherDecl && (otherDecl.kind === "const" || otherDecl.kind === "let" || otherDecl.kind === "function")) {
          valueBackRefs.push(ref);
        }
      }
    }
    const usesAnimationPath = /from\s+["'][^"']*animation\//.test(body) || /import\(["'][^"']*animation\//.test(body);
    let status: string;
    if (FORBIDDEN.has(name)) status = "FORBIDDEN";
    else if (usesAnimationPath) status = "ANIMATION-IMPORT";
    else if (missing.length === 0) status = "MOVEABLE";
    else status = `WAIT(${missing.length})`;
    lines.push(
      `${name} | ${status} | ${decl.kind} | valueBackRefs:[${valueBackRefs.join(",")}] | allBackRefs:[${backRefs.join(",")}]`,
    );
  }
  lines.sort();
  const moveable = lines.filter((l) => l.includes("| MOVEABLE |"));
  const forbidden = lines.filter((l) => l.includes("FORBIDDEN"));
  const anim = lines.filter((l) => l.includes("ANIMATION-IMPORT"));
  const noValueRef = moveable.filter((l) => l.includes("| valueBackRefs:[] |"));
  console.log(`MOVEABLE-no-value-backrefs (${noValueRef.length}):`);
  console.log(noValueRef.join("\n"));
  console.log("");
  console.log(`FORBIDDEN (${forbidden.length}):`);
  console.log(forbidden.map((l) => l.split(" | ")[0]).join(", "));
  console.log("");
  if (anim.length) {
    console.log(`ANIMATION-IMPORT (${anim.length}):`);
    console.log(anim.join("\n"));
  }
}

main();
