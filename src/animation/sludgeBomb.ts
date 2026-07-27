import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";
import {
  sludgeEffectAtAge,
  sludgeProjectileAtLocalAge,
  sludgeTargetPaletteYAtAge,
  type SludgeSprite,
} from "./sludge.ts";

export const SLUDGE_BOMB_PROJECTILE_START_AGES =
  [0, 5, 10, 15, 20, 25, 30, 35, 40, 45] as const;
export const SLUDGE_BOMB_PROJECTILE_OAM_SLOTS =
  [3, 4, 5, 7, 9, 10, 11, 12, 13, 3] as const;
export const SLUDGE_BOMB_HIT_START_AGES = [50, 57, 64] as const;
export const SLUDGE_BOMB_HIT_OFFSETS = [
  { x: 42, y: 27 }, { x: -27, y: 44 }, { x: 39, y: -28 }, { x: -42, y: -42 },
  { x: 0, y: 40 }, { x: -8, y: -44 }, { x: -46, y: -28 }, { x: 46, y: 9 },
  { x: 42, y: 0 }, { x: -43, y: -12 }, { x: 16, y: -46 }, { x: -16, y: 44 },
] as const;
export const SLUDGE_BOMB_HIT_OAM_SLOTS =
  [4, 14, 15, 16, 5, 7, 17, 18, 9, 19, 20, 21] as const;
export const SLUDGE_BOMB_POISON_BUBBLE_FIRST_AGE = 98;

export interface SludgeBombSprite extends Omit<SludgeSprite, "kind"> {
  readonly kind: "projectile" | "hitParticle" | "poisonBubble";
}

export interface SludgeBombEffect {
  readonly targetOffset: Readonly<{ x2: number; y2: number }>;
  readonly defenderPaletteY: number;
  readonly sprites: readonly SludgeBombSprite[];
}

const s16 = (value: number) => {
  const word = value & 0xffff;
  return word >= 0x8000 ? word - 0x10000 : word;
};

function hitParticleAtLocalAge(
  localAge: number,
  offset: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
  spawnIndex: number,
  oamSlot: number,
): SludgeBombSprite | undefined {
  if (localAge < 0 || localAge >= 20) return undefined;
  const duration = 20;
  let remaining = duration;
  let dx = s16(Math.trunc((offset.x * 256) / duration));
  let dy = s16(Math.trunc((offset.y * 256) / duration));
  let accumX = 0;
  let accumY = 0;
  const decX = Math.trunc(targetCenter.x / duration);
  const decY = Math.trunc((targetCenter.x + offset.x) / duration);
  for (let callback = 0; callback <= localAge; callback += 1) {
    remaining -= 1;
    accumX = s16(accumX + dx);
    accumY = s16(accumY + dy);
    dx = s16(dx - decX);
    dy = s16(dy - decY);
  }
  void remaining;
  return {
    kind: "hitParticle",
    x: targetCenter.x + (accumX >> 8),
    y: targetCenter.y + (accumY >> 8),
    xScale: 277,
    yScale: 277,
    spawnIndex,
    oamSlot,
  };
}

/** Complete first `Move_SLUDGE_BOMB` script body, age zero at projectile 1. */
export function sludgeBombEffectAtAge(
  age: number,
  attackerSide: "player" | "opponent",
  projectileOrigin: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
): SludgeBombEffect {
  const sprites: SludgeBombSprite[] = [];
  SLUDGE_BOMB_PROJECTILE_START_AGES.forEach((start, index) => {
    const sprite = sludgeProjectileAtLocalAge(
      age - start,
      attackerSide,
      projectileOrigin,
      targetCenter,
      index,
      SLUDGE_BOMB_PROJECTILE_OAM_SLOTS[index],
    );
    if (sprite) sprites.push(sprite);
  });
  SLUDGE_BOMB_HIT_OFFSETS.forEach((offset, index) => {
    const batch = Math.floor(index / 4);
    const sprite = hitParticleAtLocalAge(
      age - SLUDGE_BOMB_HIT_START_AGES[batch]!,
      offset,
      targetCenter,
      index,
      SLUDGE_BOMB_HIT_OAM_SLOTS[index]!,
    );
    if (sprite) sprites.push(sprite);
  });
  const bubbles = sludgeEffectAtAge(
    age - SLUDGE_BOMB_POISON_BUBBLE_FIRST_AGE + 41,
    attackerSide,
    targetCenter,
    targetCenter,
  ).sprites.filter((sprite) => sprite.kind === "poisonBubble");
  sprites.push(...bubbles);
  return {
    targetOffset: age < 50
      ? { x2: 0, y2: 0 }
      : shakeMon2OffsetAtTick(3, 0, 15, 1, age - 49),
    defenderPaletteY: sludgeTargetPaletteYAtAge(age - 9),
    sprites,
  };
}
