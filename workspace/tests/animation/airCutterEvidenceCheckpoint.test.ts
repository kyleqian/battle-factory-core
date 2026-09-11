import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { verifyAirCutterEvidence } from "../../tools/compare/airCutterEvidence.ts";

type Json = Record<string, any>;
const root = resolve(import.meta.dirname, "../..");
const readJson = (path: string): Json => JSON.parse(readFileSync(resolve(root, path), "utf8")) as Json;
const stages = {
  "player-back": readJson("tools/battle-lab/mechanic-air-cutter-player-golbat-opponent-chansey.json"),
  "opponent-front": readJson("tools/battle-lab/mechanic-air-cutter-opponent-golbat-player-chansey.json"),
};
const fixture = readJson("tools/compare/fixtures/air-cutter-evidence.json");

function activeParty(stage: Json, attacker: "player" | "opponent"): Json[] {
  return stage.overrides.parties[attacker] as Json[];
}

describe("MOVE_AIR_CUTTER legal bilateral Scene-ON evidence checkpoint", () => {
  it("keeps both mechanicLab stages complete, party-before-init, and source-route legal", () => {
    for (const [orientation, stage] of Object.entries(stages)) {
      expect(stage).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 1,
        battleNum: 0,
        trainerId: 100,
      });
      expect(stage.overrides).toEqual({ parties: expect.any(Object) });
      expect(stage).not.toHaveProperty("overrides.battlers");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      for (const side of ["player", "opponent"] as const) {
        for (const mon of stage.overrides.parties[side]) {
          expect(mon).toEqual(expect.objectContaining({
            level: 50,
            ivs: expect.any(Object),
            evs: expect.any(Object),
            moves: expect.any(Array),
            ppUps: [0, 0, 0, 0],
            item: expect.any(Number),
            abilitySlot: expect.any(Number),
            friendship: expect.any(Number),
            gender: expect.any(String),
            shiny: false,
          }));
          expect(mon.moves).toHaveLength(4);
        }
      }
      const attacker = orientation === "player-back" ? "player" : "opponent";
      const target = attacker === "player" ? "opponent" : "player";
      expect(activeParty(stage, attacker)[0]).toMatchObject({ species: 42, moves: [314, 314, 314, 314] });
      expect(activeParty(stage, target)[0]).toMatchObject({ species: 113, moves: [33, 33, 33, 33] });
      expect(stage[attacker === "player" ? "playerSetIds" : "opponentSetIds"]).toContain(231);
    }
    expect(stages["player-back"].playerSetIds).toEqual([231, 180, 190]);
    expect(stages["player-back"].opponentSetIds).toEqual([162, 163, 165]);
    expect(stages["opponent-front"].playerSetIds).toEqual([162, 163, 165]);
    expect(stages["opponent-front"].opponentSetIds).toEqual([231, 180, 190]);
  });

  it("replays the two complete dense receipts and their move-owned maps hermetically", () => {
    const first = verifyAirCutterEvidence();
    expect(verifyAirCutterEvidence()).toEqual(first);
    expect(first).toEqual({
      "player-back": expect.objectContaining({
        sourceRows: 112,
        rawRgbRows: 112,
        firstWaveRamRow: 17,
        firstWaveFramebufferDelta: 19,
        firstSliceRamRow: 76,
        firstInactiveScriptRow: 111,
        coverageCredit: false,
      }),
      "opponent-front": expect.objectContaining({
        sourceRows: 112,
        rawRgbRows: 112,
        firstWaveRamRow: 17,
        firstWaveFramebufferDelta: 19,
        firstSliceRamRow: 76,
        firstInactiveScriptRow: 111,
        coverageCredit: false,
      }),
    });
    for (const orientation of ["player-back", "opponent-front"] as const) {
      expect(first[orientation].latches).toMatchObject({
        hardwareOamEqualsPrecedingSoftware: "111/111",
        hardwareMatricesEqualsPrecedingSoftware: "111/111",
        hardwarePaletteEqualsPrecedingFaded: "110/111",
      });
    }
  });

  it("retains the pre-promotion evidence receipt and current independent exact boundary", () => {
    expect(fixture).toMatchObject({
      schema: "air-cutter-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_AIR_CUTTER",
      moveId: 314,
      status: "unsupported-evidence",
      coverageCredit: false,
      evidenceScope: {
        productionAnimationChanged: true,
        reducerAdded: true,
        typedSeamAdded: true,
        compositorAdded: false,
        framebufferCompared: false,
        fullDenseRowsRetained: true,
        semanticStateRetained: true,
        rawRgbReceiptsRetained: true,
        perOrientationChangeMaps: true,
        twiceFreshByteIdentical: true,
        coveragePromotion: false,
        siblingCredit: false,
      },
      repeatability: {
        runsPerOrientation: 2,
        allMatched: true,
        byOrientation: {
          "player-back": {
            probeJsonSha256: "b99ea748b05e15cf5e32bc94bf466908ed685e3c76e9c18b50aef7e888fa1b56",
            rawRgbSequenceSha256: "6f698a7d2b2a794029d6fb6096269fcabc7617bee87d0d753b0f9ea829792674",
          },
          "opponent-front": {
            probeJsonSha256: "335b8d32eb2505101e15b668e79d4db740031f30a1159bc970472f3a71b26878",
            rawRgbSequenceSha256: "fb1a290ac1179f876b526c593b14b2ac5fc817b893d642b5932396075ca93e3d",
          },
        },
      },
    });
    const coverage = readJson("ANIMATION_COVERAGE.json");
    const track = coverage.componentTracks.find((item: Json) => item.id === "air-cutter-projectile");
    expect(track).toMatchObject({
      fulfilled: true,
      representatives: ["MOVE_AIR_CUTTER"],
      components: [
        "asset:ANIM_TAG_AIR_WAVE",
        "sprite:gAirCutterSliceSpriteTemplate",
        "task:AnimTask_AirCutterProjectile",
      ],
    });
    expect(coverage.entries.find((item: Json) => item.move === "MOVE_AIR_CUTTER"))
      .toMatchObject({ status: "exact" });
  });
});
