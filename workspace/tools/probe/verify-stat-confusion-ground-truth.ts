// S10 prep-scout probe: ground truth for ChangeStatBuffs (battle_script_commands.c
// :6937-7098, the secondary-effect stat-stage guard ladder) and
// MOVE_EFFECT_CONFUSION (battle_script_commands.c:2533-2546 + the
// CANCELER_CONFUSED self-hit mechanic in battle_util.c:2156-2179) -- the two
// families docs/set-move-effect-ground-truth.md explicitly deferred. This
// script reruns three committed battle-lab scenarios (proc/control/blocked)
// against the real ROM (Battle Scene OFF oracle) and asserts PASS/FAIL for
// every live claim in docs/stat-change-confusion-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-stat-confusion-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SPDEF_SCENARIO_PATH = "tools/battle-lab/mechanic-change-stat-buffs-spdef-off.json";
const SPDEF_CLEARBODY_SCENARIO_PATH = "tools/battle-lab/mechanic-change-stat-buffs-spdef-clearbody-off.json";
const CONFUSION_SCENARIO_PATH = "tools/battle-lab/mechanic-set-move-effect-confusion-off.json";

const PROC_SEED = 9;
const CONTROL_SEED = 1;

interface BattlerState {
  species: number;
  status2: number;
  volatile: { confusionTurns: number };
  ability: number;
  statStages: number[];
  hp: number;
  maxHp: number;
  pp: number[];
}

interface PartyMonState {
  species: number;
  [key: string]: unknown;
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
  parties: { player: PartyMonState[]; opponent: PartyMonState[] };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(path: string, seed: number): Promise<BattleLabResult> {
  const scenario = JSON.parse(readFileSync(path, "utf8"));
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

interface Roll {
  label: string;
  citation: string;
  value: number;
}

/**
 * BattleScript_EffectHit's hit branch, attacker's own 4-roll chain --
 * identical derivation to the prior probe's deriveAttackerChain. The stat
 * and confusion moves under test share the same accuracy (100) and normal
 * crit stage as the paralysis precedent's MOVE_BODY_SLAM, so only roll 4's
 * result against each move's own secondaryEffectChance differs.
 */
function deriveAttackerChain(rngBefore: number): { rolls: Roll[]; rngAfter: number } {
  const rolls: Roll[] = [];
  let rng = rngBefore;

  const acc = rngRoll(rng); rng = acc.next;
  rolls.push({ label: "accuracycheck", citation: "battle_script_commands.c:1176", value: acc.u16 });

  const crit = rngRoll(rng); rng = crit.next;
  rolls.push({ label: "critcalc", citation: "battle_script_commands.c:1282", value: crit.u16 });

  const dmg = rngRoll(rng); rng = dmg.next;
  rolls.push({ label: "adjustnormaldamage (ApplyRandomDmgMultiplier)", citation: "battle_script_commands.c:1641-1642", value: dmg.u16 });

  const sec = rngRoll(rng); rng = sec.next;
  rolls.push({ label: "seteffectwithchance", citation: "battle_script_commands.c:2923", value: sec.u16 });

  return { rolls, rngAfter: rng };
}

function printRolls(rolls: Roll[]): void {
  rolls.forEach((roll, index) => {
    console.log(`    [${index + 1}] ${roll.label.padEnd(42)} u16=${roll.value}  (${roll.citation})`);
  });
}

const STAT_SPDEF = 5; // include/constants/pokemon.h:80, index into gBattleMons.statStages[]
const ABILITY_CLEAR_BODY = 29; // include/constants/abilities.h:33
const SPDEF_CHANCE = 20; // MOVE_CRUNCH, data/battle_moves.h:3156
const CONFUSION_CHANCE = 20; // MOVE_WATER_PULSE, data/battle_moves.h:4586

async function verifySpdefProc(): Promise<void> {
  console.log(`\n=== SP_DEF_MINUS_1 proc seed ${PROC_SEED}: MOVE_CRUNCH lowers MAGNETON's Sp. Def ===`);
  const run1 = await runScenario(SPDEF_SCENARIO_PATH, PROC_SEED);
  const run2 = await runScenario(SPDEF_SCENARIO_PATH, PROC_SEED);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const chain = deriveAttackerChain(before1.rngValue);
  printRolls(chain.rolls);
  const secRoll = chain.rolls[3]!.value;

  check(
    "seteffectwithchance's own roll (#4) clears the % 100 < 20 chance gate (MOVE_CRUNCH secondaryEffectChance)",
    (secRoll % 100) < SPDEF_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, needed < ${SPDEF_CHANCE}`,
  );
  check(
    "attacker's own hit-chain is still exactly 4 Random() calls",
    stepsToReach(before1.rngValue, chain.rngAfter, 4) === 4,
    "4-roll replay did not land where derived",
  );
  check(
    "whole capture window reaches frame 450 in exactly 5 Random() calls -- the 4-roll chain plus one call NOT attributable to ChangeStatBuffs (source-confirmed zero Random() calls, battle_script_commands.c:6937-7098), most plausibly Magneton's own delayed accuracycheck",
    stepsToReach(before1.rngValue, after1.rngValue, 10) === 5,
    "5-step forward search did not land on frame 450's rngValue",
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (MAGNETON): statStages[SPDEF] ${oppBefore.statStages[STAT_SPDEF]} -> ${oppAfter.statStages[STAT_SPDEF]}, hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check("opponent statStages[SPDEF] starts at neutral (6)", oppBefore.statStages[STAT_SPDEF] === 6, `statStages[SPDEF]=${oppBefore.statStages[STAT_SPDEF]}`);
  check(
    "opponent statStages[SPDEF] drops by exactly 1 stage (6 -> 5) after the hit",
    oppAfter.statStages[STAT_SPDEF] === 5,
    `statStages[SPDEF]=${oppAfter.statStages[STAT_SPDEF]}, expected 5`,
  );
  check("opponent does not faint from the hit", oppAfter.hp > 0, `hp=${oppAfter.hp}`);

  const partyAfter = after1.parties.opponent[0]!;
  check(
    "party record has no statStages field at all (structural: boxed Pokémon format has no stat-stage byte, oracle/battle_lab.py:_party_mon)",
    !("statStages" in partyAfter),
    `party record keys: ${Object.keys(partyAfter).join(",")}`,
  );

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check("player PP[0] (Crunch) decremented by exactly 1", playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);
}

async function verifySpdefControl(): Promise<void> {
  console.log(`\n=== SP_DEF_MINUS_1 control seed ${CONTROL_SEED}: MOVE_CRUNCH hits, does NOT lower Sp. Def ===`);
  const run1 = await runScenario(SPDEF_SCENARIO_PATH, CONTROL_SEED);
  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;

  const chain = deriveAttackerChain(before1.rngValue);
  printRolls(chain.rolls);
  const secRoll = chain.rolls[3]!.value;

  check(
    "control seed's seteffectwithchance roll does NOT clear the % 100 < 20 gate",
    (secRoll % 100) >= SPDEF_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, expected >= ${SPDEF_CHANCE}`,
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  check("control seed's opponent statStages[SPDEF] stays 6 (no proc)", oppAfter.statStages[STAT_SPDEF] === 6, `statStages[SPDEF]=${oppAfter.statStages[STAT_SPDEF]}`);
  check("control seed's opponent statStages[SPDEF] started at 6 too", oppBefore.statStages[STAT_SPDEF] === 6, `statStages[SPDEF]=${oppBefore.statStages[STAT_SPDEF]}`);

  const gapToFrame450 = stepsToReach(before1.rngValue, after1.rngValue, 60);
  check(
    "control seed reaches frame 450 in exactly 22 total Random() calls (no extra on-screen message -> AI's next-turn scoring pass fits inside the window, same shape as both prior probes' own control seeds)",
    gapToFrame450 === 22,
    `expected step 22, forward-search found ${gapToFrame450 === null ? "no match within 60 steps" : `step ${gapToFrame450}`}`,
  );
}

async function verifySpdefBlocked(): Promise<void> {
  console.log(`\n=== SP_DEF_MINUS_1 blocked case, seed ${PROC_SEED} vs. METANG (Clear Body) ===`);
  const run1 = await runScenario(SPDEF_CLEARBODY_SCENARIO_PATH, PROC_SEED);
  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;

  const chain = deriveAttackerChain(before1.rngValue);
  const secRoll = chain.rolls[3]!.value;
  check(
    "same seed 9's chance roll still clears < 20 against this target too (the guard, not luck, blocks the effect)",
    (secRoll % 100) < SPDEF_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}`,
  );

  const oppAfter = after1.battlers.opponent;
  check("opponent ability reads back as Clear Body (29)", oppAfter.ability === ABILITY_CLEAR_BODY, `ability=${oppAfter.ability}`);
  check(
    "opponent statStages[SPDEF] stays 6 -> 6 despite the clearing chance roll (Clear Body guard live-confirmed)",
    after1.battlers.opponent.statStages[STAT_SPDEF] === 6 && before1.battlers.opponent.statStages[STAT_SPDEF] === 6,
    `statStages[SPDEF] ${before1.battlers.opponent.statStages[STAT_SPDEF]} -> ${after1.battlers.opponent.statStages[STAT_SPDEF]}`,
  );
  check("opponent still takes damage (only the secondary stat effect is blocked)", oppAfter.hp < before1.battlers.opponent.hp, `hp=${oppAfter.hp}`);

  const gapToFrame450 = stepsToReach(before1.rngValue, after1.rngValue, 60);
  check(
    "blocked case reaches frame 450 in exactly 22 total Random() calls -- same fast-forward shape as the plain control, confirming the silent-block path costs zero extra script execution (no BattleScriptPush/jump, battle_script_commands.c:6987-7008)",
    gapToFrame450 === 22,
    `expected step 22, forward-search found ${gapToFrame450 === null ? "no match within 60 steps" : `step ${gapToFrame450}`}`,
  );
}

async function verifyConfusionProc(): Promise<void> {
  console.log(`\n=== CONFUSION proc seed ${PROC_SEED}: MOVE_WATER_PULSE confuses MAGNETON ===`);
  const run1 = await runScenario(CONFUSION_SCENARIO_PATH, PROC_SEED);
  const run2 = await runScenario(CONFUSION_SCENARIO_PATH, PROC_SEED);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const chain = deriveAttackerChain(before1.rngValue);
  printRolls(chain.rolls);
  const secRoll = chain.rolls[3]!.value;
  check(
    "seteffectwithchance's own roll (#4) clears the % 100 < 20 chance gate (MOVE_WATER_PULSE secondaryEffectChance)",
    (secRoll % 100) < CONFUSION_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, needed < ${CONFUSION_CHANCE}`,
  );

  // Roll 5: SetMoveEffect's own confusion-duration draw, (Random() % 4) + 2,
  // battle_script_commands.c:2541. Derived by pure forward LCG stepping past
  // roll 4 -- NOT read from the frame-450 capture, which reflects one extra
  // automatic decrement from Magneton's own subsequent turn (see roll 6).
  const durationRoll = rngRoll(chain.rngAfter);
  const rawDurationTurns = (durationRoll.u16 % 4) + 2;
  console.log(`    [5] confusion-duration draw                    u16=${durationRoll.u16}  (battle_script_commands.c:2541) -> raw ${rawDurationTurns} turns`);
  check(
    "roll 5's raw duration arithmetic ((Random()%4)+2) is in the documented 2-5 range",
    rawDurationTurns >= 2 && rawDurationTurns <= 5,
    `computed ${rawDurationTurns} turns from u16=${durationRoll.u16}`,
  );

  // Roll 6: AtkCanceller_UnableToUseMove's CANCELER_CONFUSED self-hit check,
  // Random() & 1, battle_util.c:2162 -- a SEPARATE roll from roll 5, fired on
  // the confused battler's own next turn (Magneton's, same round here).
  const selfHitRoll = rngRoll(durationRoll.next);
  console.log(`    [6] CANCELER_CONFUSED self-hit check            u16=${selfHitRoll.u16}  (battle_util.c:2162) -> ${selfHitRoll.u16 & 1 ? "acts normally" : "hurts itself"}`);

  check(
    "whole capture window reaches frame 450 in exactly 9 Random() calls: 4 (attacker chain) + 1 (duration) + 1 (self-hit check) + 3 (Magneton's own Tackle hit-chain, no secondary roll)",
    stepsToReach(before1.rngValue, after1.rngValue, 20) === 9,
    "9-step forward search did not land on frame 450's rngValue",
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (MAGNETON): status2 ${oppBefore.status2} -> ${oppAfter.status2} (confusionTurns=${oppAfter.volatile.confusionTurns}), hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check("opponent status2 is 0 before the hit", oppBefore.status2 === 0, `status2=${oppBefore.status2}`);
  check(
    "opponent status2 reads back as (raw duration - 1) at frame 450 -- one CANCELER_CONFUSED decrement already happened this same round (battle_util.c:2159), NOT the raw roll-5 value",
    oppAfter.status2 === rawDurationTurns - 1,
    `status2=${oppAfter.status2}, expected ${rawDurationTurns - 1} (raw ${rawDurationTurns} minus 1 decrement)`,
  );
  check("opponent does not faint from the hit or from confusion self-damage", oppAfter.hp > 0, `hp=${oppAfter.hp}`);

  const partyAfter = after1.parties.opponent[0]!;
  check(
    "party record has no status2 field at all (structural: boxed Pokémon format only exposes permanent status1, oracle/battle_lab.py:_party_mon)",
    !("status2" in partyAfter),
    `party record keys: ${Object.keys(partyAfter).join(",")}`,
  );

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check("player PP[0] (Water Pulse) decremented by exactly 1", playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);
}

async function verifyConfusionControl(): Promise<void> {
  console.log(`\n=== CONFUSION control seed ${CONTROL_SEED}: MOVE_WATER_PULSE hits, does NOT confuse ===`);
  const run1 = await runScenario(CONFUSION_SCENARIO_PATH, CONTROL_SEED);
  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;

  const chain = deriveAttackerChain(before1.rngValue);
  const secRoll = chain.rolls[3]!.value;
  check(
    "control seed's seteffectwithchance roll does NOT clear the % 100 < 20 gate",
    (secRoll % 100) >= CONFUSION_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, expected >= ${CONFUSION_CHANCE}`,
  );

  const oppAfter = after1.battlers.opponent;
  check("control seed's opponent status2 stays 0 (no proc)", oppAfter.status2 === 0, `status2=${oppAfter.status2}`);
  check("control seed's decoded confusionTurns stays 0", oppAfter.volatile.confusionTurns === 0, `confusionTurns=${oppAfter.volatile.confusionTurns}`);

  const partyAfter = after1.parties.opponent[0]!;
  check(
    "control seed's party record also has no status2 field",
    !("status2" in partyAfter),
    `party record keys: ${Object.keys(partyAfter).join(",")}`,
  );

  const gapToFrame450 = stepsToReach(before1.rngValue, after1.rngValue, 60);
  check(
    "control seed reaches frame 450 in exactly 22 total Random() calls, same shape as the SP_DEF_MINUS_1 control (identical rngValue stream when no proc happens)",
    gapToFrame450 === 22,
    `expected step 22, forward-search found ${gapToFrame450 === null ? "no match within 60 steps" : `step ${gapToFrame450}`}`,
  );
}

async function main(): Promise<void> {
  await verifySpdefProc();
  await verifySpdefControl();
  await verifySpdefBlocked();
  await verifyConfusionProc();
  await verifyConfusionControl();

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
