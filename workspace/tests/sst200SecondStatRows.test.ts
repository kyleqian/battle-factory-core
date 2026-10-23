/**
 * sst200 (docs/sst200-second-stat-rows.md): production's `stat` command rows between two stat prints, and the next print after the chain, equal the ROM's measured
 * first-glyph rows for Tickle, Memento, Superpower, Silver Wind, AncientPower (all-stats-up procs), Calm Mind, Dragon Dance, Cosmic Power and Curse, both scenes.
 * The expectations are the twice-fresh direct-mGBA rows (tools/integration/fixtures/sst200/rom-rows.json: sst200Stage.py scenarios, sub183RomFrames.py, sst200RomRows.py);
 * production is the real kernel + projectBattleResolutionCommands (lsd194Production.ts). Hermetic: the fixture is only read as expectations.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { productionFor } from "../tools/integration/sst200Compare.ts";

type RomCase = { move: string; chain: { F: number }[]; next: { kind: string; F: number } };
const ROM = JSON.parse(readFileSync(new URL("../tools/integration/fixtures/sst200/rom-rows.json", import.meta.url), "utf8")) as Record<string, RomCase>;

// ROM first glyph -> first glyph between consecutive stat prints (measured), and the `stat` command rows that produce them.
const ROM_GAPS: Record<string, readonly number[]> = {
  tickle: [92], memento: [100], superpower: [92], "silver-wind": [90, 91, 89, 91], "ancient-power": [90, 91, 89, 91],
  "calm-mind": [92], "dragon-dance": [91], "cosmic-power": [92], curse: [89, 90],
};
const STAT_ROWS: Record<string, readonly number[]> = {
  tickle: [6], memento: [6], superpower: [6], "silver-wind": [4, 4, 4, 4], "ancient-power": [4, 4, 4, 4],
  "calm-mind": [5], "dragon-dance": [5], "cosmic-power": [5], curse: [4, 4],
};
// Last stat print -> the foe's "used" print (the post-chain message); Memento's next print is "fainted!" (the faint script, not the stat rule).
const ROM_NEXT: Record<string, number> = {
  tickle: 101, superpower: 102, "silver-wind": 102, "ancient-power": 102, "calm-mind": 100, "dragon-dance": 98, "cosmic-power": 100, curse: 100,
};

describe("sst200: second-stat rows against the ROM (both scenes)", () => {
  for (const [file, rom] of Object.entries(ROM)) {
    const scene = file.includes("-on-r1") ? "on" as const : "off" as const;
    const move = rom.move;
    it(`${move} (${scene}): stat command rows and gaps equal the ROM`, () => {
      const romGaps = rom.chain.slice(1).map((c, k) => c.F - rom.chain[k]!.F);
      expect(romGaps).toEqual(ROM_GAPS[move]);
      const p = productionFor(move, scene, rom.chain.length, move === "silver-wind" || move === "ancient-power" ? 61 : 1);
      const start = (i: number) => p.rows[i]!.start;
      const gaps = p.chain.slice(1).map((m, k) => start(m) - start(p.chain[k]!));
      expect(gaps).toEqual(romGaps);
      expect(p.chain.slice(1).map((m) => p.rows[m - 1]!.dur)).toEqual(STAT_ROWS[move]);
      if (move === "memento") return;
      const next = p.rows[p.next]!;
      expect(next.lines!.join(" ")).toMatch(/used/);
      expect(start(p.next) - start(p.chain[p.chain.length - 1]!)).toBe(rom.next.F - rom.chain[rom.chain.length - 1]!.F);
      expect(rom.next.F - rom.chain[rom.chain.length - 1]!.F).toBe(ROM_NEXT[move]);
    });
  }
  it("covers all nine moves in both scenes", () => {
    expect(Object.keys(ROM)).toHaveLength(18);
  });
});
