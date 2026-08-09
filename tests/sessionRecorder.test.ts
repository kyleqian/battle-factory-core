import { describe, expect, it } from "vitest";
import { SessionRecorder } from "../src/sessionRecorder.ts";
import { createInitialState, render, tick } from "../src/engine/core.ts";
import { normalizeButtons, type GbaButton } from "../src/input.ts";

function heldSet(...buttons: GbaButton[]): ReadonlySet<GbaButton> {
  return new Set(buttons);
}

describe("SessionRecorder RLE", () => {
  it("collapses consecutive identical button sets into one segment", () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(heldSet());
    recorder.recordTick(heldSet());
    recorder.recordTick(heldSet("A"));
    recorder.recordTick(heldSet("A"));
    recorder.recordTick(heldSet("A"));
    recorder.recordTick(heldSet());
    const trace = recorder.toTrace({ appRoute: "generated-orchestrator", build: "test" });
    expect(trace.frame).toBe(6);
    expect(trace.segments).toEqual([
      { frames: 2, buttons: [] },
      { frames: 3, buttons: ["A"] },
      { frames: 1, buttons: [] },
    ]);
  });

  it("treats button-set order as irrelevant and reopens a segment on change", () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(heldSet("RIGHT", "A"));
    recorder.recordTick(heldSet("A", "RIGHT"));
    recorder.recordTick(heldSet("A"));
    const trace = recorder.toTrace({ appRoute: "generated-orchestrator", build: "test" });
    expect(trace.segments).toEqual([
      { frames: 2, buttons: ["A", "RIGHT"] },
      { frames: 1, buttons: ["A"] },
    ]);
  });

  it("serializes a thrown Error into the trace's error field", () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(heldSet("A"));
    const trace = recorder.toTrace({
      appRoute: "generated-orchestrator",
      build: "test",
      error: new RangeError("boundary mismatch"),
    });
    expect(trace.error).toMatchObject({ name: "RangeError", message: "boundary mismatch" });
  });

  it("reset clears segments and frame count", () => {
    const recorder = new SessionRecorder();
    recorder.recordTick(heldSet("A"));
    recorder.reset();
    expect(recorder.frameCount).toBe(0);
    const trace = recorder.toTrace({ appRoute: "generated-orchestrator", build: "test" });
    expect(trace.segments).toEqual([]);
  });
});

describe("SessionRecorder round-trip determinism", () => {
  it("a recorded live session replays to the identical framebuffer", () => {
    // Drive the real engine with a pseudo-random-but-deterministic input
    // stream (LCG), the way a human would: short held runs of one button.
    const pool: GbaButton[][] = [[], [], ["A"], ["B"], ["RIGHT"], ["LEFT"], ["UP"], ["DOWN"], []];
    let lcg = 0x12345;
    const nextRand = (): number => {
      lcg = (Math.imul(lcg, 1103515245) + 12345) >>> 0;
      return lcg;
    };

    const recorder = new SessionRecorder();
    let live = createInitialState();
    let framesLeft = 0;
    let heldButtons: ReadonlySet<GbaButton> = new Set();
    const TOTAL = 600;
    for (let frame = 0; frame < TOTAL; frame += 1) {
      if (framesLeft === 0) {
        heldButtons = new Set(pool[nextRand() % pool.length]);
        framesLeft = 1 + (nextRand() % 4);
      }
      framesLeft -= 1;
      recorder.recordTick(heldButtons);
      live = tick(live, heldButtons);
    }

    const trace = recorder.toTrace({ appRoute: live.appRoute, build: "test" });
    expect(trace.frame).toBe(TOTAL);
    expect(trace.segments.reduce((sum, s) => sum + s.frames, 0)).toBe(TOTAL);

    // Replay the exported segments through a fresh state — the exact loop
    // tools/replay-session-trace.ts and the bench advance() ABI use.
    let replayed = createInitialState();
    for (const segment of trace.segments) {
      const buttons = new Set(normalizeButtons(segment.buttons));
      for (let i = 0; i < segment.frames; i += 1) replayed = tick(replayed, buttons);
    }

    expect(replayed.frame).toBe(live.frame);
    expect(replayed.rngValue).toBe(live.rngValue);
    expect(Buffer.from(render(replayed)).equals(Buffer.from(render(live)))).toBe(true);
  });
});
