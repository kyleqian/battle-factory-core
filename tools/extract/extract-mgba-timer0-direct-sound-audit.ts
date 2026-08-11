// Dev-time receipt regeneration for the mGBA 0.10.5 Direct Sound audit.
// It intentionally accepts a source tree already obtained by the caller: no
// network, Homebrew, oracle, or emulator is needed by this script or its test.
//
// Example (the archive may be omitted when its checksum was verified separately):
// node --experimental-strip-types tools/extract/extract-mgba-timer0-direct-sound-audit.ts \
//   --source /path/to/mgba-0.10.5 --archive /path/to/mgba-0.10.5.tar.gz

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const EXPECTED_SHA256 = "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14";
const DEFAULT_OUTPUT = join(ROOT, "tests", "fixtures", "mgba-timer0-direct-sound-v1.json");

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} needs a path`);
  return value;
}

const sourceArg = argument("--source");
if (sourceArg === undefined) throw new Error("--source /path/to/mgba-0.10.5 is required");
const SOURCE = resolve(sourceArg);
const archiveArg = argument("--archive");
const outputArg = argument("--out");
const OUTPUT = outputArg === undefined ? DEFAULT_OUTPUT : resolve(outputArg);

function read(...parts: string[]): string {
  return readFileSync(join(SOURCE, ...parts), "utf8");
}

function requireSnippets(path: string, source: string, snippets: readonly string[]): void {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) throw new Error(`${path} is missing audited snippet: ${snippet}`);
  }
}

if (archiveArg !== undefined) {
  const digest = createHash("sha256").update(readFileSync(resolve(archiveArg))).digest("hex");
  if (digest !== EXPECTED_SHA256) throw new Error(`mGBA archive SHA-256 mismatch: ${digest}`);
}

const timing = read("src", "core", "timing.c");
const timer = read("src", "gba", "timer.c");
const audio = read("src", "gba", "audio.c");
const dma = read("src", "gba", "dma.c");
const gba = read("src", "gba", "gba.c");
const memory = read("src", "gba", "memory.c");
const audioHeader = read("include", "mgba", "internal", "gba", "audio.h");

requireSnippets("src/core/timing.c", timing, [
  "if (nextWhen > 0)",
  "next->callback(timing, next->context, -nextWhen);",
  "nextWhen == nextEvent && next->priority > priority",
]);
requireSnippets("src/gba/timer.c", timer, [
  "gba->timers[0].event.name = \"GBA Timer 0\";",
  "gba->timers[0].event.priority = 0x20;",
  "int32_t currentTime = mTimingCurrentTime(&gba->timing) - cyclesLate;",
  "GBAAudioSampleFIFO(&gba->audio, 0, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 1, cyclesLate);",
]);
requireSnippets("src/gba/audio.c", audio, [
  "if (GBA_AUDIO_FIFO_SIZE - fifoSize > 4 && channel->dmaSource > 0)",
  "GBADMARegisterGetTiming(dma->reg) == GBA_DMA_TIMING_CUSTOM",
  "dma->when = mTimingCurrentTime(&audio->p->timing) - cycles;",
  "dma->nextCount = 4;",
  "info->reg = GBADMARegisterSetDestControl(info->reg, GBA_DMA_FIXED);",
  "info->reg = GBADMARegisterSetWidth(info->reg, 1);",
]);
requireSnippets("src/gba/dma.c", dma, [
  "gba->memory.dmaEvent.name = \"GBA DMA\";",
  "gba->memory.dmaEvent.priority = 0x40;",
  "if (GBADMARegisterIsEnable(dma->reg) && dma->nextCount)",
  "if (memory->activeDMA == -1 || time < leastTime)",
  "int32_t cycles = 2;",
  "gba->cpuBlocked = true;",
  "info->when += cycles;",
  "info->when += 2;",
  "if (time < 0 && GBADMARegisterIsEnable(dma->reg) && dma->nextCount)",
]);
requireSnippets("src/gba/gba.c", gba, [
  "} while (gba->cpuBlocked && !gba->earlyExit);",
  "cpu->cycles = cpu->nextEvent;",
]);
requireSnippets("src/gba/memory.c", memory, [
  "static const char GBA_BASE_WAITSTATES_32[16] = { 0, 0, 5, 0, 0, 1, 1, 0, 7, 7, 9, 9, 13, 13, 9 };",
  "static const char GBA_BASE_WAITSTATES_SEQ_32[16] = { 0, 0, 5, 0, 0, 1, 1, 0, 5, 5, 9, 9, 17, 17, 9 };",
]);
requireSnippets("include/mgba/internal/gba/audio.h", audioHeader, ["#define GBA_AUDIO_FIFO_SIZE 8"]);

const receipt = JSON.parse(readFileSync(DEFAULT_OUTPUT, "utf8")) as { schema?: string };
if (receipt.schema !== "mgba-timer0-direct-sound/v1") {
  throw new Error(`unexpected receipt schema ${String(receipt.schema)}`);
}
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`verified mGBA 0.10.5 source${archiveArg === undefined ? "" : " and archive SHA-256"}; wrote ${OUTPUT}`);
