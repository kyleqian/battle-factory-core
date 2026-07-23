// Dev-time trace builder for the #37 rung-2 text-only window. It intentionally
// writes traces only: full-frame oracle captures are never production assets.
import { readFileSync, writeFileSync } from "node:fs";

type Segment = { frames: number; buttons?: string[] };
type Trace = { segments: Segment[]; captureFrames: number[] };

const source = JSON.parse(readFileSync("tools/compare/traces/turn15-fly-strike.json", "utf8")) as Trace;
const DISMISS_TICK = 19991;

function delayedSegments(delay: number): Segment[] {
  const segments = source.segments.map((s) => ({ ...s, buttons: s.buttons ? [...s.buttons] : undefined }));
  let frame = 0;
  for (const segment of segments) {
    if (frame + segment.frames === DISMISS_TICK - 1) {
      segment.frames += delay;
      return segments;
    }
    frame += segment.frames;
  }
  throw new Error("could not locate the pre-dismiss idle segment");
}

// Rung 2 deliberately ends one VBlank before Brendan owns visible pixels.
// The RAM slot exists earlier, but a fresh dense oracle run establishes that
// the first trainer pixel is 20345 (canonical), so 20302..20344 is the
// complete text-only window.  Delaying the faint-message dismissal shifts
// the entire sequence by the same amount without a trace-name branch.
function writeRung2Trace(path: string, delay = 0): void {
  const first = 20302 + delay;
  const trace: Trace = {
    segments: delayedSegments(delay),
    captureFrames: Array.from({ length: 43 }, (_, i) => first + i),
  };
  writeFileSync(path, `${JSON.stringify(trace, null, 2)}\n`);
}

writeRung2Trace("tools/compare/traces/turn15-sendout-rung2.json");
writeRung2Trace("tools/compare/traces/turn15-sendout-rung2-delayed.json", 30);
console.log("wrote SEND OUT rung-2 traces (canonical + 30-frame delayed dismiss)");
