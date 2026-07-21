// Scratch: dump PNG crops of the message-box text region for visual PNG-read
// (S7 slice R rung c4, message-box text-reveal-cadence probing).
import { writeFileSync, readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { runOracleTrace, type Trace } from "../oracleClient.ts";

const TRACE_PATH = "tools/compare/traces-groundtruth/battle1-turn9-dense.json";
const trace = JSON.parse(readFileSync(TRACE_PATH, "utf8")) as Trace;

const ticks: number[] = [];
for (let t = 11003; t <= 11020; t++) ticks.push(t);
trace.captureFrames = ticks;

async function main() {
  const result = await runOracleTrace(trace);
  const byFrame = new Map(result.captures.map((c) => [c.frame, c]));
  for (const t of ticks) {
    const cap = byFrame.get(t)!;
    const src = PNG.sync.read(cap.png);
    const crop = new PNG({ width: 224, height: 48 });
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 224; x++) {
        const si = ((112 + y) * 240 + (8 + x)) * 4;
        const di = (y * 224 + x) * 4;
        crop.data[di] = src.data[si];
        crop.data[di + 1] = src.data[si + 1];
        crop.data[di + 2] = src.data[si + 2];
        crop.data[di + 3] = 255;
      }
    }
    writeFileSync(`/tmp/turn9-msg-${t}.png`, PNG.sync.write(crop));
  }
  console.log("done", ticks.length, "crops written to /tmp/turn9-msg-<tick>.png");
}

main();
