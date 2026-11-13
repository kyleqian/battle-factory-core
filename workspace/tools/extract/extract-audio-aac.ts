// Dev-time encoder (aud245): the Safari / iOS fallback set. Every committed Vorbis-in-Ogg file in src/assets/gen/audio is decoded
// and re-encoded as AAC-LC in an MP4 (.m4a) container under src/assets/gen/audio/aac/, and the manifest gets an `alt` section.
// Never imported at runtime. Needs an ffmpeg with the native `aac` encoder (any 4.x+ build):
//   FFMPEG=/path/to/ffmpeg npm run extract:audio-aac           (default: `ffmpeg` on PATH)
// No system ffmpeg on the CAX31 box: the step used the static build from `npm i @ffmpeg-installer/linux-arm64` in a scratch dir.
// On a Mac without ffmpeg either `brew install ffmpeg`, or encode each file with the system encoder (same sample rates, mono for cries):
//   afconvert -f m4af -d aac -b 32000 -r 16000 in.wav out.m4a        (afconvert reads WAV; decode the .ogg first, e.g. `oggdec`)
// Rerun order after re-recording: npm run extract:audio, then npm run extract:audio-aac (extract:audio rewrites the manifest without `alt`).
//
// AAC has a fixed sample-rate table (no 26758 / 13379 / 32768 Hz), so the fallback is resampled to 32000 Hz (SEs, songs) and 16000 Hz (cries).
// The player addresses every sound in SECONDS (`offsetSamples / sampleRate`), so the manifest offsets / loop points stay valid unchanged.
// The encoder's priming / resampler delay is NOT reliably removed by the MP4 edit list (measured with ffmpeg's decoder: cries and songs
// decode aligned, SEs come out 250-310 samples late, every file ~0.4 k samples long). So each file's lead is MEASURED here (cross-
// correlation of the decoded .m4a against the decoded .ogg, both at the AAC rate) and stored as `alt.files[f].leadSamples`; the player
// starts the AAC buffer that many samples in. The measurement is ffmpeg's decode; Chromium uses the same decoder, Safari / CoreAudio is
// unverified (docs/aud245-audio-player.md).

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "src", "assets", "gen", "audio");
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const argv = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = argv.indexOf(name);
  return i < 0 ? fallback : (argv[i + 1] ?? fallback);
};
const SE_BITRATE = Number(opt("--se-bitrate", "56000"));
const SONG_BITRATE = Number(opt("--song-bitrate", "64000"));
const CRY_BITRATE = Number(opt("--cry-bitrate", "16000"));
const RATES = { se: 32000, cry: 16000, song: 32000 } as const;

type FileMeta = { bytes: number; sha256: string; leadSamples: number };
type Manifest = { sounds: Record<string, { file: string; kind: string; channels: number }>; files: Record<string, FileMeta>; alt?: unknown; [key: string]: unknown };
const manifest = JSON.parse(readFileSync(join(OUT, "manifest.json"), "utf8")) as Manifest;

function decodeMono(path: string, rate: number): Int16Array {
  const raw = execFileSync(FFMPEG, ["-v", "error", "-i", path, "-ar", String(rate), "-ac", "1", "-f", "s16le", "-"], { maxBuffer: 1 << 29 });
  return new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + (raw.length & ~1)));
}
/** Samples the decoded .m4a lags the decoded .ogg by (best normalised cross-correlation over the first 12000 samples, +-1200). */
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

const kindOfFile = (file: string): "se" | "cry" | "song" => (file.startsWith("cry-") ? "cry" : file.startsWith("se-") ? "se" : "song");
const channelsOf = new Map<string, number>();
for (const sound of Object.values(manifest.sounds)) channelsOf.set(sound.file, sound.channels);

rmSync(join(OUT, "aac"), { recursive: true, force: true });
mkdirSync(join(OUT, "aac"), { recursive: true });
const files: Record<string, FileMeta> = {};
const totals = { se: 0, cry: 0, song: 0 };
for (const file of Object.keys(manifest.files).sort()) {
  const kind = kindOfFile(file);
  const out = `aac/${file.replace(/\.ogg$/, ".m4a")}`;
  const bitrate = kind === "cry" ? CRY_BITRATE : kind === "se" ? SE_BITRATE : SONG_BITRATE;
  execFileSync(
    FFMPEG,
    ["-v", "error", "-y", "-i", join(OUT, file), "-vn", "-ac", String(channelsOf.get(file) ?? 2), "-ar", String(RATES[kind]), "-c:a", "aac", "-profile:a", "aac_low", "-b:a", String(bitrate), "-movflags", "+faststart", join(OUT, out)],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  const data = readFileSync(join(OUT, out));
  const leadSamples = measureLead(join(OUT, file), join(OUT, out), RATES[kind]);
  files[out] = { bytes: data.length, sha256: createHash("sha256").update(data).digest("hex"), leadSamples };
  totals[kind] += data.length;
}
manifest.alt = {
  format: "aac-m4a",
  mime: 'audio/mp4; codecs="mp4a.40.2"',
  note: "Fallback for browsers that cannot decode Vorbis-in-Ogg (Safari / iOS before 18.4 only decode it in some builds). One .m4a per .ogg, same stem, under aac/. Offsets and loop points are in seconds of the original sampleRate and carry over unchanged; the loops are all crossfaded at the wrap (the AAC resample puts the wrap between samples). leadSamples = decoder delay to skip, in samples at alt.sampleRates[kind].",
  dir: "aac/",
  encoder: "ffmpeg native aac (AAC-LC), MP4 + edit list",
  sampleRates: RATES,
  leadMeasuredWith: "ffmpeg decode, normalised cross-correlation vs the .ogg, first 12000 samples, +-1200",
  bitrates: { se: SE_BITRATE, cry: CRY_BITRATE, song: SONG_BITRATE },
  totals: { files: Object.keys(files).length, seBytes: totals.se, cryBytes: totals.cry, songBytes: totals.song, bytes: totals.se + totals.cry + totals.song },
  files,
};
writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`aac: ${Object.keys(files).length} files; se ${totals.se} B, cry ${totals.cry} B, song ${totals.song} B, total ${totals.se + totals.cry + totals.song} B`);
