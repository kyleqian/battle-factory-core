/**
 * ISSUES #39 rank-4 slice 3 (`docs/rank4-prep-scout.md` slice 3): turn 7's
 * and turn 8's own repeat FEATHER_DANCE kickoff windows (Pidgeotto's 2nd and
 * 3rd uses this battle), the SAME shape `turn6FeatherDancePresentationStaging.ts`
 * (1st use) and `turn11FeatherDancePresentationStaging.ts` (4th use, floored)
 * already retired twice over -- one parameterized module for both turns per
 * the supervisor's own sequencing note (the two turns differ only by data:
 * entering ATK stage, entering PP, entering HP, RNG seed -- no turn-keyed
 * branch), following `turn67RockSlidePresentationStaging.ts`'s own
 * `stage<Shared>(input)` + two thin exported wrappers precedent, not the
 * scout's own literal "two new files" suggestion.
 *
 * Ground truth, not fabricated: `docs/turn7-notes.md` §3/§4 and
 * `docs/turn8-notes.md` §3/§4 (already-committed RAM+pixel dossiers, reused
 * not re-derived). Species/stats are the same real level-50 values every
 * sibling module in this family cites (ONIX atk/def/spd/spA/spD =
 * 51/187/76/36/72, HP unchanged at 31 through both turns -- FEATHER_DANCE
 * deals no damage; PIDGEOTTO atk/def/spd/spA/spD = 98/61/77/56/56).
 *
 * Turn 7: Onix's ATK stage enters at 4 (turn 6's own 6->4 drop already
 * applied) and drops to 2 (2nd EFFECT_ATTACK_DOWN_2 use). Pidgeotto's own
 * pre-ROCK_SLIDE HP entering this window is 113 (turn 6's own settle,
 * `turn67RockSlidePresentationStaging.ts`'s own `TURN6_PIDGEOTTO_PRE_HIT_HP`
 * sibling constant). Pidgeotto's FEATHER_DANCE PP goes 14->13 (2nd use);
 * Onix's ROCK_SLIDE PP entering is 5 (turn 6's own settle, matches
 * `turn67RockSlidePresentationStaging.ts`'s own `TURN7_ONIX_ROCK_SLIDE_PP_BEFORE`).
 *
 * Turn 8: Onix's ATK stage enters at 2 and drops to 0 (3rd use, lands
 * exactly on the floor -- `docs/turn8-notes.md` §4 confirms the ordinary
 * "harshly fell!" text still plays, NOT the "won't go any lower!" variant,
 * because `ChangeStatBuffs`'s own floor check reads the stage BEFORE this
 * application's decrement; that branch is `turn11FeatherDancePresentationStaging.ts`'s
 * own scope, a genuinely later 4th-use case, not this module's). Pidgeotto's
 * own pre-BIND HP entering this window is 82 (turn 7's own settle). Onix's
 * ROCK_SLIDE PP is frozen at 4 this turn (BIND, not ROCK_SLIDE, is turn 8's
 * own 2nd move -- out of this module's own scope). Pidgeotto's FEATHER_DANCE
 * PP goes 13->12 (3rd use).
 *
 * Same real dispatch label every sibling module in this family enters at,
 * `BattleScript_EffectAttackDown2` (`reference/pokeemerald/data/
 * battle_scripts_1.s:958-960`) -- both turns are repeat uses of the same
 * move, not a different entry point.
 *
 * ## RNG seeds (real carry-forward, not an isolated inversion)
 *
 * Both turns' entering seed is the PRECEDING turn's own final RNG ledger
 * value -- no roll fires between turns (menu navigation consumes 0 `Random()`
 * calls, the same rule `turn11FeatherDancePresentationStaging.ts`'s own doc
 * establishes for its own flat-entering-value case):
 * - Turn 7: `docs/turn6-notes.md` §3's own tick-8121 final row (the AI
 *   next-move-scoring cluster), value after = 2456170172. Cross-checked by
 *   LCG-inverting turn 7's own first roll (`docs/turn7-notes.md` §3 tick
 *   8390, value after FEATHER_DANCE's accuracy roll = 1495764607) --
 *   inverting that value lands on the SAME 2456170172, both directions
 *   agree.
 * - Turn 8: `docs/turn7-notes.md` §3's own tick-9143 final row (the AI
 *   cluster), value after = 1385093289. Cross-checked the same way by
 *   inverting turn 8's own first roll (`docs/turn8-notes.md` §3 tick 9436,
 *   value after = 680271464) -- lands on the SAME 1385093289.
 *
 * Verified live this session (not guessed): staging each seed through
 * `BattleScript_EffectAttackDown2` consumes exactly 1 `Random()` call (the
 * always-passing accuracy roll, FEATHER_DANCE's own accuracy is 100) and
 * lands on `rngValueAfter` byte-identical to each dossier's own next ledger
 * entry (1495764607 turn 7, 680271464 turn 8).
 *
 * Text output is byte-identical to turn 6's own ("Foe PIDGEOTTO used\n
 * FEATHERDANCE!" / "ONIX's ATTACK\nharshly fell!") -- same messageId, same
 * magnitude-2 wording both turns -- so this module's own value is provenance
 * correctness (deriving the literal from THIS turn's own real facts, not
 * turn 6's borrowed one), not a pixel change, per the scout's own slice-3
 * framing.
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
  if (!entry) throw new Error(`turn78FeatherDancePresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

/** `battle-message-templates.json`'s own `statNames` table -- this module's own local `B_BUFF1` resolver, same convention as turn6/turn11's own modules. */
const STAT_NAMES = battleMessageTemplates.statNames as readonly { stat: string; name: string }[];
function statDisplayName(stat: string): string {
  const entry = STAT_NAMES.find((s) => s.stat === stat);
  if (!entry) throw new Error(`turn78FeatherDancePresentationStaging: no statNames entry for ${stat}`);
  return entry.name;
}

/** `reference/pokeemerald/src/battle_script_commands.c:7040-7053` -- same magnitude-driven "harshly fell!"/"fell!" derivation every sibling module in this family uses. */
function statFellBuff2(from: number, to: number): string {
  const magnitude = Math.abs(to - from);
  return magnitude >= 2 ? "harshly fell!" : "fell!";
}

const PROGRAM = loadBattleScriptProgram();
/** `reference/pokeemerald/data/battle_scripts_1.s:958-960` -- FEATHER_DANCE's own EFFECT_ATTACK_DOWN_2 dispatch-table entry point, the SAME label turn6/turn11's own modules enter at (both turns 7/8 are repeat uses of the same move). */
const ENTRY_LABEL = "BattleScript_EffectAttackDown2";
/** src/data/gen/moves.json MOVE_FEATHER_DANCE -- the real move both windows use. */
const MOVE_FEATHER_DANCE = 297;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling module. */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
const STAT_ATK_INDEX = 1;

/** `docs/turn6-notes.md` §3's own tick-8121 final ledger row (turn 7's entering value); cross-checked by inverting `docs/turn7-notes.md` §3's own tick-8390 first-roll post-value -- see this module's own top doc. */
const TURN7_STAGED_RNG_SEED = 2456170172;
/** `docs/turn7-notes.md` §4's own pre-FEATHER_DANCE snapshot: Onix HP 31 (unchanged), ATK stage entering 4 (turn 6's own drop already applied), ROCK_SLIDE PP entering 5, Pidgeotto HP 113 (turn 6's own settle), FEATHER_DANCE PP entering 14. */
const TURN7_ONIX_HP = 31;
const TURN7_ONIX_ATK_STAGE_ENTERING = 4;
const TURN7_ONIX_ROCK_SLIDE_PP_BEFORE = 5;
const TURN7_PIDGEOTTO_HP = 113;
const TURN7_PIDGEOTTO_FEATHER_DANCE_PP_BEFORE = 14;

/** `docs/turn7-notes.md` §3's own tick-9143 final ledger row (turn 8's entering value); cross-checked by inverting `docs/turn8-notes.md` §3's own tick-9436 first-roll post-value -- see this module's own top doc. */
const TURN8_STAGED_RNG_SEED = 1385093289;
/** `docs/turn8-notes.md` §4's own pre-FEATHER_DANCE snapshot: Onix HP 31 (unchanged), ATK stage entering 2 (turns 6+7's own cumulative drop), ROCK_SLIDE PP frozen at 4 (unused this turn), Pidgeotto HP 82 (turn 7's own settle), FEATHER_DANCE PP entering 13. */
const TURN8_ONIX_HP = 31;
const TURN8_ONIX_ATK_STAGE_ENTERING = 2;
const TURN8_ONIX_ROCK_SLIDE_PP_BEFORE = 4;
const TURN8_PIDGEOTTO_HP = 82;
const TURN8_PIDGEOTTO_FEATHER_DANCE_PP_BEFORE = 13;

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

function acknowledgePendingControllers(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const b of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, b);
  }
  return next;
}

export type FeatherDanceKickoffHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Pidgeotto's own final RNG value after exactly 1 real accuracy-check call. */
  rngValueAfter: number;
  rngCalls: number;
  /** Onix's own final ATK stat stage -- confirms this turn's own real transition. */
  atkStageAfter: number;
}>;

function stageFeatherDanceKickoff(input: Readonly<{
  onixHp: number;
  onixAtkStageEntering: number;
  onixRockSlidePpBefore: number;
  pidgeottoHp: number;
  pidgeottoFeatherDancePpBefore: number;
  rngSeed: number;
}>): FeatherDanceKickoffHitChainResult {
  const onix = battler({
    side: 0,
    hp: input.onixHp,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [157, 20, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM (docs/turn7-notes.md / docs/turn8-notes.md §4)
    pp: [input.onixRockSlidePpBefore, 20, 19, 10],
    statStages: [6, input.onixAtkStageEntering, 6, 6, 6, 6, 6, 6],
  });
  const pidgeotto = battler({
    side: 1,
    hp: input.pidgeottoHp,
    species: SPECIES_PIDGEOTTO,
    attack: 98,
    defense: 61,
    spAttack: 56,
    spDefense: 56,
    types: ["TYPE_NORMAL", "TYPE_FLYING"],
    moves: [332, 98, MOVE_FEATHER_DANCE, 28], // AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK
    pp: [20, 30, input.pidgeottoFeatherDancePpBefore, 15],
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
  const execution = createBattleScriptStatusRulesExecution(PROGRAM, ENTRY_LABEL, rulesContext, input.rngSeed, ports);
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
        throw new Error("turn78FeatherDancePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn78FeatherDancePresentationStaging: staged FEATHER_DANCE chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn78FeatherDancePresentationStaging: staged hit chain did not reach its own script end in budget");
}

/**
 * Runs Pidgeotto's own real turn-7 FEATHER_DANCE use (2nd use, entering ATK
 * stage 4 -> 2) against Onix from `BattleScript_EffectAttackDown2` to the
 * script's own `end`. Same "kernel runs at staging time; presentation reads
 * the event list" architecture every sibling module establishes. Pure: no
 * shared/global state, no RNG or rules mutation outside this call's own
 * local machine instance.
 */
export function stageTurn7FeatherDanceHitChain(): FeatherDanceKickoffHitChainResult {
  return stageFeatherDanceKickoff({
    onixHp: TURN7_ONIX_HP,
    onixAtkStageEntering: TURN7_ONIX_ATK_STAGE_ENTERING,
    onixRockSlidePpBefore: TURN7_ONIX_ROCK_SLIDE_PP_BEFORE,
    pidgeottoHp: TURN7_PIDGEOTTO_HP,
    pidgeottoFeatherDancePpBefore: TURN7_PIDGEOTTO_FEATHER_DANCE_PP_BEFORE,
    rngSeed: TURN7_STAGED_RNG_SEED,
  });
}

/**
 * Runs Pidgeotto's own real turn-8 FEATHER_DANCE use (3rd use, entering ATK
 * stage 2 -> 0, lands exactly on the floor but still takes the ordinary
 * "harshly fell!" branch -- `docs/turn8-notes.md` §4). Same shape as
 * `stageTurn7FeatherDanceHitChain`, own real seed/HP/PP/stage.
 */
export function stageTurn8FeatherDanceHitChain(): FeatherDanceKickoffHitChainResult {
  return stageFeatherDanceKickoff({
    onixHp: TURN8_ONIX_HP,
    onixAtkStageEntering: TURN8_ONIX_ATK_STAGE_ENTERING,
    onixRockSlidePpBefore: TURN8_ONIX_ROCK_SLIDE_PP_BEFORE,
    pidgeottoHp: TURN8_PIDGEOTTO_HP,
    pidgeottoFeatherDancePpBefore: TURN8_PIDGEOTTO_FEATHER_DANCE_PP_BEFORE,
    rngSeed: TURN8_STAGED_RNG_SEED,
  });
}

/** The PC-to-window bridge applied to turn 7's own staged run -- same `presentationEventWindowBridge.ts` resolver turn6/turn11's own modules reuse unchanged. */
export function resolveTurn7FeatherDanceWindowContent(): FeatherDanceKickoffPresentationWindowContent {
  const { events } = stageTurn7FeatherDanceHitChain();
  const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
  if (!content) {
    throw new Error("turn78FeatherDancePresentationStaging: turn 7 staged hit chain did not produce this window's own expected event triad");
  }
  return content;
}

/** Same bridge applied to turn 8's own staged run. */
export function resolveTurn8FeatherDanceWindowContent(): FeatherDanceKickoffPresentationWindowContent {
  const { events } = stageTurn8FeatherDanceHitChain();
  const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
  if (!content) {
    throw new Error("turn78FeatherDancePresentationStaging: turn 8 staged hit chain did not produce this window's own expected event triad");
  }
  return content;
}

/** `TURN6_FEATHERDANCE_LINE1`/`LINE2`'s real content, re-derived here from turn 7's own staged run (not copied from turn 6's) -- byte-identical since `Cmd_attackstring` emits the fixed `STRINGID_USEDMOVE` regardless of which move/turn. */
export function resolveTurn7FeatherDanceKickoffLines(): readonly string[] {
  const content = resolveTurn7FeatherDanceWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_PIDGEOTTO) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_FEATHER_DANCE),
  });
}

/** Same resolution applied to turn 8's own staged run. */
export function resolveTurn8FeatherDanceKickoffLines(): readonly string[] {
  const content = resolveTurn8FeatherDanceWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_PIDGEOTTO) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_FEATHER_DANCE),
  });
}

/** `TURN6_ATKFELL_LINE1`/`LINE2`'s real content, re-derived from turn 7's own staged run's real `from`/`to` (4 -> 2, magnitude 2, same "harshly fell!" wording). */
export function resolveTurn7AtkFellLines(): readonly string[] {
  const content = resolveTurn7FeatherDanceWindowContent();
  return resolveBattleStringLines(content.statFellMessage.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF1: () => statDisplayName("STAT_ATK"),
    B_BUFF2: () => statFellBuff2(content.statChange.from, content.statChange.to),
  });
}

/** Same resolution applied to turn 8's own staged run's real `from`/`to` (2 -> 0, magnitude 2, still the ordinary "harshly fell!" branch -- the floor's own "won't go any lower!" variant is turn 11's own scope, a genuinely later 4th-use case). */
export function resolveTurn8AtkFellLines(): readonly string[] {
  const content = resolveTurn8FeatherDanceWindowContent();
  return resolveBattleStringLines(content.statFellMessage.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF1: () => statDisplayName("STAT_ATK"),
    B_BUFF2: () => statFellBuff2(content.statChange.from, content.statChange.to),
  });
}
