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
import { checkBattleScriptMoveLimitations } from "./battleScriptActionAdmission.ts";
import { resolveMoveName } from "./battleStringResolver.ts";
import {
  HOLD_EFFECT_NAME_BY_ID,
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
} from "./battleScriptProgram.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  resumeBattleScriptFaintedActionsAfterPlayerChoice,
  runBattleScriptFaintedActionsOrchestration,
} from "./battleScriptFaintedActionsOrchestration.ts";
import {
  resumeBattleEndTurnAfterFaintedActions,
  runBattleEndTurnOrchestration,
  weatherHasEffect,
  type BattleEndTurnResult,
} from "./battleEndTurnOrchestration.ts";
import { effectiveSpeed, getWhoStrikesFirst, type TurnOrderBattler, type WeatherState } from "./turnOrder.ts";
import { ABILITY_SYMBOLS } from "./battleScriptSwitchinOpcode.ts";
import { TYPE_DISPLAY_NAMES } from "./fightSubmenuText.ts";
import {
  BATTLE_SCRIPT_BATTLE_ENVIRONMENT_BUILDING,
  BATTLE_SCRIPT_BATTLE_TYPE_FACTORY,
  BATTLE_SCRIPT_BATTLE_TYPE_TRAINER,
  BATTLE_SCRIPT_PARTY_SIZE,
  createBattleScriptRulesContext,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptBattlerHoldEffectParam,
  uniformBattleScriptIvs,
  createBattleScriptStatusRulesHandlers,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
  type BattleScriptStatusRulesExternalPorts,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";
import { isFactoryAiSwitchPrecheckBlocked } from "./factoryAiSwitchPolicy.ts";
import { mapFactoryBattleOutcome } from "./factoryBattleScriptTerminalDecision.ts";
import { battleCommandSpeciesDisplayName } from "./battleCommandPresentation.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };
import frontierHeldItemsData from "../data/gen/battle-frontier-held-items.json" with { type: "json" };
import { resolveSingleBattlePosition } from "./battleScriptBattlerPositions.ts";

const ADAPTER = "factory-full-turn/v1";
const B_WAIT_TIME_LONG = 64;
const B_WAIT_TIME_SHORT = 32;
const STAT_SPEED = 3;
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
/**
 * `gAbilityNames` display text (`reference/pokeemerald/src/data/text/
 * abilities.h:89-146`), scoped to the abilities ISSUES #70 batch 1's
 * B_DEF_ABILITY/B_SCR_ACTIVE_ABILITY presentation ids can actually reveal
 * (`docs/issue70-stringid-reachability.md` rows 2-3) -- not a full 78-entry
 * table.
 */
const ABILITY_DISPLAY_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({
  9: "STATIC",
  18: "FLASH FIRE",
  25: "WONDER GUARD",
  26: "LEVITATE",
  27: "EFFECT SPORE",
  38: "POISON POINT",
  49: "FLAME BODY",
  // BattleScript_StickyHoldActivates (reference/pokeemerald/data/battle_scripts_1.s:4173-4177)
  // reuses STRINGID_PKMNSXMADEYINEFFECTIVE for Sticky Hold blocking Trick
  // (battleScriptTryswapitemsOpcode.ts:152-177) -- the same id ISSUES #70
  // batch 2 ported for Flash Fire's re-activation shares this ability slot.
  60: "STICKY HOLD",
  // ISSUES #70 batch 3's ability-prevention family (docs/issue70-stringid-
  // reachability.md rows 6-10): the two real trigger paths --
  // BattleScript_ImmunityProtected/WaterVeilPrevents/LimberProtected's direct
  // jumpifability short-circuit, and Synchronize's own seteffectprimary
  // re-application (battleScriptMoveEndOpcode.ts's executeSynchronize) --
  // can reveal any of these five abilities.
  7: "LIMBER",
  15: "INSOMNIA",
  17: "IMMUNITY",
  28: "SYNCHRONIZE",
  41: "WATER VEIL",
  72: "VITAL SPIRIT",
  // ISSUES #72 batch 1's ability-blocks-the-move's-own-effect cluster
  // (docs/issue72-reachability-triage.md): Oblivious/Own Tempo/Clear Body,
  // each read off the move's own target (or scripting) role at print time.
  12: "OBLIVIOUS",
  20: "OWN TEMPO",
  29: "CLEAR BODY",
  // ISSUES #72 batch 2 (docs/issue72-reachability-triage.md): Damp, Volt
  // Absorb/Water Absorb, Suction Cups, Intimidate + its three blockers,
  // Inner Focus, Keen Eye/Hyper Cutter.
  6: "DAMP",
  10: "VOLT ABSORB",
  11: "WATER ABSORB",
  21: "SUCTION CUPS",
  22: "INTIMIDATE",
  39: "INNER FOCUS",
  51: "KEEN EYE",
  52: "HYPER CUTTER",
  73: "WHITE SMOKE",
  // ISSUES #72 batch 3: Soundproof (SoundproofProtected).
  43: "SOUNDPROOF",
  // ISSUES #72 batch 5: Rough Skin, Cute Charm, Role Play's copied ability
  // is arbitrary (LEVITATE reused from the existing table above).
  24: "ROUGH SKIN",
  56: "CUTE CHARM",
  // ISSUES #72 batch 6: Rain Dish, Speed Boost, Shed Skin (all end-turn
  // ability ticks).
  44: "RAIN DISH",
  3: "SPEED BOOST",
  61: "SHED SKIN",
  // ISSUES #72 batch 7: Color Change.
  16: "COLOR CHANGE",
});
function abilityDisplayName(ability: number): string {
  const name = ABILITY_DISPLAY_NAME_BY_ID[ability];
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
/** include/constants/battle.h:232-239 -- all active rain/sun variants. */
const B_WEATHER_RAIN = (1 << 0) | (1 << 1) | (1 << 2);
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
/** include/constants/battle.h:120. */
const STATUS1_PARALYSIS = 1 << 6;
/** include/constants/abilities.h: exact identity constants used by the cited source gates below. */
const ABILITY_SHADOW_TAG = 23;
const ABILITY_LEVITATE = 26;
const ABILITY_MAGNET_PULL = 42;
const ABILITY_KEEN_EYE = 51;
const ABILITY_RUN_AWAY = 50;
const ABILITY_ARENA_TRAP = 71;
/** include/constants/battle.h: STATUS2_ESCAPE_PREVENTION. */
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
/** include/constants/moves.h. */
const MOVE_PURSUIT = 228;

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
   * Only present in phase "forced-switch-pending": the halted
   * `BattleScript_HandleFaintedMon` script's resumable machine state
   * (`factoryBattleScriptTerminalDecision.ts`'s own `pendingScript` precedent) --
   * see `pendingForcedSwitchAt`.
   */
  pendingScript?: PendingForcedSwitchScript;
}>;

type PendingForcedSwitchScript = Readonly<{
  programCounter: number;
  callStack: readonly number[];
  scheduler: BattleScriptSchedulerState;
  /**
   * Source continuation owned by the caller of HandleFaintedMonActions.
   * Action KOs still enter BattleTurnPassed from its start; an end-turn KO
   * has already completed DoField/DoBattler and resumes at the delayed-
   * attack/Perish tail (`battle_main.c:3963-3974`).
   */
  resumeAt: "run-end-turn" | "finish-end-turn-after-faints";
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
    level: 50,
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
    level: 50,
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

function pendingScriptAt(value: unknown): PendingForcedSwitchScript {
  const record = value as
    | Readonly<{ programCounter?: unknown; callStack?: unknown; scheduler?: unknown; resumeAt?: unknown }>
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
    )
  ) {
    throw new Error("factory full-turn decision pendingScript must be a valid halted-script bundle");
  }
  const scheduler = createBattleScriptSchedulerState(
    record.scheduler as Parameters<typeof createBattleScriptSchedulerState>[0],
  );
  return Object.freeze({
    programCounter: record.programCounter as number,
    callStack: Object.freeze([...(record.callStack as readonly number[])]),
    scheduler,
    resumeAt: record.resumeAt,
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
          : [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability), rules.battleTextBuff1Status])
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
                : [abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
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
                ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
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
                        : [abilityDisplayName(rules.battlers[rules.selectorRoles.effectBattler].ability)])
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
                              abilityDisplayName(rules.battlers[rules.selectorRoles.attacker].ability),
                              abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability),
                            ])
                        // Row 8 (STRINGID_PKMNSXHADNOEFFECTONY): same
                        // Synchronize-only reachability; {B_SCR_ACTIVE_ABILITY}
                        // reads the ability holder's (scriptingBattler's) own
                        // ability, always ABILITY_SYNCHRONIZE in practice.
                        : operand.expression === "STRINGID_PKMNSXHADNOEFFECTONY"
                          ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                          // Row 14 (STRINGID_PKMNSTAYEDAWAKEUSING):
                          // createJumpifcantmakeasleepOpcodeHandler's own
                          // Insomnia/Vital Spirit branch always targets the
                          // sleep move's real target (battleScriptStatusPrimaryOpcode.ts:236-245).
                          : operand.expression === "STRINGID_PKMNSTAYEDAWAKEUSING"
                            ? (rules.selectorRoles.target === null
                              ? []
                              : [abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
                            // Row 21 (STRINGID_PKMNSTOCKPILED): the stockpile
                            // count itself (stockpileHandler,
                            // battleScriptStockpileOpcode.ts), the same
                            // counter-substitution shape as HITXTIMES above.
                            // ISSUES #72 batch 6: STRINGID_PKMNPERISHCOUNTFELL
                            // shares this exact battleTextBuff1ByteNumber
                            // read -- runPerishSongAfterFutureAttacks's own
                            // pre-decrement capture (battle_util.c:1846).
                            : operand.expression === "STRINGID_PKMNSTOCKPILED"
                              || operand.expression === "STRINGID_PKMNPERISHCOUNTFELL"
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
                                  ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
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
                                      : [abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
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
                                          abilityDisplayName(rules.battlers[rules.scriptingBattler].ability),
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
                                        ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
                                        // BattleScript_IntimidatePrevented's own
                                        // {B_DEF_ABILITY} -- BS_TARGET at this
                                        // print is whichever of Clear Body/
                                        // Hyper Cutter/White Smoke's
                                        // jumpifability matched.
                                        : operand.expression === "STRINGID_PREVENTEDFROMWORKING"
                                          ? (rules.selectorRoles.target === null
                                            ? []
                                            : [abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
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
                                                : [abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability)])
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
                                                ? [abilityDisplayName(rules.battlers[rules.scriptingBattler].ability)]
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
                                                    : [abilityDisplayName(rules.battlers[rules.selectorRoles.attacker].ability)])
                                                  // BattleScript_EffectDisable's own
                                                  // {B_BUFF1} -- disablelastusedattack's
                                                  // own disabledMove write on the move's
                                                  // still-current target, read back
                                                  // unconditionally right after.
                                                  : operand.expression === "STRINGID_PKMNMOVEWASDISABLED"
                                                    ? (rules.selectorRoles.target === null
                                                      ? []
                                                      : [resolveMoveName(rules.battlers[rules.selectorRoles.target].disabledMove)])
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
                                                            abilityDisplayName(rules.battlers[rules.selectorRoles.target].ability),
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
                                                              : [abilityDisplayName(rules.battlers[rules.battleTextBuff1MonNick.battler].ability)])
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
        // Source gEffectBattler at print time -- battle_message.c's own
        // B_TXT_EFF_NAME_WITH_PREFIX selector reads this same global
        // (:2444-2447). ISSUES #70 batch 3's ability-prevention family needs
        // this distinct from scriptingBattler (applySetMoveEffect's own
        // affectsUser swap sends the two to opposite real battlers,
        // battleScriptHitChainOpcode.ts:2841-2848). Scoped to only the 4 ids
        // that read it -- unlike scriptingBattler, selectorRoles.effectBattler
        // is already a widely-populated generic field (Trick, Leech Seed, the
        // wrap family, ...), so attaching it unconditionally would perturb
        // every other message event's exact payload shape.
        ...((
          operand.expression === "STRINGID_PKMNPREVENTSPOISONINGWITH"
          || operand.expression === "STRINGID_PKMNSXPREVENTSBURNS"
          || operand.expression === "STRINGID_PKMNPREVENTSPARALYSISWITH"
          || operand.expression === "STRINGID_PKMNSXHADNOEFFECTONY"
          || operand.expression === "STRINGID_PKMNSXPREVENTSFLINCHING"
        ) && rules.selectorRoles.effectBattler !== null
          ? { effectBattler: rules.selectorRoles.effectBattler }
          : {}),
        // Source gBattlerTarget at print time -- ISSUES #72 batch 2's
        // Intimidate pair (STRINGID_PKMNCUTSATTACKWITH/PREVENTEDFROMWORKING),
        // whose own IntimidateActivatesLoop cycles BS_TARGET across every
        // opposing battler via trygetintimidatetarget, independent of any
        // move's real defender. Scoped to just these 2 ids for the same
        // reason effectBattler above is scoped.
        ...((
          operand.expression === "STRINGID_PKMNCUTSATTACKWITH"
          || operand.expression === "STRINGID_PREVENTEDFROMWORKING"
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
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

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
    currentMovePosition: moveSlot,
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
  | Readonly<{ kind: "barrier"; state: MachineState; instruction: BattleScriptInstruction }>;

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
): ActionResult {
  const topology = TOPOLOGY_BY_MOVE.get(moveId);
  if (!topology) throw new Error(`move ${moveId} has no source Battle Script entry`);
  const actionContext = buildActionContext(
    priorState.rulesContext,
    mover,
    moveId,
    moveSlot,
    target,
    forcedStruggle,
  );
  const started = startBattleScriptExecute(program, topology.entryScript, {
    ...priorState,
    rulesContext: actionContext,
  });
  const run = runScriptToOwnEnd(program, handlers, started);
  if (run.kind === "barrier") return Object.freeze({ kind: "barrier", state: run.state, instruction: run.instruction });
  return Object.freeze({ kind: "complete", state: run.state });
}

/**
 * Voluntary-switch-only registration for Cmd_jumpifnopursuitswitchdmg
 * (`battle_script_commands.c:8723-8759`). The non-Pursuit arm is the literal
 * jump to BattleScript_DoSwitchOut. Pursuit interception remains an honest,
 * trigger-narrow barrier: silently running the ordinary move after installing
 * the incoming mon would reverse the ROM's target and double-power order.
 */
function voluntarySwitchHandlers(
  base: Handlers,
  switchingBattler: BattleSinglesBattler,
  opposingMoveId: number,
): Handlers {
  const instruction = PROGRAM.instructions.find(
    (candidate) =>
      candidate.opcodeName === "B_SCR_OP_JUMPIFNOPURSUITSWITCHDMG",
  );
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
    if (opposingMoveId === MOVE_PURSUIT) {
      return unsupportedBranch(
        context,
        `voluntary ${switchingBattler === 0 ? "player" : "trainer"} switch while the opponent's selected move is MOVE_PURSUIT `
          + "(pre-switch interception/double-power path)",
        "battle_script_commands.c",
        8723,
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
  baseHandlers: Handlers,
): ActionResult {
  const opposingBattler = (switchingBattler === 0 ? 1 : 0) as BattleSinglesBattler;
  const monToSwitchIntoId = Object.freeze(
    priorState.rulesContext.monToSwitchIntoId.map((value, battler) =>
      battler === switchingBattler ? partyIndex : value
    ),
  ) as unknown as BattleScriptRulesContext["monToSwitchIntoId"];
  const rulesContext = createBattleScriptRulesContext({
    ...priorState.rulesContext,
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
    dmgMultiplier: 1,
    moveResultFlags: 0,
    // BattleScript_ActionSwitch's singles prelude writes one before entering
    // BattleScript_PursuitSwitchDmgLoop (battle_scripts_1.s:3093-3098).
    multiHitCounter: 1,
    missType: 0,
  });
  // The skipped ActionSwitch prelude is presentation bookkeeping
  // (hpthresholds2/RETURNMON text) plus the singles counter/setbyte writes
  // staged above; begin at its first logical branch.
  const started = startBattleScriptExecute(PROGRAM, "BattleScript_PursuitSwitchDmgLoop", {
    ...priorState,
    rulesContext,
  });
  const run = runScriptToOwnEnd(
    PROGRAM,
    voluntarySwitchHandlers(baseHandlers, switchingBattler, opposingMoveId),
    started,
  );
  if (run.kind === "barrier") {
    return Object.freeze({
      kind: "barrier",
      state: run.state,
      instruction: run.instruction,
    });
  }
  return Object.freeze({ kind: "complete", state: run.state });
}

function movePriority(moveId: number): number {
  const row = MOVES_BY_ID.get(moveId);
  if (!row) throw new Error(`move ${moveId} has no source move data row`);
  return row.priority;
}

function turnOrderBattler(rulesContext: BattleScriptRulesContext, battler: BattleScriptBattlerId, moveId: number): TurnOrderBattler {
  const b = rulesContext.battlers[battler];
  const holdEffect = resolveBattleScriptBattlerHoldEffect(rulesContext, battler);
  return {
    speed: b.speed,
    speedStage: b.statStages[STAT_SPEED]!,
    movePriority: movePriority(moveId),
    ability: ABILITY_SYMBOLS[b.ability] ?? null,
    holdEffect: HOLD_EFFECT_NAME_BY_ID[holdEffect] ?? null,
    holdEffectParam: resolveBattleScriptBattlerHoldEffectParam(rulesContext, battler),
    isParalyzed: (b.status1 & STATUS1_PARALYSIS) !== 0,
  };
}

/**
 * GetWhoStrikesFirst's WEATHER_HAS_EFFECT branch. The shared Frontier
 * precedent suppresses weather for Cloud Nine; Air Lock has no legal
 * Frontier carrier. The ROM scan also requires hp != 0
 * (battle_util.c:3140-3148), which is vacuous here: action selection only
 * resumes after fainted-actions installs two live singles actives.
 */
function turnOrderWeather(rulesContext: BattleScriptRulesContext): WeatherState {
  if (!weatherHasEffect(rulesContext)) return {};
  return {
    isRaining: (rulesContext.weather & B_WEATHER_RAIN) !== 0,
    isSunny: (rulesContext.weather & B_WEATHER_SUN) !== 0,
  };
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
 */
function withTurnOrderPositions(
  rulesContext: BattleScriptRulesContext,
  currentTurnActionNumber: number,
  mover1: BattleScriptBattlerId,
  mover2: BattleScriptBattlerId,
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
 * redirection and RANDOM's draw are unreachable with two active battlers:
 * every non-user shape resolves to the sole opposing active battler without
 * consuming RNG. Keeping the generated shape strict prevents a future source
 * expression from silently inheriting the wrong target.
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
          targetBattler: sourceMoveTarget(moveId, battler),
        })]
      : []);
  return Object.freeze(legal);
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
  const active = rulesContext.battlers[battler]!;
  if (
    (active.status2 & (BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION)) !== 0
    || (active.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0
  ) {
    return true;
  }
  const opponent = (battler === 0 ? 1 : 0) as BattleSinglesBattler;
  const holder = rulesContext.battlers[opponent]!;
  if (
    holder.hp === 0
    || (rulesContext.absentBattlerFlags & (1 << opponent)) !== 0
  ) {
    return false;
  }
  if (holder.ability === ABILITY_SHADOW_TAG) return true;
  if (
    holder.ability === ABILITY_ARENA_TRAP
    && !active.types.includes("TYPE_FLYING")
    && active.ability !== ABILITY_LEVITATE
  ) {
    return true;
  }
  return holder.ability === ABILITY_MAGNET_PULL
    && active.types.includes("TYPE_STEEL");
}

/**
 * Publishes the legal Factory-singles command surface for either battler.
 * Locked actions remain move-only. Trainer switching uses ShouldSwitch's
 * source-specific hard precheck (not the player party-menu gate: notably,
 * the AI's Arena Trap check has no Flying/Levitate exception).
 */
function legalCommandDecisions(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): readonly BattleCommandDecision[] {
  const moves = legalMoveDecisions(rulesContext, battler);
  if (
    lockedMoveDecision(rulesContext, battler) !== null
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

function usesForcedStruggle(
  rulesContext: BattleScriptRulesContext,
  battler: BattleSinglesBattler,
): boolean {
  if (lockedMoveDecision(rulesContext, battler) !== null) return false;
  return (
    checkBattleScriptMoveLimitations(rulesContext, battler) & 0x0f
  ) === 0x0f;
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
  const statusLock = battlerState.status2 & (
    BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
  );
  if (statusLock === 0) {
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
    }),
    rng: createBattleScriptRngState(boundaryCursor.value),
  });

  // HandleTurnActionSelectionState auto-confirms a multi-turn player's
  // B_ACTION_USE_MOVE, so only the trainer command remains to collect.
  const lockedPlayerDecision = lockedMoveDecision(continuingState.rulesContext, 0);
  const lockedTrainerDecision = lockedMoveDecision(continuingState.rulesContext, 1);
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
 * reconstructs the halted `BattleScript_HandleFaintedMon` script from
 * `pendingForcedSwitchAt`'s durable bundle, writes the submitted
 * (already-validated-legal, per `submitBattleDecision`'s own
 * `legalPartyIndexes` gate) party index into `monToSwitchIntoId`, and drives
 * the same slice-1-9 machinery the AI-side dance already uses. A "resumed"
 * result (the only non-terminal, non-barrier outcome possible here) always
 * continues straight into `runEndTurnTail` -- `cancelallactions` already
 * cancelled any still-pending second action inside the dance itself, so there
 * is nothing left of this turn's two-action shape to resume.
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
  const orchestration = resumeBattleScriptFaintedActionsAfterPlayerChoice(
    PROGRAM,
    handlers,
    haltedState,
    ctx.decision.partyIndex,
  );
  if (orchestration.kind === "player-choice-required" || orchestration.kind === "no-fainted-battlers") {
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
    const lockedTrainerDecision = lockedMoveDecision(rules.rulesContext, 1);
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

  const rc0 = clearOverwrittenEncoreAtAction(
    clearOverwrittenEncoreAtAction(rules.rulesContext, 0),
    1,
  );
  const playerSwitch = rules.pendingPlayerDecision.kind === "switch";
  const trainerSwitch = ctx.decision.kind === "switch";
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
  const playerForcedStruggle = !playerSwitch && usesForcedStruggle(rc0, 0);
  const trainerForcedStruggle = !trainerSwitch && usesForcedStruggle(rc0, 1);
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
    const playerTOB = turnOrderBattler(rc0, 0, playerMoveId);
    const trainerTOB = turnOrderBattler(rc0, 1, trainerMoveId);
    const weather = turnOrderWeather(rc0);
    const bothPriorityZero = playerTOB.movePriority === 0 && trainerTOB.movePriority === 0;
    const priorityEqual = playerTOB.movePriority === trainerTOB.movePriority;
    const isSpeedTie = (bothPriorityZero || priorityEqual)
      && effectiveSpeed(playerTOB, weather, rc0.randomTurnNumber)
        === effectiveSpeed(trainerTOB, weather, rc0.randomTurnNumber);
    // battle_main.c:4728/4745 -- Random() & 1, drawn ONLY on a genuine speed tie.
    const speedTieRngRoll = isSpeedTie ? ctx.rng.draw("turn order speed tie (Random() & 1)") : 0;
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
    rulesContext: withTurnOrderPositions(rc0, 0, mover1, mover2),
    rng: createBattleScriptRngState(rngBefore.value),
    events: Object.freeze([]),
  });

  const action1 = mover1SwitchPartyIndex !== null
    ? runVoluntarySwitchAction(
      initialState,
      mover1 as BattleSinglesBattler,
      mover1SwitchPartyIndex,
      mover1 === 0 ? trainerMoveId : playerMoveId,
      handlers,
    )
    : runMoveAction(
      PROGRAM,
      handlers,
      initialState,
      mover1,
      mover1MoveId,
      mover1MoveSlot,
      mover1Target,
      mover1 === 0 ? playerForcedStruggle : trainerForcedStruggle,
    );
  if (action1.kind === "barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, action1.state,
      buildRules(action1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(action1.instruction, action1.state.instructionsExecuted),
    );
  }

  const faint1 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action1.state);
  if (faint1.kind === "terminal") {
    const finished = handleBattleActionFinished(faint1.state, mover1);
    return finishFullTurn(
      ctx.rng, rngBefore.calls, finished,
      buildRules(finished.rulesContext, rules.phase, rules.pendingPlayerDecision),
      Object.freeze({
        kind: "terminal",
        outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
      }),
    );
  }
  if (faint1.kind === "non-terminal-barrier") {
    return finishFullTurn(
      ctx.rng, rngBefore.calls, faint1.state,
      buildRules(faint1.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
      machineBarrierBoundary(faint1.instruction, faint1.state.instructionsExecuted),
    );
  }
  if (faint1.kind === "player-choice-required") {
    // The fainted battler is player-side and its own bench still has a legal
    // replacement (item 3): surface it as a real "forced-switch" decision-
    // required boundary, not a throw -- cancelallactions inside the dance
    // itself already handles the still-pending second action (mover2 never
    // runs once resumed, matching item 2's own non-terminal fork).
    return finishFullTurn(
      ctx.rng, rngBefore.calls, faint1.state,
      buildForcedSwitchPendingRules(faint1.state.rulesContext, {
        programCounter: faint1.state.programCounter,
        callStack: faint1.state.callStack,
        scheduler: faint1.state.scheduler,
        resumeAt: "run-end-turn",
      }),
      Object.freeze({
        kind: "decision-required",
        request: Object.freeze({
          kind: "forced-switch",
          requestId: ctx.request.requestId + 1,
          side: faint1.battler === 0 ? "player" as const : "trainer" as const,
          battler: faint1.battler as BattleSinglesBattler,
          faintedPartyIndex: faint1.faintedPartyIndex as BattlePartyIndex,
          legalPartyIndexes: faint1.legalPartyIndexes as readonly BattlePartyIndex[],
        }),
      }),
    );
  }

  // faint1.kind is "no-fainted-battlers" (run action 2) or "resumed" (skip action 2, per cancelallactions).
  let preEndTurnState = handleBattleActionFinished(faint1.state, mover1);
  if (faint1.kind === "no-fainted-battlers") {
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
    const preAction2State: MachineState = Object.freeze({
      ...preEndTurnState,
      rulesContext: withTurnOrderPositions(
        betweenActionsRules,
        1,
        mover1,
        mover2,
      ),
    });
    const action2 = mover2SwitchPartyIndex !== null
      ? runVoluntarySwitchAction(
        preAction2State,
        mover2 as BattleSinglesBattler,
        mover2SwitchPartyIndex,
        mover2 === 0 ? trainerMoveId : playerMoveId,
        handlers,
      )
      : runMoveAction(
        PROGRAM,
        handlers,
        preAction2State,
        mover2,
        mover2MoveId,
        mover2MoveSlot,
        mover2Target,
        mover2 === 0 ? playerForcedStruggle : trainerForcedStruggle,
      );
    if (action2.kind === "barrier") {
      return finishFullTurn(
        ctx.rng, rngBefore.calls, action2.state,
        buildRules(action2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(action2.instruction, action2.state.instructionsExecuted),
      );
    }
    const faint2 = runBattleScriptFaintedActionsOrchestration(PROGRAM, handlers, action2.state);
    if (faint2.kind === "terminal") {
      const finished = handleBattleActionFinished(faint2.state, mover2);
      return finishFullTurn(
        ctx.rng, rngBefore.calls, finished,
        buildRules(finished.rulesContext, rules.phase, rules.pendingPlayerDecision),
        Object.freeze({
          kind: "terminal",
          outcome: mapFactoryBattleOutcome(finished.rulesContext.battleOutcome),
        }),
      );
    }
    if (faint2.kind === "non-terminal-barrier") {
      return finishFullTurn(
        ctx.rng, rngBefore.calls, faint2.state,
        buildRules(faint2.state.rulesContext, rules.phase, rules.pendingPlayerDecision),
        machineBarrierBoundary(faint2.instruction, faint2.state.instructionsExecuted),
      );
    }
    if (faint2.kind === "player-choice-required") {
      // Same fork as faint1 above, just arising from the SECOND (final) action of the turn instead.
      return finishFullTurn(
        ctx.rng, rngBefore.calls, faint2.state,
        buildForcedSwitchPendingRules(faint2.state.rulesContext, {
          programCounter: faint2.state.programCounter,
          callStack: faint2.state.callStack,
          scheduler: faint2.state.scheduler,
          resumeAt: "run-end-turn",
        }),
        Object.freeze({
          kind: "decision-required",
          request: Object.freeze({
            kind: "forced-switch",
            requestId: ctx.request.requestId + 1,
            side: faint2.battler === 0 ? "player" as const : "trainer" as const,
            battler: faint2.battler as BattleSinglesBattler,
            faintedPartyIndex: faint2.faintedPartyIndex as BattlePartyIndex,
            legalPartyIndexes: faint2.legalPartyIndexes as readonly BattlePartyIndex[],
          }),
        }),
      );
    }
    preEndTurnState = handleBattleActionFinished(
      faint2.state,
      mover2,
    ); // "no-fainted-battlers" or "resumed"
  }

  return runEndTurnTail(ctx.rng, rngBefore.calls, handlers, preEndTurnState, ctx.request.requestId + 1);
};

export function submitFactoryFullTurnDecision(
  state: BattleState<FactoryFullTurnDecisionRules>,
  submission: BattleDecisionSubmission,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  return submitBattleDecision(state, submission, reduceFactoryFullTurnDecision);
}
