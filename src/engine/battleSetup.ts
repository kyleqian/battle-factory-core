// S8 engine dependency (ROADMAP.md's S8 section, docs/battle-menu-notes.md
// §13c): derives the PLAYER's active mon's moveset from the same
// battle-setup state the rest of the engine already threads through -
// `factoryDraftScreen.ts`'s confirmed rental picks (`chosenMonSpecies`,
// pick-rank order) plus `anchor-state.json`'s own per-rental moveset record
// (already a production data source - `summaryInfoPage.ts` reads the same
// file for the Info page) - instead of a battle-1-specific literal.
//
// Scope boundary: this run's engine only ever models ONE battle in
// progress (the fixed anchor battle vs Grovyle) and never models switching
// mid-battle, so "the active mon" here always means the confirmed party's
// LEAD (`chosenMonSpecies(...)[0]`) - exactly the mon every committed trace
// this engine currently reproduces actually sends out. Generalizing to
// mid-battle switches or a non-lead active mon is future work (S8's own
// battle-2-onward slices), not something this derivation fakes.

import { chosenMonSpecies, type DraftScreenState } from "./factoryDraftScreen.ts";
import anchorStateData from "../data/gen/anchor-state.json" with { type: "json" };
import movesData from "../data/gen/moves.json" with { type: "json" };

interface AnchorRental {
  species: string;
  moves: readonly string[];
  pp: readonly number[];
}
const rentals = (anchorStateData as { rentals: AnchorRental[] }).rentals;

const MOVE_ID_BY_NAME = new Map<string, number>(
  (movesData as { moves: Array<{ move: string; id: number }> }).moves.map((m) => [m.move, m.id]),
);

/**
 * The player's active mon's moveset in `gBattleMons[].moves`-native shape
 * (numeric ids, `fightSubmenuText.ts`'s `buildFightMoveset` own input
 * format) - `maxPP` only; live current-PP is a separate, per-tick concern
 * (see `battleMenu.ts`'s `currentPPForActiveMon`, the sole place turn
 * resolution is known to have spent any).
 */
export interface ActiveMonMoveset {
  readonly moveIds: readonly [number, number, number, number];
  readonly maxPP: readonly [number, number, number, number];
}

export interface BattleSetupState {
  readonly battleNumber: 1 | 2;
  readonly encounter: "destin" | "jenson";
  readonly trainerClass: "BUG CATCHER" | "FISHERMAN";
  readonly trainerName: "DESTIN" | "JENSON";
  readonly opponentLead: "GROVYLE" | "KABUTO";
  readonly playerParty: readonly ["ONIX", "MAGBY", "BAYLEEF"];
  readonly playerPartyHp: readonly [number, number, number];
  readonly activeMonMoveset: ActiveMonMoveset;
}

function moveIdForName(name: string): number {
  const id = MOVE_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`battleSetup: unknown move ${name}`);
  return id;
}

/**
 * `anchor-state.json`'s own `rentals[]` entry for `species` (the SAME array
 * `summaryInfoPage.ts` already reads for the Info page, there indexed by
 * pool slot - here matched by species name since `chosenMonSpecies` only
 * ever returns species, not pool position). `species` is the plain pool
 * name (`factoryDraftScreen.ts`'s `RentalSlot.species`, e.g. "ONIX"), not
 * the `SPECIES_`-prefixed constant `anchor-state.json` itself uses - every
 * rental pool species this run's draft pool has is a single word, so the
 * prefix-and-match below is exact (not a general species-name normalizer).
 */
export function rentalMoveset(species: string): ActiveMonMoveset {
  const rental = rentals.find((r) => r.species === `SPECIES_${species}`);
  if (!rental) throw new Error(`rentalMoveset: unknown rental species ${species}`);
  const moveIds = rental.moves.map(moveIdForName) as unknown as [number, number, number, number];
  const maxPP = rental.pp as unknown as [number, number, number, number];
  return { moveIds, maxPP };
}

/**
 * The active mon (party lead - see module doc) for whatever battle the
 * draft screen's confirmed picks feed into. Requires the 3rd pick to
 * already be confirmed (`chosenMonSpecies` returns pick-rank order) - every
 * caller in this engine only reaches battle state after that's true.
 */
export function activeMonMoveset(draftScreen: DraftScreenState): ActiveMonMoveset {
  const [lead] = chosenMonSpecies(draftScreen);
  if (!lead) throw new Error("activeMonMoveset: no confirmed rental picks");
  return rentalMoveset(lead);
}

export function createBattleSetup(
  draftScreen: DraftScreenState,
  encounter: "destin" | "jenson",
  playerPartyHp: readonly [number, number, number] = [117, 138, 153],
): BattleSetupState {
  const jenson = encounter === "jenson";
  return {
    battleNumber: jenson ? 2 : 1,
    encounter,
    trainerClass: jenson ? "FISHERMAN" : "BUG CATCHER",
    trainerName: jenson ? "JENSON" : "DESTIN",
    opponentLead: jenson ? "KABUTO" : "GROVYLE",
    playerParty: ["ONIX", "MAGBY", "BAYLEEF"],
    playerPartyHp,
    activeMonMoveset: activeMonMoveset(draftScreen),
  };
}
