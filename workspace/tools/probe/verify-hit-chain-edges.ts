// S10 step (ii) probe (edge cases): ground truth for BattleScript_EffectHit's
// KO/faint path (Cmd_tryfaintmon, both the non-terminal next-mon branch and
// the terminal win-battle branch) and its critical-hit path (Cmd_critcalc's
// gCritMultiplier=2). Sibling to tools/probe/verify-hit-chain-ground-truth.ts
// (that script covers a plain hit and a plain miss; this one covers the two
// holes flagged in its own docs -- no KO case, no crit case). Same
// attributed-roll conventions, reruns two committed battle-lab scenarios
// against the stock ROM (Battle Scene OFF oracle), asserts PASS/FAIL.
//
// Run: node --experimental-strip-types tools/probe/verify-hit-chain-edges.ts
// (also runnable via `npx tsx` if available; no project code depends on either).
//
// CONTRACT CHANGE since verify-hit-chain-ground-truth.ts was written: the
// battle-scene-off oracle has been restarted and now accepts
// mechanicLab overrides.parties (confirmed with a cheap probe request before
// building anything below). The KO scenario uses overrides.parties (it needs
// three real, distinct party members per side so a real multi-KO chain can
// happen); the crit scenario reuses the existing overrides.battlers-based
// route/matchup (KADABRA vs MAGNETON, both Tackle) already pinned by the
// sibling script, just hunting a seed whose player-side critcalc roll crits.

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";
import {
  calculateAccuracy,
  rollAccuracyHits,
  getCriticalHitChanceStage,
  rollIsCriticalHit,
  calculateBaseDamage,
  applyStab,
  applyTypeEffectiveness,
  applyRandomDamageMultiplier,
  NEUTRAL_STAT_STAGES,
  CRITICAL_HIT_CHANCE_ONE_IN,
  type TypeEffectivenessEntry,
} from "../../src/engine/damageCalc.ts";
import typeEffectivenessData from "../../src/data/gen/type-effectiveness.json" with { type: "json" };

const typeEffectivenessTable = typeEffectivenessData.typeEffectiveness as TypeEffectivenessEntry[];

// include/constants/pokemon.h:6-23 (TYPE_NORMAL=0 .. TYPE_DARK=17).
const TYPE_ID_TO_NAME: Record<number, string> = {
  0: "TYPE_NORMAL", 1: "TYPE_FIGHTING", 2: "TYPE_FLYING", 3: "TYPE_POISON", 4: "TYPE_GROUND",
  5: "TYPE_ROCK", 6: "TYPE_BUG", 7: "TYPE_GHOST", 8: "TYPE_STEEL", 9: "TYPE_MYSTERY",
  10: "TYPE_FIRE", 11: "TYPE_WATER", 12: "TYPE_GRASS", 13: "TYPE_ELECTRIC", 14: "TYPE_PSYCHIC",
  15: "TYPE_ICE", 16: "TYPE_DRAGON", 17: "TYPE_DARK",
};

// data/battle_moves.h: MOVE_TACKLE (:432-443, power 35 acc 95) and
// MOVE_STRENGTH (:720-731, power 80 acc 100), both EFFECT_HIT, secondaryEffectChance 0.
const MOVES: Record<number, { name: string; power: number; type: string; accuracy: number }> = {
  33: { name: "TACKLE", power: 35, type: "TYPE_NORMAL", accuracy: 95 },
  70: { name: "STRENGTH", power: 80, type: "TYPE_NORMAL", accuracy: 100 },
};

interface BattlerState {
  species: number;
  partyIndex: number;
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
  moves: number[];
  types: number[];
  pp: number[];
  hp: number;
  maxHp: number;
  ability: number;
}

interface CaptureState {
  rngValue: number;
  battleOutcome: number;
  battlers: { player: BattlerState; opponent: BattlerState };
}

interface BattleLabResult {
  captures: Map<number, CaptureState>;
}

async function runScenario(scenarioPath: string): Promise<BattleLabResult> {
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

function ppUsedSlot(before: number[], after: number[]): number {
  return before.findIndex((value, index) => value !== after[index]);
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
 * BattleScript_EffectHit's hit branch (data/battle_scripts_1.s:236-266), one
 * attacker: exactly four Random() calls in this fixed order, REGARDLESS of
 * whether the hit KOs the target -- seteffectwithchance (:265) runs before
 * tryfaintmon (:266) on the same linear path, so a KO does not skip or
 * reorder any of the four rolls. Confirmed empirically for the KO case below
 * (frame-0 rngValue forward-derived via this function lands exactly on the
 * frame-260 post-KO rngValue captured from the real ROM -- see
 * docs/hit-chain-ground-truth.md's new KO table).
 */
function deriveHitRolls(rngBefore: number): { rolls: Roll[]; rngAfter: number } {
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

/**
 * Non-crit damage cross-check, identical arithmetic to the sibling script's
 * crossCheckDamage: calculateBaseDamage -> applyStab -> applyTypeEffectiveness
 * -> applyRandomDamageMultiplier. Returns the final computed damage so a
 * caller can either assert exact equality (a survives-the-hit scenario) or
 * assert the ROM's clamped-to-0 KO result is >= this value (an overkill hit).
 */
function computeDamage(params: {
  attackerStats: BattlerState;
  defenderStats: BattlerState;
  moveId: number;
  critRoll: number;
  dmgRandRoll: number;
}): { base: number; stabbed: number; typed: number; multiplierTenths: number; final: number; isCriticalHit: boolean } {
  const move = MOVES[params.moveId]!;
  const critChanceStage = getCriticalHitChanceStage({});
  const isCriticalHit = rollIsCriticalHit(critChanceStage, params.critRoll);

  const base = calculateBaseDamage({
    attacker: {
      attack: params.attackerStats.stats.attack,
      defense: params.attackerStats.stats.defense,
      spAttack: params.attackerStats.stats.spAttack,
      spDefense: params.attackerStats.stats.spDefense,
      level: 50,
      types: [TYPE_ID_TO_NAME[params.attackerStats.types[0]!]!, TYPE_ID_TO_NAME[params.attackerStats.types[1]!]!],
      statStages: NEUTRAL_STAT_STAGES,
    },
    defender: {
      attack: params.defenderStats.stats.attack,
      defense: params.defenderStats.stats.defense,
      spAttack: params.defenderStats.stats.spAttack,
      spDefense: params.defenderStats.stats.spDefense,
      level: 50,
      types: [TYPE_ID_TO_NAME[params.defenderStats.types[0]!]!, TYPE_ID_TO_NAME[params.defenderStats.types[1]!]!],
      statStages: NEUTRAL_STAT_STAGES,
    },
    movePower: move.power,
    moveType: move.type,
    isCriticalHit,
  });

  // Cmd_damagecalc (battle_script_commands.c:1290): gBattleMoveDamage =
  // CalculateBaseDamage(...) * gCritMultiplier * dmgMultiplier, i.e. the
  // crit doubling happens HERE, BEFORE Cmd_typecalc's STAB/type-effectiveness
  // step -- calculateBaseDamage() itself (pokemon.c:3106-3371, ported in
  // damageCalc.ts) does NOT include this multiplier; damageCalc.ts's
  // exported functions currently have no crit-doubling step of their own
  // (isCriticalHit only affects critAdjustedAttackStat/DefenseStat, i.e.
  // whether a stat-stage change is ignored, not a x2). The registration step
  // must apply gCritMultiplier here, between calculateBaseDamage and
  // applyStab -- see docs/hit-chain-ground-truth.md's crit table.
  const critDoubled = isCriticalHit ? base * 2 : base;

  const attackerTypes: readonly [string, string] = [
    TYPE_ID_TO_NAME[params.attackerStats.types[0]!]!,
    TYPE_ID_TO_NAME[params.attackerStats.types[1]!]!,
  ];
  const stabbed = applyStab(critDoubled, attackerTypes, move.type);
  const { damage: typed, multiplierTenths } = applyTypeEffectiveness(
    stabbed,
    move.type,
    [TYPE_ID_TO_NAME[params.defenderStats.types[0]!]!, TYPE_ID_TO_NAME[params.defenderStats.types[1]!]!],
    typeEffectivenessTable,
  );
  const final = applyRandomDamageMultiplier(typed, params.dmgRandRoll);
  return { base, stabbed, typed, multiplierTenths, final, isCriticalHit };
}

async function verifyKoScenario(): Promise<void> {
  console.log("\n=== KO scenario: mechanic-hit-chain-ko-off.json (URSARING Strength one-shots three SUNKERN in a row) ===");
  const path = "tools/battle-lab/mechanic-hit-chain-ko-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const FRAME_START = 0;
  const FRAME_TURN1_KO = 260;
  const FRAME_TURN2_SWITCH = 510;
  const FRAME_TURN2_KO = 860;
  const FRAME_TURN3_SWITCH = 1110;
  const FRAME_TERMINAL = 1650;

  check(
    "determinism: frame 0 identical across reruns",
    deepEqualCapture(run1.captures.get(FRAME_START)!, run2.captures.get(FRAME_START)!),
    "initial state differs between runs",
  );
  check(
    "determinism: terminal frame identical across reruns",
    deepEqualCapture(run1.captures.get(FRAME_TERMINAL)!, run2.captures.get(FRAME_TERMINAL)!),
    "post-battle state differs between runs",
  );

  const start = run1.captures.get(FRAME_START)!;
  const turn1Ko = run1.captures.get(FRAME_TURN1_KO)!;
  const turn2Switch = run1.captures.get(FRAME_TURN2_SWITCH)!;
  const turn2Ko = run1.captures.get(FRAME_TURN2_KO)!;
  const turn3Switch = run1.captures.get(FRAME_TURN3_SWITCH)!;
  const terminal = run1.captures.get(FRAME_TERMINAL)!;

  // --- Turn 1's killing hit: clean frame-0 baseline, same derivation/proof
  // technique as the sibling script's hit/miss scenarios. ---
  const p0 = start.battlers.player;
  const o0 = start.battlers.opponent;
  console.log(`  turn 1: player (URSARING, atk=${p0.stats.attack}) Strength -> opponent (SUNKERN #1, def=${o0.stats.defense}, hp=${o0.maxHp})`);

  const killRolls = deriveHitRolls(start.rngValue);
  printRolls(killRolls.rolls);

  const gap1 = stepsToReach(start.rngValue, turn1Ko.rngValue, 8);
  check(
    "turn 1's 4-roll killing-hit chain lands exactly on the frame-260 rngValue (no AI-scoring gap: target fainted, opponent's own action is skipped)",
    gap1 === 4,
    `expected the chain to land at step 4, forward-search found ${gap1 === null ? "no match within 8 steps" : `step ${gap1}`}`,
  );

  const o1 = turn1Ko.battlers.opponent;
  check("SUNKERN #1 HP drops to exactly 0 (clamped, not negative)", o1.hp === 0, `hp=${o1.hp}`);

  const killDamage = computeDamage({
    attackerStats: p0,
    defenderStats: o0,
    moveId: 70,
    critRoll: killRolls.rolls[1]!.value,
    dmgRandRoll: killRolls.rolls[2]!.value,
  });
  console.log(
    `    computed: base=${killDamage.base} stab=${killDamage.stabbed} typeMul=${killDamage.multiplierTenths}/10 -> ` +
      `${killDamage.typed} rand->${killDamage.final} (crit=${killDamage.isCriticalHit}) vs remaining HP=${o0.hp}`,
  );
  check(
    "killing hit's computed damage overkills SUNKERN #1's remaining HP (tryfaintmon's HP<=0 condition)",
    killDamage.final >= o0.hp,
    `damageCalc.ts computed ${killDamage.final}, needed >= ${o0.hp}`,
  );
  check("killing hit's own accuracy roll resolves to a hit (Strength is 100% accuracy)", (killRolls.rolls[0]!.value % 100) + 1 <= 100, "unreachable for a 100-accuracy move");

  const pAfter1 = turn1Ko.battlers.player;
  check("player PP[0] decremented by exactly 1 on the killing hit", p0.pp[0]! - pAfter1.pp[0]! === 1, `${p0.pp[0]} -> ${pAfter1.pp[0]}`);

  // --- Non-terminal faint path: next-mon, not battle end. ---
  check("turn 1's KO is NON-terminal: battleOutcome still 0 right after the faint", turn1Ko.battleOutcome === 0, `battleOutcome=${turn1Ko.battleOutcome}`);
  check(
    "ROM sends out the next party member after a non-terminal faint: opponent partyIndex 0 -> 1, HP reset to max",
    turn2Switch.battlers.opponent.partyIndex === 1 && turn2Switch.battlers.opponent.hp === turn2Switch.battlers.opponent.maxHp,
    `partyIndex=${turn2Switch.battlers.opponent.partyIndex}, hp=${turn2Switch.battlers.opponent.hp}/${turn2Switch.battlers.opponent.maxHp}`,
  );

  // --- Turn 2: second KO, still non-terminal (one SUNKERN left on the bench). ---
  check("SUNKERN #2 also faints (HP -> 0)", turn2Ko.battlers.opponent.hp === 0, `hp=${turn2Ko.battlers.opponent.hp}`);
  check("turn 2's KO is also non-terminal: battleOutcome still 0", turn2Ko.battleOutcome === 0, `battleOutcome=${turn2Ko.battleOutcome}`);
  check(
    "ROM sends out the LAST party member after turn 2's faint: opponent partyIndex 1 -> 2, HP reset to max",
    turn3Switch.battlers.opponent.partyIndex === 2 && turn3Switch.battlers.opponent.hp === turn3Switch.battlers.opponent.maxHp,
    `partyIndex=${turn3Switch.battlers.opponent.partyIndex}, hp=${turn3Switch.battlers.opponent.hp}/${turn3Switch.battlers.opponent.maxHp}`,
  );

  // --- Turn 3: the LAST mon on the opponent's side faints -> terminal WIN,
  // not another switch-in. This is the scenario's headline finding. ---
  check("SUNKERN #3 (the opponent's LAST party member) also faints", terminal.battlers.opponent.hp === 0, `hp=${terminal.battlers.opponent.hp}`);
  check(
    "the LAST mon fainting flips battleOutcome to a terminal WIN (B_OUTCOME_WON), not a next-mon prompt",
    terminal.battleOutcome === 1,
    `battleOutcome=${terminal.battleOutcome} (expected 1 == B_OUTCOME_WON)`,
  );
  check(
    "opponent partyIndex stays at 2 (no fourth switch-in exists -- checkteamslost short-circuits BattleScript_HandleFaintedMon straight to FaintedMonEnd, skipping the switch dance)",
    terminal.battlers.opponent.partyIndex === 2,
    `partyIndex=${terminal.battlers.opponent.partyIndex}`,
  );
}

async function verifyCritScenario(): Promise<void> {
  console.log("\n=== Crit scenario: mechanic-hit-chain-crit-off.json (KADABRA Tackle -> CRITS on MAGNETON, seed 5) ===");
  const path = "tools/battle-lab/mechanic-hit-chain-crit-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(600)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(600)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 600 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const p0 = before1.battlers.player;
  const o0 = before1.battlers.opponent;
  const p1 = after1.battlers.player;
  const o1 = after1.battlers.opponent;
  console.log(`  player  (species ${p0.species}): HP ${p0.hp} -> ${p1.hp}, PP[0] ${p0.pp[0]} -> ${p1.pp[0]}`);
  console.log(`  opponent(species ${o0.species}): HP ${o0.hp} -> ${o1.hp}, PP ${JSON.stringify(o0.pp)} -> ${JSON.stringify(o1.pp)}`);

  const playerRolls = deriveHitRolls(before1.rngValue);
  const opponentRolls = deriveHitRolls(playerRolls.rngAfter);
  console.log("  RNG roll stream (attributed):");
  printRolls([...playerRolls.rolls, ...opponentRolls.rolls]);

  // sCriticalHitChance (battle_script_commands.c:606) = {16, 8, 4, 3, 2}; a
  // healthy attacker with no Focus Energy/high-crit move/Scope Lens/species
  // item is always critChance stage 0, i.e. a a flat 1-in-16 chance
  // (!(Random() % 16)). CRITICAL_HIT_CHANCE_ONE_IN[0] below is that same
  // constant, read-only-imported from damageCalc.ts.
  check(
    "critChanceStage 0 denominator is 16 (sCriticalHitChance[0], battle_script_commands.c:606)",
    CRITICAL_HIT_CHANCE_ONE_IN[0] === 16,
    `CRITICAL_HIT_CHANCE_ONE_IN[0]=${CRITICAL_HIT_CHANCE_ONE_IN[0]}`,
  );
  check(
    "seed 5's player-side critcalc roll IS a critical hit (u16 % 16 === 0)",
    rollIsCriticalHit(getCriticalHitChanceStage({}), playerRolls.rolls[1]!.value),
    `critRoll=${playerRolls.rolls[1]!.value}, ${playerRolls.rolls[1]!.value} % 16 = ${playerRolls.rolls[1]!.value % 16}`,
  );

  const playerDamage = o0.hp - o1.hp;
  const critResult = computeDamage({
    attackerStats: p0,
    defenderStats: o0,
    moveId: 33,
    critRoll: playerRolls.rolls[1]!.value,
    dmgRandRoll: playerRolls.rolls[2]!.value,
  });
  console.log(
    `    player Tackle (CRIT): base=${critResult.base} crit-doubled=${critResult.isCriticalHit ? critResult.base * 2 : critResult.base} ` +
      `typeMul=${critResult.multiplierTenths}/10 -> ${critResult.typed} rand->${critResult.final} observed=${playerDamage}`,
  );
  check(
    "crit damage matches damageCalc.ts + manual x2 crit-multiplier applied before typecalc (Cmd_damagecalc, battle_script_commands.c:1290)",
    critResult.final === playerDamage,
    `computed ${critResult.final} (with x2 crit step), ROM dealt ${playerDamage}`,
  );

  // The opponent's own counter-hit this same turn is a plain, non-crit hit --
  // reuses the sibling script's exact (no-crit) arithmetic as a control.
  const opponentDamage = p0.hp - p1.hp;
  const opponentResult = computeDamage({
    attackerStats: o0,
    defenderStats: p0,
    moveId: 33,
    critRoll: opponentRolls.rolls[1]!.value,
    dmgRandRoll: opponentRolls.rolls[2]!.value,
  });
  check(
    "opponent's own Tackle this turn is a plain non-crit hit (control) and matches damageCalc.ts with no x2 step",
    !opponentResult.isCriticalHit && opponentResult.final === opponentDamage,
    `crit=${opponentResult.isCriticalHit}, computed ${opponentResult.final}, ROM dealt ${opponentDamage}`,
  );

  const gap = stepsToReach(opponentRolls.rngAfter, after1.rngValue, 250);
  check(
    "8-roll hit-chain (4 player + 4 opponent) is a genuine prefix of the frame-600 rngValue",
    gap !== null,
    `could not reach frame-600 rngValue ${after1.rngValue} from post-chain value ${opponentRolls.rngAfter} within 250 steps`,
  );
  if (gap !== null) {
    console.log(`    (+${gap} further Random() calls after both hit chains resolve -- next-turn AI move-selection scoring, out of scope, same as the sibling script's non-crit scenario)`);
  }

  check("player PP[0] decremented by exactly 1", p0.pp[0]! - p1.pp[0]! === 1, `${p0.pp[0]} -> ${p1.pp[0]}`);
  const oppSlot = ppUsedSlot(o0.pp, o1.pp);
  check("opponent used exactly one move slot", oppSlot !== -1 && o0.pp[oppSlot]! - o1.pp[oppSlot]! === 1, `pp ${JSON.stringify(o0.pp)} -> ${JSON.stringify(o1.pp)}`);
}

async function main(): Promise<void> {
  await verifyKoScenario();
  await verifyCritScenario();

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
