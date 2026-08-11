import { describe, expect, it } from "vitest";
import {
  createFactoryTimer0Cadence,
  dispatchFactoryTimer0CadenceWithDirectSound,
  dispatchFactoryTimer0DirectSound,
  type FactoryDirectSoundChannel,
  type FactoryTimer0DirectSoundChannelState,
  type FactoryTimer0DirectSoundDmaState,
  type FactoryTimer0DirectSoundIsolatedDmaOwnership,
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
      nextCountWords: 0,
    },
    ...overrides,
  };
}

function soundState(a: number, b: number): FactoryTimer0DirectSoundState {
  return {
    globalAudioEnabled: true,
    isolatedDmaOwnership: {
      noPreexistingDmaWork: true,
      noCompetingDmaWork: true,
      noVideoStartedDmaWork: true,
    },
    channels: [channel("A", a), channel("B", b)],
  };
}

describe("source-derived Timer 0 Direct Sound dispatch", () => {
  it("keeps zero and one refill makespans absent", () => {
    expect(dispatchFactoryTimer0DirectSound(soundState(4, 7))).toEqual({
      requestedChannels: [],
      channelDeadlineWork: [],
      summedChannelDeadlineWorkMasterCycles: 0,
      observedIsolatedDualRefillMakespanMasterCycles: null,
    });
    expect(dispatchFactoryTimer0DirectSound(soundState(3, 4))).toEqual({
      requestedChannels: ["A"],
      channelDeadlineWork: [{
        channel: "A",
        dmaChannel: 1,
        scheduledDeadlineAdvanceMasterCycles: 10,
      }],
      summedChannelDeadlineWorkMasterCycles: 10,
      observedIsolatedDualRefillMakespanMasterCycles: null,
    });
  });

  it("separates dual channel deadline work from the observed shared-graph makespan", () => {
    const both = dispatchFactoryTimer0DirectSound(soundState(3, 0));
    expect(both.requestedChannels).toEqual(["A", "B"]);
    expect(both.channelDeadlineWork).toEqual([
      { channel: "A", dmaChannel: 1, scheduledDeadlineAdvanceMasterCycles: 10 },
      { channel: "B", dmaChannel: 2, scheduledDeadlineAdvanceMasterCycles: 10 },
    ]);
    expect(both.summedChannelDeadlineWorkMasterCycles).toBe(20);
    expect(both.observedIsolatedDualRefillMakespanMasterCycles).toBe(18);
    expect(both).not.toHaveProperty("services");
    expect(both).not.toHaveProperty("isolatedFreshServiceProgressionMasterCycles");
  });

  it("uses the exact at-most-three queued-word threshold", () => {
    expect(dispatchFactoryTimer0DirectSound(soundState(3, 4)).requestedChannels).toEqual(["A"]);
    expect(dispatchFactoryTimer0DirectSound(soundState(4, 3)).requestedChannels).toEqual(["B"]);
  });

  it("honors the global audio-enable gate before sampling either FIFO", () => {
    const result = dispatchFactoryTimer0DirectSound({
      ...soundState(0, 0),
      globalAudioEnabled: false,
    });
    expect(result.requestedChannels).toEqual([]);
    expect(result.channelDeadlineWork).toEqual([]);
    expect(result.summedChannelDeadlineWorkMasterCycles).toBe(0);
    expect(result.observedIsolatedDualRefillMakespanMasterCycles).toBeNull();
  });

  it("requires routing, a DMA source, custom eligibility, and enablement", () => {
    const cases: FactoryTimer0DirectSoundChannelState[] = [
      channel("A", 0, { routedTimer: 1 }),
      channel("A", 0, { outputEnabled: false }),
      channel("A", 0, { dmaSource: 0, dma: null }),
      channel("A", 0, { dma: { ...channel("A", 0).dma!, enabled: false } }),
    ];
    for (const a of cases) {
      const state: FactoryTimer0DirectSoundState = {
        ...soundState(0, 7),
        channels: [a, channel("B", 7)],
      };
      expect(dispatchFactoryTimer0DirectSound(state)
        .requestedChannels).toEqual([]);
    }
  });

  it("requires zero pending next-count work for both DMA channels before Timer 0", () => {
    const a = channel("A", 0);
    const b = channel("B", 7);
    const pendingA: FactoryTimer0DirectSoundState = {
      ...soundState(0, 7),
      channels: [{ ...a, dma: { ...a.dma!, nextCountWords: 1 } }, b],
    };
    const pendingB: FactoryTimer0DirectSoundState = {
      ...soundState(0, 7),
      channels: [a, { ...b, dma: { ...b.dma!, nextCountWords: 1 } }],
    };
    for (const state of [pendingA, pendingB]) {
      expect(() => dispatchFactoryTimer0DirectSound(state))
        .toThrow(/pending nextCountWords.*fresh zero-work DMA/);
    }
  });

  it("rejects preexisting, competing, and Video-started DMA ownership", () => {
    const state = soundState(0, 0);
    const ownerships = [
      { ...state.isolatedDmaOwnership, noPreexistingDmaWork: false },
      { ...state.isolatedDmaOwnership, noCompetingDmaWork: false },
      { ...state.isolatedDmaOwnership, noVideoStartedDmaWork: false },
    ];
    for (const ownership of ownerships) {
      const isolatedDmaOwnership = ownership as unknown as FactoryTimer0DirectSoundIsolatedDmaOwnership;
      expect(() => dispatchFactoryTimer0DirectSound({ ...state, isolatedDmaOwnership }))
        .toThrow(/explicit isolated DMA ownership/);
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
    expect(result.directSoundByCrossing.map((entry) => entry.summedChannelDeadlineWorkMasterCycles))
      .toEqual([0, 10, 20]);
    expect(result.directSoundByCrossing.map((entry) => entry.observedIsolatedDualRefillMakespanMasterCycles))
      .toEqual([null, null, 18]);
  });

  it("does not mutate inputs and freezes returned collections", () => {
    const state = soundState(0, 0);
    const before = structuredClone(state);
    const result = dispatchFactoryTimer0DirectSound(state);
    expect(state).toEqual(before);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.requestedChannels)).toBe(true);
    expect(Object.isFrozen(result.channelDeadlineWork)).toBe(true);
    expect(Object.isFrozen(result.channelDeadlineWork[0])).toBe(true);
  });

  it("fails loudly for state-list length and unmodeled mappings, modes, regions, and counts", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    expect(() => dispatchFactoryTimer0CadenceWithDirectSound(cadence, 1_400, [soundState(0, 0)]))
      .toThrow(/crossed 2 periods.*received 1/);
    const reversed: FactoryTimer0DirectSoundState = {
      ...soundState(0, 0),
      channels: [channel("B", 0), channel("A", 0)],
    };
    expect(() => dispatchFactoryTimer0DirectSound(reversed))
      .toThrow(/A then B/);
    const badMapping: FactoryTimer0DirectSoundState = {
      ...soundState(0, 0),
      channels: [channel("A", 0, { dmaSource: 2 }), channel("B", 0)],
    };
    expect(() => dispatchFactoryTimer0DirectSound(badMapping)).toThrow(/map to DMA1/);
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
      const invalidState: FactoryTimer0DirectSoundState = {
        ...soundState(0, 7),
        channels: [{ ...a, dma: invalidDma }, channel("B", 7)],
      };
      expect(() => dispatchFactoryTimer0DirectSound(invalidState)).toThrow(/unmodeled|expected 4/);
    }
    expect(() => dispatchFactoryTimer0DirectSound(soundState(8, 0))).toThrow(/\[0, 7\]/);
  });
});
