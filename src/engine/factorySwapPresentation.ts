import anchorState from "../data/gen/anchor-state.json" with { type: "json" };
import rentalFixture from "../data/gen/battle1-swap-rentalmons-dump.json" with { type: "json" };
import {
  acknowledgeFactorySwapPresentation,
  copyFactorySwapCursor,
  createFactorySwapState,
  handleFactorySwapInput,
  type FactoryRentalRoster,
  type FactorySwapInput,
  type FactorySwapMon,
  type FactorySwapParty,
  type FactorySwapPhase,
  type FactorySwapState,
} from "./factorySwap.ts";

export interface FactorySwapPresentationState {
  readonly controller: FactorySwapState;
  /** Relative to the accepted postwin offer-YES edge. */
  readonly elapsed: number;
  /** Relative to the input edge which entered controller.phase. */
  readonly phaseElapsed: number;
}

const anchor = anchorState as {
  rentals: Array<{
    species: string;
    personality: number;
    abilityNum: number;
    stats: { hp: number; maxHp: number };
  }>;
};
const rentalMons = (
  rentalFixture as unknown as {
    yesBranch: { ticks: Record<string, { rentalMons: FactoryRentalRoster }> };
  }
).yesBranch.ticks["29601"]!.rentalMons;

function playerMon(index: number): FactorySwapMon {
  const source = anchor.rentals[index]!;
  return {
    id: source.species.replace("SPECIES_", "").toLowerCase(),
    species: source.species.replace("SPECIES_", ""),
    hp: source.stats.maxHp,
    maxHp: source.stats.maxHp,
    status: "none",
    personality: source.personality,
    abilityNum: source.abilityNum,
    friendship: 255,
  };
}

function offeredMon(
  id: string,
  species: string,
  rentalIndex: 3 | 4 | 5,
): FactorySwapMon {
  const rental = rentalMons[rentalIndex];
  return {
    id,
    species,
    hp: 100,
    maxHp: 100,
    status: "none",
    personality: rental.personality,
    abilityNum: rental.abilityNum,
    friendship: 255,
  };
}

export const CANONICAL_SWAP_PLAYER_PARTY: FactorySwapParty = [
  playerMon(0),
  playerMon(1),
  playerMon(2),
];

export const CANONICAL_SWAP_ENEMY_PARTY: FactorySwapParty = [
  offeredMon("grovyle", "GROVYLE", 3),
  offeredMon("murkrow", "MURKROW", 4),
  offeredMon("pidgeotto", "PIDGEOTTO", 5),
];

export const FACTORY_SWAP_ENTRY_READY_DELAY = 99;
export const FACTORY_SWAP_PHASE_READY_DELAYS: Readonly<
  Partial<Record<FactorySwapPhase, number>>
> = {
  playerOptions: 79,
  enemyPicker: 199,
  acceptPrompt: 99,
  quitPrompt: 99,
  duplicateSpecies: 99,
};

export function createCanonicalFactorySwapPresentation(): FactorySwapPresentationState {
  return {
    controller: createFactorySwapState(
      CANONICAL_SWAP_PLAYER_PARTY,
      CANONICAL_SWAP_ENEMY_PARTY,
      rentalMons,
    ),
    elapsed: 0,
    phaseElapsed: 0,
  };
}

function readyDelay(state: FactorySwapPresentationState): number | null {
  if (state.controller.phase === "complete") return null;
  if (state.controller.phase === "playerPicker" && state.elapsed === state.phaseElapsed) {
    return FACTORY_SWAP_ENTRY_READY_DELAY;
  }
  return FACTORY_SWAP_PHASE_READY_DELAYS[state.controller.phase] ?? 0;
}

export function advanceFactorySwapPresentation(
  state: FactorySwapPresentationState,
): FactorySwapPresentationState {
  const elapsed = state.elapsed + 1;
  const phaseElapsed = state.phaseElapsed + 1;
  let controller = copyFactorySwapCursor(state.controller);
  const advanced = { controller, elapsed, phaseElapsed };
  const delay = readyDelay(advanced);
  if (delay !== null && phaseElapsed >= delay) {
    controller = acknowledgeFactorySwapPresentation(controller);
  }
  return { controller, elapsed, phaseElapsed };
}

export function handleFactorySwapPresentationInput(
  state: FactorySwapPresentationState,
  input: FactorySwapInput,
): FactorySwapPresentationState {
  const controller = handleFactorySwapInput(state.controller, input);
  if (controller === state.controller) return state;
  return {
    ...state,
    controller,
    phaseElapsed:
      controller.phase === state.controller.phase ? state.phaseElapsed : 0,
  };
}

/** sAnim_Swap_Pokeball_Moving, relative to the entry adapter's sprite epoch. */
export function factorySwapBallTile(elapsed: number): 0 | 16 | 32 {
  const local = elapsed - 43;
  if (local < 0) return 0;
  const commands = [
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 4],
    [16, 4],
    [0, 4],
    [32, 4],
    [0, 36],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
  ] as const;
  let age = local;
  for (const [tile, duration] of commands) {
    if (age < duration) return tile;
    age -= duration;
  }
  return 0;
}

/** Selected-player ball epoch after A, before the option popup reveal. */
export function factorySwapPlayerOptionBallTile(phaseElapsed: number): 0 | 16 | 32 {
  const local = phaseElapsed - 7;
  if (local < 0) return 0;
  const commands = [
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
    [16, 8],
    [0, 8],
    [32, 8],
    [0, 8],
  ] as const;
  let age = local;
  for (const [tile, duration] of commands) {
    if (age < duration) return tile;
    age -= duration;
  }
  return 0;
}

/**
 * `Swap_Task_ScreenInfoTransitionOut`'s PALNUM_FADE_TEXT fade, relative to
 * the accepted player-ball A edge. The delay and alternating two-frame
 * coefficients are pinned by the dense OFF trace; the coefficient values
 * are the source `BeginNormalPaletteFade(..., 0, 0, 16, target)` sequence.
 */
export function factorySwapActionFadeY(phaseElapsed: number): number {
  if (phaseElapsed < 6) return 0;
  return Math.min(16, (Math.floor((phaseElapsed - 6) / 2) + 1) * 2);
}

/**
 * CANCEL's source `tXIncrement=6` slide. The transition task creates the
 * child after the fade completes; its first visible movement is edge +27.
 */
export function factorySwapCancelButtonX(phaseElapsed: number): number {
  const steps = Math.max(0, Math.min(8, phaseElapsed - 26));
  return 192 + steps * 6;
}
