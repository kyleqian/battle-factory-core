/**
 * Prep-scout proof-of-events for the presentation-seam retirement path
 * (ISSUES #39/#41, `docs/presentation-seam-scout.md` §8): mirrors
 * `turn5FaintPresentationStaging.ts`'s pattern -- stage a real hit chain
 * through the registered kernel opcodes and capture its own semantic event
 * stream -- but for the NEXT window (`turn1-rockslide.json`,
 * `drawRockSlideWindow`/`drawRockSlideAttack`, `battleScene.ts:11771-11836`)
 * instead of the already-landed fainted window.
 *
 * **UNWIRED.** This module is not imported by `battleScene.ts` or any other
 * production file -- it exists only to pin the event inventory this window's
 * eventual conversion will need (§8's own acceptance bar), per this scout
 * step's explicit "no production edits, no window conversion" brief. Wiring
 * it into `battleScene.ts` is the main-lane consuming worker's job.
 *
 * Ground truth, not fabricated: species/stats are Onix's and Grovyle's real
 * level-50 battle stats (`tests/damageCalc.test.ts`'s own RAM-pinned
 * `ONIX`/`GROVYLE` blocks, matching `turn5FaintPresentationStaging.ts`'s own
 * copies). Grovyle's HP (143) is turn 1's own real pre-hit value
 * (`anchorOpponentBattler.hp`, `battleScene.ts:940-942`, sourced from
 * `battle1-turn1-ram-dump.json`'s `before_turn.battler1.hp`) -- high enough
 * that a real ROCK_SLIDE hit does not faint Grovyle, matching the real
 * turn 1 window (settles at 101, not 0). The move IS the real
 * MOVE_ROCK_SLIDE (id 157) this time, not a substituted move: PROGRESS #442's
 * `ppreduce` Pressure fix retired the barrier that forced
 * `turn5FaintPresentationStaging.ts` to substitute MOVE_STRENGTH
 * (`tests/battleScriptHitChainOpcode.test.ts`'s own "RUNG 1 leverage: ROCK_SLIDE
 * ... now walks the full hit chain" test, :2050-2125, proves this in singles
 * with no Pressure on either battler -- the same shape reused here). The RNG
 * seed (919694434) is reused from `turn5FaintPresentationStaging.ts`'s own
 * committed KO fixture: its first draw (accuracycheck) is 56317 % 100 = 17,
 * which clears ROCK_SLIDE's 90% accuracy (as it did MOVE_STRENGTH's 100%) --
 * a genuine source-computed hit, not a forced one. `moveEffectByte: 0` (the
 * rules-context default) keeps `seteffectwithchance` on its deterministic
 * "no secondary effect" path (`battleScriptHitChainOpcode.ts`'s own
 * `rolledSuccess && rulesContext.moveEffectByte !== 0` guard) regardless of
 * its RNG roll, so this staged run never reaches `applySetMoveEffect`'s
 * flinch-family `unsupported-branch` (EFFECT_FLINCH_HIT's own MOVE_EFFECT_
 * FLINCH=8 is not in `STAT_MOVE_EFFECT_TABLE`) -- deliberately, so this
 * Tier-1 test cannot move the ratchet's barrier-count pins.
 */
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import { loadBattleScriptProgram } from "./battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "./battleScriptMachine.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import type { BattleScriptSemanticEvent } from "./battleScriptEvents.ts";

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
/** src/data/gen/moves.json MOVE_ROCK_SLIDE -- the real move this window uses, not a substitute. */
const MOVE_ROCK_SLIDE = 157;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching turn5FaintPresentationStaging.ts. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** Reused from turn5FaintPresentationStaging.ts's own committed KO fixture seed -- see module doc. */
const STAGED_RNG_SEED = 919694434;
/** anchorOpponentBattler.hp (battleScene.ts:940-942, battle1-turn1-ram-dump.json's before_turn.battler1.hp) -- turn 1's own real pre-hit Grovyle HP. */
const GROVYLE_PRE_HIT_HP = 143;

function battler(changes: Partial<BattleScriptRulesBattler>): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: 0,
    hp: changes.hp ?? 0,
    moves: changes.moves ?? Object.freeze([0, 0, 0, 0] as const),
    pp: changes.pp ?? Object.freeze([0, 0, 0, 0] as const),
    status1: 0,
    status2: 0,
    status3: 0,
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    item: 0,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 0,
    attack: changes.attack ?? 0,
    defense: changes.defense ?? 0,
    spAttack: changes.spAttack ?? 0,
    spDefense: changes.spDefense ?? 0,
    level: changes.level ?? 50,
    friendship: 0,
    partyIndex: 0,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({ kind: "message" as const, messageId: operand.expression, substitutions: Object.freeze([]) })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: () => null,
    resolveByteOperand: () => null,
  });
}

export type Turn1RockSlideHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Grovyle HP -- confirms the survive-not-faint shape this window's own real turn 1 has (143 -> 101, never 0). */
  targetHpAfter: number;
}>;

/**
 * Runs the ONIX ROCK_SLIDE -> GROVYLE hit chain (143 HP, non-lethal, real
 * move/real stats) from `BattleScript_HitFromAtkCanceler` to the script's own
 * `end`, returning every semantic event the registered opcodes emitted along
 * the way. Same "kernel runs at staging time; presentation reads the event
 * list" architecture `turn5FaintPresentationStaging.ts` established. Pure:
 * no shared/global state, no RNG or rules mutation outside this call's own
 * local machine instance.
 */
export function stageTurn1RockSlideHitChain(): Turn1RockSlideHitChainResult {
  const onix = battler({
    side: 0,
    hp: 143,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [MOVE_ROCK_SLIDE, 0, 0, 0],
    pp: [10, 0, 0, 0],
  });
  const grovyle = battler({
    side: 1,
    hp: GROVYLE_PRE_HIT_HP,
    species: SPECIES_GROVYLE,
    attack: 103,
    defense: 56,
    spAttack: 91,
    spDefense: 71,
    types: ["TYPE_GRASS", "TYPE_GRASS"],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, grovyle, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_ROCK_SLIDE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });

  const ports = externalPorts();
  const execution = createBattleScriptStatusRulesExecution(PROGRAM, ENTRY_LABEL, rulesContext, STAGED_RNG_SEED, ports);
  let state = execution.state;
  for (let budget = 0; budget < 512; budget += 1) {
    const stepped = stepBattleScriptMachine(PROGRAM, state, execution.handlers);
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      return {
        events: stepped.state.events,
        targetHpAfter: stepped.state.rulesContext.battlers[1].hp,
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn1RockSlidePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn1RockSlidePresentationStaging: staged ROCK_SLIDE hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn1RockSlidePresentationStaging: staged hit chain did not reach its own script end in budget");
}

function acknowledgePendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}
