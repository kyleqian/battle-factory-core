// Fresh ON-oracle diagnostic for ISSUES #34's separate 17822-17845 window.
// It compares the live app to the canonical trace without storing oracle
// pixels, then reports each residual's bounds, text-vs-field split, and RGB
// substitutions.  This is deliberately an evidence tool, not runtime input.
//
// Usage: node --experimental-strip-types tools/probe/verify-turn14-flyup-text.ts
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { renderAppTrace } from "../compare/appTrace.ts";
import { diffPngs } from "../compare/diff.ts";
import { runOracleTrace, type Trace } from "../compare/oracleClient.ts";

const trace = JSON.parse(readFileSync("tools/compare/traces/turn14-fly-miss.json", "utf8")) as Trace;
const frames = Array.from({ length: 24 }, (_, i) => 17822 + i);
trace.captureFrames = frames;

function asPng(rgba: Buffer | Uint8Array): PNG {
  const png = new PNG({ width: 240, height: 160 });
  rgba.forEach((value, i) => (png.data[i] = value));
  return png;
}
function rgb(data: Buffer, o: number): string {
  return `${data[o]},${data[o + 1]},${data[o + 2]}`;
}
function analyze(oracle: PNG, app: PNG): { bounds: string; field: number; text: number; colors: string } {
  let l = 240, r = -1, t = 160, b = -1, field = 0, text = 0;
  const substitutions = new Map<string, number>();
  for (let y = 0; y < 160; y += 1) for (let x = 0; x < 240; x += 1) {
    const o = (y * 240 + x) * 4;
    if (rgb(oracle.data, o) === rgb(app.data, o)) continue;
    l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
    if (y >= 120) text += 1; else field += 1;
    const key = `${rgb(oracle.data, o)}>${rgb(app.data, o)}`;
    substitutions.set(key, (substitutions.get(key) ?? 0) + 1);
  }
  const colors = [...substitutions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k}×${n}`).join("; ");
  return { bounds: r < 0 ? "none" : `${l},${t}-${r},${b}`, field, text, colors };
}

const [oracleRun, appRun] = await Promise.all([runOracleTrace(trace), renderAppTrace(trace)]);
const appByFrame = new Map(appRun.map((capture) => [capture.frame, capture]));
let failures = 0;
for (const capture of oracleRun.captures) {
  const appCapture = appByFrame.get(capture.frame);
  if (!appCapture) throw new Error(`app omitted ${capture.frame}`);
  const oracle = PNG.sync.read(capture.png);
  const app = asPng(appCapture.rgba);
  const diff = diffPngs(capture.png, PNG.sync.write(app));
  const detail = analyze(oracle, app);
  console.log(`${diff.diffPixels === 0 ? "PASS" : "FAIL"} ${capture.frame} chars=${capture.frame - 17821} diff=${diff.diffPixels} bounds=${detail.bounds} field=${detail.field} text=${detail.text} colors=${detail.colors}`);
  if (diff.diffPixels !== 0) failures += 1;
}
console.log(`${frames.length - failures}/${frames.length} FLY-up typing frames exact`);
process.exit(failures === 0 ? 0 : 1);
