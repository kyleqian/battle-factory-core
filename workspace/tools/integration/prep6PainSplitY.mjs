// prep6: PAIN_SPLIT battler y2 per phase from SetBattlerSpriteYOffsetFromYScale (battle_anim_mons.c:1873-1882; d = 320/283/283 from battle_anim_effects_3.c:2992-3003)
// evaluated with production coords.yOffset for the accepted species and other plausible carriers/targets, vs the reducer's hard-coded constants (painSplit.ts:76-90).
//   node --experimental-strip-types tools/integration/prep6PainSplitY.mjs > tools/integration/fixtures/prep6-pain-split-yoffset.json
import { derive } from "./prep4Production.mjs";
const y2 = (yd, d) => { const v = 64 - 2 * yd; let v2 = Math.trunc((v << 8) / d); if (v2 > 128) v2 = 128; return Math.trunc((v - v2) / 2); };
const reducer = (sp, side) => [sp === "MISDREAVUS" ? 4 : sp === "GENGAR" ? 5 : null, side === "opponent" && sp === "GENGAR" ? 3 : 2, side === "opponent" && sp === "GENGAR" ? 3 : 2];
const rows = [];
for (const [att, tgt] of [["MISDREAVUS", "GENGAR"], ["MISDREAVUS", "ONIX"], ["MISDREAVUS", "ABSOL"], ["MISDREAVUS", "DELCATTY"], ["DUSCLOPS", "GENGAR"], ["MISDREAVUS", "SHUCKLE"]]) for (const aSide of ["player", "opponent"]) {
  const dv = derive(att, aSide, tgt);
  for (const [role, sp] of [["attacker", att], ["target", tgt]]) {
    const b = dv[role]; rows.push({ pair: `${att}>${tgt}`, attackerSide: aSide, role, species: sp, side: b.side, yOffset: b.coords.yOffset, derivedY2Phases: [y2(b.coords.yOffset, 320), y2(b.coords.yOffset, 283), y2(b.coords.yOffset, 283)], reducerConstants: reducer(sp, b.side), reducerHasSpecies: sp === "MISDREAVUS" || sp === "GENGAR" });
  }
}
for (const r of rows) r.equal = r.reducerHasSpecies && JSON.stringify(r.derivedY2Phases) === JSON.stringify(r.reducerConstants);
console.log(JSON.stringify(rows, null, 1));
