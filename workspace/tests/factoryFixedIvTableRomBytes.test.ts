/**
 * ROM-byte receipt for `sFixedIVTable` and its retail one-past-the-end row.
 *
 * `GetFactoryMonFixedIV` (`battle_factory.c:739-757`) clamps its IV argument
 * with `challengeNum > ARRAY_COUNT(sFixedIVTable)` outside `#ifdef BUGFIX`.
 * The pinned reference build defines neither BUGFIX
 * (`reference/pokeemerald/include/config.h:48` is commented out) nor MODERN,
 * so an argument of exactly 8 falls through unclamped and reads
 * `sFixedIVTable[8]` -- the two bytes the linker placed immediately after the
 * declared 16-byte table.
 *
 * `src/data/gen/factory-round-policy.json` carries that row as a ninth
 * `rentalSelection.fixedIvs` entry flagged `retailOverread`, derived by the
 * extractor from .rodata adjacency rather than from declared C data. This
 * test is the receipt that the adjacency is real: it reads the 18 bytes at
 * `sFixedIVTable` straight out of `reference/pokeemerald/pokeemerald.gba` and
 * compares them to the committed JSON.
 *
 * Addresses come from `nm reference/pokeemerald/pokeemerald.elf`:
 *   08612184 r sFixedIVTable
 *   08612194 r sInitialRentalMonRanges
 * both inside `src/battle_factory.o(.rodata) 0x08611fc0 0x214`
 * (`reference/pokeemerald/pokeemerald.map:32072`). The overread bytes are
 * therefore `sInitialRentalMonRanges[0][0]`, i.e. little-endian
 * FRONTIER_MON_GRIMER.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import policy from "../src/data/gen/factory-round-policy.json" with { type: "json" };

/** `nm reference/pokeemerald/pokeemerald.elf` -> `08612184 r sFixedIVTable`. */
const S_FIXED_IV_TABLE_ADDRESS = 0x08612184;
/** GBA cartridge ROM is mapped at 0x08000000. */
const ROM_BASE = 0x08000000;
/** `ARRAY_COUNT(sFixedIVTable)` -- rows of two `u8`. */
const DECLARED_ROWS = 8;
/** `USE_RANDOM_IVS` (`include/constants/pokemon.h:202`) is `MAX_PER_STAT_IVS + 1`. */
const USE_RANDOM_IVS = 32;

const rom = readFileSync("reference/pokeemerald/pokeemerald.gba");
const offset = S_FIXED_IV_TABLE_ADDRESS - ROM_BASE;
const bytes = [...rom.subarray(offset, offset + (DECLARED_ROWS + 1) * 2)];
const fixedIvs = policy.rentalSelection.fixedIvs as ReadonlyArray<
  { regular: number; lastBattle: number; retailOverread?: boolean }
>;

describe("sFixedIVTable ROM bytes", () => {
  it("matches the eight declared rows byte-for-byte", () => {
    expect(bytes.slice(0, DECLARED_ROWS * 2)).toEqual([
      3, 6, 6, 9, 9, 12, 12, 15, 15, 18, 21, 31, 31, 31, 31, 31,
    ]);
    expect(fixedIvs.slice(0, DECLARED_ROWS).flatMap((row) => [row.regular, row.lastBattle]))
      .toEqual(bytes.slice(0, DECLARED_ROWS * 2));
    for (const row of fixedIvs.slice(0, DECLARED_ROWS)) {
      expect(row.retailOverread).toBeUndefined();
    }
  });

  it("pins the two overread bytes the retail build reads as row 8", () => {
    const overread = fixedIvs[DECLARED_ROWS];
    expect(overread).toEqual({ regular: 110, lastBattle: 0, retailOverread: true });
    expect(bytes.slice(DECLARED_ROWS * 2)).toEqual([overread!.regular, overread!.lastBattle]);
  });

  it("attributes the overread bytes to sInitialRentalMonRanges[0][0]", () => {
    // 0x08612184 + 0x10 == 0x08612194 == `r sInitialRentalMonRanges`.
    const grimer = policy.rentalSelection.ranges.level50[0]!.start;
    expect(grimer).toBe(110); // FRONTIER_MON_GRIMER
    expect(bytes.slice(DECLARED_ROWS * 2)).toEqual([grimer & 0xff, (grimer >> 8) & 0xff]);
    // The whole u16 also reads back from the ROM at the neighbouring symbol.
    expect(rom.readUInt16LE(0x08612194 - ROM_BASE)).toBe(grimer);
  });

  it("records why row 8 is not a plain fixed IV", () => {
    const overread = fixedIvs[DECLARED_ROWS]!;
    // `regular` (useHigherIV FALSE) is >= USE_RANDOM_IVS, so CreateBoxMon
    // takes its random-IV branch instead of writing a uniform IV.
    expect(overread.regular).toBeGreaterThanOrEqual(USE_RANDOM_IVS);
    // `lastBattle` (useHigherIV TRUE) is a literal all-zero IV spread -- the
    // last trainer of a challengeNum-8 round is weaker, not stronger.
    expect(overread.lastBattle).toBeLessThan(USE_RANDOM_IVS);
    expect(overread.lastBattle).toBe(0);
  });
});
