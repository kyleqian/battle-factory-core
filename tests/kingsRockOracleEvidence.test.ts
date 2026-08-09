import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "../tools/battle-lab/mechanic-kings-rock-flinch-off.json" with { type: "json" };
import receipt from "../tools/probe/receipts/kings-rock-flinch-off.json" with { type: "json" };

describe("King's Rock Battle Scene OFF family receipt", () => {
  it("uses complete legal parties and a faster holder against a durable slower target", () => {
    expect(fixture).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-off", seed: 11 });
    expect(fixture.overrides.parties.player).toHaveLength(3);
    expect(fixture.overrides.parties.opponent).toHaveLength(3);
    expect(fixture.overrides.parties.player[0]).toMatchObject({ species: 305, item: 187, moves: [1, 1, 1, 1] });
    expect(fixture.overrides.parties.opponent[0]).toMatchObject({ species: 213, item: 0, moves: [33, 33, 33, 33] });
  });

  it("pins the <10 roll, flinch write, cancellation message handoff, and absent target move", () => {
    const proc = receipt.oracle.draws.find((draw) => draw.frame === 244);
    expect(proc).toMatchObject({ count: 1, randomValue: 25504, roll100: 4 });
    expect(receipt.oracle.status2Writes).toEqual([
      { frame: 244, before: 0, after: 8, battleScript: 137202263 },
      { frame: 250, before: 8, after: 0, battleScript: 137212571 },
    ]);
    expect(receipt.oracle.targetTacklePpBefore).toBe(35);
    expect(receipt.oracle.targetTacklePpAfter).toBe(35);
    expect(receipt.oracle.targetMoveExecuted).toBe(false);

    const scripts = readFileSync("reference/pokeemerald/data/battle_scripts_1.s", "utf8");
    expect(scripts).toContain("BattleScript_MoveUsedFlinched::\n\tprintstring STRINGID_PKMNFLINCHED");
  });
});
