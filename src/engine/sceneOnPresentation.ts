import {
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
}

export interface SceneOnMovePresentationState {
  readonly age: number;
  readonly config: SceneOnFirePunchConfig;
}

export interface SceneOnFirePunchView {
  readonly age: number;
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
  assertIntegerPoint("target spriteCorner", config.target.geometry.spriteCorner);
  assertIntegerPoint("target animationCenter", config.target.geometry.animationCenter);
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
  const resolution = firePunchResolutionState(
    state.age,
    state.config.resolutionProfile,
  );
  return {
    age: state.age,
    attacker: state.config.attacker,
    target: state.config.target,
    resolution,
    particles: firePunchParticlesInDrawOrder(state.age, geometry),
    burnFlames: [
      ...(resolution.secondaryRollSucceeded
        ? firePunchBurnFlames(state.age, geometry)
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
      spriteCorner: { x: 40, y: 56 },
      animationCenter: { x: 72, y: 88 },
    },
  },
  target: {
    species: "GROVYLE",
    geometry: {
      side: "opponent",
      spriteCorner: { x: 144, y: 16 },
      animationCenter: { x: 176, y: 51 },
    },
  },
} as const satisfies Pick<SceneOnFirePunchConfig, "attacker" | "target">;

export const ONIX_TO_GROVYLE_FIRE_PUNCH_PROFILE: FirePunchResolutionProfile = {
  startHp: 143,
  endHp: 112,
  initialStatus: "none",
  hpCommitAge: 199,
  secondaryRollAge: 204,
  secondaryRollSucceeded: false,
  currentMoveResetAge: Number.POSITIVE_INFINITY,
};
