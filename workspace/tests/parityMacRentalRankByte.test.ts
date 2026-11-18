import { describe, expect, it } from "vitest";
import { generateInitialFactoryRentals, getFactoryRentalRank } from "../src/engine/factoryRentalGeneration.ts";

// Fix 46 (docs/parity-mac/rental-rank-count-byte.md). GetNumPastRentalsRank reads the u16 factoryRentsCount into a u8
// (`u8 rents = gSaveBlock2Ptr->frontier.factoryRentsCount[battleMode][lvlMode]`, battle_factory.c:871), so the rank wraps at 256 rents.
// ROM (lab staging, challenge 0, the count staged at SaveBlock2 +0xDF2 before the select screen; Select_InitMonsData gives the first `rank`
// rentals the next challenge's IV, battle_factory_screen.c:1754-1763): 15 rents -> IVs 6,3,3 (rank 1); 256 -> 3,3,3 (rank 0); 271 -> 6,3,3.
describe("fix 46: the rental rank reads the rent count as one byte", () => {
  it("wraps at 256 rents", () => {
    expect([0, 14, 15, 42, 43, 255].map(getFactoryRentalRank)).toEqual([0, 0, 1, 4, 5, 5]);
    expect([256, 270, 271, 299, 512, 9999].map(getFactoryRentalRank)).toEqual([0, 0, 1, 5, 0, getFactoryRentalRank(9999 & 0xff)]);
  });

  it("a draft at 256 rents is the draft at 0 rents (the better range and the better IVs both follow the wrapped rank)", () => {
    const draft = (rentsCount: number) => generateInitialFactoryRentals({ rngValue: 0x1234_5678, factoryWinStreak: 7, rentsCount, playerTrainerId: 416049562 });
    expect(draft(256)).toEqual(draft(0));
    expect(draft(271)).toEqual(draft(15));
    expect(draft(43).rentalRank).toBe(5);
    expect(draft(256 + 43).rentals.map((r) => r.setId)).toEqual(draft(43).rentals.map((r) => r.setId));
  });
});
