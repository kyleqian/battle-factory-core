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

export interface AnimationPcmDmaSchedule {
  /** Source `gSoundInfo.pcmDmaCounter` at the scheduler anchor. */
  readonly counterAtAnchor: number;
  /** Source `gSoundInfo.pcmDmaPeriod`. */
  readonly period: number;
  /** Source `gSoundInfo.c15` at the same anchor. */
  readonly cgbCounterAtAnchor: number;
  /** CgbSound's fixed 15-state countdown. */
  readonly cgbPeriod: number;
  /**
   * Audio phases whose active-channel mix reaches the measured VBlank
   * overrun. This is soundtrack workload, independent of battle callbacks.
   */
  readonly mixerOverrunCgbPhases: readonly number[];
}

export interface AnimationSourceWorkloadInput {
  /** Number of VBlanks advanced by the audio scheduler since its anchor. */
  readonly vblanksSinceAudioAnchor: number;
  readonly pcmDma: AnimationPcmDmaSchedule;
  readonly gpuWrites: readonly AnimationGpuRegisterWrite[];
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

/**
 * Advances m4a's periodic PCM DMA counter without knowing any battle clock.
 * `m4aSoundVSync` decrements it once per VBlank and reloads `pcmDmaPeriod`
 * when it reaches zero.
 *
 * Source: `src/m4a_1.s:1071-1090`.
 */
export function animationPcmDmaCounterAtVblank(
  schedule: AnimationPcmDmaSchedule,
  vblanksSinceAnchor: number,
): number {
  if (
    !Number.isInteger(schedule.period)
    || schedule.period <= 0
    || !Number.isInteger(schedule.counterAtAnchor)
    || schedule.counterAtAnchor < 1
    || schedule.counterAtAnchor > schedule.period
  ) {
    throw new RangeError("PCM DMA schedule requires 1 <= counterAtAnchor <= period");
  }
  if (!Number.isInteger(vblanksSinceAnchor) || vblanksSinceAnchor < 0) {
    throw new RangeError("PCM DMA VBlank count must be a nonnegative integer");
  }
  return 1 + positiveModulo(
    schedule.counterAtAnchor - 1 - vblanksSinceAnchor,
    schedule.period,
  );
}

export function animationCgbCounterAtVblank(
  schedule: AnimationPcmDmaSchedule,
  vblanksSinceAnchor: number,
): number {
  if (
    !Number.isInteger(schedule.cgbPeriod)
    || schedule.cgbPeriod <= 0
    || !Number.isInteger(schedule.cgbCounterAtAnchor)
    || schedule.cgbCounterAtAnchor < 0
    || schedule.cgbCounterAtAnchor >= schedule.cgbPeriod
  ) {
    throw new RangeError("CGB schedule requires 0 <= counterAtAnchor < period");
  }
  if (!Number.isInteger(vblanksSinceAnchor) || vblanksSinceAnchor < 0) {
    throw new RangeError("CGB VBlank count must be a nonnegative integer");
  }
  return positiveModulo(
    schedule.cgbCounterAtAnchor - vblanksSinceAnchor,
    schedule.cgbPeriod,
  );
}

/**
 * Produces the source-ordered work between displayed samples.
 *
 * The stock Scene-ON audio configuration has no SoundMain scanline cap
 * (`maxLines=0`). When its PCM reload and active-channel CGB workload phases
 * coincide, the mixer consumes the remaining blanking interval and
 * `CB2_BattleMain` resumes at VCOUNT 224; ordinary intervals resume after
 * `WaitForVBlank` at VCOUNT 3. These are component workload receipts, not
 * animation or controller boundaries.
 *
 * Sources: `src/main.c:337-369`, `src/m4a_1.s:35-76,1071-1090`, and
 * `src/battle_main.c:2247-2267`.
 */
export function produceAnimationDisplayIntervalWorkload(
  input: AnimationSourceWorkloadInput,
): AnimationDisplayIntervalWorkload {
  const pcmCounter = animationPcmDmaCounterAtVblank(
    input.pcmDma,
    input.vblanksSinceAudioAnchor,
  );
  const cgbCounter = animationCgbCounterAtVblank(
    input.pcmDma,
    input.vblanksSinceAudioAnchor,
  );
  const audioMixerOverruns =
    pcmCounter === 1
    && input.pcmDma.mixerOverrunCgbPhases.includes(cgbCounter);
  return {
    steps: [
      { kind: "copy-buffered-registers", vcount: 166 },
      {
        kind: "run-tasks",
        vcount: audioMixerOverruns ? 224 : 3,
        gpuWrites: input.gpuWrites,
      },
    ],
  };
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
