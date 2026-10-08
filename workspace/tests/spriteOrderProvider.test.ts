import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import {
  BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, applySpriteOrderWindow, initSpriteOrderState,
  invalidateSpriteOrderState, knownEntrySpriteOrderState, onSpriteOrderCreate, onSpriteOrderDestroyGroup,
  spriteOrderForFirstAllocation, spriteOrderForSlots, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderWithOccupiedPrefix,
  spriteOrderPlanTableFromFixture, createSpriteOrderPlanCursor, applySpriteOrderUnitPlan,
} from "../src/engine/spriteOrderProvider.ts";
import { decodeSpriteOrderPlan } from "../src/engine/spriteOrderEventTransform.ts";
import { SPRITE_ORDER_PRODUCTION_ANIMS, SPRITE_ORDER_PRODUCTION_PLANS } from "../src/engine/spriteOrderProductionPlans.ts";

const RAW = join(import.meta.dirname, "../tools/integration/fixtures/sprite-order-event-raw");
const RECEIPT = JSON.parse(readFileSync(join(RAW, "../sprite-order-event-model.json"), "utf8"));

interface Frame { n: number; order: number[]; mask: bigint; act: number }

function hex(text: string): number[] { return [...Buffer.from(text, "hex")]; }
function slotsOf(mask: bigint): number[] { return Array.from({ length: 64 }, (_, s) => s).filter(s => (mask >> BigInt(s)) & 1n); }
function freeOf(order: number[], mask: bigint): number[] { return order.filter(s => !((mask >> BigInt(s)) & 1n)); }

/** Mirror of tools/integration/spriteOrderEventModel.py load/frames_of: one state per frame number. */
function loadFrames(file: string): Frame[] {
  const raw = JSON.parse(readFileSync(join(RAW, file), "utf8"));
  const rows: Frame[] = raw.rows.map((r: [number, unknown, string, string, number]) => (
    { n: r[0], order: hex(r[2]), mask: BigInt(`0x${r[3]}`), act: r[4] }));
  const frames: Frame[] = [];
  let i = 0;
  for (let n = rows[0]!.n; n <= raw.lastFrame; n++) {
    while (i + 1 < rows.length && rows[i + 1]!.n <= n) i++;
    frames.push({ ...rows[i]!, n });
  }
  return frames;
}

describe("spriteOrderProvider units", () => {
  it("resets to identity", () => {
    const s = initSpriteOrderState();
    expect(s.known).toBe(true);
    expect(s.free).toEqual(Array.from({ length: 64 }, (_, i) => i));
    expect(Object.isFrozen(s) && Object.isFrozen(s.free)).toBe(true);
  });
  it("create removes the slot and keeps the rest", () => {
    const s = onSpriteOrderCreate(onSpriteOrderCreate(initSpriteOrderState(), 0), 5);
    expect(s.free.slice(0, 6)).toEqual([1, 2, 3, 4, 6, 7]);
    expect(s.free).toHaveLength(62);
    expect(() => onSpriteOrderCreate(s, 5)).toThrow();
  });
  it("destroy goes to the head; a same-window group keeps array order", () => {
    let s = initSpriteOrderState();
    for (const slot of [0, 1, 2, 3]) s = onSpriteOrderCreate(s, slot);
    const one = onSpriteOrderDestroyGroup(s, [2]);
    expect(one.free.slice(0, 3)).toEqual([2, 4, 5]);
    expect(one.pendingDestroyed).toEqual([2]);
    const group = onSpriteOrderDestroyGroup(s, [3, 1]);
    expect(group.free.slice(0, 4)).toEqual([3, 1, 4, 5]);
    expect(() => onSpriteOrderDestroyGroup(group, [3])).toThrow();
  });
  it("window helper orders destroys by previous array position and nets same-slot pairs", () => {
    let s = initSpriteOrderState();
    for (const slot of [3, 4, 9]) s = onSpriteOrderCreate(s, slot);
    const previous = [9, 4, 3, ...Array.from({ length: 64 }, (_, i) => i).filter(i => ![3, 4, 9].includes(i))];
    const w = applySpriteOrderWindow(s, [], [3, 4], previous);
    expect(w.free.slice(0, 3)).toEqual([4, 3, 0]);
    // create+destroy of a free slot: no-op
    const noop = applySpriteOrderWindow(w, [0], [0], previous);
    expect(noop.free).toEqual(w.free);
    // destroy+recreate of an occupied slot: stays occupied, free unchanged
    const again = applySpriteOrderWindow(w, [9], [9], previous);
    expect(again.free).toEqual(w.free);
    // creates plus destroys in one window
    const mixed = applySpriteOrderWindow(w, [4], [9], previous);
    expect(mixed.free.slice(0, 3)).toEqual([9, 3, 0]);
  });
  it("invalidate makes every query null and stays invalid", () => {
    const s = invalidateSpriteOrderState(initSpriteOrderState());
    expect(s.known).toBe(false);
    expect(spriteOrderForFirstAllocation(s, 1)).toBeNull();
    expect(onSpriteOrderCreate(s, 0)).toBe(s);
    expect(applySpriteOrderWindow(s, [1], [], [])).toBe(s);
    expect(onSpriteOrderDestroyGroup(s, [1]).known).toBe(false);
    expect(spriteOrderForFirstAllocation(initSpriteOrderState(), 3)).toEqual([0, 1, 2]);
    expect(spriteOrderForFirstAllocation(initSpriteOrderState(), 65)).toBeNull();
  });
});

describe("spriteOrderProvider corpus replay", () => {
  const files = readdirSync(RAW).filter(f => /-[01]\.json$/.test(f)).sort();
  const edgeHeads = new Map<string, Map<number, number[]>>();
  for (const sc of RECEIPT.scenarios) {
    edgeHeads.set(sc.file, new Map(sc.activations.map((a: { frame: number; freeOrderHead: number[] }) => [a.frame, a.freeOrderHead])));
  }

  it("replays every frame of every raw scenario", () => {
    expect(files).toHaveLength(44);
    let hit = 0, miss = 0, edges = 0, edgeHeadMatches = 0, firstActions = 0;
    for (const file of files) {
      const frames = loadFrames(file);
      let state = initSpriteOrderState();
      expect(frames[0]!.mask).toBe(0n);
      const heads = edgeHeads.get(file.replace(/-[01]\.json$/, ""))!;
      let prev = frames[0]!;
      let actSeen = false, firstActionDone = false, prevAct = 0;
      for (const frame of frames.slice(1)) {
        const before = new Set(slotsOf(prev.mask)), after = new Set(slotsOf(frame.mask));
        const created = [...after].filter(s => !before.has(s));
        const destroyed = [...before].filter(s => !after.has(s));
        // First move allocation: the frame before the first create at/after the first action edge.
        if (actSeen && !firstActionDone && created.length) {
          firstActionDone = true;
          expect(freeOf(prev.order, prev.mask)).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
          expect(spriteOrderForFirstAllocation(state, 3)).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER.slice(0, 3));
          firstActions++;
        }
        state = applySpriteOrderWindow(state, created, destroyed, prev.order);
        const observed = freeOf(frame.order, frame.mask);
        if (state.free.length === observed.length && state.free.every((s, i) => s === observed[i])) hit++;
        else { miss++; state = { ...state, free: observed }; }
        if (frame.act && !prevAct) {
          edges++;
          actSeen = true;
          const head = heads.get(frame.n);
          if (head && state.free.slice(0, 12).join() === head.join()) edgeHeadMatches++;
        }
        prevAct = frame.act;
        prev = frame;
      }
      expect(firstActionDone).toBe(true);
    }
    const totals = RECEIPT.totals;
    expect(RECEIPT.totals.perFrameFreeOrderHitsMisses.array).toEqual({ hit: 40185, miss: 0 });
    // The receipt counts one run per scenario (22); the corpus holds each twice.
    expect(hit).toBe(2 * totals.perFrameFreeOrderHitsMisses.array.hit);
    expect(miss).toBe(0);
    expect(edges).toBe(2 * totals.activationEdges);
    expect(totals.activationEdges).toBe(56);
    expect(edgeHeadMatches).toBe(edges);
    expect(firstActions).toBe(44);
  });
});

describe("known-entry sprite order replay", () => {
  it("yields the first-action free order and matches the allocator's occupants", () => {
    const state = knownEntrySpriteOrderState("battle-lab-ordinary-singles");
    expect(state.free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
    const occupied = new Set(provider.firstMove.occupants.map(o => o.slot));
    expect([...Array(64).keys()].filter(s => !state.free.includes(s))).toEqual([...occupied].sort((a, b) => a - b));
    const lastWindow = BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.at(-1)!;
    expect(lastWindow[1]).toEqual([4, 3]);
  });
  it("matches the raw corpus entry stream and refuses unmodelled routes", () => {
    const frames = loadFrames(readdirSync(RAW).find(f => f.includes("karate"))!);
    const windows: [number[], number[]][] = [];
    let prev = frames[0]!;
    for (const frame of frames.slice(1)) {
      const before = new Set(slotsOf(prev.mask)), after = new Set(slotsOf(frame.mask));
      const created = [...after].filter(s => !before.has(s));
      const destroyed = [...before].filter(s => !after.has(s)).sort((a, b) => prev.order.indexOf(a) - prev.order.indexOf(b));
      if (created.length || destroyed.length) windows.push([created, destroyed]);
      if (windows.length === BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.length) break;
      prev = frame;
    }
    expect(windows).toEqual(BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.map(([c, d]) => [[...c], [...d]]));
    expect(knownEntrySpriteOrderState("ordinary-factory").free).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
    expect(knownEntrySpriteOrderState("ordinary-factory").known).toBe(true);
    expect(knownEntrySpriteOrderState("unmodelled" as "ordinary-factory").known).toBe(false);
  });
});

describe("ordinary Factory entry (Scene ON, draft -> battle 1, tools/integration/fixtures/sprite-order-factory-raw)", () => {
  const FACTORY = join(import.meta.dirname, "../tools/integration/fixtures/sprite-order-factory-raw");
  const names = readdirSync(FACTORY).filter(f => f.endsWith(".json")).sort();

  function load(file: string) {
    const raw = JSON.parse(readFileSync(join(FACTORY, file), "utf8"));
    const rows: Frame[] = raw.rows.map((r: [number, unknown, string, string, number]) => (
      { n: r[0], order: hex(r[2]), mask: BigInt(`0x${r[3]}`), act: r[4] }));
    const frames: Frame[] = [];
    let i = 0;
    for (let n = rows[0]!.n; n <= raw.lastFrame; n++) {
      while (i + 1 < rows.length && rows[i + 1]!.n <= n) i++;
      frames.push({ ...rows[i]!, n });
    }
    return { raw, frames };
  }

  it("has two byte-identical runs per scenario", () => {
    expect(names).toHaveLength(4);
    for (const base of ["battle1-turn1", "battle1-turn1-varB"]) {
      expect(readFileSync(join(FACTORY, `${base}-0.json`), "utf8")).toBe(readFileSync(join(FACTORY, `${base}-1.json`), "utf8"));
    }
  });

  it("replays the entry stream, first-move free order and occupants for every scenario", () => {
    const provider = createKnownEntrySpriteAllocatorProvider("ordinary-factory");
    const occupied = provider.firstMove.occupants.map(o => o.slot).sort((a, b) => a - b);
    const opponents = new Set<number>();
    for (const file of names.filter(f => /-0\.json$/.test(f))) {
      const { raw, frames } = load(file);
      opponents.add(raw.endState.opponent[0][0]);
      expect(frames[0]!.mask).toBe(0n);
      const windows: [number[], number[]][] = [];
      let state = initSpriteOrderState();
      let prev = frames[0]!;
      let hit = 0, miss = 0, firstMoveFree: number[] | null = null, firstMoveOccupied: number[] = [];
      let actSeen = false;
      for (const frame of frames.slice(1)) {
        const before = new Set(slotsOf(prev.mask)), after = new Set(slotsOf(frame.mask));
        const created = [...after].filter(s => !before.has(s));
        const destroyed = [...before].filter(s => !after.has(s)).sort((a, b) => prev.order.indexOf(a) - prev.order.indexOf(b));
        if (actSeen && firstMoveFree === null && created.length) {
          firstMoveFree = freeOf(prev.order, prev.mask);
          firstMoveOccupied = slotsOf(prev.mask);
        }
        if (created.length || destroyed.length) windows.push([created, destroyed]);
        state = applySpriteOrderWindow(state, created, destroyed, prev.order);
        const observed = freeOf(frame.order, frame.mask);
        if (state.free.join() === observed.join()) hit++; else { miss++; state = { ...state, free: observed }; }
        if (frame.act) actSeen = true;
        prev = frame;
      }
      expect(miss).toBe(0);
      expect(hit).toBe(frames.length - 1);
      const table = BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS.map(([c, d]) => [[...c], [...d]]);
      expect(windows.slice(0, table.length)).toEqual(table);
      expect(firstMoveFree).toEqual(KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER);
      expect(firstMoveOccupied).toEqual(occupied);
    }
    expect(opponents.size).toBe(2);
  });
});

describe("consumer API: allocation-slot order and occupied prefix", () => {
  const entry = knownEntrySpriteOrderState("battle-lab-ordinary-singles");
  it("filters F to the allocation slots (not F.slice)", () => {
    // Grudge's six flames: order-consumer-prep §0/§1, provider == literal == observed 2/2.
    expect(spriteOrderForSlots(entry, [3, 4, 5, 7, 9, 10])).toEqual([4, 3, 5, 10, 9, 7]);
    expect(spriteOrderForFirstAllocation(entry, 6)).toEqual([4, 3, 21, 20, 5, 19]);
    // Leaf Blade's first-action slots (order-consumer-prep §0).
    expect(spriteOrderForSlots(entry, [3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]))
      .toEqual([4, 3, 5, 16, 15, 14, 13, 12, 11, 10, 9, 7]);
  });
  it("refuses unknown history, occupied, out-of-range and repeated slots", () => {
    expect(spriteOrderForSlots(invalidateSpriteOrderState(entry), [3])).toBeNull();
    expect(spriteOrderForSlots(entry, [3, 6])).toBeNull();
    expect(spriteOrderForSlots(entry, [3, 64])).toBeNull();
    expect(spriteOrderForSlots(entry, [3, 3])).toBeNull();
  });
  it("pins the known-entry occupied prefix to the complement of F and the allocator occupants", () => {
    const occupants = createKnownEntrySpriteAllocatorProvider("ordinary-factory").firstMove.occupants.map(o => o.slot);
    expect([...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER].sort((a, b) => a - b)).toEqual([...occupants].sort((a, b) => a - b));
    const full = spriteOrderWithOccupiedPrefix(entry, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)!;
    expect(full.slice(0, 12)).toEqual([62, 60, 0, 63, 1, 61, 6, 8, 2, 4, 3, 21]);
    expect(spriteOrderWithOccupiedPrefix(entry, [62, 60])).toBeNull();
    expect(spriteOrderWithOccupiedPrefix(invalidateSpriteOrderState(entry), KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER)).toBeNull();
  });
});

describe("body/gap plan applier: TS replay of sprite-order-body-plans.json (mirrors spriteOrderBodyPlans.py)", () => {
  const FIX = join(import.meta.dirname, "../tools/integration/fixtures");
  const PLANS = JSON.parse(readFileSync(join(FIX, "sprite-order-body-plans.json"), "utf8"));
  const EVENTS = JSON.parse(readFileSync(join(FIX, "sprite-order-body-events.json"), "utf8"));
  const table = spriteOrderPlanTableFromFixture(PLANS);
  interface Unit { kind: "body" | "gap"; mv?: number; truncated?: boolean; last?: boolean; observedFreeAtEdge?: number[] }
  interface Scenario { file: string; move: number | null; side: string | null; freeAtFirstEdge: number[];
    entryMatchesProvider: boolean; units: Unit[] }
  const ownerSide = (sc: Scenario, mv: number): string => sc.side === null ? "unattributed"
    : mv === sc.move ? sc.side : mv === 0 ? "any" : sc.side === "opponent" ? "player" : "opponent";
  const ukey = (sc: Scenario, u: Unit) => `${u.mv}:${ownerSide(sc, u.mv!)}`;
  const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

  it("loads only EXACT-PLAN rows", () => {
    expect(table.bodies.has("288:player")).toBe(false); // Grudge body: NEEDS-KEYS
    expect(table.bodies.has("33:player")).toBe(true);
    expect([...table.bodies.keys()].every(k => PLANS.bodies[k].verdict === "EXACT-PLAN")).toBe(true);
    expect(table.gapAfterBody.get("101:player")).toBeDefined();
  });

  it("reproduces 659 edges preceded by exact plans, 659 exact, 0 mismatched", () => {
    const stat: Record<string, number> = {};
    const bump = (k: string) => { stat[k] = (stat[k] ?? 0) + 1; };
    const entryF = knownEntrySpriteOrderState("battle-lab-ordinary-singles");
    for (const sc of EVENTS.scenarios as Scenario[]) {
      if (!sc.entryMatchesProvider) {
        bump("scenariosEntryWindowsDiffer");
        if (!same(sc.freeAtFirstEdge, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER)) { bump("skipped"); continue; }
      }
      let cursor = createSpriteOrderPlanCursor(entryF,
        createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove.occupants.map(o => o.slot));
      sc.units.forEach((u, ui) => {
        if (stat.__break) return;
        let plan;
        if (u.kind === "body") {
          if (u.truncated) { stat.__break = 1; return; }
          bump("edges");
          if (cursor.order.known) {
            bump("edgesPrecededByExactPlans");
            bump(ui > 1 ? "laterEdgesPrecededByExactPlans" : "firstEdgesPrecededByExactPlans");
            bump(same(cursor.order.free, u.observedFreeAtEdge!) ? "edgesExact" : "edgesMismatched");
            if (ui === 1 && same(cursor.order.free, u.observedFreeAtEdge!)) bump("firstEdgesExact");
          }
          plan = table.bodies.get(ukey(sc, u));
        } else {
          if (u.last) return;
          const next = sc.units[ui + 1]!;
          plan = table.gaps.get(`${ui === 0 ? "entry" : ukey(sc, sc.units[ui - 1]!)}>${ukey(sc, next)}`);
        }
        cursor = applySpriteOrderUnitPlan(cursor, plan);
      });
      delete stat.__break;
    }
    expect(stat).toEqual({
      edges: 790, edgesPrecededByExactPlans: 659, firstEdgesPrecededByExactPlans: 338, laterEdgesPrecededByExactPlans: 321,
      edgesExact: 659, firstEdgesExact: 338, scenariosEntryWindowsDiffer: 19, skipped: 12,
    });
    expect(PLANS.replay).toMatchObject({ edges: 790, edgesPrecededByExactPlans: 659, edgesExact: 659, firstEdgesExact: 338 });
  });

  it("invalidates on a missing or NEEDS-KEYS plan and stays invalid", () => {
    const cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory"));
    const grudge = applySpriteOrderUnitPlan(cursor, table.bodies.get("288:player"));
    expect(grudge.order.known).toBe(false);
    expect(applySpriteOrderUnitPlan(grudge, table.bodies.get("33:player")).order.known).toBe(false);
    expect(createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory"), [0, 1]).order.known).toBe(false);
  });

  it("applies the transient blip and the FDERIVED cursor-pair cycle from F", () => {
    const cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory"));
    const blip = applySpriteOrderUnitPlan(cursor, [{ C: [["n", 0, "f"]] }, { D: [["n", 0]] }]);
    expect(blip.order.free.slice(0, 4)).toEqual([3, 4, 21, 20]);
    const pair = applySpriteOrderUnitPlan(cursor, [{ C: [["n", 0, "f"], ["n", 1, "f"]] }, { D: [["n", 1], ["n", 0]], pw: [782, 782] }]);
    expect(pair.order.free.slice(0, 4)).toEqual([4, 3, 21, 20]);
  });

  it("counts a slot freed and re-taken inside the unit once, at its last creation (prep43 PRZ survivor count)", () => {
    const cursor = createSpriteOrderPlanCursor(knownEntrySpriteOrderState("ordinary-factory"));
    // Cf;D0;Cf re-takes the slot n0 freed: `made` lists it twice, but only the second creation is alive.
    const retaken = applySpriteOrderUnitPlan(cursor, [{ C: [["n", 0, "f"]] }, { D: [["n", 0]] }, { C: [["n", 1, "f"]] }]);
    expect(retaken.order.known).toBe(true);
    expect(retaken.survivors[retaken.units - 1]).toEqual([3]);
    // STATUS_PRZ (docs/next-adapters-prep43.md): sparks alternate slots 3 / 4, one spark (slot 4) survives the unit.
    const prz = applySpriteOrderUnitPlan(cursor, decodeSpriteOrderPlan(SPRITE_ORDER_PRODUCTION_PLANS[SPRITE_ORDER_PRODUCTION_ANIMS.STATUS_PRZ]!));
    expect(prz.order.known).toBe(true);
    expect(prz.survivors[prz.units - 1]).toEqual([4]);
  });
});
