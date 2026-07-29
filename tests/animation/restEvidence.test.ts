import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_REST complete dense evidence", () => {
  it("pins both legal challenge-0 Scene-ON orientation receipts", () => {
    for (const path of [
      "tools/compare/fixtures/rest-player-teddiursa-opponent-onix.json",
      "tools/compare/fixtures/rest-opponent-teddiursa-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("rest-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(110);
      expect(fixture.lifecycleCounts).toEqual({
        gSleepLetterZSpriteTemplate: 3,
      });
      expect(fixture.battleState).toMatchObject({
        damagedHp: 141,
        maxHp: 153,
        status1: 3,
        statusKind: "sleep",
        statusTurns: 3,
        heldItem: 134,
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
