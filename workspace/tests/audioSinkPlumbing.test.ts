// aud239: the session's collection path, exercised with a stand-in emitter (no real emitter exists yet).
// `tick` from the engine core is wrapped so frames 3 and 5 emit sounds through the same `emitSound` the
// future emitters will call; everything else about the session is the real one.
import { afterAll, describe, expect, it, vi } from "vitest";

// The suite runs with isolate:false (vite.config.ts), so an earlier file in this fork may already have
// loaded the real core / session; reset the registry and register the wrapper with doMock so the
// imports below always see it, then undo both for the next file.
vi.resetModules();
vi.doMock("../src/engine/core.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/engine/core.ts")>();
  const { emitSound } = await import("../src/audio/soundEvents.ts");
  return {
    ...actual,
    tick: (...args: Parameters<typeof actual.tick>) => {
      const next = actual.tick(...args);
      if (next.frame === 3) {
        emitSound({ kind: "se", id: 5, pan: null });
        emitSound({ kind: "cry", id: 42, pan: 25, mode: 0, volume: 120, priority: 10 });
      }
      if (next.frame === 5) emitSound({ kind: "bgm", id: 469, pan: null, frame: 9 });
      return next;
    },
  };
});

const { FactorySession } = await import("../src/factorySession.ts");
const { collectSoundTick, emitSound, soundCollecting } = await import("../src/audio/soundEvents.ts");
type SoundEvent = import("../src/audio/soundEvents.ts").SoundEvent;

const NONE = new Set<never>();

afterAll(() => {
  vi.doUnmock("../src/engine/core.ts");
  vi.resetModules();
});

describe("session sound collection (aud239)", () => {
  it("stamps each live tick's events with the 1-based session frame, in emission order", () => {
    const session = new FactorySession({ battleScene: "off" });
    const got: SoundEvent[] = [];
    session.attachSoundSink({ push: (event) => got.push(event) });
    for (let i = 0; i < 6; i += 1) session.tick(NONE);
    expect(got).toEqual([
      { frame: 3, kind: "se", id: 5, pan: null },
      { frame: 3, kind: "cry", id: 42, pan: 25, mode: 0, volume: 120, priority: 10 },
      { frame: 9, kind: "bgm", id: 469, pan: null },
    ]);
    expect(session.frame).toBe(6);
    expect(Object.isFrozen(got[0])).toBe(true);
  });

  it("delivers nothing without a sink, after detaching, or on fast-forward frames", () => {
    const got: SoundEvent[] = [];
    const bare = new FactorySession({ battleScene: "off" });
    for (let i = 0; i < 6; i += 1) bare.tick(NONE);
    const detached = new FactorySession({ battleScene: "off" });
    detached.attachSoundSink({ push: (event) => got.push(event) });
    detached.attachSoundSink(null);
    for (let i = 0; i < 6; i += 1) detached.tick(NONE);
    const resumed = new FactorySession({ battleScene: "off" });
    resumed.attachSoundSink({ push: (event) => got.push(event) });
    resumed.resume([{ frames: 6, buttons: [] }]);
    for (let i = 0; i < 6; i += 1) resumed.replayStep(NONE);
    expect(got).toEqual([]);
    expect(resumed.frame).toBe(12);
  });

  it("a throwing sink cannot change the game", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const throwing = new FactorySession({ battleScene: "off" });
    throwing.attachSoundSink({ push: () => { throw new Error("sink bug"); } });
    const bare = new FactorySession({ battleScene: "off" });
    for (let i = 0; i < 6; i += 1) {
      throwing.tick(NONE);
      bare.tick(NONE);
    }
    expect(throwing.digest()).toBe(bare.digest());
    expect(throwing.frame).toBe(bare.frame);
    expect(quiet).toHaveBeenCalled();
    quiet.mockRestore();
  });

  it("emitSound is a no-op outside a collected tick and collectSoundTick restores the previous state", () => {
    expect(soundCollecting()).toBe(false);
    emitSound({ kind: "se", id: 1, pan: 0 });
    const outer = collectSoundTick(10, () => {
      expect(soundCollecting()).toBe(true);
      emitSound({ kind: "se", id: 1, pan: 0 });
      const inner = collectSoundTick(11, () => emitSound({ kind: "stop", id: 90, pan: null }));
      expect(inner.events).toEqual([{ frame: 11, kind: "stop", id: 90, pan: null }]);
      return "ok";
    });
    expect(outer).toEqual({ result: "ok", events: [{ frame: 10, kind: "se", id: 1, pan: 0 }] });
    expect(soundCollecting()).toBe(false);
    expect(() => collectSoundTick(1, () => { throw new Error("x"); })).toThrow("x");
    expect(soundCollecting()).toBe(false);
  });
});
