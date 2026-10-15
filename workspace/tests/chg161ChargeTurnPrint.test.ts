// chg161 (ISSUES #167 (d), docs/chg161-charge-turn-print.md): the two-turn charge-turn empty box (BattleScriptFirstChargingTurn's
// printstring STRINGID_EMPTYSTRING3) through production, against off108's dense ROM windows (re-probed fresh by chg161Run.sh).
import { describe, expect, it } from "vitest";
import { CHG161_ARMS, chg161Production, chg161Rom } from "../tools/integration/chg161Anchors.ts";

describe("chg161 charge-turn empty box", () => {
  it("Scene OFF: the box is one row and the charge print's first glyph lands on the ROM row (3 / 3)", () => {
    for (const arm of CHG161_ARMS) {
      const production = chg161Production(arm.move, "off");
      expect(production.boxFrames).toBe(1);
      expect(production.chargeGlyph).toBe(chg161Rom(arm.scenario, "off").chargeGlyph);
      expect(production.rows[1]).toMatchObject({ type: "move-animation", start: 1, frames: 41 });
    }
  });

  it("Scene ON: the box carries the post-waitanimation rows; the charge glyph lands (Razor Wind -1: its live adapter)", () => {
    const residuals = CHG161_ARMS.map((arm) => {
      const production = chg161Production(arm.move, "on");
      expect(production.boxFrames).toBe(8);
      return production.chargeGlyph! - chg161Rom(arm.scenario, "on").chargeGlyph;
    });
    expect(residuals).toEqual([0, -1, 0]);
  });

  it("a charge turn's ROM box clears on G + 1 and the foe's next print stays on the general end-of-action residual", () => {
    const residual = (scene: "on" | "off") => CHG161_ARMS.map((arm) =>
      chg161Production(arm.move, scene).foeUsedGlyph! - chg161Rom(arm.scenario, scene).foeUsedGlyph);
    // Scene ON, ISSUES #167 remainder: the held print -> next action's "used" transition (Sand-Attack control: -12 on the same edge).
    for (const r of residual("on")) {
      expect(r).toBeGreaterThanOrEqual(-14);
      expect(r).toBeLessThanOrEqual(-10);
    }
    // Scene OFF, trn178 (docs/trn178-action-transition-live.md): the action-transition pause (P = d + 6 + u: Dig 14, Razor Wind /
    // Solar Beam 13) lands Razor Wind / Solar Beam exactly (was -13 / -13); Dig keeps its print's own +4 ("dug a hole!" 88 vs the ROM's 85
    // + the lead row; was -10).
    expect(residual("off")).toEqual([4, 0, 0]);
  });
});
