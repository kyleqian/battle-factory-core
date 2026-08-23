import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_WISH complete dense evidence", () => {
  it("pins both legal challenge-0 Scene-ON orientation receipts", () => {
    for (const [path, window, evidence, raw, mapSha] of [
      [
        "tools/compare/fixtures/wish-player-illumise-opponent-onix.json",
        { startFrame: 65, endFrame: 335, frameCount: 271 },
        "6693ded4620cba170830aab24c8960b72577cf61e388f7bdca0ee7ae002770fd",
        "2f82ec073d7f7e52b5a513733b991ef792b374d72c9b40c535f1e42438b86488",
        "8fc52ed8d0f508e904533e792f90323604c817c0a48a8a4127a51056456e7917",
      ],
      [
        "tools/compare/fixtures/wish-opponent-illumise-player-onix.json",
        { startFrame: 69, endFrame: 339, frameCount: 271 },
        "b1ec1f23294c6ca21c8b3137ca2d0dc6a07e0ed90f0f19b086213c10bdb80443",
        "f858c38f13030f4d3a173776ee2a1319835f2089b61f8b7ac6484f12a859315d",
        "e13e9ebfd7641f931381caf5cbfd96473886e89d50bd13e954530c61d7265329",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("wish-portable-evidence/v1");
      expect(fixture.sourceWindow).toEqual(window);
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(fixture.changeMapSha256).toBe(mapSha);
      expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
        .toBe(mapSha);
      const changeMap = JSON.parse(readFileSync(fixture.changeMap, "utf8"));
      expect(changeMap.latches).toEqual({
        hardwareOamEqualsPrecedingSoftware: "270/270",
        hardwareMatricesEqualsPrecedingSoftware: "270/270",
        hardwarePaletteEqualsPrecedingFaded: "270/270",
      });
      expect(changeMap.gameplayRngTransitions).toBe(0);
      expect(changeMap.animationRngTransitions).toBe(270);
      expect(changeMap.rows).toHaveLength(271);
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
