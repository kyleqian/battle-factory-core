import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";
import { horizontalLungeX2AtTick } from "./horizontalLunge.ts";

export type ReversalSide = "player" | "opponent";

export interface ReversalResolvedShakeReceipt {
  readonly kind: "resolved-power-shake";
  /** Already clamped by the battle/controller owner; this reducer never reads damage. */
  readonly amplitude: number;
}

export interface ReversalOrb {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly x2: number;
  readonly y2: number;
  readonly phase: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly behindAttacker: boolean;
}

export interface ReversalPaletteBlend {
  readonly color: "white" | "black";
  readonly coefficient: number;
}

export interface ReversalState {
  readonly active: boolean;
  readonly assetsLoaded: Readonly<{
    blueOrb: boolean;
    handsAndFeet: boolean;
    impact: boolean;
  }>;
  readonly paletteBlend: ReversalPaletteBlend | null;
  readonly orbs: readonly ReversalOrb[];
  readonly attackerX2: number;
  readonly targetX2: number;
  readonly fist: Readonly<{ x: number; y: number; remaining: number }> | null;
  readonly hitsplat: Readonly<{ x: number; y: number; animation: 1 }> | null;
  readonly visualTaskCount: number;
  readonly sound: Readonly<{
    song: "SE_M_DETECT" | "SE_M_REVERSAL" | "SE_M_VITAL_THROW2";
    player: "SE1" | "SE2";
    pan: number;
  }> | null;
  readonly battlerDisplayAge: number;
}

const ORB_PHASES = [0, 42, 84, 126, 168, 210] as const;
function div256(value: number): number {
  return Math.floor(value / 256);
}

function orbAtLocalAge(
  localAge: number,
  index: number,
  center: Readonly<{ x: number; y: number }>,
): ReversalOrb | null {
  if (localAge < 0 || localAge > 49) return null;
  let phase: number = ORB_PHASES[index]!;
  let radiusXQ8 = 0;
  let radiusYQ8 = 0;
  let counter = 0;
  let shrinking = false;
  let x2 = 0;
  let y2 = 0;
  // Creation invokes the callback synchronously and the ordinary sprite pass
  // invokes it once more before the first retained software-OAM display.
  for (let callback = 0; callback <= localAge + 1; callback += 1) {
    x2 = div256(GBA_SINE_TABLE_256[phase & 0xff]! * (radiusXQ8 >> 8));
    y2 = div256(
      GBA_SINE_TABLE_256[(phase + 64) & 0xff]! * (radiusYQ8 >> 8),
    );
    phase = (phase + 9) & 0xff;
    if (!shrinking) {
      radiusXQ8 += 0x400;
      radiusYQ8 += 0x100;
      counter += 1;
      if (counter === 26) {
        counter = 0;
        shrinking = true;
      }
    } else {
      radiusXQ8 -= 0x400;
      radiusYQ8 -= 0x100;
      counter += 1;
    }
  }
  return {
    index,
    x: center.x,
    y: center.y,
    x2,
    y2,
    phase,
    radiusX: radiusXQ8,
    radiusY: radiusYQ8,
    // Lower subpriority is transferred in front. The source's -1 branch is
    // therefore the near half of the orbit, while +1 is behind the battler.
    behindAttacker: phase >= 64 && phase <= 195,
  };
}

function complexBlendAtAge(age: number): ReversalPaletteBlend | null {
  if (age >= 10 && age <= 12) return { color: "white", coefficient: 8 };
  if (age >= 17 && age <= 20) return { color: "white", coefficient: 8 };
  if (age >= 154 && age <= 156) return { color: "white", coefficient: 8 };
  return null;
}

function colorCycleCoefficientAtAge(age: number): number {
  if (age >= 63 && age <= 82) return 2 + 2 * Math.floor((age - 63) / 5);
  if (age >= 83 && age <= 93) return 10;
  if (age >= 94 && age <= 113) return 8 - 2 * Math.floor((age - 94) / 5);
  return 0;
}

function targetShakeX2(
  age: number,
  receipt: Readonly<ReversalResolvedShakeReceipt>,
): number {
  if (age < 155 || age > 168) return 0;
  const toggle = Math.floor((age - 155) / 2);
  return toggle % 2 === 0 ? receipt.amplitude : 0;
}

/**
 * Pure source-relative reducer for the complete 174-display Move_REVERSAL
 * load/body/free envelope. Age 0 is BLUE_ORB's first load display and age
 * 173 is the first inactive cleanup.
 */
export function reversalAtAge(
  age: number,
  attackerSide: ReversalSide,
  attackerPictureOffset: Readonly<{ x: number; y: number }>,
  targetCenter: Readonly<{ x: number; y: number }>,
  shake: Readonly<ReversalResolvedShakeReceipt>,
): ReversalState {
  const attackerPan = attackerSide === "player" ? -64 : 63;
  const targetPan = attackerSide === "player" ? 63 : -63;
  const cycleY = colorCycleCoefficientAtAge(age);
  const paletteBlend = complexBlendAtAge(age)
    ?? (cycleY > 0 ? { color: "white" as const, coefficient: cycleY } : null);
  const orbs = ORB_PHASES.map((_, index) =>
    orbAtLocalAge(age - 71, index, attackerPictureOffset)
  ).filter((orb): orb is ReversalOrb => orb !== null);
  const lungeTick = age >= 143 ? age - 143 : -1;
  const attackerX2 = lungeTick < 0
    ? 0
    : horizontalLungeX2AtTick(6, 4, attackerSide, lungeTick);
  return {
    active: age >= 0 && age <= 172,
    assetsLoaded: {
      blueOrb: age >= 0 && age <= 172,
      handsAndFeet: age >= 3 && age <= 172,
      impact: age >= 6 && age <= 172,
    },
    paletteBlend,
    orbs,
    attackerX2,
    targetX2: targetShakeX2(age, shake),
    fist: age >= 154 && age <= 164
      ? { x: targetCenter.x, y: targetCenter.y, remaining: 164 - age }
      : null,
    hitsplat: age >= 154 && age <= 163
      ? { x: targetCenter.x, y: targetCenter.y, animation: 1 }
      : null,
    visualTaskCount:
      Number((age >= 10 && age <= 25) || (age >= 154 && age <= 161))
      + Number(age >= 59 && age <= 119)
      + orbs.length
      + Number(age >= 144 && age <= 158)
      + Number(age >= 154 && age <= 164)
      + Number(age >= 154 && age <= 163)
      + Number(age >= 154 && age <= 168),
    sound: age === 10
      ? { song: "SE_M_DETECT", player: "SE2", pan: attackerPan }
      : age === 71
        ? { song: "SE_M_REVERSAL", player: "SE1", pan: attackerPan }
        : age === 154
          ? { song: "SE_M_VITAL_THROW2", player: "SE1", pan: targetPan }
          : null,
    battlerDisplayAge: age - 1,
  };
}
