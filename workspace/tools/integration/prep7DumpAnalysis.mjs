// prep7: slot audit + persistent-order sensitivity (prep7Slots.mjs / prep7OrderSeed.mjs methods) over the direct-mGBA sprite dumps of the moves without dense evidence
// (all prep7 moves), tools/integration/fixtures/prep7-sprites/*.json from prep7SpriteDump.sh.
//   node --experimental-strip-types tools/integration/prep7DumpAnalysis.mjs > tools/integration/fixtures/prep7-sprites-analysis.json
import { readFileSync, readdirSync } from "node:fs";
import { createSpriteOrderState, sortSpriteOrder } from "../../src/animation/spriteOrder.ts";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
const D = "tools/integration/fixtures/prep7-sprites";
const model = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles").firstMove.occupants.map((o) => o.slot).sort((a, b) => a - b);
const SEED_A = JSON.parse(readFileSync("tools/integration/fixtures/prep6-slots.json")).moves.find((m) => m.move === "FIRE_BLAST").spriteOrderRow0;
const SEED_B = JSON.parse(readFileSync("tools/integration/fixtures/prep6-slots.json")).moves.find((m) => m.move === "DRAGON_DANCE").spriteOrderRow0;
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]); const POOL = Array.from({ length: 64 }, (_, i) => i).filter((s) => !RES.has(s)); const filt = (o) => o.filter((s) => !RES.has(s));
const key = (s) => ({ priority: (s.attr[2] >> 10) & 3, subpriority: s.subpriority, oamY: s.attr[0] & 0xff, affineMode: ((s.attr[0] >> 8) & 3) === 3 ? "double" : ((s.attr[0] >> 8) & 3) === 1 ? "normal" : "off", oamSize: (s.attr[1] >> 14) & 3, oamShape: ["square", "horizontal", "vertical"][(s.attr[0] >> 14) & 3] ?? "square" });
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const lowest = (occ, k) => { const out = []; for (let s = 0; s < 64 && out.length < k; s++) if (!occ.has(s)) out.push(s); return out; };
const res = [];
for (const file of readdirSync(D).filter((f) => f.endsWith(".json")).sort()) {
  const d = JSON.parse(readFileSync(`${D}/${file}`)); const fr = Object.keys(d.dumps).map(Number).sort((a, b) => a - b).map((k) => d.dumps[k]);
  const occ = fr.map((r) => new Set(r.sprites.map((s) => s.slot)));
  const row0 = [...occ[0]].sort((a, b) => a - b);
  let strict = 0, bad = []; const spawnSlots = [];
  for (let f = 1; f < fr.length; f++) {
    const now = [...occ[f]].filter((s) => !occ[f - 1].has(s)).sort((a, b) => a - b); if (!now.length) continue;
    const freed = [...occ[f - 1]].filter((s) => !occ[f].has(s)); const A = lowest(occ[f - 1], now.length), B = lowest(new Set([...occ[f - 1]].filter((s) => !freed.includes(s))), now.length);
    if (eq(now, A) || eq(now, B)) strict++; else bad.push({ frameIndex: f, spawned: now, lowestFreeA: A, lowestFreeB: B });
    spawnSlots.push(...now.map((s) => [f, s]));
  }
  const own = fr[0].spriteOrder; const shape = filt(own).join() === filt(SEED_A).join() ? "A" : filt(own).join() === filt(SEED_B).join() ? "B" : "other";
  const replay = (seed) => { let st = createSpriteOrderState(POOL, filt(seed)); return fr.map((r) => { st = { ...st, occupants: r.sprites.filter((s) => !RES.has(s.slot)).map((s) => ({ owner: s.slot, slot: s.slot, ...key(s) })) }; st = sortSpriteOrder(st); return { order: st.order.slice(), occ: new Set(st.occupants.map((o) => o.slot)) }; }); };
  const simOwn = replay(own), simA = replay(SEED_A), simB = replay(SEED_B);
  const only = (o, c) => o.filter((s) => c.has(s)).join();
  let romEq = 0, aVsB = 0, ownVsA = 0, maxOcc = 0;
  fr.forEach((r, f) => { const c = simOwn[f].occ; maxOcc = Math.max(maxOcc, c.size); if (only(simOwn[f].order, c) === only(filt(r.spriteOrder), c)) romEq++; if (only(simA[f].order, c) !== only(simB[f].order, c)) aVsB++; if (only(simOwn[f].order, c) !== only(simA[f].order, c)) ownVsA++; });
  let lcg = 4242; const rnd = () => (lcg = (lcg * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const arb = Array.from({ length: 40 }, () => { const a = POOL.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } const sim = replay([...RES, ...a]); let n = 0; fr.forEach((_, f) => { const c = simOwn[f].occ; if (only(sim[f].order, c) !== only(simOwn[f].order, c)) n++; }); return n; });
  res.push({ file, window: d.window, rows: fr.length, row0Slots: row0, row0EqualsKnownEntryFirstMove: eq(row0, model), row0SpriteOrderShape: shape, maxOccupiedPoolSlots: maxOcc, spawnFrames: strict + bad.length, spawnFramesFirstFree: strict, spawnFramesNotFirstFree: bad.length, badSample: bad.slice(0, 3),
    spawnSlotsInOrder: spawnSlots.map((x) => x[1]).slice(0, 40), modelEqualsRomOrderSameFrame: romEq, seedAvsBDiffFrames: aVsB, ownVsSeedA: ownVsA, arbitrarySeeds: 40, arbitrarySeedsWithDiff: arb.filter((n) => n > 0).length, arbitraryDiffFramesMax: Math.max(...arb), arbitraryDiffFramesMin: Math.min(...arb) });
}
console.log(JSON.stringify(res, null, 1));
