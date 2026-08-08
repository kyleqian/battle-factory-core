/**
 * Presentation-seam retirement, the turn-4 settle staging gap named as the
 * one residual item of `docs/presentation-seam-scout.md` §9 (entries
 * 465/468/487): the post-turn-4 HP previously had no staged proof -- it was a
 * bare literal (`1`) whose only paper trail was an uncommitted probe run's
 * doc comment. This module gives it one, mirroring
 * `turn1RockSlidePresentationStaging.ts`'s own pattern verbatim: stage a real
 * hit chain through the registered kernel opcodes and capture its own
 * semantic event stream via `presentationEventWindowBridge.ts`'s existing
 * `resolveRockSlidePresentationWindowContent` bridge (built for window 2,
 * keyed only on `sourceLabel`, generalizes here unchanged -- zero bridge
 * edits needed, same finding §9.2 already made for the ENDEAVOR direction).
 *
 * Ground truth, not fabricated: species/stats are Onix's and Grovyle's real
 * level-50 battle stats (`tests/damageCalc.test.ts`'s own RAM-pinned
 * `ONIX`/`GROVYLE` blocks, matching every sibling module's own copies).
 * Grovyle's pre-hit HP (41) is turn 4's own real value -- `battleScene.ts`'s
 * own already-committed `anchorOpponentAfterTurn3Hp` constant, itself sourced
 * from `battle1-grovyle-faint-ram-dump.json`'s `battlerSnapshots["4892"]
 * .battler1.hp` (turn 3's end/turn 4's reopen boundary). The move IS the real
 * MOVE_ROCK_SLIDE (id 157), Onix attacking Grovyle, same direction as window
 * 2's own turn-1 chain.
 *
 * **The RNG seed (3051035979) is turn 4's own real recorded value, not a
 * borrowed or found-to-work one.** It is NOT a fresh asset import: it is
 * derived from the SAME already-committed/already-imported
 * `battle1-grovyle-faint-ram-dump.json` this file's own sibling constants
 * (`anchorPlayerAfterTurn3Hp`/`anchorOpponentAfterTurn3Hp`, `battleScene.ts`)
 * already read -- specifically its `rngLedger`'s own four single-step entries
 * at ticks 5316/5340/5343/5569 (`fromValue`s 3051035979/3829052258/
 * 2943524141/2642346652, each `steps:1`), which independently corroborate
 * `battleScene.ts`'s own already-committed `drawTurn4KickoffText` doc comment
 * ("accuracy roll 4925+391=5316, crit roll 4925+415=5340, damage-lock
 * 4925+418=5343" -- `TURN4_CONFIRM_PRESS_TICK`-relative, bit-exact against a
 * fresh oracle probe) -- so the settle was ALREADY evidenced in a committed
 * asset this whole time, just never wired to
 * a staged run. Verified live this session (not guessed): staging this exact
 * seed from `BattleScript_HitFromAtkCanceler` consumes exactly 4 RNG calls
 * (accuracycheck roll 58426 -> hits, 90% base vs neutral-evasion replica;
 * critcalc roll 44914 -> no crit; adjustnormaldamage roll 40319 -> 40319%16=15,
 * the 85%-floor spread roll; seteffectwithchance roll 25224, inert since
 * `moveEffectByte:0` keeps ROCK_SLIDE's flinch chance off this deterministic
 * path, same as every sibling module), ending at rngValue 1653081311 --
 * byte-identical to the ledger's own 4th entry's `toValue` (tick 5569) -- and
 * computes Grovyle's HP as 41 -> 1, byte-identical to the `"4892"`/`"5926"`
 * snapshot pair's own `battler1.hp` fields (41 and 1 respectively) and to
 * the former post-turn-4 literal. `moveEffectByte: 0` keeps
 * `seteffectwithchance` on its deterministic "no secondary effect" path
 * regardless of its own roll, matching `turn1RockSlidePresentationStaging
 * .ts`'s own documented reasoning verbatim -- this staged run never reaches
 * `applySetMoveEffect`'s flinch-family `unsupported-branch`, deliberately, so
 * this Tier-1 test cannot move the ratchet's barrier-count pins. Grovyle's
 * own evasion boost from repeated DOUBLE_TEAM use (turns 1 and 4) is NOT
 * modeled here (this chain's own `statStages` are all neutral, same
 * simplification `turn1RockSlidePresentationStaging.ts` already makes for
 * turn 1's own single Double Team) -- harmless for this proof's own purpose,
 * since the real recorded roll (26% effective, `58426 % 100`) clears BOTH
 * the neutral-evasion replica's 90% threshold AND the real, lower,
 * evasion-adjusted one (the move genuinely did hit in the real recorded run).
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
/** battle1-grovyle-faint-ram-dump.json's own rngLedger -- turn 4's own real recorded RNG seed, see module doc. */
const STAGED_RNG_SEED = 3051035979;
/** battle1-grovyle-faint-ram-dump.json's battlerSnapshots["4892"].battler1.hp -- turn 4's own real pre-hit Grovyle HP (battleScene.ts's own anchorOpponentAfterTurn3Hp). */
const GROVYLE_PRE_HIT_HP = 41;

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

export type Turn4RockSlideHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Grovyle HP -- confirms the survive-not-faint shape this window's own real turn 4 has (41 -> 1, never 0). */
  targetHpAfter: number;
}>;

/**
 * Runs the ONIX ROCK_SLIDE -> GROVYLE hit chain (41 HP, non-lethal, real
 * move/real stats) from `BattleScript_HitFromAtkCanceler` to the script's own
 * `end`, returning every semantic event the registered opcodes emitted along
 * the way. Same "kernel runs at staging time; presentation reads the event
 * list" architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn4RockSlideHitChain(): Turn4RockSlideHitChainResult {
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
        throw new Error("turn4RockSlidePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn4RockSlidePresentationStaging: staged ROCK_SLIDE hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn4RockSlidePresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * The PC-to-window bridge (docs/presentation-seam-scout.md §8.3/§9.2)
 * applied to this staged run: extracts the ROCK_SLIDE attack's own message +
 * HP-drain content purely from provenance, never a turn number.
 */
export function resolveTurn4RockSlideWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn4RockSlideHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn4RockSlidePresentationStaging: staged hit chain did not produce the ROCK_SLIDE window's own event pair");
  }
  return content;
}

/**
 * Grovyle's real turn-4 pre-hit/post-hit HP (41 -> 1) -- the endpoint
 * previously had no staged proof. Message content is intentionally NOT
 * re-resolved here:
 * `docs/presentation-seam-scout.md` §9.3/§9.4 step 4 already established this
 * window's own "ONIX used\nROCK SLIDE!" text is byte-identical to window 2's
 * own already-resolved `TURN1_ROCKSLIDE_ATTACK_LINE1/2`
 * (`turn1RockSlidePresentationStaging.ts`) -- reused directly by
 * `battleScene.ts`'s consumers instead of re-deriving a third copy.
 */
export function resolveTurn4RockSlideHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn4RockSlideWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}
