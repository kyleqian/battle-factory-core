// Dev-time extractor: per-species Pokémon cry playback duration, converted
// to GBA VBlank ticks, for every species reachable as a Battle Factory
// rental (src/data/gen/battle-frontier-mons.json's own species set - 376
// distinct SPECIES_* symbols).
//
// Mechanism this feeds (docs/trainer-pic-off-window-scout.md §D "New,
// out-of-scope divergence"): the opponent controller's intro send-out state
// (`Intro_TryShinyAnimShowHealthbox`, reference/pokeemerald/src/battle_
// controller_opponent.c:292-383) only clears its controller-exec flag once
// BOTH the ball/materialize animation AND the mon's cry have finished
// playing (`!waitForCry && !IsCryPlayingOrClearCrySongs()`,
// src/sound.c:521-532; the cry-trigger flag itself is cleared as soon as the
// cry is launched, src/pokeball.c:665-748, so the real gate is audible cry
// completion). For the ordinary singles send-out (CRY_MODE_NORMAL), no
// pitch shift is applied (src/sound.c:369-392,1711-1718 - pitch 15360 maps
// back to the sample's own base_midi_key 60) and the requested note length
// (140) is far longer than any real cry sample, so the cry plays for
// exactly its own native sample duration - genuinely species-dependent.
//
// Source of the duration: the uncompressed per-species .wav under
// reference/pokeemerald/sound/direct_sound_samples/cries/ - the same PCM
// data the compiled cry asset (gCryTable's `cry Cry_<Name>` entry,
// sound/cry_tables.inc) is built from, at the identical 10512Hz mixing
// rate already embedded in the wav's own fmt chunk. This is a dev-time
// asset read, not ROM/emulator/oracle access at runtime, and no audio is
// played - only its native duration is measured (AGENTS.md's "modeling a
// DURATION as data is in scope; playing sound is not").
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-cry-durations.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const CRIES_DIR = join(REF, "sound", "direct_sound_samples", "cries");
const outDirIndex = process.argv.indexOf("--out-dir");
const outDir = outDirIndex < 0 ? undefined : process.argv[outDirIndex + 1];
if (outDirIndex >= 0 && !outDir) throw new Error("--out-dir requires a directory");
const DATA_GEN = outDir === undefined ? join(RUN_ROOT, "src", "data", "gen") : isAbsolute(outDir) ? outDir : join(RUN_ROOT, outDir);

mkdirSync(DATA_GEN, { recursive: true });

// GBA hardware video frame rate: CPU clock / cycles-per-frame.
const GBA_CYCLES_PER_FRAME = 280896;
const GBA_CPU_HZ = 16777216;
const GBA_FPS = GBA_CPU_HZ / GBA_CYCLES_PER_FRAME;

function readWavDurationSeconds(path: string): number {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error(`${path} is not a RIFF/WAVE file`);
  }
  let offset = 12;
  let sampleRate: number | null = null;
  let channels: number | null = null;
  let bitsPerSample: number | null = null;
  let dataBytes: number | null = null;
  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (chunkId === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitsPerSample = buf.readUInt16LE(body + 14);
    } else if (chunkId === "data") {
      dataBytes = chunkSize;
    }
    offset = body + chunkSize + (chunkSize % 2);
  }
  if (sampleRate === null || channels === null || bitsPerSample === null || dataBytes === null) {
    throw new Error(`${path}: missing fmt or data chunk`);
  }
  const bytesPerFrame = channels * (bitsPerSample / 8);
  const frames = dataBytes / bytesPerFrame;
  return frames / sampleRate;
}

function speciesToWavName(symbol: string): string {
  if (!symbol.startsWith("SPECIES_")) throw new Error(`not a species symbol: ${symbol}`);
  return symbol.slice("SPECIES_".length).toLowerCase();
}

type SpeciesStatsRow = Readonly<{ id: number; name: string }>;
const speciesStats = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "species-stats.json"), "utf8")) as {
    species: SpeciesStatsRow[];
  }
).species;
const idByName = new Map(speciesStats.map((row) => [row.name, row.id]));

type FrontierMonEntry = Readonly<{ species: string }>;
const frontierMons = (
  JSON.parse(readFileSync(join(RUN_ROOT, "src", "data", "gen", "battle-frontier-mons.json"), "utf8")) as {
    entries: FrontierMonEntry[];
  }
).entries;
const rentalSpecies = [...new Set(frontierMons.map((entry) => entry.species))].sort();

const species = rentalSpecies.map((name) => {
  const id = idByName.get(name);
  if (id === undefined) throw new Error(`${name}: no species-stats.json entry`);
  const wavPath = join(CRIES_DIR, `${speciesToWavName(name)}.wav`);
  const durationSeconds = readWavDurationSeconds(wavPath);
  // IsCryPlayingOrClearCrySongs (src/sound.c:521-532) is a per-VBlank poll of
  // whether the M4A channel has finished, not a rounded-to-nearest sample: a
  // tick with any remaining fractional playback still reads "still playing",
  // so the true gate duration is the ceiling of the raw tick count, not the
  // nearest integer. Math.round happens to equal Math.ceil whenever the raw
  // value's fractional part exceeds 0.5 (most species), which is why this was
  // only visible as a species-dependent +-1 residual rather than a systematic
  // one (docs/intro-cry-shadow-evidence.md Part 1's "98-vs-99" resolution).
  const durationTicks = Math.ceil(durationSeconds * GBA_FPS);
  return { id, name, durationTicks };
}).sort((a, b) => a.id - b.id);

writeFileSync(
  join(DATA_GEN, "cry-durations.json"),
  `${JSON.stringify({ gbaFramesPerSecond: GBA_FPS, species })}\n`,
);
console.log(`wrote ${join(DATA_GEN, "cry-durations.json")} (${species.length} species)`);
