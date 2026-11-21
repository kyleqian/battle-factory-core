// cf78 (live audit 19 DEFECT 1, ISSUES #143 remainder): Scene ON vs OFF logical parity on a census route with a Castform weather form,
// plus, in Scene ON, every move body's first presented frame: the production render view's `castformForm` per side
// (battleResolutionPresentationRender.ts withLiveCastformForms) and the live decision made in renderBattleResolutionLiveView's order
// (liveSubstituteSwapView, then liveMoveAnimationPresentation with liveMoveHiddenSides). Controller = land75Parity.ts's (the census
// controller: FIGHT + least-used legal slot, forced replacement answered with the first healthy member). At every action-menu arrival
// the battle RNG, rules context (hitMarker bit 128 masked) and boundary must be equal ON vs OFF.
//   battle 950 (seed 950, streak 13): the player's CASTFORM in SEALEO's hail, then against SWELLOW (18 of its 19 bodies live on 9115d5ec3);
//   battle 603 (seed 603, streak 18): the player's CASTFORM in rain (13 live bodies on 9115d5ec3).
//   node --experimental-strip-types --no-warnings tools/integration/cf78Parity.ts [--seed=950] [--streak=13] [--out=file.json]
import { censusDeal } from "./censusRound.ts";
import assert from "node:assert/strict";
import "../../src/engine/monPicPixelsInstall.ts";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro, advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { createBattleResolutionPresentationRenderView, liveMoveRandom2PlanContextAt } from "../../src/engine/battleResolutionPresentationRender.ts";
import { createPresentationRngSession } from "../../src/engine/presentationRngHost.ts";
import { tickLiveMovePresentationRngSession } from "../../src/engine/liveMovePresentationRng.ts";
import { liveMoveAnimationPresentation, liveMoveHiddenSides } from "../../src/engine/liveMoveAnimation.ts";
import { liveSubstituteSwapView } from "../../src/engine/liveSubstituteSwap.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

type S = ReturnType<typeof createFactoryRoundBattleOrchestrator>;
export type Cf78Body = { turn: number; moveId: number; side: number; player: string; opponent: string;
  castformForm: readonly [number, number]; live: boolean };

export function cf78RoutePlay(seed: number, streak: number, scene: "on" | "off") {
  let state: S = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `cf78-parity-${seed}-${streak}`, battleScene: scene, factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, ...censusDeal({ seed, factoryWinStreak: streak }),
  }));
  let frame = 0, ended = false;
  // The census's presentation seam: the default-seed Random2 session, ticked after every logical frame (liveShareCensus.ts).
  let rng = createPresentationRngSession();
  const marks: unknown[] = [];
  const bodies: Cf78Body[] = [];
  let lastBody = "";
  const slotUses = [0, 0, 0, 0];
  let turns = 0, lastMark = -1;
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 400000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    if (scene === "on") rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation;
    if (scene === "on" && r?.lifecycle.phase === "presenting") {
      const c = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (c?.type === "move-animation" && c.animation && key !== lastBody) {
        lastBody = key;
        const view = createBattleResolutionPresentationRenderView(r, rng.host);
        let live = false;
        if (view.effect?.type === "move") {
          const swap = liveSubstituteSwapView(view);
          if (swap?.kind === "swap") live = true;
          else {
            const v = swap ? swap.view : view, e = v.effect;
            if (e?.type === "move") {
              live = liveMoveAnimationPresentation(e.request, v.field, e.age, e.paletteInput, e.spriteAllocatorInput, e.spriteOrderInput,
                e.presentationRng, e.battlerX2Input, liveMoveHiddenSides(v.visibility, e.request)) !== null;
            }
          }
        }
        bodies.push({ turn: turns, moveId: c.animation.moveId, side: c.animation.attacker,
          player: String(view.field.player.species), opponent: String(view.field.opponent.species),
          castformForm: [view.field.player.castformForm ?? 0, view.field.opponent.castformForm ?? 0], live });
      }
    }
    if (!state.battleStartIntro && !state.battleResolutionPresentation && !state.battleCommandPresentation) ended = true;
  };
  const phase = () => state.battleCommandPresentation?.lifecycle.phase;
  const pulse = (b: GbaButton) => { step(); if (!ended) step([b]); if (!ended) step(); };
  const until = (p: () => boolean) => {
    while (!ended && !p()) {
      const sel = state.battleForcedPartySelect;
      if (sel && sel.sendOutElapsed === null && sel.elapsed >= PARTY_LIST_INPUT_ELAPSED) {
        pulse(sel.message !== null ? "A" : (!sel.submenuOpen && (typeof sel.cursor === "number" ? !sel.party[sel.cursor]!.legal : (sel.cursor as string) !== "magby")) ? "DOWN" : "A"); continue;
      }
      step((state.battleStartIntro && frame % 16 === 0) || (state.battleResolutionPresentation?.lifecycle.phase === "awaiting-message-dismiss" && frame % 2 === 0) ? ["A"] : []);
    }
  };
  const mark = () => {
    const b = state.battle; if (!b || lastMark === turns) return; lastMark = turns;
    const { hitMarker, ...rules } = b.rules.rulesContext;
    marks.push({ turn: turns, rng: b.rng, rules, hitMarker: hitMarker & ~128, boundary: b.boundary });
  };
  until(() => phase() === "action-menu");
  while (!ended) {
    mark();
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
    until(() => phase() === "fight-menu"); if (ended) break;
    const menu = state.battleCommandPresentation!;
    const legal = ([0, 1, 2, 3] as const).filter((s) => menu.legalMoveBySlot[s] !== null);
    const slot = legal.length === 0 ? 0 : legal.reduce((best, s) => (slotUses[s]! < slotUses[best]! ? s : best), legal[0]!);
    slotUses[slot]!++;
    for (let i = 0; i < 4; i++) {
      const cursor = state.battleCommandPresentation!.fightCursor;
      if (cursor === slot) break;
      pulse((cursor & 1) !== (slot & 1) ? ((slot & 1) ? "RIGHT" : "LEFT") : ((slot & 2) ? "DOWN" : "UP"));
    }
    pulse("A"); turns++;
    until(() => !state.battleCommandPresentation); until(() => phase() === "action-menu");
  }
  return { marks, bodies, turns, frames: frame, facilityState: state.facilityState, rngValue: state.round.rules.rngValue };
}

/** Both modes; throws unless every action-menu arrival has equal RNG, rules (hitMarker bit 128 masked) and boundary. */
export function cf78Parity(seed: number, streak: number) {
  const on = cf78RoutePlay(seed, streak, "on"), off = cf78RoutePlay(seed, streak, "off");
  assert.equal(on.marks.length, off.marks.length, "turn-boundary count");
  for (let i = 0; i < on.marks.length; i++) assert.deepEqual(on.marks[i], off.marks[i], `turn boundary ${i}`);
  assert.deepEqual(on.facilityState, off.facilityState, "facility state");
  assert.equal(on.rngValue, off.rngValue, "round rng");
  const digest = createHash("sha256").update(JSON.stringify(on.marks)).digest("hex");
  const castform = on.bodies.filter((b) => b.castformForm[0] !== 0 || b.castformForm[1] !== 0);
  return { schema: "cf78-parity/v1", seed, streak, turnBoundariesCompared: on.marks.length, playerTurns: on.turns, framesOn: on.frames,
    framesOff: off.frames, logicalDigest: digest, rngEqual: true, rulesEqual: true, boundaryEqual: true, facilityEqual: true,
    bodiesOn: on.bodies.length, liveBodiesOn: on.bodies.filter((b) => b.live).length, castformBodiesOn: castform.length,
    castformLiveBodiesOn: castform.filter((b) => b.live).length, bodies: on.bodies };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
  const receipt = cf78Parity(Number(arg("seed", "950")), Number(arg("streak", "13")));
  const text = JSON.stringify(receipt, null, 1);
  const out = arg("out", "");
  if (out) writeFileSync(out, `${text}\n`);
  const { bodies: _bodies, ...summary } = receipt;
  console.log(JSON.stringify(summary));
}
