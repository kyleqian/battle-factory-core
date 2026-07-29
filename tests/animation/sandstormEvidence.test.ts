import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MOVE_SANDSTORM complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON orientation receipts", () => {
    for (const [path, window, evidence, raw] of [
      [
        "tools/compare/fixtures/sandstorm-player-phanpy-opponent-onix.json",
        { startFrame: 210, endFrame: 377, frameCount: 168 },
        "678cbc9073564cec54c76709704009d17586b45f1301dc129d13c840b0337b1e",
        "2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958",
      ],
      [
        "tools/compare/fixtures/sandstorm-opponent-phanpy-player-onix.json",
        { startFrame: 305, endFrame: 472, frameCount: 168 },
        "ba90eb87f3466644cf4e3c085231265bf7138fcd0e2d286a41574e35f9af12d2",
        "151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4",
      ],
    ] as const) {
      const fixture = JSON.parse(readFileSync(path, "utf8"));
      expect(fixture.schema).toBe("sandstorm-portable-evidence/v1");
      expect(fixture.sourceWindow).toEqual(window);
      expect(fixture.lifecycleCounts).toEqual({
        gFlyingSandCrescentSpriteTemplate: 7,
      });
      expect(fixture.evidenceSha256).toBe(evidence);
      expect(fixture.rawRgbSha256).toBe(raw);
      expect(fixture.attacker.species).toBe("PHANPY");
      expect(fixture.target.species).toBe("ONIX");
    }
  });
});
