import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import player from "../../tools/compare/fixtures/thunder-wave-player-flaaffy-opponent-shuckle.json" with { type: "json" };
import opponent from "../../tools/compare/fixtures/thunder-wave-opponent-flaaffy-player-shuckle.json" with { type: "json" };

describe("MOVE_THUNDER_WAVE exact Scene-ON evidence", () => {
  it("separates the source animation from the broader move capture", () => {
    expect(player).toMatchObject({
      oracleProfile: "battle-scene-on", move: "THUNDER_WAVE", reproductions: 2,
      captureWindow: { startFrame: 39, endFrame: 372, frameCount: 334 },
      activeSourceScriptWindow: { startFrame: 79, endFrame: 197, frameCount: 119 },
      sourceAnimationWindow: { startFrame: 79, endFrame: 198, frameCount: 120 },
      evidenceSha256: "3d8b1bee1a05da063dcd39bddd53296f0957cb8a13c4491fab42eaf3b1f267ee",
      rawRgbSha256: "aaa201bbc68db150c1c9becd9a83a30ff331569f75176f3937ec00b6b521c5a5",
    });
    expect(opponent).toMatchObject({
      oracleProfile: "battle-scene-on", move: "THUNDER_WAVE", reproductions: 2,
      captureWindow: { startFrame: 39, endFrame: 372, frameCount: 334 },
      activeSourceScriptWindow: { startFrame: 83, endFrame: 201, frameCount: 119 },
      sourceAnimationWindow: { startFrame: 83, endFrame: 202, frameCount: 120 },
      evidenceSha256: "0454b5a2523a3ff924884e867007cbcc6006bbfc324c33f2a211c9ce1e61b424",
      rawRgbSha256: "e97ad2bd2ad2ad6880ef7c5a0dfaa7113f603b21df970d19e5a42e76bc00236e",
    });
    expect(player.orientation).not.toEqual(opponent.orientation);
  });

  it("captures live script, complete task, asset, hardware, audio, and RGB state", () => {
    const probe = readFileSync("tools/compare/thunderWaveProbe.py", "utf8");
    const portable = readFileSync("tools/compare/thunderWavePortable.ts", "utf8");
    for (const field of [
      "\"gAnimScriptActive\"", "\"gBattleAnimScriptPtr\"", "\"gAnimFramesToWait\"",
      "sBattleAnimScriptPtr", "sAnimFramesToWait",
      "\"currentMove\"", "\"tasks\"", "\"func\"", "\"priority\"", "\"data\"",
      "\"paletteTags\"", "\"sprites\"", "\"hardwareOam\"", "\"hardwareMatrices\"",
      "\"hardwarePalette\"", "\"registers\"", "\"se1\"", "\"se2\"", "screen_rgb",
    ]) expect(probe).toContain(field);
    for (const field of [
      "thunderWaveAtAge", "sceneOnThunderWaveView", "hardwareOam",
      "hardwareMatrices", "hardwarePalette", "songHeaders",
      "framebufferDiff", "THUNDER_WAVE_FRAME_COUNT",
    ]) expect(portable).toContain(field);
    for (const fixture of [player, opponent]) {
      expect(fixture.evidenceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(fixture.rawRgbSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
