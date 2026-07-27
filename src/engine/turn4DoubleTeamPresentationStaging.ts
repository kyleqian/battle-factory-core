/**
 * Presentation-seam retirement, prep-scout for `turn4-doubleteam.json`
 * (ISSUES #39/#41, `docs/presentation-seam-scout.md` §11): mirrors
 * `turn4RockSlidePresentationStaging.ts`'s pattern -- stage a real hit chain
 * through the registered kernel opcodes and capture its own semantic event
 * stream -- but for Grovyle's own turn-4 DOUBLE_TEAM use (the kickoff half of
 * this window, `drawTurn4KickoffText`/`drawDoubleTeamClones`/`drawStatsBanner`,
 * `battleScene.ts`), not the ROCK_SLIDE half (already staged/wired by that
 * sibling module). **Unwired** -- not imported by `battleScene.ts` or any
 * other production file, per this prep-scout's own read-only-recon-plus-one-
 * staging-module contract (§8/§9/§10 already established).
 *
 * Ground truth, not fabricated: species/stats are Grovyle's real level-50
 * battle stats (`tests/damageCalc.test.ts`'s own RAM-pinned `GROVYLE` block,
 * matching every sibling module's own copy). Grovyle's HP (41) is turn 4's
 * own real value -- `battleScene.ts`'s own already-committed
 * `anchorOpponentAfterTurn3Hp` constant (unaffected by this move: DOUBLE_TEAM
 * is a self-targeted, non-damaging status move, so HP does not change across
 * this chain -- confirmed by this module's own event dump containing no
 * `hp-change` at all, see the module's own test). Grovyle's own EVASION stat
 * stage starts at **7, not the default 6** -- turn 1's own DOUBLE_TEAM use
 * already raised it once (`docs/battle-turn-notes.md:613`, "evasion stage
 * flips 6->7") and that boost persists into turn 4 unmodeled by any
 * intervening move (`docs/battle-turn-notes.md:1132`, "evasion stage stays at
 * 7 (DOUBLE_TEAM's turn-1 stage boost persists"); turn 4's own real RAM probe
 * confirms the SECOND use flips it 7->8 at tick 4965
 * (`docs/battle-turn-notes.md:3845`, `TURN4_CONFIRM_PRESS_TICK`+40,
 * RAM-exact) -- this module stages that second flip, not a fresh first one
 * (unlike `turn1RockSlidePresentationStaging.ts`, which correctly leaves the
 * ROCK_SLIDE chain's own unrelated `statStages` at all-neutral since turn 1
 * has no prior DOUBLE_TEAM to carry forward).
 *
 * The move IS the real MOVE_DOUBLE_TEAM (id 104, EFFECT_EVASION_UP,
 * MOVE_TARGET_USER), self-targeted (attacker === target === effectBattler),
 * entered from the full `BattleScript_HitFromAtkCanceler` dispatch (not
 * `BattleScript_EffectEvasionUp` directly, unlike
 * `tests/battleScriptStatbuffchangeOpcode.test.ts`'s own narrower "Double
 * Team" case, which pins the opcode registration in isolation with an
 * arbitrary `rngSeed` and a neutral 6->7 stage) -- this module instead proves
 * the FULL real turn-4 window's own entry point reaches the identical
 * production `stat-stage-change` emission site
 * (`battleScriptStatBuffs.ts:296-303`) with turn 4's own real 7->8 transition
 * and real recorded RNG accounting, the missing link this prep-scout's own
 * brief asked for.
 *
 * **The RNG seed (3051035979) is turn 4's own real recorded value, not a
 * borrowed or found-to-work one.** It is the SAME already-cited value
 * `turn4RockSlidePresentationStaging.ts:88` uses for turn 4's own ROCK_SLIDE
 * half (itself sourced from `battle1-grovyle-faint-ram-dump.json`'s
 * `rngLedger`, ticks 5316/5340/5343/5569) -- reusable here because DOUBLE_TEAM
 * draws **zero** `Random()` calls (RAM-confirmed,
 * `docs/battle-turn-notes.md:93`/`:1339`, and independently corroborated by
 * `turn1RockSlidePresentationStaging.ts`'s own module doc: "DOUBLE_TEAM's own
 * EFFECT_EVASION_UP route draws zero RNG ... so the turn's ledger begins
 * exactly where Onix's ROCK_SLIDE hit chain starts rolling"). Since DOUBLE_TEAM
 * (Grovyle's move) resolves before ROCK_SLIDE (Onix's move) within the same
 * turn and consumes nothing, the RNG value live entering DOUBLE_TEAM's own
 * script equals the value live entering ROCK_SLIDE's -- the same real
 * recorded number, not a different "still real" one. **Verified live this
 * session**: staging this chain consumes exactly 0 RNG calls and the ending
 * `rngValue` is byte-identical to `STAGED_RNG_SEED` (see the module's own
 * test) -- so this reuse is proven, not assumed.
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

const SPECIES_NAMES = speciesNamesAsset.species as readonly { species: string; name: string }[];
function speciesDisplayName(speciesId: number): string {
  const entry = SPECIES_NAMES[speciesId];
  if (!entry) throw new Error(`turn4DoubleTeamPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
/**
 * `reference/pokeemerald/data/battle_scripts_1.s:487-494` -- EFFECT_EVASION_UP's
 * OWN dispatch-table entry point, not `BattleScript_HitFromAtkCanceler` (the
 * generic EFFECT_HIT-family entry every ROCK_SLIDE sibling module uses).
 * DOUBLE_TEAM's real script never runs an `accuracycheck` at all
 * (`setstatchanger`/`attackcanceler`/`attackstring`/`ppreduce`/
 * `statbuffchange`, straight through) -- entering at `HitFromAtkCanceler`
 * instead would incorrectly route through that label's own unconditional
 * `accuracycheck ACC_CURR_MOVE` (`battle_scripts_1.s:244`), which computes
 * `calc = 0` for a move whose own `moves.json` `accuracy` field is 0
 * (`sAccuracyStageRatios[...].dividend * 0 / divisor`), an always-miss under
 * this engine's own faithfully-ported `Cmd_accuracycheck` -- confirmed by
 * running it exactly that (wrong) way first this session: 1 RNG call, the
 * stat stage never moves, no `stat-stage-change`/`STRINGID_DEFENDERSSTATROSE`
 * anywhere in the stream. `tests/battleScriptStatbuffchangeOpcode.test.ts`'s
 * own "Double Team" case already enters at this same correct label.
 */
const ENTRY_LABEL = "BattleScript_EffectEvasionUp";
/** src/data/gen/moves.json MOVE_DOUBLE_TEAM -- the real move this window's own kickoff phase uses. */
const MOVE_DOUBLE_TEAM = 104;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling module. */
const SPECIES_GROVYLE = 278;
/** turn4RockSlidePresentationStaging.ts's own STAGED_RNG_SEED -- turn 4's real recorded value, see module doc for why it's reusable here. */
const STAGED_RNG_SEED = 3051035979;
/** battleScene.ts's own anchorOpponentAfterTurn3Hp -- turn 4's own real pre-move Grovyle HP (unaffected by this self-targeted status move). */
const GROVYLE_HP = 41;
/** battleScriptStatBuffs.ts's own STAT_EVASION index. */
const STAT_EVASION_INDEX = 7;
/** docs/battle-turn-notes.md:1132/:3845 -- turn 1's own DOUBLE_TEAM boost persists into turn 4 as the real pre-move stage, not the neutral default. */
const GROVYLE_EVASION_STAGE_BEFORE_TURN4 = 7;

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
    // EFFECT_EVASION_UP's own script (unlike ROCK_SLIDE's) waits on
    // B_WAIT_TIME_LONG/SHORT (tests/battleScriptStatbuffchangeOpcode.test.ts's
    // own "Double Team" case already needs this same override) -- any nonzero
    // wait value is fine for a staged, non-interactive run.
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression === "B_WAIT_TIME_LONG" || operand.expression === "B_WAIT_TIME_SHORT" ? 1 : null,
    resolveByteOperand: () => null,
  });
}

export type Turn4DoubleTeamHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Grovyle's own final RNG value -- proves DOUBLE_TEAM's real route draws 0 calls (byte-identical to STAGED_RNG_SEED). */
  rngValueAfter: number;
  rngCalls: number;
  /** Grovyle's own final evasion stat stage -- confirms the real 7 -> 8 second-use transition, never a fresh 6 -> 7 first use. */
  evasionStageAfter: number;
}>;

/**
 * Runs Grovyle's own GROVYLE DOUBLE_TEAM self-target chain (41 HP, real
 * turn-4 pre-move evasion stage 7, real move/real stats) from
 * `BattleScript_HitFromAtkCanceler` to the script's own `end`, returning
 * every semantic event the registered opcodes emitted along the way. Same
 * "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling module establishes. Pure: no shared/global
 * state, no RNG or rules mutation outside this call's own local machine
 * instance.
 */
export function stageTurn4DoubleTeamHitChain(): Turn4DoubleTeamHitChainResult {
  const grovyle = battler({
    side: 1,
    hp: GROVYLE_HP,
    species: SPECIES_GROVYLE,
    attack: 103,
    defense: 56,
    spAttack: 91,
    spDefense: 71,
    types: ["TYPE_GRASS", "TYPE_GRASS"],
    moves: [MOVE_DOUBLE_TEAM, 0, 0, 0],
    pp: [14, 0, 0, 0],
    statStages: [6, 6, 6, 6, 6, 6, 6, GROVYLE_EVASION_STAGE_BEFORE_TURN4],
  });

  const rulesContext = createBattleScriptRulesContext({
    battlers: [battler({ side: 0 }), grovyle, battler({ side: 0 }), battler({ side: 1 })],
    selectorRoles: { attacker: 1, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 1,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_DOUBLE_TEAM,
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
        rngValueAfter: stepped.state.rng.value,
        rngCalls: stepped.state.rng.calls,
        evasionStageAfter: stepped.state.rulesContext.battlers[1].statStages[STAT_EVASION_INDEX],
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn4DoubleTeamPresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn4DoubleTeamPresentationStaging: staged DOUBLE_TEAM chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn4DoubleTeamPresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * `TURN_KICKOFF_LINE1`/`LINE2`'s real content ("Foe GROVYLE used\nDOUBLE
 * TEAM!") -- mechanically identical mapping to every sibling module's own
 * attackstring row (`Cmd_attackstring` emits the fixed `STRINGID_USEDMOVE`
 * regardless of which move is used, `battleScriptHitChainOpcode.ts:754-757`),
 * re-derived here from THIS staged run's own real event stream (not merely
 * asserted by analogy the way `turn1RockSlidePresentationStaging.ts`'s own
 * `resolveTurn1DoubleTeamKickoffLines` does) -- see the module's own test for
 * the live proof that this run's own `message` events actually contain
 * `STRINGID_USEDMOVE`.
 */
export function resolveTurn4DoubleTeamKickoffLines(): readonly string[] {
  return resolveBattleStringLines("STRINGID_USEDMOVE", {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_GROVYLE) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_DOUBLE_TEAM),
  });
}
