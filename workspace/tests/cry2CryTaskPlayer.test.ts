// cry2: the player plays the cry-task modes (ROAR_1 / ROAR_2 / HIGH_PITCH / ECHO_START / ECHO_END) from their own recordings;
// NORMAL is only the fallback for a missing asset. Fake AudioContext, no browser.
import { describe, expect, it } from "vitest";
import { CRY_MODE_NAMES, createAudioPlayer, type AudioContextLike, type AudioPlayerOptions, type BufferSourceLike } from "../src/audio/player.ts";
import { bundledAssets, type PlayerAssets } from "../src/audio/playerAssets.ts";
import type { SoundEvent } from "../src/audio/soundEvents.ts";
import * as screenSounds from "../src/engine/screenSounds.ts";

class FakeParam {
  value = 1;
  setValueAtTime(value: number): void {
    this.value = value;
  }
  linearRampToValueAtTime(): void {}
  cancelScheduledValues(): void {}
}
class FakeNode {
  connect(): void {}
  disconnect(): void {}
}
class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}
class FakeSource extends FakeNode implements BufferSourceLike {
  buffer: { duration: number; url?: string } | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  starts: { when?: number; offset?: number; duration?: number }[] = [];
  start(when?: number, offset?: number, duration?: number): void {
    this.starts.push({ when, offset, duration });
  }
  stop(): void {}
}
class FakeContext implements AudioContextLike {
  currentTime = 100;
  state = "running";
  readonly destination = {};
  readonly sources: FakeSource[] = [];
  async resume(): Promise<void> {}
  createGain(): FakeGain {
    return new FakeGain();
  }
  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createChannelMerger(): FakeNode {
    return new FakeNode();
  }
  async decodeAudioData(bytes: ArrayBuffer): Promise<{ duration: number; url?: string }> {
    return { duration: 1000, url: new TextDecoder().decode(bytes) };
  }
}

function harness(assets: PlayerAssets = bundledAssets, options: Partial<AudioPlayerOptions> = {}) {
  const ctx = new FakeContext();
  const fetched: string[] = [];
  const player = createAudioPlayer({
    enabled: true,
    assets,
    gestureTarget: null,
    setTimer: () => 0,
    clearTimer: () => undefined,
    clock: () => 100,
    createContext: () => ctx,
    fetchBytes: async (url) => {
      fetched.push(url);
      return new TextEncoder().encode(url).buffer as ArrayBuffer;
    },
    canPlayOgg: () => true,
    ...options,
  });
  return { player, ctx, fetched };
}
const settle = async (): Promise<void> => {
  for (let i = 0; i < 12; i += 1) await new Promise<void>((resolve) => setTimeout(resolve, 0));
};
const cry = (frame: number, id: number, mode: number): SoundEvent => ({ kind: "cry", frame, id, pan: 0, mode, volume: 120, priority: 10 });

const sounds = bundledAssets.manifest.sounds;
const MODE_IDS: Record<string, number> = Object.fromEntries(Object.entries(CRY_MODE_NAMES).map(([id, name]) => [name, Number(id)]));
const TASK_MODES = ["ROAR_1", "ROAR_2", "HIGH_PITCH", "ECHO_START", "ECHO_END"];

describe("cry2: cry-task modes in the player", () => {
  it("maps the engine's CRY_MODE_* ids to the recorder's mode names", () => {
    expect(CRY_MODE_NAMES).toEqual({
      [screenSounds.CRY_MODE_NORMAL]: "NORMAL",
      [screenSounds.CRY_MODE_HIGH_PITCH]: "HIGH_PITCH",
      [screenSounds.CRY_MODE_ECHO_START]: "ECHO_START",
      [screenSounds.CRY_MODE_FAINT]: "FAINT",
      [screenSounds.CRY_MODE_ECHO_END]: "ECHO_END",
      [screenSounds.CRY_MODE_ROAR_1]: "ROAR_1",
      [screenSounds.CRY_MODE_ROAR_2]: "ROAR_2",
      [screenSounds.CRY_MODE_WEAK]: "WEAK",
    });
  });

  it("every recorded task mode resolves to its own slice of its own file, never the NORMAL sample", async () => {
    const keys = Object.keys(sounds).filter((k) => TASK_MODES.includes(k.split(":")[2]!));
    expect(keys.length).toBe(112);
    const h = harness();
    await settle();
    for (const [n, key] of keys.entries()) {
      const [, species, mode] = key.split(":");
      const before = h.ctx.sources.length;
      h.player.push(cry(10 + n * 100, Number(species), MODE_IDS[mode!]!));
      await settle();
      expect(h.ctx.sources.length, key).toBe(before + 1);
      const sound = sounds[key]!;
      const normal = sounds[`cry:${species}:NORMAL`]!;
      expect(sound.file, key).not.toBe(normal.file);
      const start = h.ctx.sources.at(-1)!.starts[0]!;
      expect(start.offset, key).toBeCloseTo(sound.offsetSamples / sound.sampleRate, 9);
      expect(start.duration, key).toBeCloseTo(sound.lengthSamples / sound.sampleRate, 9);
      expect(h.ctx.sources.at(-1)!.buffer!.url, key).toContain(sound.file);
    }
    expect(h.player.stats().missing).toBe(0);
    expect(h.player.stats().cryFallbacks).toBe(0);
  });

  it("the base modes still map to their own recordings (FAINT 5, WEAK 11, NORMAL 0)", async () => {
    const h = harness();
    await settle();
    for (const [n, [mode, name]] of [[0, "NORMAL"], [5, "FAINT"], [11, "WEAK"]].entries() as IterableIterator<[number, [number, string]]>) {
      h.player.push(cry(10 + n * 100, 6, mode));
      await settle();
      const sound = sounds[`cry:6:${name}`]!;
      expect(h.ctx.sources.at(-1)!.starts[0]!.offset).toBeCloseTo(sound.offsetSamples / sound.sampleRate, 9);
    }
    expect(h.player.stats().cryFallbacks).toBe(0);
  });

  it("a mode with no recording for the species falls back to its NORMAL cry (counted); a species with nothing is missing", async () => {
    const trimmed = Object.fromEntries(Object.entries(sounds).filter(([k]) => k !== "cry:6:ROAR_2" && !k.startsWith("cry:7:")));
    const h = harness({ ...bundledAssets, manifest: { ...bundledAssets.manifest, sounds: trimmed } });
    await settle();
    h.player.push(cry(10, 6, MODE_IDS.ROAR_2!));
    await settle();
    const normal = sounds["cry:6:NORMAL"]!;
    expect(h.ctx.sources.at(-1)!.starts[0]!.offset).toBeCloseTo(normal.offsetSamples / normal.sampleRate, 9);
    expect(h.ctx.sources.at(-1)!.buffer!.url).toContain(normal.file);
    expect(h.player.stats().cryFallbacks).toBe(1);
    h.player.push(cry(200, 6, MODE_IDS.ROAR_1!));
    await settle();
    const roar1 = sounds["cry:6:ROAR_1"]!;
    expect(h.ctx.sources.at(-1)!.starts[0]!.offset).toBeCloseTo(roar1.offsetSamples / roar1.sampleRate, 9);
    expect(h.player.stats().cryFallbacks).toBe(1);
    h.player.push(cry(300, 7, 0));
    await settle();
    expect(h.player.stats().missing).toBe(1);
    expect(h.player.stats().cryFallbacks).toBe(1);
  });

  it("a species outside the task set (no ROAR recording) falls back to NORMAL for an unexpected ROAR", async () => {
    expect(sounds["cry:1:ROAR_1"]).toBeUndefined();
    const h = harness();
    await settle();
    h.player.push(cry(10, 1, MODE_IDS.ROAR_1!));
    await settle();
    expect(h.ctx.sources.at(-1)!.buffer!.url).toContain(sounds["cry:1:NORMAL"]!.file);
    expect(h.player.stats().cryFallbacks).toBe(1);
  });

  it("the AAC twin set carries every task file", () => {
    const alt = bundledAssets.manifest.alt!;
    for (const key of Object.keys(sounds).filter((k) => TASK_MODES.includes(k.split(":")[2]!))) {
      expect(alt.files[`aac/${sounds[key]!.file.replace(/\.ogg$/, ".m4a")}`], key).toBeDefined();
    }
  });
});
