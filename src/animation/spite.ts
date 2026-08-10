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
