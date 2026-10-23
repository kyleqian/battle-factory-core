/**
 * fnt201 (docs/fnt201-faint-timing.md): production's faint presentation timing equals the ROM's measured BattleScript_FaintTarget /
 * BattleScript_FaintAttacker rows for the four routes (ordinary foe KO, ordinary player KO, attacker self-KO: Self-Destruct and Memento,
 * end-of-turn faint: Sandstorm / Toxic on a 1-HP Shedinja), both scenes. The expectations are the twice-fresh direct-mGBA rows
 * (tools/integration/fixtures/fnt201/rom-rows.json; fnt201Stage.py, sub183RomFrames.py, fnt201RomRows.py; Memento from the sst200 scenarios).
 * Hermetic: the fixture is only read as expectations; production is the real kernel + projectBattleResolutionCommands.
 */
import { describe, expect, it } from "vitest";
import { CASES, compare, productionRows, romFor } from "../tools/integration/fnt201Compare.ts";

// ROM rows from the first glyph / HP-drain idle anchor to dofaintanimation's first busy row, and from there to "X fainted!"'s first glyph.
const ROM_ROWS: Record<string, { toSink: number; toGlyph: number; animRows: number }> = {
  "ko-foe": { toSink: 73, toGlyph: 20, animRows: 17 },
  "ko-player": { toSink: 73, toGlyph: 18, animRows: 15 },
  "selfdestruct-both": { toSink: 72, toGlyph: 20, animRows: 17 },
  "selfdestruct-onix": { toSink: 161, toGlyph: 19, animRows: 16 },
  "selfdestruct-survivor": { toSink: 161, toGlyph: 19, animRows: 16 },
  memento: { toSink: 162, toGlyph: 19, animRows: 16 },
  "sandstorm-shedinja": { toSink: 68, toGlyph: 20, animRows: 17 },
  "toxic-shedinja": { toSink: 68, toGlyph: 20, animRows: 17 },
};

describe("fnt201: faint script timing against the ROM (both scenes)", () => {
  for (const name of CASES) for (const scene of ["off", "on"] as const) {
    it(`${name} (${scene}): sink start and "fainted!" first glyph equal the ROM rows`, () => {
      const want = ROM_ROWS[name]!;
      const rom = romFor(name, scene);
      expect(rom.anim - rom.cry).toBe(66);
      expect(rom.animRows).toBe(want.animRows);
      const c = compare(name, scene);
      expect(c.toSink.rom).toBe(want.toSink);
      expect(c.toGlyph.rom).toBe(want.toGlyph);
      expect(c.toSink.production).toBe(want.toSink);
      expect(c.toGlyph.production).toBe(want.toGlyph);
    });
  }

  it("the faint command's lead is the cry + pause B_WAIT_TIME_LONG + dispatch rows plus the route's own script rows", () => {
    const lead = (name: string) => (productionRows(name, "off").find((r: any) => r.type === "faint") as any).timing.leadFrames as number;
    expect(lead("ko-foe")).toBe(66 + 7);
    expect(lead("selfdestruct-onix")).toBe(66 + 5);
    expect(lead("memento")).toBe(66 + 1);
    expect(lead("sandstorm-shedinja")).toBe(66 + 2);
  });

  it("the player's slide ends at floor((80 - back y_offset) / 5) + 2 rows (ABRA 11 -> 15, PRIMEAPE 7 -> 16)", () => {
    const vanish = (name: string) => (productionRows(name, "off").find((r: any) => r.type === "faint") as any).timing.healthboxVanishFrame as number;
    expect(vanish("ko-player")).toBe(15);
    expect(vanish("selfdestruct-survivor")).toBe(16);
  });
});
