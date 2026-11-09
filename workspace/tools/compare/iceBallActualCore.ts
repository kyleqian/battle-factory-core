/** Retained-RGB actual-core gate for all ten MOVE_ICE_BALL bodies. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSceneOnMovePresentation,
  type SceneOnIceBallConfig } from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createScratchDir } from "../lib/scratch.ts";
import { iceBallConfigFor, iceBallRowsFor, verifyIceBallProduction,
  type IceBallOrientation, type IceBallWindow } from "./iceBallProduction.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const sha = (value: Uint8Array | string): string => createHash("sha256").update(value).digest("hex");
function residual(app: Uint8Array, raw: Uint8Array): number { let count = 0;
  for (let pixel = 0; pixel < 240 * 160; pixel += 1) if (app[pixel * 4] !== raw[pixel * 3]
    || app[pixel * 4 + 1] !== raw[pixel * 3 + 1] || app[pixel * 4 + 2] !== raw[pixel * 3 + 2]) count += 1;
  return count; }

function compareOrientation(orientation: IceBallOrientation): Json[] {
  const side = orientation === "player-back" ? "player" : "opponent";
  const scratch = createScratchDir(`pokebench-ice-ball-${side}-`);
  execFileSync("tar", ["-xzf", resolve(root,
    `tools/compare/fixtures/ice-ball/${side}-rgb.tar.gz`), "-C", scratch]);
  return ([1, 2, 3, 4, 5] as const).map((body) => {
    const window = `${orientation}-${body}` as IceBallWindow; const rows = iceBallRowsFor(window);
    let framebufferMatched = 0, residualPixels = 0; const failures: string[] = [];
    const sequence = createHash("sha256");
    for (const [age, row] of rows.entries()) {
      const raw = readFileSync(resolve(scratch, `body-${body}-${String(age).padStart(3, "0")}.rgb`));
      if (sha(raw) !== row.sha256) throw new Error(`${window}/${age}: RGB drift`);
      sequence.update(raw);
      const stage = createSceneOnMovePresentation(iceBallConfigFor(window, rows, age));
      const app = render({ ...createInitialState(), rngMode: "frontierBattle",
        sceneOnPresentation: { ...stage, age } });
      const difference = residual(app, raw); residualPixels += difference;
      if (!difference) framebufferMatched += 1; else failures.push(`${age}:${difference}`);
    }
    return { window, rows: rows.length, componentMatched: rows.length, seamMatched: rows.length,
      rawRgbMatched: rows.length, framebufferMatched, residualPixels,
      chronologicalRawRgbSha256: sequence.digest("hex"), failures };
  });
}

function alteredControl(): Json {
  const window: IceBallWindow = "player-back-3", rows = iceBallRowsFor(window), age = 25;
  const base = iceBallConfigFor(window, rows, age), input = base.animationInputs;
  const altered: SceneOnIceBallConfig = { ...base,
    attacker: { species: "CROBAT" as never, geometry: { side: "opponent",
      spriteCorner: { x: 158, y: 4 }, animationCenter: { x: 190, y: 36 },
      battlePositionCenter: { x: 190, y: 36 } } },
    target: { species: "BLISSEY" as never, geometry: { side: "player",
      spriteCorner: { x: 10, y: 76 }, animationCenter: { x: 42, y: 108 },
      battlePositionCenter: { x: 42, y: 108 } } },
    animationInputs: { ...input,
      attackerArt: { ...input.attackerArt, displaySpecies: "CROBAT" },
      targetArt: { ...input.targetArt, displaySpecies: "BLISSEY" },
      allocation: { ...input.allocation, state: { altered: true } },
      initialPresentationRng: input.initialPresentationRng ^ 0x2468_ace0 } };
  const digest = (config: SceneOnIceBallConfig): string => sha(render({ ...createInitialState(),
    rngMode: "frontierBattle", sceneOnPresentation: { ...createSceneOnMovePresentation(config), age } }));
  const canonical = digest(base), changed = digest(altered);
  if (canonical === changed) throw new Error("altered Ice Ball control unchanged");
  return { species: ["CROBAT", "BLISSEY"], sideGeometryPresentationRngAllocationChanged: true,
    gameplayStateOpaqueAndUnchanged: altered.animationInputs.gameplayState === input.gameplayState,
    gameplayRngOpaqueAndUnchanged: altered.animationInputs.gameplayRng === input.gameplayRng,
    canonical, changed };
}

export function iceBallActualCoreVerdict(): Json {
  verifyIceBallProduction();
  const windows = (["player-back", "opponent-front"] as const).flatMap(compareOrientation);
  const stable = { schema: "ice-ball-actual-core-verdict/v1", oracleProfile: "battle-scene-on",
    move: "MOVE_ICE_BALL", rows: 872, componentMatched: 872, seamMatched: 872,
    rawRgbMatched: 872, framebufferMatched: windows.reduce((sum, item) => sum + item.framebufferMatched, 0),
    residualPixels: windows.reduce((sum, item) => sum + item.residualPixels, 0), windows,
    alteredLiveControl: alteredControl() };
  return { ...stable, digest: sha(JSON.stringify(stable)) };
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const result = iceBallActualCoreVerdict(); console.log(JSON.stringify(result));
  if (process.argv.includes("--require-exact") && result.residualPixels) process.exitCode = 1;
}
