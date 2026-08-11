/**
 * Presentation-seam retirement, prep-scout window 4 (ISSUES #39/#41,
 * `docs/presentation-seam-scout.md` §10): mirrors
 * `turn4RockSlidePresentationStaging.ts`'s own pattern verbatim -- stage a
 * real hit chain through the registered kernel opcodes and capture its own
 * semantic event stream via `presentationEventWindowBridge.ts`'s existing
 * `resolveRockSlidePresentationWindowContent` bridge (built for window 2,
 * keyed only on `sourceLabel`, generalizes here unchanged -- zero bridge
 * edits needed, same finding §9.2 already made for the ENDEAVOR direction and
 * §9's own turn-4 module already made for a THIRD real ROCK_SLIDE instance).
 *
 * This closes the LAST unstaged link in Grovyle's own ROCK_SLIDE HP chain:
 * turn 1 (143->101, `turn1RockSlidePresentationStaging.ts`) and turn 4
 * (41->1, `turn4RockSlidePresentationStaging.ts`) already have staged proof;
 * turn 5's fatal hit (`turn5FaintPresentationStaging.ts`, ->0) also already
 * does. Turn 3 (88->41) was the one remaining gap between turn 1's settle and
 * turn 4's own pre-hit read -- once this module exists, every ROCK_SLIDE hit
 * in Grovyle's whole HP timeline (turns 1/3/4/5) has a staged kernel-event
 * proof, not just three of the four.
 *
 * Ground truth, not fabricated: species/stats are Onix's and Grovyle's real
 * level-50 battle stats (`tests/damageCalc.test.ts`'s own RAM-pinned
 * `ONIX`/`GROVYLE` blocks, matching every sibling module's own copies).
 * Grovyle's pre-hit HP (88) is turn 3's own real value --
 * `battleScene.ts`'s own already-committed `anchorOpponentAfterTurn2Hp`
 * constant, itself sourced from `battle1-turn2-ram-dump.json`'s
 * `battlerSnapshots.after_turn2.battler1.hp` (turn 2's own DRAGON_BREATH
 * settle -- Grovyle carries no chip damage between turns 2 and 3, matching
 * `battleScene.ts`'s own doc comment for that constant). The move IS the real
 * MOVE_ROCK_SLIDE (id 157), Onix attacking Grovyle, same direction as every
 * sibling module in this file family.
 *
 * **The RNG seed (3156327951) is turn 3's own real recorded value, not a
 * borrowed or found-to-work one.** It is NOT a fresh asset import: it is
 * read from the SAME already-committed/already-imported
 * `battle1-grovyle-faint-ram-dump.json` this file's own sibling module
 * (`turn4RockSlidePresentationStaging.ts`) already reads for turn 4's own
 * seed -- specifically its `rngLedger`'s own four single-step entries at
 * ticks 4078/4102/4105/4338 (`fromValue`s 3156327951/820043478/52983185/
 * 1798479152, `toValue`s 820043478/52983185/1798479152/3549556195), the
 * SAME four-roll shape (accuracycheck, +24 crit, +3 damage-lock, +233
 * seteffectwithchance) turn 1's and turn 4's own modules already establish,
 * immediately preceded by two smaller-gap entries at 3929/4064 that belong to
 * turn 3's own preceding ENDEAVOR half (`turn3-endeavor.json`,
 * accuracycheck + an inert seteffectwithchance -- EFFECT_ENDEAVOR's own
 * script has no critcalc/adjustnormaldamage call, matching this 2-vs-4 roll
 * split) and immediately followed by the next real gap before turn 4's own
 * ledger entries begin at tick 5316 (`TURN4_CONFIRM_PRESS_TICK`+391,
 * `turn4RockSlidePresentationStaging.ts`'s own seed). Verified live this
 * session (not guessed): staging this exact seed from
 * `BattleScript_HitFromAtkCanceler` consumes exactly 4 RNG calls and ends at
 * rngValue 3549556195 -- byte-identical to the ledger's own 4338-tick
 * entry's `toValue`, where the next real gap to turn 4's own ledger entries
 * begins -- and computes Grovyle's HP as 88 -> 41, byte-identical to
 * `battleScene.ts`'s own already-committed `anchorOpponentAfterTurn2Hp`/
 * `anchorOpponentAfterTurn3Hp` pair (88, 41) and to the "4892" snapshot's own
 * `battler1.hp` field turn 4's own sibling module already cross-checked.
 * `moveEffectByte: 0` keeps `seteffectwithchance` on its deterministic "no
 * secondary effect" path regardless of its own roll, matching every sibling
 * module's own documented reasoning verbatim -- this staged run never
 * reaches `applySetMoveEffect`'s flinch-family `unsupported-branch`,
 * deliberately, so this Tier-1 test cannot move the ratchet's barrier-count
 * pins. Grovyle's own evasion boost from repeated DOUBLE_TEAM use (turns 1
 * and 4) is NOT modeled here, same simplification every sibling module
 * already makes -- harmless for this proof's own purpose since the real
 * recorded roll is what this staged run reproduces regardless of the
 * (unmodeled) evasion stage.
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
import {
  resolveRockSlidePresentationWindowContent,
  type RockSlidePresentationWindowContent,
} from "./presentationEventWindowBridge.ts";

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
/** src/data/gen/moves.json MOVE_ROCK_SLIDE -- the real move this window uses, not a substitute. */
const MOVE_ROCK_SLIDE = 157;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling module. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** battle1-grovyle-faint-ram-dump.json's own rngLedger, tick-4078 entry's fromValue -- turn 3's own real recorded RNG seed, see module doc. */
const STAGED_RNG_SEED = 3156327951;
/** battleScene.ts's own anchorOpponentAfterTurn2Hp (battle1-turn2-ram-dump.json's after_turn2.battler1.hp) -- turn 3's own real pre-hit Grovyle HP. */
const GROVYLE_PRE_HIT_HP = 88;

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

export type Turn3RockSlideHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Grovyle HP -- confirms the survive-not-faint shape this window's own real turn 3 has (88 -> 41, never 0). */
  targetHpAfter: number;
}>;

/**
 * Runs the ONIX ROCK_SLIDE -> GROVYLE hit chain (88 HP, non-lethal, real
 * move/real stats) from `BattleScript_HitFromAtkCanceler` to the script's own
 * `end`, returning every semantic event the registered opcodes emitted along
 * the way. Same "kernel runs at staging time; presentation reads the event
 * list" architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn3RockSlideHitChain(): Turn3RockSlideHitChainResult {
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
        throw new Error("turn3RockSlidePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn3RockSlidePresentationStaging: staged ROCK_SLIDE hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn3RockSlidePresentationStaging: staged hit chain did not reach its own script end in budget");
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

/**
 * The PC-to-window bridge (docs/presentation-seam-scout.md §8.3/§9.2/§10.2)
 * applied to this staged run: extracts the ROCK_SLIDE attack's own message +
 * HP-drain content purely from provenance, never a turn number.
 */
export function resolveTurn3RockSlideWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn3RockSlideHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn3RockSlidePresentationStaging: staged hit chain did not produce the ROCK_SLIDE window's own event pair");
  }
  return content;
}

/**
 * Grovyle's real turn-3 pre-hit/post-hit HP (88 -> 41) -- the endpoint pair
 * `rockSlideOpponentHp(t, pressTick, anchorOpponentAfterTurn2Hp,
 * anchorOpponentAfterTurn3Hp)` (`battleScene.ts`) previously had no staged
 * proof for. Message content is intentionally NOT re-resolved here:
 * `docs/presentation-seam-scout.md` §9.3/§9.4 step 4 already established this
 * window's own "ONIX used\nROCK SLIDE!" text is byte-identical to window 2's
 * own already-resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2`
 * (`turn1RockSlidePresentationStaging.ts`) -- reused directly by a future
 * `battleScene.ts` consumer instead of re-deriving a fourth copy.
 */
export function resolveTurn3RockSlideHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn3RockSlideWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}
