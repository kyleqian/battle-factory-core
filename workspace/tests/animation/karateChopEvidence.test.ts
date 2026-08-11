import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  {
    path: "tools/compare/fixtures/karate-chop-player-primeape-opponent-onix.json",
    orientation: "player-back",
    startFrame: 77,
    endFrame: 125,
    evidence: "757e70d97f3c2f8239def29cd10631872a65bd47f35eb306e9d97bd30a3d1c64",
    raw: "89c829e0abd01b065a9c9ac1133b4363df1fcf2127b644784565ded9de0f25c8",
    map: "4d1eb29bba18c5d780841fb99db77198c36c59a2f85ff743c591b6bd1520e979",
  },
  {
    path: "tools/compare/fixtures/karate-chop-opponent-primeape-player-onix.json",
    orientation: "opponent-front",
    startFrame: 81,
    endFrame: 129,
    evidence: "fb8697fbb6d098f4303f9502ddabaf52abd1ceee4ba8bc56a64b4747047a2ce3",
    raw: "f7762e1e4072f6807c6392648e5590ad6a41b59ef5def77707991cfa7a7c9396",
    map: "10e22bae0c4fb5c77a0daeba32e40dad25727165701849f7423b0611ec67e7bf",
  },
] as const;

describe("MOVE_KARATE_CHOP bilateral Scene-ON evidence checkpoint", () => {
  it.each(fixtures)("pins the complete $orientation source window", (expected) => {
    const fixture = JSON.parse(readFileSync(expected.path, "utf8"));
    const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
    expect(fixture).toMatchObject({
      schema: "karate-chop-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "KARATE_CHOP",
      orientation: expected.orientation,
      probe: "tools/compare/poisonFangProbe.py",
      probeMoveId: 2,
      sourceWindow: { startFrame: expected.startFrame, endFrame: expected.endFrame, frameCount: 49 },
      evidenceSha256: expected.evidence,
      rawRgbSha256: expected.raw,
      changeMapSha256: expected.map,
      acceptance: { status: "exact", componentMatching: 49, framebufferMatching: 49 },
    });
    expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex")).toBe(expected.map);
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 1 });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    const active = scenario.overrides.parties[expected.orientation === "player-back" ? "player" : "opponent"][0];
    expect(active).toMatchObject({ species: 57, nature: 24, item: 198, moves: [2, 2, 2, 2] });
    expect(active.evs).toEqual({ hp: 170, attack: 0, defense: 170, speed: 0, spAttack: 0, spDefense: 170 });
  });

  it("keeps the pointer, hardware, audio, sprite, task, and immutable-field inventory load-bearing", () => {
    const probe = readFileSync("tools/compare/poisonFangProbe.py", "utf8");
    for (const pin of [
      '"arm-none-eabi-nm", "-a"', "Move_KARATE_CHOP", "Move_CROSS_CHOP",
      "gKarateChopSpriteTemplate", "gBasicHitSplatSpriteTemplate",
      "AnimTask_ShakeMon", "scriptOffset", "softwareOam", "hardwareOam",
      "hardwareMatrices", "hardwarePalette", "SE_M_DOUBLE_TEAM",
      "SE_M_COMET_PUNCH", "player", "opponent", "not script_active",
    ]) expect(probe).toContain(pin);
  });

  it("keeps the portable production proof and source-age compositor load-bearing", () => {
    const portable = readFileSync("tools/compare/karateChopPortable.ts", "utf8");
    for (const pin of [
      "tools/run-mgba-probe.py", "frame-changemap.py", "karateChopAtAge",
      "sceneOnKarateChopView", "priorHardwareMatches", "priorHardwarePaletteMatches",
      "hardwareOam", "hardwareMatrices", "hardwarePalette", "target-pan audio",
      "framebufferDiff(render(engine), rgb)", "fresh-run receipts",
    ]) expect(portable).toContain(pin);
    const scene = readFileSync("src/engine/battleScene.ts", "utf8");
    const drawCase = scene.slice(
      scene.indexOf('if (state.config.move === "KARATE_CHOP")'),
      scene.indexOf('if (state.config.move === "STOMP")'),
    );
    expect(drawCase).toContain("age: karateState.age - 1");
    expect(drawCase).toContain("subTileset(battleAnimHandsAndFeet.tileset, 12, 4)");
    expect(drawCase).toContain("drawSpriteSheetAffineStretchBlendedOverFb");
    expect(drawCase).not.toMatch(/sourceWindow|startFrame|absolute|sha256|\.rgb/);
  });
});
