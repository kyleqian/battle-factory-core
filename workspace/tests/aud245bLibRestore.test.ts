// aud245b limit 1 through the library mount: a `resume` fast-forward (and audio switched on mid-game with no `audio` option) must leave
// the BGM that is playing at the live frame audible at its loop position, without the fast-forward emitting any sound.
import { afterEach, describe, expect, it } from "vitest";
import { FRAME_HZ } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";
import type { TraceSegment } from "../src/factoryContract.ts";
import { FactorySession } from "../src/factorySession.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";
import { ActionLog, RandomPlayer, Rng } from "../tools/soak/randomRoundSoakDriver.ts";

const starts: { offset: number; duration: number | undefined }[] = [];
const fetched: string[] = [];
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
  g.fetch = async (url: string): Promise<unknown> => {
    fetched.push(String(url));
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  };
  g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => undefined;
}
const canvas = (): HTMLCanvasElement => {
  const data = new Uint8ClampedArray(240 * 160 * 4);
  return { width: 0, height: 0, getContext: () => ({ createImageData: () => ({ data }), putImageData: () => undefined }) } as unknown as HTMLCanvasElement;
};
const flush = async (): Promise<void> => {
  for (let i = 0; i < 60; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

// Seed 3, Scene OFF: BGM 476 starts at frame 695 and plays to the end of this window; the trace is the finished runs of 1600 frames.
// A trajectory value of the random player's run: rmw1 (the draft menu takes its first A 2 ticks before the mon pic table ends, as the ROM) moved it 701 -> 695.
const BGM_FRAME = 695;
let trace: TraceSegment[] = [];
let traceFrames = 0;
let bgmEvents: SoundEvent[] = [];
function recordRun(): void {
  const session = new FactorySession({ battleScene: "off" });
  bgmEvents = [];
  session.attachSoundSink({ push: (event) => bgmEvents.push(event) });
  const player = new RandomPlayer(new Rng(3), new ActionLog(false), "winning");
  for (let frame = 1; frame <= 1600; frame += 1) session.tick(player.decide(session.state), frame);
  trace = session.trace();
  traceFrames = trace.reduce((sum, segment) => sum + segment.frames, 0);
}

const sound = bundledAssets.manifest.sounds["bgm:476"]!;
const expectedOffset = (frames: number): number => {
  const elapsed = frames / FRAME_HZ + sound.onsetSamples / sound.sampleRate;
  const start = sound.loopStartSamples! / sound.sampleRate;
  const end = sound.loopEndSamples! / sound.sampleRate;
  return sound.offsetSamples / sound.sampleRate + (elapsed < end ? elapsed : start + ((elapsed - end) % (end - start)));
};
const bgmStart = (): { offset: number } | undefined => starts.find((s) => s.duration === undefined || s.duration > 5);

afterEach(() => {
  starts.length = 0;
  fetched.length = 0;
});

describe("aud245b: BGM after a fast-forward", () => {
  it("the recorded run has the BGM start the test expects", () => {
    recordRun();
    expect(bgmEvents.filter((e) => e.kind === "bgm").map((e) => [e.frame, e.id])).toEqual([[BGM_FRAME, 476]]);
    expect(traceFrames).toBeGreaterThan(BGM_FRAME + 600);
  });

  it("resume with audio enabled: the BGM plays at the loop position of the live frame; the fast-forward itself makes no sound", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", resume: trace, resumeSync: true, audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      expect(game.frame).toBe(traceFrames);
      const bgm = bgmStart();
      expect(bgm).toBeDefined();
      expect(Math.abs(bgm!.offset - expectedOffset(traceFrames - BGM_FRAME))).toBeLessThan(0.15);
      const stats = game.audioStats()!;
      expect(stats.restored).toBeGreaterThan(0);
      expect(stats.started).toEqual({});
      expect(fetched.some((url) => url.endsWith("bgm-476.ogg"))).toBe(true);
    } finally {
      game.destroy();
    }
  }, 120_000);

  it("a mount with no audio option that switches audio on mid-game picks up the playing BGM", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", resume: trace, resumeSync: true });
    try {
      await flush();
      expect(game.audioStats()).toBeNull();
      expect(fetched).toEqual([]);
      game.setAudio(true);
      await flush();
      const bgm = bgmStart();
      expect(bgm).toBeDefined();
      expect(Math.abs(bgm!.offset - expectedOffset(traceFrames - BGM_FRAME))).toBeLessThan(0.15);
    } finally {
      game.destroy();
    }
  }, 120_000);

  it("a muted mount restores the logical state; enabling later starts the BGM in place", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", resume: trace, resumeSync: true, audio: { enabled: false } });
    try {
      await flush();
      expect(starts).toEqual([]);
      expect(game.audioStats()!.restored).toBeGreaterThan(0);
      game.setAudio(true);
      await flush();
      expect(Math.abs(bgmStart()!.offset - expectedOffset(traceFrames - BGM_FRAME))).toBeLessThan(0.15);
    } finally {
      game.destroy();
    }
  }, 120_000);
});
