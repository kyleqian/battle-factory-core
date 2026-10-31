// S10A words59RainWordsDiag: liveShareCensus.ts with a hook listing every RAIN_CONTINUES event whose sub-stream words were never
// recorded (--only=<seeds> plays just those battles, same indices / streaks).
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
import { writeFileSync } from "node:fs";
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
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { substituteFadeRenderView } from "../../src/engine/liveSubstituteFade.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import movesJson from "../../src/data/gen/moves.json" with { type: "json" };
import monsJson from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import policyJson from "../../src/data/gen/factory-round-policy.json" with { type: "json" };
import { classifyDurationDecline, classifyPresentationDecline, type Decline } from "./liveShareCensusGates.ts";

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
  /**
   * words46: live frames whose presentation reports `faithfulRandomHistory` (the order lend resolved through a Random2-words unit's
   * deferred marker: ANIMATION_VERIFICATION.md D3, a per-command faithful-random claim even for a scoped-exact adapter). Absent = 0.
   */
  faithfulRandomHistoryFrames?: number;
}
interface BattleRecord { battle: number; seed: number; streak: number; frames: number; end: "terminal" | "stalled" | "error"; error?: string; turns: number;
  stalledAt?: string }

const commands: CommandRecord[] = [];
const battles: BattleRecord[] = [];
const sanity = { sampledLiveFrames: 0, renderedOk: 0, renderThrows: [] as string[] };
let liveFrameCounter = 0;

const rainSeen = new Map<string, { battle: number; seed: number; streak: number; recorded: boolean; segments: number; cmds: string; lastEvent?: number; phases: string[] }>();
function playBattle(battle: number, seed: number, streak: number): void {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: "on",
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  const fb = new Uint8Array(240 * 160 * 4);
  // core.ts tick's presentation seam (after the logical frame): the default-seed Random2 session, a fresh one per battle (each
  // battle is the session's first), feeding the faithful-random adapters exactly as createInitialState / render do.
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, turns = 0, commandKey = "", current: CommandRecord | null = null;
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
          const presentation = liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
            e.presentationRng, e.battlerX2Input);
          live = presentation !== null;
          if (presentation?.faithfulRandomHistory) rec.faithfulRandomHistoryFrames = (rec.faithfulRandomHistoryFrames ?? 0) + 1;
          if (!live && !rec.decline) {
            rec.decline = classifyPresentationDecline({ request: e.request, field: v.field, age: e.age, paletteInput: e.paletteInput,
              spriteAllocatorInput: e.spriteAllocatorInput, spriteOrderInput: e.spriteOrderInput, presentationRngInput: e.presentationRng,
              battlerX2Input: e.battlerX2Input });
            // The lend is absent: name the production order host's own state (spriteOrderEventTransform.ts invalidReason).
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
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    {
      // words59: every RAIN_CONTINUES event of every presented resolution, with the segment's commands and whether its sub-stream is recorded
      const r = state.battleResolutionPresentation;
      if (r) for (let si = 0; si < r.segments.length; si += 1) for (const ev of r.segments[si]!.events) {
        if (ev.payload.kind !== "animation" || (ev.payload as { animationId?: string }).animationId !== "RAIN_CONTINUES") continue;
        const key = `general:${r.resolutionId.requestId}:${si}:${ev.sequence}`;
        const prev = rainSeen.get(key);
        const recorded = (rng.host?.bodies ?? []).some((b) => b.key === key);
        const cmds = r.segments[si]!.commands.map((c) => `${c.type}@${"eventSequence" in c ? c.eventSequence : "-"}`).join(" ");
        const last = r.segments[si]!.events.at(-1)?.sequence;
        rainSeen.set(key, { battle, seed, streak, recorded: (prev?.recorded ?? false) || recorded, segments: r.segments.length,
          cmds, lastEvent: last, phases: [...new Set([...(prev?.phases ?? []), `${r.segmentIndex}:${r.commandIndex}:${r.lifecycle.phase}`])].slice(0, 12) });
      }
    }
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
      pulse("A");
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
const only = arg("only")?.split(",").map(Number);
for (let i = 0, seed = fromSeed; seed <= toSeed; i++, seed += seedStep) {
  if (only !== undefined && !only.includes(seed)) continue;
  playBattle(i, seed, (i * streakMul) % 49);
  if (i % 10 === 9) process.stderr.write(`battle ${i + 1} seed ${seed}: ${commands.length} commands, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
}

const unrecorded = [...rainSeen].filter(([, v]) => !v.recorded);
console.log(JSON.stringify({ rainEvents: rainSeen.size, unrecorded: unrecorded.length }));
for (const [key, v] of unrecorded) console.log(key, JSON.stringify(v));
