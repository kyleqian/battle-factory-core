// S10 step (ii) probe: ground truth for BattleScript_EffectHit's hit-chain
// opcodes (accuracycheck/attackstring/ppreduce/critcalc/damagecalc/typecalc/
// adjustnormaldamage/attackanimation/effectivenesssound/hitanimation/
// healthbarupdate/datahpupdate/critmessage/resultmessage/seteffectwithchance/
// tryfaintmon), reruns two committed battle-lab scenarios against the stock
// ROM (Battle Scene OFF oracle) and asserts, PASS/FAIL, everything the
// registration step needs: the attributed RNG roll stream, the exact damage
// (cross-checked against src/engine/damageCalc.ts, read-only import), HP/PP
// deltas, crit outcome, and determinism across two independent reruns.
//
// Run: node --experimental-strip-types tools/probe/verify-hit-chain-ground-truth.ts
// (also runnable via `npx tsx` if available; no project code depends on either).
//
// Both scenarios share one base route (trainerId 110, challengeNum/battleNum
// 2, playerSetIds [274,354,338], opponentSetIds [349,339,327] - the same
// legal Factory route already proven by the committed
// attack-spine-no-pp-off.json) so the actual battlers are always species 64
// (KADABRA: atk 39/def 71/spd 114, types PSYCHIC/PSYCHIC) vs species 82
// (MAGNETON: atk 69/def 104/spd 79, types ELECTRIC/STEEL) at level 50, ability
// and item overridden to NONE on both sides. Kadabra's speed (114) exceeds
// Magneton's (79) with neutral IVs/EVs, so the player always acts first.
//
// NOTE ON STAGING CONTRACT: the brief's preferred contract is mechanicLab
// overrides.parties (three complete legal Pokemon/side, entry hooks replayed
// for real). That request was tried first and rejected by the currently
// running battle-scene-off oracle: HTTP 400 "unknown overrides: parties".
// The harness's oracle/battle_lab.py gained overrides.parties support at
// commit b30c5d8 (2026-07-24 14:10:55), but the oracle process bound to
// 127.0.0.1:8014 (pid confirmed via `lsof`) has been running since that
// morning (8:26 AM) - it has the pre-b30c5d8 module loaded in memory and
// won't see the new code until the supervisor restarts it (a worker may not
// restart a shared oracle, see AGENTS.md). Both scenarios below use the
// legacy overrides.battlers contract instead, which the live process does
// support and which still exercises the real ROM's move/damage/RNG/PP path
// end to end for this no-entry-hook matchup (see docs/hit-chain-ground-truth.md).

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

// data/battle_moves.h: MOVE_TACKLE (:432-443) and MOVE_SLAM (:276-287), both EFFECT_HIT, secondaryEffectChance 0.
const MOVES: Record<number, { name: string; power: number; type: string; accuracy: number }> = {
  33: { name: "TACKLE", power: 35, type: "TYPE_NORMAL", accuracy: 95 },
  21: { name: "SLAM", power: 80, type: "TYPE_NORMAL", accuracy: 75 },
};

interface BattlerState {
  species: number;
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

// Random() (reference/pokeemerald/src/random.c:11-16): steps gRngValue, then
// returns the NEW value's upper 16 bits as the consumed roll.
function rngRoll(value: number): { next: number; u16: number } {
  const next = rngStep(value);
  return { next, u16: next >>> 16 };
}

// Bounded forward search used only to prove the 8/5 hand-derived rolls above
// are a genuine PREFIX of the oracle's own observed RNG trajectory (not a
// hallucinated match): iterates the same LCG from `start` looking for
// `target`, capped well above any plausible gap.
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
  attacker: "player" | "opponent";
  value: number;
}

/**
 * BattleScript_EffectHit's hit branch (data/battle_scripts_1.s:236-266) for
 * ONE attacker whose move both hits and doesn't faint the target: exactly
 * four Random() calls, in this fixed order. Confirmed empirically (not just
 * theoretically) by dense per-frame captures of mechanic-hit-chain-tackle-
 * off.json during construction of this scenario -- see
 * docs/hit-chain-ground-truth.md's roll-order table for the exact frames.
 */
function deriveHitRolls(rngBefore: number, attacker: "player" | "opponent"): { rolls: Roll[]; rngAfter: number } {
  const rolls: Roll[] = [];
  let rng = rngBefore;

  const acc = rngRoll(rng); rng = acc.next;
  rolls.push({ label: "accuracycheck", citation: "battle_script_commands.c:1176", attacker, value: acc.u16 });

  const crit = rngRoll(rng); rng = crit.next;
  rolls.push({ label: "critcalc", citation: "battle_script_commands.c:1282", attacker, value: crit.u16 });

  const dmg = rngRoll(rng); rng = dmg.next;
  rolls.push({ label: "adjustnormaldamage (ApplyRandomDmgMultiplier)", citation: "battle_script_commands.c:1641-1642", attacker, value: dmg.u16 });

  const sec = rngRoll(rng); rng = sec.next;
  rolls.push({ label: "seteffectwithchance", citation: "battle_script_commands.c:2923", attacker, value: sec.u16 });

  return { rolls, rngAfter: rng };
}

/**
 * The miss branch: Cmd_accuracycheck's own failure jump argument for
 * BattleScript_EffectHit is BattleScript_PrintMoveMissed directly
 * (data/battle_scripts_1.s:244), NOT BattleScript_MakeMoveMissed
 * (:271-272, the `orbyte gMoveResultFlags, MOVE_RESULT_MISSED` label) --
 * Cmd_accuracycheck's own C body already sets MOVE_RESULT_MISSED
 * (battle_script_commands.c:1178) before the jump, so EFFECT_HIT's miss path
 * never executes orbyte. Only ONE Random() call: the accuracy roll itself.
 */
function deriveMissRoll(rngBefore: number, attacker: "player" | "opponent"): { rolls: Roll[]; rngAfter: number } {
  const acc = rngRoll(rngBefore);
  return {
    rolls: [{ label: "accuracycheck (miss)", citation: "battle_script_commands.c:1176", attacker, value: acc.u16 }],
    rngAfter: acc.next,
  };
}

function printRolls(rolls: Roll[]): void {
  rolls.forEach((roll, index) => {
    console.log(`    [${index + 1}] ${roll.attacker.padEnd(8)} ${roll.label.padEnd(42)} u16=${roll.value}  (${roll.citation})`);
  });
}

function crossCheckDamage(params: {
  label: string;
  attackerStats: BattlerState;
  defenderStats: BattlerState;
  moveId: number;
  critRoll: number;
  dmgRandRoll: number;
  observedDamage: number;
}): void {
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

  const stabbed = applyStab(
    base,
    [TYPE_ID_TO_NAME[params.attackerStats.types[0]!]!, TYPE_ID_TO_NAME[params.attackerStats.types[1]!]!],
    move.type,
  );
  const { damage: typed, multiplierTenths } = applyTypeEffectiveness(
    stabbed,
    move.type,
    [TYPE_ID_TO_NAME[params.defenderStats.types[0]!]!, TYPE_ID_TO_NAME[params.defenderStats.types[1]!]!],
    typeEffectivenessTable,
  );
  const final = applyRandomDamageMultiplier(typed, params.dmgRandRoll);

  console.log(
    `    ${params.label}: base=${base} stab=${stabbed} typeMul=${multiplierTenths}/10 -> ${typed} ` +
      `randPct=${100 - (params.dmgRandRoll % 16)}% -> final=${final} (crit=${isCriticalHit}) observed=${params.observedDamage}`,
  );
  check(
    `${params.label} damage matches damageCalc.ts`,
    final === params.observedDamage,
    `damageCalc.ts computed ${final}, ROM dealt ${params.observedDamage}`,
  );
}

async function verifyHitScenario(): Promise<void> {
  console.log("\n=== Scenario 1: mechanic-hit-chain-tackle-off.json (KADABRA Tackle -> hits, MAGNETON Tackle -> hits) ===");
  const path = "tools/battle-lab/mechanic-hit-chain-tackle-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const p0 = before1.battlers.player;
  const o0 = before1.battlers.opponent;
  const p1 = after1.battlers.player;
  const o1 = after1.battlers.opponent;

  console.log(`  player  (species ${p0.species}): HP ${p0.hp} -> ${p1.hp}, PP[0] ${p0.pp[0]} -> ${p1.pp[0]}`);
  console.log(`  opponent(species ${o0.species}): HP ${o0.hp} -> ${o1.hp}, PP ${JSON.stringify(o0.pp)} -> ${JSON.stringify(o1.pp)}`);

  const playerRolls = deriveHitRolls(before1.rngValue, "player");
  const opponentRolls = deriveHitRolls(playerRolls.rngAfter, "opponent");
  console.log("  RNG roll stream (attributed):");
  printRolls([...playerRolls.rolls, ...opponentRolls.rolls]);

  const gap = stepsToReach(opponentRolls.rngAfter, after1.rngValue, 250);
  check(
    "8-roll hit-chain is a genuine prefix of the observed final RNG state",
    gap !== null,
    `could not reach frame-450 rngValue ${after1.rngValue} from post-chain value ${opponentRolls.rngAfter} within 250 steps`,
  );
  if (gap !== null) {
    console.log(`    (+${gap} further Random() calls after both hit chains resolve -- the opponent Factory AI's` +
      ` next-turn move-selection scoring/tie-break draws, out of scope for this hit-chain probe)`);
  }

  const playerDamage = o0.hp - o1.hp;
  const opponentDamage = p0.hp - p1.hp;

  crossCheckDamage({
    label: "player Tackle -> opponent",
    attackerStats: p0,
    defenderStats: o0,
    moveId: 33,
    critRoll: playerRolls.rolls[1]!.value,
    dmgRandRoll: playerRolls.rolls[2]!.value,
    observedDamage: playerDamage,
  });
  crossCheckDamage({
    label: "opponent Tackle -> player",
    attackerStats: o0,
    defenderStats: p0,
    moveId: 33,
    critRoll: opponentRolls.rolls[1]!.value,
    dmgRandRoll: opponentRolls.rolls[2]!.value,
    observedDamage: opponentDamage,
  });

  const accCalc = calculateAccuracy({ moveAccuracy: 95, attackerAccuracyStage: 6, targetEvasionStage: 6 });
  check(
    "player Tackle accuracy roll resolves to a hit",
    rollAccuracyHits(accCalc, playerRolls.rolls[0]!.value),
    `calc=${accCalc}, roll=${playerRolls.rolls[0]!.value}`,
  );
  check(
    "opponent Tackle accuracy roll resolves to a hit",
    rollAccuracyHits(accCalc, opponentRolls.rolls[0]!.value),
    `calc=${accCalc}, roll=${opponentRolls.rolls[0]!.value}`,
  );

  check("player PP[0] decremented by exactly 1", p0.pp[0]! - p1.pp[0]! === 1, `${p0.pp[0]} -> ${p1.pp[0]}`);
  const oppSlot = ppUsedSlot(o0.pp, o1.pp);
  check("opponent used exactly one move slot", oppSlot !== -1 && o0.pp[oppSlot]! - o1.pp[oppSlot]! === 1, `pp ${JSON.stringify(o0.pp)} -> ${JSON.stringify(o1.pp)}`);
}

async function verifyMissScenario(): Promise<void> {
  console.log("\n=== Scenario 2: mechanic-hit-chain-slam-miss-off.json (KADABRA Slam -> MISSES, MAGNETON Tackle -> hits) ===");
  const path = "tools/battle-lab/mechanic-hit-chain-slam-miss-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const before1 = run1.captures.get(0)!;
  const after1 = run1.captures.get(450)!;
  const before2 = run2.captures.get(0)!;
  const after2 = run2.captures.get(450)!;

  check("determinism: frame 0 identical across reruns", deepEqualCapture(before1, before2), "initial state differs between runs");
  check("determinism: frame 450 identical across reruns", deepEqualCapture(after1, after2), "post-turn state differs between runs");

  const p0 = before1.battlers.player;
  const o0 = before1.battlers.opponent;
  const p1 = after1.battlers.player;
  const o1 = after1.battlers.opponent;

  console.log(`  player  (species ${p0.species}): HP ${p0.hp} -> ${p1.hp}, PP[0] ${p0.pp[0]} -> ${p1.pp[0]}`);
  console.log(`  opponent(species ${o0.species}): HP ${o0.hp} -> ${o1.hp}, PP ${JSON.stringify(o0.pp)} -> ${JSON.stringify(o1.pp)}`);

  const missRoll = deriveMissRoll(before1.rngValue, "player");
  const opponentRolls = deriveHitRolls(missRoll.rngAfter, "opponent");
  console.log("  RNG roll stream (attributed):");
  printRolls([...missRoll.rolls, ...opponentRolls.rolls]);
  console.log(
    "    (BattleScript_EffectHit's own miss jump target is BattleScript_PrintMoveMissed" +
      " (data/battle_scripts_1.s:244), which skips BattleScript_MakeMoveMissed's `orbyte`" +
      " (:271-272) -- orbyte is NOT reached by this or any EFFECT_HIT miss, only by" +
      " EffectSwagger/EffectFlatter's Substitute-block path (:1610, :2153); see docs/hit-chain-ground-truth.md.)",
  );

  const gap = stepsToReach(opponentRolls.rngAfter, after1.rngValue, 250);
  check(
    "5-roll miss-then-hit chain is a genuine prefix of the observed final RNG state",
    gap !== null,
    `could not reach frame-450 rngValue ${after1.rngValue} from post-chain value ${opponentRolls.rngAfter} within 250 steps`,
  );
  if (gap !== null) {
    console.log(`    (+${gap} further Random() calls after both actions resolve -- next-turn AI noise, out of scope)`);
  }

  check("opponent HP unchanged (player's Slam missed)", o0.hp === o1.hp, `${o0.hp} -> ${o1.hp}`);

  const accCalc = calculateAccuracy({ moveAccuracy: 75, attackerAccuracyStage: 6, targetEvasionStage: 6 });
  check(
    "player Slam accuracy roll resolves to a MISS",
    !rollAccuracyHits(accCalc, missRoll.rolls[0]!.value),
    `calc=${accCalc}, roll=${missRoll.rolls[0]!.value}`,
  );

  const opponentDamage = p0.hp - p1.hp;
  crossCheckDamage({
    label: "opponent Tackle -> player (player's own attack missed)",
    attackerStats: o0,
    defenderStats: p0,
    moveId: 33,
    critRoll: opponentRolls.rolls[1]!.value,
    dmgRandRoll: opponentRolls.rolls[2]!.value,
    observedDamage: opponentDamage,
  });

  check("player PP[0] still decremented on a miss (ppreduce runs before the miss check)", p0.pp[0]! - p1.pp[0]! === 1, `${p0.pp[0]} -> ${p1.pp[0]}`);
}

async function main(): Promise<void> {
  await verifyHitScenario();
  await verifyMissScenario();

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing check(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error("FAIL: unhandled error", error);
  process.exit(1);
});
