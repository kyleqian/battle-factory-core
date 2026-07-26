// S10 prep-scout probe: ground truth for the primary status-move opcode
// cluster (Cmd_seteffectprimary + Cmd_jumpifstatus/jumpiftype/
// jumpifsideaffecting/jumpifcantmakeasleep, battle_script_commands.c),
// currently blocking EFFECT_SLEEP/TOXIC/POISON/PARALYZE/CONFUSE per
// docs/executable-frontier-census.md. This script reruns two committed
// battle-lab scenarios (Thunder Wave paralysis, Sleep Powder sleep) at
// several seeds against the real ROM (Battle Scene OFF oracle) and asserts
// PASS/FAIL for every live claim in docs/status-cluster-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-status-cluster-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const PARALYZE_SCENARIO_PATH = "tools/battle-lab/mechanic-status-cluster-paralyze.json";
const SLEEP_SCENARIO_PATH = "tools/battle-lab/mechanic-status-cluster-sleep.json";

interface BattlerState {
  species: number;
  status1: number;
  status: { kind: string; turns?: number };
  hp: number;
  maxHp: number;
  pp: number[];
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(scenarioPath: string, seed: number): Promise<BattleLabResult> {
  const scenario = JSON.parse(readFileSync(scenarioPath, "utf8"));
  scenario.seed = seed;
  const url = `${oracleUrlForProfile("battle-scene-off")}/v1/battle-lab/run`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(scenario),
  });
  if (!response.ok) {
    throw new Error(`battle-lab run failed: HTTP ${response.status}: ${await response.text()}`);
  }
  const payload = (await response.json()) as { captures: Array<{ frame: number; state: CaptureState }> };
  const captures = new Map<number, CaptureState>();
  for (const capture of payload.captures) captures.set(capture.frame, capture.state);
  return { captures };
}

// ISO_RANDOMIZE1 (reference/pokeemerald/include/random.h:16):
// gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32).
function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
}

function rngRoll(value: number): { next: number; u16: number } {
  const next = rngStep(value);
  return { next, u16: next >>> 16 };
}

function stepsToReach(start: number, target: number, maxSteps: number): number | null {
  let value = start;
  for (let i = 1; i <= maxSteps; i++) {
    value = rngStep(value);
    if (value === target) return i;
  }
  return null;
}

let failures = 0;
function check(label: string, condition: boolean, detail: string): void {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL: ${label} -- ${detail}`);
  }
}

function deepEqualCapture(a: CaptureState, b: CaptureState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const STATUS1_PARALYSIS = 1 << 6; // battle.h:120

async function verifyParalyzeSeed(seed: number): Promise<void> {
  console.log(`\n=== EFFECT_PARALYZE, seed ${seed}: MOVE_THUNDER_WAVE (100 acc) PIKACHU -> EEVEE ===`);
  const run1 = await runScenario(PARALYZE_SCENARIO_PATH, seed);
  const run2 = await runScenario(PARALYZE_SCENARIO_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const accRoll = rngRoll(before1.rngValue);
  console.log(`    [1] accuracycheck (battle_script_commands.c:1176)  u16=${accRoll.u16}  %100=${accRoll.u16 % 100}`);
  check(
    `seed ${seed}: Thunder Wave's 100-accuracy roll always clears (u16 %% 100 < 100 trivially)`,
    (accRoll.u16 % 100) < 100,
    `u16=${accRoll.u16}`,
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`    opponent (EEVEE): status1 ${oppBefore.status1} -> ${oppAfter.status1} (${JSON.stringify(oppAfter.status)}), hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check(`seed ${seed}: opponent status1 is 0 before the hit`, oppBefore.status1 === 0, `status1=${oppBefore.status1}`);
  check(
    `seed ${seed}: opponent status1 gains exactly STATUS1_PARALYSIS (1<<6), nothing else -- SetMoveEffect's STATUS1_PARALYSIS arm (battle_script_commands.c:2395-2426) draws zero RNG`,
    oppAfter.status1 === STATUS1_PARALYSIS,
    `status1=${oppAfter.status1}, expected ${STATUS1_PARALYSIS}`,
  );
  check(`seed ${seed}: decoded status kind is "paralysis"`, oppAfter.status.kind === "paralysis", `status=${JSON.stringify(oppAfter.status)}`);
  check(`seed ${seed}: Thunder Wave is a status move -- opponent HP is unchanged`, oppAfter.hp === oppBefore.hp, `hp ${oppBefore.hp} -> ${oppAfter.hp}`);

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check(`seed ${seed}: player PP[0] (Thunder Wave) decremented by exactly 1`, playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);

  const totalCalls = stepsToReach(before1.rngValue, after1.rngValue, 20);
  console.log(`    total Random() calls, frame 0 -> 450: ${totalCalls}`);
  check(
    `seed ${seed}: whole-turn total is exactly 8 Random() calls (1 accuracycheck + 1 Eevee full-paralysis check + 6-call downstream tail, per docs/status-cluster-ground-truth.md)`,
    totalCalls === 8,
    `expected 8, forward-search found ${totalCalls === null ? "no match within 20 steps" : `step ${totalCalls}`}`,
  );
}

interface SleepExpectation {
  seed: number;
  hits: boolean;
}

async function verifySleepSeed(expectation: SleepExpectation): Promise<void> {
  const { seed, hits } = expectation;
  console.log(`\n=== EFFECT_SLEEP, seed ${seed}: MOVE_SLEEP_POWDER (75 acc) ODDISH -> MACHOP (expect ${hits ? "hit" : "miss"}) ===`);
  const run1 = await runScenario(SLEEP_SCENARIO_PATH, seed);
  const run2 = await runScenario(SLEEP_SCENARIO_PATH, seed);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check(`seed ${seed}: determinism, frame 0 identical across reruns`, deepEqualCapture(before1, before2), "initial state differs between runs");
  check(`seed ${seed}: determinism, frame 450 identical across reruns`, deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const accRoll = rngRoll(before1.rngValue);
  const accHit = (accRoll.u16 % 100) < 75;
  console.log(`    [1] accuracycheck (battle_script_commands.c:1176)  u16=${accRoll.u16}  %100=${accRoll.u16 % 100}  hit=${accHit}`);
  check(`seed ${seed}: accuracy roll outcome matches the expected fixture (${hits ? "hit" : "miss"})`, accHit === hits, `computed hit=${accHit}, expected ${hits}`);

  const oppAfter = after1.battlers.opponent;
  console.log(`    opponent (MACHOP): status1 ${before1.battlers.opponent.status1} -> ${oppAfter.status1} (${JSON.stringify(oppAfter.status)})`);

  if (hits) {
    const turnRoll = rngRoll(accRoll.next);
    const expectedTurns = (turnRoll.u16 & 3) + 2;
    console.log(`    [2] SetMoveEffect sleep-turn draw (battle_script_commands.c:2481)  u16=${turnRoll.u16}  &3=${turnRoll.u16 & 3}  turns=${expectedTurns}`);
    check(
      `seed ${seed}: status1 after the hit equals (Random() & 3) + 2 exactly (STATUS1_SLEEP_TURN convention, battle.h:116)`,
      oppAfter.status1 === expectedTurns,
      `status1=${oppAfter.status1}, expected ${expectedTurns}`,
    );
    check(`seed ${seed}: decoded status kind is "sleep"`, oppAfter.status.kind === "sleep", `status=${JSON.stringify(oppAfter.status)}`);
    check(`seed ${seed}: decoded turns matches status1`, oppAfter.status.turns === expectedTurns, `status=${JSON.stringify(oppAfter.status)}`);

    const totalCalls = stepsToReach(before1.rngValue, after1.rngValue, 20);
    console.log(`    total Random() calls, frame 0 -> 450: ${totalCalls}`);
    check(
      `seed ${seed}: hit-turn total is exactly 8 Random() calls (accuracy + duration + 6-call downstream tail)`,
      totalCalls === 8,
      `expected 8, found ${totalCalls === null ? "no match within 20 steps" : `step ${totalCalls}`}`,
    );
  } else {
    check(`seed ${seed}: opponent status1 stays 0 on a miss`, oppAfter.status1 === 0, `status1=${oppAfter.status1}`);
    check(`seed ${seed}: decoded status kind stays "none"`, oppAfter.status.kind === "none", `status=${JSON.stringify(oppAfter.status)}`);

    const totalCalls = stepsToReach(before1.rngValue, after1.rngValue, 20);
    console.log(`    total Random() calls, frame 0 -> 450: ${totalCalls}`);
    check(
      `seed ${seed}: miss-turn total is exactly 7 Random() calls (accuracy only, no duration draw, + the same 6-call downstream tail)`,
      totalCalls === 7,
      `expected 7, found ${totalCalls === null ? "no match within 20 steps" : `step ${totalCalls}`}`,
    );
  }
}

async function main(): Promise<void> {
  // Two proccing (hit) seeds and one control (guaranteed-hit accuracy=100) verify determinism x2 each.
  await verifyParalyzeSeed(1);
  await verifyParalyzeSeed(4);

  // Two hit seeds and one miss seed for Sleep Powder (75 acc) pin both the accuracy gate and the duration draw.
  await verifySleepSeed({ seed: 1, hits: true });
  await verifySleepSeed({ seed: 7, hits: true });
  await verifySleepSeed({ seed: 2, hits: false });

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
