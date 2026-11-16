// aud251: the last resolution's "extra" victory BGM / SE_BALL_OPEN of the aud248 scoreboard are window-end artifacts (the ROM drive stops at
// gBattleOutcome != 0, before the ROM plays them). Fixture = ROM sound pass extended 500 idle frames vs the engine's rows (Scene OFF seeds 2, 499, 1028).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Row = [number, string, number];
const fixture = JSON.parse(readFileSync(new URL("./fixtures/aud251-outcome-tail.json", import.meta.url), "utf8")) as {
  seeds: Record<string, { windowEnd: number; rom: Row[]; engine: Row[] }>;
};

describe("aud251 last-resolution tail (ROM window past the outcome)", () => {
  for (const [seed, w] of Object.entries(fixture.seeds)) {
    it(`seed ${seed}: the ROM plays the same ordered sounds as the engine, the engine's last one included`, () => {
      expect(w.rom.map(([, kind, id]) => `${kind}:${id}`)).toEqual(w.engine.map(([, kind, id]) => `${kind}:${id}`));
    });
    it(`seed ${seed}: the last ROM row lies past the old window end (the aud248 drive stop), so it was scored as engine-only`, () => {
      const last = w.rom[w.rom.length - 1]!;
      expect(last[0]).toBeGreaterThan(w.windowEnd);
      expect(["bgm:412", "se:15"]).toContain(`${last[1]}:${last[2]}`);
      expect(w.rom.slice(0, -1).every(([offset]) => offset < w.windowEnd)).toBe(true);
    });
  }

  it("pins the engine-minus-ROM frame offset of every tail row", () => {
    const deltas = Object.fromEntries(Object.entries(fixture.seeds).map(([seed, w]) => [seed, w.engine.map((row, i) => row[0] - w.rom[i]![0])]));
    expect(deltas).toEqual({ "2": [0, 28, 28, 23], "499": [-1, 13, 13, 11], "1028": [-3, -3, -13, -18, -18, -29] });
  });
});
