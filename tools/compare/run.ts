// App-vs-oracle comparison aid (a discrepancy finder, not a grader).
//
// Usage: npm run compare -- tools/compare/traces/example.json [outDir]
//          [--capture-range START:END] [--summary]
//
// Replays one trace against both the oracle service and the app engine
// (tools/compare/appTrace.ts), writes oracle-NNNNN.png / app-NNNNN.png /
// diff-NNNNN.png per captured frame, prints per-frame strict-diff + SSIM
// lines, and exits non-zero if any frame differs. Request every frame you
// intend to compare via captureFrames — comparing only an endpoint frame
// fools you.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PNG } from "pngjs";
import { diffPngs } from "./diff.ts";
import { computeSSIM } from "./ssim.ts";
import { renderAppTrace } from "./appTrace.ts";
import {
  COMPARE_USAGE,
  parseCompareCliArgs,
  withCaptureRange,
} from "./cli.ts";
import {
  oracleUrlForProfile,
  runOracleTrace,
  type OracleProfile,
  type Trace,
} from "./oracleClient.ts";

const WIDTH = 240;
const HEIGHT = 160;

let cli;
try {
  cli = parseCompareCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(COMPARE_USAGE);
  process.exit(2);
}
const { tracePath, outDir, summary, captureRange } = cli;
interface CompareTraceFile extends Partial<Trace> {
  readonly sourceTrace?: string;
  /** Reuse an exact committed prefix without copying a long canonical script. */
  readonly sourceSegmentCount?: number;
  /** Phase-specific controls appended after sourceSegmentCount. */
  readonly appendSegments?: Trace["segments"];
}

const traceFile = JSON.parse(readFileSync(tracePath, "utf8")) as CompareTraceFile;
let trace: Trace;
if (traceFile.sourceTrace) {
  const sourcePath = resolve(dirname(tracePath), traceFile.sourceTrace);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Trace;
  const {
    sourceTrace: _sourceTrace,
    sourceSegmentCount,
    appendSegments,
    ...overrides
  } = traceFile;
  const sourceSegments =
    sourceSegmentCount === undefined
      ? source.segments
      : source.segments.slice(0, sourceSegmentCount);
  trace = {
    ...source,
    ...overrides,
    segments: [...sourceSegments, ...(appendSegments ?? [])],
  };
} else {
  trace = traceFile as Trace;
}
trace = withCaptureRange(trace, captureRange);
const oracleProfile: OracleProfile = trace.oracleProfile ?? "battle-scene-on";
mkdirSync(outDir, { recursive: true });

function rgbaToPng(rgba: Buffer | Uint8Array): Buffer {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  rgba.forEach((value, index) => (png.data[index] = value));
  return PNG.sync.write(png);
}

const pad = (frame: number) => String(frame).padStart(5, "0");

const [oracleResult, appCaptures] = await Promise.all([
  runOracleTrace(trace),
  renderAppTrace(trace),
]);

const appByFrame = new Map(appCaptures.map((capture) => [capture.frame, capture]));
let mismatched = 0;
const manifest: object[] = [];

for (const oracleCapture of oracleResult.captures) {
  writeFileSync(join(outDir, `oracle-${pad(oracleCapture.frame)}.png`), oracleCapture.png);
  const app = appByFrame.get(oracleCapture.frame);
  if (!app) {
    console.log(`frame ${oracleCapture.frame}: MISSING from app captures`);
    mismatched += 1;
    continue;
  }
  const appPng = rgbaToPng(app.rgba);
  writeFileSync(join(outDir, `app-${pad(oracleCapture.frame)}.png`), appPng);
  const diff = diffPngs(oracleCapture.png, appPng);
  const ssim = computeSSIM(oracleCapture.png, appPng);
  const pct = ((100 * diff.diffPixels) / diff.totalPixels).toFixed(2);
  if (!summary || diff.diffPixels > 0) {
    console.log(
      `frame ${oracleCapture.frame}: ${diff.diffPixels === 0 ? "match" : `DIFF ${diff.diffPixels}px (${pct}%)`} ` +
        `ssimMean=${ssim.meanSSIM.toFixed(4)} ssimMin=${ssim.minSSIM.toFixed(4)}`,
    );
  }
  if (diff.diffPixels > 0) {
    mismatched += 1;
    writeFileSync(join(outDir, `diff-${pad(oracleCapture.frame)}.png`), diff.diffPng);
  }
  manifest.push({ frame: oracleCapture.frame, diffPixels: diff.diffPixels, ssimMean: ssim.meanSSIM, ssimMin: ssim.minSSIM });
}

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify({
    trace: tracePath,
    oracleProfile,
    oracleUrl: oracleUrlForProfile(oracleProfile),
    captureRange,
    frames: manifest,
  }, null, 2),
);
console.log(`${oracleResult.captures.length - mismatched}/${oracleResult.captures.length} frames matched -> ${outDir}`);
process.exit(mismatched === 0 ? 0 : 1);
