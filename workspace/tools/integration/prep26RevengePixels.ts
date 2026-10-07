/**
 * prep26 Revenge pixels: the EXISTING Scene-ON renderer (battleScene.ts REVENGE branch, no src change) fed with the prep26 source-derived hardware OAM +
 * matrices, registers, palettes, monbg scroll and resource windows (loadspritegfx rows 1 / 73 / 96), vs raw mGBA RGB.  Row 0 uses the corpus buffers.
 * usage: npx vite-node tools/integration/prep26RevengePixels.ts [alt.json:rgbDir:player|opponent:ATT,TGT ...] [--out=out.json] [--neg=oam|palette|registers]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { revengeConfigFor, type RevengeWindow } from "../compare/revengeProduction.ts";
import { assembleRevengeHardwareOam } from "./prep26RevengeAssembler.ts";
import { revengeModel } from "./prep26RevengeModel.ts";
process.env.PREP26_LIB = "1";
const { knownFor, loadFrames } = await import("./prep26RevengeCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
const signed = (v: number) => { const raw = v & 0x1ff; return raw >= 256 ? raw - 512 : raw; };
function run(name: string, side: "player" | "opponent", rows: Json[], rgb: (row: Json) => Uint8Array, names: [string, string]) {
  const { oam: known, model: mk } = knownFor(rows, side), model = revengeModel(neg === "palette" ? { ...mk, scratchPalette: mk.scratchPalette.map((c) => c ^ 0x0421), impactPalette: mk.impactPalette.map((c) => c ^ 0x0421) } : mk);
  const window: RevengeWindow = side === "player" ? "player-back" : "opponent-front", selected = side === "opponent" ? "bg2" : "bg1";   // opponent attacker -> player target -> BG2
  const sel = side === "player" ? "bg1" : "bg2";
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const oam = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices } : assembleRevengeHardwareOam(age, { known, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    const m = model[age]!, base = revengeConfigFor(window, rows, age), ai = base.animationInputs, bp = rows[age]!.battlers, pp = rows[age]!.parties;
    const fieldProfile = { ...base.fieldProfile, playerHp: bp?.player?.hp ?? base.fieldProfile.playerHp, playerMaxHp: bp?.player?.maxHp ?? base.fieldProfile.playerMaxHp, opponentHp: bp?.opponent?.hp ?? base.fieldProfile.opponentHp, opponentMaxHp: bp?.opponent?.maxHp ?? base.fieldProfile.opponentMaxHp };
    void pp; void selected;
    const art = (a: Json, species: string, attr: readonly [number, number, number]) => ({ ...a, displaySpecies: species, attr });
    const config = { ...base, fieldProfile, attacker: { ...base.attacker, species: names[0] as never }, target: { ...base.target, species: names[1] as never },
      animationInputs: { ...ai, attackerArt: art(ai.attackerArt, names[0], known.attackerAttr), targetArt: art(ai.targetArt, names[1], known.targetAttr),
        buffers: { ...ai.buffers, hardwareOam: neg === "oam" ? rows[0]!.hardwareOam : oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: neg === "palette" ? model[0]!.hardwarePalette : m.hardwarePalette },
        registers: neg === "registers" ? model[0]!.registers : m.registers,
        background: { ...ai.background, scroll: { x: signed(m.registers[`${sel}hofs`] ?? 0), y: signed(m.registers[`${sel}vofs`] ?? 0) } },
        resources: { ...ai.resources, scratchTileBase: known.scratch.tile, swipeTileBase: known.swipe.tile, impactTileBase: known.impact.tile,
          scratchLoaded: age >= 1 && age <= 72, swipeLoaded: age >= 73 && age <= 95, impactLoaded: age >= 96 } } };
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 10) failures.push(`${age}:${d}`);
  }
  return { name, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures };
}
const tarRgb = (side: string) => { const dir = createScratchDir(`prep26-revenge-${side}-`); execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/revenge-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) results.push(run(`accepted-${side}`, side, loadFrames(resolve(root, `tools/compare/evidence/revenge-${side}-dense-state.json.gz`)), tarRgb(side), side === "player" ? ["MACHAMP", "SHUCKLE"] : ["QWILFISH", "SHUCKLE"]));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, names] = spec.split(":"); const [a, t] = names!.split(",");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side as "player" | "opponent", loadFrames(file!), dirRgb(dir!), [a!, t!])); }
for (const r of results) console.log(r.name, `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels}`, r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
