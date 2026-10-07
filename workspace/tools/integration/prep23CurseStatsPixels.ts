/**
 * prep23: feed the stats-branch Curse model (hardware OAM / matrices / registers / palette / tasks) to the existing renderer (no src change)
 * and compare framebuffer rows with the ROM RGB. Row 0 uses the corpus OAM (pre-activation frame, as prep20).
 * usage: npx vite-node tools/integration/prep23CurseStatsPixels.ts <name>:<corpus.json[.gz]>:<rgbDir|tar:path>:<player|opponent>:<ATTACKER>,<TARGET> ... [--out=receipt.json]
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { curseConfigFor } from "../compare/curseProduction.ts";
import { curseStatsRow } from "./prep23CurseStats.ts";
import { knownFor } from "./prep23CurseStatsKnown.ts";
import { gunzipSync } from "node:zlib";
type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const load = (p: string): Json[] => { const b = readFileSync(p); return JSON.parse((p.endsWith(".gz") ? gunzipSync(b) : b).toString("utf8")).frames; };
const sha = (v: Uint8Array) => createHash("sha256").update(v).digest("hex");
const diff = (app: Uint8Array, raw: Uint8Array) => { let n = 0; for (let p = 0; p < 240 * 160; p += 1) if (app[p * 4] !== raw[p * 3] || app[p * 4 + 1] !== raw[p * 3 + 1] || app[p * 4 + 2] !== raw[p * 3 + 2]) n += 1; return n; };
const args = process.argv.slice(2), out = args.find((a) => a.startsWith("--out="))?.slice(6);
const results: Json[] = [];
for (const spec of args.filter((a) => a.includes(":") && !a.startsWith("--"))) {
  const [name, file, rgbSpec, side, sp] = spec.split(":") as [string, string, string, "player" | "opponent", string];
  const rows = load(file); let dir = rgbSpec;
  if (rgbSpec.startsWith("tar=")) { dir = createScratchDir(`prep23-${name}-`); execFileSync("tar", ["-xzf", resolve(root, rgbSpec.slice(4)), "-C", dir]); }
  const window = `stats-${side}` as const, k = knownFor(rows, side), [att, tgt] = sp.split(",");
  let exact = 0, residual = 0; const failures: string[] = [];
  for (let age = 0; age < rows.length; age += 1) {
    let config: Json = curseConfigFor(window, rows, age) as never;
    config = { ...config, attacker: { ...config.attacker, species: att }, target: { ...config.target, species: tgt },
      animationInputs: { ...config.animationInputs, attackerArt: { ...config.animationInputs.attackerArt, displaySpecies: att },
        defenderArt: { ...config.animationInputs.defenderArt, displaySpecies: tgt }, animationTargetArt: { ...config.animationInputs.animationTargetArt, displaySpecies: att } } };
    const m = curseStatsRow(age, k);
    const inputs = process.env.CORPUS ? config.animationInputs : { ...config.animationInputs,
      buffers: { ...config.animationInputs.buffers, hardwareOam: m.hardwareOam ?? rows[age]!.hardwareOam, hardwareMatrices: m.hardwareMatrices },
      registers: m.registers, battleBg: m.battleBg, palette: { unfaded: m.hardwarePalette, faded: m.hardwarePalette, hardware: m.hardwarePalette },
      liveTasks: m.tasks };
    const raw = readFileSync(resolve(dir, `${String(rows[age]!.frame).padStart(5, "0")}.rgb`)); if (sha(raw) !== rows[age]!.sha256) throw new Error("rgb drift");
    const d = diff(render({ ...createInitialState(), rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation({ ...config, animationInputs: inputs } as never), age } as never }), raw);
    residual += d; if (!d) exact += 1; else if (failures.length < 8) failures.push(`${age}:${d}`);
  }
  const r = { name, side, species: sp, rows: rows.length, pixelRowsExact: exact, residualPixels: residual, failures };
  console.log(JSON.stringify(r)); results.push(r);
}
if (out) writeFileSync(out, `${JSON.stringify(results, null, 1)}\n`);
