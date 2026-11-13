// aud245: the WebAudio player's m4a model against a fake AudioContext (no browser): mute default, the MPlayStart priority rule,
// the BGM duck, the fanfare pause / continue, loop fields and the crossfaded wraps, the cry pan law, setEnabled, the Ogg -> AAC fallback.
import { describe, expect, it } from "vitest";
import { createAudioPlayer, m4aPanGains, FRAME_HZ, type AudioContextLike, type AudioPlayerOptions, type BufferSourceLike } from "../src/audio/player.ts";
import { bundledAssets } from "../src/audio/playerAssets.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";

type Call = { op: "set" | "ramp" | "cancel"; value: number; time: number };
class FakeParam {
  value = 1;
  readonly calls: Call[] = [];
  setValueAtTime(value: number, time: number): void {
    this.calls.push({ op: "set", value, time });
  }
  linearRampToValueAtTime(value: number, time: number): void {
    this.calls.push({ op: "ramp", value, time });
  }
  cancelScheduledValues(time: number): void {
    this.calls.push({ op: "cancel", value: 0, time });
  }
}
class FakeNode {
  readonly targets: unknown[] = [];
  connect(target: unknown): void {
    this.targets.push(target);
  }
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
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
  decodeFails: ((bytes: ArrayBuffer) => boolean) | null = null;
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
  async decodeAudioData(bytes: ArrayBuffer): Promise<{ duration: number }> {
    if (this.decodeFails?.(bytes)) throw new Error("decode");
    return { duration: 1000 };
  }
}

interface Harness {
  player: ReturnType<typeof createAudioPlayer>;
  ctx: FakeContext;
  time: { now: number };
  fetched: string[];
  created: number;
}
function harness(options: Partial<AudioPlayerOptions> = {}): Harness {
  const ctx = new FakeContext();
  const time = { now: 100 };
  const h: Harness = { ctx, time, fetched: [], created: 0, player: null as never };
  h.player = createAudioPlayer({
    enabled: true,
    gestureTarget: null,
    setTimer: () => 0,
    clearTimer: () => undefined,
    clock: () => time.now,
    createContext: () => {
      h.created += 1;
      return ctx;
    },
    fetchBytes: async (url) => {
      h.fetched.push(url);
      return new ArrayBuffer(8);
    },
    canPlayOgg: () => true,
    ...options,
  });
  return h;
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 40; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
const ev = (kind: SoundEvent["kind"], frame: number, rest: Partial<SoundEvent> = {}): SoundEvent => ({ kind, frame, id: null, pan: null, ...rest });

const songs = bundledAssets.songPlayers;
const sounds = bundledAssets.manifest.sounds;
const recorded = (id: number): boolean => Object.keys(sounds).some((k) => k.startsWith(`se:${id}:`));
const onPlayer = (player: number): { id: number; priority: number }[] =>
  Object.entries(songs.songs)
    .filter(([id, [p]]) => p === player && recorded(Number(id)) && sounds[`se:${id}:none`] !== undefined && sounds[`se:${id}:none`]!.loops !== true)
    .map(([id, [, priority]]) => ({ id: Number(id), priority }));

describe("m4a pan law", () => {
  it("is linear and relative to the centred recording (m4a_1.s ChnVolSetAsm), not equal-power", () => {
    expect(m4aPanGains(0).left).toBe(1);
    expect(m4aPanGains(0).right).toBeCloseTo(1, 2);
    expect(m4aPanGains(63).left).toBeCloseTo(1 / 127, 5);
    expect(m4aPanGains(63).right).toBeCloseTo(254 / 128, 5);
    expect(m4aPanGains(-64).right).toBe(0);
    expect(m4aPanGains(-64).left).toBeCloseTo(255 / 127, 5);
    expect(m4aPanGains(-32).left).toBeCloseTo(191 / 127, 5);
  });
});

describe("mute default and setEnabled", () => {
  it("muted: no context, no fetch, no source; the events are still counted", async () => {
    const h = harness({ enabled: false });
    h.player.push(ev("se", 1, { id: 5 }));
    h.player.push(ev("bgm", 1, { id: 469 }));
    await flush();
    expect(h.created).toBe(0);
    expect(h.fetched).toEqual([]);
    expect(h.ctx.sources).toEqual([]);
    expect(h.player.state()).toBe("off");
    expect(h.player.stats().events).toEqual({ se: 1, bgm: 1 });
    expect(h.player.stats().started).toEqual({ se: 1, bgm: 1 });
  });

  it("enabling creates the context, fetches the small effects and plays a later SE; muting cuts it again", async () => {
    const h = harness({ enabled: false });
    h.player.push(ev("bgm", 1, { id: 469 }));
    h.player.setEnabled(true);
    await flush();
    expect(h.created).toBe(1);
    expect(h.player.state()).toBe("running");
    expect(h.fetched.some((url) => url.includes("se-005-nopan"))).toBe(true);
    expect(h.fetched.every((url) => !url.includes("cry-"))).toBe(true);
    // The BGM that began while muted comes in once audio is on (late: its file had to load first).
    const bgm = h.ctx.sources.filter((s) => s.starts[0]?.duration !== undefined || s.loop);
    expect(bgm.length).toBeGreaterThan(0);
    const before = h.ctx.sources.length;
    h.time.now = 101;
    h.ctx.currentTime = 101;
    h.player.push(ev("se", 200, { id: 5 }));
    expect(h.ctx.sources.length).toBe(before + 1);
    h.player.setEnabled(false);
    expect(h.player.isEnabled()).toBe(false);
    const stopped = h.ctx.sources.filter((s) => s.stops.length > 0).length;
    expect(stopped).toBe(h.ctx.sources.length);
    const sourcesNow = h.ctx.sources.length;
    h.player.push(ev("se", 300, { id: 5 }));
    expect(h.ctx.sources.length).toBe(sourcesNow);
  });

  it("a suspended context is not audible until it runs", async () => {
    const h = harness();
    h.ctx.state = "suspended";
    h.ctx.resume = async () => undefined;
    h.player.setEnabled(false);
    h.player.setEnabled(true);
    h.player.push(ev("se", 1, { id: 5 }));
    await flush();
    expect(h.player.state()).toBe("suspended");
    expect(h.ctx.sources).toEqual([]);
  });
});

describe("SE players and priority (MPlayStart)", () => {
  it("maps every recorded song to the player and priority the ROM tables give it", () => {
    expect(songs.players).toEqual(["BGM", "SE1", "SE2", "SE3"]);
    expect(songs.priorityChecked).toEqual({ BGM: false, SE1: true, SE2: true, SE3: false });
    expect(songs.songs["5"]).toEqual([2, 5]);
    expect(songs.songs["90"]).toEqual([3, 3]);
    for (const key of Object.keys(sounds)) {
      if (key.startsWith("cry:")) continue;
      const id = key.split(":")[1]!;
      expect(songs.songs[id], key).toBeDefined();
    }
  });

  it("a lower-priority SE does not cut a higher one on SE1 / SE2 (unk_B set); an equal or higher one does", async () => {
    for (const player of [1, 2]) {
      const list = onPlayer(player);
      const high = list.find((s) => list.some((o) => o.priority < s.priority));
      if (!high) continue;
      const low = list.find((s) => s.priority < high.priority)!;
      const same = list.find((s) => s.priority === high.priority && s.id !== high.id);
      const h = harness();
      await flush();
      h.player.push(ev("se", 10, { id: high.id }));
      const first = h.ctx.sources.length;
      expect(first).toBe(1);
      h.player.push(ev("se", 11, { id: low.id }));
      expect(h.player.stats().blocked, `SE${player}`).toBe(1);
      expect(h.ctx.sources.length).toBe(first);
      if (same) {
        h.player.push(ev("se", 12, { id: same.id }));
        expect(h.player.stats().preempted).toBe(1);
        expect(h.ctx.sources.length).toBe(first + 1);
        expect(h.ctx.sources[0]!.stops.length).toBe(1);
      }
      // Once the high one has ended, the low one starts.
      h.time.now = 200;
      h.ctx.currentTime = 200;
      h.player.push(ev("se", 6000, { id: low.id }));
      expect(h.player.stats().blocked).toBe(1);
    }
  });

  it("SE3 is not priority-checked: any new song replaces the playing one", async () => {
    const list = onPlayer(3);
    if (list.length < 2) return;
    const high = [...list].sort((a, b) => b.priority - a.priority)[0]!;
    const low = [...list].sort((a, b) => a.priority - b.priority)[0]!;
    if (high.priority === low.priority) return;
    const h = harness();
    await flush();
    h.player.push(ev("se", 10, { id: high.id }));
    h.player.push(ev("se", 11, { id: low.id }));
    expect(h.player.stats().blocked).toBe(0);
    expect(h.player.stats().preempted).toBe(1);
  });

  it("starts SEs at the event frame on the 59.7275 Hz clock plus latency and the file's onset", async () => {
    const h = harness({ latency: 0.03 });
    await flush();
    h.player.push(ev("se", 100, { id: 5 }));
    h.time.now = 102;
    h.ctx.currentTime = 102;
    h.player.push(ev("se", 220, { id: 9 }));
    const [a, b] = h.ctx.sources;
    const onset = sounds["se:5:none"]!.onsetSamples / sounds["se:5:none"]!.sampleRate;
    expect(a!.starts[0]!.when).toBeCloseTo(100 + 0.03 + onset, 4);
    expect(a!.starts[0]!.offset).toBeCloseTo(0, 6);
    expect(a!.starts[0]!.duration).toBeCloseTo(sounds["se:5:none"]!.lengthSamples / sounds["se:5:none"]!.sampleRate, 5);
    const onset9 = sounds["se:9:none"]!.onsetSamples / sounds["se:9:none"]!.sampleRate;
    expect(b!.starts[0]!.when).toBeCloseTo(100 + 0.03 + 120 / FRAME_HZ + onset9, 4);
  });

  it("uses the pan variant file, and the nearest one when the exact pan was not recorded", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("se", 10, { id: 12, pan: -64 }));
    h.player.push(ev("se", 400, { id: 13, pan: 50 }));
    await flush();
    expect(h.fetched.some((u) => u.includes("se-012-panm64"))).toBe(true);
    expect(h.ctx.sources.length).toBe(2);
  });
});

describe("BGM: duck, fade, pause / continue, loops", () => {
  it("duck events move the BGM bus gain to volume / 256, and a cry's unannounced end restores it", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("bgm", 1, { id: 469 }));
    await flush();
    const bus = h.ctx.gains[1]!;
    h.player.push(ev("duck", 50, { id: 469, volume: 85 }));
    expect(bus.gain.calls.at(-1)).toMatchObject({ op: "set", value: 85 / 256 });
    h.player.push(ev("cry", 50, { id: 1, mode: 0, pan: 0, volume: 120, priority: 10 }));
    h.time.now = 101;
    h.ctx.currentTime = 101;
    h.player.pump();
    expect(h.player.stats().duckRestores).toBe(0);
    h.time.now = 110;
    h.ctx.currentTime = 110;
    h.player.pump();
    expect(h.player.stats().duckRestores).toBe(1);
    expect(bus.gain.calls.at(-1)).toMatchObject({ op: "set", value: 1 });
    h.player.push(ev("duck", 900, { id: 469, volume: 85 }));
    h.player.push(ev("duck", 910, { id: 469, volume: 256 }));
    expect(bus.gain.calls.at(-1)).toMatchObject({ op: "set", value: 1 });
  });

  it("a cry is panned with the m4a law and the oldest cry is replaced when both players are busy", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("cry", 10, { id: 1, mode: 0, pan: 63, priority: 10 }));
    await flush();
    const gains = h.ctx.gains.filter((g) => g.gain.value !== 1);
    expect(gains.map((g) => g.gain.value).sort()).toEqual([m4aPanGains(63).left, m4aPanGains(63).right].sort());
    h.player.push(ev("cry", 12, { id: 4, mode: 0, pan: 0, priority: 10 }));
    h.player.push(ev("cry", 14, { id: 7, mode: 5, pan: 0, priority: 10 }));
    await flush();
    expect(h.player.stats().preempted).toBe(1);
    h.player.push(ev("stop", 16, { player: "cry" }));
    expect(h.ctx.sources.every((s) => s.stops.length > 0)).toBe(true);
  });

  it("fanfare: the BGM is paused, the fanfare plays on its own player, continue resumes the BGM where it stopped", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("bgm", 1, { id: 469 }));
    await flush();
    const bgmSources = (): FakeSource[] => h.ctx.sources.filter((s) => s.loop || s.starts[0]?.duration === undefined || s.starts[0]!.duration! > 5);
    const started = bgmSources().length;
    expect(started).toBeGreaterThan(0);
    const t0 = h.player.stats().sources;
    h.time.now = 105;
    h.ctx.currentTime = 105;
    h.player.push(ev("stop", 3000, { id: 469, player: "BGM" }));
    expect(h.ctx.sources.slice(0, started).every((s) => s.stops.length > 0)).toBe(true);
    h.player.push(ev("fanfare", 3000, { id: 368 }));
    await flush();
    const fan = h.ctx.sources.find((s) => s.starts[0]?.duration !== undefined && Math.abs(s.starts[0].duration - sounds["fanfare:368"]!.lengthSamples / sounds["fanfare:368"]!.sampleRate) < 1e-4)!;
    expect(fan).toBeDefined();
    expect(h.player.stats().started.fanfare).toBe(1);
    h.time.now = 108;
    h.ctx.currentTime = 108;
    h.player.push(ev("continue", 3180, { id: 469, player: "BGM" }));
    await flush();
    const resumed = h.ctx.sources.slice(t0 + 1);
    expect(resumed.length).toBeGreaterThan(0);
    // The pause happened ~5.04 s after the BGM's first sample... wherever it was, the resumed source starts at that position, not at 0.
    expect(resumed[0]!.starts[0]!.offset).toBeGreaterThan(1);
    expect(h.player.stats().started.bgm).toBe(1);
  });

  it("a new BGM song replaces the BGM player even while the old one is paused", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("bgm", 1, { id: 469 }));
    h.player.push(ev("stop", 30, { id: 469, player: "BGM" }));
    h.player.push(ev("bgm", 60, { id: 476 }));
    expect(h.player.stats().preempted).toBe(1);
    h.player.push(ev("continue", 90, { id: 476, player: "BGM" }));
    await flush();
    expect(h.player.stats().started.bgm).toBe(2);
  });

  it("fade-out ramps the BGM to 0 over 16 * speed frames and stops the sources at the end", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("bgm", 1, { id: 469 }));
    await flush();
    h.time.now = 101;
    h.ctx.currentTime = 101;
    h.player.push(ev("fade", 300, { id: 469, player: "BGM", speed: 5 }));
    const out = h.ctx.gains.find((g) => g.gain.calls.some((c) => c.op === "ramp" && c.value === 0 && c.time - 100 > 1))!;
    expect(out).toBeDefined();
    const ramp = out.gain.calls.filter((c) => c.op === "ramp" && c.value === 0).at(-1)!;
    const set = out.gain.calls.filter((c) => c.op === "set" && c.value === 1).at(-1)!;
    expect(ramp.time - set.time).toBeCloseTo((16 * 5) / FRAME_HZ, 4);
    expect(h.ctx.sources[0]!.stops.at(-1)).toBeCloseTo(ramp.time + 0.004, 4);
  });

  it("fade-in (a bgm event with speed) ramps up from silence", async () => {
    const h = harness();
    await flush();
    h.player.push(ev("bgm", 1, { id: 469, speed: 4 }));
    await flush();
    const out = h.ctx.gains.find((g) => g.gain.calls.some((c) => c.op === "ramp" && c.value === 1))!;
    expect(out).toBeDefined();
  });

  it("exact loops use the native loop points; the four non-exact wraps are crossfaded 5-10 ms", async () => {
    const loops = Object.entries(sounds).filter(([, s]) => s.loops === true);
    expect(loops.map(([k]) => k).sort()).toEqual(["bgm:354", "bgm:412", "bgm:469", "bgm:476", "se:132:63", "se:90:none"]);
    for (const [key, sound] of loops) {
      const h = harness();
      await flush();
      const id = Number(key.split(":")[1]);
      const pan = key.split(":")[2] === "63" ? 63 : null;
      h.player.push(ev(key.startsWith("bgm:") ? "bgm" : "se", 1, { id, pan }));
      await flush();
      const rate = sound.sampleRate;
      const exact = key === "bgm:354" || key === "se:132:63";
      if (exact) {
        expect(h.ctx.sources.length, key).toBe(1);
        const src = h.ctx.sources[0]!;
        expect(src.loop).toBe(true);
        expect(src.loopStart).toBeCloseTo(sound.loopStartSamples! / rate, 6);
        expect(src.loopEnd).toBeCloseTo(sound.loopEndSamples! / rate, 6);
        continue;
      }
      // The lookahead scheduler adds the later passes (bgm:476's intro alone is longer than its 90 s lookahead).
      h.time.now = 140;
      h.ctx.currentTime = 140;
      h.player.pump();
      expect(h.ctx.sources.length, key).toBeGreaterThanOrEqual(2);
      const [first, second] = h.ctx.sources;
      expect(first!.loop).toBe(false);
      expect(first!.starts[0]!.duration).toBeCloseTo(sound.loopEndSamples! / rate, 4);
      const span = (sound.loopEndSamples! - sound.loopStartSamples!) / rate;
      const gainOf = (src: FakeSource): FakeGain => src.targets[0] as FakeGain;
      const fadeIn = gainOf(second!).gain.calls;
      const x = fadeIn.find((c) => c.op === "ramp")!.time - fadeIn.find((c) => c.op === "set")!.time;
      expect(x, key).toBeGreaterThanOrEqual(0.005);
      expect(x, key).toBeLessThanOrEqual(0.01);
      const fadeOut = gainOf(first!).gain.calls;
      expect(fadeOut.find((c) => c.op === "ramp")!.time - fadeOut.find((c) => c.op === "set")!.time).toBeCloseTo(x, 6);
      // Pass 1 starts one crossfade before pass 0 reaches the loop end, on the pre-loop samples when the file has them.
      expect(second!.starts[0]!.when! - first!.starts[0]!.when!, key).toBeCloseTo(sound.loopEndSamples! / rate - x, 4);
      const preLoop = sound.loopStartSamples! / rate >= x;
      expect(second!.starts[0]!.offset!, key).toBeCloseTo(sound.loopStartSamples! / rate - (preLoop ? x : 0), 4);
      const third = h.ctx.sources[2];
      if (third) expect(third.starts[0]!.when! - second!.starts[0]!.when!, key).toBeCloseTo(span - (preLoop ? 0 : x), 3);
    }
  });
});

describe("Ogg -> AAC fallback", () => {
  it("picks AAC when Ogg Vorbis cannot be played, adds the measured lead, and keeps offsets in seconds", async () => {
    const h = harness({ canPlayOgg: () => false });
    await flush();
    h.player.push(ev("se", 1, { id: 5 }));
    await flush();
    expect(h.fetched.some((u) => u.endsWith("se-005-nopan.m4a") || u.includes("aac/se-005-nopan"))).toBe(true);
    expect(h.fetched.every((u) => !u.endsWith(".ogg"))).toBe(true);
    const lead = bundledAssets.manifest.alt!.files["aac/se-005-nopan.m4a"]!.leadSamples / bundledAssets.manifest.alt!.sampleRates.se;
    const src = h.ctx.sources.find((s) => s.starts.length > 0)!;
    expect(src.starts[0]!.offset).toBeCloseTo(lead, 6);
    expect(h.player.stats().format).toBe("aac");
  });

  it("falls back to AAC for good when an Ogg decode fails", async () => {
    const h = harness();
    h.ctx.decodeFails = () => (h.fetched.at(-1) ?? "").endsWith(".ogg");
    await flush();
    h.player.push(ev("se", 1, { id: 5 }));
    await flush();
    const stats = h.player.stats();
    expect(stats.format).toBe("aac");
    expect(stats.fallbacks).toBeGreaterThan(0);
    expect(h.ctx.sources.length).toBeGreaterThan(0);
  });

  it("fetches from options.baseUrl when given", async () => {
    const h = harness({ baseUrl: "https://cdn.example/audio" });
    await flush();
    h.player.push(ev("se", 1, { id: 5 }));
    await flush();
    expect(h.fetched.every((u) => u.startsWith("https://cdn.example/audio/"))).toBe(true);
    expect(h.fetched).toContain("https://cdn.example/audio/se-005-nopan.ogg");
  });
});

describe("clock", () => {
  it("re-anchors when the game runs ahead of or behind the wall clock, and on reset", async () => {
    const h = harness({ latency: 0.03 });
    await flush();
    h.player.push(ev("se", 100, { id: 5 }));
    h.time.now = 100 + 5;
    h.ctx.currentTime = 105;
    h.player.push(ev("se", 101, { id: 9 }));
    const second = h.ctx.sources.at(-1)!;
    const onset = sounds["se:9:none"]!.onsetSamples / sounds["se:9:none"]!.sampleRate;
    expect(second.starts[0]!.when).toBeCloseTo(105 + 0.03 + onset, 4);
    h.player.reset();
    expect(h.ctx.sources.every((s) => s.stops.length > 0)).toBe(true);
  });
});
