/**
 * prep20 Pursuit: assembler vs retained corpora (normal player / normal opponent / switchout opponent) and fresh alternates,
 * entry-by-entry over all 128 hardware OAM entries per row, plus the Scene-ON renderer with the prototype buffer vs raw RGB.
 * usage: npx vite-node tools/integration/prep20PursuitCheck.ts [--pixels] [alt.json:altRgbDir:window[:ATT,TGT] ...] [--out=out.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { pursuitConfigFor, pursuitInputsFor, type PursuitWindow } from "../compare/verifyPursuitReducer.ts";
import { assemblePursuitHardwareOam, type PursuitKnownEntry } from "./prep20PursuitAssembler.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };

function knownFor(window: PursuitWindow, rows: Json[]): PursuitKnownEntry {
  const input = pursuitInputsFor(window, rows, 0), row1 = rows[1]!, order = row1.spriteOrder as number[];
  const tileRange = row1.resourceAllocators.tileRanges[input.impact.tileSlot];
  // healthbox slots = the leading six of the lent order (sprites 62,60,x,63,y,61); entries = measured row-1 block (host constant)
  return { healthboxAttr: row1.hardwareOam.slice(0, 9).map(attrOf), healthboxSlots: order.slice(0, 6),
    attackerSlot: input.attackerSpriteSlot, targetSlot: input.targetSpriteSlot,
    attackerAttr: rows[0]!.battlerSprites.attacker.attr, targetAttr: rows[0]!.battlerSprites.target.attr,
    impactSlot: input.impact.slot, impactMatrixNum: input.impact.matrixSlot, impactTile: tileRange[0], impactPaletteBank: input.impact.paletteSlot,
    dummyAttr: [0x00a0, 0x0130, 0x0c00] };
}
function run(name: string, window: PursuitWindow, rows: Json[], pixels: ((row: Json) => Uint8Array) | null, species?: readonly [string, string]) {
  const known = knownFor(window, rows);
  const out: Json = { name, rows: rows.length - 1, entries: 0, entryMatch: 0, rowsExact: 0, mismatchByIndexClass: {}, examples: [] as string[] };
  let exactPixelRows = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const input = pursuitInputsFor(window, rows, age);
    const got = age === 0 ? rows[0]!.hardwareOam : assemblePursuitHardwareOam(age, { branch: input.branch, targetImpactCenter: input.targetImpactCenter, known,
      spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    if (age > 0) { let ok = true; const exp: string[] = rows[age]!.hardwareOam;
      for (let i = 0; i < 128; i += 1) { out.entries += 1; if (got[i] === exp[i]) out.entryMatch += 1; else { ok = false;
        const cls = i < 9 ? "healthbox" : "move/battler"; out.mismatchByIndexClass[cls] = (out.mismatchByIndexClass[cls] ?? 0) + 1;
        if (out.examples.length < 6) out.examples.push(`${age}/${i}: want ${exp[i]} got ${got[i]}`); } }
      if (ok) out.rowsExact += 1; }
    if (pixels) { let config = pursuitConfigFor(window, rows, age);
      if (species) config = { ...config, attacker: { ...config.attacker, species: species[0] as never }, target: { ...config.target, species: species[1] as never } };
      const hwMat = rows[age]!.hardwareMatrices; void hwMat;
      const proto = { ...config, animationInputs: { ...config.animationInputs, buffers: { ...config.animationInputs.buffers, hardwareOam: got } } };
      const raw = pixels(rows[age]!);
      if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
      const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(proto as never), age } as never }), raw);
      residual += d; if (!d) exactPixelRows += 1; else if (failures.length < 8) failures.push(`${age}:${d}`); }
  }
  if (pixels) Object.assign(out, { pixelRowsExact: exactPixelRows, pixelRows: rows.length, residualPixels: residual, pixelFailures: failures });
  return out;
}
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6);
const withPixels = args.includes("--pixels");
const tarRgb = (stem: string) => { const dir = createScratchDir(`prep20-pursuit-${stem}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/pursuit-${stem}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const ev = (n: string) => resolve(root, `tools/compare/evidence/pursuit-${n}-dense-state.json.gz`);
const results = [
  run("accepted-player", "player-back", load(ev("player")), withPixels ? tarRgb("player") : null),
  run("accepted-opponent", "opponent-front", load(ev("opponent")), withPixels ? tarRgb("opponent") : null),
  run("accepted-switchout-opponent", "switchout-opponent-front", load(ev("switchout-opponent")), withPixels ? tarRgb("switchout-opponent") : null),
];
for (const spec of args.filter((a) => a.includes(":"))) { const [file, dir, window, sp] = spec.split(":");
  results.push(run(`alt:${file!.split("/").pop()}`, window as PursuitWindow, load(file!), withPixels ? dirRgb(dir!) : null, sp ? sp.split(",") as [string, string] : undefined)); }
console.log(JSON.stringify(results, null, 1));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
