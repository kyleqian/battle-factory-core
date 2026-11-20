// aud245b: the four limits aud245 left (docs/aud245-audio-player.md "aud245b"): the music state after a fast-forward / late start
// (restore + MusicTracker), runtime `pan` events, cry volume, and fetch-on-first-use with a small prefetch set. Fake AudioContext.
import { describe, expect, it } from "vitest";
import { createAudioPlayer, cryVolumeGain, FRAME_HZ, m4aPanGains, type AudioContextLike, type AudioPlayerOptions, type BufferSourceLike } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import { MusicTracker } from "../src/audio/musicTracker.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";

class FakeParam {
  value = 1;
  readonly sets: { value: number; time: number }[] = [];
  setValueAtTime(value: number, time: number): void {
    this.sets.push({ value, time });
  }
  linearRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  readonly targets: unknown[] = [];
  disconnects = 0;
  connect(target: unknown): void {
    this.targets.push(target);
  }
  disconnect(): void {
    this.disconnects += 1;
    this.targets.length = 0;
  }
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
  channelCount = 2;
  channelCountMode = "max";
}
class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: { duration: number } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  starts: { when?: number; offset?: number; duration?: number }[] = [];
  stops: (number | undefined)[] = [];
  start(when?: number, offset?: number, duration?: number): void {
    this.starts.push({ when, offset, duration });
  }
  stop(when?: number): void {
    this.stops.push(when);
  }
}
class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  readonly destination = { destination: true };
  readonly gains: FakeGain[] = [];
  readonly sources: FakeSource[] = [];
  async resume(): Promise<void> {
    this.state = "running";
  }
  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createChannelMerger(): FakeNode {
    return new FakeNode();
  }
  async decodeAudioData(): Promise<{ duration: number }> {
    return { duration: 1000 };
  }
}

function harness(options: Partial<AudioPlayerOptions> = {}) {
  const ctx = new FakeContext();
  const time = { now: 100 };
  const fetched: string[] = [];
  const player = createAudioPlayer({
    enabled: true,
    gestureTarget: null,
    setTimer: () => 0,
    clearTimer: () => undefined,
    clock: () => time.now,
    createContext: () => ctx,
    fetchBytes: async (url) => {
      fetched.push(url);
      return new ArrayBuffer(8);
    },
    canPlayOgg: () => true,
    ...options,
  });
  return { player, ctx, time, fetched };
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
const ev = (kind: SoundEvent["kind"], frame: number, rest: Partial<SoundEvent> = {}): SoundEvent => ({ kind, frame, id: null, pan: null, ...rest });
const sounds = bundledAssets.manifest.sounds;
const seconds = (frames: number): number => frames / FRAME_HZ;
const LATENCY = 0.03;

/** The offset into the file at which the BGM (bgm-469) started: the first source that is not an SE-length one. */
function bgmStarts(ctx: FakeContext): { offset: number; when: number }[] {
  return ctx.sources.filter((s) => s.starts.length > 0 && (s.loop || (s.starts[0]!.duration ?? 0) > 5)).map((s) => ({ offset: s.starts[0]!.offset!, when: s.starts[0]!.when! }));
}
function loopPosition(sound: { sampleRate: number; offsetSamples: number; loopStartSamples?: number; loopEndSamples?: number }, elapsed: number): number {
  const start = sound.loopStartSamples! / sound.sampleRate;
  const end = sound.loopEndSamples! / sound.sampleRate;
  return sound.offsetSamples / sound.sampleRate + (elapsed < end ? elapsed : start + ((elapsed - end) % (end - start)));
}

describe("restore: the music state at the live frame (limit 1)", () => {
  const bgm = sounds["bgm:469"]!;

  it("starts the BGM at the position it has reached, inside the first pass and after several loops", async () => {
    for (const secondsIn of [10, 64.84 * 2.3]) {
      const h = harness();
      await flush();
      const live = 1000 + Math.round(secondsIn * FRAME_HZ);
      h.player.restore([ev("bgm", 1000, { id: 469 })], live);
      await flush();
      const starts = bgmStarts(h.ctx);
      expect(starts.length).toBeGreaterThan(0);
      // The file loaded asynchronously, so the start lands ~25 ms before the anchor: the position moved on accordingly.
      const elapsed = seconds(live - 1000) - LATENCY + 0.005 + bgm.onsetSamples / bgm.sampleRate;
      expect(starts[0]!.offset).toBeCloseTo(loopPosition(bgm, elapsed), 1);
      expect(h.player.stats().restored).toBe(1);
    }
  });

  it("replays the events without sounding them: no SE source, counters of started / preempted untouched", async () => {
    const h = harness();
    await flush();
    h.player.restore([ev("se", 100, { id: 5 }), ev("se", 150, { id: 5 }), ev("bgm", 160, { id: 469 }), ev("se", 700, { id: 5 })], 705);
    await flush();
    // Only the SE still sounding at the live frame (5 frames in) is started, part-way; the two that ended are not.
    const se = h.ctx.sources.filter((s) => s.starts.length > 0 && (s.starts[0]!.duration ?? 99) < 1);
    expect(se.length).toBe(1);
    expect(se[0]!.starts[0]!.duration!).toBeLessThan(sounds["se:5:none"]!.lengthSamples / sounds["se:5:none"]!.sampleRate - 0.05);
    const stats = h.player.stats();
    expect(stats.started).toEqual({});
    expect(stats.preempted).toBe(0);
    expect(stats.events).toEqual({ se: 3, bgm: 1 });
  });

  it("a fanfare that already ended leaves the BGM running at the pause-corrected position", async () => {
    const h = harness();
    await flush();
    const fanfareFrames = Math.ceil((sounds["fanfare:368"]!.lengthSamples / sounds["fanfare:368"]!.sampleRate) * FRAME_HZ);
    const events = [ev("bgm", 100, { id: 469 }), ev("stop", 1000, { id: 469, player: "BGM" }), ev("fanfare", 1000, { id: 368 }), ev("continue", 1000 + fanfareFrames, { id: 469, player: "BGM" })];
    const live = 3000;
    h.player.restore(events, live);
    await flush();
    const playedFor = seconds(1000 - 100) + seconds(live - (1000 + fanfareFrames)) - LATENCY + 0.005;
    expect(bgmStarts(h.ctx)[0]!.offset).toBeCloseTo(loopPosition(bgm, playedFor + bgm.onsetSamples / bgm.sampleRate), 1);
    expect(h.ctx.sources.some((s) => Math.abs((s.starts[0]?.duration ?? 0) - 2.036) < 0.01)).toBe(false);
  });

  it("restoring in the middle of a fanfare: the BGM stays paused and the fanfare plays from its position", async () => {
    const h = harness();
    await flush();
    h.player.restore([ev("bgm", 100, { id: 469 }), ev("stop", 1000, { id: 469, player: "BGM" }), ev("fanfare", 1000, { id: 368 })], 1060);
    await flush();
    expect(bgmStarts(h.ctx)).toEqual([]);
    const fan = h.ctx.sources.find((s) => s.starts.length > 0)!;
    expect(fan.starts[0]!.offset).toBeGreaterThan(sounds["fanfare:368"]!.offsetSamples / sounds["fanfare:368"]!.sampleRate + seconds(60) - 0.1);
  });

  it("a fade-out that finished, or a replaced BGM, leaves only the current song", async () => {
    const h = harness();
    await flush();
    h.player.restore([ev("bgm", 10, { id: 469 }), ev("fade", 300, { speed: 4 }), ev("bgm", 900, { id: 476 })], 1200);
    await flush();
    const files = h.ctx.sources.filter((s) => s.starts.length > 0);
    expect(files.length).toBeGreaterThan(0);
    expect(h.fetched.filter((url) => /bgm-4\d\d/.test(url)).every((url) => url.includes("bgm-476") || url.includes("bgm-469"))).toBe(true);
    expect(h.player.stats().started).toEqual({});
  });

  it("muted: restores the logical state, and enabling audio later starts that BGM at its position", async () => {
    const h = harness({ enabled: false });
    h.player.restore([ev("bgm", 100, { id: 469 })], 100 + 600);
    await flush();
    expect(h.ctx.sources).toEqual([]);
    h.player.setEnabled(true);
    await flush();
    const starts = bgmStarts(h.ctx);
    expect(starts.length).toBeGreaterThan(0);
    expect(starts[0]!.offset).toBeGreaterThan(seconds(600) - 0.2);
  });

  it("ignores events after the live frame and keeps the clock so later live events line up", async () => {
    const h = harness();
    await flush();
    h.player.restore([ev("bgm", 100, { id: 469 }), ev("bgm", 900, { id: 476 })], 500);
    await flush();
    expect(h.fetched.some((url) => url.includes("bgm-476"))).toBe(false);
    const before = h.ctx.sources.length;
    h.player.push(ev("se", 501, { id: 5 }));
    const se = h.ctx.sources[before]!;
    expect(se.starts[0]!.when).toBeCloseTo(100 + LATENCY + 1 / FRAME_HZ + sounds["se:5:none"]!.onsetSamples / sounds["se:5:none"]!.sampleRate, 3);
  });
});

describe("MusicTracker", () => {
  it("keeps the last BGM start, the last duck and the events after the start; drops cries and pans", () => {
    const tracker = new MusicTracker();
    tracker.push(ev("bgm", 10, { id: 469 }));
    tracker.push(ev("se", 20, { id: 5 }));
    tracker.push(ev("cry", 30, { id: 1 }));
    tracker.push(ev("pan", 31, { pan: 3 }));
    tracker.push(ev("duck", 30, { volume: 85 }));
    tracker.push(ev("duck", 90, { volume: 256 }));
    tracker.push(ev("fanfare", 100, { id: 368 }));
    expect(tracker.events().map((e) => [e.kind, e.frame])).toEqual([
      ["bgm", 10],
      ["se", 20],
      ["fanfare", 100],
      ["duck", 90],
    ].sort((a, b) => (a[1] as number) - (b[1] as number)));
    tracker.push(ev("bgm", 200, { id: 476 }));
    expect(tracker.events().map((e) => [e.kind, e.id])).toEqual([
      ["duck", null],
      ["bgm", 476],
    ]);
    tracker.reset();
    expect(tracker.events()).toEqual([]);
  });

  it("is bounded: a long Lobby of SE presses never pushes out the BGM start or a fanfare", () => {
    const tracker = new MusicTracker();
    tracker.push(ev("bgm", 1, { id: 469 }));
    tracker.push(ev("stop", 2, { id: 469, player: "BGM" }));
    for (let frame = 3; frame < 20000; frame += 1) tracker.push(ev("se", frame, { id: 5 }));
    const list = tracker.events();
    expect(list.length).toBeLessThanOrEqual(1026);
    expect(list[0]!.kind).toBe("bgm");
    expect(list.some((e) => e.kind === "stop")).toBe(true);
  });
});

describe("pan events (limit 2)", () => {
  /** Plays se 146 (SE1, 3.4 s, recorded at pan 63) and returns the nodes the pan stage adds. */
  async function startPanned(pan: number | null = 63, id = 146) {
    const h = harness();
    await flush();
    h.player.push(ev("se", 10, { id, pan }));
    await flush();
    return h;
  }
  const lefts = (h: ReturnType<typeof harness>, pan: number): FakeGain[] => h.ctx.gains.filter((g) => g.gain.value === m4aPanGains(pan).left || g.gain.value === m4aPanGains(pan).right);

  it("moves a playing SE1 / SE2 voice to the new pan with the m4a law, and keeps following later pans", async () => {
    const h = await startPanned();
    const pre = h.ctx.sources[h.ctx.sources.length - 1]!.targets[0] as FakeGain;
    expect(pre.disconnects).toBe(0);
    h.player.push(ev("pan", 12, { pan: -20 }));
    expect(pre.disconnects).toBe(1);
    expect(pre.channelCount).toBe(1);
    expect(pre.channelCountMode).toBe("explicit");
    expect(pre.targets.length).toBe(2);
    const stage = pre.targets as FakeGain[];
    expect(stage.map((g) => g.gain.value).sort()).toEqual([m4aPanGains(-20).left, m4aPanGains(-20).right].sort());
    h.player.push(ev("pan", 14, { pan: 30 }));
    for (const [index, want] of [m4aPanGains(30).left, m4aPanGains(30).right].entries()) expect(stage[index]!.gain.sets.at(-1)!.value).toBeCloseTo(want, 9);
    expect(pre.disconnects).toBe(1);
    expect(lefts(h, -20).length).toBe(2);
  });

  it("a pan equal to the recording's own leaves the recording untouched; no SE playing, or an SE3 voice, is not affected", async () => {
    const h = await startPanned(63);
    const pre = h.ctx.sources[h.ctx.sources.length - 1]!.targets[0] as FakeGain;
    h.player.push(ev("pan", 11, { pan: 63 }));
    expect(pre.disconnects).toBe(0);
    const empty = harness();
    await flush();
    const before = empty.ctx.gains.length;
    empty.player.push(ev("pan", 11, { pan: -5 }));
    expect(empty.ctx.gains.length).toBe(before);
    const se3 = await startPanned(null, 90);
    const out = se3.ctx.sources[0]!.targets[0] as FakeGain;
    se3.player.push(ev("pan", 12, { pan: -30 }));
    expect(out.disconnects).toBe(0);
    expect(out.channelCount).toBe(2);
  });

  it("a pan that arrives while the file is still loading is applied when the voice starts", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("se", 10, { id: 116, pan: -64 }));
    h.player.push(ev("pan", 10, { pan: 10 }));
    await flush();
    expect(h.ctx.sources.length).toBe(1);
    const pre = h.ctx.sources[0]!.targets[0] as FakeGain;
    expect(pre.channelCount).toBe(1);
    expect((pre.targets as FakeGain[]).map((g) => g.gain.value).sort()).toEqual([m4aPanGains(10).left, m4aPanGains(10).right].sort());
  });

  it("a new SE on the same player starts fresh at its own pan", async () => {
    const h = await startPanned();
    h.player.push(ev("pan", 12, { pan: -20 }));
    h.player.push(ev("se", 400, { id: 146, pan: 63 }));
    const pre = h.ctx.sources[h.ctx.sources.length - 1]!.targets[0] as FakeGain;
    expect(pre.channelCount).toBe(2);
    expect(pre.disconnects).toBe(0);
  });
});

describe("cry volume (limit 3)", () => {
  it("is the cry song's VOL: linear in volume & 0x7F against the 120 the cries were recorded at (m4a.c SetPokemonCryVolume, TrkVolPitSet)", () => {
    expect(cryVolumeGain(undefined)).toBe(1);
    expect(cryVolumeGain(120)).toBe(1);
    expect(cryVolumeGain(60)).toBe(0.5);
    expect(cryVolumeGain(127)).toBeCloseTo(127 / 120, 9);
    expect(cryVolumeGain(0x80 | 60)).toBe(0.5);
    expect(cryVolumeGain(0)).toBe(0);
  });

  const gainsOf = (h: ReturnType<typeof harness>): number[] => h.ctx.gains.filter((g) => g.gain.value !== 1).map((g) => g.gain.value).sort((a, b) => a - b);

  it("scales the left / right pan gains", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("cry", 10, { id: 1, mode: 0, pan: 25, volume: 60, priority: 10 }));
    await flush();
    const law = m4aPanGains(25);
    expect(gainsOf(h)).toEqual([law.left * 0.5, law.right * 0.5].sort((a, b) => a - b));
  });

  it("a cry with no pan still gets its volume; the recorded volume adds no gain stage", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("cry", 10, { id: 1, mode: 0, pan: null, volume: 60, priority: 10 }));
    await flush();
    expect(gainsOf(h)).toEqual([0.5, 0.5]);
    const plain = harness();
    await flush();
    plain.player.push(ev("cry", 10, { id: 1, mode: 0, pan: null, volume: 120, priority: 10 }));
    await flush();
    expect(gainsOf(plain)).toEqual([]);
  });
});

describe("fetch on first use (limit 4)", () => {
  it("enabling fetches only the prefetch set (Lobby / draft BGM, the common UI SEs and the battle-start ball tray)", async () => {
    const h = harness();
    await flush();
    const names = h.fetched.map((url) => url.split("/").pop()!).sort();
    // snd1: the five ball-tray files (SE_BALL_TRAY_ENTER / BALL / EXIT pan variants) are fetched ahead too: 14 tray SEs land in the first
    // second of every battle, and a first-use fetch lost the first battle's.
    expect(names).toEqual([
      "bgm-469.ogg", "se-005-nopan.ogg", "se-009-nopan.ogg", "se-015-nopan.ogg", "se-032-nopan.ogg",
      "se-114-panp00.ogg", "se-115-panm64.ogg", "se-115-panp63.ogg", "se-116-panm64.ogg", "se-116-panp63.ogg",
    ]);
    expect(h.player.stats().prefetched).toBe(10);
  });

  it("any other sound is fetched the first time it plays, once, and decoded once", async () => {
    const h = harness();
    await flush();
    const before = h.fetched.length;
    h.player.push(ev("se", 10, { id: 13, pan: 63 }));
    h.player.push(ev("cry", 12, { id: 25, mode: 0, pan: 0, priority: 10 }));
    await flush();
    expect(h.fetched.slice(before).map((url) => url.split("/").pop()!).sort()).toEqual(["cry-025.ogg", "se-013-panp63.ogg"]);
    h.player.push(ev("se", 200, { id: 13, pan: 63 }));
    h.player.push(ev("cry", 210, { id: 25, mode: 5, pan: 0, priority: 10 }));
    await flush();
    expect(h.fetched.length).toBe(before + 2);
    expect(h.player.stats().decoded).toBe(h.fetched.length);
  });

  it("a muted player fetches nothing, and a prefetched sound plays on time while a cold one starts late once", async () => {
    const muted = harness({ enabled: false });
    muted.player.push(ev("se", 10, { id: 13, pan: 63 }));
    await flush();
    expect(muted.fetched).toEqual([]);
    const h = harness();
    await flush();
    const before = h.player.stats().late;
    h.player.push(ev("se", 10, { id: 5 }));
    expect(h.player.stats().late).toBe(before);
    h.player.push(ev("se", 20, { id: 13, pan: 63 }));
    await flush();
    expect(h.player.stats().late).toBe(before + 1);
  });
});
