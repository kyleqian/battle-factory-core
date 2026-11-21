// hist73: a copy of prep52AllocatorCensus.ts re-run on master a7904fcc0 (production src tree 5cd1b684), brought up to today's
// liveShareCensus.ts driver (hiddenSides passed to liveMoveAnimationPresentation / classifyPresentationDecline, hide66) and today's
// allocator rules: factoryRoundBattleOrchestrator.ts prepareResolutionPalette scanThrough ~:2339-2357 also invalidates on a
// kernel `animation` event (general / hit / stat) outside liveMoveSpriteAllocator.ts LIVE_SPRITE_ALLOCATOR_NET_ZERO_GENERAL_ANIMATIONS
// (aud56, ISSUES #156); the shadow below names those units `general animation <UNIT>` via liveSpriteAllocatorAnimationUnit. Line
// refs: ball/summary commands ~:2427-2437, the send-out reseed ~:2446-2448, the crossed invalidate ~:2449, the forced switch-in
// ~:2247-2316. --reseed-detail is always on (new tool, no prior receipts): each allocator decline carries the last switch-in reseed
// record that left the host unknown (allocatorLastFailedReseed, with the order host's invalidReason).
// prep52: a copy of prep50AllocatorCensus.ts re-run on master f038cc861 (production src tree dae0a8b9). prep50's status set is
// now PRODUCTION (liveMoveSpriteAllocator.ts LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS; factoryRoundBattleOrchestrator.ts
// prepareResolutionPalette scanThrough ~:2319-2334 sets crossedAllocatorUnknown only for a status animation outside the set, the
// invalidate ~:2424); the shadow below reads the same export directly. Line refs otherwise: ball/summary commands ~:2403-2412, the
// send-out reseed ~:2418-2423, the forced switch-in ~:2240-2295. The rules are otherwise unchanged since prep50.
// prep50: a copy of prep44AllocatorCensus.ts (liveShareCensus.ts's battle driver; neither exports anything) re-run on master
// eb3ae0163 (production src tree f1f2de08); the allocator rules it shadows are unchanged since prep44, only line numbers moved
// (factoryRoundBattleOrchestrator.ts prepareResolutionPalette ~:2296-2420: status-animation scan ~:2315-2333 and the invalidate
// ~:2416, ball/summary commands ~:2394-2400, the send-out reseed ~:2413-2415; the forced switch-in ~:2236-2290). Added: every
// switch-in command activation and every forced switch-in entry records the allocator host before -> after and the order
// host's reseed inputs (liveSpriteOrderHost.ts liveSpriteAllocatorReseedable ~:573: tracker.lastUnit, occupantRoles,
// spriteOrderTrackerRoleIsomorphic) -> report.allocatorReseeds.
// prep44 header: liveShareCensus.ts's battle driver (copied verbatim: that script runs at import and exports nothing) plus the SPRITE
// ALLOCATOR history tracker. Every frame the production allocator host (state.liveMoveSpriteAllocatorHost.host.historyKnown) goes
// known -> unknown, the unit that did it is recorded with the orchestrator's own reason (factoryRoundBattleOrchestrator.ts
// prepareResolutionPalette ~:2350-2393, the party-menu open ~:2953, the forced switch-in reseed ~:2256): a move body without an
// allocator PLAN that is not audited net-zero (liveMoveSpriteAllocator.ts:84-88), a ball/summary/slide/recall command, or crossed
// status-animation events. Every "sprite allocator history unknown" decline carries that unit as decline.detail
// ("allocator: <unit>"), so prep43CensusDelta.py-style pairing attributes it. Same CLI and report as liveShareCensus.ts plus
// report.allocatorInvalidatingUnits (ranked by fallback frames).
// S10A ORDINARY-PLAY LIVE-SHARE CENSUS: how often real Factory play (Scene ON) presents a move body through a live adapter vs
// the scene-off fallback, and why. Each battle is a generated Level-50 rental draft (seed, streak; rentals 0..2) played to its
// terminal boundary with ordinary controller input only: FIGHT, then the least-used LEGAL move slot (so all 4 slots get used),
// forced replacements answered with the first healthy member (generatedCommandAnimationReplay's selector). Read-only use of
// production: every presented frame of every move-animation / substitute-fade command is classified exactly as
// renderBattleResolutionLiveView decides it (liveSubstituteSwapView, then liveMoveAnimationPresentation; substituteFadeRenderView),
// and every fallback carries the production gate that fired (liveShareCensusGates.ts). No oracle.
//   node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=<from>..<to> [--seed-step=N]
//     [--streak-mul=N] [--out=report.json] [--commands=commands.jsonl]
// Battle i (0-based) uses seed = from + i * seedStep and streak = (i * streakMul) % 49 (streaks 0..48, challenges 0..6).
import { censusDeal } from "./censusRound.ts";
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveHiddenSides } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { substituteFadeRenderView } from "../../src/engine/liveSubstituteFade.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };
import monsJson from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import policyJson from "../../src/data/gen/factory-round-policy.json" with { type: "json" };
import { classifyDurationDecline, classifyPresentationDecline, type Decline } from "./liveShareCensusGates.ts";
import * as liveMoveSpriteAllocator from "../../src/engine/liveMoveSpriteAllocator.ts";
import { spriteOrderStatusAnimationName, spriteOrderTrackerRoleIsomorphic } from "../../src/engine/spriteOrderEventTransform.ts";

// liveMoveSpriteAllocator.ts PLANS keys (not exported): the six audited wall-family plans.
const ALLOCATOR_PLAN_IDS = new Set([112, 113, 115, 182, 243, 277]);
const ALLOCATOR_NET_ZERO = new Set(liveMoveSpriteAllocator.LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS);
// prep50 status set (production since 8e72343a7); a prep52 temporary patch may widen it.
const ALLOCATOR_NET_ZERO_STATUS: ReadonlySet<string> = (liveMoveSpriteAllocator as { LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS?: ReadonlySet<string> })
  .LIVE_SPRITE_ALLOCATOR_NET_ZERO_STATUS_ANIMATIONS ?? new Set<string>();
const statusInvalidates = (p: { isStatus2: number; status: number }) =>
  !ALLOCATOR_NET_ZERO_STATUS.has(spriteOrderStatusAnimationName(p.isStatus2 !== 0, p.status) ?? "");
type OrchestratorState = ReturnType<typeof createFactoryRoundBattleOrchestrator>;
const allocatorKnown = (s: OrchestratorState) => s.liveMoveSpriteAllocatorHost === undefined ? "absent"
  : s.liveMoveSpriteAllocatorHost.battleCallStart !== s.activeBattleCallStart ? "stale" : s.liveMoveSpriteAllocatorHost.host.historyKnown;
// The unit that took the host known -> unknown between `before` and `after` (one step), in the orchestrator's reason order.
// Shadow of the same rules for the CHAIN (every unit that would invalidate a known host, once the host is already unknown):
// evaluated at each resolution command activation with a private event cursor (the palette host's scan discipline).
interface ShadowCursor { key: string; segment: string; nextEventIndex: number }
function shadowUnits(after: OrchestratorState, cursor: ShadowCursor): string[] {
  const r = after.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting") return [];
  const segmentKey = `${r.resolutionId.requestId}:${r.segmentIndex}`, key = `${segmentKey}:${r.commandIndex}`;
  if (key === cursor.key) return [];
  cursor.key = key;
  if (cursor.segment !== segmentKey) { cursor.segment = segmentKey; cursor.nextEventIndex = 0; }
  const segment = r.segments[r.segmentIndex]!, command = segment.commands[r.commandIndex], units: string[] = [];
  if (command?.type === "move-animation" && command.animation) {
    const id = command.animation.moveId;
    if (!ALLOCATOR_PLAN_IDS.has(id) && !ALLOCATOR_NET_ZERO.has(id)) units.push(`body ${nameOf.get(id) ?? `#${id}`} (no plan, not net-zero)`);
  } else if (command !== undefined && (command.type === "move-animation" || command.type === "switch-out" || command.type === "switch-in"
    || command.type === "party-summary" || command.type === "trainer-slide" || (command.type === "sprite-visibility" && command.recall))) {
    units.push(`command ${command.type}${command.type === "sprite-visibility" ? " recall" : ""}`);
  }
  const isFinal = command === undefined || r.commandIndex === segment.commands.length - 1;
  const through = isFinal ? Number.POSITIVE_INFINITY : command !== undefined && "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
  while (cursor.nextEventIndex < segment.events.length && segment.events[cursor.nextEventIndex]!.sequence <= through) {
    const p = segment.events[cursor.nextEventIndex++]!.payload;
    if (p.kind === "status-animation" && statusInvalidates(p)) units.push(`status animation ${spriteOrderStatusAnimationName(p.isStatus2 !== 0, p.status) ?? `status ${p.isStatus2}/${p.status}`}`);
    else if (p.kind === "animation" && !liveMoveSpriteAllocator.liveSpriteAllocatorAnimationNetZero(p)) units.push(`general animation ${liveMoveSpriteAllocator.liveSpriteAllocatorAnimationUnit(p)}`);
  }
  return units;
}
function allocatorInvalidatingUnit(before: OrchestratorState, after: OrchestratorState): string {
  if (after.battlePartySelect && !before.battlePartySelect) return "party menu open (ResetSpriteData)";
  const r = after.battleResolutionPresentation;
  if (!r) return "outside a resolution";
  if (r.lifecycle.phase === "presenting-switch-in") return "forced switch-in (allocator not reseedable)";
  if (r.lifecycle.phase !== "presenting") return `resolution ${r.lifecycle.phase}`;
  const segment = r.segments[r.segmentIndex]!;
  const command = segment.commands[r.commandIndex];
  if (command?.type === "move-animation" && command.animation) {
    const id = command.animation.moveId;
    if (!ALLOCATOR_PLAN_IDS.has(id) && !ALLOCATOR_NET_ZERO.has(id)) {
      return `body ${nameOf.get(id) ?? `#${id}`} (no plan, not net-zero)`;
    }
  } else if (command !== undefined && (command.type === "move-animation" || command.type === "switch-out" || command.type === "switch-in"
    || command.type === "party-summary" || command.type === "trainer-slide" || (command.type === "sprite-visibility" && command.recall))) {
    return `command ${command.type}${command.type === "sprite-visibility" ? " recall" : ""}`;
  }
  // Crossed (or trailing, at the segment's final command) status-animation events since the palette host's event cursor.
  const cursor = before.liveMovePaletteHost?.eventCursor;
  const from = cursor?.requestId === r.resolutionId.requestId && cursor.segmentIndex === r.segmentIndex ? cursor.nextEventIndex : 0;
  const isFinal = command === undefined || r.commandIndex === segment.commands.length - 1;
  const through = isFinal ? Number.POSITIVE_INFINITY : command !== undefined && "eventSequence" in command ? command.eventSequence : Number.POSITIVE_INFINITY;
  const names = segment.events.slice(from).filter((e) => e.sequence <= through && e.payload.kind === "status-animation" && statusInvalidates(e.payload))
    .map((e) => e.payload.kind === "status-animation" ? spriteOrderStatusAnimationName(e.payload.isStatus2 !== 0, e.payload.status) ?? `status ${e.payload.isStatus2}/${e.payload.status}` : "");
  if (names.length) return `status animation ${[...new Set(names)].join("+")}`;
  const general = segment.events.slice(from).filter((e) => e.sequence <= through && e.payload.kind === "animation"
    && !liveMoveSpriteAllocator.liveSpriteAllocatorAnimationNetZero(e.payload))
    .map((e) => e.payload.kind === "animation" ? liveMoveSpriteAllocator.liveSpriteAllocatorAnimationUnit(e.payload) ?? "MOVE_ANIMATION" : "");
  if (general.length) return `general animation ${[...new Set(general)].join("+")}`;
  return `unattributed at ${command?.type ?? "segment end"}`;
}

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const seedStep = Number(arg("seed-step", "1")), streakMul = Number(arg("streak-mul", "11"));
const FRAME_BUDGET = 200000, RENDER_SAMPLE_EVERY = 97;

const moveRows = (movesJson as unknown as { moves: { move: string; id: number; name: string }[] }).moves;
const nameOf = new Map(moveRows.map((m) => [m.id, m.name]));
// Factory use weight: the remainingAdaptersCensus.mjs / spriteOrderPlanCoverageRank.py model (Level-50 rental ranges 0..6, 4 moves
// per set, each range equally likely): the fraction of all Factory move slots that are this move.
const weightOf = (() => {
  const entries = (monsJson as unknown as { entries: { index: number; moves: string[] }[] }).entries;
  const ranges = (policyJson as unknown as { rentalSelection: { ranges: { level50: { start: number; end: number }[] } } })
    .rentalSelection.ranges.level50.slice(0, 7);
  const w = new Map<string, number>();
  for (const r of ranges) {
    const sets = entries.filter((m) => m.index >= r.start && m.index <= r.end);
    for (const m of sets) for (const mv of m.moves) w.set(mv, (w.get(mv) ?? 0) + 1 / sets.length / ranges.length);
  }
  const total = [...w.values()].reduce((a, b) => a + b, 0);
  const byId = new Map(moveRows.map((m) => [m.id, (w.get(m.move) ?? 0) / total]));
  return (id: number) => byId.get(id) ?? 0;
})();

interface CommandRecord {
  battle: number; kind: "move" | "substitute-fade"; moveId: number; move: string; side: "player" | "opponent";
  attacker: string; target: string; status: "live" | "fallback" | "partial"; frames: number; liveFrames: number;
  swapFrames: number; duration: number | null; decline: (Decline & { detail?: string }) | null;
  /** prep44: every invalidating unit since the allocator host was last known (first = decline.detail's unit). */
  allocatorChain?: string[];
}
interface BattleRecord { battle: number; seed: number; streak: number; frames: number; end: "terminal" | "stalled" | "error"; error?: string; turns: number;
  stalledAt?: string }

const commands: CommandRecord[] = [];
const battles: BattleRecord[] = [];
const sanity = { sampledLiveFrames: 0, renderedOk: 0, renderThrows: [] as string[] };
let liveFrameCounter = 0;
const allocatorInvalidations = new Map<string, number>();
// prep50: allocator host state at each switch-in command activation / forced switch-in entry, with the order host's reseed inputs.
const allocatorReseeds = new Map<string, number>();
function reseedRecord(kind: string, before: OrchestratorState, after: OrchestratorState): void {
  const t = after.liveMoveSpriteAllocatorHost?.orderHost?.tracker;
  const k = `${kind}: allocator ${allocatorKnown(before)} -> ${allocatorKnown(after)}; ${!t ? "no order host"
    : `lastUnit=${t.lastUnit ?? "none"} roles=${t.occupantRoles === null ? "null" : "known"} iso=${spriteOrderTrackerRoleIsomorphic(t)} order=${t.invalidReason ?? "valid"}`}`;
  allocatorReseeds.set(k, (allocatorReseeds.get(k) ?? 0) + 1);
  if (allocatorKnown(after) !== true) lastFailedReseed = k;
}
// prep52 --reseed-detail (off by default, so default receipts are unchanged): each allocator decline also carries the last switch-in
// reseed record that left the host unknown (reset whenever the host is known again) -> report.allocatorResidualReseedBlockers.
const RESEED_DETAIL = true;
// hist73 PART B: every order-host invalidation whose reason names a hidden battler (liveSpriteOrderHost.ts:347-350 "faint-animation /
// switch-in-animation of a hidden battler", :228 "reshow with a hidden battler") -> report.hiddenBattlerOrderStops, with the
// resolution's events (kind / battler / animation id + move / source label) so the faint path (residual damage, a move hitting the
// semi-invulnerable battler, Perish Song, ...) can be read off.
interface HiddenStop { battle: number; seed: number; streak: number; turn: number; reason: string; hidden: readonly boolean[];
  segmentIndex: number; commandIndex: number; phase: string; events: string[][] }
const hiddenStops: HiddenStop[] = [];
type AnyEvent = { payload: Record<string, unknown> & { kind: string }; provenance?: { sourceLabel?: string; opcodeName?: string } };
const eventText = (e: AnyEvent): string => {
  const p = e.payload;
  const bits = [p.kind, p.battler !== undefined ? `b${String(p.battler)}` : "", typeof p.animationId === "string" ? p.animationId : "",
    p.kind === "animation" && Array.isArray(p.arguments) ? `move ${String(p.arguments[0])}` : "",
    p.kind === "set-battler-sprite-visibility" ? `invisible=${String(p.invisible)}` : "",
    p.kind === "status-animation" ? `status ${String(p.isStatus2)}/${String(p.status)}` : ""].filter(Boolean).join(" ");
  return `${bits} @${e.provenance?.sourceLabel ?? "?"}${e.provenance?.opcodeName ? `/${e.provenance.opcodeName}` : ""}`;
};
let lastFailedReseed: string | null = null;

function playBattle(battle: number, seed: number, streak: number): void {
  lastFailedReseed = null;
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: streak }),
  }));
  const fb = new Uint8Array(240 * 160 * 4);
  // core.ts tick's presentation seam (after the logical frame): the default-seed Random2 session, a fresh one per battle (each
  // battle is the session's first), feeding the faithful-random adapters exactly as createInitialState / render do.
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, turns = 0, commandKey = "", current: CommandRecord | null = null;
  let allocatorCause: string | null = null, allocatorChain: string[] = [];
  const shadow: ShadowCursor = { key: "", segment: "", nextEventIndex: 0 };
  let reseedKey = "";
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    if (command?.type !== "move-animation" && command?.type !== "substitute-fade") return;
    const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    if (key !== commandKey) {
      commandKey = key;
      const request = command.type === "move-animation" ? command.animation : undefined;
      const side = command.type === "move-animation" ? (request?.attacker ?? 0) === 0 ? "player" : "opponent"
        : command.battler === 0 ? "player" : "opponent";
      const moveId = command.type === "move-animation" ? request?.moveId ?? -1 : -164;
      const duration = request ? liveMoveAnimationDuration(request, view.field) : null;
      current = {
        battle, kind: command.type === "move-animation" ? "move" : "substitute-fade", moveId,
        move: command.type === "substitute-fade" ? "SUBSTITUTE_FADE" : nameOf.get(moveId) ?? `#${moveId}`, side,
        attacker: side === "player" ? view.field.player.name : view.field.opponent.name,
        target: side === "player" ? view.field.opponent.name : view.field.player.name,
        status: "fallback", frames: 0, liveFrames: 0, swapFrames: 0, duration,
        decline: command.type === "move-animation" && !request
          ? { stage: "request", reason: "move-animation command without an animation request", gate: "battleResolutionPresentationRender.ts:battleResolutionCommandDuration" }
          : request && duration === null ? classifyDurationDecline(request, view.field) : null,
      };
      commands.push(current);
    }
    const rec = current!;
    rec.frames++;
    let live = false;
    if (command.type === "substitute-fade") {
      live = view.effect?.type === "substitute-fade" && substituteFadeRenderView(view) !== null;
      if (!live && !rec.decline) {
        rec.decline = { stage: "presentation", reason: "fade battler not shown as the doll at the command start",
          gate: "battleResolutionPresentationRender.ts:fadePresented" };
      }
    } else if (view.effect?.type === "move") {
      // renderBattleResolutionLiveView's own decision order.
      const swap = liveSubstituteSwapView(view);
      if (swap?.kind === "swap") { live = true; rec.swapFrames++; }
      else {
        const v = swap ? swap.view : view, e = v.effect;
        if (e?.type === "move") {
          const hiddenSides = liveMoveHiddenSides(v.visibility, e.request);
          live = liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
            e.presentationRng, e.battlerX2Input, hiddenSides) !== null;
          if (!live && !rec.decline) {
            rec.decline = classifyPresentationDecline({ request: e.request, field: v.field, age: e.age, paletteInput: e.paletteInput,
              spriteAllocatorInput: e.spriteAllocatorInput, spriteOrderInput: e.spriteOrderInput, presentationRngInput: e.presentationRng,
              battlerX2Input: e.battlerX2Input, hiddenSides });
            // The lend is absent: name the production order host's own state (spriteOrderEventTransform.ts invalidReason).
            if (rec.decline.reason === "sprite allocator history unknown") {
              const known = allocatorKnown(state);
              rec.decline.detail = `allocator: ${known === false ? allocatorCause ?? "unknown before any tracked step" : `host ${known}`}`;
              rec.allocatorChain = [...new Set(allocatorChain)];
              if (RESEED_DETAIL) (rec as { allocatorLastFailedReseed?: string | null }).allocatorLastFailedReseed = lastFailedReseed;
            }
            if (rec.decline.reason === "sprite-order lend unknown") {
              const host = state.liveMoveSpriteAllocatorHost?.orderHost;
              rec.decline.detail = `order host: ${!host ? "absent" : host.tracker.invalidReason ?? (host.tracker.cursor.order.known ? "known, no lend for this body" : "unknown")}`;
            }
          }
        }
      }
    }
    if (live) {
      rec.liveFrames++;
      if (liveFrameCounter++ % RENDER_SAMPLE_EVERY === 0) {
        sanity.sampledLiveFrames++;
        try { renderBattleResolutionLiveView(fb, view); sanity.renderedOk++; }
        catch (e) { sanity.renderThrows.push(`${rec.move}/${rec.side} battle ${battle} age ${r.lifecycle.phaseElapsed}: ${String(e).slice(0, 100)}`); }
      }
    }
    rec.status = rec.liveFrames === rec.frames ? "live" : rec.liveFrames === 0 ? "fallback" : "partial";
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    const before = state;
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    const knownAfter = allocatorKnown(state), units = shadowUnits(state, shadow);
    {
      const reasonAfter = state.liveMoveSpriteAllocatorHost?.orderHost?.tracker.invalidReason ?? null;
      const reasonBefore = before.liveMoveSpriteAllocatorHost?.orderHost?.tracker.invalidReason ?? null;
      const r = state.battleResolutionPresentation;
      if (reasonAfter !== null && reasonAfter !== reasonBefore && /hidden battler/.test(reasonAfter) && r) {
        hiddenStops.push({ battle, seed, streak, turn: turns, reason: reasonAfter,
          hidden: [...(before.liveMoveSpriteAllocatorHost?.orderHost?.hidden ?? [])], segmentIndex: r.segmentIndex,
          commandIndex: r.commandIndex, phase: r.lifecycle.phase,
          events: r.segments.slice(0, r.segmentIndex + 1).map((s) => (s.events as unknown as AnyEvent[]).map(eventText)) });
      }
    }
    {
      const r = state.battleResolutionPresentation;
      const c = r?.lifecycle.phase === "presenting" ? r.segments[r.segmentIndex]?.commands[r.commandIndex] : undefined;
      const k = r ? `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}` : "";
      if (c?.type === "switch-in" && k !== reseedKey) { reseedKey = k; reseedRecord("switch-in command", before, state); }
      if (r?.lifecycle.phase === "presenting-switch-in" && before.battleResolutionPresentation?.lifecycle.phase !== "presenting-switch-in") {
        reseedRecord("forced switch-in", before, state);
      }
    }
    if (state.battlePartySelect && !before.battlePartySelect) units.push("party menu open (ResetSpriteData)");
    if (state.battleResolutionPresentation?.lifecycle.phase === "presenting-switch-in"
      && before.battleResolutionPresentation?.lifecycle.phase !== "presenting-switch-in") units.push("forced switch-in (allocator not reseedable)");
    if (knownAfter === true) { allocatorCause = null; allocatorChain = []; lastFailedReseed = null; }
    else if (knownAfter === false && allocatorKnown(before) === true) {
      allocatorCause = allocatorInvalidatingUnit(before, state);
      allocatorInvalidations.set(allocatorCause, (allocatorInvalidations.get(allocatorCause) ?? 0) + 1);
      allocatorChain = [allocatorCause, ...units.filter((u) => u !== allocatorCause)];
    } else if (knownAfter === false) allocatorChain.push(...units.filter((u) => !allocatorChain.includes(u)));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    observe();
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (button: GbaButton) => { step(); if (!ended) step([button]); if (!ended) step(); };
  const forcedSelector = () => {
    const selector = state.battleForcedPartySelect;
    return selector && selector.sendOutElapsed === null && selector.elapsed >= PARTY_LIST_INPUT_ELAPSED ? selector : null;
  };
  const until = (predicate: () => boolean) => {
    while (!ended && !predicate()) {
      const selector = forcedSelector();
      if (selector) {
        pulse(selector.message !== null ? "A" : (!selector.submenuOpen && (typeof selector.cursor === "number" ? !selector.party[selector.cursor]!.legal : (selector.cursor as string) !== "magby")) ? "DOWN" : "A");
        continue;
      }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  let end: BattleRecord["end"] = "terminal", error: string | undefined;
  try {
    until(() => phase() === "action-menu");
    while (!ended) {
      const forcedSlot = state.battleCommandPresentation!.forcedMove?.decision.moveSlot ?? null;
      pulse("A");
      if (forcedSlot !== null) {
        slotUses[forcedSlot]!++;
        if (phase() === "no-moves-message") {
          until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
          pulse("A");
        }
        turns++;
        until(() => !state.battleCommandPresentation);
        until(() => phase() === "action-menu");
        continue;
      }
      until(() => phase() === "fight-menu");
      if (ended) break;
      const menu = state.battleCommandPresentation!;
      const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
      const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
      slotUses[slot]!++;
      for (let i = 0; i < 4; i++) {
        const cursor = state.battleCommandPresentation!.fightCursor;
        if (cursor === slot) break;
        pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
      }
      pulse("A");
      turns++;
      until(() => !state.battleCommandPresentation);
      until(() => phase() === "action-menu");
    }
  } catch (e) {
    end = String(e).includes("frame budget") ? "stalled" : "error";
    if (end === "error") error = String(e).slice(0, 160);
  }
  const stalledAt = end !== "stalled" ? undefined : [
    state.battleResolutionPresentation ? `resolution ${state.battleResolutionPresentation.lifecycle.phase}` : null,
    state.battleCommandPresentation ? `command ${state.battleCommandPresentation.lifecycle.phase}` : null,
    state.battlePartySelect ? "party select" : null, state.battleForcedPartySelect ? "forced party select" : null,
  ].filter(Boolean).join(", ");
  battles.push({ battle, seed, streak, frames: frame, end, turns, ...(error ? { error } : {}), ...(stalledAt !== undefined ? { stalledAt } : {}) });
}

const started = Date.now();
// hist73 (hide66Census.ts's rule): --index-from=N numbers a shard's battles as the full run does (battle i = N + local index; streak
// (i * streakMul) % 49), so shards 0..99 / 100..199 / ... (--index-from=100 ...) together equal one --seeds=0..999 run.
const indexFrom = Number(arg("index-from", "0"));
for (let i = indexFrom, seed = fromSeed; seed <= toSeed; i++, seed += seedStep) {
  playBattle(i, seed, (i * streakMul) % 49);
  if (i % 10 === 9) process.stderr.write(`battle ${i + 1} seed ${seed}: ${commands.length} commands, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
}

// ---- report ------------------------------------------------------------------------------------------------------------------
const pct = (a: number, b: number) => (b === 0 ? 0 : +((100 * a) / b).toFixed(2));
const sum = (xs: readonly CommandRecord[], f: (c: CommandRecord) => number) => xs.reduce((a, c) => a + f(c), 0);
const fallbackFrames = (c: CommandRecord) => c.frames - c.liveFrames;
const declined = commands.filter((c) => c.status !== "live");
type Bucket = { move: string; moveId: number; side: string; reason: string; gate: string; count: number; frames: number; weightPct: number;
  details: Map<string, number> };
const bucketMap = new Map<string, Bucket>();
for (const c of declined) {
  const reason = c.decline?.reason ?? "unclassified (no decline recorded)", gate = c.decline?.gate ?? "-";
  const k = `${c.move}|${c.side}|${reason}|${gate}`;
  const b = bucketMap.get(k) ?? { move: c.move, moveId: c.moveId, side: c.side, reason, gate, count: 0, frames: 0,
    weightPct: c.moveId >= 0 ? +(weightOf(c.moveId) * 100).toFixed(3) : 0, details: new Map<string, number>() };
  b.count++; b.frames += fallbackFrames(c);
  if (c.decline?.detail) b.details.set(c.decline.detail, (b.details.get(c.decline.detail) ?? 0) + 1);
  bucketMap.set(k, b);
}
const topDetails = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([d, n]) => `${n}x ${d}`);
const buckets = [...bucketMap.values()].map((b) => ({ ...b, details: topDetails(b.details) }));
const invalidations = new Map<string, { detail: string; count: number; frames: number; moves: Set<string> }>();
for (const c of declined) if (c.decline?.detail) {
  const r = invalidations.get(c.decline.detail) ?? { detail: c.decline.detail, count: 0, frames: 0, moves: new Set<string>() };
  r.count++; r.frames += fallbackFrames(c); r.moves.add(`${c.move}/${c.side}`);
  invalidations.set(c.decline.detail, r);
}
const order = (by: "frames" | "count") => [...buckets].sort((a, b) => b[by] - a[by] || b[by === "frames" ? "count" : "frames"] - a[by === "frames" ? "count" : "frames"]
  || a.move.localeCompare(b.move) || a.side.localeCompare(b.side) || a.reason.localeCompare(b.reason));
const reasonMap = new Map<string, { reason: string; count: number; frames: number; moves: Set<string> }>();
for (const c of declined) {
  const reason = `${c.decline?.stage ?? "?"}: ${c.decline?.reason ?? "unclassified (no decline recorded)"}`;
  const r = reasonMap.get(reason) ?? { reason, count: 0, frames: 0, moves: new Set<string>() };
  r.count++; r.frames += fallbackFrames(c); r.moves.add(c.move);
  reasonMap.set(reason, r);
}
const kinds = (k: CommandRecord["kind"]) => {
  const xs = commands.filter((c) => c.kind === k);
  return { commands: xs.length, live: xs.filter((c) => c.status === "live").length, partial: xs.filter((c) => c.status === "partial").length,
    frames: sum(xs, (c) => c.frames), liveFrames: sum(xs, (c) => c.liveFrames), swapFrames: sum(xs, (c) => c.swapFrames),
    liveSharePctByCount: pct(xs.filter((c) => c.status === "live").length, xs.length), liveSharePctByFrames: pct(sum(xs, (c) => c.liveFrames), sum(xs, (c) => c.frames)) };
};
const report = {
  schema: "hist73-allocator-census/v1",
  config: { seeds: `${fromSeed}..${toSeed}`, seedStep, streakMul, streaks: "(i * streakMul) % 49", battleScene: "on", rentals: "generateInitial [0,1,2]",
    policy: "FIGHT + least-used legal slot (ties: lowest); forced replacement: first healthy member", renderSampleEvery: RENDER_SAMPLE_EVERY,
    presentationRng: "core.ts tick seam replicated: createPresentationRngSession() default seed, fresh per battle" },
  battles: { played: battles.length, terminal: battles.filter((b) => b.end === "terminal").length, stalled: battles.filter((b) => b.end === "stalled").length,
    errors: battles.filter((b) => b.end === "error").map((b) => ({ seed: b.seed, streak: b.streak, error: b.error })),
    stalls: battles.filter((b) => b.end === "stalled").map((b) => ({ seed: b.seed, streak: b.streak, turns: b.turns, at: b.stalledAt })),
    frames: battles.reduce((a, b) => a + b.frames, 0), playerTurns: battles.reduce((a, b) => a + b.turns, 0) },
  overall: {
    commands: commands.length, live: commands.filter((c) => c.status === "live").length, partial: commands.filter((c) => c.status === "partial").length,
    fallback: commands.filter((c) => c.status === "fallback").length,
    frames: sum(commands, (c) => c.frames), liveFrames: sum(commands, (c) => c.liveFrames),
    liveSharePctByCount: pct(commands.filter((c) => c.status === "live").length, commands.length),
    liveSharePctByFrames: pct(sum(commands, (c) => c.liveFrames), sum(commands, (c) => c.frames)),
    moveAnimation: kinds("move"), substituteFade: kinds("substitute-fade"),
  },
  perReason: [...reasonMap.values()].sort((a, b) => b.frames - a.frames || a.reason.localeCompare(b.reason))
    .map((r) => ({ reason: r.reason, count: r.count, frames: r.frames, distinctMoves: r.moves.size })),
  orderHostStateWhenLendUnknown: [...invalidations.values()].sort((a, b) => b.frames - a.frames || a.detail.localeCompare(b.detail))
    .map((r) => ({ detail: r.detail, count: r.count, frames: r.frames, bodies: [...r.moves].sort() })),
  allocatorInvalidatingUnits: (() => {
    const m = new Map<string, { unit: string; count: number; frames: number; bodies: Map<string, number> }>();
    for (const c of declined) if (c.decline?.reason === "sprite allocator history unknown") {
      const unit = (c.decline.detail ?? "allocator: ?").slice("allocator: ".length);
      const r = m.get(unit) ?? { unit, count: 0, frames: 0, bodies: new Map<string, number>() };
      r.count++; r.frames += fallbackFrames(c); r.bodies.set(`${c.move}/${c.side}`, (r.bodies.get(`${c.move}/${c.side}`) ?? 0) + 1);
      m.set(unit, r);
    }
    return [...m.values()].sort((a, b) => b.frames - a.frames || b.count - a.count || a.unit.localeCompare(b.unit))
      .map((r) => ({ unit: r.unit, count: r.count, frames: r.frames, invalidations: allocatorInvalidations.get(r.unit) ?? 0,
        bodies: [...r.bodies].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${n}x ${k}`) }));
  })(),
  hiddenBattlerOrderStops: hiddenStops,
  allocatorReseeds: [...allocatorReseeds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([at, count]) => ({ at, count })),
  allocatorInvalidationsAll: [...allocatorInvalidations].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([unit, count]) => ({ unit, count })),
  topBucketsByFrames: order("frames").slice(0, 25),
  topBucketsByCount: order("count").slice(0, 25),
  bucketCount: buckets.length,
  sanity: { ...sanity, renderThrows: sanity.renderThrows.slice(0, 20), renderThrowCount: sanity.renderThrows.length },
  battleDigest: createHash("sha256").update(JSON.stringify(battles)).digest("hex"),
  commandDigest: createHash("sha256").update(JSON.stringify(commands)).digest("hex"),
};
const text = JSON.stringify(report, null, 1) + "\n";
const out = arg("out");
if (out) writeFileSync(out, text); else process.stdout.write(text);
const commandsOut = arg("commands");
if (commandsOut) writeFileSync(commandsOut, commands.map((c) => JSON.stringify(c)).join("\n") + "\n");
process.stderr.write(`done: ${battles.length} battles, ${commands.length} commands, live ${report.overall.liveSharePctByCount}% by count / ${report.overall.liveSharePctByFrames}% by frames, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
