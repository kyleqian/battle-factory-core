import { describe, expect, it } from "vitest";
import {
  applyAnimationDisplayIntervalWorkload,
  animationCgbCounterAtVblank,
  animationPcmDmaCounterAtVblank,
  animationGpuRegisterWriteIsImmediate,
  copyBufferedAnimationGpuRegisters,
  createAnimationGpuRegisterState,
  produceAnimationDisplayIntervalWorkload,
  setAnimationGpuRegister,
} from "../../src/animation/gpuRegisterQueue.ts";

const BLDALPHA = 0x52;

describe("pokeemerald buffered animation GPU-register presentation", () => {
  it("queues a visible-scanline write until the VBlank transfer", () => {
    const initial = createAnimationGpuRegisterState({ [BLDALPHA]: 0x0e02 });
    const written = setAnimationGpuRegister(initial, BLDALPHA, 0x0d03, {
      vcount: 3,
    });
    expect(written).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0e02 },
      waitingOffsets: [BLDALPHA],
    });

    expect(copyBufferedAnimationGpuRegisters(written)).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0d03 },
      waitingOffsets: [],
    });
  });

  it("makes the same write immediately visible during source VBlank scanlines", () => {
    const initial = createAnimationGpuRegisterState({ [BLDALPHA]: 0x0e02 });
    const written = setAnimationGpuRegister(initial, BLDALPHA, 0x0d03, {
      vcount: 224,
    });
    expect(written).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0d03 },
      waitingOffsets: [],
    });
    expect(animationGpuRegisterWriteIsImmediate({ vcount: 160 })).toBe(false);
    expect(animationGpuRegisterWriteIsImmediate({ vcount: 161 })).toBe(true);
    expect(animationGpuRegisterWriteIsImmediate({ vcount: 225 })).toBe(true);
    expect(animationGpuRegisterWriteIsImmediate({ vcount: 226 })).toBe(false);
  });

  it("deduplicates queued offsets while transferring their latest buffered value", () => {
    const initial = createAnimationGpuRegisterState({ [BLDALPHA]: 0x0f01 });
    const first = setAnimationGpuRegister(initial, BLDALPHA, 0x0e02, { vcount: 2 });
    const second = setAnimationGpuRegister(first, BLDALPHA, 0x0d03, { vcount: 10 });
    expect(second.waitingOffsets).toEqual([BLDALPHA]);
    expect(second.hardware[BLDALPHA]).toBe(0x0f01);
    expect(copyBufferedAnimationGpuRegisters(second).hardware[BLDALPHA]).toBe(0x0d03);
  });

  it("writes immediately under forced blank without discarding an older queue entry", () => {
    const initial = createAnimationGpuRegisterState({ [BLDALPHA]: 0x0f01 });
    const queued = setAnimationGpuRegister(initial, BLDALPHA, 0x0e02, { vcount: 20 });
    const immediate = setAnimationGpuRegister(queued, BLDALPHA, 0x0d03, {
      vcount: 20,
      forcedBlank: true,
    });
    expect(immediate.hardware[BLDALPHA]).toBe(0x0d03);
    expect(immediate.waitingOffsets).toEqual([BLDALPHA]);
    expect(copyBufferedAnimationGpuRegisters(immediate)).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0d03 },
      waitingOffsets: [],
    });
  });

  it("distinguishes source-identical task writes by their VCOUNT schedule", () => {
    const beforeDisplayInterval = createAnimationGpuRegisterState({
      [BLDALPHA]: 0x0e02,
    });
    const transfer = {
      kind: "copy-buffered-registers",
      vcount: 166,
    } as const;
    const write = {
      offset: BLDALPHA,
      value: 0x0d03,
    } as const;

    const canonical = applyAnimationDisplayIntervalWorkload(
      beforeDisplayInterval,
      {
        steps: [
          transfer,
          { kind: "run-tasks", vcount: 3, gpuWrites: [write] },
        ],
      },
    );
    expect(canonical).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0e02 },
      waitingOffsets: [BLDALPHA],
    });

    const vblankOverrun = applyAnimationDisplayIntervalWorkload(
      beforeDisplayInterval,
      {
        steps: [
          transfer,
          { kind: "run-tasks", vcount: 224, gpuWrites: [write] },
        ],
      },
    );
    expect(vblankOverrun).toEqual({
      buffered: { [BLDALPHA]: 0x0d03 },
      hardware: { [BLDALPHA]: 0x0d03 },
      waitingOffsets: [],
    });
  });

  it("advances and reloads m4a's periodic PCM DMA counter", () => {
    const schedule = {
      counterAtAnchor: 7,
      period: 7,
      cgbCounterAtAnchor: 8,
      cgbPeriod: 15,
      mixerOverrunCgbPhases: [3],
    };
    expect(
      Array.from(
        { length: 9 },
        (_, vblanks) => animationPcmDmaCounterAtVblank(schedule, vblanks),
      ),
    ).toEqual([7, 6, 5, 4, 3, 2, 1, 7, 6]);
    expect(
      Array.from(
        { length: 10 },
        (_, vblanks) => animationCgbCounterAtVblank(schedule, vblanks),
      ),
    ).toEqual([8, 7, 6, 5, 4, 3, 2, 1, 0, 14]);
  });

  it("produces ordinary and PCM-refill RunTasks workloads from the audio clock", () => {
    const common = {
      pcmDma: {
        counterAtAnchor: 1,
        period: 7,
        cgbCounterAtAnchor: 3,
        cgbPeriod: 15,
        mixerOverrunCgbPhases: [3],
      },
      gpuWrites: [{ offset: BLDALPHA, value: 0x0d03 }],
    } as const;
    expect(produceAnimationDisplayIntervalWorkload({
      ...common,
      vblanksSinceAudioAnchor: 4,
    })).toEqual({
      steps: [
        { kind: "copy-buffered-registers", vcount: 166 },
        {
          kind: "run-tasks",
          vcount: 3,
          gpuWrites: common.gpuWrites,
        },
      ],
    });
    expect(produceAnimationDisplayIntervalWorkload({
      ...common,
      vblanksSinceAudioAnchor: 0,
    })).toEqual({
      steps: [
        { kind: "copy-buffered-registers", vcount: 166 },
        {
          kind: "run-tasks",
          vcount: 224,
          gpuWrites: common.gpuWrites,
        },
      ],
    });
  });

  it("rejects impossible VCOUNT scheduling input", () => {
    expect(() => applyAnimationDisplayIntervalWorkload(
      createAnimationGpuRegisterState(),
      {
        steps: [{ kind: "run-tasks", vcount: 228, gpuWrites: [] }],
      },
    )).toThrow("VCOUNT must be an integer in 0..227");
  });
});
