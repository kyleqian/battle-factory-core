/**
 * prep30 Extrasensory pixels: the EXISTING Scene-ON renderer (battleScene.ts EXTRASENSORY branch, no src change) fed ONLY with the prep30 source-derived
 * inputs (assembled hardware OAM + matrices, registers, three palettes, scanline state + buffers, shared task data, clone, VRAM handle labels; sprite order
 * lent; row 0 OAM / matrices = activation corpus row, K) vs raw mGBA RGB, at the measured phase and (with --phase=flip) at the other phase.
 * usage: npx vite-node tools/integration/prep30ExtrasensoryPixels.ts [alt.json:rgbDir:player|opponent ...] [--out=out.json] [--phase=flip] [--neg=oam|palette|scanline] [--feed=corpus] [--split=LINE]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation, type SceneOnExtrasensoryPresentationState } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { extrasensoryConfigFor } from "../compare/verifyExtrasensoryReducer.ts";
import { assembleExtrasensoryHardwareOam, extrasensoryModel, xsRows, XS } from "./prep30ExtrasensoryModel.ts";
import { speciesName } from "./prep30Species.ts";
process.env.PREP30_LIB = "1";
const { knownFor, loadFrames, measuredLateLag, speciesOf, ACCEPTED } = await import("./prep30ExtrasensoryCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6), flip = args.includes("--phase=flip"), corpusFeed = args.includes("--feed=corpus"), split = Number(args.find((a) => a.startsWith("--split="))?.slice(8) ?? 0);   // T: scanout line at which the frame's distortion write lands (lines < split show the previous row's buffer)   // control: the accepted corpus-fed config (species-renamed)
function diffRows(app: Uint8Array, raw: Uint8Array) { let n = 0; const rows = new Set<number>();
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) { n += 1; rows.add(Math.floor(p / 240)); } if (process.env.PREP30_LINES && n) console.error(`lines ${[...rows].join(",")}`); return { n, rows: rows.size }; }
function run(name: string, side: "player" | "opponent", rows: Json[], rgb: (row: Json) => Uint8Array) {
  const lateLag = flip ? !measuredLateLag(rows) : measuredLateLag(rows), base = knownFor(rows, side, lateLag);
  const known = neg === "oam" ? { ...base, attackerYDelta: base.attackerYDelta + 4 } : neg === "palette" ? { ...base, psychicPalette: base.psychicPalette.map((c) => c ^ 0x0421) } : neg === "scanline" ? { ...base, targetYElevation: base.targetYElevation + 4 } : base;
  const model = extrasensoryModel(known), sp = speciesOf(rows, side), names = [speciesName(sp.attacker), speciesName(sp.target)] as const, n = Math.min(rows.length, xsRows(known));
  const tside = side === "player" ? "opponent" : "player", r0 = rows[0]!, P = r0.parties.player[0], O = r0.parties.opponent[0];
  const center = (b: { x: number; y: number }) => ({ x: b.x, y: b.y });
  const geo = (s: "player" | "opponent", c: { x: number; y: number }) => ({ side: s, spriteCorner: { x: c.x - 32, y: c.y - 32 }, animationCenter: c, battlePositionCenter: c });
  let exact = 0, residual = 0, rowsBad = 0; const failures: string[] = [], perRow: number[] = [];
  for (let age = 0; age < n; age += 1) {
    const m = model[age]!, oam = age === 0 ? { oam: r0.hardwareOam as string[], matrices: r0.hardwareMatrices as number[][] } : assembleExtrasensoryHardwareOam(age, known, (s) => rows[Math.max(s, 0)]!.spriteOrder);
    const shared = Object.fromEntries(m.tasks.filter((t) => !t.callback.startsWith("AnimTask_")).map((t) => [t.callback, t.data]));
    const art = (b: typeof known.attacker, species: string, sub: number) => ({ displaySpecies: species, slot: b.slot, attr: b.attr, subpriority: sub });
    let config: SceneOnExtrasensoryPresentationState["config"] = { move: "EXTRASENSORY",
      attacker: { species: names[0] as never, geometry: geo(side, center(known.attacker)) as never }, target: { species: names[1] as never, geometry: geo(tside, center(known.target)) as never },
      fieldProfile: { playerHp: P.hp, playerMaxHp: P.maxHp, opponentHp: O.hp, opponentMaxHp: O.maxHp, playerGender: P.gender, opponentGender: O.gender },
      animationInputs: { attackerArt: art(known.attacker, names[0], r0.battlerSprites.attacker.subpriority), targetArt: art(known.target, names[1], r0.battlerSprites.target.subpriority),
        taskSlots: { fadeToPsychic: XS.SLOTS.fade1, psychicBackground: XS.SLOTS.psy, blend: XS.SLOTS.blend, distortion: XS.SLOTS.distortion, clone: XS.SLOTS.clone, updateMonBg: XS.SLOTS.monbg, clearMonBg: XS.SLOTS.clear, restoreBattle: XS.SLOTS.restore },
        sharedTaskData: shared,
        clone: { slot: known.cloneSlot, matrixNum: known.cloneMatrix, attr: known.attacker.attr, subpriority: r0.battlerSprites.attacker.subpriority + 1, x: known.attacker.x, y: known.attacker.y, x2: m.clone?.x2 ?? 0, y2: m.clone?.y2 ?? 0 },
        spriteOrder: rows[age]!.spriteOrder,
        buffers: { softwareOam: oam.oam, hardwareOam: oam.oam, softwareMatrices: oam.matrices as never, hardwareMatrices: oam.matrices as never },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette }, registers: m.registers,
        background: { currentVram: `vram-${m.vram}`, battleVram: "vram-0", psychicVram: "vram-1", monbgPaletteBank: tside === "opponent" ? 8 : 9 },
        scanline: { state: m.scanline.state, srcBuffer: m.scanline.srcBuffer, dmaDest: m.scanline.dmaDest, buffers: [0, 1].map((b) => m.scanline.buffers[b]!.map((v, y) => (age > 0 && y < split + 1 ? model[age - 1]!.scanline.buffers[b]![y]! : v))) as never },
        allocator: null, audio: null, liveCounts: { visualTasks: 0, soundTasks: 0, matrixBitmap: 0 }, animationRng: 0, gameplayRng: null, gameplayState: null } };
    if (corpusFeed) { const c = extrasensoryConfigFor(side === "player" ? "player-back" : "opponent-front", rows, age);
      Object.assign(config, { ...c, attacker: { ...c.attacker, species: names[0] }, target: { ...c.target, species: names[1] },
        animationInputs: { ...c.animationInputs, attackerArt: { ...c.animationInputs.attackerArt, displaySpecies: names[0] }, targetArt: { ...c.animationInputs.targetArt, displaySpecies: names[1] } } }); }
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    const d = diffRows(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } as never }), raw);
    residual += d.n; rowsBad += d.rows; perRow.push(d.n); if (!d.n) exact += 1; else if (failures.length < 12) failures.push(`${age}:${d.n}px/${d.rows}lines`);
  }
  return { name, species: names, phase: { lateLag, measured: measuredLateLag(rows) }, rows: n, pixelRowsExact: exact, residualPixels: residual, residualScanlines: rowsBad, pixelFailures: failures, split, perRowPixels: perRow };
}
const tarRgb = (side: string) => { const dir = createScratchDir(`prep30-extrasensory-${side}-`); execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/extrasensory-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) results.push(run(`accepted-${side}`, side, loadFrames(ACCEPTED(side)), tarRgb(side)));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side] = spec.split(":");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side as "player" | "opponent", loadFrames(file!), dirRgb(dir!))); }
for (const r of results) console.log(r.name, JSON.stringify(r.phase), `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels} lines ${r.residualScanlines}`, r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
