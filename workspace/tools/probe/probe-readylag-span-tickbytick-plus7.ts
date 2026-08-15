// Probe: same tick-by-tick RAM-trace method as
// probe-readylag-span-tickbytick.ts, applied to the +7 residual family
// (ISSUES #87 round 15's assignment: locate which leg carries the extra
// ticks in TANGELA/PUPITAR relative to the +4/+5 family's GRIMER/YOSHI and
// KADABRA/SHIZUKA baseline).
//
// Fixture: factory-mechanic-pupitar-delcatty-readylag-probe.json
// (mechanicLab, overrides.parties DELCATTY/SABLEYE/LICKITUNG vs. real-gen
// opponent lead PUPITAR — trainerId 109, challengeNum 2, battleNum 0, seed
// 70 — already `preCheckpointCaptureAllFrames: true`, no edits needed).
// This is docs/overrides-ready-lag-probe.md's own PUPITAR probe fixture and
// ISSUES #87's confirmed +7 datapoint.
//
// Read-only against a live oracle (POKEBENCH_ORACLE_URL, default :8014).
// Usage:
//   node --experimental-strip-types tools/probe/probe-readylag-span-tickbytick-plus7.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(HERE, "..", "battle-lab");
const BASE_URL = (process.env.POKEBENCH_ORACLE_URL ?? "http://127.0.0.1:8014").replace(/\/$/, "");

interface Capture {
  frame: number;
  state: {
    weather?: number;
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
  console.log(`  captured ${captures.length} frames (first=${captures[0]?.frame}, last=${captures[captures.length - 1]?.frame})`);

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
  const dispatchTick = firstFrameWhere(
    captures,
    (e) => e.playerControllerCommand === 18 && e.opponentControllerCommand === 18 && e.controllerExecFlags === 3,
    playerIntroComplete + 1,
  );
  if (dispatchTick === null) throw new Error("dispatchTick (both ChooseAction, execFlags==3) not found");
  const readyTick = firstFrameWhere(
    captures,
    (e) => e.playerControllerCommand === 18 && e.controllerExecFlags === 1,
    playerIntroComplete + 1,
  );
  if (readyTick === null) throw new Error("readyTick not found");

  console.log(`  handoffTick (opponent throw dispatch): ${handoffTick}`);
  console.log(`  playerIntroComplete (execFlags 1->0): ${playerIntroComplete}`);
  console.log(`  dispatchTick (both ChooseAction, execFlags==3): ${dispatchTick}`);
  console.log(`  readyTick (playerCmd==18 && execFlags==1): ${readyTick}`);
  console.log(`  switch-in-loop leg (dispatchTick - playerIntroComplete): ${dispatchTick - playerIntroComplete}`);
  console.log(`  AI-ack leg (readyTick - dispatchTick): ${readyTick - dispatchTick}`);
  console.log(`  total span (readyTick - playerIntroComplete): ${readyTick - playerIntroComplete}`);
  console.log(`  --- tick-by-tick over [playerIntroComplete-1, readyTick+1] where any field changes ---`);

  let prev: NonNullable<Capture["state"]["engine"]> | null = null;
  let prevWeather: number | null = null;
  for (const c of captures) {
    if (c.frame < playerIntroComplete - 1 || c.frame > readyTick + 1) continue;
    const e = c.state.engine;
    if (!e) continue;
    const w = c.state.weather ?? -1;
    const changed =
      prev === null ||
      prev.controllerExecFlags !== e.controllerExecFlags ||
      prev.playerControllerCommand !== e.playerControllerCommand ||
      prev.opponentControllerCommand !== e.opponentControllerCommand ||
      prev.activeBattler !== e.activeBattler ||
      prevWeather !== w;
    if (changed) {
      console.log(
        `    frame ${c.frame}: execFlags=${e.controllerExecFlags} playerCmd=${e.playerControllerCommand} opponentCmd=${e.opponentControllerCommand} activeBattler=${e.activeBattler} weather=${w}`,
      );
    }
    prev = e;
    prevWeather = w;
  }
}

async function main(): Promise<void> {
  await trace("PUPITAR/DELCATTY probe (residual +7)", "factory-mechanic-pupitar-delcatty-readylag-probe.json");
  await trace("GRIMER/YOSHI (residual +5, baseline)", "factory-arbitrary-intro-yoshi-off.json");
  await trace("KADABRA/SHIZUKA (residual +4, baseline)", "factory-trainer-pic-shizuka-off.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
