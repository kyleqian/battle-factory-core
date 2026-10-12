// olnd113 (ISSUES #167 land; docs/olnd113-scene-off-pauses-live.md): on one production route (generatedCommandAnimationReplay, the
// sc106RouteScan input model), list every presented command the landed change inserts or widens, with its start frame:
//   - "hold": a STRINGID_USEDMOVE message with { minimumFrames 24, holdFrames h } (sourcePauseUsedMoveHoldFrames, both scenes);
//   - "pause": a Scene OFF `move-animation` without a live animation at a SCENE_OFF_ATTACK_PAUSE receipt that has no hit receipt in its
//     execution (sceneOffNoHitPauseFrames).
// A pinned frame F on the route moves by exactly the sum of the inserted frames whose command starts before F. Read-only; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/olnd113RouteHolds.ts --seed=3 --route=3,3,3,3,3,3,3,3 --scene=on [--streak=0]
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

export function routeHolds(seed: number, moveSlots: readonly (0 | 1 | 2 | 3)[], scene: "on" | "off", streak = 0) {
  const inserted: { kind: "hold" | "pause"; frame: number; frames: number; label: string | null }[] = [];
  let last: unknown = null;
  const replay = generatedCommandAnimationReplay(seed, scene, moveSlots, streak, true, true, (state, frame) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting" && r?.lifecycle.phase !== "awaiting-message-dismiss") return;
    const segment = r.segments[r.segmentIndex]!;
    const command = segment.commands[r.commandIndex] as any;
    if (command === last) return;
    last = command;
    const events = segment.events as any[];
    const at = events.findIndex((e) => e.sequence === command.eventSequence);
    const event = events[at];
    if (command.type === "message" && command.timing?.minimumFrames === 24 && (command.timing.holdFrames ?? 0) > 0
      && event?.payload.messageId === "STRINGID_USEDMOVE") {
      const print = events.slice(at + 1).find((e) => e.payload.kind === "message");
      inserted.push({ kind: "hold", frame, frames: command.timing.holdFrames, label: print?.payload.messageId ?? null });
    }
    if (command.type === "move-animation" && command.animation === undefined && event?.payload.animationId === "SCENE_OFF_ATTACK_PAUSE") {
      let exec = event.provenance?.instructionExecution ?? 0, hit = false;
      for (let j = at + 1; j < events.length; j++) {
        const q = events[j].payload, x = events[j].provenance?.instructionExecution;
        if (x === undefined || x < exec) break;
        if (q.kind === "message" && (q.messageId === "STRINGID_USEDMOVE" || q.messageId === "STRINGID_EMPTYSTRING3")) break;
        exec = x;
        if (q.kind === "animation" && q.animationId === "HIT_ANIMATION") { hit = true; break; }
      }
      if (!hit) inserted.push({ kind: "pause", frame, frames: command.timing.minimumFrames, label: event.provenance?.sourceLabel ?? null });
    }
  });
  return { seed, scene, slots: moveSlots, stalled: replay.stalled, inserted };
}

/** Inserted frames whose command starts before `frame` on the final route. */
export const insertedBefore = (route: ReturnType<typeof routeHolds>, frame: number) =>
  route.inserted.filter((x) => x.frame < frame).reduce((sum, x) => sum + x.frames, 0);

if (process.argv[1]?.endsWith("olnd113RouteHolds.ts")) {
  const route = arg("route")!.split(",").map(Number) as (0 | 1 | 2 | 3)[];
  console.log(JSON.stringify(routeHolds(Number(arg("seed", "0")), route, arg("scene", "on") as "on" | "off", Number(arg("streak", "0")))));
}
