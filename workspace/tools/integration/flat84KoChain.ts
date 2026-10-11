/**
 * flat84 KO chain check: ice72Chain.ts with Flatter 260 a words body too, carried with the temp patch's liveFlatterWordsPostFree at its
 * RAM-read words (the body's draws) and RAM species; run INSIDE the patched git-archive copy. Everything else is ice72Chain.ts unchanged.
 */
/**
 * ice72 chain check: tools/integration/words57Chain.ts with Ice Ball 301 a words body. An Ice Ball body is carried with the PRODUCTION carry
 * liveIceBallWordsPostFree (liveMoveAnimation.ts: liveIceBallInputs(...).postBodyFree) at its RAM-read words, its ROM-derived rollout counter
 * (shards 5 / 7 / 9 / 10 + body length) and the species displayed at the body (RAM gBattleMons, ice72Extract.py `bodySpecies`); the dirt
 * bodies use their RAM species too. The production-shaped marker records rolloutCounter / bodySpecies as markLiveSpriteOrderDeferredBody
 * does. ICE72_PREDICT=<file>: write only the predictions (every words body's carried post-body free order, every consumer's production
 * replay lend) before any comparison is reported.
 *
 * words57 chain check (prep46Chain.ts generalized PAST battle units, prep45Check.ts per-window method, plus every frame): a words body
 * (Sand-Attack 28 / Mud-Slap 189 / Rain Dance 240 / General_Rain = RAIN_CONTINUES) is carried with its RAM-read words (prep46Carry.ts
 * models, every frame + window of the body), then the PRODUCTION replay of resolveSpriteOrderDeferredLend runs on: a tracker created
 * exactly as production creates it (createSpriteOrderTracker({ known, free: post }), the known-entry battler slots 6 / 8 and roles 0 / 1 / 2),
 * every following unit applied with applySpriteOrderPresentationEvent. Units are read off the ROM allocation windows:
 *   blip (C1 then D of it) = hit-animation; C2 = action-prompt; D of the pair = actions-committed; D o<tracked battler slot> = faint
 *   (KO jobs) / forced-switch-out (Roar / Whirlwind jobs); the 7-sprite summary = party-summary-next (+ party-summary-hide); then
 *   next-mon-send-out (KO) or switch-in-start + switch-in-finish (forced); move bodies = move-animation (the side whose active party has
 *   the move; both sides tried only when both have it); mv-0 bodies = the accuracy -1 stat animation (argument 20), SUN_CONTINUES, or a
 *   General_Rain words body (rain jobs: a NESTED marker, carried from the replay's own lend in entry labels, as production nests it).
 * Every event's plan is walked window by window (created / destroyed / free order after each window, prep45Check), the production event's
 * result must equal the walked cursor, and EVERY frame of the chain is checked: each frame whose observed ROM free order changed must be
 * a modelled window with that free order (between windows the order is constant on both sides). ROM slots are mapped into the tracker's
 * label space through a real -> label map: the identity for a chain that starts at the known entry (reported: `identityMap`); a nested
 * words body after a KO starts in entry labels (the lend's rho), composed onto the map; created slots pair in creation order.
 * At every move body (a consumer of the deferred lend) the replay's lend must equal the ROM activation free order, mapped.
 * usage: ICE72_OUT=<probe out dir> [ICE72_PREDICT=<predictions.json>] node --experimental-strip-types tools/integration/ice72Chain.ts <units.json> <out.json> [<lend-vectors.json>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  applySpriteOrderPresentationEvent, createSpriteOrderTracker, decodeSpriteOrderPlan, spriteOrderEntryLabelRelabel,
  spriteOrderProductionBodyPlan, spriteOrderRecallPlanText, spriteOrderStatAnimationPlan, spriteOrderTrackerLend, spriteOrderTrackerPostUnitView,
  SPRITE_ORDER_UNIT_PLAN_TEXTS, type SpriteOrderPresentationEvent, type SpriteOrderTracker,
} from "../../src/engine/spriteOrderEventTransform.ts";
import {
  applySpriteOrderUnitPlan, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix, type SpriteOrderPlan,
} from "../../src/engine/spriteOrderProvider.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../../src/engine/spriteOrderProductionPlans.ts";
import { compareBody, dirtModel, generalRainModel, rainDanceModel, type Unit } from "./prep46Carry.ts";
import { liveFlatterWordsPostFree, liveIceBallWordsPostFree } from "../../src/engine/liveMoveAnimation.ts";
import { battleMoveAnimationRequest } from "../../src/engine/battleMoveAnimation.ts";
import { activateLiveMovePresentationRng, liveMovePresentationRngWords } from "../../src/engine/liveMovePresentationRng.ts";
import { createPresentationRngHostAt } from "../../src/engine/presentationRngHost.ts";
import { createPresentationRngState } from "../../src/engine/presentationRng.ts";

type IceUnit = Unit & { bodySpecies?: [number, number]; shards?: number };
/** Rollout counter (request.rolloutCounter 1..5) of an Ice Ball body from its ROM shards (5 / 7 / 9 / 10) and length (counter 5: step 131). */
const iceBallRolloutCounter = (unit: IceUnit): number | null =>
  unit.shards === 5 ? 1 : unit.shards === 7 ? 2 : unit.shards === 9 ? 3 : unit.shards === 10 ? (unit.length > 100 ? 5 : 4) : null;
const predictions: Record<string, unknown>[] = [];
/** Per Ice Ball body: the production carry's inputs and the ROM post-body free order in the same (entry) labels (tests/ice72*). */
const bodyVectors: Record<string, unknown>[] = [];

type Side = "player" | "opponent";
interface Win { f: number; C: [number, string][]; D: number[]; F: number[] }
interface Job {
  move: number; wordsSide: Side; battleUnit: "ko" | "forced-opponent" | "forced-player" | "ai-switch"; identicalAB: boolean; labSeed: number;
  species: Record<Side, number[]>; units: Unit[]; freeChanges: { first: number; last: number; changes: [number, number[]][] };
}
const MOVES: Record<string, Record<Side, number[]>> = {};
const same = (l: readonly number[], r: readonly number[]) => l.length === r.length && l.every((v, i) => v === r[i]);
const full = (free: readonly number[]) => spriteOrderWithOccupiedPrefix({ known: true as const, free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
const WORDS = new Set([28, 189, 240, 260, 301]);
const plan = (text: string) => decodeSpriteOrderPlan(text);
const SUN = decodeSpriteOrderPlan(SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS.SUN_CONTINUES!]!);

export interface ChainRow {
  job: string; words: string; activation: "rom-entry" | "nested"; identityMap: boolean; steps: string[]; windows: number; windowMismatch: string[];
  frames: number; frameMismatch: number; consumers: { body: string; frame: number; exact: boolean; afterBattleUnit: boolean }[];
  battleUnits: string[]; speciesInferred?: Record<Side, number>; carry: { frames: number; frameMismatch: number; windows: number; windowMismatch: number; postExact: boolean }; verdict: string;
}

const vectors: Record<string, unknown>[] = [];
const wordsByKey: Record<string, { activationValue: number; draws: number[][] }> = {};
function checkJob(name: string, job: Job): ChainRow[] {
  const rows: ChainRow[] = [];
  const parties = Object.fromEntries((["player", "opponent"] as const).map((s) => [s, job.species[s]]));
  const raw = JSON.parse(readFileSync(`${process.env.ICE72_OUT}/scenarios/${name}.json`, "utf8"));
  const moveSides = (mv: number): Side[] => (["player", "opponent"] as const).filter((s) =>
    raw.overrides.parties[s].some((m: { moves: number[] }) => m.moves.includes(mv)));
  let tracker: SpriteOrderTracker | null = null; // real-label replay (ROM slots; the per-window / per-frame check)
  let prod: SpriteOrderTracker | null = null; // production's replay (resolveSpriteOrderDeferredLend: entry labels from the lend)
  // the production-shaped deferred marker (liveSpriteOrderHost: a words body opens one, nested on the pending one; every later order event
  // is a unit) and the RAM-read words per marker key: emitted at every consumer as a test vector (tests/words57DeferredBattleUnits.test.ts)
  let marker: { key: string; moveId: number; attackerSide: Side; generalAnimation?: string; rolloutCounter?: number; bodySpecies?: Record<Side, number>;
    activation: unknown; units: SpriteOrderPresentationEvent[] } | null = null;
  const unitEvent = (event: SpriteOrderPresentationEvent) => { marker?.units.push(event); };
  let map = new Map<number, number>(); // ROM real slot -> tracker label
  let row: ChainRow | null = null;
  let modelFree: number[] = [];
  const timeline: [number, number[]][] = []; // [frame, model free order after that frame's window]
  let afterBattle = false;
  const mapSlot = (slot: number) => map.get(slot) ?? slot;
  const mapList = (slots: readonly number[]) => slots.map(mapSlot);
  const close = () => {
    if (row === null) return;
    // every frame of the chain: each ROM free-order change inside it must be a model window with the same (mapped) free order
    const [lo, hi] = [timeline[0]?.[0] ?? 0, timeline[timeline.length - 1]?.[0] ?? 0];
    const at = new Map(timeline.map(([f, free]) => [f, free]));
    let mismatch = 0;
    for (const [f, free] of job.freeChanges.changes) {
      if (f < lo || f > hi) continue;
      const model = at.get(f);
      if (model === undefined || !same(model, mapList(free))) { mismatch += 1; if (process.env.WORDS57_DEBUG) console.log("frame mismatch", row.job, row.words, f, model === undefined ? "no window" : "F !="); }
    }
    row.frames = hi - lo + 1; row.frameMismatch = mismatch;
    row.identityMap = row.identityMap && [...map].every(([real, label]) => real === label);
    row.verdict = row.windowMismatch.length === 0 && mismatch === 0 && row.carry.frameMismatch === 0 && row.carry.windowMismatch === 0
      && row.carry.postExact && row.consumers.every((c) => c.exact) ? "EXACT" : "MISMATCH";
    rows.push(row); row = null; timeline.length = 0;
  };
  /**
   * Apply production events in order and align their plan windows with the ROM windows `wins` (mapped). Each event's plan is walked window
   * by window from the tracker's cursor (prep45Check), the production event's result must equal the walked cursor (or add the carried
   * single-survivor destroy window, applyPlan CARRY), then the model windows are aligned with the ROM ones:
   * - a ROM window is the union of 1..4 consecutive model windows (same-frame work of two units, e.g. a recall particle's destroy in the
   *   frame the summary is created), with the free order compared after the group;
   * - a model window destroying one slot followed by one re-creating it is a same-frame pair the ROM mask diff cannot see
   *   (HandleBallAnimEnd: the ball's slot re-taken by the 16th particle): no ROM window, the free order must be unchanged.
   * Returns the ROM windows consumed, or -1 on a mismatch.
   */
  const walkEvents = (items: readonly (readonly [SpriteOrderPresentationEvent | null, SpriteOrderPlan, string])[], wins: Win[]): number => {
    const model: { c: number[]; d: number[]; free: readonly number[]; label: string }[] = [];
    for (const [event, p, label] of items) {
      const start = tracker!.cursor;
      let prev = start;
      for (let k = 0; k < p.length; k += 1) {
        const cursor = applySpriteOrderUnitPlan(start, p.slice(0, k + 1));
        if (!cursor.order.known) { row!.windowMismatch.push(`${label} window ${k}: plan did not resolve`); return -1; }
        model.push({ c: cursor.occupied.filter((x) => !prev.occupied.includes(x)), d: prev.occupied.filter((x) => !cursor.occupied.includes(x)),
          free: cursor.order.free, label: `${label} window ${k}` });
        prev = cursor;
      }
      // a plan-only item (the ROM-interleaved check below) walks the plan without a production event
      const next = event === null ? { ...tracker!, cursor: prev } as SpriteOrderTracker : applySpriteOrderPresentationEvent(tracker!, event);
      if (!next.cursor.order.known) { row!.windowMismatch.push(`${label}: production event invalidated (${next.invalidReason})`); return -1; }
      if (!same(prev.order.free, next.cursor.order.free)) {
        const gone = prev.occupied.filter((x) => !next.cursor.occupied.includes(x));
        model.push({ c: [], d: gone, free: next.cursor.order.free, label: `${label} carry` });
      }
      tracker = next; modelFree = [...next.cursor.order.free];
      if (event !== null && prod !== null) prod = applySpriteOrderPresentationEvent(prod, event);
      if (event !== null) unitEvent(event);
      row!.steps.push(label);
    }
    const sorted = (xs: readonly number[]) => [...xs].sort((l, r) => l - r);
    let r = 0;
    for (let k = 0; k < model.length;) {
      const rom = wins[r];
      const m0 = model[k]!, m1 = model[k + 1];
      if (m0.c.length === 0 && m0.d.length === 1 && m1 && m1.d.length === 0 && same(m1.c, m0.d)
        && !(rom && rom.C.length === 0 && same(mapList(rom.D), m0.d))) {
        row!.windows += 1;
        if (r > 0 && !same(m1.free, mapList(wins[r - 1]!.F))) row!.windowMismatch.push(`${m0.label}: same-frame pair F !=`);
        k += 2;
        continue;
      }
      if (rom === undefined) { row!.windowMismatch.push(`${m0.label}: ROM windows end`); return -1; }
      const romCreated = sorted(rom.C.map(([x]) => x));
      let matched = 0;
      for (let n = 1; n <= 4 && k + n <= model.length && matched === 0; n += 1) {
        const group = model.slice(k, k + n);
        const created = group.flatMap((g) => g.c), destroyed = group.flatMap((g) => g.d);
        const netC = sorted(created.filter((x) => !destroyed.includes(x))), netD = sorted(destroyed.filter((x) => !created.includes(x)));
        if (netC.length !== romCreated.length || netD.length !== rom.D.length) continue;
        const trial = new Map(map);
        romCreated.forEach((real, i) => trial.set(real, netC[i]!));
        const mapped = (xs: readonly number[]) => xs.map((x) => trial.get(x) ?? x);
        if (!same(netC, sorted(mapped(romCreated))) || !same(netD, sorted(mapped(rom.D)))) continue;
        map = trial;
        matched = n;
      }
      row!.windows += 1;
      if (matched === 0) {
        row!.windowMismatch.push(`${m0.label} f${rom.f}: C ${m0.c}/${mapList(romCreated)} D ${m0.d}/${mapList(rom.D)}`);
        matched = 1;
      }
      const after = model[k + matched - 1]!;
      if (!same(after.free, mapList(rom.F))) row!.windowMismatch.push(`${after.label} f${rom.f}: F !=`);
      timeline.push([rom.f, [...after.free]]);
      k += matched;
      r += 1;
    }
    return r;
  };
  const apply = (event: SpriteOrderPresentationEvent, p: SpriteOrderPlan | null, wins: Win[], label: string): number =>
    walkEvents([[event, p ?? [], label]], wins);
  const sideOfSlot = (slot: number): Side | null => tracker!.battlerSlots.player === slot ? "player" : tracker!.battlerSlots.opponent === slot ? "opponent" : null;

  const startWords = (unit: Unit, index: number, nested: boolean) => {
    // activation: ROM free order at the known entry (first marker) or the replay's own lend (a nested marker, entry labels)
    let activationFree: readonly number[];
    let identity = true;
    let rhoInverse: Map<number, number> | null = null;
    let realSlots: Parameters<typeof createSpriteOrderTracker>[1] | undefined, realRoles: Parameters<typeof createSpriteOrderTracker>[2] | undefined;
    if (nested && tracker !== null) {
      // production carries a nested marker from the replay's LEND (entry labels, rho); the real-label check carries the same body in entry
      // labels too (the carry models are entry-label models), then maps the post-body order back through rho^-1 and keeps the real
      // battler slots / roles. The two lends must agree at the activation and at every consumer after it.
      const view = spriteOrderTrackerPostUnitView(tracker);
      const rho = view && spriteOrderEntryLabelRelabel(view);
      const lend = spriteOrderTrackerLend(tracker), prodLend = prod === null ? null : spriteOrderTrackerLend(prod);
      predictions.push({ job: name, consumer: `${unit.mv} f${unit.frame} (nested words body)`, afterBattleUnit: afterBattle, predictedLend: prodLend });
      if (!rho || !lend) { close(); tracker = null; prod = null; return; }
      if (!same(view.free, mapList(unit.F0))) row?.windowMismatch.push(`nested activation f${unit.frame}: replay free != ROM F0`);
      if (prodLend === null || !same(prodLend, lend)) row?.windowMismatch.push(`nested activation f${unit.frame}: production lend != real-label lend`);
      close();
      identity = [...rho].every(([real, label]) => real === label);
      rhoInverse = new Map([...rho].map(([real, label]) => [label, real]));
      for (let real = 0; real < 64; real += 1) if (!rho.has(real)) rhoInverse.set(real, real);
      realSlots = view.battlerSlots; realRoles = view.occupantRoles;
      activationFree = lend;
    } else {
      close();
      map = new Map(); activationFree = unit.F0;
    }
    const toLabel = (slot: number) => { const real = mapSlot(slot); if (rhoInverse === null) return real;
      for (const [label, r] of rhoInverse) if (r === real) return label; return real; };
    const words = unit.mv === 0 ? "RAIN_CONTINUES" : String(unit.mv);
    const key = `ice72:${name}:${unit.frame}`;
    wordsByKey[key] = { activationValue: unit.activationValue!, draws: unit.draws! };
    const activation = nested && marker !== null ? { deferred: JSON.parse(JSON.stringify(marker)) } : { free: unit.F0 };
    const iceUnit = unit as IceUnit;
    const unitSide: Side = unit.mv === 0 ? "player" : (moveSides(unit.mv!)[0] ?? job.wordsSide);
    const rolloutCounter = unit.mv === 301 ? iceBallRolloutCounter(iceUnit) : null;
    const bodySpecies = iceUnit.bodySpecies === undefined ? undefined : { player: iceUnit.bodySpecies[0], opponent: iceUnit.bodySpecies[1] };
    marker = { key, moveId: unit.mv!, attackerSide: unitSide,
      ...(unit.mv === 0 ? { generalAnimation: "RAIN_CONTINUES" } : {}),
      ...(rolloutCounter === null ? {} : { rolloutCounter }),
      ...(bodySpecies === undefined || (unit.mv !== 28 && unit.mv !== 189 && unit.mv !== 260 && unit.mv !== 301) ? {} : { bodySpecies }),
      activation, units: [] } as typeof marker;
    row = { job: name, words: `${words} f${unit.frame}`, activation: nested ? "nested" : "rom-entry", identityMap: identity, steps: [`carry ${words}`],
      windows: 0, windowMismatch: [], frames: 0, frameMismatch: 0, consumers: [], battleUnits: [],
      carry: { frames: 0, frameMismatch: 0, windows: 0, windowMismatch: 0, postExact: false }, verdict: "" };
    afterBattle = false;
    // the ROM unit mapped into label space (dense orders, windows) for the carry check
    const mapped: Unit = { ...unit, F0: mapList(unit.F0),
      dense: unit.dense!.map(([age, hex, mask]) => [age, Buffer.from(Array.from({ length: 64 }, (_, i) => toLabel(parseInt(hex.slice(2 * i, 2 * i + 2), 16)))).toString("hex"), mask]),
      windows: unit.windows.map((w) => ({ ...w, C: w.C.map(([s, m]) => [toLabel(s), m] as [number, string]), D: w.D.map(toLabel), F: w.F.map(toLabel) })) };
    const act = full(activationFree);
    if (act === null) { row.windowMismatch.push(`activation f${unit.frame}: not entry-prefixed`); close(); tracker = null; prod = null; return; }
    const side = unitSide;
    // ice72: the species displayed at the body are RAM-read (no inference)
    const dirt = (player: number, opponent: number) => compareBody(mapped,
      dirtModel({ unit: "", identicalAB: job.identicalAB, attackerSide: side, species: { player, opponent }, units: [] }, mapped, act));
    const species = bodySpecies ?? { player: parties.player![0]!, opponent: parties.opponent![0]! };
    let cmp: ReturnType<typeof compareBody>;
    if (unit.mv === 301) {
      // the production carry at the recorded words (entry labels); the per-frame body check is the Ice Ball adapter's own (prep26 / gates53)
      const iceWords = { words: unit.draws!.flatMap((r) => r.slice(1)), activationValue: unit.activationValue! } as never;
      const post = rolloutCounter === null ? null : liveIceBallWordsPostFree({ attackerSide: side, rolloutCounter }, activationFree, iceWords, species);
      if (post === null) row.windowMismatch.push(`Ice Ball f${unit.frame}: carry declined`);
      cmp = { frames: 0, frameMismatchAges: [], windows: 0, windowMismatch: [], postFree: post === null ? [] : [...post] };
    } else if (unit.mv === 260) {
      // flat84: the production Flatter carry (liveFlatterWordsPostFree, the temp patch) at the words of the production presentation host
      // pinned at the RAM gRng2Value of the activation (the per-frame `draws` split the 114 words over the three creation frames) and
      // the RAM species
      const req = battleMoveAnimationRequest(side === "player" ? 0 : 1, side === "player" ? 1 : 0, ["260", "0", "0", "0", "70", "0"]);
      const host = createPresentationRngHostAt(createPresentationRngState(unit.activationValue!, "pinned"));
      const flatWords = liveMovePresentationRngWords({ host: activateLiveMovePresentationRng(host, req, key), key });
      const post = liveFlatterWordsPostFree({ attackerSide: side }, activationFree, flatWords, species);
      if (post === null) row.windowMismatch.push(`Flatter f${unit.frame}: carry declined`);
      cmp = { frames: 0, frameMismatchAges: [], windows: 0, windowMismatch: [], postFree: post === null ? [] : [...post] };
    } else {
      cmp = unit.mv === 240 ? compareBody(mapped, rainDanceModel(mapped, act, 0)) : unit.mv === 0 ? compareBody(mapped, generalRainModel(mapped, act))
        : dirt(species.player, species.opponent);
    }
    predictions.push({ job: name, body: `${words} f${unit.frame}`, side, ...(rolloutCounter === null ? {} : { rolloutCounter }), bodySpecies: species,
      activation: nested ? "nested" : "rom-entry", activationFree: [...activationFree], predictedPostFree: cmp.postFree });
    const next = index + 1 < job.units.length ? job.units[index + 1]!.F0.map(toLabel) : null;
    row.carry = { frames: cmp.frames, frameMismatch: cmp.frameMismatchAges.length, windows: cmp.windows, windowMismatch: cmp.windowMismatch.length,
      postExact: next !== null && same(cmp.postFree, next) };
    if (unit.mv === 301) bodyVectors.push({ job: name, body: `301 f${unit.frame}`, key, attackerSide: side, rolloutCounter, bodySpecies: species,
      activation: nested ? "nested" : "rom-entry", entryLabels: identity, activationFree: [...activationFree], romPostFree: next });
    prod = createSpriteOrderTracker({ known: true, free: cmp.postFree, pendingDestroyed: [] });
    const realPost = rhoInverse === null ? cmp.postFree : cmp.postFree.map((label) => rhoInverse!.get(label) ?? label);
    tracker = rhoInverse === null ? prod : createSpriteOrderTracker({ known: true, free: realPost, pendingDestroyed: [] }, realSlots, realRoles);
    modelFree = [...realPost];
    timeline.push([unit.frame + unit.length - 1, modelFree]);
  };

  let skip = -1;
  void unitEvent;
  job.units.forEach((unit, index) => {
    if (index === skip) return;
    const rainJob = job.move === 240;
    const isWords = unit.kind === "body" && (WORDS.has(unit.mv!) || (rainJob && unit.mv === 0 && /^Cff;Cff;Cff/.test(unit.plan)));
    if (isWords) { startWords(unit, index, tracker !== null); return; }
    if (tracker === null || row === null) return;
    if (unit.kind === "body" && unit.mv !== 0) {
      // a consumer of the deferred lend: the replay's lend vs the ROM activation free order (mapped), then the body is replayed
      const lend = spriteOrderTrackerLend(tracker);
      const view = spriteOrderTrackerPostUnitView(tracker);
      const prodLend = prod === null ? null : spriteOrderTrackerLend(prod);
      const exact = lend !== null && view !== null && same(view.free, mapList(unit.F0)) && prodLend !== null && same(prodLend, lend);
      predictions.push({ job: name, consumer: `${unit.mv} f${unit.frame}`, afterBattleUnit: afterBattle, predictedLend: prodLend });
      row.consumers.push({ body: `${unit.mv}`, frame: unit.frame, exact, afterBattleUnit: afterBattle });
      if (marker !== null) vectors.push({ job: name, consumer: `${unit.mv} f${unit.frame}`, afterBattleUnit: afterBattle,
        species: (unit as IceUnit).bodySpecies === undefined ? { player: parties.player![0]!, opponent: parties.opponent![0]! }
          : { player: (unit as IceUnit).bodySpecies![0], opponent: (unit as IceUnit).bodySpecies![1] }, rom: { F0: unit.F0, mask0: unit.mask0 },
        replayLend: lend, marker: JSON.parse(JSON.stringify(marker)) });
      const sides = moveSides(unit.mv!);
      let used = -1;
      for (const side of sides) {
        const p = spriteOrderProductionBodyPlan(unit.mv!, side);
        if (p === null) continue;
        const saved = { map: new Map(map), tl: timeline.length, w: row.windows, wm: row.windowMismatch.length, tracker, prod, steps: row.steps.length };
        used = apply({ kind: "move-animation", moveId: unit.mv!, attackerSide: side }, p, unit.windows, `body ${unit.mv}:${side}`);
        if ((used >= 0 && row.windowMismatch.length === saved.wm) || sides.length === 1) break;
        map = saved.map; timeline.length = saved.tl; row.windows = saved.w; row.windowMismatch.length = saved.wm; used = -1;
        tracker = saved.tracker; prod = saved.prod; row.steps.length = saved.steps;
      }
      if (used < 0) { row.windowMismatch.push(`body ${unit.mv} f${unit.frame}: no side's production plan matched`); close(); tracker = null; prod = null; }
      return;
    }
    if (unit.kind === "body" && job.battleUnit === "ai-switch" && unit.windows.length >= 16 && unit.windows.slice(0, 16).every((w) => w.C.length === 1 && w.D.length === 0)
      && tracker.battlerSlots.opponent !== null) {
      // the Factory AI's voluntary recall (prep47 (C): the recall plan with the opponent battler, 16 particles first) runs inside an
      // animation-active interval and on into the gap, where the summary is created in the frame of a particle destroy: one window stream
      const gap = job.units[index + 1];
      const wins = [...unit.windows, ...(gap?.kind === "gap" ? gap.windows : [])] as unknown as Win[];
      skip = index + 1;
      // ROM order: the summary's creates land in the frame of one recall particle destroy (j); the host applies the whole recall, then the
      // summary. (a) every ROM window against ONE plan built from the two production plans' own tokens in the ROM's interleave (summary
      // n-tokens renumbered after the recall's 16); (b) the production events applied in sequence must end in the same order and occupancy.
      const recall = plan(spriteOrderRecallPlanText(tracker.battlerSlots.opponent)), summary = plan(SPRITE_ORDER_UNIT_PLAN_TEXTS.summary);
      const j = wins.findIndex((w) => w.C.length === 7);
      const interleaved: SpriteOrderPlan = recall.map((w, i) => i !== j ? w
        : { ...w, C: summary[0]!.C!.map(([, k, mode]) => ["n", k + 16, mode] as const) });
      const before = tracker;
      const sequential = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(before, { kind: "switch-out", side: "opponent" }),
        { kind: "party-summary-next" });
      const used = j < 16 || j >= recall.length ? -1 : walkEvents([[null, interleaved, "switch-out + summary (ROM interleave)"]], wins);
      const end = applySpriteOrderUnitPlan(before.cursor, interleaved);
      if (used >= 0 && (!same(end.order.free, sequential.cursor.order.free) || !same(end.occupied, sequential.cursor.occupied))) {
        row.windowMismatch.push("switch-out + summary: production sequence != ROM interleave");
      }
      tracker = sequential; row.steps.push("switch-out opponent", "party-summary-next");
      if (prod !== null) prod = applySpriteOrderPresentationEvent(applySpriteOrderPresentationEvent(prod, { kind: "switch-out", side: "opponent" }), { kind: "party-summary-next" });
      unitEvent({ kind: "switch-out", side: "opponent" }); unitEvent({ kind: "party-summary-next" });
      row.battleUnits.push("switch-out opponent", "party-summary-next");
      if (used < 0) { close(); tracker = null; prod = null; return; }
      gapWindows(wins.slice(used), true);
      return;
    }
    if (unit.kind === "body") {
      const shape = unit.windows.length;
      const event: [SpriteOrderPresentationEvent, SpriteOrderPlan | null, string] = shape === 2
        ? [{ kind: "stat-animation", argument: 20 }, spriteOrderStatAnimationPlan(20), "stat-animation 20"]
        : [{ kind: "general-animation", animation: "SUN_CONTINUES" }, SUN, "general SUN_CONTINUES"];
      if (apply(event[0], event[1], unit.windows, event[2]) < 0) { close(); tracker = null; prod = null; }
      return;
    }
    gapWindows(unit.windows as unknown as Win[], false);
  });
  /** Segment a gap's allocation windows into production events (the order the host emits them). */
  function gapWindows(wins: Win[], summaryAlready: boolean) {
    if (tracker === null || row === null) return;
    let k = 0;
    let summaryPending = summaryAlready;
    while (k < wins.length && tracker !== null) {
      const w = wins[k]!, next = wins[k + 1];
      let used = -1;
      if (summaryPending) {
        tracker = applySpriteOrderPresentationEvent(tracker, { kind: "party-summary-hide" });
        if (prod !== null) prod = applySpriteOrderPresentationEvent(prod, { kind: "party-summary-hide" });
        unitEvent({ kind: "party-summary-hide" });
        row.steps.push("party-summary-hide");
        used = apply({ kind: "next-mon-send-out" }, plan(SPRITE_ORDER_UNIT_PLAN_TEXTS.nextSendOut), wins.slice(k), "next-mon-send-out");
        summaryPending = false; afterBattle = true; row.battleUnits.push("party-summary-hide", "next-mon-send-out");
      } else if (tracker.lastUnit === "recall" && (tracker.battlerSlots.player === null || tracker.battlerSlots.opponent === null)) {
        const side = tracker.battlerSlots.player === null ? "player" as const : "opponent" as const;
        used = apply({ kind: "switch-in-start", side }, plan(SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInStart), wins.slice(k), `switch-in-start ${side}`);
        if (used > 0) {
          const more = apply({ kind: "switch-in-finish", side }, plan(SPRITE_ORDER_UNIT_PLAN_TEXTS.switchInParticles), wins.slice(k + used), `switch-in-finish ${side}`);
          used = more < 0 ? -1 : used + more;
        }
        afterBattle = true; row.battleUnits.push(`switch-in-start ${side}`, `switch-in-finish ${side}`);
      } else if (w.C.length === 1 && w.D.length === 0 && next && next.C.length === 0 && same(next.D, [w.C[0]![0]]) && tracker.promptPair === null && !summaryPending) {
        used = apply({ kind: "hit-animation", targetVisible: true }, plan("Cf;D0"), wins.slice(k), "hit-animation");
      } else if (w.C.length === 2 && w.D.length === 0 && tracker.promptPair === null) {
        used = apply({ kind: "action-prompt" }, plan("Cff"), wins.slice(k), "action-prompt");
      } else if (w.C.length === 0 && tracker.promptPair !== null && same(mapList(w.D).sort((a, b) => a - b), [...tracker.promptPair].sort((a, b) => a - b))) {
        const ev = applySpriteOrderPresentationEvent(tracker, { kind: "actions-committed" });
        if (prod !== null) prod = applySpriteOrderPresentationEvent(prod, { kind: "actions-committed" });
        unitEvent({ kind: "actions-committed" });
        row.windows += 1;
        if (!same(ev.cursor.order.free, mapList(w.F))) row.windowMismatch.push(`actions-committed f${w.f}: F !=`);
        tracker = ev; timeline.push([w.f, [...ev.cursor.order.free]]); row.steps.push("actions-committed"); used = 1;
      } else if (w.C.length === 0 && w.D.length === 1 && sideOfSlot(mapSlot(w.D[0]!)) !== null) {
        const side = sideOfSlot(mapSlot(w.D[0]!))!;
        const kind = job.battleUnit === "ko" ? "faint" as const : "forced-switch-out" as const;
        used = apply({ kind, side }, [{ D: [["o", mapSlot(w.D[0]!)]] }], wins.slice(k), `${kind} ${side}`);
        row.battleUnits.push(`${kind} ${side}`);
      } else if (w.C.length === 7 && w.D.length === 0) {
        used = apply({ kind: "party-summary-next" }, plan(SPRITE_ORDER_UNIT_PLAN_TEXTS.summary), wins.slice(k), "party-summary-next");
        summaryPending = true; row.battleUnits.push("party-summary-next");
      } else {
        row.windowMismatch.push(`unclassified window f${w.f} C${JSON.stringify(w.C)} D${JSON.stringify(w.D)}`);
      }
      if (used < 0) { close(); tracker = null; prod = null; break; }
      k += used;
    }
  }
  close();
  return rows;
}

const input = JSON.parse(readFileSync(process.argv[2]!, "utf8")) as { jobs: Record<string, Job> };
const rows = Object.entries(input.jobs).flatMap(([name, job]) => checkJob(name, job));
if (process.env.ICE72_PREDICT) {
  writeFileSync(process.env.ICE72_PREDICT, `${JSON.stringify({ schema: "ice72-predictions/v1", predictions }, null, 1)}\n`);
  console.log(`${predictions.length} predictions written (no comparison reported)`);
  process.exit(0);
}
const summary = {
  chains: rows.length, exact: rows.filter((r) => r.verdict === "EXACT").length,
  chainsThroughBattleUnits: rows.filter((r) => r.battleUnits.length > 0).length,
  exactThroughBattleUnits: rows.filter((r) => r.battleUnits.length > 0 && r.verdict === "EXACT").length,
  framesChecked: rows.reduce((n, r) => n + r.frames + r.carry.frames, 0), windowsChecked: rows.reduce((n, r) => n + r.windows + r.carry.windows, 0),
  consumersAfterBattleUnit: rows.flatMap((r) => r.consumers.filter((c) => c.afterBattleUnit)).length,
  consumersAfterBattleUnitExact: rows.flatMap((r) => r.consumers.filter((c) => c.afterBattleUnit && c.exact)).length,
  jobsIdenticalAB: Object.values(input.jobs).filter((j) => j.identicalAB).length, jobs: Object.keys(input.jobs).length,
};
writeFileSync(process.argv[3]!, `${JSON.stringify({ schema: "ice72-chain/v1", summary, chains: rows }, null, 1)}\n`);
if (process.argv[4]) {
  // test vectors: every consumer's production-shaped marker, the ROM consumer order / occupancy, and the RAM-read words per key
  const used = new Set([...vectors.flatMap((v) => JSON.stringify(v.marker).match(/ice72:[^"]+/g) ?? []), ...bodyVectors.map((b) => b.key as string)]);
  writeFileSync(process.argv[4], `${JSON.stringify({ schema: "ice72-lend-vectors/v1", vectors, bodies: bodyVectors,
    words: Object.fromEntries(Object.entries(wordsByKey).filter(([k]) => used.has(k))) })}\n`);
}
for (const r of rows) {
  console.log(r.verdict, r.job, r.words, r.activation, r.identityMap ? "id" : "rho", `carry ${r.carry.frames - r.carry.frameMismatch}/${r.carry.frames}fr post ${r.carry.postExact}`,
    `windows ${r.windows - r.windowMismatch.length}/${r.windows}`, `frames ${r.frames} (${r.frameMismatch} mism)`,
    `consumers ${r.consumers.map((c) => `${c.body}${c.afterBattleUnit ? "*" : ""}:${c.exact ? "ok" : "X"}`).join(",")}`, `| ${r.battleUnits.join(",")}`,
    r.speciesInferred ? `species inferred ${JSON.stringify(r.speciesInferred)}` : "", r.windowMismatch.slice(0, 2).join(" | "));
}
console.log(JSON.stringify(summary));
