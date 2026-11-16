// Dev-time extractor (aud244a/b): raw recorder WAVs -> src/assets/gen/audio/*.ogg + manifest.json.
// Never imported at runtime. Needs the python recorder only when the raw WAVs are missing (or with --record):
//   MGBA_PYTHON (default /srv/pokebench/vendor/mgba-venv/bin/python) runs tools/audio/soundRecorder.py.
// Raw WAVs live in the ignored .integration/evidence/aud244a/raw (a Mac without the mGBA venv just encodes the committed
// raw set it is handed, or keeps the committed .ogg files).
// aud244b: BGM / fanfare / looping-SE recordings (32768 Hz, ROM loop points cut by tools/audio/loopCut.py) come from
// .integration/evidence/aud244b/cut (raw passes in .../full32); the recorder needs PYTHONPATH=<vendor>/libmgba-py in a worktree.
//
//   node --experimental-strip-types tools/extract/extract-audio.ts [--raw DIR] [--loops DIR] [--out DIR] [--record] [--quality Q]
// (or `npm run extract:audio`).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createOggEncoder } from "wasm-media-encoders";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
function opt(name: string, fallback: string): string {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const v = argv[i + 1];
  if (!v) throw new Error(`${name} requires a value`);
  return v;
}
const abs = (p: string): string => (isAbsolute(p) ? p : join(ROOT, p));
const RAW = abs(opt("--raw", ".integration/evidence/aud244a/raw"));
const LOOPS = abs(opt("--loops", ".integration/evidence/aud244b/cut"));
const LOOPS_FULL = abs(opt("--loops-full", ".integration/evidence/aud244b/full32"));
const OUT = abs(opt("--out", "src/assets/gen/audio"));
const QUALITY = Number(opt("--quality", "-0.1"));
const MGBA_PYTHON = process.env.MGBA_PYTHON ?? "/srv/pokebench/vendor/mgba-venv/bin/python";
const SE_RATE = 26758; // PSG-bearing SEs keep content above the 13379 Hz ROM-mix Nyquist
const CRY_RATE = 13379; // cries are DirectSound-only: the ROM mix rate is lossless for them
const SONG_RATE = 32768; // BGM / fanfares / looping SEs: the native GBA mixer output grid (512 cycles), the only rate with sample-exact ROM loop periods
const SONG_PASSES = 6; // ROM loop passes recorded for the loop search
const PACK_GAP = 1024; // zero samples between sounds packed in one cry file (Vorbis window overlap)

interface RawMeta {
  key: string; kind: "se" | "cry"; via: string; viasInLogs: string[]; file: string; rate: number; lengthFrames: number | null;
  capped: boolean; lengthSamples: number; onsetSamples: number; channels: number; peak: number; rms: number; clipped: number;
  sha256: string; id?: number; name?: string; pan?: number | null; species?: number; mode?: string;
}
interface LoopMeta {
  key: string; kind: "bgm" | "fanfare" | "seloop"; via: string; name: string; songId: number; rate: number; channels: number; onsetSamples: number;
  lengthFrames: number | null; lengthSamples: number; file: string; peak: number; rms: number; loops: boolean; fullSha256: string;
  loop: { loops: boolean; loopStartTick: number | null; loopEndTick: number | null; tempoBpm: number };
  loopStartSamples?: number; loopEndSamples?: number; loopPasses?: number; sourcePass?: number; nominalEndShift?: number; seamWindowSamples?: number;
  seamMaxAbsDiff?: number; seamRmsDiff?: number; seamShortMaxAbsDiff?: number; seamShortRmsDiff?: number; junctionMaxAbsDiff?: number | null; bodyRms?: number;
}

function record(): void {
  const list = join(ROOT, "tools/audio/aud244a-asset-list.json");
  execFileSync("python3", [join(ROOT, "tools/audio/audioAssetList.py")], { cwd: ROOT, stdio: "inherit" });
  for (const [kinds, rate] of [["se", SE_RATE], ["cry", CRY_RATE]] as const) {
    execFileSync(MGBA_PYTHON, [join(ROOT, "tools/audio/soundRecorder.py"), list, RAW, "--kinds", kinds, "--rate", String(rate), "--force"], {
      cwd: ROOT, stdio: "inherit", env: { ...process.env, MGBA_LOG: "/dev/null" },
    });
  }
  execFileSync(MGBA_PYTHON, [join(ROOT, "tools/audio/soundRecorder.py"), list, LOOPS_FULL, "--kinds", "bgm,fanfare,seloop", "--rate", String(SONG_RATE), "--passes", String(SONG_PASSES), "--force"], {
    cwd: ROOT, stdio: "inherit", env: { ...process.env, MGBA_LOG: "/dev/null" },
  });
  execFileSync("python3", [join(ROOT, "tools/audio/loopCut.py"), LOOPS_FULL, LOOPS], { cwd: ROOT, stdio: "inherit" });
}

function readWav(path: string): { channels: number; rate: number; samples: Int16Array } {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 4) !== "RIFF" || b.readUInt16LE(34) !== 16 || b.toString("latin1", 36, 40) !== "data") throw new Error(`unexpected WAV layout: ${path}`);
  const n = b.readUInt32LE(40) / 2;
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) samples[i] = b.readInt16LE(44 + 2 * i);
  return { channels: b.readUInt16LE(22), rate: b.readUInt32LE(24), samples };
}

const encoder = await createOggEncoder();
function encodeOgg(channels: Float32Array[], sampleRate: number): Uint8Array {
  encoder.configure({ channels: channels.length, sampleRate, vbrQuality: QUALITY });
  const head = encoder.encode(channels).slice();
  const tail = encoder.finalize().slice();
  const out = new Uint8Array(head.length + tail.length);
  out.set(head, 0);
  out.set(tail, head.length);
  return pinOggSerial(out);
}
// libvorbis picks a random stream serial; pin it (and redo each page CRC) so reruns are byte-identical.
const OGG_CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1;
    t[i] = r >>> 0;
  }
  return t;
})();
function pinOggSerial(b: Uint8Array): Uint8Array {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  for (let p = 0; p < b.length; ) {
    if (b[p] !== 0x4f || b[p + 1] !== 0x67 || b[p + 2] !== 0x67 || b[p + 3] !== 0x53) throw new Error("bad Ogg page");
    const segs = b[p + 26]!;
    let size = 27 + segs;
    for (let i = 0; i < segs; i++) size += b[p + 27 + i]!;
    v.setUint32(p + 14, 0x61756434, true);
    v.setUint32(p + 22, 0, true);
    let crc = 0;
    for (let i = p; i < p + size; i++) crc = ((crc << 8) ^ OGG_CRC[((crc >>> 24) ^ b[i]!) & 0xff]!) >>> 0;
    v.setUint32(p + 22, crc, true);
    p += size;
  }
  return b;
}
const sha = (b: Uint8Array): string => createHash("sha256").update(b).digest("hex");

const hasJson = (d: string): boolean => existsSync(d) && readdirSync(d).some((f) => f.endsWith(".json"));
if (argv.includes("--record") || !hasJson(RAW) || !hasJson(LOOPS)) record();

const metas: RawMeta[] = readdirSync(RAW).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(RAW, f), "utf8")) as RawMeta);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sounds: Record<string, Record<string, unknown>> = {};
const files: Record<string, { bytes: number; sha256: string }> = {};
const excluded: { key: string; reason: string }[] = [];
const totals = { se: 0, cry: 0, song: 0 };

function writeOgg(name: string, data: Uint8Array, kind: "se" | "cry" | "song"): void {
  writeFileSync(join(OUT, name), data);
  files[name] = { bytes: data.length, sha256: sha(data) };
  totals[kind] += data.length;
}
const f32 = (s: Int16Array, ch: number, c: number): Float32Array => {
  const out = new Float32Array(s.length / ch);
  for (let i = 0; i < out.length; i++) out[i] = s[i * ch + c]! / 32768;
  return out;
};
const common = (m: RawMeta, file: string, offset: number) => ({
  file, kind: m.kind, via: m.via, sampleRate: m.rate, channels: m.channels, offsetSamples: offset, lengthSamples: m.lengthSamples,
  lengthFrames: m.lengthFrames, onsetSamples: m.onsetSamples, peak: m.peak, rms: m.rms,
});

const cryBySpecies = new Map<number, RawMeta[]>();
for (const m of metas) {
  if (m.capped) continue; // the two looping SEs: recorded by the aud244b loop pass below
  if (m.kind === "se") {
    const w = readWav(join(RAW, m.file));
    const name = m.file.replace(/\.wav$/, ".ogg");
    writeOgg(name, encodeOgg(Array.from({ length: w.channels }, (_, c) => f32(w.samples, w.channels, c)), w.rate), "se");
    sounds[m.key] = { ...common(m, name, 0), id: m.id, name: m.name, pan: m.pan ?? null };
  } else {
    const list = cryBySpecies.get(m.species!) ?? [];
    list.push(m);
    cryBySpecies.set(m.species!, list);
  }
}
// cry2: the cry-task modes (Roar / Howl / Hyper Voice) are packed per species into a second file, `cry-NNN-task.ogg`, so the
// base cry files stay byte-identical and an ordinary cry never fetches the task modes.
const MODE_ORDER = ["NORMAL", "WEAK", "FAINT", "ROAR_1", "ROAR_2", "HIGH_PITCH", "ECHO_START", "ECHO_END"];
const BASE_MODES = new Set(["NORMAL", "WEAK", "FAINT"]);
for (const [species, all] of [...cryBySpecies].sort((a, b) => a[0] - b[0])) {
  for (const task of [false, true]) {
    const list = all.filter((m) => BASE_MODES.has(m.mode!) !== task);
    if (list.length === 0) continue;
    list.sort((a, b) => MODE_ORDER.indexOf(a.mode!) - MODE_ORDER.indexOf(b.mode!));
    const parts: Int16Array[] = [];
    let offset = 0;
    const name = `cry-${String(species).padStart(3, "0")}${task ? "-task" : ""}.ogg`;
    for (const m of list) {
      const w = readWav(join(RAW, m.file));
      if (w.channels !== 1 || w.rate !== CRY_RATE || w.samples.length !== m.lengthSamples) throw new Error(`unexpected cry WAV ${m.file}`);
      sounds[m.key] = { ...common(m, name, offset), species, name: m.name, mode: m.mode };
      parts.push(w.samples, new Int16Array(PACK_GAP));
      offset += w.samples.length + PACK_GAP;
    }
    const packed = new Int16Array(offset);
    let o = 0;
    for (const p of parts) {
      packed.set(p, o);
      o += p.length;
    }
    writeOgg(name, encodeOgg([f32(packed, 1, 0)], CRY_RATE), "cry");
  }
}

const loopMetas: LoopMeta[] = readdirSync(LOOPS).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(LOOPS, f), "utf8")) as LoopMeta);
const cappedKeys = metas.filter((m) => m.capped).map((m) => m.key).sort();
const loopSeKeys = loopMetas.filter((m) => m.kind === "seloop").map((m) => m.key).sort();
if (JSON.stringify(cappedKeys) !== JSON.stringify(loopSeKeys)) throw new Error(`looping SEs in ${RAW} (${cappedKeys}) != in ${LOOPS} (${loopSeKeys})`);
for (const m of loopMetas) {
  const w = readWav(join(LOOPS, m.file));
  if (w.channels !== 2 || w.rate !== SONG_RATE || w.samples.length / 2 !== m.lengthSamples) throw new Error(`unexpected loop WAV ${m.file}`);
  const name = m.file.replace(/\.wav$/, ".ogg");
  writeOgg(name, encodeOgg([f32(w.samples, 2, 0), f32(w.samples, 2, 1)], SONG_RATE), m.kind === "seloop" ? "se" : "song");
  const kind = m.kind === "seloop" ? "se" : m.kind;
  const pan = m.kind === "seloop" ? (m.key.endsWith(":none") ? null : Number(m.key.split(":")[2])) : undefined;
  const loop = m.loops
    ? {
        loops: true, loopStartSamples: m.loopStartSamples, loopEndSamples: m.loopEndSamples, loopPasses: m.loopPasses, loopStartTick: m.loop.loopStartTick, loopEndTick: m.loop.loopEndTick,
        tempoBpm: m.loop.tempoBpm,
        seam: { windowSamples: m.seamWindowSamples, maxAbsDiff: m.seamMaxAbsDiff, rmsDiff: m.seamRmsDiff, shortMaxAbsDiff: m.seamShortMaxAbsDiff, shortRmsDiff: m.seamShortRmsDiff, junctionMaxAbsDiff: m.junctionMaxAbsDiff ?? null, bodyRms: m.bodyRms, sourcePass: m.sourcePass, nominalEndShift: m.nominalEndShift },
      }
    : { loops: false };
  sounds[m.key] = {
    file: name, kind, via: m.via, sampleRate: SONG_RATE, channels: 2, offsetSamples: 0, lengthSamples: m.lengthSamples, lengthFrames: m.lengthFrames, onsetSamples: m.onsetSamples,
    peak: m.peak, rms: m.rms, id: m.songId, name: m.name, ...(pan !== undefined ? { pan } : {}), ...loop,
  };
}

const sorted = Object.fromEntries(Object.entries(sounds).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
const manifest = {
  schema: "aud244b-audio-manifest/2",
  encoder: { package: "wasm-media-encoders@0.7.0", format: "ogg-vorbis", vbrQuality: QUALITY },
  sampleRates: { se: SE_RATE, cry: CRY_RATE, song: SONG_RATE },
  cryPackGapSamples: PACK_GAP,
  note: "Cries are packed per species (NORMAL, WEAK, FAINT) in one mono file, and the cry-task modes (ROAR_1, ROAR_2, HIGH_PITCH, ECHO_START, ECHO_END; only species that can use Roar / Howl / Hyper Voice) in a second one, cry-NNN-task.ogg; a sound is samples [offsetSamples, offsetSamples + lengthSamples) of its file. SEs are one stereo file per (id, pan). Leading/trailing near-silence is trimmed; onsetSamples is the trimmed ROM mixer latency at the file's sampleRate. aud244b: BGM (bgm:<song>), fanfares (fanfare:<song>) and the two looping SEs (se:90:none, se:132:63) are stereo at sampleRates.song. A sound with loops=true plays samples [0, loopEndSamples) once and then repeats [loopStartSamples, loopEndSamples) until stopped; lengthSamples === loopEndSamples. Fanfares are one-shot (loops=false). seam.* is the measured sample difference between the audio after the wrap and the audio after the loop start (see docs/aud244b-bgm-fanfare-loops.md).",
  totals: { sounds: Object.keys(sorted).length, files: Object.keys(files).length, seBytes: totals.se, cryBytes: totals.cry, songBytes: totals.song, bytes: totals.se + totals.cry + totals.song },
  excluded,
  sounds: sorted,
  files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`${manifest.totals.sounds} sounds in ${manifest.totals.files} files; se ${totals.se} B, cry ${totals.cry} B, song ${totals.song} B, total ${manifest.totals.bytes} B; excluded ${excluded.length}`);
