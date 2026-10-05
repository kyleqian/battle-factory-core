// prep6 persistent-sSpriteOrder experiment on the dense ROM rows (ROCK_TOMB, PAIN_SPLIT, DRAGON_DANCE, SAFEGUARD, SWEET_SCENT, FIRE_BLAST; both orientations).
//   node --experimental-strip-types tools/integration/prep6OrderSeed.mjs > tools/integration/fixtures/prep6-order-seed.json
// Replays src/animation/spriteOrder.ts (the reduced model of sprite.c SortSprites) over the ROM sprite keys of every frame, restricted to the non-reserved slot pool
// (reserved = row-0 occupancy 0,1,2,6,8,60-63), from three seeds: the ROM row-0 sSpriteOrder of THIS scenario (validation vs the ROM's own per-frame order) and the two
// distinct row-0 shapes seen across the accepted scenarios (A: ...,2,3,4,...  B: ...,2,4,3,...). Sensitivity = frames where the occupied-slot order differs between seeds.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createSpriteOrderState, sortSpriteOrder } from "../../src/animation/spriteOrder.ts";
const rd = (p) => JSON.parse(readFileSync(p, "utf8")), rdz = (p) => JSON.parse(gunzipSync(readFileSync(p)).toString());
const ev = (n) => rd(`tools/compare/fixtures/${n}.json`);
const SRC = [["ROCK_TOMB", "rock-tomb-dense-evidence"], ["PAIN_SPLIT", "pain-split-evidence"], ["DRAGON_DANCE", "dragon-dance-evidence"], ["SAFEGUARD", "safeguard-evidence"], ["SWEET_SCENT", "sweet-scent-evidence"], ["FIRE_BLAST", "fire-blast-evidence"]];
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]);
const POOL = Array.from({ length: 64 }, (_, i) => i).filter((s) => !RES.has(s));
const filt = (o) => o.filter((s) => !RES.has(s));
const key = (s) => ({ priority: (s.attr[2] >> 10) & 3, subpriority: s.subpriority, oamY: s.attr[0] & 0xff,
  affineMode: ((s.attr[0] >> 8) & 3) === 3 ? "double" : ((s.attr[0] >> 8) & 3) === 1 ? "normal" : "off", oamSize: (s.attr[1] >> 14) & 3, oamShape: ["square", "horizontal", "vertical"][(s.attr[0] >> 14) & 3] ?? "square" });
const SEED_A = rdz(ev("fire-blast-evidence").orientations["player-back"].denseState).frames[0].spriteOrder;       // shape A (...2,3,4...)
const SEED_B = rdz(ev("dragon-dance-evidence").orientations["player-back"].denseState).frames[0].spriteOrder;     // shape B (...2,4,3...)
const out = { seedAHead: SEED_A.slice(8, 12), seedBHead: SEED_B.slice(8, 12), results: [] };
function replay(frames, seed, lag) {
  let st = createSpriteOrderState(POOL, filt(seed));
  const orders = [];
  for (const row of frames) {
    st = { ...st, occupants: row.sprites.filter((s) => !RES.has(s.slot) && s.attr).map((s) => ({ owner: s.slot, slot: s.slot, ...key(s) })) };
    st = sortSpriteOrder(st);
    orders.push({ order: st.order.slice(), occ: new Set(st.occupants.map((o) => o.slot)) });
  }
  return orders;
}
for (const [move, name] of SRC) for (const o of ["player-back", "opponent-front"]) {
  const e = ev(name).orientations[o]; const frames = rdz(e.denseState ?? e.stateGzip).frames;
  const own = frames[0].spriteOrder;
  const shape = filt(own).join() === filt(SEED_A).join() ? "A" : filt(own).join() === filt(SEED_B).join() ? "B" : "other";
  const simOwn = replay(frames, own), simA = replay(frames, SEED_A), simB = replay(frames, SEED_B);
  const onlyOcc = (ord, occ) => ord.filter((s) => occ.has(s));
  let romEq0 = 0, romEq1 = 0, aVsB = 0, ownVsA = 0, ownVsB = 0, maxOcc = 0, firstDiff = null;
  frames.forEach((row, f) => {
    const occ = simOwn[f].occ; maxOcc = Math.max(maxOcc, occ.size);
    const rom = onlyOcc(filt(row.spriteOrder), occ).join();
    if (onlyOcc(simOwn[f].order, occ).join() === rom) romEq0++;
    if (f + 1 < frames.length && onlyOcc(simOwn[f].order, occ).join() === onlyOcc(filt(frames[f + 1].spriteOrder), occ).join()) romEq1++;
    const a = onlyOcc(simA[f].order, occ).join(), b = onlyOcc(simB[f].order, occ).join(), w = onlyOcc(simOwn[f].order, occ).join();
    if (a !== b) { aVsB++; if (firstDiff === null) firstDiff = f; }
    if (w !== a) ownVsA++; if (w !== b) ownVsB++;
  });
  // arbitrary-seed sensitivity: ascending, descending and 40 deterministic (LCG) shuffles of the pool; frames where the occupied-slot order differs from the own-seed replay
  let lcg = 12345; const rnd = () => (lcg = (lcg * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const seeds = [POOL.slice(), POOL.slice().reverse(), ...Array.from({ length: 40 }, () => { const a = POOL.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })];
  const arb = seeds.map((sd) => { const sim = replay(frames, [...RES, ...sd]); let n = 0; frames.forEach((_, f) => { const occ = simOwn[f].occ; if (onlyOcc(sim[f].order, occ).join() !== onlyOcc(simOwn[f].order, occ).join()) n++; }); return n; });
  out.results.push({ arbitrarySeeds: seeds.length, arbitraryDiffFramesMin: Math.min(...arb), arbitraryDiffFramesMax: Math.max(...arb), arbitrarySeedsWithAnyDiff: arb.filter((n) => n > 0).length, move, orientation: o, rows: frames.length, row0Shape: shape, maxOccupiedPoolSlots: maxOcc, modelEqualsRomOrderSameFrame: romEq0, modelEqualsRomOrderNextFrame: romEq1,
    framesWhereSeedAandBDiffer: aVsB, firstFrameSeedsDiffer: firstDiff, framesOwnSeedDiffersFromA: ownVsA, framesOwnSeedDiffersFromB: ownVsB });
}
console.log(JSON.stringify(out, null, 1));
