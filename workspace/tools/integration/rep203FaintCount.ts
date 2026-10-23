// rep203: counts the kernel faint events per sc106 Scene ON route and before its first stats-change anchor, so the fnt201 pin shifts are attributable per faint.
//   node --experimental-strip-types --no-warnings tools/integration/rep203FaintCount.ts
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { scanRoute } from "./sc106RouteScan.ts";

for (const [seed, slot] of [[0, 2], [6, 0], [13, 3]] as const) {
  const route = scanRoute(seed, Array(8).fill(slot), "on");
  const replay = generatedCommandAnimationReplay(seed, "on", Array(8).fill(slot), 0, true, true, () => {});
  const events = replay.semanticEvents as { requestId: number; segmentIndex: number; event: { sequence: number; payload: { kind: string } } }[];
  const anchor = route.anchors[0]!;
  const anchorAt = events.findIndex((e) => `${e.requestId}:${e.segmentIndex}` === anchor.seg && e.event.sequence === anchor.sequence);
  const faints = events.map((e, i) => ({ k: e.event.payload.kind, i })).filter((e) => e.k === "faint-animation");
  console.log(JSON.stringify({ seed, slot, frames: route.frames, anchorFrame: anchor.statsChange?.frame, faintsTotal: faints.length, faintsBeforeAnchor: faints.filter((f) => f.i < anchorAt).length, kinds: [...new Set(faints.map((f) => f.k))] }));
}
