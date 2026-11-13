// hide66: fly63Parity.ts generalized to any two-turn route (--moves=91 = Dig, 291 = Dive; default Fly / Bounce / Sky Uppercut).
// fly63: Scene ON vs OFF logical parity on one census route that crosses a Fly 19 / Bounce 340 two-turn pair (alloc52Parity.ts's
// controller and comparison; docs/next-adapters-prep61.md). Same controller policy (FIGHT + least-used legal slot, forced replacement:
// first healthy member) in both modes; at every action-menu arrival the battle RNG, rules context (hitMarker bit 128 masked) and boundary
// must be equal. Scene ON also records, at the first presented frame of every Fly / Bounce / Sky Uppercut body, the order host's
// known flag and hidden battlers (the presentation-only state fly63 changes).
//   node --experimental-strip-types --no-warnings tools/integration/hide66Parity.ts [--seed=81] [--streak=9] [--moves=19,327,340] [--out=file.json]
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createFactoryRoundBattleOrchestrator, beginFactoryRoundBattleStartIntro, advanceFactoryRoundBattleStartIntro,
  advanceFactoryRoundBattleCommand, advanceFactoryRoundBattleResolution,
} from "../../src/engine/factoryRoundBattleOrchestrator.ts";
import { PARTY_LIST_INPUT_ELAPSED } from "../../src/engine/partySelect.ts";
import type { GbaButton } from "../../src/input.ts";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../../src/engine/battleCommandPresentation.ts";

const arg = (n: string, d: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const seed = Number(arg("seed", "81")), streak = Number(arg("streak", "9")), out = arg("out", "");
type S = ReturnType<typeof createFactoryRoundBattleOrchestrator>;
/** Fly / Bounce setup + unleash bodies and the Sky Uppercut that hits the hidden Fly user on census battle 81. */
const FLY63_ROUTE_MOVES: ReadonlySet<number> = new Set((arg("moves", "19,327,340") ?? "19,327,340").split(",").map(Number));

function play(scene: "on" | "off") {
  let state: S = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `fly63-parity-${seed}-${streak}`, rngValue: seed, battleScene: scene, factoryWinStreak: streak, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 }, rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let frame = 0, ended = false;
  const marks: unknown[] = [];
  const crossings: { turn: number; status: string; laterAllocatorKnown: boolean }[] = [];
  const bodies: { turn: number; moveId: number; side: number; orderKnown: boolean; hidden: readonly boolean[] }[] = [];
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
      if (c?.type === "move-animation" && key !== lastBody && FLY63_ROUTE_MOVES.has(c.animation?.moveId ?? -1)) {
        lastBody = key;
        bodies.push({ turn: turns, moveId: c.animation!.moveId, side: c.animation!.attacker ?? -1, orderKnown: orderHost.tracker.cursor.order.known,
          hidden: orderHost.hidden });
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

const on = play("on"), off = play("off");
assert.equal(on.marks.length, off.marks.length, "turn-boundary count");
for (let i = 0; i < on.marks.length; i++) assert.deepEqual(on.marks[i], off.marks[i], `turn boundary ${i}`);
assert.ok(on.bodies.some((x) => FLY63_ROUTE_MOVES.has(x.moveId) && x.moveId !== 327), "route crosses no two-turn body");
const digest = createHash("sha256").update(JSON.stringify(on.marks)).digest("hex");
const receipt = { schema: "hide66-parity/v1", moves: [...FLY63_ROUTE_MOVES], seed, streak, turnBoundariesCompared: on.marks.length, playerTurns: on.turns,
  framesOn: on.frames, framesOff: off.frames, logicalDigest: digest, rngEqual: true, rulesEqual: true, boundaryEqual: true,
  flyBounceRouteBodiesOn: on.bodies };
console.log(JSON.stringify(receipt, null, 1));
if (out) writeFileSync(out, JSON.stringify(receipt, null, 1) + "\n");
