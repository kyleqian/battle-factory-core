import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ROOT = "reference/pokeemerald";
const ELF = readFileSync(`${ROOT}/pokeemerald.elf`);
const MAP = readFileSync(`${ROOT}/pokeemerald.map`, "utf8");
const M4A = readFileSync(`${ROOT}/src/m4a.c`, "utf8");
const M4A_TABLES = readFileSync(`${ROOT}/src/m4a_tables.c`, "utf8");
const M4A_ASM = readFileSync(`${ROOT}/src/m4a_1.s`, "utf8");
const MAIN = readFileSync(`${ROOT}/src/main.c`, "utf8");
const M4A_HEADER = readFileSync(`${ROOT}/include/gba/m4a_internal.h`, "utf8");
const IO_HEADER = readFileSync(`${ROOT}/include/gba/io_reg.h`, "utf8");

const EXPECTED_SYMBOLS = {
  VBlankIntr: 0x0800_0738,
  VCountIntr: 0x0800_0844,
  SoundMain: 0x082d_f05c,
  m4aSoundVSync: 0x082d_fa10,
  m4aSoundInit: 0x082e_0070,
  m4aSoundMain: 0x082e_0124,
  SoundInit: 0x082e_04dc,
  SampleFreqSet: 0x082e_05d4,
  m4aSoundMode: 0x082e_0678,
  m4aSoundVSyncOff: 0x082e_0764,
  m4aSoundVSyncOn: 0x082e_07e0,
  gPcmSamplesPerVBlankTable: 0x0867_5b64,
} as const;

function sourceSpan(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`missing source span ${start} -> ${end}`);
  return source.slice(startIndex, endIndex);
}

/** Read an exact loadable-ROM interval from the pinned ELF, not the GBA copy. */
function elfRomSlice(address: number, length: number): Buffer {
  expect(ELF.readUInt32LE(0)).toBe(0x464c457f); // \x7fELF
  const programHeaderOffset = ELF.readUInt32LE(0x1c);
  const programHeaderSize = ELF.readUInt16LE(0x2a);
  const programHeaderCount = ELF.readUInt16LE(0x2c);
  for (let index = 0; index < programHeaderCount; index += 1) {
    const offset = programHeaderOffset + index * programHeaderSize;
    if (ELF.readUInt32LE(offset) !== 1) continue; // PT_LOAD
    const fileOffset = ELF.readUInt32LE(offset + 4);
    const virtualAddress = ELF.readUInt32LE(offset + 8);
    const fileSize = ELF.readUInt32LE(offset + 16);
    if (address >= virtualAddress && address + length <= virtualAddress + fileSize) {
      const start = fileOffset + address - virtualAddress;
      return ELF.subarray(start, start + length);
    }
  }
  throw new Error(`missing pinned ELF ROM interval 0x${address.toString(16)}+${length}`);
}

function elfSymbol(name: string): number {
  const sectionHeaderOffset = ELF.readUInt32LE(0x20);
  const sectionHeaderSize = ELF.readUInt16LE(0x2e);
  const sectionHeaderCount = ELF.readUInt16LE(0x30);
  for (let sectionIndex = 0; sectionIndex < sectionHeaderCount; sectionIndex += 1) {
    const sectionOffset = sectionHeaderOffset + sectionIndex * sectionHeaderSize;
    if (ELF.readUInt32LE(sectionOffset + 4) !== 2) continue; // SHT_SYMTAB
    const symbolOffset = ELF.readUInt32LE(sectionOffset + 16);
    const symbolSize = ELF.readUInt32LE(sectionOffset + 20);
    const symbolEntrySize = ELF.readUInt32LE(sectionOffset + 36);
    const stringTableIndex = ELF.readUInt32LE(sectionOffset + 24);
    const stringSectionOffset = sectionHeaderOffset + stringTableIndex * sectionHeaderSize;
    const stringTableOffset = ELF.readUInt32LE(stringSectionOffset + 16);
    for (let offset = symbolOffset; offset < symbolOffset + symbolSize; offset += symbolEntrySize) {
      const nameOffset = ELF.readUInt32LE(offset);
      const nameEnd = ELF.indexOf(0, stringTableOffset + nameOffset);
      const symbolName = ELF.toString("utf8", stringTableOffset + nameOffset, nameEnd);
      if (symbolName === name) return ELF.readUInt32LE(offset + 4);
    }
  }
  throw new Error(`missing pinned ELF symbol ${name}`);
}

function mapAddress(name: string): number {
  const match = MAP.match(new RegExp(`^\\s*0x([0-9a-f]+)\\s+${name}\\s*$`, "im"));
  if (!match) throw new Error(`missing pinned map symbol ${name}`);
  return Number.parseInt(match[1]!, 16);
}

describe("Issue #55 GBA Timer 0 source audit", () => {
  it("pins the m4a initialization path, Timer 0 write order, and audio ownership boundary", () => {
    const init = sourceSpan(M4A, "void m4aSoundInit(void)", "void m4aSoundMain(void)");
    const soundInit = sourceSpan(M4A, "void SoundInit(struct SoundInfo *soundInfo)", "void SampleFreqSet(u32 freq)");
    const sampleFreqSet = sourceSpan(M4A, "void SampleFreqSet(u32 freq)", "void m4aSoundMode(u32 mode)");
    const soundMode = sourceSpan(M4A, "void m4aSoundMode(u32 mode)", "void SoundClear(void)");
    const vsyncOff = sourceSpan(M4A, "void m4aSoundVSyncOff(void)", "void m4aSoundVSyncOn(void)");
    const vsyncOn = sourceSpan(M4A, "void m4aSoundVSyncOn(void)", "void MPlayOpen(");
    const vblank = sourceSpan(MAIN, "static void VBlankIntr(void)\n{", "void InitFlashTimer(void)");
    const vcount = sourceSpan(MAIN, "static void VCountIntr(void)\n{", "static void SerialIntr(void)");

    expect(init).toContain("SoundInit(&gSoundInfo);");
    expect(init).toContain("m4aSoundMode(SOUND_MODE_DA_BIT_8");
    expect(init).toContain("| SOUND_MODE_FREQ_13379");
    expect(soundInit).toContain("SampleFreqSet(SOUND_MODE_FREQ_13379);");
    expect(soundInit).toContain("SOUND_B_FIFO_RESET | SOUND_B_TIMER_0 | SOUND_B_LEFT_OUTPUT");
    expect(soundInit).toContain("SOUND_A_FIFO_RESET | SOUND_A_TIMER_0 | SOUND_A_RIGHT_OUTPUT");

    const disable = sampleFreqSet.indexOf("REG_TM0CNT_H = 0;");
    const reload = sampleFreqSet.indexOf("REG_TM0CNT_L = -(280896 / soundInfo->pcmSamplesPerVBlank);");
    const dmaArm = sampleFreqSet.indexOf("m4aSoundVSyncOn();");
    const enable = sampleFreqSet.indexOf("REG_TM0CNT_H = TIMER_ENABLE | TIMER_1CLK;");
    expect([disable, reload, dmaArm, enable].every((offset) => offset >= 0)).toBe(true);
    expect(disable).toBeLessThan(reload);
    expect(reload).toBeLessThan(dmaArm);
    expect(dmaArm).toBeLessThan(enable);
    expect(sampleFreqSet).toContain("while (*(vu8 *)REG_ADDR_VCOUNT == 159)");
    expect(sampleFreqSet).toContain("while (*(vu8 *)REG_ADDR_VCOUNT != 159)");
    expect(sampleFreqSet).not.toContain("TIMER_INTR_ENABLE");

    expect(soundMode).toContain("m4aSoundVSyncOff();");
    expect(soundMode).toContain("SampleFreqSet(temp);");
    expect(vsyncOn).toContain("REG_DMA1CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;");
    expect(vsyncOn).toContain("REG_DMA2CNT_H = DMA_ENABLE | DMA_START_SPECIAL | DMA_32BIT | DMA_REPEAT;");
    expect(vsyncOn).toContain("soundInfo->pcmDmaCounter = 0;");
    expect(vsyncOff).not.toContain("REG_TM0CNT");
    expect(vsyncOn).not.toContain("REG_TM0CNT");
    expect(vblank).toContain("m4aSoundMain();");
    expect(vcount).toContain("m4aSoundVSync();");
    expect(M4A_ASM).toContain("m4aSoundVSync:");
    expect(M4A_ASM).toContain("ldrb r1, [r0, o_SoundInfo_pcmDmaPeriod]");
    expect(M4A_ASM).toContain("m4aSoundVSync_SkipDMA1");
    expect(M4A_ASM).toContain("m4aSoundVSync_SkipDMA2");
  });

  it("derives the default reload and master-cycle recurrence from pinned source constants", () => {
    const frequencyMode = 0x0004_0000;
    const samplesPerVBlank = 224;
    const frameCycles = 280_896;
    const timerReload = (-(frameCycles / samplesPerVBlank)) & 0xffff;
    const prescaleBits = 0;
    const periodMasterCycles = (0x1_0000 - timerReload) << prescaleBits;
    const pcmFrequency = Math.floor((597_275 * samplesPerVBlank + 5_000) / 10_000);
    const divFrequency = (Math.floor(16_777_216 / pcmFrequency) + 1) >> 1;

    expect(M4A_HEADER).toContain("#define SOUND_MODE_FREQ_13379   0x00040000");
    expect(M4A_HEADER).toContain("#define PCM_DMA_BUF_SIZE 1584");
    expect(IO_HEADER).toContain("#define TIMER_1CLK        0x00");
    expect(IO_HEADER).toContain("#define TIMER_ENABLE      0x80");
    expect(IO_HEADER).toContain("#define TIMER_INTR_ENABLE 0x40");
    expect(IO_HEADER).toContain("#define SOUND_A_TIMER_0       0x0000");
    expect(IO_HEADER).toContain("#define SOUND_B_TIMER_0       0x0000");
    expect(M4A_TABLES).toContain("const u16 gPcmSamplesPerVBlankTable[]");

    const table = elfRomSlice(EXPECTED_SYMBOLS.gPcmSamplesPerVBlankTable, 24);
    expect([...Array(12).keys()].map((index) => table.readUInt16LE(index * 2))).toEqual([
      96, 132, 176, 224, 264, 304, 352, 448, 528, 608, 672, 704,
    ]);
    expect(frequencyMode >>> 16).toBe(4);
    expect(samplesPerVBlank).toBe(table.readUInt16LE(((frequencyMode >>> 16) - 1) * 2));
    expect(Math.floor(1_584 / samplesPerVBlank)).toBe(7);
    expect(pcmFrequency).toBe(13_379);
    expect(divFrequency).toBe(627);
    expect(timerReload).toBe(0xfb1a);
    expect(periodMasterCycles).toBe(1_254);
    expect(timerReload + periodMasterCycles).toBe(0x1_0000);
    expect(periodMasterCycles * samplesPerVBlank).toBe(frameCycles);
  });

  it("pins map, ELF symbols, and the compiled Timer 0 control/reload sequence", () => {
    for (const [name, address] of Object.entries(EXPECTED_SYMBOLS)) {
      // ELF encodes Thumb function symbols with bit 0 set; the map and
      // disassembly use the executable address with that marker cleared.
      expect(elfSymbol(name) & ~1).toBe(address);
    }
    for (const name of [
      "SoundMain", "m4aSoundVSync", "m4aSoundInit", "m4aSoundMain", "SoundInit",
      "SampleFreqSet", "m4aSoundMode", "m4aSoundVSyncOff", "m4aSoundVSyncOn",
      "gPcmSamplesPerVBlankTable",
    ]) {
      expect(mapAddress(name)).toBe(EXPECTED_SYMBOLS[name as keyof typeof EXPECTED_SYMBOLS]);
    }

    // SoundInit passes selector 4 to SampleFreqSet at 0x082E0584.
    expect(elfRomSlice(0x082e_0580, 8).toString("hex")).toBe("8020c00200f026f8");
    // SampleFreqSet: TM0CNT_H <- 0; calculate negated table-derived reload;
    // arm DMA/VSync; wait for VCOUNT 159; then TM0CNT_H <- 0x80.
    expect(elfRomSlice(0x082e_0620, 44).toString("hex")).toBe(
      "11480680114c1248291c06f089ff4042208000f0d5f80f4908789f28fcd00d4908789f28fcd1084980200880",
    );
    expect(elfRomSlice(0x082e_0668, 16).toString("hex")).toBe("02010004000100044049040006000004");
    // The static IRQ bodies call the named m4a work at the documented PCs.
    expect(elfRomSlice(0x0800_0798, 4).toString("hex")).toBe("dff2c4fc");
    expect(elfRomSlice(0x0800_0852, 4).toString("hex")).toBe("dff2ddf8");
  });
});
