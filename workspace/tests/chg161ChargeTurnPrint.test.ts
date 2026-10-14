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
    for (const arm of CHG161_ARMS) {
      for (const scene of ["on", "off"] as const) {
        const rom = chg161Rom(arm.scenario, scene);
        const production = chg161Production(arm.move, scene);
        // ISSUES #167 remainder: the held print -> next action's "used" transition (Sand-Attack control: -12 on the same edge).
        expect(production.foeUsedGlyph! - rom.foeUsedGlyph).toBeGreaterThanOrEqual(-14);
        expect(production.foeUsedGlyph! - rom.foeUsedGlyph).toBeLessThanOrEqual(-10);
      }
    }
  });
});
