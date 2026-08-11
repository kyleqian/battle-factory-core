import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/** Pure source-relative port of Move_ACID_ARMOR / AnimTask_AcidArmor. */
export type AcidArmorSide = "player" | "opponent";

export interface AcidArmorScanline {
  readonly hofs: number;
  readonly vofs: number;
}

export interface AcidArmorState {
  readonly age: number;
  readonly taskActive: boolean;
  readonly taskData: readonly number[];
  readonly monbgActive: boolean;
  readonly scanlineActive: boolean;
  readonly scanlineState: 0 | 1 | 3;
  readonly scanlineSourcePhase: number;
  readonly scanlines: readonly AcidArmorScanline[];
  readonly bg: "BG1" | "BG2";
  readonly bldcnt: number;
  readonly bldalpha: number;
  readonly bldy: 0;
  readonly eva: number;
  readonly evb: number;
}

export const ACID_ARMOR_FIRST_TASK_AGE = 4;
export const ACID_ARMOR_LAST_TASK_AGE = 111;
export const ACID_ARMOR_FIRST_INACTIVE_AGE = 118;
export const ACID_ARMOR_MONBG_FIRST_AGE = 1;
export const ACID_ARMOR_MONBG_LAST_AGE = 112;

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function signedSine(index: number): number {
  return GBA_SINE_TABLE_256[index & 0xff]!;
}

interface Simulation {
  readonly data: number[];
  readonly generated: AcidArmorScanline[] | null;
  readonly scanlineState: 0 | 1 | 3;
  readonly taskActive: boolean;
}

function stationary(bgX: number, bgY: number): AcidArmorScanline[] {
  return Array.from({ length: 160 }, () => ({ hofs: bgX, vofs: bgY }));
}

function simulate(age: number, side: AcidArmorSide): Simulation {
  const opponent = side === "opponent";
  const bgX = opponent ? -144 : -40;
  const bgY = opponent ? -20 : -60;
  const top = opponent ? 6 : 46;
  const bottom = top + 66;
  const data = [0, 0, 0, 16, 0, opponent ? 1 : 0, 32, 0,
    opponent ? -24 : 24, 0, 0, 0, 0, top, bottom,
    opponent ? 8 : 6];
  let generated: AcidArmorScanline[] | null = null;
  let scanlineState: 0 | 1 | 3 = 1;
  let active = age >= ACID_ARMOR_FIRST_TASK_AGE;

  for (let current = ACID_ARMOR_FIRST_TASK_AGE;
    current <= age && active; current += 1) {
    switch (data[0]) {
      case 0: {
        const rows = stationary(bgX, bgY);
        data[1] = (data[1]! + 2) & 0xff;
        let sineIndex = data[1]!;
        data[9] = div(0x7e0, data[6]!);
        const slope = div(data[7]! * 2, data[9]!);
        data[10] = slope === 0 ? 0 : -slope;
        data[11] = data[7]!;
        data[12] = data[11]! >> 5;
        let var1 = 0;
        let var2 = 0;
        let i = 0;
        for (let y = bottom; y > top; y -= 1) {
          rows[y] = {
            hofs: bgX + data[12]! + (signedSine(sineIndex) >> 5),
            vofs: (i - var2) + bgY,
          };
          sineIndex = (sineIndex + 10) & 0xff;
          data[11] = data[11]! + data[10]!;
          data[12] = data[11]! >> 5;
          i += 1;
          var1 += data[6]!;
          var2 = var1 >> 5;
        }
        for (let y = top; y >= 0; y -= 1) rows[y] = { hofs: bgX + 240, vofs: bgY };
        generated = rows;
        data[6] = data[6]! + 1;
        if (data[6]! > 63) {
          data[6] = 64;
          data[2] = data[2]! + 1;
          if (data[2]! & 1) data[3] = data[3]! - 1;
          else data[4] = data[4]! + 1;
          if (data[3] === 0 && data[4] === 16) {
            data[2] = 0;
            data[3] = 0;
            data[0] = 1;
          }
        } else {
          data[7] = data[7]! + data[8]!;
        }
        break;
      }
      case 1:
        data[2] = data[2]! + 1;
        if (data[2]! > 12) {
          scanlineState = 3;
          data[2] = 0;
          data[0] = 2;
        }
        break;
      case 2:
        data[2] = data[2]! + 1;
        if (data[2]! & 1) data[3] = data[3]! + 1;
        else data[4] = data[4]! - 1;
        if (data[3] === 16 && data[4] === 0) {
          data[2] = 0;
          data[3] = 0;
          data[0] = 3;
        }
        break;
      case 3:
        active = false;
        break;
    }
    if (scanlineState === 3 && current < age) scanlineState = 0;
  }
  return { data, generated, scanlineState, taskActive: active && age <= ACID_ARMOR_LAST_TASK_AGE };
}

/** Hardware BLDALPHA is one display behind SetGpuReg's source callback. */
function displayedAlpha(age: number, side: AcidArmorSide): readonly [number, number] {
  if (age < ACID_ARMOR_FIRST_TASK_AGE) return [16, 0];
  if (age > ACID_ARMOR_MONBG_LAST_AGE) return [16, 0];
  if (age === ACID_ARMOR_MONBG_LAST_AGE) return [16, 0];
  if (age <= 36) return [15, 0];
  const previous = simulate(age - 1, side);
  return [previous.data[3]!, previous.data[4]!];
}

export function acidArmorAtAge(age: number, side: AcidArmorSide): AcidArmorState {
  const opponent = side === "opponent";
  const bgX = opponent ? -144 : -40;
  const bgY = opponent ? -20 : -60;
  const source = simulate(age, side);
  // HBlank scanout observes the preceding source write. The creation display
  // uses the initializer's uniform buffers; after state 3 the BG is uniform.
  const scanout = age <= ACID_ARMOR_FIRST_TASK_AGE
    ? stationary(bgX, bgY)
    : (simulate(age - 1, side).generated ?? stationary(bgX, bgY));
  const [eva, evb] = displayedAlpha(age, side);
  const bg = opponent ? "BG1" : "BG2";
  return {
    age,
    taskActive: source.taskActive,
    taskData: source.taskActive ? source.data : [],
    monbgActive: age >= ACID_ARMOR_MONBG_FIRST_AGE && age <= ACID_ARMOR_MONBG_LAST_AGE,
    scanlineActive: age >= ACID_ARMOR_FIRST_TASK_AGE && age <= 79,
    scanlineState: age < ACID_ARMOR_FIRST_TASK_AGE ? 0 : source.scanlineState,
    scanlineSourcePhase: Math.max(0, Math.min(63, age - ACID_ARMOR_FIRST_TASK_AGE)),
    scanlines: age >= 80 ? stationary(bgX, bgY) : scanout,
    bg,
    bldcnt: age >= ACID_ARMOR_FIRST_TASK_AGE && age <= ACID_ARMOR_MONBG_LAST_AGE
      ? (bg === "BG1" ? 0x3f42 : 0x3f44)
      : 0,
    bldalpha: (evb << 8) | eva,
    bldy: 0,
    eva,
    evb,
  };
}
