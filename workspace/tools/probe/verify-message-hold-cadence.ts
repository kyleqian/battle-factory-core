// ISSUES #77 probe: battle-message hold cadence ground truth receipt.
// Reruns the staged super-effective + not-very-effective turn
// (tools/battle-lab/scratch-message-hold-dense-probe.json, Battle Scene OFF
// oracle) twice fresh and asserts PASS/FAIL:
//   - determinism: both runs' PNG hashes and semantic state are byte-identical;
//   - the semantic receipt that anchors the measured box schedule in
//     docs/battle-message-hold-cadence-ground-truth.md §4 (HP deltas, current
//     move transitions, battleOutcome stays 0, next-input-ready frame);
// The message-box pixel boundaries themselves are measured with
// tools/probe/analyze-message-box.py over a full dense sweep (see the doc's
// acceptance bar).
//
// Run: node --experimental-strip-types tools/probe/verify-message-hold-cadence.ts

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

interface CaptureState {
  battleOutcome: number;
  battlers: {
    player: { hp: number; maxHp: number; species: number };
    opponent: { hp: number; maxHp: number; species: number };
  };
  engine: {
    currentMove: number;
    playerControllerCommand: number;
  };
}

interface Capture {
  frame: number;
  sha256: string;
  state: CaptureState;
}

async function runScenario(scenarioPath: string): Promise<Capture[]> {
  const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
  const url = `${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    throw new Error(`battle-lab run failed: HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { captures: Capture[] };
  payload.captures.sort((a, b) => a.frame - b.frame);
  return payload.captures;
}

function captureAt(captures: Capture[], frame: number): Capture {
  const found = captures.find((c) => c.frame === frame);
  if (!found) throw new Error(`no capture at frame ${frame}`);
  return found;
}

function check(name: string, pass: boolean, detail: string): boolean {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}: ${detail}`);
  return pass;
}

async function main(): Promise<void> {
  const scenarioPath = "tools/battle-lab/scratch-message-hold-dense-probe.json";
  console.log(`verifying ${scenarioPath} (run twice fresh)`);
  const run1 = await runScenario(scenarioPath);
  const run2 = await runScenario(scenarioPath);
  let allPass = true;

  allPass = check(
    "determinism: identical capture frame sets",
    run1.length === run2.length && run1.every((c, i) => c.frame === run2[i]!.frame),
    `${run1.length} captures each`,
  ) && allPass;
  allPass = check(
    "determinism: identical PNG sha256 for every frame",
    run1.every((c, i) => c.sha256 === run2[i]!.sha256),
    "byte-identical across both fresh runs",
  ) && allPass;
  allPass = check(
    "determinism: identical semantic state for every frame",
    run1.every((c, i) => JSON.stringify(c.state) === JSON.stringify(run2[i]!.state)),
    "byte-identical across both fresh runs",
  ) && allPass;

  // Staged matchup (docs/battle-message-hold-cadence-ground-truth.md §4).
  const f0 = captureAt(run1, 44);
  allPass = check(
    "staged matchup: player LOMBRE vs opponent NOSEPASS",
    f0.state.battlers.player.species === 296 && f0.state.battlers.opponent.species === 320,
    `species ${f0.state.battlers.player.species} vs ${f0.state.battlers.opponent.species}`,
  ) && allPass;
  allPass = check(
    "player's WATER GUN (curMove 55) active across its message span",
    [44, 64, 183, 203, 267].every(
      (f) => captureAt(run1, f).state.engine.currentMove === 55,
    ),
    "curMove 55 at frames 44/64/183/203/267",
  ) && allPass;
  allPass = check(
    "opponent's EARTHQUAKE (curMove 89) active across its message span",
    [281, 308, 417, 440, 504].every(
      (f) => captureAt(run1, f).state.engine.currentMove === 89,
    ),
    "curMove 89 at frames 281/308/417/440/504",
  ) && allPass;

  const oppBefore = captureAt(run1, 44).state.battlers.opponent;
  const oppAfter = captureAt(run1, 179).state.battlers.opponent;
  allPass = check(
    "WATER GUN damage lands inside the 'used' hold",
    oppBefore.hp === 105 && oppAfter.hp === 70,
    `opponent ${oppBefore.hp} -> ${oppAfter.hp} (105 max, super effective, no KO)`,
  ) && allPass;
  const playerBefore = captureAt(run1, 390).state.battlers.player;
  const playerAfter = captureAt(run1, 413).state.battlers.player;
  allPass = check(
    "EARTHQUAKE damage lands inside the opponent 'used' hold",
    playerBefore.hp === 135 && playerAfter.hp === 116,
    `player ${playerBefore.hp} -> ${playerAfter.hp} (135 max, not very effective, no KO)`,
  ) && allPass;
  allPass = check(
    "no faint (battleOutcome stays 0) across the whole turn",
    run1.every((c) => c.state.battleOutcome === 0),
    "battleOutcome 0 at every captured frame",
  ) && allPass;
  allPass = check(
    "next input-ready: Fight menu open by frame 522",
    captureAt(run1, 522).state.engine.playerControllerCommand === 18,
    "playerControllerCommand 18 at frame 522 (fight menu)",
  ) && allPass;

  console.log(allPass ? "ALL CHECKS PASSED" : "CHECK FAILURES PRESENT");
  if (!allPass) process.exit(1);
}

await main();
