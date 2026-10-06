/**
 * prep20 Will-O-Wisp: field-by-field check of the prototype assembler against the retained
 * corpora (2 accepted) and the fresh alternates (2, direct mGBA).
 * usage: npx vite-node tools/integration/prep20WispCheck.ts <altPlayer.json> <altOpponent.json> [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { willOWispInputsFor, type WillOWispWindow } from "../compare/verifyWillOWispReducer.ts";
import { assembleWispHardwareOam } from "./prep20WispAssembler.ts";
import { knownFor } from "./prep20WispKnown.ts";
import { decodeGbaHardwareOam } from "../../src/animation/gbaObjCompositor.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
function classify(i: number, order: number[], expected: string, got: string): string {
  if (i < 9) return "healthbox";
  const e = expected.slice(0, 12), g = got.slice(0, 12);
  if (e === g) return "pad-only";
  const tile = (s: string) => parseInt(s.slice(10, 12) + s.slice(8, 10), 16) & 0x3ff;
  const t = tile(expected);
  return t >= 537 && t < 565 ? "orb" : t >= 305 && t < 369 ? "fire" : "battler/other";
}
function check(name: string, window: WillOWispWindow, rows: Json[]) {
  const known = knownFor(window, rows);
  const stats = { rows: rows.length - 1, entries: 0, entryMatch: 0, rowsExact: 0, consumerRowsExact: 0, countMismatchRows: 0 };
  const classes: Record<string, number> = {}; const examples: string[] = [];
  for (let age = 1; age < rows.length; age += 1) {
    const input = willOWispInputsFor(window, rows, age);
    const got = assembleWispHardwareOam(age, { geometry: { side: input.attackerSide, attackerCenter: input.attackerCenter, targetCenter: input.targetCenter }, known,
      spriteOrderAt: (a) => rows[Math.max(a, 0)]!.spriteOrder });
    const exp: string[] = rows[age]!.hardwareOam;
    let rowOk = true;
    for (let i = 0; i < 128; i += 1) { stats.entries += 1;
      if (got[i] === exp[i]) stats.entryMatch += 1; else { rowOk = false;
        const c = classify(i, rows[age]!.spriteOrder, exp[i]!, got[i]!); classes[c] = (classes[c] ?? 0) + 1;
        if (examples.length < 6) examples.push(`${age}/${i}: want ${exp[i]} got ${got[i]} (${c})`); } }
    if (rowOk) stats.rowsExact += 1;
    const ident = [256, 0, 0, 256] as const, matrices = rows[age]!.hardwareMatrices;
    const view = (b: readonly string[]) => decodeGbaHardwareOam(b, matrices, ident).map((o) => JSON.stringify([o.oamIndex, o.attr]));
    const a = view(got), b = view(exp);
    if (a.length === b.length && a.every((v, i) => v === b[i])) stats.consumerRowsExact += 1;
  }
  return { name, ...stats, mismatchClasses: classes, examples };
}
const [altP, altO, out] = process.argv.slice(2);
const sets: [string, WillOWispWindow, Json[]][] = [
  ["accepted-player", "player-back", load(resolve(root, "tools/compare/evidence/will-o-wisp-player-dense-state.json.gz"))],
  ["accepted-opponent", "opponent-front", load(resolve(root, "tools/compare/evidence/will-o-wisp-opponent-dense-state.json.gz"))],
];
if (altP) sets.push(["alt-banette-player", "player-back", load(altP)]);
if (altO) sets.push(["alt-banette-opponent", "opponent-front", load(altO)]);
const results = sets.map(([n, w, r]) => check(n, w, r));
console.log(JSON.stringify(results, null, 1));
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
