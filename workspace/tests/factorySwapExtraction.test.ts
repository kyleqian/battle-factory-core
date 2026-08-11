import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import rentalFixture from "../src/data/gen/battle1-swap-rentalmons-dump.json" with { type: "json" };
import rngFixture from "../src/data/gen/battle1-swapyes-rng-dump.json" with { type: "json" };
import swapWindows from "../src/data/gen/swap-screen-windows.json" with { type: "json" };

type RentalMon = { monId: number; personality: number; ivs: number; abilityNum: number };
type RentalTick = { rentalMons: RentalMon[] };

const fixture = rentalFixture as {
  yesBranch: { ticks: Record<string, RentalTick> };
  declineBranch: { ticks: Record<string, RentalTick> };
};

describe("Factory swap extracted contract", () => {
  it("keeps the generated table tied to the pinned Swap_* source declarations", () => {
    const source = readFileSync("reference/pokeemerald/src/battle_factory_screen.c", "utf8");
    expect(source).toContain("static const struct BgTemplate sSwap_BgTemplates[4]");
    expect(source).toContain("SWAP_WIN_ACTION_FADE");
    expect(source).toMatch(/\[SWAP_WIN_YES_NO\]\s*=\s*\{[\s\S]*?\.tilemapLeft\s*=\s*22,[\s\S]*?\.tilemapTop\s*=\s*14,[\s\S]*?\.width\s*=\s*8,[\s\S]*?\.height\s*=\s*4,/);
    expect(swapWindows.bgTemplates).toHaveLength(4);
  });

  it("pins the source-specific window roles needed by a live swap renderer", () => {
    expect(swapWindows.windowTemplates.SWAP_WIN_INFO).toMatchObject({ bg: 0, tilemapLeft: 0, tilemapTop: 15, width: 20, height: 3 });
    expect(swapWindows.windowTemplates.SWAP_WIN_OPTIONS).toMatchObject({ bg: 0, tilemapLeft: 21, tilemapTop: 14, width: 9, height: 6 });
    expect(swapWindows.windowTemplates.SWAP_WIN_YES_NO).toMatchObject({ bg: 0, tilemapLeft: 22, tilemapTop: 14, width: 8, height: 4 });
    expect(swapWindows.windowTemplates.SWAP_WIN_ACTION_FADE).toMatchObject({ bg: 2, tilemapLeft: 21, tilemapTop: 15, width: 9, height: 5 });
  });

  it("pins accepted replacement against the offered-rental slot and leaves decline untouched", () => {
    const before = fixture.yesBranch.ticks["29601"]!.rentalMons;
    const accepted = fixture.yesBranch.ticks["30681"]!.rentalMons;
    const declined = fixture.declineBranch.ticks["33031"]!.rentalMons;
    expect(before.map(({ monId }) => monId)).toEqual([156, 149, 180, 188, 184, 135]);
    expect(accepted[0]).toEqual(before[3]);
    expect(accepted.slice(1, 3)).toEqual(before.slice(1, 3));
    expect(declined).toEqual(before);
  });

  it("keeps the committed OFF decision timing as evidence, not controller ticks", () => {
    const ledger = (rngFixture as { totalStepsAcrossTail: number; windowLedger: Array<{ tickEnd: number; lcgSteps: number }> }).windowLedger;
    expect((rngFixture as { totalStepsAcrossTail: number }).totalStepsAcrossTail).toBe(3757);
    expect(ledger).toHaveLength(28);
    expect(ledger.find(({ tickEnd }) => tickEnd === 30001)?.lcgSteps).toBe(199);
    expect(ledger.at(-1)).toMatchObject({ tickEnd: 34081, lcgSteps: 6 });
  });
});
