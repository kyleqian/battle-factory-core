import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import expTablesData from "../src/data/gen/exp-tables.json" with { type: "json" };
import {
  reduceFactoryCalculateMonStatsParentTiming,
  reduceFactoryChecksumLoopTiming,
  reduceFactoryDecryptBoxMonTiming,
  reduceFactoryEncryptBoxMonTiming,
  reduceFactoryEwramAccessTiming,
  reduceFactoryGetBoxMonDataOuterShellTiming,
  reduceFactoryGetSubstructTiming,
  censusFactoryGetBoxMonDataDependency,
  reduceFactoryGetNatureTiming,
  reduceFactoryGetMonDataTiming,
  reduceFactoryModifyStatByNatureTiming,
  reduceFactorySetMonDataTiming,
  reduceFactorySignedDivisionTiming,
} from "../src/engine/factoryConstructionClock.ts";

type DirectCall = {
  monIndex: number;
  operation: string;
  target: string;
  callPc: string;
  entryPc: string;
  returnPc: string;
  entryMasterCycles: number;
  returnMasterCycles: number;
  returnPcObserved: string;
  arguments: Record<string, number>;
  result?: number;
  boundaries?: Record<string, { masterCycles: number; pc: string }>;
  asyncService?: Array<{ kind: string; masterCycles: number; pc: string }>;
};

type StatsReceipt = {
  schema: string;
  case: string;
  oracleProfile: string;
  sourceFunction: string;
  mons: Array<{ monIndex: number; targetNature: number; acceptedPersonality: number }>;
  spans: Array<{
    monIndex: number;
    entryMasterCycles: number;
    entryPc: string;
    returnMasterCycles: number;
    returnPc: string;
  }>;
  interruptPauses: Array<{ entryMasterCycles: number; resumeMasterCycles: number }>;
  directCalls: DirectCall[];
};

const ROOT = "tests/fixtures/factory-calculate-mon-stats-v1";
const CASES = [
  {
    name: "anchor",
    hash: "92d3feb4686cddfdaf7a6b14be3931514f2007f59052f0f4a64deb5bba287773",
    sourceCycles: [147_225, 154_160, 144_082, 150_824, 152_353, 145_526],
    directCycles: [146_142, 153_077, 142_999, 149_741, 151_270, 144_443],
    interstitialCycles: [1_083, 1_083, 1_083, 1_083, 1_083, 1_083],
    pauses: [49_093, 0, 0, 41_394, 0, 47_590],
  },
  {
    name: "liliana",
    hash: "136efa4a46777d1e0665f0af3efd6a9ef3b694c68048d3ef46b9140532de5358",
    sourceCycles: [147_417, 148_749, 152_011],
    directCycles: [146_334, 147_668, 150_928],
    interstitialCycles: [1_083, 1_081, 1_083],
    pauses: [38_205, 44_449, 48_911],
  },
  {
    name: "factory-varied",
    hash: "ea323d9e8e881da6730c78af8965a579258cfd528a6a903a6c0c2dc23b005ce6",
    sourceCycles: [147_488, 140_999, 150_849],
    directCycles: [146_407, 139_916, 149_766],
    interstitialCycles: [1_081, 1_083, 1_083],
    pauses: [36_923, 0, 0],
  },
] as const;

const probes = CASES.map((expected) => {
  const bytes = readFileSync(`${ROOT}/${expected.name}.json`);
  return {
    expected,
    bytes,
    value: JSON.parse(bytes.toString("utf8")) as StatsReceipt,
  };
});

const REFERENCE_ELF = readFileSync("reference/pokeemerald/pokeemerald.elf");
const REFERENCE_POKEMON_SOURCE = readFileSync("reference/pokeemerald/src/pokemon.c", "utf8");

/** Read an exact loadable-ROM interval from the pinned ELF, not the GBA copy. */
function elfRomSlice(address: number, length: number): Buffer {
  expect(REFERENCE_ELF.readUInt32LE(0)).toBe(0x464c457f); // \x7fELF
  const programHeaderOffset = REFERENCE_ELF.readUInt32LE(0x1c);
  const programHeaderSize = REFERENCE_ELF.readUInt16LE(0x2a);
  const programHeaderCount = REFERENCE_ELF.readUInt16LE(0x2c);
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderSize;
    if (REFERENCE_ELF.readUInt32LE(offset) !== 1) continue; // PT_LOAD
    const fileOffset = REFERENCE_ELF.readUInt32LE(offset + 4);
    const virtualAddress = REFERENCE_ELF.readUInt32LE(offset + 8);
    const fileSize = REFERENCE_ELF.readUInt32LE(offset + 16);
    if (address >= virtualAddress && address + length <= virtualAddress + fileSize) {
      return REFERENCE_ELF.subarray(fileOffset + address - virtualAddress, fileOffset + address - virtualAddress + length);
    }
  }
  throw new Error(`missing pinned ELF ROM interval 0x${address.toString(16)}+${length}`);
}

function elfSymbol(name: string): { value: number; size: number } {
  const sectionHeaderOffset = REFERENCE_ELF.readUInt32LE(0x20);
  const sectionHeaderSize = REFERENCE_ELF.readUInt16LE(0x2e);
  const sectionHeaderCount = REFERENCE_ELF.readUInt16LE(0x30);
  for (let sectionIndex = 0; sectionIndex < sectionHeaderCount; sectionIndex += 1) {
    const sectionOffset = sectionHeaderOffset + sectionIndex * sectionHeaderSize;
    if (REFERENCE_ELF.readUInt32LE(sectionOffset + 4) !== 2) continue; // SHT_SYMTAB
    const symbolOffset = REFERENCE_ELF.readUInt32LE(sectionOffset + 16);
    const symbolSize = REFERENCE_ELF.readUInt32LE(sectionOffset + 20);
    const symbolEntrySize = REFERENCE_ELF.readUInt32LE(sectionOffset + 36);
    const stringTableIndex = REFERENCE_ELF.readUInt32LE(sectionOffset + 24);
    const stringSectionOffset = sectionHeaderOffset + stringTableIndex * sectionHeaderSize;
    const stringTableOffset = REFERENCE_ELF.readUInt32LE(stringSectionOffset + 16);
    for (let offset = symbolOffset; offset < symbolOffset + symbolSize; offset += symbolEntrySize) {
      const nameOffset = REFERENCE_ELF.readUInt32LE(offset);
      const nameEnd = REFERENCE_ELF.indexOf(0, stringTableOffset + nameOffset);
      const symbolName = REFERENCE_ELF.toString("utf8", stringTableOffset + nameOffset, nameEnd);
      if (symbolName === name) {
        return {
          value: REFERENCE_ELF.readUInt32LE(offset + 4),
          size: REFERENCE_ELF.readUInt32LE(offset + 8),
        };
      }
    }
  }
  throw new Error(`missing pinned ELF symbol ${name}`);
}

function sourceGetSubstructTypes(source: string): number[] {
  return [...source.matchAll(/GetSubstruct\(boxMon, boxMon->personality, (\d)\)/g)]
    .map((match) => Number.parseInt(match[1]!, 10));
}

const DIRECT_CALL_SHAPE = [
  ["get-mon-data", "old-max-hp", "0x08068d1e", "0x0806a51a", "0x08068d22", 58],
  ["get-mon-data", "current-hp", "0x08068d2a", "0x0806a51a", "0x08068d2e", 57],
  ["get-mon-data", "hp-iv", "0x08068d36", "0x0806a51a", "0x08068d3a", 39],
  ["get-mon-data", "hp-ev", "0x08068d42", "0x0806a51a", "0x08068d46", 26],
  ["get-mon-data", "attack-iv", "0x08068d4e", "0x0806a51a", "0x08068d52", 40],
  ["get-mon-data", "attack-ev", "0x08068d5a", "0x0806a51a", "0x08068d5e", 27],
  ["get-mon-data", "defense-iv", "0x08068d66", "0x0806a51a", "0x08068d6a", 41],
  ["get-mon-data", "defense-ev", "0x08068d72", "0x0806a51a", "0x08068d76", 28],
  ["get-mon-data", "speed-iv", "0x08068d7e", "0x0806a51a", "0x08068d82", 42],
  ["get-mon-data", "speed-ev", "0x08068d8a", "0x0806a51a", "0x08068d8e", 29],
  ["get-mon-data", "sp-attack-iv", "0x08068d96", "0x0806a51a", "0x08068d9a", 43],
  ["get-mon-data", "sp-attack-ev", "0x08068da2", "0x0806a51a", "0x08068da6", 30],
  ["get-mon-data", "sp-defense-iv", "0x08068dae", "0x0806a51a", "0x08068db2", 44],
  ["get-mon-data", "sp-defense-ev", "0x08068dba", "0x0806a51a", "0x08068dbe", 31],
  ["get-mon-data", "species", "0x08068dc6", "0x0806a51a", "0x08068dca", 11],
  ["get-level-from-exp", "level", "0x08068dd0", "0x08069056", "0x08068dd4", null],
  ["set-mon-data", "level", "0x08068de0", "0x0806acae", "0x08068de4", 56],
  ["divide", "max-hp", "0x08068e1c", "0x082e7542", "0x08068e20", null],
  ["set-mon-data", "max-hp", "0x08068e42", "0x0806acae", "0x08068e46", 58],
  ["divide", "attack", "0x08068e68", "0x082e7542", "0x08068e6c", null],
  ["get-nature", "attack", "0x08068e72", "0x0806d072", "0x08068e76", null],
  ["modify-stat-by-nature", "attack", "0x08068e80", "0x0806d8d6", "0x08068e84", null],
  ["set-mon-data", "attack", "0x08068e90", "0x0806acae", "0x08068e94", 59],
  ["divide", "defense", "0x08068eae", "0x082e7542", "0x08068eb2", null],
  ["get-nature", "defense", "0x08068eb8", "0x0806d072", "0x08068ebc", null],
  ["modify-stat-by-nature", "defense", "0x08068ec6", "0x0806d8d6", "0x08068eca", null],
  ["set-mon-data", "defense", "0x08068ed6", "0x0806acae", "0x08068eda", 60],
  ["divide", "speed", "0x08068ef4", "0x082e7542", "0x08068ef8", null],
  ["get-nature", "speed", "0x08068efe", "0x0806d072", "0x08068f02", null],
  ["modify-stat-by-nature", "speed", "0x08068f0c", "0x0806d8d6", "0x08068f10", null],
  ["set-mon-data", "speed", "0x08068f1c", "0x0806acae", "0x08068f20", 61],
  ["divide", "sp-attack", "0x08068f3a", "0x082e7542", "0x08068f3e", null],
  ["get-nature", "sp-attack", "0x08068f44", "0x0806d072", "0x08068f48", null],
  ["modify-stat-by-nature", "sp-attack", "0x08068f52", "0x0806d8d6", "0x08068f56", null],
  ["set-mon-data", "sp-attack", "0x08068f62", "0x0806acae", "0x08068f66", 62],
  ["divide", "sp-defense", "0x08068f80", "0x082e7542", "0x08068f84", null],
  ["get-nature", "sp-defense", "0x08068f8a", "0x0806d072", "0x08068f8e", null],
  ["modify-stat-by-nature", "sp-defense", "0x08068f98", "0x0806d8d6", "0x08068f9c", null],
  ["set-mon-data", "sp-defense", "0x08068fa8", "0x0806acae", "0x08068fac", 63],
  ["set-mon-data", "current-hp", "0x08068ff0", "0x0806acae", "0x08068ff4", 57],
] as const;

const GROWTH_RATE_NAMES = [
  "GROWTH_MEDIUM_FAST",
  "GROWTH_ERRATIC",
  "GROWTH_FLUCTUATING",
  "GROWTH_MEDIUM_SLOW",
  "GROWTH_FAST",
  "GROWTH_SLOW",
] as const;

function expectedLevelLoop(growthRate: number, experience: number): { level: number; cycles: number } {
  const growthName = GROWTH_RATE_NAMES[growthRate];
  if (growthName === undefined) throw new Error(`unknown growth rate ${growthRate}`);
  const table = expTablesData.growthRates[growthName];
  let level = 1;
  let cycles = 4; // initial cmp + untaken/taken bhi
  if (table[level]! > experience) return { level: 0, cycles: cycles + 6 };
  cycles += 2; // preserve the gSpeciesInfo row for the loop
  for (level = 2; ; level += 1) {
    cycles += 6; // increment, MAX_LEVEL compare, and branch instruction
    if (level > 100) {
      cycles += 6; // taken MAX_LEVEL exit
      break;
    }
    // Eight loop halfwords, plus the ROM-byte and ROM-word load premiums.
    cycles += 8 * 2 + (9 - 2) + (11 - 2);
    if (table[level]! > experience) break;
    cycles += 6; // taken back edge
  }
  return { level: level - 1, cycles };
}

function sourceCycles(
  start: number,
  end: number,
  pauses: readonly { entryMasterCycles: number; resumeMasterCycles: number }[],
): number {
  return end - start - pauses.reduce((total, pause) => (
    start <= pause.entryMasterCycles && pause.resumeMasterCycles <= end
      ? total + pause.resumeMasterCycles - pause.entryMasterCycles
      : total
  ), 0);
}

function afterPc(pc: string): string {
  return `0x${(Number.parseInt(pc, 16) + 2).toString(16).padStart(8, "0")}`;
}

describe("Factory CalculateMonStats v1 source-call receipt", () => {
  it("pins the source and pinned ELF bodies that compose GetSubstruct's %24 helper", () => {
    const getSubstructSource = REFERENCE_POKEMON_SOURCE.slice(
      REFERENCE_POKEMON_SOURCE.indexOf("static union PokemonSubstruct *GetSubstruct"),
      REFERENCE_POKEMON_SOURCE.indexOf("/* GameFreak called GetMonData", REFERENCE_POKEMON_SOURCE.indexOf("static union PokemonSubstruct *GetSubstruct")),
    );
    const getBoxSource = REFERENCE_POKEMON_SOURCE.slice(
      REFERENCE_POKEMON_SOURCE.indexOf("u32 GetBoxMonData3"),
      REFERENCE_POKEMON_SOURCE.indexOf("switch (field)", REFERENCE_POKEMON_SOURCE.indexOf("u32 GetBoxMonData3")),
    );
    const checksumSource = REFERENCE_POKEMON_SOURCE.slice(
      REFERENCE_POKEMON_SOURCE.indexOf("static u16 CalculateBoxMonChecksum"),
      REFERENCE_POKEMON_SOURCE.indexOf("#define CALC_STAT", REFERENCE_POKEMON_SOURCE.indexOf("static u16 CalculateBoxMonChecksum")),
    );

    expect(getSubstructSource).toContain("switch (personality % 24)");
    expect([...getSubstructSource.matchAll(/SUBSTRUCT_CASE\(\s*(\d+),/g)].map((match) => Number.parseInt(match[1]!, 10)))
      .toEqual(Array.from({ length: 24 }, (_, index) => index));
    expect(sourceGetSubstructTypes(getBoxSource)).toEqual([0, 1, 2, 3]);
    expect(sourceGetSubstructTypes(checksumSource)).toEqual([0, 1, 2, 3]);
    expect(REFERENCE_POKEMON_SOURCE).toContain(
      'GetBoxMonData2(struct BoxPokemon *boxMon, s32 field) __attribute__((alias("GetBoxMonData3")))',
    );

    // The Thumb-bit symbol records pin the actual libgcc body and the two
    // source aliases/callees, independently of the fixed ROM addresses below.
    expect(elfSymbol("__umodsi3")).toEqual({ value: 0x082e_7be1, size: 0xc0 });
    expect(elfSymbol("GetSubstruct")).toEqual({ value: 0x0806_a271, size: 0x2a8 });
    expect(elfSymbol("GetBoxMonData2")).toEqual({ value: 0x0806_a675, size: 0x636 });
    expect(elfSymbol("GetBoxMonData3")).toEqual({ value: 0x0806_a675, size: 0x636 });
    expect(elfSymbol("CalculateBoxMonChecksum")).toEqual({ value: 0x0806_8c79, size: 0x92 });

    // ELF symbol body 0x082e7be0..0x082e7c9f: the full 192-byte __umodsi3.
    expect(createHash("sha256").update(elfRomSlice(0x082e_7be0, 0xc0)).digest("hex"))
      .toBe("dddbf9d8f5abc4af089a4c4397384388199f4fd8b3a85f849d491390975547dd");
    expect(elfRomSlice(0x082e_7be0, 12).toString("hex")).toBe("002958d00123884200d2f746");
    expect(elfRomSlice(0x082e_7bea, 2).toString("hex")).toBe("f746"); // fast mov pc, lr
    expect(elfRomSlice(0x082e_7c64, 4).toString("hex")).toBe("10bcf746");
    expect(elfRomSlice(0x082e_7c92, 4).toString("hex")).toBe("10bcf746");

    // GetSubstruct's actual BL / caller-resume / function-return boundaries.
    expect(createHash("sha256").update(elfRomSlice(0x0806_a270, 0x2a8)).digest("hex"))
      .toBe("97c515558a8662fe5c687e94a21d95200e17ea3d60100df0a320942b8c4001bf");
    expect(elfRomSlice(0x0806_a27e, 4).toString("hex")).toBe("7df2affc");
    expect(elfRomSlice(0x0806_a282, 16).toString("hex")).toBe("172800d943e180000249401800688746");
    expect(elfRomSlice(0x0806_a510, 8).toString("hex")).toBe("301c70bc02bc0847");
    // The outer encrypted route and CalculateBoxMonChecksum have their own
    // four-call sequences; no field-tail choice changes this source fact.
    expect(createHash("sha256").update(elfRomSlice(0x0806_a674, 0x636)).digest("hex"))
      .toBe("15b645bab474931b2cb3182f9b4fc9155d0fc92a1039272dd67117de2e50adee");
    expect(createHash("sha256").update(elfRomSlice(0x0806_8c78, 0x92)).digest("hex"))
      .toBe("bf7ab7d1337d4f6b3891d2aefc3f01b75c8d673f50b99d52b2446415d80ba2f0");
  });

  it("source-reduces every compiled personality-modulo-24 GetSubstruct arm and helper path", () => {
    const expectedLayouts = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
      [0, 2, 3, 1], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2],
      [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
      [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2],
      [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 3, 0], [1, 3, 2, 0],
      [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
    ];
    const expectedArmPcs = [
      0x0806_a2f8, 0x0806_a31c, 0x0806_a338, 0x0806_a34e,
      0x0806_a364, 0x0806_a380, 0x0806_a396, 0x0806_a3ac,
      0x0806_a3bc, 0x0806_a3da, 0x0806_a3f2, 0x0806_a402,
      0x0806_a416, 0x0806_a428, 0x0806_a43a, 0x0806_a44c,
      0x0806_a45e, 0x0806_a470, 0x0806_a482, 0x0806_a498,
      0x0806_a4ac, 0x0806_a4ba, 0x0806_a4cc, 0x0806_a4e0,
    ];
    const expectedArmHalfwords = [
      [14, 14, 16, 18], [14, 12, 16, 18], [14, 12, 16, 19], [14, 12, 16, 19],
      [14, 12, 16, 18], [14, 12, 16, 19], [16, 10, 16, 18], [16, 10, 17, 19],
      [16, 10, 16, 19], [16, 10, 16, 19], [16, 10, 17, 19], [15, 10, 15, 19],
      [16, 11, 13, 19], [16, 11, 13, 19], [16, 11, 13, 19], [15, 11, 13, 19],
      [16, 11, 13, 19], [15, 11, 13, 19], [16, 11, 15, 16], [17, 11, 15, 17],
      [16, 11, 16, 17], [15, 11, 15, 17], [17, 11, 15, 17], [15, 11, 15, 15],
    ];
    const expectedArmRefills = [
      [3, 4, 4, 7], [4, 3, 4, 6], [4, 3, 4, 7], [4, 3, 4, 7],
      [4, 3, 4, 6], [4, 3, 4, 7], [4, 2, 5, 7], [5, 2, 5, 7],
      [4, 2, 5, 8], [5, 2, 5, 8], [5, 2, 5, 7], [5, 2, 4, 6],
      [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 2, 5],
      [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 3, 2], [4, 3, 4, 4],
      [4, 3, 4, 3], [4, 3, 3, 3], [4, 3, 4, 4], [3, 3, 4, 3],
    ];
    const expectedArmTargets = [0x0806_a50e, 0x0806_a508, 0x0806_a502, 0x0806_a4fc];

    for (let modulo = 0; modulo < 24; modulo += 1) {
      // Exercise both the minimal representative and a full-width u32 that
      // reaches exactly the same source `% 24` arm without a fixture key.
      const fullU32 = modulo + 24 * Math.floor((0xffff_ffff - modulo) / 24);
      for (const personality of [modulo, fullU32]) {
        const rows = [0, 1, 2, 3].map((substructType) => (
          reduceFactoryGetSubstructTiming(personality, substructType)
        ));
        expect(rows.map((row) => row.personalityModulo24)).toEqual([modulo, modulo, modulo, modulo]);
        expect(rows.map((row) => row.logicalToPhysicalSlots)).toEqual(
          Array(4).fill(expectedLayouts[modulo]),
        );
        expect(rows.map((row) => row.selectedPhysicalSlot)).toEqual(expectedLayouts[modulo]);
        expect(rows.map((row) => row.armPc)).toEqual(Array(4).fill(expectedArmPcs[modulo]));
        expect(rows.map((row) => row.armTargetPc)).toEqual(
          expectedLayouts[modulo].map((physical) => expectedArmTargets[physical]),
        );
        expect(rows.map((row) => row.armSequentialThumbHalfwords)).toEqual(expectedArmHalfwords[modulo]);
        expect(rows.map((row) => row.armPipelineRefills)).toEqual(expectedArmRefills[modulo]);
        expect(rows.every((row) => row.commonNonModuloCycles === 68)).toBe(true);
        expect(rows.every((row) => row.moduloEntryPc === 0x082e_7be0)).toBe(true);
        expect(rows.every((row) => row.moduloCallPc === 0x0806_a27e && row.moduloReturnPc === 0x0806_a282)).toBe(true);
        expect(rows.every((row) => row.moduloCycles > 0 && row.cycles === row.moduloCycles + row.nonModuloCycles)).toBe(true);
        expect(rows.every((row) => row.unresolved === null)).toBe(true);
        expect(rows.map((row) => row.nonModuloCycles)).toEqual(
          expectedArmHalfwords[modulo]!.map((halfwords, index) => (
            68 + halfwords * 2 + expectedArmRefills[modulo]![index]! * 6
          )),
        );
      }
    }

    const fast = reduceFactoryGetSubstructTiming(23, 0);
    const normalized = reduceFactoryGetSubstructTiming(24, 0);
    const correction = reduceFactoryGetSubstructTiming(47, 0);
    const wide = reduceFactoryGetSubstructTiming(0xffff_ffff, 0);
    expect(fast).toMatchObject({
      moduloCycles: 18,
      moduloSequentialThumbHalfwords: 6,
      moduloPipelineRefills: 1,
      moduloRorInternalCycles: 0,
      moduloLoop1Iterations: 0,
      moduloLoop2Iterations: 0,
      moduloLoop3Iterations: 0,
      moduloReturnInstructionPc: 0x082e_7bea,
    });
    expect(normalized).toMatchObject({
      personalityModulo24: 0,
      moduloCycles: 126,
      moduloSequentialThumbHalfwords: 39,
      moduloPipelineRefills: 8,
      moduloRorInternalCycles: 0,
      moduloLoop1Iterations: 1,
      moduloLoop2Iterations: 1,
      moduloLoop3Iterations: 1,
      moduloReturnInstructionPc: 0x082e_7c66,
    });
    expect(correction).toMatchObject({
      personalityModulo24: 23,
      moduloCycles: 290,
      moduloSequentialThumbHalfwords: 106,
      moduloPipelineRefills: 12,
      moduloRorInternalCycles: 6,
      moduloLoop1Iterations: 2,
      moduloLoop2Iterations: 1,
      moduloLoop3Iterations: 2,
      moduloReturnInstructionPc: 0x082e_7c94,
    });
    expect(wide).toMatchObject({
      personalityModulo24: 15,
      moduloCycles: 735,
      moduloSequentialThumbHalfwords: 262,
      moduloPipelineRefills: 34,
      moduloRorInternalCycles: 7,
      moduloLoop1Iterations: 7,
      moduloLoop2Iterations: 4,
      moduloLoop3Iterations: 7,
      moduloReturnInstructionPc: 0x082e_7c66,
    });

    expect(() => reduceFactoryGetSubstructTiming(0, 4)).toThrow("substructType must be a source u8");
    expect(() => reduceFactoryGetSubstructTiming(-1, 0)).toThrow("personality must be a source u32");
  });

  it("source-reduces the shared crypt/checksum instruction and fetch segments", () => {
    expect(reduceFactoryDecryptBoxMonTiming()).toMatchObject({
      kind: "decrypt",
      entryPc: 0x0806_a24c,
      loopPc: 0x0806_a256,
      returnPc: 0x0806_a26e,
      iterations: 12,
      ewramWordReads: 36,
      ewramWordWrites: 24,
      sequentialThumbHalfwords: 128,
      pipelineRefills: 12,
      instructionFetchCycles: 328,
      dataAccessCycles: 240,
      dataAccessPremiumCycles: 120,
      cycles: 448,
      unresolved: null,
    });
    expect(reduceFactoryEncryptBoxMonTiming()).toMatchObject({
      kind: "encrypt",
      entryPc: 0x0806_a228,
      loopPc: 0x0806_a232,
      returnPc: 0x0806_a24a,
      iterations: 12,
      ewramWordReads: 36,
      ewramWordWrites: 24,
      sequentialThumbHalfwords: 128,
      pipelineRefills: 12,
      instructionFetchCycles: 328,
      dataAccessCycles: 240,
      dataAccessPremiumCycles: 120,
      cycles: 448,
      unresolved: null,
    });
    expect(reduceFactoryChecksumLoopTiming()).toMatchObject({
      entryPc: 0x0806_8c78,
      firstLoopSetupPc: 0x0806_8cb0,
      firstReadPc: 0x0806_8cb2,
      afterLoopPc: 0x0806_8cfe,
      substructCount: 4,
      halfwordsPerSubstruct: 6,
      checksumHalfwordReads: 24,
      sequentialThumbHalfwords: 199,
      pipelineRefills: 20,
      instructionFetchCycles: 518,
      ewramHalfwordReadCycles: 48,
      ewramReadPremiumCycles: 0,
      cycles: 518,
      unresolved: null,
    });

    const v2 = ["anchor", "liliana", "factory-varied"].map((name) => (
      JSON.parse(readFileSync(`tests/fixtures/factory-construction-cycle-v2/${name}.json`, "utf8")) as {
        oracleProfile: string;
        totals: { construction: number; ambient: number; total: number };
        cycleEvidence: { events: Array<{ resumeFunction?: string }> };
      }
    ));
    expect(v2.every((receipt) => receipt.oracleProfile === "battle-scene-off")).toBe(true);
    expect(v2.map((receipt) => receipt.totals)).toEqual([
      { construction: 242, ambient: 52, total: 294 },
      { construction: 112, ambient: 31, total: 143 },
      { construction: 202, ambient: 30, total: 232 },
    ]);
    const resumed = v2.flatMap((receipt) => receipt.cycleEvidence.events)
      .map((event) => event.resumeFunction ?? "");
    expect(resumed.some((name) => name.startsWith("DecryptBoxMon+"))).toBe(true);
    expect(resumed.some((name) => name.startsWith("EncryptBoxMon+"))).toBe(true);
    expect(resumed.some((name) => name.startsWith("CalculateBoxMonChecksum+"))).toBe(true);
    expect(resumed.some((name) => name.startsWith("GetSubstruct+"))).toBe(true);
  });

  it("reduces every aligned EWRAM access width used by the encrypted route and rejects unproved misalignment", () => {
    expect(reduceFactoryEwramAccessTiming({ access: "read", width: 1, address: 0x0200_0023 })).toEqual({
      region: "ewram", access: "read", width: 1, address: 0x0200_0023,
      alignment: 1, transfers: 1, busWidth: 2, cycles: 2,
      instructionBaselineCycles: 2, busPremiumCycles: 0, unresolved: null,
    });
    expect(reduceFactoryEwramAccessTiming({ access: "read", width: 2, address: 0x0200_0024 })).toMatchObject({
      alignment: 2, transfers: 1, cycles: 2, busPremiumCycles: 0, unresolved: null,
    });
    expect(reduceFactoryEwramAccessTiming({ access: "read", width: 4, address: 0x0200_0024 })).toMatchObject({
      alignment: 4, transfers: 2, cycles: 4, busPremiumCycles: 2, unresolved: null,
    });
    expect(reduceFactoryEwramAccessTiming({ access: "write", width: 4, address: 0x0203_fffc })).toMatchObject({
      access: "write", alignment: 4, transfers: 2, cycles: 4, busPremiumCycles: 2,
    });
    expect(() => reduceFactoryEwramAccessTiming({ access: "read", width: 2, address: 0x0200_0023 }))
      .toThrow("misaligned EWRAM halfword behavior is not claimed");
    expect(() => reduceFactoryEwramAccessTiming({ access: "read", width: 4, address: 0x0200_0022 }))
      .toThrow("misaligned EWRAM word behavior is not claimed");
    expect(() => reduceFactoryEwramAccessTiming({ access: "read", width: 1, address: 0x0300_0000 }))
      .toThrow("address must be in retail EWRAM");
  });

  it("pins the compact Scene-OFF EWRAM instruction and whole-component boundaries", () => {
    const bytes = readFileSync("tests/fixtures/factory-ewram-access-boundaries-v1/anchor.json");
    const receipt = JSON.parse(bytes.toString("utf8")) as {
      schema: string;
      oracleProfile: string;
      components: Array<{ kind: string; entryPc: string; cleanCycles: number }>;
      rows: Array<{
        label: string; instructionPc: string; observedPc: string;
        access: string; width: number; addressModulo4: number; cleanCycles: number;
      }>;
    };
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe("bff98549ef1bf901be467b04341c8d1132550754e58f9f10ed5f262c1c28ee92");
    expect(receipt).toMatchObject({
      schema: "factory-ewram-access-boundaries/v1",
      oracleProfile: "battle-scene-off",
      components: [
        { kind: "checksum-loop", entryPc: "0x08068cb0", cleanCycles: 518 },
        { kind: "decrypt-loop", entryPc: "0x0806a24c", cleanCycles: 448 },
        { kind: "encrypt-loop", entryPc: "0x0806a228", cleanCycles: 448 },
      ],
    });
    expect(new Set(receipt.rows.map((row) => row.width))).toEqual(new Set([1, 2, 4]));
    expect(receipt.rows.every((row) => row.addressModulo4 % Math.min(row.width, 4) === 0
      || row.width === 1)).toBe(true);
    expect(receipt.rows.find((row) => row.label === "experience-word-read")).toMatchObject({
      instructionPc: "0x0806a97e", observedPc: "0x0806a980",
      access: "read", width: 4, addressModulo4: 0,
    });
    expect(receipt.rows.find((row) => row.label === "species-bad-egg-byte-read")).toMatchObject({
      instructionPc: "0x0806a960", access: "read", width: 1, addressModulo4: 3,
    });
  });

  it("censuses the shared encrypted accessor route without claiming a total", () => {
    const rows = probes.flatMap(({ value }) => value.mons.flatMap((mon) => {
      const directFields = value.directCalls
        .filter((call) => call.monIndex === mon.monIndex && call.operation === "get-mon-data")
        .map((call) => call.arguments.field!)
        .filter((field) => ![57, 58].includes(field));
      return [...directFields, 11, 25].map((field) => (
        censusFactoryGetBoxMonDataDependency({
          field,
          personality: mon.acceptedPersonality,
          checksumValid: true,
          isBadEgg: false,
        })
      ));
    }));

    expect(rows).toHaveLength(180);
    expect(rows.filter((row) => row.fieldGroup === "species")).toHaveLength(24);
    expect(rows.filter((row) => row.fieldGroup === "experience")).toHaveLength(12);
    expect(rows.filter((row) => row.fieldGroup === "ev-byte")).toHaveLength(72);
    expect(rows.filter((row) => row.fieldGroup === "iv-bitfield")).toHaveLength(72);
    expect(new Set(rows.map((row) => row.personalityModulo24))).toEqual(
      new Set([2, 3, 5, 6, 7, 10, 18, 19, 20]),
    );
    expect(rows.every((row) => row.getSubstructCalls === 8)).toBe(true);
    expect(rows.every((row) => row.decryptIterations === 12)).toBe(true);
    expect(rows.every((row) => row.checksumHalfwordReads === 24)).toBe(true);
    expect(rows.every((row) => row.encryptIterations === 12)).toBe(true);
    expect(rows.every((row) => row.sharedInstructionFetchCycles === 1_174)).toBe(true);
    expect(rows.every((row) => row.selectedSubstructTiming.cycles !== null)).toBe(true);
    expect(rows.every((row) => row.getSubstructTypes.join(",") === "0,1,2,3,0,1,2,3")).toBe(true);
    expect(rows.every((row) => row.getSubstructTimings.map((timing) => timing.substructType).join(",") === "0,1,2,3,0,1,2,3")).toBe(true);
    expect(rows.every((row) => row.getSubstructCycles === row.getSubstructTimings
      .reduce((total, timing) => total + timing.cycles, 0))).toBe(true);
    expect(rows.every((row) => row.composedInstructionFetchCycles === row.sharedInstructionFetchCycles + row.getSubstructCycles)).toBe(true);
    expect(rows.every((row) => row.decryptLoopTiming.instructionFetchCycles === 328)).toBe(true);
    expect(rows.every((row) => row.checksumLoopTiming.instructionFetchCycles === 518)).toBe(true);
    expect(rows.every((row) => row.encryptLoopTiming.instructionFetchCycles === 328)).toBe(true);
    expect(rows.every((row) => row.decryptLoopTiming.cycles === 448)).toBe(true);
    expect(rows.every((row) => row.checksumLoopTiming.cycles === 518)).toBe(true);
    expect(rows.every((row) => row.encryptLoopTiming.cycles === 448)).toBe(true);
    expect(rows.every((row) => row.sharedDataBusCycles === 528)).toBe(true);
    expect(rows.every((row) => row.sharedDataBusPremiumCycles === 240)).toBe(true);
    expect(rows.every((row) => row.tailCycles === row.checksumTailTiming.cycles + row.fieldTailTiming.cycles)).toBe(true);
    expect(rows.every((row) => row.outerShellTiming.cycles === 314)).toBe(true);
    expect(rows.every((row) => row.composedKnownCycles === row.getSubstructCycles
      + row.decryptLoopTiming.cycles + row.checksumLoopTiming.cycles
      + row.encryptLoopTiming.cycles + row.tailCycles)).toBe(true);
    expect(rows.every((row) => row.composedSynchronousKnownCycles
      === row.composedKnownCycles + row.outerShellTiming.cycles)).toBe(true);
    expect(rows.every((row) => row.cycles === null && row.unresolved !== null)).toBe(true);
    expect(rows.every((row) => JSON.stringify(row.boundaries) === JSON.stringify({
      symbolEntryPc: 0x0806_a674,
      probeEntryPc: 0x0806_a676,
      firstGetSubstructCallPc: 0x0806_a698,
      decryptCallPc: 0x0806_a6c6,
      checksumCallPc: 0x0806_a6cc,
      dispatchPc: 0x0806_a6f2,
      commonTailPc: 0x0806_ac8c,
      encryptCallPc: 0x0806_ac94,
      returnTailPc: 0x0806_ac98,
      getSubstructSymbolEntryPc: 0x0806_a270,
      moduloCallPc: 0x0806_a27e,
      moduloReturnPc: 0x0806_a282,
      getSubstructDispatchPc: 0x0806_a288,
      getSubstructReturnPc: 0x0806_a510,
      decryptLoopPc: 0x0806_a256,
      checksumLoopPc: 0x0806_8cb2,
      encryptLoopPc: 0x0806_a232,
    }))).toBe(true);

    // The source's outer encrypted setup and nested checksum each call every
    // type once. This is a function-only subtotal: it intentionally excludes
    // their EWRAM loads, crypt/checksum data bus work, field tail, +18, and IRQ.
    const representative = censusFactoryGetBoxMonDataDependency({
      field: 39,
      personality: 0xffff_ffff,
      checksumValid: true,
      isBadEgg: false,
    });
    expect(representative.getSubstructTypes).toEqual([0, 1, 2, 3, 0, 1, 2, 3]);
    expect(representative.getSubstructTimings.map((timing) => timing.cycles)).toEqual(
      [0, 1, 2, 3, 0, 1, 2, 3].map((type) => reduceFactoryGetSubstructTiming(0xffff_ffff, type).cycles),
    );
    expect(representative.getSubstructCycles).toBe(
      representative.getSubstructTimings.reduce((total, timing) => total + timing.cycles, 0),
    );
    expect(representative.getSubstructCycles).toBe(6_824);
    expect(representative.composedInstructionFetchCycles).toBe(
      representative.getSubstructCycles + 1_174,
    );
    expect(representative.composedInstructionFetchCycles).toBe(7_998);
    expect(representative.composedSynchronousKnownCycles)
      .toBe(representative.composedKnownCycles + 314);
    expect(representative.cycles).toBeNull();
  });

  it("source-reduces the synchronous GetBoxMonData2 and checksum-function shells without nested double counting", () => {
    const timing = reduceFactoryGetBoxMonDataOuterShellTiming({ field: 42 });
    expect(timing).toMatchObject({
      field: 42,
      fieldDispatchTargetPc: 0x0806_aa0e,
      mainAccessorCycles: 216,
      checksumFunctionShellCycles: 98,
      cycles: 314,
      excludedNestedCalls: {
        getSubstruct: 8,
        decryptBoxMon: 1,
        checksumLoop: 1,
        encryptBoxMon: 1,
      },
      unresolved: null,
    });
    expect(timing.segments).toEqual([
      {
        name: "accessor-prologue",
        entryPc: 0x0806_a674,
        endPc: 0x0806_a694,
        sequentialThumbHalfwords: 16,
        pipelineRefills: 0,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        ewramWordReads: 0,
        ewramDataAccessCycles: 0,
        ewramDataAccessPremiumCycles: 0,
        cycles: 32,
      },
      {
        name: "accessor-secure-setup-and-calls",
        entryPc: 0x0806_a694,
        endPc: 0x0806_a6d0,
        sequentialThumbHalfwords: 30,
        pipelineRefills: 6,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        ewramWordReads: 4,
        ewramDataAccessCycles: 16,
        ewramDataAccessPremiumCycles: 0,
        cycles: 96,
      },
      {
        name: "checksum-function-setup-and-calls",
        entryPc: 0x0806_8c78,
        endPc: 0x0806_8cb0,
        sequentialThumbHalfwords: 28,
        pipelineRefills: 4,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        ewramWordReads: 4,
        ewramDataAccessCycles: 16,
        ewramDataAccessPremiumCycles: 0,
        cycles: 80,
      },
      {
        name: "checksum-function-return",
        entryPc: 0x0806_8cfe,
        endPc: 0x0806_8d0a,
        sequentialThumbHalfwords: 6,
        pipelineRefills: 1,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        ewramWordReads: 0,
        ewramDataAccessCycles: 0,
        ewramDataAccessPremiumCycles: 0,
        cycles: 18,
      },
      {
        name: "accessor-field-dispatch",
        entryPc: 0x0806_a6f2,
        endPc: 0x0806_a704,
        sequentialThumbHalfwords: 8,
        pipelineRefills: 2,
        romLiteralLoads: 1,
        romJumpTableLoads: 1,
        ewramWordReads: 0,
        ewramDataAccessCycles: 0,
        ewramDataAccessPremiumCycles: 0,
        cycles: 46,
      },
      {
        name: "accessor-encrypt-and-return",
        entryPc: 0x0806_ac8c,
        endPc: 0x0806_acaa,
        sequentialThumbHalfwords: 15,
        pipelineRefills: 2,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        ewramWordReads: 0,
        ewramDataAccessCycles: 0,
        ewramDataAccessPremiumCycles: 0,
        cycles: 42,
      },
    ]);

    expect(createHash("sha256").update(elfRomSlice(0x0806_a674, 0x20)).digest("hex"))
      .toBe("79c2bd4cd471521c6d230c61a0a4259d9a6c78d87ef04ca143745de59127138c");
    expect(createHash("sha256").update(elfRomSlice(0x0806_a694, 0x3c)).digest("hex"))
      .toBe("53ef19600682b9a798c5125131f4c27c7e1e20c29f55f8ecd28d8b6c59368ebd");
    expect(elfRomSlice(0x0806_a6f2, 0x12).toString("hex"))
      .toBe("0098532800d9c8e280000149401800688746");
    expect(createHash("sha256").update(elfRomSlice(0x0806_8c78, 0x38)).digest("hex"))
      .toBe("0372c3d6c5bd15f4d2ed3393276fc6ba1c2f1d4c3d7f97cb70c71ac1dfaa8711");
    expect(elfRomSlice(0x0806_8cfe, 0x0c).toString("hex"))
      .toBe("301c08bc9846f0bc02bc0847");
    expect(createHash("sha256").update(elfRomSlice(0x0806_ac8c, 0x1e)).digest("hex"))
      .toBe("d10a689a48cba191db3ec99fe5b48559770ce5e27e23b43d0546465bb743ce95");
  });

  it("matches clean OFF stats-accessor boundaries and leaves every external class unabsorbed", () => {
    let checked = 0;
    const residuals: number[] = [];
    for (const { value } of probes) {
      const personalities = new Map(value.mons.map((mon) => [mon.monIndex, mon.acceptedPersonality]));
      for (const call of value.directCalls.filter((row) => (
        row.operation === "get-mon-data" && ![57, 58].includes(row.arguments.field!)
      ))) {
        const personality = personalities.get(call.monIndex);
        if (personality === undefined) throw new Error(`missing accepted personality for mon ${call.monIndex}`);
        const dependency = censusFactoryGetBoxMonDataDependency({
          field: call.arguments.field!, personality, checksumValid: true, isBadEgg: false,
        });
        const outer = reduceFactoryGetMonDataTiming({ field: call.arguments.field! });
        if (outer.preDelegateCycles === null || outer.returnShellCycles === null) {
          throw new Error(`missing GetMonData shell for field ${call.arguments.field}`);
        }
        const measured = sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        );
        const knownSourceOnly = outer.preDelegateCycles
          + dependency.composedSynchronousKnownCycles
          + outer.returnShellCycles;
        residuals.push(measured - knownSourceOnly);
        expect(dependency.cycles).toBeNull();
        checked += 1;
      }
    }
    expect(checked).toBe(156);
    expect([...new Map(residuals.map((cycles) => [
      cycles, residuals.filter((value) => value === cycles).length,
    ])).entries()].sort((left, right) => left[0] - right[0])).toEqual([
      [0, 77], [18, 67], [117, 5], [245, 6], [263, 1],
    ]);
    expect(residuals.filter((cycles) => cycles === 0)).toHaveLength(77);
  });

  it("derives all modulo-24 GetSubstruct layouts and receipt field extraction tails", () => {
    const expectedLayouts = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
      [0, 2, 3, 1], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2],
      [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
      [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2],
      [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 3, 0], [1, 3, 2, 0],
      [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
    ];
    const expectedArmPcs = [
      0x0806_a2f8, 0x0806_a31c, 0x0806_a338, 0x0806_a34e,
      0x0806_a364, 0x0806_a380, 0x0806_a396, 0x0806_a3ac,
      0x0806_a3bc, 0x0806_a3da, 0x0806_a3f2, 0x0806_a402,
      0x0806_a416, 0x0806_a428, 0x0806_a43a, 0x0806_a44c,
      0x0806_a45e, 0x0806_a470, 0x0806_a482, 0x0806_a498,
      0x0806_a4ac, 0x0806_a4ba, 0x0806_a4cc, 0x0806_a4e0,
    ];
    expect(expectedLayouts.map((_, personality) => (
      censusFactoryGetBoxMonDataDependency({
        field: 11,
        personality,
        checksumValid: true,
        isBadEgg: false,
      }).logicalToPhysicalSlots
    ))).toEqual(expectedLayouts);
    expect(expectedArmPcs.map((_, personality) => (
      censusFactoryGetBoxMonDataDependency({
        field: 11, personality, checksumValid: true, isBadEgg: false,
      }).getSubstructModuloArmPc
    ))).toEqual(expectedArmPcs);
    for (let personality = 0; personality < expectedLayouts.length; personality += 1) {
      for (const [field, logicalSubstruct] of [[11, 0], [25, 0], [26, 2], [39, 3]] as const) {
        const dependency = censusFactoryGetBoxMonDataDependency({
          field, personality, checksumValid: true, isBadEgg: false,
        });
        const selectedPhysicalSlot = expectedLayouts[personality]![logicalSubstruct]!;
        expect(dependency.selectedPhysicalSlot).toBe(selectedPhysicalSlot);
        expect(dependency.secureStorageOffset).toBe(0x20 + selectedPhysicalSlot * 12);
      }
    }
    expect(censusFactoryGetBoxMonDataDependency({
      field: 11, personality: 0, checksumValid: true, isBadEgg: false,
    }).commonFetchClasses).toEqual([
      "rom-thumb-sequential", "rom-literal-u32", "rom-jump-table-u32",
      "ewram-u8", "ewram-u16", "ewram-u32-on-16-bit-bus",
    ]);

    const expectedTails = new Map<number, [number, string, number]>([
      [11, [0x0806_a95e, "ewram-u16-conditional", 0]],
      [25, [0x0806_a97c, "ewram-u32", 0]],
      [26, [0x0806_a9a4, "ewram-u8", 2]], [27, [0x0806_a9a8, "ewram-u8", 2]],
      [28, [0x0806_a9ac, "ewram-u8", 2]], [29, [0x0806_a9b0, "ewram-u8", 2]],
      [30, [0x0806_a9b4, "ewram-u8", 2]], [31, [0x0806_a9b8, "ewram-u8", 2]],
      [39, [0x0806_a9f6, "ewram-u8-bitfield", 3]], [40, [0x0806_a9fe, "ewram-u16-bitfield", 3]],
      [41, [0x0806_aa06, "ewram-u8-bitfield", 3]], [42, [0x0806_aa0e, "ewram-u32-bitfield", 3]],
      [43, [0x0806_aa16, "ewram-u16-bitfield", 3]], [44, [0x0806_aa1e, "ewram-u8-bitfield", 3]],
    ]);
    for (const [field, [tailEntryPc, fetchClass, logicalSubstruct]] of expectedTails) {
      const row = censusFactoryGetBoxMonDataDependency({
        field,
        personality: 23,
        checksumValid: true,
        isBadEgg: false,
      });
      expect(row).toMatchObject({ tailEntryPc, fetchClass, logicalSubstruct });
      expect(row.fieldTailTiming).toMatchObject({ entryPc: tailEntryPc, commonTailPc: 0x0806_ac8c });
    }

    const expectedFieldTails = new Map<number, [string, number, number, number, number]>([
      [11, ["species", 11, 2, 4, 34]],
      [25, ["experience", 3, 1, 4, 12]],
      [26, ["ev-byte", 2, 1, 2, 10]], [27, ["ev-byte", 2, 1, 2, 10]],
      [28, ["ev-byte", 2, 1, 2, 10]], [29, ["ev-byte", 2, 1, 2, 10]],
      [30, ["ev-byte", 2, 1, 2, 10]], [31, ["ev-byte", 2, 1, 2, 10]],
      [39, ["iv-bitfield", 4, 1, 2, 14]], [40, ["iv-bitfield", 4, 1, 2, 14]],
      [41, ["iv-bitfield", 4, 1, 2, 14]], [42, ["iv-bitfield", 4, 1, 4, 14]],
      [43, ["iv-bitfield", 4, 1, 2, 14]], [44, ["iv-bitfield", 4, 1, 2, 14]],
    ]);
    for (const [field, [route, halfwords, refills, busCycles, cycles]] of expectedFieldTails) {
      expect(censusFactoryGetBoxMonDataDependency({
        field, personality: 0xffff_ffff, checksumValid: true, isBadEgg: false,
      }).fieldTailTiming).toMatchObject({
        route, sequentialThumbHalfwords: halfwords, pipelineRefills: refills,
        dataAccessCycles: busCycles, dataAccessPremiumCycles: 0,
        cycles, unresolved: null,
      });
    }

    expect(censusFactoryGetBoxMonDataDependency({
      field: 11, personality: 0, checksumValid: false, isBadEgg: false,
    })).toMatchObject({
      checksumRoute: "invalid-marks-bad-egg",
      speciesTailRoute: "bad-egg-species",
      checksumTailTiming: {
        route: "invalid-marks-bad-egg", entryPc: 0x0806_a6d0, dispatchPc: 0x0806_a6f2,
        sequentialThumbHalfwords: 17, pipelineRefills: 0,
        halfwordReads: 1, byteReads: 2, byteWrites: 2,
        dataAccessCycles: 10, cycles: 34, unresolved: null,
      },
      fieldTailTiming: {
        route: "bad-egg-species", entryPc: 0x0806_a95e, commonTailPc: 0x0806_ac8c,
        sequentialThumbHalfwords: 9, pipelineRefills: 1,
        byteReads: 1, halfwordReads: 0, wordReads: 0,
        dataAccessCycles: 2, cycles: 24, unresolved: null,
      },
      cycles: null,
    });
    const preexistingBadEgg = censusFactoryGetBoxMonDataDependency({
      field: 11, personality: 0, checksumValid: true, isBadEgg: true,
    });
    expect(preexistingBadEgg.speciesTailRoute).toBe("bad-egg-species");
    expect(preexistingBadEgg.checksumTailTiming).toMatchObject({
      route: "valid", sequentialThumbHalfwords: 6, pipelineRefills: 1,
      halfwordReads: 1, dataAccessCycles: 2, cycles: 18,
    });
    expect(preexistingBadEgg.fieldTailTiming).toMatchObject({
      route: "bad-egg-species", sequentialThumbHalfwords: 9,
      pipelineRefills: 1, dataAccessCycles: 2, cycles: 24,
    });
    expect(censusFactoryGetBoxMonDataDependency({
      field: 26, personality: 1, checksumValid: false, isBadEgg: false,
    })).toMatchObject({
      checksumTailTiming: { route: "invalid-marks-bad-egg", cycles: 34 },
      fieldTailTiming: { route: "ev-byte", cycles: 10 },
    });
    expect(() => censusFactoryGetBoxMonDataDependency({
      field: 24, personality: 0, checksumValid: true, isBadEgg: false,
    })).toThrow("outside the CalculateMonStats/GetLevelFromMonExp encrypted subset");
  });

  it("covers every receipt field across all 24 personality routes and both checksum outcomes", () => {
    const fields = [11, 25, 26, 27, 28, 29, 30, 31, 39, 40, 41, 42, 43, 44] as const;
    const rows = Array.from({ length: 24 }, (_, personality) => fields.flatMap((field) => [
      censusFactoryGetBoxMonDataDependency({
        field, personality, checksumValid: true, isBadEgg: false,
      }),
      censusFactoryGetBoxMonDataDependency({
        field, personality, checksumValid: false, isBadEgg: false,
      }),
    ])).flat();
    expect(rows).toHaveLength(24 * fields.length * 2);
    expect(new Set(rows.map((row) => row.personalityModulo24))).toEqual(new Set(
      Array.from({ length: 24 }, (_, index) => index),
    ));
    expect(rows.filter((row) => row.checksumRoute === "valid")).toHaveLength(24 * fields.length);
    expect(rows.filter((row) => row.checksumRoute === "invalid-marks-bad-egg"))
      .toHaveLength(24 * fields.length);
    expect(rows.filter((row) => row.speciesTailRoute === "species")).toHaveLength(24);
    expect(rows.filter((row) => row.speciesTailRoute === "bad-egg-species")).toHaveLength(24);
    expect(rows.every((row) => row.outerShellTiming.field === row.field)).toBe(true);
    expect(rows.every((row) => row.outerShellTiming.excludedNestedCalls.getSubstruct === 8)).toBe(true);
    expect(rows.every((row) => row.cycles === null)).toBe(true);

    const preexistingBadEggRoutes = Array.from({ length: 24 }, (_, personality) => (
      censusFactoryGetBoxMonDataDependency({
        field: 11, personality, checksumValid: true, isBadEgg: true,
      }).speciesTailRoute
    ));
    expect(preexistingBadEggRoutes).toEqual(Array(24).fill("bad-egg-species"));
  });
  it("is three fresh, byte-stable Scene-OFF packets", () => {
    for (const { expected, bytes, value } of probes) {
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(expected.hash);
      expect(bytes.toString("utf8")).toBe(`${JSON.stringify(value, null, 2)}\n`);
      expect(value.schema).toBe("factory-calculate-mon-stats-direct-calls/v1");
      expect(value.oracleProfile).toBe("battle-scene-off");
      expect(value.directCalls).toHaveLength(value.mons.length * DIRECT_CALL_SHAPE.length);
    }
  });

  it("pins all twelve complete boundaries, their VBlank pauses, and the direct-call residual", () => {
    for (const { expected, value } of probes) {
      const whole: number[] = [];
      const direct: number[] = [];
      const residual: number[] = [];
      const pauses: number[] = [];

      for (const span of value.spans) {
        const contained = value.interruptPauses.filter((pause) => (
          span.entryMasterCycles <= pause.entryMasterCycles
          && pause.resumeMasterCycles <= span.returnMasterCycles
        ));
        const rows = value.directCalls.filter((call) => call.monIndex === span.monIndex);
        const source = sourceCycles(
          span.entryMasterCycles,
          span.returnMasterCycles,
          value.interruptPauses,
        );
        const calls = rows.reduce((total, call) => (
          total + sourceCycles(call.entryMasterCycles, call.returnMasterCycles, value.interruptPauses)
        ), 0);
        whole.push(source);
        direct.push(calls);
        residual.push(source - calls);
        pauses.push(contained.reduce((total, pause) => (
          total + pause.resumeMasterCycles - pause.entryMasterCycles
        ), 0));
        expect([span.entryPc, span.returnPc]).toEqual(["0x08068d0e", "0x080686ec"]);
      }

      expect(whole).toEqual(expected.sourceCycles);
      expect(direct).toEqual(expected.directCycles);
      expect(residual).toEqual(expected.interstitialCycles);
      expect(pauses).toEqual(expected.pauses);
    }
  });

  it("captures the compiled direct-call order and all observed source branch inputs", () => {
    for (const { value } of probes) {
      for (const mon of value.mons) {
        const rows = value.directCalls.filter((call) => call.monIndex === mon.monIndex);
        expect(rows.map((call) => [
          call.operation,
          call.target,
          call.callPc,
          call.entryPc,
          call.returnPc,
          call.arguments.field ?? null,
        ])).toEqual(DIRECT_CALL_SHAPE);
        expect(rows.map((call) => call.returnPcObserved)).toEqual(rows.map((call) => afterPc(call.returnPc)));

        const divides = rows.filter((call) => call.operation === "divide");
        expect(divides.map((call) => call.arguments.divisor)).toEqual([100, 100, 100, 100, 100, 100]);
        expect(divides.every((call) => call.arguments.dividend! > 0 && call.result !== undefined)).toBe(true);

        const natures = rows.filter((call) => call.operation === "get-nature");
        expect(natures.map((call) => call.result)).toEqual(Array(5).fill(mon.acceptedPersonality % 25));
        const modifications = rows.filter((call) => call.operation === "modify-stat-by-nature");
        expect(modifications.map((call) => call.arguments.nature)).toEqual(Array(5).fill(mon.acceptedPersonality % 25));
        expect(modifications.map((call) => call.arguments.statIndex)).toEqual([1, 2, 3, 4, 5]);
      }
    }
  });

  it("pins all twelve level source states and the exact post-accessor loop boundary", () => {
    const residuals: number[] = [];
    const sourceStates: Array<[number, number, number]> = [];
    const services: string[][] = [];

    for (const { value } of probes) {
      for (const mon of value.mons) {
        const call = value.directCalls.find((row) => (
          row.monIndex === mon.monIndex && row.operation === "get-level-from-exp"
        ));
        if (call?.boundaries === undefined || call.result === undefined) {
          throw new Error(`missing level evidence for ${value.case} mon ${mon.monIndex}`);
        }
        expect(call.arguments.personality).toBe(mon.acceptedPersonality);
        const speciesCall = value.directCalls.find((row) => (
          row.monIndex === mon.monIndex && row.operation === "get-mon-data" && row.target === "species"
        ));
        expect(call.arguments.species).toBe(speciesCall?.result);

        const expected = expectedLevelLoop(call.arguments.growthRate!, call.arguments.experience!);
        expect(call.result).toBe(expected.level);
        expect(call.boundaries.speciesAccessorReturn.pc).toBe("0x08069062");
        expect(call.boundaries.experienceAccessorReturn.pc).toBe("0x08069072");
        expect(call.boundaries.growthRateLoaded.pc).toBe("0x08069084");
        expect(call.boundaries.firstLevelCompare.pc).toBe("0x08069090");
        expect(call.boundaries.loopExit.pc).toBe("0x080690ac");
        expect(call.boundaries.growthRateLoaded.masterCycles
          - call.boundaries.experienceAccessorReturn.masterCycles).toBe(43);
        expect(call.boundaries.firstLevelCompare.masterCycles
          - call.boundaries.growthRateLoaded.masterCycles).toBe(21);
        expect(call.returnMasterCycles - call.boundaries.loopExit.masterCycles).toBe(18);

        const measuredLoop = call.boundaries.loopExit.masterCycles
          - call.boundaries.firstLevelCompare.masterCycles;
        residuals.push(measuredLoop - expected.cycles);
        sourceStates.push([
          call.arguments.species!,
          call.arguments.growthRate!,
          call.arguments.experience!,
        ]);
        services.push((call.asyncService ?? []).map((row) => row.kind));
      }
    }

    expect(sourceStates).toEqual([
      [95, 0, 125_000], [240, 0, 125_000], [153, 3, 117_360],
      [12, 0, 125_000], [93, 3, 117_360], [156, 3, 117_360],
      [64, 3, 117_360], [313, 2, 142_500], [299, 3, 117_360],
      [143, 5, 156_250], [131, 5, 156_250], [136, 0, 125_000],
    ]);
    expect(residuals.filter((cycles) => cycles === 0)).toHaveLength(8);
    expect(residuals.filter((cycles) => cycles === 18)).toHaveLength(3);
    expect(residuals.filter((cycles) => cycles === 308)).toHaveLength(1);
    expect(services.filter((rows) => rows.length === 0)).toHaveLength(11);
    expect(services.filter((rows) => rows.length !== 0)).toEqual([[
      "get-level-vcount-entry",
      "get-level-m4a-sound-vsync-entry",
      "get-level-vcount-return",
    ]]);
  });

  it("censuses all 180 GetMonData2 calls by source field and compiled route", () => {
    const census = new Map<number, { count: number; route: string; target: string }>();

    for (const { value } of probes) {
      for (const call of value.directCalls.filter((row) => row.operation === "get-mon-data")) {
        const field = call.arguments.field!;
        const timing = reduceFactoryGetMonDataTiming({ field });
        const current = census.get(field);
        expect(current === undefined || current.target === call.target).toBe(true);
        census.set(field, {
          count: (current?.count ?? 0) + 1,
          route: timing.route,
          target: call.target,
        });
      }
    }

    expect([...census.entries()]).toEqual([
      [58, { count: 12, route: "party-max-hp-u16", target: "old-max-hp" }],
      [57, { count: 12, route: "party-hp-u16", target: "current-hp" }],
      [39, { count: 12, route: "compare-default-to-get-box-mon-data", target: "hp-iv" }],
      [26, { count: 12, route: "compare-default-to-get-box-mon-data", target: "hp-ev" }],
      [40, { count: 12, route: "compare-default-to-get-box-mon-data", target: "attack-iv" }],
      [27, { count: 12, route: "compare-default-to-get-box-mon-data", target: "attack-ev" }],
      [41, { count: 12, route: "compare-default-to-get-box-mon-data", target: "defense-iv" }],
      [28, { count: 12, route: "compare-default-to-get-box-mon-data", target: "defense-ev" }],
      [42, { count: 12, route: "compare-default-to-get-box-mon-data", target: "speed-iv" }],
      [29, { count: 12, route: "compare-default-to-get-box-mon-data", target: "speed-ev" }],
      [43, { count: 12, route: "compare-default-to-get-box-mon-data", target: "sp-attack-iv" }],
      [30, { count: 12, route: "compare-default-to-get-box-mon-data", target: "sp-attack-ev" }],
      [44, { count: 12, route: "compare-default-to-get-box-mon-data", target: "sp-defense-iv" }],
      [31, { count: 12, route: "compare-default-to-get-box-mon-data", target: "sp-defense-ev" }],
      [11, { count: 12, route: "compare-default-to-get-box-mon-data", target: "species" }],
    ]);
    expect([...census.values()].reduce((sum, row) => sum + row.count, 0)).toBe(180);
  });

  it("source-reduces all 24 direct HP/max-HP reads without absorbing async work", () => {
    const sourceByCase: Record<string, number> = {};

    for (const { value } of probes) {
      let caseCycles = 0;
      const directRows = value.directCalls.filter((row) => (
        row.operation === "get-mon-data" && [57, 58].includes(row.arguments.field!)
      ));
      expect(directRows).toHaveLength(value.mons.length * 2);
      for (const call of directRows) {
        const timing = reduceFactoryGetMonDataTiming({ field: call.arguments.field! });
        const measured = sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        );
        expect(timing.cycles).toBe(80);
        expect(measured).toBe(timing.cycles);
        expect(call.result).toBeGreaterThan(0);
        caseCycles += timing.cycles!;
      }
      sourceByCase[value.case] = caseCycles;
    }

    expect(sourceByCase).toEqual({ anchor: 960, liliana: 480, "factory-varied": 480 });
  });

  it("derives direct-party and unresolved nested GetMonData2 switch arms from the field", () => {
    for (const field of [55, 56, 57, 58, 64, 84, 85, 86, 87, 88]) {
      expect(reduceFactoryGetMonDataTiming({ field })).toMatchObject({
        field,
        directPartyRead: true,
        delegatedToGetBoxMonData2: false,
        valueWidth: field === 55 ? 4 : field === 56 || field === 64 ? 1 : 2,
        cycles: 80,
        unresolved: null,
      });
    }

    expect(reduceFactoryGetMonDataTiming({ field: 11 })).toMatchObject({
      route: "compare-default-to-get-box-mon-data",
      directPartyRead: false,
      delegatedToGetBoxMonData2: true,
      getBoxMonData2EntryPc: 0x0806_a676,
      preDelegateCycles: 36,
      returnShellCycles: 12,
      cycles: null,
    });
    expect(reduceFactoryGetMonDataTiming({ field: 65 })).toMatchObject({
      route: "table-default-to-get-box-mon-data",
      preDelegateCycles: 68,
      returnShellCycles: 12,
      cycles: null,
    });
    expect(reduceFactoryGetMonDataTiming({ field: 59 })).toMatchObject({
      route: "party-attack-via-get-deoxys-stat",
      getDeoxysStatEntryPc: 0x0806_8a12,
      preDelegateCycles: 68,
      overrideReturnShellCycles: 26,
      partyFallbackReturnShellCycles: 42,
      cycles: null,
    });
    expect(() => reduceFactoryGetMonDataTiming({ field: -0x8000_0001 }))
      .toThrow("field must be a source i32");
  });

  it("source-reduces all 60 direct GetNature spans from the accepted personality", () => {
    const sourceByCase: Record<string, number> = {};
    const externalCycles: number[] = [];

    for (const { value } of probes) {
      let caseCycles = 0;
      for (const mon of value.mons) {
        const rows = value.directCalls.filter((call) => (
          call.monIndex === mon.monIndex && call.operation === "get-nature"
        ));
        for (const call of rows) {
          const timing = reduceFactoryGetNatureTiming(mon.acceptedPersonality);
          const measured = sourceCycles(
            call.entryMasterCycles,
            call.returnMasterCycles,
            value.interruptPauses,
          );
          expect(timing).toMatchObject({
            personality: mon.acceptedPersonality,
            nature: mon.acceptedPersonality % 25,
            entryPc: 0x0806_d070,
            getMonDataEntryPc: 0x0806_a518,
            divisionEntryPc: 0x082e_7be0,
            getMonDataCycles: 180,
            wrapperCycles: 42,
          });
          expect(timing.nature).toBe(call.result);
          caseCycles += timing.cycles;
          externalCycles.push(measured - timing.cycles);
        }
      }
      sourceByCase[value.case] = caseCycles;
    }

    expect(externalCycles).toHaveLength(60);
    expect(externalCycles.filter((cycles) => cycles === 0)).toHaveLength(57);
    expect(externalCycles.filter((cycles) => cycles === 18)).toHaveLength(2);
    expect(externalCycles.filter((cycles) => cycles === 245)).toHaveLength(1);
    expect(externalCycles.reduce((total, cycles) => total + cycles, 0)).toBe(281);
    expect(sourceByCase).toEqual({ anchor: 29_875, liliana: 14_830, "factory-varied": 15_195 });
    expect(Object.values(sourceByCase).reduce((total, cycles) => total + cycles, 0)).toBe(59_900);
  });

  it("follows GetNature's nested field-zero accessor and %25 division branch variants", () => {
    expect(reduceFactoryGetNatureTiming(0)).toMatchObject({
      nature: 0,
      moduloCycles: 18,
      cycles: 240,
    });
    expect(reduceFactoryGetNatureTiming(24)).toMatchObject({
      nature: 24,
      moduloCycles: 18,
      cycles: 240,
    });
    expect(reduceFactoryGetNatureTiming(25)).toMatchObject({
      nature: 0,
      moduloCycles: 126,
      cycles: 348,
    });
    expect(reduceFactoryGetNatureTiming(26)).toMatchObject({
      nature: 1,
      moduloCycles: 218,
      cycles: 440,
    });
    expect(reduceFactoryGetNatureTiming(49)).toMatchObject({
      nature: 24,
      moduloCycles: 290,
      cycles: 512,
    });
    expect(reduceFactoryGetNatureTiming(50)).toMatchObject({
      nature: 0,
      moduloCycles: 157,
      cycles: 379,
    });
    expect(reduceFactoryGetNatureTiming(0xffff_ffff)).toMatchObject({
      nature: 20,
      moduloCycles: 779,
      cycles: 1_001,
    });
    expect(() => reduceFactoryGetNatureTiming(-1)).toThrow("personality must be a source u32");
    expect(() => reduceFactoryGetNatureTiming(0x1_0000_0000)).toThrow("personality must be a source u32");
  });

  it("source-reduces every direct ModifyStatByNature span from its ABI inputs", () => {
    const reductions: Array<{
      natureModifier: -1 | 0 | 1 | null;
      cycles: number;
      result: number;
    }> = [];

    for (const { value } of probes) {
      for (const call of value.directCalls.filter((row) => row.operation === "modify-stat-by-nature")) {
        const timing = reduceFactoryModifyStatByNatureTiming({
          nature: call.arguments.nature!,
          stat: call.arguments.stat!,
          statIndex: call.arguments.statIndex!,
        });
        expect(timing.entryPc).toBe(0x0806_d8d4);
        expect(timing.result).toBe(call.result);
        expect(timing.cycles).toBe(sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        ));
        reductions.push(timing);
      }
    }

    expect(reductions).toHaveLength(60);
    expect(reductions.filter((timing) => timing.natureModifier === 0)).toHaveLength(52);
    expect(reductions.filter((timing) => timing.natureModifier === 1)).toHaveLength(4);
    expect(reductions.filter((timing) => timing.natureModifier === -1)).toHaveLength(4);
    expect(reductions.reduce((total, timing) => total + timing.cycles, 0)).toBe(8_396);
    expect(new Set(reductions.map((timing) => timing.cycles))).toEqual(new Set([98, 408, 410, 416, 418]));
  });

  it("follows ModifyStatByNature's guard, table, u16-product, and multiply-width branches", () => {
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 68,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      natureModifier: 1,
      multiplier: 110,
      scaledStat: 7_480,
      result: 74,
      multiplyInternalCycles: 1,
      cycles: 418,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 85,
      statIndex: 2,
    })).toMatchObject({
      route: "lower",
      natureModifier: -1,
      multiplier: 90,
      scaledStat: 7_650,
      result: 76,
      multiplyInternalCycles: 1,
      cycles: 408,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 0,
      stat: 400,
      statIndex: 1,
    })).toMatchObject({
      route: "neutral",
      natureModifier: 0,
      multiplier: null,
      scaledStat: 400,
      result: 400,
      multiplyInternalCycles: 0,
      cycles: 98,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 256,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      natureModifier: 1,
      multiplier: 110,
      scaledStat: 28_160,
      result: 281,
      multiplyInternalCycles: 2,
      cycles: 497,
    });
    expect(reduceFactoryModifyStatByNatureTiming({
      nature: 1,
      stat: 65_535,
      statIndex: 1,
    })).toMatchObject({
      route: "raise",
      multiplier: 110,
      scaledStat: 65_426,
      result: 654,
      multiplyInternalCycles: 2,
      cycles: 503,
    });
    for (const statIndex of [0, 6, 255]) {
      expect(reduceFactoryModifyStatByNatureTiming({
        nature: 24,
        stat: 65535,
        statIndex,
      })).toMatchObject({
        route: "unaffected-stat-index",
        natureModifier: null,
        multiplier: null,
        scaledStat: 65535,
        result: 65535,
        multiplyInternalCycles: 0,
        romLiteralLoads: 0,
        romTableLoads: 0,
        cycles: 48,
      });
    }
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 25, stat: 1, statIndex: 1 }))
      .toThrow("nature must be a GetNature result in [0, 24]");
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 1, stat: 65_536, statIndex: 1 }))
      .toThrow("stat must be a source u16");
    expect(() => reduceFactoryModifyStatByNatureTiming({ nature: 1, stat: 1, statIndex: 256 }))
      .toThrow("statIndex must be a source u8");
  });

  it("source-reduces all 96 direct SetMonData party-write spans from their field ids", () => {
    const sourceByCase: Record<string, number> = {};
    const residuals: number[] = [];
    const reductions = [];

    for (const { value } of probes) {
      let caseCycles = 0;
      for (const call of value.directCalls.filter((row) => row.operation === "set-mon-data")) {
        const timing = reduceFactorySetMonDataTiming({ field: call.arguments.field! });
        const measured = sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        );
        expect(timing).toMatchObject({
          field: call.arguments.field,
          entryPc: 0x0806_acae,
          directPartyWrite: true,
          delegatedToSetBoxMonData: false,
          unresolved: null,
        });
        expect(timing.cycles).toBe(measured);
        reductions.push(timing);
        residuals.push(measured - (timing.cycles ?? 0));
        caseCycles += timing.cycles ?? 0;
      }
      sourceByCase[value.case] = caseCycles;
    }

    expect(reductions).toHaveLength(96);
    expect(residuals).toEqual(Array(96).fill(0));
    expect(sourceByCase).toEqual({ anchor: 3_708, liliana: 1_854, "factory-varied": 1_854 });
    expect(reductions.reduce((total, timing) => total + (timing.cycles ?? 0), 0)).toBe(7_416);
  });

  it("follows SetMonData's direct width/no-op and delegated-default switch branches", () => {
    expect(reduceFactorySetMonDataTiming({ field: 55 })).toMatchObject({
      route: "party-status-u32",
      directPartyWrite: true,
      valueWidth: 4,
      partyOffset: 80,
      sequentialThumbHalfwords: 25,
      pipelineRefills: 3,
      romLiteralLoads: 1,
      romJumpTableLoads: 1,
      cycles: 86,
    });
    expect(reduceFactorySetMonDataTiming({ field: 56 })).toMatchObject({
      route: "party-level-u8",
      directPartyWrite: true,
      valueWidth: 1,
      partyOffset: 84,
      sequentialThumbHalfwords: 18,
      pipelineRefills: 3,
      romLiteralLoads: 1,
      romJumpTableLoads: 1,
      cycles: 72,
    });
    const halfwordArms = [
      [57, "party-hp-u16", 86],
      [58, "party-max-hp-u16", 88],
      [59, "party-attack-u16", 90],
      [60, "party-defense-u16", 92],
      [61, "party-speed-u16", 94],
      [62, "party-sp-attack-u16", 96],
      [63, "party-sp-defense-u16", 98],
    ] as const;
    for (const [field, route, partyOffset] of halfwordArms) {
      expect(reduceFactorySetMonDataTiming({ field })).toMatchObject({
        route,
        directPartyWrite: true,
        valueWidth: 2,
        partyOffset,
        sequentialThumbHalfwords: 21,
        pipelineRefills: 3,
        romLiteralLoads: 1,
        romJumpTableLoads: 1,
        cycles: 78,
      });
    }
    expect(reduceFactorySetMonDataTiming({ field: 64 })).toMatchObject({
      route: "party-mail-u8",
      directPartyWrite: true,
      valueWidth: 1,
      partyOffset: 85,
      cycles: 72,
    });
    expect(reduceFactorySetMonDataTiming({ field: 65 })).toMatchObject({
      route: "party-species-or-egg-noop",
      directPartyWrite: false,
      valueWidth: 0,
      partyOffset: null,
      sequentialThumbHalfwords: 13,
      pipelineRefills: 2,
      romLiteralLoads: 1,
      romJumpTableLoads: 1,
      cycles: 56,
      unresolved: null,
    });
    for (const field of [-1, 54, 66, 0x7fff_ffff]) {
      expect(reduceFactorySetMonDataTiming({ field })).toMatchObject({
        route: "delegates-to-set-box-mon-data",
        directPartyWrite: false,
        delegatedToSetBoxMonData: true,
        valueWidth: null,
        partyOffset: null,
        setBoxMonDataEntryPc: 0x0806_ad9e,
        sequentialThumbHalfwords: 11,
        pipelineRefills: 3,
        romLiteralLoads: 0,
        romJumpTableLoads: 0,
        preDelegateCycles: 30,
        returnShellCycles: 10,
        cycles: null,
      });
    }
    expect(() => reduceFactorySetMonDataTiming({ field: -0x8000_0001 }))
      .toThrow("field must be a source i32");
    expect(() => reduceFactorySetMonDataTiming({ field: 0x8000_0000 }))
      .toThrow("field must be a source i32");
  });

  it("source-reduces all 72 direct signed-divide spans and isolates the one service residual", () => {
    const sourceByCase: Record<string, number> = {};
    const residuals: number[] = [];
    const cycles: number[] = [];

    for (const { value } of probes) {
      let caseCycles = 0;
      for (const call of value.directCalls.filter((row) => row.operation === "divide")) {
        const timing = reduceFactorySignedDivisionTiming({
          dividend: call.arguments.dividend!,
          divisor: call.arguments.divisor!,
        });
        const measured = sourceCycles(
          call.entryMasterCycles,
          call.returnMasterCycles,
          value.interruptPauses,
        );
        expect(timing).toMatchObject({
          entryPc: 0x082e_7542,
          unsignedCoreEntryPc: 0x082e_755c,
          divisorZero: false,
          overflow: false,
          divisor: call.arguments.divisor,
          dividend: call.arguments.dividend,
          result: call.result,
        });
        expect(timing.cycles).toBeLessThanOrEqual(measured);
        residuals.push(measured - timing.cycles);
        cycles.push(timing.cycles);
        caseCycles += timing.cycles;
      }
      sourceByCase[value.case] = caseCycles;
    }

    expect(cycles).toHaveLength(72);
    expect(residuals.filter((value) => value === 0)).toHaveLength(71);
    expect(residuals.filter((value) => value === 18)).toHaveLength(1);
    expect(residuals.reduce((total, value) => total + value, 0)).toBe(18);
    expect(sourceByCase).toEqual({ anchor: 11_252, liliana: 5_630, "factory-varied": 5_700 });
    expect(cycles.reduce((total, value) => total + value, 0)).toBe(22_582);
  });

  it("follows signed wrapper, divisor-zero, and INT_MIN/-1 retail branches", () => {
    const cases = [
      { dividend: 5_750, divisor: 100, result: 57, resultBits: 57, cycles: 318 },
      { dividend: -5_750, divisor: 100, result: -57, resultBits: 0xffff_ffc7, cycles: 310 },
      { dividend: 5_750, divisor: -100, result: -57, resultBits: 0xffff_ffc7, cycles: 310 },
      { dividend: -5_750, divisor: -100, result: 57, resultBits: 57, cycles: 310 },
      { dividend: 0, divisor: 100, result: 0, resultBits: 0, cycles: 70 },
      { dividend: 5_750, divisor: 0, result: 0, resultBits: 0, cycles: 40 },
      {
        dividend: -0x8000_0000,
        divisor: -1,
        result: -0x8000_0000,
        resultBits: 0x8000_0000,
        cycles: 336,
      },
    ];

    for (const input of cases) {
      expect(reduceFactorySignedDivisionTiming(input)).toMatchObject({
        ...input,
        entryPc: 0x082e_7542,
        unsignedCoreEntryPc: 0x082e_755c,
        divisorZero: input.divisor === 0,
        overflow: input.dividend === -0x8000_0000 && input.divisor === -1,
      });
    }
    expect(() => reduceFactorySignedDivisionTiming({ dividend: -0x8000_0001, divisor: 1 }))
      .toThrow("dividend must be a source i32");
    expect(() => reduceFactorySignedDivisionTiming({ dividend: 1, divisor: 0x8000_0000 }))
      .toThrow("divisor must be a source i32");
  });

  it("source-reduces all twelve parent-only residuals and identifies the u8 level-up-HP branch", () => {
    const branches: Array<{ rawLevelUpHp: number; cycles: number }> = [];
    for (const { expected, value } of probes) {
      value.spans.forEach((span, spanIndex) => {
        const rows = value.directCalls.filter((call) => call.monIndex === span.monIndex);
        const result = (operation: string, target: string): number => {
          const row = rows.find((call) => call.operation === operation && call.target === target);
          if (row?.result === undefined) throw new Error(`missing ${operation}/${target} result`);
          return row.result;
        };
        const oldMaxHp = result("get-mon-data", "old-max-hp");
        const currentHp = result("get-mon-data", "current-hp");
        const level = result("get-level-from-exp", "level");
        const newMaxHp = result("divide", "max-hp") + level + 10;
        const timing = reduceFactoryCalculateMonStatsParentTiming({
          speciesId: result("get-mon-data", "species"),
          oldMaxHp,
          currentHp,
          newMaxHp,
        });

        expect(timing.cycles).toBe(expected.interstitialCycles[spanIndex]);
        expect(timing.currentHpPath).toBe("normal-adjust");
        expect(timing.directCallCount).toBe(rows.length);
        branches.push({ rawLevelUpHp: timing.rawLevelUpHp, cycles: timing.cycles });
      });
    }

    expect(branches.filter((branch) => branch.rawLevelUpHp === 0)).toEqual([
      { rawLevelUpHp: 0, cycles: 1_081 },
      { rawLevelUpHp: 0, cycles: 1_081 },
    ]);
    expect(branches.filter((branch) => branch.rawLevelUpHp !== 0)).toHaveLength(10);
    expect(new Set(branches.filter((branch) => branch.rawLevelUpHp !== 0).map((branch) => branch.cycles)))
      .toEqual(new Set([1_083]));
  });

  it("follows the compiled level-up, Shedinja, and final-current-HP branch variants", () => {
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 100,
      newMaxHp: 101,
    })).toMatchObject({
      rawLevelUpHp: 1,
      storedLevelUpHp: 1,
      currentHpPath: "normal-adjust",
      writesCurrentHp: true,
      directCallCount: 40,
      sequentialThumbHalfwords: 345,
      pipelineRefills: 51,
      romLiteralLoads: 5,
      romTableLoads: 6,
      cycles: 1_083,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 100,
      newMaxHp: 100,
    })).toMatchObject({
      rawLevelUpHp: 0,
      storedLevelUpHp: 1,
      sequentialThumbHalfwords: 347,
      pipelineRefills: 50,
      cycles: 1_081,
    });
    // The source field is u8: a delta of 256 selects the same zero branch.
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 100,
      currentHp: 0,
      newMaxHp: 356,
    })).toMatchObject({
      rawLevelUpHp: 0,
      currentHpPath: "return-without-write",
      writesCurrentHp: false,
      directCallCount: 39,
      cycles: 1_061,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 1,
      oldMaxHp: 0,
      currentHp: 0,
      newMaxHp: 45,
    })).toMatchObject({
      currentHpPath: "normal-initialize",
      writesCurrentHp: true,
      directCallCount: 40,
      cycles: 1_085,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 1,
      currentHp: 1,
      newMaxHp: 1,
    })).toMatchObject({
      shedinja: true,
      currentHpPath: "shedinja-set-one",
      directCallCount: 39,
      romTableLoads: 5,
      cycles: 1_013,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 0,
      currentHp: 0,
      newMaxHp: 1,
    })).toMatchObject({
      currentHpPath: "shedinja-set-one",
      writesCurrentHp: true,
      directCallCount: 39,
      cycles: 1_015,
    });
    expect(reduceFactoryCalculateMonStatsParentTiming({
      speciesId: 303,
      oldMaxHp: 1,
      currentHp: 0,
      newMaxHp: 1,
    })).toMatchObject({
      currentHpPath: "return-without-write",
      writesCurrentHp: false,
      directCallCount: 38,
      cycles: 991,
    });
  });
});
