// S10A attacker-doll widening: scan an ordinary generated route (seed, streak, move slots) for subbed-attacker swap composites;
// prints each presented composite (move, side, duration, ages) and the first-row tail latch of the next command. Never picks by
// live output: the candidates come from substSwapRouteCandidates.ts.
//   node --experimental-strip-types tools/integration/attdollRouteScan.ts <seed> <streak> <slot,slot,...>
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";
import { liveMoveAnimationDuration } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const [seed, streak, slots] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]!.split(",").map(Number) as (0 | 1 | 2 | 3)[]];
const seen: Record<string, unknown>[] = [];
let last: { key: string; side: "player" | "opponent" } | null = null;
const on = generatedCommandAnimationReplay(seed, "on", slots, streak, true, true, (state) => {
  const r = state.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting") return;
  const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
  const view = createBattleResolutionPresentationRenderView(r);
  if (command?.type === "move-animation" && command.animation) {
    const swap = liveSubstituteSwapView(view);
    const key = `${r.segmentIndex}/${r.commandIndex}`;
    if (swap) {
      let entry = seen.find((x) => x.key === key);
      if (!entry) {
        entry = { key, moveId: command.animation.moveId, attacker: command.animation.attacker, duration: liveMoveAnimationDuration(command.animation, view.field), ages: 0, kinds: [] as string[] };
        seen.push(entry);
      }
      entry.ages = (entry.ages as number) + 1;
      if (!(entry.kinds as string[]).includes(swap.kind)) (entry.kinds as string[]).push(swap.kind);
      last = { key, side: command.animation.attacker === 0 ? "player" : "opponent" };
      return;
    }
  }
  if (last) {
    const entry = seen.find((x) => x.key === last!.key)!;
    const settled = createBattleResolutionPresentationRenderView({ ...r, lifecycle: { ...r.lifecycle, phaseElapsed: 1 } } as never);
    entry.next = { type: command?.type, phaseElapsed: r.lifecycle.phaseElapsed, x: view.fieldArt[last.side].origin.x, settledX: settled.fieldArt[last.side].origin.x,
      doll: view.field[last.side].substituteDoll === true };
    last = null;
  }
});
console.log(JSON.stringify({ seed, streak, slots, requests: on.requests.map((q) => `${q.moveId}:${q.attacker}->${q.target}`), composites: seen,
  end: on.state.battleCommandPresentation?.lifecycle.phase, stalled: on.stalled }));
