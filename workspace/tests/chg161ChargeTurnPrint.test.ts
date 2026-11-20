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

  it("Scene ON: the box carries the post-waitanimation rows; the charge glyph lands (Razor Wind +4 after lse4: the live adapter)", () => {
    const residuals = CHG161_ARMS.map((arm) => {
      const production = chg161Production(arm.move, "on");
      expect(production.boxFrames).toBe(8);
      return production.chargeGlyph! - chg161Rom(arm.scenario, "on").chargeGlyph;
    });
    expect(residuals).toEqual([0, 4, 0]); // lse4: Razor Wind -1 -> +4 (the aud261 lab's ROM glyph is exact at +5 rows; this Primeape lab's ROM body is shorter than the 45-row window)
  });

  it("a charge turn's ROM box clears on G + 1 and the foe's next print stays on the general end-of-action residual", () => {
    const residual = (scene: "on" | "off") => CHG161_ARMS.map((arm) =>
      chg161Production(arm.move, scene).foeUsedGlyph! - chg161Rom(arm.scenario, scene).foeUsedGlyph);
    // Scene ON, trn181 (docs/trn181-action-transition-on.md): the same action-transition pause as Scene OFF (Dig 14, Razor Wind /
    // Solar Beam 13; was -10..-14, the held print -> next "used" transition) leaves Razor Wind -1 (its live adapter, the box test
    // above); Dig's old +4 was the 24 print floor's over-hold (lsd194), now 0.
    expect(residual("on")).toEqual([0, 4, 0]); // lse4: Razor Wind -1 -> +4 (same +5 as the box test)
    // Scene OFF, trn178 (docs/trn178-action-transition-live.md): the action-transition pause (P = d + 6 + u: Dig 14, Razor Wind /
    // Solar Beam 13) lands Razor Wind / Solar Beam exactly (was -13 / -13); Dig's old +4 (the "dug a hole!" 24 print floor over-hold,
    // lsd194) is now 0.
    expect(residual("off")).toEqual([0, 0, 0]);
  });
});
