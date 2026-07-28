import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import {
  linearTranslationDeltaQ8,
  linearTranslationOffsetAfterCallbacks,
} from "./animLinearTranslation.ts";

export type SmokescreenSide = "player" | "opponent";

export interface SmokescreenSprite {
  readonly kind: "black-ball" | "impact" | "black-smoke";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly oamSlot: number;
  readonly frame: 0 | 1 | 2;
  readonly hFlip: boolean;
  readonly vFlip: boolean;
  readonly invisible: boolean;
  readonly callback:
    | "projectile"
    | "impact"
    | "black-smoke";
}

export interface SmokescreenSoundEvent {
  readonly age: number;
  readonly song: "SE_M_DOUBLE_TEAM" | "SE_M_SAND_ATTACK";
  readonly pan: number;
}

export interface SmokescreenEffect {
  readonly active: boolean;
  readonly dynamicImpactAssetsLoaded: boolean;
  readonly visualTaskCount: number;
  readonly sprites: readonly SmokescreenSprite[];
  readonly soundEvents: readonly SmokescreenSoundEvent[];
  /** Smokescreen owns no visual task after command dispatch. */
  readonly taskTopology: readonly [];
  readonly battlerDisplayAge: number;
}

const SMOKE_ARGS = [
  [-12, 104, false], [-12, 72, true],
  [-6, 56, true], [-6, 88, false],
  [0, 56, false], [0, 88, true],
  [6, 72, false], [6, 104, true],
  [12, 72, false], [12, 56, true],
  [18, 80, false], [18, 72, true],
] as const;

function blackBallAtAge(
  age: number,
  attackerSide: SmokescreenSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SmokescreenSprite | null {
  if (age < 7 || age > 41) return null;
  const callbacks = age - 6;
  const startX = attackerCenter.x + (attackerSide === "player" ? 20 : -20);
  const startY = attackerCenter.y;
  const targetX = targetCenter.x;
  const targetY = targetCenter.y;
  const arcAngle = Math.trunc(
    (Math.trunc(0x8000 / 35) * callbacks) / 256,
  ) & 0xff;
  return {
    kind: "black-ball",
    x: startX,
    y: startY,
    x2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetX - startX, 35),
      callbacks,
      35,
    ),
    y2: linearTranslationOffsetAfterCallbacks(
      linearTranslationDeltaQ8(targetY - startY, 35),
      callbacks,
      35,
    ) + Math.floor(GBA_SINE_TABLE_256[arcAngle]! * -25 / 256),
    oamSlot: 3,
    frame: 0,
    hFlip: false,
    vFlip: false,
    invisible: false,
    callback: "projectile",
  };
}

function impactAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly SmokescreenSprite[] {
  if (age < 43 || age > 55) return [];
  const frame = age <= 45 ? 0 : age <= 50 ? 1 : 2;
  return [
    { x: -8, y: -8, hFlip: false, vFlip: false, oamSlot: 4 },
    { x: 8, y: -8, hFlip: true, vFlip: false, oamSlot: 5 },
    { x: -8, y: 8, hFlip: false, vFlip: true, oamSlot: 7 },
    { x: 8, y: 8, hFlip: true, vFlip: true, oamSlot: 9 },
  ].map((part): SmokescreenSprite => ({
    kind: "impact",
    x: targetCenter.x + part.x,
    y: targetCenter.y + part.y,
    x2: 0,
    y2: 0,
    oamSlot: part.oamSlot,
    frame,
    hFlip: part.hFlip,
    vFlip: part.vFlip,
    invisible: false,
    callback: "impact",
  }));
}

function smokeAtAge(
  age: number,
  targetCenter: Readonly<{ x: number; y: number }>,
): readonly SmokescreenSprite[] {
  if (age < 47 || age > 122) return [];
  // The creation dispatch performs the first callback. Because it happens
  // after the normal sprite callback pass, that first software state spans
  // two displays; subsequent displays advance once each.
  const callbacks = Math.max(1, age - 47);
  return SMOKE_ARGS.map(([y, stepMagnitude, invert], index) => {
    const step = invert ? -stepMagnitude : stepMagnitude;
    return {
      kind: "black-smoke" as const,
      x: targetCenter.x,
      y: targetCenter.y + y,
      x2: ((callbacks - 1) * step) >> 8,
      y2: 0,
      oamSlot: 10 + index,
      frame: 0 as const,
      hFlip: false,
      vFlip: false,
      invisible: callbacks % 2 === 1,
      callback: "black-smoke" as const,
    };
  });
}

/**
 * Complete 125-display source body of `Move_SMOKESCREEN`.
 *
 * Age zero is the first BLACK_SMOKE load display; age 124 is the first
 * inactive cleanup. All timing is source-relative and presentation-only.
 */
export function smokescreenEffectAtAge(
  age: number,
  attackerSide: SmokescreenSide,
  attackerCenter: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SmokescreenEffect {
  const ball = blackBallAtAge(
    age,
    attackerSide,
    attackerCenter,
    targetCenter,
  );
  const sprites = [
    ...(ball ? [ball] : []),
    ...impactAtAge(age, targetCenter),
    ...smokeAtAge(age, targetCenter),
  ];
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  return {
    active: age >= 0 && age <= 123,
    dynamicImpactAssetsLoaded: age >= 43 && age <= 55,
    visualTaskCount: Number(ball !== null) + (age >= 47 && age <= 122 ? 12 : 0),
    sprites,
    soundEvents: [
      // MPlay begins three displays after the script's playse command.
      { age: 7, song: "SE_M_DOUBLE_TEAM", pan: attackerPan },
      { age: 47, song: "SE_M_SAND_ATTACK", pan: targetPan },
    ],
    taskTopology: [],
    battlerDisplayAge: age - 1,
  };
}
