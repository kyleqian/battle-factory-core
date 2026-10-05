// Belly Drum: do the note back-to-front order differ for other initial sSpriteOrder permutations of [4,5,7,9,10]? (copy of
// bellyDrumNotesBackToFrontAtAge, src/animation/bellyDrum.ts:185-215, with the initial order a parameter).
//   node --experimental-strip-types tools/integration/prep5BellyDrumOrder.mjs > tools/integration/fixtures/prep5-belly-drum-order.json
import { bellyDrumNotesAtAge } from "../../src/animation/bellyDrum.ts";
import { createSpriteOrderState, createOrderedSprite, updateOrderedSprite, destroyOrderedSprite, sortSpriteOrder, spriteOwnersBackToFront } from "../../src/animation/spriteOrder.ts";
function owners(init, age, origin) {
  let order = createSpriteOrderState([4, 5, 7, 9, 10], init);
  for (let tick = 0; tick <= age; tick++) {
    const notes = bellyDrumNotesAtAge(tick, origin); const set = new Set(notes.map((n) => n.index));
    for (const o of order.occupants) if (!set.has(o.owner)) order = destroyOrderedSprite(order, o.owner);
    for (const n of notes) {
      const key = { priority: 2, subpriority: 0, oamY: n.y + n.y2 - 8, affineMode: "double", oamSize: 0, oamShape: "square" };
      order = order.occupants.some((o) => o.owner === n.index) ? updateOrderedSprite(order, n.index, key) : createOrderedSprite(order, n.index, key);
    }
    order = sortSpriteOrder(order);
  }
  const by = new Map(bellyDrumNotesAtAge(age, origin).map((n) => [n.index, n]));
  return spriteOwnersBackToFront(order).filter((o) => by.has(o));
}
const INITS = { ascending: [4, 5, 7, 9, 10], descending: [10, 9, 7, 5, 4], rotated: [7, 9, 10, 4, 5], interleaved: [5, 9, 4, 10, 7] };
const res = [];
for (const [side, origin] of [["player", { x: 72, y: 107 }], ["opponent", { x: 176, y: 56 }]]) for (const [name, init] of Object.entries(INITS)) {
  let differ = 0, overlap = 0, first = null;
  for (let age = 0; age < 112; age++) {
    const a = owners(INITS.ascending, age, origin), b = owners(init, age, origin);
    if (JSON.stringify(a) === JSON.stringify(b)) continue; differ++;
    const by = new Map(bellyDrumNotesAtAge(age, origin).map((n) => [n.index, n]));
    let ov = false;
    for (let i = 0; i < a.length && !ov; i++) for (let j = i + 1; j < a.length; j++) {
      const A = by.get(a[i]), B = by.get(a[j]);
      if ((a.indexOf(a[i]) < a.indexOf(a[j])) !== (b.indexOf(a[i]) < b.indexOf(a[j])) && Math.abs(A.x + A.x2 - B.x - B.x2) < 16 && Math.abs(A.y + A.y2 - B.y - B.y2) < 16) { ov = true; break; }
    }
    if (ov) { overlap++; first ??= { age, ascending: a, other: b }; }
  }
  res.push({ side, init: name, order: init, agesOrderDiffers: differ, agesDifferenceInvolvesOverlap: overlap, first });
}
console.log(JSON.stringify(res, null, 1));
