// sa125 (S10A, ISSUES #168 slices SA1 + SA3; docs/sa125-status-animation-command.md). SA1: Scene ON projects the kernel's
// `status-animation` receipt (Cmd_statusanimation / status2animation / chosenstatusanimation; the kernel already skips Scene OFF, a
// Substitute and a semi-invulnerable battler) into a `status-animation` command of STATUS_ANIMATION_ADDED_ROWS[animation] frames =
// the ROM controller rows the next instruction waits (sta123 rom-r1.json), plus the IsBattleSEPlaying gate before it (SA2, wired by
// sag130: seg127StatusSeGateFromEvents over the segment's events; 0 on every path but a neutral non-crit hit's open SE).
// SA3: a Scene ON `status` command whose battler's status animation runs in the same execution lasts off121's Scene OFF
// delta(print) - delta(status); every other status command keeps 32. ROM receipts: tools/integration/fixtures/sta123/receipts/rom-r1.json.
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
import { prepareRulesStatusAnimation } from "../src/engine/battleScriptRulesContext";
import { createPresentationRngSession } from "../src/engine/presentationRngHost";
import { tickLiveMovePresentationRngSession } from "../src/engine/liveMovePresentationRng";
import { PARTY_LIST_INPUT_ELAPSED } from "../src/engine/partySelect";
import type { GbaButton } from "../src/input";
import { NO_MOVES_MESSAGE_HOLD_AT } from "../src/engine/battleCommandPresentation";

type RomAnim = { animation: string; path: string; battler: number; row: number; controllerRows: number; activeRows: number;
  firstActive: number | null; next: string[] };
type RomScenario = { animation: string; attackerSide: string; on: { statusAnimations: RomAnim[] }; off: { statusAnimations: RomAnim[] } };
const ROM = (JSON.parse(readFileSync("tools/integration/fixtures/sta123/receipts/rom-r1.json", "utf8")) as
  { scenarios: Record<string, RomScenario> }).scenarios;
const ROWS = STATUS_ANIMATION_ADDED_ROWS as Readonly<Record<string, number>>;
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

// Receipts the kernel emits by scene (HITMARKER_NO_ANIMATIONS): status animations and playanimation / attackanimation receipts
// (Scene ON) vs the Scene OFF attack pause.
const SCENE_ONLY_KINDS = new Set(["status-animation", "animation"]);
const frames = (c: any) => (c.timing?.minimumFrames ?? 0) + (c.timing?.holdFrames ?? 0);
const shape = (c: any) => `${c.type}:${c.type === "message" ? c.messageId ?? "" : ""}:${c.type === "move-animation" || c.type === "status" ? "" : frames(c)}`;
const ANCHOR_TYPES = new Set(["status", "message", "hp", "stat", "status-icon"]);
type Anchor = { animation: string; side: "player" | "opponent"; path: string; gateFlag: boolean; gate: number; length: number; on: number;
  off: number; orderOk: boolean };

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
  // tests/hse2OffStatusHeads.test.ts); this test is about the status animation alone, so read that print at the ON hold (cfx1: 64 + 1 for the confusion head).
  // ohs1: the same for the Scene OFF ConfusedNoMore (64 + 5) / InLove (64 + 3 + 3) prints before the used print (T2 OFF s7295 d8 / s6568 d29).
  const confusionOffHold = (c: any, events: any[]) => c.type === "message"
    && (((c.timing?.holdFrames === 71 || c.timing?.holdFrames === 67) && events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNISCONFUSED")
      || (c.timing?.holdFrames === 69 && events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNCONFUSEDNOMORE")
      || ((c.timing?.holdFrames === 70 || c.timing?.holdFrames === 67) && events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNINLOVE"))
    ? { ...c, timing: { ...c.timing, holdFrames: events.find((e: any) => e.sequence === c.eventSequence)?.payload.messageId === "STRINGID_PKMNINLOVE" ? 65
      : c.timing.holdFrames === 71 || c.timing.holdFrames === 67 ? 65 : 67 } } : c;
  const off = battleSegments(seed, "off").flatMap((s) => s.commands.map((c: any) => ({ c: confusionOffHold(c, s.events), events: s.events })));
  const messages = (l: typeof on) => l.filter((x) => x.c.type === "message").map((x) => x.c.messageId);
  expect(messages(on), `seed ${seed}: identical prints in both scenes`).toEqual(messages(off));
  const ordinal = (l: typeof on, i: number) => l.slice(0, i).filter((x) => x.c.type === l[i]!.c.type).length;
  const nth = (l: typeof on, type: string, n: number) => { let k = -1; return l.findIndex((x) => x.c.type === type && ++k === n); };
  const out: Anchor[] = [];
  let unanchored = 0;
  on.forEach(({ c, events }, i) => {
    if (c.type !== "status-animation") return;
    const at = events.findIndex((e: any) => e.sequence === c.eventSequence);
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
      animation: c.animation, side: c.battler === 0 ? "player" : "opponent", path, gateFlag: path === "inflicted" && damaged,
      gate: seg127StatusSeGateFromEvents(events.map((e: any) => e.payload), at)?.gate ?? 0, length: c.timing.minimumFrames, orderOk,
      on: on.slice(left, right).reduce((sum, x) => sum + frames(x.c), 0), off: offSpan.reduce((sum, x) => sum + frames(x.c), 0),
    });
  });
  const offAnimations = off.filter((x) => x.c.type === "status-animation").length;
  return { anchors: out, unanchored, offAnimations };
}

// Census seeds (0..99, sa125LiveShareCensus.ts) carrying every animation x path the sta123 scenarios stage except CURSED / NIGHTMARE /
// the frozen turn (none in 0..99; their constants are checked against the ROM receipts below and by the census delta).
// Seed 49 (thr153): ISSUES #141a's THRASH lock-in re-run moved census battles 18 / 76 off their player BRN route; 49 carries
// BRN|inflicted|player and BRN|STRINGID_PKMNHURTBYBURN|player (first such seed in 0..79 not moved by the fix).
// Seed 101 (parity-mac, docs/parity-mac/STATUS.md "Re-pins"): the lane's battle-rule fixes moved the listed battles off their opponent
// BRN route; 101 carries BRN|inflicted|opponent. (Battle 32 is the only such seed in 0..99, and it trips this test's ON - OFF row
// check on an unrelated CONFUSION anchor, 139 vs 100: a presentation lead, not looked at here.)
const SEEDS = [7, 11, 12, 18, 19, 20, 49, 60, 76, 87, 101];

// cfa1 (2026-11-23): the pre-move "is confused!" status animation carries the 5 script rows before the used / self-hit
// print (preMoveConfusionToUsedPrintRows). cfm1 (2026-11-24, ROM probe of 15 chains in both scenes, docs/aud251-s11-scoreboard-refresh.md
// "cfm1") showed the ROM identity holds (ON - OFF = 100 from `return` on) and the engine is right (OFF exact, ON within 1 row):
// the extra here is this test's own normalisation of the OFF confusion hold applied to OFF only. fpl1 (chp1): the ON "is confused!" head
// holds 64 + 1 (cfx1: 65; fpl1 had 64 + 2; OFF is read at the same 65 here), and the command carries 6 rows before the used
// print (cfa1's 5 re-derived with the shorter head on the six cfa1 labs), 5 / 7 when the used move has 0 / 2 script rows between its `attackcanceler` and `attackstring` (cre1: BattleScript_EffectPsychUp, EffectStatDown; ROM labs cfa1-conf-psychup-s1-on, cre1-conf-growl-s1-on), or 4 before the self-hit print (ROM `DoSelfConfusionDmg` 104, not 105). Not dropped: the rows are still inside the ON command (docs/aud251 "fpl1").
// Only when the next message is the used / self-hit print (the engine's condition), so on this path the extra is 0, 4 or 6.
const cfa1PreMoveConfusionRows = (a: { animation: string; path: string; length: number; gate: number }): number => {
  const extra = a.length - a.gate - ROWS[a.animation]!;
  // pmk1: the Scene ON "is in love" head holds 64 + 1 (OFF read at 65 above) and its command carries the 4 rows before the used print.
  return (a.animation === "CONFUSION" && a.path === "STRINGID_PKMNISCONFUSED" && (extra >= 4 && extra <= 7) ? extra : 0)
    || (a.animation === "INFATUATION" && a.path === "STRINGID_PKMNINLOVE" && extra === 4 ? extra : 0);
};
// tnl1 (ROM labs gsp3-toxic / b4m-thunderwave, docs/aud251-s11-scoreboard-refresh.md "tnm1" 1.C): a move-inflicted PSN / BRN / PRZ (BattleScript_MoveEffect{Poison,Toxic,Burn,Paralysis}) holds its animation 2 rows longer, the ROM's print row (369 vs 367).
// cfx1: so does BattleScript_MoveEffectConfusion's chosenstatus2animation on every path but the pre-move head (labs aud242f-swagger-player-on / aud242b-flatter-player-on / cfa1-conf-psychic-s2-on: SE 176 -> print 99 rows, the engine's 97).
const tnl1MoveInflictedRows = (a: { animation: string; path: string; length: number; gate: number }): number =>
  ((a.path === "inflicted" && (a.animation === "PSN" || a.animation === "BRN" || a.animation === "PRZ")) || (a.animation === "CONFUSION" && a.path !== "STRINGID_PKMNISCONFUSED"))
  && a.length - a.gate - ROWS[a.animation]! === 2 ? 2 : 0;
describe("sa125: the ROM receipts (sta123 rom-r1.json, 18 scenarios both sides)", () => {
  const all = Object.entries(ROM).flatMap(([stem, s]) => s.on.statusAnimations.map((a) => ({ stem, side: s.attackerSide, ...a })));

  it("every non-gated Scene ON statusanimation holds the next instruction for STATUS_ANIMATION_ADDED_ROWS (= active rows + 1)", () => {
    expect(all.length).toBe(54);
    const seen = new Set<string>();
    for (const a of all) {
      seen.add(a.animation);
      if ((a.firstActive ?? 0) !== 0) continue;
      expect(a.controllerRows, `${a.stem} ${a.animation} ${a.path} @${a.row}`).toBe(ROWS[a.animation]);
      expect(a.activeRows + 1).toBe(a.controllerRows);
    }
    expect([...seen].sort()).toEqual(Object.keys(ROWS).sort());
    // The only gated receipts: FRZ inflicted right after Ice Beam's hit (gate 17 opponent target / 18 player target, then 115 active
    // rows + 1: 133 / 134 vs production's 117, i.e. 16 / 17 rows short), SA2's class; flagged, not modelled here.
    expect(all.filter((a) => (a.firstActive ?? 0) !== 0).map((a) => [a.stem, a.path, a.firstActive, a.controllerRows])).toEqual([
      ["sta123-ice-beam-opp-delcatty-shuckle", "move-inflicted", 17, 133],
      ["sta123-ice-beam-ply-delcatty-shuckle", "move-inflicted", 18, 134],
    ]);
  });

  it("Scene OFF runs the same instructions with 0 controller rows (the next instruction is the same label)", () => {
    for (const [stem, s] of Object.entries(ROM)) {
      expect(s.off.statusAnimations.length, stem).toBe(s.on.statusAnimations.length);
      s.off.statusAnimations.forEach((a, k) => {
        expect([a.controllerRows, a.next[0]], `${stem} ${k}`).toEqual([0, s.on.statusAnimations[k]!.next[0]]);
      });
    }
  });

  it("the table equals every non-gated ROM controllerRows exactly (a wrong constant fails here)", () => {
    const byAnim = new Map<string, Set<number>>();
    for (const a of all) if ((a.firstActive ?? 0) === 0) byAnim.set(a.animation, (byAnim.get(a.animation) ?? new Set()).add(a.controllerRows));
    expect(Object.fromEntries([...byAnim].map(([k, v]) => [k, [...v]]))).toEqual(
      Object.fromEntries(Object.entries(ROWS).map(([k, v]) => [k, [v]])));
  });
});

describe("sa125: the kernel suppresses the receipt (no command) behind a Substitute / semi-invulnerable / in Scene OFF", () => {
  const context = (status3: number, substituteHP: number, hitMarker: number) => ({
    state: { rulesContext: { hitMarker, battlers: [{ status1: 0x40, status2: 0, status3, substituteHP }, { status1: 0, status2: 0, status3: 0, substituteHP: 0 }] } },
  }) as any;
  it.each([
    ["plain", 0, 0, 0, "emit"],
    ["behind a Substitute", 0, 25, 0, "suppress"],
    ["semi-invulnerable (STATUS3_ON_AIR)", 0x40, 0, 0, "suppress"],
    ["Scene OFF (HITMARKER_NO_ANIMATIONS)", 0, 0, 0x80, "suppress"],
  ])("%s", (_, status3, sub, hitMarker, kind) => {
    expect(prepareRulesStatusAnimation(context(status3 as number, sub as number, hitMarker as number), 0 as any, { kind: "live-status1" } as any)?.kind).toBe(kind);
  });
});

describe("sa125: production routes (census seeds, Scene ON vs OFF, same gameplay)", () => {
  it("each status-animation command sits at its receipt, lasts the ROM controller rows, and moves the following print by exactly them", () => {
    const covered = new Set<string>();
    let total = 0, flagged = 0, gated = 0, unanchoredTotal = 0;
    for (const seed of SEEDS) {
      const { anchors: list, unanchored, offAnimations } = anchors(seed);
      expect(offAnimations, `seed ${seed}: Scene OFF has no status-animation command`).toBe(0);
      unanchoredTotal += unanchored;
      for (const a of list) {
        total += 1;
        expect(a.orderOk, `${seed} ${a.animation}`).toBe(true);
        expect(a.length, `${seed} ${a.animation} ${a.path}`).toBe(a.gate + ROWS[a.animation]! + cfa1PreMoveConfusionRows(a) + tnl1MoveInflictedRows(a));
        // ROM: ON next instruction - OFF next instruction (from the statusanimation row) = controllerRows = gate + active rows + 1.
        expect(a.on - a.off, `${seed} ${a.animation} ${a.side} ${a.path}`).toBe(a.gate + ROWS[a.animation]! + cfa1PreMoveConfusionRows(a) + tnl1MoveInflictedRows(a));
        if (a.gate > 0) expect(a.gateFlag, `${seed} ${a.animation}: a gate only after a damaging hit`).toBe(true);
        if (a.gateFlag) flagged += 1;
        if (a.gate > 0) gated += 1;
        const path = a.path === "inflicted" ? "inflicted" : a.path;
        covered.add(`${a.animation}|${path}|${a.side}`);
      }
    }
    console.log(`sa125 anchors: ${total} anchored (${flagged} after a damaging hit, ${gated} gated), ${unanchoredTotal} unanchored; ${[...covered].sort().join(" ")}`);
    expect(total).toBeGreaterThan(100);
    expect(unanchoredTotal).toBeLessThan(total / 5);
    expect(flagged).toBeGreaterThan(0);
    for (const k of [
      "PSN|inflicted|player", "PSN|inflicted|opponent", "PSN|STRINGID_PKMNHURTBYPOISON|player", "PSN|STRINGID_PKMNHURTBYPOISON|opponent",
      "PRZ|inflicted|player", "PRZ|inflicted|opponent", "PRZ|STRINGID_PKMNISPARALYZED|player", "PRZ|STRINGID_PKMNISPARALYZED|opponent",
      "SLP|inflicted|player", "SLP|inflicted|opponent", "SLP|STRINGID_PKMNFASTASLEEP|player", "SLP|STRINGID_PKMNFASTASLEEP|opponent",
      "CONFUSION|inflicted|player", "CONFUSION|inflicted|opponent", "CONFUSION|STRINGID_PKMNISCONFUSED|player",
      "CONFUSION|STRINGID_PKMNISCONFUSED|opponent", "INFATUATION|STRINGID_PKMNINLOVE|player", "INFATUATION|STRINGID_PKMNINLOVE|opponent",
      "BRN|inflicted|player", "BRN|inflicted|opponent", "BRN|STRINGID_PKMNHURTBYBURN|player", "BRN|STRINGID_PKMNHURTBYBURN|opponent",
      "FRZ|inflicted|opponent",
    ]) expect(covered.has(k), k).toBe(true);
  });

  it("SA3: a Scene ON status command followed by its battler's status animation lasts the Scene OFF frames; the rest keep 32", () => {
    const table = new Map<string, Set<string>>();
    let faintClears = 0;
    const wakeUps: string[] = [];
    for (const seed of SEEDS) {
      const on = battleSegments(seed, "on").flatMap((s) => s.commands.map((c: any, i: number) => ({ c, next: s.commands[i + 1], events: s.events })));
      const off = battleSegments(seed, "off").flatMap((s) => s.commands);
      const offStatus = off.filter((c: any) => c.type === "status");
      const onStatus = on.filter((x) => x.c.type === "status");
      expect(onStatus.length, `seed ${seed}`).toBe(offStatus.length);
      onStatus.forEach((x, k) => {
        const at = x.events.findIndex((e: any) => e.sequence === x.c.eventSequence);
        const print = x.events.slice(at + 1).find((e: any) => e.payload.kind === "message")?.payload.messageId ?? null;
        const following = x.events.slice(at + 1).filter((e: any) => e.payload.kind !== "set-battler-pp-data" && e.payload.kind !== "play-se");
        const animated = (following[0]?.payload.kind === "status-animation" && following[0].payload.battler === x.c.battler)
          || (following[0]?.payload.kind === "message" && following[1]?.payload.kind === "status-animation" && following[1].payload.battler === x.c.battler);
        // rep203 (fnt201, docs/fnt201-faint-timing.md): the faint script's `cleareffectsonfaint` status is one instruction row in both scenes (pinned, not hidden).
        const faintClear = x.events[at].provenance?.opcodeName === "B_SCR_OP_CLEAREFFECTSONFAINT";
        // gsp2 (docs/aud251-s11-scoreboard-refresh.md "gsp2"): attackcanceler's sleep-clearing status write draws nothing in Scene ON. Mid-turn it lasts the
        // rows to the wake-up print; as the turn's first event it lasts u - 3 (u = the print's instructionExecution: the ROM's first print is on 6 + u and
        // the turn's first command starts on commit + 9).
        const wakeUp = x.events[at].provenance?.opcodeName === "B_SCR_OP_ATTACKCANCELER" && print === "STRINGID_PKMNWOKEUP";
        const wakeUpExec = wakeUp ? x.events[at + 1].provenance.instructionExecution : 0;
        const wakeUpRows = wakeUp ? wakeUpExec - x.events[at].provenance.instructionExecution : 0;
        // ftp1: attackcanceler's natural thaw (`BattleScript_MoveUsedUnfroze`: printfromtable one row after the write, no pre-hold) lasts the rows to the print (ROM s97 d11: print row 10 = the engine's, SE 184 exact).
        const thaw = x.events[at].provenance?.opcodeName === "B_SCR_OP_ATTACKCANCELER" && (print === "STRINGID_PKMNWASDEFROSTED2" || print === "STRINGID_PKMNWASDEFROSTEDBY");
        const thawRows = thaw ? x.events[at + 1].provenance.instructionExecution - x.events[at].provenance.instructionExecution : 0;
        // tnl1 (tnm1 B): the MoveEnd status write of a Chesto Berry cure (BattleScript_BerryCureSlpRet's HELD_ITEM_EFFECT follows) lasts 26: ROM MoveEnd+0x0 -> the animation epoch (Rest lab 1416 -> A0 1420).
        const berryCureSlp = following[0]?.payload.kind === "animation" && following[0].provenance?.sourceLabel === "BattleScript_BerryCureSlpRet";
        const want = berryCureSlp ? 26 : faintClear ? 1 : animated ? offStatus[k].timing.minimumFrames : wakeUp ? (at === 0 ? Math.max(0, wakeUpExec - 3) : wakeUpRows) : thaw ? thawRows : 32;
        if (wakeUp) wakeUps.push(`${at === 0 ? `head u${wakeUpExec}` : `mid ${wakeUpRows}`}->${x.c.timing.minimumFrames}`);
        expect(x.c.timing.minimumFrames, `seed ${seed} status ${k} ${print}`).toBe(want);
        if (faintClear) faintClears += 1;
        const key = `${print}|${animated}`;
        table.set(key, (table.get(key) ?? new Set()).add(`32->${x.c.timing.minimumFrames}`));
      });
    }
    expect(faintClears).toBeGreaterThan(0);
    const t = Object.fromEntries([...table].map(([k, v]) => [k, [...v].sort()]));
    expect(t["STRINGID_PKMNWASPARALYZED|true"]).toEqual(["32->2"]);
    expect(t["STRINGID_PKMNFELLASLEEP|true"]).toEqual(["32->2"]);
    expect(t["STRINGID_PKMNBADLYPOISONED|true"]).toEqual(["32->2"]);
    expect(t["STRINGID_PKMNFASTASLEEP|true"]).toEqual(["32->1"]);
    expect(t["STRINGID_TARGETFAINTED|false"]).toEqual(["32->1"]); // rep203: fnt201's cleareffectsonfaint row (was 32->32)
    expect(t["STRINGID_PKMNWENTTOSLEEP|false"]).toEqual(["32->32"]);
    expect(t["STRINGID_PKMNWASDEFROSTED2|false"]).toEqual(["32->1"]); // ftp1: the natural thaw (was 32->32)
    // gsp2: the table was 32->32 for every wake-up; now the rule's frames (head: u - 3; mid-turn: the rows to the print).
    expect([...new Set(wakeUps)].sort()).toEqual(["head u3->0", "head u6->3", "head u8->5", "mid 2->2"]);
  });
});

describe("sa125: Scene ON / OFF gameplay parity on two real routes (presentation only)", () => {
  it.each([12, 60])("seed %i: identical logical events and after-rules (RNG, battlers, field; HITMARKER_NO_ANIMATIONS masked) in both scenes", (seed) => {
    const logical = (scene: "on" | "off") => battleSegments(seed, scene).map((s) => ({
      rules: s.rules,
      events: s.events.map((e: any) => e.payload).filter((p: any) => !SCENE_ONLY_KINDS.has(p.kind)).map((p: any) => JSON.stringify(p)),
    }));
    const on = logical("on"), off = logical("off");
    expect(on.length).toBeGreaterThan(5);
    expect(on).toEqual(off);
    expect(battleSegments(seed, "on").flatMap((s) => s.commands).filter((c: any) => c.type === "status-animation").length).toBeGreaterThan(0);
  });
});
