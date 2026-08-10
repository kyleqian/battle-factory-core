import { GBA_SINE_TABLE_256 } from "../engine/battleMenu.ts";

/**
 * Source-relative timing for Move_SPITE's AnimTask_SpiteTargetShadow.
 *
 * The task is called synchronously when the visual task is created.  Its
 * first five passes allocate the clone, copy/blend its palette, initialise
 * the scanline wave, install alpha, and re-enable the copied BG.  The next
 * 128 passes are the source's `data[1] = 1..128` pulse.  At data[1] == 128
 * the task enters its three-pass teardown synchronously, so the first
 * teardown pass shares the final pulse age.
 */
export const SPITE_PULSE_FIRST_AGE = 5;
export const SPITE_PULSE_LAST_AGE = 132;
export const SPITE_TEARDOWN_FIRST_AGE = 132;
export const SPITE_CLEANUP_AGE = 134;
export const SPITE_BODY_FRAME_COUNT = SPITE_CLEANUP_AGE + 1;

/** Pointer-age alignment measured from the bilateral dense receipts. */
export const SPITE_TASK_SOURCE_AGE_OFFSET = 42;
export const SPITE_CLONE_BLANK_POINTER_AGE = 43;
export const SPITE_WAVE_FIRST_POINTER_AGE = 50;
export const SPITE_WAVE_LAST_POINTER_AGE = 173;

const SPITE_FADE_BLDY: readonly number[] = [
  0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 16, 16, 16, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3,
  2, 1, 0,
];

/** Hardware BLDY seen by the source-relative compositor. */
export function spiteBackgroundBldy(pointerAge: number): number {
  return SPITE_FADE_BLDY[pointerAge]
    ?? SPITE_FADE_BLDY[pointerAge - 176]
    ?? 0;
}

export function spiteBackgroundIsGhost(pointerAge: number): boolean {
  return pointerAge >= 19 && pointerAge <= 194;
}

/**
 * `blend_color_cycle delay=2, num_blends=6, 0<->8`, including its measured
 * OBJ transfer.  The first leg's first visible step is pointer age 48; each
 * later leg has the source loop's extra two-display handoff.
 */
export function spiteAttackerPaletteTint(pointerAge: number): number {
  const starts = [48, 70, 92, 114, 136, 158] as const;
  let value = 0;
  for (let leg = 0; leg < starts.length; leg++) {
    const local = pointerAge - starts[leg]!;
    if (local < 0) break;
    const step = Math.min(4, Math.floor(local / 4) + 1) * 2;
    value = leg % 2 === 0 ? step : 8 - step;
  }
  return value;
}

/**
 * Whole-display BLDALPHA approximation from Spite's own map. The remaining
 * alternating write/scanout split is deliberately tracked as partial evidence.
 */
export function spiteDisplayedAlpha(pointerAge: number): Readonly<{ eva: number; evb: number }> {
  if (pointerAge >= SPITE_WAVE_FIRST_POINTER_AGE
      && pointerAge <= SPITE_WAVE_LAST_POINTER_AGE) {
    const sourceAge = 7 + 2 * Math.floor(
      (pointerAge - SPITE_WAVE_FIRST_POINTER_AGE) / 2,
    );
    return spiteAtAge(sourceAge).alpha;
  }
  return spiteAtAge(pointerAge - SPITE_TASK_SOURCE_AGE_OFFSET - 1).alpha;
}

/** Source wave phase that has reached scanout for this pointer age. */
export function spiteWaveShift(pointerAge: number, screenY: number, startLine: number): number {
  if (pointerAge < SPITE_WAVE_FIRST_POINTER_AGE
      || pointerAge > SPITE_WAVE_LAST_POINTER_AGE
      || screenY < startLine || screenY >= startLine + 64) return 0;
  const phase = pointerAge - 46 + (screenY - startLine);
  return Math.trunc(GBA_SINE_TABLE_256[(phase * 2) & 0xff]! * 6 / 256);
}

export type SpiteTaskPhase =
  | "clone"
  | "palette"
  | "scanline"
  | "blend"
  | "enable-bg"
  | "pulse"
  | "teardown-hide-bg"
  | "teardown-restore-palette"
  | "cleanup"
  | "inactive";

export interface SpiteState {
  readonly sourceAge: number;
  readonly active: boolean;
  readonly taskActive: boolean;
  readonly phase: SpiteTaskPhase;
  /** Source task data[1], or null before the pulse task begins. */
  readonly pulseIndex: number | null;
  /** BLDALPHA eva/evb written by the source task. */
  readonly alpha: Readonly<{ eva: number; evb: number }>;
  /** Source `gScanlineEffect.state` / BG-enable lifecycle. */
  readonly scanlineActive: boolean;
  readonly copiedBgEnabled: boolean;
  readonly cloneActive: boolean;
  readonly targetVisible: boolean;
  /** `BlendPalette(..., RGB(13, 0, 15))` on the target palette bank. */
  readonly targetPaletteTint: number;
}

function cDivide(value: number, divisor: number): number {
  // C integer division truncates toward zero; Math.floor is wrong for the
  // negative half of gSineTable.
  return Math.trunc(value / divisor);
}

function pulseAlpha(pulseIndex: number): Readonly<{ eva: number; evb: number }> {
  // data[2] and data[3] are independently retained on alternating passes.
  // The first odd pass sees data[2] = 0 and data[3] = 16 from setup.
  let eva = 0;
  let evb = 16;
  if (pulseIndex % 2 === 0) {
    eva = cDivide(GBA_SINE_TABLE_256[pulseIndex & 0xff]!, 18);
    if (pulseIndex > 1) {
      evb = 16 - cDivide(GBA_SINE_TABLE_256[(pulseIndex - 1) & 0xff]!, 18);
    }
  } else {
    evb = 16 - cDivide(GBA_SINE_TABLE_256[pulseIndex & 0xff]!, 18);
    // Recover the preceding even write, as the source task retains data[2].
    if (pulseIndex > 1) {
      eva = cDivide(GBA_SINE_TABLE_256[(pulseIndex - 1) & 0xff]!, 18);
    }
  }
  return Object.freeze({ eva, evb });
}

/** Pure source-age reducer for the task body; age zero is task creation. */
export function spiteAtAge(sourceAge: number): SpiteState {
  const active = sourceAge >= 0 && sourceAge < SPITE_BODY_FRAME_COUNT;
  if (sourceAge < 0) {
    return {
      sourceAge,
      active: false,
      taskActive: false,
      phase: "inactive",
      pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 0 }),
      scanlineActive: false,
      copiedBgEnabled: false,
      cloneActive: false,
      targetVisible: true,
      targetPaletteTint: 0,
    };
  }
  if (sourceAge === 0) {
    return {
      sourceAge, active, taskActive: true, phase: "clone", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 0 }), scanlineActive: false,
      copiedBgEnabled: false, cloneActive: true, targetVisible: true,
      targetPaletteTint: 0,
    };
  }
  if (sourceAge === 1) {
    return {
      sourceAge, active, taskActive: true, phase: "palette", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 0 }), scanlineActive: false,
      copiedBgEnabled: false, cloneActive: true, targetVisible: true,
      targetPaletteTint: 10,
    };
  }
  if (sourceAge === 2) {
    return {
      sourceAge, active, taskActive: true, phase: "scanline", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 0 }), scanlineActive: true,
      copiedBgEnabled: false, cloneActive: true, targetVisible: true,
      targetPaletteTint: 10,
    };
  }
  if (sourceAge === 3) {
    return {
      sourceAge, active, taskActive: true, phase: "blend", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 16 }), scanlineActive: true,
      copiedBgEnabled: false, cloneActive: true, targetVisible: true,
      targetPaletteTint: 10,
    };
  }
  if (sourceAge === 4) {
    return {
      sourceAge, active, taskActive: true, phase: "enable-bg", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 16 }), scanlineActive: true,
      copiedBgEnabled: true, cloneActive: true, targetVisible: true,
      targetPaletteTint: 10,
    };
  }
  if (sourceAge <= SPITE_PULSE_LAST_AGE) {
    const pulseIndex = sourceAge - SPITE_PULSE_FIRST_AGE + 1;
    return {
      sourceAge, active, taskActive: true,
      phase: sourceAge === SPITE_TEARDOWN_FIRST_AGE
        ? "teardown-hide-bg" : "pulse",
      pulseIndex,
      alpha: pulseAlpha(pulseIndex), scanlineActive: true,
      copiedBgEnabled: sourceAge < SPITE_TEARDOWN_FIRST_AGE,
      cloneActive: true, targetVisible: true, targetPaletteTint: 10,
    };
  }
  if (sourceAge === SPITE_CLEANUP_AGE - 1) {
    return {
      sourceAge, active, taskActive: true, phase: "teardown-restore-palette",
      pulseIndex: null, alpha: Object.freeze({ eva: 0, evb: 16 }),
      scanlineActive: false, copiedBgEnabled: false, cloneActive: true,
      targetVisible: true, targetPaletteTint: 0,
    };
  }
  if (sourceAge === SPITE_CLEANUP_AGE) {
    return {
      sourceAge, active, taskActive: true, phase: "cleanup", pulseIndex: null,
      alpha: Object.freeze({ eva: 0, evb: 0 }), scanlineActive: false,
      copiedBgEnabled: true, cloneActive: false, targetVisible: false,
      targetPaletteTint: 0,
    };
  }
  return {
    sourceAge, active: false, taskActive: false, phase: "inactive",
    pulseIndex: null, alpha: Object.freeze({ eva: 0, evb: 0 }),
    scanlineActive: false, copiedBgEnabled: true, cloneActive: false,
    targetVisible: true, targetPaletteTint: 0,
  };
}
