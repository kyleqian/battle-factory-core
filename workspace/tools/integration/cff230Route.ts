// cff230 (Castform weather forms, Scene ON): census-route driver (lsd194Census.ts' input loop) that records every presented frame of the
// resolution segments carrying a CASTFORM_CHANGE animation event, with the command index per frame, plus a structure dump.
//   node --experimental-strip-types --no-warnings tools/integration/cff230Route.ts --seed=950 [--dump] [--out=dir]
import { censusDeal } from "./censusRound.ts";
import {
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution, advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro, createFactoryRoundBattleOrchestrator,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import "../../src/engine/monPicPixelsInstall.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { renderBattleResolutionLiveView } from "../../src/engine/battleScene.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import { collectSoundTick, type SoundEvent } from "../../src/audio/soundEvents.ts";
import { emitTickSounds } from "../../src/engine/tickSounds.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

export type RouteFrame = { frame: number; segment: number; command: number; type: string; rgba: Uint8Array };
export type RouteSegment = { index: number; events: any[]; commands: any[]; frames: RouteFrame[]; startFrame: number; raw: any };

/** Plays census seed `seed`; returns the segments whose events hold a CASTFORM_CHANGE (frames rendered when `render`). */
export function cff230Route(seed: number, render: boolean, stopAfterSegments = 99, scene: "on" | "off" = "on", onStep?: (frame: number, state: any, sounds: readonly SoundEvent[]) => void): { segments: RouteSegment[] } {
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const out: RouteSegment[] = []; const bySeg = new Map<unknown, RouteSegment>();
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const buf = new Uint8Array(240 * 160 * 4);
  const step = (buttons: readonly string[] = []) => {
    if (++frame > 200000) throw new Error("frame budget");
    const before = state;
    const { events: sounds } = collectSoundTick(frame, () => {
      if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons) as never);
      else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons) as never);
      else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons) as never);
      if (onStep) emitTickSounds({ battleScene: null, factoryRoundBattleOrchestrator: before } as never, { battleScene: null, factoryRoundBattleOrchestrator: state } as never);
    });
    onStep?.(frame, state, sounds);
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    if (r) {
      for (const s of r.segments) {
        if (bySeg.has(s)) continue;
        if (s.events.some((e: any) => e.payload.kind === "animation" && e.payload.animationId === "CASTFORM_CHANGE")) {
          const seg: RouteSegment = { index: out.length, events: s.events, commands: s.commands, frames: [], startFrame: frame, raw: s };
          bySeg.set(s, seg); out.push(seg);
        } else bySeg.set(s, null as never);
      }
      const s = r.segments[r.segmentIndex]; const seg = bySeg.get(s);
      if (seg && r.lifecycle.phase === "presenting" && render) {
        const c = s.commands[r.commandIndex];
        buf.fill(0);
        renderBattleResolutionLiveView(buf, createBattleResolutionPresentationRenderView(r, rng.host));
        seg.frames.push({ frame, segment: r.segmentIndex, command: r.commandIndex, type: c?.type ?? "?", rgba: Uint8Array.from(buf) });
      }
    }
    if (!owned()) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: string) => { step(); if (!ended) step([b]); if (!ended) step(); };
  const forcedSelector = () => {
    const s = state.battleForcedPartySelect;
    return s && s.sendOutElapsed === null && s.elapsed >= PARTY_LIST_INPUT_ELAPSED ? s : null;
  };
  const until = (p: () => boolean) => {
    while (!ended && !p()) {
      const s = forcedSelector();
      if (s) { pulse(s.message !== null ? "A" : (!s.submenuOpen && (typeof s.cursor === "number" ? !s.party[s.cursor]!.legal : (s.cursor as string) !== "magby")) ? "DOWN" : "A"); continue; }
      step((state.battleStartIntro && frame % 16 === 0)
        || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  const slotUses = [0, 0, 0, 0];
  until(() => phase() === "action-menu");
  while (!ended && out.length < stopAfterSegments) {
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
  return { segments: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const seed = Number(arg("seed"));
  const { segments } = cff230Route(seed, false);
  for (const s of segments) {
    console.log(`== segment ${s.index} (start frame ${s.startFrame})`);
    for (const e of s.events) {
      const p = e.payload;
      console.log(`  ev ${e.sequence} ${p.kind} ${p.animationId ?? ""} b=${p.battler ?? ""} ${JSON.stringify(p.arguments ?? p.text ?? "").slice(0, 80)}`);
    }
    s.commands.forEach((c, i) => console.log(`  cmd ${i} ${c.type} b=${c.battler ?? ""} seq=${c.eventSequence} min=${c.timing?.minimumFrames ?? ""} ${c.lines ? JSON.stringify(c.lines) : ""} ${c.animation?.moveId ?? ""}`));
  }
}
