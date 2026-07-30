import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";
import { windUpLungeAtTick } from "./windUpLunge.ts";

export type BrickBreakSide = "player" | "opponent";
export type BrickBreakBody = "normal" | "shattered-wall";

export interface BrickBreakSprite {
  readonly kind: "hitsplat" | "fist" | "wall" | "shard";
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly cell: number;
  readonly oamSlot: number;
}

export interface BrickBreakState {
  readonly body: BrickBreakBody;
  readonly active: boolean;
  readonly assetsLoaded: boolean;
  readonly targetMonbg: boolean;
  readonly alpha: Readonly<{ eva: 12; evb: 8 }> | null;
  readonly registers: Readonly<{ bldcnt: 0 | 16192; bldalpha: 0 | 2060 }>;
  readonly bgBlendY: number;
  readonly attackerOffset: Readonly<{ x2: number; y2: number }>;
  readonly battlerDisplayAge: number;
  readonly sprites: readonly BrickBreakSprite[];
  readonly windUpTask: "step1" | "step2" | null;
  readonly sound:
    | "SE_M_VITAL_THROW"
    | "SE_M_VITAL_THROW2"
    | "SE_M_BRICK_BREAK"
    | null;
  readonly soundPan: -63 | 63 | null;
}

export const BRICK_BREAK_NORMAL_FRAME_COUNT = 151;
export const BRICK_BREAK_SHATTERED_FRAME_COUNT = 192;

const WIND_UP = {
  horizontalSpeed: -24,
  waveAmplitude: 0,
  windUpDuration: 24,
  delayBeforeLunge: 10,
  targetXOffset: 24,
  lungeDuration: 3,
} as const;

function blendYAtAge(age: number, body: BrickBreakBody): number {
  if (age < 79) return 0;
  if (age < 83) return 2;
  if (age < 87) return 4;
  const reverse = body === "normal" ? 127 : 168;
  if (age < reverse + 3) return 6;
  if (age < reverse + 7) return 4;
  if (age < reverse + 11) return 2;
  return 0;
}

function hit(
  age: number,
  start: number,
  scriptX: number,
  scriptY: number,
  side: BrickBreakSide,
  target: Readonly<{ x: number; y: number }>,
  slot: number,
): BrickBreakSprite | null {
  if (age < start || age > start + 9) return null;
  return {
    kind: "hitsplat",
    x: target.x + (side === "player" ? scriptX : -scriptX),
    y: target.y + scriptY,
    x2: 0,
    y2: 0,
    cell: 1,
    oamSlot: slot,
  };
}

/**
 * Complete source-relative reducer for both `Move_BRICK_BREAK` bodies.
 * Age zero is the first source-pointer display; the last frame is the first
 * inactive cleanup display.
 */
export function brickBreakAtAge(
  age: number,
  body: BrickBreakBody,
  attackerSide: BrickBreakSide,
  targetPictureCenter: Readonly<{ x: number; y: number }>,
  targetBattleCenter: Readonly<{ x: number; y: number }>,
): BrickBreakState {
  const count = body === "normal"
    ? BRICK_BREAK_NORMAL_FRAME_COUNT
    : BRICK_BREAK_SHATTERED_FRAME_COUNT;
  const clearStart = count - 5;
  const side = attackerSide === "player" ? 1 : -1;
  const firstLunge = horizontalLungeX2AtTick(
    3, 8, attackerSide, age - 15,
  );
  const secondLunge = horizontalLungeX2AtTick(
    3, 8, attackerSide, age - 46,
  );
  const wind = windUpLungeAtTick(WIND_UP, attackerSide, age - 76);
  const sprites: BrickBreakSprite[] = [];
  for (const sprite of [
    hit(
      age, 25, -18, -18, attackerSide, targetPictureCenter,
      body === "normal" ? 4 : 5,
    ),
    hit(
      age, 54, 18, 18, attackerSide, targetPictureCenter,
      body === "normal" ? 4 : 5,
    ),
    hit(age, 115, 0, 0, attackerSide, targetPictureCenter, 3),
  ]) if (sprite) sprites.push(sprite);
  if (age >= 115 && age <= 125) {
    sprites.push({
      kind: "fist", x: targetPictureCenter.x, y: targetPictureCenter.y,
      x2: 0, y2: 0, cell: 0, oamSlot: body === "normal" ? 4 : 5,
    });
  }
  if (body === "shattered-wall" && age >= 22 && age <= 120) {
    let x2 = 0;
    if (age >= 113) x2 = Math.floor((age - 111) / 2) % 2 ? 2 : -2;
    sprites.push({
      kind: "wall", x: targetBattleCenter.x, y: targetBattleCenter.y,
      x2, y2: 0, cell: 0, oamSlot: 4,
    });
  }
  if (body === "shattered-wall" && age >= 127 && age <= 166) {
    const step = age - 126;
    const shards = [
      { dx: -8, dy: -12, vx: -3, vy: -3, slot: 3 },
      { dx: 8, dy: -12, vx: 3, vy: -3, slot: 4 },
      { dx: -8, dy: 12, vx: -3, vy: 3, slot: 5 },
      { dx: 8, dy: 12, vx: 3, vy: 3, slot: 7 },
    ];
    for (const [cell, shard] of shards.entries()) {
      sprites.push({
        kind: "shard",
        x: targetBattleCenter.x + shard.dx + shard.vx * step,
        y: targetBattleCenter.y + shard.dy + shard.vy * step,
        x2: 0,
        y2: 0,
        cell,
        oamSlot: shard.slot,
      });
    }
  }
  const alpha = age >= 16 && age < count
    ? { eva: 12 as const, evb: 8 as const } : null;
  return {
    body,
    active: age >= 0 && age < count - 1,
    assetsLoaded: age >= 10 && age < count - 1,
    targetMonbg: age >= 13 && age <= clearStart + 2,
    alpha,
    registers: alpha
      ? { bldcnt: 16192, bldalpha: 2060 }
      : { bldcnt: 0, bldalpha: 0 },
    bgBlendY: blendYAtAge(age, body),
    attackerOffset: age >= 76 && age <= 111
      ? wind.offset
      : { x2: firstLunge + secondLunge, y2: 0 },
    // WindUpLunge is created after the ordinary task pass. Its first
    // battler write therefore reaches hardware OAM through a two-age latch.
    battlerDisplayAge: age >= 76 && age <= 113 ? age - 2 : age - 1,
    sprites,
    windUpTask: age >= 76 && age <= 98
      ? "step1" : age >= 99 && age <= 111 ? "step2" : null,
    sound: age === 25 || age === 54
      ? "SE_M_VITAL_THROW"
      : age === 115
        ? "SE_M_VITAL_THROW2"
        : body === "shattered-wall" && age === 127
          ? "SE_M_BRICK_BREAK" : null,
    soundPan: age === 25 || age === 54 || age === 115
      || (body === "shattered-wall" && age === 127)
      ? (side === 1 ? 63 : -63) : null,
  };
}
