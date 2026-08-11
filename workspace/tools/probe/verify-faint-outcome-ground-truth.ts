// S10 step (iv) PREP probe: faint-to-terminal-outcome ground truth. Banks the
// exact executable path from Cmd_tryfaintmon's faint branch to gBattleOutcome
// becoming B_OUTCOME_WON (1), for whoever registers checkteamslost / wires
// step (iv). Sibling to tools/probe/verify-hit-chain-edges.ts -- reruns the
// SAME already-committed KO scenario (tools/battle-lab/mechanic-hit-chain-ko-off.json,
// URSARING one-shots three SUNKERN) against the live oracle, since that
// scenario already runs past every KO to the real battle-end boundary
// (frame 1650, battleOutcome 0 -> 1) -- no new fixture needed.
//
// This script adds the finer RNG-window attribution the previous round
// (docs/hit-chain-ground-truth.md's "Edge cases" section) explicitly left
// undone: whether the faint-processing machinery (BattleScript_FaintTarget's
// playfaintcry/pause/dofaintanimation/cleareffectsonfaint, Cmd_moveend,
// Cmd_getexp, Cmd_checkteamslost, and the full switch-in send-out script)
// consumes any Random() calls of its own, or whether the unattributed
// 10-roll block between one kill and the next is entirely accounted for by
// the next attack's own 4-roll hit chain plus the opponent AI's move
// re-scoring pass.
//
// Run: node --experimental-strip-types tools/probe/verify-faint-outcome-ground-truth.ts
// (also runnable via `npx tsx`; no project code depends on this file).

import { readFileSync } from "node:fs";
import { oracleUrlForProfile } from "../compare/oracleProfiles.ts";
import {
  calculateBaseDamage,
  applyStab,
  applyTypeEffectiveness,
  applyRandomDamageMultiplier,
  rollIsCriticalHit,
  getCriticalHitChanceStage,
  NEUTRAL_STAT_STAGES,
  type TypeEffectivenessEntry,
} from "../../src/engine/damageCalc.ts";
import typeEffectivenessData from "../../src/data/gen/type-effectiveness.json" with { type: "json" };

const typeEffectivenessTable = typeEffectivenessData.typeEffectiveness as TypeEffectivenessEntry[];

// include/constants/pokemon.h:6-23 (TYPE_NORMAL=0). MOVE_STRENGTH is pure NORMAL.
const TYPE_NORMAL = "TYPE_NORMAL";

interface BattlerState {
  species: number;
  partyIndex: number;
  stats: { attack: number; defense: number; speed: number; spAttack: number; spDefense: number };
  types: number[];
  pp: number[];
  hp: number;
  maxHp: number;
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

function advance(start: number, steps: number): number {
  let value = start;
  for (let i = 0; i < steps; i++) value = rngStep(value);
  return value;
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

/**
 * BattleScript_EffectHit's hit branch, one attacker: accuracycheck,
 * critcalc, adjustnormaldamage (ApplyRandomDmgMultiplier), seteffectwithchance
 * -- always exactly these 4 Random() calls in this order (docs/hit-chain-ground-truth.md).
 */
function deriveHitRolls(rngBefore: number): { rolls: number[]; rngAfter: number } {
  let rng = rngBefore;
  const rolls: number[] = [];
  for (let i = 0; i < 4; i++) {
    const r = rngRoll(rng);
    rng = r.next;
    rolls.push(r.u16);
  }
  return { rolls, rngAfter: rng };
}

async function main(): Promise<void> {
  console.log("=== Faint-to-terminal-outcome ground truth: mechanic-hit-chain-ko-off.json ===");
  const path = "tools/battle-lab/mechanic-hit-chain-ko-off.json";
  const run1 = await runScenario(path);
  const run2 = await runScenario(path);

  const F_START = 0;
  const F_TURN1_KO = 260;
  const F_TURN2_SWITCH = 510;
  const F_TURN2_KO = 860;
  const F_TURN3_SWITCH = 1110;
  const F_TERMINAL = 1650;

  check(
    "determinism: frame 0 identical across reruns",
    deepEqualCapture(run1.get(F_START)!, run2.get(F_START)!),
    "initial state differs between runs",
  );
  check(
    "determinism: terminal frame identical across reruns",
    deepEqualCapture(run1.get(F_TERMINAL)!, run2.get(F_TERMINAL)!),
    "post-battle state differs between runs",
  );

  const turn1Ko = run1.get(F_TURN1_KO)!;
  const turn2Switch = run1.get(F_TURN2_SWITCH)!;
  const turn2Ko = run1.get(F_TURN2_KO)!;
  const turn3Switch = run1.get(F_TURN3_SWITCH)!;
  const terminal = run1.get(F_TERMINAL)!;

  // --- Claim 1: gBattleOutcome's exact transition, at the frames already
  // pinned by docs/hit-chain-ground-truth.md's KO table. ---
  check("turn 1 kill: battleOutcome still 0 (non-terminal, 2 SUNKERN remain)", turn1Ko.battleOutcome === 0, `battleOutcome=${turn1Ko.battleOutcome}`);
  check("turn 2 kill: battleOutcome still 0 (non-terminal, 1 SUNKERN remains)", turn2Ko.battleOutcome === 0, `battleOutcome=${turn2Ko.battleOutcome}`);
  check(
    "turn 3 kill (LAST opponent party member): battleOutcome flips to 1 == B_OUTCOME_WON (include/constants/battle.h:100)",
    terminal.battleOutcome === 1,
    `battleOutcome=${terminal.battleOutcome}`,
  );

  // --- Claim 2: the entire switch-in send-out script
  // (BattleScript_FaintedMonSendOutNew, data/battle_scripts_1.s:2883-2897 --
  // drawpartystatussummary/getswitchedmondata/switchindataupdate/hpthresholds/
  // printstring/hidepartystatussummary/switchinanim/waitstate/resetplayerfainted/
  // switchineffects/cancelallactions/end2) consumes ZERO Random() calls for
  // this matchup (no battler has an ability -- both sides overridden to
  // ability 0 -- so switchineffects's AbilityBattleEffects call is a no-op
  // here; this is scenario-scoped, not a universal claim about switchineffects). ---
  check(
    "switch-in dance after turn 1's kill draws ZERO Random() calls (rngValue unchanged 260 -> 510)",
    turn1Ko.rngValue === turn2Switch.rngValue,
    `rngValue ${turn1Ko.rngValue} -> ${turn2Switch.rngValue}`,
  );
  check(
    "switch-in dance after turn 2's kill draws ZERO Random() calls (rngValue unchanged 860 -> 1110)",
    turn2Ko.rngValue === turn3Switch.rngValue,
    `rngValue ${turn2Ko.rngValue} -> ${turn3Switch.rngValue}`,
  );

  // --- Claim 3: Cmd_moveend (battle_script_commands.c:4210-4498),
  // Cmd_getexp (:3255-3529, short-circuits to its last case for
  // BATTLE_TYPE_FRONTIER regardless of side -- :3270-3280), and
  // Cmd_checkteamslost (:3534-3619) each contain zero `Random(` call sites
  // (grepped directly, not inferred) -- so every Random() call in the
  // 10-call block between one kill and the next is either the opponent
  // Factory AI's move re-scoring pass for the newly active battler, or the
  // NEXT attack's own 4-roll hit chain (accuracycheck/critcalc/
  // adjustnormaldamage/seteffectwithchance) -- never the faint/outcome
  // machinery itself. Verified two ways: (a) the aggregate gap is always
  // exactly 10; (b) stepping 6 (unattributed AI-scoring rolls) then
  // deriving the standard 4-roll hit chain from THAT point lands exactly on
  // the next kill's captured rngValue, and the resulting damage roll
  // independently overkills the next SUNKERN's HP -- so those last 4 of the
  // 10 are positively a real hit chain, not a coincidental LCG landing. ---
  const gap1 = stepsToReach(turn2Switch.rngValue, turn2Ko.rngValue, 40);
  check(
    "post-switch-1 -> turn 2 kill is exactly 10 Random() calls (6 AI re-score + 4 hit chain)",
    gap1 === 10,
    `expected 10, forward-search found ${gap1 === null ? "no match within 40 steps" : gap1}`,
  );
  const gap2 = stepsToReach(turn3Switch.rngValue, terminal.rngValue, 40);
  check(
    "post-switch-2 -> turn 3 (terminal) kill is exactly 10 Random() calls (6 AI re-score + 4 hit chain)",
    gap2 === 10,
    `expected 10, forward-search found ${gap2 === null ? "no match within 40 steps" : gap2}`,
  );

  const preHit2 = advance(turn2Switch.rngValue, 6);
  const hit2 = deriveHitRolls(preHit2);
  check(
    "turn 2's own 4-roll hit chain is positively the LAST 4 of the 10-call block (forward-derived from +6 lands exactly on turn2Ko.rngValue)",
    hit2.rngAfter === turn2Ko.rngValue,
    `derived ${hit2.rngAfter}, observed ${turn2Ko.rngValue}`,
  );
  const damage2 = computeStrengthDamage(hit2.rolls[1]!, hit2.rolls[2]!);
  check(
    "turn 2's independently-derived damage roll overkills SUNKERN #2's 90 HP (cross-check beyond LCG arithmetic alone)",
    damage2.final >= 90,
    `computed final damage ${damage2.final}`,
  );

  const preHit3 = advance(turn3Switch.rngValue, 6);
  const hit3 = deriveHitRolls(preHit3);
  check(
    "turn 3's (terminal) own 4-roll hit chain is positively the LAST 4 of the 10-call block",
    hit3.rngAfter === terminal.rngValue,
    `derived ${hit3.rngAfter}, observed ${terminal.rngValue}`,
  );
  const damage3 = computeStrengthDamage(hit3.rolls[1]!, hit3.rolls[2]!);
  check(
    "turn 3's independently-derived damage roll overkills SUNKERN #3's 90 HP",
    damage3.final >= 90,
    `computed final damage ${damage3.final}`,
  );

  // --- Claim 4: checkteamslost reads PARTY-WIDE HP (gPlayerParty/
  // gEnemyParty, all PARTY_SIZE=6 slots -- battle_script_commands.c:3554-3575),
  // not just the active battler's gBattleMons HP. This scenario's opponent
  // roster is exactly the 3 SUNKERN that get killed one at a time (2 filler
  // BULBASAUR on the PLAYER's bench are never sent out and never touch
  // gEnemyParty), so if checkteamslost only summed the ACTIVE battler's HP,
  // the outcome would flip to WON on turn 1's kill already (active mon HP
  // hits 0 every time) -- it does not (turn1Ko/turn2Ko both show
  // battleOutcome still 0 with the active mon's HP at 0), and only flips
  // once the LAST of the three roster slots is the one at 0. That is only
  // consistent with a real party-wide sum, matching the source read. ---
  check("turn 1: active opponent HP is 0 but battleOutcome has NOT flipped (rules out active-HP-only)", turn1Ko.battlers.opponent.hp === 0 && turn1Ko.battleOutcome === 0, `hp=${turn1Ko.battlers.opponent.hp} outcome=${turn1Ko.battleOutcome}`);
  check("turn 2: active opponent HP is 0 but battleOutcome has NOT flipped (rules out active-HP-only)", turn2Ko.battlers.opponent.hp === 0 && turn2Ko.battleOutcome === 0, `hp=${turn2Ko.battlers.opponent.hp} outcome=${turn2Ko.battleOutcome}`);
  check("turn 3: active opponent HP is 0 AND it is the last (partyIndex 2) roster slot AND battleOutcome flips", terminal.battlers.opponent.hp === 0 && terminal.battlers.opponent.partyIndex === 2 && terminal.battleOutcome === 1, `hp=${terminal.battlers.opponent.hp} partyIndex=${terminal.battlers.opponent.partyIndex} outcome=${terminal.battleOutcome}`);

  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exitCode = failures === 0 ? 0 : 1;
}

/**
 * MOVE_STRENGTH (id 70, EFFECT_HIT, power 80, accuracy 100, type NORMAL --
 * data/battle_moves.h:720-731). URSARING (200 Atk, NORMAL/NORMAL) vs SUNKERN
 * (50 Def, GRASS/GRASS) -- same matchup/stats as the scenario's turn-1
 * derivation in docs/hit-chain-ground-truth.md, reused here for turns 2/3.
 */
function computeStrengthDamage(critRoll: number, dmgRandRoll: number) {
  const attacker = { attack: 200, defense: 100, spAttack: 100, spDefense: 100, level: 50, types: [TYPE_NORMAL, TYPE_NORMAL] as [string, string], statStages: NEUTRAL_STAT_STAGES };
  const defender = { attack: 50, defense: 50, spAttack: 50, spDefense: 50, level: 50, types: ["TYPE_GRASS", "TYPE_GRASS"] as [string, string], statStages: NEUTRAL_STAT_STAGES };
  const critChanceStage = getCriticalHitChanceStage({});
  const isCriticalHit = rollIsCriticalHit(critChanceStage, critRoll);
  const base = calculateBaseDamage({ attacker, defender, movePower: 80, moveType: TYPE_NORMAL, isCriticalHit });
  const critDoubled = isCriticalHit ? base * 2 : base;
  const stabbed = applyStab(critDoubled, [TYPE_NORMAL, TYPE_NORMAL], TYPE_NORMAL);
  const { damage: typed } = applyTypeEffectiveness(stabbed, TYPE_NORMAL, ["TYPE_GRASS", "TYPE_GRASS"], typeEffectivenessTable);
  const final = applyRandomDamageMultiplier(typed, dmgRandRoll);
  return { base, stabbed, typed, final, isCriticalHit };
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
