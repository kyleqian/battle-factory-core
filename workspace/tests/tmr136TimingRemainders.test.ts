// tmr136 (S10A, ISSUES #166 (A) + aud129 s2 (B); docs/tmr136-timing-remainders.md): two Scene ON timing remainders.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { BattleMoveAnimationRequest } from "../src/engine/battleMoveAnimation.ts";
import { LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS, liveMoveAnimationDuration } from "../src/engine/liveMoveAnimation.ts";
import { LIVE_SUBSTITUTE_SWAP_BODY_FRAMING } from "../src/engine/liveSubstituteSwap.ts";

const DT_TAIL = "tools/integration/fixtures/tmr136/dt-tail";
type TailRow = {
  fixture: string; side: string; species: string; live: boolean; duration: number; same: boolean; rows: number; bodyRows: number; bodyPx: number;
  tailRows: number; tailPx: number; tailPerRow: [number, number][]; romGlyphAge: number; romGlyphAgeR2: number;
  romGlyphBox: { px: number; bbox: [number, number, number, number] }; romChanges: { age: number }[];
};
const tailRows = (): TailRow[] => readdirSync(DT_TAIL).filter((n) => n.endsWith(".json")).sort()
  .flatMap((n) => (JSON.parse(readFileSync(join(DT_TAIL, n), "utf8")) as { rows: TailRow[] }).rows);

describe("tmr136 (A): the live Double Team window holds the General_StatsChange's rel 69..77", () => {
  it("adds 9 rows: 230 -> 239 for both attacker sides; the Substitute swap composite (the framed ROM body) is unchanged", () => {
    expect(LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS).toBe(9);
    for (const attacker of [0, 1] as const) {
      const req = { moveId: 104, attacker, target: attacker, power: 0, damage: 0, friendship: 70, multihit: 0, turn: 0 } as BattleMoveAnimationRequest;
      expect(liveMoveAnimationDuration(req)).toBe(230 + LIVE_DOUBLE_TEAM_STATS_CHANGE_TAIL_ROWS);
    }
    expect(LIVE_SUBSTITUTE_SWAP_BODY_FRAMING.get(104)).toEqual({ rows: 159, shift: -1 });
  });

  it("12 dense direct-mGBA windows (6 species pairs, both sides, both bodies, r1 == r2): every body row and every added row 0 px", () => {
    const rows = tailRows();
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((r) => r.side))).toEqual(new Set(["player", "opponent"]));
    expect(new Set(rows.map((r) => `${r.side} ${r.species}`)).size).toBe(6);
    for (const r of rows) {
      expect(r, r.fixture).toMatchObject({ live: true, same: true, duration: 239, rows: 240, bodyRows: 231, bodyPx: 0, tailRows: 9, tailPx: 0 });
      expect(r.tailPerRow.map(([age]) => age), r.fixture).toEqual([230, 231, 232, 233, 234, 235, 236, 237, 238]);
    }
  });

  it("the ROM's next message box changes first on window age 239 (rel 78) = the first frame after the 239-row window", () => {
    for (const r of tailRows()) {
      expect([r.romGlyphAge, r.romGlyphAgeR2], r.fixture).toEqual([239, 239]);
      expect(r.romChanges[0]!.age, r.fixture).toBe(239);
      // The change lies inside the message box (text rows 124..149, x from the box's left margin 16).
      const [x0, , y0, y1] = r.romGlyphBox.bbox;
      expect(x0 >= 8 && y0 >= 112 && y1 < 160, r.fixture).toBe(true);
      expect(r.romGlyphAge).toBe(r.duration);
    }
  });
});
