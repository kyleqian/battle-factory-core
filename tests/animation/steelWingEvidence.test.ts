import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Receipt {
  readonly oracleProfile: string;
  readonly move: string;
  readonly denseWindow: { readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly acceptance: { readonly status: string; readonly framebufferMatching: number };
}

const fixtures: Array<[string, number]> = [
  // player-back Wingull -> opponent Onix
  ["tools/compare/fixtures/steel-wing-player-wingull-opponent-onix.json", 180],
  // opponent-front Wingull -> player Onix
  ["tools/compare/fixtures/steel-wing-opponent-wingull-player-onix.json", 197],
];

describe("MOVE_STEEL_WING dense evidence receipts", () => {
  it.each(fixtures)("pins a twice-fresh complete Scene-ON window: %s", (path, expectedMatching) => {
    const receipt = JSON.parse(readFileSync(path, "utf8")) as Receipt;
    expect(receipt.oracleProfile).toBe("battle-scene-on");
    expect(receipt.move).toBe("STEEL_WING");
    expect(receipt.denseWindow.frameCount).toBe(197);
    expect(receipt.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.secondFreshEvidenceSha256).toBe(receipt.evidenceSha256);
    expect(receipt.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    // The opponent orientation reached 197/197 production identity once, but
    // the player orientation still diverges on the two plausible ranges
    // (ages 144-155 faded gust palette, 181-185 slide-back), so neither is
    // promoted: status stays "partial" for both until 197/197 twice fresh.
    expect(receipt.acceptance.status).toBe("partial");
    expect(receipt.acceptance.framebufferMatching).toBe(expectedMatching);
  });
});
