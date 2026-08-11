import { describe, expect, it } from "vitest";
import {
  createFactoryTimer0Cadence,
  dispatchFactoryTimer0CadenceWithDirectSound,
  dispatchFactoryTimer0DirectSound,
  type FactoryDirectSoundChannel,
  type FactoryTimer0DirectSoundChannelState,
  type FactoryTimer0DirectSoundDmaState,
  type FactoryTimer0DirectSoundState,
} from "../src/engine/factoryConstructionClock.ts";

function channel(
  name: FactoryDirectSoundChannel,
  queuedWords: number,
  overrides: Partial<FactoryTimer0DirectSoundChannelState> = {},
): FactoryTimer0DirectSoundChannelState {
  const dmaChannel = name === "A" ? 1 : 2;
  return {
    channel: name,
    queuedWords,
    routedTimer: 0,
    outputEnabled: true,
    dmaSource: dmaChannel,
    dma: {
      channel: dmaChannel,
      enabled: true,
      timing: "custom",
      sourceRegion: "iwram",
      destination: name === "A" ? "fifo-a" : "fifo-b",
      sourceControl: "increment",
      destinationControl: "fixed",
      transferWidthBits: 32,
      countWords: 4,
    },
    ...overrides,
  };
}

function soundState(a: number, b: number): FactoryTimer0DirectSoundState {
  return { channels: [channel("A", a), channel("B", b)] };
}

describe("source-derived Timer 0 Direct Sound dispatch", () => {
  it("requests zero, one, or two fresh refills with 0/10/20 progression", () => {
    expect(dispatchFactoryTimer0DirectSound(soundState(4, 7))).toMatchObject({
      requestedChannels: [],
      scheduledServiceProgressionMasterCycles: [0],
      scheduledServiceMasterCycles: 0,
    });
    expect(dispatchFactoryTimer0DirectSound(soundState(3, 4))).toMatchObject({
      requestedChannels: ["A"],
      scheduledServiceProgressionMasterCycles: [0, 10],
      scheduledServiceMasterCycles: 10,
    });
    const both = dispatchFactoryTimer0DirectSound(soundState(3, 0));
    expect(both.requestedChannels).toEqual(["A", "B"]);
    expect(both.scheduledServiceProgressionMasterCycles).toEqual([0, 10, 20]);
    expect(both.services).toEqual([
      { channel: "A", dmaChannel: 1, startMasterCycle: 0, completionMasterCycle: 10 },
      { channel: "B", dmaChannel: 2, startMasterCycle: 10, completionMasterCycle: 20 },
    ]);
  });

  it("uses the exact at-most-three queued-word threshold", () => {
    expect(dispatchFactoryTimer0DirectSound(soundState(3, 4)).requestedChannels).toEqual(["A"]);
    expect(dispatchFactoryTimer0DirectSound(soundState(4, 3)).requestedChannels).toEqual(["B"]);
  });

  it("requires routing, a DMA source, custom eligibility, and enablement", () => {
    const cases: FactoryTimer0DirectSoundChannelState[] = [
      channel("A", 0, { routedTimer: 1 }),
      channel("A", 0, { outputEnabled: false }),
      channel("A", 0, { dmaSource: 0, dma: null }),
      channel("A", 0, { dma: { ...channel("A", 0).dma!, enabled: false } }),
    ];
    for (const a of cases) {
      expect(dispatchFactoryTimer0DirectSound({ channels: [a, channel("B", 7)] })
        .requestedChannels).toEqual([]);
    }
  });

  it("composes explicit state per crossed period and preserves cadence phase", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    const result = dispatchFactoryTimer0CadenceWithDirectSound(cadence, 2_700, [
      soundState(4, 4),
      soundState(3, 4),
      soundState(0, 0),
    ]);
    expect(result.crossedDueMasterCycles).toEqual([100, 1_354, 2_608]);
    expect(result.cadence.nextDueMasterCycle).toBe(3_862);
    expect(result.cadence.serviceCostMasterCycles).toBeNull();
    expect(result.directSoundByCrossing.map((entry) => entry.scheduledServiceMasterCycles))
      .toEqual([0, 10, 20]);
  });

  it("does not mutate inputs and freezes returned collections", () => {
    const state = soundState(0, 0);
    const before = structuredClone(state);
    const result = dispatchFactoryTimer0DirectSound(state);
    expect(state).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requestedChannels)).toBe(true);
    expect(Object.isFrozen(result.services)).toBe(true);
    expect(Object.isFrozen(result.services[0])).toBe(true);
    expect(Object.isFrozen(result.scheduledServiceProgressionMasterCycles)).toBe(true);
  });

  it("fails loudly for state-list length and unmodeled mappings, modes, regions, and counts", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    expect(() => dispatchFactoryTimer0CadenceWithDirectSound(cadence, 1_400, [soundState(0, 0)]))
      .toThrow(/crossed 2 periods.*received 1/);
    expect(() => dispatchFactoryTimer0DirectSound({ channels: [channel("B", 0), channel("A", 0)] }))
      .toThrow(/A then B/);
    expect(() => dispatchFactoryTimer0DirectSound({
      channels: [channel("A", 0, { dmaSource: 2 }), channel("B", 0)],
    })).toThrow(/map to DMA1/);
    for (const dmaPatch of [
      { timing: "now" },
      { sourceRegion: "ewram" },
      { transferWidthBits: 16 },
      { countWords: 3 },
    ]) {
      const a = channel("A", 0);
      const invalidDma = {
        ...a.dma!,
        ...dmaPatch,
      } as unknown as FactoryTimer0DirectSoundDmaState;
      expect(() => dispatchFactoryTimer0DirectSound({
        channels: [{ ...a, dma: invalidDma }, channel("B", 7)],
      })).toThrow(/unmodeled|expected 4/);
    }
    expect(() => dispatchFactoryTimer0DirectSound(soundState(8, 0))).toThrow(/\[0, 7\]/);
  });
});
