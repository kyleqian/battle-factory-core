// aud244a: the committed recorded-sound set (src/assets/gen/audio) is complete, well formed, within its size budget, and
// not reachable from the headless / library build graphs (the player that will use it is aud245).
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const AUDIO = join(ROOT, "src/assets/gen/audio");

// Pinned budgets (bytes). The design estimate was cries ~3 MB, SEs < 2 MB; cries come in at ~4.5 MB (flat-spectrum 8-bit sample noise
// costs ~40 kbps even at the lowest Vorbis quality), see docs/aud244a-recorder-assets.md.
const BUDGET = { se: 1_700_000, cry: 4_700_000, total: 6_400_000 };

interface Sound {
  file: string; kind: "se" | "cry"; via: string; sampleRate: number; channels: number; offsetSamples: number; lengthSamples: number;
  lengthFrames: number | null; onsetSamples: number; peak: number; rms: number; id?: number; name?: string; pan?: number | null;
  species?: number; mode?: string;
}
interface Manifest {
  schema: string; encoder: { package: string; format: string; vbrQuality: number }; sampleRates: { se: number; cry: number }; cryPackGapSamples: number;
  totals: { sounds: number; files: number; seBytes: number; cryBytes: number; bytes: number };
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

describe("aud244a audio manifest", () => {
  it("has the expected schema and consistent totals", () => {
    expect(manifest.schema).toBe("aud244a-audio-manifest/1");
    expect(manifest.encoder.format).toBe("ogg-vorbis");
    expect(manifest.sampleRates).toEqual({ se: 26758, cry: 13379 });
    const sounds = Object.entries(manifest.sounds);
    expect(manifest.totals.sounds).toBe(sounds.length);
    expect(manifest.totals.files).toBe(Object.keys(manifest.files).length);
    const bytes = (kind: "se" | "cry"): number => Object.entries(manifest.files).filter(([f]) => f.startsWith(`${kind}-`)).reduce((s, [, v]) => s + v.bytes, 0);
    expect(manifest.totals.seBytes).toBe(bytes("se"));
    expect(manifest.totals.cryBytes).toBe(bytes("cry"));
    expect(manifest.totals.bytes).toBe(manifest.totals.seBytes + manifest.totals.cryBytes);
    for (const [key, s] of sounds) {
      expect(key.startsWith(`${s.kind}:`)).toBe(true);
      expect(s.sampleRate).toBe(s.kind === "se" ? manifest.sampleRates.se : manifest.sampleRates.cry);
      expect(s.channels).toBe(s.kind === "se" ? 2 : 1);
      expect(s.lengthSamples).toBeGreaterThan(0);
      expect(Number.isInteger(s.lengthFrames) && s.lengthFrames! > 0).toBe(true);
      expect(s.peak).toBeGreaterThan(0);
      expect(s.peak).toBeLessThan(32767);
      expect(s.rms).toBeGreaterThan(50);
      if (s.kind === "se") expect(key).toBe(seKey(s.id!, s.pan ?? null));
      else expect(key).toBe(`cry:${s.species}:${s.mode}`);
      expect(manifest.files[s.file]).toBeDefined();
    }
  });

  it("lists exactly the files on disk, with matching sizes, hashes and Vorbis headers", () => {
    const onDisk = readdirSync(AUDIO).filter((f) => f !== "manifest.json").sort();
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
      if (s.kind === "se") expect(s.lengthSamples).toBe(i.granule);
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
    expect([...excluded.keys()].sort()).toEqual(["se:132:63", "se:90:none"]);
    for (const key of excluded.keys()) expect(manifest.sounds[key]).toBeUndefined();
    expect(Object.values(manifest.sounds).filter((s) => s.kind === "cry").length).toBe(assetList.cry.length);
    expect(Object.values(manifest.sounds).filter((s) => s.kind === "se").length).toBe(assetList.se.length - excluded.size);
  });

  it("stays under the pinned size budget", () => {
    expect(manifest.totals.seBytes).toBeLessThanOrEqual(BUDGET.se);
    expect(manifest.totals.cryBytes).toBeLessThanOrEqual(BUDGET.cry);
    expect(manifest.totals.bytes).toBeLessThanOrEqual(BUDGET.total);
  });
});

describe("aud244a audio assets stay out of the headless / library build graphs", () => {
  const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
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
      for (const m of readFileSync(f, "utf8").matchAll(SPEC)) {
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
    const offenders = walk(join(ROOT, "src")).filter((f) => /\.(ts|tsx|js)$/.test(f) && readFileSync(f, "utf8").includes("assets/gen/audio"));
    expect(offenders).toEqual([]);
    for (const cfg of ["vite.config.ts", "vite.lib.config.ts", "vite.headless.config.ts"]) expect(readFileSync(join(ROOT, cfg), "utf8")).not.toContain("gen/audio");
  });
});
