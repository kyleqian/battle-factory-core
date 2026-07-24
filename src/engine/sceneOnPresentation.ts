import {
  FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
  firePunchBurnFlames,
  firePunchParticlesInDrawOrder,
  firePunchResidualBurnFlames,
  firePunchResolutionState,
  type FirePunchParticle,
  type FirePunchResolutionProfile,
  type FirePunchResolutionState,
} from "./firePunch.ts";
import {
  FAINT_ATTACK_ANIMATION_PROFILE,
  faintAttackAttackerEva,
  faintAttackAttackerOffset,
  faintAttackBgState,
  faintAttackHitsplatVisible,
  faintAttackTargetShakeX2,
  type FaintAttackAnimationProfile,
  type FaintAttackBgState,
} from "./faintAttack.ts";
import {
  doubleTeamAnimationAtAge,
  genericHitReactionAtAge,
  rockSlideAnimationAtAge,
  type DoubleTeamAnimationProfile,
  type RockSlideAnimationProfile,
} from "./battleMenu.ts";
import {
  icePunchHitCrystals,
  icePunchSpiralCrystals,
  icePunchOverlayState,
  type IcePunchCrystal,
  type IcePunchHitCrystal,
  type IcePunchOverlayState,
} from "./icePunch.ts";

export type SceneOnBattlerSide = "player" | "opponent";

export interface SceneOnBattlerGeometry {
  readonly side: SceneOnBattlerSide;
  /** Top-left corner of the decoded 64x64 battler sheet. */
  readonly spriteCorner: Readonly<{ x: number; y: number }>;
  /** Source `GetBattlerSpriteCoord(..., 2/3)` animation center. */
  readonly animationCenter: Readonly<{ x: number; y: number }>;
  /** Source singles BATTLER_COORD_X/Y base for status-animation creation. */
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
}

export interface SceneOnPresentationBattler {
  readonly species: "ONIX" | "GROVYLE";
  readonly geometry: SceneOnBattlerGeometry;
}

export interface SceneOnFirePunchConfig {
  readonly move: "FIRE_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly resolutionProfile: FirePunchResolutionProfile;
  /**
   * Move-animation script age displayed at presentation age zero. Controller
   * printers can hand ownership over at different script phases by side.
   */
  readonly animationAgeOffset?: number;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnIcePunchConfig {
  readonly move: "ICE_PUNCH";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  readonly hpDrainProfile: Readonly<HpDrainPresentationProfile> & {
    readonly effectivenessTextStartAge?: number;
    /** Controller-owned age at which the completed result line is cleared. */
    readonly effectivenessTextEndAge?: number;
  };
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnFaintAttackFieldProfile {
  readonly playerHp: number;
  readonly opponentHp: number;
  readonly playerStatus: "none" | "burn";
}

export interface SceneOnFaintAttackConfig {
  readonly move: "FAINT_ATTACK";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<FaintAttackAnimationProfile>;
  /**
   * Immutable field presentation at animation kickoff. Damage and all later
   * resolution stay outside the move-owned body.
   */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnRockSlideConfig {
  readonly move: "ROCK_SLIDE";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<RockSlideAnimationProfile>;
  /** Immutable field values; the presentation seam never calculates damage. */
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface SceneOnDoubleTeamConfig {
  readonly move: "DOUBLE_TEAM";
  readonly attacker: SceneOnPresentationBattler;
  /** Opposing field battler; DOUBLE TEAM's actual effect battler is attacker. */
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<DoubleTeamAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export interface EndeavorAnimationProfile {
  /** Source `gMon{Back,Front}PicCoords[species].y_offset`. */
  readonly attackerYOffset: number;
  /** Immutable stale `gAnimMovePower` consumed by the generic shake task. */
  readonly staleMovePower: number;
  /** First displayed HP decrement, relative to the move-body epoch. */
  readonly hpDrainFirstAge: number;
  readonly targetStartHp: number;
  readonly targetEndHp: number;
}

export interface HpDrainPresentationProfile {
  readonly startHp: number;
  readonly endHp: number;
  readonly firstDisplayedAge: number;
}

/** Generic display-only drain for controller-supplied, already-resolved HP. */
export function displayedHpAfterDamage(
  age: number,
  profile: Readonly<HpDrainPresentationProfile>,
): number {
  if (age < profile.firstDisplayedAge) return profile.startHp;
  return Math.max(
    profile.endHp,
    profile.startHp - (age - profile.firstDisplayedAge + 1),
  );
}

export interface SceneOnEndeavorConfig {
  readonly move: "ENDEAVOR";
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<EndeavorAnimationProfile>;
  readonly fieldProfile: Readonly<SceneOnFaintAttackFieldProfile>;
  /** Relative first printer age; negative means text predates this seam. */
  readonly moveTextStartAge?: number;
}

export type SceneOnMoveConfig =
  | SceneOnFirePunchConfig
  | SceneOnIcePunchConfig
  | SceneOnFaintAttackConfig
  | SceneOnRockSlideConfig
  | SceneOnDoubleTeamConfig
  | SceneOnEndeavorConfig;

export interface SceneOnMovePresentationState<
  TConfig extends SceneOnMoveConfig = SceneOnMoveConfig,
> {
  readonly age: number;
  readonly config: TConfig;
}

export interface SceneOnFirePunchView {
  readonly age: number;
  readonly animationAge: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly resolution: FirePunchResolutionState;
  readonly particles: readonly FirePunchParticle[];
  readonly burnFlames: ReturnType<typeof firePunchBurnFlames>;
}

export interface SceneOnIcePunchView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly overlay: IcePunchOverlayState;
  readonly crystals: readonly IcePunchCrystal[];
  readonly hitCrystals: readonly IcePunchHitCrystal[];
  readonly healthboxY2: number;
  readonly targetInvisible: boolean;
  readonly displayedTargetHp: number;
}

export interface SceneOnFaintAttackView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly background: FaintAttackBgState;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly attackerEva: number;
  readonly targetShakeX2: number;
  readonly hitsplatVisible: boolean;
}

export interface SceneOnRockSlideView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly bg3Y: number;
  readonly targetY2: number;
  readonly targetInvisible: boolean;
  readonly healthboxY2: number;
  readonly rocks: ReturnType<typeof rockSlideAnimationAtAge>["rocks"];
}

export interface SceneOnDoubleTeamView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly clones: Readonly<{ a: number; b: number }> | null;
  readonly statsBanner: Readonly<{ eva: number; bg1Y: number }> | null;
  readonly frontClone: "a" | "b";
}

export interface SceneOnEndeavorView {
  readonly age: number;
  readonly attacker: SceneOnPresentationBattler;
  readonly target: SceneOnPresentationBattler;
  readonly animationProfile: Readonly<EndeavorAnimationProfile>;
  readonly displayedTargetHp: number;
}

function assertIntegerPoint(
  label: string,
  point: Readonly<{ x: number; y: number }>,
): void {
  if (!Number.isInteger(point.x) || !Number.isInteger(point.y)) {
    throw new Error(`${label} must use integer screen coordinates`);
  }
}

/**
 * Relative Battle Scene ON adapter. It owns presentation age and explicit
 * geometry only: damage, RNG, move legality, turn order, and round state are
 * supplied as immutable inputs and never resolved or mutated here.
 */
export function createSceneOnMovePresentation<TConfig extends SceneOnMoveConfig>(
  config: TConfig,
): SceneOnMovePresentationState<TConfig> {
  if (config.attacker.geometry.side === config.target.geometry.side) {
    throw new Error("attacker and target must occupy opposite battle sides");
  }
  assertIntegerPoint("attacker spriteCorner", config.attacker.geometry.spriteCorner);
  assertIntegerPoint("attacker animationCenter", config.attacker.geometry.animationCenter);
  assertIntegerPoint("attacker battlePositionCenter", config.attacker.geometry.battlePositionCenter);
  assertIntegerPoint("target spriteCorner", config.target.geometry.spriteCorner);
  assertIntegerPoint("target animationCenter", config.target.geometry.animationCenter);
  assertIntegerPoint("target battlePositionCenter", config.target.geometry.battlePositionCenter);
  if (config.move === "FIRE_PUNCH") {
    if (
      config.resolutionProfile.startHp < config.resolutionProfile.endHp
      || config.resolutionProfile.endHp < 0
    ) {
      throw new Error("FIRE_PUNCH resolution profile requires startHp >= endHp >= 0");
    }
  } else if (
    config.fieldProfile.playerHp < 0
    || config.fieldProfile.opponentHp < 0
  ) {
    throw new Error(`${config.move} field profile requires nonnegative HP`);
  }
  if (
    config.move === "ENDEAVOR"
    && (
      config.animationProfile.targetStartHp
        < config.animationProfile.targetEndHp
      || config.animationProfile.targetEndHp < 0
    )
  ) {
    throw new Error("ENDEAVOR profile requires targetStartHp >= targetEndHp >= 0");
  }
  return { age: 0, config };
}

export function advanceSceneOnMovePresentation<TConfig extends SceneOnMoveConfig>(
  state: SceneOnMovePresentationState<TConfig>,
): SceneOnMovePresentationState<TConfig> {
  return { ...state, age: state.age + 1 };
}

export function sceneOnFirePunchView(
  state: SceneOnMovePresentationState,
): SceneOnFirePunchView {
  if (state.config.move !== "FIRE_PUNCH") {
    throw new Error(`expected FIRE_PUNCH presentation, got ${state.config.move}`);
  }
  const geometry = { center: state.config.target.geometry.animationCenter };
  const burnGeometry = {
    ...geometry,
    statusBaseCenter: state.config.target.geometry.battlePositionCenter,
    horizontalDirection:
      state.config.target.geometry.side === "player" ? -1 : 1,
  } as const;
  const animationAge =
    state.age + (state.config.animationAgeOffset ?? 0);
  const resolution = firePunchResolutionState(
    state.age,
    state.config.resolutionProfile,
  );
  return {
    age: state.age,
    animationAge,
    attacker: state.config.attacker,
    target: state.config.target,
    resolution,
    particles: firePunchParticlesInDrawOrder(animationAge, geometry),
    burnFlames: [
      ...(resolution.secondaryRollSucceeded
        ? firePunchBurnFlames(
            state.age
              - (state.config.resolutionProfile.burnFlameFirstAge
                ?? FIRE_PUNCH_BURN_FLAME_FIRST_AGE)
              + FIRE_PUNCH_BURN_FLAME_FIRST_AGE,
            burnGeometry,
          )
        : []),
      ...(!state.config.resolutionProfile.faint
        ? firePunchResidualBurnFlames(state.age, geometry)
        : []),
    ],
  };
}

export function sceneOnIcePunchView(
  state: SceneOnMovePresentationState,
): SceneOnIcePunchView {
  if (state.config.move !== "ICE_PUNCH") {
    throw new Error(`expected ICE_PUNCH presentation, got ${state.config.move}`);
  }
  // Like the move-owned crystal sprites above, the generic hit sprites are
  // copied to OAM from the preceding callback pass.
  const hitReaction = genericHitReactionAtAge(state.age - 1, 187);
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    overlay: icePunchOverlayState(state.age),
    crystals: icePunchSpiralCrystals(
      // BuildOamBuffer displays the sprite state from the preceding callback
      // pass; palette tasks above are not subject to this OBJ-only lag.
      state.age - 1,
      state.config.target.geometry.animationCenter,
    ),
    hitCrystals: icePunchHitCrystals(
      state.age - 1,
      state.config.target.geometry.animationCenter,
    ),
    displayedTargetHp: displayedHpAfterDamage(
      state.age,
      state.config.hpDrainProfile,
    ),
    ...hitReaction,
  };
}

export function sceneOnFaintAttackView(
  state: SceneOnMovePresentationState,
): SceneOnFaintAttackView {
  if (state.config.move !== "FAINT_ATTACK") {
    throw new Error(`expected FAINT_ATTACK presentation, got ${state.config.move}`);
  }
  const { animationProfile, attacker, target } = state.config;
  return {
    age: state.age,
    attacker,
    target,
    background: faintAttackBgState(state.age, animationProfile),
    attackerOffset: faintAttackAttackerOffset(
      state.age,
      attacker.geometry.side,
      animationProfile,
    ),
    attackerEva: faintAttackAttackerEva(state.age, animationProfile),
    targetShakeX2: faintAttackTargetShakeX2(state.age, animationProfile),
    hitsplatVisible: faintAttackHitsplatVisible(state.age, animationProfile),
  };
}

export function sceneOnRockSlideView(
  state: SceneOnMovePresentationState,
): SceneOnRockSlideView {
  if (state.config.move !== "ROCK_SLIDE") {
    throw new Error(`expected ROCK_SLIDE presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationProfile } = state.config;
  const animation = rockSlideAnimationAtAge(
    state.age,
    animationProfile,
    {
      rockOrigin: {
        x: target.geometry.battlePositionCenter.x,
        y: target.geometry.battlePositionCenter.y + 14,
      },
    },
  );
  return {
    age: state.age,
    attacker,
    target,
    ...animation,
  };
}

export function sceneOnDoubleTeamView(
  state: SceneOnMovePresentationState,
): SceneOnDoubleTeamView {
  if (state.config.move !== "DOUBLE_TEAM") {
    throw new Error(`expected DOUBLE_TEAM presentation, got ${state.config.move}`);
  }
  const { attacker, target, animationProfile } = state.config;
  return {
    age: state.age,
    attacker,
    target,
    ...doubleTeamAnimationAtAge(state.age, animationProfile),
    frontClone: animationProfile.frontClone,
  };
}

export function sceneOnEndeavorView(
  state: SceneOnMovePresentationState,
): SceneOnEndeavorView {
  if (state.config.move !== "ENDEAVOR") {
    throw new Error(`expected ENDEAVOR presentation, got ${state.config.move}`);
  }
  const { animationProfile, attacker, target } = state.config;
  const drained = Math.max(0, state.age - animationProfile.hpDrainFirstAge + 1);
  return {
    age: state.age,
    attacker,
    target,
    animationProfile,
    displayedTargetHp: Math.max(
      animationProfile.targetEndHp,
      animationProfile.targetStartHp - drained,
    ),
  };
}

export const ONIX_TO_GROVYLE_FIRE_PUNCH_GEOMETRY = {
  attacker: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
  target: {
    species: "GROVYLE",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 12 },
      // GetBattlerSpriteFinal_Y: singles opponent base 40 + Grovyle's
      // source-extracted front y_offset 4 (elevation 0).
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
} as const satisfies Pick<SceneOnFirePunchConfig, "attacker" | "target">;

export const ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE: FirePunchResolutionProfile = {
  startHp: 143,
  endHp: 112,
  initialStatus: "none",
  hpCommitAge: 200,
  secondaryRollAge: 205,
  secondaryRollSucceeded: false,
  currentMoveResetAge: Number.POSITIVE_INFINITY,
  effectivenessMessage: {
    kind: "superEffective",
    textStartAge: 204,
  },
};

export const ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE = {
  animationProfile: FAINT_ATTACK_ANIMATION_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  // The stock move printer has completed before the animation-script epoch.
  moveTextStartAge: -24,
} as const satisfies Pick<
  SceneOnFaintAttackConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

export const GROVYLE_TO_ONIX_FIRE_PUNCH_GEOMETRY = {
  attacker: {
    species: "GROVYLE",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 12 },
      animationCenter: { x: 176, y: 44 },
      battlePositionCenter: { x: 176, y: 40 },
    },
  },
  target: {
    species: "ONIX",
    geometry: {
      side: "player",
      spriteCorner: { x: 40, y: 48 },
      // Player singles base y=80; GetBattlerSpriteCoord Y_PIC_OFFSET adds 8.
      animationCenter: { x: 72, y: 88 },
      battlePositionCenter: { x: 72, y: 80 },
    },
  },
} as const satisfies Pick<SceneOnFirePunchConfig, "attacker" | "target">;

/**
 * Immutable stock-controller result from the committed opposite-side stage.
 * Presentation ages are relative to oracle frame 2081, never battle ticks.
 */
export const GROVYLE_TO_ONIX_FIRE_PUNCH_PROFILE: FirePunchResolutionProfile = {
  startHp: 117,
  endHp: 96,
  initialStatus: "none",
  hpDrainFirstAge: 27,
  hpCommitAge: 49,
  hitWobbleFirstAge: 0,
  hitWobbleTicks: 12,
  hitBlinkFirstAge: 1,
  hitBlinkTicks: 20,
  secondaryRollAge: 142,
  secondaryRollSucceeded: true,
  burnFlameFirstAge: 148,
  burnMessageTextStartAge: 184,
  healthboxStatusAge: 266,
  currentMoveResetAge: 277,
  effectivenessMessage: {
    kind: "notVeryEffective",
    textStartAge: 53,
  },
};

export const GROVYLE_TO_ONIX_FIRE_PUNCH_PRESENTATION = {
  // The opponent controller printed the used-move line before this seam and
  // hands over after Move_FIRE_PUNCH's particle task has completed.
  animationAgeOffset: 123,
  moveTextStartAge: -26,
} as const satisfies Pick<
  SceneOnFirePunchConfig,
  "animationAgeOffset" | "moveTextStartAge"
>;

const GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED = [
  62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21, 20, 5, 19, 18, 17, 16,
  15, 14, 13, 12, 11, 10, 9, 7, 54, 55, 56, 57, 58, 59, 23, 22, 48,
  49, 50, 51, 52, 53, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
] as const;

/**
 * Source-relative profile from the staged stock controller. Age zero is
 * oracle frame 1967; first-rock RAM creation is age 7 and the generic hit
 * controller begins at age 141. The seed is the live pre-allocation
 * `sSpriteOrder` at frame 1965, not a frame-dependent rendering table.
 */
export const GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE:
  Readonly<RockSlideAnimationProfile> = Object.freeze({
    rockAnchorAge: 7,
    targetShakeStartAge: 22,
    targetShakeEndAge: 115,
    hitFlashAnchorAge: 141,
    spriteOrderSeed: GROVYLE_TO_ONIX_ROCK_SLIDE_ORDER_SEED,
    occupiedSpriteSlots: [0, 1, 2, 6, 8, 60, 61, 62, 63],
  });

export const GROVYLE_TO_ONIX_ROCK_SLIDE_PRESENTATION = {
  animationProfile: GROVYLE_TO_ONIX_ROCK_SLIDE_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -30,
} as const satisfies Pick<
  SceneOnRockSlideConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

/**
 * Stock-controller profile for player-back ONIX's staged DOUBLE TEAM.
 * Age zero is oracle frame 2337, the first clone-task RAM frame. The live
 * `sSpriteOrder` places clone A (slot 3) in front of clone B (slot 4).
 */
export const ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE:
  Readonly<DoubleTeamAnimationProfile> = Object.freeze({
    cloneAnchorAge: 0,
    cloneVisibleStartAge: 2,
    cloneVisibleEndAge: 129,
    statsBannerStartAge: 163,
    statsBannerEndAge: 229,
    statsBannerBg1YAnchorAge: 166,
    frontClone: "a",
  });

export const ONIX_TO_GROVYLE_DOUBLE_TEAM_PRESENTATION = {
  animationProfile: ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -28,
} as const satisfies Pick<
  SceneOnDoubleTeamConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;

/**
 * Opposite-side stock-controller stage. Age zero is oracle frame 2347, the
 * first visible palette-blend frame of player-back ONIX's move body.
 */
export const ONIX_TO_GROVYLE_ENDEAVOR_PROFILE:
  Readonly<EndeavorAnimationProfile> = Object.freeze({
    attackerYOffset: 0,
    staleMovePower: 0,
    hpDrainFirstAge: 99,
    targetStartHp: 143,
    targetEndHp: 117,
  });

export const ONIX_TO_GROVYLE_ENDEAVOR_PRESENTATION = {
  animationProfile: ONIX_TO_GROVYLE_ENDEAVOR_PROFILE,
  fieldProfile: Object.freeze({
    playerHp: 117,
    opponentHp: 143,
    playerStatus: "none",
  }),
  moveTextStartAge: -37,
} as const satisfies Pick<
  SceneOnEndeavorConfig,
  "animationProfile" | "fieldProfile" | "moveTextStartAge"
>;
