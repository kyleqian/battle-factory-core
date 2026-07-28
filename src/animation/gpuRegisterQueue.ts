/**
 * Source-faithful presentation model for pokeemerald's buffered GPU writes.
 *
 * `SetGpuReg` always updates its software buffer. During VBlank scanlines
 * 161..225 (inclusive), or forced blank, it also writes hardware immediately.
 * At every other VCOUNT it queues the register offset exactly once.
 * `CopyBufferedValuesToGpuRegs` drains that queue during VBlank and copies
 * each register's latest buffered value.
 *
 * Source: `src/gpu_regs.c:12-97` and `src/main.c:337-369`.
 */

export const GPU_REGISTER_BUFFER_SIZE = 0x60;
export const GPU_REGISTER_VBLANK_FIRST_SCANLINE = 161;
export const GPU_REGISTER_VBLANK_LAST_SCANLINE = 225;

export interface AnimationGpuRegisterState {
  readonly buffered: Readonly<Record<number, number>>;
  readonly hardware: Readonly<Record<number, number>>;
  readonly waitingOffsets: readonly number[];
}

export interface AnimationGpuRegisterWriteContext {
  readonly vcount: number;
  readonly forcedBlank?: boolean;
}

export interface AnimationGpuRegisterWrite {
  readonly offset: number;
  readonly value: number;
}

/**
 * CPU work executed between two consecutive displayed framebuffer samples.
 *
 * The caller supplies source execution order because this interval wraps
 * across VBlank: scanlines 161..227 precede scanlines 0..160. This keeps the
 * register model independent of any move, animation age, input delay, or
 * absolute frame while retaining the VCOUNT that determines SetGpuReg's
 * immediate-vs-queued behavior.
 */
export type AnimationCpuWorkloadStep =
  | Readonly<{
    readonly kind: "copy-buffered-registers";
    readonly vcount: number;
  }>
  | Readonly<{
    readonly kind: "run-tasks";
    readonly vcount: number;
    readonly gpuWrites: readonly AnimationGpuRegisterWrite[];
  }>;

export interface AnimationDisplayIntervalWorkload {
  readonly steps: readonly AnimationCpuWorkloadStep[];
}

export function createAnimationGpuRegisterState(
  hardware: Readonly<Record<number, number>> = {},
): AnimationGpuRegisterState {
  return {
    buffered: { ...hardware },
    hardware: { ...hardware },
    waitingOffsets: [],
  };
}

function assertRegisterOffset(offset: number): void {
  if (!Number.isInteger(offset) || offset < 0 || offset >= GPU_REGISTER_BUFFER_SIZE) {
    throw new RangeError(`GPU register offset must be an integer in 0..95, got ${offset}`);
  }
}

function u16(value: number): number {
  return value & 0xffff;
}

export function animationGpuRegisterWriteIsImmediate(
  context: AnimationGpuRegisterWriteContext,
): boolean {
  return context.forcedBlank === true
    || (
      context.vcount >= GPU_REGISTER_VBLANK_FIRST_SCANLINE
      && context.vcount <= GPU_REGISTER_VBLANK_LAST_SCANLINE
    );
}

export function setAnimationGpuRegister(
  state: AnimationGpuRegisterState,
  offset: number,
  value: number,
  context: AnimationGpuRegisterWriteContext,
): AnimationGpuRegisterState {
  assertRegisterOffset(offset);
  const buffered = { ...state.buffered, [offset]: u16(value) };
  if (animationGpuRegisterWriteIsImmediate(context)) {
    return {
      buffered,
      hardware: { ...state.hardware, [offset]: u16(value) },
      // Source leaves a pre-existing waiting-list entry in place. Its later
      // VBlank copy is harmless because it reads this same latest buffer.
      waitingOffsets: state.waitingOffsets,
    };
  }
  return {
    buffered,
    hardware: state.hardware,
    waitingOffsets: state.waitingOffsets.includes(offset)
      ? state.waitingOffsets
      : [...state.waitingOffsets, offset],
  };
}

export function copyBufferedAnimationGpuRegisters(
  state: AnimationGpuRegisterState,
): AnimationGpuRegisterState {
  if (state.waitingOffsets.length === 0) return state;
  const hardware: Record<number, number> = { ...state.hardware };
  for (const offset of state.waitingOffsets) {
    hardware[offset] = state.buffered[offset] ?? 0;
  }
  return {
    buffered: state.buffered,
    hardware,
    waitingOffsets: [],
  };
}

/**
 * Applies only the source GPU-register effects of CPU work between display
 * samples. Task callbacks and battle logic remain owned by their reducers;
 * this narrow scheduler decides when their already-derived writes reach
 * hardware.
 */
export function applyAnimationDisplayIntervalWorkload(
  state: AnimationGpuRegisterState,
  workload: AnimationDisplayIntervalWorkload,
): AnimationGpuRegisterState {
  let next = state;
  for (const step of workload.steps) {
    if (!Number.isInteger(step.vcount) || step.vcount < 0 || step.vcount > 227) {
      throw new RangeError(`VCOUNT must be an integer in 0..227, got ${step.vcount}`);
    }
    if (step.kind === "copy-buffered-registers") {
      next = copyBufferedAnimationGpuRegisters(next);
      continue;
    }
    for (const write of step.gpuWrites) {
      next = setAnimationGpuRegister(next, write.offset, write.value, {
        vcount: step.vcount,
      });
    }
  }
  return next;
}
