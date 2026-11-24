// sag130 (S10A, ISSUES #168 slice SA2; docs/sag130-status-se-gate-live.md): the Scene ON status-animation command carries the
// controller's IsBattleSEPlaying gate (seg127's rule, docs/seg127-status-se-gate.md: clamp(seRows - seAge, 0, 29), 56 / 56 direct-mGBA
// receipts) on top of the ROM controller rows. Proof through production on census battles carrying every gated class of seg127's
// exposure projection (fixtures/seg127/exposure.json openReceipts, seeds 0..999), both sides where the census has one: the frames from
// the anchor to the command after the status animation are ON - OFF = gate + STATUS_ANIMATION_ADDED_ROWS = the ROM controllerRows, so
// the following print's first glyph lands on the ROM row (sa125's anchor pattern; Scene OFF's span is ROM-exact, off121). With gate 0
// (sa125's rule) every one of these anchors is short by exactly its gate (asserted below; revert experiment in the doc).
import { censusDeal } from "../tools/integration/censusRound.ts";
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
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation.ts";

const ROWS = STATUS_ANIMATION_ADDED_ROWS as Readonly<Record<string, number>>;
type Open = { seed: number; k: number; anim: string; side: string; cls: string; gate: number };
const OPEN = (JSON.parse(readFileSync("tools/integration/fixtures/seg127/exposure.json", "utf8")) as { openReceipts: Open[] }).openReceipts;
// seg127 rom-r1.json's gated classes (fixtures/seg127/receipts/rom-r1.json, §1a): ROM gate per side, the rule's residual 0.
const ROM = JSON.parse(readFileSync("tools/integration/fixtures/seg127/receipts/rom-r1.json", "utf8")) as
  { scenarios: Record<string, { class: string; statusAnimations: { label: string; gate: number; controllerRows: number; activeRows: number }[] }> };

// The first census seed of each gated class x animation x side of the projection (exposure.json openReceipts with gate > 0).
// seg268: exposure.json regenerated on the current kernel (seeds 0..999 Scene ON), which re-anchors every class to its first projected carrier and
// restores hit-secondary|BRN|player, hit-secondary|PSN|opponent and yawn|SLP|player (dropped by abl261 / dmg264 / aiv266 census changes; their
// re-stage notes are gone). Two classes the old projection lacked are now carried too (contact-ability|PRZ|player 933, hit-secondary|BRN|opponent 103).
// Named gap: yawn|SLP|opponent has no gated carrier in 0..999 on the current kernel (5 open receipts, all gate 0); the ROM receipts of the rule
// itself stay in the second test.
const SEEDS = [3, 26, 27, 103, 209, 230, 294, 296, 446, 468, 553, 664, 705, 802, 931, 933];

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
    id: `live-share-census-${seed}-${(seed * 11) % 49}`, battleScene: scene,
    factoryWinStreak: (seed * 11) % 49, playerTrainerId: 416049562,
    battleTowerLevel50WinStreak: 0, facilityState: { rentsCount: 0 },
    ...censusDeal({ seed, factoryWinStreak: (seed * 11) % 49 }),
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
  // hse2 item 2: the Scene OFF confusion print before the used print holds 64 + 3 + 4 (ROM print -> used print 94 vs ON 90, hpf4m-confuse-off,
  // tests/hse2OffStatusHeads.test.ts); this test is about the status-SE gate alone, so read that print at the ON hold (cfx1: 64 + 1).
  // pmk1: the Scene OFF "is in love" head (64 + 3 + 3) is read at the ON head hold 64 + 1 as well.
  const confusionOffHold = (c: any, events: any[]) => c.type === "message" && (c.timing?.holdFrames === 71 || c.timing?.holdFrames === 67)
    && events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNISCONFUSED"
    ? { ...c, timing: { ...c.timing, holdFrames: 65 } }
    : c.type === "message" && (c.timing?.holdFrames === 70 || c.timing?.holdFrames === 67) && events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNINLOVE"
      ? { ...c, timing: { ...c.timing, holdFrames: 65 } } : c;
  const off = battleSegments(seed, "off").flatMap((s) => s.commands.map((c: any) => ({ c: confusionOffHold(c, s.events), events: s.events })));
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

// cfa1 (2026-11-23): the pre-move "is confused!" status animation carries the 5 script rows before the used / self-hit
// print (preMoveConfusionToUsedPrintRows). cfm1 (2026-11-24, ROM probe of 15 chains in both scenes, docs/aud251-s11-scoreboard-refresh.md
// "cfm1") showed the ROM identity holds (ON - OFF = 100 from `return` on) and the engine is right (OFF exact, ON within 1 row):
// the extra here is this test's own normalisation of the OFF confusion hold (71 -> 67) applied to OFF only. fpl1 (chp1): the ON "is confused!" head
// holds 64 + 1 (cfx1: 65; fpl1 had 64 + 2) against the normalised OFF 67, and the command carries 6 rows before the used
// print (cfa1's 5 re-derived with the shorter head on the six cfa1 labs) or 4 before the self-hit print (ROM `DoSelfConfusionDmg` 104, not 105), so
// ON - OFF is the command length less that 1-row hold difference. Not dropped: the rows are still inside the ON command (docs/aud251 "fpl1").
// Only when the next message is the used / self-hit print (the engine's condition), so on this path the extra is 0, 4 or 6.
const cfa1PreMoveConfusionRows = (a: { animation: string; path: string; length: number; gate: number }): number => {
  const extra = a.length - a.gate - ROWS[a.animation]!;
  return (a.animation === "CONFUSION" && a.path === "STRINGID_PKMNISCONFUSED" && (extra === 4 || extra === 6) ? extra : 0)
    || (a.animation === "INFATUATION" && a.path === "STRINGID_PKMNINLOVE" && extra === 4 ? extra : 0);
};
// tnl1 (ROM labs gsp3-toxic / b4m-thunderwave, docs/aud251-s11-scoreboard-refresh.md "tnm1" 1.C): a move-inflicted PSN / BRN / PRZ (BattleScript_MoveEffect{Poison,Toxic,Burn,Paralysis}) holds its animation 2 rows longer, the ROM's print row (369 vs 367).
// cfx1: so does BattleScript_MoveEffectConfusion's chosenstatus2animation on every path but the pre-move head (labs aud242f-swagger-player-on / aud242b-flatter-player-on / cfa1-conf-psychic-s2-on: SE 176 -> print 99 rows, the engine's 97).
const tnl1MoveInflictedRows = (a: { animation: string; path: string; length: number; gate: number }): number =>
  ((a.path === "inflicted" && (a.animation === "PSN" || a.animation === "BRN" || a.animation === "PRZ")) || (a.animation === "CONFUSION" && a.path !== "STRINGID_PKMNISCONFUSED"))
  && a.length - a.gate - ROWS[a.animation]! === 2 ? 2 : 0;
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
        expect(a.length, `${seed} #${a.k} ${a.animation}`).toBe(a.gate + ROWS[a.animation]! + cfa1PreMoveConfusionRows(a) + tnl1MoveInflictedRows(a));
        expect(a.on - a.off, `${seed} #${a.k} ${a.animation} ${a.side} ${a.path}`).toBe(a.gate + ROWS[a.animation]! + cfa1PreMoveConfusionRows(a) + tnl1MoveInflictedRows(a));
        if (a.gate === 0) continue;
        // sa125's gate-0 rule: short by exactly the gate on every gated anchor
        expect(a.on - a.off - ROWS[a.animation]!, `${seed} #${a.k}`).toBe(a.gate + tnl1MoveInflictedRows(a));
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
      "thrash-fatigue|CONFUSION|opponent", "yawn|SLP|player", "hit-secondary|BRN|player", "hit-secondary|PSN|opponent", // seg268: restored
      "contact-ability|PRZ|player", "hit-secondary|BRN|opponent", // seg268: new carriers (yawn|SLP|opponent stays a named gap)
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
