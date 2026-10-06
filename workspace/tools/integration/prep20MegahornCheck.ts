/**
 * prep20 Megahorn: assembler (OAM + hardware matrices) vs retained corpora (player / opponent) and fresh alternates (HERACROSS vs GOLEM),
 * 128 entries + 32 matrices per row; Scene-ON renderer with the prototype buffers vs raw RGB with --pixels.
 * usage: npx vite-node tools/integration/prep20MegahornCheck.ts [--pixels] [alt.json:altRgbDir:player|opponent[:ATT,TGT] ...] [--out=out.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { megaHornConfigFor, megaHornInputsFor, type MegaHornWindow } from "../compare/verifyMegaHornReducer.ts";
import { assembleMegahornHardwareOam, type MegahornKnownEntry } from "./prep20MegahornAssembler.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function knownFor(rows: Json[]): MegahornKnownEntry {
  const row1 = rows[1]!, loaded = rows[100]!, A = loaded.resourceAllocators, order = row1.spriteOrder as number[];
  const tile = (tag: number) => A.tileRanges[loaded.tileTags.slice(0, 64).indexOf(tag)][0], pal = (tag: number) => loaded.paletteTags.indexOf(tag);
  const horn = rows.find((r) => r.sprites.some((s: Json) => /MegahornHorn/.test(s.template?.symbol ?? "")))!.sprites.find((s: Json) => /MegahornHorn/.test(s.template.symbol));
  const splat = rows.find((r) => r.sprites.some((s: Json) => /HitSplat/.test(s.template?.symbol ?? "")))!.sprites.find((s: Json) => /HitSplat/.test(s.template.symbol));
  return { healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: order.slice(0, 6),
    attackerSlot: rows[0]!.battlerSprites.attacker.slot, targetSlot: rows[0]!.battlerSprites.target.slot,
    attackerAttr: rows[0]!.battlerSprites.attacker.attr, targetAttr: rows[0]!.battlerSprites.target.attr,
    hornTile: tile(10153), hornPaletteBank: pal(10153), impactTile: tile(10135), impactPaletteBank: pal(10135),
    hornMatrixNum: horn.matrixNum, impactMatrixNum: splat.matrixNum, occupiedSlots: rows[0]!.sprites.map((s: Json) => s.slot), dummyAttr: [0x00a0, 0x0130, 0x0c00] };
}
function run(name: string, window: MegaHornWindow, rows: Json[], pixels: ((row: Json) => Uint8Array) | null, species?: readonly [string, string]) {
  const known = knownFor(rows), side = window === "player-back" ? "player" : "opponent";
  const splat = rows.find((r) => r.sprites.some((s: Json) => /HitSplat/.test(s.template?.symbol ?? "")))!.sprites.find((s: Json) => /HitSplat/.test(s.template.symbol));
  const out: Json = { name, rows: rows.length - 1, entries: 0, entryMatch: 0, rowsExact: 0, matrixRowsExact: 0, mismatchByIndexClass: {}, examples: [] as string[] };
  let exactPixelRows = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const got = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices }
      : assembleMegahornHardwareOam(age, { attackerSide: side, targetInitialOffset: { x: rows[0]!.battlerSprites.target.x2, y: rows[0]!.battlerSprites.target.y2 }, targetPicCenter: { x: splat.x, y: splat.y }, known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    if (age > 0) { let ok = true; const exp: string[] = rows[age]!.hardwareOam;
      for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got.oam[i] === exp[i]) out.entryMatch += 1; else { ok = false;
        const cls = i < 9 ? "healthbox" : "move/battler"; out.mismatchByIndexClass[cls] = (out.mismatchByIndexClass[cls] ?? 0) + 1;
        if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got.oam[i]}`); } }
      if (ok) out.rowsExact += 1; if (same(got.matrices, rows[age]!.hardwareMatrices)) out.matrixRowsExact += 1; }
    if (pixels) { let config = megaHornConfigFor(window, rows, age);
      if (species) config = { ...config, attacker: { ...config.attacker, species: species[0] as never }, target: { ...config.target, species: species[1] as never },
        animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: species[0] },
          targetArt: { ...config.animationInputs.targetArt, displaySpecies: species[1] } } };
      const proto = { ...config, animationInputs: { ...config.animationInputs, buffers: { ...config.animationInputs.buffers, hardwareOam: got.oam, hardwareMatrices: got.matrices } } };
      const raw = pixels(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
      const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(proto as never), age } as never }), raw);
      residual += d; if (!d) exactPixelRows += 1; else if (failures.length < 8) failures.push(`${age}:${d}`); }
  }
  if (pixels) Object.assign(out, { pixelRowsExact: exactPixelRows, pixelRows: rows.length, residualPixels: residual, pixelFailures: failures });
  void megaHornInputsFor;
  return out;
}
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), withPixels = args.includes("--pixels");
const tarRgb = (side: string) => { const dir = createScratchDir(`prep20-megahorn-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/mega-horn-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const)
  results.push(run(`accepted-${side}`, side === "player" ? "player-back" : "opponent-front", load(resolve(root, `tools/compare/evidence/mega-horn-${side}-dense-state.json.gz`)), withPixels ? tarRgb(side) : null));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, sp] = spec.split(":");
  results.push(run(`alt-${side}`, side === "player" ? "player-back" : "opponent-front", load(file!), withPixels ? dirRgb(dir!) : null, sp ? sp.split(",") as [string, string] : undefined)); }
console.log(JSON.stringify(results, null, 1));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
