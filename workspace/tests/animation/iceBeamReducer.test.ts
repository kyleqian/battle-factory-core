import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnIceBeamView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { iceBeamProfileFor } from "../../src/animation/iceBeam.ts";
import { verifyIceBeamReducer } from "../../tools/compare/iceBeamReducerAudit.ts";

const fieldProfile: SceneOnDragonRageFieldProfile = {
  playerHp: 100,
  playerMaxHp: 100,
  opponentHp: 100,
  opponentMaxHp: 100,
};

function battler(
  side: "player" | "opponent",
  species: SceneOnPresentationBattler["species"],
  center: Readonly<{ x: number; y: number }>,
): SceneOnPresentationBattler {
  return {
    species,
    geometry: {
      side,
      spriteCorner: { x: center.x - 32, y: center.y - 32 },
      animationCenter: center,
      battlePositionCenter: { x: center.x, y: center.y - 8 },
    },
  };
}

describe("MOVE_ICE_BEAM source-relative reducer and typed Scene-ON seam", () => {
  it("audits both retained orientations twice across all 406 dense rows", () => {
    for (let pass = 0; pass < 2; pass += 1) {
      expect(verifyIceBeamReducer("player-back")).toMatchObject({
        rows: 203,
        checked: {
          sourceRows: 203,
          spriteRows: 203,
          taskRows: 203,
          matrixRows: 203,
          registerRows: 203,
          orderRows: 203,
          seamRows: 203,
          paletteRows: 203,
          audioRows: 203,
        },
        latches: {
          oam: "202/202 RAM+1",
          matrices: "202/202 RAM+1",
          palette: "201/202 RAM+1; age 1 pre-animation exception",
          monbgShake: "source 38..86 -> display 39..87 RAM+1",
        },
        gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: 201 },
        cleanup: { age: 202, active: false, sprites: 0, tasks: 0, resources: false },
      });
      expect(verifyIceBeamReducer("opponent-front")).toMatchObject({
        rows: 203,
        checked: {
          sourceRows: 203,
          spriteRows: 203,
          taskRows: 203,
          matrixRows: 203,
          registerRows: 203,
          orderRows: 203,
          seamRows: 203,
          paletteRows: 203,
          audioRows: 203,
        },
        lifecycle: { outer: 24, inner: 13, largeHits: 3, smallHits: 4 },
        cleanup: { age: 202, active: false, sprites: 0, tasks: 0, resources: false },
      });
    }
  });

  it("keeps the seam generic for unrelated live battlers and geometry", () => {
    const gameplay = { battleOutcome: 0, weather: "clear" } as const;
    const firstProfile = iceBeamProfileFor("player-back", {
      gameplayRng: 17,
      immutableGameplayState: gameplay,
    });
    const first = createSceneOnMovePresentation({
      move: "ICE_BEAM",
      attacker: battler("player", "SURSKIT", { x: 72, y: 88 }),
      target: battler("opponent", "ONIX", { x: 176, y: 42 }),
      fieldProfile,
      animationProfile: firstProfile,
    });
    const firstView = sceneOnIceBeamView({ ...first, age: 109 });
    expect(firstView).toMatchObject({
      age: 109,
      attacker: { species: "SURSKIT", geometry: { side: "player" } },
      target: { species: "ONIX", geometry: { side: "opponent" } },
      gameplay: { rng: 17, immutableState: gameplay, changed: false },
    });

    const secondProfile = iceBeamProfileFor("opponent-front", {
      gameplayRng: 23,
      geometry: {
        attackerPictureOffset: { x: 187, y: 61 },
        targetPictureOffset: { x: 61, y: 97 },
        targetCenter: { x: 61, y: 97 },
        monbgBaseHofs: 481,
        monbgBaseVofs: 447,
      },
    });
    const second = createSceneOnMovePresentation({
      move: "ICE_BEAM",
      attacker: battler("opponent", "BALTOY", { x: 187, y: 61 }),
      target: battler("player", "DROWZEE", { x: 61, y: 97 }),
      fieldProfile,
      animationProfile: secondProfile,
    });
    const secondView = sceneOnIceBeamView({ ...second, age: 109 });
    expect(secondView).toMatchObject({
      attacker: { species: "BALTOY", geometry: { side: "opponent" } },
      target: { species: "DROWZEE", geometry: { side: "player" } },
    });
    expect(secondView.sprites.find((sprite) => sprite.kind === "impact")?.x)
      .not.toBe(firstView.sprites.find((sprite) => sprite.kind === "impact")?.x);
    expect(secondView.gameplay).not.toBe(firstView.gameplay);
    expect(() => sceneOnIceBeamView({ ...first, age: 203 })).toThrow("age out of range");
  });

  it("batch-checks the independently exact ice/audio controls", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    for (const move of ["MOVE_BLIZZARD", "MOVE_ICY_WIND", "MOVE_PSYBEAM"]) {
      expect(coverage.entries.find((entry: any) => entry.move === move)?.status).toBe("exact");
    }
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ICE_BEAM")?.status).toBe("exact");
    expect(coverage.componentTracks.find((track: any) => track.id === "ice-beam-crystals")).toMatchObject({
      fulfilled: true,
      representatives: ["MOVE_ICE_BEAM"],
    });
  });
});
