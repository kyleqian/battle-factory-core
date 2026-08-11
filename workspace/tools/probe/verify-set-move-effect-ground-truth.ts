// S10 prep-scout probe: ground truth for SetMoveEffect (battle_script_commands.c
// :2234-2906), the unmodeled subsystem both of Cmd_seteffectwithchance's
// dispatch sites barrier on (src/engine/battleScriptHitChainOpcode.ts, the
// createSeteffectwithchanceOpcodeHandler comment around line 1553). This
// script reruns one committed battle-lab scenario (MOVE_EFFECT_PARALYSIS via
// MOVE_BODY_SLAM, EFFECT_PARALYZE_HIT) at a proccing seed and a non-proccing
// control seed against the real ROM (Battle Scene OFF oracle) and asserts
// PASS/FAIL for every live claim in docs/set-move-effect-ground-truth.md.
//
// Run: node --experimental-strip-types tools/probe/verify-set-move-effect-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";

const SCENARIO_PATH = "tools/battle-lab/mechanic-set-move-effect-paralysis-off.json";
const PROC_SEED = 4;
const CONTROL_SEED = 1;

interface BattlerState {
  species: number;
  status1: number;
  status: { kind: string };
  hp: number;
  maxHp: number;
  pp: number[];
}

interface PartyMonState {
  species: number;
  status1: number;
  status: { kind: string };
}

interface CaptureState {
  rngValue: number;
  battlers: { player: BattlerState; opponent: BattlerState };
  parties: { player: PartyMonState[]; opponent: PartyMonState[] };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(seed: number): Promise<BattleLabResult> {
  const scenario = JSON.parse(readFileSync(SCENARIO_PATH, "utf8"));
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
 * identical derivation to tools/probe/verify-hit-chain-edges.ts's
 * deriveHitRolls. MOVE_BODY_SLAM's own accuracy (100) and secondaryEffectChance
 * (30) don't change which commands draw Random(), only whether the 4th roll's
 * result clears the `% 100 < 30` gate in Cmd_seteffectwithchance
 * (battle_script_commands.c:2923).
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

const STATUS1_PARALYSIS = 1 << 6; // include/battle.h status1 bit, matches sStatusFlagsForMoveEffects[MOVE_EFFECT_PARALYSIS].
const SECONDARY_EFFECT_CHANCE = 30; // MOVE_BODY_SLAM, data/battle_moves.h.

async function verifyProcSeed(): Promise<void> {
  console.log(`\n=== Proc seed ${PROC_SEED}: MOVE_BODY_SLAM paralyzes MAGNETON ===`);
  const run1 = await runScenario(PROC_SEED);
  const run2 = await runScenario(PROC_SEED);

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
    "seteffectwithchance's own roll (#4) clears the % 100 < 30 chance gate (battle_script_commands.c:2923)",
    (secRoll % 100) < SECONDARY_EFFECT_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, needed < ${SECONDARY_EFFECT_CHANCE}`,
  );

  check(
    "attacker's own hit-chain is still exactly 4 Random() calls (SetMoveEffect's non-sleep status branch draws zero extra RNG, battle_script_commands.c:2476-2513)",
    stepsToReach(before1.rngValue, chain.rngAfter, 4) === 4,
    "4-roll replay did not land where derived",
  );

  const gapToFrame450 = stepsToReach(before1.rngValue, after1.rngValue, 8);
  check(
    "the whole turn (both attackers) is still exactly 8 Random() calls by frame 450, same total as a plain no-proc hit chain (docs/hit-chain-ground-truth.md Scenario 1) -- the proc adds a status message, not a Random() call",
    gapToFrame450 === 8,
    `expected step 8, forward-search found ${gapToFrame450 === null ? "no match within 8 steps" : `step ${gapToFrame450}`}`,
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (MAGNETON): status1 ${oppBefore.status1} -> ${oppAfter.status1} (${JSON.stringify(oppAfter.status)}), hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check("opponent status1 is 0 before the hit", oppBefore.status1 === 0, `status1=${oppBefore.status1}`);
  check(
    "opponent status1 gains exactly the STATUS1_PARALYSIS bit (1<<6) after the hit, nothing else",
    oppAfter.status1 === STATUS1_PARALYSIS,
    `status1=${oppAfter.status1}, expected ${STATUS1_PARALYSIS}`,
  );
  check("decoded status kind is \"paralysis\"", oppAfter.status.kind === "paralysis", `status=${JSON.stringify(oppAfter.status)}`);
  check("opponent does not faint from the hit (paralysis is written to a living target)", oppAfter.hp > 0, `hp=${oppAfter.hp}`);

  const partyBefore = before1.parties.opponent[0]!;
  const partyAfter = after1.parties.opponent[0]!;
  check(
    "party-record sync: parties.opponent[0].status1 mirrors battlers.opponent.status1 exactly (docs/battle-resolution-adapter-ground-truth.md §2's live-sync mechanism)",
    partyAfter.status1 === oppAfter.status1 && partyBefore.status1 === oppBefore.status1,
    `party status1 ${partyBefore.status1} -> ${partyAfter.status1}, battler status1 ${oppBefore.status1} -> ${oppAfter.status1}`,
  );

  const playerBefore = before1.battlers.player;
  const playerAfter = after1.battlers.player;
  check("player PP[0] (Body Slam) decremented by exactly 1", playerBefore.pp[0]! - playerAfter.pp[0]! === 1, `${playerBefore.pp[0]} -> ${playerAfter.pp[0]}`);
}

async function verifyControlSeed(): Promise<void> {
  console.log(`\n=== Control seed ${CONTROL_SEED}: MOVE_BODY_SLAM hits, does NOT paralyze (chance roll fails) ===`);
  const run1 = await runScenario(CONTROL_SEED);
  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;

  const chain = deriveAttackerChain(before1.rngValue);
  printRolls(chain.rolls);
  const secRoll = chain.rolls[3]!.value;

  check(
    "control seed's seteffectwithchance roll does NOT clear the % 100 < 30 gate",
    (secRoll % 100) >= SECONDARY_EFFECT_CHANCE,
    `u16=${secRoll}, ${secRoll} % 100 = ${secRoll % 100}, expected >= ${SECONDARY_EFFECT_CHANCE}`,
  );

  check(
    "control seed's attacker-chain is exactly the plain-hit 4-roll count",
    stepsToReach(before1.rngValue, chain.rngAfter, 4) === 4,
    "4-roll replay did not land where derived",
  );

  const oppBefore = before1.battlers.opponent;
  const oppAfter = after1.battlers.opponent;
  console.log(`  opponent (MAGNETON): status1 ${oppBefore.status1} -> ${oppAfter.status1} (${JSON.stringify(oppAfter.status)}), hp ${oppBefore.hp} -> ${oppAfter.hp}/${oppAfter.maxHp}`);

  check("control seed's opponent status1 stays 0 (no proc)", oppAfter.status1 === 0, `status1=${oppAfter.status1}`);
  check("control seed's decoded status kind stays \"none\"", oppAfter.status.kind === "none", `status=${JSON.stringify(oppAfter.status)}`);

  const partyAfter = after1.parties.opponent[0]!;
  check(
    "control seed's party record also stays unstatused (sync holds in the no-proc case too)",
    partyAfter.status1 === 0,
    `party status1=${partyAfter.status1}`,
  );

  const gapToFrame450 = stepsToReach(before1.rngValue, after1.rngValue, 60);
  console.log(`    (control seed reaches frame 450 in ${gapToFrame450} total Random() calls -- includes the +14-ish next-turn AI move-selection scoring pass that the proc seed's extra on-screen message pushes past frame 450, see docs/hit-chain-ground-truth.md)`);
}

async function main(): Promise<void> {
  await verifyProcSeed();
  await verifyControlSeed();

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
