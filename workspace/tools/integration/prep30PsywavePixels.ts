/**
 * prep30 Psywave pixels: the EXISTING Scene-ON renderer (battleScene.ts PSYWAVE branch, no src change) fed with the prep30 source-derived inputs
 * (assembled hardware OAM + matrices, ring OAM / allocations, registers, three palettes, fade task data, VRAM labels; sprite order lent; the
 * not-modelled BlendColorCycleLoop / sound task data, resources and audio come from the base config = corpus row, they are not rendered) vs raw RGB.
 * usage: npx vite-node tools/integration/prep30PsywavePixels.ts [alt.json:rgbDir:player|opponent ...] [--out=out.json] [--phase=flip] [--feed=corpus] [--neg=oam|palette]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { psywaveConfigFor } from "../compare/verifyPsywaveReducer.ts";
import { assemblePsywaveHardwareOam, psywaveModel, pwRows } from "./prep30PsywaveModel.ts";
import { speciesName } from "./prep30Species.ts";
process.env.PREP30_LIB = "1"; process.env.PREP30_PW_LIB = "1";
const { loadFrames, speciesOf } = await import("./prep30ExtrasensoryCheck.ts");
const { knownForPw, measuredLateLagPw, ACCEPTED_PW } = await import("./prep30PsywaveCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6), flip = args.includes("--phase=flip"), corpusFeed = args.includes("--feed=corpus");
function diffRows(app: Uint8Array, raw: Uint8Array) { let n = 0; const rows = new Set<number>();
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) { n += 1; rows.add(Math.floor(p / 240)); } return { n, rows: rows.size }; }
function run(name: string, side: "player" | "opponent", rows: Json[], rgb: (row: Json) => Uint8Array) {
  const lateLag = flip ? !measuredLateLagPw(rows) : measuredLateLagPw(rows), base = knownForPw(rows, side, lateLag);
  const known = neg === "oam" ? { ...base, origin: { ...base.origin, y: base.origin.y + 3 } } : neg === "palette" ? { ...base, psychicPalette: base.psychicPalette.map((c: number) => c ^ 0x0421) } : base;
  const model = psywaveModel(known), sp = speciesOf(rows, side), names = [speciesName(sp.attacker), speciesName(sp.target)] as const, n = Math.min(rows.length, pwRows(known));
  const win = side === "player" ? "player-back" : "opponent-front";
  let exact = 0, residual = 0, rowsBad = 0; const failures: string[] = [], perRow: number[] = [];
  for (let age = 0; age < n; age += 1) {
    const c = psywaveConfigFor(win, rows, Math.min(age, rows.length - 1)), ai = c.animationInputs, m = model[age]!;
    const oam = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices as number[][] } : assemblePsywaveHardwareOam(age, known, model, (s) => rows[Math.max(s, 0)]!.spriteOrder);
    const fade = m.tasks.find((t) => t.callback === "Task_FadeToBg")?.data;
    const config = corpusFeed ? { ...c, animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: names[0] }, targetArt: { ...ai.targetArt, displaySpecies: names[1] } } } : { ...c,
      attacker: { ...c.attacker, species: names[0] as never }, target: { ...c.target, species: names[1] as never },
      animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: names[0], attr: known.attacker.attr }, targetArt: { ...ai.targetArt, displaySpecies: names[1], attr: known.target.attr },
        ringOam: m.rings.map((s) => ({ slot: s.slot, attr: [0x8000 | 0x0300 | (s.y + s.y2 - 32) & 0xff, 0x8000 | s.matrix << 9 | (s.x + s.x2 - 16) & 0x1ff, known.ringTile | 2 << 10 | known.ringBank << 12], subpriority: ai.ringOam[0]?.subpriority ?? 0 })),
        spriteOrder: rows[age]!.spriteOrder,
        buffers: { softwareOam: oam.oam, hardwareOam: oam.oam, softwareMatrices: oam.matrices as never, hardwareMatrices: oam.matrices as never },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette }, registers: m.registers,
        background: { currentVram: `vram-${m.vram}`, battleVram: "vram-0", psychicVram: "vram-1" },
        sharedTaskData: { ...ai.sharedTaskData, fadeToPsychic: fade ?? null, restoreBattle: fade ?? null } } };
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    let d: { n: number; rows: number };
    try { d = diffRows(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw); }
    catch (err) { d = { n: 240 * 160, rows: 160 }; if (failures.length < 12) failures.push(`${age}:throw ${String((err as Error).message).slice(0, 60)}`); }
    residual += d.n; rowsBad += d.rows; perRow.push(d.n); if (!d.n) exact += 1; else if (failures.length < 12) failures.push(`${age}:${d.n}px/${d.rows}lines`);
  }
  return { name, species: names, phase: { lateLag, measured: measuredLateLagPw(rows) }, rows: n, pixelRowsExact: exact, residualPixels: residual, residualScanlines: rowsBad, pixelFailures: failures, perRowPixels: perRow };
}
const tarRgb = (side: string) => { const dir = createScratchDir(`prep30-psywave-${side}-`); execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/psywave-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) results.push(run(`accepted-${side}`, side, loadFrames(ACCEPTED_PW(side)), tarRgb(side)));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side] = spec.split(":");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side as "player" | "opponent", loadFrames(file!), dirRgb(dir!))); }
for (const r of results) console.log(r.name, JSON.stringify(r.phase), `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels} lines ${r.residualScanlines}`, r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
