// Probe: tick-by-tick RAM trace of the TryDoEventsBeforeFirstTurn +
// ChooseAction-dispatch span (player-intro-complete -> ready predicate)
// for two fixtures whose confirmed residual DIFFERS by exactly 1 tick
// (docs/trainer-pic-off-window-scout.md Round 13's own measured table):
//   - GRIMER/YOSHI  (factory-arbitrary-intro-yoshi-off.json):   residual +5
//   - KADABRA/SHIZUKA (factory-trainer-pic-shizuka-off.json):    residual +4
//
// Goal: using ONLY the RAM fields the oracle already exposes
// (state.engine.{controllerExecFlags,playerControllerCommand,
// opponentControllerCommand,activeBattler}), print every tick in the span
// where any of those fields change, for both fixtures, so the exact tick
// where the two diverge (and by how many ticks) is visible directly instead
// of inferred.
//
// Read-only against a live oracle (POKEBENCH_ORACLE_URL, default :8014).
// Usage:
//   node --experimental-strip-types tools/probe/probe-readylag-span-tickbytick.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(HERE, "..", "battle-lab");
const BASE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8014").replace(/\/$/, "");

interface Capture {
  frame: number;
  state: {
    engine?: {
      controllerExecFlags: number;
      playerControllerCommand: number;
      opponentControllerCommand: number;
      activeBattler: number;
    };
  };
}

async function runDense(fixtureFile: string): Promise<Capture[]> {
  const req = JSON.parse(readFileSync(path.join(LAB, fixtureFile), "utf8"));
  delete req.preCheckpointCaptureFrames;
  req.preCheckpointCaptureAllFrames = true;
  const response = await fetch(`${BASE_URL}/v1/battle-lab/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    throw new Error(`POST /v1/battle-lab/run -> ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
  const body = await response.json();
  return body.battleLab.preCheckpointCaptures as Capture[];
}

function firstFrameWhere(
  captures: Capture[],
  predicate: (e: NonNullable<Capture["state"]["engine"]>) => boolean,
  fromFrame = 0,
): number | null {
  for (const c of captures) {
    if (c.frame < fromFrame) continue;
    if (c.state.engine && predicate(c.state.engine)) return c.frame;
  }
  return null;
}

async function trace(label: string, fixtureFile: string): Promise<void> {
  console.log(`\n=== ${label} (${fixtureFile}) ===`);
  const captures = await runDense(fixtureFile);

  const handoffTick = firstFrameWhere(
    captures,
    (e) => e.opponentControllerCommand === 47 && e.controllerExecFlags !== 0,
    1000,
  );
  if (handoffTick === null) throw new Error("handoffTick not found");
  const playerThrowDispatch = firstFrameWhere(
    captures,
    (e) => e.playerControllerCommand === 47 && e.controllerExecFlags !== 0,
    handoffTick,
  );
  if (playerThrowDispatch === null) throw new Error("playerThrowDispatch not found");
  const playerIntroComplete = firstFrameWhere(
    captures,
    (e) => e.controllerExecFlags === 0,
    playerThrowDispatch + 1,
  );
  if (playerIntroComplete === null) throw new Error("playerIntroComplete not found");
  const readyTick = firstFrameWhere(
    captures,
    (e) => e.playerControllerCommand === 18 && e.controllerExecFlags === 1,
    playerIntroComplete + 1,
  );
  if (readyTick === null) throw new Error("readyTick not found");

  console.log(`  playerIntroComplete (execFlags 1->0): ${playerIntroComplete}`);
  console.log(`  readyTick (playerCmd==18 && execFlags==1): ${readyTick}`);
  console.log(`  span (readyTick - playerIntroComplete): ${readyTick - playerIntroComplete}`);
  console.log(`  --- tick-by-tick over [playerIntroComplete-1, readyTick+1] where any field changes ---`);

  let prev: NonNullable<Capture["state"]["engine"]> | null = null;
  for (const c of captures) {
    if (c.frame < playerIntroComplete - 1 || c.frame > readyTick + 1) continue;
    const e = c.state.engine;
    if (!e) continue;
    const changed =
      prev === null ||
      prev.controllerExecFlags !== e.controllerExecFlags ||
      prev.playerControllerCommand !== e.playerControllerCommand ||
      prev.opponentControllerCommand !== e.opponentControllerCommand ||
      prev.activeBattler !== e.activeBattler;
    if (changed) {
      console.log(
        `    frame ${c.frame}: execFlags=${e.controllerExecFlags} playerCmd=${e.playerControllerCommand} opponentCmd=${e.opponentControllerCommand} activeBattler=${e.activeBattler}`,
      );
    }
    prev = e;
  }
}

async function main(): Promise<void> {
  await trace("GRIMER/YOSHI (residual +5)", "factory-arbitrary-intro-yoshi-off.json");
  await trace("KADABRA/SHIZUKA (residual +4)", "factory-trainer-pic-shizuka-off.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
