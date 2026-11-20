// chg1 (docs/aud251-s11-scoreboard-refresh.md, section "chg1"): Scene OFF two-turn moves. Production full-turn kernel (HITMARKER_NO_ANIMATIONS),
// charge turn rows pinned against the pixel-grounded chg1 labs (tools/battle-lab/chg1-*.json, 16 labs / traces).
import { describe, expect, it } from "vitest";
import { trn176Production } from "../tools/integration/trn176Predict.ts";

const MOVE = { DIG: 91, SOLAR_BEAM: 76, SKULL_BASH: 130, TACKLE: 33 };
const shape = (rows: readonly { type: string; frames: number }[]) => rows.map((row) => [row.type, row.frames]);

describe("chg1: Scene OFF two-turn moves", () => {
  it("Dig: charge box (1 row + 41 print lead), the Scene OFF hide split around the MoveEnd receipt (hide lead 2), turn end 9", () => {
    const rows = trn176Production("PRIMEAPE", MOVE.DIG, "ONIX", MOVE.TACKLE, true, "off").rows;
    expect(shape(rows).slice(0, 11)).toEqual([
      ["message", 1], ["move-animation", 41], ["message", 84], ["move-animation", 6], ["sprite-visibility", 1],
      ["move-animation", 8], ["sprite-visibility", 1], ["message", 56], ["message", 88], ["sprite-visibility", 1], ["turn-end", 9],
    ]);
  });

  it("Solar Beam: charge print, action-transition pause 13 before the foe's receipt, unleash turn end 8", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.SOLAR_BEAM, "ONIX", MOVE.TACKLE, true, "off").rows);
    expect(rows.slice(0, 5)).toEqual([["message", 1], ["move-animation", 41], ["message", 89], ["move-animation", 13], ["sprite-visibility", 1]]);
    expect(rows.at(-1)).toEqual(["turn-end", 8]);
  });

  it("Skull Bash: the Defense boost's stat command waits 7 rows after the charge box (stat timing +1, exact on the lab)", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.SKULL_BASH, "ONIX", MOVE.TACKLE, true, "off").rows);
    expect(rows.slice(0, 6)).toEqual([["message", 1], ["move-animation", 41], ["message", 89], ["stat", 7], ["stats-change", 77], ["message", 87]]);
  });
});
