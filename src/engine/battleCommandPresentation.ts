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
  FIGHT_SUBMENU_CLOSE_DELAY,
  FIGHT_SUBMENU_OPEN_DELAY,
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
  | "submitting";

export type BattleCommandPresentationState = Readonly<{
  request: BattleCommandRequest;
  lifecycle: Readonly<{
    phase: BattleCommandPresentationPhase;
    phaseElapsed: number;
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
  legalSwitchPartyIndexes: readonly BattlePartyIndex[];
  pendingDecision: BattleCommandDecision | null;
}>;

export class BattleCommandPresentationError extends Error {
  override readonly name = "BattleCommandPresentationError";
}

/** Six displayed blank-message frames precede the atomic action-menu draw. */
export const BATTLE_COMMAND_ACTION_ENTER_DELAY = 6;

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

function uiStatusFromStatus1(status1: number): BattleCommandUiStatus {
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

function fieldBattler(
  side: BattleDecisionSide,
  battlerId: BattleSinglesBattler,
  active: BattleScriptRulesBattlerState,
  partyMember: BattleScriptPartyMemberState,
  partyIndex: BattlePartyIndex,
): BattleCommandFieldBattler {
  if (partyMember.species === 0 || partyMember.isEgg) {
    throw new BattleCommandPresentationError(
      `${side} battler ${battlerId} points at empty or Egg party slot ${partyIndex}`,
    );
  }
  if (
    active.personality !== partyMember.personality
    || active.level !== partyMember.level
  ) {
    throw new BattleCommandPresentationError(
      `${side} battler ${battlerId} does not match party identity at slot ${partyIndex}`,
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
    name: speciesName.name,
    level: partyMember.level,
    gender: getMonGender(speciesStats.genderRatio, partyMember.personality),
    hp: active.hp,
    maxHP: active.maxHP,
    status: uiStatusFromStatus1(active.status1),
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

  return Object.freeze({
    request,
    lifecycle: Object.freeze({ phase: "action-enter", phaseElapsed: 0 }),
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
    fightCursor: 0,
    fightDisplayCursor: 0,
    legalMoveBySlot: Object.freeze(legalMoveBySlot),
    legalSwitchPartyIndexes: Object.freeze(legalSwitchPartyIndexes),
    pendingDecision: null,
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
  let state = stateInput;

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
    default:
      state = advancePhaseElapsed(state);
      break;
  }

  if (state.lifecycle.phase === "action-menu") {
    if (newKeys.has("A") && state.actionCursor === 0) {
      return withLifecycle(state, "fight-opening", 0);
    }
    return state;
  }

  if (state.lifecycle.phase !== "fight-menu") return state;

  if (newKeys.has("A")) {
    const decision = state.legalMoveBySlot[state.fightCursor];
    return decision === null
      ? state
      : withLifecycle(state, "submitting", 0, { pendingDecision: decision });
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
