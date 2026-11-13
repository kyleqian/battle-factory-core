// aud247: the BGM already playing on a mount's first frame. The ROM anchor reads BGM 469 at gMPlayInfo_BGM.clock 3287 (0.96 ticks/frame, so
// started 3424 frames earlier); an "after-save" mount starts in the Lobby, whose map music is the same song, from its start. Through the
// library mount with a fake AudioContext/fetch, as aud245bLibRestore does.
import { afterEach, describe, expect, it } from "vitest";
import { FRAME_HZ } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import { initialMusicEvents } from "../src/audio/initialMusic.ts";
import { MusicTracker } from "../src/audio/musicTracker.ts";
import { mountFactoryGameInternal } from "../src/lib.ts";

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

const sound = bundledAssets.manifest.sounds["bgm:469"]!;
const expectedOffset = (frames: number): number => {
  const elapsed = frames / FRAME_HZ + sound.onsetSamples / sound.sampleRate;
  const start = sound.loopStartSamples! / sound.sampleRate;
  const end = sound.loopEndSamples! / sound.sampleRate;
  return sound.offsetSamples / sound.sampleRate + (elapsed < end ? elapsed : start + ((elapsed - end) % (end - start)));
};
// The crossfaded loop schedules its later passes as further sources; the first start is the voice's own. The wall clock moves while a test
// awaits, so offsets are compared at 0.15 s like aud245bLibRestore (the claims differ by tens of seconds).
const TOLERANCE = 0.15;
const bgmStarts = (): { offset: number }[] => starts.filter((s) => s.duration === undefined || s.duration > 1);

afterEach(() => {
  starts.length = 0;
  fetched.length = 0;
});

describe("aud247: initial music table", () => {
  it("the draft start is BGM 469 back-dated by the ROM anchor position; after-save is the Lobby map music from its start", () => {
    expect(initialMusicEvents(undefined)).toEqual([{ frame: -3424, kind: "bgm", id: 469, pan: null }]);
    expect(initialMusicEvents("draft")).toEqual(initialMusicEvents(undefined));
    expect(initialMusicEvents("after-save")).toEqual([{ frame: 0, kind: "bgm", id: 469, pan: null }]);
  });

  it("the tracker starts from the seed, a later bgm replaces it, and reset returns to it", () => {
    const tracker = new MusicTracker(initialMusicEvents("draft"));
    expect(tracker.events().map((e) => [e.frame, e.id])).toEqual([[-3424, 469]]);
    tracker.push({ frame: 700, kind: "bgm", id: 476, pan: null });
    expect(tracker.events().map((e) => [e.frame, e.id])).toEqual([[700, 476]]);
    tracker.reset();
    expect(tracker.events().map((e) => [e.frame, e.id])).toEqual([[-3424, 469]]);
    expect(new MusicTracker().events()).toEqual([]);
  });
});

describe("aud247: music at mount (library mount, fake AudioContext)", () => {
  it("a fresh draft mount with audio on starts BGM 469 at frame 0 at the anchor's loop position", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      expect(game.frame).toBe(0);
      expect(fetched.some((url) => url.endsWith("bgm-469.ogg"))).toBe(true);
      const bgm = bgmStarts();
      expect(bgm.length).toBeGreaterThan(0);
      expect(Math.abs(bgm[0]!.offset - expectedOffset(3424))).toBeLessThan(TOLERANCE);
      expect(game.audioStats()!.started).toEqual({});
    } finally {
      game.destroy();
    }
  });

  it("an after-save mount starts the Lobby BGM 469 from the start of the song", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", start: "after-save", audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      const bgm = bgmStarts();
      expect(bgm.length).toBeGreaterThan(0);
      expect(Math.abs(bgm[0]!.offset - expectedOffset(0))).toBeLessThan(TOLERANCE);
    } finally {
      game.destroy();
    }
  });

  it("resume with no music event in the trace keeps the seed: the BGM continues at the position of the live frame", async () => {
    installFakes();
    const trace = [{ frames: 200, buttons: [] }];
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", resume: trace, resumeSync: true, audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      expect(game.frame).toBe(200);
      const bgm = bgmStarts();
      expect(bgm.length).toBeGreaterThan(0);
      expect(Math.abs(bgm[0]!.offset - expectedOffset(3424 + 200))).toBeLessThan(TOLERANCE);
    } finally {
      game.destroy();
    }
  }, 60_000);

  it("a mount with no audio option that switches audio on at frame 0 gets the same music; no option means no sound", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off" });
    try {
      await flush();
      expect(fetched).toEqual([]);
      expect(starts).toEqual([]);
      game.setAudio(true);
      await flush();
      expect(Math.abs(bgmStarts()[0]!.offset - expectedOffset(3424))).toBeLessThan(TOLERANCE);
    } finally {
      game.destroy();
    }
  });

  it("reset restarts the draft music from the anchor position", async () => {
    installFakes();
    const game = mountFactoryGameInternal({ canvas: canvas(), battleScene: "off", audio: { enabled: true, baseUrl: "/audio" } });
    try {
      await flush();
      const before = starts.length;
      expect(before).toBeGreaterThan(0);
      game.reset();
      await flush();
      expect(starts.length).toBeGreaterThan(before);
      expect(Math.abs(starts[before]!.offset - expectedOffset(3424))).toBeLessThan(TOLERANCE);
    } finally {
      game.destroy();
    }
  });
});
