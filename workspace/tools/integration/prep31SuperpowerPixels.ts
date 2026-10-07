/**
 * prep31 Superpower pixels: the EXISTING Scene-ON renderer (battleScene.ts SUPERPOWER branch, no src change) fed with the prep31 source-derived hardware OAM +
 * matrices, registers, palettes and resource windows (loadspritegfx rows 1 / 4 / 7), vs raw mGBA RGB.  Row 0 uses the corpus buffers (pre-activation).
 * usage: npx vite-node tools/integration/prep31SuperpowerPixels.ts [alt.json:rgbDir:player|opponent:ATT,TGT ...] [--out=out.json] [--neg=oam|palette|registers]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { superpowerConfigFor } from "../compare/verifySuperpowerReducer.ts";
import { assembleSuperpowerHardwareOam, superpowerModel, SP } from "./prep31SuperpowerModel.ts";
process.env.PREP31_LIB = "1";
const { knownFor, loadFrames } = await import("./prep31SuperpowerCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
function run(name: string, side: "player" | "opponent", rows: Json[], rgb: (row: Json) => Uint8Array, names?: [string, string]) {
  const { oam: known, model: mk } = knownFor(rows, side);
  const model = superpowerModel(neg === "palette" ? { ...mk, orbPalette: mk.orbPalette.map((c) => c ^ 0x0421), rockPalette: mk.rockPalette.map((c) => c ^ 0x0421), meteorPalette: mk.meteorPalette.map((c) => c ^ 0x0421) } : mk);
  const window = side === "player" ? "player-back" : "opponent-front";
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const oam = age === 0 ? { oam: rows[0]!.hardwareOam as string[], matrices: rows[0]!.hardwareMatrices } : assembleSuperpowerHardwareOam(age, known, (s) => rows[Math.max(s, 0)]!.spriteOrder);
    const m = model[age]!, base = superpowerConfigFor(window, rows, age), ai = base.animationInputs, bp = rows[age]!.battlers;
    const fieldProfile = { ...base.fieldProfile, playerHp: bp?.player?.hp ?? base.fieldProfile.playerHp, playerMaxHp: bp?.player?.maxHp ?? base.fieldProfile.playerMaxHp, opponentHp: bp?.opponent?.hp ?? base.fieldProfile.opponentHp, opponentMaxHp: bp?.opponent?.maxHp ?? base.fieldProfile.opponentMaxHp };
    const [att, tgt] = names ?? [ai.attackerArt.displaySpecies, ai.targetArt.displaySpecies];
    const config = { ...base, fieldProfile, attacker: { ...base.attacker, species: (names ? att : base.attacker.species) as never }, target: { ...base.target, species: (names ? tgt : base.target.species) as never },
      animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: att, attr: known.attackerAttr }, targetArt: { ...ai.targetArt, displaySpecies: tgt, attr: known.targetAttr },
        buffers: { ...ai.buffers, hardwareOam: neg === "oam" && age > 0 ? rows[1]!.hardwareOam : oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: m.unfadedPalette, faded: m.fadedPalette, hardware: m.hardwarePalette },
        registers: neg === "registers" && age > 0 ? model[1]!.registers : m.registers,
        background: { ...ai.background, monbgPaletteBank: side === "player" ? 9 : 8 },
        resources: { ...ai.resources, orbTileBase: known.orb.tile, meteorTileBase: known.meteor.tile, rockTileBase: known.rock.tile,
          orbPaletteBank: 16 + known.orb.bank, meteorPaletteBank: 16 + known.meteor.bank, rockPaletteBank: 16 + known.rock.bank,
          orbLoaded: age >= SP.LOAD[0], meteorLoaded: age >= SP.LOAD[1], rockLoaded: age >= SP.LOAD[2] } } };
    const raw = rgb(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error(`${name}/${age}: rgb drift`);
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 12) failures.push(`${age}:${d}`);
  }
  return { name, rows: rows.length, phase: mk.phase, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures };
}
const tarRgb = (side: string) => { const dir = createScratchDir(`prep31-superpower-${side}-`); execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/superpower-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) results.push(run(`accepted-${side}`, side, loadFrames(resolve(root, `tools/compare/evidence/superpower-${side}-dense-state.json.gz`)), tarRgb(side)));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side, names] = spec.split(":"); const [a, t] = names!.split(",");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side as "player" | "opponent", loadFrames(file!), dirRgb(dir!), [a!, t!])); }
for (const r of results) console.log(r.name, `rows ${r.pixelRowsExact}/${r.rows} px ${r.residualPixels}`, JSON.stringify(r.phase), r.pixelFailures.join(" "));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
