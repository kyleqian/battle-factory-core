// lsd194 (docs/lsd194-print-floor-and-drain.md section 8): for a tests/sc106StatsChangeCommand.test.ts Scene ON route, the message prints presented before the first
// stats-change anchor whose printable length L < 24 (their WAITMESSAGE_LONG 24-row floor is gone: -(24 - L) rows each) -- the whole pin shift.
//   node --experimental-strip-types --no-warnings tools/integration/lsd194ScAttribution.ts <seed> <slot> [all]   (all: the whole route, for the route.frames pins)
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { scanRoute } from "./sc106RouteScan.ts";
import { battleStringPrintableLength } from "../../src/engine/battleStringResolver.ts";

const seed = Number(process.argv[2]), slot = Number(process.argv[3]) as 0 | 1 | 2 | 3;
const route = scanRoute(seed, Array(8).fill(slot), "on");
const anchorFrame = route.anchors[0]!.statsChange!.frame;
let key = ""; const msgs: { frame: number; L: number; min: number | null; hold: number | null; text: string }[] = [];
generatedCommandAnimationReplay(seed, "on", Array(8).fill(slot), 0, true, true, (state: any, frame: number) => {
  const r = state.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting" && r?.lifecycle.phase !== "awaiting-message-dismiss") return;
  const c = r.segments[r.segmentIndex]?.commands[r.commandIndex];
  if (!c) return;
  const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
  if (k === key) return;
  key = k;
  if (c.type === "message" && (process.argv[4] === "all" || frame < anchorFrame)) msgs.push({ frame, L: battleStringPrintableLength(c.lines), min: c.timing?.minimumFrames ?? null, hold: c.timing?.holdFrames ?? null, text: c.lines.join(" / ") });
});
const short = msgs.filter((m) => m.min === 0 && m.hold === 64 && m.L < 24);
console.log(JSON.stringify({ seed, slot, anchorFrame, floorPrints: short.map((m) => ({ ...m, rows: 24 - m.L })), total: -short.reduce((n, m) => n + 24 - m.L, 0) }));
