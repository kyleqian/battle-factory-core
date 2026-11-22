// bbk1 (docs/aud251-s11-scoreboard-refresh.md, section "bbk1"): Brick Break through a Reflect / Light Screen. Scene OFF ROM rows (labs
// tools/battle-lab/bbk1-brickbreak-{lightscreen,reflect}-off.json): used print 208, `BrickBreakAnim+0x10` print 278 (+70), SE 14 363 (print + 85).
// The `move-animation` between the used print and the wall-shattered print is the 46-row body (it was the 112 that includes the print's own waitmessage),
// and the print's hold is 64 + 3 rows (typecalc2 / effectivenesssound / hitanimation) after the 19 glyphs.
import { describe, expect, it } from "vitest";
import { trn176Production } from "../tools/integration/trn176Predict.ts";

const MOVE = { BRICK_BREAK: 280, LIGHT_SCREEN: 113, REFLECT: 115, TACKLE: 33 };
const shape = (rows: readonly { type: string; frames: number }[]) => rows.map((row) => [row.type, row.frames]);

describe("bbk1: Brick Break through a screen", () => {
  for (const [name, screen] of [["Light Screen", MOVE.LIGHT_SCREEN], ["Reflect", MOVE.REFLECT]] as const) {
    it(`Scene OFF through ${name}: used print 25, body 46, wall print 86 (19 glyphs + 64 + 3), then the hit`, () => {
      const rows = shape(trn176Production("PRIMEAPE", MOVE.BRICK_BREAK, "ONIX", screen, false, "off").rows);
      expect(rows.slice(5, 9)).toEqual([["message", 25], ["move-animation", 46], ["message", 86], ["hit-animation", 35]]);
    });
  }

  it("Scene OFF with no screen: the 46-row body into the hit is unchanged (ROM used print 31 -> SE 100, 69 rows)", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.BRICK_BREAK, "ONIX", MOVE.TACKLE, true, "off").rows);
    expect(rows.slice(0, 3)).toEqual([["message", 25], ["move-animation", 46], ["hit-animation", 35]]);
  });

  it("Scene ON through Light Screen: the wall print holds 86 too (ROM print -> SE 85 in both scenes)", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.BRICK_BREAK, "ONIX", MOVE.LIGHT_SCREEN, false, "on").rows);
    expect(rows.slice(5, 9)).toEqual([["message", 25], ["move-animation", 208], ["message", 86], ["hit-animation", 35]]);
  });
});
