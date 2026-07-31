/**
 * Presentation-seam prep-scout, `turn11-featherdance-off.json` (docs/
 * presentation-seam-scout.md §14). Stages a real hit chain through the
 * registered kernel opcodes and reads this window's own content from the
 * result via `presentationEventWindowBridge.ts`'s already-existing
 * `resolveFeatherDanceKickoffPresentationWindowContent` (built for turn 6's
 * own module, §12.3 step 1) -- for Pidgeotto's own turn-11 FEATHER_DANCE use
 * against Onix's own ALREADY-FLOORED ATK stage (`drawTurn11FeatherDanceWindow`,
 * `battleScene.ts:11441-11455`). Unwired -- not imported by `battleScene.ts`
 * or any production file, and adds no new bridge function (§14.2's own
 * finding: the existing three-signal bridge already fits this shape
 * unchanged).
 *
 * Ground truth, not fabricated: species/stats are ONIX's and PIDGEOTTO's
 * real level-50 RAM-confirmed battle stats, unchanged since turn 6
 * (`docs/turn6-notes.md` §4), re-cited here from `docs/turn11-notes.md` §4's
 * own fresh snapshot table (ticks 13306 pre-turn / 14340 post-turn): ONIX
 * atk/def/spd/spA/spD = 51/187/76/36/72 (HP 14, unchanged this whole turn --
 * FEATHER_DANCE deals no damage); PIDGEOTTO atk/def/spd/spA/spD =
 * 98/61/77/56/56 (HP 38 entering, drained by its OWN separate later
 * ROCK_SLIDE half -- out of this module's own scope). PIDGEOTTO's own
 * FEATHER_DANCE PP goes 12->11 (its 2nd use, first since turn 7 --
 * `docs/turn11-notes.md` §4's own table: "FEATHER_DANCE(297) 12/15 -> 11/15
 * (1st use since turn 7)"). Onix's own ATK stat stage reads **0 -> 0**
 * (`docs/turn11-notes.md` §4: "ATK stat stage before -> after: 0 -> 0
 * (unchanged -- FEATHER_DANCE's own attempt is blocked by the floor, 4th
 * turn running at 0)") -- the genuinely new fact this module stages, not a
 * repeat of turn 6's own 6->4 first-drop transition.
 *
 * The move IS the real MOVE_FEATHER_DANCE (id 297, EFFECT_ATTACK_DOWN_2,
 * MOVE_TARGET_SELECTED), entered from the SAME real dispatch-table label
 * turn 6's own module uses, `BattleScript_EffectAttackDown2`
 * (`reference/pokeemerald/data/battle_scripts_1.s:958-960`) -- same "enter
 * at the move's own real dispatch label" discipline every sibling module in
 * this family establishes; this is turn 11's own REPEAT use, not a
 * different entry point.
 *
 * **The RNG seed is turn 11's own real recorded entering value, identified
 * (not derived by inversion like turn 6's module needed) from
 * `docs/turn11-notes.md` §3's own already-RAM-probed ledger**: `gRngValue`
 * is flat at `1753916210` entering turn 11 (zero navigation-press rolls,
 * the fourth turn running confirming that rule), and the ledger's FIRST
 * entry (tick 13350, 1 step, value after `2876053693`) is Pidgeotto's own
 * FEATHER_DANCE accuracy roll -- so the SEED entering that roll is simply
 * the turn's own entering value, no inversion needed. **Verified live this
 * session, not guessed**: `advanceRngValue(1753916210)` (`src/engine/rng.ts`'s
 * own `BigInt`-based LCG step) equals EXACTLY the ledger's own recorded
 * `2876053693` -- `tests/turn11FeatherDancePresentationStaging.test.ts`'s
 * own dedicated assertion.
 *
 * **The genuinely new shape this module proves, beyond turn 6's own
 * sibling**: `changeStatBuffs` (`battleScriptStatBuffs.ts:274-303`) computes
 * `multistringChooser = (before === MIN_STAT_STAGE) ? B_MSG_STAT_WONT_CHANGE
 * : isAttackerActive` -- with `before` already 0, this picks
 * `B_MSG_STAT_WONT_CHANGE` (2), NOT the ordinary defender-fell index. The
 * REAL committed script's own shared tail
 * (`reference/pokeemerald/data/battle_scripts_1.s:541-549`,
 * `BattleScript_EffectStatDown`'s own `jumpifbyte
 * CMP_LESS_THAN,cMULTISTRING_CHOOSER,B_MSG_STAT_WONT_DECREASE,
 * BattleScript_StatDownDoAnim`) means multistringChooser==2 does NOT take
 * the `BattleScript_StatDownDoAnim` branch at all -- `attackanimation`
 * (the move-use particle effect) and `playanimation ...STATS_CHANGE` (the
 * swirl/banner effect) are BOTH skipped entirely, falling straight through
 * to `pause`+`goto BattleScript_StatDownPrintString`. This is the kernel-
 * level confirmation of `docs/turn11-notes.md` §5's own PNG-derived finding
 * ("the 33-tick hold here vs ~290-tick holds in turns 6-8 is the
 * signature... the blocked stat change short-circuits the battle script
 * BEFORE its animation step") and the RAM-derived "0 feather-template OAM
 * hits" finding (§2 addendum) -- proven here as ZERO `animation`-kind events
 * anywhere in this staged run's own event stream, not merely inferred from
 * pixels/OAM. `BattleScript_StatDownPrintString` itself (the SAME shared
 * label turn 6's own module's `statFellMessage` sits under) still runs, so
 * `presentationEventWindowBridge.ts`'s existing
 * `resolveFeatherDanceKickoffPresentationWindowContent` bridge -- built for
 * turn 6's own DIFFERENT (non-floored) branch -- resolves this window's own
 * content UNCHANGED, zero new bridge shape needed (§14.2's own finding).
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
  resolveFeatherDanceKickoffPresentationWindowContent,
  type FeatherDanceKickoffPresentationWindowContent,
} from "./presentationEventWindowBridge.ts";
import { resolveBattleNameWithPrefix, resolveBattleStringLines, resolveMoveNameExclaim } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };
import battleMessageTemplates from "../data/gen/battle-message-templates.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn11FeatherDancePresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

/** `battle-message-templates.json`'s own `statNames` table (`STAT_ATK` -> "ATTACK") -- this module's own local `B_BUFF1` resolver, same as `turn6FeatherDancePresentationStaging.ts`'s own, not added to the shared `battleStringResolver.ts` (a production file, out of this prep-scout's own one-staging-module contract). */
const STAT_NAMES = battleMessageTemplates.statNames as readonly { stat: string; name: string }[];
function statDisplayName(stat: string): string {
  const entry = STAT_NAMES.find((s) => s.stat === stat);
  if (!entry) throw new Error(`turn11FeatherDancePresentationStaging: no statNames entry for ${stat}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
/** `reference/pokeemerald/data/battle_scripts_1.s:958-960` -- FEATHER_DANCE's own EFFECT_ATTACK_DOWN_2 dispatch-table entry point, same entry turn 6's own module uses (this is turn 11's own REPEAT use of the same move). */
const ENTRY_LABEL = "BattleScript_EffectAttackDown2";
/** src/data/gen/moves.json MOVE_FEATHER_DANCE -- the real move this window's own kickoff phase uses. */
const MOVE_FEATHER_DANCE = 297;
/** src/data/gen/species-names.json array index (== the real numeric species id). */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
/**
 * `docs/turn11-notes.md` §3's own RNG ledger: `gRngValue` is flat at this
 * value entering turn 11 (zero navigation-press rolls), and it is ALSO the
 * seed entering Pidgeotto's own FEATHER_DANCE accuracy roll (the turn's
 * first `Random()` call) -- unlike turn 6's own module, no LCG inversion is
 * needed here since the dossier already records the ENTERING value
 * directly, not just the post-roll value.
 */
const STAGED_RNG_SEED = 1753916210;
/** docs/turn11-notes.md §4's own RAM-confirmed pre-turn battler snapshot (tick 13306). */
const ONIX_HP = 14;
const PIDGEOTTO_HP = 38;
const STAT_ATK_INDEX = 1;
/** docs/turn11-notes.md §4: Onix's own ATK stage entering turn 11 -- already floored, the 4th turn running at 0 (first floored by turn 8's own 3rd FEATHER_DANCE use). */
const ONIX_ATK_STAGE_ENTERING = 0;

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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
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
    // BattleScript_EffectStatDown's own `pause B_WAIT_TIME_SHORT` /
    // `waitmessage B_WAIT_TIME_LONG` steps -- same override every sibling
    // module needs for a staged, non-interactive run.
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
    resolveByteOperand: () => null,
  });
}

export type Turn11FeatherDanceHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Pidgeotto's own final RNG value after exactly 1 real accuracy-check call. */
  rngValueAfter: number;
  rngCalls: number;
  /** Onix's own final ATK stat stage -- confirms the real 0 -> 0 floored-repeat transition. */
  atkStageAfter: number;
}>;

/**
 * Runs Pidgeotto's own real turn-11 FEATHER_DANCE use against Onix (38/14
 * real HP, real stats, Onix's ATK stage ALREADY at the floor) from
 * `BattleScript_EffectAttackDown2` to the script's own `end`, returning
 * every semantic event the registered opcodes emitted along the way. Same
 * "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn11FeatherDanceHitChain(): Turn11FeatherDanceHitChainResult {
  const onix = battler({
    side: 0,
    hp: ONIX_HP,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [157, 20, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM (docs/turn11-notes.md §4)
    pp: [2, 19, 19, 10],
    statStages: [6, ONIX_ATK_STAGE_ENTERING, 6, 6, 6, 6, 6, 6],
  });
  const pidgeotto = battler({
    side: 1,
    hp: PIDGEOTTO_HP,
    species: SPECIES_PIDGEOTTO,
    attack: 98,
    defense: 61,
    spAttack: 56,
    spDefense: 56,
    types: ["TYPE_NORMAL", "TYPE_FLYING"],
    moves: [332, 98, MOVE_FEATHER_DANCE, 28], // AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK
    pp: [19, 29, 12, 15],
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, pidgeotto, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 1, target: 0, effectBattler: null, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_FEATHER_DANCE,
    currentMovePosition: 2,
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
        rngValueAfter: stepped.state.rng.value,
        rngCalls: stepped.state.rng.calls,
        atkStageAfter: stepped.state.rulesContext.battlers[0]!.statStages[STAT_ATK_INDEX]!,
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn11FeatherDancePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn11FeatherDancePresentationStaging: staged FEATHER_DANCE chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn11FeatherDancePresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * The PC-to-window bridge (`presentationEventWindowBridge.ts`'s existing
 * `resolveFeatherDanceKickoffPresentationWindowContent`, built for turn 6's
 * own DIFFERENT branch) applied to this staged run: extracts the
 * FEATHER_DANCE kickoff's own message + (no-op) ATK-drop + ATK-floor
 * content purely from provenance, never a turn number. **Zero new bridge
 * shape needed** -- §14.2's own finding, the same three signals (kickoff
 * message under `BattleScript_EffectStatDown`, `stat-stage-change` under the
 * SAME label, stat-fell-family message under `BattleScript_
 * StatDownPrintString`) are present in THIS floored run too, just with
 * `from===to===0` and `STRINGID_STATSWONTDECREASE` instead of
 * `STRINGID_DEFENDERSSTATFELL`.
 */
export function resolveTurn11FeatherDanceWindowContent(): FeatherDanceKickoffPresentationWindowContent {
  const { events } = stageTurn11FeatherDanceHitChain();
  const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
  if (!content) {
    throw new Error(
      "turn11FeatherDancePresentationStaging: staged hit chain did not produce this window's own expected event triad",
    );
  }
  return content;
}

/**
 * `TURN6_FEATHERDANCE_LINE1`/`LINE2`'s real content ("Foe PIDGEOTTO used
 * \nFEATHERDANCE!") -- byte-identical to turn 6/7/8's own already-wired/
 * already-staged kickoff text (same attacker, same move,
 * `battleScriptHitChainOpcode.ts:754-757`'s own fixed `STRINGID_USEDMOVE`
 * regardless of which move is used), re-derived here from THIS turn's own
 * staged run rather than merely asserted by analogy.
 */
export function resolveTurn11FeatherDanceKickoffLines(): readonly string[] {
  const content = resolveTurn11FeatherDanceWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_PIDGEOTTO) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_FEATHER_DANCE),
  });
}

/**
 * `TURN11_ATKFLOOR_LINE1`/`LINE2`'s real content ("ONIX’s ATTACK\nwon’t go
 * lower!") -- `STRINGID_STATSWONTDECREASE`'s own template
 * (`{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\nwon't go lower!`,
 * `src/data/gen/battle-message-templates.json` id 62) resolved against this
 * staged run's own real `statFellMessage` (battler 0/ONIX, ATK, floored):
 * `B_DEF_NAME_WITH_PREFIX` is ONIX's own player-side name (no "Foe " prefix,
 * matching this window's own already-committed literal), `B_BUFF1` is
 * `statNames`'s own "ATTACK" entry. No `B_BUFF2` placeholder in this
 * template (unlike `STRINGID_DEFENDERSSTATFELL`'s own magnitude-dependent
 * "harshly fell!"/"fell!" tail) -- the fixed "won't go lower!" text is a
 * plain literal segment, needing no `statFellBuff2`-style derivation.
 */
export function resolveTurn11AtkFloorLines(): readonly string[] {
  const content = resolveTurn11FeatherDanceWindowContent();
  return resolveBattleStringLines(content.statFellMessage.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF1: () => statDisplayName("STAT_ATK"),
  });
}
