import { describe, expect, it } from "vitest";
import {
  animationGpuRegisterWriteIsImmediate,
  copyBufferedAnimationGpuRegisters,
  createAnimationGpuRegisterState,
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
});
