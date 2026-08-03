/**
 * Presentation-seam prep-scout, window 6 (`docs/presentation-seam-scout.md`
 * §13, §13.2): staging module for `turn2-endeavor.json`
 * (`drawTurn2KickoffText`'s ENDEAVOR-text branch, `battleScene.ts`). NOT
 * wired -- not imported by `battleScene.ts` or any production file, per this
 * checkpoint's own read-only-recon-plus-one-unwired-module contract.
 *
 * This window's real content is Grovyle's ENDEAVOR (opponent attacks
 * player) -- turn 2 is Grovyle's FIRST use of the move (turn 3 repeats it,
 * `turn3EndeavorPresentationStaging.ts` unwritten as of this session,
 * turn 5's own third use is already staged/wired,
 * `turn5EndeavorPresentationStaging.ts`). Same "kernel runs at staging time;
 * presentation reads the event list" architecture and the SAME
 * `BattleScript_EffectEndeavor` entry label every sibling ENDEAVOR module in
 * this family uses (`turn5EndeavorPresentationStaging.ts`'s own module doc
 * explains why: `attackstring`/`ppreduce` execute directly under this label,
 * no intervening `BattleScript_HitFromAtkString` sub-label exists in this
 * script) -- `resolveRockSlidePresentationWindowContent`'s existing
 * `attackStringScriptLabel` override parameter bridges this unchanged, ZERO
 * bridge edits needed, same finding turn 3's and turn 5's own ROCK_SLIDE/
 * ENDEAVOR modules already made independently.
 *
 * Ground truth, not fabricated: species/stats/types are Onix's and Grovyle's
 * real level-50 battle stats, byte-identical to every other staging module
 * in this file family (`tests/damageCalc.test.ts`'s own RAM-pinned `ONIX`/
 * `GROVYLE` blocks). Both HP endpoints are this window's own real anchors,
 * read fresh this session from `src/data/gen/battle1-turn2-ram-dump.json`'s
 * own committed `battlerSnapshots`: Onix (target) starts at 117 --
 * `before_turn2.battler0.hp` (`battleScene.ts`'s own `anchorPlayerBattler.hp`
 * literal read) -- and Grovyle (attacker) sits at 101 for this entire
 * window -- `battle1-turn1-ram-dump.json`'s own `after_turn.battler1.hp`
 * (`battleScene.ts`'s own `anchorOpponentAfterTurnHp`, Grovyle's real
 * post-turn-1-ROCK_SLIDE settle, unchanged until turn 2's own DRAGON_BREATH
 * half drains it further to 88 -- out of THIS window's own scope).
 * `setdamagetohealthdifference`'s own real formula (`target.hp - attacker.hp
 * = 117 - 101 = 16`) settles Onix at exactly 101 -- `battleScene.ts`'s
 * `anchorPlayerAfterTurnHp`, reproduced by the real formula, not copied.
 *
 * The RNG seed IS turn 2's own real recorded value, identified (not
 * guessed) from `battle1-turn2-ram-dump.json`'s own already-committed
 * `rngLedger` (9 entries, read fresh this session): the FIRST entry
 * (`atTick: 2983, fromValue: 4098214719, steps: 1, toValue: 2002721862`) is
 * the sole candidate for Grovyle's own ENDEAVOR accuracy roll -- 38 ticks
 * after this trace's real `TURN2_CONFIRM_PRESS_TICK` (2945, `battleScene.ts:
 * 6773`), a single `Random()` step, and the earliest roll in the whole
 * ledger (every later entry attributes cleanly to the turn's own DRAGON_
 * BREATH 4-roll group at 3121/3135/3161/3164, then turn-pass/AI-cluster
 * rolls from 3318 onward -- the same shapes `turn3RockSlidePresentationStaging
 * .ts`'s own module doc already established for this ledger family). Verified
 * live this session, not guessed: staging seed 4098214719 forward-steps
 * through the documented LCG (`next = 1103515245*seed + 24691 mod 2^32`) to
 * EXACTLY the ledger's own recorded `toValue` (2002721862) --
 * `tests/turn2EndeavorPresentationStaging.test.ts`'s own dedicated round-trip
 * assertion, not merely asserted by analogy. ENDEAVOR's own 100% accuracy
 * check can never fail regardless of seed (same fact `turn5Endeavor
 * PresentationStaging.ts`'s own module doc already notes for its own reused
 * seed), so the seed's only real job here is FIDELITY to the recorded
 * ledger, not correctness of the outcome.
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
  if (!entry) throw new Error(`turn2EndeavorPresentationStaging: no species-names.json entry at index ${speciesId}`);
  return entry.name;
}

const PROGRAM = loadBattleScriptProgram();
/** ENDEAVOR's own real entry label -- NOT the generic BattleScript_HitFromAtkCanceler every non-ENDEAVOR sibling module uses, see module doc. */
const ENTRY_LABEL = "BattleScript_EffectEndeavor";
const B_WAIT_TIME_LONG = 64;
/** src/data/gen/moves.json MOVE_ENDEAVOR -- the real move, id 283 (entry 464 registered its 3 blocking opcodes; already executable before this session, per turn5EndeavorPresentationStaging.ts). */
const MOVE_ENDEAVOR = 283;
/** src/data/gen/species-names.json array index (== the real numeric species id), matching every sibling staging module. */
const SPECIES_ONIX = 95;
const SPECIES_GROVYLE = 278;
/** battle1-turn2-ram-dump.json's own rngLedger[0].fromValue -- turn 2's real recorded seed entering Grovyle's ENDEAVOR accuracy roll, round-trip-verified against the ledger's own toValue (module doc, tests/turn2EndeavorPresentationStaging.test.ts). */
const STAGED_RNG_SEED = 4098214719;
/** battleScene.ts's anchorPlayerBattler.hp -- Onix's real before_turn2 HP, this window's own drain start. */
const ONIX_TARGET_HP = 117;
/** battleScene.ts's anchorOpponentAfterTurnHp -- Grovyle's real post-turn-1 HP, steady throughout this entire window (turn 2's own ENDEAVOR half; DRAGON_BREATH drains it further later, out of scope here). */
const GROVYLE_ATTACKER_HP = 101;

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

export type Turn2EndeavorHitChainResult = Readonly<{
  events: readonly BattleScriptSemanticEvent[];
  /** Final staged Onix HP -- ENDEAVOR's own real hp-difference formula (117 - 101 = 16 damage), settling at 101, matching battleScene.ts's anchorPlayerAfterTurnHp for real. */
  targetHpAfter: number;
  /** Stable max-HP field carried by the normalized kernel battler. */
  player: Readonly<{ maxHP: number }>;
}>;

/**
 * Runs the GROVYLE (side 1, attacker) -> ONIX (side 0, target) hit chain
 * from `BattleScript_EffectEndeavor` to the script's own `end`, using the
 * REAL MOVE_ENDEAVOR and turn 2's own real recorded RNG seed (module doc).
 * Same "kernel runs at staging time; presentation reads the event list"
 * architecture every sibling staging module in this file family uses. Pure:
 * no shared/global state, no RNG or rules mutation outside this call's own
 * local machine instance.
 */
export function stageTurn2EndeavorHitChain(): Turn2EndeavorHitChainResult {
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
      const player = stepped.state.rulesContext.battlers[0];
      return {
        events: stepped.state.events,
        targetHpAfter: player.hp,
        player: Object.freeze({ maxHP: player.maxHP }),
      };
    }
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgePendingControllers(state);
      if (acknowledged === state) {
        throw new Error("turn2EndeavorPresentationStaging: Battle Script blocked without a safe controller acknowledgement");
      }
      state = acknowledged;
      continue;
    }
    if (stepped.kind !== "advanced" && stepped.kind !== "scheduler-progressed") {
      throw new Error(
        `turn2EndeavorPresentationStaging: staged hit chain stopped unexpectedly (${stepped.kind}) `
          + "before its own script completed",
      );
    }
    state = stepped.state;
  }
  throw new Error("turn2EndeavorPresentationStaging: staged hit chain did not reach its own script end in budget");
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
 * `resolveRockSlidePresentationWindowContent`, passed this script's own real
 * attackstring label override (`ENTRY_LABEL`) -- the function's existing
 * override parameter, not a bridge edit, same reuse turn 5's own sibling
 * module already established.
 */
export function resolveTurn2EndeavorWindowContent(): RockSlidePresentationWindowContent {
  const { events } = stageTurn2EndeavorHitChain();
  const content = resolveRockSlidePresentationWindowContent(events, ENTRY_LABEL);
  if (!content) {
    throw new Error("turn2EndeavorPresentationStaging: staged hit chain did not produce the ROCK_SLIDE-shaped window's own event pair");
  }
  return content;
}

/**
 * `TURN_KICKOFF_LINE1`/`TURN2_KICKOFF_LINE2`'s real content: `STRINGID_USEDMOVE`
 * resolved with Grovyle (opponent side, real "Foe " prefix per
 * `HANDLE_NICKNAME_STRING_CASE`) as `B_ATK_NAME_WITH_PREFIX` and MOVE_ENDEAVOR's
 * own real display name as `B_BUFF2` -- "Foe GROVYLE used"/"ENDEAVOR!", the
 * real move name, byte-identical to `turn5EndeavorPresentationStaging.ts`'s
 * own `resolveTurn5EndeavorAttackLines` output (same attacker, same move --
 * this window's own kickoff text needs no NEW resolver work, only this
 * window's own real HP-chain/seed proof, per this checkpoint's own §13.2).
 */
export function resolveTurn2EndeavorAttackLines(): readonly string[] {
  const content = resolveTurn2EndeavorWindowContent();
  return resolveBattleStringLines(content.message.messageId, {
    B_ATK_NAME_WITH_PREFIX: () =>
      resolveBattleNameWithPrefix({ side: "opponent", isTrainerBattle: true, nickname: speciesDisplayName(SPECIES_GROVYLE) }),
    B_BUFF2: () => resolveMoveNameExclaim(MOVE_ENDEAVOR),
  });
}

/** Onix's real turn-2 ENDEAVOR drain endpoints (117 -> 101) -- the RAM-dump/hardcoded-literal reads `drawTurn2KickoffText`'s `endeavorHp` call stops needing. */
export function resolveTurn2EndeavorHpEndpoints(): Readonly<{ from: number; to: number }> {
  const content = resolveTurn2EndeavorWindowContent();
  return Object.freeze({ from: content.hp.from, to: content.hp.to });
}
