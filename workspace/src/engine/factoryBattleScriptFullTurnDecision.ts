/**
 * PROGRESS #449's own "Next": the composition capstone over everything
 * landed so far -- "decision -> both actions -> end-turn -> next decision
 * boundary," a genuine multi-turn cycle, built directly on
 * `runBattleEndTurnOrchestration` (no re-derivation of the field/battler
 * loop) and reusing the already-registered hit chain from the LITERAL
 * topology entry per move (census precedent, same mechanism
 * `factoryBattleScriptDecision.ts`'s asleep-move adapter already uses).
 *
 * Both sides' decisions enter through the EXISTING submission boundary
 * (`submitBattleDecision` + `BattleCommandRequest`, which already names
 * `side`/`battler`) -- no new shared boundary type. Source collects both
 * battlers' actions before computing turn order
 * (`HandleTurnActionSelectionState` gathers `gChosenActionByBattler[]` for
 * every battler before `SetActionsAndBattlersTurnOrder` ever runs,
 * `battle_main.c:4390-4420`/`:4757-4839`), so this reducer asks the player
 * first, then the trainer (test-supplied -- the AI port is a later step,
 * `docs/factory-ai-ground-truth.md`), and only then resolves the turn.
 *
 * **Action order:** `GetWhoStrikesFirst`/`SetActionsAndBattlersTurnOrder`
 * (`battle_main.c:4595-4839`) ported verbatim already in `turnOrder.ts`
 * (priority bracket, then effective speed, then the speed-tie
 * `Random() & 1` roll at `battle_main.c:4728/4745`) -- reused here, not
 * re-derived. `gBattleMons[].speed` needed a home in
 * `BattleScriptRulesContext` (PROGRESS #449's own named gap); added as a
 * `maxHP`-precedent defaulted field in the same commit as this module.
 *
 * **Second-action skip:** in singles, ANY fainted-actions fork triggered by
 * the first action -- terminal (`gBattleOutcome != 0`) OR the non-terminal
 * forced-switch dance -- cancels the second action, not just the terminal
 * case. Two distinct source mechanisms converge on the same rule:
 *  - Terminal: `RunTurnActionsFunctions` (`battle_main.c:4937-4943`) forces
 *    `gCurrentActionFuncId = B_ACTION_FINISHED` once `gBattleOutcome != 0`,
 *    skipping the second mover's own move dispatch entirely.
 *  - Non-terminal (forced switch): `BattleScript_HandleFaintedMon`'s own
 *    tail, `switchineffects BS_FAINTED` followed immediately by
 *    `cancelallactions` (`data/battle_scripts_1.s:2893-2895`, singles-only
 *    -- doubles takes an earlier `jumpifbattletype BATTLE_TYPE_DOUBLE`
 *    branch around it), sets every `gActionsByTurnOrder[i]` to
 *    `B_ACTION_CANCEL_PARTNER`, cancelling the still-pending second action
 *    the same turn. `cancelallactions` is already a registered opcode
 *    (`battleScriptSwitchinOpcode.ts`) reached by the existing forced-switch
 *    chain.
 * Either way `gBattleOutcome` gates whether `runBattleEndTurnOrchestration`
 * (the `BattleTurnPassed` port) itself still runs: `sEndTurnFuncsTable`
 * (`battle_main.c:554-565`) only reaches index 0 (`HandleEndTurn_
 * ContinueBattle`, which sets `gBattleMainFunc = BattleTurnPassed`) when
 * `gBattleOutcome === 0` -- so a terminal first action skips end-turn
 * orchestration entirely (this reducer reports the terminal boundary
 * immediately), while a non-terminal forced switch still reaches it (the
 * cancelled second action doesn't gate `BattleTurnPassed`, only
 * `gBattleOutcome` does).
 *
 * Both sides publish one legal decision for every nonzero moveset slot. The
 * same source-shaped GetMoveTarget port owns both singles requests, including
 * user-targeting moves, so initial and subsequent turns cannot drift.
 */
import {
  createBattleState,
  submitBattleDecision,
  type BattleBoundary,
  type BattleDecisionReducer,
  type BattleDecisionReducerContext,
  type BattleDecisionReducerOutput,
  type BattleDecisionRng,
  type BattleDecisionSubmission,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleCommandDecision,
  type BattleMoveDecision,
  type BattleMoveSlot,
  type BattlePartyIndex,
  type BattleSinglesBattler,
  type BattleSwitchDecision,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import { handleBattleActionFinished } from "./battleActionFinished.ts";
import { swapBattleScriptBattlerMoves } from "./battleMoveSwitching.ts";
import {
  battleScriptForcedMoveSelection,
  checkBattleScriptMoveLimitations,
  describeIllegalMoveSelection,
  type BattleScriptSelectionRejection,
} from "./battleScriptActionAdmission.ts";
import { battleStringReferencesToken, resolveBattleNameWithPrefix, resolveMoveName } from "./battleStringResolver.ts";
import {
  unsupportedBranch,
  withBattler,
} from "./battleScriptHitChainOpcode.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptRngState,
  createBattleScriptSchedulerState,
  stepBattleScriptMachine,
  transitionBattleScriptCommand,
  type BattleScriptMachineState,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
  firstInstructionWithOpcodeName,
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  resumeBattleScriptFaintedActionsAfterPlayerChoice,
  runBattleScriptFaintedActionsOrchestration,
} from "./battleScriptFaintedActionsOrchestration.ts";
import {
  resumeBattleEndTurnAfterFaintedActions,
  runBattleEndTurnOrchestration,
  turnOrderBattlerInputs,
  turnOrderWeather,
  type BattleEndTurnResult,
} from "./battleEndTurnOrchestration.ts";
import { getWhoStrikesFirst, isSpeedTie } from "./turnOrder.ts";
import { TYPE_DISPLAY_NAMES } from "./fightSubmenuText.ts";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_PARTY_SIZE,
  createBattleScriptRulesContext,
  uniformBattleScriptIvs,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "./battleScriptSourceConstants.ts";
import { isFactoryAiSwitchPrecheckBlocked } from "./factoryAiSwitchPolicy.ts";
import { voluntarySwitchTrap } from "./battleSwitchTrap.ts";
import { drawBattleScriptSelectedMoveTarget } from "./battleScriptSwitchinOpcode.ts";
import { mapFactoryBattleOutcome } from "./factoryBattleScriptTerminalDecision.ts";
import { battleCommandSpeciesDisplayName } from "./battleCommandPresentation.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import abilityItemHooksData from "../data/gen/ability-item-hooks.json" with { type: "json" };
import summaryInfoData from "../data/gen/summary-info.json" with { type: "json" };
import { resolveSingleBattlePosition } from "./battleScriptBattlerPositions.ts";

const ADAPTER = "factory-full-turn/v1";
const B_WAIT_TIME_LONG = 64;
const B_WAIT_TIME_SHORT = 32;
/** Real per-script instruction ceiling, matching battleEndTurnOrchestration.ts's own bump for the DoTurnDmg-family scripts' controller round trips. */
const SCRIPT_BUDGET = 256;
/** Controller/message waits are resumptions of one source opcode, not new opcodes. */
const SCRIPT_YIELD_BUDGET = 4_096;

type MoveRow = Readonly<{
  id: number;
  priority: number;
  target: readonly string[];
}>;
type TopologyMoveRow = Readonly<{ id: number; entryScript: string }>;

const MOVES_BY_ID = new Map(
  (movesData.moves as readonly MoveRow[]).map((move) => [move.id, move]),
);
const TOPOLOGY_BY_MOVE = new Map(
  (topologyData.moves as readonly TopologyMoveRow[]).map((move) => [move.id, move]),
);
const FACTORY_ITEM_NAME_BY_ID = new Map(
  (frontierHeldItemsData.entries as readonly Readonly<{ itemId: number; displayName: string }>[]).map(
    ({ itemId, displayName }) => [itemId, displayName],
  ),
);
type AbilitySymbolIdRow = Readonly<{ name: string; id: number }>;
type AbilitySummaryRow = Readonly<{ name: string; description: string }>;

/** Source-extracted `ABILITY_*` IDs joined to exact Emerald `gAbilityNames` display text. */
const ABILITY_DISPLAY_NAME_BY_ID = new Map(
  (abilityItemHooksData.universes.abilities as readonly AbilitySymbolIdRow[]).map(({ id, name }) => [
    id,
    (summaryInfoData.abilities as Readonly<Record<string, AbilitySummaryRow>>)[name]?.name,
  ]),
);

export function resolveFactoryAbilityDisplayName(ability: number): string {
  const name = ABILITY_DISPLAY_NAME_BY_ID.get(ability);
  if (name === undefined) {
    throw new Error(`prepareMessage: no display name mapped for ability ${ability}`);
  }
  return name;
}
const PROGRAM = loadBattleScriptProgram();
const NEUTRAL_STAT_STAGES = Object.freeze([6, 6, 6, 6, 6, 6, 6, 6] as const);
const ZERO_STAT_STAGES = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0] as const);
const ZERO_IVS = uniformBattleScriptIvs(0);
/** GetFactoryMonFixedIV(challenge 0, non-final) => sFixedIVTable[0][0] = 3. */
const FACTORY_FIRST_CHALLENGE_IVS = uniformBattleScriptIvs(3);
/** include/constants/abilities.h: exact identity constants used by the cited source gates below. */
const ABILITY_KEEN_EYE = 51;
const ABILITY_RUN_AWAY = 50;
/** include/constants/moves.h. */
const MOVE_PURSUIT = 228;
const MOVE_FOCUS_PUNCH = 264;
/** include/battle.h:27-39 -- the action-kind globals gChosenActionByBattler/gActionsByTurnOrder carry. */
const B_ACTION_USE_MOVE = 0;
/** include/constants/battle.h B_ACTION_SWITCH. */
const B_ACTION_SWITCH = 2;
const B_ACTION_TRY_FINISH = 11;
/** include/battle.h:39-40 -- B_ACTION_CANCEL_PARTNER == B_ACTION_FINISHED. */
const B_ACTION_CANCEL_PARTNER = 12;

/**
 * Run Away is an honest Factory no-op at this adapter's decision boundary.
 *
 * Source order matters:
 * - `battle_main.c:4322-4339` intercepts a Factory trainer RUN as a forfeit
 *   confirmation before calling `IsRunningFromBattleImpossible`; therefore
 *   its `ABILITY_RUN_AWAY` check at `battle_main.c:4038` is not RUN-menu
 *   legality for this mode.
 * - After confirmation, `battle_util.c:427-448` does reach the Run Away
 *   branch before its generic Frontier-trainer success branch. However,
 *   `battle_main.c:5058-5062` maps every such Factory RUN to
 *   `B_OUTCOME_FORFEITED` before consulting `fleeType`.
 *
 * This kernel models the battle command surface, not the surrounding forfeit
 * UI: `BattleCommandDecision` intentionally contains only use-move/switch.
 * Keeping the identity here pins why Run Away must neither add a flee command
 * nor bypass the separate voluntary-switch trapping gate below.
 */
export const FACTORY_RUN_AWAY_NOOP_INVARIANT = Object.freeze({
  abilityId: ABILITY_RUN_AWAY,
  battleTypeFlags: BATTLE_SCRIPT_BATTLE_TYPE_TRAINER | BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  legalDecisionKinds: Object.freeze(["use-move", "switch"] as const),
});

type MachineState = BattleScriptMachineState<BattleScriptRulesContext>;
type Handlers = BattleScriptOpcodeHandlers<BattleScriptRulesContext>;

export type FactoryFullTurnBattlerConfig = Readonly<{
  species: number;
  moveId: number;
  /**
   * Optional full 4-move moveset override (real Factory AI decision proof,
   * item 1 -- `docs/factory-ai-ground-truth.md`'s mask-7 policy needs a real
   * multi-slot choice, not a single staged move). When omitted, `moveId`
   * alone occupies slot 0 (this reducer's original staged-singles shape,
   * `factoryBattleScriptTerminalDecision.ts`'s own precedent).
   */
  moves?: readonly [number, number, number, number];
  /** Source `gBattleMons[].pp`; omitted legacy configs retain the old 16-per-nonzero-move default. */
  pp?: readonly [number, number, number, number];
  /** Source `gBattleMons[].ability`; omitted legacy configs retain the old zero default. */
  ability?: number;
  /** Source party record's MON_DATA_ABILITY_NUM. */
  abilityNum?: number;
  /** Source personality; its nature bits are carried through switch reconstruction. */
  personality?: number;
  /** Source `gBattleMons[].item`; omitted legacy configs retain the old zero default. */
  item?: number;
  /** Source `gBattleMons[].friendship`; omitted legacy configs retain the old zero default. */
  friendship?: number;
  /** Source `gBattleMons[].level` (the damage formula's level term); omitted configs keep the Level 50 default. */
  level?: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  hp: number;
  maxHp?: number;
  status1?: number;
  status2?: number;
  encoreTimer?: number;
  encoredMove?: number;
  encoredMovePos?: number;
  encoreTimerStartValue?: number;
  /** Source gLastMoves entry for finite status-move staging. */
  lastMove?: number;
  /** Source continuation state used by finite multi-turn precedence fixtures. */
  lockedMove?: number;
  chosenMovePosition?: number;
  statStages?: readonly [number, number, number, number, number, number, number, number];
  types?: readonly [string, string];
  /** Source gDisableStructs[].flashFireBoosted -- stages Flash Fire's re-activation string (ISSUES #70 batch 2, STRINGID_PKMNSXMADEYINEFFECTIVE). */
  flashFireBoosted?: 0 | 1;
  /** Source two-bit DisableStruct::stockpileCounter (0..3) -- stages Swallow-at-full-HP in one turn (ISSUES #70 batch 3, STRINGID_PKMNHPFULL) without a real prior Stockpile use. */
  stockpileCounter?: 0 | 1 | 2 | 3;
}>;

export type FactoryFullTurnConfig = Readonly<{
  requestId: number;
  rngSeed: number;
  /** Optional staged source gAbsentBattlerFlags for legality fixtures. */
  absentBattlerFlags?: number;
  /** Optional source gBattleWeather staging for finite full-turn fixtures. */
  weather?: number;
  /**
   * Source gRandomTurnNumber already drawn before this staged mid-battle
   * window. Defaults to 0xffff (Quick Claw does not proc). Whole-battle
   * integration must model battle_main.c:3140/:3923 for turn 1; this reducer
   * owns only BattleTurnPassed's continuing-turn draw at :4013.
   */
  initialRandomTurnNumber?: number;
  player: FactoryFullTurnBattlerConfig;
  trainer: FactoryFullTurnBattlerConfig;
  /**
   * Optional trainer-side bench (party slots 1/2, since `config.trainer`
   * itself always occupies slot 0 here -- this reducer's own convention,
   * distinct from `factoryBattleScriptTerminalDecision.ts`'s active-at-
   * slot-2 layout). Item 2's non-terminal forced-switch full-turn proof:
   * a healthy bench lets `BattleScript_HandleFaintedMon`'s AI branch
   * (`docs/forced-switch-ground-truth.md` §1c/§2, entry 447's machinery)
   * actually resume the battle instead of ending it. Omitted everywhere
   * else, keeping every existing fixture's hard-terminal-on-faint shape.
   */
  trainerBenchHp?: readonly [number, number];
  /** Mirrors `factoryBattleScriptTerminalDecision.ts`'s own `opponentBenchOverride` -- per-slot species/moves override for the two bench slots above. */
  trainerBenchOverride?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
  /**
   * Mirrors `trainerBenchHp` but for the PLAYER's bench (party slots 1/2,
   * since `config.player` itself always occupies slot 0 here too -- item 3's
   * player-side forced-switch full-turn proof. When the trainer's action
   * KOs the player's active mon non-terminally, `BattleScript_HandleFaintedMon`'s
   * player branch (`battleScriptOpenPartyScreenOpcode.ts`) halts on a real
   * `"player-choice-required"` reason instead of the AI's automatic pick --
   * this reducer surfaces that as a `"forced-switch"` decision-required
   * boundary (below) rather than throwing. Omitted everywhere else, keeping
   * every existing fixture's hard-terminal-on-faint shape.
   */
  playerBenchHp?: readonly [number, number];
  /** Mirrors `trainerBenchOverride`, for the player's bench slots above. */
  playerBenchOverride?: readonly [BattleScriptPartyMemberInput?, BattleScriptPartyMemberInput?];
}>;

export type FactoryFullTurnDecisionRules = BattleJsonObject & Readonly<{
  adapter: typeof ADAPTER;
  phase: "awaiting-player-command" | "awaiting-trainer-command" | "forced-switch-pending";
  pendingPlayerDecision: null | BattleCommandDecision;
  rulesContext: BattleScriptRulesContext;
  /**
   * Only present in phase "forced-switch-pending": the halted script's
   * resumable machine state -- either `BattleScript_HandleFaintedMon`
   * (`factoryBattleScriptTerminalDecision.ts`'s own `pendingScript` precedent)
   * or a mid-action move script halted on its own `openpartyscreen` (e.g.
   * `BattleScript_EffectBatonPass`, ISSUES #89) -- see `pendingForcedSwitchAt`.
   */
  pendingScript?: PendingForcedSwitchScript;
}>;

/**
 * The still-unresolved second mover's action, captured once per turn
 * (alongside speed/priority order) so a mid-action1 player-choice halt (a
 * move like Baton Pass reaching `openpartyscreen`) can resume straight into
 * action2 without re-deriving trainer AI decisions -- which would re-consume
 * RNG and diverge from the original turn.
 */
type PendingSecondFullTurnAction = Readonly<{
  mover: BattleScriptBattlerId;
  switchPartyIndex: BattlePartyIndex | null;
  moveId: number;
  moveSlot: BattleMoveSlot;
  target: BattleScriptBattlerId;
  forcedStruggle: boolean;
  /** ISSUES #140: does this action re-derive its target through GetMoveTarget's draw loop? */
  retargetsAtExecution: boolean;
}>;

type PendingForcedSwitchScript = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  scheduler: BattleScriptSchedulerState;
  /**
   * Source continuation owned by the caller of HandleFaintedMonActions.
   * Action KOs still enter BattleTurnPassed from its start; an end-turn KO
   * has already completed DoField/DoBattler and resumes at the delayed-
   * attack/Perish tail (`battle_main.c:3963-3974`). "run-action1"/"run-action2"
   * are this reducer's own addition (ISSUES #89): a move script (not the
   * HandleFaintedMon dance) halted on `openpartyscreen` mid-action1/action2.
   */
  resumeAt: "run-end-turn" | "finish-end-turn-after-faints" | "run-action1" | "run-action2";
  /** Present only for resumeAt "run-action1" -- see `PendingSecondFullTurnAction`. */
  pendingSecondAction?: PendingSecondFullTurnAction;
}>;

export function createFactoryEmptyBattlerState(side: 0 | 1): BattleScriptRulesBattlerState {
  return Object.freeze({
    side,
    ability: 0,
    hp: 0,
    item: 0,
    ivs: ZERO_IVS,
    isEgg: false,
    abilityNum: 0,
    unknown: 0,
    experience: 0,
    transformedMonPersonality: 0,
    mimickedMoves: 0,
    ppBonuses: 0,
    stockpileCounter: 0,
    moves: Object.freeze([0, 0, 0, 0] as const),
    pp: Object.freeze([0, 0, 0, 0] as const),
    statStages: ZERO_STAT_STAGES,
    status1: 0,
    status2: 0,
    status3: 0,
    specialStatus: Object.freeze({
      restoredBattlerSprite: 0,
      focusBanded: 0,
      physicalDmg: 0,
      specialDmg: 0,
      shellBellDmg: 0,
    }),
    substituteHP: 0,
    rolloutTimer: 0,
    furyCutterCounter: 0,
    truantCounter: 0,
    rechargeTimer: 0,
    chargeTimer: 0,
    chargeTimerStartValue: 0,
    flinchImmobility: 0,
    disabledMove: 0,
    disableTimer: 0,
    disableTimerStartValue: 0,
    encoreTimer: 0,
    encoredMove: 0,
    encoredMovePos: 0,
    encoreTimerStartValue: 0,
    perishSongTimer: 0,
    perishSongTimerStartValue: 0,
    usedDisabledMove: 0,
    tauntTimer: 0,
    usedTauntedMove: 0,
    usedImprisonedMove: 0,
    targetNotAffected: 0,
    flag2Unknown: 0,
    chargingTurn: 0,
    protected: 0,
    protectUses: 0,
    ppNotAffectedByPressure: 0,
    protectPhysicalDmg: 0,
    protectPhysicalBattlerId: 0,
    protectSpecialDmg: 0,
    protectSpecialBattlerId: 0,
    types: Object.freeze(["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: 0,
    personality: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    level: 0,
    friendship: 0,
    partyIndex: 0,
    maxHP: 0,
    speed: 0,
    turnOrderNum: 1,
    wrappedMove: 0,
    wrappedBy: side,
    battlerPreventingEscape: side,
    battlerWithSureHit: 0,
    isFirstTurn: 0,
  });
}

function activeBattler(
  side: 0 | 1,
  config: FactoryFullTurnBattlerConfig,
): BattleScriptRulesBattlerState {
  const moves = config.moves ?? ([config.moveId, 0, 0, 0] as const);
  const pp = config.pp ?? (
    moves.map((moveId) => (moveId !== 0 ? 16 : 0)) as unknown as readonly [
      number,
      number,
      number,
      number,
    ]
  );
  return Object.freeze({
    ...createFactoryEmptyBattlerState(side),
    ivs: FACTORY_FIRST_CHALLENGE_IVS,
    ability: config.ability ?? 0,
    abilityNum: (config.abilityNum ?? 0) as 0 | 1,
    hp: config.hp,
    item: config.item ?? 0,
    species: config.species,
    personality: config.personality ?? 0,
    attack: config.attack,
    defense: config.defense,
    spAttack: config.spAttack,
    spDefense: config.spDefense,
    speed: config.speed,
    level: config.level ?? 50,
    friendship: config.friendship ?? 0,
    types: config.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    moves: Object.freeze(moves),
    pp: Object.freeze(pp),
    statStages: config.statStages ?? NEUTRAL_STAT_STAGES,
    status1: config.status1 ?? 0,
    status2: config.status2 ?? 0,
    encoreTimer: config.encoreTimer ?? 0,
    encoredMove: config.encoredMove ?? 0,
    encoredMovePos: config.encoredMovePos ?? 0,
    encoreTimerStartValue: config.encoreTimerStartValue ?? 0,
    maxHP: config.maxHp ?? config.hp,
    partyIndex: 0,
    flashFireBoosted: config.flashFireBoosted ?? 0,
    stockpileCounter: config.stockpileCounter ?? 0,
  });
}

function partySlot(config: FactoryFullTurnBattlerConfig): BattleScriptPartyMemberInput {
  const moves = config.moves ?? ([config.moveId, 0, 0, 0] as const);
  const pp = config.pp ?? (
    moves.map((moveId) => (moveId !== 0 ? 16 : 0)) as unknown as readonly [
      number,
      number,
      number,
      number,
    ]
  );
  return {
    species: config.species,
    isEgg: false,
    abilityNum: config.abilityNum ?? 0,
    ivs: FACTORY_FIRST_CHALLENGE_IVS,
    personality: config.personality ?? 0,
    level: config.level ?? 50,
    friendship: config.friendship ?? 0,
    hp: config.hp,
    maxHP: config.maxHp ?? config.hp,
    attack: config.attack,
    defense: config.defense,
    speed: config.speed,
    spAttack: config.spAttack,
    spDefense: config.spDefense,
    status1: config.status1 ?? 0,
    item: config.item ?? 0,
    moves,
    pp,
  };
}

const EMPTY_PARTY_SLOT: BattleScriptPartyMemberInput = Object.freeze({ species: 0, isEgg: false, hp: 0 });

/** A bench slot (party index 1 or 2, items 2/3's forced-switch proofs) -- species/moves come from `override`, `hp` is the only required field. */
function benchSlot(hp: number, override?: BattleScriptPartyMemberInput): BattleScriptPartyMemberInput {
  return {
    species: 0,
    isEgg: false,
    ivs: FACTORY_FIRST_CHALLENGE_IVS,
    personality: 0,
    level: 50,
    hp,
    maxHP: hp,
    ...override,
  };
}

function createInitialRules(config: FactoryFullTurnConfig): FactoryFullTurnDecisionRules {
  const playerParty = Object.freeze([
    partySlot(config.player),
    config.playerBenchHp
      ? benchSlot(config.playerBenchHp[0], config.playerBenchOverride?.[0])
      : EMPTY_PARTY_SLOT,
    config.playerBenchHp
      ? benchSlot(config.playerBenchHp[1], config.playerBenchOverride?.[1])
      : EMPTY_PARTY_SLOT,
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
  ]);
  const opponentParty = Object.freeze([
    partySlot(config.trainer),
    config.trainerBenchHp
      ? benchSlot(config.trainerBenchHp[0], config.trainerBenchOverride?.[0])
      : EMPTY_PARTY_SLOT,
    config.trainerBenchHp
      ? benchSlot(config.trainerBenchHp[1], config.trainerBenchOverride?.[1])
      : EMPTY_PARTY_SLOT,
    EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT, EMPTY_PARTY_SLOT,
  ]);
  if (playerParty.length !== BATTLE_SCRIPT_PARTY_SIZE || opponentParty.length !== BATTLE_SCRIPT_PARTY_SIZE) {
    throw new Error("staged parties must contain exactly PARTY_SIZE slots");
  }

  const rulesContext = createBattleScriptRulesContext({
    battlers: [
      activeBattler(0, config.player),
      activeBattler(1, config.trainer),
      createFactoryEmptyBattlerState(0),
      createFactoryEmptyBattlerState(1),
    ],
    selectorRoles: { attacker: null, target: null, effectBattler: null, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: 0,
    currentMovePosition: 0,
    gBattleEnvironment: BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    moveHistory: {
      lastMoves: [config.player.lastMove ?? 0, config.trainer.lastMove ?? 0, 0, 0],
    },
    lockedMoves: [config.player.lockedMove ?? 0, config.trainer.lockedMove ?? 0, 0, 0],
    chosenMovePositions: [
      config.player.chosenMovePosition ?? 0,
      config.trainer.chosenMovePosition ?? 0,
      0,
      0,
    ],
    party: { player: playerParty, opponent: opponentParty },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_RUN_AWAY_NOOP_INVARIANT.battleTypeFlags,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    absentBattlerFlags: config.absentBattlerFlags ?? 0,
    weather: config.weather ?? 0,
    randomTurnNumber: config.initialRandomTurnNumber ?? 0xffff,
  });
  return Object.freeze({
    adapter: ADAPTER,
    phase: "awaiting-player-command",
    pendingPlayerDecision: null,
    rulesContext,
  });
}

export function createFactoryFullTurnBattleState(
  config: FactoryFullTurnConfig,
): BattleState<FactoryFullTurnDecisionRules> {
  const rules = createInitialRules(config);
  return createFactoryFullTurnBattleStateFromRulesContext({
    requestId: config.requestId,
    rngSeed: config.rngSeed,
    rulesContext: rules.rulesContext,
  });
}

/**
 * Shared durable full-turn construction seam. Staged fixtures and the fresh
 * lifecycle both publish the same reducer-owned rules/request shape here.
 */
export function createFactoryFullTurnBattleStateFromRulesContext(
  input: Readonly<{
    requestId: number;
    rngSeed: number;
    rngCalls?: number;
    /** Semantic events emitted by lifecycle hooks before this first request. */
    nextEventSequence?: number;
    rulesContext: BattleScriptRulesContext;
  }>,
): BattleState<FactoryFullTurnDecisionRules> {
  const rules = Object.freeze({
    adapter: ADAPTER,
    phase: "awaiting-player-command",
    pendingPlayerDecision: null,
    rulesContext: input.rulesContext,
  }) as FactoryFullTurnDecisionRules;
  const state = createBattleState({
    rules,
    rngSeed: input.rngSeed,
    rngCalls: input.rngCalls,
    request: {
      kind: "command",
      requestId: input.requestId,
      side: "player",
      battler: 0,
      legalDecisions: legalCommandDecisions(rules.rulesContext, 0),
    },
  }) as BattleState<FactoryFullTurnDecisionRules>;
  return input.nextEventSequence === undefined
    ? state
    : Object.freeze({ ...state, nextEventSequence: input.nextEventSequence });
}

/**
 * SELECT move switching at the player's command boundary (battle_controller_player.c HandleMoveSwitching): swaps the
 * battler's and party mon's move slots and republishes the same request id's legal decisions for the new order.
 */
export function switchFactoryCommandMoves(
  state: BattleState<FactoryFullTurnDecisionRules>,
  source: 0 | 1 | 2 | 3,
  target: 0 | 1 | 2 | 3,
): BattleState<FactoryFullTurnDecisionRules> {
  const request = state.boundary.kind === "decision-required" ? state.boundary.request : null;
  if (request === null || request.kind !== "command" || request.side !== "player") {
    throw new Error("move switching requires the player's command boundary");
  }
  const rulesContext = swapBattleScriptBattlerMoves(state.rules.rulesContext, 0, source, target);
  return Object.freeze({
    ...state,
    rules: buildRules(rulesContext, state.rules.phase, state.rules.pendingPlayerDecision),
    boundary: Object.freeze({
      ...state.boundary,
      request: Object.freeze({ ...request, legalDecisions: legalCommandDecisions(rulesContext, 0) }),
    }),
  }) as BattleState<FactoryFullTurnDecisionRules>;
}

function rulesAt(input: FactoryFullTurnDecisionRules): FactoryFullTurnDecisionRules {
  const phase = (input as { phase?: unknown } | null)?.phase;
  if (
    input === null
    || typeof input !== "object"
    || (input as { adapter?: unknown }).adapter !== ADAPTER
    || (phase !== "awaiting-player-command" && phase !== "awaiting-trainer-command")
  ) {
    throw new Error("factory full-turn decision requires an awaiting-command staged rules payload");
  }
  const rulesContext = createBattleScriptRulesContext(
    (input as { rulesContext: unknown }).rulesContext as never,
  );
  return Object.freeze({
    adapter: ADAPTER,
    phase: phase as "awaiting-player-command" | "awaiting-trainer-command",
    pendingPlayerDecision: (input as {
      pendingPlayerDecision: null | BattleCommandDecision;
    }).pendingPlayerDecision,
    rulesContext,
  });
}

function buildRules(
  rulesContext: BattleScriptRulesContext,
  phase: FactoryFullTurnDecisionRules["phase"],
  pendingPlayerDecision: FactoryFullTurnDecisionRules["pendingPlayerDecision"],
): FactoryFullTurnDecisionRules {
  return Object.freeze({ adapter: ADAPTER, phase, pendingPlayerDecision, rulesContext });
}

/**
 * `gProtectStructs[b].noValidMoves` for the turn's second mover when its move action is cancelled. The game sets the flag at selection
 * (AreAllMovesUnusable, battle_util.c:1125-1140) and clears it only when the forced Struggle starts (HandleAction_UseMove, :100-102) or when that
 * battler faints (FaintClearSetData, battle_main.c:3294). When the first mover faints from its own action and its replacement comes in at once,
 * `cancelallactions` (battle_scripts_1.s:2895) drops the second action: the Struggle never starts and the flag is still set when ENDTURN_ORDER sorts
 * the battlers, so the sort reads Struggle's priority 0 for it and not the priority of the slot under its cursor.
 * `faintedBattler` is the battler the faint dance replaced: when that is the second mover itself, its cell was cleared with it.
 */
function keepNoValidMovesOfCancelledStruggle(
  rulesContext: BattleScriptRulesContext,
  second: Readonly<{ mover: number; forcedStruggle: boolean }> | null,
  faintedBattler: number,
): BattleScriptRulesContext {
  if (second === null || !second.forcedStruggle || second.mover === faintedBattler) return rulesContext;
  if (rulesContext.battlers[second.mover]!.hp === 0) return rulesContext;
  return createBattleScriptRulesContext({ ...rulesContext, noValidMovesKept: rulesContext.noValidMovesKept | (1 << second.mover) });
}

function buildForcedSwitchPendingRules(
  rulesContext: BattleScriptRulesContext,
  pendingScript: PendingForcedSwitchScript,
): FactoryFullTurnDecisionRules {
  return Object.freeze({
    adapter: ADAPTER,
    phase: "forced-switch-pending",
    pendingPlayerDecision: null,
    rulesContext,
    pendingScript,
  });
}

function pendingSecondActionAt(value: unknown): PendingSecondFullTurnAction {
  const record = value as
    | Readonly<{
      mover?: unknown;
      switchPartyIndex?: unknown;
      moveId?: unknown;
      moveSlot?: unknown;
      target?: unknown;
      forcedStruggle?: unknown;
      retargetsAtExecution?: unknown;
    }>
    | null
    | undefined;
  if (
    record === null
    || record === undefined
    || typeof record !== "object"
    || (record.mover !== 0 && record.mover !== 1)
    || (record.switchPartyIndex !== null && !Number.isSafeInteger(record.switchPartyIndex))
    || !Number.isSafeInteger(record.moveId)
    || !Number.isSafeInteger(record.moveSlot)
    || (record.target !== 0 && record.target !== 1)
    || typeof record.forcedStruggle !== "boolean"
    || typeof record.retargetsAtExecution !== "boolean"
  ) {
    throw new Error("factory full-turn decision pendingScript.pendingSecondAction must be a valid resolved action");
  }
  return Object.freeze({
    mover: record.mover as BattleScriptBattlerId,
    switchPartyIndex: record.switchPartyIndex as BattlePartyIndex | null,
    moveId: record.moveId as number,
    moveSlot: record.moveSlot as BattleMoveSlot,
    target: record.target as BattleScriptBattlerId,
    forcedStruggle: record.forcedStruggle,
    retargetsAtExecution: record.retargetsAtExecution,
  });
}

function pendingScriptAt(value: unknown): PendingForcedSwitchScript {
  const record = value as
    | Readonly<{
      programCounter?: unknown;
      callStack?: unknown;
      scheduler?: unknown;
      resumeAt?: unknown;
      pendingSecondAction?: unknown;
    }>
    | null
    | undefined;
  if (
    record === null
    || record === undefined
    || typeof record !== "object"
    || !Number.isSafeInteger(record.programCounter)
    || !Array.isArray(record.callStack)
    || !record.callStack.every((entry) => Number.isSafeInteger(entry))
    || (
      record.resumeAt !== "run-end-turn"
      && record.resumeAt !== "finish-end-turn-after-faints"
      && record.resumeAt !== "run-action1"
      && record.resumeAt !== "run-action2"
    )
  ) {
    throw new Error("factory full-turn decision pendingScript must be a valid halted-script bundle");
  }
  const scheduler = createBattleScriptSchedulerState(
    record.scheduler as Parameters<typeof createBattleScriptSchedulerState>[0],
  );
  const pendingSecondAction = record.resumeAt === "run-action1"
    ? pendingSecondActionAt(record.pendingSecondAction)
    : undefined;
  return Object.freeze({
    programCounter: record.programCounter as number,
    callStack: Object.freeze([...(record.callStack as readonly number[])]),
    scheduler,
    resumeAt: record.resumeAt,
    ...(pendingSecondAction !== undefined ? { pendingSecondAction } : {}),
  });
}

/**
 * Reconstructs the halted `BattleScript_HandleFaintedMon` script paused
 * mid-dance at `openpartyscreen`'s player branch (item 3, mirroring
 * `factoryBattleScriptTerminalDecision.ts`'s own `pendingForcedSwitchAt`).
 * `rulesContext`/`pendingScript` are the only durable fields this phase
 * needs -- the current `BattleForcedSwitchRequest` (reconstructed by
 * `submitBattleDecision` from this same state's own previously-published
 * boundary) already carries `battler`/`faintedPartyIndex`/`legalPartyIndexes`.
 */
function pendingForcedSwitchAt(
  input: FactoryFullTurnDecisionRules,
): Readonly<{ rulesContext: BattleScriptRulesContext; pendingScript: PendingForcedSwitchScript }> {
  if (
    input === null
    || typeof input !== "object"
    || (input as { adapter?: unknown }).adapter !== ADAPTER
    || (input as { phase?: unknown }).phase !== "forced-switch-pending"
  ) {
    throw new Error("factory full-turn decision requires a forced-switch-pending staged rules payload");
  }
  const rulesContext = createBattleScriptRulesContext(
    (input as { rulesContext: unknown }).rulesContext as never,
  );
  const pendingScript = pendingScriptAt((input as { pendingScript?: unknown }).pendingScript);
  return Object.freeze({ rulesContext, pendingScript });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context: Readonly<{ state: MachineState }>) =>
      context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (
      context: Readonly<{ state: MachineState }>,
      operand: Readonly<{ expression: string }>,
    ) => {
      if (!operand.expression.startsWith("STRINGID_")) return null;
      const rules = context.state.rulesContext;
      const itemName = (item: number | null) => item === null
        ? null
        : (FACTORY_ITEM_NAME_BY_ID.get(item) ?? `ITEM_${item}`);
      const buff1 = itemName(rules.battleTextBuff1Item);
      const buff2 = itemName(rules.battleTextBuff2Item);
      const substitutions = operand.expression === "STRINGID_PKMNSITEMCUREDPROBLEM"
        ? (rules.battleTextBuff1Status === null ? [] : [rules.battleTextBuff1Status])
        // ISSUES #72 batch 1: same battleTextBuff1Status source as the item
        // sibling above, plus {B_SCR_ACTIVE_ABILITY} -- the curing ability is
        // always the just-cured battler's own (immunityAbilityCure only ever
        // reads/reports the scriptingBattler's own ability,
        // battleScriptMoveEndOpcode.ts:668,684-687).
        // ISSUES #72 batch 6: STRINGID_PKMNSXCUREDYPROBLEM (Shed Skin's own
        // end-turn tick) shares this identical substitution shape byte-for-byte.
        : operand.expression === "STRINGID_PKMNSXCUREDITSYPROBLEM"
          || operand.expression === "STRINGID_PKMNSXCUREDYPROBLEM"
        ? (rules.battleTextBuff1Status === null
          ? []
          : [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability), rules.battleTextBuff1Status])
        : operand.expression === "STRINGID_PKMNOBTAINEDX"
        ? (buff1 === null ? [] : [buff1])
        : operand.expression === "STRINGID_PKMNOBTAINEDX2"
          ? (buff2 === null ? [] : [buff2])
          : operand.expression === "STRINGID_PKMNOBTAINEDXYOBTAINEDZ"
            ? [buff1, buff2].filter((value): value is string => value !== null)
            // B_TXT_DEF_ABILITY: gAbilityNames[sBattlerAbilities[gBattlerTarget]]
            // (battle_message.c:2515-2517) -- the move's own target, whose
            // Wonder Guard/Levitate caused the miss (docs/issue70-stringid-
            // reachability.md rows 2-3; battleScriptHitChainOpcode.ts:958-959,
            // 1617-1622,1778-1783 (GROUND_MISS) and :986-989,1672-1677,
            // 1818-1823 (AVOIDED_DMG), all three call sites Levitate/Wonder
            // Guard-only).
            // ISSUES #70 batch 2 (docs/issue70-stringid-reachability.md rows
            // 41-42): gFlashFireStringIds shares this exact B_TXT_DEF_ABILITY
            // shape (advancePastAccuracyCheck, battleScriptHitChainOpcode.ts:
            // 908-925 -- Flash Fire is still gBattlerTarget's ability at the
            // print, roles unchanged since the AVOIDEDDAMAGE/GROUNDMISS case).
            // ISSUES #72 batch 2: STRINGID_PKMNANCHORSITSELFWITH (Suction
            // Cups, BattleScript_AbilityPreventsPhasingOut's own generic
            // jumpifability BS_TARGET), STRINGID_PKMNPREVENTSUSAGE (Damp,
            // Cmd_tryexplosion's own dampBattler re-point of
            // selectorRoles.target, battleScriptExplosionOpcode.ts),
            // STRINGID_PKMNRESTOREDHPUSING/STRINGID_PKMNSXMADEYUSELESS
            // (Volt Absorb/Water Absorb, advancePastAccuracyCheck,
            // battleScriptHitChainOpcode.ts:873-905 -- selectorRoles.target
            // unchanged from the move's own real target) all share this
            // exact B_TXT_DEF_ABILITY shape. ISSUES #72 batch 5:
            // STRINGID_PKMNSXINFATUATEDY/STRINGID_PKMNHURTSWITH (Cute Charm/
            // Rough Skin, executeOnDamageAbilities's own
            // recordBattleScriptAbilityReveal(..., target, ability) calls,
            // battleScriptMoveEndOpcode.ts:507-521,562-586 -- neither branch
            // reassigns selectorRoles, so the ability holder is still the
            // move's own unchanged target) and STRINGID_PKMNCOPIEDFOE (Role
            // Play, a zero-TS-reference move-effect entry script reading the
            // copied ability off the same unchanged target) share it too.
            : operand.expression === "STRINGID_AVOIDEDDAMAGE"
              || operand.expression === "STRINGID_PKMNMAKESGROUNDMISS"
              || operand.expression === "STRINGID_PKMNRAISEDFIREPOWERWITH"
              || operand.expression === "STRINGID_PKMNSXMADEYINEFFECTIVE"
              || operand.expression === "STRINGID_PKMNANCHORSITSELFWITH"
              || operand.expression === "STRINGID_PKMNPREVENTSUSAGE"
              || operand.expression === "STRINGID_PKMNRESTOREDHPUSING"
              || operand.expression === "STRINGID_PKMNSXMADEYUSELESS"
              || operand.expression === "STRINGID_PKMNSXINFATUATEDY"
              || operand.expression === "STRINGID_PKMNHURTSWITH"
              || operand.expression === "STRINGID_PKMNCOPIEDFOE"
              ? (rules.selectorRoles.target === null
                ? []
                : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
              // B_TXT_SCR_ACTIVE_ABILITY: gAbilityNames[sBattlerAbilities[
              // gBattleScripting.battler]] (battle_message.c:2519-2520) --
              // applySetMoveEffect sets scriptingBattler to the ability
              // holder (the move's target) whenever MOVE_EFFECT_AFFECTS_USER
              // is set (battleScriptHitChainOpcode.ts:2841-2848), which
              // executeOnDamageAbilities always sets for its Static/Poison
              // Point/Flame Body/Effect Spore contact-ability block
              // (battleScriptMoveEndOpcode.ts:455,587-599). ISSUES #70 batch 2
              // (rows 4/23): gGotFrozenStringIds/gFellAsleepStringIds' idx1
              // share this exact shape (generic, zero real-world incidence).
              : operand.expression === "STRINGID_PKMNPOISONEDBY"
                || operand.expression === "STRINGID_PKMNBURNEDBY"
                || operand.expression === "STRINGID_PKMNWASPARALYZEDBY"
                || operand.expression === "STRINGID_PKMNFROZENBY"
                || operand.expression === "STRINGID_PKMNMADESLEEP"
                ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                // STRINGID_HITXTIMES's {B_BUFF1}: the multi-hit family's own
                // hits-landed counter (battleScriptRulesContext.ts:700-710,
                // battleScriptIngrainLeechSeedWrapOpcode.ts:308-323).
                : operand.expression === "STRINGID_HITXTIMES"
                  ? [String(rules.multiHitStringCounter)]
                  // {B_BUFF1}: the trapping move's own name --
                  // BattleScript_WrapTurnDmg (ENDTURN_WRAP,
                  // battle_util.c:1592-1621) reassigns BS_ATTACKER to the
                  // trapped battler itself for this tick
                  // (enterTickBattlerContext), so rules.selectorRoles.attacker
                  // is that battler, whose own wrappedMove field
                  // (applyWrapMoveEffect, battleScriptHitChainOpcode.ts:3722)
                  // holds the trapping move's id.
                  : operand.expression === "STRINGID_PKMNHURTBY"
                    || operand.expression === "STRINGID_PKMNFREEDFROM"
                    || operand.expression === "STRINGID_PKMNGOTFREE"
                    // ISSUES #72 batch 5: STRINGID_PKMNFREEDFROM shares
                    // WRAP_TURN_DMG_LABEL's own sibling WRAP_ENDS_LABEL call
                    // (runWrapTick, battleEndTurnOrchestration.ts) --
                    // enterTickBattlerContext reassigns BS_ATTACKER to the
                    // trapped battler the exact same way for both branches.
                    // STRINGID_PKMNGOTFREE (Rapid Spin, Cmd_rapidspinfree)
                    // reads the SAME trapped battler's wrappedMove without
                    // ever reassigning selectorRoles.attacker away from the
                    // Rapid Spin user itself (battleScriptIngrainLeechSeed
                    // WrapOpcode.ts:495-526).
                    ? (rules.selectorRoles.attacker === null
                        ? []
                        : [resolveMoveName(rules.battlers[rules.selectorRoles.attacker].wrappedMove)])
                    // ISSUES #70 batch 3 (docs/issue70-stringid-reachability.md
                    // rows 6/9/10): the direct-status-move context (Toxic vs
                    // Immunity, Will-O-Wisp vs Water Veil, Thunder Wave/Stun
                    // Spore/Glare vs Limber) -- BattleScript_ImmunityProtected/
                    // WaterVeilPrevents/LimberProtected's own `copybyte
                    // gEffectBattler, gBattlerTarget` (battle_scripts_1.s:
                    // 715,1035,2191, already ported as Cmd_copyarray's
                    // gEffectBattler<-gBattlerTarget tuple,
                    // battleScriptIngrainLeechSeedWrapOpcode.ts:277-290) always
                    // leaves rules.selectorRoles.effectBattler === the
                    // ability-holding target regardless of which of the three
                    // status types fired -- both {B_DEF_ABILITY}/{B_EFF_ABILITY}
                    // template variants read that same battler's ability.
                    // ISSUES #72 batch 2: STRINGID_PKMNSXPREVENTSFLINCHING
                    // (Inner Focus) shares this exact shape --
                    // applyFlinchMoveEffect's own effectBattler param (the
                    // move's own target for the certain-flinch, non-affectsUser
                    // case Fake Out is) is applySetMoveEffect's same
                    // selectorRoles.effectBattler write (battleScriptHitChainOpcode.ts:2841-2848,3590-3608).
                    : operand.expression === "STRINGID_PKMNPREVENTSPOISONINGWITH"
                      || operand.expression === "STRINGID_PKMNSXPREVENTSBURNS"
                      || operand.expression === "STRINGID_PKMNPREVENTSPARALYSISWITH"
                      || operand.expression === "STRINGID_PKMNSXPREVENTSFLINCHING"
                      ? (rules.selectorRoles.effectBattler === null
                        ? []
                        : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.effectBattler].ability)])
                      // Row 7 (STRINGID_PKMNSXPREVENTSYSZ): only reachable via
                      // Synchronize's own seteffectprimary re-application
                      // (executeSynchronize, battleScriptMoveEndOpcode.ts) --
                      // the real, fixed gBattlerAttacker/gBattlerTarget never
                      // move mid-effect (unlike gEffectBattler/scriptingBattler,
                      // which Synchronize's own affectsUser flag swaps), so
                      // {B_ATK_ABILITY}/{B_DEF_ABILITY} read those two battlers'
                      // ability fields directly.
                      : operand.expression === "STRINGID_PKMNSXPREVENTSYSZ"
                        ? (rules.selectorRoles.attacker === null || rules.selectorRoles.target === null
                          ? []
                          : [
                              resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.attacker].ability),
                              resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability),
                            ])
                        // Row 8 (STRINGID_PKMNSXHADNOEFFECTONY): same
                        // Synchronize-only reachability; {B_SCR_ACTIVE_ABILITY}
                        // reads the ability holder's (scriptingBattler's) own
                        // ability, always ABILITY_SYNCHRONIZE in practice.
                        : operand.expression === "STRINGID_PKMNSXHADNOEFFECTONY"
                          ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                          // Row 14 (STRINGID_PKMNSTAYEDAWAKEUSING):
                          // createJumpifcantmakeasleepOpcodeHandler's own
                          // Insomnia/Vital Spirit branch always targets the
                          // sleep move's real target (battleScriptStatusPrimaryOpcode.ts:236-245).
                          : operand.expression === "STRINGID_PKMNSTAYEDAWAKEUSING"
                            ? (rules.selectorRoles.target === null
                              ? []
                              : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                            // Row 21 (STRINGID_PKMNSTOCKPILED): the stockpile
                            // count itself (stockpileHandler,
                            // battleScriptStockpileOpcode.ts), the same
                            // counter-substitution shape as HITXTIMES above.
                            // ISSUES #72 batch 6: STRINGID_PKMNPERISHCOUNTFELL
                            // shares this exact battleTextBuff1ByteNumber
                            // read -- runPerishSongAfterFutureAttacks's own
                            // pre-decrement capture (battle_util.c:1846).
                            // ISSUES #72 (last REACHABLE id): STRINGID_MAGNITUDESTRENGTH
                            // shares it too -- magnitudeHandler's own
                            // PREPARE_BYTE_NUMBER_BUFFER-shaped write
                            // (battleScriptRankedBatch1Opcode.ts:130,
                            // Cmd_magnitudedamagecalculation, battle_script_commands.c:8710).
                            : operand.expression === "STRINGID_PKMNSTOCKPILED"
                              || operand.expression === "STRINGID_PKMNPERISHCOUNTFELL"
                              || operand.expression === "STRINGID_MAGNITUDESTRENGTH"
                              ? [String(rules.battleTextBuff1ByteNumber)]
                              // Row 40 (STRINGID_PKMNTRANSFORMEDINTO): the
                              // species Transform just copied
                              // (battleScriptTransformOpcode.ts's own
                              // battleTextBuff1Species write).
                              : operand.expression === "STRINGID_PKMNTRANSFORMEDINTO"
                                ? (rules.battleTextBuff1Species === null
                                  ? []
                                  : [battleCommandSpeciesDisplayName(rules.battleTextBuff1Species)])
                                // ISSUES #72 batch 1: BattleScript_AbilityNoStatLoss's
                                // {B_SCR_ACTIVE_ABILITY} -- changestatbuffs's own
                                // Clear Body/White Smoke branch always fires for the
                                // battler about to lose the stat, i.e. the same
                                // battler blockedMessage freezes into scriptingBattler
                                // (battleScriptStatBuffs.ts:206-271).
                                : operand.expression === "STRINGID_PKMNPREVENTSSTATLOSSWITH"
                                  ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                  // {B_DEF_ABILITY} for the two ability-blocks-the-
                                  // move's-own-target-effect ids -- OwnTempoPrevents/
                                  // ObliviousPreventsAttraction each read the ability
                                  // off the move's own (still-current) target role at
                                  // print time (battleScriptTryinfatuatingOpcode.ts:89,
                                  // the generic jumpifability BS_TARGET check ahead of
                                  // BattleScript_OwnTempoPrevents).
                                  : (
                                      operand.expression === "STRINGID_PKMNPREVENTSCONFUSIONWITH"
                                      || operand.expression === "STRINGID_PKMNPREVENTSROMANCEWITH"
                                    )
                                    ? (rules.selectorRoles.target === null
                                      ? []
                                      : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                                    // ISSUES #72 batch 2: BattleScript_AbilityNoSpecificStatLoss's
                                    // {B_SCR_ACTIVE_ABILITY}/{B_BUFF1} -- the
                                    // real C source calls the unconditional
                                    // PREPARE_STAT_BUFFER(gBattleTextBuff1,
                                    // statId) before either ability branch
                                    // (battle_script_commands.c:6958), so the
                                    // stat name is 1:1 derivable from which
                                    // ability matched which statId (Keen Eye
                                    // only ever blocks STAT_ACC, Hyper Cutter
                                    // only ever blocks STAT_ATK,
                                    // battleScriptStatBuffs.ts:272-277).
                                    : operand.expression === "STRINGID_PKMNSXPREVENTSYLOSS"
                                      ? [
                                          resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability),
                                          rules.battlers[rules.scriptingBattler].ability === ABILITY_KEEN_EYE
                                            ? "accuracy"
                                            : "ATTACK",
                                        ]
                                      // IntimidateActivatesLoop's own
                                      // {B_SCR_ACTIVE_ABILITY} -- scriptingBattler
                                      // is the switching-in Intimidate holder
                                      // for the whole loop (factoryBattleStart.ts/
                                      // battleScriptFaintedActionsOrchestration.ts
                                      // both freeze it before entering
                                      // BattleScript_IntimidateActivatesEnd3).
                                      // ISSUES #72 batch 6: STRINGID_PKMNRAISEDSPEED
                                      // (Speed Boost's own end-turn tick, now
                                      // setting scriptingBattler the same way
                                      // Shed Skin's tick already does) shares
                                      // this exact scriptingBattler-ability read.
                                      : operand.expression === "STRINGID_PKMNCUTSATTACKWITH"
                                        || operand.expression === "STRINGID_PKMNRAISEDSPEED"
                                        ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                        // BattleScript_IntimidatePrevented's own
                                        // {B_DEF_ABILITY} -- BS_TARGET at this
                                        // print is whichever of Clear Body/
                                        // Hyper Cutter/White Smoke's
                                        // jumpifability matched.
                                        : operand.expression === "STRINGID_PREVENTEDFROMWORKING"
                                          ? (rules.selectorRoles.target === null
                                            ? []
                                            : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                                          // BattleScript_SideStatusWoreOff's
                                          // {B_BUFF1} -- real source's
                                          // PREPARE_MOVE_BUFFER(gBattleTextBuff1,
                                          // MOVE_REFLECT/MOVE_LIGHT_SCREEN/
                                          // MOVE_MIST) call
                                          // (battle_util.c:1224,1256,1273) is
                                          // ported as battleEndTurnOrchestration.ts's
                                          // own battleTextBuff1Move write
                                          // right before firing this label.
                                          : operand.expression === "STRINGID_PKMNSXWOREOFF"
                                            ? (rules.battleTextBuff1Move === null
                                              ? []
                                              : [resolveMoveName(rules.battleTextBuff1Move)])
                                            // ISSUES #72 batch 3:
                                            // BattleScript_SoundproofProtected's
                                            // {B_DEF_ABILITY} -- the attack
                                            // canceler's moves-block Soundproof
                                            // check reads selectorRoles.target
                                            // without reassigning it
                                            // (battleScriptAbilityMovesBlock.ts:431-436).
                                            : operand.expression === "STRINGID_PKMNSXBLOCKSY"
                                              ? (rules.selectorRoles.target === null
                                                ? []
                                                : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                                              // BattleScript_PrintAbilityMadeIneffective's
                                              // {B_SCR_ACTIVE_ABILITY} --
                                              // BattleScript_PrintBankAbilityMadeIneffective's
                                              // own `copybyte sBATTLER,
                                              // sBATTLER_WITH_ABILITY`
                                              // (battleScriptIngrainLeechSeedWrapOpcode.ts:297-306)
                                              // already writes scriptingBattler
                                              // to the Insomnia/Vital Spirit
                                              // holder before this fallthrough.
                                              : operand.expression === "STRINGID_PKMNSXMADEITINEFFECTIVE"
                                                ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                                // ISSUES #72 batch 6:
                                                // BattleScript_RainDishActivates's
                                                // {B_ATK_ABILITY} -- runAbilitiesTick's
                                                // own Rain Dish branch reads
                                                // gBattlerAttacker (set generically by
                                                // enterTickBattlerContext for every
                                                // end-turn tick), not scriptingBattler.
                                                : operand.expression === "STRINGID_PKMNSXRESTOREDHPALITTLE2"
                                                  ? (rules.selectorRoles.attacker === null
                                                    ? []
                                                    : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.attacker].ability)])
                                                  // BattleScript_EffectDisable's own
                                                  // {B_BUFF1} -- disablelastusedattack's
                                                  // own disabledMove write on the move's
                                                  // still-current target, read back
                                                  // unconditionally right after.
                                                  : operand.expression === "STRINGID_PKMNMOVEWASDISABLED"
                                                    ? (rules.selectorRoles.target === null
                                                      ? []
                                                      : [resolveMoveName(rules.battlers[rules.selectorRoles.target].disabledMove)])
                                                    // ISSUES #105: BattleScript_EffectConversion/Conversion2/Camouflage's
                                                    // {B_BUFF1} -- all three type-change opcodes
                                                    // (battleScriptTypeChangeOpcode.ts) never reassign selectorRoles,
                                                    // BS_ATTACKER stays the move's own still-current user, the same
                                                    // battler whose types[] just changed and whose battleTextBuff1Type
                                                    // this write carries.
                                                    : operand.expression === "STRINGID_PKMNCHANGEDTYPE"
                                                      ? (rules.battleTextBuff1Type === null
                                                        ? []
                                                        : [TYPE_DISPLAY_NAMES[rules.battleTextBuff1Type] ?? rules.battleTextBuff1Type])
                                                      // ISSUES #72 batch 7: BattleScript_ColorChangeActivates's
                                                      // {B_DEF_ABILITY}/{B_BUFF1} -- executeOnDamageAbilities's own
                                                      // Color Change branch never reassigns selectorRoles (BS_TARGET
                                                      // stays the move's own still-current target, the ability
                                                      // holder), and battleTextBuff1Type already carries the new
                                                      // TYPE_* symbol (battleScriptMoveEndOpcode.ts:497). {B_BUFF1}'s
                                                      // real source reads gTypeNames (battle_message.c:2802), the
                                                      // same abbreviation table fightSubmenuText.ts's TYPE_DISPLAY_NAMES
                                                      // already transcribes for the FIGHT menu's type icon.
                                                      : operand.expression === "STRINGID_PKMNCHANGEDTYPEWITH"
                                                        ? (rules.selectorRoles.target === null || rules.battleTextBuff1Type === null
                                                          ? []
                                                          : [
                                                              resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability),
                                                              TYPE_DISPLAY_NAMES[rules.battleTextBuff1Type] ?? rules.battleTextBuff1Type,
                                                            ])
                                                      // ISSUES #72 batch 7: Cmd_tryspiteppreduce (Spite) already
                                                      // captures both {B_BUFF1}/{B_BUFF2} substitutions itself
                                                      // (battleScriptTryspiteppreduceOpcode.ts:81-82) -- only the
                                                      // prepareMessage wiring down to Cmd_printstring was missing.
                                                      : operand.expression === "STRINGID_PKMNREDUCEDPP"
                                                        ? (rules.battleTextBuff1Move === null || rules.battleTextBuff2ByteNumber === null
                                                          ? []
                                                          : [resolveMoveName(rules.battleTextBuff1Move), String(rules.battleTextBuff2ByteNumber)])
                                                        // ISSUES #72 batch 7: BattleScript_BerryPPHealEnd2 (Leppa
                                                        // Berry) -- {B_BUFF1} is the just-restored move, now also
                                                        // captured by runItemsTick's own HOLD_EFFECT_RESTORE_PP
                                                        // branch (battleEndTurnOrchestration.ts) the same shape
                                                        // Spite's battleTextBuff1Move already established.
                                                        : operand.expression === "STRINGID_PKMNSITEMRESTOREDPP"
                                                          ? (rules.battleTextBuff1Move === null ? [] : [resolveMoveName(rules.battleTextBuff1Move)])
                                                          // ISSUES #72 batch 7: BattleScript_TraceActivates's
                                                          // {B_BUFF2} -- the copied ability, off the traced-from
                                                          // battler factoryBattleStart.ts's own battleTextBuff1MonNick
                                                          // write already identifies (its ability field is
                                                          // untouched by the trace, only the tracer's is).
                                                          : operand.expression === "STRINGID_PKMNTRACED"
                                                            ? (rules.battleTextBuff1MonNick === null
                                                              ? []
                                                              : [resolveFactoryAbilityDisplayName(rules.battlers[rules.battleTextBuff1MonNick.battler].ability)])
                                                            // ISSUES #72 batch 8: Cmd_tryKO's own Sturdy check
                                                            // (battleScriptTryKOOpcode.ts:117-134) never reassigns
                                                            // selectorRoles -- the move's own still-current target
                                                            // is the Sturdy holder.
                                                            : operand.expression === "STRINGID_PKMNPROTECTEDBY"
                                                              ? (rules.selectorRoles.target === null
                                                                ? []
                                                                : [resolveFactoryAbilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                                                              // BattleScript_SandstreamActivates's {B_SCR_ACTIVE_ABILITY}
                                                              // -- Cmd_switchineffects's own Sand Stream branch sets
                                                              // scriptingBattler to the switching-in battler
                                                              // (battleScriptSwitchinOpcode.ts:973-981). Drizzle/
                                                              // Drought's own siblings (STRINGID_PKMNMADEITRAIN/
                                                              // STRINGID_PKMNSXINTENSIFIEDSUN) are deliberately absent
                                                              // here -- ISSUES #108's re-trace found both DEAD in
                                                              // Factory Level-50 singles: Kyogre/Groudon are the only
                                                              // Gen 3 Drizzle/Drought carriers and neither is a
                                                              // `FRONTIER_MON_*` eligible rental, so their ability ids
                                                              // aren't even in the Factory-rental-scoped
                                                              // `summary-info.json` display-name table this resolver
                                                              // reads.
                                                              : operand.expression === "STRINGID_PKMNSXWHIPPEDUPSANDSTORM"
                                                                ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                                                // BattleScript_PerishSongNotAffected's
                                                                // {B_SCR_ACTIVE_ABILITY} -- EffectPerishSong's own
                                                                // per-battler Soundproof loop already threads
                                                                // scriptingBattler through the generic sBATTLER field.
                                                                : operand.expression === "STRINGID_PKMNSXBLOCKSY2"
                                                                  ? [resolveFactoryAbilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                                                  // BattleScript_GrudgeTakesPP's {B_BUFF1} --
                                                                  // scheduleGrudge (battleScriptHitChainOpcode.ts:
                                                                  // 4354-4376) already captures the killing battler's
                                                                  // own chosen move into battleTextBuff1Move, same
                                                                  // shape STRINGID_PKMNSXWOREOFF/STRINGID_PKMNSITEMRESTOREDPP
                                                                  // already use.
                                                                  : operand.expression === "STRINGID_PKMNLOSTPPGRUDGE"
                                                                    ? (rules.battleTextBuff1Move === null ? [] : [resolveMoveName(rules.battleTextBuff1Move)])
                                                                    // BattleScript_MonTookFutureAttack's {B_BUFF1} --
                                                                    // runFutureAttacksAfterFaints's own tick reassigns
                                                                    // selectorRoles.target to the delayed hit's own
                                                                    // recipient before this print; futureSightMove[target]
                                                                    // still holds the cast-time-captured move id
                                                                    // (Cmd_trysetfutureattack, battleScriptTrysetfutureattackOpcode.ts:152).
                                                                    : operand.expression === "STRINGID_PKMNTOOKATTACK"
                                                                      ? (rules.selectorRoles.target === null
                                                                        ? []
                                                                        : [resolveMoveName(rules.futureSightMove[rules.selectorRoles.target])])
                                                                      // ISSUES #106: BattleScript_BeatUpLoop's
                                                                      // {B_BUFF1} -- Cmd_trydobeatup
                                                                      // (battleScriptBeatUpOpcode.ts) already records
                                                                      // the looping party member as
                                                                      // battleTextBuff1MonNick {battler, partyIndex},
                                                                      // the same general-purpose carrier
                                                                      // STRINGID_PKMNTRACED uses -- but that member is
                                                                      // not necessarily the active battler, so (unlike
                                                                      // Trace) the name-with-prefix must be resolved
                                                                      // here (full `rules.party` access), not via
                                                                      // `field` at print time.
                                                                      : operand.expression === "STRINGID_PKMNATTACK"
                                                                        ? (rules.battleTextBuff1MonNick === null
                                                                          ? []
                                                                          : [resolveBattleNameWithPrefix({
                                                                              side: rules.battlers[rules.battleTextBuff1MonNick.battler].side === 0
                                                                                ? "player"
                                                                                : "opponent",
                                                                              isTrainerBattle: true,
                                                                              nickname: battleCommandSpeciesDisplayName(
                                                                                rules.party[
                                                                                  rules.battlers[rules.battleTextBuff1MonNick.battler].side === 0
                                                                                    ? "player"
                                                                                    : "opponent"
                                                                                ][rules.battleTextBuff1MonNick.partyIndex]!.species,
                                                                              ),
                                                                            })])
                                                                        : [];
      return Object.freeze({
        kind: "message" as const,
        messageId: operand.expression,
        substitutions: Object.freeze(substitutions),
        // Cmd_printstring/Cmd_attackstring reads these globals before a later
        // action can overwrite them. In particular, a locked continuation
        // may print its actual gCurrentMove without issuing another PP
        // controller receipt (battle_script_commands.c:915-1006,1191-1203).
        ...(rules.selectorRoles.attacker === null
          ? {}
          : {
              actionSnapshot: Object.freeze({
                attacker: rules.selectorRoles.attacker,
                currentMove: rules.currentMove,
                currentMovePosition: rules.currentMovePosition,
              }),
            }),
        // Source gBattleScripting.battler at print time -- battle_message.c's
        // own B_TXT_SCR_ACTIVE_NAME_WITH_PREFIX selector reads this same
        // global (:2481-2482).
        scriptingBattler: rules.scriptingBattler,
        // B_TXT_LAST_ITEM reads gLastUsedItem directly at print time. Freeze
        // it only when the source/charmap-extracted template references that
        // token: a later removeitem controller receipt must not turn a Berry
        // result into ITEM_NONE in presentation.
        ...(battleStringReferencesToken(operand.expression, "B_LAST_ITEM")
          ? { lastItem: rules.lastUsedItem }
          : {}),
        // B_TXT_EFF_NAME_WITH_PREFIX is charmap's control-form selector for
        // gEffectBattler (battle_message.c:2444-2446). Its reachable strings
        // are data-defined, not the old hand-maintained list: source controls
        // and ordinary placeholders are both recognized by the shared table
        // lookup, while messages that do not reference this selector retain
        // their exact prior event shape.
        ...(battleStringReferencesToken(operand.expression, "B_EFF_NAME_WITH_PREFIX")
          && rules.selectorRoles.effectBattler !== null
          ? { effectBattler: rules.selectorRoles.effectBattler }
          : {}),
        // Source gBattlerTarget at print time. The Intimidate pair cycles it
        // across opposing battlers; Cmd_tryexplosion re-points it to the Damp
        // holder. snatchsetbattlers (battleScriptSnatchOpcode.ts) always
        // reassigns it to the snatcher itself, self-targeted victim move or
        // not -- unlike selectorRoles.attacker (self-targeted case aliases
        // it to the snatcher too, non-self-targeted case doesn't), so
        // target is the only uniform source for {B_DEF_NAME_WITH_PREFIX}
        // here (ISSUES #108). All four differ from an ordinary move's
        // opposite-side defender.
        ...((
          operand.expression === "STRINGID_PKMNCUTSATTACKWITH"
          || operand.expression === "STRINGID_PREVENTEDFROMWORKING"
          || operand.expression === "STRINGID_PKMNPREVENTSUSAGE"
          || operand.expression === "STRINGID_PKMNSNATCHEDMOVE"
        ) && rules.selectorRoles.target !== null
          ? { targetBattler: rules.selectorRoles.target }
          : {}),
        // Source PREPARE_MON_NICK_WITH_PREFIX_BUFFER's own battler argument
        // (gActiveBattler, the traced-from battler) at print time --
        // ISSUES #72 batch 7's STRINGID_PKMNTRACED needs the name-with-prefix
        // resolved presentation-side (nameWithPrefixResolver needs `field`,
        // unavailable inside this rules-only prepareMessage), distinct from
        // scriptingBattler (the tracer itself).
        ...(operand.expression === "STRINGID_PKMNTRACED" && rules.battleTextBuff1MonNick !== null
          ? { monNickBattler: rules.battleTextBuff1MonNick.battler }
          : {}),
      });
    },
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    // Dynamic (not a fixed closure value): the attacker role changes across
    // this reducer's two actions plus the end-turn tick loop's own
    // per-battler reassignment (battleEndTurnOrchestration.ts's
    // enterTickBattlerContext), all sharing this one ports/handlers pair.
    resolveAttackerBattler: (context: Readonly<{ state: MachineState }>) =>
      context.state.rulesContext.selectorRoles.attacker,
    // GetBattlerAtPosition -- see battleScriptBattlerPositions.ts. Needed since
    // the terminal seam now runs the post-battle WIN script's trainerslidein.
    resolveBattlerAtPosition: resolveSingleBattlePosition,
    resolveHalfwordOperand: (_context: unknown, operand: Readonly<{ expression: string }>) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return B_WAIT_TIME_LONG;
      if (operand.expression === "B_WAIT_TIME_SHORT") return B_WAIT_TIME_SHORT;
      return /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null;
    },
    resolveByteOperand: (_context: unknown, operand: Readonly<{ expression: string }>) =>
      /^[0-9]+$/.test(operand.expression) ? Number(operand.expression) : null,
  });
}

function acknowledgeAllPendingControllers(state: MachineState): MachineState {
  let next = state;
  for (const battler of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battler);
  }
  return next;
}

type RunToOwnEndResult =
  | Readonly<{ kind: "terminal"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>
  | Readonly<{
    kind: "player-choice";
    state: MachineState;
    battler: BattleScriptBattlerId;
    faintedPartyIndex: number;
    legalPartyIndexes: readonly number[];
  }>;

/** Runs one already-started BattleScriptExecute script to its own end/end2 halt (same shape as the fainted-actions/end-turn precedents' own helper). */
function runScriptToOwnEnd(program: BattleScriptProgram, handlers: Handlers, initialState: MachineState): RunToOwnEndResult {
  let state = initialState;
  let sourceInstructions = 0;
  let yieldSteps = 0;
  while (sourceInstructions < SCRIPT_BUDGET && yieldSteps < SCRIPT_YIELD_BUDGET) {
    const instruction = program.instructions[state.programCounter];
    if (!instruction) {
      throw new Error(`full-turn reducer left the committed program at ${state.programCounter}`);
    }
    if (!handlers[instruction.opcodeId]) {
      return Object.freeze({ kind: "barrier", state, instruction });
    }
    const stepped = stepBattleScriptMachine(program, state, handlers);
    if (stepped.kind === "blocked") {
      const acknowledged = acknowledgeAllPendingControllers(stepped.state);
      if (acknowledged === stepped.state) {
        throw new Error(
          `full-turn reducer blocked inside ${instruction.source.label}/${instruction.opcodeName} `
            + `without a safe controller acknowledgement: ${JSON.stringify(stepped.reason)}`,
        );
      }
      yieldSteps += 1;
      state = acknowledged;
      continue;
    }
    if (stepped.kind === "halted") {
      if (stepped.state.haltReason?.kind === "terminal") {
        return Object.freeze({ kind: "terminal", state: stepped.state });
      }
      // A move script (not the HandleFaintedMon dance) halting on
      // openpartyscreen's player branch, e.g. BattleScript_EffectBatonPass
      // (ISSUES #89) -- the same real, human-timescale halt the fainted-
      // actions orchestration already surfaces, just reached mid-action here.
      if (stepped.state.haltReason?.kind === "player-choice-required") {
        const reason = stepped.state.haltReason;
        return Object.freeze({
          kind: "player-choice",
          state: stepped.state,
          battler: reason.battler,
          faintedPartyIndex: reason.faintedPartyIndex,
          legalPartyIndexes: reason.legalPartyIndexes,
        });
      }
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind === "unsupported") {
      return Object.freeze({ kind: "barrier", state: stepped.state, instruction });
    }
    if (stepped.kind === "scheduler-progressed") {
      yieldSteps += 1;
      state = stepped.state;
      continue;
    }
    const controllerYield = (
      stepped.state.programCounter === state.programCounter
      && stepped.state.scheduler.pendingControllerBattlers.length
        > state.scheduler.pendingControllerBattlers.length
    );
    if (controllerYield) {
      yieldSteps += 1;
    } else {
      sourceInstructions += 1;
    }
    state = stepped.state;
  }
  if (yieldSteps >= SCRIPT_YIELD_BUDGET) {
    throw new Error(
      `full-turn reducer exceeded its controller/message yield budget at `
        + `${program.instructions[state.programCounter]?.source.label}/`
        + `${program.instructions[state.programCounter]?.opcodeName}`,
    );
  }
  throw new Error(
    `full-turn reducer exceeded its per-script instruction budget at `
      + `${program.instructions[state.programCounter]?.source.label}/`
      + `${program.instructions[state.programCounter]?.opcodeName} after `
      + `${sourceInstructions} source instructions`,
  );
}

/** `BattleScriptExecute(script)`: a fresh top-level script, call stack reset, carrying the rules/RNG/event/scheduler state forward. */
function startBattleScriptExecute(
  program: BattleScriptProgram,
  entryLabel: string,
  priorState: MachineState,
): MachineState {
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  return Object.freeze({
    programCounter: entry.programCounter,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: priorState.scheduler,
    rulesContext: priorState.rulesContext,
    rng: priorState.rng,
    events: priorState.events,
  });
}

function buildActionContext(
  priorRulesContext: BattleScriptRulesContext,
  mover: BattleScriptBattlerId,
  moveId: number,
  moveSlot: BattleMoveSlot,
  target: BattleScriptBattlerId,
  forcedStruggle: boolean,
  currentMovePosition: BattleMoveSlot = moveSlot,
): BattleScriptRulesContext {
  const chosenMovePositions = Object.freeze(
    priorRulesContext.chosenMovePositions.map((position, battler) =>
      battler === mover ? moveSlot : position
    ),
  ) as unknown as BattleScriptRulesContext["chosenMovePositions"];
  return createBattleScriptRulesContext({
    ...priorRulesContext,
    selectorRoles: { attacker: mover, target, effectBattler: target, fainted: null },
    scriptingBattler: mover,
    currentMove: moveId,
    currentMovePosition,
    chosenMove: moveId,
    chosenMovePositions,
    // HandleAction_UseMove resets these globals for every acting battler
    // before BattleScriptExecute (battle_util.c:91-96). Carrying the first
    // action's completed canceler cursor into the second action would skip
    // newly-applied admission conditions such as Disable.
    atkCancelerTracker: 0,
    critMultiplier: 1,
    dmgMultiplier: 1,
    moveResultFlags: 0,
    multiHitCounter: 0,
    missType: 0,
    hitMarker: forcedStruggle
      ? (priorRulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT) >>> 0
      : priorRulesContext.hitMarker,
  });
}

type ActionResult =
  | Readonly<{ kind: "complete"; state: MachineState }>
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>
  | Readonly<{
    kind: "player-choice";
    state: MachineState;
    battler: BattleScriptBattlerId;
    faintedPartyIndex: number;
    legalPartyIndexes: readonly number[];
  }>;

/**
 * `HandleAction_UseMove`'s execution-time `GetMoveTarget(move, NO_TARGET_OVERRIDE)`
 * (ISSUES #140). Four of its branches re-derive the target at ACTION time
 * instead of carrying the one banked at selection -- forced Struggle
 * (`battle_util.c:105`), the Encore match (`:117`), an Encore whose slot was
 * overwritten (`:128`) and a chosen slot overwritten between selection and
 * execution (`:133`) -- and every one of them pays for the
 * `MOVE_TARGET_SELECTED` do/while's geometric(1/2) draw count. The ordinary
 * chosen-move path (`:135-138`) calls nothing and stays draw-free, which is
 * why this is a per-branch helper and not something `buildActionContext` does
 * for everyone.
 *
 * Stock-ROM receipt: `tools/probe/receipts/issue140-getmovetarget-off.json` --
 * Encore-forced opponent actions spent 1 and 2 draws (seed 305419897), 1 and 1
 * (seed 1234567890), Struggle-forced actions 1 and 3, while all eight of the
 * control arm's ordinary prologues spent 0.
 *
 * Follow Me short-circuits the loop without a draw (`:113-116`) whenever the
 * side OPPOSITE the attacker has a live `setforcedtarget` user, which
 * `battleScriptSetforcedtargetOpcode.ts` does model, so it is honoured here
 * rather than assumed unreachable. The Lightning Rod redirect that follows the
 * loop (`:123-131`) is doubles-only -- it flips `targetBattler ^= BIT_FLANK`,
 * a position that does not exist with two battlers -- and consumes no RNG
 * either way, so it is left to the doubles work rather than approximated.
 *
 * The draw is a C-side one with no opcode of its own, so it is attributed to
 * the entry instruction of the script the action is about to run, the same
 * "nearest concrete instruction in hand" convention
 * `battleEndTurnOrchestration.ts`'s Shed Skin tick and
 * `battleScriptAttackCancelerOpcode.ts`'s admission draws already use.
 */
function drawActionMoveTarget(
  program: BattleScriptProgram,
  priorState: MachineState,
  mover: BattleScriptBattlerId,
  moveId: number,
  entryLabel: string,
): Readonly<{ rng: MachineState["rng"]; target: BattleScriptBattlerId }> {
  const rules = priorState.rulesContext;
  const move = MOVES_BY_ID.get(moveId);
  if (!move) {
    throw new Error(`move ${moveId} is absent from generated gBattleMoves`);
  }
  if (move.target.length !== 1 || move.target[0] !== "MOVE_TARGET_SELECTED") {
    // Only MOVE_TARGET_SELECTED reaches the draw loop; every other shape this
    // reducer can execute resolves positionally (battle_util.c:3863-3910).
    return Object.freeze({ rng: priorState.rng, target: sourceMoveTarget(moveId, mover as BattleSinglesBattler) });
  }
  const attackerSide = rules.battlers[mover].side;
  const opposingSide = attackerSide === 0 ? 1 : 0;
  const followMe = rules.sideTimers[opposingSide];
  if (followMe.followmeTimer !== 0 && rules.battlers[followMe.followmeTarget].hp !== 0) {
    return Object.freeze({ rng: priorState.rng, target: followMe.followmeTarget });
  }
  const entry = resolveBattleScriptLabel(program, entryLabel);
  if (!entry) throw new Error(`unknown Battle Script entry label ${entryLabel}`);
  const entryInstruction = program.instructions[entry.programCounter];
  if (!entryInstruction) {
    throw new Error(`Battle Script program has no instruction at ${entry.programCounter}`);
  }
  return drawBattleScriptSelectedMoveTarget(rules, mover, priorState.rng, entryInstruction);
}

/**
 * Which `HandleAction_UseMove` branch this battler's action will take, in the
 * source's own order (`battle_util.c:99-138`), reduced to the one bit
 * `runMoveAction` needs: does it re-derive the target (and pay
 * `GetMoveTarget`'s draws) or ride the one banked at selection?
 *
 * Evaluated on the PRE-`clearOverwrittenEncoreAtAction` rules context on
 * purpose: the port hoists that cleanup to turn start for both battlers, so by
 * action time the `:120-131` "encored move was overwritten" branch has already
 * erased the evidence that it is the branch being taken -- and it draws
 * exactly like the `:112-118` match does.
 *
 * `forcedStruggle` is the caller's own `battlerUsesForcedStruggle` answer, so
 * this stays consistent with the branch the reducer actually executes; the
 * STATUS2_MULTIPLETURNS / STATUS2_RECHARGE lock (`:107-110`) is the one forced
 * action that calls no `GetMoveTarget` at all, and it is checked BEFORE the
 * Encore arms (`:111-128`), so a locked battler that also carries an Encore
 * returns `false` (ISSUES #172, receipts enc160-hbenc / enc160-c2ice):
 * `Cmd_trysetencore` (`battle_script_commands.c:8017`) never checks for a
 * lock, so Thrash / Ice Ball / Uproar / Bide / a recharge turn can be
 * Encored. If a faster foe clears the lock mid-turn, `runMoveAction`'s
 * action-time `actionEncoreArm` takes the Encore arm. The fourth branch (`:130-134`, the live
 * chosen slot differs from the banked gChosenMoveByBattler) depends on state
 * at the battler's own action, so `runMoveAction` resolves it there; see
 * `actionTakesChosenMoveChangedArm`.
 */
function actionRetargetsAtExecution(
  preClearRulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
  forcedStruggle: boolean,
): boolean {
  if (forcedStruggle) return true;
  if (battlerStatusMoveLock(preClearRulesContext, battler) !== 0) return false;
  const source = preClearRulesContext.battlers[battler]!;
  return source.encoreTimer !== 0 && source.encoredMove !== 0;
}

/**
 * gChosenMoveByBattler as HandleTurnActionSelectionState banks it, read from
 * the selection-time rules context: MOVE_NONE for a STATUS2_MULTIPLETURNS /
 * RECHARGE battler that skips selection (battle_main.c:4098-4104) and for the
 * AreAllMovesUnusable script (:4184-4191), the Encore move for an Encored
 * battler (:4192-4196), otherwise the selected slot's move (:4399).
 */
function selectionChosenMove(
  selectionRulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
  moveSlot: BattleMoveSlot,
): number {
  if (battlerStatusMoveLock(selectionRulesContext, battler) !== 0) return 0;
  if (battlerHasNoUsableMoveSlot(selectionRulesContext, battler)) return 0;
  const source = selectionRulesContext.battlers[battler]!;
  if (source.encoredMove !== 0) return source.encoredMove;
  return source.moves[moveSlot]!;
}

/**
 * `HandleAction_UseMove`'s `:130-134` arm (ISSUES #140, rcp143 R3), evaluated
 * on the rules context at this battler's own action, after the noValidMoves
 * and Encore arms (the caller's `forcedStruggle` / `retargetsAtExecution`).
 * In singles it fires when a lock banked MOVE_NONE at selection and a faster
 * foe cancelled it mid-turn (sleep / freeze `CancelMultiTurnMoves`, Spite to
 * 0 PP): the locked arm no longer matches, so source runs the live chosen
 * slot's move and pays `GetMoveTarget`'s draws.
 */
function actionTakesChosenMoveChangedArm(
  actionRulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
  moveSlot: BattleMoveSlot,
): boolean {
  if (battlerStatusMoveLock(actionRulesContext, battler) !== 0) return false;
  return actionRulesContext.battlers[battler]!.moves[moveSlot]
    !== actionRulesContext.chosenMoveByBattler[battler];
}

/**
 * ISSUES #139 -- CheckFocusPunch_ClearVarsBeforeTurnStarts (battle_main.c:4906-4923),
 * between turn-order fixing and action 1: in battler-index order, every battler
 * whose banked gChosenMoveByBattler is MOVE_FOCUS_PUNCH and that is not asleep,
 * not Truant-loafing and not noValidMoves runs BattleScript_FocusPunchSetUp
 * (battle_scripts_1.s:3709-3715) as its own end2 script with gActiveBattler =
 * gBattlerAttacker = that battler. noValidMoves is subsumed by the bank: an
 * AreAllMovesUnusable battler banks MOVE_NONE (selectionChosenMove). The script
 * draws no RNG (rcp143 R4); its playanimation takes Cmd_playanimation's own
 * HITMARKER_NO_ANIMATIONS / semi-invulnerable gates (Scene OFF: Pausex20).
 */
function runFocusPunchSetUpPrePass(handlers: Handlers, priorState: MachineState): RunToOwnEndResult {
  let state = priorState;
  for (const battler of [0, 1] as const) {
    const rules = state.rulesContext;
    const mon = rules.battlers[battler]!;
    if (rules.chosenMoveByBattler[battler] !== MOVE_FOCUS_PUNCH) continue;
    if ((mon.status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) continue;
    if (mon.truantCounter !== 0) continue;
    const started = startBattleScriptExecute(PROGRAM, "BattleScript_FocusPunchSetUp", {
      ...state,
      rulesContext: createBattleScriptRulesContext({
        ...rules,
        selectorRoles: { ...rules.selectorRoles, attacker: battler },
      }),
    });
    const run = runScriptToOwnEnd(PROGRAM, handlers, started);
    if (run.kind !== "terminal") return run;
    state = run.state;
  }
  return Object.freeze({ kind: "terminal", state });
}

/** include/constants/moves.h MOVE_RAGE. */
const MOVE_RAGE = 99;
/** include/constants/battle.h STATUS2_RAGE. */
const STATUS2_RAGE = 1 << 23;

/**
 * `TryClearRageStatuses` (`battle_util.c:1973-1981`), which
 * `CheckFocusPunch_ClearVarsBeforeTurnStarts` calls once the Focus Punch
 * set-up loop is done and before action 1 (`battle_main.c:4925`): a battler
 * with STATUS2_RAGE whose banked gChosenMoveByBattler is not MOVE_RAGE loses
 * the flag. The bank is MOVE_NONE for a switch, a locked move and a forced
 * Struggle (`:4004` resets it every turn), and Metronome / Sleep Talk / Mirror
 * Move calling Rage bank the CALLING move, so that Rage lasts one turn. Without
 * this the flag was never dropped and every later hit kept raising Attack
 * (ROM seed 1904: Clefable's Metronome called Rage, docs/parity-mac/rage-status-clear.md).
 */
function tryClearRageStatuses(state: MachineState): MachineState {
  let rules = state.rulesContext;
  for (const battler of [0, 1] as const) {
    const mon = rules.battlers[battler]!;
    if ((mon.status2 & STATUS2_RAGE) === 0) continue;
    if (rules.chosenMoveByBattler[battler] === MOVE_RAGE) continue;
    rules = withBattler(rules, battler, {
      status2: (mon.status2 & ~STATUS2_RAGE) >>> 0,
    });
  }
  return rules === state.rulesContext ? state : Object.freeze({ ...state, rulesContext: rules });
}

/**
 * `HandleAction_UseMove`'s two Encore arms (`battle_util.c:111-117` and
 * `:119-128`), evaluated on the rules context at this battler's OWN action
 * (ISSUES #170, receipts rcp154-c2 / rcp154-c2u): an Encore a faster foe set
 * earlier in the same turn (`Cmd_trysetencore`, `battle_script_commands.c:
 * 8017`) applies. Source order: the noValidMoves arm (the caller's
 * `forcedStruggle`) and the STATUS2_MULTIPLETURNS / RECHARGE lock arm come
 * first, so neither yields here. Both arms set only the globals
 * gCurrMovePos / gChosenMovePos to `encoredMovePos` --
 * `gBattleStruct->chosenMovePositions[attacker]` keeps the selected slot
 * (Grudge reads it) -- and both call `GetMoveTarget`. The overwritten arm
 * also clears the Encore. For a turn-start Encore this is the same move,
 * slot and retarget the selection already chose (`lockedMoveDecision`); the
 * turn-start `clearOverwrittenEncoreAtAction` hoist means the `:119-128` arm
 * is normally consumed there and reported via `retargetsAtExecution`.
 */
function actionEncoreArm(
  actionRulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): Readonly<{ moveId: number; movePosition: BattleMoveSlot; rulesContext: BattleScriptRulesContext }> | null {
  if (battlerStatusMoveLock(actionRulesContext, battler) !== 0) return null;
  const source = actionRulesContext.battlers[battler]!;
  if (source.encoredMove === 0) return null;
  const movePosition = source.encoredMovePos as BattleMoveSlot;
  if (source.moves[movePosition] === source.encoredMove) {
    return Object.freeze({ moveId: source.encoredMove, movePosition, rulesContext: actionRulesContext });
  }
  return Object.freeze({
    moveId: source.moves[movePosition]!,
    movePosition,
    rulesContext: withBattler(actionRulesContext, battler, {
      encoredMove: 0,
      encoredMovePos: 0,
      encoreTimer: 0,
    }),
  });
}

/**
 * `HandleAction_UseMove`'s "choose target" block (`battle_util.c:148-156`), after its move / target arms: a
 * MOVE_TARGET_SELECTED move goes to the foe's Follow Me user while that Pokemon's Follow Me is up and it has HP. In
 * singles the target such a move carries is the foe already, with one exception: the player's Curse while the user is
 * not a Ghost type, which the player's controller banks with the user itself as target (`moveMenuTarget`). Follow Me
 * aims it at the foe; `Cmd_ppreduce`'s Pressure test reads that target (parity-mac fix 42,
 * docs/parity-mac/follow-me-redirect.md).
 */
function followMeActionTarget(
  rules: BattleScriptRulesContext,
  mover: BattleScriptBattlerId,
  moveId: number,
  target: BattleScriptBattlerId,
): BattleScriptBattlerId {
  const move = MOVES_BY_ID.get(moveId);
  if (!move || move.target.length !== 1 || move.target[0] !== "MOVE_TARGET_SELECTED") return target;
  const attackerSide = rules.battlers[mover]!.side;
  const followMe = rules.sideTimers[attackerSide === 0 ? 1 : 0]!;
  if (followMe.followmeTimer === 0) return target;
  const followTarget = followMe.followmeTarget;
  if (rules.battlers[followTarget]!.side === attackerSide || rules.battlers[followTarget]!.hp === 0) return target;
  return followTarget;
}

/** Runs one battler's chosen move from its LITERAL topology entry (census precedent, `factoryBattleScriptDecision.ts`'s own mechanism). */
function runMoveAction(
  program: BattleScriptProgram,
  handlers: Handlers,
  priorState: MachineState,
  mover: BattleScriptBattlerId,
  moveId: number,
  moveSlot: BattleMoveSlot,
  target: BattleScriptBattlerId,
  forcedStruggle = false,
  retargetsAtExecution = false,
): ActionResult {
  const encore = forcedStruggle ? null : actionEncoreArm(priorState.rulesContext, mover as BattleSinglesBattler);
  const actionRules = encore?.rulesContext ?? priorState.rulesContext;
  const chosenMoveChanged = encore === null
    && !forcedStruggle
    && !retargetsAtExecution
    && actionTakesChosenMoveChangedArm(actionRules, mover as BattleSinglesBattler, moveSlot);
  const executedMoveId = encore !== null
    ? encore.moveId
    : chosenMoveChanged
    ? actionRules.battlers[mover]!.moves[moveSlot]!
    : moveId;
  const topology = TOPOLOGY_BY_MOVE.get(executedMoveId);
  if (!topology) throw new Error(`move ${executedMoveId} has no source Battle Script entry`);
  const actionState: MachineState = encore === null
    ? priorState
    : Object.freeze({ ...priorState, rulesContext: actionRules });
  const retarget = retargetsAtExecution || chosenMoveChanged || encore !== null
    ? drawActionMoveTarget(program, actionState, mover, executedMoveId, topology.entryScript)
    : null;
  const actionContext = buildActionContext(
    actionRules,
    mover,
    executedMoveId,
    moveSlot,
    followMeActionTarget(actionRules, mover, executedMoveId, retarget?.target ?? target),
    forcedStruggle,
    encore?.movePosition ?? moveSlot,
  );
  const started = startBattleScriptExecute(program, topology.entryScript, {
    ...actionState,
    rulesContext: actionContext,
    rng: retarget?.rng ?? priorState.rng,
  });
  const run = runScriptToOwnEnd(program, handlers, started);
  if (run.kind === "player-choice") {
    return Object.freeze({
      kind: "player-choice",
      state: run.state,
      battler: run.battler,
      faintedPartyIndex: run.faintedPartyIndex,
      legalPartyIndexes: run.legalPartyIndexes,
    });
  }
  if (run.kind === "barrier") return Object.freeze({ kind: "barrier", state: run.state, instruction: run.instruction });
  return Object.freeze({ kind: "complete", state: run.state });
}

/**
 * Cmd_jumpifnopursuitswitchdmg (`battle_script_commands.c:8723-8765`) --
 * voluntary-switch-only registration. The non-Pursuit arm is the literal
 * jump to BattleScript_DoSwitchOut. The Pursuit-interception arm (all six
 * guard conditions true) falls through instead: it rewrites the Pursuit
 * user's turn-order action to B_ACTION_TRY_FINISH, banks the Pursuit move
 * values, and lets the switch script's own swapattackerwithtarget /
 * BattleScript_PursuitDmgOnSwitchOut block land the double-power pre-switch
 * hit. The `gMultiHitCounter != 1` RIGHT-flank target selection is the
 * doubles-only path this singles reducer never enters (runVoluntarySwitchAction
 * always stages `setmultihit 1`), kept as a named barrier rather than
 * silently assuming the singles flank.
 */
function voluntarySwitchHandlers(
  base: Handlers,
  switchingBattler: BattleSinglesBattler,
  opposingMoveId: number,
  opposingMoveTarget: BattleScriptBattlerId,
): Handlers {
  const instruction = firstInstructionWithOpcodeName(PROGRAM, "B_SCR_OP_JUMPIFNOPURSUITSWITCHDMG");
  if (!instruction) {
    throw new Error("assembled program has no jumpifnopursuitswitchdmg instruction");
  }
  const returnToBallInstruction = PROGRAM.instructions.find(
    (candidate) =>
      candidate.source.label === "BattleScript_DoSwitchOut"
      && candidate.opcodeName === "B_SCR_OP_RETURNATKTOBALL",
  );
  if (!returnToBallInstruction) {
    throw new Error("assembled program has no voluntary-switch returnatktoball instruction");
  }
  const handler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
    const rules = context.state.rulesContext;
    // gMultiHitCounter != 1 selects the opposite side's RIGHT flank
    // (battle_script_commands.c:8732-8738) -- a doubles-only position this
    // singles reducer's switch path never reaches.
    if (rules.multiHitCounter !== 1) {
      return unsupportedBranch(
        context,
        `jumpifnopursuitswitchdmg right-flank target selection (gMultiHitCounter ${rules.multiHitCounter} != 1, doubles-only)`,
        "battle_script_commands.c",
        8732,
      );
    }
    const opponent = (switchingBattler === 0 ? 1 : 0) as BattleSinglesBattler;
    const opponentState = rules.battlers[opponent]!;
    // battle_script_commands.c:8740-8745 -- all six conditions gate
    // interception. A Truant or asleep/frozen Pursuit user does NOT
    // intercept, and neither does a wrong move target or a fainted switcher.
    const intercepts =
      // gChosenActionByBattler[target] == B_ACTION_USE_MOVE (0): a nonzero
      // opposingMoveId is exactly "the opponent's action is a move", and a
      // zero id means it switched instead (MOVE_NONE == 0 == B_ACTION_USE_MOVE).
      opposingMoveId !== B_ACTION_USE_MOVE
      && opposingMoveTarget === switchingBattler
      && (opponentState.status1 & (BATTLE_SCRIPT_STATUS1_SLEEP | BATTLE_SCRIPT_STATUS1_FREEZE)) === 0
      && rules.battlers[switchingBattler]!.hp !== 0
      && opponentState.truantCounter === 0
      && opposingMoveId === MOVE_PURSUIT;
    if (intercepts) {
      const actionsByTurnOrder = Object.freeze(
        rules.actionsByTurnOrder.map((action, slot) =>
          rules.battlerByTurnOrder[slot] === opponent ? B_ACTION_TRY_FINISH : action
        ),
      ) as unknown as BattleScriptRulesContext["actionsByTurnOrder"];
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: createBattleScriptRulesContext({
            ...rules,
            // gCurrentMove = MOVE_PURSUIT; gCurrMovePos = gChosenMovePos =
            // chosenMovePositions[target] (battle_script_commands.c:8755-8756).
            // gChosenMovePos (the scalar global) is not modeled separately;
            // currentMovePosition carries its value for the hit chain.
            currentMove: MOVE_PURSUIT,
            currentMovePosition: rules.chosenMovePositions[opponent]!,
            actionsByTurnOrder,
            // gBattlescriptCurrInstr += 5 (fall through); animTurn = 1;
            // gHitMarker &= ~HITMARKER_ATTACKSTRING_PRINTED
            // (battle_script_commands.c:8757-8759).
            animTurn: 1,
            hitMarker: (
              rules.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED
            ) >>> 0,
          }),
        },
      );
    }
    const [targetOperand] = context.instruction.operands;
    if (
      context.instruction.operands.length !== 1
      || targetOperand?.widthBytes !== 4
    ) {
      throw new Error("invalid B_SCR_OP_JUMPIFNOPURSUITSWITCHDMG shape");
    }
    const target = resolveBattleScriptLabel(context.program, targetOperand.expression);
    if (!target) {
      throw new Error(
        `unresolved jumpifnopursuitswitchdmg target ${targetOperand.expression}`,
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target.programCounter }),
    );
  };
  // Cmd_returnatktoball (`battle_script_commands.c:5354-5360`) is the
  // voluntary-switch sibling of the already-modeled Cmd_returntoball:
  // controller presentation only, with zero rules/RNG mutation.
  const returnToBallHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
    context,
  ) => transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
  );
  return Object.freeze({
    ...base,
    [instruction.opcodeId]: handler,
    [returnToBallInstruction.opcodeId]: returnToBallHandler,
  });
}

/**
 * HandleAction_Switch + BattleScript_ActionSwitch
 * (`battle_util.c:294-311`, `data/battle_scripts_1.s:3088-3121`). The party
 * choice is already validated by the command boundary, so this stages
 * monToSwitchIntoId exactly where the controller path would have left it and
 * then reuses the existing source-script switch-out/in handlers and entry
 * hooks. The action itself draws no RNG.
 */
function runVoluntarySwitchAction(
  priorState: MachineState,
  switchingBattler: BattleSinglesBattler,
  partyIndex: BattlePartyIndex,
  opposingMoveId: number,
  opposingMoveTarget: BattleScriptBattlerId,
  baseHandlers: Handlers,
): ActionResult {
  const rulesContext = stageVoluntarySwitchRules(
    priorState.rulesContext,
    switchingBattler,
    partyIndex,
  );
  // The skipped ActionSwitch prelude is presentation bookkeeping
  // (hpthresholds2/RETURNMON text) plus the singles counter/setbyte writes
  // staged above -- `setbyte sDMG_MULTIPLIER, 2` (battle_scripts_1.s:3091) and
  // `setmultihit 1` (:3092); begin at its first logical branch.
  const started = startBattleScriptExecute(PROGRAM, "BattleScript_PursuitSwitchDmgLoop", {
    ...priorState,
    rulesContext,
  });
  const run = runScriptToOwnEnd(
    PROGRAM,
    voluntarySwitchHandlers(baseHandlers, switchingBattler, opposingMoveId, opposingMoveTarget),
    started,
  );
  if (run.kind === "barrier") {
    return Object.freeze({
      kind: "barrier",
      state: run.state,
      instruction: run.instruction,
    });
  }
  // The switch script's own `switchineffects BS_ATTACKER` can send the
  // incoming mon straight into Spikes; when that KOs it,
  // BattleScript_SpikesOnAttackerFainted abandons the pushed cursor and jumps
  // to BattleScript_HandleFaintedMon, whose FaintedMonTryChoose runs
  // `openpartyscreen BS_FAINTED` (data/battle_scripts_1.s:3396-3401,
  // :2843-2844). On the player's side that is the same real, human-timescale
  // halt runMoveAction already forwards (ISSUES #89's own shape, ISSUES #113).
  if (run.kind === "player-choice") {
    return Object.freeze({
      kind: "player-choice",
      state: run.state,
      battler: run.battler,
      faintedPartyIndex: run.faintedPartyIndex,
      legalPartyIndexes: run.legalPartyIndexes,
    });
  }
  return Object.freeze({ kind: "complete", state: run.state });
}

/**
 * BattleScript_ActionSwitch's singles prelude (battle_scripts_1.s:3088-3094):
 * staging monToSwitchIntoId where the controller path would have left it,
 * resetting the action-local move values, and reproducing the prelude's
 * `setbyte sDMG_MULTIPLIER, 2` (:3091) that doubles a Pursuit interception.
 * Shared by the reducer's switch action and the staged Tier-1 seam below.
 */
function stageVoluntarySwitchRules(
  priorRulesContext: BattleScriptRulesContext,
  switchingBattler: BattleSinglesBattler,
  partyIndex: BattlePartyIndex,
  multiHitCounter: number = 1,
): BattleScriptRulesContext {
  const opposingBattler = (switchingBattler === 0 ? 1 : 0) as BattleSinglesBattler;
  const monToSwitchIntoId = Object.freeze(
    priorRulesContext.monToSwitchIntoId.map((value, battler) =>
      battler === switchingBattler ? partyIndex : value
    ),
  ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];
  return createBattleScriptRulesContext({
    ...priorRulesContext,
    selectorRoles: {
      attacker: switchingBattler,
      target: opposingBattler,
      effectBattler: opposingBattler,
      fainted: null,
    },
    scriptingBattler: switchingBattler,
    currentMove: 0,
    currentMovePosition: 0,
    monToSwitchIntoId,
    atkCancelerTracker: 0,
    critMultiplier: 1,
    // `setbyte sDMG_MULTIPLIER, 2` (battle_scripts_1.s:3091), executed by
    // BattleScript_ActionSwitch BEFORE the loop this port enters at, is what
    // doubles a Pursuit interception: BattleScript_PursuitDmgOnSwitchOut's
    // `damagecalc` multiplies by it (Cmd_damagecalc,
    // battle_script_commands.c:1296) and nothing on the interception path
    // resets it in between. Staging it here reproduces that setbyte. It does
    // not leak: HandleAction_UseMove's reset (battle_util.c:92, ported at
    // :1516 above) puts the next move action back at 1, exactly as the ROM
    // does at frame 787 of tools/probe/receipts/issue135-pursuit-switch-off.json.
    dmgMultiplier: 2,
    moveResultFlags: 0,
    // BattleScript_ActionSwitch's singles prelude writes one before entering
    // BattleScript_PursuitSwitchDmgLoop (battle_scripts_1.s:3092-3094). The
    // staged seam preserves the caller's counter so the doubles right-flank
    // barrier stays reachable with a staged `setmultihit 2`.
    multiHitCounter,
    missType: 0,
  });
}

export type StagedVoluntarySwitchResult = Readonly<{
  /**
   * Machine state immediately after `Cmd_jumpifnopursuitswitchdmg` resolves
   * (the branch's own writes: currentMove/currentMovePosition/animTurn/
   * hitMarker/actionsByTurnOrder, plus the program counter proving
   * fall-through vs jump).
   */
  atBranch: MachineState;
  /** State after the switch script runs to its own end (Pursuit hit + switch-in). */
  completed: MachineState;
}>;

/**
 * Staged Tier-1 seam over the voluntary-switch action: steps
 * BattleScript_PursuitSwitchDmgLoop's `jumpifnopursuitswitchdmg` once, then
 * runs the switch script to completion. Lets the interception guard and every
 * blocking condition be asserted directly on the rules context
 * (currentMove/currentMovePosition/animTurn/hitMarker/actionsByTurnOrder)
 * plus the program counter, without threading a reducer decision.
 * `opposingMoveTarget` is the source `gBattleStruct->moveTarget` of the
 * opposing battler's selected move.
 */
export function runStagedVoluntarySwitch(
  rulesContext: BattleScriptRulesContext,
  switchingBattler: BattleSinglesBattler,
  partyIndex: BattlePartyIndex,
  opposingMoveId: number,
  opposingMoveTarget: BattleScriptBattlerId,
  rngSeed: number,
): StagedVoluntarySwitchResult {
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, externalPorts());
  const switchHandlers = voluntarySwitchHandlers(
    handlers,
    switchingBattler,
    opposingMoveId,
    opposingMoveTarget,
  );
  const opponent = (switchingBattler === 0 ? 1 : 0) as BattleSinglesBattler;
  const state: MachineState = Object.freeze({
    programCounter: 0,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: createBattleScriptSchedulerState(),
    rulesContext: withTurnOrderPositions(
      stageVoluntarySwitchRules(
        rulesContext,
        switchingBattler,
        partyIndex,
        // The switch prelude always writes a nonzero counter before the loop
        // (setmultihit 1 singles / 2 doubles), so an unstaged 0 means the
        // singles default; a staged 2 keeps the doubles barrier reachable.
        rulesContext.multiHitCounter === 0
          ? 1
          : rulesContext.multiHitCounter,
      ),
      0,
      switchingBattler,
      opponent,
    ),
    rng: createBattleScriptRngState(rngSeed),
    events: Object.freeze([]),
  });
  const atBranch = stepBattleScriptMachine(
    PROGRAM,
    startBattleScriptExecute(PROGRAM, "BattleScript_PursuitSwitchDmgLoop", state),
    switchHandlers,
  ).state;
  const completed = runScriptToOwnEnd(PROGRAM, switchHandlers, atBranch).state;
  return Object.freeze({ atBranch, completed });
}

/**
 * Source GetBattlerTurnOrderNum/gCurrentTurnActionNumber (battle_script_
 * commands.c:2210-2219, battle_main.c:162), needed by SetMoveEffect's
 * MOVE_EFFECT_FLINCH gate (docs/set-move-effect-ground-truth.md:104-112).
 * This reducer is the one owner of real per-action turn-order values: mover1
 * always occupies position 0 (gBattlerByTurnOrder[0]), mover2 position 1
 * (singles only, matching this reducer's own two-mover shape), and
 * currentTurnActionNumber tracks which action is currently executing.
 * turnOrderNum itself does not change across the turn -- only
 * currentTurnActionNumber does, once per action -- so this is called once
 * per action with the same mover1/mover2 pair.
 *
 * `chosenActionByBattler` (gChosenActionByBattler, battle_main.c:159) is
 * supplied once, at the turn's first call: HandleTurnActionSelectionState
 * banks each battler's action and nothing clears it until BattleTurnPassed's
 * closing block (battle_main.c:4001-4004), so it stays readable through the
 * whole turn INCLUDING the end-turn pass, where ENDTURN_ORDER's
 * `GetWhoStrikesFirst(..., ignoreChosenMoves = FALSE)` needs it to tell a
 * move action's priority bracket from a switch's MOVE_NONE. Omitting it
 * preserves the prior value, which is what the per-action re-calls want.
 * `chosenMoveByBattler` (gChosenMoveByBattler) is banked the same way; see
 * `selectionChosenMove`.
 */
/**
 * SetActionsAndBattlersTurnOrder (battle_main.c:4816-4850) rewrites
 * gActionsByTurnOrder[0..gBattlersCount) from gChosenActionByBattler every
 * turn, so a previous turn's TRY_FINISH / CANCEL_PARTNER (ISSUES #169) never
 * leaks into this one. Singles: slots 2-3 are untouched, as in source.
 */
function withTurnStartActions(
  rulesContext: BattleScriptRulesContext,
  actionsInTurnOrder: readonly [number, number],
): BattleScriptRulesContext {
  const actionsByTurnOrder = rulesContext.actionsByTurnOrder.map((action, slot) =>
    slot < 2 ? actionsInTurnOrder[slot]! : action
  ) as unknown as BattleScriptRulesContext["actionsByTurnOrder"];
  return Object.freeze({ ...rulesContext, actionsByTurnOrder: Object.freeze(actionsByTurnOrder) });
}

function withTurnOrderPositions(
  rulesContext: BattleScriptRulesContext,
  currentTurnActionNumber: number,
  mover1: BattleScriptBattlerId,
  mover2: BattleScriptBattlerId,
  chosenActionByBattler?: readonly number[],
  chosenMoveByBattler?: readonly number[],
): BattleScriptRulesContext {
  const battlers = rulesContext.battlers.map((battler, index) => {
    if (index === mover1) return Object.freeze({ ...battler, turnOrderNum: 0 });
    if (index === mover2) return Object.freeze({ ...battler, turnOrderNum: 1 });
    return battler;
  }) as unknown as BattleScriptRulesContext["battlers"];
  return Object.freeze({
    ...rulesContext,
    battlers: Object.freeze(battlers),
    battlerByTurnOrder: Object.freeze([
      mover1,
      mover2,
      2,
      3,
    ] as const),
    chosenActionByBattler: chosenActionByBattler === undefined
      ? rulesContext.chosenActionByBattler
      : (Object.freeze([...chosenActionByBattler]) as unknown as BattleScriptRulesContext["chosenActionByBattler"]),
    chosenMoveByBattler: chosenMoveByBattler === undefined
      ? rulesContext.chosenMoveByBattler
      : (Object.freeze([...chosenMoveByBattler]) as unknown as BattleScriptRulesContext["chosenMoveByBattler"]),
    currentTurnActionNumber,
  });
}

function machineBarrierBoundary(instruction: BattleScriptInstruction, instructionsExecuted: number): BattleBoundary {
  return Object.freeze({
    kind: "machine-barrier",
    barrier: Object.freeze({
      kind: "battle-script",
      entryLabel: instruction.source.label,
      programCounter: instruction.programCounter,
      opcodeId: instruction.opcodeId,
      opcodeName: instruction.opcodeName,
      dispatcher: instruction.dispatcher,
      instructionsExecuted,
    }),
  });
}

/**
 * Singles projection of `GetMoveTarget` (`battle_util.c:3828-3910`) for every
 * target shape represented by generated `gBattleMoves[]`. Doubles-only
 * redirection and RANDOM's draw are unreachable with two active battlers, so
 * every non-user shape resolves to the sole opposing active battler. Keeping
 * the generated shape strict prevents a future source expression from
 * silently inheriting the wrong target.
 *
 * **This is the SELECTION-TIME answer only, and it is RNG-free only because
 * selection is** (ISSUES #140). `MOVE_TARGET_SELECTED`'s source arm is NOT
 * pure: `battle_util.c:119-122` resolves it through a
 * `do { Random() % gBattlersCount } while (...)` loop that costs >= 1 draw
 * every time it runs. It just never runs at selection -- the four
 * `HandleAction_UseMove` branches that re-target at EXECUTION time
 * (`:105` forced Struggle, `:117` Encore match, `:128` Encore whose slot was
 * overwritten, `:133` chosen slot overwritten) are the only callers, and they
 * go through `drawActionMoveTarget` below instead of this function. The
 * ordinary chosen-move path (`:135-138`) calls `GetMoveTarget` at neither
 * point, which is what makes this projection's draw-free answer correct for
 * the target a battler carries from the move menu into its own action.
 */
function sourceMoveTarget(
  moveId: number,
  attacker: BattleSinglesBattler,
): BattleSinglesBattler {
  const move = MOVES_BY_ID.get(moveId);
  if (!move) {
    throw new Error(`move ${moveId} is absent from generated gBattleMoves`);
  }
  if (move.target.length !== 1) {
    throw new Error(
      `move ${moveId} has unsupported generated target shape ${move.target.join("|")}`,
    );
  }
  switch (move.target[0]) {
    case "MOVE_TARGET_USER":
      return attacker;
    case "MOVE_TARGET_SELECTED":
    case "MOVE_TARGET_DEPENDS":
    case "MOVE_TARGET_BOTH":
    case "MOVE_TARGET_FOES_AND_ALLY":
    case "MOVE_TARGET_OPPONENTS_FIELD":
    case "MOVE_TARGET_RANDOM":
      return attacker === 0 ? 1 : 0;
    default:
      throw new Error(
        `move ${moveId} has unsupported generated target shape ${move.target[0]}`,
      );
  }
}

/**
 * Source `HandleInputChooseMove` publishes the configured moves in slot
 * order. A zero move id is an empty slot, not a legal command;
 * `submitBattleDecision` remains the public membership validator.
 */
function legalMoveDecisions(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): readonly BattleMoveDecision[] {
  const locked = lockedMoveDecision(rulesContext, battler);
  if (locked !== null) return Object.freeze([locked]);
  const source = rulesContext.battlers[battler]!;
  const unusableMask = checkBattleScriptMoveLimitations(
    rulesContext,
    battler,
  );
  const unusable = source.moves.map((_moveId, slot) =>
    (unusableMask & (1 << slot)) !== 0
  );
  if (unusable.every(Boolean)) {
    const moveSlot = rulesContext.chosenMovePositions[battler] as BattleMoveSlot;
    return Object.freeze([Object.freeze({
      kind: "use-move" as const,
      moveSlot,
      targetBattler: sourceMoveTarget(BATTLE_SCRIPT_MOVE_STRUGGLE, battler),
    })]);
  }
  const moves = source.moves;
  const legal = moves.flatMap((moveId, slot) =>
    !unusable[slot]
      ? [Object.freeze({
          kind: "use-move" as const,
          moveSlot: slot as BattleMoveSlot,
          targetBattler: moveMenuTarget(source, moveId, battler),
        })]
      : []);
  return Object.freeze(legal);
}

/** include/constants/moves.h MOVE_CURSE. */
const MOVE_CURSE = 174;

/**
 * The target a battler carries out of the move menu. The two controllers
 * differ for exactly one move. The PLAYER's `HandleInputChooseMove`
 * (`battle_controller_player.c:486-501`) replaces Curse's table target
 * (MOVE_TARGET_SELECTED) by MOVE_TARGET_USER when neither of the user's
 * types is Ghost, so a non-Ghost Curse is sent with the user as its target.
 * The OPPONENT's `OpponentHandleChooseMove` (`battle_controller_opponent.c:1581`,
 * `gBattleMoves[...].target & (USER_OR_SELECTED | USER)`) reads the table
 * only, so its Curse keeps the foe as target. The target matters before the
 * script's own `copybyte gBattlerTarget, gBattlerAttacker`: `Cmd_ppreduce`'s
 * Pressure test is `gBattlerAttacker != gBattlerTarget`
 * (`battle_script_commands.c:1223-1225`), so against a Pressure foe the
 * player's non-Ghost Curse costs 1 PP and the opponent's costs 2 (ROM seed
 * 3375: Muk's Curse into Dusclops, docs/parity-mac/curse-player-target.md).
 * Execution-time retargets (Encore, forced Struggle) go through
 * `GetMoveTarget`, which has no such case, and keep `sourceMoveTarget`.
 */
function moveMenuTarget(
  source: BattleScriptRulesContext["battlers"][number],
  moveId: number,
  battler: BattleSinglesBattler,
): BattleSinglesBattler {
  if (battler === 0 && moveId === MOVE_CURSE && !source.types.includes("TYPE_GHOST")) {
    return battler;
  }
  return sourceMoveTarget(moveId, battler);
}

/**
 * Advisory sibling of `legalMoveDecisions` (ISSUES #72 scout §2.2 option
 * (b)): for every one of the four move slots, mirrors why
 * `TrySetCantSelectMoveBattleScript` would reject it, or `null` for a slot
 * that is currently selectable. Pure and side-effect-free -- does not
 * change `legalMoveDecisions`/`submitBattleDecision`'s pre-filter contract,
 * just explains slots that projection already omits. A slot masked only by
 * Encore-lock or the zero-move bit (not one of
 * `describeIllegalMoveSelection`'s six causes) resolves `null` here too,
 * matching source: neither ever reaches
 * `TrySetCantSelectMoveBattleScript` in the first place (Encore-lock and
 * `AreAllMovesUnusable` both gate *before* the move menu is shown,
 * `battle_main.c:4184-4267`).
 */
export function legalMoveSelectionRejections(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): readonly [
  BattleScriptSelectionRejection | null,
  BattleScriptSelectionRejection | null,
  BattleScriptSelectionRejection | null,
  BattleScriptSelectionRejection | null,
] {
  return Object.freeze([
    describeIllegalMoveSelection(rulesContext, battler, 0),
    describeIllegalMoveSelection(rulesContext, battler, 1),
    describeIllegalMoveSelection(rulesContext, battler, 2),
    describeIllegalMoveSelection(rulesContext, battler, 3),
  ]);
}

/**
 * `HandleTurnActionSelectionState`'s B_ACTION_SWITCH party-menu gate
 * (`battle_main.c:4240-4267`), projected to Factory singles. The source's
 * CHECK_OTHER_SIDE / CHECK_FIELD_EXCEPT_BATTLER scans do not themselves test
 * HP, but action selection only exposes a command while both singles actives
 * are live; retaining that invariant explicitly also keeps absent/fainted
 * synthetic states from inventing a trap.
 */
function isVoluntarySwitchTrapped(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  return voluntarySwitchTrap(rulesContext, battler) !== null;
}

/**
 * Publishes the legal Factory-singles command surface for either battler.
 * STATUS2_MULTIPLETURNS / RECHARGE actions remain move-only (source never
 * asks the controller, `battle_main.c:4160-4165`). An Encored battler DOES
 * get `BtlController_EmitChooseAction` (`:4166-4170`): its move is fixed but
 * it may still switch (docs/parity-mac/encore-struggle-selection.md).
 * Trainer switching uses ShouldSwitch's source-specific hard precheck (not
 * the player party-menu gate: notably, the AI's Arena Trap check has no
 * Flying/Levitate exception).
 */
function legalCommandDecisions(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): readonly BattleCommandDecision[] {
  const moves = legalMoveDecisions(rulesContext, battler);
  if (
    battlerStatusMoveLock(rulesContext, battler) !== 0
    || (
      battler === 0
        ? isVoluntarySwitchTrapped(rulesContext, battler)
        : isFactoryAiSwitchPrecheckBlocked(rulesContext)
    )
  ) {
    return moves;
  }
  const activePartyIndex = rulesContext.battlers[battler]!.partyIndex;
  const party = battler === 0
    ? rulesContext.party.player
    : rulesContext.party.opponent;
  const switches = party.flatMap((member, partyIndex) =>
    partyIndex !== activePartyIndex
      && member.species !== 0
      && !member.isEgg
      && member.hp !== 0
      ? [Object.freeze({
          kind: "switch" as const,
          partyIndex: partyIndex as BattlePartyIndex,
        }) satisfies BattleSwitchDecision]
      : []
  );
  return Object.freeze([...moves, ...switches]);
}

/**
 * `AreAllMovesUnusable`'s own answer for one battler (`battle_util.c:1125-1140`):
 * every slot masked by `CheckMoveLimitations(MOVE_LIMITATIONS_ALL)` means the
 * battler's next move action is not the slot it "chose" at all -- source
 * replaces it with MOVE_STRUGGLE in `HandleAction_UseMove`'s `noValidMoves`
 * branch (`battle_util.c:99-106`) while still riding the banked
 * `gBattleStruct->chosenMovePositions` slot. Exported because the published
 * command surface is slot-indexed and therefore cannot say this by itself:
 * ISSUES #123 read 456 Struggles as 456 uses of the 15-PP move sitting in
 * that slot. Pure and side-effect-free.
 */
export function battlerUsesForcedStruggle(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  // Only the STATUS2_MULTIPLETURNS/RECHARGE lock hides this test: source
  // settles those at STATE_BEFORE_ACTION_CHOSEN (`battle_main.c:4098-4104`),
  // before the `B_ACTION_USE_MOVE` case runs `AreAllMovesUnusable` at all. An
  // Encore lock does NOT (ISSUES #138) -- `:4184` precedes `:4192`.
  return battleScriptForcedMoveSelection(rulesContext, battler) === "struggle";
}

/**
 * `battle_main.c:4098-4104`: the STATUS2_MULTIPLETURNS / STATUS2_RECHARGE
 * lock is settled one state earlier than every other auto-confirm, so it is
 * the one condition that keeps `AreAllMovesUnusable` from running.
 */
function battlerStatusMoveLock(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): number {
  return rulesContext.battlers[battler]!.status2 & (
    BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
  );
}

/**
 * `AreAllMovesUnusable`'s predicate alone (`battle_util.c:1125-1130`), split
 * out so `lockedMoveDecision` can consult it in source order without
 * recursing through `battlerUsesForcedStruggle`.
 */
function battlerHasNoUsableMoveSlot(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  return (
    checkBattleScriptMoveLimitations(rulesContext, battler) & 0x0f
  ) === 0x0f;
}

/**
 * `HandleTurnActionSelectionState`'s B_ACTION_USE_MOVE case
 * (`battle_main.c:4182-4197`): the controller is asked for a MOVE
 * (`BtlController_EmitChooseMove`, `:4199-4219`) only when neither
 * `AreAllMovesUnusable()` (`:4184`, forced Struggle) nor
 * `gDisableStructs[b].encoredMove != 0` (`:4192`) holds. In both of those
 * cases the action itself WAS chosen by the controller (the player's action
 * menu; the opponent's `AI_TrySwitchOrUseItem`,
 * `battle_controller_opponent.c:1540`), but `OpponentHandleChooseMove`
 * (`:1551-1567`, `BattleAI_SetupAIData` + `BattleAI_ChooseMoveOrAction`) never
 * runs: zero AI move-chooser draws. False for a STATUS2 lock, which never
 * reaches a controller at all.
 */
export function battlerMoveSelectionIsForced(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  return battleScriptForcedMoveSelection(rulesContext, battler) !== null;
}

/**
 * The auto-confirmed action of a STATUS2_MULTIPLETURNS / RECHARGE battler
 * (`battle_main.c:4160-4165`: B_ACTION_USE_MOVE with no controller request),
 * or null. The Encore branch of `lockedMoveDecision` is deliberately not
 * included: source still emits ChooseAction for an Encored battler.
 */
function statusLockedMoveDecision(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): BattleMoveDecision | null {
  return battlerStatusMoveLock(rulesContext, battler) === 0
    ? null
    : lockedMoveDecision(rulesContext, battler);
}

/**
 * Source `HandleTurnActionSelectionState` + `HandleAction_UseMove`: a
 * STATUS2_MULTIPLETURNS or STATUS2_RECHARGE battler does not choose a fresh
 * action; it uses its attacker-indexed gLockedMoves entry. This singles
 * adapter recovers the original PP-owning slot from
 * gBattleStruct->chosenMovePositions, without requiring the locked move to
 * occupy that slot (called moves do not).
 */
function lockedMoveDecision(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): BattleMoveDecision | null {
  const battlerState = rulesContext.battlers[battler]!;
  const statusLock = battlerStatusMoveLock(rulesContext, battler);
  if (statusLock === 0) {
    // ISSUES #138 / `battle_main.c:4183-4197`: `AreAllMovesUnusable()` is
    // tested BEFORE `else if (gDisableStructs[b].encoredMove != 0)`, and
    // `CheckMoveLimitations`' own Encore bit (`battle_util.c:1116-1117`)
    // masks every slot that is not the encored move -- so an Encored battler
    // whose encored move is itself Disabled / 0-PP / Taunted / Tormented
    // masks all four slots and takes the `noValidMoves` branch instead of
    // the auto-confirm. Returning null hands it to `legalMoveDecisions`'
    // Struggle projection, which is right in both directions: the source's
    // `AreAllMovesUnusable` arm is reached from the action menu (it does not
    // suppress B_ACTION_SWITCH the way this auto-confirm does).
    if (battlerHasNoUsableMoveSlot(rulesContext, battler)) return null;
    if (battlerState.encoreTimer !== 0 && battlerState.encoredMove !== 0) {
      // battle_util.c:95-112: action selection remains tied to the stored
      // position. If that slot was overwritten, HandleAction_UseMove clears
      // Encore and executes the live move now occupying that position.
      const moveId = battlerState.moves[battlerState.encoredMovePos]!;
      return Object.freeze({
        kind: "use-move",
        moveSlot: battlerState.encoredMovePos as BattleMoveSlot,
        targetBattler: sourceMoveTarget(moveId, battler),
      });
    }
    return null;
  }
  const moveId = rulesContext.lockedMoves[battler]!;
  const moveSlot = rulesContext.chosenMovePositions[battler]!;
  if (moveId === 0) {
    throw new Error(
      `factory full-turn battler ${battler} has an active move lock without a usable gLockedMoves entry`,
    );
  }
  return Object.freeze({
    kind: "use-move",
    moveSlot: moveSlot as BattleMoveSlot,
    targetBattler: sourceMoveTarget(moveId, battler),
  });
}

/**
 * `HandleAction_UseMove`'s execution-time move override. The selected
 * position remains the caller's PP slot, but both gCurrentMove and
 * gChosenMove come from gLockedMoves for multi-turn and recharge actions.
 */
function actionMoveId(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
  moveSlot: BattleMoveSlot,
  forcedStruggle: boolean,
): number {
  if (forcedStruggle) return BATTLE_SCRIPT_MOVE_STRUGGLE;
  const battlerState = rulesContext.battlers[battler]!;
  if (
    (
      battlerState.status2
      & (
        BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
        | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
      )
    ) !== 0
  ) {
    const lockedMove = rulesContext.lockedMoves[battler]!;
    if (lockedMove === 0) {
      throw new Error(
        `factory full-turn battler ${battler} has an active move lock without a usable gLockedMoves entry`,
      );
    }
    return lockedMove;
  }
  return battlerState.moves[moveSlot]!;
}

/** battle_util.c:95-112's execution-time overwritten-slot cleanup. */
function clearOverwrittenEncoreAtAction(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): BattleScriptRulesContext {
  const source = rulesContext.battlers[battler]!;
  if (
    source.encoreTimer === 0
    || source.moves[source.encoredMovePos] === source.encoredMove
  ) {
    return rulesContext;
  }
  return withBattler(rulesContext, battler, {
    encoredMove: 0,
    encoredMovePos: 0,
    encoreTimer: 0,
  });
}

function provenanceEvents(state: MachineState) {
  return Object.freeze(state.events.map((event) => {
    const { sequence: _sequence, provenance, ...payload } = event;
    return Object.freeze({
      payload: Object.freeze(payload),
      provenance,
    });
  }));
}

/**
 * Shared tail for every place this reducer finishes a reducer invocation
 * (fresh two-action turns AND the forced-switch resume path below): reconciles
 * the machine-local RNG ledger onto the decision boundary's own cumulative
 * cursor (the same subtlety this module's own header comment documents for
 * `rngBefore`/`rngAfter`).
 */
function finishFullTurn(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  finalState: MachineState,
  resultRules: FactoryFullTurnDecisionRules,
  boundary: BattleBoundary,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  reconcileFullTurnRng(ctxRng, rngBeforeCalls, finalState);
  return Object.freeze({
    rules: resultRules,
    events: provenanceEvents(finalState),
    boundary,
  });
}

function reconcileFullTurnRng(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  finalState: MachineState,
): void {
  for (const entry of finalState.rng.ledger) ctxRng.draw(entry.reason);
  const rngAfter = ctxRng.snapshot();
  if (rngAfter.value !== finalState.rng.value || rngAfter.calls !== rngBeforeCalls + finalState.rng.calls) {
    throw new Error("full-turn reducer RNG reconciliation diverged from the decision boundary cursor");
  }
}

/**
 * Runs `runBattleEndTurnOrchestration` and builds the resulting boundary --
 * shared by the normal two-action turn tail and the forced-switch resume
 * path (item 3): a "resumed" forced switch (mid-turn KO cancelled the still-
 * pending second action, or there was none left) reaches exactly this same
 * point either way.
 */
function runEndTurnTail(
  ctxRng: BattleDecisionRng,
  rngBeforeCalls: number,
  handlers: Handlers,
  preEndTurnState: MachineState,
  nextRequestId: number,
  resumedResult?: BattleEndTurnResult,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  const endTurn = resumedResult
    ?? runBattleEndTurnOrchestration(PROGRAM, handlers, preEndTurnState);
  if (endTurn.kind === "terminal") {
    return finishFullTurn(
      ctxRng, rngBeforeCalls, endTurn.state,
      buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
      Object.freeze({ kind: "terminal", outcome: mapFactoryBattleOutcome(endTurn.state.rulesContext.battleOutcome) }),
    );
  }
  if (endTurn.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctxRng, rngBeforeCalls, endTurn.state,
      buildRules(endTurn.state.rulesContext, "awaiting-player-command", null),
      machineBarrierBoundary(endTurn.instruction, endTurn.state.instructionsExecuted),
    );
  }
  if (endTurn.kind === "case-barrier") {
    throw new Error(
      `full-turn reducer's end-turn orchestration hit case ${endTurn.caseName} (${endTurn.detail}) -- outside `
        + "this reducer's modeled domain (no proof this rung exercises any still-barriered end-turn case)",
    );
  }
  if (endTurn.kind === "player-choice-required") {
    return finishFullTurn(
      ctxRng,
      rngBeforeCalls,
      endTurn.state,
      buildForcedSwitchPendingRules(endTurn.state.rulesContext, {
        programCounter: endTurn.state.programCounter,
        callStack: endTurn.state.callStack,
        scheduler: endTurn.state.scheduler,
        resumeAt: "finish-end-turn-after-faints",
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: nextRequestId,
          side: endTurn.battler === 0 ? "player" as const : "trainer" as const,
          battler: endTurn.battler as BattleSinglesBattler,
          faintedPartyIndex: endTurn.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: endTurn.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }

  // "next-turn" or "resumed": the battle continues into a fresh decision-required boundary.
  // BattleTurnPassed (battle_main.c:4013) draws gRandomTurnNumber after its
  // continuing cleanup and before HandleTurnActionSelectionState runs. First
  // reconcile the completed interpreter ledger, then perform that one
  // unconditional boundary draw on the durable cursor and reset the local
  // ledger at the new cursor so finishFullTurn cannot replay prior draws.
  reconcileFullTurnRng(ctxRng, rngBeforeCalls, endTurn.state);
  const randomTurnNumber = ctxRng.draw(
    "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
  );
  const boundaryCursor = ctxRng.snapshot();
  const continuingState: MachineState = Object.freeze({
    ...endTurn.state,
    rulesContext: Object.freeze({
      ...endTurn.state.rulesContext,
      randomTurnNumber,
      // battle_main.c:3995-3999: gBattleResults.battleTurnCounter++ (u8, stops at 0xFF). The AI's get_turn_count reads it
      // (docs/parity-mac/ai-turn-counter.md, audit lead A5).
      battleTurnCounter: Math.min(0xff, endTurn.state.rulesContext.battleTurnCounter + 1),
      // BattleTurnPassed's closing loop (battle_main.c:4001-4005).
      chosenMoveByBattler: Object.freeze([0, 0, 0, 0] as const),
    }),
    rng: createBattleScriptRngState(boundaryCursor.value),
  });

  // HandleTurnActionSelectionState auto-confirms a multi-turn player's
  // B_ACTION_USE_MOVE, so only the trainer command remains to collect.
  const lockedPlayerDecision = statusLockedMoveDecision(continuingState.rulesContext, 0);
  const lockedTrainerDecision = statusLockedMoveDecision(continuingState.rulesContext, 1);
  if (lockedPlayerDecision !== null && lockedTrainerDecision !== null) {
    // Source auto-confirms both locked B_ACTION_USE_MOVE entries without
    // exposing either controller command. Resolve the next turn inside this
    // same decision transition, preserving the single RNG cursor and
    // prepending this turn's machine events to the recursively resolved tail.
    const nested = reduceFactoryFullTurnDecision(Object.freeze({
      rules: buildRules(
        continuingState.rulesContext,
        "awaiting-trainer-command",
        Object.freeze({
          kind: "use-move" as const,
          moveSlot: lockedPlayerDecision.moveSlot,
          targetBattler: lockedPlayerDecision.targetBattler,
        }),
      ),
      request: Object.freeze({
        kind: "command",
        requestId: nextRequestId - 1,
        side: "trainer",
        battler: 1 as const,
        legalDecisions: Object.freeze([lockedTrainerDecision]),
      }),
      decision: lockedTrainerDecision,
      rng: ctxRng,
    }));
    return Object.freeze({
      ...nested,
      events: Object.freeze([
        ...provenanceEvents(continuingState),
        ...nested.events,
      ]),
    });
  }
  if (lockedPlayerDecision !== null) {
    return finishFullTurn(
      ctxRng, boundaryCursor.calls, continuingState,
      buildRules(
        continuingState.rulesContext,
        "awaiting-trainer-command",
        Object.freeze({
          kind: "use-move" as const,
          moveSlot: lockedPlayerDecision.moveSlot,
          targetBattler: lockedPlayerDecision.targetBattler,
        }),
      ),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: nextRequestId,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: legalCommandDecisions(continuingState.rulesContext, 1),
        }),
      }),
    );
  }

  return finishFullTurn(
    ctxRng, boundaryCursor.calls, continuingState,
    buildRules(continuingState.rulesContext, "awaiting-player-command", null),
    Object.freeze({
      kind: "decision-required",
      request: Object.freeze({
        kind: "command",
        requestId: nextRequestId,
        side: "player",
        battler: 0 as const,
        legalDecisions: legalCommandDecisions(continuingState.rulesContext, 0),
      }),
    }),
  );
}

/**
 * Resumes a `"forced-switch"` request (item 3, mirroring
 * `factoryBattleScriptTerminalDecision.ts`'s own `resumeForcedSwitchDecision`):
 * reconstructs the halted script from `pendingForcedSwitchAt`'s durable
 * bundle, writes the submitted (already-validated-legal, per
 * `submitBattleDecision`'s own `legalPartyIndexes` gate) party index into
 * `monToSwitchIntoId`, and resumes it. For `resumeAt` "run-end-turn"/
 * "finish-end-turn-after-faints" that halted script is
 * `BattleScript_HandleFaintedMon`, driven by the same slice-1-9 machinery the
 * AI-side dance already uses; a "resumed" result (the only non-terminal,
 * non-barrier outcome possible there) always continues straight into
 * `runEndTurnTail` -- `cancelallactions` already cancelled any still-pending
 * second action inside the dance itself. For "run-action1"/"run-action2"
 * (ISSUES #89) the halted script is instead a mid-action move script (e.g.
 * `BattleScript_EffectBatonPass`) halted on its own `openpartyscreen` --
 * resumed via the shared `continueFullTurnAfterAction` tail below.
 */
function resumeFullTurnForcedSwitch(
  ctx: BattleDecisionReducerContext<FactoryFullTurnDecisionRules>,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  if (ctx.request.kind !== "forced-switch" || ctx.decision.kind !== "switch") {
    throw new Error("factory full-turn decision forced-switch resume requires a matching switch submission");
  }
  const pending = pendingForcedSwitchAt(ctx.rules);
  const rngBefore = ctx.rng.snapshot();
  const actingBattler = pending.pendingScript.resumeAt === "run-end-turn"
    ? pending.rulesContext.battlerByTurnOrder[pending.rulesContext.currentTurnActionNumber]
    : ctx.request.battler;
  if (
    pending.pendingScript.resumeAt === "run-end-turn"
    && (
      actingBattler === undefined
      || actingBattler >= pending.rulesContext.battleTopology.battlersCount
    )
  ) {
    throw new Error(
      "factory full-turn decision forced-switch resume cannot resolve the acting battler at the current turn position",
    );
  }
  const instruction = PROGRAM.instructions[pending.pendingScript.programCounter];
  if (!instruction) {
    throw new Error(
      "factory full-turn decision forced-switch resume: pendingScript program counter is out of range",
    );
  }
  const haltedState: MachineState = Object.freeze({
    programCounter: pending.pendingScript.programCounter,
    callStack: pending.pendingScript.callStack,
    instructionsExecuted: 0,
    haltReason: Object.freeze({
      kind: "player-choice-required" as const,
      programCounter: pending.pendingScript.programCounter,
      opcodeId: instruction.opcodeId,
      opcodeName: instruction.opcodeName,
      battler: ctx.request.battler,
      faintedPartyIndex: ctx.request.faintedPartyIndex,
      legalPartyIndexes: ctx.request.legalPartyIndexes,
    }),
    scheduler: pending.pendingScript.scheduler,
    rulesContext: pending.rulesContext,
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  const ports = externalPorts();
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, ports);

  if (pending.pendingScript.resumeAt === "run-action1" || pending.pendingScript.resumeAt === "run-action2") {
    // A move script (not the HandleFaintedMon dance) halted mid-action on
    // openpartyscreen's player branch -- e.g. Baton Pass (ISSUES #89). Write
    // the chosen replacement and resume the SAME script from its own halted
    // program counter, exactly as `battleScriptOpenPartyScreenOpcode.ts`'s own
    // resume contract documents, then fall into the same post-action
    // continuation the fresh two-action flow already uses.
    const chosenPartyIndex = ctx.decision.partyIndex;
    const monToSwitchIntoId = Object.freeze(
      pending.rulesContext.monToSwitchIntoId.map((value, index) =>
        index === ctx.request.battler ? chosenPartyIndex : value
      ),
    ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];
    const resumedState: MachineState = Object.freeze({
      ...haltedState,
      haltReason: null,
      rulesContext: Object.freeze({ ...pending.rulesContext, monToSwitchIntoId }),
    });
    const run = runScriptToOwnEnd(PROGRAM, handlers, resumedState);
    if (run.kind === "player-choice") {
      // ISSUES #127: the replacement this pause just sent out fainted on entry
      // to its own side's Spikes, so `Cmd_switchineffects`' BS_ATTACKER branch
      // (battle_script_commands.c:5228-5253) ran `BattleScript_SpikesOnAttacker`
      // -> `tryfaintmon_spikes` -> `goto BattleScript_HandleFaintedMon`
      // (data/battle_scripts_1.s:3390-3400), re-entering `openpartyscreen
      // BS_FAINTED` inside the SAME script run. The stock ROM asks the player a
      // second time inside the one action -- oracle receipt in
      // `docs/issue127-baton-pass-spikes-ko-ground-truth.md` -- so this is an
      // ordinary second forced-switch boundary, exactly like the fainted-dance
      // sibling below (ISSUES #119): re-publish the pending bundle at the new
      // halt, keeping this pause's own `resumeAt` and its banked
      // `pendingSecondAction` so the eventual completion still lands on the
      // same post-action tail.
      return finishFullTurn(
        ctx.rng, rngBefore.calls, run.state,
        buildForcedSwitchPendingRules(run.state.rulesContext, {
          programCounter: run.state.programCounter,
          callStack: run.state.callStack,
          scheduler: run.state.scheduler,
          resumeAt: pending.pendingScript.resumeAt,
          ...(pending.pendingScript.pendingSecondAction !== undefined
            ? { pendingSecondAction: pending.pendingScript.pendingSecondAction }
            : {}),
        }),
        Object.freeze({
          kind: "decision-required",
          request: Object.freeze({
            kind: "forced-switch",
            requestId: ctx.request.requestId + 1,
            side: run.battler === 0 ? "player" as const : "trainer" as const,
            battler: run.battler as BattleSinglesBattler,
            faintedPartyIndex: run.faintedPartyIndex as BattlePartyIndex,
            legalPartyIndexes: run.legalPartyIndexes as readonly BattlePartyIndex[],
          }),
        }),
      );
    }
    if (run.kind === "barrier") {
      return finishFullTurn(
        ctx.rng, rngBefore.calls, run.state,
        buildRules(run.state.rulesContext, "awaiting-player-command", null),
        machineBarrierBoundary(run.instruction, run.state.instructionsExecuted),
      );
    }
    return continueFullTurnAfterAction(
      ctx, rngBefore.calls, handlers, run.state, ctx.request.battler as BattleScriptBattlerId,
      "awaiting-player-command", null,
      pending.pendingScript.resumeAt === "run-action1" && pending.pendingScript.pendingSecondAction !== undefined
        ? pending.pendingScript.pendingSecondAction
        : null,
    );
  }

  const orchestration = resumeBattleScriptFaintedActionsAfterPlayerChoice(
    PROGRAM,
    handlers,
    haltedState,
    ctx.decision.partyIndex,
  );
  if (orchestration.kind === "player-choice-required") {
    // ISSUES #119: the replacement the player just sent out fainted on entry
    // (its own side's Spikes), so BattleScript_SpikesOnFaintedBattlerFainted's
    // `goto BattleScript_HandleFaintedMon` (data/battle_scripts_1.s:3427-3431)
    // re-entered `openpartyscreen BS_FAINTED` inside the SAME script run. That
    // is an ordinary second forced-switch boundary, not a throw: re-publish the
    // pending bundle at the new halt, keeping this pause's own `resumeAt` (and
    // its banked second action) so the eventual completion still lands on the
    // same tail.
    return finishFullTurn(
      ctx.rng, rngBefore.calls, orchestration.state,
      buildForcedSwitchPendingRules(orchestration.state.rulesContext, {
        programCounter: orchestration.state.programCounter,
        callStack: orchestration.state.callStack,
        scheduler: orchestration.state.scheduler,
        resumeAt: pending.pendingScript.resumeAt,
        ...(pending.pendingScript.pendingSecondAction !== undefined
          ? { pendingSecondAction: pending.pendingScript.pendingSecondAction }
          : {}),
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: ctx.request.requestId + 1,
          side: orchestration.battler === 0 ? "player" as const : "trainer" as const,
          battler: orchestration.battler as BattleSinglesBattler,
          faintedPartyIndex: orchestration.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: orchestration.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }
  if (orchestration.kind === "no-fainted-battlers") {
    throw new Error(
      `factory full-turn decision forced-switch resume produced an unexpected ${orchestration.kind} result`,
    );
  }

  if (orchestration.kind === "terminal") {
    const finished = pending.pendingScript.resumeAt === "run-end-turn"
      ? handleBattleActionFinished(
        orchestration.state,
        actingBattler as BattleScriptBattlerId,
      )
      : orchestration.state;
    return finishFullTurn(
      ctx.rng, rngBefore.calls, finished,
      buildRules(finished.rulesContext, "awaiting-player-command", null),
      Object.freeze({
        kind: "terminal",
        outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
      }),
    );
  }
  if (orchestration.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, orchestration.state,
      buildRules(orchestration.state.rulesContext, "awaiting-player-command", null),
      machineBarrierBoundary(orchestration.instruction, orchestration.state.instructionsExecuted),
    );
  }

  // orchestration.kind === "resumed"
  if (pending.pendingScript.resumeAt === "finish-end-turn-after-faints") {
    const endTurn = resumeBattleEndTurnAfterFaintedActions(
      PROGRAM,
      handlers,
      orchestration.state,
    );
    return runEndTurnTail(
      ctx.rng,
      rngBefore.calls,
      handlers,
      orchestration.state,
      ctx.request.requestId + 1,
      endTurn,
    );
  }
  return runEndTurnTail(
    ctx.rng,
    rngBefore.calls,
    handlers,
    handleBattleActionFinished(
      orchestration.state,
      actingBattler as BattleScriptBattlerId,
    ),
    ctx.request.requestId + 1,
  );
}

/**
 * Shared tail once one mover's action script has completed its own halt
 * (fresh or resumed from a mid-action player-choice pause, ISSUES #89):
 * runs fainted-actions orchestration, then either the still-pending second
 * mover's action (`second`, only on the first of the turn's two actions) or
 * straight to the end-turn tail. Recurses once, for the second action, with
 * `second: null` -- unifying the original two-action flow with a resume from
 * either action1 or action2's own openpartyscreen halt.
 */
function continueFullTurnAfterAction(
  ctx: BattleDecisionReducerContext<FactoryFullTurnDecisionRules>,
  rngBeforeCalls: number,
  handlers: Handlers,
  actionState: MachineState,
  actingMover: BattleScriptBattlerId,
  phase: FactoryFullTurnDecisionRules["phase"],
  pendingPlayerDecision: FactoryFullTurnDecisionRules["pendingPlayerDecision"],
  second: PendingSecondFullTurnAction | null,
): BattleDecisionReducerOutput<FactoryFullTurnDecisionRules> {
  const faint = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, actionState);
  if (faint.kind === "terminal") {
    const finished = handleBattleActionFinished(faint.state, actingMover);
    return finishFullTurn(
      ctx.rng, rngBeforeCalls, finished,
      buildRules(finished.rulesContext, phase, pendingPlayerDecision),
      Object.freeze({
        kind: "terminal",
        outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
      }),
    );
  }
  if (faint.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctx.rng, rngBeforeCalls, faint.state,
      buildRules(faint.state.rulesContext, phase, pendingPlayerDecision),
      machineBarrierBoundary(faint.instruction, faint.state.instructionsExecuted),
    );
  }
  if (faint.kind === "player-choice-required") {
    // The fainted battler is player-side and its own bench still has a legal
    // replacement (item 3): surface it as a real "forced-switch" decision-
    // required boundary, not a throw -- cancelallactions inside the dance
    // itself already handles any still-pending second action.
    return finishFullTurn(
      ctx.rng, rngBeforeCalls, faint.state,
      buildForcedSwitchPendingRules(keepNoValidMovesOfCancelledStruggle(faint.state.rulesContext, second, faint.battler), {
        programCounter: faint.state.programCounter,
        callStack: faint.state.callStack,
        scheduler: faint.state.scheduler,
        resumeAt: "run-end-turn",
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: ctx.request.requestId + 1,
          side: faint.battler === 0 ? "player" as const : "trainer" as const,
          battler: faint.battler as BattleSinglesBattler,
          faintedPartyIndex: faint.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: faint.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }

  // faint.kind is "no-fainted-battlers" (run the second action, if any) or
  // "resumed" (skip it, per cancelallactions).
  let preEndTurnState = handleBattleActionFinished(faint.state, actingMover);
  if (faint.kind === "resumed") {
    preEndTurnState = Object.freeze({
      ...preEndTurnState,
      // "resumed": the dance replaced a trainer-side Pokemon by itself (a player-side one asks the player, above)
      rulesContext: keepNoValidMovesOfCancelledStruggle(preEndTurnState.rulesContext, second, 1),
    });
  }
  if (second !== null && faint.kind === "no-fainted-battlers") {
    // RunTurnActionsFunctions clears these action-local bits when advancing
    // gCurrentTurnActionNumber (battle_main.c:4949-4954). In particular, a
    // first mover stopped by Disable must not make the second mover disobey.
    const betweenActionsRules = createBattleScriptRulesContext({
      ...preEndTurnState.rulesContext,
      hitMarker: (
        preEndTurnState.rulesContext.hitMarker
        & ~BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING
        & ~BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE
      ) >>> 0,
    });
    if (
      betweenActionsRules.actionsByTurnOrder[1] === B_ACTION_TRY_FINISH
      || betweenActionsRules.actionsByTurnOrder[1] === B_ACTION_CANCEL_PARTNER
    ) {
      // Pursuit interception during action 1 rewrote mover2's turn-order slot
      // to B_ACTION_TRY_FINISH (Cmd_jumpifnopursuitswitchdmg,
      // battle_script_commands.c:8751-8753), so RunTurnActionsFunctions never
      // dispatches mover2's own move -- the switch script already landed the
      // double-power Pursuit hit. Skip straight to end-turn.
      // ISSUES #169: a battler dragged in by action 1's Roar/Whirlwind had its
      // slot set to B_ACTION_CANCEL_PARTNER by Cmd_switchineffects
      // (battle_script_commands.c:5270-5274); HandleAction_ActionFinished
      // dispatches nothing for it (receipts rcp154-c1 / rcp154-c1f).
      // parity-mac fix 39: `cancelallactions` inside action 1's own script (a switched-in Pokemon that faints from Spikes and is replaced) sets
      // every slot to B_ACTION_CANCEL_PARTNER too. A forced Struggle dropped this way keeps its no-valid-moves flag (fix 35).
      preEndTurnState = Object.freeze({
        ...preEndTurnState,
        rulesContext: betweenActionsRules.actionsByTurnOrder[1] === B_ACTION_CANCEL_PARTNER
          ? keepNoValidMovesOfCancelledStruggle(betweenActionsRules, second, -1)
          : betweenActionsRules,
      });
    } else {
      const preAction2State: MachineState = Object.freeze({
        ...preEndTurnState,
        rulesContext: withTurnOrderPositions(
          betweenActionsRules,
          1,
          actingMover,
          second.mover,
        ),
      });
      const action2 = second.switchPartyIndex !== null
        ? runVoluntarySwitchAction(
          preAction2State,
          second.mover as BattleSinglesBattler,
          second.switchPartyIndex,
          second.moveId,
          second.target,
          handlers,
        )
        : runMoveAction(
          PROGRAM,
          handlers,
          preAction2State,
          second.mover,
          second.moveId,
          second.moveSlot,
          second.target,
          second.forcedStruggle,
          second.retargetsAtExecution,
        );
      if (action2.kind === "barrier") {
        return finishFullTurn(
          ctx.rng, rngBeforeCalls, action2.state,
          buildRules(action2.state.rulesContext, phase, pendingPlayerDecision),
          machineBarrierBoundary(action2.instruction, action2.state.instructionsExecuted),
        );
      }
      if (action2.kind === "player-choice") {
        // Same fork as action1's own player-choice halt above, just arising
        // from the SECOND (final) action of the turn instead -- no third
        // action remains, so there is nothing left to persist for the resume.
        return finishFullTurn(
          ctx.rng, rngBeforeCalls, action2.state,
          buildForcedSwitchPendingRules(action2.state.rulesContext, {
            programCounter: action2.state.programCounter,
            callStack: action2.state.callStack,
            scheduler: action2.state.scheduler,
            resumeAt: "run-action2",
          }),
          Object.freeze({
            kind: "decision-required",
            request: Object.freeze({
              kind: "forced-switch",
              requestId: ctx.request.requestId + 1,
              side: action2.battler === 0 ? "player" as const : "trainer" as const,
              battler: action2.battler as BattleSinglesBattler,
              faintedPartyIndex: action2.faintedPartyIndex as BattlePartyIndex,
              legalPartyIndexes: action2.legalPartyIndexes as readonly BattlePartyIndex[],
            }),
          }),
        );
      }
      return continueFullTurnAfterAction(
        ctx, rngBeforeCalls, handlers, action2.state, second.mover, phase, pendingPlayerDecision, null,
      );
    }
  }

  return runEndTurnTail(ctx.rng, rngBeforeCalls, handlers, preEndTurnState, ctx.request.requestId + 1);
}

export const reduceFactoryFullTurnDecision: BattleDecisionReducer<FactoryFullTurnDecisionRules> = (
  ctx,
) => {
  if (ctx.request.kind === "forced-switch") {
    return resumeFullTurnForcedSwitch(ctx);
  }
  const rules = rulesAt(ctx.rules);

  if (rules.phase === "awaiting-player-command") {
    if (
      ctx.request.kind !== "command"
      || ctx.request.side !== "player"
      || ctx.request.battler !== 0
    ) {
      throw new Error("factory full-turn decision requires the player's staged singles command");
    }
    const pendingRules = buildRules(
      rules.rulesContext,
      "awaiting-trainer-command",
      ctx.decision,
    );
    const lockedTrainerDecision = statusLockedMoveDecision(rules.rulesContext, 1);
    if (lockedTrainerDecision !== null) {
      // HandleTurnActionSelectionState has already auto-confirmed the
      // trainer's locked action, so the player's submitted command completes
      // action collection and resolves the turn immediately.
      return reduceFactoryFullTurnDecision(Object.freeze({
        rules: pendingRules,
        request: Object.freeze({
          kind: "command",
          requestId: ctx.request.requestId,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: Object.freeze([lockedTrainerDecision]),
        }),
        decision: lockedTrainerDecision,
        rng: ctx.rng,
      }));
    }
    return Object.freeze({
      rules: pendingRules,
      events: [],
      boundary: Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "command",
          requestId: ctx.request.requestId + 1,
          side: "trainer",
          battler: 1 as const,
          legalDecisions: legalCommandDecisions(rules.rulesContext, 1),
        }),
      }),
    });
  }

  // phase === "awaiting-trainer-command"
  if (
    ctx.request.kind !== "command"
    || ctx.request.side !== "trainer"
    || ctx.request.battler !== 1
    || rules.pendingPlayerDecision === null
  ) {
    throw new Error("factory full-turn decision requires the trainer's staged singles command");
  }

  const rc0Encore = clearOverwrittenEncoreAtAction(
    clearOverwrittenEncoreAtAction(rules.rulesContext, 0),
    1,
  );
  const playerSwitch = rules.pendingPlayerDecision.kind === "switch";
  const trainerSwitch = ctx.decision.kind === "switch";
  // battle_main.c:4398: selecting a move writes gBattleStruct->chosenMovePositions
  // for BOTH battlers, before any action runs. A battler that faints before it
  // acts never reaches buildActionContext's write, yet ENDTURN_ORDER's
  // GetWhoStrikesFirst (battle_main.c:4702-4714) still reads its slot.
  const rc0 = createBattleScriptRulesContext({
    ...rc0Encore,
    // TurnValuesCleanUp(FALSE) zeroed every gProtectStructs cell at the end of the previous turn.
    noValidMovesKept: 0,
    chosenMovePositions: Object.freeze([
      playerSwitch ? rc0Encore.chosenMovePositions[0] : rules.pendingPlayerDecision.moveSlot,
      trainerSwitch ? rc0Encore.chosenMovePositions[1] : ctx.decision.moveSlot,
      rc0Encore.chosenMovePositions[2],
      rc0Encore.chosenMovePositions[3],
    ]) as unknown as BattleScriptRulesContext["chosenMovePositions"],
  });
  const playerSwitchPartyIndex = playerSwitch
    ? rules.pendingPlayerDecision.partyIndex
    : null;
  const trainerSwitchPartyIndex = trainerSwitch
    ? ctx.decision.partyIndex
    : null;
  const playerMoveSlot = playerSwitch
    ? 0 as BattleMoveSlot
    : rules.pendingPlayerDecision.moveSlot;
  const trainerMoveSlot = trainerSwitch
    ? 0 as BattleMoveSlot
    : ctx.decision.moveSlot;
  const playerForcedStruggle = !playerSwitch && battlerUsesForcedStruggle(rc0, 0);
  const trainerForcedStruggle = !trainerSwitch && battlerUsesForcedStruggle(rc0, 1);
  // ISSUES #140 -- read from rules.rulesContext, BEFORE rc0's hoisted
  // clearOverwrittenEncoreAtAction, so the :120-131 overwritten-Encore branch
  // is still visible. See actionRetargetsAtExecution.
  const playerRetargets = !playerSwitch
    && actionRetargetsAtExecution(rules.rulesContext, 0, playerForcedStruggle);
  const trainerRetargets = !trainerSwitch
    && actionRetargetsAtExecution(rules.rulesContext, 1, trainerForcedStruggle);
  const playerMoveId = playerSwitch
    ? 0
    : actionMoveId(
      rc0,
      0,
      playerMoveSlot,
      playerForcedStruggle,
    );
  const trainerMoveId = trainerSwitch
    ? 0
    : actionMoveId(
      rc0,
      1,
      trainerMoveSlot,
      trainerForcedStruggle,
    );
  if (!playerSwitch && playerMoveId === 0) {
    throw new Error(
      `factory full-turn decision player move slot ${playerMoveSlot} is not usable`,
    );
  }
  if (!trainerSwitch && trainerMoveId === 0) {
    throw new Error(`factory full-turn decision trainer move slot ${ctx.decision.moveSlot} is not usable`);
  }
  const playerTarget = playerSwitch
    ? 1 as BattleSinglesBattler
    : rules.pendingPlayerDecision.targetBattler;
  const trainerTarget = trainerSwitch
    ? 0 as BattleSinglesBattler
    : ctx.decision.targetBattler;

  let playerFirst = true;
  if (playerSwitch || trainerSwitch) {
    // SetActionsAndBattlersTurnOrder (battle_main.c:4817-4850): item/switch
    // actions are inserted first in ascending battler order. Speed comparison
    // (and therefore its tie draw) is skipped whenever either action is a
    // switch.
    playerFirst = playerSwitch;
  } else {
    const playerTOB = turnOrderBattlerInputs(rc0, 0, playerMoveId);
    const trainerTOB = turnOrderBattlerInputs(rc0, 1, trainerMoveId);
    const weather = turnOrderWeather(rc0);
    // battle_main.c:4728/4745 -- Random() & 1, drawn ONLY on a genuine speed tie.
    const speedTieRngRoll = isSpeedTie(playerTOB, trainerTOB, weather, rc0.randomTurnNumber)
      ? ctx.rng.draw("turn order speed tie (Random() & 1)")
      : 0;
    const strikesFirst = getWhoStrikesFirst(
      playerTOB,
      trainerTOB,
      speedTieRngRoll,
      weather,
      rc0.randomTurnNumber,
    );
    playerFirst = strikesFirst === 0;
  }

  const mover1: BattleScriptBattlerId = playerFirst ? 0 : 1;
  const mover1MoveId = playerFirst ? playerMoveId : trainerMoveId;
  const mover1MoveSlot = playerFirst ? playerMoveSlot : trainerMoveSlot;
  const mover1Target: BattleScriptBattlerId = playerFirst ? playerTarget : trainerTarget;
  const mover2: BattleScriptBattlerId = playerFirst ? 1 : 0;
  const mover2MoveId = playerFirst ? trainerMoveId : playerMoveId;
  const mover2MoveSlot = playerFirst ? trainerMoveSlot : playerMoveSlot;
  const mover2Target: BattleScriptBattlerId = playerFirst ? trainerTarget : playerTarget;
  const mover1SwitchPartyIndex = mover1 === 0
    ? playerSwitchPartyIndex
    : trainerSwitchPartyIndex;
  const mover2SwitchPartyIndex = mover2 === 0
    ? playerSwitchPartyIndex
    : trainerSwitchPartyIndex;

  const ports = externalPorts();
  const handlers = createBattleScriptStatusRulesHandlers(PROGRAM, ports);
  const rngBefore = ctx.rng.snapshot();

  const initialState: MachineState = Object.freeze({
    programCounter: 0,
    callStack: Object.freeze([]),
    instructionsExecuted: 0,
    haltReason: null,
    scheduler: createBattleScriptSchedulerState(),
    rulesContext: withTurnOrderPositions(withTurnStartActions(rc0, [
      mover1SwitchPartyIndex !== null ? B_ACTION_SWITCH : B_ACTION_USE_MOVE,
      mover2SwitchPartyIndex !== null ? B_ACTION_SWITCH : B_ACTION_USE_MOVE,
    ]), 0, mover1, mover2, [
      // HandleTurnActionSelectionState's banked gChosenActionByBattler
      // (battle_main.c:159): B_ACTION_SWITCH for a party swap, otherwise
      // B_ACTION_USE_MOVE. Read back by ENDTURN_ORDER's re-sort.
      playerSwitch ? B_ACTION_SWITCH : B_ACTION_USE_MOVE,
      trainerSwitch ? B_ACTION_SWITCH : B_ACTION_USE_MOVE,
      B_ACTION_USE_MOVE,
      B_ACTION_USE_MOVE,
    ], [
      playerSwitch ? 0 : selectionChosenMove(rules.rulesContext, 0, playerMoveSlot),
      trainerSwitch ? 0 : selectionChosenMove(rules.rulesContext, 1, trainerMoveSlot),
      0,
      0,
    ]),
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  const prePass = runFocusPunchSetUpPrePass(handlers, initialState);
  if (prePass.kind === "barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, prePass.state,
      buildRules(prePass.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(prePass.instruction, prePass.state.instructionsExecuted),
    );
  }
  if (prePass.kind === "player-choice") {
    throw new Error("BattleScript_FocusPunchSetUp has no openpartyscreen");
  }
  const actionsInitialState = tryClearRageStatuses(prePass.state);

  const action1 = mover1SwitchPartyIndex !== null
    ? runVoluntarySwitchAction(
      actionsInitialState,
      mover1 as BattleSinglesBattler,
      mover1SwitchPartyIndex,
      mover1 === 0 ? trainerMoveId : playerMoveId,
      mover1 === 0 ? trainerTarget : playerTarget,
      handlers,
    )
    : runMoveAction(
      PROGRAM,
      handlers,
      actionsInitialState,
      mover1,
      mover1MoveId,
      mover1MoveSlot,
      mover1Target,
      mover1 === 0 ? playerForcedStruggle : trainerForcedStruggle,
      mover1 === 0 ? playerRetargets : trainerRetargets,
    );
  if (action1.kind === "barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, action1.state,
      buildRules(action1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(action1.instruction, action1.state.instructionsExecuted),
    );
  }
  if (action1.kind === "player-choice") {
    // A move script (not the HandleFaintedMon dance) halted mid-action1 on
    // openpartyscreen's player branch -- e.g. Baton Pass (ISSUES #89).
    // Surface the same "forced-switch" decision-required boundary the
    // fainted-mon dance already publishes, carrying mover2's already-
    // resolved action so the resume can finish the turn without re-deriving
    // trainer AI (below, `continueFullTurnAfterAction`'s "run-action1" caller).
    return finishFullTurn(
      ctx.rng, rngBefore.calls, action1.state,
      buildForcedSwitchPendingRules(action1.state.rulesContext, {
        programCounter: action1.state.programCounter,
        callStack: action1.state.callStack,
        scheduler: action1.state.scheduler,
        resumeAt: "run-action1",
        pendingSecondAction: Object.freeze({
          mover: mover2,
          switchPartyIndex: mover2SwitchPartyIndex,
          moveId: mover2MoveId,
          moveSlot: mover2MoveSlot,
          target: mover2Target,
          forcedStruggle: mover2 === 0 ? playerForcedStruggle : trainerForcedStruggle,
          retargetsAtExecution: mover2 === 0 ? playerRetargets : trainerRetargets,
        }),
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: ctx.request.requestId + 1,
          side: action1.battler === 0 ? "player" as const : "trainer" as const,
          battler: action1.battler as BattleSinglesBattler,
          faintedPartyIndex: action1.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: action1.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }

  return continueFullTurnAfterAction(
    ctx, rngBefore.calls, handlers, action1.state, mover1,
    rules.phase, rules.pendingPlayerDecision,
    Object.freeze({
      mover: mover2,
      switchPartyIndex: mover2SwitchPartyIndex,
      moveId: mover2MoveId,
      moveSlot: mover2MoveSlot,
      target: mover2Target,
      forcedStruggle: mover2 === 0 ? playerForcedStruggle : trainerForcedStruggle,
      retargetsAtExecution: mover2 === 0 ? playerRetargets : trainerRetargets,
    }),
  );
};

export function submitFactoryFullTurnDecision(
  state: BattleState<FactoryFullTurnDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  return submitBattleDecision(state, submission, reduceFactoryFullTurnDecision);
}
