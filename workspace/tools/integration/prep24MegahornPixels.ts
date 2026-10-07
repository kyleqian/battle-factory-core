/**
 * prep24 Megahorn pixels: the EXISTING Scene-ON renderer (battleScene.ts MEGAHORN branch, no src change) fed with the prep20 hardware OAM +
 * matrices AND the prep24 registers / palette / tasks, vs raw mGBA RGB.  Row 0 (pre-activation) uses the corpus buffers as in prep20.
 * usage: npx vite-node tools/integration/prep24MegahornPixels.ts [alt.json:altRgbDir:player|opponent:ATT,TGT ...] [--out=out.json] [--oam=corpus]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { megaHornConfigFor, type MegaHornWindow } from "../compare/verifyMegaHornReducer.ts";
import { assembleMegahornHardwareOam, type MegahornKnownEntry } from "./prep20MegahornAssembler.ts";
import { megahornModel } from "./prep24MegahornModel.ts";
process.env.PREP24_LIB = "1";
const { knownFor: knownFor24, load } = await import("./prep24MegahornCheck.ts");

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const word = (e: string, o: number) => parseInt(e.slice(o + 2, o + 4) + e.slice(o, o + 2), 16);
const attrOf = (e: string) => [word(e, 0), word(e, 4), word(e, 8)] as const;
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
function knownOam(rows: Json[]): MegahornKnownEntry {   // identical to prep20MegahornCheck.knownFor
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
let neg: string | undefined;
function run(name: string, window: MegaHornWindow, rows: Json[], pixels: (row: Json) => Uint8Array, species: readonly [string, string] | undefined, useCorpusOam: boolean) {
  const side = window === "player-back" ? "player" : "opponent", known = knownOam(rows), kn = knownFor24(rows, side), flip = neg === "phase", model = megahornModel(flip ? { ...kn, phase: { monbgCntRow: kn.phase.monbgCntRow === 7 ? 8 : 7, endLate: !kn.phase.endLate } } : kn);
  const splat = rows.find((r) => r.sprites.some((s: Json) => /HitSplat/.test(s.template?.symbol ?? "")))!.sprites.find((s: Json) => /HitSplat/.test(s.template.symbol));
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const oam = age === 0 || useCorpusOam ? { oam: rows[age]!.hardwareOam as string[], matrices: rows[age]!.hardwareMatrices }
      : assembleMegahornHardwareOam(age, { attackerSide: side, targetInitialOffset: { x: rows[0]!.battlerSprites.target.x2, y: rows[0]!.battlerSprites.target.y2 }, targetPicCenter: { x: splat.x, y: splat.y }, known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    const m = model[age]!;
    let config = megaHornConfigFor(window, rows, age);
    if (species) config = { ...config, attacker: { ...config.attacker, species: species[0] as never }, target: { ...config.target, species: species[1] as never },
      animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: species[0] }, targetArt: { ...config.animationInputs.targetArt, displaySpecies: species[1] } } };
    const ai = config.animationInputs;
    const proto = { ...config, animationInputs: { ...ai, buffers: { ...ai.buffers, hardwareOam: oam.oam, hardwareMatrices: oam.matrices },
      palette: neg === "palette" ? { unfaded: model[0]!.unfadedPalette, faded: model[0]!.hardwarePalette, hardware: model[0]!.hardwarePalette } : { unfaded: m.unfadedPalette, faded: m.hardwarePalette, hardware: m.hardwarePalette }, registers: neg === "registers" ? model[0]!.registers : m.registers,
      liveTasks: m.tasks.map((t) => ({ slot: t.slot, callback: t.callback, data: t.data })) } };
    const raw = pixels(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(proto as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 10) failures.push(`${age}:${d}`);
  }
  return { name, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures, oam: useCorpusOam ? "corpus" : "prep20 assembler" };
}
const args = process.argv.slice(2);
const outPath = args.find((a) => a.startsWith("--out="))?.slice(6), corpusOam = args.includes("--oam=corpus"), negArg = args.find((a) => a.startsWith("--neg="))?.slice(6);
neg = negArg;
const tarRgb = (side: string) => { const dir = createScratchDir(`prep24-megahorn-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/mega-horn-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const)
  results.push(run(`accepted-${side}`, side === "player" ? "player-back" : "opponent-front", load(resolve(root, `tools/compare/evidence/mega-horn-${side}-dense-state.json.gz`)), tarRgb(side), undefined, corpusOam));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, sp] = spec.split(":");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side === "player" ? "player-back" : "opponent-front", load(file!), dirRgb(dir!), sp ? sp.split(",") as [string, string] : undefined, corpusOam)); }
console.log(JSON.stringify(results, null, 1));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
