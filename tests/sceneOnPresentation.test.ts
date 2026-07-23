import { describe, expect, it } from "vitest";
import {
  FIRE_PUNCH_IMPACT_FIRST_AGE,
  FIRE_PUNCH_SPIRAL_FIRST_AGE,
} from "../src/engine/firePunch.ts";
import {
  advanceSceneOnMovePresentation,
  createSceneOnMovePresentation,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  sceneOnFirePunchView,
} from "../src/engine/sceneOnPresentation.ts";

function createPortableStage() {
  return createSceneOnMovePresentation({
    move: "FIRE_PUNCH",
    ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
    resolutionProfile: ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  });
}

describe("relative Battle Scene ON move presentation", () => {
  it("accepts explicit attacker/target geometry and advances only relative age", () => {
    const initial = createPortableStage();
    const advanced = advanceSceneOnMovePresentation(initial);
    expect(initial.age).toBe(0);
    expect(advanced.age).toBe(1);
    expect(advanced.config).toBe(initial.config);
    expect(advanced.config.attacker.geometry).toEqual({
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
    });
    expect(advanced.config.target.geometry.animationCenter).toEqual({ x: 176, y: 44 });
  });

  it("translates the shared spiral and spread primitives with target geometry", () => {
    const base = createPortableStage();
    const shifted = createSceneOnMovePresentation({
      ...base.config,
      target: {
        ...base.config.target,
        geometry: {
          ...base.config.target.geometry,
          animationCenter: { x: 154, y: 66 },
        },
      },
    });
    const spiralBase = sceneOnFirePunchView({
      ...base,
      age: FIRE_PUNCH_SPIRAL_FIRST_AGE,
    }).particles;
    const spiralShifted = sceneOnFirePunchView({
      ...shifted,
      age: FIRE_PUNCH_SPIRAL_FIRST_AGE,
    }).particles;
    expect(spiralShifted).toEqual(
      spiralBase.map((particle) => ({
        ...particle,
        x: particle.x - 22,
        y: particle.y + 22,
      })),
    );

    const spreadBase = sceneOnFirePunchView({
      ...base,
      age: FIRE_PUNCH_IMPACT_FIRST_AGE,
    }).particles;
    const spreadShifted = sceneOnFirePunchView({
      ...shifted,
      age: FIRE_PUNCH_IMPACT_FIRST_AGE,
    }).particles;
    expect(spreadShifted).toEqual(
      spreadBase.map((particle) => ({
        ...particle,
        x: particle.x - 22,
        y: particle.y + 22,
      })),
    );
  });

  it("consumes the supplied resolution profile without calculating battle outcome", () => {
    const stage = createPortableStage();
    expect(sceneOnFirePunchView({ ...stage, age: 199 }).resolution.battleHp).toBe(143);
    expect(sceneOnFirePunchView({ ...stage, age: 200 }).resolution.battleHp).toBe(112);
    const afterSecondary = sceneOnFirePunchView({ ...stage, age: 205 });
    expect(afterSecondary.resolution.secondaryRollConsumed).toBe(true);
    expect(afterSecondary.resolution.secondaryRollSucceeded).toBe(false);
    expect(afterSecondary.resolution.status).toBe("none");
    expect(afterSecondary.burnFlames).toEqual([]);
    expect(afterSecondary.target.species).toBe("GROVYLE");
  });

  it("rejects invalid side, geometry, and HP-profile inputs", () => {
    const valid = createPortableStage().config;
    expect(() => createSceneOnMovePresentation({
      ...valid,
      target: {
        ...valid.target,
        geometry: { ...valid.target.geometry, side: "player" },
      },
    })).toThrow(/opposite battle sides/);
    expect(() => createSceneOnMovePresentation({
      ...valid,
      target: {
        ...valid.target,
        geometry: {
          ...valid.target.geometry,
          animationCenter: { x: 176.5, y: 44 },
        },
      },
    })).toThrow(/integer screen coordinates/);
    expect(() => createSceneOnMovePresentation({
      ...valid,
      resolutionProfile: { ...valid.resolutionProfile, startHp: 10, endHp: 11 },
    })).toThrow(/startHp >= endHp/);
  });
});
