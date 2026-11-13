// aud244a / aud244b: the committed recorded-sound set (src/assets/gen/audio) is complete, well formed, within its size budget, and
// not reachable from the headless / library build graphs (the player that will use it is aud245).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIO = join(ROOT, "src/assets/gen/audio");

// Pinned budgets (bytes). The design estimate was cries ~3 MB, SEs < 2 MB; cries come in at ~4.5 MB (flat-spectrum 8-bit sample noise
// costs ~40 kbps even at the lowest Vorbis quality), see docs/aud244a-recorder-assets.md.
// aud244b adds the BGM / fanfare set (song, ~1.3 MB at 32768 Hz stereo) and the two looping SEs (in `se`).
const BUDGET = { se: 1_700_000, cry: 4_700_000, song: 1_400_000, total: 7_600_000 };

interface Sound {
  file: string; kind: "se" | "cry" | "bgm" | "fanfare"; via: string; sampleRate: number; channels: number; offsetSamples: number; lengthSamples: number;
  lengthFrames: number | null; onsetSamples: number; peak: number; rms: number; id?: number; name?: string; pan?: number | null;
  species?: number; mode?: string; loops?: boolean; loopStartSamples?: number; loopEndSamples?: number;
}
interface Manifest {
  schema: string; encoder: { package: string; format: string; vbrQuality: number }; sampleRates: { se: number; cry: number; song: number }; cryPackGapSamples: number;
  totals: { sounds: number; files: number; seBytes: number; cryBytes: number; songBytes: number; bytes: number };
  excluded: { key: string; reason: string }[]; sounds: Record<string, Sound>; files: Record<string, { bytes: number; sha256: string }>;
}
interface AssetList {
  se: { id: number; pan: number | null }[]; cry: { species: number; mode: string }[]; songs: { kind: string; id: number }[];
}

const manifest = JSON.parse(readFileSync(join(AUDIO, "manifest.json"), "utf8")) as Manifest;
const assetList = JSON.parse(readFileSync(join(ROOT, "tools/audio/aud244a-asset-list.json"), "utf8")) as AssetList;
const seKey = (id: number, pan: number | null): string => `se:${id}:${pan ?? "none"}`;

function oggInfo(path: string): { channels: number; rate: number; granule: number } {
  const b = readFileSync(path);
  expect(b.toString("latin1", 0, 4)).toBe("OggS");
  const payload = 27 + b[26]!;
  expect(b[payload]).toBe(1);
  expect(b.toString("latin1", payload + 1, payload + 7)).toBe("vorbis");
  const channels = b[payload + 11]!;
  const rate = b.readUInt32LE(payload + 12);
  const last = b.lastIndexOf("OggS", b.length - 4, "latin1");
  return { channels, rate, granule: Number(b.readBigUInt64LE(last + 6)) };
}

describe("aud244a/b audio manifest", () => {
  it("has the expected schema and consistent totals", () => {
    expect(manifest.schema).toBe("aud244b-audio-manifest/2");
    expect(manifest.encoder.format).toBe("ogg-vorbis");
    expect(manifest.sampleRates).toEqual({ se: 26758, cry: 13379, song: 32768 });
    const sounds = Object.entries(manifest.sounds);
    expect(manifest.totals.sounds).toBe(sounds.length);
    expect(manifest.totals.files).toBe(Object.keys(manifest.files).length);
    const bytes = (...kinds: string[]): number => Object.entries(manifest.files).filter(([f]) => kinds.some((k) => f.startsWith(`${k}-`))).reduce((s, [, v]) => s + v.bytes, 0);
    expect(manifest.totals.seBytes).toBe(bytes("se"));
    expect(manifest.totals.cryBytes).toBe(bytes("cry"));
    expect(manifest.totals.songBytes).toBe(bytes("bgm", "fanfare"));
    expect(manifest.totals.bytes).toBe(manifest.totals.seBytes + manifest.totals.cryBytes + manifest.totals.songBytes);
    for (const [key, s] of sounds) {
      expect(key.startsWith(`${s.kind}:`)).toBe(true);
      expect(s.sampleRate).toBe(s.kind === "cry" ? manifest.sampleRates.cry : s.kind === "se" && !s.loops ? manifest.sampleRates.se : manifest.sampleRates.song);
      expect(s.channels).toBe(s.kind === "cry" ? 1 : 2);
      expect(s.lengthSamples).toBeGreaterThan(0);
      if (s.loops) expect(s.lengthFrames).toBeNull();
      else expect(Number.isInteger(s.lengthFrames) && s.lengthFrames! > 0).toBe(true);
      expect(s.peak).toBeGreaterThan(0);
      expect(s.peak).toBeLessThan(32767);
      expect(s.rms).toBeGreaterThan(50);
      if (s.kind === "se") expect(key).toBe(seKey(s.id!, s.pan ?? null));
      else if (s.kind === "cry") expect(key).toBe(`cry:${s.species}:${s.mode}`);
      else expect(key).toBe(`${s.kind}:${s.id}`);
      expect(manifest.files[s.file]).toBeDefined();
    }
  });

  it("lists exactly the files on disk, with matching sizes, hashes and Vorbis headers", () => {
    const onDisk = readdirSync(AUDIO).filter((f) => f.endsWith(".ogg")).sort();
    expect(onDisk).toEqual(Object.keys(manifest.files).sort());
    for (const [file, meta] of Object.entries(manifest.files)) {
      const path = join(AUDIO, file);
      expect(statSync(path).size).toBe(meta.bytes);
      expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(meta.sha256);
    }
    const used = new Set(Object.values(manifest.sounds).map((s) => s.file));
    expect([...used].sort()).toEqual(Object.keys(manifest.files).sort());
  });

  it("keeps every sound inside its decoded file", () => {
    const info = new Map<string, ReturnType<typeof oggInfo>>();
    for (const file of Object.keys(manifest.files)) info.set(file, oggInfo(join(AUDIO, file)));
    const gap = manifest.cryPackGapSamples;
    const ends = new Map<string, number>();
    for (const s of Object.values(manifest.sounds)) {
      const i = info.get(s.file)!;
      expect(i.channels).toBe(s.channels);
      expect(i.rate).toBe(s.sampleRate);
      expect(s.offsetSamples + s.lengthSamples).toBeLessThanOrEqual(i.granule);
      if (s.kind !== "cry") expect(s.lengthSamples).toBe(i.granule);
      ends.set(s.file, Math.max(ends.get(s.file) ?? 0, s.offsetSamples + s.lengthSamples + (s.kind === "cry" ? gap : 0)));
    }
    for (const [file, end] of ends) if (file.startsWith("cry-")) expect(end).toBe(info.get(file)!.granule);
  });

  it("covers every Factory species x {NORMAL, WEAK, FAINT} and every logged SE tuple (or lists the exception)", () => {
    const excluded = new Map(manifest.excluded.map((e) => [e.key, e.reason]));
    const species = new Set(assetList.cry.map((c) => c.species));
    expect(species.size).toBe(376);
    for (const sp of species) for (const mode of ["NORMAL", "WEAK", "FAINT"]) expect(manifest.sounds[`cry:${sp}:${mode}`], `cry ${sp} ${mode}`).toBeDefined();
    expect(assetList.cry.length).toBe(species.size * 3);
    for (const r of assetList.se) {
      const key = seKey(r.id, r.pan);
      expect(manifest.sounds[key] !== undefined || excluded.has(key), key).toBe(true);
    }
    expect([...excluded.keys()]).toEqual([]);
    for (const key of ["se:132:63", "se:90:none"]) expect(manifest.sounds[key]?.loops, key).toBe(true);
    for (const r of assetList.songs) expect(manifest.sounds[`${r.kind}:${r.id}`], `${r.kind}:${r.id}`).toBeDefined();
    expect(Object.values(manifest.sounds).filter((s) => s.kind === "bgm" || s.kind === "fanfare").length).toBe(assetList.songs.length);
    expect(Object.values(manifest.sounds).filter((s) => s.kind === "cry").length).toBe(assetList.cry.length);
    expect(Object.values(manifest.sounds).filter((s) => s.kind === "se").length).toBe(assetList.se.length);
  });

  it("stays under the pinned size budget", () => {
    expect(manifest.totals.seBytes).toBeLessThanOrEqual(BUDGET.se);
    expect(manifest.totals.cryBytes).toBeLessThanOrEqual(BUDGET.cry);
    expect(manifest.totals.songBytes).toBeLessThanOrEqual(BUDGET.song);
    expect(manifest.totals.bytes).toBeLessThanOrEqual(BUDGET.total);
  });
});

describe("aud244a audio assets stay out of the headless / library build graphs", () => {
  // Static imports only: aud245's lib.ts reaches the player through a dynamic import(), pinned in audioHeadlessBoundary.test.ts.
  const SPEC = /(?:\bfrom\s*|\bimport\s+)["']([^"']+)["']/g;
  function resolveImport(from: string, spec: string): string | null {
    if (!spec.startsWith(".")) return null;
    const base = resolve(dirname(from), spec.replace(/\?.*$/, ""));
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.json`, join(base, "index.ts")]) {
      if (existsSync(cand) && statSync(cand).isFile()) return cand;
    }
    return null;
  }
  function closure(entry: string): Set<string> {
    const seen = new Set<string>();
    const stack = [resolve(ROOT, entry)];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      if (!/\.(ts|tsx|js)$/.test(f)) continue;
      // Type-only imports are erased by the build, so they are not graph edges.
      const source = readFileSync(f, "utf8").replace(/\b(?:import|export)\s+type\s+(?:[^;]*?\bfrom\s*)?["'][^"']+["']/g, "");
      for (const m of source.matchAll(SPEC)) {
        const r = resolveImport(f, m[1]!);
        if (r) stack.push(r);
      }
    }
    return seen;
  }

  for (const entry of ["src/headless.ts", "src/lib.ts"]) {
    it(`${entry} does not reach src/assets/gen/audio`, () => {
      const graph = closure(entry);
      expect(graph.size).toBeGreaterThan(10);
      expect([...graph].filter((f) => f.startsWith(`${AUDIO}/`))).toEqual([]);
    });
  }

  it("no source module or build config references the audio asset directory", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === "gen" ? [] : walk(join(dir, e.name))) : [join(dir, e.name)]));
    // aud245: the lazily-loaded player's asset module is the one source reference; the headless / sync graphs are pinned in audioHeadlessBoundary.test.ts.
    const offenders = walk(join(ROOT, "src")).filter((f) => /\.(ts|tsx|js)$/.test(f) && readFileSync(f, "utf8").includes("assets/gen/audio"));
    expect(offenders.map((f) => relative(ROOT, f))).toEqual(["src/audio/playerAssets.ts"]);
    for (const cfg of ["vite.lib.config.ts", "vite.headless.config.ts"]) expect(readFileSync(join(ROOT, cfg), "utf8")).not.toContain("gen/audio");
  });
});
