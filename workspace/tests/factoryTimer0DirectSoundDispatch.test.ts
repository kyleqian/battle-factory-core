import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createFactoryTimer0Cadence,
  dispatchFactoryTimer0CadenceWithDirectSound,
  dispatchFactoryTimer0DirectSound,
  reduceFactoryFreshDirectSoundDmaGraph,
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
  it("source-reduces zero and one fresh refill graphs", () => {
    const zero = dispatchFactoryTimer0DirectSound(soundState(4, 7));
    expect(zero).toMatchObject({
      requestedChannels: [], channelDeadlineWork: [], summedChannelDeadlineWorkMasterCycles: 0,
    });
    expect(zero.freshDmaGraph).toEqual({
      timerDispatchMasterCycle: 0,
      commonRequestedDeadlineMasterCycle: 0,
      requestedDmaChannels: [],
      events: [],
      completionMasterCycle: 0,
      makespanMasterCycles: 0,
    });

    const one = dispatchFactoryTimer0DirectSound(soundState(3, 4));
    expect(one).toMatchObject({
      requestedChannels: ["A"],
      channelDeadlineWork: [{
        channel: "A",
        dmaChannel: 1,
        scheduledDeadlineAdvanceMasterCycles: 10,
      }],
      summedChannelDeadlineWorkMasterCycles: 10,
    });
    expect(one.freshDmaGraph.makespanMasterCycles).toBe(10);
    expect(one.freshDmaGraph.events.map((event) => [event.kind, event.atMasterCycle]))
      .toEqual([
        ["word", 0], ["word", 2], ["word", 4], ["word", 6], ["completion", 10],
      ]);
  });

  it("computes dual overlap from arbitration/coalescing rather than summing channel work", () => {
    const both = dispatchFactoryTimer0DirectSound(soundState(3, 0));
    expect(both.requestedChannels).toEqual(["A", "B"]);
    expect(both.channelDeadlineWork).toEqual([
      { channel: "A", dmaChannel: 1, scheduledDeadlineAdvanceMasterCycles: 10 },
      { channel: "B", dmaChannel: 2, scheduledDeadlineAdvanceMasterCycles: 10 },
    ]);
    expect(both.summedChannelDeadlineWorkMasterCycles).toBe(20);
    expect(both).not.toHaveProperty("observedIsolatedDualRefillMakespanMasterCycles");
    expect(both.freshDmaGraph.makespanMasterCycles).toBe(18);
    expect(both.freshDmaGraph.events.map((event) => event.dmaChannel))
      .toEqual([1, 1, 1, 1, 2, 1, 2, 2, 2, 2]);
    expect(both.freshDmaGraph.events.map((event) => event.atMasterCycle))
      .toEqual([0, 2, 4, 6, 8, 10, 10, 12, 14, 18]);
    expect(both.freshDmaGraph.events.slice(0, 4)
      .map((event) => event.coalescedDmaChannels)).toEqual([[2], [2], [2], [2]]);
    expect(both.freshDmaGraph.events[4]).toMatchObject({
      dmaChannel: 2, kind: "word", atMasterCycle: 8, freshDeadlineRebased: true,
    });
    expect(both.freshDmaGraph.events[5]).toMatchObject({
      dmaChannel: 1, kind: "completion", atMasterCycle: 10,
    });
  });

  it("translates a common late deadline without changing the fresh graph", () => {
    const onTime = reduceFactoryFreshDirectSoundDmaGraph({
      timerDispatchMasterCycle: 100,
      commonRequestedDeadlineMasterCycle: 100,
      dmaChannels: [1, 2],
    });
    const late = reduceFactoryFreshDirectSoundDmaGraph({
      timerDispatchMasterCycle: 100,
      commonRequestedDeadlineMasterCycle: 95,
      dmaChannels: [1, 2],
    });
    expect(onTime.makespanMasterCycles).toBe(18);
    expect(late.makespanMasterCycles).toBe(onTime.makespanMasterCycles);
    expect(late.completionMasterCycle).toBe(118);
    expect(late.events.map((event) => event.atMasterCycle))
      .toEqual(onTime.events.map((event) => event.atMasterCycle));
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
    expect(result.freshDmaGraph.makespanMasterCycles).toBe(0);
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
    expect(result.directSoundByCrossing.map((entry) => entry.freshDmaGraph.makespanMasterCycles))
      .toEqual([0, 10, 18]);
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
    expect(Object.isFrozen(result.freshDmaGraph)).toBe(true);
    expect(Object.isFrozen(result.freshDmaGraph.events)).toBe(true);
    expect(Object.isFrozen(result.freshDmaGraph.events[0])).toBe(true);
    expect(Object.isFrozen(result.freshDmaGraph.events[0]!.coalescedDmaChannels)).toBe(true);

    const graphInput = {
      timerDispatchMasterCycle: 20,
      commonRequestedDeadlineMasterCycle: 17,
      dmaChannels: [1, 2] as const,
    };
    const graphBefore = structuredClone(graphInput);
    reduceFactoryFreshDirectSoundDmaGraph(graphInput);
    expect(graphInput).toEqual(graphBefore);
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
    expect(() => reduceFactoryFreshDirectSoundDmaGraph({
      timerDispatchMasterCycle: 5,
      commonRequestedDeadlineMasterCycle: 6,
      dmaChannels: [1],
    })).toThrow(/must be due/);
    expect(() => reduceFactoryFreshDirectSoundDmaGraph({
      timerDispatchMasterCycle: 5,
      commonRequestedDeadlineMasterCycle: 5,
      dmaChannels: [2, 1],
    })).toThrow(/ordered DMA1 then DMA2/);
    expect(() => reduceFactoryFreshDirectSoundDmaGraph({
      timerDispatchMasterCycle: 5,
      commonRequestedDeadlineMasterCycle: 5,
      dmaChannels: [1, 1],
    })).toThrow(/unique/);
  });

  it("pins the exact mGBA source hashes and graph-owning anchors", () => {
    const bytes = readFileSync("tests/fixtures/mgba-timer0-scheduler-v1.json");
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe("a818b9d5380b373a5f5091e99fbc417a07858bec3ce9cc2a96c9f92cace22f00");
    const receipt = JSON.parse(bytes.toString("utf8"));
    const hashes = Object.fromEntries(receipt.source.files.map(
      (file: { path: string; sha256: string }) => [file.path, file.sha256],
    ));
    expect(hashes).toMatchObject({
      "src/core/timing.c": "f1290a60ea28cce32ef54c383397b2e2beff852dc02f8d44a69ef78ca7989d51",
      "src/gba/timer.c": "318054f31c767090b907fe2a32f65f878a702e339468c727a54c6f2b865b83f2",
      "src/gba/audio.c": "32f8067d09c80b3e77bedc16d52f16a3b4ee7ba099a6cd24e8d5cc8579729a7c",
      "src/gba/dma.c": "83f1ff180942907d274208284d3d5d9148bbcb9e60ab51302bf59933d1ccdb41",
      "src/gba/gba.c": "92b0fd214bfa563a1694921661c4413ffd96871cd6162cd762542fb5c2a2c098",
    });
    expect(receipt.source.anchors).toEqual(expect.arrayContaining([
      { id: "timing-insert", file: "src/core/timing.c", lines: "36-59" },
      { id: "timing-tick", file: "src/core/timing.c", lines: "96-117" },
      { id: "gba-process-events", file: "src/gba/gba.c", lines: "293-339" },
      { id: "timer0-registration", file: "src/gba/timer.c", lines: "66-84" },
      { id: "fifo-refill", file: "src/gba/audio.c", lines: "327-374" },
      { id: "dma-scheduling", file: "src/gba/dma.c", lines: "112-137" },
      { id: "dma-service", file: "src/gba/dma.c", lines: "185-241" },
      { id: "dma-arithmetic", file: "src/gba/dma.c", lines: "243-333" },
    ]));
  });
});
