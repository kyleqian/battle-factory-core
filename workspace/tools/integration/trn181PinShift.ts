// trn181: per-pin attribution for a Scene ON generated route. Prints every action-transition pause (start frame, frames) and, for
// sc106's anchors and the route total, the pause frames started before it (the shift a re-pinned literal must equal, +/- the
// replay's dismissal parity).   node --experimental-strip-types --no-warnings tools/integration/trn181PinShift.ts <seed> <slot>
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { scanRoute } from "./sc106RouteScan.ts";

const seed = Number(process.argv[2]), slot = Number(process.argv[3]) as 0 | 1 | 2 | 3;
const pauses: { frame: number; frames: number }[] = [];
let key = "";
generatedCommandAnimationReplay(seed, "on", Array(8).fill(slot), 0, true, true, (state, frame) => {
  const r = state.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting") return;
  const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
  const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
  if (k === key) return;
  key = k;
  if (c?.type === "move-animation" && c.actionTransition) pauses.push({ frame, frames: c.timing.minimumFrames });
});
const before = (frame: number) => pauses.filter((p) => p.frame < frame).reduce((n, p) => n + p.frames, 0);
const route = scanRoute(seed, Array(8).fill(slot), "on");
console.log(JSON.stringify({
  seed, slot, pauses: pauses.length, pauseFrames: pauses.reduce((n, p) => n + p.frames, 0), routeFrames: route.frames,
  anchors: route.anchors.map((a) => ({ sc: a.statsChange?.frame ?? null, shiftSc: a.statsChange ? before(a.statsChange.frame) : null,
    following: a.following?.frame ?? null, shiftFollowing: a.following ? before(a.following.frame) : null })),
}));
