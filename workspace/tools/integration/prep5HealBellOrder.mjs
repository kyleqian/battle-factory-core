// Heal Bell: does the note painter order depend on the assumed initial sSpriteOrder permutation of slots [4,5,7,9,10,11]?
// Copy of healBellNotesInPainterOrder (src/animation/healBell.ts:372-407) with the initial order as a parameter; counts ages whose
// painter order differs, and how many of those differences involve an overlapping (|dx|<16,|dy|<16) pair.
//   node --experimental-strip-types tools/integration/prep5HealBellOrder.mjs > tools/integration/fixtures/prep5-heal-bell-order.json
import { healBellAtAge } from "../../src/animation/healBell.ts";
import { sortGbaSpriteOrder } from "../../src/animation/gbaObjCompositor.ts";
function order(init, age, side, ac, bp) {
  let o = [...init];
  for (let t = 0; t <= age; t++) {
    const s = healBellAtAge(t, side, ac, bp);
    o = sortGbaSpriteOrder(o, o.map((slot) => {
      const n = s.notes.find((c) => c.slot === slot); if (n) return { slot, priority: 2, subpriority: 40, y: n.y + n.y2 - 8 };
      const r = s.rings.find((c) => c.slot === slot); if (r) return { slot, priority: 2, subpriority: 40, y: r.y - 64 };
      return { slot, priority: 3, subpriority: 255, y: -96 };
    }));
  }
  const s = healBellAtAge(age, side, ac, bp), by = new Map(s.notes.map((n) => [n.slot, n]));
  return o.slice().reverse().flatMap((slot) => (by.get(slot) ? [slot] : []));
}
const INITS = { ascending: [4, 5, 7, 9, 10, 11], descending: [11, 10, 9, 7, 5, 4], rotated: [7, 9, 10, 11, 4, 5], interleaved: [5, 9, 4, 11, 7, 10] };
const cfg = { player: [{ x: 72, y: 95 }, { x: 72, y: 80 }], opponent: [{ x: 176, y: 34 }, { x: 176, y: 40 }] };
const res = [];
for (const side of ["player", "opponent"]) {
  const [ac, bp] = cfg[side];
  for (const [name, init] of Object.entries(INITS)) {
    let differ = 0, overlapDiffer = 0, first = null;
    for (let age = 0; age < 261; age++) {
      const a = order(INITS.ascending, age, side, ac, bp), b = order(init, age, side, ac, bp);
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      differ++;
      const s = healBellAtAge(age, side, ac, bp), by = new Map(s.notes.map((n) => [n.slot, n]));
      const pos = (slot) => ({ x: by.get(slot).x + by.get(slot).x2, y: by.get(slot).y + by.get(slot).y2 });
      let ov = false;
      for (let i = 0; i < a.length && !ov; i++) for (let j = i + 1; j < a.length; j++) {
        if (a.indexOf(a[i]) < a.indexOf(a[j]) !== (b.indexOf(a[i]) < b.indexOf(a[j])) && Math.abs(pos(a[i]).x - pos(a[j]).x) < 16 && Math.abs(pos(a[i]).y - pos(a[j]).y) < 16) { ov = true; break; }
      }
      if (ov) { overlapDiffer++; first ??= { age, ascending: a, other: b }; }
    }
    res.push({ side, init: name, order: init, agesOrderDiffers: differ, agesDifferenceInvolvesOverlap: overlapDiffer, first });
  }
}
console.log(JSON.stringify(res, null, 1));
