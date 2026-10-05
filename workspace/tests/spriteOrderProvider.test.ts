import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createKnownEntrySpriteAllocatorProvider } from "../src/engine/knownEntrySpriteAllocator.ts";
import {
  BATTLE_LAB_ORDINARY_SINGLES_ENTRY_WINDOWS, KNOWN_ENTRY_FIRST_ACTION_FREE_ORDER, applySpriteOrderWindow, initSpriteOrderState,
  invalidateSpriteOrderState, knownEntrySpriteOrderState, onSpriteOrderCreate, onSpriteOrderDestroyGroup,
  spriteOrderForFirstAllocation,
} from "../src/engine/spriteOrderProvider.ts";

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
    expect(knownEntrySpriteOrderState("ordinary-factory").known).toBe(false);
  });
});
