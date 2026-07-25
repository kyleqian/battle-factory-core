import { describe, expect, it } from "vitest";
import {
  FIRE_PUNCH_IMPACT_FIRST_AGE,
  FIRE_PUNCH_SPIRAL_FIRST_AGE,
} from "../src/engine/firePunch.ts";
import {
  advanceSceneOnMovePresentation,
  createSceneOnMovePresentation,
  displayedHpAfterDamage,
  GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY,
  GROVYLE_TO_ONIX_FIRE_PUNCH_PRESENTATION,
  GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE,
  GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION,
  GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE,
  ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION,
  ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE,
  ONIX_TO_GROVYLE_ENDEAVOR_PRESENTATION,
  ONIX_TO_GROVYLE_ENDEAVOR_PROFILE,
  ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
  ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE,
  ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  sceneOnFaintAttackView,
  sceneOnDoubleTeamView,
  sceneOnEndeavorView,
  sceneOnDragonBreathView,
  sceneOnFirePunchView,
  sceneOnRockSlideView,
  sceneOnShadowPunchView,
} from "../src/engine/sceneOnPresentation.ts";
import {
  CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
} from "../src/engine/dragonBreath.ts";
import { actionMenuDisplayAtAge } from "../src/engine/battleMenu.ts";

function createPortableStage() {
  return createSceneOnMovePresentation({
    move: "FIRE_PUNCH",
    ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
    resolutionProfile: ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE,
  });
}

describe("relative Battle Scene ON move presentation", () => {
  it("threads DRAGON_BREATH geometry through the shared seam in both orientations", () => {
    const playerStage = createSceneOnMovePresentation({
      move: "DRAGON_BREATH",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      animationProfile: CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
      fieldProfile: ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE.fieldProfile,
    });
    expect(sceneOnDragonBreathView({ ...playerStage, age: 1 }).fireSprites[0])
      .toMatchObject({
        centerX: 77,
        centerY: 86,
        hFlip: true,
        vFlip: true,
        subpriority: 38,
      });

    const opponentStage = createSceneOnMovePresentation({
      move: "DRAGON_BREATH",
      ...GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY,
      animationProfile: {
        ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
        attackerCenter: { x: 176, y: 44 },
        targetCenter: { x: 72, y: 88 },
        attackerSide: "opponent",
        targetSubpriority: 30,
      },
      fieldProfile: ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE.fieldProfile,
    });
    expect(sceneOnDragonBreathView({ ...opponentStage, age: 1 }).fireSprites[0])
      .toMatchObject({
        centerX: 171,
        centerY: 46,
        hFlip: false,
        vFlip: false,
        subpriority: 28,
        pa: 704,
      });
    expect(sceneOnDragonBreathView({ ...playerStage, age: 13 }).targetEffect)
      .toEqual({ shakeX2: -2, blendCoeff: 2, onMonBg: true });
    expect(sceneOnDragonBreathView({ ...opponentStage, age: 82 }).targetEffect)
      .toEqual({ shakeX2: 0, blendCoeff: 0, onMonBg: false });
  });

  it("restarts the generic action-menu bounce from a relative reveal age", () => {
    expect(actionMenuDisplayAtAge(362, 363)).toEqual({
      visible: false,
      battlerY2: 0,
      healthboxY2: 0,
    });
    expect(actionMenuDisplayAtAge(363, 363)).toEqual({
      visible: true,
      battlerY2: 0,
      healthboxY2: 0,
    });
    expect(actionMenuDisplayAtAge(364, 363)).toEqual({
      visible: true,
      battlerY2: 0,
      healthboxY2: 1,
    });
    expect(actionMenuDisplayAtAge(374, 363)).toEqual({
      visible: true,
      battlerY2: 1,
      healthboxY2: 0,
    });
    expect(actionMenuDisplayAtAge(428, 363)).toEqual({
      visible: true,
      battlerY2: 1,
      healthboxY2: 2,
    });
  });

  it("drains only immutable, controller-supplied ICE PUNCH HP", () => {
    const profile = { startHp: 143, endHp: 112, firstDisplayedAge: 223 };
    expect(displayedHpAfterDamage(222, profile)).toBe(143);
    expect(displayedHpAfterDamage(223, profile)).toBe(142);
    expect(displayedHpAfterDamage(253, profile)).toBe(112);
    expect(displayedHpAfterDamage(400, profile)).toBe(112);
    expect(profile).toEqual({ startHp: 143, endHp: 112, firstDisplayedAge: 223 });
  });
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

  it("carries ONIX's frozen front-idle x2 into SHADOW_PUNCH's target shake, opponent-side (RAM-probed, mechanic-shadow-punch-haunter-onix-dense)", () => {
    const stage = createSceneOnMovePresentation({
      move: "SHADOW_PUNCH",
      attacker: {
        species: "HAUNTER",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 56 },
          animationCenter: { x: 72, y: 96 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          // Base (unshifted) position - `shadowPunchTargetShakeX2` applies
          // the settled `Anim_RapidHorizontalHops` x2=1 dynamically, so this
          // must NOT also bake it in (unlike the static FEATHER_DANCE/
          // QUICK_ATTACK ONIX-opponent geometry, which never re-derives the
          // offset and so bakes it into the constant instead) - matches
          // DRAGON_RAGE's own `spriteCorner.x=144` fixture convention.
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerSpriteId: 6,
      attackerMoveSpeed: 8,
      attackerSubpriority: 30,
      fieldProfile: {
        playerHp: 120,
        opponentHp: 110,
        playerStatus: "none",
        playerGender: "male",
        opponentGender: "male",
      },
    });
    // RAM-probed (`dump-shadowpunch-rgb.py`, ages 40-60): ONIX's own frozen
    // `Anim_RapidHorizontalHops` x2=1 residual holds through age 48, then
    // `AnimTask_ShakeMon`'s own `+1`-shifted timeline takes over - NOT the
    // naive `animationAge - FIRST_AGE` a fresh port would guess (that reads
    // 0/3 one tick early at every toggle).
    expect(sceneOnShadowPunchView({ ...stage, age: 40 }).targetShakeX2).toBe(1);
    expect(sceneOnShadowPunchView({ ...stage, age: 48 }).targetShakeX2).toBe(1);
    expect(sceneOnShadowPunchView({ ...stage, age: 49 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 50 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 51 }).targetShakeX2).toBe(3);
    expect(sceneOnShadowPunchView({ ...stage, age: 52 }).targetShakeX2).toBe(3);
    expect(sceneOnShadowPunchView({ ...stage, age: 53 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 56 }).targetShakeX2).toBe(3);
    expect(sceneOnShadowPunchView({ ...stage, age: 57 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 70 }).targetShakeX2).toBe(0);
  });

  it("does NOT apply the front-idle residual to a player-side SHADOW_PUNCH target (RAM-probed, mechanic-shadow-punch-onix-haunter-dense: back sprite uses an unported idle family)", () => {
    const stage = createSceneOnMovePresentation({
      move: "SHADOW_PUNCH",
      attacker: {
        species: "HAUNTER",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 13 },
          animationCenter: { x: 176, y: 45 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 48 },
          animationCenter: { x: 72, y: 88 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      attackerSpriteId: 8,
      attackerMoveSpeed: -8,
      attackerSubpriority: 40,
      fieldProfile: {
        playerHp: 110,
        opponentHp: 120,
        playerStatus: "none",
        playerGender: "male",
        opponentGender: "male",
      },
    });
    // RAM-probed: no idle residual (player-side back sprite), and age 48
    // (the shake task's own creation-minus-one tick) reads a clean 0, NOT
    // the raw xOffset transient DRAGON_RAGE's own attacker-shake call site
    // shows at the same relative tick - a real per-call-site difference.
    expect(sceneOnShadowPunchView({ ...stage, age: 40 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 48 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 49 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 51 }).targetShakeX2).toBe(3);
    expect(sceneOnShadowPunchView({ ...stage, age: 52 }).targetShakeX2).toBe(3);
    expect(sceneOnShadowPunchView({ ...stage, age: 53 }).targetShakeX2).toBe(0);
    expect(sceneOnShadowPunchView({ ...stage, age: 57 }).targetShakeX2).toBe(0);
  });

  it("derives opposite-side ROCK SLIDE geometry from immutable relative input", () => {
    const stage = createSceneOnMovePresentation({
      move: "ROCK_SLIDE",
      ...GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY,
      ...GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION,
    });
    const profileBefore = structuredClone(stage.config.animationProfile);

    const firstRock = sceneOnRockSlideView({ ...stage, age: 8 });
    expect(firstRock.rocks[0]).toEqual({
      centerX: 67,
      centerY: 24,
      animNum: 1,
    });
    expect(sceneOnRockSlideView({ ...stage, age: 22 }).targetY2).toBe(5);
    expect(sceneOnRockSlideView({ ...stage, age: 142 })).toMatchObject({
      healthboxY2: 1,
      targetInvisible: false,
    });
    expect(sceneOnRockSlideView({ ...stage, age: 143 })).toMatchObject({
      healthboxY2: -1,
      targetInvisible: true,
    });
    expect(stage.config.animationProfile).toEqual(profileBefore);
    expect(stage.config.animationProfile).toBe(
      GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE,
    );
  });

  it("ports DOUBLE TEAM's clone and stat-banner reducers to player-back ONIX", () => {
    const stage = createSceneOnMovePresentation({
      move: "DOUBLE_TEAM",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      ...ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION,
    });
    const profileBefore = structuredClone(stage.config.animationProfile);

    expect(sceneOnDoubleTeamView({ ...stage, age: 1 }).clones).toBeNull();
    expect(sceneOnDoubleTeamView({ ...stage, age: 2 }).clones).toEqual({
      a: 0,
      b: 0,
    });
    expect(sceneOnDoubleTeamView({ ...stage, age: 129 }).clones).toEqual({
      a: 19,
      b: -20,
    });
    expect(sceneOnDoubleTeamView({ ...stage, age: 130 }).clones).toBeNull();
    expect(sceneOnDoubleTeamView({ ...stage, age: 163 }).statsBanner).toEqual({
      eva: 0,
      bg1Y: 0,
    });
    expect(sceneOnDoubleTeamView({ ...stage, age: 186 }).statsBanner).toEqual({
      eva: 10,
      bg1Y: 60,
    });
    expect(sceneOnDoubleTeamView({ ...stage, age: 229 }).statsBanner).toEqual({
      eva: 0,
      bg1Y: 180,
    });
    expect(sceneOnDoubleTeamView({ ...stage, age: 230 }).statsBanner).toBeNull();
    expect(sceneOnDoubleTeamView(stage).frontClone).toBe("a");
    expect(stage.config.animationProfile).toEqual(profileBefore);
    expect(stage.config.animationProfile).toBe(
      ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE,
    );
  });

  it("owns opposite-side ENDEAVOR geometry and HP outcome as immutable input", () => {
    const stage = createSceneOnMovePresentation({
      move: "ENDEAVOR",
      ...ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY,
      ...ONIX_TO_GROVYLE_ENDEAVOR_PRESENTATION,
    });
    const profileBefore = structuredClone(stage.config.animationProfile);

    expect(stage.config.attacker.geometry.battlePositionCenter)
      .toEqual({ x: 72, y: 80 });
    expect(stage.config.target.geometry.animationCenter)
      .toEqual({ x: 176, y: 44 });
    expect(sceneOnEndeavorView({ ...stage, age: 98 }).displayedTargetHp)
      .toBe(143);
    expect(sceneOnEndeavorView({ ...stage, age: 99 }).displayedTargetHp)
      .toBe(142);
    expect(sceneOnEndeavorView({ ...stage, age: 126 }).displayedTargetHp)
      .toBe(117);
    expect(sceneOnEndeavorView({ ...stage, age: 140 }).displayedTargetHp)
      .toBe(117);
    expect(stage.config.animationProfile).toEqual(profileBefore);
    expect(stage.config.animationProfile).toBe(
      ONIX_TO_GROVYLE_ENDEAVOR_PROFILE,
    );
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
