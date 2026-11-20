// Dev-time (snd1 / snd3): ADD recordings to the committed audio set without touching any existing file or manifest entry.
// extract-audio.ts wipes and rewrites the whole directory; this encodes only the listed keys exactly the way extract-audio.ts and
// extract-audio-aac.ts do (same Vorbis encoder / quality / pinned serial; ffmpeg native AAC 56 kbps + measured lead) and appends them.
//
//   node --experimental-strip-types tools/extract/add-audio-recordings.ts --keys se:194:0,se:153:-64 --raw RAW_DIR [--loops CUT_DIR] [--check]
//
// RAW_DIR: soundRecorder.py --kinds se output (26758 Hz). CUT_DIR: loopCut.py output for looping SEs (32768 Hz). Keys found in CUT_DIR are
// looping SEs. --check encodes without writing and compares with the committed entry (method check on a key that already exists).
// FFMPEG must have the native `aac` encoder (see extract-audio-aac.ts).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createOggEncoder } from "wasm-media-encoders";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "src", "assets", "gen", "audio");
const argv = process.argv.slice(2);
const opt = (name: string, fallback = ""): string => {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : (argv[i + 1] ?? fallback);
};
const abs = (p: string): string => (isAbsolute(p) ? p : join(ROOT, p));
const KEYS = opt("--keys").split(",").filter(Boolean);
const RAW = abs(opt("--raw", ".integration/evidence/aud244a/raw"));
const LOOPS = opt("--loops") ? abs(opt("--loops")) : "";
const CHECK = argv.includes("--check");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const QUALITY = -0.1;
const SE_BITRATE = 56000;
const AAC_RATE = 32000;
if (KEYS.length === 0) throw new Error("--keys required");

interface Sound { file: string; kind: string; channels: number; [k: string]: unknown }
interface FileMeta { bytes: number; sha256: string; leadSamples?: number }
const manifest = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8")) as {
  sounds: Record<string, Sound>; files: Record<string, FileMeta>; totals: Record<string, number>;
  alt: { files: Record<string, FileMeta>; totals: Record<string, number> };
};

function readWav(path: string): { channels: number; rate: number; samples: Int16Array } {
  const b = readFileSync(path);
  if (b.toString("latin1", 0, 4) !== "RIFF" || b.readUInt16LE(34) !== 16 || b.toString("latin1", 36, 40) !== "data") throw new Error(`unexpected WAV layout: ${path}`);
  const n = b.readUInt32LE(40) / 2;
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) samples[i] = b.readInt16LE(44 + 2 * i);
  return { channels: b.readUInt16LE(22), rate: b.readUInt32LE(24), samples };
}
const f32 = (s: Int16Array, ch: number, c: number): Float32Array => {
  const out = new Float32Array(s.length / ch);
  for (let i = 0; i < out.length; i++) out[i] = s[i * ch + c]! / 32768;
  return out;
};

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

function decodeMono(path: string, rate: number): Int16Array {
  const raw = execFileSync(FFMPEG, ["-v", "error", "-i", path, "-ar", String(rate), "-ac", "1", "-f", "s16le", "-"], { maxBuffer: 1 << 29 });
  return new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + (raw.length & ~1)));
}
function measureLead(oggPath: string, m4aPath: string, rate: number): number {
  const a = decodeMono(oggPath, rate);
  const b = decodeMono(m4aPath, rate);
  const end = Math.min(a.length, 12000);
  let energy = 0;
  for (let i = 0; i < end; i += 1) energy += a[i]! * a[i]!;
  if (energy < 1e6) return 0;
  let best = 0;
  let bestScore = -Infinity;
  for (let lag = -1200; lag <= 1200; lag += 1) {
    let xy = 0;
    let yy = 0;
    for (let i = Math.max(0, -lag); i < end; i += 1) {
      const y = b[i + lag] ?? 0;
      xy += a[i]! * y;
      yy += y * y;
    }
    const score = xy / Math.sqrt(yy + 1);
    if (score > bestScore) {
      bestScore = score;
      best = lag;
    }
  }
  return best;
}

const stem = (key: string): string => {
  const k = key.split(":");
  return `se-${String(Number(k[1])).padStart(3, "0")}-` + (k[2] === "none" ? "nopan" : `pan${Number(k[2]) < 0 ? "m" : "p"}${String(Math.abs(Number(k[2]))).padStart(2, "0")}`);
};

const scratch = mkdtempSync(join(tmpdir(), "add-audio-"));
const added: string[] = [];
for (const key of KEYS) {
  const base = stem(key);
  const loopJson = LOOPS && existsSync(join(LOOPS, `${base}.json`)) ? JSON.parse(readFileSync(join(LOOPS, `${base}.json`), "utf8")) : null;
  const dir = loopJson ? LOOPS : RAW;
  const m = loopJson ?? JSON.parse(readFileSync(join(RAW, `${base}.json`), "utf8"));
  if (m.key !== key) throw new Error(`${base}.json is ${m.key}, not ${key}`);
  if (!loopJson && m.capped) throw new Error(`${key} is capped (a looping SE): record it with --kinds seloop and cut it with loopCut.py`);
  const w = readWav(join(dir, m.file));
  const rate = loopJson ? 32768 : m.rate;
  if (w.channels !== 2 || w.rate !== rate || w.samples.length / 2 !== m.lengthSamples) throw new Error(`unexpected WAV ${m.file}`);
  const oggName = `${base}.ogg`;
  const ogg = encodeOgg([f32(w.samples, 2, 0), f32(w.samples, 2, 1)], rate);
  const oggPath = join(scratch, oggName);
  writeFileSync(oggPath, ogg);
  const m4aName = `aac/${base}.m4a`;
  const m4aPath = join(scratch, `${base}.m4a`);
  execFileSync(FFMPEG, ["-v", "error", "-y", "-i", oggPath, "-vn", "-ac", "2", "-ar", String(AAC_RATE), "-c:a", "aac", "-profile:a", "aac_low", "-b:a", String(SE_BITRATE), "-movflags", "+faststart", m4aPath], { stdio: ["ignore", "inherit", "inherit"] });
  const m4a = readFileSync(m4aPath);
  const lead = measureLead(oggPath, m4aPath, AAC_RATE);
  const oggMeta: FileMeta = { bytes: ogg.length, sha256: sha(ogg) };
  const m4aMeta: FileMeta = { bytes: m4a.length, sha256: sha(m4a), leadSamples: lead };

  const pan = key.endsWith(":none") ? null : Number(key.split(":")[2]);
  const common = {
    file: oggName, kind: "se", via: m.via, sampleRate: rate, channels: 2, offsetSamples: 0, lengthSamples: m.lengthSamples,
    lengthFrames: m.lengthFrames, onsetSamples: m.onsetSamples, peak: m.peak, rms: m.rms,
  };
  const entry: Record<string, unknown> = loopJson
    ? {
        ...common, id: m.songId, name: m.name, pan,
        ...(m.loops
          ? {
              loops: true, loopStartSamples: m.loopStartSamples, loopEndSamples: m.loopEndSamples, loopPasses: m.loopPasses, loopStartTick: m.loop.loopStartTick, loopEndTick: m.loop.loopEndTick,
              tempoBpm: m.loop.tempoBpm,
              seam: { windowSamples: m.seamWindowSamples, maxAbsDiff: m.seamMaxAbsDiff, rmsDiff: m.seamRmsDiff, shortMaxAbsDiff: m.seamShortMaxAbsDiff, shortRmsDiff: m.seamShortRmsDiff, junctionMaxAbsDiff: m.junctionMaxAbsDiff ?? null, bodyRms: m.bodyRms, sourcePass: m.sourcePass, nominalEndShift: m.nominalEndShift },
            }
          : { loops: false }),
      }
    : { ...common, id: m.id, name: m.name, pan };

  if (CHECK) {
    const old = manifest.sounds[key];
    const same = old !== undefined && manifest.files[oggName]?.sha256 === oggMeta.sha256 && manifest.alt.files[m4aName]?.sha256 === m4aMeta.sha256 && manifest.alt.files[m4aName]?.leadSamples === lead;
    console.log(`check ${key}: ogg ${manifest.files[oggName]?.sha256 === oggMeta.sha256 ? "identical" : "DIFFERENT"}, m4a ${manifest.alt.files[m4aName]?.sha256 === m4aMeta.sha256 ? "identical" : "DIFFERENT"}, lead ${lead} (committed ${manifest.alt.files[m4aName]?.leadSamples}), entry ${JSON.stringify(old) === JSON.stringify(entry) ? "identical" : "DIFFERENT"}; ${same ? "OK" : "not byte-identical"}`);
    continue;
  }
  if (manifest.sounds[key] || manifest.files[oggName]) throw new Error(`${key} already exists; refusing to overwrite`);
  writeFileSync(join(OUT, oggName), ogg);
  writeFileSync(join(OUT, m4aName), m4a);
  manifest.sounds[key] = entry as unknown as Sound;
  manifest.files[oggName] = oggMeta;
  manifest.alt.files[m4aName] = m4aMeta;
  manifest.totals.seBytes! += ogg.length;
  manifest.alt.totals.seBytes! += m4a.length;
  added.push(key);
  console.log(`${key}: ${oggName} ${ogg.length} B, ${m4aName} ${m4a.length} B, lead ${lead}${loopJson ? `, loop [${m.loopStartSamples}, ${m.loopEndSamples})` : ""}`);
}
rmSync(scratch, { recursive: true, force: true });
if (CHECK || added.length === 0) process.exit(0);

const byKey = (a: [string, unknown], b: [string, unknown]): number => a[0].localeCompare(b[0], "en", { numeric: true });
manifest.sounds = Object.fromEntries(Object.entries(manifest.sounds).sort(byKey));
manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
manifest.alt.files = Object.fromEntries(Object.entries(manifest.alt.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
manifest.totals.sounds = Object.keys(manifest.sounds).length;
manifest.totals.files = Object.keys(manifest.files).length;
manifest.totals.bytes = manifest.totals.seBytes! + manifest.totals.cryBytes! + manifest.totals.songBytes!;
manifest.alt.totals.files = Object.keys(manifest.alt.files).length;
manifest.alt.totals.bytes = manifest.alt.totals.seBytes! + manifest.alt.totals.cryBytes! + manifest.alt.totals.songBytes!;
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`added ${added.length}: ${manifest.totals.sounds} sounds in ${manifest.totals.files} files, ogg ${manifest.totals.bytes} B, aac ${manifest.alt.totals.bytes} B`);
