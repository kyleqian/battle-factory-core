/**
 * Presentation-seam prep-scout, `turn13-sandattack.json` (`docs/presentation-
 * seam-scout.md` §15, unwired -- recon + staged proof + plan only, no
 * production wiring). Stages a real hit chain through the registered kernel
 * opcodes and reads this window's own content from the result via
 * `presentationEventWindowBridge.ts`'s (UNCHANGED)
 * `resolveFeatherDanceKickoffPresentationWindowContent` -- for Pidgeotto's
 * own turn-13 SAND_ATTACK use (the kickoff+accuracy-drop half of
 * `drawTurn13SandAttackWindow`, `battleScene.ts:12065+`; the DRAGON_BREATH
 * tail that same function hands off to (`drawTurn13DragonBreathWindow`) is a
 * DIFFERENT, already-documented-unwired mechanism, out of this module's own
 * scope, same "kickoff half only" convention `turn6FeatherDancePresentation
 * Staging.ts`'s own module doc already established).
 *
 * Ground truth, not fabricated: species/stats are ONIX's and PIDGEOTTO's
 * real level-50 battle stats, unchanged since `docs/turn6-notes.md` §4's own
 * RAM-confirmed snapshot (ONIX atk/def/spd/spA/spD = 51/187/76/36/72;
 * PIDGEOTTO atk/def/spd/spA/spD = 98/61/77/56/56). Turn-13-specific state,
 * live-verified THIS session (not re-cited from the pre-existing dossier
 * alone) via a fresh `tools/probe/ram-probe.py` run against
 * `tools/probe/specs/turn13-rng-watch.json`'s own committed 108-segment
 * button script (extended locally with two extra watch columns,
 * `gBattleMons+0x1E`/`+0x76` -- Onix's/Pidgeotto's own `statStages[STAT_ACC]`
 * byte, same `dump-battler-full.py` offset convention `docs/turn13-notes.md`
 * §3 already cites for the ATK stage columns):
 * - ONIX (battler 0): HP 4/117 (unchanged all turn -- SAND_ATTACK deals no
 *   damage), moves [ROCK_SLIDE(157) 0/10 exhausted, BIND(20) 19/20,
 *   DRAGON_BREATH(225) 19/20, SANDSTORM(201) 10/20] (`docs/turn13-notes.md`
 *   §3), `statStages[STAT_ATK]` flat at the floor (encoded 0, real -6, 6th
 *   consecutive turn) and `statStages[STAT_ACC]` flat at neutral (encoded 6)
 *   through tick 15429 -- both RAM-confirmed live this session at ticks
 *   15374-15429, not merely re-cited.
 * - PIDGEOTTO (battler 1): HP 16 (unchanged by its own move), moves
 *   [AERIAL_ACE(332) 18/20, QUICK_ATTACK(98) 29/30, FEATHER_DANCE(297)
 *   11/15, SAND_ATTACK(28) 15/15 entering], all `statStages` neutral
 *   (encoded 6) -- unaffected by its own move, RAM-confirmed live this
 *   session.
 * - `gRngValue` flat at **2173905089** through tick 15429 (this session's own
 *   live probe), committing to **2287569056** at tick 15430 -- exactly one
 *   `Random()` step, matching `docs/turn13-notes.md` §2's own ledger row
 *   ("15430 | 1 | Pidgeotto's SAND_ATTACK accuracy-family roll"). **Verified
 *   live this session, not merely cited**: `advanceRngValue(2173905089)`
 *   (`src/engine/rng.ts`'s own `BigInt`-based LCG step) equals EXACTLY
 *   2287569056 -- this module's own dedicated test assertion. The seed
 *   entering the roll is simply turn 13's own entering value (no LCG
 *   inversion needed), same shape `turn11FeatherDancePresentationStaging.ts`
 *   already established for a flat-RNG-entering turn.
 * - The same live probe also RAM-confirms Onix's own `statStages[STAT_ACC]`
 *   commits 6 -> 5 at tick 15464 (silent, no register/pixel effect --
 *   matching `docs/turn13-notes.md`'s own "(d)" finding, now independently
 *   re-confirmed by a fresh probe rather than re-cited from the doc alone).
 *
 * The move IS the real MOVE_SAND_ATTACK (id 28, EFFECT_ACCURACY_DOWN,
 * MOVE_TARGET_SELECTED -- opponent-targeted, NOT self-targeted, accuracy
 * 100), entered from the move's own real dispatch-table label,
 * `BattleScript_EffectAccuracyDown`
 * (`reference/pokeemerald/data/battle_scripts_1.s:528-530`: `setstatchanger
 * STAT_ACC, 1, TRUE` then `goto BattleScript_EffectStatDown`) -- the SAME
 * "enter at the move's own real dispatch label, not a hand-picked shared
 * one" discipline `turn6FeatherDancePresentationStaging.ts`'s own module doc
 * already established. The compiled `battle-script-program.json` already
 * has this exact label (confirmed by inspecting its own `blocks` array
 * directly this session, `label: "BattleScript_EffectAccuracyDown"`, `line:
 * 528`), and its own `setstatchanger` operand triad (`STAT_ACC`, `1`,
 * `TRUE`) compiles to the setbyte literal `"STAT_ACC | 1 << 4 | TRUE << 7"`
 * -- ALREADY a registered constant in `battleScriptSetByte.ts:190`
 * (`6 | (1 << 4) | (1 << 7)`), confirmed by inspecting that file directly
 * this session. **Zero new opcode registration needed** -- the exact
 * literal SAND_ATTACK's own script emits was already wired for some other
 * caller before this session (same "opcode-registration already done"
 * finding class `turn11FeatherDancePresentationStaging.ts`'s own module doc
 * already established for EFFECT_ATTACK_DOWN_2).
 *
 * `BattleScript_EffectStatDown` (`:534-553`) DOES run a real `accuracycheck`
 * (unlike DOUBLE_TEAM's own EFFECT_EVASION_UP route) -- SAND_ATTACK's own
 * `moves.json` `accuracy` field is 100, so this is a real, always-passing
 * roll, but it still consumes exactly one live `Random()` call, matching
 * `docs/turn13-notes.md` §2's own RNG ledger exactly.
 *
 * **The "roles inverted vs turn 6" question this checkpoint's own brief
 * raised, answered from the staged events below, not assumed**:
 * `changeStatBuffs`'s own message-selection arithmetic
 * (`battleScriptStatBuffs.ts:274-303`) computes `isAttackerActive = target
 * === activeBattler`; for SAND_ATTACK -- an opponent-targeted move with no
 * `MOVE_EFFECT_AFFECTS_USER` bit, exactly like FEATHER_DANCE -- `activeBattler`
 * is assigned `target` itself (Onix, battler 0), so this comparison is
 * trivially true, identically to turn 6's own case. **Roles are NOT
 * inverted**: both moves are opponent(Pidgeotto)-attacks-target(Onix,
 * player)'s-own-stat, same side pairing, same `isAttackerActive` derivation,
 * same resulting messageId family (`STRINGID_DEFENDERSSTATFELL`, confirmed
 * live by this module's own test below) -- the only genuine differences are
 * the `stat` value (`STAT_ACC` vs `STAT_ATK`) and the magnitude (1 vs 2,
 * hence `statFellBuff2`'s own "fell!" not "harshly fell!" tail, matching
 * `battleScene.ts:11908`'s own already-committed `TURN13_ACCFELL_LINE2`
 * literal). This module's own dedicated test proves the claim rather than
 * merely asserting it.
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
  if (!entry) throw new Error(`turn13SandAttackPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

/** `battle-message-templates.json`'s own `statNames` table -- this module's own local `B_BUFF1` resolver, not added to the shared `battleStringResolver.ts` (a production file, out of this prep-scout's own one-staging-module contract). */
const STAT_NAMES = battleMessageTemplates.statNames as readonly { stat: string; name: string }[];
function statDisplayName(stat: string): string {
  const entry = STAT_NAMES.find((s) => s.stat === stat);
  if (!entry) throw new Error(`turn13SandAttackPresentationStaging: no statNames entry for ${stat}`);
  return entry.name;
}

/**
 * `reference/pokeemerald/src/battle_script_commands.c:7040-7053` -- the
 * `B_BUFF2` text ChangeStatBuffs itself builds for a decrease: "harshly
 * fell!" for a real magnitude-2 change, else a bare "fell!". Derived here
 * from the emitted `stat-stage-change` event's own `from`/`to` fields, same
 * "computable from the real event payload, not re-guessed" class
 * `turn6FeatherDancePresentationStaging.ts`'s own `statFellBuff2` already
 * established (duplicated here, not imported, per this prep-scout's own
 * one-staging-module contract -- no shared production helper exists yet).
 */
function statFellBuff2(from: number, to: number): string {
  const magnitude = Math.abs(to - from);
  return magnitude >= 2 ? "harshly fell!" : "fell!";
}

const PROGRAM = loadBattleScriptProgram();
/**
 * `reference/pokeemerald/data/battle_scripts_1.s:528-530` -- SAND_ATTACK's
 * own EFFECT_ACCURACY_DOWN dispatch-table entry point (see this module's own
 * top-of-file doc for why this label, not the shared `BattleScript_
 * EffectStatDown` trunk directly, is correct here).
 */
const ENTRY_LABEL = "BattleScript_EffectAccuracyDown";
/** src/data/gen/moves.json MOVE_SAND_ATTACK -- the real move this window's own kickoff+accuracy-drop phase uses. */
const MOVE_SAND_ATTACK = 28;
/** src/data/gen/species-names.json array index (== the real numeric species id). */
const SPECIES_ONIX = 95;
const SPECIES_PIDGEOTTO = 17;
/**
 * This session's own live `tools/probe/ram-probe.py` run (spec extended
 * locally with `statStages[STAT_ACC]` watch columns) against
 * `tools/probe/specs/turn13-rng-watch.json`'s own committed button script:
 * `gRngValue` flat at 2173905089 through tick 15429, committing to
 * 2287569056 at tick 15430 (SAND_ATTACK's own accuracy roll) -- this is the
 * SEED entering that roll, not the value after it, verified round-trip by
 * this module's own test (`advanceRngValue(2173905089) === 2287569056`).
 */
const STAGED_RNG_SEED = 2173905089;
/** This session's own live probe, ticks 15374-15429 (docs/turn13-notes.md §3's own table, HP column). */
const ONIX_HP = 4;
const PIDGEOTTO_HP = 16;
const STAT_ACC_INDEX = 6;

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

export type Turn13SandAttackHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Pidgeotto's own final RNG value after exactly 1 real accuracy-check call. */
  rngValueAfter: number;
  rngCalls: number;
  /** Onix's own final accuracy stat stage -- confirms the real 6 -> 5 transition. */
  accStageAfter: number;
}>;

/**
 * Runs Pidgeotto's own real turn-13 SAND_ATTACK use against Onix (16/4 real
 * HP, real stats, real pre-move stat stages -- ATK floored, accuracy
 * neutral) from `BattleScript_EffectAccuracyDown` to the script's own `end`,
 * returning every semantic event the registered opcodes emitted along the
 * way. Same "kernel runs at staging time; presentation reads the event
 * list" architecture every sibling module establishes. Pure: no shared/
 * global state, no RNG or rules mutation outside this call's own local
 * machine instance.
 */
export function stageTurn13SandAttackHitChain(): Turn13SandAttackHitChainResult {
  const onix = battler({
    side: 0,
    hp: ONIX_HP,
    species: SPECIES_ONIX,
    attack: 51,
    defense: 187,
    spAttack: 36,
    spDefense: 72,
    types: ["TYPE_ROCK", "TYPE_GROUND"],
    moves: [157, 20, 225, 201], // ROCK_SLIDE, BIND, DRAGON_BREATH, SANDSTORM (docs/turn13-notes.md §3)
    pp: [0, 19, 19, 10],
    statStages: [6, 0, 6, 6, 6, 6, 6, 6], // ATK floored (index 1 = 0); everything else, including ACC (index 6), neutral entering
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
    moves: [332, 98, 297, MOVE_SAND_ATTACK], // AERIAL_ACE, QUICK_ATTACK, FEATHER_DANCE, SAND_ATTACK
    pp: [18, 29, 11, 15],
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [onix, pidgeotto, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 1, target: 0, effectBattler: null, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_SAND_ATTACK,
    currentMovePosition: 3,
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
        accStageAfter: stepped.state.rulesContext.battlers[0]!.statStages[STAT_ACC_INDEX]!,
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn13SandAttackPresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn13SandAttackPresentationStaging: staged SAND_ATTACK chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn13SandAttackPresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * The PC-to-window bridge (`docs/presentation-seam-scout.md` §12.3 step 1)
 * applied UNCHANGED to this staged run: extracts SAND_ATTACK's own kickoff's
 * message + accuracy-drop + stat-fell content purely from provenance, never
 * a turn number. This IS the "does the existing bridge resolve this shape"
 * question, answered by direct call, not by argument.
 */
export function resolveTurn13SandAttackWindowContent(): FeatherDanceKickoffPresentationWindowContent {
  const { events } = stageTurn13SandAttackHitChain();
  const content = resolveFeatherDanceKickoffPresentationWindowContent(events);
  if (!content) {
    throw new Error(
      "turn13SandAttackPresentationStaging: staged hit chain did not produce this window's own expected event triad",
    );
  }
  return content;
}

/**
 * `TURN13_SANDATTACK_LINE1`/`LINE2`'s real content ("Foe PIDGEOTTO used
 * \nSAND-ATTACK!") -- mechanically identical mapping to every sibling
 * module's own attackstring row (`Cmd_attackstring` emits the fixed
 * `STRINGID_USEDMOVE` regardless of which move is used), re-derived here
 * from THIS staged run's own real event stream via
 * `resolveTurn13SandAttackWindowContent` above (not merely asserted by
 * analogy).
 */
export function resolveTurn13SandAttackKickoffLines(): readonly string[] {
  const content = resolveTurn13SandAttackWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_PIDGEOTTO) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_SAND_ATTACK),
  });
}

/**
 * `TURN13_ACCFELL_LINE1`/`LINE2`'s real content ("ONIX’s accuracy\nfell!")
 * -- `STRINGID_DEFENDERSSTATFELL`'s own template
 * (`{B_DEF_NAME_WITH_PREFIX}'s {B_BUFF1}\n{B_BUFF2}`) resolved against this
 * staged run's own real `stat-stage-change` event (battler 0/ONIX, ACC,
 * 6 -> 5): `B_DEF_NAME_WITH_PREFIX` is ONIX's own player-side name (no "Foe "
 * prefix, matching this window's own already-committed literal), `B_BUFF1`
 * is `statNames`'s own "accuracy" entry (already lowercase in the committed
 * asset, no new extraction needed), `B_BUFF2` is `statFellBuff2`'s own
 * magnitude-1 "fell!" case (not "harshly fell!" -- SAND_ATTACK drops only 1
 * stage, unlike FEATHER_DANCE's 2).
 */
export function resolveTurn13AccFellLines(): readonly string[] {
  const content = resolveTurn13SandAttackWindowContent();
  return resolveBattleStringLines(content.statFellMessage.messageId, {
    B_DEF_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF1: () => statDisplayName("STAT_ACC"),
    B_BUFF2: () => statFellBuff2(content.statChange.from, content.statChange.to),
  });
}
