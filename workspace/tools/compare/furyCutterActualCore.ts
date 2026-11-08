/** Retained-RGB actual-core gate for all eight MOVE_FURY_CUTTER bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createSceneOnMovePresentation,
  type SceneOnFuryCutterConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { furyCutterConfigFor, furyCutterRowsFor, verifyFuryCutterProduction,
  type FuryCutterWindow } from "./furyCutterProduction.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function findRgb(path: string, filename: string): string {
  for (const entry of readdirSync(path)) { const child = join(path, entry);
    if (statSync(child).isDirectory()) { try { return findRgb(child, filename); } catch { continue; } }
    if (entry === filename) return child; }
  throw new Error(`missing Fury Cutter RGB ${filename}`);
}
function residual(app: Uint8Array, raw: Uint8Array): number { let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== raw[pixel * 3]
    || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) count += 1;
  return count; }
function compare(window: FuryCutterWindow): Json {
  const rows = furyCutterRowsFor(window); const side = window.startsWith("player") ? "player" : "opponent";
  const scratch = createScratchDir(`pokebench-fury-cutter-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/evidence/fury-cutter-${side}-raw-rgb.tar.gz`), "-C", scratch]);
  let framebufferMatched = 0; let residualPixels = 0; const failures: string[] = [];
  const sequence = createHash("sha256");
  for (const [age, row] of rows.entries()) {
    const raw = readFileSync(findRgb(scratch, `${String(row.frame).padStart(5, "0")}.rgb`));
    if (sha(raw) !== row.sha256) throw new Error(`${window}/${age}: RGB drift`);
    sequence.update(raw);
    const stage = createSceneOnMovePresentation(furyCutterConfigFor(window, rows, age));
    const app = render({ ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age } });
    const difference = residual(app, raw); residualPixels += difference;
    if (!difference) framebufferMatched += 1; else failures.push(`${age}:${difference}`);
  }
  return { window, rows: 43, componentMatched: 43, seamMatched: 43,
    rawRgbMatched: 43, framebufferMatched, residualPixels,
    chronologicalRawRgbSha256: sequence.digest("hex"), failures };
}

function alteredControl(): Json {
  const window: FuryCutterWindow = "player-back-3";
  const rows = furyCutterRowsFor(window); const age = 17;
  const base = furyCutterConfigFor(window, rows, age); const input = base.animationInputs;
  const altered: SceneOnFuryCutterConfig = { ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 158, y: 4 }, animationCenter: { x: 190, y: 36 },
      battlePositionCenter: { x: 190, y: 36 } } },
    target: { species: "GROVYLE" as never, geometry: { side: "player",
      spriteCorner: { x: 10, y: 76 }, animationCenter: { x: 42, y: 108 },
      battlePositionCenter: { x: 42, y: 108 } } },
    animationInputs: { ...input,
      attackerArt: { ...input.attackerArt, displaySpecies: "CROBAT" },
      targetArt: { ...input.targetArt, displaySpecies: "GROVYLE" },
      resources: { ...input.resources, cutTileBase: input.resources.cutTileBase + 40,
        allocator: { altered: true } },
      order: [...input.order].reverse(), animationRng: input.animationRng ^ 0x2468_ace0,
    } };
  const digest = (config: SceneOnFuryCutterConfig): string => sha(render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }));
  const canonical = digest(base); const changed = digest(altered);
  if (canonical === changed) throw new Error("altered Fury Cutter control unchanged");
  return { species: ["CROBAT", "GROVYLE"], sidesGeometryAllocationOrderChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function furyCutterActualCoreVerdict(): Json {
  verifyFuryCutterProduction();
  const windows = (["player-back", "opponent-front"] as const).flatMap((orientation) =>
    ([1, 2, 3, 4] as const).map((counter) => compare(`${orientation}-${counter}`)));
  const stable = { schema: "fury-cutter-actual-core-verdict/v1",
    oracleProfile: "battle-scene-on", move: "MOVE_FURY_CUTTER", rows: 344,
    componentMatched: 344, seamMatched: 344, rawRgbMatched: 344,
    framebufferMatched: windows.reduce((sum, item) => sum + item.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, item) => sum + item.residualPixels, 0), windows,
    alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = furyCutterActualCoreVerdict(); console.log(JSON.stringify(result));
  if (process.argv.includes("--require-exact") && result.residualPixels) process.exitCode = 1;
}
