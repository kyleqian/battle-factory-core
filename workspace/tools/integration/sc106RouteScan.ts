// sc106 (S10A, ISSUES #166 slice c): find production routes (generatedCommandAnimationReplay, ordinary command input) per
// General_StatsChange path and measure, for every kernel STATS_CHANGE event, the start frame and first-glyph frame of the
// FOLLOWING command (the first presented command of a later event in the same segment, stats-change commands excluded).
// Run the same scan in a base archive copy and in the patched tree: the per-event frame delta is the stats-change frames the
// route has crossed (76 / 90 per played animation). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/sc106RouteScan.ts --seeds=0..20 --slots=0,1,2,3 --scene=on --out=f.json
import { writeFileSync } from "node:fs";
import { generatedCommandAnimationReplay } from "./generatedCommandAnimationReplay.ts";
import { createBattleResolutionPresentationRenderView } from "../../src/engine/battleResolutionPresentationRender.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const slots = arg("slots", "0,1,2,3")!.split(",").map(Number) as (0 | 1 | 2 | 3)[];
const scene = arg("scene", "on") as "on" | "off";
const turns = Number(arg("turns", "8"));
const out = arg("out")!;
const streakArg = Number(arg("streak", "0"));
const routeArg = arg("route");

type Ev = { sequence: number; payload: { kind: string; animationId?: string; battler?: number | null; arguments?: readonly string[];
  stat?: string; messageId?: string } };
export function scanRoute(seed: number, moveSlots: readonly (0 | 1 | 2 | 3)[], battleScene: "on" | "off", streak = 0) {
  // Per presented command: segment key, index, type, eventSequence, start frame, first-glyph frame (messages).
  const presented: { seg: string; index: number; type: string; seq: number | null; frame: number; glyph: number | null;
    battler?: number; argument?: number; frames?: number; text?: string }[] = [];
  let key = "";
  const replay = generatedCommandAnimationReplay(seed, battleScene, moveSlots, streak, true, true, (state, frame) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting" && r?.lifecycle.phase !== "awaiting-message-dismiss") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    if (!command) return;
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (k !== key) {
      key = k;
      presented.push({ seg: `${r.resolutionId.requestId}:${r.segmentIndex}`, index: r.commandIndex, type: command.type,
        seq: command.eventSequence ?? null, frame, glyph: null,
        ...(command.type === "stats-change" ? { battler: command.battler, argument: command.argument, frames: command.timing.minimumFrames } : {}),
        ...(command.type === "message" ? { text: command.lines.join(" / ") } : {}) });
    }
    const last = presented.at(-1)!;
    if (last.type === "message" && last.glyph === null) {
      const view = createBattleResolutionPresentationRenderView(r);
      if ((view.message?.visibleCharacters ?? 0) >= 1) last.glyph = frame;
    }
  });
  const events = replay.semanticEvents as { requestId: number; segmentIndex: number; event: Ev }[];
  const anchors = [];
  for (let i = 0; i < events.length; i += 1) {
    const { requestId, segmentIndex, event } = events[i]!;
    const p = event.payload;
    if (p.kind !== "animation" || p.animationId !== "STATS_CHANGE") continue;
    const seg = `${requestId}:${segmentIndex}`;
    const segEvents = events.filter((e) => `${e.requestId}:${e.segmentIndex}` === seg).map((e) => e.event);
    const at = segEvents.findIndex((e) => e.sequence === event.sequence);
    const prev = segEvents[at - 1]?.payload, next = segEvents[at + 1]?.payload;
    const path = next?.kind === "stat-stage-change" ? "playstatchangeanimation"
      : prev?.kind === "animation" && prev.animationId === "MOVE_ANIMATION" ? "status-move"
      : segEvents.slice(Math.max(0, at - 3), at).some((e) => e.payload.kind === "hp-change") ? "secondary"
      : "other";
    const followingText = presented.find((c) => c.seg === seg && c.type === "message" && c.seq !== null && c.seq > event.sequence)?.text ?? "";
    const pathName = path === "other" && followingText.includes("INTIMIDATE") ? "intimidate" : path;
    const following = presented.find((c) => c.seg === seg && c.type !== "stats-change" && c.seq !== null && c.seq > event.sequence) ?? null;
    const own = presented.find((c) => c.seg === seg && c.type === "stats-change" && c.seq === event.sequence) ?? null;
    const before = presented.filter((c) => c.seg === seg && c.type !== "stats-change" && c.seq !== null && c.seq < event.sequence).at(-1) ?? null;
    anchors.push({ seg, sequence: event.sequence, battler: p.battler, argument: Number(p.arguments?.[0]), path: pathName,
      prevEvent: prev ? `${prev.kind}:${prev.animationId ?? prev.stat ?? ""}${prev.animationId === "MOVE_ANIMATION" ? `:${prev.arguments?.join(",")}` : ""}` : null,
      before: before ? { type: before.type, frame: before.frame } : null,
      statsChange: own ? { frame: own.frame, frames: own.frames } : null,
      following: following ? { type: following.type, frame: following.frame, glyph: following.glyph, text: following.text ?? null } : null });
  }
  return { seed, streak, slots: moveSlots, scene: battleScene, stalled: replay.stalled, frames: presented.at(-1)?.frame ?? null, anchors };
}

if (out && routeArg) {
  writeFileSync(out, JSON.stringify(scanRoute(fromSeed, routeArg.split(",").map(Number) as (0 | 1 | 2 | 3)[], scene, streakArg), null, 1));
} else if (out) {
  const routes = [];
  for (let seed = fromSeed; seed <= toSeed; seed += 1) {
    for (const slot of slots) {
      const route = scanRoute(seed, Array(turns).fill(slot), scene, streakArg);
      if (route.anchors.length !== 0) routes.push(route);
    }
  }
  writeFileSync(out, JSON.stringify(routes, null, 1));
}
