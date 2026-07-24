import { describe, expect, it } from "vitest";
import {
  FIRE_PUNCH_IMPACT_FIRST_AGE,
  FIRE_PUNCH_SPIRAL_FIRST_AGE,
} from "../src/engine/firePunch.ts";
import {
  advanceSceneOnMovePresentation,
  createSceneOnMovePresentation,
  GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY,
  GROVYLE_TO_ONIX_FIRE_PUNCH_PRESENTATION,
  GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  sceneOnFaintAttackView,
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
      battlePositionCenter: { x: 72, y: 80 },
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

  it("owns the opposite-side 117→96 burn as immutable presentation input", () => {
    const stage = createSceneOnMovePresentation({
      move: "FIRE_PUNCH",
      ...GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY,
      ...GROVYLE_TO_ONIX_FIRE_PUNCH_PRESENTATION,
      resolutionProfile: GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE,
    });
    const profileBefore = structuredClone(stage.config.resolutionProfile);

    expect(stage.config.attacker.geometry).toEqual({
      side: "opponent",
      spriteCorner: { x: 144, y: 12 },
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    });
    expect(stage.config.target.geometry).toEqual({
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    });
    expect(sceneOnFirePunchView({ ...stage, age: 26 }).resolution.displayedHp).toBe(117);
    expect(sceneOnFirePunchView({ ...stage, age: 27 }).resolution.displayedHp).toBe(116);
    expect(sceneOnFirePunchView({ ...stage, age: 47 }).resolution.displayedHp).toBe(96);
    expect(sceneOnFirePunchView({ ...stage, age: 48 }).resolution.battleHp).toBe(117);
    expect(sceneOnFirePunchView({ ...stage, age: 49 }).resolution.battleHp).toBe(96);
    expect(sceneOnFirePunchView({ ...stage, age: 141 }).resolution.status).toBe("none");
    expect(sceneOnFirePunchView({ ...stage, age: 142 }).resolution.status).toBe("burn");
    expect(sceneOnFirePunchView({ ...stage, age: 265 }).resolution.healthboxStatus).toBe("none");
    expect(sceneOnFirePunchView({ ...stage, age: 266 }).resolution.healthboxStatus).toBe("burn");
    expect(sceneOnFirePunchView({ ...stage, age: 147 }).burnFlames).toEqual([]);
    expect(sceneOnFirePunchView({ ...stage, age: 148 }).burnFlames.length).toBeGreaterThan(0);
    expect(stage.config.resolutionProfile).toEqual(profileBefore);
    expect(stage.config.resolutionProfile).toBe(GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE);
  });

  it("applies FAINT ATTACK's immutable profile to player-side geometry", () => {
    const stage = createSceneOnMovePresentation({
      move: "FAINT_ATTACK",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      ...ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE,
    });
    const profileBefore = structuredClone(stage.config);
    const firstLunge = sceneOnFaintAttackView({ ...stage, age: 44 });
    expect(firstLunge.attacker.species).toBe("ONIX");
    expect(firstLunge.target.species).toBe("GROVYLE");
    expect(firstLunge.attackerOffset).toEqual({ x2: 3, y2: 1 });
    expect(firstLunge.attackerEva).toBe(16);
    expect(sceneOnFaintAttackView({ ...stage, age: 45 }).attackerEva).toBe(15);
    expect(sceneOnFaintAttackView({ ...stage, age: 87 })).toMatchObject({
      targetShakeX2: -2,
      hitsplatVisible: true,
    });
    expect(sceneOnFaintAttackView({ ...stage, age: 184 }).background).toEqual({
      background: "dark",
      bldy: 1,
    });
    expect(stage.config).toEqual(profileBefore);
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
