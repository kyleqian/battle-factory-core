import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fixtures = [
  {
    path: "tools/compare/fixtures/drill-peck-player-fearow-opponent-onix.json",
    orientation: "player-back",
    start: 74,
    end: 164,
    probe: "3dfa1176ee1510f8f1731f346b2c00e917b2cbbaded506aadfbee56adb5ee604",
    raw: "8e4bab34b1607240498bd5e92e81c5a4316c1967b1424b06f58f79ce55ddd129",
    map: "2904db856f8356627f7a97258dcc2f74d8ff867dbb2215b2949d0200c558baf5",
  },
  {
    path: "tools/compare/fixtures/drill-peck-opponent-fearow-player-onix.json",
    orientation: "opponent-front",
    start: 78,
    end: 168,
    probe: "48356792c71cac7f1e4ed9d07e0b3600d5a60f0b443f349385e7279b11ea7588",
    raw: "ab2adf5fa78bdef4d5a5d7b753fae916f90ea5ef4120c2263c8cb103d723bdb4",
    map: "ada68549dd235039d2e75b021c86b11b7621a6b0cd766a9220e3076faf0f406f",
  },
] as const;

describe("MOVE_DRILL_PECK bilateral Scene-ON evidence checkpoint", () => {
  it.each(fixtures)("pins complete $orientation legal dense evidence", (expected) => {
    const fixture = JSON.parse(readFileSync(expected.path, "utf8"));
    const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
    expect(fixture).toMatchObject({
      schema: "drill-peck-evidence/v1", oracleProfile: "battle-scene-on",
      move: "DRILL_PECK", moveId: 65, orientation: expected.orientation,
      probe: "tools/compare/drillPeckProbe.py",
      sourceBounds: { start: "0x082cafc8", endExclusive: "0x082cb020" },
      sourceWindow: { startFrame: expected.start, endFrame: expected.end, frameCount: 91 },
      probeJsonSha256: expected.probe, rawRgbSha256: expected.raw,
      changeMapSha256: expected.map,
      acceptance: {
        status: "evidence-only", completeDenseWindow: 91,
        reducer: 0, typedSeam: 0, framebuffer: 0,
      },
    });
    expect(createHash("sha256").update(readFileSync(fixture.changeMap)).digest("hex"))
      .toBe(expected.map);
    expect(scenario).toMatchObject({ profile: "battle-scene-on", level: 50, challengeNum: 3 });
    for (const side of ["player", "opponent"] as const) {
      expect(scenario.overrides.parties[side]).toHaveLength(3);
      for (const mon of scenario.overrides.parties[side]) {
        expect(mon).toMatchObject({
          level: 50,
          ivs: { hp: 31, attack: 31, defense: 31, speed: 31, spAttack: 31, spDefense: 31 },
        });
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
      }
    }
    const active = scenario.overrides.parties[
      expected.orientation === "player-back" ? "player" : "opponent"
    ][0];
    expect(active).toMatchObject({
      species: 22, nature: 3, item: 210, moves: [65, 65, 65, 65],
      evs: { hp: 0, attack: 255, defense: 0, speed: 255, spAttack: 0, spDefense: 0 },
    });
  });

  it("keeps the pointer-bounded probe and complete receipt inventory load-bearing", () => {
    const probe = readFileSync("tools/compare/drillPeckProbe.py", "utf8");
    for (const pin of [
      '"Move_DRILL_PECK"', '"Move_WATERFALL"', "scriptOffset", "scriptPtr",
      "gBowMonSpriteTemplate", "gFlashingHitSplatSpriteTemplate",
      "gWhirlwindLineSpriteTemplate", "gSlideMonToOriginalPosSpriteTemplate",
      "softwareOam", "hardwareOam", "hardwareMatrices", "hardwarePalette",
      "paletteTags", "tileTags", "SE_M_HEADBUTT", "SE_M_HORN_ATTACK",
      'snapshot["battlers"]', "not active",
    ]) expect(probe).toContain(pin);
  });

  it("keeps a twice-fresh Scene-ON verifier while honestly withholding promotion", () => {
    const evidence = readFileSync("tools/compare/drillPeckEvidence.ts", "utf8");
    for (const pin of [
      "tools/run-mgba-probe.py", "frame-changemap.py", "runNumber <= 2",
      "startsAcrossWindow", "AnimTask_DrillPeckHitSplats", "AnimTask_ShakeMon2_Step",
      "Task_LoopAndPlaySE", "concatenated raw RGB", "battle outcome mutated",
      "incomplete hardware receipt", "first inactive cleanup",
    ]) expect(evidence).toContain(pin);
    expect(evidence).not.toMatch(/render\(|sceneOnDrillPeck|framebufferDiff/);
  });
});
