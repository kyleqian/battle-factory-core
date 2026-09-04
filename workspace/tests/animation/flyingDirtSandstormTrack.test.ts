import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type SandstormReceipt = {
  readonly orientation: string;
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly lifecycleCounts: Readonly<Record<string, number>>;
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

type HeatWaveReceipt = {
  readonly orientation: string;
  readonly denseWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly secondFreshEvidenceSha256: string;
  readonly rawRgbSha256: string;
  readonly changeMapSha256: string;
  readonly acceptance: {
    readonly status: string;
    readonly denseEvidenceFrames: number;
    readonly productionFramebufferFrames: number;
  };
};

function receipt<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("flying-dirt-sandstorm component-track receipt ratchet", () => {
  it("requires both independently exact bilateral move receipts before fulfillment", () => {
    const sandstorm = [
      receipt<SandstormReceipt>("tools/compare/fixtures/sandstorm-player-phanpy-opponent-onix.json"),
      receipt<SandstormReceipt>("tools/compare/fixtures/sandstorm-opponent-phanpy-player-onix.json"),
    ];
    const heatWave = [
      receipt<HeatWaveReceipt>("tools/compare/fixtures/heat-wave-player-ninetales-opponent-onix.json"),
      receipt<HeatWaveReceipt>("tools/compare/fixtures/heat-wave-opponent-ninetales-player-onix.json"),
    ];

    expect(sandstorm.map((entry) => [
      entry.orientation,
      entry.sourceWindow,
      entry.lifecycleCounts.gFlyingSandCrescentSpriteTemplate,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Phanpy -> opponent-front Onix", { startFrame: 210, endFrame: 377, frameCount: 168 }, 7,
        "a06847b11c6089b18c26a238988b53cad04fcc393babb05fff4a666f41266c4d",
        "2968b95f680be00e14cb3386487629b142eb0ac05910f1dad69da7dc885e9958"],
      ["opponent-front Phanpy -> player-back Onix", { startFrame: 305, endFrame: 472, frameCount: 168 }, 7,
        "29e51b99d4e4a40be602a031dee4cfae037ff4b1471ee36e2bf17ceaf7e92ffc",
        "151561fae96ddc3d919e3f0254b987162cd9e078e92c5e414b4e0a9689edd2e4"],
    ]);
    expect(heatWave.map((entry) => [
      entry.orientation,
      entry.denseWindow,
      entry.evidenceSha256,
      entry.secondFreshEvidenceSha256,
      entry.rawRgbSha256,
      entry.changeMapSha256,
      entry.acceptance,
    ])).toEqual([
      ["player-back", { startFrame: 78, endFrame: 245, frameCount: 168 },
        "0a9e7a224193ab76b1ace7cd1c1479d72076b36daa1399604dc5b3bf3e7defbd",
        "0a9e7a224193ab76b1ace7cd1c1479d72076b36daa1399604dc5b3bf3e7defbd",
        "a22b496d0a8622a96e2cdc223b234976777914196d0add14a6c1a43867ef9446",
        "29c4abde8bb9fcf6852b3c65a7878236f0b12c625ed184030cf45f59a9362bf8",
        { status: "exact", denseEvidenceFrames: 168, productionFramebufferFrames: 168 }],
      ["opponent-front", { startFrame: 82, endFrame: 249, frameCount: 168 },
        "71fc59d12b5971122802695cd5104be695b47b0f27ecd54a7ee537746c9e3097",
        "71fc59d12b5971122802695cd5104be695b47b0f27ecd54a7ee537746c9e3097",
        "5050e7a3c99a44a4ddfdef57ed5442c50ebfbb4fe9aef0020b25cc9e05b92db0",
        "840d4f8b10d9419160c28db4bbf7202bf38435d1eff9ccb802f9dd832cd44ded",
        { status: "exact", denseEvidenceFrames: 168, productionFramebufferFrames: 168 }],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { move: string }) =>
      ["MOVE_SANDSTORM", "MOVE_HEAT_WAVE"].includes(entry.move),
    )).toEqual([
      expect.objectContaining({ move: "MOVE_HEAT_WAVE", status: "exact" }),
      expect.objectContaining({ move: "MOVE_SANDSTORM", status: "exact" }),
    ]);
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "flying-dirt-sandstorm",
    )).toEqual([
      expect.objectContaining({
        components: [
          "asset:ANIM_TAG_FLYING_DIRT",
          "sprite:gFlyingSandCrescentSpriteTemplate",
          "task:AnimTask_LoadSandstormBackground",
        ],
        representatives: ["MOVE_SANDSTORM", "MOVE_HEAT_WAVE"],
        fulfilled: true,
      }),
    ]);
  });
});
