/**
 * Presentation-seam prep-scout, window 3 (`docs/presentation-seam-scout.md`
 * §9): read-only recon module for `turn5-rockslide.json`
 * (`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s attack branch,
 * `battleScene.ts`). **Not wired into `battleScene.ts`** -- this is prep-
 * scout evidence for the follow-up main-lane wiring step, same status
 * `turn1RockSlidePresentationStaging.ts` had before its own wiring step
 * landed.
 *
 * This window's real content is Grovyle's ENDEAVOR (opponent attacks
 * player), not another ROCK_SLIDE. `EFFECT_ENDEAVOR` is `blocked-on-opcodes`
 * in the live census (`docs/executable-frontier-census.md` line 245,
 * regenerated this session): `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`,
 * `B_SCR_OP_BICBYTE`, `B_SCR_OP_ADJUSTSETDAMAGE` are not registered, so the
 * real `BattleScript_EffectEndeavor` (`reference/pokeemerald/data/
 * battle_scripts_1.s:2479-2491`) cannot be staged today. Per this session's
 * own brief, and the exact precedent `turn5FaintPresentationStaging.ts`
 * already set (substituting MOVE_STRENGTH for MOVE_ROCK_SLIDE when a
 * different opcode gap blocked the real move), this stages the nearest
 * executable equivalent instead: MOVE_STRENGTH (id 70, `EFFECT_HIT`, 100%
 * accuracy, `MOVE_TARGET_SELECTED`) with Grovyle as attacker (side 1) and
 * Onix as target (side 0) -- the OPPOSITE direction from both
 * `turn1RockSlidePresentationStaging.ts` and `turn5FaintPresentationStaging.ts`,
 * which only ever staged Onix (side 0) attacking Grovyle (side 1). `EFFECT_HIT`
 * falls straight into the same generic `BattleScript_HitFromAtkCanceler` ->
 * `BattleScript_HitFromAtkString`/`BattleScript_HitFromAtkAnimation` tail
 * ENDEAVOR's own script also `goto`s into after its
 * `setdamagetohealthdifference`/`bicbyte`/`adjustsetdamage` trio
 * (`battle_scripts_1.s:2479-2491`'s own last line, `goto
 * BattleScript_HitFromAtkAnimation`), so `presentationEventWindowBridge.ts`'s
 * existing `resolveRockSlidePresentationWindowContent` (built for window 2)
 * applies unchanged -- proving the message+hp-change mechanism generalizes to
 * an opponent-side attacker/player-side target pair for the first time this
 * session, not merely asserted by analogy.
 *
 * Ground truth, not fabricated, with one documented substitution (the move):
 * species/stats/types are Onix's and Grovyle's real level-50 battle stats,
 * matching every other staging module in this file family
 * (`tests/damageCalc.test.ts`'s own RAM-pinned `ONIX`/`GROVYLE` blocks).
 * Both HP values are this window's own real anchors, not placeholders:
 * Onix (target) starts at 88 -- `battleScene.ts`'s `anchorPlayerAfterTurn3Hp`
 * (`battle1-grovyle-faint-ram-dump.json`'s `battlerSnapshots["4892"]
 * .battler0.hp`), the real turn-3-settled value this window's own ENDEAVOR
 * drain starts from. Grovyle (attacker) is at 1 HP -- `battleScene.ts`'s
 * `anchorOpponentAfterTurn4Hp` (a hardcoded literal in that file, itself
 * sourced from an uncommitted `tools/probe/ram-probe.py` run per that
 * constant's own doc comment, NOT a `battle1TurnRamDumpAsset` field despite
 * this scout's own brief assuming so -- see §9.1's correction), the real HP
 * Grovyle holds for this entire window (it is not touched again before turn
 * 5's ENDEAVOR). The RNG seed is not turn 5's own real ENDEAVOR roll (no RNG
 * ledger fixture exists for this turn, only tick/pixel probes) -- reused
 * verbatim from `turn5FaintPresentationStaging.ts`'s own committed
 * `KO_HIT_SEED` (919694434), already proven live to clear MOVE_STRENGTH's
 * 100% accuracy check in this same program from the same entry label; the
 * specific damage number is not pixel-relevant here (this module exists to
 * prove the message/hp-change MECHANISM generalizes in this direction, not
 * to reproduce ENDEAVOR's own hp-difference formula, which no staged run of
 * this move could do regardless of seed).
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
import { resolveBattleNameWithPrefix, resolveBattleStringLines, resolveMoveNameExclaim } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn5EndeavorPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_STRENGTH -- staged in place of the not-yet-executable MOVE_ENDEAVOR, see module doc. */
const STAGED_MOVE = 70;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling staging module. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** turn5FaintPresentationStaging.ts's own committed KO_HIT_SEED -- reused verbatim, see module doc. */
const STAGED_RNG_SEED = 919694434;
/** battleScene.ts's anchorPlayerAfterTurn3Hp -- Onix's real turn-3-settled HP, this window's own drain start. */
const ONIX_TARGET_HP = 88;
/** battleScene.ts's anchorOpponentAfterTurn4Hp -- Grovyle's real HP throughout this entire window. */
const GROVYLE_ATTACKER_HP = 1;

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
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" ? B_WAIT_TIME_LONG : null,
    resolveByteOperand: () => null,
  });
}

export type Turn5EndeavorHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Onix HP -- this substitute move's own real computed damage, not ENDEAVOR's hp-difference formula (see module doc: not pixel-relevant, only the mechanism is under test). */
  targetHpAfter: number;
}>;

/**
 * Runs the GROVYLE (side 1, attacker) -> ONIX (side 0, target) hit chain
 * from `BattleScript_HitFromAtkCanceler` to the script's own `end`, using
 * MOVE_STRENGTH as ENDEAVOR's nearest executable stand-in (module doc).
 * Same "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling staging module in this file family uses. Pure:
 * no shared/global state, no RNG or rules mutation outside this call's own
 * local machine instance.
 */
export function stageTurn5EndeavorHitChain(): Turn5EndeavorHitChainResult {
  const onix = battler({
    side: 0,
    hp: ONIX_TARGET_HP,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
  });
  const grovyle = battler({
    side: 1,
    hp: GROVYLE_ATTACKER_HP,
    species: SPECIES_GROVYLE,
    attack: 103,
    defense: 56,
    spAttack: 91,
    spDefense: 71,
    types: ["TYPE_GRASS", "TYPE_GRASS"],
    moves: [STAGED_MOVE, 0, 0, 0],
    pp: [15, 0, 0, 0],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, grovyle, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: STAGED_MOVE,
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
        targetHpAfter: stepped.state.rulesContext.battlers[0].hp,
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn5EndeavorPresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn5EndeavorPresentationStaging: staged hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn5EndeavorPresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * The PC-to-window bridge (`docs/presentation-seam-scout.md` §9.3) applied
 * to this staged run: `presentationEventWindowBridge.ts`'s existing
 * `resolveRockSlidePresentationWindowContent` (built for window 2) applies
 * unchanged -- same `sourceLabel` family, opponent-attacker direction
 * included, since the bridge itself never inspects `side`.
 */
export function resolveTurn5EndeavorWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn5EndeavorHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn5EndeavorPresentationStaging: staged hit chain did not produce the ROCK_SLIDE-shaped window's own event pair");
  }
  return content;
}

/**
 * The kickoff message's real content in this direction: `STRINGID_USEDMOVE`
 * resolved with Grovyle (opponent side, real "Foe " prefix per
 * `HANDLE_NICKNAME_STRING_CASE`) as `B_ATK_NAME_WITH_PREFIX` and the staged
 * move's own display name as `B_BUFF2` -- proves the opponent-attacker half
 * of this mechanism live, not merely by analogy to window 2's own
 * player-attacker run.
 */
export function resolveTurn5EndeavorKickoffLines(): readonly string[] {
  const content = resolveTurn5EndeavorWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_GROVYLE) }),
    B_BUFF2: () => resolveMoveNameExclaim(STAGED_MOVE),
  });
}
