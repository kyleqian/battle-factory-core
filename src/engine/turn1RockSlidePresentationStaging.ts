/**
 * Presentation-seam retirement, window 2 (ISSUES #39/#41,
 * `docs/presentation-seam-scout.md` §8): mirrors
 * `turn5FaintPresentationStaging.ts`'s pattern -- stage a real hit chain
 * through the registered kernel opcodes and capture its own semantic event
 * stream -- for `turn1-rockslide.json`
 * (`drawRockSlideWindow`/`drawRockSlideAttack`, `battleScene.ts`), the
 * checkpoint's second converted window.
 *
 * Wired into `battleScene.ts` via `resolveTurn1RockSlideWindowLines`/the
 * `hp-change` endpoints below (see `presentationEventWindowBridge.ts`'s
 * `resolveRockSlidePresentationWindowContent`).
 *
 * Ground truth, not fabricated: species/stats are Onix's and Grovyle's real
 * level-50 battle stats (`tests/damageCalc.test.ts`'s own RAM-pinned
 * `ONIX`/`GROVYLE` blocks, matching `turn5FaintPresentationStaging.ts`'s own
 * copies). Grovyle's HP (143) is turn 1's own real pre-hit value
 * (`battle1-turn1-ram-dump.json`'s `before_turn.battler1.hp`). The move IS
 * the real MOVE_ROCK_SLIDE (id 157), not a substituted move: PROGRESS #442's
 * `ppreduce` Pressure fix retired the barrier that forced
 * `turn5FaintPresentationStaging.ts` to substitute MOVE_STRENGTH
 * (`tests/battleScriptHitChainOpcode.test.ts`'s own "RUNG 1 leverage: ROCK_SLIDE
 * ... now walks the full hit chain" test, :2050-2125, proves this in singles
 * with no Pressure on either battler -- the same shape reused here).
 *
 * **The RNG seed (3485459011) is turn 1's own real recorded value**, not a
 * borrowed or found-to-work one: `battle1-turn1-ram-dump.json`'s own
 * `rngLedger[0].fromValue` (the ledger's very first tracked step, tick 2310)
 * -- DOUBLE_TEAM's own EFFECT_EVASION_UP route draws zero RNG (proven by
 * `tests/battleScriptStatbuffchangeOpcode.test.ts`'s "Double Team" case), so
 * the turn's ledger begins exactly where Onix's ROCK_SLIDE hit chain starts
 * rolling. Verified live this session (not guessed): staging this exact seed
 * consumes exactly 4 RNG calls, ending at rngValue 3326091607 -- byte-
 * identical to `rngLedger`'s own 4th entry's `toValue` (tick 2565, where the
 * ledger's own big gap to the next entry begins) -- and computes Grovyle's
 * HP as 143 -> 101, byte-identical to `before_turn`/`after_turn.battler1.hp`.
 * This is the real turn 1 roll, reproduced by the real formula, not "a
 * different, still-real, roll" as an earlier revision of this module used.
 * `moveEffectByte: 0` (the rules-context default) keeps `seteffectwithchance`
 * on its deterministic "no secondary effect" path
 * (`battleScriptHitChainOpcode.ts`'s own `rolledSuccess &&
 * rulesContext.moveEffectByte !== 0` guard) regardless of its RNG roll, so
 * this staged run never reaches `applySetMoveEffect`'s flinch-family
 * `unsupported-branch` (EFFECT_FLINCH_HIT's own MOVE_EFFECT_FLINCH=8 is not
 * in `STAT_MOVE_EFFECT_TABLE`) -- deliberately, so this Tier-1 test cannot
 * move the ratchet's barrier-count pins.
 */
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import { loadBattleScriptProgram, type BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandlers,
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
  if (!entry) throw new Error(`turn1RockSlidePresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
const ENTRY_LABEL = "BattleScript_HitFromAtkCanceler";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_ROCK_SLIDE -- the real move this window uses, not a substitute. */
const MOVE_ROCK_SLIDE = 157;
/** src/data/gen/moves.json MOVE_DOUBLE_TEAM -- the turn-kickoff phase's own real move (Grovyle's own evasion-rise). */
const MOVE_DOUBLE_TEAM = 104;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching turn5FaintPresentationStaging.ts. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** battle1-turn1-ram-dump.json's own rngLedger[0].fromValue -- turn 1's own real recorded RNG seed, see module doc. */
const STAGED_RNG_SEED = 3485459011;
/** battle1-turn1-ram-dump.json's before_turn.battler1.hp -- turn 1's own real pre-hit Grovyle HP. */
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
    partyIndex: changes.partyIndex ?? 0,
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

export type Turn1RockSlideHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Grovyle HP -- confirms the survive-not-faint shape this window's own real turn 1 has (143 -> 101, never 0). */
  targetHpAfter: number;
  /** Stable battle identity/max-HP fields carried by the normalized kernel battler. */
  opponent: Readonly<{ species: number; level: number; maxHP: number }>;
}>;

/**
 * Reusable single-hit staging seam. `BattleScript_HitFromAtkCanceler`
 * is the common source entry for ordinary damaging moves
 * (`data/battle_scripts_1.s:236-260`); the move row, normalized battlers,
 * move-effect byte, and RNG cursor determine the concrete semantic stream.
 * Keeping this helper here preserves the already-proven controller
 * acknowledgement loop while letting sibling presentation windows consume
 * the same source program without copying a turn-specific interpreter.
 */
export type StagePlayerHitChainInput = Readonly<{
  attacker: Partial<BattleScriptRulesBattler>;
  target: Partial<BattleScriptRulesBattler>;
  currentMove: number;
  currentMovePosition: 0 | 1 | 2 | 3;
  moveEffectByte: number;
  rngSeed: number;
  /**
   * ISSUES #39 rank-2 switch-in half: optional real party-by-side bench,
   * threaded straight into `createBattleScriptRulesContext`'s own `party`
   * input. Omitted (every pre-existing caller) keeps the default empty
   * party -- this hit chain's own damage/faint script never reads `party`
   * itself, only a later, separately-staged `HandleFaintedMonActions` run
   * does (`turn13ResolutionAdapter.ts`).
   */
  party?: BattleScriptRulesContextInput["party"];
  /**
   * ISSUES #39 rank-2 switch-in half: optional battle topology (chiefly
   * `battleTypeFlags`), threaded straight into `createBattleScriptRulesContext`.
   * Omitted (every pre-existing caller) keeps the default `{battlersCount: 2,
   * battleTypeFlags: 0}` -- a later `HandleFaintedMonActions` chain needs the
   * real `BATTLE_TYPE_FACTORY` bit (`Cmd_getexp`'s own Frontier short-circuit
   * gate, `battleScriptGetexpOpcode.ts`), which this hit chain's own damage/
   * faint script never reads.
   */
  battleTopology?: BattleScriptRulesContextInput["battleTopology"];
}>;

export type StagedPlayerHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  rngValueAfter: number;
  attacker: BattleScriptRulesBattler;
  target: BattleScriptRulesBattler;
}>;

export type StagedPlayerHitChainMachineState = Readonly<{
  program: BattleScriptProgram;
  handlers: BattleScriptOpcodeHandlers<BattleScriptRulesContext>;
  state: BattleScriptMachineState<BattleScriptRulesContext>;
}>;

/**
 * ISSUES #39 rank-2 switch-in half: additive sibling to `stagePlayerHitChain`
 * exposing the FULL terminal `BattleScriptMachineState` (program/handlers/
 * rulesContext) this hit chain halted at, not just the reduced `{events,
 * rngValueAfter, attacker, target}` projection -- the shape
 * `runBattleScriptFaintedActionsOrchestration` needs to keep staging
 * straight into the forced-switch dance from where a move script's own
 * `end` left off (`docs/faint-outcome-ground-truth.md` §3.1). Every
 * pre-existing caller keeps using `stagePlayerHitChain` below unchanged --
 * it now just projects this same terminal state down to its own reduced
 * view, same computation either way.
 */
export function stagePlayerHitChainToTerminalMachineState(
  input: StagePlayerHitChainInput,
): StagedPlayerHitChainMachineState {
  const attacker = battler({ ...input.attacker, side: 0 });
  const target = battler({ ...input.target, side: 1 });
  const rulesContext = createBattleScriptRulesContext({
    battlers: [attacker, target, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: input.currentMove,
    currentMovePosition: input.currentMovePosition,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: input.moveEffectByte,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: input.party,
    battleTopology: input.battleTopology,
  });

  const execution = createBattleScriptStatusRulesExecution(
    PROGRAM,
    ENTRY_LABEL,
    rulesContext,
    input.rngSeed,
    externalPorts(),
  );
  let state = execution.state;
  for (let budget = 0; budget < 512; budget += 1) {
    const stepped = stepBattleScriptMachine(PROGRAM, state, execution.handlers);
    if (stepped.kind === "halted" && stepped.state.haltReason?.kind === "terminal") {
      return Object.freeze({ program: PROGRAM, handlers: execution.handlers, state: stepped.state });
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error(
          "stagePlayerHitChainToTerminalMachineState: Battle Script blocked without a safe controller acknowledgement "
            + JSON.stringify(stepped.reason),
        );
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `stagePlayerHitChainToTerminalMachineState: staged hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error(
    "stagePlayerHitChainToTerminalMachineState: staged hit chain did not reach its own script end in budget",
  );
}

export function stagePlayerHitChain(
  input: StagePlayerHitChainInput,
): StagedPlayerHitChainResult {
  const { state } = stagePlayerHitChainToTerminalMachineState(input);
  return Object.freeze({
    events: state.events,
    rngValueAfter: state.rng.value,
    attacker: state.rulesContext.battlers[0],
    target: state.rulesContext.battlers[1],
  });
}

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
  const result = stagePlayerHitChain({
    attacker: {
      hp: 143,
      species: SPECIES_ONIX,
      attack: 51,
      defense: 187,
      spAttack: 36,
      spDefense: 72,
      types: ["TYPE_ROCK", "TYPE_GROUND"],
      moves: [MOVE_ROCK_SLIDE, 0, 0, 0],
      pp: [10, 0, 0, 0],
    },
    target: {
      hp: GROVYLE_PRE_HIT_HP,
      species: SPECIES_GROVYLE,
      attack: 103,
      defense: 56,
      spAttack: 91,
      spDefense: 71,
      types: ["TYPE_GRASS", "TYPE_GRASS"],
    },
    currentMove: MOVE_ROCK_SLIDE,
    currentMovePosition: 0,
    moveEffectByte: 0,
    rngSeed: STAGED_RNG_SEED,
  });
  return {
    events: result.events,
    targetHpAfter: result.target.hp,
    opponent: Object.freeze({
      species: result.target.species!,
      level: result.target.level!,
      maxHP: result.target.maxHP!,
    }),
  };
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
 * The PC-to-window bridge (docs/presentation-seam-scout.md §8.3) applied to
 * this staged run: extracts the ROCK_SLIDE attack's own message + HP-drain
 * content purely from provenance, never a turn number.
 */
export function resolveTurn1RockSlideWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn1RockSlideHitChain();
  const content = resolveRockSlidePresentationWindowContent(events);
  if (!content) {
    throw new Error("turn1RockSlidePresentationStaging: staged hit chain did not produce the ROCK_SLIDE window's own event pair");
  }
  return content;
}

/**
 * `ROCK_SLIDE_LINE1`/`LINE2`'s real content: `STRINGID_USEDMOVE` resolved
 * with Onix (player side, no "Foe " prefix per `HANDLE_NICKNAME_STRING_CASE`)
 * as `B_ATK_NAME_WITH_PREFIX` and MOVE_ROCK_SLIDE's own display name as
 * `B_BUFF2` (`resolveMoveNameExclaim`).
 */
export function resolveTurn1RockSlideAttackLines(): readonly string[] {
  const content = resolveTurn1RockSlideWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "player", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_ONIX) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_ROCK_SLIDE),
  });
}

/** Grovyle's real turn-1 pre-hit/post-hit HP (143 -> 101) -- the RAM-dump reads `drawRockSlideAttack` stops needing. */
export function resolveTurn1RockSlideHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn1RockSlideWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}

/**
 * `TURN_KICKOFF_LINE1`/`LINE2`'s real content. Not independently staged
 * (Grovyle's own DOUBLE_TEAM hit chain is a different entry point,
 * `BattleScript_EffectEvasionUp`, proven separately by
 * `tests/battleScriptStatbuffchangeOpcode.test.ts`'s "Double Team" case) --
 * `Cmd_attackstring` emits the identical fixed `STRINGID_USEDMOVE` messageId
 * regardless of which move is used (`battleScriptHitChainOpcode.ts:754-757`),
 * so the mechanism proof carries over without restaging it here (matching
 * docs/presentation-seam-scout.md §8.3's own "mechanically identical
 * mapping" finding). Grovyle is the opponent side, so `B_ATK_NAME_WITH_PREFIX`
 * gets the real "Foe " prefix.
 */
export function resolveTurn1DoubleTeamKickoffLines(): readonly string[] {
  return resolveBattleStringLines("STRINGID_USEDMOVE", {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_GROVYLE) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_DOUBLE_TEAM),
  });
}
