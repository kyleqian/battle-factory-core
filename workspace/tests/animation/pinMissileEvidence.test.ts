import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Fixture {
  readonly orientation: string;
  readonly status: string;
  readonly sourceBounds: { readonly start: string; readonly endExclusive: string };
  readonly sourceWindow: {
    readonly startFrame: number;
    readonly endFrame: number;
    readonly frameCount: number;
  };
  readonly probeJsonSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly componentMatching: number;
    readonly framebufferMatching: number;
    readonly freshRuns: number;
  };
}

const fixture = (name: string): Fixture => JSON.parse(readFileSync(
  `tools/compare/fixtures/${name}`, "utf8",
)) as Fixture;

describe("MOVE_PIN_MISSILE exact evidence contract", () => {
  it("pins both complete bilateral source windows and immutable receipts", () => {
    const player = fixture("pin-missile-player-qwilfish-opponent-onix.json");
    const opponent = fixture("pin-missile-opponent-qwilfish-player-onix.json");

    expect([player.orientation, opponent.orientation]).toEqual([
      "player-back", "opponent-front",
    ]);
    expect([player.sourceWindow, opponent.sourceWindow]).toEqual([
      { startFrame: 86, endFrame: 178, frameCount: 93 },
      { startFrame: 90, endFrame: 182, frameCount: 93 },
    ]);
    for (const receipt of [player, opponent]) {
      expect(receipt).toMatchObject({
        status: "exact",
        sourceBounds: { start: "0x082c9b60", endExclusive: "0x082c9c25" },
        acceptance: {
          componentMatching: 93, framebufferMatching: 93, freshRuns: 2,
        },
      });
      expect(receipt.probeJsonSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(receipt.changeMapSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("keeps the verifier source-derived and residual-intolerant", () => {
    const audit = readFileSync(
      "tools/compare/evidence/pin-missile-source-audit.md", "utf8",
    );
    const portable = readFileSync("tools/compare/pinMissilePortable.ts", "utf8");
    for (const token of [
      "InitAnimArcTranslation", "TranslateAnimHorizontalArc", "Q8.8",
      "AnimMissileArc_Step", "AnimTask_ShakeMon2", "BIOS",
    ]) expect(audit).toContain(token);
    for (const token of [
      "probeJsonSha256", "rawRgbSha256", "changeMapSha256",
      "hardwareOam", "hardwareMatrices", "hardwarePalette", "soundTaskCount",
      "component !== 93 || framebuffer !== 93",
    ]) expect(portable).toContain(token);
  });
});
