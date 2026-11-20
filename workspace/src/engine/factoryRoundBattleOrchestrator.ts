import { recordContainedPresentationError } from "./presentationContainment.ts";
import {
  createLiveMovePaletteHost, invalidateLiveMovePaletteHost, prepareLiveMovePalette,
  returnLiveMovePaletteHostAfterOrdinaryPartyCancel,
  type LiveMovePaletteHost, type LiveMovePaletteInput,
} from "./liveMoveAnimationPalette.ts";
import { createKnownEntrySpriteAllocatorProvider } from "./knownEntrySpriteAllocator.ts";
import { spriteOrderStatusAnimationName } from "./spriteOrderEventTransform.ts";
import {
  LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS, liveSpriteAllocatorAnimationNetZero,
  prepareLiveMoveSpriteAllocator,
  type LiveMoveSpriteAllocatorInput,
  type LiveMoveSpriteOrderInput,
} from "./liveMoveSpriteAllocator.ts";
import {
  invalidateSpriteOrderState,
  knownEntrySpriteOrderState,
  type SpriteOrderState,
} from "./spriteOrderProvider.ts";
import {
  advanceLiveSpriteOrderHost,
  beginLiveSpriteOrderTurn,
  createLiveSpriteOrderHost,
  invalidateLiveSpriteOrderHost,
  lendLiveSpriteOrder,
  liveSpriteOrderBattlersPresent,
  liveSpriteOrderHostOrder,
  liveSpriteAllocatorReseedable,
  markLiveSpriteOrderDeferredBody,
  openLiveSpriteOrderHostPartyMenu,
  reseedLiveSpriteAllocatorAfterSendOut,
  returnLiveSpriteOrderHostFromPartyMenu,
  seedLiveSpriteOrderHostFromBattleStart,
  type LiveSpriteOrderHost,
  type SpriteOrderBodyPlanAt,
} from "./liveSpriteOrderHost.ts";
import { liveMoveGeometrySpriteOrderPlanText } from "./liveMoveAnimation.ts";
import { liveMovePresentationRngBodyKey } from "./liveMovePresentationRng.ts";
import {
  advanceLiveBattlerX2Host, applyLiveBattlerX2Event, createLiveBattlerX2Host, invalidateLiveBattlerX2Host,
  liveBattlerX2EventsOf, liveMoveBattlerX2Input, liveMoveBattlerX2InputForBody, liveStaleMovePowerTaintedBy, LIVE_BATTLER_X2_IDLE,
  LIVE_BATTLER_X2_SCENE_OFF_INPUT, type LiveBattlerX2Host,
  type LiveBattlerX2History, type LiveMoveBattlerX2Input,
} from "./liveBattlerX2History.ts";
import {
  invalidateLiveSpriteAllocatorHost,
  type LiveSpriteAllocatorHost,
} from "./liveSpriteAllocator.ts";
/**
 * Production-shaped owner of the generated Factory opponent -> fresh battle
 * -> terminal adapter -> round-controller seam.
 *
 * Round presentation acknowledgements remain owned by roundController. During
 * an active battle, this module also owns the live player command presentation,
 * supplies trainer decisions from the Factory AI, and returns terminal state
 * to `resolveRoundBattle`.
 */

import type { GbaButton } from "../input.ts";
import {
  advanceBattleCommandPresentation,
  battleCommandUiStatusFromStatus1,
  cancelBattleCommandPartySelection,
  createBattleCommandDisplayedField,
  createBattleCommandPresentation,
  BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
  returnBattleCommandPartySelection,
  submitBattleCommandPresentationDecision,
  type BattleCommandPresentationState,
} from "./battleCommandPresentation.ts";
import { battleForfeitMessageDone, forfeitTerminalBattle } from "./battleForfeit.ts";
import {
  applyPlayerSwitchEvents,
  bufferBattlePartyOrderBySide,
  IDENTITY_BATTLE_PARTY_ORDER,
  type BattlePartyCurrentOrder,
} from "./battlePartyOrder.ts";
import {
  advanceBattlePartySelect,
  battlePartySelectClosePhase,
  PARTY_SELECT_CANCEL_CLOSE_TOTAL_FRAMES,
  createBattlePartySelectState,
  type BattlePartySelectState,
} from "./battlePartySelect.ts";
import {
  healFactoryKernelParty,
  type BattleMon,
  type BattleOpponent,
  type BattleParty,
  type FactoryKernelParty,
  type FactoryRentalParty,
  type FactoryRentalRecord,
} from "./battleScenario.ts";
import {
  submitBattleDecision,
  type BattleBoundary,
  type BattleDecisionTransitionResult,
  type BattleKernelSemanticEvent,
  type BattlePartyIndex,
  type BattleState,
  type BattleSubmittedDecision,
} from "./battleDecisionBoundary.ts";
import {
  appendBattleResolutionActionContinuation,
  appendBattleResolutionLockedActionContinuation,
  advanceBattleResolutionConfirmHandoff,
  appendBattleResolutionContinuation,
  createBattleResolutionPresentation,
  hasRetainedLockedActionReceipt,
  messageCommandTypedRows,
  type BattleResolutionPresentationCommand,
  type BattleResolutionLockedActionIdentity,
  type BattleResolutionPresentationState,
} from "./battleResolutionPresentation.ts";
import {
  applyLiveSemiInvulnerableCommand,
  LIVE_CASTFORM_FORMS_NORMAL,
  liveCastformFormsThroughCommand,
  type LiveCastformForms,
  applySubstituteDollCommand,
  battleResolutionMoveAnimationField,
  BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES,
  BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES,
  containedBattleResolutionDisplayedField,
  LEECH_SEED_DRAIN_ABSORB_MOVE_ID,
  LIVE_SEMI_INVULNERABLE_NONE,
  type LiveSemiInvulnerableHidden,
  isBattleResolutionButtonMessageAcceptable,
  isBattleResolutionButtonMessageReady,
  isBattleResolutionCommandComplete,
  playerFaintReplacementSendOutTimingOfSegment,
} from "./battleResolutionPresentationRender.ts";
import {
  advancePartySelect,
  createPartySelectStateFromForcedSwitch,
  partySendOutBattleMenuReady,
  submitPartySelectBattleDecision,
  type PartySelectState,
} from "./partySelect.ts";
import type {
  BattleScriptPartyMemberState,
  BattleScriptPartyState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { deriveBattleResolutionFromTerminalBoundary } from "./battleResolutionAdapter.ts";
import { mapStatus1ToBattleStatus } from "./battleResolutionAdapter.ts";
import {
  advanceFactoryBattleStartEntry,
  createFactoryBattleStartEntry,
  factoryBattleStartEntryComplete,
} from "./factoryBattleStartEntry.ts";
import {
  initializeFreshFactoryBattle,
  type FactoryBattleStartEntryScript,
} from "./factoryBattleStart.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
import {
  reduceFactoryFullTurnDecision,
  type FactoryFullTurnDecisionRules,
} from "./factoryBattleScriptFullTurnDecision.ts";
import {
  createFactoryAiBattleHistory,
  submitLiveFactoryAiDecision,
  type FactoryAiBattleHistory,
} from "./factoryAiLiveDriver.ts";
import { createFactoryCorpusPartyMember } from "./factoryCorpusParty.ts";
import {
  generateFactoryOpponent,
  type FactoryOpponentGenerationResult,
} from "./factoryOpponentGeneration.ts";
import {
  generateFactoryBrainOpponent,
  type FactoryBrainOpponentGenerationResult,
} from "./factoryBrainOpponentGeneration.ts";
import {
  selectFrontierTransition,
  type FrontierTransitionPresentation,
} from "./battleTransition.ts";
import {
  getFactoryFrontierBrainStatus,
  type FrontierBrainStatus,
} from "./frontierBrainStatus.ts";
import {
  applyFactoryBrainRoundOutcome,
  type FactoryBrainRoundOutcomeResult,
} from "./factoryBrainRoundOutcome.ts";
import {
  factoryTrainerPresentationForOpponent,
  getFactoryTrainerPresentation,
} from "./factoryTrainerPresentation.ts";
import {
  createFactoryBattleStartPresentationCommand,
  type FactoryBattleStartPresentationCommand,
} from "./factoryBattleStartPresentation.ts";
import {
  advanceFactoryBattleStartIntro,
  createFactoryBattleStartIntro,
  settleFactoryBattleStartCommand,
  type FactoryBattleStartIntroState,
} from "./factoryBattleStartIntro.ts";
import {
  GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY,
  generatedBattleStartCommandReady,
} from "./battleScene.ts";
import {
  generateInitialFactoryRentals,
  type FactoryInitialRentalGenerationResult,
} from "./factoryRentalGeneration.ts";
import {
  advanceRoundController,
  advanceRoundControllerWithGeneratedOpponent,
  chooseRoundSwap,
  completeBattlePresentation,
  createGeneratedFactoryRoundController,
  resolveRoundBattle,
  type RoundControllerState,
  type SwapDecision,
} from "./roundController.ts";
import type { BattlePresentationCompletion } from "./battlePresentation.ts";
import { TRAINER_FRONTIER_BRAIN } from "./factoryAiMaskSelection.ts";

const EMPTY_PARTY_MEMBER: BattleScriptPartyMemberState = Object.freeze({
  species: 0,
  isEgg: false,
  abilityNum: 0,
  ivs: Object.freeze({ hp: 0, attack: 0, defense: 0, speed: 0, spAttack: 0, spDefense: 0 }),
  personality: 0,
  experience: 0,
  level: 0,
  friendship: 0,
  maxHP: 0,
  attack: 0,
  defense: 0,
  speed: 0,
  spAttack: 0,
  spDefense: 0,
  hp: 0,
  status1: 0,
  item: 0,
  moves: Object.freeze([0, 0, 0, 0] as const),
  pp: Object.freeze([0, 0, 0, 0] as const),
  ppBonuses: 0,
});

export type FactoryRoundRentalSource =
  | Readonly<{
    type: "generateInitial";
    selectedRentalIndexes: readonly [number, number, number];
  }>
  | Readonly<{
    type: "currentRecords";
    playerRentalRecords: FactoryRentalParty;
    /** Source rentalMons[0..5] used by the first opponent generation. */
    savedRentalRecords: readonly [
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
      FactoryRentalRecord,
    ];
  }>;

export type FactoryFacilityState = Readonly<{
  /** Source factoryRentsCount for the selected battle/level mode. */
  rentsCount: number;
  /**
   * Walk-up build step B2: FRONTIER_DATA_HEARD_BRAIN_SPEECH, per docs/
   * noland-walkup-dialogue-scoping.md §1.5 - independent per tier (silver's
   * own bit, gold's own; they never collide since gold only becomes
   * reachable once silver's is already set). In-session only by user
   * decision (no save/persistence in this build) - lives here alongside
   * rentsCount, the other piece of facility state the round-to-round
   * chaining already threads unmodified across every
   * createFactoryRoundBattleOrchestrator call for the same challenge.
   * Optional/undefined reads as "not heard yet" (factoryHeardBrainSpeech)
   * so every existing construction site compiles and behaves unchanged;
   * gold is plumbed as a tier but nothing sets it yet (gold speech is a
   * later step).
   */
  heardBrainSpeech?: Readonly<{ silver: boolean; gold: boolean }>;
}>;

/** Reads a tier's "have I heard the personality speech this session" bit (see FactoryFacilityState.heardBrainSpeech's own doc) - defaults false so every existing caller that never touched this field reads as "first encounter", matching the real flag's own default (no symbol yet -> bit unset). */

/**
 * S10A gdgeo: a geometry-keyed body's sprite-order plan at the displayed species of its own move-animation command (the field the
 * live renderer draws the body on; liveMoveAnimation.ts liveMoveGeometrySpriteOrderPlanText); undefined without such a command.
 * plans54: Move_HAIL's plan (258) is also asked at HAIL_CONTINUES, a general animation with no command: its species are the segment
 * field's after the switch-ins completed before that event (the only commands that change a displayed species). Water Spout (323) also
 * gets the command's displayed field (the attacker's HP) and the host's lent free order.
 */
function liveSpriteOrderBodyPlanAt(
  resolution: Readonly<{ segments: readonly Parameters<typeof battleResolutionMoveAnimationField>[0][] }>,
): SpriteOrderBodyPlanAt {
  return (segmentIndex, sequence, moveId, attackerSide, lentFree) => {
    const segment = resolution.segments[segmentIndex];
    if (segment === undefined) return undefined;
    const field = battleResolutionMoveAnimationField(segment, sequence);
    const species = field !== null ? { playerSpecies: field.player.species, opponentSpecies: field.opponent.species }
      : moveId === 258 ? liveSpriteOrderSpeciesBefore(segment, sequence) : null;
    // ice2: Water Spout / Shock Wave key their plan on the lent order; while a words marker is pending there is none, so the unit records the
    // displayed field and the render seam computes the plan at the replayed lend (resolveSpriteOrderDeferredLend `geometryPlanText`).
    if (lentFree === undefined && field !== null && (moveId === 323 || moveId === 351)) return { field };
    // plans54: Water Spout also reads the displayed field (the attacker's HP tier) and the lent order.
    return (species === null ? null : liveMoveGeometrySpriteOrderPlanText(moveId, attackerSide, species, field ?? undefined, lentFree))
      ?? undefined;
  };
}

/** plans54: the displayed species at a non-command event of `sequence`: the segment field with the earlier switch-ins applied. */
function liveSpriteOrderSpeciesBefore(
  segment: Parameters<typeof battleResolutionMoveAnimationField>[0], sequence: number,
): { playerSpecies: number; opponentSpecies: number } {
  const species = { playerSpecies: segment.field.player.species, opponentSpecies: segment.field.opponent.species };
  for (const command of segment.commands) {
    if ("eventSequence" in command && command.eventSequence >= sequence) break;
    if (command.type === "switch-in") species[command.battler === 0 ? "playerSpecies" : "opponentSpecies"] = command.incoming.species;
  }
  return species;
}

export function factoryHeardBrainSpeech(
  facilityState: FactoryFacilityState,
  tier: "silver" | "gold",
): boolean {
  return facilityState.heardBrainSpeech?.[tier] ?? false;
}

/** Sets a tier's heard-speech bit. Idempotent - a second call for an already-heard tier returns the same state unchanged, matching the source flag's own one-way behavior (SetFrontierData only ever sets this bit, never clears it). */
export function markFactoryBrainSpeechHeard(
  state: FactoryRoundBattleOrchestratorState,
  tier: "silver" | "gold",
): FactoryRoundBattleOrchestratorState {
  if (factoryHeardBrainSpeech(state.facilityState, tier)) return state;
  const heardBrainSpeech = state.facilityState.heardBrainSpeech ?? { silver: false, gold: false };
  return {
    ...state,
    facilityState: Object.freeze({
      ...state.facilityState,
      heardBrainSpeech: Object.freeze({ ...heardBrainSpeech, [tier]: true }),
    }),
  };
}

export type FactoryRoundBattleOrchestratorConfig = Readonly<{
  /** Presentation timing only; the battle kernel retains exclusive RNG ownership. */
  battleScene?: "on" | "off";
  id: string;
  rngValue: number;
  /**
   * `GetCurrentFacilityWinStreak()` entering this round. In real play this is
   * always a multiple of 7 (each completed round banks exactly 7 wins), which
   * is what guarantees the Frontier Brain, when eligible, always lands on
   * battleIndex 6 (the round's last battle) and never earlier — every
   * `getFactoryFrontierBrainStatus` check inside a round adds `battleIndex` to
   * this value, so a non-multiple entering streak can cross the silver/gold
   * threshold at an earlier index instead. This module does not enforce the
   * multiple-of-7 invariant itself: several tests (e.g.
   * `factoryRoundBattleOrchestrator.test.ts`'s "Noland rung 2" cases,
   * `factoryWinStreak` 19/20/40) deliberately pass non-multiple synthetic
   * streaks to exercise brain eligibility at battleIndex 0/1 without replaying
   * a full six-win round, so a validation throw here would reject those
   * legitimate callers.
   */
  factoryWinStreak: number;
  playerTrainerId: number;
  battleTowerLevel50WinStreak: number;
  /**
   * `GetPlayerSymbolCountForFacility(FRONTIER_FACILITY_FACTORY)`, consumed by
   * `getFactoryFrontierBrainStatus` to decide whether an upcoming battle is
   * Noland's. Defaults to 0 (no symbols yet) so every existing construction
   * site compiles and behaves unchanged.
   */
  factorySymbolsCount?: 0 | 1 | 2;
  facilityState: FactoryFacilityState;
  rentals: FactoryRoundRentalSource;
  /**
   * Battle 1 may already have its trainer/set schedule selected before the
   * interactive anchor. Adopt that construction result and seed the fresh
   * kernel from the later transition cursor instead of selecting twice.
   */
  adoptedInitialOpponent?: Readonly<{
    generation: FactoryOpponentGenerationResult;
    freshBattleRngValue: number;
    /** Adapter-pinned draws before the fresh battle kernel begins. */
    preCommandRngCalls?: number;
  }>;
  /**
   * A later battle's pre-generated opponent schedule may already be probed
   * (docs/win-battle2-opponent-provenance-receipt.md): set selection is a
   * single real cursor, but personality construction spans 32 frames with
   * interleaved ambient VBlank ticks, so exact personalities need per-mon
   * construction cursors via `adoptFactoryOpponentSchedule`. Adopt that
   * result at the GO ON pre-generation seam instead of re-rolling the three
   * mon personalities back-to-back from one modeled cursor.
   */
  adoptedNextOpponent?: Readonly<{
    generation: FactoryOpponentGenerationResult;
    /** Source challenge battle number this schedule is for (1 = battle 2). */
    battleIndex: number;
  }>;
  /**
   * The Frontier Brain sibling of `adoptedInitialOpponent` (the real-ROM
   * replay seam, docs/parity-mac/brain-replay-seam.md): battle 1's opponent
   * is a Brain party the source already rolled
   * (`adoptFactoryBrainOpponentSchedule`), and the fresh kernel is seeded
   * from the later battle cursor. Battle 1 must be a Brain battle by this
   * config's own streak and symbols (`getFactoryFrontierBrainStatus`); the
   * status, trainer id and transition are derived exactly as for a
   * generated Brain opponent. Mutually exclusive with
   * `adoptedInitialOpponent`.
   */
  adoptedInitialBrainOpponent?: Readonly<{
    generation: FactoryBrainOpponentGenerationResult;
    freshBattleRngValue: number;
    /** Adapter-pinned draws before the fresh battle kernel begins. */
    preCommandRngCalls?: number;
  }>;
  /**
   * The Frontier Brain sibling of `adoptedNextOpponent` (the round replay, docs/parity-mac/round-replay.md): a later battle of the round
   * is Noland's, and the source rolled his party at that battle's start (FillFactoryBrainParty from FillFactoryTrainerParty,
   * battle_tower.c:1857, with VBlank Random() draws between the members), so the replay adopts the rolled schedule
   * (`adoptFactoryBrainOpponentSchedule`, which rejects a set the engine's rules would not roll). The battle at `battleIndex` must be
   * a Brain battle by this config's streak and symbols.
   */
  adoptedNextBrainOpponent?: Readonly<{
    generation: FactoryBrainOpponentGenerationResult;
    /** Source challenge battle number this schedule is for (6 = battle 7). */
    battleIndex: number;
  }>;
}>;

/**
 * Every opponent-generation call site (the first-opponent seam, and both the
 * `AskSwapMon` pre-generation and its swap-resolution fallback) must decide,
 * per battle, whether the upcoming opponent is ordinary or the Frontier
 * Brain (`frontier_getbrainstatus`, `pre-battle-room scripts.inc:61,80-81`
 * gates BEFORE `factory_generateopponentmons` runs, so a brain battle draws
 * none of the ordinary trainer-selection/species-selection RNG). `trainerId`
 * and `storedTrainerIds` are exposed uniformly on both variants so callers
 * (the AI driver's `trainerOpponentId`, the next generation's repeat-trainer
 * history) do not need to branch on `kind`.
 */
export type FactoryScheduledOpponentGeneration =
  | Readonly<{
    kind: "ordinary";
    trainerId: number;
    storedTrainerIds: readonly number[];
    generation: FactoryOpponentGenerationResult;
  }>
  | Readonly<{
    kind: "frontier-brain";
    status: Exclude<FrontierBrainStatus, "not-ready">;
    trainerId: number;
    storedTrainerIds: readonly number[];
    generation: FactoryBrainOpponentGenerationResult;
    /**
     * `GetSpecialBattleTransition`'s draw, precomputed once here (from
     * `generation.rngValue`, its cursor immediately after the third
     * opponent's personality is accepted) rather than at the ordinary
     * path's tick-level `opponentSetupExtraRngSteps` seam -- see
     * `BattleOpponent.frontierBrain`'s own doc (battleScenario.ts).
     */
    transitionPresentation: FrontierTransitionPresentation;
  }>;

export type FactoryFacilityRngSegment = Readonly<{
  kind:
    | "initial-rentals"
    | "opponent-generation"
    | "opponent-selection"
    | "opponent-construction"
    | "battle";
  battleIndex: number;
  callStart: number;
  callEnd: number;
  rngBefore: number;
  rngAfter: number;
}>;

export type FactoryBattleMoveSelectionCursors = readonly [
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
  0 | 1 | 2 | 3,
];

/** scd112: a tracked Scene ON x2 input with no side zeroed (statsChangeRenderView: the species rest). */
const STATS_CHANGE_X2_NONE_ZEROED: LiveMoveBattlerX2Input = Object.freeze({ zeroed: Object.freeze([]) });

const RESET_MOVE_SELECTION_CURSORS: FactoryBattleMoveSelectionCursors =
  Object.freeze([0, 0, 0, 0]);

export type FactoryBattlePresentationBattlerBoundary = Readonly<{
  battler: 0 | 1;
  partyIndex: BattlePartyIndex;
  field: BattleCommandPresentationState["field"]["player"];
  displayedHp: number;
  displayedStatus1: number;
  spriteVisible: boolean;
  /**
   * Presentation-only Scene ON semi-invulnerable hide (a completed live Fly/Bounce charge body; ROM `invisible` set by
   * the animation, no queue receipt): battleResolutionPresentationRender.ts applyLiveSemiInvulnerableCommand.
   * Absent = false. Never read by rules, RNG or the queue.
   */
  liveSemiInvulnerableHidden?: boolean;
  /**
   * cf78: presentation-only ROM `gBattleMonForms` of this battler SLOT (non-zero = a non-normal Castform form), from the completed
   * CASTFORM_CHANGE animation events (battleResolutionPresentationRender.ts liveCastformFormsThroughCommand). Kept across switches and
   * faints like the ROM's per-slot array (cleared only at battle setup). Absent = 0. Never read by rules, RNG or the queue.
   */
  liveCastformForm?: number;
  /**
   * pic9: presentation-only source `gBattleStruct->hpOnSwitchout[side]` of this battler's side: its HP when the last switch-in of either
   * battler completed (Cmd_switchineffects, battle_script_commands.c:5276-5280). Absent = its battle-start HP (full in the Factory).
   * Read only by the voluntary switch's "Come back!" line (Cmd_hpthresholds2); never by rules, RNG or the queue.
   */
  hpOnSwitchout?: number;
  idleEpoch: number;
  moveCursor: 0 | 1 | 2 | 3;
}>;

export type FactoryBattlePresentationBoundaries = readonly [
  FactoryBattlePresentationBattlerBoundary,
  FactoryBattlePresentationBattlerBoundary,
];

export type FactoryBattleDriveReceipt = Readonly<{
  battle: BattleState<FactoryFullTurnDecisionRules>;
  history: FactoryAiBattleHistory;
  events: readonly BattleKernelSemanticEvent[];
  boundary: BattleBoundary;
}>;

export type FactoryRetainedLockedActionPresentationOwner = Readonly<{
  action: BattleResolutionLockedActionIdentity;
  resolution: BattleResolutionPresentationState;
}>;

export type FactoryRoundBattleOrchestratorState = Readonly<{
  config: FactoryRoundBattleOrchestratorConfig;
  facilityState: FactoryFacilityState;
  /**
   * Source sPerformedRentalSwap (battle_factory.c): set by `factory_setswapped` for the round's own draft
   * (BattleFactoryPreBattleRoom scripts.inc:39-41) and after an accepted swap (:151-158); a won battle pays it into rentsCount and clears it
   * (BattleFactoryBattleRoom scripts.inc:92-97, SetBattleFactoryData battle_factory.c:259-265). docs/parity-mac/first-draft-counts-as-rent.md.
   */
  performedRentalSwap: boolean;
  round: RoundControllerState;
  /** Frozen generated intro, installed only by the live room handoff. */
  battleStartIntro: FactoryBattleStartIntroState | null;
  /** The fresh kernel's Intimidate / Trace entry-script runs, kept for the entry-script presentation. */
  battleStartEntryScripts: readonly FactoryBattleStartEntryScript[];
  battle: BattleState<FactoryFullTurnDecisionRules> | null;
  /** Request-owned player command UI, replaced at each command boundary. */
  battleCommandPresentation: BattleCommandPresentationState | null;
  /** Submitted command lifecycle, retained until its visible resolution ends. */
  battleResolutionPresentation: BattleResolutionPresentationState | null;
  /** Presentation memory survives resolution recreation, scoped to one battle. */
  liveMovePaletteHost?: Readonly<{
    battleCallStart: number | null;
    commandKey: string;
    host: LiveMovePaletteHost;
    /**
     * Presentation-only cursor through the immutable semantic receipt. Some
     * controller graphics transitions (notably status-animation) deliberately
     * have no projected presentation command, so commandIndex alone cannot
     * prove that palette ownership survived the events between two bodies.
     */
    eventCursor?: Readonly<{
      requestId: number;
      segmentIndex: number;
      nextEventIndex: number;
    }>;
    /**
     * Known entry ownership held only across the ordinary singles party menu.
     * The active host remains invalid while that menu owns OBJ palettes; only
     * its B-cancel return may consume this immutable snapshot.
     */
    pendingPartyCancelEntryHost?: LiveMovePaletteHost;
  }>;
  /** Presentation-only gSprites history, scoped to the current battle. */
  liveMoveSpriteAllocatorHost?: Readonly<{
    battleCallStart: number | null;
    commandKey: string;
    host: LiveSpriteAllocatorHost;
    /**
     * Free-slot sSpriteOrder beside the allocator (presentation-only), mirror
     * of `orderHost`'s tracked state. Known from a known entry while every
     * prompt cycle, body, hit, stat and status animation since is modelled
     * (liveSpriteOrderHost.ts); anything else invalidates it for the battle.
     */
    order: SpriteOrderState;
    /** Event-driven order tracker; absent = derive from `order`. */
    orderHost?: LiveSpriteOrderHost;
  }>;
  /**
   * Presentation-only per-battler sprite x2 history (liveBattlerX2History.ts, ISSUES #148), scoped to the current
   * battle; never read by rules/RNG/facility state. Absent = consumers keep the species front-idle rest.
   */
  liveBattlerX2Host?: Readonly<{ battleCallStart: number | null; commandKey: string; host: LiveBattlerX2Host }>;
  /**
   * An opposing locked action may outlive its charge presentation while the
   * player owns a real intervening command request. Its battler/move/slot
   * identity reclaims the immutable resolution after that command submits.
   */
  retainedLockedActionPresentationOwner:
    FactoryRetainedLockedActionPresentationOwner | null;
  /** Adjacent voluntary selector while the command UI owns party-handoff. */
  battlePartySelect: BattlePartySelectState | null;
  /** Request-owned forced selector, created only on faint-message dismissal. */
  battleForcedPartySelect: PartySelectState | null;
  /** The ROM's gBattlePartyCurrentOrder for the player: reset at battle start, swapped by SwitchPartyOrder on every player switch-in. */
  partyOrder: BattlePartyCurrentOrder;
  /** Source gMoveSelectionCursor: controller-owned, not request-owned. */
  moveSelectionCursors: FactoryBattleMoveSelectionCursors;
  /** Singles controller display/cursor state persisted across request boundaries. */
  battlePresentationBoundaries: FactoryBattlePresentationBoundaries | null;
  aiHistory: FactoryAiBattleHistory | null;
  initialRentalGeneration: FactoryInitialRentalGenerationResult | null;
  opponentGenerations: readonly FactoryScheduledOpponentGeneration[];
  /**
   * Source `AskSwapMon` ownership: `factory_generateopponentmons` runs before
   * the opponent type/style commentary and before the swap offer
   * (`pre-battle-room scripts.inc:137-149`), so the round controller
   * pre-generates battleIndex+1 at the post-win/scouting transition and
   * publishes it only when the swap resolves. Null until that transition and
   * cleared by publication; the segment for it is recorded at pre-generation
   * so the RNG receipt stays gapless. Simplified rounds that never
   * pre-generate still generate at swap resolution (see
   * `advanceFactoryRoundPresentation`).
   */
  pendingNextOpponent: FactoryScheduledOpponentGeneration | null;
  rngSegments: readonly FactoryFacilityRngSegment[];
  /** Monotonic count across facility generation and every battle cursor. */
  facilityRngCalls: number;
  activeBattleCallStart: number | null;
  /** One-shot adapter input, cleared as soon as the adopted battle starts. */
  pendingBattlePreCommandRngCalls: number;
  /** Last `gBattleMovePower` of the previous battle (EWRAM carry; absent = 0). Presentation-only. */
  carriedBattleMovePower?: number;
  nextBattleRequestId: number;
  /**
   * Route-scoped `STRINGID_USEDMOVE` post-print hold (failed/no-anim path)
   * applied to EVERY command presentation this orchestrator installs --
   * including the fresh handoff presentation at the next command boundary,
   * which is how the mid-battle-switch turn-2 resolution (whose "Foe RATTATA
   * used SPLASH!" is captured by the pacing spec) receives the SPLASH
   * controller-span hold. Defaults to 0 for every route that does not supply
   * it via the staging context.
   */
  usedMessageHoldFrames: number;
  /**
   * `GiveBattlePoints`/`GiveFacilitySymbol` (`frontier_util.c:1853-1925`) run
   * from the Lobby only once a round resolves -- win (`roundComplete`) or
   * loss (`roundLost`) -- never after an intra-round battle win. Null until
   * `round.rules.phase` reaches one of those two terminal phases.
   */
  roundOutcome: FactoryBrainRoundOutcomeResult | null;
}>;

export class FactoryRoundOrchestratorError extends Error {
  override readonly name = "FactoryRoundOrchestratorError";
}

/**
 * Freezes the generated presentation inputs while the round controller owns
 * a battle-start command. Simplified fixture rounds cannot enter this owner.
 */
export function factoryBattleStartPresentationForState(
  state: FactoryRoundBattleOrchestratorState,
): FactoryBattleStartPresentationCommand | null {
  const pending = state.round.presentation?.command;
  if (pending?.type !== "battleStart") return null;
  const playerParty = state.round.rules.playerKernelParty;
  const opponentRecords = pending.opponent.rentalRecords;
  const opponentTrainer = factoryTrainerPresentationForOpponent(pending.opponent);
  if (
    playerParty === null
    || opponentRecords === undefined
    || opponentTrainer === null
  ) {
    return fail("generated Factory battle-start presentation requires complete generated state");
  }
  return createFactoryBattleStartPresentationCommand({
    commandId: pending.commandId,
    battleIndex: pending.battleIndex,
    opponentTrainer,
    playerParty,
    opponentParty: asKernelParty(opponentRecords),
  });
}

function fail(message: string): never {
  throw new FactoryRoundOrchestratorError(message);
}

function asKernelParty(records: FactoryRentalParty): FactoryKernelParty {
  return healFactoryKernelParty(records);
}

function asBattleScriptParty(party: FactoryKernelParty): BattleScriptPartyState {
  return Object.freeze([
    party[0],
    party[1],
    party[2],
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
    EMPTY_PARTY_MEMBER,
  ]);
}

/**
 * Carries the battle's own party writes (HP, status1, held item, PP -- the
 * only persistent fields the real game's `gPlayerParty`/`gEnemyParty` entries
 * mutate via the controller REQUEST_* write-backs, per the emit-site census
 * in `battle_script_commands.c`/`battle_util.c`: every `EmitSetMonData` call
 * writes only `REQUEST_HP/STATUS/HELDITEM/PP*`; the sole general exception is
 * Sketch's `REQUEST_MOVES_PP_BATTLE` (moves+PP), which no Factory-legal
 * Level-50 rental set carries, and Transform/Mimic rewrite only the in-battle
 * `gBattleMons`, never the party) back onto the rental identity. Identity
 * fields (species, personality, IVs, ability slot, moves, ppBonuses) are
 * therefore never battle-mutable on the Factory route and must stay the
 * records' own values: overlaying them from the terminal party would import a
 * scaffold/placeholder battler's identity into the kernel party, which
 * `healFactoryKernelParty`'s source-derived identity guard then rejects at
 * the next swap/advance (ISSUES #73, WIN swap-offer NO decision).
 */
function overlayTerminalKernelParty(
  identity: FactoryKernelParty,
  terminal: BattleScriptPartyState,
): FactoryKernelParty {
  return identity.map((member, index) => Object.freeze({
    ...member,
    hp: terminal[index]!.hp,
    status1: terminal[index]!.status1,
    item: terminal[index]!.item,
    pp: terminal[index]!.pp,
  })) as unknown as FactoryKernelParty;
}

function recordId(record: FactoryRentalRecord): string {
  return `rental-${record.setId}-${record.personality >>> 0}`;
}

function asBattleParty(records: FactoryRentalParty): BattleParty {
  return records.map((record): BattleMon => {
    const member = createFactoryCorpusPartyMember(record);
    return Object.freeze({
      id: recordId(record),
      species: member.speciesName,
      maxHp: member.maxHP,
      hp: member.hp,
      status: "none",
    });
  }) as unknown as BattleParty;
}

function generatedOpponent(scheduled: FactoryScheduledOpponentGeneration): BattleOpponent {
  const records = scheduled.generation.opponents as FactoryRentalParty;
  if (scheduled.kind === "frontier-brain") {
    return Object.freeze({
      id: `factory-trainer-${scheduled.trainerId}`,
      // The presentation seam resolves TRAINER_FRONTIER_BRAIN to NOLAND's
      // real identity (getFactoryTrainerPresentation,
      // factoryTrainerPresentation.ts); this is that same name, sourced
      // once so the two never drift.
      trainerName: getFactoryTrainerPresentation(scheduled.trainerId).name,
      party: asBattleParty(records),
      rentalRecords: records,
      frontierBrain: Object.freeze({
        status: scheduled.status,
        transitionPresentation: scheduled.transitionPresentation,
      }),
    });
  }
  return Object.freeze({
    id: `factory-trainer-${scheduled.trainerId}`,
    trainerName: scheduled.generation.trainerName,
    party: asBattleParty(records),
    rentalRecords: records,
  });
}

function selectedInitialRecords(
  result: FactoryInitialRentalGenerationResult,
  indexes: readonly [number, number, number],
): FactoryRentalParty {
  if (new Set(indexes).size !== 3) fail("selectedRentalIndexes must be distinct");
  return indexes.map((index, slot) => {
    if (!Number.isInteger(index) || index < 0 || index >= result.rentals.length) {
      return fail(`selectedRentalIndexes[${slot}] must select one of six rentals`);
    }
    return result.rentals[index]!;
  }) as unknown as FactoryRentalParty;
}

function generationSegment(
  kind: Exclude<FactoryFacilityRngSegment["kind"], "battle">,
  battleIndex: number,
  callStart: number,
  rngBefore: number,
  rngAfter: number,
  drawCount: number,
): FactoryFacilityRngSegment {
  return Object.freeze({
    kind,
    battleIndex,
    callStart,
    callEnd: callStart + drawCount,
    rngBefore,
    rngAfter,
  });
}

function scheduledBrainOpponent(
  status: Exclude<FrontierBrainStatus, "not-ready">,
  generation: FactoryBrainOpponentGenerationResult,
  storedTrainerIds: readonly number[],
): FactoryScheduledOpponentGeneration {
  // GetSpecialBattleTransition's own Random() call, source-immediate after
  // the third opponent's personality is accepted (no intervening draws --
  // docs/brain-transition-wiring-design.md §2/§5). Precomputed here, once,
  // and carried on the opponent rather than drawn from the ordinary path's
  // tick-level cursor -- only `.presentation` is kept; the post-draw
  // `.rngValue` is intentionally discarded, not folded into any cursor
  // this orchestrator tracks (the brain battle is always the round's last,
  // so no "next generation" ever needs it, and folding it in would wire
  // the two independent RNG systems together, which the design forbids).
  const { presentation: transitionPresentation } = selectFrontierTransition(
    generation.rngValue,
  );
  return Object.freeze({
    kind: "frontier-brain",
    status,
    trainerId: TRAINER_FRONTIER_BRAIN,
    storedTrainerIds,
    generation,
    transitionPresentation,
  });
}

/**
 * `adoptedInitialBrainOpponent`: battle 1 must be a Brain battle by the
 * config's own streak and symbols, and the adopted party must be the one
 * that streak's challenge builds. Adopting a Brain party into an ordinary
 * battle (or the other tier's party) would silently play the wrong
 * opponent -- reject instead, as `adoptNextOpponentOrGenerate` does for
 * the opposite mix-up.
 */
function adoptedBrainOpponentFor(
  config: FactoryRoundBattleOrchestratorConfig,
  generation: FactoryBrainOpponentGenerationResult,
): FactoryScheduledOpponentGeneration {
  const brainStatus = getFactoryFrontierBrainStatus({
    battleMode: "singles",
    winStreak: config.factoryWinStreak,
    symbolsCount: config.factorySymbolsCount ?? 0,
  });
  if (brainStatus === "not-ready") {
    return fail(
      "adoptedInitialBrainOpponent needs a Frontier Brain battle, but win streak "
      + `${config.factoryWinStreak} with ${config.factorySymbolsCount ?? 0} symbol(s) is an ordinary battle`,
    );
  }
  const challengeNum = Math.floor(config.factoryWinStreak / 7);
  if (generation.challengeNum !== challengeNum) {
    return fail(
      `adoptedInitialBrainOpponent was built for challenge ${generation.challengeNum}, `
      + `but win streak ${config.factoryWinStreak} is challenge ${challengeNum}`,
    );
  }
  return scheduledBrainOpponent(brainStatus, generation, []);
}

/**
 * Source `frontier_getbrainstatus` gate (`pre-battle-room scripts.inc:61,
 * 80-81`): checked BEFORE `factory_generateopponentmons` (`GenerateOpponentMons`,
 * `battle_factory.c:303`) ever runs, so a brain-eligible upcoming battle
 * never draws the ordinary trainer-selection/species-selection RNG at all --
 * this is a real branch point, not a discarded-then-overwritten draw.
 */
function generateOpponentFor(
  config: FactoryRoundBattleOrchestratorConfig,
  battleIndex: number,
  rngValue: number,
  storedTrainerIds: readonly number[],
  savedRentalRecords: readonly FactoryRentalRecord[],
): FactoryScheduledOpponentGeneration {
  const factoryWinStreak = config.factoryWinStreak + battleIndex;
  const brainStatus = getFactoryFrontierBrainStatus({
    battleMode: "singles",
    winStreak: factoryWinStreak,
    symbolsCount: config.factorySymbolsCount ?? 0,
  });
  if (brainStatus !== "not-ready") {
    const generation = generateFactoryBrainOpponent({
      rngValue,
      factoryWinStreak,
      playerRentalSetIds: savedRentalRecords.map((record) => record.setId),
      playerTrainerId: config.playerTrainerId,
    });
    return scheduledBrainOpponent(brainStatus, generation, storedTrainerIds);
  }
  const generation = generateFactoryOpponent({
    rngValue,
    factoryWinStreak,
    battleIndex,
    storedTrainerIds,
    savedRentalSetIds: savedRentalRecords.map((record) => record.setId),
    playerTrainerId: config.playerTrainerId,
    battleTowerLevel50WinStreak: config.battleTowerLevel50WinStreak,
  });
  return Object.freeze({
    kind: "ordinary",
    trainerId: generation.trainerId,
    storedTrainerIds: generation.storedTrainerIds,
    generation,
  });
}

/**
 * `GenerateOpponentMons` (`battle_factory.c:303-330`) is the only code that
 * ever writes `gSaveBlock2Ptr->frontier.trainerIds`, and the pre-battle-room
 * script never calls it for a Frontier Brain battle: `frontier_getbrainstatus`
 * (`pre-battle-room scripts.inc:80-81`) jumps straight from the
 * ready-for-opponent prompt to `AskReadyForHead`, bypassing `AskSwapMon`'s
 * `factory_generateopponentmons` call (scripts.inc:137-138) entirely, and
 * `FillFactoryBrainParty` (`battle_factory.c:759-822`, the brain's own party
 * builder, called from `battle_tower.c:1857`) never touches the array
 * either. In natural play the brain is always the round's 7th and final
 * battle, so this omission is never observed: `trainerIds` resets every
 * challenge (`SetFactoryChallengeVars`, `frontier_util.c:1835-1836`) before
 * it could ever be read again -- the ROM genuinely stores nothing for the
 * brain. A staged round that reaches the brain at an earlier battleIndex has
 * no such protection: the following battle's `selectFactoryTrainer` call
 * demands one history entry per prior battle
 * (`factoryTrainerSchedule.ts:144-148`). Folding the brain's own id into the
 * *next* generation's input only -- never into the brain's own scheduled
 * `storedTrainerIds`, which stays exactly what the ROM would carry -- keeps
 * the natural (battleIndex 6) shape byte-identical while satisfying that
 * invariant for the staged case. The id can never collide with an ordinary
 * trainer id: `TRAINER_FRONTIER_BRAIN` is 1022, ordinary ids never exceed
 * 299 (`factory-round-policy.json`'s `trainerSelection` ranges).
 */
function storedTrainerIdsForNextGeneration(
  previous: FactoryScheduledOpponentGeneration,
): readonly number[] {
  return previous.kind === "frontier-brain"
    ? Object.freeze([...previous.storedTrainerIds, previous.trainerId])
    : previous.storedTrainerIds;
}

/**
 * `adoptedNextOpponent` only carries an ordinary `FactoryOpponentGenerationResult`
 * (probed set-selection + per-mon construction cursors). If the real
 * upcoming battle turns out to be Frontier-Brain eligible, adopting that
 * ordinary schedule anyway would silently play the wrong opponent -- reject
 * instead so the mismatch surfaces at the call site, not mid-battle.
 */
function adoptNextOpponentOrGenerate(
  state: FactoryRoundBattleOrchestratorState,
  battleIndex: number,
  rngBefore: number,
  previous: FactoryScheduledOpponentGeneration,
): FactoryScheduledOpponentGeneration {
  const adoptedNextBrain = state.config.adoptedNextBrainOpponent;
  if (adoptedNextBrain !== undefined && adoptedNextBrain.battleIndex === battleIndex) {
    const brainStatus = getFactoryFrontierBrainStatus({
      battleMode: "singles",
      winStreak: state.config.factoryWinStreak + battleIndex,
      symbolsCount: state.config.factorySymbolsCount ?? 0,
    });
    if (brainStatus === "not-ready") {
      return fail(
        `adoptedNextBrainOpponent for battleIndex ${battleIndex} is a Frontier Brain schedule, `
        + "but the effective win streak at that battle is an ordinary trainer's",
      );
    }
    return scheduledBrainOpponent(brainStatus, adoptedNextBrain.generation, storedTrainerIdsForNextGeneration(previous));
  }
  const adoptedNext = state.config.adoptedNextOpponent;
  if (adoptedNext === undefined || adoptedNext.battleIndex !== battleIndex) {
    return generateOpponentFor(
      state.config,
      battleIndex,
      rngBefore,
      storedTrainerIdsForNextGeneration(previous),
      nextSavedRentalRecords(state),
    );
  }
  const brainStatus = getFactoryFrontierBrainStatus({
    battleMode: "singles",
    winStreak: state.config.factoryWinStreak + battleIndex,
    symbolsCount: state.config.factorySymbolsCount ?? 0,
  });
  if (brainStatus !== "not-ready") {
    return fail(
      `adoptedNextOpponent for battleIndex ${battleIndex} is an ordinary opponent schedule, `
      + `but the effective win streak at that battle is a Frontier Brain battle `
      + `(status "${brainStatus}"); adopting an ordinary schedule for a brain battle `
      + "would silently misadopt the wrong opponent",
    );
  }
  return Object.freeze({
    kind: "ordinary",
    trainerId: adoptedNext.generation.trainerId,
    storedTrainerIds: adoptedNext.generation.storedTrainerIds,
    generation: adoptedNext.generation,
  });
}

export function createFactoryRoundBattleOrchestrator(
  config: FactoryRoundBattleOrchestratorConfig,
): FactoryRoundBattleOrchestratorState {
  if (
    !Number.isSafeInteger(config.facilityState.rentsCount)
    || config.facilityState.rentsCount < 0
    || config.facilityState.rentsCount > 9_999
  ) {
    return fail("facilityState.rentsCount must be an integer in [0, 9999]");
  }
  let rngValue = config.rngValue >>> 0;
  let facilityRngCalls = 0;
  let initialRentalGeneration: FactoryInitialRentalGenerationResult | null = null;
  let playerRentalRecords: FactoryRentalParty;
  let savedRentalRecords: readonly FactoryRentalRecord[];
  const rngSegments: FactoryFacilityRngSegment[] = [];

  if (config.rentals.type === "generateInitial") {
    initialRentalGeneration = generateInitialFactoryRentals({
      rngValue,
      factoryWinStreak: config.factoryWinStreak,
      rentsCount: config.facilityState.rentsCount,
      playerTrainerId: config.playerTrainerId,
    });
    rngSegments.push(generationSegment(
      "initial-rentals",
      0,
      facilityRngCalls,
      rngValue,
      initialRentalGeneration.rngValue,
      initialRentalGeneration.drawLedger.length,
    ));
    facilityRngCalls += initialRentalGeneration.drawLedger.length;
    rngValue = initialRentalGeneration.rngValue;
    playerRentalRecords = selectedInitialRecords(
      initialRentalGeneration,
      config.rentals.selectedRentalIndexes,
    );
    savedRentalRecords = initialRentalGeneration.rentals;
  } else {
    playerRentalRecords = config.rentals.playerRentalRecords;
    savedRentalRecords = config.rentals.savedRentalRecords;
  }

  const adopted = config.adoptedInitialOpponent;
  const adoptedBrain = config.adoptedInitialBrainOpponent;
  if (adopted !== undefined && adoptedBrain !== undefined) {
    return fail("adoptedInitialOpponent and adoptedInitialBrainOpponent are mutually exclusive");
  }
  const firstOpponent: FactoryScheduledOpponentGeneration = adopted !== undefined
    ? Object.freeze({
      kind: "ordinary",
      trainerId: adopted.generation.trainerId,
      storedTrainerIds: adopted.generation.storedTrainerIds,
      generation: adopted.generation,
    })
    : adoptedBrain !== undefined
      ? adoptedBrainOpponentFor(config, adoptedBrain.generation)
      : generateOpponentFor(config, 0, rngValue, [], savedRentalRecords);
  if (adoptedBrain !== undefined) {
    // One construction segment per member: each has its own source cursor.
    for (let opponentIndex = 0; opponentIndex < 3; opponentIndex += 1) {
      const construction = adoptedBrain.generation.drawLedger.filter(
        (draw) => draw.opponentIndex === opponentIndex,
      );
      rngSegments.push(generationSegment(
        "opponent-construction",
        0,
        facilityRngCalls,
        construction[0]!.rngBefore,
        construction.at(-1)!.rngAfter,
        construction.length,
      ));
      facilityRngCalls += construction.length;
    }
  } else if (adopted === undefined) {
    rngSegments.push(generationSegment(
      "opponent-generation",
      0,
      facilityRngCalls,
      rngValue,
      firstOpponent.generation.rngValue,
      firstOpponent.generation.drawLedger.length,
    ));
    facilityRngCalls += firstOpponent.generation.drawLedger.length;
  } else {
    const selection = adopted.generation.drawLedger.filter(({ phase }) => phase !== "personality");
    rngSegments.push(generationSegment(
      "opponent-selection",
      0,
      facilityRngCalls,
      selection[0]!.rngBefore,
      adopted.generation.selectionRngValue,
      selection.length,
    ));
    facilityRngCalls += selection.length;
    for (let opponentIndex = 0; opponentIndex < 3; opponentIndex += 1) {
      const construction = adopted.generation.drawLedger.filter(
        (draw) => draw.phase === "personality" && draw.opponentIndex === opponentIndex,
      );
      rngSegments.push(generationSegment(
        "opponent-construction",
        0,
        facilityRngCalls,
        construction[0]!.rngBefore,
        construction.at(-1)!.rngAfter,
        construction.length,
      ));
      facilityRngCalls += construction.length;
    }
  }
  const opponent = generatedOpponent(firstOpponent);
  rngValue = adopted?.freshBattleRngValue
    ?? adoptedBrain?.freshBattleRngValue
    ?? firstOpponent.generation.rngValue;
  const round = createGeneratedFactoryRoundController({
    id: config.id,
    playerParty: asBattleParty(playerRentalRecords),
    playerRentalRecords,
    opponent,
    rngValue,
  });

  return Object.freeze({
    config,
    facilityState: Object.freeze({ ...config.facilityState }),
    // Every round of this engine starts from its fresh draft, whose script runs `factory_setswapped` before the rental screen
    // (BattleFactoryPreBattleRoom scripts.inc:39-41): the first win of the round pays the draft into rentsCount (fix 44, ROM round replay:
    // never swapping, the count is 0 then 1 from battle 2 on). The engine has no paused-challenge resume (ResumeChallenge, :200-205, sets no flag).
    performedRentalSwap: true,
    round,
    battleStartIntro: null,
    battleStartEntryScripts: Object.freeze([]),
    battle: null,
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    partyOrder: IDENTITY_BATTLE_PARTY_ORDER,
    moveSelectionCursors: RESET_MOVE_SELECTION_CURSORS,
    battlePresentationBoundaries: null,
    aiHistory: null,
    initialRentalGeneration,
    opponentGenerations: Object.freeze([firstOpponent]),
    pendingNextOpponent: null,
    rngSegments: Object.freeze(rngSegments),
    facilityRngCalls,
    activeBattleCallStart: null,
    pendingBattlePreCommandRngCalls: adopted?.preCommandRngCalls ?? adoptedBrain?.preCommandRngCalls ?? 0,
    nextBattleRequestId: 1,
    usedMessageHoldFrames: 0,
    roundOutcome: null,
  });
}

/**
 * Installs the pending round command's frozen intro at the real room seam.
 * Dev-stage command fixtures may continue to acknowledge battleStart directly.
 */
export function beginFactoryRoundBattleStartIntro(
  state: FactoryRoundBattleOrchestratorState,
  sceneAssemblyDisplayLag: 0 | 1 = 0,
): FactoryRoundBattleOrchestratorState {
  if (state.battleStartIntro !== null || state.battle !== null) {
    return fail("Factory battle-start intro requires an unstarted battle");
  }
  const command = factoryBattleStartPresentationForState(state);
  if (command === null) {
    return fail("Factory battle-start intro requires a pending battleStart command");
  }
  // Route-level fact, not a species/trainer/trace-name check: only the
  // interactive draft anchor adopts its Battle 1 opponent schedule
  // pre-selected (config.adoptedInitialOpponent, factoryAnchorSession.ts);
  // every other caller (dev-stage fixtures, and any later live battle within
  // the same session) generates its opponent fresh at this battleIndex.
  const isCanonicalAnchorIntro =
    state.config.adoptedInitialOpponent !== undefined && command.battleIndex === 0;
  // Route-level fact (ISSUES #87 option (c)), not a species/trainer/trace-
  // name check: `getFactoryFrontierBrainStatus` already resolved this
  // battle's opponent to "silver" (frontier_util.c's GetFrontierBrainStatus
  // port) when the round advanced to it. See `isSilverBrainReveal`'s doc on
  // `FactoryBattleStartIntroState`.
  const isSilverBrainReveal =
    state.round.rules.currentOpponent.frontierBrain?.status === "silver";
  // Gold sibling of the same route-level fact — see `isGoldBrainReveal`'s
  // doc on `FactoryBattleStartIntroState`.
  const isGoldBrainReveal =
    state.round.rules.currentOpponent.frontierBrain?.status === "gold";
  return Object.freeze({
    ...state,
    battleStartIntro: Object.freeze({
      ...createFactoryBattleStartIntro(
        command,
        isCanonicalAnchorIntro,
        sceneAssemblyDisplayLag,
        isSilverBrainReveal,
        isGoldBrainReveal,
        state.config.battleScene === "on",
      ),
      elapsed: -GENERATED_BATTLE_INTRO_ROOM_HANDOFF_DELAY,
    }),
  });
}

/**
 * Owns the live A edge through command readiness. Only that boundary
 * acknowledges battleStart, creates the fresh kernel, and settles its exact
 * typed command field into the already-proven action-menu lifecycle.
 */
export function advanceFactoryRoundBattleStartIntro(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton>,
): FactoryRoundBattleOrchestratorState {
  if (state.battleStartIntro === null) {
    return fail("Factory battle-start intro input requires an installed intro");
  }
  const entry = state.battleStartIntro.entry;
  if (entry !== undefined) {
    const advanced = advanceFactoryBattleStartEntry(entry);
    if (!factoryBattleStartEntryComplete(advanced)) {
      return Object.freeze({
        ...state,
        battleStartIntro: Object.freeze({ ...state.battleStartIntro, entry: advanced }),
      });
    }
    return Object.freeze({
      ...state,
      battleStartIntro: null,
      battleCommandPresentation: settleFactoryBattleStartCommand(state.battleStartIntro, entry.command),
    });
  }
  const intro = advanceFactoryBattleStartIntro(
    state.battleStartIntro,
    newKeys,
  );
  // The source PAUSE_UNTIL_PRESS callback accepts the edge before its
  // BeginBattleIntro presentation task advances on the following callback.
  if (
    state.battleStartIntro.acknowledgedElapsed === null
    && intro.acknowledgedElapsed !== null
  ) {
    return Object.freeze({
      ...state,
      battleStartIntro: Object.freeze({
        ...intro,
        elapsed: state.battleStartIntro.elapsed,
      }),
    });
  }
  if (!generatedBattleStartCommandReady(intro)) {
    return Object.freeze({ ...state, battleStartIntro: intro });
  }
  const commandId = state.round.presentation?.command.commandId;
  if (
    state.round.presentation?.command.type !== "battleStart"
    || commandId !== intro.command.commandId
  ) {
    return fail("Factory battle-start intro lost its pending round command");
  }
  const started = advanceFactoryRoundPresentation(
    completeFactoryRoundPresentation(state, { commandId }),
  );
  if (started.battleCommandPresentation === null) {
    return fail("Factory battle-start intro did not publish a fresh command");
  }
  const entryPhase = started.battle === null
    ? null
    : createFactoryBattleStartEntry(
      started.battleStartEntryScripts,
      intro.command.text.playerSendOut,
      started.battle,
      started.battleCommandPresentation,
    );
  if (entryPhase !== null) {
    return Object.freeze({
      ...started,
      battleStartIntro: Object.freeze({ ...intro, entry: entryPhase }),
      battleCommandPresentation: null,
    });
  }
  return Object.freeze({
    ...started,
    battleStartIntro: null,
    battleCommandPresentation: settleFactoryBattleStartCommand(
      intro,
      started.battleCommandPresentation,
    ),
  });
}

function startCurrentBattle(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.round.rules.phase !== "battleActive") {
    return fail("fresh battle start requires the controller's battleActive phase");
  }
  const player = state.round.rules.playerKernelParty;
  const opponentRecords = state.round.rules.currentOpponent.rentalRecords;
  if (player === null || opponentRecords === undefined) {
    return fail("generated Factory battle start requires both full parties");
  }
  const initialized = initializeFreshFactoryBattle({
    requestId: state.nextBattleRequestId,
    rngSeed: state.round.rules.rngValue,
    battleScene: state.config.battleScene ?? "off",
    preCommandRngCalls: state.pendingBattlePreCommandRngCalls,
    ...(state.carriedBattleMovePower === undefined ? {} : { battleMovePower: state.carriedBattleMovePower }),
    playerParty: asBattleScriptParty(player),
    opponentParty: asBattleScriptParty(asKernelParty(opponentRecords)),
  });
  const started = initialized.state;
  const battleStartOrderHost = seedLiveSpriteOrderHostFromBattleStart(initialized.events);
  const callStart = state.facilityRngCalls;
  if (
    started.boundary.kind !== "decision-required"
    || started.boundary.request.kind !== "command"
    || started.boundary.request.side !== "player"
  ) {
    return fail("fresh Factory battle must publish a player command boundary");
  }
  const moveSelectionCursors = RESET_MOVE_SELECTION_CURSORS;
  const battleCommandPresentation = createBattleCommandPresentation(
    started.boundary.request,
    started.rules.rulesContext,
    moveSelectionCursors[started.boundary.request.battler],
  );
  return Object.freeze({
    ...state,
    battle: started,
    battleStartEntryScripts: initialized.entryScripts,
    partyOrder: bufferBattlePartyOrderBySide(started.rules.rulesContext.battlers[0].partyIndex),
    battleCommandPresentation,
    battleResolutionPresentation: null,
    liveMoveSpriteAllocatorHost: state.config.battleScene === "on"
      ? Object.freeze({
          battleCallStart: callStart,
          commandKey: "",
          host: createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove,
          // Battle-start script events: Intimidate triples (pre-prompt state + one stat animation each) and Trace /
          // prevented-Intimidate messages (no allocation), none = the known entry; anything else is unknown history
          // (liveSpriteOrderHost.ts seedLiveSpriteOrderHostFromBattleStart).
          order: liveSpriteOrderHostOrder(battleStartOrderHost),
          orderHost: battleStartOrderHost,
        })
      : undefined,
    // Both battlers were just sent in (idle x2); battle-start script events (Intimidate) apply in order.
    liveBattlerX2Host: state.config.battleScene === "on"
      ? Object.freeze({
          battleCallStart: callStart, commandKey: "",
          // gBattleMovePower carries across battles (carriedBattleMovePower), so a possible W3 write carries with it.
          host: createLiveBattlerX2Host(initialized.events.flatMap(liveBattlerX2EventsOf)
            .reduce(applyLiveBattlerX2Event, LIVE_BATTLER_X2_IDLE),
          state.liveBattlerX2Host?.host.staleMovePowerUnknown === true
            || initialized.events.some(liveStaleMovePowerTaintedBy)),
        })
      : undefined,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries: createBattlePresentationBoundaries(
      battleCommandPresentation,
      started,
      moveSelectionCursors,
    ),
    aiHistory: createFactoryAiBattleHistory(started.rules.rulesContext),
    facilityRngCalls: callStart + started.rng.calls,
    activeBattleCallStart: callStart,
    pendingBattlePreCommandRngCalls: 0,
    nextBattleRequestId: state.nextBattleRequestId + 1,
  });
}

export function completeFactoryRoundPresentation(
  state: FactoryRoundBattleOrchestratorState,
  completion: BattlePresentationCompletion,
): FactoryRoundBattleOrchestratorState {
  return Object.freeze({
    ...state,
    round: completeBattlePresentation(state.round, completion),
  });
}

function nextSavedRentalRecords(
  state: FactoryRoundBattleOrchestratorState,
): readonly FactoryRentalRecord[] {
  const player = state.round.rules.playerRentalRecords;
  const opponent = state.round.rules.currentOpponent.rentalRecords;
  if (player === null || opponent === undefined) {
    return fail("next generated opponent requires both full rental record parties");
  }
  return [...player, ...opponent];
}

/**
 * Source `AskSwapMon` seam (`pre-battle-room scripts.inc:137-149`): the ROM
 * calls `factory_generateopponentmons` before the opponent type/style
 * commentary and before the swap offer, and only publishes the pending
 * opponent after the swap resolves. This pre-generates battleIndex+1 from the
 * post-battle cursor at the post-win/scouting transition (the accepted GO ON
 * continuation), consuming the same RNG receipt the swap-resolved advance
 * would otherwise spend, so the ledger stays gapless and the defeated
 * opponent's party/records remain the swap screen's enemy pool. Idempotent:
 * a second call returns the same state, so repeated GO ON handling can never
 * double-generate. Any round not sitting on an uncompleted `battleWon` (a
 * staged canonical postwin, a mid-battle round, or an already-published
 * pending opponent) is returned unchanged.
 */
export function preGenerateFactoryRoundNextOpponent(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.pendingNextOpponent !== null) return state;
  const pending = state.round.presentation;
  if (
    state.round.rules.phase !== "presentingBattleWin"
    || pending === null
    || pending.command.type !== "battleWon"
    || pending.completed
  ) {
    return state;
  }
  const battleIndex = state.round.rules.battleIndex + 1;
  if (battleIndex > 6) {
    return fail("a seventh win has no next opponent to pre-generate");
  }
  // Fix 45 (docs/parity-mac/brain-party-after-swap.md): the Factory Head has no GO ON roll. AskReadyForHead -> AskSwapBeforeHead runs no
  // factory_generateopponentmons (BattleFactoryPreBattleRoom scripts.inc:349-376); his party is rolled at the battle's start
  // (FillFactoryTrainerParty -> FillFactoryBrainParty, battle_tower.c:1857), after the swap, excluding the rentalMons of that moment
  // (battle_factory.c:786-792): the player's three after the swap and the beaten trainer's three. So a Brain battle is generated at the
  // swap's resolution (advanceFactoryRoundPresentation), never here.
  if (getFactoryFrontierBrainStatus({
    battleMode: "singles",
    winStreak: state.config.factoryWinStreak + battleIndex,
    symbolsCount: state.config.factorySymbolsCount ?? 0,
  }) !== "not-ready") {
    return state;
  }
  const previous = state.opponentGenerations.at(-1)!;
  const rngBefore = state.round.rules.rngValue;
  const generated = adoptNextOpponentOrGenerate(state, battleIndex, rngBefore, previous);
  const segment = generationSegment(
    "opponent-generation",
    battleIndex,
    state.facilityRngCalls,
    rngBefore,
    generated.generation.rngValue,
    generated.generation.drawLedger.length,
  );
  return Object.freeze({
    ...state,
    pendingNextOpponent: generated,
    rngSegments: Object.freeze([...state.rngSegments, segment]),
    facilityRngCalls: segment.callEnd,
  });
}

export function advanceFactoryRoundPresentation(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.round.rules.phase === "presentingSwapResult") {
    const pending = state.pendingNextOpponent;
    if (pending !== null) {
      // The source-equivalent pre-generation already spent this segment's
      // RNG receipt at the post-win/scouting transition; publishing here
      // must not re-roll the opponent or append a second receipt.
      return Object.freeze({
        ...state,
        round: advanceRoundControllerWithGeneratedOpponent(state.round, {
          opponent: generatedOpponent(pending),
          rngValue: pending.generation.rngValue,
        }),
        opponentGenerations: Object.freeze([...state.opponentGenerations, pending]),
        pendingNextOpponent: null,
      });
    }
    // A Frontier Brain battle (fix 45: the source rolls the Head's party at the battle's start, after the swap) and simplified rounds that
    // never pre-generate (fixture stages, direct swap-decision tests) roll here, at the swap's resolution: the same cursor as a GO ON
    // pre-generation, with the rentals after the swap (nextSavedRentalRecords: the player's three as swapped, the beaten trainer's three).
    const battleIndex = state.round.rules.battleIndex + 1;
    const previous = state.opponentGenerations.at(-1)!;
    const rngBefore = state.round.rules.rngValue;
    const generated = adoptNextOpponentOrGenerate(state, battleIndex, rngBefore, previous);
    const segment = generationSegment(
      "opponent-generation",
      battleIndex,
      state.facilityRngCalls,
      rngBefore,
      generated.generation.rngValue,
      generated.generation.drawLedger.length,
    );
    return Object.freeze({
      ...state,
      round: advanceRoundControllerWithGeneratedOpponent(state.round, {
        opponent: generatedOpponent(generated),
        rngValue: generated.generation.rngValue,
      }),
      opponentGenerations: Object.freeze([...state.opponentGenerations, generated]),
      rngSegments: Object.freeze([...state.rngSegments, segment]),
      facilityRngCalls: segment.callEnd,
    });
  }

  const round = advanceRoundController(state.round);
  const advanced = Object.freeze({ ...state, round });
  return round.rules.phase === "battleActive" ? startCurrentBattle(advanced) : advanced;
}

export function chooseFactoryRoundSwap(
  state: FactoryRoundBattleOrchestratorState,
  decision: SwapDecision,
): FactoryRoundBattleOrchestratorState {
  return Object.freeze({
    ...state,
    round: chooseRoundSwap(state.round, decision),
    performedRentalSwap: state.performedRentalSwap || decision.type === "accept",
  });
}

/**
 * `GiveBattlePoints`/`GiveFacilitySymbol` (`frontier_util.c:1853-1925`) as a
 * round-controller output: given the config a round started with, the
 * battleIndex just resolved, its win/loss outcome, and the opponent just
 * fought (for its `frontierBrain` marker), returns the BP/symbol result the
 * real Lobby script would compute. `finishBattle` calls this at the two real
 * round-terminal phases (`roundComplete`/`roundLost`); exported so callers
 * that resolve a round without a real kernel battle (e.g. a scripted loss)
 * can compute the same output from the same round-controller inputs.
 */
export function factoryRoundOutcomeForResolution(
  config: FactoryRoundBattleOrchestratorConfig,
  battleIndex: number,
  outcome: "win" | "loss",
  frontierBrain: BattleOpponent["frontierBrain"],
): FactoryBrainRoundOutcomeResult {
  return applyFactoryBrainRoundOutcome({
    outcome,
    factoryWinStreak: config.factoryWinStreak + battleIndex,
    factorySymbolsCount: config.factorySymbolsCount ?? 0,
    frontierBrain,
  });
}

function finishBattle(
  state: FactoryRoundBattleOrchestratorState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  aiHistory: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  if (battle.boundary.kind !== "terminal" || state.activeBattleCallStart === null) {
    return fail("finishBattle requires a real terminal boundary");
  }
  const playerIdentity = state.round.rules.playerKernelParty;
  const opponentRecords = state.round.rules.currentOpponent.rentalRecords;
  if (playerIdentity === null || opponentRecords === undefined) {
    return fail("terminal Factory battle requires both full party identities");
  }
  const playerKernelParty = overlayTerminalKernelParty(
    playerIdentity,
    battle.rules.rulesContext.party.player,
  );
  const opponentKernelParty = overlayTerminalKernelParty(
    healFactoryKernelParty(opponentRecords),
    battle.rules.rulesContext.party.opponent,
  );
  const adapted = deriveBattleResolutionFromTerminalBoundary({
    rngValue: battle.rng.value,
    outcome: battle.boundary.outcome,
    rulesContext: battle.rules.rulesContext,
    preBattlePlayerParty: state.round.rules.playerParty,
    preBattleOpponentParty: state.round.rules.currentOpponent.party,
  });
  const segment: FactoryFacilityRngSegment = Object.freeze({
    kind: "battle",
    battleIndex: state.round.rules.battleIndex,
    callStart: state.activeBattleCallStart,
    callEnd: state.activeBattleCallStart + battle.rng.calls,
    rngBefore: state.round.rules.rngValue,
    rngAfter: battle.rng.value,
  });
  const round = resolveRoundBattle(state.round, {
    ...adapted,
    playerKernelParty,
    opponentKernelParty,
  });
  // EventScript_DefeatedOpponent (BattleFrontier_BattleFactoryBattleRoom/
  // scripts.inc:92-97) increments FACTORY_DATA_WIN_STREAK_SWAPS on every
  // defeated opponent (skipped only at MAX_STREAK==9999), independent of
  // performedRentalSwap. SetBattleFactoryData (battle_factory.c:259-265)
  // commits that value into save data, and clears sPerformedRentalSwap,
  // only while sPerformedRentalSwap == TRUE. So a swap accepted after
  // battle k is paid (and the flag cleared) at battle k+1's win, and at
  // MAX_STREAK neither the increment nor the clear happens. A loss ends
  // the challenge before either script runs; the chaining reset owns
  // that case (factoryRoundChaining.ts:72), not this reducer.
  const persistRentalSwap = (
    round.rules.phase === "presentingBattleWin" || round.rules.phase === "roundComplete"
  )
    && state.performedRentalSwap
    && state.facilityState.rentsCount < 9_999;
  const roundOutcome = round.rules.phase === "roundComplete" || round.rules.phase === "roundLost"
    ? factoryRoundOutcomeForResolution(
      state.config,
      round.rules.battleIndex,
      round.rules.phase === "roundComplete" ? "win" : "loss",
      round.rules.currentOpponent.frontierBrain,
    )
    : state.roundOutcome;
  return Object.freeze({
    ...state,
    // Fix 49 (docs/parity-mac/heard-speech-kept-at-rent.md): the win writes the rent count only (battle_factory.c:259-265); the
    // heard-speech bits stay as they are.
    facilityState: persistRentalSwap
      ? Object.freeze({
        ...state.facilityState,
        rentsCount: state.facilityState.rentsCount + 1,
      })
      : state.facilityState,
    performedRentalSwap: persistRentalSwap ? false : state.performedRentalSwap,
    round,
    roundOutcome,
    battle: null,
    ...(battle.rules.rulesContext.battleMovePower !== 0 || state.carriedBattleMovePower !== undefined
      ? { carriedBattleMovePower: battle.rules.rulesContext.battleMovePower }
      : {}),
    battleCommandPresentation: null,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    battlePresentationBoundaries: null,
    aiHistory,
    rngSegments: Object.freeze([...state.rngSegments, segment]),
    facilityRngCalls: segment.callEnd,
    activeBattleCallStart: null,
  });
}

/**
 * flow1: the ROM's gMoveSelectionCursor[battler] (and gActionSelectionCursor, which ours already opens at 0 on every request) goes
 * back to the first entry whenever that battler takes in a Pokemon: HandleAction_Switch (battle_util.c:299-300) for a voluntary
 * switch, SwitchInClearSetData (battle_main.c:3203-3204) and PlayerHandleSwitchInAnim (battle_controller_player.c:2190-2191) for
 * every switch-in (voluntary, faint replacement, Baton Pass, Roar / Whirlwind), FaintClearSetData (battle_main.c:3285-3286) on a
 * faint, and Transform's RESET_MOVE_SELECTION (battle_script_commands.c:7802). Every switch-in runs Cmd_switchinanim, so the
 * receipt's `switch-in-animation` event is the switch-in mark; it also catches a switch that brings the same slot back within one
 * receipt (CHARMELEON -> PHANPY, PHANPY fainted, CHARMELEON again), which a party-slot comparison misses. The party-slot comparison
 * stays as a second mark.
 */
export function resetMoveSelectionCursorsForSwitchIns(
  cursors: FactoryBattleMoveSelectionCursors,
  before: BattleState<FactoryFullTurnDecisionRules>,
  after: BattleState<FactoryFullTurnDecisionRules>,
  events: readonly BattleKernelSemanticEvent[],
): FactoryBattleMoveSelectionCursors {
  let next: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]
    | null = null;
  const reset = (battler: number): void => {
    if (battler < 0 || battler > 3 || (next ?? cursors)[battler] === 0) return;
    next ??= [...cursors];
    next[battler] = 0;
  };
  const battlersCount = after.rules.rulesContext.battleTopology.battlersCount;
  for (let battler = 0; battler < battlersCount; battler += 1) {
    if (
      before.rules.rulesContext.battlers[battler]!.partyIndex
      !== after.rules.rulesContext.battlers[battler]!.partyIndex
    ) reset(battler);
  }
  for (const event of events) {
    const payload = event.payload;
    if (
      payload.kind === "switch-in-animation"
      || (payload.kind === "reset-action-move-selection" && payload.reset === "move-selection")
    ) reset(payload.battler);
  }
  return next === null ? cursors : Object.freeze(next);
}

function createBattlePresentationBoundaries(
  presentation: BattleCommandPresentationState,
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
  previous: FactoryBattlePresentationBoundaries | null = null,
): FactoryBattlePresentationBoundaries {
  const fields = [presentation.field.player, presentation.field.opponent] as const;
  return Object.freeze(fields.map((field, battler) => {
    const active = battle.rules.rulesContext.battlers[battler]!;
    const prior = previous?.[battler];
    const switched = prior !== undefined && prior.partyIndex !== field.partyIndex;
    return Object.freeze({
      battler: battler as 0 | 1,
      partyIndex: field.partyIndex,
      field,
      displayedHp: field.hp,
      displayedStatus1: active.status1,
      spriteVisible: prior === undefined || switched ? true : prior.spriteVisible,
      ...(prior !== undefined && !switched && prior.liveSemiInvulnerableHidden
        ? { liveSemiInvulnerableHidden: true } : {}),
      ...(prior?.liveCastformForm ? { liveCastformForm: prior.liveCastformForm } : {}),
      // pic9: the side's hpOnSwitchout lives until the next switch-in (set at that switch-in's commit), across action menus.
      ...(prior?.hpOnSwitchout !== undefined ? { hpOnSwitchout: prior.hpOnSwitchout } : {}),
      idleEpoch: prior === undefined || switched ? 0 : prior.idleEpoch,
      moveCursor: switched ? 0 : cursors[battler]!,
    });
  })) as unknown as FactoryBattlePresentationBoundaries;
}

function commandPresentationForBoundary(
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
  usedMessageHoldFrames: number,
): BattleCommandPresentationState | null {
  if (
    battle.boundary.kind !== "decision-required"
    || battle.boundary.request.kind !== "command"
    || battle.boundary.request.side !== "player"
  ) return null;
  return createBattleCommandPresentation(
    battle.boundary.request,
    battle.rules.rulesContext,
    cursors[battle.boundary.request.battler],
    BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
    usedMessageHoldFrames,
  );
}

function appendDriveEvents(
  events: readonly BattleKernelSemanticEvent[],
  appended: readonly BattleKernelSemanticEvent[],
): readonly BattleKernelSemanticEvent[] {
  let previous = events.at(-1)?.sequence ?? -1;
  for (const event of appended) {
    if (!Number.isSafeInteger(event.sequence) || event.sequence <= previous) {
      return fail(
        `trainer drive event sequence ${event.sequence} is not strictly increasing after ${previous}`,
      );
    }
    previous = event.sequence;
  }
  return Object.freeze([...events, ...appended]);
}

function driveTrainerBoundary(
  state: FactoryRoundBattleOrchestratorState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
  options: Readonly<{ stopAtFollowupTrainerBoundary?: boolean }> = {},
): FactoryBattleDriveReceipt {
  let nextBattle = transition.state;
  let nextHistory = history;
  let events = appendDriveEvents([], transition.events);
  while (
    nextBattle.boundary.kind === "decision-required"
    && nextBattle.boundary.request.kind === "command"
    && nextBattle.boundary.request.side === "trainer"
  ) {
    const ai = submitLiveFactoryAiDecision(
      nextBattle,
      nextHistory,
      {
        factoryWinStreak: state.config.factoryWinStreak + state.round.rules.battleIndex,
        trainerOpponentId: state.opponentGenerations.at(-1)!.trainerId,
      },
      reduceFactoryFullTurnDecision,
    );
    events = appendDriveEvents(events, ai.transition.events);
    nextBattle = ai.transition.state;
    nextHistory = ai.history;
    // A player multi-turn lock is source-published as another trainer
    // command after the first trainer action. Keep each actual reducer pass
    // as its own presentation segment instead of flattening it into the
    // charge receipt; the later generic continuation owns the next pass.
    if (
      options.stopAtFollowupTrainerBoundary === true
      && nextBattle.boundary.kind === "decision-required"
      && nextBattle.boundary.request.kind === "command"
      && nextBattle.boundary.request.side === "trainer"
    ) break;
  }
  if (nextBattle.boundary.kind === "machine-barrier") {
    return fail(`battle kernel reached ${JSON.stringify({
      ...nextBattle.boundary.barrier,
      activePartyIndexes: nextBattle.rules.rulesContext.battlers.slice(0, 2)
        .map((battler) => battler.partyIndex),
      playerHp: nextBattle.rules.rulesContext.party.player.slice(0, 3).map((member) => member.hp),
      opponentHp: nextBattle.rules.rulesContext.party.opponent.slice(0, 3).map((member) => member.hp),
    })}`);
  }
  const stoppedAtFollowupTrainerBoundary =
    options.stopAtFollowupTrainerBoundary === true
    && nextBattle.boundary.kind === "decision-required"
    && nextBattle.boundary.request.kind === "command"
    && nextBattle.boundary.request.side === "trainer";
  if (
    nextBattle.boundary.kind !== "terminal"
    && !stoppedAtFollowupTrainerBoundary
    && (
      nextBattle.boundary.kind !== "decision-required"
      || nextBattle.boundary.request.side !== "player"
    )
  ) {
    return fail("battle stopped outside a player, trainer, terminal, or barrier boundary");
  }
  return Object.freeze({
    battle: nextBattle,
    history: nextHistory,
    events,
    boundary: nextBattle.boundary,
  });
}

function installDriveReceiptImmediately(
  state: FactoryRoundBattleOrchestratorState,
  receipt: FactoryBattleDriveReceipt,
): FactoryRoundBattleOrchestratorState {
  if (receipt.boundary.kind === "terminal") {
    return finishBattle(state, receipt.battle, receipt.history);
  }
  const moveSelectionCursors = state.battle === null
    ? state.moveSelectionCursors
    : resetMoveSelectionCursorsForSwitchIns(
      state.moveSelectionCursors,
      state.battle,
      receipt.battle,
      receipt.events,
    );
  const battleCommandPresentation = commandPresentationForBoundary(
    receipt.battle,
    moveSelectionCursors,
    state.usedMessageHoldFrames,
  );
  // The receipt's events are never presented, so the tracked order cannot
  // follow them.
  const sprites = state.liveMoveSpriteAllocatorHost;
  return Object.freeze({
    ...state,
    liveMoveSpriteAllocatorHost: sprites === undefined ? undefined : withOrderHost(
      sprites, invalidateLiveSpriteOrderHost(orderHostOf(sprites), "battle advanced without a presented resolution"),
    ),
    liveBattlerX2Host: invalidateX2Host(state, "battle advanced without a presented resolution", true),
    battle: receipt.battle,
    partyOrder: applyPlayerSwitchEvents(state.partyOrder, receipt.events),
    battleCommandPresentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    moveSelectionCursors,
    battlePresentationBoundaries: battleCommandPresentation === null
      ? state.battlePresentationBoundaries
      : createBattlePresentationBoundaries(
        battleCommandPresentation,
        receipt.battle,
        moveSelectionCursors,
        state.battlePresentationBoundaries,
      ),
    aiHistory: receipt.history,
    facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
  });
}

function transitionFromDriveReceipt(
  receipt: FactoryBattleDriveReceipt,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  if (receipt.boundary.kind === "decision-required") {
    return Object.freeze({
      kind: "decision-required",
      state: receipt.battle,
      events: receipt.events,
      nextRequest: receipt.boundary.request,
    });
  }
  if (receipt.boundary.kind === "machine-barrier") {
    return Object.freeze({
      kind: "machine-barrier",
      state: receipt.battle,
      events: receipt.events,
      barrier: receipt.boundary.barrier,
    });
  }
  return Object.freeze({
    kind: "terminal",
    state: receipt.battle,
    events: receipt.events,
    outcome: receipt.boundary.outcome,
  });
}

function transitionAtPublishedTrainerBoundary(
  battle: BattleState<FactoryFullTurnDecisionRules>,
): BattleDecisionTransitionResult<FactoryFullTurnDecisionRules> {
  if (
    battle.boundary.kind !== "decision-required"
    || battle.boundary.request.kind !== "command"
    || battle.boundary.request.side !== "trainer"
  ) {
    return fail("automatic action continuation requires a published trainer command boundary");
  }
  // No semantic event is minted here. `driveTrainerBoundary` starts at this
  // real reducer boundary and appends only the live Factory-AI submission's
  // untouched receipt.
  return Object.freeze({
    kind: "decision-required" as const,
    state: battle,
    events: Object.freeze([]),
    nextRequest: battle.boundary.request,
  });
}

function applyReceiptPpToBoundaries(
  boundaries: FactoryBattlePresentationBoundaries,
  events: readonly BattleKernelSemanticEvent[],
): FactoryBattlePresentationBoundaries {
  let next = boundaries;
  for (const event of events) {
    const payload = event.payload;
    if (payload.kind !== "set-battler-pp-data") continue;
    if (payload.battler !== 0 && payload.battler !== 1) {
      return fail(`Slice 3 cannot store PP for non-singles battler ${payload.battler}`);
    }
    const boundary = next[payload.battler];
    const currentPP = [...boundary.field.currentPP] as [number, number, number, number];
    currentPP[payload.movePosition] = payload.pp;
    const replacement = Object.freeze({
      ...boundary,
      field: Object.freeze({
        ...boundary.field,
        currentPP: Object.freeze(currentPP),
      }),
    });
    next = Object.freeze(next.map((candidate, battler) =>
      battler === payload.battler ? replacement : candidate
    )) as unknown as FactoryBattlePresentationBoundaries;
  }
  return next;
}

type OrderHostCarrier = Readonly<{ order: SpriteOrderState; orderHost?: LiveSpriteOrderHost }>;

function orderHostOf(sprites: OrderHostCarrier): LiveSpriteOrderHost {
  return sprites.orderHost ?? createLiveSpriteOrderHost(sprites.order);
}

/** The battle's x2 history host with both sides unknown (unchanged when absent or from another battle). */
function invalidateX2Host(
  state: FactoryRoundBattleOrchestratorState, reason: string, eventsUnseen = false,
): FactoryRoundBattleOrchestratorState["liveBattlerX2Host"] {
  const x2 = state.liveBattlerX2Host;
  if (x2 === undefined || x2.battleCallStart !== state.activeBattleCallStart) return x2;
  const host = invalidateLiveBattlerX2Host(x2.host, reason, eventsUnseen);
  return host === x2.host ? x2 : Object.freeze({ ...x2, host });
}

function withOrderHost<T extends OrderHostCarrier>(sprites: T, orderHost: LiveSpriteOrderHost): T {
  return Object.freeze({ ...sprites, orderHost, order: liveSpriteOrderHostOrder(orderHost) });
}

/**
 * The submitted command came from the action prompt: its bounce pair is
 * created and destroyed before the turn's first body (gap-causes §2). A
 * locked player action shows no prompt (invalidates). A retained
 * locked-action continuation shows the player's ordinary prompt at the turn
 * boundary, between the retained resolution's last applied segment and the
 * appended continuation segment (HandleTurnActionSelectionState skips only
 * the locked battler; docs/next-adapters-prep47.md).
 */
function beginOrderTurn(
  state: FactoryRoundBattleOrchestratorState,
  requestId: number,
  promptShown: boolean,
  fromPartyMenu: boolean,
): FactoryRoundBattleOrchestratorState["liveMoveSpriteAllocatorHost"] {
  const sprites = state.liveMoveSpriteAllocatorHost;
  if (
    state.config.battleScene !== "on" || sprites === undefined
    || sprites.battleCallStart !== state.activeBattleCallStart
  ) return sprites;
  return withOrderHost(
    sprites, beginLiveSpriteOrderTurn(orderHostOf(sprites), requestId, promptShown, fromPartyMenu),
  );
}

/**
 * Voluntary party menu closed back to the action prompt: its exit reset and
 * the battle reshow with both battlers (sprite-order-uncovered-units.md §2).
 * The reshow leaves the allocator occupancy role-isomorphic to the known
 * entry: the allocator host invalidated at menu open is re-seeded in entry
 * labels (docs/voluntary-switch-lend-audit.md §4.4).
 */
function returnOrderHostFromPartyMenu(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState["liveMoveSpriteAllocatorHost"] {
  const sprites = state.liveMoveSpriteAllocatorHost;
  if (
    state.config.battleScene !== "on" || sprites === undefined
    || sprites.battleCallStart !== state.activeBattleCallStart
  ) return sprites;
  const orderHost = returnLiveSpriteOrderHostFromPartyMenu(
    orderHostOf(sprites), { player: true, opponent: true },
  );
  return Object.freeze({
    ...withOrderHost(sprites, orderHost),
    host: reseedLiveSpriteAllocatorAfterSendOut(sprites.host, orderHost),
  });
}

function beginCommandResolution(
  state: FactoryRoundBattleOrchestratorState,
  presentation: BattleCommandPresentationState,
  transition: BattleDecisionTransitionResult<FactoryFullTurnDecisionRules>,
  history: FactoryAiBattleHistory,
): FactoryRoundBattleOrchestratorState {
  if (state.battle === null || presentation.pendingDecision === null) {
    return fail("command resolution requires a submitted live battle decision");
  }
  if (state.battlePresentationBoundaries === null) {
    return fail("command resolution requires controller battler boundaries");
  }
  const receipt = driveTrainerBoundary(state, transition, history, {
    stopAtFollowupTrainerBoundary: true,
  });
  const retained = state.retainedLockedActionPresentationOwner;
  const drivenTransition = transitionFromDriveReceipt(receipt);
  const freshResolution = (): BattleResolutionPresentationState =>
    createBattleResolutionPresentation({
      sourceRequest: presentation.request,
      sourceDecision: presentation.pendingDecision!,
      beforeRules: state.battle!.rules,
      transition: drivenTransition,
      fieldBoundary: presentation.field,
      confirmHandoff: Object.freeze({
        fightDisplayCursor: presentation.fightDisplayCursor,
        idleBounceElapsed: presentation.idleBounceElapsed,
        ...(presentation.forcedMove !== null
          && presentation.pendingDecision === presentation.forcedMove.decision
          ? {
            forced: presentation.forcedMove.kind,
            ...(presentation.forcedMove.dismissedWaitCursorAge === undefined
              ? {}
              : { forcedWaitCursorAge: presentation.forcedMove.dismissedWaitCursorAge }),
          }
          : {}),
      }),
      usedMessageHoldFrames: presentation.usedMessageHoldFrames,
      opponentTrainer: factoryTrainerPresentationForOpponent(
        state.round.rules.currentOpponent,
      ),
      opponentHpOnSwitchout: opponentHpOnSwitchout(state.battlePresentationBoundaries!),
    });
  let resolution: BattleResolutionPresentationState;
  if (retained === null) {
    resolution = freshResolution();
  } else {
    if (
      retained.resolution.pendingBattle !== state.battle
      || retained.resolution.pendingBoundary.kind !== "decision-required"
      || retained.resolution.pendingBoundary.request.kind !== "command"
      || retained.resolution.pendingBoundary.request.requestId
        !== presentation.request.requestId
      || retained.resolution.pendingBoundary.request.side
        !== presentation.request.side
      || retained.resolution.pendingBoundary.request.battler
        !== presentation.request.battler
    ) {
      return fail("retained locked action owner does not match the intervening command");
    }
    const rules = state.battle.rules.rulesContext;
    const action = retained.action;
    const activeLock = rules.battlers[action.battler]!.status2 & (
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
    );
    if (
      activeLock === 0
      || rules.lockedMoves[action.battler] !== action.currentMove
      || rules.chosenMovePositions[action.battler] !== action.currentMovePosition
    ) {
      return fail("retained locked action identity no longer matches the kernel");
    }
    // FaintClearSetData (battle_main.c:3272) unconditionally zeroes status2 on
    // faint, so the locked battler can still be KO'd by this very transition
    // (the other battler simply moved first) before its continuation ever
    // prints. That is a genuine game outcome, not a stale retained snapshot —
    // fall back to a fresh resolution identity exactly as the no-retained-
    // owner branch above would, rather than forcing a continuation receipt
    // that this transition was never going to produce.
    resolution = hasRetainedLockedActionReceipt(drivenTransition.events, action)
      ? appendBattleResolutionLockedActionContinuation({
          resolution: retained.resolution,
          transition: drivenTransition,
          fieldBoundary: presentation.field,
          lockedAction: action,
          // flow1: a voluntary switch here keeps its recall line and recall (the foe underground after Dig, seed 6).
          sourceDecision: presentation.pendingDecision,
          opponentHpOnSwitchout: opponentHpOnSwitchout(state.battlePresentationBoundaries!),
        })
      : freshResolution();
  }
  // A charge body in an earlier turn left its attacker hidden (presentation-only display ledger state).
  const semiInvulnerableHidden = liveSemiInvulnerableHiddenOf(state.battlePresentationBoundaries);
  if (semiInvulnerableHidden !== LIVE_SEMI_INVULNERABLE_NONE) {
    resolution = Object.freeze({ ...resolution, liveSemiInvulnerableHidden: semiInvulnerableHidden });
  }
  // cf78: the slots' Castform forms at this resolution's start (presentation-only display ledger state).
  const castformForms = liveCastformFormsOf(state.battlePresentationBoundaries);
  if (castformForms !== LIVE_CASTFORM_FORMS_NORMAL) {
    resolution = Object.freeze({ ...resolution, liveCastformForms: castformForms });
  }
  const playerLocked = (state.battle.rules.rulesContext.battlers[presentation.request.battler]!.status2 & (
    BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
    | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
  )) !== 0;
  // A voluntary switch is only submitted from the party menu (its return
  // replaces the action prompt's bounce cycle).
  const liveMoveSpriteAllocatorHost = beginOrderTurn(
    state, resolution.resolutionId.requestId, !playerLocked,
    presentation.pendingDecision?.kind === "switch",
  );
  return Object.freeze({
    ...state,
    liveMoveSpriteAllocatorHost,
    battle: receipt.battle,
    partyOrder: applyPlayerSwitchEvents(state.partyOrder, receipt.events),
    battleCommandPresentation: null,
    battleResolutionPresentation: resolution,
    retainedLockedActionPresentationOwner: null,
    battlePartySelect: null,
    battleForcedPartySelect: null,
    // flow1: the turn's own switch-ins (a voluntary switch, Baton Pass, Roar) and Transform reset the move cursor too.
    moveSelectionCursors: resetMoveSelectionCursorsForSwitchIns(
      state.moveSelectionCursors,
      state.battle,
      receipt.battle,
      receipt.events,
    ),
    battlePresentationBoundaries: applyReceiptPpToBoundaries(
      state.battlePresentationBoundaries,
      receipt.events,
    ),
    aiHistory: receipt.history,
    facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
  });
}

function withResolutionLifecycle(
  state: BattleResolutionPresentationState,
  commandIndex: number,
  phase: BattleResolutionPresentationState["lifecycle"]["phase"],
  phaseElapsed: number,
): BattleResolutionPresentationState {
  return Object.freeze({
    ...state,
    commandIndex,
    lifecycle: Object.freeze({ phase, phaseElapsed }),
    // ISSUES #78 residual (1): the ball-fade clock advances exactly one tick
    // per resolution frame (the confirm-handoff phase bumps its own clock in
    // `advanceBattleResolutionConfirmHandoff`; every presenting frame lands
    // here). The `presenting-switch-in` forced path drives this clock from
    // the party-select send-out elapsed instead of 1:1 -- harmless, because
    // the fade projection is only ever active inside the voluntary-switch
    // recall/send-in windows, which never use that phase.
    fadeTick: state.fadeTick + 1,
  });
}

function completedResolutionPhase(
  resolution: BattleResolutionPresentationState,
): "next-command-handoff" | "terminal-handoff" {
  return resolution.pendingBoundary.kind === "terminal"
    ? "terminal-handoff"
    : "next-command-handoff";
}

/**
 * A resolution segment can run out of commands to present while a
 * `forcedRequest` is still pending, whether or not the fainted battler's
 * own typed faint message was the segment's last command -- ISSUES #89's
 * Baton Pass case has no fainted message at all (its "used move" line
 * auto-advances; there is nothing to dismiss), and ISSUES #93's
 * Cmd_moveend-item-effect case (e.g. Shell Bell) publishes real commands
 * *after* the fainted message inside the same segment (source: the
 * fainted message prints from `tryfaintmon`'s `BattleScript_FaintTarget`,
 * strictly before `goto BattleScript_MoveEnd` runs
 * `MOVEEND_KINGSROCK_SHELLBELL`; `HandleFaintedMonActions`'s own
 * `BattleScript_HandleFaintedMon` party-menu call is a separate later pass
 * that only starts once the whole move script -- including those
 * MOVEEND_* item effects -- has returned to the turn loop). So a fainted
 * message can never be trusted as an early handoff signal on its own;
 * only the segment's own true end may hand off to the party selector,
 * never the ordinary next-command tail.
 */
function completedResolutionUpdate(
  state: FactoryRoundBattleOrchestratorState,
  resolution: BattleResolutionPresentationState,
): Readonly<{
  phase: "next-command-handoff" | "terminal-handoff" | "forced-party-handoff";
  battleForcedPartySelect: PartySelectState | null;
}> {
  if (resolution.forcedRequest !== null) {
    return Object.freeze({
      phase: "forced-party-handoff" as const,
      battleForcedPartySelect: createForcedPartySelect(state, resolution),
    });
  }
  return Object.freeze({
    phase: completedResolutionPhase(resolution),
    battleForcedPartySelect: null,
  });
}

function commitCompletedResolutionCommand(
  boundaries: FactoryBattlePresentationBoundaries,
  resolution: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): FactoryBattlePresentationBoundaries {
  const displayed = commitCompletedResolutionCommandDisplay(boundaries, resolution, command);
  // contain213 (presentationContainment.ts "order"): a throw in the presentation-only extras below keeps their earlier values.
  try {
    return commitCompletedResolutionCommandExtras(displayed, resolution, command);
  } catch (error) {
    recordContainedPresentationError("order", command.type, error,
      `ledger extras: request ${resolution.resolutionId.requestId} segment ${resolution.segmentIndex}`);
    return displayed;
  }
}

function commitCompletedResolutionCommandExtras(
  displayed: FactoryBattlePresentationBoundaries,
  resolution: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): FactoryBattlePresentationBoundaries {
  // Presentation-only Substitute doll (applySubstituteDollCommand): the ledger field mirrors the resolution's display.
  const dollField = { player: displayed[0].field, opponent: displayed[1].field };
  const dollAfter = applySubstituteDollCommand(dollField, command);
  const committed = dollAfter === dollField ? displayed : Object.freeze([
    Object.freeze({ ...displayed[0], field: dollAfter.player }),
    Object.freeze({ ...displayed[1], field: dollAfter.opponent }),
  ]) as unknown as FactoryBattlePresentationBoundaries;
  const before = liveSemiInvulnerableHiddenOf(committed);
  const after = applyLiveSemiInvulnerableCommand(before, command);
  const hidden = after === before ? committed : Object.freeze(committed.map((boundary) => {
    const { liveSemiInvulnerableHidden: _previous, ...rest } = boundary;
    return Object.freeze(after[boundary.battler] ? { ...rest, liveSemiInvulnerableHidden: true } : rest);
  })) as unknown as FactoryBattlePresentationBoundaries;
  // cf78: the slots' Castform forms once this command has completed.
  const forms = liveCastformFormsThroughCommand(resolution, command);
  if (forms[0] === (hidden[0].liveCastformForm ?? 0) && forms[1] === (hidden[1].liveCastformForm ?? 0)) return hidden;
  return Object.freeze(hidden.map((boundary) => {
    const { liveCastformForm: _previous, ...rest } = boundary;
    return Object.freeze(forms[boundary.battler] !== 0 ? { ...rest, liveCastformForm: forms[boundary.battler] } : rest);
  })) as unknown as FactoryBattlePresentationBoundaries;
}

function liveCastformFormsOf(boundaries: FactoryBattlePresentationBoundaries): LiveCastformForms {
  return boundaries[0].liveCastformForm || boundaries[1].liveCastformForm
    ? Object.freeze([boundaries[0].liveCastformForm ?? 0, boundaries[1].liveCastformForm ?? 0] as const)
    : LIVE_CASTFORM_FORMS_NORMAL;
}

function liveSemiInvulnerableHiddenOf(
  boundaries: FactoryBattlePresentationBoundaries,
): LiveSemiInvulnerableHidden {
  return boundaries[0].liveSemiInvulnerableHidden || boundaries[1].liveSemiInvulnerableHidden
    ? Object.freeze([boundaries[0].liveSemiInvulnerableHidden ?? false,
      boundaries[1].liveSemiInvulnerableHidden ?? false] as const)
    : LIVE_SEMI_INVULNERABLE_NONE;
}

function commitCompletedResolutionCommandDisplay(
  boundaries: FactoryBattlePresentationBoundaries,
  resolution: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): FactoryBattlePresentationBoundaries {
  const committed = commitCompletedResolutionCommandDisplayFields(boundaries, resolution, command);
  // pic9: a completed switch-in (either side) stores both sides' HP as their hpOnSwitchout, as Cmd_switchineffects does.
  if (command.type !== "switch-in") return committed;
  return Object.freeze(committed.map((boundary) => Object.freeze({ ...boundary, hpOnSwitchout: boundary.displayedHp }))) as unknown as FactoryBattlePresentationBoundaries;
}

/** pic9: the foe side's hpOnSwitchout for the "Come back!" line (absent = its battle-start HP: full). */
function opponentHpOnSwitchout(boundaries: FactoryBattlePresentationBoundaries): number {
  return boundaries[1].hpOnSwitchout ?? boundaries[1].field.maxHP;
}

function commitCompletedResolutionCommandDisplayFields(
  boundaries: FactoryBattlePresentationBoundaries,
  resolution: BattleResolutionPresentationState,
  command: BattleResolutionPresentationCommand,
): FactoryBattlePresentationBoundaries {
  if (command.type === "turn-end") {
    const segment = resolution.segments[resolution.segmentIndex];
    if (segment === undefined) {
      return fail(`resolution display ledger has no segment ${resolution.segmentIndex}`);
    }
    return settleBattlePresentationBoundariesAtRulesBoundary(
      boundaries,
      segment.afterRules.rulesContext,
      "turn-end",
    );
  }
  return Object.freeze(boundaries.map((boundary) => {
    if (
      boundary.partyIndex !== boundary.field.partyIndex
      || boundary.displayedHp !== boundary.field.hp
      || battleCommandUiStatusFromStatus1(boundary.displayedStatus1)
        !== boundary.field.status
    ) {
      return fail(`resolution display ledger battler ${boundary.battler} is internally inconsistent`);
    }
    if (!("battler" in command) || command.battler !== boundary.battler) {
      return boundary;
    }
    if (command.type === "hp") {
      if (boundary.displayedHp !== command.from) {
        return fail(
          `battle resolution HP command starts at ${command.from}, displayed ${boundary.displayedHp}`,
        );
      }
      const field = Object.freeze({ ...boundary.field, hp: command.to });
      return Object.freeze({ ...boundary, field, displayedHp: command.to });
    }
    if (command.type === "status-icon") {
      const field = Object.freeze({
        ...boundary.field,
        status: battleCommandUiStatusFromStatus1(command.status1),
      });
      return Object.freeze({
        ...boundary,
        field,
        displayedStatus1: command.status1,
      });
    }
    if (command.type === "switch-in") {
      if (boundary.partyIndex !== command.fromPartyIndex) {
        return fail(
          `resolution switch-in battler ${boundary.battler} starts at party ${command.fromPartyIndex}, displayed ${boundary.partyIndex}`,
        );
      }
      return Object.freeze({
        ...boundary,
        partyIndex: command.toPartyIndex,
        field: command.incoming,
        displayedHp: command.incoming.hp,
        displayedStatus1: command.incomingStatus1,
        spriteVisible: true,
        idleEpoch: 0,
        moveCursor: 0,
      });
    }
    if (command.type === "faint") {
      return Object.freeze({ ...boundary, spriteVisible: false });
    }
    if (command.type === "sprite-visibility") {
      return Object.freeze({ ...boundary, spriteVisible: command.visible });
    }
    return boundary;
  })) as unknown as FactoryBattlePresentationBoundaries;
}

/**
 * Commits a source reducer/controller boundary to the durable display ledger.
 * Command transitions own intra-segment HP/status/switch animation; this
 * boundary transition owns the stable state after a completed turn or forced
 * send-out. Party identity may only change through an earlier typed switch
 * command, so a missing switch remains fatal rather than being papered over.
 */
function settleBattlePresentationBoundariesAtRulesBoundary(
  boundaries: FactoryBattlePresentationBoundaries,
  rules: BattleScriptRulesContext,
  source: "turn-end" | "forced-switch-in",
): FactoryBattlePresentationBoundaries {
  const settledField = createBattleCommandDisplayedField(rules);
  return Object.freeze(boundaries.map((boundary) => {
    if (
      boundary.partyIndex !== boundary.field.partyIndex
      || boundary.displayedHp !== boundary.field.hp
      || battleCommandUiStatusFromStatus1(boundary.displayedStatus1)
        !== boundary.field.status
    ) {
      return fail(`resolution display ledger battler ${boundary.battler} is internally inconsistent`);
    }
    const settled = boundary.battler === 0
      ? settledField.player
      : settledField.opponent;
    const active = rules.battlers[boundary.battler]!;
    if (settled.partyIndex !== boundary.partyIndex) {
      return fail(
        `resolution ${source} battler ${boundary.battler} changed party without a completed switch transition`,
      );
    }
    return Object.freeze({
      ...boundary,
      field: settled,
      displayedHp: settled.hp,
      // Toxic's source counter advances in status1 bits 8..11 without a new
      // healthbox receipt. Preserve the controller-committed raw display
      // value while its UI status is unchanged; a real icon transition (for
      // example healthy -> burn across the forced-send-out boundary) adopts
      // the new source value.
      displayedStatus1:
        battleCommandUiStatusFromStatus1(boundary.displayedStatus1)
          === battleCommandUiStatusFromStatus1(active.status1)
          ? boundary.displayedStatus1
          : active.status1,
    });
  })) as unknown as FactoryBattlePresentationBoundaries;
}

function forcedPartyForResolution(
  state: FactoryRoundBattleOrchestratorState,
  resolution: BattleResolutionPresentationState,
): BattleParty {
  const identities = state.round.rules.playerParty;
  const live = resolution.pendingBattle.rules.rulesContext.party.player;
  return Object.freeze(identities.map((identity, index) => Object.freeze({
    ...identity,
    hp: live[index]!.hp,
    maxHp: live[index]!.maxHP,
    status: mapStatus1ToBattleStatus(live[index]!.status1),
  }))) as BattleParty;
}

function createForcedPartySelect(
  state: FactoryRoundBattleOrchestratorState,
  resolution: BattleResolutionPresentationState,
): PartySelectState {
  const request = resolution.forcedRequest;
  const records = state.round.rules.playerRentalRecords;
  if (request === null || records === null) {
    return fail("forced-party handoff requires a genuine request and rental records");
  }
  const selector = createPartySelectStateFromForcedSwitch(
    request,
    records,
    forcedPartyForResolution(state, resolution),
    state.partyOrder,
    resolution.pendingBattle.rules.rulesContext.party.player,
  );
  const sinceDismiss = framesSinceFaintMessageDismiss(resolution);
  return sinceDismiss === 0 ? selector : Object.freeze({ ...selector, elapsed: sinceDismiss });
}

/**
 * pic8 (2026-11-20 playtest, docs/pic1-live-field-pictures.md): the forced selector's `elapsed` is "frames since the actual
 * faint-message dismiss edge" (partySelect.ts), but the live segment can still run bookkeeping commands after the player's faint
 * message (the faint script's sprite-visibility restores, one frame each) before it hands off, so the selector used to start two
 * frames late. ROM lab tools/battle-lab/pic7-player-faint-send-in-on.json: A on "RATTATA fainted!" at trace frame 560, the field
 * holds through capture 581 and its first fade step is capture 582, i.e. 21 held frames from the dismiss edge as
 * PARTY_ENTRY_FADE_OUT_START says (the live route faded at +23). Only a tail of such draw-nothing commands is counted; anything else
 * after the message keeps the old start.
 */
function framesSinceFaintMessageDismiss(resolution: BattleResolutionPresentationState): number {
  const commands = resolution.segments[resolution.segmentIndex]?.commands ?? [];
  let index = commands.length - 1;
  let frames = 0;
  for (; index >= 0; index -= 1) {
    const command = commands[index]!;
    if (command.type !== "sprite-visibility" || command.visible !== true || command.recall === true) break;
    frames += command.timing?.minimumFrames ?? 1;
  }
  const message = commands[index];
  if (message === undefined || message.type !== "message" || message.faintBattler !== 0) return 0;
  return frames;
}

function settledCommandForResolutionHandoff(
  battle: BattleState<FactoryFullTurnDecisionRules>,
  cursors: FactoryBattleMoveSelectionCursors,
  boundaries: FactoryBattlePresentationBoundaries,
  usedMessageHoldFrames: number,
): Readonly<{
  presentation: BattleCommandPresentationState;
  boundaries: FactoryBattlePresentationBoundaries;
}> {
  const entering = commandPresentationForBoundary(battle, cursors, usedMessageHoldFrames);
  if (entering === null) {
    return fail("Slice 3 resolution completed without a player command boundary");
  }
  const fields = [entering.field.player, entering.field.opponent] as const;
  for (const [battler, field] of fields.entries()) {
    const boundary = boundaries[battler]!;
    const active = battle.rules.rulesContext.battlers[battler]!;
    if (
      boundary.partyIndex !== field.partyIndex
      || boundary.displayedHp !== field.hp
      // `status1` is not itself a display identity: toxic's source-owned
      // turn counter lives in bits 8..11 of gBattleMons.status1, advances at
      // end turn on the battler only (battle_util.c:1542-1543; the party
      // record keeps the word written at infliction) and is absent
      // from the healthbox icon. Compare the controller-committed icon
      // semantics while retaining the fatal check for a genuinely stale icon.
      || battleCommandUiStatusFromStatus1(boundary.displayedStatus1)
        !== battleCommandUiStatusFromStatus1(active.status1)
    ) {
      return fail(
        `resolution handoff battler ${battler} display does not match the genuine next boundary`,
      );
    }
  }
  const presentation = Object.freeze({
    ...entering,
    spriteVisibility: Object.freeze({
      player: boundaries[0]!.spriteVisible && !boundaries[0]!.liveSemiInvulnerableHidden,
      opponent: boundaries[1]!.spriteVisible && !boundaries[1]!.liveSemiInvulnerableHidden,
    }),
    lifecycle: Object.freeze({ phase: "action-menu" as const, phaseElapsed: 0 }),
  });
  return Object.freeze({
    presentation,
    boundaries: createBattlePresentationBoundaries(
      presentation,
      battle,
      cursors,
      boundaries,
    ),
  });
}

function retainedLockedActionOwnerAtCommandBoundary(
  resolution: BattleResolutionPresentationState,
): FactoryRetainedLockedActionPresentationOwner | null {
  const pending = resolution.pendingBoundary;
  if (
    pending.kind !== "decision-required"
    || pending.request.kind !== "command"
  ) return null;
  const rules = resolution.pendingBattle.rules.rulesContext;
  for (const battler of [0, 1] as const) {
    if (battler === pending.request.battler) continue;
    const statusLock = rules.battlers[battler]!.status2 & (
      BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE
    );
    const currentMove = rules.lockedMoves[battler]!;
    const currentMovePosition = rules.chosenMovePositions[battler]!;
    if (statusLock === 0 || currentMove === 0) continue;
    if (
      !Number.isInteger(currentMovePosition)
      || currentMovePosition < 0
      || currentMovePosition > 3
    ) {
      return fail(`locked battler ${battler} has invalid move position ${currentMovePosition}`);
    }
    return Object.freeze({
      action: Object.freeze({
        battler,
        currentMove,
        currentMovePosition: currentMovePosition as 0 | 1 | 2 | 3,
      }),
      resolution,
    });
  }
  return null;
}

/**
 * sub157 (ISSUES #153): the Scene OFF resolution's x2 input -- both sides at {0,0} (LIVE_BATTLER_X2_SCENE_OFF_INPUT) while the
 * current command is a live move body (only Transform / Substitute carry a request in Scene OFF) or the Substitute fade; every
 * other command keeps none, as before.
 */
function withSceneOffBattlerX2Input(state: FactoryRoundBattleOrchestratorState): FactoryRoundBattleOrchestratorState {
  const resolution = state.battleResolutionPresentation;
  if (!resolution) return state;
  const command = resolution.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
  const input = (command?.type === "move-animation" && command.animation) || command?.type === "substitute-fade"
    ? LIVE_BATTLER_X2_SCENE_OFF_INPUT : undefined;
  if (resolution.liveMoveBattlerX2Input === input) return state;
  return Object.freeze({
    ...state,
    battleResolutionPresentation: Object.freeze({ ...resolution, liveMoveBattlerX2Input: input }),
  });
}

/**
 * Advances only the controller-owned Scene-OFF resolution clock. The pending
 * kernel boundary remains immutable, and the next command UI does not exist
 * until the six displayed blank handoff frames have completed.
 */
export function prepareResolutionPalette(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  if (state.config.battleScene !== "on") return withSceneOffBattlerX2Input(state);
  const resolution = state.battleResolutionPresentation;
  if (resolution?.lifecycle.phase === "presenting-switch-in") {
    const retained = state.liveMovePaletteHost;
    const retainedSprites = state.liveMoveSpriteAllocatorHost;
    // Forced party menu -> switch-in (sprite-order-uncovered-units.md §2):
    // the menu's ResetSpriteData and the battle reshow follow every earlier
    // segment's events; this segment's events then run through the selected
    // switch-in (switch-in start + particles). Applied once per segment.
    const orderHost = retainedSprites ? orderHostOf(retainedSprites) : undefined;
    const orderPending = orderHost !== undefined && !(
      orderHost.cursor?.requestId === resolution.resolutionId.requestId
      && orderHost.cursor.segmentIndex === resolution.segmentIndex
    );
    // The forced switch-in leaves the allocator occupancy role-isomorphic to
    // the known entry: its host is re-seeded once in entry labels and kept
    // for the rest of the switch-in (docs/playerfaint-lend-audit.md §4.3).
    const keepSprites = !orderPending && orderHost !== undefined
      && retainedSprites?.host.historyKnown === true
      && liveSpriteAllocatorReseedable(orderHost);
    if (
      !retained?.host.historyKnown
      && (!retainedSprites?.host.historyKnown || keepSprites)
      && !orderPending
    ) return state;
    const forcedOrderHost = (host: LiveSpriteOrderHost): LiveSpriteOrderHost => {
      const commands = resolution.segments[resolution.segmentIndex]!.commands;
      const selected = commands.find((command) =>
        command.type === "switch-in"
        && command.battler === state.battleForcedPartySelect?.request.battler
      );
      const settled = advanceLiveSpriteOrderHost(
        host, resolution, Number.NEGATIVE_INFINITY, true, liveSpriteOrderBodyPlanAt(resolution),
      );
      if (selected?.type !== "switch-in") {
        return invalidateLiveSpriteOrderHost(settled, "switch-in presentation without a typed switch-in");
      }
      const returned = returnLiveSpriteOrderHostFromPartyMenu(
        settled, liveSpriteOrderBattlersPresent(resolution, resolution.segmentIndex),
      );
      return advanceLiveSpriteOrderHost(
        returned, resolution,
        commands.indexOf(selected) === commands.length - 1
          ? Number.POSITIVE_INFINITY
          : selected.eventSequence,
        false, liveSpriteOrderBodyPlanAt(resolution),
      );
    };
    return Object.freeze({
      ...state,
      liveMovePaletteHost: retained ? Object.freeze({
        ...retained, host: invalidateLiveMovePaletteHost(retained.host),
      }) : undefined,
      liveMoveSpriteAllocatorHost: retainedSprites ? (() => {
        const nextOrderHost = orderPending ? forcedOrderHost(orderHost!) : orderHost!;
        return Object.freeze({
          ...withOrderHost(retainedSprites, nextOrderHost),
          host: keepSprites ? retainedSprites.host : reseedLiveSpriteAllocatorAfterSendOut(
            invalidateLiveSpriteAllocatorHost(retainedSprites.host), nextOrderHost,
          ),
        });
      })() : undefined,
      battleResolutionPresentation: Object.freeze({
        ...resolution, liveMovePaletteInput: undefined,
        liveMoveSpriteAllocatorInput: undefined,
        liveMoveSpriteOrderInput: undefined,
      }),
    });
  }
  if (resolution?.lifecycle.phase !== "presenting") return state;
  const segment = resolution.segments[resolution.segmentIndex];
  if (!segment) return state;
  const command = segment.commands[resolution.commandIndex];
  const commandKey = `${resolution.resolutionId.requestId}:${resolution.segmentIndex}:${
    command === undefined ? "end" : resolution.commandIndex
  }`;
  const retained = state.liveMovePaletteHost?.battleCallStart === state.activeBattleCallStart
    ? state.liveMovePaletteHost : undefined;
  let host = retained?.host ?? createLiveMovePaletteHost();
  const cursor = retained?.eventCursor;
  const nextEventIndex = cursor?.requestId === resolution.resolutionId.requestId
      && cursor.segmentIndex === resolution.segmentIndex
    ? cursor.nextEventIndex
    : 0;
  const commandSequence = command !== undefined && "eventSequence" in command
    ? command.eventSequence
    : Number.POSITIVE_INFINITY;
  let scannedEventIndex = nextEventIndex;
  // Status animations and general / hit / stat animations (ISSUES #156, aud56) not audited allocator net-zero (the palette host
  // still invalidates on every status animation). MOVE_ANIMATION events are the move-animation commands' own seam.
  let crossedAllocatorUnknown = false;
  const scanThrough = (throughSequence: number): boolean => {
    let crossedUnknownGraphics = false;
    while (
      scannedEventIndex < segment.events.length
      && segment.events[scannedEventIndex]!.sequence <= throughSequence
    ) {
      const payload = segment.events[scannedEventIndex]!.payload;
      if (payload.kind === "status-animation") {
        crossedUnknownGraphics = true;
        if (!LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS.has(
          spriteOrderStatusAnimationName(payload.isStatus2 !== 0, payload.status) ?? "",
        )) crossedAllocatorUnknown = true;
      } else if (payload.kind === "animation" && !liveSpriteAllocatorAnimationNetZero(payload)) {
        crossedAllocatorUnknown = true;
      }
      scannedEventIndex += 1;
    }
    return crossedUnknownGraphics;
  };
  const crossedUnknownGraphics = scanThrough(commandSequence);
  if (crossedUnknownGraphics) host = invalidateLiveMovePaletteHost(host);
  const isFinalCommand = command === undefined
    || resolution.commandIndex === segment.commands.length - 1;
  const hasTrailingUnknownGraphics = isFinalCommand
    ? scanThrough(Number.POSITIVE_INFINITY)
    : false;
  const eventCursor = Object.freeze({
    requestId: resolution.resolutionId.requestId,
    segmentIndex: resolution.segmentIndex,
    nextEventIndex: scannedEventIndex,
  });
  if (
    retained?.commandKey === commandKey
    && retained.eventCursor?.requestId === resolution.resolutionId.requestId
    && retained.eventCursor.segmentIndex === resolution.segmentIndex
    && retained.eventCursor.nextEventIndex === scannedEventIndex
    && host === retained.host
  ) return state;
  let input: LiveMovePaletteInput | undefined;
  let spriteInput: LiveMoveSpriteAllocatorInput | undefined;
  const retainedSprites = state.liveMoveSpriteAllocatorHost?.battleCallStart
      === state.activeBattleCallStart
    ? state.liveMoveSpriteAllocatorHost : undefined;
  let spriteHost = retainedSprites?.host;
  let orderHost = retainedSprites ? orderHostOf(retainedSprites) : undefined;
  let spriteOrderInput: LiveMoveSpriteOrderInput | undefined;
  // Event-driven order (liveSpriteOrderHost.ts): apply every semantic event
  // strictly before this command, lend the order to a move body at its
  // activation edge, then apply the command's own event (the body plan).
  const bodyPlanAt = liveSpriteOrderBodyPlanAt(resolution);
  // lsd198: a Scene ON LEECH_SEED_DRAIN plays Move_ABSORB's body; its lend is the order strictly before the drain's own animation receipt
  // (the command's event is the later healthbarupdate); the battler x2 history cuts at the same event (the drain's rows stand at the pose before it).
  const drainBody = command?.type === "general-animation" && command.animation === "LEECH_SEED_DRAIN" && command.animated === true;
  const drainAnimationSequence = drainBody
    ? [...segment.events].reverse().find((event) => event.sequence < commandSequence && event.payload.kind === "animation"
      && event.payload.animationId === "LEECH_SEED_DRAIN")?.sequence
    : undefined;
  if (orderHost) {
    orderHost = advanceLiveSpriteOrderHost(orderHost, resolution, drainAnimationSequence ?? commandSequence, true, bodyPlanAt);
  }
  // Battler x2 history (liveBattlerX2History.ts): the same event cursor discipline; a body reads the history at its
  // activation edge, then its own event (the body's end-state class) applies.
  const retainedX2 = state.liveBattlerX2Host?.battleCallStart === state.activeBattleCallStart
    ? state.liveBattlerX2Host : undefined;
  let x2Host = retainedX2 ? advanceLiveBattlerX2Host(retainedX2.host, resolution, drainAnimationSequence ?? commandSequence, true) : undefined;
  // rst139: the history before this command (every event strictly before it) for its ordinary rows.
  const ordinaryX2History = x2Host?.history;
  let battlerX2Input: LiveMoveBattlerX2Input | undefined;
  if (command?.type === "move-animation" && command.animation && x2Host) {
    battlerX2Input = retainedX2?.commandKey === commandKey
      ? resolution.liveMoveBattlerX2Input : liveMoveBattlerX2InputForBody(x2Host, command.animation);
  } else if (command?.type === "substitute-fade" && x2Host) {
    // S10A fade (liveSubstituteFade.ts): the other battler's tracked rest at the fade's start.
    battlerX2Input = retainedX2?.commandKey === commandKey
      ? resolution.liveMoveBattlerX2Input : liveMoveBattlerX2Input(x2Host.history);
  } else if ((command?.type === "stats-change" || command?.type === "status-animation" || command?.type === "general-animation")
    && x2Host) {
    // scd112 (S10A #166 slice d): the banner's OBJ-window copy stands at the battler's tracked rest. The x2 host exists only in
    // Scene ON, so the input is always present here (none zeroed = the species rest); Scene OFF gets none (no residual x2).
    // sar131 (#168 SA4): a status animation's battler stands at its tracked rest until its ShakeMon2 shows (and the other at its).
    battlerX2Input = retainedX2?.commandKey === commandKey
      ? resolution.liveMoveBattlerX2Input : liveMoveBattlerX2Input(x2Host.history) ?? STATS_CHANGE_X2_NONE_ZEROED;
  }
  if (x2Host) {
    x2Host = advanceLiveBattlerX2Host(x2Host, resolution, isFinalCommand ? Number.POSITIVE_INFINITY : commandSequence);
  }
  if (command?.type === "move-animation" && command.animation) {
    const prepared = prepareLiveMovePalette(host, command.animation);
    host = prepared.next;
    input = prepared.input;
    if (spriteHost && retainedSprites?.commandKey !== commandKey) {
      // Every move animation goes through the allocator seam: only audited
      // plans (Light Screen) keep history known, all others invalidate it.
      const spritePrepared = prepareLiveMoveSpriteAllocator(spriteHost, command.animation);
      spriteHost = spritePrepared.next;
      spriteInput = spritePrepared.input;
      if (orderHost) {
        spriteOrderInput = lendLiveSpriteOrder(orderHost, command.animation.moveId);
        // Multi-body Random2 move (Ice Ball): record the word-free deferred-lend marker (body key + its lend) for its later bodies.
        // words59: with the species displayed at the body (the field the live renderer draws it on; read by the dirt carry only).
        const bodyField = battleResolutionMoveAnimationField(segment, command.eventSequence);
        orderHost = markLiveSpriteOrderDeferredBody(orderHost, spriteOrderInput, command.animation,
          liveMovePresentationRngBodyKey(resolution),
          bodyField === null ? undefined : { player: bodyField.player.species, opponent: bodyField.opponent.species });
      }
    } else if (retainedSprites?.commandKey === commandKey) {
      spriteInput = resolution.liveMoveSpriteAllocatorInput;
      spriteOrderInput = resolution.liveMoveSpriteOrderInput;
    }
  } else if (drainBody && orderHost) {
    // lsd198: Move_ABSORB's body inside General_LeechSeedDrain reads the same lend as the ordinary ABSORB (liveMoveAnimation.ts case 71).
    spriteOrderInput = retainedSprites?.commandKey === commandKey
      ? resolution.liveMoveSpriteOrderInput : lendLiveSpriteOrder(orderHost, LEECH_SEED_DRAIN_ABSORB_MOVE_ID);
  } else if (command?.type === "general-animation" && command.animation === "TURN_TRAP" && command.trapMove !== undefined && orderHost) {
    // trp1: General_TurnTrap's move-body branches (Status_SandTomb reads it; battleResolutionPresentationRender.ts turnTrapBodyEffect)
    // take the lend before the command's own animation receipt, as the trapping move's body would (its plan applies after).
    spriteOrderInput = retainedSprites?.commandKey === commandKey
      ? resolution.liveMoveSpriteOrderInput : lendLiveSpriteOrder(orderHost, command.trapMove);
  } else if (command !== undefined && !(command.type === "move-animation" && command.actionTransition)
    && (command.type === "move-animation"
    || command.type === "switch-out" || command.type === "switch-in"
    || command.type === "party-summary" || command.type === "trainer-slide"
    || (command.type === "sprite-visibility" && command.recall))) {
    // Ball/summary callbacks need their own persistent palette providers.
    host = invalidateLiveMovePaletteHost(host);
    if (spriteHost) spriteHost = invalidateLiveSpriteAllocatorHost(spriteHost);
  }
  if (orderHost) {
    orderHost = advanceLiveSpriteOrderHost(
      orderHost, resolution, isFinalCommand ? Number.POSITIVE_INFINITY : commandSequence, false, bodyPlanAt,
    );
  }
  // A modelled opponent faint + next-mon summary + send-out leaves the
  // allocator occupancy role-isomorphic to the known entry: re-seed the
  // known-entry host in entry labels (docs/postko-consumer-audit.md §4.3).
  if (spriteHost && orderHost && command?.type === "switch-in") {
    spriteHost = reseedLiveSpriteAllocatorAfterSendOut(spriteHost, orderHost);
  }
  if (crossedAllocatorUnknown && spriteHost) {
    spriteHost = invalidateLiveSpriteAllocatorHost(spriteHost);
  }
  // The active command's palette input was captured above. Any unprojected
  // graphics events after the segment's final command affect only the
  // separately retained next host, never the current move body.
  if (hasTrailingUnknownGraphics) {
    host = invalidateLiveMovePaletteHost(host);
  }
  return Object.freeze({
    ...state,
    liveMovePaletteHost: Object.freeze({
      battleCallStart: state.activeBattleCallStart, commandKey, host, eventCursor,
    }),
    liveMoveSpriteAllocatorHost: spriteHost === undefined ? undefined : Object.freeze({
      battleCallStart: state.activeBattleCallStart, commandKey, host: spriteHost,
      order: orderHost
        ? liveSpriteOrderHostOrder(orderHost)
        : invalidateSpriteOrderState(knownEntrySpriteOrderState("ordinary-factory")),
      ...(orderHost ? { orderHost } : {}),
    }),
    battleResolutionPresentation: Object.freeze({
      ...resolution, liveMovePaletteInput: input,
      liveMoveSpriteAllocatorInput: spriteInput,
      liveMoveSpriteOrderInput: spriteOrderInput,
      liveMoveBattlerX2Input: battlerX2Input,
      liveOrdinaryBattlerX2History: ordinaryX2History,
    }),
    ...(x2Host === undefined ? {} : {
      liveBattlerX2Host: Object.freeze({ battleCallStart: state.activeBattleCallStart, commandKey, host: x2Host }),
    }),
  });
}

/** rst139 (docs/rst139-ordinary-row-rest.md): this battle's tracked x2 history (Scene ON only), else undefined. */
function currentLiveBattlerX2History(state: FactoryRoundBattleOrchestratorState): LiveBattlerX2History | undefined {
  const x2 = state.liveBattlerX2Host;
  return x2 !== undefined && x2.battleCallStart === state.activeBattleCallStart ? x2.host.history : undefined;
}

/**
 * rst139: the resolution as drawn. A presented command's rows read the history before that command (prepareResolutionPalette); the
 * handoff / dismiss rows (and the confirm-handoff row the command step returns before any palette pass) read the battle's current one.
 */
export function factoryRoundBattleResolutionForRender(
  state: FactoryRoundBattleOrchestratorState,
): BattleResolutionPresentationState | null {
  const resolution = state.battleResolutionPresentation;
  const history = currentLiveBattlerX2History(state);
  if (!resolution || history === undefined
    || (resolution.lifecycle.phase === "presenting" && resolution.liveOrdinaryBattlerX2History !== undefined)) return resolution ?? null;
  return Object.freeze({ ...resolution, liveOrdinaryBattlerX2History: history });
}

/** rst139: the command UI's opponent stands at its species front idle rest (tracked `idle`, Scene ON). */
export function factoryRoundBattleOpponentIdleRest(state: FactoryRoundBattleOrchestratorState): boolean {
  return currentLiveBattlerX2History(state)?.opponent === "idle";
}

export function advanceFactoryRoundBattleResolution(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryRoundBattleOrchestratorState {
  return containedPrepareResolutionPalette(
    advanceFactoryRoundBattleResolutionCore(containedPrepareResolutionPalette(state), newKeys),
  );
}

/**
 * contain213 (presentationContainment.ts "order"): a throw updating the presentation hosts for the current command leaves this
 * battle's palette, allocator, sprite-order and battler-x2 histories unknown (the state later adapters decline / classify on) and
 * drops the command's inputs; the next frame runs the update again from the unknown hosts.
 */
function containedPrepareResolutionPalette(
  state: FactoryRoundBattleOrchestratorState,
): FactoryRoundBattleOrchestratorState {
  try {
    return prepareResolutionPalette(state);
  } catch (error) {
    const resolution = state.battleResolutionPresentation;
    const command = resolution?.segments[resolution.segmentIndex]?.commands[resolution.commandIndex];
    recordContainedPresentationError("order", command?.type ?? "handoff", error, resolution
      ? `request ${resolution.resolutionId.requestId} segment ${resolution.segmentIndex} command ${resolution.commandIndex}`
        + ` ${resolution.lifecycle.phase} @${resolution.lifecycle.phaseElapsed}`
      : null);
    const reason = "contained presentation host update";
    const palette = state.liveMovePaletteHost?.battleCallStart === state.activeBattleCallStart
      ? state.liveMovePaletteHost : undefined;
    const sprites = state.liveMoveSpriteAllocatorHost?.battleCallStart === state.activeBattleCallStart
      ? state.liveMoveSpriteAllocatorHost : undefined;
    return Object.freeze({
      ...state,
      ...(palette ? { liveMovePaletteHost: Object.freeze({ ...palette, host: invalidateLiveMovePaletteHost(palette.host) }) } : {}),
      ...(sprites ? {
        liveMoveSpriteAllocatorHost: Object.freeze({
          ...withOrderHost(sprites, invalidateLiveSpriteOrderHost(orderHostOf(sprites), reason)),
          host: invalidateLiveSpriteAllocatorHost(sprites.host),
        }),
      } : {}),
      liveBattlerX2Host: invalidateX2Host(state, reason),
      battleResolutionPresentation: resolution ? Object.freeze({
        ...resolution,
        liveMovePaletteInput: undefined,
        liveMoveSpriteAllocatorInput: undefined,
        liveMoveSpriteOrderInput: undefined,
        liveMoveBattlerX2Input: undefined,
      }) : resolution,
    });
  }
}

function advanceFactoryRoundBattleResolutionCore(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton> = new Set(),
): FactoryRoundBattleOrchestratorState {
  const resolution = state.battleResolutionPresentation;
  const boundaries = state.battlePresentationBoundaries;
  if (resolution === null || boundaries === null) {
    return fail("battle-resolution advance requires an active display boundary");
  }
  if (resolution.lifecycle.phase === "confirm-handoff") {
    return Object.freeze({
      ...state,
      battleResolutionPresentation:
        advanceBattleResolutionConfirmHandoff(resolution),
    });
  }
  if (resolution.lifecycle.phase === "presenting") {
    const segment = resolution.segments[resolution.segmentIndex];
    if (!segment) return fail(`resolution has no segment ${resolution.segmentIndex}`);
    const command = segment.commands[resolution.commandIndex];
    if (command === undefined) {
      const completion = completedResolutionUpdate(state, resolution);
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          completion.phase,
          0,
        ),
        battleForcedPartySelect: completion.battleForcedPartySelect,
      });
    }
    if (
      command.type === "message"
      && command.advance === "button"
      && isBattleResolutionButtonMessageAcceptable(resolution)
    ) {
      if (newKeys.has("A") || newKeys.has("B")) {
        const nextCommandIndex = resolution.commandIndex + 1;
        const reachedSegmentEnd = nextCommandIndex >= segment.commands.length;
        const completion = reachedSegmentEnd
          ? completedResolutionUpdate(state, resolution)
          : null;
        const nextResolution = withResolutionLifecycle(
          resolution,
          nextCommandIndex,
          completion?.phase ?? "presenting",
          0,
        );
        return Object.freeze({
          ...state,
          battleResolutionPresentation: nextResolution,
          battlePresentationBoundaries: commitCompletedResolutionCommand(
            boundaries,
            nextResolution,
            command,
          ),
          ...(completion !== null ? { battleForcedPartySelect: completion.battleForcedPartySelect } : {}),
        });
      }
      if (isBattleResolutionButtonMessageReady(resolution)) {
        return Object.freeze({
          ...state,
          battleResolutionPresentation: withResolutionLifecycle(
            resolution,
            resolution.commandIndex,
            "awaiting-message-dismiss",
            resolution.lifecycle.phaseElapsed,
          ),
        });
      }
    }
    if (!isBattleResolutionCommandComplete(resolution)) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          "presenting",
          resolution.lifecycle.phaseElapsed + 1,
        ),
      });
    }
    const nextCommandIndex = resolution.commandIndex + 1;
    const reachedSegmentEnd = nextCommandIndex >= segment.commands.length;
    const completion = reachedSegmentEnd ? completedResolutionUpdate(state, resolution) : null;
    const nextResolution = withResolutionLifecycle(
      resolution,
      nextCommandIndex,
      completion?.phase ?? "presenting",
      0,
    );
    return Object.freeze({
      ...state,
      battleResolutionPresentation: nextResolution,
      battlePresentationBoundaries: commitCompletedResolutionCommand(
        boundaries,
        nextResolution,
        command,
      ),
      ...(completion !== null ? { battleForcedPartySelect: completion.battleForcedPartySelect } : {}),
    });
  }
  if (resolution.lifecycle.phase === "awaiting-message-dismiss") {
    if (!newKeys.has("A") && !newKeys.has("B")) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: withResolutionLifecycle(
          resolution,
          resolution.commandIndex,
          "awaiting-message-dismiss",
          resolution.lifecycle.phaseElapsed + 1,
        ),
      });
    }
    const segment = resolution.segments[resolution.segmentIndex]!;
    const command = segment.commands[resolution.commandIndex]!;
    const nextCommandIndex = resolution.commandIndex + 1;
    const reachedSegmentEnd = nextCommandIndex >= segment.commands.length;
    const completion = reachedSegmentEnd
      ? completedResolutionUpdate(state, resolution)
      : null;
    const released = withResolutionLifecycle(
      resolution,
      nextCommandIndex,
      completion?.phase ?? "presenting",
      0,
    );
    const nextResolution = command.type === "message" && !command.noCursor
      ? Object.freeze({
        ...released,
        releasedWaitCursor: Object.freeze({
          segmentIndex: resolution.segmentIndex,
          commandIndex: resolution.commandIndex,
          age: resolution.lifecycle.phaseElapsed - messageCommandTypedRows(command) - 1,
        }),
      })
      : released;
    return Object.freeze({
      ...state,
      battleResolutionPresentation: nextResolution,
      battlePresentationBoundaries: commitCompletedResolutionCommand(
        boundaries,
        nextResolution,
        command,
      ),
      ...(completion !== null ? { battleForcedPartySelect: completion.battleForcedPartySelect } : {}),
    });
  }
  if (resolution.lifecycle.phase === "forced-party-handoff") {
    const selector = state.battleForcedPartySelect;
    if (selector === null) {
      return fail("forced-party handoff has no request-owned selector");
    }
    // Advance the selector FIRST, then submit within the SAME tick the SEND
    // OUT confirm registers: every rendered state must keep the selector's
    // confirmation clock and the published switch-in lifecycle in lockstep.
    // The former submit-one-tick-later shape left a state with
    // `sendOutElapsed` set but no appended continuation, which
    // `renderBattleResolutionForcedPartySelect`'s typed guard
    // (battleScene.ts) correctly refuses to draw -- and the browser renders
    // every tick, so every live forced-switch confirm crashed on that frame
    // (soak signature 5, docs/soak-crash-catalog.md §5).
    const advanced = selector.sendOutElapsed === null
      ? advancePartySelect(selector, newKeys)
      : selector;
    if (advanced.sendOutElapsed === null) {
      return Object.freeze({
        ...state,
        battleForcedPartySelect: advanced,
      });
    }
    const history = state.aiHistory;
    if (history === null) {
      return fail("forced-party continuation requires live AI history");
    }
    const submitted = submitPartySelectBattleDecision(
      resolution.pendingBattle,
      advanced,
      reduceFactoryFullTurnDecision,
    );
    if (submitted === null) {
      return fail("confirmed forced-party selector did not submit a decision");
    }
    const receipt = driveTrainerBoundary(state, submitted, history);
    const appended = appendBattleResolutionContinuation({
      resolution,
      transition: transitionFromDriveReceipt(receipt),
      // contain213: a presentation throw reading the boundary field degrades it (presentationContainment.ts "field").
      fieldBoundary: containedBattleResolutionDisplayedField(resolution, "forced continuation boundary"),
    });
    return Object.freeze({
      ...state,
      battle: receipt.battle,
      partyOrder: applyPlayerSwitchEvents(state.partyOrder, receipt.events),
      battleResolutionPresentation: appended,
      battleForcedPartySelect: advanced,
      moveSelectionCursors: resetMoveSelectionCursorsForSwitchIns(
        state.moveSelectionCursors,
        resolution.pendingBattle,
        receipt.battle,
        receipt.events,
      ),
      aiHistory: receipt.history,
      facilityRngCalls:
        state.activeBattleCallStart! + receipt.battle.rng.calls,
    });
  }
  if (resolution.lifecycle.phase === "presenting-switch-in") {
    const selector = state.battleForcedPartySelect;
    if (selector?.sendOutElapsed === null || selector === null) {
      return fail("switch-in presentation requires a confirmed forced selector");
    }
    const advancedSelector = advancePartySelect(selector, new Set());
    const elapsed = advancedSelector.sendOutElapsed;
    if (elapsed === null) {
      return fail("switch-in presentation lost its confirmation clock");
    }
    const advancedResolution = withResolutionLifecycle(
      resolution,
      resolution.commandIndex,
      "presenting-switch-in",
      elapsed,
    );
    if (!partySendOutBattleMenuReady(
      elapsed,
      playerFaintReplacementSendOutTimingOfSegment(resolution.segments[resolution.segmentIndex]!) ?? undefined,
    )) {
      return Object.freeze({
        ...state,
        battleResolutionPresentation: advancedResolution,
        battleForcedPartySelect: advancedSelector,
      });
    }
    const switchCommands = resolution.segments[resolution.segmentIndex]!.commands
      .filter((command): command is Extract<BattleResolutionPresentationCommand, { type: "switch-in" }> =>
        command.type === "switch-in"
      );
    const selectedSwitch = switchCommands.find((command) =>
      command.battler === selector.request.battler
    );
    if (selectedSwitch === undefined) {
      return fail("switch-in lifecycle has no typed switch command");
    }
    // The forced-party selector's own renderer owns exactly the prefix through
    // the SELECTED battler's typed switch-in -- the party screen, the "Go!"
    // text, and the send-out animation. Everything after that command is
    // ordinary presentation again, so the resume point is the selected
    // switch-in's own index, never the segment's last one: one player
    // confirmation can resume a fainted-actions scan that goes on to run
    // residual end-turn damage, faint the OPPOSING active, and complete an
    // automatic opposing replacement, all in this same immutable receipt
    // (ISSUES #112, soak seed 108 b1 t8: sandstorm damage on the incoming mon
    // and the opponent's poison faint both sit BETWEEN the two switch-ins).
    // Skipping to past the last switch-in silently dropped those commands
    // from the display ledger and left the healthbox stale at the handoff.
    // Every party identity change still crosses its own typed switch-in
    // command before the stable rules boundary settles: an earlier opposing
    // switch-in is inside this prefix, and a later one is committed by the
    // ordinary lifecycle below.
    const selectedSwitchCommandIndex = resolution.segments[resolution.segmentIndex]!.commands
      .indexOf(selectedSwitch);
    const committedBoundaries = switchCommands
      .filter((command) =>
        resolution.segments[resolution.segmentIndex]!.commands.indexOf(command)
          <= selectedSwitchCommandIndex
      )
      .reduce(
        (next, command) => commitCompletedResolutionCommand(next, resolution, command),
        boundaries,
      );
    const nextCommandIndex = selectedSwitchCommandIndex + 1;
    if (nextCommandIndex < resolution.segments[resolution.segmentIndex]!.commands.length) {
      // The resumed fainted-actions scan can keep running after the selected
      // replacement enters. Weather damage is one source-generic example:
      // the incoming battler may faint and publish terminal commands in this
      // same immutable reducer receipt. Return every command the selector's
      // renderer did not consume to the ordinary presentation lifecycle.
      const resumedResolution = Object.freeze({
        ...advancedResolution,
        commandIndex: nextCommandIndex,
        lifecycle: Object.freeze({ phase: "presenting" as const, phaseElapsed: 0 }),
      });
      return Object.freeze({
        ...state,
        battle: resolution.pendingBattle,
        battleResolutionPresentation: resumedResolution,
        battleForcedPartySelect: null,
        battlePresentationBoundaries: committedBoundaries,
      });
    }
    const settledBoundaries = settleBattlePresentationBoundariesAtRulesBoundary(
      committedBoundaries,
      resolution.pendingBattle.rules.rulesContext,
      "forced-switch-in",
    );
    const handoff = settledCommandForResolutionHandoff(
      resolution.pendingBattle,
      state.moveSelectionCursors,
      settledBoundaries,
      state.usedMessageHoldFrames,
    );
    return Object.freeze({
      ...state,
      battle: resolution.pendingBattle,
      battleCommandPresentation: handoff.presentation,
      battleResolutionPresentation: null,
      battleForcedPartySelect: null,
      battlePresentationBoundaries: handoff.boundaries,
    });
  }
  if (resolution.lifecycle.phase === "terminal-handoff") {
    if (resolution.pendingBoundary.kind !== "terminal") {
      return fail("terminal presentation handoff requires an immutable terminal boundary");
    }
    if (
      resolution.pendingBattle !== state.battle
      || resolution.pendingBattle.boundary !== resolution.pendingBoundary
    ) {
      return fail("terminal presentation handoff lost its retained battle boundary");
    }
    if (state.aiHistory === null) {
      return fail("terminal presentation handoff requires live AI history");
    }
    return finishBattle(
      state,
      resolution.pendingBattle,
      state.aiHistory,
    );
  }
  if (resolution.lifecycle.phase !== "next-command-handoff") {
    return fail(`cannot advance resolution phase ${resolution.lifecycle.phase}`);
  }
  const advanced = withResolutionLifecycle(
    resolution,
    resolution.commandIndex,
    "next-command-handoff",
    resolution.lifecycle.phaseElapsed + 1,
  );
  // ISSUES #78 tail: the post-voluntary-switch seam's whole fight-menu
  // sequence runs exactly one frame late (oracle 1405→1406, app 1406→1407).
  // Shorten ONLY this seam's pre-reveal handoff by one frame; the shared
  // BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES clock and every other seam
  // stay untouched (the menu seam's blank box is the resolution render's
  // own `bottom === "blank"`, which is not lengthened by this).
  const lockedContinuation = resolution.pendingBoundary.kind === "decision-required"
    && resolution.pendingBoundary.request.kind === "command"
    && resolution.pendingBoundary.request.side === "trainer";
  const handoffFrames = lockedContinuation
    ? BATTLE_RESOLUTION_LOCKED_CONTINUATION_HANDOFF_FRAMES
    : resolution.sourceDecision.kind === "switch"
      ? BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES - 1
      : BATTLE_RESOLUTION_NEXT_COMMAND_HANDOFF_FRAMES;
  if (advanced.lifecycle.phaseElapsed < handoffFrames) {
    return Object.freeze({
      ...state,
      battleResolutionPresentation: advanced,
    });
  }
  if (
    resolution.pendingBoundary.kind === "decision-required"
    && resolution.pendingBoundary.request.kind === "command"
    && resolution.pendingBoundary.request.side === "trainer"
  ) {
    if (state.battle !== resolution.pendingBattle) {
      return fail("automatic action continuation lost its retained battle boundary");
    }
    if (state.aiHistory === null) {
      return fail("automatic action continuation requires live AI history");
    }
    const receipt = driveTrainerBoundary(
      state,
      transitionAtPublishedTrainerBoundary(resolution.pendingBattle),
      state.aiHistory,
      { stopAtFollowupTrainerBoundary: true },
    );
    const appended = appendBattleResolutionActionContinuation({
      resolution: advanced,
      transition: transitionFromDriveReceipt(receipt),
      fieldBoundary: containedBattleResolutionDisplayedField(advanced, "action continuation boundary"),
    });
    return Object.freeze({
      ...state,
      battle: receipt.battle,
      partyOrder: applyPlayerSwitchEvents(state.partyOrder, receipt.events),
      battleResolutionPresentation: appended,
      battlePresentationBoundaries: applyReceiptPpToBoundaries(
        boundaries,
        receipt.events,
      ),
      moveSelectionCursors: resetMoveSelectionCursorsForSwitchIns(
        state.moveSelectionCursors,
        resolution.pendingBattle,
        receipt.battle,
        receipt.events,
      ),
      aiHistory: receipt.history,
      facilityRngCalls: state.activeBattleCallStart! + receipt.battle.rng.calls,
    });
  }
  const handoff = settledCommandForResolutionHandoff(
    resolution.pendingBattle,
    state.moveSelectionCursors,
    boundaries,
    state.usedMessageHoldFrames,
  );
  return Object.freeze({
    ...state,
    battle: resolution.pendingBattle,
    battleCommandPresentation: handoff.presentation,
    battleResolutionPresentation: null,
    retainedLockedActionPresentationOwner:
      retainedLockedActionOwnerAtCommandBoundary(advanced),
    battlePresentationBoundaries: handoff.boundaries,
  });
}

/**
 * Advances the live request-owned player command UI. A completed move choice
 * crosses the same submitBattleDecision bridge as every other battle client;
 * the resulting trainer boundaries remain automatically driven.
 */
export function advanceFactoryRoundBattleCommand(
  state: FactoryRoundBattleOrchestratorState,
  newKeys: ReadonlySet<GbaButton>,
): FactoryRoundBattleOrchestratorState {
  const battle = state.battle;
  const presentation = state.battleCommandPresentation;
  const history = state.aiHistory;
  if (battle === null || presentation === null || history === null) {
    return fail("battle-command input requires a published player command presentation");
  }
  if (state.battlePartySelect !== null) {
    const selector = advanceBattlePartySelect(state.battlePartySelect, newKeys);
    if (selector.outcome === null) {
      return Object.freeze({ ...state, battlePartySelect: selector });
    }
    if (selector.outcome.kind === "cancel") {
      // pic6: the menu fades out, the field fades back in and holds before the action menu returns (ROM-measured,
      // PARTY_SELECT_CANCEL_CLOSE_TOTAL_FRAMES); it used to cut straight back to the action menu on the B edge.
      if (selector.closeElapsed !== null && selector.closeElapsed < PARTY_SELECT_CANCEL_CLOSE_TOTAL_FRAMES) {
        return Object.freeze({ ...state, battlePartySelect: selector });
      }
      const retained = state.liveMovePaletteHost;
      let liveMovePaletteHost = retained;
      if (retained?.pendingPartyCancelEntryHost !== undefined) {
        const { pendingPartyCancelEntryHost, ...withoutPending } = retained;
        liveMovePaletteHost = Object.freeze({
          ...withoutPending,
          host: returnLiveMovePaletteHostAfterOrdinaryPartyCancel(pendingPartyCancelEntryHost),
        });
      }
      return Object.freeze({
        ...state,
        battleCommandPresentation: cancelBattleCommandPartySelection(presentation),
        battlePartySelect: null,
        liveMovePaletteHost,
        liveMoveSpriteAllocatorHost: returnOrderHostFromPartyMenu(state),
      });
    }
    // ISSUES #78 close cadence: after the SEND OUT confirm (fixture 963) the
    // real party menu stays on screen through its fade-out (1019-1034) before
    // the field idles 1035-1043 and the recall printstring lands at 1044
    // (docs/mid-battle-switch-presentation-ground-truth.md §2). Hold the
    // settled selector through the menu-hold/menu-fade span, then clear it and
    // route the voluntary switch through the resolution presentation, whose
    // null-handoff confirm phase owns the field-hold frames before the recall
    // message. The party-menu fade pixels themselves are ISSUES #80 scope, so
    // the settled frame is held and cut; the frame budget is the acceptance.
    if (
      selector.closeElapsed !== null
      && battlePartySelectClosePhase(selector.closeElapsed) !== "field-hold"
      && battlePartySelectClosePhase(selector.closeElapsed) !== "done"
    ) {
      return Object.freeze({ ...state, battlePartySelect: selector });
    }
    const returned = returnBattleCommandPartySelection(
      presentation,
      selector.outcome.partyIndex,
    );
    const transition = submitBattleCommandPresentationDecision(
      battle,
      returned,
      reduceFactoryFullTurnDecision,
    );
    if (transition === null) {
      return fail("legal voluntary party selection did not submit");
    }
    const retained = state.liveMovePaletteHost;
    const liveMovePaletteHost = retained?.pendingPartyCancelEntryHost === undefined
      ? retained
      : (() => {
          const { pendingPartyCancelEntryHost: _discarded, ...withoutPending } = retained;
          return Object.freeze(withoutPending);
        })();
    const cleared = Object.freeze({
      ...state, battlePartySelect: null, liveMovePaletteHost,
    });
    return beginCommandResolution(cleared, returned, transition, history);
  }
  const advanced = advanceBattleCommandPresentation(presentation, newKeys);
  if (battleForfeitMessageDone(advanced)) {
    return finishBattle(state, forfeitTerminalBattle(battle), history);
  }
  const moveSelectionCursors = Object.freeze(
    state.moveSelectionCursors.map((cursor, battler) =>
      battler === advanced.request.battler ? advanced.fightCursor : cursor),
  ) as FactoryBattleMoveSelectionCursors;
  const battlePresentationBoundaries = state.battlePresentationBoundaries === null
    ? null
    : Object.freeze(state.battlePresentationBoundaries.map((boundary) =>
      boundary.battler === advanced.request.battler
        ? Object.freeze({
            ...boundary,
            idleEpoch: boundary.idleEpoch + 1,
            moveCursor: advanced.fightCursor,
          })
        : boundary
    )) as unknown as FactoryBattlePresentationBoundaries;
  const transition = submitBattleCommandPresentationDecision(
    battle,
    advanced,
    reduceFactoryFullTurnDecision,
  );
  if (transition === null) {
    if (
      advanced.lifecycle.phase === "party-handoff"
      && presentation.lifecycle.phase !== "party-handoff"
    ) {
      // Party-menu startup frees/reloads OBJ palettes even if the player
      // cancels. Its return-to-battle allocation differs from battle startup,
      // so invalidate before the first move as well as after retained moves.
      const retained = state.liveMovePaletteHost?.battleCallStart === state.activeBattleCallStart
        ? state.liveMovePaletteHost : undefined;
      const entryHost = retained?.host ?? createLiveMovePaletteHost();
      const retainedSprites = state.liveMoveSpriteAllocatorHost?.battleCallStart
          === state.activeBattleCallStart
        ? state.liveMoveSpriteAllocatorHost : undefined;
      return Object.freeze({
        ...state,
        liveMovePaletteHost: state.config.battleScene === "on"
          ? Object.freeze({
              ...retained,
              battleCallStart: state.activeBattleCallStart,
              commandKey: retained?.commandKey ?? "",
              host: invalidateLiveMovePaletteHost(entryHost),
              ...(entryHost.historyKnown
                ? { pendingPartyCancelEntryHost: entryHost }
                : {}),
            })
          : state.liveMovePaletteHost,
        liveMoveSpriteAllocatorHost: state.config.battleScene === "on" && retainedSprites
          ? Object.freeze({
              // ResetSpriteData: the tracked order restarts from identity.
              ...withOrderHost(retainedSprites, openLiveSpriteOrderHostPartyMenu(
                orderHostOf(retainedSprites),
              )),
              host: invalidateLiveSpriteAllocatorHost(retainedSprites.host),
            })
          : state.liveMoveSpriteAllocatorHost,
        // The menu's exit reshow recreates the battler sprites (x2 after it unmeasured): unknown history.
        liveBattlerX2Host: invalidateX2Host(state, "party menu"),
        battleCommandPresentation: advanced,
        battlePartySelect: createBattlePartySelectState(
          advanced.request,
          battle.rules.rulesContext,
          state.partyOrder,
          state.round.rules.playerRentalRecords,
        ),
        moveSelectionCursors,
        battlePresentationBoundaries,
      });
    }
    return Object.freeze({
      ...state,
      battleCommandPresentation: advanced,
      moveSelectionCursors,
      battlePresentationBoundaries,
    });
  }
  const submitting = Object.freeze({
    ...state,
    moveSelectionCursors,
    battlePresentationBoundaries,
  });
  return advanced.pendingDecision?.kind === "use-move"
    ? beginCommandResolution(submitting, advanced, transition, history)
    : installDriveReceiptImmediately(
        submitting,
        driveTrainerBoundary(submitting, transition, history),
      );
}

export function submitFactoryRoundPlayerDecision(
  state: FactoryRoundBattleOrchestratorState,
  decision: BattleSubmittedDecision,
): FactoryRoundBattleOrchestratorState {
  const battle = state.battle;
  const history = state.aiHistory;
  if (
    battle === null
    || history === null
    || battle.boundary.kind !== "decision-required"
    || battle.boundary.request.side !== "player"
  ) {
    return fail("player decisions require a published player battle boundary");
  }
  const transition = submitBattleDecision(
    battle,
    {
      requestId: battle.boundary.request.requestId,
      side: "player",
      decision,
    },
    reduceFactoryFullTurnDecision,
  );
  return installDriveReceiptImmediately(
    state,
    driveTrainerBoundary(state, transition, history),
  );
}
