// prep6: DRAGON_DANCE orb painter order at the only seed-sensitive frame (window age 20..22) under row-0 seed shapes A (...2,3,4...) and B (...2,4,3...),
// and the ROM's own order. node --experimental-strip-types tools/integration/prep6DdOrder.mjs > tools/integration/fixtures/prep6-dd-order.json
import { readFileSync } from "node:fs"; import { gunzipSync } from "node:zlib";
import { createSpriteOrderState, sortSpriteOrder } from "../../src/animation/spriteOrder.ts";
const sl = JSON.parse(readFileSync("tools/integration/fixtures/prep6-slots.json")).moves;
const A = sl.find((m) => m.move === "FIRE_BLAST").spriteOrderRow0, B = sl.find((m) => m.move === "DRAGON_DANCE").spriteOrderRow0;
const ev = JSON.parse(readFileSync("tools/compare/fixtures/dragon-dance-evidence.json"));
const RES = new Set([0, 1, 2, 6, 8, 60, 61, 62, 63]), POOL = Array.from({ length: 64 }, (_, i) => i).filter((s) => !RES.has(s)), filt = (o) => o.filter((s) => !RES.has(s));
const key = (s) => ({ priority: (s.attr[2] >> 10) & 3, subpriority: s.subpriority, oamY: s.attr[0] & 0xff, affineMode: ((s.attr[0] >> 8) & 3) === 3 ? "double" : ((s.attr[0] >> 8) & 3) === 1 ? "normal" : "off", oamSize: (s.attr[1] >> 14) & 3, oamShape: ["square", "horizontal", "vertical"][(s.attr[0] >> 14) & 3] ?? "square" });
const out = [];
for (const o of ["player-back", "opponent-front"]) {
  const frames = JSON.parse(gunzipSync(readFileSync(ev.orientations[o].denseState))).frames;
  const run = (seed) => { let st = createSpriteOrderState(POOL, filt(seed)); return frames.map((r) => { st = { ...st, occupants: r.sprites.filter((s) => !RES.has(s.slot)).map((s) => ({ owner: s.slot, slot: s.slot, ...key(s) })) }; st = sortSpriteOrder(st); return st.order.slice(); }); };
  const sa = run(A), sb = run(B);
  for (const f of [19, 20, 21, 22]) {
    const occ = new Set(frames[f].sprites.map((s) => s.slot)); const orb = [3, 4, 5, 7, 9, 10].filter((s) => occ.has(s)); const pick = (ord) => ord.filter((s) => orb.includes(s));
    out.push({ orientation: o, windowAge: f, orbSlotsPresent: orb, romOrderFrontToBack: pick(frames[f].spriteOrder), seedA: pick(sa[f]), seedB: pick(sb[f]) });
  }
}
console.log(JSON.stringify(out, null, 1));
