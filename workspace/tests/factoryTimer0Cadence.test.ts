import { describe, expect, it } from "vitest";
import {
  createFactoryTimer0Cadence,
  disableFactoryTimer0Cadence,
  dispatchFactoryTimer0Cadence,
  enableFactoryTimer0Cadence,
  FACTORY_TIMER0_DEFAULT_CONTROL,
  FACTORY_TIMER0_DEFAULT_PERIOD_MASTER_CYCLES,
  FACTORY_TIMER0_DEFAULT_PRESCALE_BITS,
  FACTORY_TIMER0_DEFAULT_RELOAD,
  FACTORY_TIMER0_SERVICE_COST_MASTER_CYCLES,
  reloadFactoryTimer0Cadence,
} from "../src/engine/factoryConstructionClock.ts";

describe("source-derived Factory Timer 0 cadence", () => {
  it("initializes with source constants and no implicit phase seed", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: null });
    expect(cadence).toEqual({
      enabled: true,
      reload: FACTORY_TIMER0_DEFAULT_RELOAD,
      prescaleBits: FACTORY_TIMER0_DEFAULT_PRESCALE_BITS,
      periodMasterCycles: FACTORY_TIMER0_DEFAULT_PERIOD_MASTER_CYCLES,
      nextDueMasterCycle: null,
      serviceCostMasterCycles: FACTORY_TIMER0_SERVICE_COST_MASTER_CYCLES,
    });
    expect(FACTORY_TIMER0_DEFAULT_RELOAD).toBe(0xfb1a);
    expect(FACTORY_TIMER0_DEFAULT_CONTROL).toBe(0x0080);
    expect(Object.isFrozen(cadence)).toBe(true);
  });

  it("models disable, source reload, and explicit re-enable in separate pure steps", () => {
    const seeded = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    const disabled = disableFactoryTimer0Cadence(seeded);
    expect(disabled).toMatchObject({ enabled: false, nextDueMasterCycle: null });

    // 448 samples/VBlank is another source-derived m4a table rate: 627 cycles.
    const reloaded = reloadFactoryTimer0Cadence(disabled, 0xfd8d);
    expect(reloaded).toMatchObject({
      enabled: false,
      reload: 0xfd8d,
      prescaleBits: 0,
      periodMasterCycles: 627,
      nextDueMasterCycle: null,
    });
    const enabled = enableFactoryTimer0Cadence(reloaded, 500);
    expect(enabled).toMatchObject({ enabled: true, nextDueMasterCycle: 500 });
    expect(enabled.serviceCostMasterCycles).toBeNull();
  });

  it("preserves the due phase when dispatch is late", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    const first = dispatchFactoryTimer0Cadence(cadence, 118);
    expect(first.crossedDueMasterCycles).toEqual([100]);
    expect(first.cadence.nextDueMasterCycle).toBe(1_354);
    expect(first.serviceCostMasterCycles).toBeNull();

    const beforeNextDue = dispatchFactoryTimer0Cadence(first.cadence, 1_300);
    expect(beforeNextDue.crossedDueMasterCycles).toEqual([]);
    expect(beforeNextDue.cadence.nextDueMasterCycle).toBe(1_354);
  });

  it("advances every crossed period from its original due time", () => {
    const cadence = createFactoryTimer0Cadence({ firstDueMasterCycle: 100 });
    const result = dispatchFactoryTimer0Cadence(cadence, 3_000);
    expect(result.crossedDueMasterCycles).toEqual([100, 1_354, 2_608]);
    expect(result.cadence.nextDueMasterCycle).toBe(3_862);
    expect(result.cadence.serviceCostMasterCycles).toBeNull();
  });

  it("does not invent events for an unseeded or disabled cadence", () => {
    const unseeded = createFactoryTimer0Cadence({ firstDueMasterCycle: null });
    expect(dispatchFactoryTimer0Cadence(unseeded, 10_000).crossedDueMasterCycles).toEqual([]);
    const disabled = disableFactoryTimer0Cadence(
      enableFactoryTimer0Cadence(unseeded, 500),
    );
    expect(dispatchFactoryTimer0Cadence(disabled, 10_000).crossedDueMasterCycles).toEqual([]);
  });

  it("rejects invalid and unmodeled rates instead of silently using 1,254", () => {
    expect(() => createFactoryTimer0Cadence({ firstDueMasterCycle: null, reload: 0x1234 }))
      .toThrow(/unmodeled Factory Timer 0 reload/);
    expect(() => createFactoryTimer0Cadence({ firstDueMasterCycle: null, prescaleBits: 1 }))
      .toThrow(/unmodeled Factory Timer 0 prescale/);
    expect(() => createFactoryTimer0Cadence({ firstDueMasterCycle: -1 }))
      .toThrow(/firstDueMasterCycle/);
    expect(() => dispatchFactoryTimer0Cadence(
      createFactoryTimer0Cadence({ firstDueMasterCycle: 1 }), -1,
    )).toThrow(/dispatchMasterCycle/);
    expect(() => reloadFactoryTimer0Cadence(
      createFactoryTimer0Cadence({ firstDueMasterCycle: 1 }), FACTORY_TIMER0_DEFAULT_RELOAD,
    )).toThrow(/disabled Timer 0 cadence/);
  });
});
