/**
 * Anchor-draft receipt link (Gate-5 audit item 2, final form).
 *
 * Provenance: `docs/anchor-draft-cursor-receipt.md` (2026-07-30) probed the
 * true pre-selection and pre-construction `gRngValue` cursors for the
 * committed anchor bootstrap directly off real hardware (fast frame scan +
 * targeted CPU single-stepping, LR-attributed callers). Its §5 gives the
 * exact call below. Feeding those two cursors into
 * `generateInitialFactoryRentals` reproduces every setId-derived field for
 * all six slots, and the exact personality for slots 0 and 2, against
 * `src/data/gen/anchor-state.json` (RAM-dumped ground truth, see
 * `tools/extract/inspect-anchor.py`).
 *
 * Slots 1/3/4/5's personalities are deliberately excluded from the
 * ROM-identity claim — this is ISSUES #55, not a test gap: the probe doc's
 * §4 shows `CreateFrontierFactorySelectableMons` spans 53 real video frames
 * for this anchor, and `VBlankIntr`'s ambient `Random()` tick (`main.c:366`)
 * interleaves 53 extra draws into the same `gRngValue` stream mid-
 * construction on real hardware. `generateInitialFactoryRentals`'s
 * `constructionRngValue` contract consumes construction draws back-to-back
 * from one cursor with no representation for that interleaving — a
 * stream-model boundary, not an algorithm defect: the probe doc's §4
 * filtered-ledger replay (skipping the 53 ambient draws) reproduces all six
 * anchor personalities exactly, proving the ported nature-rejection
 * algorithm itself is correct. Slots 0 and 2 happen to match directly
 * because slot 0 finishes construction inside a single video frame (no
 * interleaving is possible) and slot 2 lands on a coincidental cursor
 * realignment (probe doc §5) — not because those two slots are otherwise
 * special.
 *
 * The four personality values pinned below for slots 1/3/4/5 are this exact
 * call's actual clean-model output, NOT ROM ground truth (ROM values differ
 * per ISSUES #55 / the probe doc's §5). They exist solely so a silent
 * change to the generator is caught by this test.
 */

import { describe, expect, it } from "vitest";
import anchorState from "../src/data/gen/anchor-state.json" with { type: "json" };
import frontierHeldItemsData from "../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import frontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import movesData from "../src/data/gen/moves.json" with { type: "json" };
import { createFactoryCorpusPartyMember } from "../src/engine/factoryCorpusParty.ts";
import { generateInitialFactoryRentals } from "../src/engine/factoryRentalGeneration.ts";
import { natureFromPersonality } from "../src/engine/opponentGen.ts";

// docs/anchor-draft-cursor-receipt.md §5's exact call.
const PROBE_INPUT = Object.freeze({
  rngValue: 145179184, // pre-selection: GenerateInitialRentalMons entry, frame 5796
  factoryWinStreak: 0, // ANCHOR_FACTORY_METADATA, doc §2
  rentsCount: 0,
  playerTrainerId: 416_049_562,
  constructionRngValue: 3231484068, // pre-construction: CreateFrontierFactorySelectableMons entry, frame 6696
});

const ROM_EXACT_PERSONALITY_SLOTS = [0, 2] as const;
const INTERLEAVED_SLOTS = [1, 3, 4, 5] as const;

// NOT ROM ground truth — see file header and ISSUES #55. These are
// generateInitialFactoryRentals's own output for PROBE_INPUT, pinned as a
// generator-regression guard, not as a hardware claim.
const CLEAN_MODEL_PERSONALITIES: Readonly<Record<number, number>> = Object.freeze({
  1: 431990256, // MAGBY
  3: 1969862949, // BUTTERFREE
  4: 819988269, // HAUNTER
  5: 2372315381, // QUILAVA
});

const frontierMonsByIndex = new Map(frontierMonsData.entries.map((entry) => [entry.index, entry]));
const heldItemsByTableId = new Map(frontierHeldItemsData.entries.map((entry) => [entry.itemTableId, entry]));
const movesByName = new Map(movesData.moves.map((entry) => [entry.move, entry]));

describe("anchor-draft receipt link (docs/anchor-draft-cursor-receipt.md §5, ISSUES #55)", () => {
  const result = generateInitialFactoryRentals(PROBE_INPUT);

  it("selects and constructs exactly six rentals, matching anchor-state.json's slot count", () => {
    expect(result.rentals).toHaveLength(6);
    expect(anchorState.rentals).toHaveLength(6);
  });

  anchorState.rentals.forEach((anchorRental, slot) => {
    describe(`slot ${slot} (${anchorRental.species})`, () => {
      const rental = result.rentals[slot]!;
      const member = createFactoryCorpusPartyMember(rental);
      const frontierMon = frontierMonsByIndex.get(anchorRental.frontierMonIndex)!;

      it("setId matches the RAM-verified frontierMonIndex", () => {
        expect(rental.setId).toBe(anchorRental.frontierMonIndex);
      });

      it("species matches ROM ground truth", () => {
        expect(member.speciesName).toBe(anchorRental.species);
      });

      it("nature matches ROM ground truth", () => {
        expect(member.natureName).toBe(anchorRental.nature);
      });

      it("EVs match ROM ground truth", () => {
        expect(member.evs).toEqual(anchorRental.evs);
      });

      it("moves match ROM ground truth", () => {
        const expectedMoveIds = anchorRental.moves.map((name) => movesByName.get(name)!.id);
        expect(member.moves).toEqual(expectedMoveIds);
      });

      // anchor-state.json has no held-item field: inspect-anchor.py's
      // decode_pokemon never reads the BoxPokemon misc substruct's item
      // word, so there is no RAM value to compare against here. This
      // instead cross-checks the generator's setId-derived item resolution
      // against an independent, test-side lookup through the same source
      // catalogs (battle-frontier-mons.json + battle-frontier-held-
      // items.json), gated on setId already being asserted RAM-identical
      // above — not an independent ROM confirmation for this one field.
      it("item matches the setId-derived catalog lookup (no RAM field exists for this anchor)", () => {
        const expectedItemId = heldItemsByTableId.get(frontierMon.itemTableId)!.itemId;
        expect(member.item).toBe(expectedItemId);
      });

      it("fixed IVs match ROM ground truth", () => {
        expect(member.ivs).toEqual(anchorRental.ivs);
      });

      it("ability slot matches ROM ground truth", () => {
        expect(member.abilitySlot).toBe(anchorRental.abilityNum);
      });
    });
  });

  it("matches ROM-ground-truth personalities exactly for slots 0 and 2", () => {
    for (const slot of ROM_EXACT_PERSONALITY_SLOTS) {
      expect(result.rentals[slot]!.personality, `slot ${slot}`).toBe(anchorState.rentals[slot]!.personality);
    }
  });

  it("satisfies the nature invariant for slots 1/3/4/5 despite the ambient-tick personality divergence (ISSUES #55)", () => {
    for (const slot of INTERLEAVED_SLOTS) {
      const rental = result.rentals[slot]!;
      expect(natureFromPersonality(rental.personality), `slot ${slot} personality %25`).toBe(rental.nature);
    }
  });

  it("pins the clean-model (non-ROM) personalities for slots 1/3/4/5 as a generator-regression guard", () => {
    for (const slot of INTERLEAVED_SLOTS) {
      expect(result.rentals[slot]!.personality, `slot ${slot}`).toBe(CLEAN_MODEL_PERSONALITIES[slot]);
    }
  });
});
