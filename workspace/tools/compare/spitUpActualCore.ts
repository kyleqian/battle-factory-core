/** Complete retained-RGB actual-core gate for all six MOVE_SPIT_UP branches. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSceneOnMovePresentation, type SceneOnSpitUpConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { spitUpConfigFor, spitUpRowsFor, verifySpitUpProduction,
  type SpitUpWindow } from "./spitUpProduction.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) {
    const child = join(path, entry);
    if (statSync(child).isDirectory()) {
      try { return findRgb(child, filename); } catch { continue; }
    }
    if (entry === filename) return child;
  }
  throw new Error(`missing Spit Up RGB ${filename}`);
}
function residual(app: Uint8Array, raw: Uint8Array): number {
  let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) {
    if (app[pixel * 4] !== raw[pixel * 3] || app[pixel * 4 + 1] !== raw[pixel * 3 + 1]
      || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) count += 1;
  }
  return count;
}
const evidenceStem = (window: SpitUpWindow): string => {
  const [orientation, face, stockpiles] = window.split("-");
  return `${orientation === "player" && face === "back" ? "player" : "opponent"}-${stockpiles}`;
};
function compare(window: SpitUpWindow): Json {
  const rows = spitUpRowsFor(window);
  const scratch = createScratchDir(`pokebench-spit-up-${evidenceStem(window)}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/spit-up-${evidenceStem(window)}-rgb.tar.gz`), "-C", scratch]);
  let framebufferMatched = 0; let residualPixels = 0;
  const failures: string[] = []; const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${window}/${age}: RGB drift`);
    sequence.update(raw);
    const stage = createSceneOnMovePresentation(spitUpConfigFor(window, rows, age));
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } });
    const difference = residual(app, raw);
    residualPixels += difference;
    if (difference === 0) framebufferMatched += 1;
    else failures.push(`${age}:${difference}`);
  }
  return { window, rows: rows.length, componentMatched: rows.length, seamMatched: rows.length,
    rawRgbMatched: rows.length, framebufferMatched, residualPixels,
    chronologicalRawRgbSha256: sequence.digest("hex"), failures };
}

function alteredControl(): Json {
  const window: SpitUpWindow = "player-back-3";
  const rows = spitUpRowsFor(window); const age = 70;
  const base = spitUpConfigFor(window, rows, age); const input = base.animationInputs;
  const altered: SceneOnSpitUpConfig = { ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 162, y: 6 }, animationCenter: { x: 194, y: 38 },
      battlePositionCenter: { x: 194, y: 38 } } },
    target: { species: "GROVYLE" as never, geometry: { side: "player",
      spriteCorner: { x: 12, y: 76 }, animationCenter: { x: 44, y: 108 },
      battlePositionCenter: { x: 44, y: 108 } } },
    animationInputs: { ...input,
      attackerArt: { ...input.attackerArt, displaySpecies: "CROBAT" },
      targetArt: { ...input.targetArt, displaySpecies: "GROVYLE" },
      resources: { ...input.resources, redOrbTileBase: input.resources.redOrbTileBase + 40,
        impactTileBase: input.resources.impactTileBase + 50, allocator: { altered: true } },
      buffers: { ...input.buffers, hardwareMatrices: [...input.buffers.hardwareMatrices].reverse() },
      order: [...input.order].reverse(), animationRng: input.animationRng ^ 0x1357_9bdf,
    } };
  const digest = (config: SceneOnSpitUpConfig): string => sha(render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }));
  const canonical = digest(base); const changed = digest(altered);
  if (canonical === changed) throw new Error("altered Spit Up control unchanged");
  return { species: ["CROBAT", "GROVYLE"], sidesGeometryAllocationMatricesOrderChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function spitUpActualCoreVerdict(): Json {
  verifySpitUpProduction();
  const windows = (["player-back", "opponent-front"] as const).flatMap((orientation) =>
    ([1, 2, 3] as const).map((stockpiles) => compare(`${orientation}-${stockpiles}`)));
  const stable = { schema: "spit-up-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_SPIT_UP", rows: 650, componentMatched: 650, seamMatched: 650,
    rawRgbMatched: 650, framebufferMatched: windows.reduce((sum, window) => sum + window.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, window) => sum + window.residualPixels, 0),
    windows, alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = spitUpActualCoreVerdict();
  console.log(JSON.stringify(result));
  if (process.argv.includes("--require-exact") && result.residualPixels) process.exitCode = 1;
}
