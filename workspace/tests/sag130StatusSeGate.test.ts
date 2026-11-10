// sag130 (S10A, ISSUES #168 slice SA2; docs/sag130-status-se-gate-live.md): the Scene ON status-animation command carries the
// controller's IsBattleSEPlaying gate (seg127's rule, docs/seg127-status-se-gate.md: clamp(seRows - seAge, 0, 29), 56 / 56 direct-mGBA
// receipts) on top of the ROM controller rows. Proof through production on census battles carrying every gated class of seg127's
// exposure projection (fixtures/seg127/exposure.json openReceipts, seeds 0..999), both sides where the census has one: the frames from
// the anchor to the command after the status animation are ON - OFF = gate + STATUS_ANIMATION_ADDED_ROWS = the ROM controllerRows, so
// the following print's first glyph lands on the ROM row (sa125's anchor pattern; Scene OFF's span is ROM-exact, off121). With gate 0
// (sa125's rule) every one of these anchors is short by exactly its gate (asserted below; revert experiment in the doc).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  advanceFactoryRoundBattleCommand,
  advanceFactoryRoundBattleResolution,
  advanceFactoryRoundBattleStartIntro,
  beginFactoryRoundBattleStartIntro,
  createFactoryRoundBattleOrchestrator,
} from "../src/engine/factoryRoundBattleOrchestrator";
import { liveMoveRandom2PlanContextAt } from "../src/engine/battleResolutionPresentationRender";
import { STATUS_ANIMATION_ADDED_ROWS } from "../src/engine/battleResolutionPresentation";
import { seg127StatusSeGateFromEvents } from "../src/engine/seg127StatusSeGate";
import { createPresentationRngSession } from "../src/engine/presentationRngHost";
import { tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect";
import type { GbaButton } from "../src/input";

const ROWS = STATUS_ANIMATION_ADDED_ROWS as Readonly<Record<string, number>>;
type Open = { seed: number; k: number; anim: string; side: string; cls: string; gate: number };
const OPEN = (JSON.parse(readFileSync("tools/integration/fixtures/seg127/exposure.json", "utf8")) as { openReceipts: Open[] }).openReceipts;
// seg127 rom-r1.json's gated classes (fixtures/seg127/receipts/rom-r1.json, §1a): ROM gate per side, the rule's residual 0.
const ROM = JSON.parse(readFileSync("tools/integration/fixtures/seg127/receipts/rom-r1.json", "utf8")) as
  { scenarios: Record<string, { class: string; statusAnimations: { label: string; gate: number; controllerRows: number; activeRows: number }[] }> };

// The first census seed of each gated class x animation x side of the projection (exposure.json openReceipts with gate > 0).
// abl261 (ISSUES #202) re-stage: the full ability resolver changes census seeds 206 / 230 / 264 / 294 / 348 / 440 / 931 (both scenes), so seg127's
// exposure.json projection (derived from the old census) no longer describes them. Classes re-staged to the first UNCHANGED seed carrying them:
// yawn|SLP|player 230 -> 965, CONFUSION|opponent 294 -> 388, CONFUSION|player 348 -> 437, FRZ|opponent 440 -> 547. No unchanged census seed carries
// hit-secondary|BRN|player (206), yawn|SLP|opponent (264) or hit-secondary|PSN|opponent (931): those three drop out of the census anchors (ROM
// receipts of the rule itself stay in the second test; regenerating exposure.json is a follow-up).
// dmg264 re-stage: the corrected type walk / screens change census seed 437 (its CONFUSION|player battle no longer matches the projection), so
// CONFUSION|player 437 -> 856 (the next projected carrier; the per-open-receipt animation / side / path / gate equality below holds on it).
const SEEDS = [3, 27, 209, 296, 388, 856, 446, 547, 664, 705, 802, 965];

const FRAME_BUDGET = 200000;

type Seg = { events: any[]; commands: any[]; rules: string };
const cache = new Map<string, Seg[]>();
/** One ordinary census battle (liveShareCensus.ts playBattle: battle i = seed i, streak i * 11 % 49): its segments in order. */
function battleSegments(seed: number, scene: "on" | "off"): Seg[] {
  const key = `${seed}-${scene}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: Seg[] = [];
  let state = beginFactoryRoundBattleStartIntro(createFactoryRoundBattleOrchestrator({
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, rngValue: seed, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    rentals: { type: "generateInitial", selectedRentalIndexes: [0, 1, 2] },
  }));
  let rng = createPresentationRngSession();
  let frame = 0, ended = false;
  const seen = new Set<unknown>();
  const slotUses = [0, 0, 0, 0];
  const owned = () => Boolean(state.battleStartIntro || state.battleResolutionPresentation || state.battleCommandPresentation);
  const step = (buttons: readonly GbaButton[] = []) => {
    if (++frame > FRAME_BUDGET) throw new Error("frame budget");
    if (state.battleStartIntro) state = advanceFactoryRoundBattleStartIntro(state, new Set(buttons));
    else if (state.battleResolutionPresentation) state = advanceFactoryRoundBattleResolution(state, new Set(buttons));
    else if (state.battleCommandPresentation) state = advanceFactoryRoundBattleCommand(state, new Set(buttons));
    rng = tickLiveMovePresentationRngSession(rng, state, liveMoveRandom2PlanContextAt);
    const r = state.battleResolutionPresentation as any;
    if (r) for (const s of r.segments) if (!seen.has(s)) { seen.add(s); out.push({ events: s.events, commands: s.commands,
      rules: JSON.stringify(s.afterRules, (k, v) => (k === "hitMarker" ? v & ~0x80 : v)) }); }
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
  cache.set(key, out);
  return out;
}

const frames = (c: any) => (c.timing?.minimumFrames ?? 0) + (c.timing?.holdFrames ?? 0);
const shape = (c: any) => `${c.type}:${c.type === "message" ? c.messageId ?? "" : ""}:${c.type === "move-animation" || c.type === "status" ? "" : frames(c)}`;
const ANCHOR_TYPES = new Set(["status", "message", "hp", "stat", "status-icon"]);
type Anchor = { k: number; animation: string; side: "player" | "opponent"; path: string; gateFlag: boolean; gate: number;
  gatePath: string | null; length: number; on: number; off: number; orderOk: boolean };

/**
 * Per Scene ON status-animation command of a battle: the path (the print right before it on the after-print paths, else
 * "inflicted"), its order, and the frames from the nearest preceding anchor command (status / message / hp / stat / status-icon,
 * matched across the scenes by its type ordinal) to the command right after it (the print on the inflicted paths, the HP bar on
 * the end-turn ticks, ...), ON and OFF. Kept only where the commands between
 * the two (without the status-animation ones) are identical in both scenes, so ON - OFF is the status-animation frames alone.
 */
function anchors(seed: number): { anchors: Anchor[]; unanchored: number; offAnimations: number } {
  const on = battleSegments(seed, "on").flatMap((s) => s.commands.map((c: any) => ({ c, events: s.events })));
  const off = battleSegments(seed, "off").flatMap((s) => s.commands.map((c: any) => ({ c, events: s.events })));
  const messages = (l: typeof on) => l.filter((x) => x.c.type === "message").map((x) => x.c.messageId);
  expect(messages(on), `seed ${seed}: identical prints in both scenes`).toEqual(messages(off));
  const ordinal = (l: typeof on, i: number) => l.slice(0, i).filter((x) => x.c.type === l[i]!.c.type).length;
  const nth = (l: typeof on, type: string, n: number) => { let k = -1; return l.findIndex((x) => x.c.type === type && ++k === n); };
  const out: Anchor[] = [];
  let unanchored = 0;
  let k = -1;
  on.forEach(({ c, events }, i) => {
    if (c.type !== "status-animation") return;
    k += 1;
    const at = events.findIndex((e: any) => e.sequence === c.eventSequence);
    const rule = seg127StatusSeGateFromEvents(events.map((e: any) => e.payload), at);
    let prev = at - 1;
    while (prev >= 0 && (events[prev].payload.kind === "set-battler-pp-data" || events[prev].payload.kind === "play-se")) prev -= 1;
    const before = prev >= 0 ? events[prev].payload : null;
    const path = before?.kind === "message" ? before.messageId : "inflicted";
    let used = at - 1;
    while (used >= 0 && !(events[used].payload.kind === "message" && events[used].payload.messageId === "STRINGID_USEDMOVE")) used -= 1;
    const damaged = used >= 0 && events.slice(used, at).some((e: any) => e.payload.kind === "hp-change" && e.payload.to < e.payload.from);
    const neighbours = [on[i - 1]?.c, on[i + 1]?.c].filter((x) => x?.eventSequence !== undefined).map((x) => x.eventSequence);
    const orderOk = (on[i - 1]?.c.eventSequence ?? -Infinity) < c.eventSequence && c.eventSequence < (on[i + 1]?.c.eventSequence ?? Infinity)
      && neighbours.length >= 1;
    // The span starts on the latest print before it, or right after the latest body (any non-anchor command) if that is later.
    let left = i;
    while (left - 1 >= 0 && (ANCHOR_TYPES.has(on[left - 1]!.c.type) || on[left - 1]!.c.type === "status-animation")) {
      left -= 1;
      if (on[left]!.c.type === "message") break;
    }
    let right = i + 1;
    while (right < on.length && on[right]!.c.type === "status-animation") right += 1;
    const onSpan = on.slice(left, right).filter((x) => x.c.type !== "status-animation");
    const offRight = right >= on.length ? -1 : nth(off, on[right]!.c.type, ordinal(on, right));
    const offLeft = offRight - onSpan.length;
    const offSpan = offLeft < 0 ? [] : off.slice(offLeft, offRight);
    const bodyBefore = (l: typeof on, k: number) => (k > 0 ? shape(l[k - 1]!.c).replace(/:\d*$/, "") : "");
    if (offRight < 0 || offLeft < 0 || onSpan.map((x) => shape(x.c)).join() !== offSpan.map((x) => shape(x.c)).join()
      || bodyBefore(on, left) !== bodyBefore(off, offLeft)) {
      unanchored += 1;
      return;
    }
    out.push({
      k, animation: c.animation, side: c.battler === 0 ? "player" : "opponent", path, gateFlag: path === "inflicted" && damaged,
      gate: rule?.gate ?? 0, gatePath: rule?.path ?? null, length: c.timing.minimumFrames, orderOk,
      on: on.slice(left, right).reduce((sum, x) => sum + frames(x.c), 0), off: offSpan.reduce((sum, x) => sum + frames(x.c), 0),
    });
  });
  const offAnimations = off.filter((x) => x.c.type === "status-animation").length;
  return { anchors: out, unanchored, offAnimations };
}

describe("sag130: the IsBattleSEPlaying gate in production (census routes, Scene ON vs OFF)", () => {
  it("every gated class lands its following print on the ROM row: ON - OFF = gate + controller rows, gate == seg127's projection", () => {
    const covered = new Map<string, number[]>();
    let total = 0, gatedTotal = 0, unanchoredTotal = 0, gateFrames = 0;
    for (const seed of SEEDS) {
      const { anchors: list, unanchored, offAnimations } = anchors(seed);
      expect(offAnimations, `seed ${seed}: Scene OFF has no status-animation command`).toBe(0);
      unanchoredTotal += unanchored;
      const open = new Map(OPEN.filter((o) => o.seed === seed).map((o) => [o.k, o]));
      for (const a of list) {
        total += 1;
        const o = open.get(a.k);
        if (o !== undefined) {
          expect([a.animation, a.side, a.gatePath], `seed ${seed} #${a.k}`).toEqual([o.anim, o.side, o.cls]);
          expect(a.gate, `seed ${seed} #${a.k} ${o.cls} ${o.anim}: production gate == seg127's census projection`).toBe(o.gate);
        } else {
          expect(a.gate, `seed ${seed} #${a.k}: not an open receipt -> gate 0`).toBe(0);
        }
        expect(a.orderOk, `${seed} ${a.animation} ${a.path}`).toBe(true);
        expect(a.length, `${seed} #${a.k} ${a.animation}`).toBe(a.gate + ROWS[a.animation]!);
        expect(a.on - a.off, `${seed} #${a.k} ${a.animation} ${a.side} ${a.path}`).toBe(a.gate + ROWS[a.animation]!);
        if (a.gate === 0) continue;
        // sa125's gate-0 rule: short by exactly the gate on every gated anchor
        expect(a.on - a.off - ROWS[a.animation]!, `${seed} #${a.k}`).toBe(a.gate);
        gatedTotal += 1;
        gateFrames += a.gate;
        const key = `${a.gatePath}|${a.animation}|${a.side}`;
        covered.set(key, [...(covered.get(key) ?? []), a.gate]);
      }
    }
    console.log(`sag130 anchors: ${total} anchored, ${gatedTotal} gated (${gateFrames} gate frames), ${unanchoredTotal} unanchored; `
      + [...covered].sort().map(([k, g]) => `${k}=${g.join("/")}`).join(" "));
    expect(unanchoredTotal).toBeLessThan(total / 5);
    for (const k of [
      "hit-secondary|FRZ|player", "hit-secondary|FRZ|opponent", "hit-secondary|CONFUSION|player",
      "hit-secondary|CONFUSION|opponent", "hit-secondary|PRZ|player", "hit-secondary|PRZ|opponent", "hit-secondary|PSN|player",
      "contact-ability|BRN|opponent", "contact-ability|PRZ|opponent", "contact-ability|PSN|opponent",
      "yawn|SLP|player", "thrash-fatigue|CONFUSION|opponent",
    ]) expect(covered.has(k), k).toBe(true);
  }, 600_000);

  it("the ROM's gated receipts are exactly gate + the table's rows (controllerRows = gate + active rows + 1)", () => {
    let gated = 0;
    for (const [stem, s] of Object.entries(ROM.scenarios)) {
      for (const r of s.statusAnimations) {
        expect(r.controllerRows, `${stem} ${r.label}`).toBe(r.gate + r.activeRows + 1);
        if (r.gate > 0) gated += 1;
      }
    }
    expect(gated).toBe(16);
  });
});
