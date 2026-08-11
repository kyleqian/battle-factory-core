import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_FOLLOW_ME complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON orientation receipts", () => {
    for (const path of [
      "tools/compare/fixtures/follow-me-player-togetic-opponent-onix.json",
      "tools/compare/fixtures/follow-me-opponent-togetic-player-onix.json",
    ]) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("follow-me-portable-evidence/v1");
      expect(fixture.sourceWindow.frameCount).toBe(185);
      expect(fixture.lifecycleCounts).toEqual({
        gFollowMeFingerSpriteTemplate: 1,
      });
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
