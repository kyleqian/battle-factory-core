#!/usr/bin/env node --experimental-strip-types
/**
 * Verbatim-move a set of canonical symbols from battleScene.ts into
 * battleSceneCanonical.ts, adding re-export + import lines to battleScene.ts.
 *
 * Usage: node --experimental-strip-types tools/report/battlescene-split-move.ts NAME1 NAME2 ...
 *
 * Handles: single-name const/let/function, and destructured `const [A, B] =
 * ...` declarations (both names must be listed; the whole statement moves).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BATTLE_SCENE_PATH = join(ROOT, "src/engine/battleScene.ts");
const CANONICAL_PATH = join(ROOT, "src/engine/battleSceneCanonical.ts");

type DeclKind = "function" | "const" | "let" | "interface" | "type";
interface Decl { name: string; kind: DeclKind; exported: boolean; startIdx: number; endIdx: number; }

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

const IDENT_RE = /[A-Za-z_$][\w$]*/g;
function destructureNames(line: string): string[] {
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = IDENT_RE.exec(line)) !== null) names.push(m[0]);
  return names;
}

function parseDecls(source: string): Decl[] {
  const decls: Decl[] = [];
  const srcLength = source.length;
  let idx = 0;
  while (idx < srcLength) {
    const lineEnd = source.indexOf("\n", idx);
    const line = source.slice(idx, lineEnd < 0 ? srcLength : lineEnd);
    const exported = /^export /.test(line);
    const stripped = exported ? line.slice("export ".length) : line;
    let kind: DeclKind | null = null; let name: string | null = null;
    const fm = /^(?:export )?function ([A-Za-z_$][\w$]*)/.exec(line);
    const im = /^(?:export )?interface ([A-Za-z_$][\w$]*)/.exec(line);
    const tm = /^(?:export )?type ([A-Za-z_$][\w$]*)/.exec(line);
    const cm = /^(?:export )?const ([A-Za-z_$][\w$]*)/.exec(line);
    const lm = /^(?:export )?let ([A-Za-z_$][\w$]*)/.exec(line);
    if (fm) { kind = "function"; name = fm[1]!; }
    else if (im) { kind = "interface"; name = im[1]!; }
    else if (tm) { kind = "type"; name = tm[1]!; }
    else if (cm) { kind = "const"; name = cm[1]!; }
    else if (lm) { kind = "let"; name = lm[1]!; }
    else if (/^(?:export )?const \[/.test(line)) {
      const endIdx = scanDeclarationEnd(source, idx, "const");
      const names = destructureNames(line.slice(line.indexOf("["), line.indexOf("]")));
      for (const n of names) decls.push({ name: n, kind: "const", exported, startIdx: idx, endIdx });
      idx = endIdx;
      continue;
    }
    if (kind === null || name === null) {
      const nl = source.indexOf("\n", idx);
      idx = nl < 0 ? srcLength : nl + 1;
      continue;
    }
    const endIdx = scanDeclarationEnd(source, idx, kind);
    decls.push({ name, kind, exported, startIdx: idx, endIdx });
    idx = endIdx;
  }
  return decls;
}

function main(): void {
  const wanted = new Set(process.argv.slice(2));
  const source = readFileSync(BATTLE_SCENE_PATH, "utf8");
  const canonical = readFileSync(CANONICAL_PATH, "utf8");
  const decls = parseDecls(source);

  // Group by span so destructured siblings move once.
  const spans = new Map<string, { startIdx: number; endIdx: number; exported: boolean; names: string[] }>();
  for (const d of decls) {
    if (!wanted.has(d.name)) continue;
    const key = `${d.startIdx}:${d.endIdx}`;
    if (!spans.has(key)) spans.set(key, { startIdx: d.startIdx, endIdx: d.endIdx, exported: d.exported, names: [] });
    const rec = spans.get(key)!;
    rec.exported = rec.exported || d.exported;
    if (!rec.names.includes(d.name)) rec.names.push(d.name);
  }

  if (spans.size === 0) throw new Error("no matching decls");

  // Sort spans descending so we can cut from the end.
  const spanList = [...spans.values()].sort((a, b) => b.startIdx - a.startIdx);

  let out = source;
  const movedTexts: string[] = [];
  for (const span of spanList) {
    const body = out.slice(span.startIdx, span.endIdx);
    // strip the export keyword so we re-emit a single canonical decl
    const exportedDecl = /^export /m.test(body);
    const declBody = exportedDecl ? body.replace(/^export /, "") : body;
    // ensure exported in canonical
    const canonicalDecl = /^export /.test(declBody) ? declBody : `export ${declBody}`;
    movedTexts.push(canonicalDecl);
    out = out.slice(0, span.startIdx) + out.slice(span.endIdx);
  }

  const newLines = movedTexts.join("\n\n").trim();
  const newCanonical = `${canonical.replace(/\n*$/, "")}\n\n// --- slice 4 batch: verbatim move ---\n\n${newLines}\n`;
  writeFileSync(CANONICAL_PATH, newCanonical);
  writeFileSync(BATTLE_SCENE_PATH, out);
  console.log(`moved ${spans.size} decl span(s), ${spanList.reduce((a, s) => a + (s.endIdx - s.startIdx), 0)} bytes cut.`);
  for (const rec of spanList) {
    console.log(`  ${rec.names.join(", ")} (${rec.names.length} name(s), exported=${rec.exported})`);
  }
  console.log(`\nNow add import + export lines to battleScene.ts for: ${[...spans.values()].flatMap((s) => s.names).join(", ")}`);
}

main();
