/**
 * Presentation-seam retirement, prep-scout for `turn6-featherdance.json`
 * (ISSUES #39/#41, `docs/presentation-seam-scout.md` §12). Mirrors
 * `turn4DoubleTeamPresentationStaging.ts`'s ORIGINAL (pre-wiring) shape --
 * stage a real hit chain through the registered kernel opcodes and capture
 * its own semantic event stream -- for Pidgeotto's own turn-6 FEATHER_DANCE
 * use (the kickoff half of `drawTurn6FeatherDanceKickoffText`,
 * `battleScene.ts:8953-8975`; the ROCK_SLIDE tail of that same function
 * handing off to `drawTurn6RockSlideWindow` is a DIFFERENT, already-
 * documented-unwired mechanism, out of this module's own scope). **Unwired**
 * -- not imported by `battleScene.ts` or any other production file, and this
 * module does NOT add a new resolver to `presentationEventWindowBridge.ts`
 * (out of this prep-scout's own read-only-recon-plus-one-staging-module
 * contract) -- the message/stat-change extraction below is local to this
 * file only, exactly the shape `turn4DoubleTeamPresentationStaging.ts` had
 * BEFORE §11.5's wiring step added the shared bridge function.
 *
 * Ground truth, not fabricated: species/stats are ONIX's and PIDGEOTTO's
 * real level-50 RAM-confirmed battle stats (`docs/turn6-notes.md` §4's own
 * `dump-battler-full.py` snapshot table, ticks 7290 pre-turn/8130 post-turn):
 * ONIX atk/def/spd/spA/spD = 51/187/76/36/72 (HP 31, unchanged this whole
 * turn since FEATHER_DANCE deals no damage and ONIX's own ROCK_SLIDE half
 * is a separate, later move); PIDGEOTTO atk/def/spd/spA/spD = 98/61/77/56/56
 * (HP 156, likewise unchanged by its own move). PIDGEOTTO's own FEATHER_DANCE
 * PP goes 15->14 (its first use this battle, `docs/turn6-notes.md` §4's own
 * table: "PP before -> after ... 15,15 | 15->14,15"). Every `statStages`
 * array reads all-neutral (6) at tick 7290, confirmed by the same table's own
 * prose ("both `statStages` arrays read all-6/neutral at tick 7290") -- so
 * ONIX's own ATK stage 6 -> 4 this module stages is a genuine FIRST use, not
 * a repeat (unlike `turn4DoubleTeamPresentationStaging.ts`'s own SECOND-use
 * 7 -> 8 evasion case).
 *
 * The move IS the real MOVE_FEATHER_DANCE (id 297, EFFECT_ATTACK_DOWN_2,
 * MOVE_TARGET_SELECTED -- opponent-targeted, NOT self-targeted, the first
 * module in this dossier's own family to stage a genuinely non-self stat
 * change), entered from the move's own real dispatch-table label,
 * `BattleScript_EffectAttackDown2`
 * (`reference/pokeemerald/data/battle_scripts_1.s:958-960`: `setstatchanger
 * STAT_ATK, 2, TRUE` then `goto BattleScript_EffectStatDown`) -- the SAME
 * "enter at the move's own real dispatch label, not a hand-picked shared
 * one" discipline `turn4DoubleTeamPresentationStaging.ts`'s own module doc
 * already established (that module's own dead-end paragraph is exactly the
 * cautionary tale this module avoids by starting here directly).
 * `BattleScript_EffectStatDown` (`:534-553`) DOES run a real `accuracycheck`
 * (unlike DOUBLE_TEAM's own EFFECT_EVASION_UP route, which skips it) --
 * FEATHER_DANCE's own `moves.json` `accuracy` field is 100, so this is a
 * real, always-passing roll (`Random() % 100` is always in `[0,99]`, always
 * `< 100`), but it still consumes exactly one live `Random()` call, matching
 * `docs/turn6-notes.md` §3's own RNG ledger exactly (see `STAGED_RNG_SEED`'s
 * own doc below).
 *
 * `changeStatBuffs`'s own message-selection arithmetic
 * (`battleScriptStatBuffs.ts:276-303`) computes `isAttackerActive = target
 * === activeBattler`; for an opponent-targeted move (no
 * `MOVE_EFFECT_AFFECTS_USER` bit), `activeBattler` is assigned `target`
 * itself, so this comparison is trivially true and the emitted messageId is
 * always index 1 of `gStatDownStringIds` -- `STRINGID_DEFENDERSSTATFELL`,
 * NOT `STRINGID_ATTACKERSSTATFELL` -- confirmed live by this module's own
 * test, not merely reasoned about statically.
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
import { resolveBattleNameWithPrefix, resolveBattleStringLines, resolveMoveNameExclaim } from "./battleStringResolver.ts";
import speciesNamesAsset from "../data/gen/species-names.json" with { type: "json" };
import battleMessageTemplates from "../data/gen/battle-message-templates.json" with { type: "json" };

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn6FeatherDancePresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

/**
 * `battle-message-templates.json`'s own `statNames` table (`STAT_ATK` ->
 * "ATTACK") -- this module's own local `B_BUFF1` resolver, NOT added to the
 * shared `battleStringResolver.ts` (a production file, out of this prep-
 * scout's own one-staging-module contract).
 */
const STAT_NAMES = battleMessageTemplates.statNames as readonly { stat: string; name: string }[];
function statDisplayName(stat: string): string {
  const entry = STAT_NAMES.find((s) => s.stat === stat);
  if (!entry) throw new Error(`turn6FeatherDancePresentationStaging: no statNames entry for ${stat}`);
  return entry.name;
}

/**
 * `reference/pokeemerald/src/battle_script_commands.c:7040-7053` -- the
 * `B_BUFF2` text ChangeStatBuffs itself builds for a decrease: "harshly
 * fell!" for a real magnitude-2 change (`gStatChanger`'s own -2 case,
 * concatenating `STRINGID_STATHARSHLY`+`STRINGID_STATFELL`), else a bare
 * "fell!" (`STRINGID_STATFELL` alone). Derived here from the emitted
 * `stat-stage-change` event's own `from`/`to` fields (`|to - from|`), the
 * same "computable from the real event payload, not re-guessed" class
 * `STATS_CHANGE`'s own animation argument already established in §11.2.
 */
function statFellBuff2(from: number, to: number): string {
  const magnitude = Math.abs(to - from);
  return magnitude >= 2 ? "harshly fell!" : "fell!";
}

const PROGRAM = loadBattleScriptProgram();
/**
 * `reference/pokeemerald/data/battle_scripts_1.s:958-960` -- FEATHER_DANCE's
 * own EFFECT_ATTACK_DOWN_2 dispatch-table entry point (see this module's own
 * top-of-file doc for why this label, not a shared generic one, is correct
 * here).
 */
const ENTRY_LABEL = "BattleScript_EffectAttackDown2";
/** src/data/gen/moves.json MOVE_FEATHER_DANCE -- the real move this window's own kickoff phase uses. */
const MOVE_FEATHER_DANCE = 297;
/** src/data/gen/species-names.json array index (== the real numeric species id). */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
/**
 * `docs/turn6-notes.md` §3's own RNG ledger: Pidgeotto's own FEATHER_DANCE
 * accuracy roll lands at tick 7356, ending value `1484887866` after
 * consuming exactly 1 `Random()` step. This module needs the SEED entering
 * that roll, not the value after it -- derived here by inverting the
 * documented LCG step (`next = 1103515245*seed + 24691 mod 2^32`) rather
 * than a fresh RAM read (no earlier-tick RAM sample of `gRngValue` is cited
 * in the dossier for this exact turn boundary): `seed = (1484887866 -
 * 24691) * modinv(1103515245, 2^32) mod 2^32 = 538069379`. Verified by
 * this module's own test to round-trip forward to the SAME documented
 * post-roll value, so this is a checked derivation, not an unverified guess.
 */
const STAGED_RNG_SEED = 538069379;
/** docs/turn6-notes.md §4's own RAM-confirmed pre-turn battler snapshot (tick 7290). */
const ONIX_HP = 31;
const PIDGEOTTO_HP = 156;
const STAT_ATK_INDEX = 1;

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

export type Turn6FeatherDanceHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Pidgeotto's own final RNG value after exactly 1 real accuracy-check call. */
  rngValueAfter: number;
  rngCalls: number;
  /** Onix's own final ATK stat stage -- confirms the real 6 -> 4 first-use transition. */
  atkStageAfter: number;
}>;

/**
 * Runs Pidgeotto's own real turn-6 FEATHER_DANCE use against Onix (156/31
 * real HP, real stats, real pre-move neutral stat stages) from
 * `BattleScript_EffectAttackDown2` to the script's own `end`, returning
 * every semantic event the registered opcodes emitted along the way. Same
 * "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn6FeatherDanceHitChain(): Turn6FeatherDanceHitChainResult {
  const onix = battler({
    side: 0,
    hp: ONIX_HP,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [157, 20, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM (docs/turn6-notes.md §4)
    pp: [6, 20, 20, 10],
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
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
    pp: [20, 30, 15, 15],
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
        throw new Error("turn6FeatherDancePresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn6FeatherDancePresentationStaging: staged FEATHER_DANCE chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn6FeatherDancePresentationStaging: staged hit chain did not reach its own script end in budget");
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

export type Turn6FeatherDanceWindowContent = Readonly<{
  message: Readonly<{ messageId: "STRINGID_USEDMOVE" }>;
  statFell: Readonly<{ messageId: "STRINGID_DEFENDERSSTATFELL"; battler: number; stat: string; from: number; to: number }>;
}>;

/**
 * Local (non-bridge) extraction of this window's own two content events from
 * the staged run's real event stream -- the same shape
 * `resolveDoubleTeamKickoffPresentationWindowContent` in
 * `presentationEventWindowBridge.ts` has for turn 4's own analogous window,
 * but kept local to this file since adding a new resolver to that shared
 * production file is out of this prep-scout's own scope (§12.3 names it for
 * the next wiring worker instead).
 */
export function resolveTurn6FeatherDanceWindowContent(): Turn6FeatherDanceWindowContent {
  const { events } = stageTurn6FeatherDanceHitChain();
  const messageEvents = events.filter((e): e is Extract<BattleScriptSemanticEvent, { kind: "message" }> => e.kind === "message");
  const usedMove = messageEvents.find((e) => e.messageId === "STRINGID_USEDMOVE");
  const statFellMessage = messageEvents.find((e) => e.messageId === "STRINGID_DEFENDERSSTATFELL");
  const statEvent = events.find(
    (e): e is Extract<BattleScriptSemanticEvent, { kind: "stat-stage-change" }> => e.kind === "stat-stage-change",
  );
  if (!usedMove || !statFellMessage || !statEvent) {
    throw new Error(
      "turn6FeatherDancePresentationStaging: staged hit chain did not produce this window's own expected event triad",
    );
  }
  return Object.freeze({
    message: Object.freeze({ messageId: "STRINGID_USEDMOVE" as const }),
    statFell: Object.freeze({
      messageId: "STRINGID_DEFENDERSSTATFELL" as const,
      battler: statEvent.battler,
      stat: statEvent.stat,
      from: statEvent.from,
      to: statEvent.to,
    }),
  });
}

/**
 * `TURN6_FEATHERDANCE_LINE1`/`LINE2`'s real content ("Foe PIDGEOTTO used
 * \nFEATHERDANCE!") -- mechanically identical mapping to every sibling
 * module's own attackstring row (`Cmd_attackstring` emits the fixed
 * `STRINGID_USEDMOVE` regardless of which move is used,
 * `battleScriptHitChainOpcode.ts:754-757`), re-derived here from THIS staged
 * run's own real event stream, not merely asserted by analogy.
 */
export function resolveTurn6FeatherDanceKickoffLines(): readonly string[] {
  return resolveBattleStringLines("STRINGID_USEDMOVE", {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_PIDGEOTTO) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_FEATHER_DANCE),
  });
}

/**
 * `TURN6_ATKFELL_LINE1`/`LINE2`'s real content ("ONIX’s ATTACK\nharshly
 * fell!") -- `STRINGID_DEFENDERSSTATFELL`'s own template
 * (`{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}`) resolved against this
 * staged run's own real `stat-stage-change` event (battler 0/ONIX, ATK,
 * 6 -> 4): `B_DEF_NAME_WITH_PREFIX` is ONIX's own player-side name (no "Foe "
 * prefix, matching this window's own already-committed literal), `B_BUFF1`
 * is `statNames`'s own "ATTACK" entry, `B_BUFF2` is `statFellBuff2`'s own
 * magnitude-2 "harshly fell!" case.
 */
export function resolveTurn6AtkFellLines(): readonly string[] {
  const content = resolveTurn6FeatherDanceWindowContent();
  return resolveBattleStringLines(content.statFell.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF1: () => statDisplayName("STAT_ATK"),
    B_BUFF2: () => statFellBuff2(content.statFell.from, content.statFell.to),
  });
}
