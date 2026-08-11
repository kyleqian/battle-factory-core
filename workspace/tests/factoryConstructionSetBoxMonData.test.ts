import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  factoryMonConstructionInputFromSet,
  reduceFactorySetBoxMonDataTiming,
} from "../src/engine/factoryConstructionClock.ts";

const REFERENCE_ELF = readFileSync("reference/pokeemerald/pokeemerald.elf");
const REFERENCE_SOURCE = readFileSync("reference/pokeemerald/src/pokemon.c", "utf8");
const BOX_MON_ADDRESS = 0x0202_4744;

function elfRomSlice(address: number, length: number): Buffer {
  const programHeaderOffset = REFERENCE_ELF.readUInt32LE(0x1c);
  const programHeaderSize = REFERENCE_ELF.readUInt16LE(0x2a);
  const programHeaderCount = REFERENCE_ELF.readUInt16LE(0x2c);
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderSize;
    if (REFERENCE_ELF.readUInt32LE(offset) !== 1) continue;
    const fileOffset = REFERENCE_ELF.readUInt32LE(offset + 4);
    const virtualAddress = REFERENCE_ELF.readUInt32LE(offset + 8);
    const fileSize = REFERENCE_ELF.readUInt32LE(offset + 16);
    if (address >= virtualAddress && address + length <= virtualAddress + fileSize) {
      return REFERENCE_ELF.subarray(
        fileOffset + address - virtualAddress,
        fileOffset + address - virtualAddress + length,
      );
    }
  }
  throw new Error(`missing pinned ELF ROM interval 0x${address.toString(16)}+${length}`);
}

function constructionEvFields(evSpread: number): number[] {
  return Array.from({ length: 6 }, (_, index) => index)
    .filter((index) => (evSpread & (1 << index)) !== 0)
    .map((index) => 26 + index);
}

describe("Factory construction SetMonData -> SetBoxMonData census", () => {
  it("pins the source, full ELF body, call sites, and complete committed EV-field census", () => {
    const setBoxSource = REFERENCE_SOURCE.slice(
      REFERENCE_SOURCE.indexOf("void SetBoxMonData"),
      REFERENCE_SOURCE.indexOf("void CopyMon", REFERENCE_SOURCE.indexOf("void SetBoxMonData")),
    );
    expect(setBoxSource).toContain("if (field > MON_DATA_ENCRYPT_SEPARATOR)");
    expect(setBoxSource.match(/GetSubstruct\(boxMon, boxMon->personality, [0-3]\)/g)).toHaveLength(4);
    expect(setBoxSource.match(/CalculateBoxMonChecksum\(boxMon\)/g)).toHaveLength(2);
    expect(REFERENCE_SOURCE).toContain("SetBoxMonData(&mon->box, field, data)");
    expect(createHash("sha256").update(elfRomSlice(0x0806_ad9c, 0x66c)).digest("hex"))
      .toBe("c466258a1a60c65cd83c68819205118b4f23088456d7ad054a7b15d0f0f86ee8");
    expect(elfRomSlice(0x0806_86ce, 14).toString("hex"))
      .toBe("211c1a31381c04aa02f0e9fa6806");
    expect(elfRomSlice(0x0806_ad90, 10).toString("hex"))
      .toBe("181c00f003f801bc0047");

    const receiptCases = [
      { name: "anchor", spreads: [37, 17, 17, 17, 3, 17] },
      { name: "liliana", spreads: [5, 36, 17] },
      { name: "factory-varied", spreads: [6, 37, 37] },
    ] as const;
    const observedFields: number[] = [];
    for (const expected of receiptCases) {
      const receipt = JSON.parse(readFileSync(
        `tests/fixtures/factory-construction-cycle-v2/${expected.name}.json`, "utf8",
      )) as { sourceFunction: "CreateFrontierFactorySelectableMons" | "FillFactoryFrontierTrainerParty"; sourceSetIds: number[] };
      const spreads = receipt.sourceSetIds.map((setId) => (
        factoryMonConstructionInputFromSet(setId, receipt.sourceFunction).evSpread
      ));
      expect(spreads).toEqual(expected.spreads);
      observedFields.push(...spreads.flatMap(constructionEvFields));
    }
    expect(observedFields).toHaveLength(27);
    expect(Object.fromEntries([26, 27, 28, 29, 30, 31].map((field) => [
      field,
      observedFields.filter((candidate) => candidate === field).length,
    ]))).toEqual({ 26: 10, 27: 2, 28: 6, 29: 0, 30: 5, 31: 4 });
    // The committed cases cover five arms, while the source six-bit loop can
    // issue every contiguous MON_DATA_HP_EV+i selector, including SPEED_EV.
    expect(constructionEvFields(0x3f)).toEqual([26, 27, 28, 29, 30, 31]);
  });
});

describe("reduceFactorySetBoxMonDataTiming", () => {
  it("closes every source-reachable construction EV write without a field-duration table", () => {
    const expectedTailPcs = [
      0x0806_b0a4, 0x0806_b0aa, 0x0806_b0b0,
      0x0806_b0b6, 0x0806_b0bc, 0x0806_b0c2,
    ];
    for (let field = 26; field <= 31; field += 1) {
      const timing = reduceFactorySetBoxMonDataTiming({
        field,
        boxMonAddress: BOX_MON_ADDRESS,
        personality: 0x801d_2ed7,
        checksumValid: true,
      });
      expect(timing.checksumRoute).toBe("valid-rewrites-checksum");
      expect(timing.getSubstructCalls).toBe(12);
      expect(timing.getSubstructTimings.map((row) => row.substructType)).toEqual([
        0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3,
      ]);
      expect(timing.decryptCount).toBe(1);
      expect(timing.checksumCount).toBe(2);
      expect(timing.encryptCount).toBe(1);
      expect(timing.fieldTailTiming).toMatchObject({
        route: "ev-u8",
        entryPc: expectedTailPcs[field - 26],
        logicalSubstruct: 2,
        valueWidth: 1,
        sequentialThumbHalfwords: 3,
        pipelineRefills: 1,
        cycles: 12,
        unresolved: null,
      });
      expect(timing.outerShellTiming).toMatchObject({
        route: "encrypted-valid",
        sequentialThumbHalfwords: 78,
        pipelineRefills: 13,
        checksumFunctionShellCount: 2,
        checksumFunctionShellCycles: 196,
        cycles: 448,
      });
      expect(timing.cycles - timing.getSubstructCycles).toBe(2_380);
      expect(timing.throughSetMonDataCycles).toBe(timing.cycles + 40);
      expect(timing.unresolved).toBeNull();
    }
  });

  it("selects all 24 personality layouts for all three valid-write GetSubstruct rounds", () => {
    const expectedLayouts = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
      [0, 2, 3, 1], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2],
      [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
      [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2],
      [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 3, 0], [1, 3, 2, 0],
      [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
    ];
    for (let modulo = 0; modulo < 24; modulo += 1) {
      const personality = modulo + 24 * 0x0101_010;
      const timing = reduceFactorySetBoxMonDataTiming({
        field: 26,
        boxMonAddress: BOX_MON_ADDRESS,
        personality,
        checksumValid: true,
      });
      for (let round = 0; round < 3; round += 1) {
        const rows = timing.getSubstructTimings.slice(round * 4, round * 4 + 4);
        expect(rows.map((row) => row.personalityModulo24)).toEqual([modulo, modulo, modulo, modulo]);
        expect(rows.map((row) => row.selectedPhysicalSlot)).toEqual(expectedLayouts[modulo]);
      }
      expect(timing.fieldTailTiming!.secureStorageOffset)
        .toBe(0x20 + expectedLayouts[modulo]![2]! * 12);
    }
  });

  it("fails checksum validation before dispatch and excludes the field write and second checksum", () => {
    const timing = reduceFactorySetBoxMonDataTiming({
      field: 26,
      boxMonAddress: BOX_MON_ADDRESS,
      personality: 0x0ffc_69a4,
      checksumValid: false,
    });
    expect(timing.checksumRoute).toBe("invalid-returns-before-field");
    expect(timing.fieldTailTiming).toBeNull();
    expect(timing.getSubstructCalls).toBe(8);
    expect(timing.getSubstructTimings.map((row) => row.substructType)).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3,
    ]);
    expect(timing.checksumCount).toBe(1);
    expect(timing.outerShellTiming).toMatchObject({
      route: "encrypted-invalid",
      sequentialThumbHalfwords: 71,
      pipelineRefills: 9,
      checksumFunctionShellCount: 1,
      checksumFunctionShellCycles: 98,
      cycles: 294,
    });
    expect(timing.outerShellTiming.ewramAccesses.filter((row) => row.access === "write" && row.width === 1))
      .toHaveLength(2);
    expect(timing.cycles - timing.getSubstructCycles).toBe(1_708);
  });

  it("covers representative unencrypted and encrypted switch families", () => {
    const encryptSeparator = reduceFactorySetBoxMonDataTiming({
      field: 10,
      boxMonAddress: BOX_MON_ADDRESS,
    });
    expect(encryptSeparator).toMatchObject({
      checksumRoute: "not-checked",
      getSubstructCalls: 0,
      decryptCount: 0,
      checksumCount: 0,
      encryptCount: 0,
      cycles: 132,
      throughSetMonDataCycles: 172,
    });
    expect(encryptSeparator.fieldTailTiming).toMatchObject({ route: "encrypt-separator-u16", cycles: 18 });

    const cases = [
      { field: 11, fieldValue: 1, route: "species-nonzero", logical: 0, outer: 478, fixed: 2_410 },
      { field: 11, fieldValue: 0, route: "species-zero", logical: 0, outer: 486, fixed: 2_418 },
      { field: 13, route: "move-u16", logical: 1, outer: 462, fixed: 2_394 },
      { field: 17, route: "pp-u8", logical: 1, outer: 454, fixed: 2_386 },
      { field: 39, route: "hp-iv-bitfield", logical: 3, outer: 462, fixed: 2_394 },
    ] as const;
    for (const expected of cases) {
      const timing = reduceFactorySetBoxMonDataTiming({
        field: expected.field,
        boxMonAddress: BOX_MON_ADDRESS,
        personality: 0x1ae1_6fda,
        checksumValid: true,
        ...("fieldValue" in expected ? { fieldValue: expected.fieldValue } : {}),
      });
      expect(timing.fieldTailTiming).toMatchObject({
        route: expected.route,
        logicalSubstruct: expected.logical,
      });
      expect(timing.outerShellTiming.cycles).toBe(expected.outer);
      expect(timing.cycles - timing.getSubstructCycles).toBe(expected.fixed);
    }
  });

  it("is deeply immutable and fail-closed for unsupported or incomplete inputs", () => {
    const input = Object.freeze({
      field: 28,
      boxMonAddress: BOX_MON_ADDRESS,
      personality: 0x801d_2ed7,
      checksumValid: true,
    });
    const timing = reduceFactorySetBoxMonDataTiming(input);
    expect(input).toEqual({ field: 28, boxMonAddress: BOX_MON_ADDRESS, personality: 0x801d_2ed7, checksumValid: true });
    expect(Object.isFrozen(timing)).toBe(true);
    expect(Object.isFrozen(timing.getSubstructTimings)).toBe(true);
    expect(Object.isFrozen(timing.outerShellTiming)).toBe(true);
    expect(Object.isFrozen(timing.outerShellTiming.ewramAccesses)).toBe(true);
    expect(Object.isFrozen(timing.fieldTailTiming)).toBe(true);
    expect(Object.isFrozen(timing.fieldTailTiming!.ewramAccesses)).toBe(true);

    for (const field of [-1, 0, 12, 25, 38, 40, 80, 81, 1.5]) {
      expect(() => reduceFactorySetBoxMonDataTiming({ field, boxMonAddress: BOX_MON_ADDRESS }))
        .toThrow(/field|unsupported/);
    }
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 26, boxMonAddress: BOX_MON_ADDRESS + 1, personality: 0, checksumValid: true,
    })).toThrow(/word-aligned/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 26, boxMonAddress: 0x0203_ffc0, personality: 0, checksumValid: true,
    })).toThrow(/complete BoxPokemon/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 26, boxMonAddress: BOX_MON_ADDRESS,
    })).toThrow(/personality/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 26, boxMonAddress: BOX_MON_ADDRESS, personality: 0, checksumValid: 1 as unknown as boolean,
    })).toThrow(/checksumValid/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 11, boxMonAddress: BOX_MON_ADDRESS, personality: 0, checksumValid: true,
    })).toThrow(/fieldValue/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 11, boxMonAddress: BOX_MON_ADDRESS, personality: 0, checksumValid: true, fieldValue: 0x1_0000,
    })).toThrow(/fit u16/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 26, boxMonAddress: BOX_MON_ADDRESS, personality: 0, checksumValid: true, fieldValue: 1,
    })).toThrow(/only a timing input/);
    expect(() => reduceFactorySetBoxMonDataTiming({
      field: 10, boxMonAddress: BOX_MON_ADDRESS, personality: 0,
    })).toThrow(/reject unused/);
  });
});
