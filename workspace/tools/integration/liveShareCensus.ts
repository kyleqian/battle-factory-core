// S10A ORDINARY-PLAY LIVE-SHARE CENSUS: how often real Factory play (Scene ON) presents a move body through a live adapter vs
// the scene-off fallback, and why. Each battle is a generated Level-50 rental draft (seed, streak; rentals 0..2) played to its
// terminal boundary with ordinary controller input only: FIGHT, then the least-used LEGAL move slot (so all 4 slots get used),
// forced replacements answered with the first healthy member (generatedCommandAnimationReplay's selector). Read-only use of
// production: every presented frame of every move-animation / substitute-fade command is classified exactly as
// renderBattleResolutionLiveView decides it (liveSubstituteSwapView, then liveMoveAnimationPresentation; substituteFadeRenderView),
// and every fallback carries the production gate that fired (liveShareCensusGates.ts). No oracle.
//   node --experimental-strip-types --no-warnings tools/integration/liveShareCensus.ts --seeds=<from>..<to> [--seed-step=N]
//     [--streak-mul=N] [--index-from=N] [--out=report.json] [--commands=commands.jsonl] [--scene=on|off]
// --scene=off (sub157, default on) plays the same battles under Battle Scene OFF (the main-lane ripple census); the report's
// config.battleScene says which.
// Battle i (0-based) uses seed = from + i * seedStep and streak = (i * streakMul) % 49 (streaks 0..48, challenges 0..6).
// --index-from=N (default 0) starts i at N, so parallel shards (--seeds=100..199 --index-from=100, ...) reproduce exactly the battles
// (ids, streaks) of one --seeds=0..999 run; without it every shard restarts i at 0 and plays a DIFFERENT battle set (hist73 / cf78 /
// st76 used private copies with this flag, 2026-10-10).
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
import { generalAnimationRenderView, renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
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
// trf174: Transform (144) renders through renderLiveTransformBody when liveMoveAnimationDuration has its case (absent on older trees,
// which this overlaid census also runs: there the id never reaches the branch with a non-null duration).
const LIVE_TRANSFORM_MOVE_ID = 144;

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const battleScene = arg("scene", "on") as "on" | "off";
if (battleScene !== "on" && battleScene !== "off") throw new Error(`--scene must be on or off, got ${battleScene}`);
const [fromSeed, toSeed] = arg("seeds", "0..9")!.split("..").map(Number) as [number, number];
const seedStep = Number(arg("seed-step", "1")), streakMul = Number(arg("streak-mul", "11")), indexFrom = Number(arg("index-from", "0"));
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
const generalAnimations: { battle: number; animation: string; side: "player" | "opponent"; frames: number; drawnFrames: number }[] = [];
const battles: BattleRecord[] = [];
const sanity = { sampledLiveFrames: 0, renderedOk: 0, renderThrows: [] as string[] };
let liveFrameCounter = 0;

function playBattle(battle: number, seed: number, streak: number): void {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene,
    factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  const fb = new Uint8Array(240 * 160 * 4);
  // core.ts tick's presentation seam (after the logical frame): the default-seed Random2 session, a fresh one per battle (each
  // battle is the session's first), feeding the faithful-random adapters exactly as createInitialState / render do.
  let rng = createPresentationRngSession();
  let frame = 0, ended = false, turns = 0, commandKey = "", current: CommandRecord | null = null, generalKey = "";
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const observe = () => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting") return;
    const command = r.segments[r.segmentIndex]!.commands[r.commandIndex];
    // fpp150: general animations (B_ANIM_FOCUS_PUNCH_SETUP) are counted apart, outside `commands` (digests unchanged).
    if (command?.type === "general-animation") {
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      const view = createBattleResolutionPresentationRenderView(r, rng.host);
      if (key !== generalKey) {
        generalKey = key;
        generalAnimations.push({ battle, animation: command.animation, side: command.battler === 0 ? "player" : "opponent", frames: 0, drawnFrames: 0 });
      }
      const rec = generalAnimations.at(-1)!;
      rec.frames++;
      if (generalAnimationRenderView(view) !== null) rec.drawnFrames++;
      return;
    }
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
      // trf174: the renderer's live Transform body (renderLiveTransformBody), before the adapter presentation.
      else if (view.effect.request.moveId === LIVE_TRANSFORM_MOVE_ID
        && liveMoveAnimationDuration(view.effect.request, (swap ? swap.view : view).field) !== null) live = true;
      else {
        const v = swap ? swap.view : view, e = v.effect;
        if (e?.type === "move") {
          const hiddenSides = liveMoveHiddenSides(v.visibility, e.request);
          const presentation = liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
            e.presentationRng, e.battlerX2Input, hiddenSides);
          live = presentation !== null;
          if (presentation?.faithfulRandomHistory) rec.faithfulRandomHistoryFrames = (rec.faithfulRandomHistoryFrames ?? 0) + 1;
          if (!live && !rec.decline) {
            rec.decline = classifyPresentationDecline({ request: e.request, field: v.field, age: e.age, paletteInput: e.paletteInput,
              spriteAllocatorInput: e.spriteAllocatorInput, spriteOrderInput: e.spriteOrderInput, presentationRngInput: e.presentationRng,
              battlerX2Input: e.battlerX2Input, hiddenSides });
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
  schema: "live-share-census/v1",
  config: { seeds: `${fromSeed}..${toSeed}`, seedStep, streakMul, streaks: "(i * streakMul) % 49", battleScene, rentals: "generateInitial [0,1,2]",
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
    // words46 (docs/live-share-census.md "Faithful-random history"): live commands whose order lend resolved through a Random2-words unit's
    // deferred marker are a separate faithful-random claim (D3), counted beside live (they are included in `live` / `liveFrames`).
    faithfulRandomHistory: (() => {
      const xs = commands.filter((c) => c.status === "live" && (c.faithfulRandomHistoryFrames ?? 0) > 0);
      const frames = sum(commands, (c) => c.faithfulRandomHistoryFrames ?? 0);
      return { commands: xs.length, frames, partialOrOther: commands.filter((c) => c.status !== "live" && (c.faithfulRandomHistoryFrames ?? 0) > 0).length,
        pctOfAllByCount: pct(xs.length, commands.length), pctOfAllByFrames: pct(frames, sum(commands, (c) => c.frames)),
        liveExcludingItByCount: pct(commands.filter((c) => c.status === "live").length - xs.length, commands.length),
        liveExcludingItByFrames: pct(sum(commands, (c) => c.liveFrames) - frames, sum(commands, (c) => c.frames)) };
    })(),
  },
  perReason: [...reasonMap.values()].sort((a, b) => b.frames - a.frames || a.reason.localeCompare(b.reason))
    .map((r) => ({ reason: r.reason, count: r.count, frames: r.frames, distinctMoves: r.moves.size })),
  orderHostStateWhenLendUnknown: [...invalidations.values()].sort((a, b) => b.frames - a.frames || a.detail.localeCompare(b.detail))
    .map((r) => ({ detail: r.detail, count: r.count, frames: r.frames, bodies: [...r.moves].sort() })),
  topBucketsByFrames: order("frames").slice(0, 25),
  topBucketsByCount: order("count").slice(0, 25),
  bucketCount: buckets.length,
  sanity: { ...sanity, renderThrows: sanity.renderThrows.slice(0, 20), renderThrowCount: sanity.renderThrows.length },
  battleDigest: createHash("sha256").update(JSON.stringify(battles)).digest("hex"),
  // dive70: the battle records without the presented-frame count (end, turns, seed, streak): equal whenever only body LENGTHS change
  battleDigestExcludingFrames: createHash("sha256").update(JSON.stringify(battles.map(({ frames: _frames, ...rest }) => rest))).digest("hex"),
  battleFrames: battles.map((b) => b.frames),
  // fpp150: general-animation commands (counted apart from `commands`): per battle, presented / drawn frames.
  generalAnimations: {
    commands: generalAnimations.length, frames: sum(generalAnimations, (g) => g.frames), drawnFrames: sum(generalAnimations, (g) => g.drawnFrames),
    records: generalAnimations,
  },
  commandDigest: createHash("sha256").update(JSON.stringify(commands)).digest("hex"),
};
const text = JSON.stringify(report, null, 1) + "\n";
const out = arg("out");
if (out) writeFileSync(out, text); else process.stdout.write(text);
const commandsOut = arg("commands");
if (commandsOut) writeFileSync(commandsOut, commands.map((c) => JSON.stringify(c)).join("\n") + "\n");
process.stderr.write(`done: ${battles.length} battles, ${commands.length} commands, live ${report.overall.liveSharePctByCount}% by count / ${report.overall.liveSharePctByFrames}% by frames, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
