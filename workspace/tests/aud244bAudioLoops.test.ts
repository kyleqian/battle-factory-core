// aud244b: the BGM / fanfare / looping-SE entries in the committed audio manifest carry ROM-derived loop points and a measured seam.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "src/assets/gen/audio/manifest.json"), "utf8")) as {
  sampleRates: { song: number };
  sounds: Record<string, Record<string, any>>;
};
const sources = JSON.parse(readFileSync(join(ROOT, "tests/fixtures/data/audio-sound-sources.json"), "utf8")) as {
  songLoops: { songId: number; loops: boolean; loopStartTick: number; loopEndTick: number; tempoBpm: [number, number][] }[];
};

const BGM = [354, 412, 469, 471, 476];
const FANFARES = [368, 459, 466];
const LOOP_SES = ["se:132:63", "se:90:none"];
// One VBlank = 280896 cycles = 548.625 samples of the 32768 Hz (512-cycle) mixer output grid.
const SAMPLES_PER_FRAME = 280896 / 512;

describe("aud244b loop points", () => {
  it("loops exactly the five BGMs and the two looping SEs; fanfares are one-shot", () => {
    const looping = Object.entries(manifest.sounds).filter(([, s]) => s.loops).map(([k]) => k).sort();
    expect(looping).toEqual([...BGM.map((id) => `bgm:${id}`), ...LOOP_SES].sort());
    for (const id of FANFARES) {
      const s = manifest.sounds[`fanfare:${id}`]!;
      expect(s.loops).toBe(false);
      expect(s.loopStartSamples).toBeUndefined();
      expect(s.lengthFrames).toBeGreaterThan(0);
    }
  });

  it("stores loop points inside the file, with loopEnd at the end of the file", () => {
    for (const [key, s] of Object.entries(manifest.sounds).filter(([, v]) => v.loops)) {
      expect(s.sampleRate, key).toBe(manifest.sampleRates.song);
      expect(s.loopStartSamples, key).toBeGreaterThanOrEqual(0);
      expect(s.loopEndSamples, key).toBe(s.lengthSamples);
      expect(s.loopEndSamples - s.loopStartSamples, key).toBeGreaterThan(SAMPLES_PER_FRAME * 30);
      expect(s.lengthFrames, key).toBeNull();
    }
  });

  it("matches the ROM GOTO-target tick offsets: the loop body is whole passes of the song's loop period (+- 1 frame)", () => {
    const rom = new Map(sources.songLoops.map((r) => [r.songId, r]));
    for (const id of BGM) {
      const r = rom.get(id)!;
      const s = manifest.sounds[`bgm:${id}`]!;
      expect(r.loops).toBe(true);
      expect(s.loopStartTick).toBe(r.loopStartTick);
      expect(s.loopEndTick).toBe(r.loopEndTick);
      expect(s.tempoBpm).toBe(r.tempoBpm[r.tempoBpm.length - 1]![1]);
    }
    for (const key of [...BGM.map((id) => `bgm:${id}`), ...LOOP_SES]) {
      const s = manifest.sounds[key]!;
      const frames = (s.loopPasses * (s.loopEndTick - s.loopStartTick) * 150) / s.tempoBpm;
      expect(Math.abs(s.loopEndSamples - s.loopStartSamples - frames * SAMPLES_PER_FRAME), key).toBeLessThanOrEqual(SAMPLES_PER_FRAME);
    }
    expect(manifest.sounds["se:90:none"]).toMatchObject({ loopStartTick: 0, loopEndTick: 36, tempoBpm: 150 });
    expect(manifest.sounds["se:132:63"]).toMatchObject({ loopStartTick: 24, loopEndTick: 72, tempoBpm: 150 });
  });

  it("starts the loop where the ROM's loop starts: loopStart sits at the GOTO-target tick (file time = ROM time minus the trimmed mixer onset, +- 2 frames)", () => {
    for (const key of ["bgm:354", "bgm:412", "bgm:469", "bgm:471", "bgm:476", "se:132:63"]) {
      const s = manifest.sounds[key]!;
      const frames = (s.loopStartTick * 150) / s.tempoBpm;
      expect(Math.abs(s.loopStartSamples - (frames * SAMPLES_PER_FRAME - s.onsetSamples)), key).toBeLessThanOrEqual(2 * SAMPLES_PER_FRAME);
    }
    expect(manifest.sounds["se:90:none"]!.loopStartSamples).toBe(0);
  });

  it("records a measured seam: sample-exact for SE_M_GUST, bounded and reported for the rest", () => {
    const gust = manifest.sounds["se:132:63"]!.seam;
    expect(gust.maxAbsDiff).toBeLessThanOrEqual(200);
    expect(gust.rmsDiff).toBeLessThan(2);
    expect(gust.shortMaxAbsDiff).toBeLessThanOrEqual(8);
    for (const key of [...BGM.map((id) => `bgm:${id}`), ...LOOP_SES]) {
      const seam = manifest.sounds[key]!.seam;
      expect(seam.windowSamples, key).toBeGreaterThanOrEqual(4096);
      expect(seam.rmsDiff, key).toBeLessThan(0.6 * seam.bodyRms);
      expect(seam.maxAbsDiff, key).toBeLessThan(2 * manifest.sounds[key]!.peak);
    }
  });
});
