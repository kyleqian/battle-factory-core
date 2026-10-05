// prep5 sprite-order dependence scan (same method as prep4TieScan.mjs, generalised): for every presentation age of the accepted window
// (and lags 0,1) collect every sprite-like entry of the move view (array fields + singular {x,y}/{centerX,centerY} objects), key = (subpriority ?? 0, y),
// and count equal-key pairs, and those whose cells overlap (|dx| < 16 = two 16x16 cells; < 32 = 32-wide cells). Only equal-key overlapping pairs consume
// the OAM index (SortSprites tie). Also records whether the view carries any spriteOrderSeed / hardwareTieSlotOrder-like field.
//   node --experimental-strip-types tools/integration/prep5TieScan.mjs > tools/integration/fixtures/prep5-tie-scan.json
import { MOVES, stageFor } from "./prep5Views.mjs";
const pos = (s) => (typeof s.centerX === "number" ? [s.centerX, s.centerY] : typeof s.x === "number" && typeof s.y === "number" ? [s.x, s.y] : null);
function sprites(v) {
  const out = [];
  for (const [k, x] of Object.entries(v)) {
    if (k === "attacker" || k === "target") continue;
    const list = Array.isArray(x) ? x : x && typeof x === "object" ? [x] : [];
    for (const s of list) if (s && typeof s === "object" && pos(s)) out.push({ field: k, s });
  }
  return out;
}
const res = [];
for (const [move, cfg, view, rows] of MOVES) {
  for (const o of ["player", "opponent"]) {
    const st = stageFor(cfg, o);
    let ties = 0, ov16 = 0, ov32 = 0, maxSprites = 0, orderFields = new Set(); const first = [];
    for (let age = 0; age < rows + 2; age++) for (const lag of [0, 1]) {
      const v = view({ ...st, age: age - lag < 0 ? 0 : age - lag });
      for (const k of Object.keys(v)) if (/spriteOrder|hardwareTie|creationOrder|spawnIndex/i.test(k)) orderFields.add(k);
      const sp = sprites(v); maxSprites = Math.max(maxSprites, sp.length);
      for (let i = 0; i < sp.length; i++) for (let j = i + 1; j < sp.length; j++) {
        const [ax, ay] = pos(sp[i].s), [bx, by] = pos(sp[j].s);
        if (ay !== by || (sp[i].s.subpriority ?? 0) !== (sp[j].s.subpriority ?? 0)) continue;
        ties++; const dx = Math.abs(ax - bx);
        if (dx < 16) ov16++;
        if (dx < 32) { ov32++; if (first.length < 3) first.push({ age: age - lag, a: [sp[i].field, ax, ay], b: [sp[j].field, bx, by] }); }
      }
    }
    res.push({ move, orientation: o, maxSprites, equalKeyPairs: ties, overlapping16: ov16, overlapping32: ov32, orderFieldsInView: [...orderFields], firstTies: first });
  }
}
console.log(JSON.stringify(res, null, 1));
