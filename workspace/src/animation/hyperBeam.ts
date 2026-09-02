/** Pure source-age port of Move_HYPER_BEAM and AnimHyperBeamOrb. */
import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { shakeMonOffsetAtTick, type ShakeMonOffset } from "./shakeMon.ts";
import { shakeMon2OffsetAtTick } from "./shakeMon2.ts";

export type HyperBeamSide = "player" | "opponent";

export interface HyperBeamGeometry {
  readonly attackerPictureCenter: Readonly<{ x: number; y: number }>;
  readonly targetPictureCenter: Readonly<{ x: number; y: number }>;
  readonly attackerRestOffset: Readonly<{ x2: number; y2: number }>;
  readonly targetRestOffset: Readonly<{ x2: number; y2: number }>;
}
/** The three Random2 results consumed by one orb, reduced to used bits. */
export interface HyperBeamOrbRandom {
  readonly animation: number;
  readonly speed: number;
  readonly phase: number;
  readonly slot: number;
  readonly persistentOrder: number;
}

export interface HyperBeamProfile {
  readonly orbs: readonly HyperBeamOrbRandom[];
  readonly attackerSubpriority: number;
  readonly targetSubpriority: number;
  readonly spriteOrderSeed: readonly number[];
}

export interface HyperBeamOrb {
  readonly index: number;
  readonly group: number;
  readonly sourceCreationAge: number;
  readonly localAge: number;
  readonly slot: number;
  readonly persistentOrder: number;
  readonly animation: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly subpriority: number;
  readonly matrix: readonly [256, 0, 0, 256];
}

export interface HyperBeamState {
  readonly age: number;
  readonly active: boolean;
  readonly attackerSide: HyperBeamSide;
  readonly orbs: readonly HyperBeamOrb[];
  /** Active ORBS slots in back-to-front software painter order. */
  readonly painterOrder: readonly number[];
  readonly attackerOffset: ShakeMonOffset;
  readonly targetOffset: ShakeMonOffset;
  readonly backgroundBlendY: number;
  readonly orbPalette: Readonly<{ color: "red" | "black"; coefficient: number }>;
  readonly targetPaletteBlendY: number;
  readonly audio: Readonly<{
    initial: boolean;
    loopActive: boolean;
    loopArgs: readonly [1, 15, 0, 5];
    pan: Readonly<{ from: HyperBeamSide; to: HyperBeamSide }>;
  }>;
  readonly resources: Readonly<{ orbs: boolean; freed: boolean }>;
  readonly cleanup: Readonly<{ firstInactive: boolean }>;
}

interface MutableOrb {
  x: number; y: number; x2: number; y2: number;
  remaining: number; dx: number; dy: number; accX: number; accY: number;
  phase: number; subpriority: number; destroyed: boolean;
}

function signedStep(delta: number, duration: number): number {
  const magnitude = Math.trunc((Math.abs(delta) << 4) / duration);
  return delta < 0 ? magnitude | 1 : magnitude & ~1;
}

function advanceOrb(orb: MutableOrb, baseSubpriority: number): void {
  if (orb.remaining === 0) { orb.destroyed = true; return; }
  orb.accX = (orb.accX + orb.dx) & 0xffff;
  orb.accY = (orb.accY + orb.dy) & 0xffff;
  orb.x2 = (orb.dx & 1) ? -(orb.accX >>> 4) : orb.accX >>> 4;
  orb.y2 = (orb.dy & 1) ? -(orb.accY >>> 4) : orb.accY >>> 4;
  orb.remaining -= 1;
  orb.y2 += (GBA_SINE_TABLE_256[(orb.phase + 64) & 0xff]! * 12) >> 8;
  orb.subpriority = orb.phase < 0x7f ? baseSubpriority : baseSubpriority + 1;
  orb.phase = (orb.phase + 24) & 0xff;
}

function orbAtAge(
  index: number,
  age: number,
  side: HyperBeamSide,
  geometry: Readonly<HyperBeamGeometry>,
  profile: Readonly<HyperBeamProfile>,
): HyperBeamOrb | null {
  const random = profile.orbs[index];
  if (!random) return null;
  const sourceCreationAge = 110 + Math.floor(index / 2) * 3;
  const localAge = age - sourceCreationAge;
  if (localAge < 0) return null;
  const x = geometry.attackerPictureCenter.x + (side === "player" ? 20 : -20);
  const y = geometry.attackerPictureCenter.y;
  const xDiff = geometry.targetPictureCenter.x - x;
  const yDiff = geometry.targetPictureCenter.y - y;
  const duration = Math.trunc((Math.abs(xDiff) << 4) / random.speed);
  const orb: MutableOrb = {
    x, y, x2: 0, y2: 0, remaining: duration,
    dx: signedStep(xDiff, duration), dy: signedStep(yDiff, duration),
    accX: 0, accY: 0, phase: random.phase & 0xff,
    subpriority: profile.targetSubpriority - 2, destroyed: false,
  };
  // CreateSpriteAndAnimate invokes the callback once, then AnimateSprites
  // invokes it again later in the same retained source row.
  for (let tick = 0; tick < localAge + 2 && !orb.destroyed; tick += 1) {
    advanceOrb(orb, profile.targetSubpriority - 2);
  }
  if (orb.destroyed) return null;
  return {
    index, group: Math.floor(index / 2), sourceCreationAge, localAge,
    slot: random.slot, persistentOrder: random.persistentOrder,
    animation: random.animation & 7, x: orb.x, y: orb.y,
    x2: orb.x2, y2: orb.y2, subpriority: orb.subpriority,
    matrix: [256, 0, 0, 256],
  };
}

function orbPainterOrderAtAge(
  age: number,
  side: HyperBeamSide,
  geometry: Readonly<HyperBeamGeometry>,
  profile: Readonly<HyperBeamProfile>,
): readonly number[] {
  let hardwareOrder: HyperBeamOrb[] = [];
  for (let sourceAge = 110; sourceAge <= age; sourceAge += 1) {
    const current = Array.from({ length: 52 }, (_, index) =>
      orbAtAge(index, sourceAge, side, geometry, profile)).filter(
        (orb): orb is HyperBeamOrb => orb !== null,
      );
    const currentSlots = new Set(current.map((orb) => orb.slot));
    hardwareOrder = hardwareOrder.filter((orb) => currentSlots.has(orb.slot));
    const known = new Set(hardwareOrder.map((orb) => orb.slot));
    for (const orb of [...current].sort((left, right) =>
      left.persistentOrder - right.persistentOrder)) {
      if (!known.has(orb.slot)) { hardwareOrder.push(orb); known.add(orb.slot); }
    }
    const bySlot = new Map(current.map((orb) => [orb.slot, orb]));
    hardwareOrder = hardwareOrder.map((orb) => bySlot.get(orb.slot)!).sort(
      (left, right) => left.subpriority - right.subpriority
        || right.y + right.y2 - (left.y + left.y2),
    );
  }
  return hardwareOrder.reverse().map((orb) => orb.slot);
}

function backgroundBlendY(age: number): number {
  if (age < 9) return 0;
  if (age <= 51) return Math.min(16, 2 + Math.floor((age - 9) / 6) * 2);
  if (age < 229) return 16;
  if (age <= 271) return Math.max(0, 14 - Math.floor((age - 229) / 6) * 2);
  return 0;
}

function orbPalette(age: number): { color: "red" | "black"; coefficient: number } {
  if (age < 110 || age >= 189) return { color: "black", coefficient: 0 };
  if (age >= 182) return { color: "red", coefficient: 16 };
  const leg = Math.floor((age - 110) / 6);
  return leg % 2 === 0 ? { color: "red", coefficient: 16 } : { color: "black", coefficient: 0 };
}

function targetPaletteBlendY(age: number): number {
  if (age < 129) return 0;
  if (age <= 159) return Math.min(11, 1 + Math.floor((age - 129) / 3));
  if (age < 192) return 11;
  if (age <= 222) return Math.max(0, 10 - Math.floor((age - 192) / 3));
  return 0;
}

function attackerOffset(age: number): ShakeMonOffset {
  if (age >= 71 && age <= 76) return shakeMon2OffsetAtTick(1, 0, 4, 1, age - 70);
  if (age >= 110 && age <= 207) return shakeMonOffsetAtTick(0, 4, 50, 1, age - 109);
  return { x2: 0, y2: 0 };
}

function targetOffset(age: number): ShakeMonOffset {
  return age >= 125 && age <= 222
    ? shakeMon2OffsetAtTick(4, 0, 50, 1, age - 124)
    : { x2: 0, y2: 0 };
}

export function hyperBeamAtAge(
  age: number,
  attackerSide: HyperBeamSide,
  geometry: Readonly<HyperBeamGeometry>,
  profile: Readonly<HyperBeamProfile>,
): HyperBeamState {
  const orbs = Array.from({ length: 52 }, (_, index) =>
    orbAtAge(index, age, attackerSide, geometry, profile)).filter(
      (orb): orb is HyperBeamOrb => orb !== null,
    );
  return {
    age, active: age >= 0 && age < 279, attackerSide, orbs,
    painterOrder: orbPainterOrderAtAge(age, attackerSide, geometry, profile),
    attackerOffset: attackerOffset(age), targetOffset: targetOffset(age),
    backgroundBlendY: backgroundBlendY(age), orbPalette: orbPalette(age),
    targetPaletteBlendY: targetPaletteBlendY(age),
    audio: {
      initial: age === 70, loopActive: age >= 110 && age <= 192,
      loopArgs: [1, 15, 0, 5],
      pan: { from: attackerSide, to: attackerSide === "player" ? "opponent" : "player" },
    },
    resources: { orbs: age >= 1 && age < 279, freed: age >= 279 },
    cleanup: { firstInactive: age >= 279 },
  };
}
