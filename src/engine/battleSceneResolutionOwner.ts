import type { GbaButton } from "../input.ts";
import type { BattleParty, FactoryRentalParty } from "./battleScenario.ts";
import type { BattleResolutionPresentationState } from "./battleResolutionPresentation.ts";
import {
  advancePartySelect,
  createPartySelectStateFromForcedSwitch,
  type PartySelectState,
} from "./partySelect.ts";

/**
 * Compatibility owner for an already-exact battle window. The immutable
 * reducer resolution remains the authority; a forced selector can exist only
 * for the exact request published by that resolution.
 */
export type BattleSceneResolutionOwner = Readonly<{
  resolution: BattleResolutionPresentationState;
  forcedPartySelect: PartySelectState | null;
}>;

export function createBattleSceneResolutionOwner(
  resolution: BattleResolutionPresentationState,
): BattleSceneResolutionOwner {
  return Object.freeze({ resolution, forcedPartySelect: null });
}

export function beginBattleSceneForcedPartySelect(
  owner: BattleSceneResolutionOwner,
  playerRentalRecords: FactoryRentalParty,
  playerParty: BattleParty,
): BattleSceneResolutionOwner {
  if (owner.forcedPartySelect !== null) return owner;
  const request = owner.resolution.forcedRequest;
  if (request === null) {
    throw new Error("battle-scene resolution has no forced-switch request");
  }
  return Object.freeze({
    resolution: owner.resolution,
    forcedPartySelect: createPartySelectStateFromForcedSwitch(
      request,
      playerRentalRecords,
      playerParty,
    ),
  });
}

export function advanceBattleSceneForcedPartySelect(
  owner: BattleSceneResolutionOwner,
  newKeys: ReadonlySet<GbaButton>,
): BattleSceneResolutionOwner {
  const selector = owner.forcedPartySelect;
  if (selector === null) {
    throw new Error("battle-scene resolution has no active forced selector");
  }
  const request = owner.resolution.forcedRequest;
  if (
    request === null
    || selector.request.requestId !== request.requestId
    || selector.request.side !== request.side
    || selector.request.battler !== request.battler
    || selector.request.faintedPartyIndex !== request.faintedPartyIndex
    || selector.request.legalPartyIndexes.length !== request.legalPartyIndexes.length
    || selector.request.legalPartyIndexes.some(
      (partyIndex, index) => partyIndex !== request.legalPartyIndexes[index],
    )
  ) {
    throw new Error("battle-scene forced selector lost its resolution request owner");
  }
  return Object.freeze({
    resolution: owner.resolution,
    forcedPartySelect: advancePartySelect(selector, newKeys),
  });
}
