// chg4 (docs/aud251-s11-scoreboard-refresh.md, section "chg4"): the first charging turn of a two-turn move that follows another action in the same turn
// (a faster foe's Light Screen) opens with an action-transition pause. Pinned against the ROM labs tools/battle-lab/chg4-dig-lightscreen-{on,off}.json:
// Scene OFF MoveEnd 197 -> EffectSemiInvulnerable 204 -> charge box 215 (the pause grows to 18 over the old 0); Scene ON carries 2 of the rows already and
// its box opens 8 rows before the printstring row (-10), ROM SE 175 exact on the first instance.
import { describe, expect, it } from "vitest";
import { trn176Production } from "../tools/integration/trn176Predict.ts";

const MOVE = { DIG: 91, SOLAR_BEAM: 76, LIGHT_SCREEN: 113 };
const shape = (rows: readonly { type: string; frames: number }[]) => rows.map((row) => [row.type, row.frames]);

describe("chg4: a first charging turn after another action is a transition print", () => {
  it("Scene OFF Dig after the foe's Light Screen: pause 18 before the Light Screen sprite receipt, then the 1-row charge box", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.DIG, "ONIX", MOVE.LIGHT_SCREEN, false, "off").rows);
    expect(rows.slice(0, 6)).toEqual([["message", 26], ["move-animation", 40], ["message", 97], ["move-animation", 18], ["sprite-visibility", 1], ["message", 1]]);
  });

  it("Scene OFF Solar Beam after the foe's Light Screen: pause 17", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.SOLAR_BEAM, "ONIX", MOVE.LIGHT_SCREEN, false, "off").rows);
    expect(rows.slice(2, 5)).toEqual([["message", 97], ["move-animation", 17], ["sprite-visibility", 1]]);
  });

  it("Scene ON Dig after the foe's Light Screen: pause 8 (ROM -10 against the OFF 18), then the charge box", () => {
    const rows = shape(trn176Production("PRIMEAPE", MOVE.DIG, "ONIX", MOVE.LIGHT_SCREEN, false, "on").rows);
    expect(rows.slice(2, 6)).toEqual([["message", 97], ["move-animation", 8], ["sprite-visibility", 1], ["message", 8]]);
  });
});
