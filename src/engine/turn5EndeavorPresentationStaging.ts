/**
 * Presentation-seam wiring, window 3 (`docs/presentation-seam-scout.md` §9,
 * §9.4 rung 2): staging module for `turn5-rockslide.json`
 * (`drawTurn5EndeavorText`/`drawTurn5RockSlideWindow`'s attack branch,
 * `battleScene.ts`). Wired into `battleScene.ts` via
 * `resolveTurn5EndeavorAttackLines`/`resolveTurn5EndeavorHpEndpoints`.
 *
 * This window's real content is Grovyle's ENDEAVOR (opponent attacks
 * player). `EFFECT_ENDEAVOR` is now **executable**
 * (`docs/executable-frontier-census.md` line 245, entry 464's own
 * registration of `B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE`/
 * `B_SCR_OP_BICBYTE`/`B_SCR_OP_ADJUSTSETDAMAGE`) -- this module now stages
 * the REAL `BattleScript_EffectEndeavor` (`reference/pokeemerald/data/
 * battle_scripts_1.s:2479-2491`), replacing an earlier revision's own
 * MOVE_STRENGTH substitute (the same precedent
 * `turn5FaintPresentationStaging.ts` still uses for a different, still-open
 * gap). MOVE_ENDEAVOR (id 283, `EFFECT_ENDEAVOR`, power 1, 100% accuracy,
 * `MOVE_TARGET_SELECTED`) with Grovyle as attacker (side 1) and Onix as
 * target (side 0) -- the OPPOSITE direction from both
 * `turn1RockSlidePresentationStaging.ts` and `turn5FaintPresentationStaging.ts`,
 * which only ever staged Onix (side 0) attacking Grovyle (side 1).
 *
 * Entry point is `BattleScript_EffectEndeavor` itself, NOT the generic
 * `BattleScript_HitFromAtkCanceler` every sibling staging module uses --
 * `tests/battleScriptHitChainOpcode.test.ts`'s own "FRONTIER GATE" describes
 * (`attackcanceler, attackstring, ppreduce, setdamagetohealthdifference,
 * copyword, accuracycheck, typecalc, jumpifmovehadnoeffect, bicbyte,
 * copyword, adjustsetdamage, goto BattleScript_HitFromAtkAnimation`) --
 * ENDEAVOR's own `attackstring`/`ppreduce` execute under that top label
 * directly (no intervening `BattleScript_HitFromAtkString` label exists in
 * this script, unlike the generic entry), so their events' own
 * `provenance.sourceLabel` is `"BattleScript_EffectEndeavor"`, not
 * `HIT_FROM_ATK_STRING_SCRIPT_LABEL`'s default
 * `"BattleScript_HitFromAtkString"` -- confirmed by this module's own tests.
 * The trailing `goto BattleScript_HitFromAtkAnimation` DOES land on that real
 * label (a genuine jump target), so the `hp-change`'s own sourceLabel stays
 * the bridge's own default. `resolveRockSlidePresentationWindowContent`
 * (built for window 2) already accepts an `attackStringScriptLabel` override
 * parameter for exactly this -- `resolveTurn5EndeavorWindowContent` below
 * passes `"BattleScript_EffectEndeavor"` explicitly, zero bridge edits
 * needed (the override parameter already existed).
 *
 * `bicbyte` unconditionally clears both effectiveness flags after
 * `typecalc` runs (ENDEAVOR's own script, regardless of the real NORMAL-vs-
 * ROCK/GROUND type matchup), so `resultmessage` reaches `moveResultFlags===0`
 * and emits no additional message -- this staged run's own event list is
 * shorter than the old MOVE_STRENGTH substitute's (no
 * `STRINGID_NOTVERYEFFECTIVE`), confirmed live by this module's own tests,
 * not assumed.
 *
 * Ground truth, not fabricated: species/stats/types are Onix's and Grovyle's
 * real level-50 battle stats, matching every other staging module in this
 * file family (`tests/damageCalc.test.ts`'s own RAM-pinned `ONIX`/`GROVYLE`
 * blocks). Both HP values are this window's own real anchors, not
 * placeholders: Onix (target) starts at 88 -- `battleScene.ts`'s
 * `anchorPlayerAfterTurn3Hp` (`battle1-grovyle-faint-ram-dump.json`'s
 * `battlerSnapshots["4892"].battler0.hp`), the real turn-3-settled value
 * this window's own ENDEAVOR drain starts from. Grovyle (attacker) is at 1
 * HP -- `battleScene.ts`'s `anchorOpponentAfterTurn4Hp` (a hardcoded literal
 * in that file, itself sourced from an uncommitted `tools/probe/ram-probe.py`
 * run per that constant's own doc comment), the real HP Grovyle holds for
 * this entire window (it is not touched again before turn 5's ENDEAVOR).
 * `setdamagetohealthdifference`'s own real formula (`target.hp - attacker.hp
 * = 88 - 1 = 87`) settles Onix at exactly 1 -- `battleScene.ts`'s
 * `anchorPlayerAfterTurn5Hp`, reproduced by the real formula for the first
 * time this session, not copied. The RNG seed is not turn 5's own real
 * ENDEAVOR roll (no RNG ledger fixture exists for this turn, only
 * tick/pixel probes) -- reused verbatim from
 * `turn5FaintPresentationStaging.ts`'s own committed `KO_HIT_SEED`
 * (919694434); irrelevant to the outcome regardless, since ENDEAVOR's own
 * 100% accuracy check (`Random() % 100 + 1 > 100` can never be true) always
 * hits for any seed value.
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
/** ENDEAVOR's own real entry label -- NOT the generic BattleScript_HitFromAtkCanceler every sibling module uses, see module doc. */
const ENTRY_LABEL = "BattleScript_EffectEndeavor";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_ENDEAVOR -- the real move, id 283 (entry 464 registered its 3 blocking opcodes). */
const MOVE_ENDEAVOR = 283;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling staging module. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** turn5FaintPresentationStaging.ts's own committed KO_HIT_SEED -- reused verbatim, see module doc (irrelevant to the outcome: ENDEAVOR's 100% accuracy always hits). */
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
  /** Final staged Onix HP -- ENDEAVOR's own real hp-difference formula (88 - 1 = 87 damage), settling at 1, matching battleScene.ts's anchorPlayerAfterTurn5Hp for real. */
  targetHpAfter: number;
}>;

/**
 * Runs the GROVYLE (side 1, attacker) -> ONIX (side 0, target) hit chain
 * from `BattleScript_EffectEndeavor` to the script's own `end`, using the
 * REAL MOVE_ENDEAVOR (module doc). Same "kernel runs at staging time;
 * presentation reads the event list" architecture every sibling staging
 * module in this file family uses. Pure: no shared/global state, no RNG or
 * rules mutation outside this call's own local machine instance.
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
    moves: [MOVE_ENDEAVOR, 0, 0, 0],
    pp: [15, 0, 0, 0],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, grovyle, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 1, target: 0, effectBattler: 0, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_ENDEAVOR,
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
 * `resolveRockSlidePresentationWindowContent` (built for window 2), passed
 * this script's own real attackstring label override (`ENTRY_LABEL`, module
 * doc: ENDEAVOR's `attackstring` executes directly under
 * `BattleScript_EffectEndeavor`, not a `BattleScript_HitFromAtkString`
 * sub-label) -- the function's existing override parameter, not a bridge
 * edit. The `hp-change`'s own default `BattleScript_HitFromAtkAnimation`
 * label still applies unchanged (the script's trailing `goto` lands there
 * for real).
 */
export function resolveTurn5EndeavorWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn5EndeavorHitChain();
  const content = resolveRockSlidePresentationWindowContent(events, ENTRY_LABEL);
  if (!content) {
    throw new Error("turn5EndeavorPresentationStaging: staged hit chain did not produce the ROCK_SLIDE-shaped window's own event pair");
  }
  return content;
}

/**
 * `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`'s real content: `STRINGID_USEDMOVE`
 * resolved with Grovyle (opponent side, real "Foe " prefix per
 * `HANDLE_NICKNAME_STRING_CASE`) as `B_ATK_NAME_WITH_PREFIX` and MOVE_ENDEAVOR's
 * own real display name as `B_BUFF2` -- "Foe GROVYLE used"/"ENDEAVOR!", the
 * real move name, not a substitute's.
 */
export function resolveTurn5EndeavorAttackLines(): readonly string[] {
  const content = resolveTurn5EndeavorWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_GROVYLE) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_ENDEAVOR),
  });
}

/** Onix's real turn-5 ENDEAVOR drain endpoints (88 -> 1) -- the RAM-dump/hardcoded-literal reads `drawTurn5EndeavorText`'s `endeavorOnixHp` call stops needing. */
export function resolveTurn5EndeavorHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn5EndeavorWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}
