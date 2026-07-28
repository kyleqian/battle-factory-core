import { describe, expect, it } from "vitest";
import player from "../../tools/compare/fixtures/thunder-wave-player-flaaffy-opponent-shuckle.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/thunder-wave-opponent-flaaffy-player-shuckle.json" with { type: "json" };

describe("MOVE_THUNDER_WAVE staged Scene-ON evidence", () => {
  it("pins complete dense source windows in both legal Flaaffy orientations", () => {
    for (const fixture of [player, opponent]) {
      expect(fixture).toMatchObject({ oracleProfile: "battle-scene-on", move: "THUNDER_WAVE",
        probe: "tools/compare/thunderWaveProbe.py",
        sourceVisualWindow: { startFrame: 39, endFrame: 372, frameCount: 334 } });
    }
    expect(player.orientation).not.toEqual(opponent.orientation);
  });
});
