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

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { diffPngs } from "./diff.ts";
import { formatPixelBounds } from "./diffBounds.ts";
import { computeSSIM } from "./ssim.ts";
import { renderAppTrace } from "./appTrace.ts";
import {
  COMPARE_USAGE,
  parseCompareCliArgs,
  withCaptureRange,
} from "./cli.ts";
import {
  oracleUrlForProfile,
  runOracleBattleLab,
  runOracleTrace,
  type OracleProfile,
  type Trace,
} from "./oracleClient.ts";
import {
  prepareCompareOutputDirectory,
  prepareCompareRunOutputDirectory,
  resolveCompareFixturePath,
  resolveCompareTracePath,
  resolveSourceTracePath,
} from "./paths.ts";

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
const { summary, captureRange } = cli;
const outDir = cli.outDir ?? prepareCompareRunOutputDirectory();
let tracePath: string;
try {
  tracePath = resolveCompareTracePath(cli.tracePath);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
interface CompareTraceFile extends Partial<Trace> {
  readonly sourceTrace?: string;
  /** Reuse an exact committed prefix without copying a long canonical script. */
  readonly sourceSegmentCount?: number;
  /** Phase-specific controls appended after sourceSegmentCount. */
  readonly appendSegments?: Trace["segments"];
  /** Inclusive dense capture window, expanded without thinning before replay. */
  readonly captureWindow?: Readonly<{ start: number; end: number }>;
}

const traceFile = JSON.parse(readFileSync(tracePath, "utf8")) as CompareTraceFile;
let trace: Trace;
if (traceFile.sourceTrace) {
  const sourcePath = resolveSourceTracePath(traceFile.sourceTrace, tracePath);
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as Trace;
  const {
    sourceTrace: _sourceTrace,
    sourceSegmentCount,
    appendSegments,
    captureWindow,
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
    captureFrames: captureWindow === undefined
      ? overrides.captureFrames ?? source.captureFrames
      : Array.from(
          { length: captureWindow.end - captureWindow.start + 1 },
          (_, index) => captureWindow.start + index,
        ),
  };
} else {
  const { captureWindow, ...plainTrace } = traceFile;
  trace = {
    ...plainTrace,
    captureFrames: captureWindow === undefined
      ? plainTrace.captureFrames
      : Array.from(
          { length: captureWindow.end - captureWindow.start + 1 },
          (_, index) => captureWindow.start + index,
        ),
  } as Trace;
}
trace = withCaptureRange(trace, captureRange);
if (!trace.appRoute) {
  // Missing appRoute silently replays the app on its default
  // generated-orchestrator route; for canonical-recorded traces that reads
  // as a wholesale renderer mismatch (recurred 4x on 2026-07-31 alone).
  // tests/compareTraceAppRoute.test.ts pins the legacy allowlist — new
  // traces must declare the field.
  console.warn(
    'note: trace declares no "appRoute" — app replays on the default '
    + "generated-orchestrator route. If this compare wholesale-mismatches, "
    + 'set "appRoute": "canonical-recorded" (or "generated-orchestrator") '
    + "in the trace before debugging the renderer.",
  );
}
const oracleProfile: OracleProfile = trace.oracleProfile ?? "battle-scene-on";
prepareCompareOutputDirectory(outDir);

const oracleRun = trace.oracleBattleLab
  ? runOracleBattleLab(
      JSON.parse(
        readFileSync(
          resolveCompareFixturePath(trace.oracleBattleLab.scenario, tracePath),
          "utf8",
        ),
      ) as Record<string, unknown>,
      trace,
    )
  : runOracleTrace(trace);

function rgbaToPng(rgba: Buffer | Uint8Array): Buffer {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  rgba.forEach((value, index) => (png.data[index] = value));
  return PNG.sync.write(png);
}

const pad = (frame: number) => String(frame).padStart(5, "0");

const [oracleResult, appCaptures] = await Promise.all([
  oracleRun,
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
  const bounds = diff.bounds
    ? ` bbox=${formatPixelBounds(diff.bounds)}`
    : "";
  if (!summary || diff.diffPixels > 0) {
    console.log(
      `frame ${oracleCapture.frame}: ${diff.diffPixels === 0 ? "match" : `DIFF ${diff.diffPixels}px (${pct}%)${bounds}`} ` +
        `ssimMean=${ssim.meanSSIM.toFixed(4)} ssimMin=${ssim.minSSIM.toFixed(4)}`,
    );
  }
  if (diff.diffPixels > 0) {
    mismatched += 1;
    writeFileSync(join(outDir, `diff-${pad(oracleCapture.frame)}.png`), diff.diffPng);
  }
  manifest.push({
    frame: oracleCapture.frame,
    diffPixels: diff.diffPixels,
    bounds: diff.bounds,
    ssimMean: ssim.meanSSIM,
    ssimMin: ssim.minSSIM,
  });
}

writeFileSync(
  join(outDir, "manifest.json"),
  JSON.stringify({
    trace: tracePath,
    generatedAt: new Date().toISOString(),
    oracleProfile,
    oracleUrl: oracleUrlForProfile(oracleProfile),
    captureRange,
    frames: manifest,
  }, null, 2),
);
console.log(`${oracleResult.captures.length - mismatched}/${oracleResult.captures.length} frames matched -> ${outDir}`);
process.exit(mismatched === 0 ? 0 : 1);
