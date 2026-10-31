// ont193 (docs/ont193-scene-on-tails.md): idle94RouteRender.ts, but the command AFTER the body is rendered for --after-rows (default 40) rows instead of its first row
// only, so the body-end -> tail -> next-change window can be read off the per-row sha. Run in a base tree and the final tree.
// idle94: render every row of the FIRST move-animation command of --move by --side in one ordinary census battle (Scene ON; the
// liveShareCensus.ts battle loop), plus the first row of the command after it, through production's renderBattleResolutionLiveView,
// and log sha256[:16] per row with the effect age and the live decision. Run the SAME file inside a base and a patched archive copy;
// idle94RenderCheck.py compares them (patched rows 0..N-1 == base row 0; patched row N+k == base row k; next-command rows equal).
//   node --experimental-strip-types --no-warnings tools/integration/idle94RouteRender.ts --seed=N --streak=N --move=M --side=player|opponent --out=f.json
import { writeFileSync } from "node:fs";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation, liveMoveHiddenSides } from "../../src/engine/liveMoveAnimation.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createHash } from "node:crypto";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const seed = Number(arg("seed")), streak = Number(arg("streak", "0")), scene = "on" as const, out = arg("out")!;
const targetMove = Number(arg("move")), targetSide = arg("side") === "opponent" ? 1 : 0;
const fb = new Uint8Array(240 * 160 * 4);
type RenderRow = { frame: number; elapsed: number; age: number | null; live: boolean; sha: string };
const render: RenderRow[] = [];
let targetKey: string | null = null, afterKey: string | null = null, done = false;
const FRAME_BUDGET = 200000;
const afterRows = Number(arg("after-rows", "40"));

type Row = { frame: number; seg: number; cmd: number; type: string; ev: number | null; moveId?: number; attacker?: number; duration?: number | null;
  live?: boolean; lines?: string };
const rows: Row[] = [];
let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `live-share-census-${seed}-${streak}`, rngValue: seed, battleScene: scene,
  factoryWinStreak: streak, playerTrainerId: 416049562,
  battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
  rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
}));
let rng = createPresentationRngSession();
let frame = 0, ended = false, key = "";
const slotUses = [0, 0, 0, 0];
const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
const observe = () => {
  const r = state.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting") return;
  const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
  if (!done) {
    const c = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
    if (targetKey === null && c?.type === "move-animation" && c.animation?.moveId === targetMove && c.animation?.attacker === targetSide) targetKey = k;
    else if (targetKey !== null && k !== targetKey && afterKey === null) afterKey = k;
    if (targetKey !== null && (k === targetKey || k === afterKey)) {
      const view = createBattleResolutionPresentationRenderView(r, rng.host);
      fb.fill(0);
      renderBattleResolutionLiveView(fb, view);
      const e = view.effect as any;
      const live = e?.type === "move" && liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput,
        e.spriteOrderInput, e.presentationRng, e.battlerX2Input, liveMoveHiddenSides(view.visibility, e.request)) !== null;
      render.push({ frame, elapsed: r.lifecycle.phaseElapsed, age: e?.type === "move" ? e.age : null, live,
        sha: createHash("sha256").update(fb).digest("hex").slice(0, 16), ...(k === afterKey ? { after: true } : {}) } as RenderRow);
      if (k === afterKey && render.filter((x: any) => x.after).length >= afterRows) done = true;
    }
  }
  if (k === key) return;
  key = k;
  const command = r.segments[r.segmentIndex]!.commands[r.commandIndex] as any;
  const row: Row = { frame, seg: r.segmentIndex, cmd: r.commandIndex, type: command?.type ?? "?", ev: command?.eventSequence ?? null };
  if (command?.type === "move-animation") {
    const view = createBattleResolutionPresentationRenderView(r, rng.host);
    row.moveId = command.animation?.moveId ?? -1; row.attacker = command.animation?.attacker ?? command.battler;
    row.duration = command.animation ? liveMoveAnimationDuration(command.animation, view.field) : null;
    const e = view.effect as any;
    row.live = e?.type === "move" && liveMoveAnimationPresentation(e.request, view.field, e.age, e.paletteInput, e.spriteAllocatorInput,
      e.spriteOrderInput, e.presentationRng, e.battlerX2Input) !== null;
  }
  if (command?.type === "message") row.lines = JSON.stringify(command.lines).slice(0, 80);
  rows.push(row);
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
let end = "terminal";
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
    until(() => !state.battleCommandPresentation);
    until(() => phase() === "action-menu");
  }
} catch (e) { end = String(e).slice(0, 120); }
writeFileSync(out, JSON.stringify({ schema: "idle94-route-render/v1", seed, streak, move: targetMove, side: targetSide, frames: frame, end,
  targetRows: render.filter((x: any) => !x.after).length, render, rows }));
console.log(`seed ${seed} streak ${streak} move ${targetMove}/${targetSide}: ${render.length} rendered rows, ${frame} frames, ${end}`);
