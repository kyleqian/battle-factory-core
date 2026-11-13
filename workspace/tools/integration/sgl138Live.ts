// sgl138 (docs/sgl138-se-gate-live.md): sgs134's IsBattleSEPlaying gate LIVE in production — one ordinary census battle
// (seg127 / sgs134's battle loop: battle i = seed i, streak i * 11 % 49, least-used legal slot, A on even frames while a message
// awaits dismissal) through the production orchestrator, recording per presented command: segment, event index, type, start frame,
// timing, the following print's first glyph (messages), the banner / body start (the first command row whose render effect is
// the stats-change banner at age 0 / the move body at age > 0) and, for every gated command, the production frame hashes of the
// previous command's last row and of every gate row (renderBattleResolutionPresentation + renderBattleResolutionLiveView, core.ts's
// path). Read-only use of production.
//   node --experimental-strip-types --no-warnings tools/integration/sgl138Live.ts --out=<receipt.json>
import { createHash } from "node:crypto";
import "../../src/engine/monPicPixelsInstall.ts";
import { readFileSync, writeFileSync } from "node:fs";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import {
  createBattleResolutionPresentationRenderView,
  liveMoveRandom2PlanContextAt,
  renderBattleResolutionPresentation,
} from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createFramebuffer } from "../../src/engine/framebuffer.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { statsChangeParams, statsChangeSpan } from "../../src/animation/statsChange.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

/** sgs134's census open receipts (fixtures/sgs134/exposure.json): the projected gate of every gated request, by seed / segment / event. */
export type Sgl138Open = { seed: number; seg: string; i: number; tok: string; cls: string; gate: number | null; move: string | null };
export const SGL138_MEASURED = new Set(["stats-change-target", "stats-change-attacker", "multi-hit"]);
export function sgl138OpenReceipts(): Sgl138Open[] {
  return (JSON.parse(readFileSync("tools/integration/fixtures/sgs134/exposure.json", "utf8")) as { openReceipts: Sgl138Open[] }).openReceipts;
}
// The first census seed of every gated class x battler of sgs134's projection (exposure.json openReceipts, gate > 0): multi-hit
// battler 0 / 1 = seeds 0 / 19, stats-change-target 0 / 0 (+ 19), stats-change-attacker 808 / 9. (Was 32 until thr153: ISSUES #141a's
// THRASH lock-in re-run moved census battle 32 onto a Dig whose charge + strike share a segment, a non-multi-hit 2nd move-animation the
// later-hit anchor misreads; 808 is the next projected stats-change-attacker battler-0 seed and the fix leaves its battle unchanged.)
export const SGL138_SEEDS = [0, 9, 19, 808];

export type Sgl138Command = {
  seg: string; index: number; type: string; i: number; seq: number | null; frame: number; startElapsed: number;
  minimumFrames: number | null; holdFrames: number; seGate: number; battler: number | null; move: number | null; rows: number | null;
  glyph: number | null; effectStart: number | null; previousSha: string | null; gateShas: string[]; gateEffects: string[];
};

const FRAME_BUDGET = 200000;
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex").slice(0, 16);

/** One ordinary census battle in production, scene "on" | "off": every presented command (see the header). */
export function sgl138Battle(seed: number, scene: "on" | "off"): { commands: Sgl138Command[]; frames: number } {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const slotUses = [0, 0, 0, 0];
  const out: Sgl138Command[] = [];
  let key = "";
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const render = (s: typeof state, host: typeof rng.host) => {
    const fb = createFramebuffer();
    renderBattleResolutionPresentation(fb, s.battleResolutionPresentation!, { drawScene: renderBattleResolutionLiveView }, host ?? null);
    return sha(fb);
  };
  const observe = (previous: typeof state, previousHost: typeof rng.host) => {
    const r = state.battleResolutionPresentation;
    if (r?.lifecycle.phase !== "presenting" && r?.lifecycle.phase !== "awaiting-message-dismiss") return;
    const segment = r.segments[r.segmentIndex]! as any;
    const command = segment.commands[r.commandIndex] as any;
    if (!command) return;
    const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
    if (k !== key) {
      key = k;
      const seGate = command.timing?.seGateFrames ?? 0;
      const params = command.type === "stats-change" ? statsChangeParams(command.argument) : null;
      out.push({
        seg: `${r.resolutionId.requestId}:${r.segmentIndex}`, index: r.commandIndex, type: command.type,
        i: segment.events.findIndex((e: any) => e.sequence === command.eventSequence), seq: command.eventSequence ?? null,
        frame, startElapsed: r.lifecycle.phaseElapsed, minimumFrames: command.timing?.minimumFrames ?? null,
        holdFrames: command.timing?.holdFrames ?? 0, seGate, battler: command.battler ?? null,
        move: command.type === "move-animation" ? command.animation?.moveId ?? null : null,
        rows: params === null ? null : statsChangeSpan(params).addedRows,
        glyph: null, effectStart: null,
        previousSha: seGate > 0 && previous.battleResolutionPresentation ? render(previous, previousHost) : null,
        gateShas: [], gateEffects: [],
      });
    }
    const last = out.at(-1)!;
    if (last.type === "message" && last.glyph === null) {
      if ((createBattleResolutionPresentationRenderView(r).message?.visibleCharacters ?? 0) >= 1) last.glyph = frame;
    }
    if ((last.type === "stats-change" || last.type === "move-animation") && last.effectStart === null) {
      const view = createBattleResolutionPresentationRenderView(r, rng.host);
      const effect = view.effect as any;
      const elapsed = r.lifecycle.phaseElapsed - last.startElapsed;
      if (last.seGate > 0 && elapsed < last.seGate) {
        last.gateShas.push(render(state, rng.host));
        last.gateEffects.push(effect === null ? "none" : `${effect.type}:${effect.age}${effect.preActivationRow ? ":pre" : ""}`);
      }
      if (last.type === "stats-change" && effect?.type === "stats-change") last.effectStart = elapsed;
      if (last.type === "move-animation" && effect?.type === "move" && effect.age > 0) last.effectStart = elapsed;
    }
  };
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    const previous = state, previousHost = rng.host;
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    observe(previous, previousHost);
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
  until(() => phase() === "action-menu");
  while (!ended) {
    const forcedSlot = state.battleCommandPresentation?.forcedMove?.decision.moveSlot ?? null;
    pulse("A");
    if (forcedSlot !== null) {
      slotUses[forcedSlot]!++;
      if (phase() === "no-moves-message") {
        until(() => (state.battleCommandPresentation?.lifecycle.phaseElapsed ?? NO_MOVES_MESSAGE_HOLD_AT) >= NO_MOVES_MESSAGE_HOLD_AT);
        pulse("A");
      }
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
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
  return { commands: out, frames: frame };
}

/**
 * The anchors of one battle: every stats-change command and every 2nd+ move-animation of a multi-hit (a move-animation of the same
 * move by the same battler after one earlier in its segment, Scene ON) — with the span to the next command (`span`), the following print's first glyph relative to
 * the command start (`glyph`; the next message command of the segment), the banner / body start row (`effectStart`) and, for later
 * hits, the 1st hit's span and body start (`first`).
 */
export function sgl138Anchors(commands: readonly Sgl138Command[]) {
  return commands.flatMap((c, n) => {
    if (c.type !== "stats-change" && c.type !== "move-animation") return [];
    const firstHit = c.type === "move-animation"
      ? commands.slice(0, n).find((p) => p.seg === c.seg && p.type === "move-animation" && p.move === c.move && p.battler === c.battler)
        ?? null : null;
    // Scene OFF's attack pause (no request) is not an anchor: the ROM has no attackanimation request there.
    if (c.type === "move-animation" && (c.move === null || firstHit === null)) return [];
    const next = commands[n + 1];
    const message = commands.slice(n + 1).find((p) => p.type === "message");
    const firstNext = firstHit === null ? undefined : commands[commands.indexOf(firstHit) + 1];
    return [{
      seg: c.seg, i: c.i, type: c.type, battler: c.battler, move: c.move, rows: c.rows, seGate: c.seGate,
      minimumFrames: c.minimumFrames, holdFrames: c.holdFrames,
      span: next === undefined ? null : next.frame - c.frame,
      glyph: message?.seg === c.seg && message.glyph !== null ? message.glyph - c.frame : null,
      effectStart: c.effectStart,
      first: firstHit === null ? null : {
        span: firstNext === undefined ? null : firstNext.frame - firstHit.frame, effectStart: firstHit.effectStart,
      },
      previousSha: c.previousSha, gateShas: c.gateShas, gateEffects: c.gateEffects,
    }];
  });
}

type Anchor = ReturnType<typeof sgl138Anchors>[number];

/**
 * The receipt form of one battle's anchors (no hashes): per anchor the production gate, sgs134's census projection for the same
 * request (exposure.json openReceipts by seed / segment / event index; 0 when not an open measured receipt), the rows, and the checks:
 * banner / body start, the following print's first glyph / the later hit's span, and the gate rows' pixels == the previous row's.
 */
export function sgl138ReceiptBattle(seed: number, frames: number, anchors: readonly Anchor[], open: readonly Sgl138Open[]) {
  const projection = new Map(open.filter((o) => o.seed === seed).map((o) => [`${o.seg}|${o.i}`, o]));
  return {
    frames,
    anchors: anchors.map((a) => {
      const o = projection.get(`${a.seg}|${a.i}`);
      const projected = o !== undefined && SGL138_MEASURED.has(o.cls) && o.gate !== null ? o.gate : 0;
      return {
        seg: a.seg, i: a.i, type: a.type, battler: a.battler, move: a.move, cls: o?.cls ?? null, gate: a.seGate, projected,
        rows: a.rows, minimumFrames: a.minimumFrames, holdFrames: a.holdFrames, span: a.span, glyph: a.glyph,
        effectStart: a.effectStart, first: a.first,
        gateRowsEqualPrevious: a.gateShas.length === a.seGate && a.gateShas.every((h) => h === a.previousSha),
        gateEffects: [...new Set(a.gateEffects)],
      };
    }),
  };
}

if (process.argv[1]?.endsWith("sgl138Live.ts")) {
  const outPath = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
  if (!outPath) throw new Error("--out=<receipt.json>");
  const open = sgl138OpenReceipts();
  const battles: Record<string, ReturnType<typeof sgl138ReceiptBattle>> = {};
  for (const seed of SGL138_SEEDS) for (const scene of ["on", "off"] as const) {
    const { commands, frames } = sgl138Battle(seed, scene);
    battles[`${seed}-${scene}`] = sgl138ReceiptBattle(seed, frames, sgl138Anchors(commands), open);
  }
  const all = Object.entries(battles).flatMap(([k, b]) => b.anchors.map((a) => ({ scene: k.split("-")[1]!, ...a })));
  const gated = all.filter((a) => a.gate > 0);
  const summary = {
    anchors: all.length, gated: gated.length, gateFrames: gated.reduce((n, a) => n + a.gate, 0),
    gateEqualsProjection: all.filter((a) => a.gate === a.projected).length,
    cells: [...new Set(gated.map((a) => `${a.scene}|${a.cls}|${a.battler}`))].sort(),
    statsChangeBannerAtGate: all.filter((a) => a.type === "stats-change" && a.effectStart === a.gate).length,
    statsChangeGlyphAtGatePlusRowsPlusHold: all.filter((a) => a.type === "stats-change"
      && a.glyph === a.gate + a.rows! + a.holdFrames && a.span === a.glyph).length,
    statsChange: all.filter((a) => a.type === "stats-change").length,
    laterHitShiftEqualsGate: all.filter((a) => a.type === "move-animation" && a.first !== null
      && a.span! - a.first.span! === a.gate && a.effectStart! - a.first.effectStart! === a.gate).length,
    laterHits: all.filter((a) => a.type === "move-animation").length,
    gateRowsEqualPrevious: gated.filter((a) => a.gateRowsEqualPrevious).length,
  };
  writeFileSync(outPath, `${JSON.stringify({
    schema: "sgl138-live-receipt/v1", note: "docs/sgl138-se-gate-live.md; tools/integration/sgl138Live.ts --out=<this file>",
    seeds: SGL138_SEEDS, summary, battles,
  }, null, 1)}\n`);
}
