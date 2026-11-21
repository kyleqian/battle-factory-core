// idle94 (S10A timing fidelity): the PRODUCTION orchestrator's command timeline of one ordinary census battle, Scene ON or OFF.
// The battle loop is liveShareCensus.ts's playBattle (same orchestrator config, inputs and least-used legal slot policy). Every
// battle-resolution command start is logged with its frame, (segment, command) index, type, eventSequence, moveId / attacker for
// move-animation commands and the production duration (battleResolutionCommandDuration), so the frames production spends between
// two shared anchors can be compared ON vs OFF (idle94Compare.py). Read-only use of production; no oracle.
//   node --experimental-strip-types --no-warnings tools/integration/idle94Route.ts --seed=N --streak=N --scene=on|off --out=file.json
import { censusDeal } from "./censusRound.ts";
import { writeFileSync } from "node:fs";
import "../../src/engine/monPicPixelsInstall.ts";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleStartIntro, advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { liveMoveAnimationDuration, liveMoveAnimationPresentation } from "../../src/engine/liveMoveAnimation.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

const arg = (name: string, fallback?: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const seed = Number(arg("seed")), streak = Number(arg("streak", "0")), scene = arg("scene", "on") as "on" | "off", out = arg("out")!;
const FRAME_BUDGET = 200000;

type Row = { frame: number; seg: number; cmd: number; type: string; ev: number | null; moveId?: number; attacker?: number; duration?: number | null;
  live?: boolean; lines?: string };
const rows: Row[] = [];
let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
  id: `live-share-census-${seed}-${streak}`, battleScene: scene,
  factoryWinStreak: streak, playerTrainerId: 416049562,
  battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
  ...censusDeal({ seed, factoryWinStreak: streak }),
}));
let rng = createPresentationRngSession();
let frame = 0, ended = false, key = "";
const slotUses = [0, 0, 0, 0];
const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
const observe = () => {
  const r = state.battleResolutionPresentation;
  if (r?.lifecycle.phase !== "presenting") return;
  const k = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
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
} catch (e) { end = String(e).slice(0, 120); }
writeFileSync(out, JSON.stringify({ schema: "idle94-route/v1", seed, streak, scene, frames: frame, end, rows }));
console.log(`${scene} seed ${seed} streak ${streak}: ${frame} frames, ${rows.length} commands, ${end}`);
