import speciesNamesData from "../data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import type { GbaButton } from "../input.ts";
import {
  createBattleCommandRequest,
  submitBattleDecision,
  type BattleCommandDecision,
  type BattleDecisionReducer,
  type BattleDecisionTransitionResult,
  type BattleJsonObject,
  type BattleCommandRequest,
  type BattleDecisionSide,
  type BattleMoveDecision,
  type BattlePartyIndex,
  type BattleSinglesBattler,
  type BattleState,
} from "./battleDecisionBoundary.ts";
import {
  describeIllegalMoveSelection,
  type BattleScriptSelectionRejection,
} from "./battleScriptActionAdmission.ts";
import {
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
  FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT,
  moveFightCursor,
} from "./battleMenu.ts";
import type {
  BattleScriptPartyMemberState,
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS1_BURN,
  BATTLE_SCRIPT_STATUS1_FREEZE,
  BATTLE_SCRIPT_STATUS1_PARALYSIS,
  BATTLE_SCRIPT_STATUS1_POISON,
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS1_TOXIC_POISON,
} from "./battleScriptSourceConstants.ts";
import type { HealthboxContentParams } from "./healthboxAssembly.ts";
import { getMonGender, type MonGender } from "./monGender.ts";

type SpeciesNameRow = Readonly<{ species: string; name: string }>;
type SpeciesStatsRow = Readonly<{ id: number; name: string; genderRatio: number }>;

const SPECIES_NAMES = (speciesNamesData as { species: SpeciesNameRow[] }).species;
const SPECIES_STATS_BY_ID = new Map(
  (speciesStatsData as { species: SpeciesStatsRow[] }).species.map((row) => [row.id, row]),
);

export function battleCommandSpeciesDisplayName(species: number): string {
  const entry = SPECIES_NAMES[species];
  if (entry === undefined) {
    throw new BattleCommandPresentationError(`unresolved species ${species}`);
  }
  return entry.name;
}

export const BATTLE_COMMAND_ACTION_LABELS = Object.freeze([
  "FIGHT",
  "BAG",
  "POKéMON",
  "RUN",
] as const);

export type BattleCommandUiStatus = HealthboxContentParams["status"];
export type BattleCommandMoveIds = readonly [number, number, number, number];
export type BattleCommandMovePp = readonly [number, number, number, number];

export type BattleCommandFieldBattler = Readonly<{
  side: BattleDecisionSide;
  battler: BattleSinglesBattler;
  partyIndex: BattlePartyIndex;
  species: number;
  name: string;
  level: number;
  gender: MonGender;
  hp: number;
  maxHP: number;
  status: BattleCommandUiStatus;
  moveIds: BattleCommandMoveIds;
  currentPP: BattleCommandMovePp;
  ppBonuses: number;
}>;

export type BattleCommandPresentationPhase =
  | "action-enter"
  | "action-menu"
  | "fight-opening"
  | "fight-menu"
  | "fight-closing"
  | "party-handoff"
  | "rejection-message"
  | "rejection-reopen"
  | "submitting";

/**
 * Route-scoped idle-bounce freeze schedule (ISSUES #81 remainder 4a,
 * `docs/fight-menu-freeze-schedule-probe.md`). The oracle's fight-menu
 * bounce (`SpriteCB_BounceEffect`) freezes for a route-dependent number of
 * frames at each phase transition; the app's single battle-1-calibrated
 * model (docs/fight-menu-chrome-ground-truth.md §8) reproduces battle-1's
 * own 0/2/1+1 schedule, and the torment fixture's 4/1/1 is a per-route
 * overlay, NOT a change to any shared constant. Each entry is a phase-keyed
 * offset (in bounce frames) added to the entry-relative `idleBounceElapsed`
 * at render time; absent phases mean 0 (battle-1 behavior unchanged).
 * Supplied by the route's staging context; production code never keys off
 * battle number or absolute tick.
 */
export type BattleCommandBounceSchedule = Readonly<{
  phaseOffsets: Readonly<Partial<Record<BattleCommandPresentationPhase, number>>>;
}>;

export const BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT: BattleCommandBounceSchedule =
  Object.freeze({ phaseOffsets: Object.freeze({}) });

/**
 * The torment fixture's route-scoped schedule (oracle terms §8.1: 4-frame
 * opening freeze 736-739 = app offset +3; fight-menu 740-766 = +1; reopen
 * window 977 = -1). The +1 fight-menu offset is a FIRST-window-only regime
 * (see `bounceFightMenuReopened`): after the rejection reopen the oracle is
 * back on the app's clock and 986 must stay at offset 0.
 */
export const TORMENT_ROUTE_BOUNCE_SCHEDULE: BattleCommandBounceSchedule =
  Object.freeze({
    phaseOffsets: Object.freeze({
      "fight-opening": 3,
      "fight-menu": 1,
      "rejection-reopen": -1,
    }),
  });

export type BattleCommandPresentationState = Readonly<{
  request: BattleCommandRequest;
  lifecycle: Readonly<{
    phase: BattleCommandPresentationPhase;
    phaseElapsed: number;
  }>;
  /**
   * Controller-owned age of the live battler/healthbox bounce. Unlike the
   * lifecycle phase clock, the source bouncer sprite survives FIGHT
   * open/cancel/reopen transitions.
   */
  idleBounceElapsed: number;
  /**
   * Route-scoped idle-bounce freeze schedule (see `BattleCommandBounceSchedule`).
   * Defaults to the all-zero battle-1 schedule; only a route's staging
   * context supplies the torment 4/1/1 overlay.
   */
  bounceSchedule: BattleCommandBounceSchedule;
  /**
   * True once the rejection reopen has returned the presentation to the
   * fight-menu. The schedule's +1 fight-menu offset is a FIRST-window-only
   * regime (the oracle is back on the app's clock after the reopen tail —
   * frame 986 must stay at offset 0), so the reopened window suppresses it.
   */
  bounceFightMenuReopened: boolean;
  /**
   * Persistent controller-owned battler sprite visibility across command
   * handoffs (the real sprite's `invisible` flag). The resolution seam sets
   * it from its own sprite-visibility receipts; the Dig/Fly semi-invisible
   * toggle hides only the sprite, never the healthbox (ISSUES #79).
   */
  spriteVisibility: Readonly<{
    player: boolean;
    opponent: boolean;
  }>;
  field: Readonly<{
    player: BattleCommandFieldBattler;
    opponent: BattleCommandFieldBattler;
  }>;
  actionCursor: 0 | 1 | 2 | 3;
  fightCursor: 0 | 1 | 2 | 3;
  fightDisplayCursor: 0 | 1 | 2 | 3;
  legalMoveBySlot: readonly [
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
  ];
  /**
   * Advisory-only parallel to `legalMoveBySlot` (ISSUES #72 scout §2.2
   * option (b)): for a slot that projection greys out, the six-cause
   * `TrySetCantSelectMoveBattleScript` reason why, or `null` when the slot
   * is legal or masked only by a cause outside the six (Encore/zero-move).
   * Never affects `legalMoveBySlot`/`pendingDecision`/`submitBattleDecision`
   * -- explanatory data only.
   */
  rejectionReasonBySlot: readonly [
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
  ];
  legalSwitchPartyIndexes: readonly BattlePartyIndex[];
  /**
   * The fight-menu slot whose commit entered a selection-rejection message
   * phase (ISSUES #81), or `null`. While `rejection-message`/
   * `rejection-reopen` are the current phase, the render view resolves the
   * `rejectionReasonBySlot[rejectedSlot]` STRINGID's two lines and types
   * them on the message box; the slot stays cursor-preserved for the
   * byte-identical reopen.
   */
  rejectedSlot: 0 | 1 | 2 | 3 | null;
  /**
   * The wait ▼'s age at the dismiss press, frozen for the reopen span: the
   * real `\p` release leaves the fully-typed box up with the cursor held at
   * its dismiss pose until the menu redraws (oracle 968-977 all one sha).
   */
  rejectionWaitCursorAge: number;
  /**
   * Route-scoped `STRINGID_USEDMOVE` post-print hold (failed/no-anim path
   * only), threaded into the resolution on `beginCommandResolution`
   * (`battleResolutionPresentation.ts`'s `usedMessageHoldFrames`). Defaults
   * to 0 for every route that does not supply it.
   */
  usedMessageHoldFrames: number;
  pendingDecision: BattleCommandDecision | null;
}>;

export class BattleCommandPresentationError extends Error {
  override readonly name = "BattleCommandPresentationError";
}

/** Six displayed blank-message frames precede the atomic action-menu draw. */
export const BATTLE_COMMAND_ACTION_ENTER_DELAY = 6;

/**
 * ISSUES #81 selection-rejection timing, all relative to the reject commit
 * A-press frame (`docs/torment-selection-rejection-ground-truth.md` §2/§6):
 * - first message glyph at +3 (oracle 767->770, typed 1 glyph/frame),
 * - the wait ▼ first appears at +66 (oracle 833) and the box holds
 *   button-gated (no auto-advance) until an A/B press (the `\p`
 *   PAUSE_UNTIL_PRESS gate, text.c:865-882),
 * - the dismissed box clears to the byte-identical move menu +9 frames
 *   after the dismiss press frame (oracle 969->978).
 */
export const REJECTION_MESSAGE_FIRST_GLYPH_AT = 3;
export const REJECTION_MESSAGE_HOLD_AT = 66;
export const REJECTION_MESSAGE_REOPEN_FRAMES = 9;

export function moveBattleCommandActionCursor(
  cursor: 0 | 1 | 2 | 3,
  direction: "LEFT" | "RIGHT" | "UP" | "DOWN",
): 0 | 1 | 2 | 3 {
  return moveFightCursor(cursor, direction);
}

function withLifecycle(
  state: BattleCommandPresentationState,
  phase: BattleCommandPresentationPhase,
  phaseElapsed: number,
  changes: Partial<BattleCommandPresentationState> = {},
): BattleCommandPresentationState {
  return Object.freeze({
    ...state,
    ...changes,
    lifecycle: Object.freeze({ phase, phaseElapsed }),
  });
}

function advancePhaseElapsed(
  state: BattleCommandPresentationState,
): BattleCommandPresentationState {
  return withLifecycle(
    state,
    state.lifecycle.phase,
    state.lifecycle.phaseElapsed + 1,
  );
}

export function battleCommandUiStatusFromStatus1(
  status1: number,
): BattleCommandUiStatus {
  if (
    (status1 & BATTLE_SCRIPT_STATUS1_POISON) !== 0
    || (status1 & BATTLE_SCRIPT_STATUS1_TOXIC_POISON) !== 0
  ) return "poison";
  if ((status1 & BATTLE_SCRIPT_STATUS1_BURN) !== 0) return "burn";
  if ((status1 & BATTLE_SCRIPT_STATUS1_FREEZE) !== 0) return "freeze";
  if ((status1 & BATTLE_SCRIPT_STATUS1_PARALYSIS) !== 0) return "paralysis";
  if ((status1 & BATTLE_SCRIPT_STATUS1_SLEEP) !== 0) return "sleep";
  return "none";
}

function partyIndexFromBattler(
  battler: BattleScriptRulesBattlerState,
  field: string,
): BattlePartyIndex {
  if (!Number.isInteger(battler.partyIndex) || battler.partyIndex < 0 || battler.partyIndex > 5) {
    throw new BattleCommandPresentationError(
      `${field}.partyIndex must identify a party slot from 0 through 5, got ${battler.partyIndex}`,
    );
  }
  return battler.partyIndex as BattlePartyIndex;
}

/**
 * Builds one battler's display snapshot straight from its PARTY record --
 * the bench state the kernel switches in. Identity fields (species, name,
 * level, gender) and hp/status/moves all read the party mirror, which
 * controller writes keep in sync (datahpupdate's HP sync, SetMoveEffect's
 * status write). The resolution projector uses this for a switch-in whose
 * post-switch command boundary never exists (the incoming mon faints the
 * same turn, or is dragged out again) -- soak signature 6
 * (docs/soak-crash-catalog.md §6): at switch-in time the bench record IS
 * the mon's state, so the display never needs the next boundary's field.
 */
export function battleCommandFieldBattlerFromPartyMember(
  side: BattleDecisionSide,
  battlerId: BattleSinglesBattler,
  partyIndex: BattlePartyIndex,
  partyMember: BattleScriptPartyMemberState,
): BattleCommandFieldBattler {
  if (partyMember.species === 0 || partyMember.isEgg) {
    throw new BattleCommandPresentationError(
      `${side} battler ${battlerId} points at empty or Egg party slot ${partyIndex}`,
    );
  }
  const speciesName = SPECIES_NAMES[partyMember.species];
  const speciesStats = SPECIES_STATS_BY_ID.get(partyMember.species);
  if (
    speciesName === undefined
    || speciesStats === undefined
    || speciesName.species !== speciesStats.name
  ) {
    throw new BattleCommandPresentationError(
      `${side} party slot ${partyIndex} has unresolved species ${partyMember.species}`,
    );
  }
  return Object.freeze({
    side,
    battler: battlerId,
    partyIndex,
    species: partyMember.species,
    name: battleCommandSpeciesDisplayName(partyMember.species),
    level: partyMember.level,
    gender: getMonGender(speciesStats.genderRatio, partyMember.personality),
    hp: partyMember.hp,
    maxHP: partyMember.maxHP,
    status: battleCommandUiStatusFromStatus1(partyMember.status1),
    moveIds: Object.freeze([...partyMember.moves]) as BattleCommandMoveIds,
    currentPP: Object.freeze([...partyMember.pp]) as BattleCommandMovePp,
    ppBonuses: partyMember.ppBonuses,
  });
}

function fieldBattler(
  side: BattleDecisionSide,
  battlerId: BattleSinglesBattler,
  active: BattleScriptRulesBattlerState,
  partyMember: BattleScriptPartyMemberState,
  partyIndex: BattlePartyIndex,
): BattleCommandFieldBattler {
  if (
    active.personality !== partyMember.personality
    || active.level !== partyMember.level
  ) {
    throw new BattleCommandPresentationError(
      `${side} battler ${battlerId} does not match party identity at slot ${partyIndex}`,
    );
  }
  // Same identity/species derivation as the party-record builder; the ACTIVE
  // battler state overlays the live battle fields (Transform/Mimic can make
  // these diverge from the party mirror mid-battle).
  return Object.freeze({
    ...battleCommandFieldBattlerFromPartyMember(side, battlerId, partyIndex, partyMember),
    hp: active.hp,
    maxHP: active.maxHP,
    status: battleCommandUiStatusFromStatus1(active.status1),
    moveIds: Object.freeze([...active.moves]) as BattleCommandMoveIds,
    currentPP: Object.freeze([...active.pp]) as BattleCommandMovePp,
    ppBonuses: active.ppBonuses,
  });
}

/**
 * Snapshots one live player-side singles command boundary into immutable,
 * render-owned state. Lifecycle input and decision submission are deliberately
 * owned by later slices of the battle-command seam.
 */
export function createBattleCommandPresentation(
  requestInput: BattleCommandRequest,
  rules: BattleScriptRulesContext,
  initialFightCursor: 0 | 1 | 2 | 3 = 0,
  bounceSchedule: BattleCommandBounceSchedule = BATTLE_COMMAND_BOUNCE_SCHEDULE_DEFAULT,
  /**
   * Route-scoped post-print hold for the confirmed move's STRINGID_USEDMOVE
   * on the failed/no-anim path (ISSUES #81 remainder 4b) -- the source runs
   * a `pause B_WAIT_TIME_SHORT` / animation controller span after the
   * attackstring with no `waitmessage`. Defaults to 0 (no hold), which the
   * standard hit chain keeps; only a route's staging context (the torment /
   * switch pacing fixtures) supplies 38/39.
   */
  usedMessageHoldFrames = 0,
): BattleCommandPresentationState {
  const request = createBattleCommandRequest(requestInput);
  if (request.side !== "player" || request.battler !== 0) {
    throw new BattleCommandPresentationError(
      "battle-command presentation accepts player-side singles requests only",
    );
  }
  if (rules.battleTopology.battlersCount !== 2) {
    throw new BattleCommandPresentationError(
      `battle-command presentation requires singles topology, got ${rules.battleTopology.battlersCount} battlers`,
    );
  }

  const playerActive = rules.battlers[request.battler];
  const opponentActive = rules.battlers[1];
  if (playerActive.side !== 0) {
    throw new BattleCommandPresentationError(
      `request battler ${request.battler} is not the live player battler`,
    );
  }
  if (opponentActive.side !== 1) {
    throw new BattleCommandPresentationError("battler 1 is not the live opponent battler");
  }

  const playerPartyIndex = partyIndexFromBattler(playerActive, "player battler");
  const opponentPartyIndex = partyIndexFromBattler(opponentActive, "opponent battler");
  const playerPartyMember = rules.party.player[playerPartyIndex];
  const opponentPartyMember = rules.party.opponent[opponentPartyIndex];

  const legalMoveBySlot: [
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
    BattleMoveDecision | null,
  ] = [null, null, null, null];
  const legalSwitchPartyIndexes: BattlePartyIndex[] = [];
  for (const decision of request.legalDecisions) {
    if (decision.kind === "switch") {
      legalSwitchPartyIndexes.push(decision.partyIndex);
      continue;
    }
    if (legalMoveBySlot[decision.moveSlot] !== null) {
      throw new BattleCommandPresentationError(
        `move slot ${decision.moveSlot} has more than one legal target`,
      );
    }
    legalMoveBySlot[decision.moveSlot] = decision;
  }
  const rejectionReasonForSlot = (slot: 0 | 1 | 2 | 3): BattleScriptSelectionRejection | null =>
    legalMoveBySlot[slot] === null
      ? describeIllegalMoveSelection(rules, request.battler, slot)
      : null;
  const rejectionReasonBySlot: [
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
    BattleScriptSelectionRejection | null,
  ] = [
    rejectionReasonForSlot(0),
    rejectionReasonForSlot(1),
    rejectionReasonForSlot(2),
    rejectionReasonForSlot(3),
  ];

  return Object.freeze({
    request,
    lifecycle: Object.freeze({ phase: "action-enter", phaseElapsed: 0 }),
    idleBounceElapsed: 0,
    bounceSchedule,
    bounceFightMenuReopened: false,
    spriteVisibility: Object.freeze({ player: true, opponent: true }),
    field: Object.freeze({
      player: fieldBattler(
        "player",
        request.battler,
        playerActive,
        playerPartyMember,
        playerPartyIndex,
      ),
      opponent: fieldBattler(
        "trainer",
        1,
        opponentActive,
        opponentPartyMember,
        opponentPartyIndex,
      ),
    }),
    actionCursor: 0,
    fightCursor: initialFightCursor,
    fightDisplayCursor: initialFightCursor,
    legalMoveBySlot: Object.freeze(legalMoveBySlot),
    rejectionReasonBySlot: Object.freeze(rejectionReasonBySlot),
    legalSwitchPartyIndexes: Object.freeze(legalSwitchPartyIndexes),
  rejectedSlot: null,
  rejectionWaitCursorAge: 0,
  pendingDecision: null,
  usedMessageHoldFrames,
});
}

/**
 * Advances one JOY_NEW-owned command-controller tick. All delays are relative
 * to the request's current phase; entering another phase resets its clock.
 */
export function advanceBattleCommandPresentation(
  stateInput: BattleCommandPresentationState,
  newKeys: ReadonlySet<GbaButton>,
): BattleCommandPresentationState {
  // `DoBounceEffect` starts when the action menu becomes interactive and its
  // already-running guard preserves the same invisible bouncer sprite across
  // FIGHT controller phases (battle_main.c:2899-2937). Keep this clock
  // independent from the phase-relative window timing below.
  const bounceCallbackRuns =
    stateInput.lifecycle.phase !== "action-enter"
    && (
      (
        stateInput.lifecycle.phase !== "fight-opening"
        && stateInput.lifecycle.phase !== "fight-closing"
      )
      || stateInput.lifecycle.phaseElapsed >= FIGHT_SUBMENU_OPEN_BOUNCE_SHIFT
    );
  let state = !bounceCallbackRuns
    ? stateInput
    : Object.freeze({
      ...stateInput,
      idleBounceElapsed: stateInput.idleBounceElapsed + 1,
    });

  switch (state.lifecycle.phase) {
    case "action-enter": {
      const elapsed = state.lifecycle.phaseElapsed + 1;
      state = elapsed >= BATTLE_COMMAND_ACTION_ENTER_DELAY
        ? withLifecycle(state, "action-menu", 0)
        : withLifecycle(state, "action-enter", elapsed);
      break;
    }
    case "fight-opening": {
      const elapsed = state.lifecycle.phaseElapsed + 1;
      state = elapsed >= FIGHT_SUBMENU_OPEN_DELAY
        ? withLifecycle(state, "fight-menu", 0)
        : withLifecycle(state, "fight-opening", elapsed);
      break;
    }
    case "fight-closing": {
      const elapsed = state.lifecycle.phaseElapsed + 1;
      state = elapsed >= FIGHT_SUBMENU_CLOSE_DELAY
        ? withLifecycle(state, "action-menu", 0)
        : withLifecycle(state, "fight-closing", elapsed);
      break;
    }
    case "fight-menu":
      state = withLifecycle(
        state,
        "fight-menu",
        state.lifecycle.phaseElapsed + 1,
        { fightDisplayCursor: state.fightCursor },
      );
      break;
    case "rejection-message": {
      const elapsed = state.lifecycle.phaseElapsed + 1;
      // The `\p` PAUSE_UNTIL_PRESS gate (text.c:865-882) keeps the box up
      // until A or B once the final glyph has landed; neither button does
      // anything before the hold opens. The rejected slot is preserved
      // through the reopen span so the renderer can keep drawing the frozen
      // message box (oracle 968-977 all one sha).
      if (
        elapsed >= REJECTION_MESSAGE_HOLD_AT
        && (newKeys.has("A") || newKeys.has("B"))
      ) {
        return withLifecycle(state, "rejection-reopen", 0, {
          rejectionWaitCursorAge: elapsed - REJECTION_MESSAGE_HOLD_AT,
        });
      }
      return withLifecycle(state, "rejection-message", elapsed);
    }
    case "rejection-reopen": {
      const elapsed = state.lifecycle.phaseElapsed + 1;
      // The dismissed box stays on screen (message frozen, cursor held at
      // its dismiss pose) through the reopen span, then the move menu is
      // redrawn byte-identical with the cursor unchanged.
      if (elapsed >= REJECTION_MESSAGE_REOPEN_FRAMES) {
        return withLifecycle(state, "fight-menu", 0, {
          fightDisplayCursor: state.fightCursor,
          rejectedSlot: null,
          bounceFightMenuReopened: true,
        });
      }
      return withLifecycle(state, "rejection-reopen", elapsed);
    }
    default:
      state = advancePhaseElapsed(state);
      break;
  }

  if (state.lifecycle.phase === "action-menu") {
    if (newKeys.has("A")) {
      if (state.actionCursor === 0) {
        return withLifecycle(state, "fight-opening", 0);
      }
      if (state.actionCursor === 2) {
        return withLifecycle(state, "party-handoff", 0);
      }
      return state;
    }
    const direction = (["LEFT", "RIGHT", "UP", "DOWN"] as const)
      .find((button) => newKeys.has(button));
    if (direction !== undefined) {
      return Object.freeze({
        ...state,
        actionCursor: moveBattleCommandActionCursor(state.actionCursor, direction),
      });
    }
    return state;
  }

  if (state.lifecycle.phase !== "fight-menu") return state;

  if (newKeys.has("A")) {
    const decision = state.legalMoveBySlot[state.fightCursor];
    if (decision !== null) {
      return withLifecycle(state, "submitting", 0, { pendingDecision: decision });
    }
    // ISSUES #81: a slot that `rejectionReasonBySlot` flags (Torment et al.)
    // does NOT submit -- it enters the rejection-message phase, which types
    // the resolver's two lines, holds button-gated, and reopens the menu.
    const rejection = state.rejectionReasonBySlot[state.fightCursor];
    if (rejection !== null) {
      return withLifecycle(state, "rejection-message", 0, {
        rejectedSlot: state.fightCursor,
      });
    }
    return state;
  }
  if (newKeys.has("B")) {
    return withLifecycle(state, "fight-closing", 0);
  }

  const direction = (["LEFT", "RIGHT", "UP", "DOWN"] as const)
    .find((button) => newKeys.has(button));
  if (direction === undefined) return state;
  return Object.freeze({
    ...state,
    fightCursor: moveFightCursor(state.fightCursor, direction),
  });
}

/**
 * The render-time idle-bounce age offset for the presentation's current
 * lifecycle phase (ISSUES #81 remainder 4a). Reads the route-scoped schedule
 * (`bounceSchedule.phaseOffsets`), with the reopened fight-menu suppressing
 * its first-window +1 offset so frame 986 stays on the app's clock.
 */
export function battleCommandBounceAgeOffset(
  presentation: BattleCommandPresentationState,
): number {
  const phase = presentation.lifecycle.phase;
  if (phase === "fight-menu" && presentation.bounceFightMenuReopened) return 0;
  return presentation.bounceSchedule.phaseOffsets[phase] ?? 0;
}

/**
 * Completes the adjacent voluntary party-selector handoff with one of the
 * request-owned legal switch decisions. The party UI itself is deliberately
 * outside this presentation seam.
 */
export function returnBattleCommandPartySelection(
  state: BattleCommandPresentationState,
  partyIndex: BattlePartyIndex,
): BattleCommandPresentationState {
  if (state.lifecycle.phase !== "party-handoff") return state;
  const decision = state.request.legalDecisions.find(
    (candidate) =>
      candidate.kind === "switch" && candidate.partyIndex === partyIndex,
  );
  return decision === undefined
    ? state
    : withLifecycle(state, "submitting", 0, { pendingDecision: decision });
}

/** Returns a cancelled voluntary selector to its same request and cursor. */
export function cancelBattleCommandPartySelection(
  state: BattleCommandPresentationState,
): BattleCommandPresentationState {
  return state.lifecycle.phase === "party-handoff"
    ? withLifecycle(state, "action-menu", 0)
    : state;
}

/**
 * Submits only a completed presentation choice through the ordinary immutable
 * battle boundary. Request identity and decision legality remain kernel-owned.
 */
export function submitBattleCommandPresentationDecision<
  RulesState extends BattleJsonObject,
>(
  battleState: BattleState<RulesState>,
  presentation: BattleCommandPresentationState,
  reducer: BattleDecisionReducer<RulesState>,
): BattleDecisionTransitionResult<RulesState> | null {
  if (
    presentation.lifecycle.phase !== "submitting"
    || presentation.pendingDecision === null
  ) return null;
  return submitBattleDecision(
    battleState,
    {
      requestId: presentation.request.requestId,
      side: presentation.request.side,
      decision: presentation.pendingDecision,
    },
    reducer,
  );
}
