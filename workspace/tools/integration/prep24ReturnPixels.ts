/**
 * prep24 Return pixels: the EXISTING Scene-ON renderer (battleScene.ts RETURN branch, no src change) fed with the prep24 assembler OAM + matrices and the
 * prep24 model's registers / palette / tasks-free inputs, vs raw mGBA RGB.  Row 0 (pre-activation) uses the corpus buffers (as prep20).
 * usage: npx vite-node tools/integration/prep24ReturnPixels.ts [alt.json:altRgbDir:player|opponent:ATT,TGT ...] [--out=out.json] [--neg=registers|palette|oam]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { returnConfigFor } from "../compare/verifyReturnReducer.ts";
import { assembleReturnHardwareOam } from "./prep24ReturnAssembler.ts";
import { returnModel } from "./prep24ReturnModel.ts";
process.env.PREP24_LIB = "1";
const { knownFor, inputsFor, load } = await import("./prep24ReturnCheck.ts");
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diffPixels = (app: Uint8Array, raw: Uint8Array) => { let n = 0;
  for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const NAMES: Record<string, string> = { "148": "DRAGONAIR", "95": "ONIX", "143": "SNORLAX", "76": "GOLEM", "18": "PIDGEOT" };
const args = process.argv.slice(2), outPath = args.find((a) => a.startsWith("--out="))?.slice(6), neg = args.find((a) => a.startsWith("--neg="))?.slice(6);
function run(name: string, orientation: "player-back" | "opponent-front", rows: Json[], pixels: (row: Json) => Uint8Array) {
  const side = orientation === "player-back" ? "player" : "opponent", known = knownFor(rows, side), model = returnModel(inputsFor(rows, side));
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    const oam = age === 0 || neg === "oam-corpus" ? { oam: rows[age]!.hardwareOam as string[], matrices: rows[age]!.hardwareMatrices }
      : assembleReturnHardwareOam(age, { known, rows: rows.length, spriteOrderAt: (s) => rows[Math.max(s, 0)]!.spriteOrder });
    const m = model[age]!, base = returnConfigFor("strongest", orientation, rows as never, age);
    const nm = (sp: unknown) => NAMES[String(sp)] ?? String(sp);
    const attacker = nm(base.attacker.species), target = nm(base.target.species);
    const ai = base.animationInputs;
    const config = { ...base, attacker: { ...base.attacker, species: attacker as never }, target: { ...base.target, species: target as never },
      animationInputs: { ...ai, attackerArt: { ...ai.attackerArt, displaySpecies: attacker }, targetArt: { ...ai.targetArt, displaySpecies: target },
        buffers: { ...ai.buffers, hardwareOam: neg === "oam" ? rows[0]!.hardwareOam : oam.oam, hardwareMatrices: oam.matrices },
        palette: { unfaded: m.unfadedPalette, faded: neg === "palette" ? model[0]!.hardwarePalette : m.hardwarePalette, hardware: neg === "palette" ? model[0]!.hardwarePalette : m.hardwarePalette },
        registers: neg === "registers" ? model[0]!.registers : m.registers } };
    const raw = pixels(rows[age]!); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
    const d = diffPixels(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 10) failures.push(`${age}:${d}`);
  }
  return { name, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, pixelFailures: failures };
}
const tarRgb = (side: string) => { const dir = createScratchDir(`prep24-return-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root, `tools/compare/evidence/return-${side}-raw-rgb.tar.gz`), "-C", dir]);
  return (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`)); };
const dirRgb = (dir: string) => (row: Json) => readFileSync(resolve(dir, `${String(row.frame).padStart(5, "0")}.rgb`));
const results: Json[] = [];
for (const side of ["player", "opponent"] as const) results.push(run(`accepted-${side}`, side === "player" ? "player-back" : "opponent-front", load(resolve(root, `tools/compare/evidence/return-${side}-dense-state.json.gz`)), tarRgb(side)));
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) { const [file, dir, side] = spec.split(":");
  results.push(run(`alt-${file!.split("/").pop()!.replace(/-r1\.json$/, "")}`, side === "player" ? "player-back" : "opponent-front", load(file!), dirRgb(dir!))); }
console.log(JSON.stringify(results, null, 1));
if (outPath) writeFileSync(outPath, `${JSON.stringify(results, null, 1)}\n`);
