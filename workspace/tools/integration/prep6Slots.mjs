// prep6 sprite-slot audit (question 2) for the moves with dense ROM state: is every accepted slot the first-free slot of the known-entry
// allocator at the sprite's spawn age, and what do the persistent sSpriteOrder seeds look like at window row 0?
//   node --experimental-strip-types tools/integration/prep6Slots.mjs > tools/integration/fixtures/prep6-slots.json   (from workspace root)
// Model: `createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove` (src/engine/knownEntrySpriteAllocator.ts) = occupancy right
// before the first move allocates; the ROM per-frame in-use set (dense row `sprites[].slot`) is the ground truth. A spawn (slot absent in frame f-1,
// present in frame f) is "first-free" iff the f's new slots are the k lowest slots of the free set of frame f-1 (hypothesis A) or of the free set
// of f-1 plus slots released in f (hypothesis B: a destroy earlier in the same frame is reused by a later create).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";

const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const rdz = (p) => JSON.parse(gunzipSync(readFileSync(p)).toString());
const ev = (n) => rd(`tools/compare/fixtures/${n}.json`);
const MOVES = [
  ["ROCK_TOMB", "rock-tomb-dense-evidence", { "player-back": "stateGzip", "opponent-front": "stateGzip" }],
  ["PAIN_SPLIT", "pain-split-evidence", {}],
  ["DRAGON_DANCE", "dragon-dance-evidence", {}],
  ["SAFEGUARD", "safeguard-evidence", {}],
  ["SWEET_SCENT", "sweet-scent-evidence", {}],
  ["FIRE_BLAST", "fire-blast-evidence", {}],
];
const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
const provSlots = (h) => h.occupants.map((o) => o.slot).sort((a, b) => a - b);
const modelFirstMove = provSlots(provider.firstMove);
const modelOwners = provider.firstMove.occupants.map((o) => `${o.slot}:${o.owner.kind}${o.owner.side ? "/" + o.owner.side : ""}`);
const tpl = (s) => (s.template && typeof s.template === "object" ? s.template.symbol ?? s.template.address ?? "null" : String(s.template));
const lowest = (occ, k) => { const out = []; for (let s = 0; s < 64 && out.length < k; s++) if (!occ.has(s)) out.push(s); return out; };
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const out = { modelFirstMoveSlots: modelFirstMove, modelFirstMoveOwners: modelOwners, moves: [] };
for (const [move, evName, _] of MOVES) {
  const e = ev(evName);
  for (const o of ["player-back", "opponent-front"]) {
    const item = e.orientations[o];
    const path = item.denseState ?? item.stateGzip;
    const frames = rdz(path).frames;
    const occ = frames.map((r) => new Set(r.sprites.map((s) => s.slot)));
    const row0 = [...occ[0]].sort((a, b) => a - b);
    const baseline = occ[0];
    // spawns
    const spawns = []; let stricts = 0, hypB = 0, bad = [];
    for (let f = 1; f < frames.length; f++) {
      const now = [...occ[f]].filter((s) => !occ[f - 1].has(s)).sort((a, b) => a - b);
      const freed = [...occ[f - 1]].filter((s) => !occ[f].has(s));
      if (!now.length) continue;
      const A = lowest(occ[f - 1], now.length);
      const afterFree = new Set([...occ[f - 1]].filter((s) => !freed.includes(s)));
      const B = lowest(afterFree, now.length);
      const okA = eq(now, A), okB = eq(now, B);
      if (okA) stricts++; else if (okB) hypB++; else bad.push({ age: f, spawned: now, lowestFreeA: A, lowestFreeB: B });
      for (const s of now) { const sp = frames[f].sprites.find((x) => x.slot === s); spawns.push({ age: f, slot: s, template: tpl(sp), subpriority: sp.subpriority }); }
    }
    // lifetimes by slot occupant runs (slot present contiguous)
    const runs = [];
    for (let s = 0; s < 64; s++) {
      let start = null;
      for (let f = 0; f <= frames.length; f++) {
        const has = f < frames.length && occ[f].has(s);
        if (has && start === null) start = f;
        if (!has && start !== null) { if (!baseline.has(s) || start > 0) runs.push({ slot: s, spawn: start, lastAlive: f - 1, template: tpl(frames[start].sprites.find((x) => x.slot === s)) }); start = null; }
      }
    }
    const byTemplate = {};
    for (const r of runs) { (byTemplate[r.template] ??= []).push([r.slot, r.spawn, r.lastAlive]); }
    // baseline sprites that disappear / change (non-move owners)
    const baselineGone = row0.filter((s) => !occ[frames.length - 1].has(s));
    out.moves.push({
      move, orientation: o, rows: frames.length,
      row0Slots: row0, row0EqualsKnownEntryFirstMove: eq(row0.filter((s) => frames[0].sprites.find((x) => x.slot === s)), modelFirstMove) ,
      row0MinusModel: row0.filter((s) => !modelFirstMove.includes(s)), modelMinusRow0: modelFirstMove.filter((s) => !row0.includes(s)),
      spawnEvents: spawns.length, spawnFramesStrictFirstFree: stricts, spawnFramesFirstFreeAfterSameFrameFree: hypB, spawnFramesNotFirstFree: bad.length, badSample: bad.slice(0, 4),
      baselineSlotsGoneAtEnd: baselineGone,
      spawnOrderSlots: spawns.map((s) => s.slot), spawnAges: spawns.map((s) => s.age),
      runsByTemplate: byTemplate,
      spriteOrderRow0: frames[0].spriteOrder,
      spriteOrderRow0Head: frames[0].spriteOrder.slice(0, 16),
    });
  }
}
console.log(JSON.stringify(out, null, 1));
