// ffw1: setSpeed (the website's fast-forward key). Above 1 the loop ticks that many game frames per display frame and
// nothing reaches the audio player; back at 1 the music is restored at the live frame, as after a resume's fast-forward.
import { afterEach, describe, expect, it } from "vitest";
import { FRAME_HZ } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import type { TraceSegment } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { mountFactoryGame, mountFactoryGameInternal } from "../src/lib.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const FRAME_MS = 1000 / FRAME_HZ;
const starts: { offset: number; duration: number | undefined }[] = [];
let pending: ((time: number) => void) | null = null;
let clock = 0;

function installFakes(): void {
  const param = { value: 1, setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, cancelScheduledValues: () => undefined };
  const node = (): Record<string, unknown> => ({ connect: () => undefined, disconnect: () => undefined, gain: { ...param } });
  class FakeAudioContext {
    currentTime = 0;
    state = "running";
    destination = {};
    resume = async (): Promise<void> => undefined;
    createGain = node;
    createChannelMerger = node;
    createBufferSource = (): unknown => ({
      ...node(),
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      start: (_when: number, offset: number, duration?: number) => starts.push({ offset, duration }),
      stop: () => undefined,
    });
    decodeAudioData = async (): Promise<{ duration: number }> => ({ duration: 1000 });
  }
  const g = globalThis as Record<string, unknown>;
  g.AudioContext = FakeAudioContext;
  g.fetch = async (): Promise<unknown> => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  g.requestAnimationFrame = (callback: (time: number) => void) => {
    pending = callback;
    return 1;
  };
  g.cancelAnimationFrame = () => undefined;
  pending = null;
  clock = 0;
}

/** One display frame: `ms` later than the last (a hair over a game frame by default, so float sums never fall short). */
function displayFrame(ms = FRAME_MS + 0.01): void {
  const callback = pending;
  expect(callback).not.toBeNull();
  pending = null;
  clock += ms;
  callback!(clock);
}

const canvas = (): HTMLCanvasElement => {
  const data = new Uint8ClampedArray(240 * 160 * 4);
  return { width: 0, height: 0, getContext: () => ({ createImageData: () => ({ data }), putImageData: () => undefined }) } as unknown as HTMLCanvasElement;
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 60; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

// The aud245b run: seed 3, Scene OFF, BGM 476 from frame 695 to the end of the 1600-frame window.
const BGM_FRAME = 695;
function recordRun(): TraceSegment[] {
  const session = new FactorySession({ battleScene: "off" });
  const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
  for (let frame = 1; frame <= 1600; frame += 1) session.tick(player.decide(session.state), frame);
  return session.trace();
}
const sound = bundledAssets.manifest.sounds["bgm:476"]!;
const expectedOffset = (frames: number): number => {
  const elapsed = frames / FRAME_HZ + sound.onsetSamples / sound.sampleRate;
  const start = sound.loopStartSamples! / sound.sampleRate;
  const end = sound.loopEndSamples! / sound.sampleRate;
  return sound.offsetSamples / sound.sampleRate + (elapsed < end ? elapsed : start + ((elapsed - end) % (end - start)));
};
const isBgm = (s: { duration: number | undefined }): boolean => s.duration === undefined || s.duration > 5;

afterEach(() => {
  starts.length = 0;
});

describe("ffw1: setSpeed", () => {
  it("ticks `speed` game frames per display frame, clamps to 1..8, and the public mount has it", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off" });
    try {
      await flush();
      displayFrame(0); // the first call only starts the clock
      const base = game.frame;
      displayFrame();
      expect(game.frame).toBe(base + 1);
      game.setSpeed(4);
      displayFrame();
      expect(game.frame).toBe(base + 5);
      game.setSpeed(100);
      displayFrame();
      expect(game.frame).toBe(base + 13);
      game.setSpeed(Number.NaN);
      displayFrame();
      expect(game.frame).toBe(base + 14);
      game.setSpeed(0);
      displayFrame();
      expect(game.frame).toBe(base + 15);
    } finally {
      game.destroy();
    }
    const pub = mountFactoryGame({ canvas: canvas(), battleScene: "off" });
    try {
      expect(typeof pub.setSpeed).toBe("function");
    } finally {
      pub.destroy();
    }
  });

  it("a long display frame at speed 4 is capped at 4 x 8 ticks, like the normal 8-tick cap", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off" });
    try {
      await flush();
      displayFrame(0);
      const base = game.frame;
      game.setSpeed(4);
      displayFrame(1000);
      expect(game.frame).toBe(base + 32);
    } finally {
      game.destroy();
    }
  });

  it("is silent while fast, and back at 1 the BGM plays at the live frame's loop position", async () => {
    const trace = recordRun();
    const traceFrames = trace.reduce((sum, segment) => sum + segment.frames, 0);
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", resume: trace, resumeSync: true, audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      expect(game.frame).toBe(traceFrames);
      expect(starts.some(isBgm)).toBe(true);
      displayFrame(0);
      game.setSpeed(4);
      const restoredBefore = game.audioStats()!.restored;
      starts.length = 0;
      for (let i = 0; i < 10; i += 1) displayFrame();
      expect(game.frame).toBe(traceFrames + 40);
      expect(starts).toEqual([]);
      expect(game.audioStats()!.started).toEqual({});
      game.setSpeed(1);
      await flush();
      expect(game.audioStats()!.restored).toBeGreaterThan(restoredBefore);
      const bgm = starts.find(isBgm);
      expect(bgm).toBeDefined();
      expect(Math.abs(bgm!.offset - expectedOffset(game.frame - BGM_FRAME))).toBeLessThan(0.15);
    } finally {
      game.destroy();
    }
  }, 120_000);

  it("the trace and the game frame are the same at any speed", async () => {
    installFakes();
    const slow = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", gameplaySeed: 5 });
    await flush();
    displayFrame(0);
    const presses = new Map<number, "A" | "DOWN">([
      [30, "A"],
      [90, "DOWN"],
      [150, "A"],
    ]);
    const drive = (game: ReturnType<typeof mountFactoryGameInternal>, speed: number, frames: number): void => {
      game.setSpeed(speed);
      while (game.frame < frames) {
        const press = presses.get(game.frame);
        if (press) {
          game.press(press);
          game.release(press);
        }
        displayFrame();
      }
    };
    try {
      drive(slow, 1, 240);
    } finally {
      slow.destroy();
    }
    // `t` is wall-clock milliseconds since mount (ignored by every replay): left out of the comparison.
    const runs = (trace: TraceSegment[]): Omit<TraceSegment, "t">[] => trace.map(({ frames, buttons }) => ({ frames, buttons }));
    const slowTrace = runs(slow.trace());
    installFakes();
    const fast = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", gameplaySeed: 5 });
    await flush();
    displayFrame(0);
    try {
            while (fast.frame < 240) {
        const press = presses.get(fast.frame);
        if (press) {
          fast.press(press);
          fast.release(press);
        }
        // As fast as possible (up to 8) without running past the next press or the end.
        const next = Math.min(240, ...[...presses.keys()].filter((frame) => frame > fast.frame));
        fast.setSpeed(Math.min(8, next - fast.frame));
        displayFrame();
      }
      expect(fast.frame).toBe(slow.frame);
      expect(runs(fast.trace())).toEqual(slowTrace);
      expect(slowTrace.length).toBeGreaterThan(3);
    } finally {
      fast.destroy();
    }
  });
});
