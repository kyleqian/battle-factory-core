// Production-derived anchors/coords for the prep4 species pairs (S1+S2). node --experimental-strip-types tools/integration/prep4Production.mjs
import { readFileSync } from "node:fs";
import { liveBattlerAnchors } from "../../src/engine/liveMoveAnimation.ts";
import { createBattleCommandFieldArtView } from "../../src/engine/battleCommandFieldArt.ts";
const stats = JSON.parse(readFileSync(new URL("../../src/data/gen/species-stats.json", import.meta.url)));
const id = (s) => stats.species.find((x) => x.name === `SPECIES_${s}`).id;
const mon = (s, side) => ({ species: id(s), name: s, side, hp: 100, maxHP: 100, gender: "male", status: "none", level: 50 });
export function derive(attacker, aSide, target) {
  const tSide = aSide === "player" ? "opponent" : "player";
  const field = { [aSide]: mon(attacker, aSide), [tSide]: mon(target, tSide) };
  const art = createBattleCommandFieldArtView(field);
  const out = {};
  for (const [role, side] of [["attacker", aSide], ["target", tSide]]) {
    const a = liveBattlerAnchors(side, art);
    out[role] = { side, species: art[side].speciesSymbol, ...a, coords: art[side].coords, subpriority: side === "player" ? 30 : 40 };
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith("prep4Production.mjs")) {
  const pairs = [["ONIX","MURKROW"],["PHANPY","ONIX"],["LILEEP","ONIX"],["MURKROW","ONIX"],["GRANBULL","ONIX"],["TENTACOOL","ONIX"],["ONIX","TENTACOOL"]];
  const res = [];
  for (const [a, t] of pairs) for (const s of ["player", "opponent"]) res.push({ pair: a + ">" + t, aSide: s, ...derive(a, s, t) });
  console.log(JSON.stringify(res, null, 1));
}
