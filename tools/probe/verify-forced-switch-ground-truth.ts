// S10 step (iv) PREP probe: forced-switch (non-terminal faint fork) ground
// truth. Reruns the committed tools/battle-lab/mechanic-forced-switch-ai-choice-off.json
// (URSARING one-shots a SUNKERN; the opponent's other two bench slots -- PIDGEY
// and MACHOP -- are both healthy, chosen so "next living index" (PIDGEY,
// partyIndex 1) and "AI's best type/damage matchup" (MACHOP, partyIndex 2)
// predict DIFFERENT outcomes) against the live oracle and asserts every claim
// in docs/forced-switch-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-forced-switch-ground-truth.ts

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

interface BattlerState {
  species: number;
  partyIndex: number;
  hp: number;
  maxHp: number;
  statStages: number[];
  status: { kind: string };
}

interface CaptureState {
  rngValue: number;
  battleOutcome: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

async function runScenario(scenarioPath: string): Promise<Map<number, CaptureState>> {
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
  const payload = (await response.json()) as { captures: Array<{ frame: number; state: CaptureState }> };
  const captures = new Map<number, CaptureState>();
  for (const capture of payload.captures) captures.set(capture.frame, capture.state);
  return captures;
}

// ISO_RANDOMIZE1 (reference/pokeemerald/include/random.h:16):
// gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32).
function rngStep(value: number): number {
  return (Math.imul(1103515245, value) + 24691) >>> 0;
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

const SPECIES_SUNKERN = 191;
const SPECIES_PIDGEY = 16;
const SPECIES_MACHOP = 66;
const B_OUTCOME_WON = 1;

async function main(): Promise<void> {
  console.log("=== Forced-switch (non-terminal faint fork) ground truth ===");
  const path = "tools/battle-lab/mechanic-forced-switch-ai-choice-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const F_START = 0;
  const F_PRE_KILL = 234; // mid hit-chain: post-roll-3 (adjustnormaldamage), pre-roll-4
  const F_KILL = 235; // datahpupdate already applied; HP 0
  const F_KILL_ROLLS_DONE = 240; // 4th roll (seteffectwithchance) landed
  const F_SWITCH_DANCE_END = 475; // still mid-dance, one frame before partyIndex flips
  const F_PARTYINDEX_FLIP = 476; // gBattlerPartyIndexes committed
  const F_REBUILD_DONE = 478; // species/hp/stats fully rebuilt
  const F_IDLE = 600; // real decision phase reached, no further RNG drift yet
  const F_NEXT_HIT_START = 700;
  const F_NEXT_HIT_DONE = 894;
  const F_TERMINAL = 1000;

  check(
    "determinism: frame 0 identical across reruns",
    deepEqualCapture(run1.get(F_START)!, run2.get(F_START)!),
    "initial state differs between runs",
  );
  check(
    "determinism: final frame identical across reruns",
    deepEqualCapture(run1.get(F_TERMINAL)!, run2.get(F_TERMINAL)!),
    "final state differs between runs",
  );

  const start = run1.get(F_START)!;
  const preKill = run1.get(F_PRE_KILL)!;
  const kill = run1.get(F_KILL)!;
  const killRollsDone = run1.get(F_KILL_ROLLS_DONE)!;
  const switchDanceEnd = run1.get(F_SWITCH_DANCE_END)!;
  const partyIndexFlip = run1.get(F_PARTYINDEX_FLIP)!;
  const rebuildDone = run1.get(F_REBUILD_DONE)!;
  const idle = run1.get(F_IDLE)!;
  const nextHitStart = run1.get(F_NEXT_HIT_START)!;
  const nextHitDone = run1.get(F_NEXT_HIT_DONE)!;

  // --- Claim: battle stays non-terminal throughout (this is the whole point
  // of the non-terminal fork -- the opponent still has living party members
  // after SUNKERN faints, so gBattleOutcome must never flip). ---
  check("battleOutcome never flips (non-terminal fork, opponent has 2 healthy bench mons)", idle.battleOutcome === 0 && nextHitDone.battleOutcome === 0, `idle=${idle.battleOutcome} nextHitDone=${nextHitDone.battleOutcome}`);

  // --- Claim: datahpupdate (HP->0) fires before the hit chain's own 4th
  // roll (seteffectwithchance) completes -- direct confirmation of the
  // documented linear opcode order (...healthbarupdate, datahpupdate,
  // critmessage, resultmessage, seteffectwithchance, tryfaintmon...). ---
  check(
    "kill frame: opponent HP is already 0 while rngValue is still the pre-4th-roll value",
    kill.battlers.opponent.hp === 0 && kill.rngValue === preKill.rngValue,
    `hp=${kill.battlers.opponent.hp} rng kill=${kill.rngValue} preKill=${preKill.rngValue}`,
  );
  check(
    "the 4th roll (seteffectwithchance) lands a few frames after the HP update, not before",
    killRollsDone.rngValue !== kill.rngValue,
    `rngValue unchanged from kill (${kill.rngValue}) through rolls-done frame`,
  );

  // --- Claim: the entire switch-in send-out script
  // (BattleScript_FaintedMonSendOutNew) draws ZERO Random() calls, for a
  // bench with THREE DIFFERENT species (SUNKERN/PIDGEY/MACHOP, none with an
  // ability that fires Random() on switch-in) -- extends
  // docs/faint-outcome-ground-truth.md's same-species finding to a
  // mixed-species bench. ---
  check(
    "switch-in dance draws ZERO Random() calls (rngValue unchanged from the kill's 4th roll through the dance's end)",
    killRollsDone.rngValue === switchDanceEnd.rngValue,
    `rngValue ${killRollsDone.rngValue} -> ${switchDanceEnd.rngValue}`,
  );

  // --- Claim: gBattlerPartyIndexes (getswitchedmondata) commits before the
  // full gBattleMons struct rebuild (switchindataupdate) is observable --
  // two distinct, sequential state-change moments, not one atomic write. ---
  check(
    "gBattlerPartyIndexes flips to the new slot (2) before species/HP are rebuilt",
    partyIndexFlip.battlers.opponent.partyIndex === 2 && partyIndexFlip.battlers.opponent.species === SPECIES_SUNKERN,
    `partyIndex=${partyIndexFlip.battlers.opponent.partyIndex} species=${partyIndexFlip.battlers.opponent.species} (expected stale species ${SPECIES_SUNKERN} still cached this frame)`,
  );
  check(
    "species/hp/stats fully rebuilt to the new mon shortly after",
    rebuildDone.battlers.opponent.species === SPECIES_MACHOP && rebuildDone.battlers.opponent.hp === rebuildDone.battlers.opponent.maxHp,
    `species=${rebuildDone.battlers.opponent.species} hp=${rebuildDone.battlers.opponent.hp}/${rebuildDone.battlers.opponent.maxHp}`,
  );

  // --- THE headline claim: the AI sends MACHOP (partyIndex 2, FIGHTING --
  // super-effective vs. URSARING's NORMAL/NORMAL, per
  // GetMostSuitableMonToSwitchInto's type/damage scoring), skipping over the
  // healthy PIDGEY (partyIndex 1, NORMAL/FLYING -- merely neutral vs.
  // NORMAL) entirely. This disambiguates "next living index" (would be
  // PIDGEY) from "AI's best-matchup pick" (MACHOP) -- the oracle shows the
  // latter. ---
  check(
    "AI sends MACHOP (partyIndex 2, best type matchup), NOT PIDGEY (partyIndex 1, next index)",
    idle.battlers.opponent.species === SPECIES_MACHOP && idle.battlers.opponent.partyIndex === 2,
    `species=${idle.battlers.opponent.species} partyIndex=${idle.battlers.opponent.partyIndex} (PIDGEY=${SPECIES_PIDGEY}@1, MACHOP=${SPECIES_MACHOP}@2)`,
  );

  // --- Claim: the freshly-switched-in mon reads neutral stat stages and no
  // status -- consistent with SwitchInClearSetData's unconditional reset
  // (battle_main.c:3152-3258). ---
  check(
    "freshly-switched-in MACHOP reads neutral stat stages ([6]*8) and no status",
    idle.battlers.opponent.statStages.every((stage) => stage === 6) && idle.battlers.opponent.status.kind === "none",
    `statStages=${JSON.stringify(idle.battlers.opponent.statStages)} status=${idle.battlers.opponent.status.kind}`,
  );

  // --- Claim: the battle genuinely resumes to a real decision phase -- a
  // SECOND real attack (URSARING's Strength again) lands on the newly
  // switched-in MACHOP later in the trace, proving HandleTurnActionSelectionState
  // was really re-entered, not a stuck/idle machine. ---
  check(
    "a second real attack lands on the switched-in MACHOP later (proves the battle resumed, not stalled)",
    nextHitDone.battlers.opponent.hp < idle.battlers.opponent.hp && nextHitDone.battlers.opponent.hp > 0,
    `hp before=${idle.battlers.opponent.hp} after=${nextHitDone.battlers.opponent.hp}`,
  );
  check(
    "that second hit chain's own 4-roll sequence is a genuine forward LCG walk from the post-switch idle value",
    stepsToReach(nextHitStart.rngValue, nextHitDone.rngValue, 8) !== null,
    `no short forward match from ${nextHitStart.rngValue} to ${nextHitDone.rngValue}`,
  );

  check("battleOutcome stays non-terminal even after the second hit (still 2 living opponent slots)", nextHitDone.battleOutcome !== B_OUTCOME_WON, `battleOutcome=${nextHitDone.battleOutcome}`);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
