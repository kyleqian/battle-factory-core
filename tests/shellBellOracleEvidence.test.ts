import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import healFixture from "../tools/battle-lab/mechanic-shell-bell-heal-off.json" with { type: "json" };
import controlFixture from "../tools/battle-lab/mechanic-shell-bell-control-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/shell-bell-heal-off.json" with { type: "json" };

describe("Shell Bell Battle Scene OFF family receipt", () => {
  it("uses complete legal parties and a slower holder that is already damaged before its own qualifying hit", () => {
    expect(healFixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 11 });
    expect(controlFixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 11 });
    expect(healFixture.overrides.parties.player).toHaveLength(3);
    expect(healFixture.overrides.parties.opponent).toHaveLength(3);
    expect(healFixture.overrides.parties.player[0]).toMatchObject({ species: 213, item: 219, moves: [1, 1, 1, 1] });
    expect(controlFixture.overrides.parties.player[0]).toMatchObject({ species: 213, item: 0, moves: [1, 1, 1, 1] });
    expect(healFixture.overrides.parties.opponent[0]).toMatchObject({ species: 305, item: 0, moves: [1, 1, 1, 1] });

    // the two fixtures differ only in the holder's item
    const healCopy = JSON.parse(JSON.stringify(healFixture));
    healCopy.overrides.parties.player[0].item = 0;
    expect(healCopy).toEqual(controlFixture);
  });

  it("pins the holder's incoming-damage write, shellBellDmg record/clear, and the exact heal", () => {
    const heal = receipt.oracle.heal;
    const control = receipt.oracle.control;

    expect(heal.holderItem).toBe(219);
    expect(control.holderItem).toBe(0);

    expect(heal.holderHpWrites).toEqual([
      { frame: 150, before: 127, after: 122 },
      { frame: 521, before: 122, after: 123 },
    ]);
    expect(control.holderHpWrites).toEqual([{ frame: 150, before: 127, after: 122 }]);
    expect(control.holderHpAfter).toBe(122);
    expect(heal.holderHpAfter).toBe(123);

    expect(heal.targetShellBellDmgWrites).toEqual([
      { frame: 361, before: 0, after: 7 },
      { frame: 371, before: 7, after: 0 },
    ]);
    expect(receipt.oracle.expectedHeal).toBe(1);
    expect(receipt.oracle.actualHeal).toBe(1);

    expect(heal.holderPpBefore - heal.holderPpAfter).toBe(1);
    expect(control.holderPpBefore - control.holderPpAfter).toBe(1);
    expect(heal.targetPpBefore - heal.targetPpAfter).toBe(1);
    expect(control.targetPpBefore - control.targetPpAfter).toBe(1);
  });

  it("consumes identical action-RNG values/order/counts in both arms (Shell Bell draws no Random())", () => {
    const stripFrame = (rows: Array<Record<string, unknown>>) =>
      rows.map(({ count, rngValue, randomValue }) => ({ count, rngValue, randomValue }));
    expect(stripFrame(receipt.oracle.heal.draws)).toEqual(stripFrame(receipt.oracle.control.draws));

    const util = readFileSync("reference/pokeemerald/src/battle_util.c", "utf8");
    expect(util).toContain("case HOLD_EFFECT_SHELL_BELL:");
    expect(util).not.toContain("case HOLD_EFFECT_SHELL_BELL:\n                if (Random()");
  });
});
