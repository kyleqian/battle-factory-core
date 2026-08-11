// Dev-time validator for the mGBA 0.10.5 Timer 0 scheduler audit.
//
// This deliberately accepts a source tree already obtained by the caller:
// there is no network, Homebrew, oracle, or emulator dependency. The receipt
// stores hashes for every audited source file, while this script checks the
// source-shaped anchors and optional release archive before writing it.
//
// Example:
// node --experimental-strip-types tools/extract/extract-mgba-timer0-scheduler-audit.ts \
//   --source /path/to/mgba-0.10.5 --archive /path/to/mgba-0.10.5.tar.gz

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const EXPECTED_ARCHIVE_SHA256 = "91d6fbd32abcbdf030d58d3f562de25ebbc9d56040d513ff8e5c19bee9dacf14";
const DEFAULT_OUTPUT = join(ROOT, "tests", "fixtures", "mgba-timer0-scheduler-v1.json");

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

function sourcePath(path: string): string {
  return join(SOURCE, path);
}

function read(path: string): string {
  return readFileSync(sourcePath(path), "utf8");
}

function sha256(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function requireSnippets(path: string, source: string, snippets: readonly string[]): void {
  for (const snippet of snippets) {
    if (!source.includes(snippet)) throw new Error(`${path} is missing audited snippet: ${snippet}`);
  }
}

if (archiveArg !== undefined) {
  const digest = sha256(readFileSync(resolve(archiveArg)));
  if (digest !== EXPECTED_ARCHIVE_SHA256) throw new Error(`mGBA archive SHA-256 mismatch: ${digest}`);
}

const timing = read("src/core/timing.c");
const gba = read("src/gba/gba.c");
const timer = read("src/gba/timer.c");
const video = read("src/gba/video.c");
const videoHeader = read("include/mgba/internal/gba/video.h");
const audio = read("src/gba/audio.c");
const audioHeader = read("include/mgba/internal/gba/audio.h");
const dma = read("src/gba/dma.c");
const dmaHeader = read("include/mgba/internal/gba/dma.h");
const memoryHeader = read("include/mgba/internal/gba/memory.h");
const memory = read("src/gba/memory.c");

requireSnippets("src/core/timing.c", timing, [
  "event->when = nextEvent + timing->masterCycles;",
  "if (nextWhen > nextEvent || (nextWhen == nextEvent && next->priority > priority)) {",
  "next->callback(timing, next->context, -nextWhen);",
  "if (*timing->nextEvent <= 0) {",
]);
requireSnippets("src/gba/gba.c", gba, [
  "gba->irqEvent.name = \"GBA IRQ Event\";",
  "gba->irqEvent.priority = 0;",
  "while (cpu->cycles >= nextEvent) {",
  "nextEvent = mTimingTick(&gba->timing, cycles < nextEvent ? nextEvent : cycles);",
  "} while (gba->cpuBlocked && !gba->earlyExit);",
  "if (gba->cpuBlocked) {",
  "mTimingSchedule(&gba->timing, &gba->irqEvent, GBA_IRQ_DELAY - cyclesLate);",
]);
requireSnippets("src/gba/timer.c", timer, [
  "gba->timers[0].event.name = \"GBA Timer 0\";",
  "gba->timers[0].event.priority = 0x20;",
  "mTimingScheduleAbsolute(&gba->timing, &currentTimer->event, currentTime);",
  "GBAAudioSampleFIFO(&gba->audio, 0, cyclesLate);",
  "GBAAudioSampleFIFO(&gba->audio, 1, cyclesLate);",
]);
requireSnippets("include/mgba/internal/gba/video.h", videoHeader, [
  "VIDEO_HDRAW_LENGTH = 1008,",
  "VIDEO_HBLANK_LENGTH = 224,",
  "VIDEO_HORIZONTAL_LENGTH = 1232,",
  "VIDEO_TOTAL_LENGTH = 280896,",
]);
requireSnippets("src/gba/video.c", video, [
  "video->event.name = \"GBA Video\";",
  "video->event.priority = 8;",
  "mTimingSchedule(timing, &video->event, VIDEO_HDRAW_LENGTH - cyclesLate);",
  "mTimingSchedule(timing, &video->event, VIDEO_HBLANK_LENGTH - cyclesLate);",
  "GBADMARunHblank(video->p, -cyclesLate);",
  "GBADMARunVblank(video->p, -cyclesLate);",
  "video->p->earlyExit = true;",
]);
requireSnippets("src/gba/audio.c", audio, [
  "static const int SAMPLE_INTERVAL = GBA_ARM7TDMI_FREQUENCY / 0x4000;",
  "audio->sampleEvent.name = \"GBA Audio Sample\";",
  "audio->sampleEvent.priority = 0x18;",
  "void GBAAudioScheduleFifoDma(struct GBAAudio* audio, int number, struct GBADMA* info) {",
  "info->reg = GBADMARegisterSetDestControl(info->reg, GBA_DMA_FIXED);",
  "info->reg = GBADMARegisterSetWidth(info->reg, 1);",
  "if (GBA_AUDIO_FIFO_SIZE - fifoSize > 4 && channel->dmaSource > 0)",
  "GBADMARegisterGetTiming(dma->reg) == GBA_DMA_TIMING_CUSTOM",
  "dma->when = mTimingCurrentTime(&audio->p->timing) - cycles;",
  "dma->nextCount = 4;",
  "GBAAudioSample(audio, mTimingCurrentTime(&audio->p->timing) - cyclesLate);",
  "mTimingSchedule(timing, &audio->sampleEvent, SAMPLE_INTERVAL - cyclesLate);",
]);
requireSnippets("src/gba/dma.c", dma, [
  "gba->memory.dmaEvent.name = \"GBA DMA\";",
  "gba->memory.dmaEvent.priority = 0x40;",
  "case GBA_DMA_TIMING_NOW:",
  "info->when = mTimingCurrentTime(&gba->timing) + 3; // DMAs take 3 cycles to start",
  "if (memory->activeDMA == -1 || time < leastTime)",
  "gba->cpuBlocked = true;",
  "int32_t cycles = 2;",
  "info->when += cycles;",
  "if (time < 0 && GBADMARegisterIsEnable(dma->reg) && dma->nextCount)",
  "info->when += 2;",
]);
requireSnippets("include/mgba/internal/gba/dma.h", dmaHeader, [
  "GBA_DMA_TIMING_CUSTOM = 3",
  "DECL_BIT(GBADMARegister, Width, 10);",
]);
requireSnippets("include/mgba/internal/gba/memory.h", memoryHeader, [
  "REGION_WORKING_IRAM = 0x3,",
  "REGION_IO = 0x4,",
  "REGION_CART0 = 0x8,",
  "BASE_WORKING_IRAM = 0x03000000,",
  "BASE_IO = 0x04000000,",
]);
requireSnippets("src/gba/memory.c", memory, [
  "static const char GBA_BASE_WAITSTATES_32[16] = { 0, 0, 5, 0, 0, 1, 1, 0, 7, 7, 9, 9, 13, 13, 9 };",
  "static const char GBA_BASE_WAITSTATES_SEQ_32[16] = { 0, 0, 5, 0, 0, 1, 1, 0, 5, 5, 9, 9, 17, 17, 9 };",
]);

const expectedHashes: Record<string, string> = {
  "src/core/timing.c": "f1290a60ea28cce32ef54c383397b2e2beff852dc02f8d44a69ef78ca7989d51",
  "src/gba/gba.c": "92b0fd214bfa563a1694921661c4413ffd96871cd6162cd762542fb5c2a2c098",
  "src/gba/timer.c": "318054f31c767090b907fe2a32f65f878a702e339468c727a54c6f2b865b83f2",
  "src/gba/video.c": "c99391529cce6729400ae199ca9ddb65fec7c0d7f1945d214b8941c61e1e694c",
  "src/gba/audio.c": "32f8067d09c80b3e77bedc16d52f16a3b4ee7ba099a6cd24e8d5cc8579729a7c",
  "src/gba/dma.c": "83f1ff180942907d274208284d3d5d9148bbcb9e60ab51302bf59933d1ccdb41",
  "include/mgba/internal/gba/gba.h": "853ba5061de8cf4efc8717ada08117525cf2028a4bc00a440fe4a2607130fc20",
  "include/mgba/internal/gba/video.h": "c1adf164b0f88680c5dbba2742f48a86caa4b7a9564998507d99e8479c42a328",
  "include/mgba/internal/gba/audio.h": "ee435341f9295e643ef871978d2d0abac0216104a78f32b80a6e4496786b3add",
  "include/mgba/internal/gba/dma.h": "fe3a72e9613e5d66461dc10e37214beb3b3a5f7dc78bfecc9f8c00b900f68762",
  "include/mgba/internal/gba/memory.h": "bc959b786218da4ce1a8215be66fb907aa25d32bd7c76a0493b9def4f9992ad6",
  "src/gba/memory.c": "3cb9a1595e36f11cd712407c559064dda781ab85cce7e5e3e3b9883b1f2ba19a",
};
for (const [path, expected] of Object.entries(expectedHashes)) {
  const actual = sha256(readFileSync(sourcePath(path)));
  if (actual !== expected) throw new Error(`${path} SHA-256 mismatch: ${actual}`);
}

const receipt = JSON.parse(readFileSync(DEFAULT_OUTPUT, "utf8")) as { schema?: string };
if (receipt.schema !== "mgba-timer0-scheduler/v1") {
  throw new Error(`unexpected receipt schema ${String(receipt.schema)}`);
}
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`verified mGBA 0.10.5 scheduler source${archiveArg === undefined ? "" : " and archive SHA-256"}; wrote ${OUTPUT}`);
