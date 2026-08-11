// ISSUES #33 boundary-frame oracle check. This deliberately restores the two
// formerly excluded frames only in memory: it is evidence for the normal
// trace, never a source of runtime pixels or a replacement trace asset.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn13-murkrow-boundaries.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/turn13-switchin.json", "utf8")) as Trace;
const frames = [17017, 17018, 17019, 17020, 17033, 17034, 17035];
trace.captureFrames = frames;

function diff(a: Buffer, b: Uint8Array): { count: number; bbox: string } {
  const png = PNG.sync.read(a);
  let count = 0;
  let minX = 240; let minY = 160; let maxX = -1; let maxY = -1;
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    const i = (y * 240 + x) * 4;
    if (png.data[i] !== b[i] || png.data[i + 1] !== b[i + 1] || png.data[i + 2] !== b[i + 2]) {
      count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  return { count, bbox: count ? `(${minX},${minY})-(${maxX},${maxY})` : "-" };
}

const [oracle, app] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
const appByFrame = new Map(app.map((capture) => [capture.frame, capture.rgba]));
let failed = 0;
for (const capture of oracle.captures) {
  const result = diff(capture.png, appByFrame.get(capture.frame)!);
  console.log(`${capture.frame}: ${result.count}px ${result.bbox}`);
  if (result.count !== 0) failed += 1;
}
if (failed) process.exitCode = 1;
