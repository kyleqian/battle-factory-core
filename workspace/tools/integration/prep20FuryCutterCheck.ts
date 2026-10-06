/**
 * prep20 Fury Cutter: assembler vs retained corpora (8 windows: 2 sides x counters 1-4) and fresh alternates (SCYTHER vs GOLEM, both sides,
 * 4 bodies each): 128-entry equality per row, plus the Scene-ON renderer with the prototype buffer vs raw RGB (--pixels).
 * usage: npx vite-node tools/integration/prep20FuryCutterCheck.ts [--pixels] [alt.json:altRgbDir:player|opponent[:ATT,TGT] ...] [--out=out.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { furyCutterConfigFor, furyCutterInputsFor, type FuryCutterWindow } from "../compare/furyCutterProduction.ts";
import { assembleFuryCutterHardwareOam, type FuryCutterKnownEntry } from "./prep20FuryCutterAssembler.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };

function knownFor(rows: Json[]): FuryCutterKnownEntry {
  const row1 = rows[1]!, order = row1.spriteOrder as number[], tagIndex = row1.tileTags.slice(0, 64).indexOf(10138);
  return { healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: order.slice(0, 6),
    attackerSlot: rows[0]!.battlerSprites.attacker.slot, targetSlot: rows[0]!.battlerSprites.target.slot,
    attackerAttr: rows[0]!.battlerSprites.attacker.attr, targetAttr: rows[0]!.battlerSprites.target.attr,
    occupiedSlots: rows[0]!.sprites.map((s: Json) => s.slot), cutTileBase: row1.resourceAllocators.tileRanges[tagIndex][0],
    cutPaletteBank: 16 + row1.paletteTags.indexOf(10138) - 16, dummyAttr: [0x00a0, 0x0130, 0x0c00] };
}
function run(name: string, window: FuryCutterWindow, rows: Json[], pixels: ((row: Json) => Uint8Array) | null, species?: readonly [string, string], trueCounter?: number) {
  const known = knownFor(rows); const counter = trueCounter ?? Number(window.at(-1));
  const out: Json = { name, rows: rows.length - 1, entries: 0, entryMatch: 0, rowsExact: 0, mismatchByIndexClass: {}, examples: [] as string[] };
  let exactPixelRows = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const input = furyCutterInputsFor(window, rows, age);
    const got = age === 0 ? rows[0]!.hardwareOam : assembleFuryCutterHardwareOam(age, { rightHit: (counter & 1) === 1, targetSide: input.targetSide,
      known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    if (age > 0) { let ok = true; const exp: string[] = rows[age]!.hardwareOam;
      for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got[i] === exp[i]) out.entryMatch += 1; else { ok = false;
        const cls = i < 9 ? "healthbox" : "move/battler"; out.mismatchByIndexClass[cls] = (out.mismatchByIndexClass[cls] ?? 0) + 1;
        if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got[i]}`); } }
      if (ok) out.rowsExact += 1; }
    if (pixels) { let config = furyCutterConfigFor(window, rows, age);
      if (species) config = { ...config, attacker: { ...config.attacker, species: species[0] as never }, target: { ...config.target, species: species[1] as never },
        animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: species[0] },
          targetArt: { ...config.animationInputs.targetArt, displaySpecies: species[1] } } };
      const proto = { ...config, animationInputs: { ...config.animationInputs, buffers: { ...config.animationInputs.buffers, hardwareOam: got } } };
      const raw = pixels(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
      const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(proto as never), age } as never }), raw);
      residual += d; if (!d) exactPixelRows += 1; else if (failures.length < 6) failures.push(`${age}:${d}`); }
  }
  if (pixels) Object.assign(out, { pixelRowsExact: exactPixelRows, pixelRows: rows.length, residualPixels: residual, pixelFailures: failures });
  return out;
}
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), withPixels = args.includes("--pixels");
const tarRgb = (side: string) => { const dir = createScratchDir(`prep20-fury-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/fury-cutter-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) {
  const all = load(resolve(root, `tools/compare/evidence/fury-cutter-${side}-dense-state.json.gz`)), rgb = withPixels ? tarRgb(side) : null;
  for (const counter of [1, 2, 3, 4]) results.push(run(`accepted-${side}-${counter}`, `${side === "player" ? "player-back" : "opponent-front"}-${counter}` as FuryCutterWindow,
    all.slice((counter - 1) * 43, counter * 43), rgb));
}
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, sp] = spec.split(":"); const all = load(file!);
  for (const counter of [1, 2, 3, 4]) results.push(run(`alt-${side}-${counter}`, `${side === "player" ? "player-back" : "opponent-front"}-${counter}` as FuryCutterWindow,
    all.slice((counter - 1) * 43, counter * 43), withPixels ? dirRgb(dir!) : null, sp ? sp.split(",") as [string, string] : undefined)); }
// counter 5: window label is only used for side/art inputs; `rightHit` = (true counter & 1), counter capped at 5 (battle_script_commands.c:8591)
for (const spec of args.filter((a) => a.startsWith("--six="))) { const [file, dir] = spec.slice(6).split(":"); const all = load(file!), bodies = Math.floor(all.length / 43);
  for (let body = 0; body < bodies; body += 1) { const counter = Math.min(body + 1, 5), rows = all.slice(body * 43, body * 43 + 43);
    const r = run(`six-hits-body${body + 1}-counter${counter}`, `player-back-${Math.min(counter, 4)}` as FuryCutterWindow, rows, withPixels ? dirRgb(dir!) : null, undefined, counter); results.push(r); } }
const total = results.reduce((a, r) => ({ rows: a.rows + r.rows, rowsExact: a.rowsExact + r.rowsExact, entries: a.entries + r.entries, entryMatch: a.entryMatch + r.entryMatch }), { rows: 0, rowsExact: 0, entries: 0, entryMatch: 0 });
console.log(JSON.stringify({ total, windows: results }, null, 1));
if (outPath) writeFileSync(outPath, `${JSON.stringify({ total, windows: results }, null, 1)}\n`);
