// Dev-time trace builder for the live forced-switch party-menu slice.
// It intentionally writes traces only: full-frame oracle captures are never
// production assets. The selected checkpoints are the currently verified
// settled states; see ISSUES #37 for the transition/icon-animation remainder.
import { readFileSync, writeFileSync } from "node:fs";

type Segment = { frames: number; buttons?: string[] };
type Trace = { segments: Segment[]; captureFrames: number[] };

const source = JSON.parse(readFileSync("tools/compare/traces/turn15-fly-strike.json", "utf8")) as Trace;
const DISMISS_TICK = 19991;

// 0-diff checkpoints from the live state renderer, relative to the A edge.
// This is deliberately sparse rather than a false claim that the unresolved
// fades/OAM animation are exact.
const SETTLED_OFFSETS = [
  80, 81, 82, 83, 84,
  124, 125, 126, 127, 128, 129, 138, 139, 140, 141, 142, 143, 144,
  153, 185, 186, 187, 188, 189, 198, 199, 213, 214, 222, 223, 224,
  225, 226, 227, 228, 237, 238, 239, 240, 241, 242, 243, 244,
  252, 253, 254,
];

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

function writeTrace(path: string, delay = 0): void {
  const pressTick = DISMISS_TICK + delay;
  const trace: Trace = {
    segments: delayedSegments(delay),
    captureFrames: SETTLED_OFFSETS.map((offset) => pressTick + offset),
  };
  writeFileSync(path, `${JSON.stringify(trace, null, 2)}\n`);
}

writeTrace("tools/compare/traces/turn15-party-select.json");
writeTrace("tools/compare/traces/turn15-party-select-delayed.json", 30);
console.log("wrote live party-select settled traces (canonical + 30-frame delayed dismiss)");
