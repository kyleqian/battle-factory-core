import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_WISH complete dense evidence", () => {
  it("pins both legal challenge-0 Scene-ON orientation receipts", () => {
    for (const [path, window, evidence, raw] of [
      [
        "tools/compare/fixtures/wish-player-illumise-opponent-onix.json",
        { startFrame: 65, endFrame: 335, frameCount: 271 },
        "9bd713db92f51208dba4faea9916549981545a864fd50bb7761b13ae00e7077b",
        "2f82ec073d7f7e52b5a513733b991ef792b374d72c9b40c535f1e42438b86488",
      ],
      [
        "tools/compare/fixtures/wish-opponent-illumise-player-onix.json",
        { startFrame: 69, endFrame: 339, frameCount: 271 },
        "8c223ec57b228721dd6df2137b8597388b44d4749cd501d898ec4c4da9be2669",
        "f858c38f13030f4d3a173776ee2a1319835f2089b61f8b7ac6484f12a859315d",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("wish-portable-evidence/v1");
      expect(fixture.sourceWindow).toEqual(window);
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(fixture.attacker.species).toBe("ILLUMISE");
      expect(fixture.target.species).toBe("ONIX");
      expect(fixture.twinkles).toHaveLength(21);
      expect(fixture.lifecycleCounts).toEqual({
        gWishStarSpriteTemplate: 1,
        gMiniTwinklingStarSpriteTemplate: 21,
        gGrantingStarsSpriteTemplate: 2,
      });
    }
  });
});
