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

export interface SceneOnMovePresentationState {
  readonly age: number;
  readonly config: SceneOnFirePunchConfig;
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
export function createSceneOnMovePresentation(
  config: SceneOnFirePunchConfig,
): SceneOnMovePresentationState {
  if (config.attacker.geometry.side === config.target.geometry.side) {
    throw new Error("attacker and target must occupy opposite battle sides");
  }
  assertIntegerPoint("attacker spriteCorner", config.attacker.geometry.spriteCorner);
  assertIntegerPoint("attacker animationCenter", config.attacker.geometry.animationCenter);
  assertIntegerPoint("attacker battlePositionCenter", config.attacker.geometry.battlePositionCenter);
  assertIntegerPoint("target spriteCorner", config.target.geometry.spriteCorner);
  assertIntegerPoint("target animationCenter", config.target.geometry.animationCenter);
  assertIntegerPoint("target battlePositionCenter", config.target.geometry.battlePositionCenter);
  if (
    config.resolutionProfile.startHp < config.resolutionProfile.endHp
    || config.resolutionProfile.endHp < 0
  ) {
    throw new Error("FIRE_PUNCH resolution profile requires startHp >= endHp >= 0");
  }
  return { age: 0, config };
}

export function advanceSceneOnMovePresentation(
  state: SceneOnMovePresentationState,
): SceneOnMovePresentationState {
  return { ...state, age: state.age + 1 };
}

export function sceneOnFirePunchView(
  state: SceneOnMovePresentationState,
): SceneOnFirePunchView {
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
