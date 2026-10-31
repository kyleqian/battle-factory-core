// alloc52: Scene ON vs OFF logical parity on one census route (seed/streak) that crosses a newly audited (prep52) status animation (FRZ / INFATUATION / CURSED / NIGHTMARE) or move body
// before live allocator bodies. Same controller policy (FIGHT + least-used legal slot, forced replacement: first healthy member)
// in both modes; at every action-menu arrival the battle RNG, rules context (hitMarker bit 128 masked) and boundary must be equal.
//   node --experimental-strip-types --no-warnings tools/integration/alloc52Parity.ts [--seed=84] [--streak=42] [--out=file.json]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro, advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { LIVE_SPRITE_ALLOCATOR_NET_ZERO_MOVE_IDS } from "../../src/engine/liveMoveSpriteAllocator.ts";
import { spriteOrderStatusAnimationName } from "../../src/engine/spriteOrderEventTransform.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";

const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const seed = Number(arg("seed", "84")), streak = Number(arg("streak", "42")), out = arg("out", "");
type S = ReturnType<typeof createFactoryRoundBattleOrchestrator>;

function play(scene: "on" | "off") {
  let state: S = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `alloc52-parity-${seed}-${streak}`, rngValue: seed, battleScene: scene, factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let frame = 0, ended = false;
  const marks: unknown[] = [];
  const crossings: { turn: number; status: string; laterAllocatorKnown: boolean }[] = [];
  const seen = new Set<string>(), pending: string[] = [];
  const PREP52_BODIES = new Set([3, 7, 8, 13, 20, 62, 69, 71, 72, 76, 87, 107, 111, 118, 126, 138, 183, 193, 195, 200, 205, 207, 209, 218, 224, 228, 229, 241, 245, 248, 252, 254, 256, 261, 269, 275, 278, 301, 348, 351]);
  const bodyCrossings: { turn: number; moveId: number; allocatorKnownAfter: boolean }[] = [];
  let lastBody = "";
  const slotUses = [0, 0, 0, 0];
  let turns = 0, lastMark = -1;
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > 400000) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    const r = state.battleResolutionPresentation;
    if (scene === "on" && r?.lifecycle.phase === "presenting") {
      const c = r.segments[r.segmentIndex]!.commands[r.commandIndex];
      const key = `${r.resolutionId.requestId}:${r.segmentIndex}:${r.commandIndex}`;
      if (c?.type === "move-animation" && key !== lastBody && state.liveMoveSpriteAllocatorHost !== undefined) {
        lastBody = key;
        if (PREP52_BODIES.has(c.animation?.moveId ?? -1)) bodyCrossings.push({ turn: turns, moveId: c.animation!.moveId, allocatorKnownAfter: state.liveMoveSpriteAllocatorHost.host.historyKnown });
        const bodies = r.segments.flatMap((sg) => sg.commands).flatMap((x) => x.type === "move-animation" ? [x.eventSequence] : []);
        const next = bodies.filter((q) => q > c.eventSequence).sort((x, y) => x - y)[0];
        const enqueue = (keep: (seq: number) => boolean) => {
          for (const sg of r.segments) for (const e of sg.events) {
            const id = `${r.resolutionId.requestId}:${e.sequence}`;
            if (e.payload.kind !== "status-animation" || seen.has(id) || !keep(e.sequence)) continue;
            seen.add(id);
            const name = spriteOrderStatusAnimationName(e.payload.isStatus2 !== 0, e.payload.status);
            if (name === "FRZ" || name === "INFATUATION" || name === "CURSED" || name === "NIGHTMARE") pending.push(name);
          }
        };
        enqueue((q) => q < c.eventSequence);
        // Status animations crossed since the previous body (between two bodies, or trailing the previous body / turn).
        for (const name of pending) crossings.push({ turn: turns, status: name, laterAllocatorKnown: state.liveMoveSpriteAllocatorHost.host.historyKnown });
        pending.length = 0;
        enqueue((q) => q > c.eventSequence && (next === undefined || q < next));
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
    pulse("A"); until(() => phase() === "fight-menu"); if (ended) break;
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
  return { marks, crossings, bodyCrossings, turns, frames: frame };
}

const on = play("on"), off = play("off");
assert.equal(on.marks.length, off.marks.length, "turn-boundary count");
for (let i = 0; i < on.marks.length; i++) assert.deepEqual(on.marks[i], off.marks[i], `turn boundary ${i}`);
assert.ok(on.crossings.length > 0 || on.bodyCrossings.length > 0, "route crosses no prep52 status animation / body before a body");
const digest = createHash("sha256").update(JSON.stringify(on.marks)).digest("hex");
const receipt = { schema: "alloc52-parity/v1", seed, streak, turnBoundariesCompared: on.marks.length, playerTurns: on.turns,
  framesOn: on.frames, framesOff: off.frames, logicalDigest: digest, rngEqual: true, rulesEqual: true, boundaryEqual: true,
  crossingsBeforeBodyOn: on.crossings, prep52BodiesActiveOn: on.bodyCrossings, allocatorKnownAtEveryCrossing: on.crossings.every((c) => c.laterAllocatorKnown) };
console.log(JSON.stringify(receipt, null, 1));
if (out) writeFileSync(out, JSON.stringify(receipt, null, 1) + "\n");
