// land75 (hist73 Part B fold): Scene ON vs OFF logical parity on the two census routes with a hidden-battler order stop (hide66Parity.ts's
// controller and comparison: FIGHT + least-used legal slot, forced replacement answered with the first healthy member; at every
// action-menu arrival the battle RNG, rules context (hitMarker bit 128 masked) and boundary must be equal), plus, in Scene ON, the order
// host at the first presented frame of EVERY move body (known flag, invalid reason, hidden battlers) and the allocator history flag.
//   battle 533 (seed 533, streak 32): the opponent's Fly charger KO'd by Toxic while airborne (a hidden battler's faint);
//   battle 713 (seed 713, streak 3): the player's forced party menu while the opponent is mid-Bounce (a reshow with a hidden opponent).
//   node --experimental-strip-types --no-warnings tools/integration/land75Parity.ts [--seed=533] [--streak=32] [--out=file.json]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro, advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

type S = ReturnType<typeof createFactoryRoundBattleOrchestrator>;
export type Land75Body = { turn: number; moveId: number; moveTurn: number; side: number; orderKnown: boolean; invalidReason: string | null;
  hidden: readonly boolean[]; allocatorKnown: boolean | null };

export function land75RoutePlay(seed: number, streak: number, scene: "on" | "off") {
  let state: S = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `land75-parity-${seed}-${streak}`, rngValue: seed, battleScene: scene, factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let frame = 0, ended = false;
  const marks: unknown[] = [];
  const bodies: Land75Body[] = [];
  let lastBody = "";
  const slotUses = [0, 0, 0, 0];
  let turns = 0, lastMark = -1;
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 400000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    const r = state.battleResolutionPresentation;
    const orderHost = state.liveMoveSpriteAllocatorHost?.orderHost;
    if (scene === "on" && r?.lifecycle.phase === "presenting" && orderHost !== undefined) {
      const c = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (c?.type === "move-animation" && c.animation && key !== lastBody) {
        lastBody = key;
        bodies.push({ turn: turns, moveId: c.animation.moveId, moveTurn: c.animation.turn, side: c.animation.attacker,
          orderKnown: orderHost.tracker.cursor.order.known, invalidReason: orderHost.tracker.invalidReason, hidden: orderHost.hidden,
          allocatorKnown: state.liveMoveSpriteAllocatorHost?.host.historyKnown ?? null });
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
  return { marks, bodies, turns, frames: frame };
}

/** Both modes; throws unless every action-menu arrival has equal RNG, rules (hitMarker bit 128 masked) and boundary. */
export function land75Parity(seed: number, streak: number) {
  const on = land75RoutePlay(seed, streak, "on"), off = land75RoutePlay(seed, streak, "off");
  assert.equal(on.marks.length, off.marks.length, "turn-boundary count");
  for (let i = 0; i < on.marks.length; i++) assert.deepEqual(on.marks[i], off.marks[i], `turn boundary ${i}`);
  const digest = createHash("sha256").update(JSON.stringify(on.marks)).digest("hex");
  const stops = [...new Set(on.bodies.map((b) => b.invalidReason).filter((x) => x !== null))];
  return { schema: "land75-parity/v1", seed, streak, turnBoundariesCompared: on.marks.length, playerTurns: on.turns, framesOn: on.frames,
    framesOff: off.frames, logicalDigest: digest, rngEqual: true, rulesEqual: true, boundaryEqual: true, bodiesOn: on.bodies.length,
    orderKnownBodiesOn: on.bodies.filter((b) => b.orderKnown).length, allocatorKnownBodiesOn: on.bodies.filter((b) => b.allocatorKnown).length,
    orderStopsOn: stops, bodies: on.bodies };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
  const receipt = land75Parity(Number(arg("seed", "533")), Number(arg("streak", "32")));
  const text = JSON.stringify(receipt, null, 1);
  const out = arg("out", "");
  if (out) writeFileSync(out, `${text}\n`);
  const { bodies: _bodies, ...summary } = receipt;
  console.log(JSON.stringify(summary));
}
