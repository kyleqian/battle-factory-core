import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Receipt = {
  readonly orientation: string;
  readonly attacker: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly target: { readonly species: string; readonly geometry: { readonly side: string } };
  readonly sourceWindow: { readonly startFrame: number; readonly endFrame: number; readonly frameCount: number };
  readonly evidenceSha256: string;
  readonly rawRgbSha256: string;
};

function receipt(path: string): Receipt {
  return JSON.parse(readFileSync(path, "utf8")) as Receipt;
}

describe("focus-energy-endure-effect component-track receipt ratchet", () => {
  it("requires independent exact bilateral FOCUS_ENERGY and ENDURE receipts", () => {
    const focusEnergy = [
      receipt("tools/compare/fixtures/focus-energy-player-taillow-opponent-onix.json"),
      receipt("tools/compare/fixtures/focus-energy-opponent-taillow-player-onix.json"),
    ];
    const endure = [
      receipt("tools/compare/fixtures/endure-player-eevee-opponent-onix.json"),
      receipt("tools/compare/fixtures/endure-opponent-eevee-player-onix.json"),
    ];

    expect(focusEnergy.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Taillow -> opponent-front Onix", "TAILLOW", "player", "ONIX", "opponent", { startFrame: 73, endFrame: 194, frameCount: 122 },
        "949eb21875d5e28e302eaa93fe43227276b3aed3b041a03b6350aa81f9d80ae4",
        "45e757153f886b06888d366d722e8d712e4bc13dac061ecd18534d8b487049c5"],
      ["opponent-front Taillow -> player-back Onix", "TAILLOW", "opponent", "ONIX", "player", { startFrame: 77, endFrame: 198, frameCount: 122 },
        "67990c21bf1701db9438607a2092418f936c4ab52733ba8b7e11a069b8782cc7",
        "a0e387e67c4c0ff6330bf472d9a9d480d571c9259053f1350f068cffd40c9ad5"],
    ]);
    expect(endure.map((entry) => [
      entry.orientation,
      entry.attacker.species,
      entry.attacker.geometry.side,
      entry.target.species,
      entry.target.geometry.side,
      entry.sourceWindow,
      entry.evidenceSha256,
      entry.rawRgbSha256,
    ])).toEqual([
      ["player-back Eevee -> opponent-front Onix", "EEVEE", "player", "ONIX", "opponent", { startFrame: 64, endFrame: 185, frameCount: 122 },
        "5ffe4994c6309b84567bbc7042861001df3275b1f8b2c330e0fa7dc6b5030024",
        "941937cba7a24982a921510a31582ae4fb2bc927ce18d04b9ddd1a61ecf9ce3a"],
      ["opponent-front Eevee -> player-back Onix", "EEVEE", "opponent", "ONIX", "player", { startFrame: 68, endFrame: 189, frameCount: 122 },
        "3fc347ae124e95c51bf7975169ac6a59c1734f1f5b111776cca088531726c1d2",
        "19b16868e0184521c3514ebc73a47235400bc06a09a7f216a93b8d0e29972ffd"],
    ]);

    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status: string }) => entry.status === "exact"))
      .toHaveLength(231);
    expect(coverage.entries.filter((entry: { status: string }) =>
      entry.status === "partial" || entry.status === "staged",
    )).toEqual([]);
    for (const move of ["MOVE_FOCUS_ENERGY", "MOVE_ENDURE"]) {
      expect(coverage.entries.find((entry: { move: string }) => entry.move === move))
        .toMatchObject({ move, status: "exact" });
    }
    expect(coverage.componentTracks.filter((track: { id: string }) =>
      track.id === "focus-energy-endure-effect",
    )).toEqual([
      expect.objectContaining({
        components: [
          "asset:ANIM_TAG_FOCUS_ENERGY",
          "subroutine:EndureEffect",
          "sprite:gEndureEnergySpriteTemplate",
          "visualCommand:blend_color_cycle",
          "task:AnimTask_ShakeMon2",
        ],
        representatives: ["MOVE_FOCUS_ENERGY", "MOVE_ENDURE"],
        fulfilled: true,
      }),
    ]);
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "focus-energy-endure-effect",
    )?.goal).toContain("MOVE_FOCUS_PUNCH remains unsupported");
  });
});
