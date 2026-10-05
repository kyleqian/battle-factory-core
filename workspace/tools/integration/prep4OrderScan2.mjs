// Ingrain + Smelling Salt equal-key overlap scans (companion of prep4TieScan.mjs): only equal-subpriority sprite pairs whose cells overlap
// consume the OAM-index tie (SortSprites, sprite.c:372-460). node --experimental-strip-types tools/integration/prep4OrderScan2.mjs
import { ingrainAtAge } from "../../src/animation/ingrain.ts";
import { smellingSaltAtAge } from "../../src/animation/smellingSalt.ts";
const out = { ingrain: [], smellingSalt: [] };
for (const [name, bp, sub] of [["player", { x: 72, y: 80 }, 30], ["opponent", { x: 176, y: 40 }, 40]]) {
  let ties = 0, overlaps = 0;
  for (let a = 0; a <= 164; a++) for (let lag = 0; lag < 2; lag++) {
    const s = ingrainAtAge(a - lag, bp, { attackerSubpriority: sub });
    const objs = [...s.roots.filter((r) => !r.invisible).map((r) => ({ sub: r.subpriority, x: r.x + r.x2, y: r.y + r.y2, w: 32 })),
      ...s.orbs.map((o) => ({ sub: o.subpriority, x: o.x + o.x2, y: o.y + o.y2, w: 8 }))];
    for (let i = 0; i < objs.length; i++) for (let j = i + 1; j < objs.length; j++) {
      const A = objs[i], B = objs[j];
      if (A.sub !== B.sub) continue;
      ties++;
      if (Math.abs(A.x - B.x) < (A.w + B.w) / 2 && Math.abs(A.y - B.y) < (A.w + B.w) / 2) overlaps++;
    }
  }
  out.ingrain.push({ attackerSide: name, equalSubpriorityPairs: ties, overlappingPairs: overlaps });
}
for (const [L, R, orient] of [[148, 204, "opponent target Onix"], [44, 100, "player target Onix"]]) {
  let min = 1e9, minAge = -1, n = 0;
  for (let a = 0; a <= 125; a++) {
    const h = smellingSaltAtAge(a, 60).hands;
    if (h.length !== 2) continue;
    n++;
    const l = h.find((x) => x.side === "left"), r = h.find((x) => x.side === "right");
    const d = (R + 8 + r.x2) - (L - 8 + l.x2);
    if (d < min) { min = d; minAge = a; }
  }
  out.smellingSalt.push({ target: orient, rowsWithTwoHands: n, minCenterDistance: min, atAge: minAge, cellWidth: 32, overlap: min < 32 });
}
console.log(JSON.stringify(out, null, 1));
