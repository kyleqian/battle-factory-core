// Dev-time extractor (aud244a): raw recorder WAVs -> src/assets/gen/audio/*.ogg + manifest.json.
// Never imported at runtime. Needs the python recorder only when the raw WAVs are missing (or with --record):
//   MGBA_PYTHON (default /srv/pokebench/vendor/mgba-venv/bin/python) runs tools/audio/soundRecorder.py.
// Raw WAVs live in the ignored .integration/evidence/aud244a/raw (a Mac without the mGBA venv just encodes the committed
// raw set it is handed, or keeps the committed .ogg files).
//
//   node --experimental-strip-types tools/extract/extract-audio.ts [--raw DIR] [--out DIR] [--record] [--quality Q]
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
const OUT = abs(opt("--out", "src/assets/gen/audio"));
const QUALITY = Number(opt("--quality", "-0.1"));
const MGBA_PYTHON = process.env.MGBA_PYTHON ?? "/srv/pokebench/vendor/mgba-venv/bin/python";
const SE_RATE = 26758; // PSG-bearing SEs keep content above the 13379 Hz ROM-mix Nyquist
const CRY_RATE = 13379; // cries are DirectSound-only: the ROM mix rate is lossless for them
const PACK_GAP = 1024; // zero samples between sounds packed in one cry file (Vorbis window overlap)

interface RawMeta {
  key: string; kind: "se" | "cry"; via: string; viasInLogs: string[]; file: string; rate: number; lengthFrames: number | null;
  capped: boolean; lengthSamples: number; onsetSamples: number; channels: number; peak: number; rms: number; clipped: number;
  sha256: string; id?: number; name?: string; pan?: number | null; species?: number; mode?: string;
}

function record(): void {
  const list = join(ROOT, "tools/audio/aud244a-asset-list.json");
  execFileSync("python3", [join(ROOT, "tools/audio/audioAssetList.py")], { cwd: ROOT, stdio: "inherit" });
  for (const [kinds, rate] of [["se", SE_RATE], ["cry", CRY_RATE]] as const) {
    execFileSync(MGBA_PYTHON, [join(ROOT, "tools/audio/soundRecorder.py"), list, RAW, "--kinds", kinds, "--rate", String(rate), "--force"], {
      cwd: ROOT, stdio: "inherit", env: { ...process.env, MGBA_LOG: "/dev/null" },
    });
  }
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

if (argv.includes("--record") || !existsSync(RAW) || !readdirSync(RAW).some((f) => f.endsWith(".json"))) record();

const metas: RawMeta[] = readdirSync(RAW).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(RAW, f), "utf8")) as RawMeta);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const sounds: Record<string, Record<string, unknown>> = {};
const files: Record<string, { bytes: number; sha256: string }> = {};
const excluded: { key: string; reason: string }[] = [];
const totals = { se: 0, cry: 0 };

function writeOgg(name: string, data: Uint8Array, kind: "se" | "cry"): void {
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
  if (m.capped) {
    excluded.push({ key: m.key, reason: `${m.name} never goes inactive within the recorder cap (loops until stopped); needs the aud244b loop treatment` });
    continue;
  }
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
const MODE_ORDER = ["NORMAL", "WEAK", "FAINT"];
for (const [species, list] of [...cryBySpecies].sort((a, b) => a[0] - b[0])) {
  list.sort((a, b) => MODE_ORDER.indexOf(a.mode!) - MODE_ORDER.indexOf(b.mode!));
  const parts: Int16Array[] = [];
  let offset = 0;
  const name = `cry-${String(species).padStart(3, "0")}.ogg`;
  for (const m of list) {
    const w = readWav(join(RAW, m.file));
    if (w.channels !== 1 || w.rate !== CRY_RATE || w.samples.length !== m.lengthSamples) throw new Error(`unexpected cry WAV ${m.file}`);
    sounds[m.key] = { ...common(m, name, offset), species, name: m.name, mode: m.mode };
    parts.push(w.samples, new Int16Array(PACK_GAP));
    offset += w.samples.length + PACK_GAP;
  }
  const all = new Int16Array(offset);
  let o = 0;
  for (const p of parts) {
    all.set(p, o);
    o += p.length;
  }
  writeOgg(name, encodeOgg([f32(all, 1, 0)], CRY_RATE), "cry");
}

const sorted = Object.fromEntries(Object.entries(sounds).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
const manifest = {
  schema: "aud244a-audio-manifest/1",
  encoder: { package: "wasm-media-encoders@0.7.0", format: "ogg-vorbis", vbrQuality: QUALITY },
  sampleRates: { se: SE_RATE, cry: CRY_RATE },
  cryPackGapSamples: PACK_GAP,
  note: "Cries are packed per species (NORMAL, WEAK, FAINT) in one mono file; a sound is samples [offsetSamples, offsetSamples + lengthSamples) of its file. SEs are one stereo file per (id, pan). Leading/trailing near-silence is trimmed; onsetSamples is the trimmed ROM mixer latency at the file's sampleRate.",
  totals: { sounds: Object.keys(sorted).length, files: Object.keys(files).length, seBytes: totals.se, cryBytes: totals.cry, bytes: totals.se + totals.cry },
  excluded,
  sounds: sorted,
  files: Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`${manifest.totals.sounds} sounds in ${manifest.totals.files} files; se ${totals.se} B, cry ${totals.cry} B, total ${totals.se + totals.cry} B; excluded ${excluded.length}`);
