import { describe, expect, it } from "vitest";
import {
  SPARK_FLASH_CREATION_AGE,
  SPARK_IMPACT_CREATION_AGE,
  SPARK_PARTICLE_SPAWNS,
  SPARK_TARGET_EFFECT_CREATION_AGE,
  SPARK_TEARDOWN_AGE,
  sparkAtAge,
} from "../../src/animation/spark.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSparkView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const player = {
  side: "player" as const,
  center: { x: 72, y: 88 },
  pictureOffset: { x: 72, y: 80 },
  bgPriority: 2,
};
const opponent = {
  side: "opponent" as const,
  center: { x: 176, y: 44 },
  pictureOffset: { x: 176, y: 40 },
  bgPriority: 1,
};

describe("MOVE_SPARK source reducer", () => {
  it("ports all six literal affine particles and their priority/geometry", () => {
    expect(SPARK_PARTICLE_SPAWNS).toHaveLength(6);
    const state = sparkAtAge(2, player, opponent);
    expect(state.sparks).toHaveLength(3);
    expect(state.sparks[0]).toMatchObject({
      kind: "spark", age: 2, x: 72, y: 80, x2: 16, y2: 16,
      priority: 2,
    });
    expect(state.sparks[2]?.priority).toBe(1);
    expect(state.sparks[0]?.matrix.c).toBe(-state.sparks[0]!.matrix.b);
    expect(sparkAtAge(28, player, opponent).sparks).toEqual([]);
  });

  it("ports all eight orbiting flashing sprites, tile variants, and lifetime", () => {
    const first = sparkAtAge(SPARK_FLASH_CREATION_AGE, player, opponent);
    expect(first.flashing).toHaveLength(8);
    expect(first.flashing.map((sprite) => sprite.tileIndex))
      .toEqual([0, 1, 0, 2, 0, 1, 0, 2]);
    expect(first.flashing.map((sprite) => Math.round(Math.hypot(sprite.x2, sprite.y2))))
      .toEqual([32, 32, 32, 32, 16, 16, 17, 16]);
    expect(first.flashing[0]).toMatchObject({
      affine: { scale: 256, rotation: 20 },
      matrix: { a: 225, b: -120, c: 120, d: 225 },
    });
    expect(sparkAtAge(SPARK_FLASH_CREATION_AGE + 12, player, opponent).flashing)
      .toEqual([]);
  });

  it("ports lunge, impact, ShakeMon, post-impact electricity, palettes, and sound boundaries", () => {
    expect(sparkAtAge(0, player, opponent)).toMatchObject({
      attackerPaletteY: 5,
      soundRestart: "SE_M_THUNDERBOLT2",
      soundPanSide: "player",
    });
    expect(sparkAtAge(42, player, opponent)).toMatchObject({
      attackerPaletteY: 7,
      soundRestart: "SE_M_THUNDERBOLT2",
    });
    expect(sparkAtAge(SPARK_IMPACT_CREATION_AGE, player, opponent))
      .toMatchObject({
        impactVisible: true,
        soundRestart: "SE_M_HYPER_BEAM",
        soundPanSide: "opponent",
        targetOffset: { x2: 0, y2: 0 },
      });
    expect(sparkAtAge(71, player, opponent).targetOffset)
      .toEqual({ x2: 3, y2: 0 });
    const electricity = sparkAtAge(
      SPARK_TARGET_EFFECT_CREATION_AGE + 4, player, opponent,
    );
    expect(electricity.targetElectricity.length).toBeGreaterThanOrEqual(2);
    expect(electricity.soundRestart).toBeNull();
    expect(sparkAtAge(SPARK_TARGET_EFFECT_CREATION_AGE, player, opponent))
      .toMatchObject({
        soundRestart: "SE_M_THUNDERBOLT2",
        soundPanSide: "opponent",
      });
    expect(sparkAtAge(SPARK_TEARDOWN_AGE, player, opponent)).toMatchObject({
      assetsLoaded: false,
      visualActive: false,
      attackerOffset: { x2: 0, y2: 0 },
      targetOffset: { x2: 0, y2: 0 },
      impactVisible: false,
    });
  });

  it("mirrors only the source side-dependent geometry", () => {
    const playerAttack = sparkAtAge(63, player, opponent);
    const opponentAttack = sparkAtAge(63, opponent, player);
    expect(playerAttack.attackerOffset.x2).toBe(4);
    expect(opponentAttack.attackerOffset.x2).toBe(-4);
    const playerTarget = sparkAtAge(SPARK_TARGET_EFFECT_CREATION_AGE, opponent, player);
    expect(playerTarget.targetElectricity[0]?.x).toBe(67);
    expect(sparkAtAge(SPARK_TARGET_EFFECT_CREATION_AGE, player, opponent)
      .targetElectricity[0]?.x).toBe(181);
  });
});

describe("MOVE_SPARK typed presentation seam", () => {
  const battler = (
    species: SceneOnPresentationBattler["species"], side: "player" | "opponent",
  ): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side,
      spriteCorner: side === "player" ? { x: 40, y: 48 } : { x: 144, y: 12 },
      animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 44 },
      battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  });

  it("threads explicit species geometry through a relative-age-only view", () => {
    const stage = createSceneOnMovePresentation({
      move: "SPARK",
      attacker: battler("MINUN", "player"),
      target: battler("SHUCKLE", "opponent"),
      attackerPictureOffset: { x: 72, y: 83 },
      targetPictureOffset: { x: 176, y: 47 },
      attackerBgPriority: 2,
      targetBgPriority: 1,
      fieldProfile: {
        playerHp: 110, playerMaxHp: 110,
        opponentHp: 100, opponentMaxHp: 100,
      },
    });
    const view = sceneOnSparkView({ ...stage, age: 2 });
    expect(view.age).toBe(2);
    expect(view.attacker.species).toBe("MINUN");
    expect(view.sparks[0]).toMatchObject({ x: 72, y: 83 });
    expect(() => sceneOnSparkView({
      ...stage,
      config: { ...stage.config, move: "TAUNT" } as never,
    })).toThrow("expected SPARK presentation");
  });
});
