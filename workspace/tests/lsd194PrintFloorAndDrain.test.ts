/**
 * lsd194 (docs/lsd194-print-floor-and-drain.md): (A) WAITMESSAGE_LONG_TIMING has no 24-row floor (a print is L + 64, L = glyph count),
 * (B) the Leech Seed turn-end drain row layout (lead, seeded bar, 7-row gap, receiver bar, print) in both scenes. Hermetic, kernel + presentation only.
 */
import { describe, expect, it } from "vitest";
import { CLASSES, lsd194Production } from "../tools/integration/lsd194Production.ts";
import { lsd186Production } from "../tools/integration/lsd186Production.ts";
import { LEECH_SEED_DRAIN_ANIMATION_ROWS } from "../src/engine/battleResolutionPresentation.ts";

const printsOf = (cls: keyof typeof CLASSES, scene: "on" | "off") =>
  lsd194Production({ scene, seed: 1, ...CLASSES[cls] }).rows.filter((r) => r.type === "message").map((r) => [r.lines!.join(" "), r.dur, r.timing] as const);

describe("lsd194 A: WAITMESSAGE_LONG print floor", () => {
  for (const scene of ["off", "on"] as const) {
    it(`short prints are L + 64 (${scene}): super effective 21 -> 85, failed 14 -> 78, OHKO miss 23 -> 87, stat rose 22 -> 86`, () => {
      const find = (cls: keyof typeof CLASSES, text: string) => printsOf(cls, scene).find((p) => p[0] === text)!;
      expect(find("super-effective", "It’s super effective!").slice(1)).toEqual([85, { minimumFrames: 0, holdFrames: 64 }]);
      expect(find("failed", "But it failed!").slice(1)).toEqual([78, { minimumFrames: 0, holdFrames: 64 }]);
      expect(find("ohko", "DUGTRIO’s attack missed!")[1]).toBe(87);
      expect(find("stat-up", "PRIMEAPE’s ATTACK rose!")[1]).toBe(86);
    });
    it(`control: a print of 24 or more glyphs is unchanged (${scene}): "It’s not very effective…" 24 -> 88`, () => {
      expect(printsOf("crit", scene).find((p) => p[0] === "It’s not very effective…")![1]).toBe(88);
    });
  }
  it("control: the empty box of this lab is Earthquake's hit-all EMPTYSTRING3, timed by kernel rows (fsc1 c2), not the 24-row MESSAGE_TIMING floor", () => {
    // fsc1 c2 (docs/aud251-s11-scoreboard-refresh.md "fsc1"): BattleScript_DoHitAllWithUndergroundBonus's `printstring STRINGID_EMPTYSTRING3;
    // waitmessage 1` lasts to the next presented receipt + 1 row (ROM ~5 rows, fsc1m section 2); before fsc1 this box took the 24-row floor.
    const empty = lsd194Production({ scene: "off", seed: 1, ...CLASSES["super-effective"] }).rows.find((r) => r.type === "message" && r.lines!.length === 0)!;
    expect([empty.dur, empty.timing]).toEqual([5, { minimumFrames: 5, holdFrames: 0 }]);
  });
});

describe("lsd194 B: Leech Seed drain row layout (rows relative to A = the row after the 'was seeded!' print)", () => {
  const layout = (scene: "on" | "off", seederSide: "player" | "opponent", seed: number, onixMove: number) => {
    const { rows } = lsd186Production({ scene, seederSide, seed, onixMove });
    const i = rows.findIndex((r) => r.type === "message" && /seeded/.test(JSON.stringify(r.lines)));
    const A = rows[i]!.start + rows[i]!.dur;
    return rows.slice(i + 1).map((r) => [r.type, r.start - A, r.dur] as const);
  };
  const cases = [
    ["player seeds (tackled)", "player", 57, 33, { off: [46, 68, 83], on: [220, 242, 257] }],
    ["opponent seeds (tackled)", "opponent", 4, 33, { off: [46, 68, 82], on: [220, 242, 256] }],
    ["receiver at full HP", "player", 4, 39, { off: [46, 68, 72], on: [220, 242, 246] }],
  ] as const;
  for (const [label, side, seed, move, expected] of cases) for (const scene of ["off", "on"] as const) {
    it(`${label}, Scene ${scene.toUpperCase()}: seeded bar, receiver bar and print glyph at ${expected[scene].join(" / ")} (ROM, residual 0)`, () => {
      const r = layout(scene, side, seed, move);
      const [seededBar, receiverBar, print] = expected[scene];
      expect(r.slice(0, 3).map((x) => x[0])).toEqual(["sprite-visibility", "sprite-visibility", "general-animation"]);
      expect(r.find((x) => x[0] === "hp")).toEqual(["hp", seededBar, 22]);
      expect(r.filter((x) => x[0] === "hp")[1]![1]).toBe(receiverBar);
      expect(r.find((x) => x[0] === "message")![1]).toBe(print);
      // the seeded bar command is bar 13 + 1 + tail 8 = 22 rows: the ROM's 7-row gap lives in that tail
      expect(r.filter((x) => x[0] === "hp")[1]![1] - seededBar).toBe(22);
    });
  }
  it("Scene ON holds the 208 source animation rows (lsd198 draws the Absorb body over them, tests/lsd198LeechSeedDrainAnimation.test.ts); Scene OFF's lead (Pausex20 stand-in) is 44 rows, the same command", () => {
    expect(LEECH_SEED_DRAIN_ANIMATION_ROWS).toBe(208);
    expect(layout("on", "player", 57, 33).find((x) => x[0] === "general-animation")![2]).toBe(218);
    expect(layout("off", "player", 57, 33).find((x) => x[0] === "general-animation")![2]).toBe(44);
  });
});
