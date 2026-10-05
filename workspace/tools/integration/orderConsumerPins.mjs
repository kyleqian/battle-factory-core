// Order-consumer prep pins: accepted config literals vs production-derived (liveBattlerAnchors + createBattleCommandFieldArtView coords via prep4Production.derive),
// both orientations, for the 14 target moves. Geometry literals come from tools/compare/fixtures/*.json (attacker/target.geometry, animationProfile centers/subpriorities),
// from the dense RAM rows of tools/compare/evidence/* (Grudge/Dive/Magnitude: battlerSprites at row 0), or from the healBellFramebuffer.ts:20-52 literals.
//   node --experimental-strip-types tools/integration/orderConsumerPins.mjs > tools/integration/fixtures/order-consumer-pins.json   (from workspace/)
import { readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { derive } from "./prep4Production.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const CF = (n) => `tools/compare/fixtures/${n}.json`;
const out = [];
const pt = (p) => (p ? `${p.x},${p.y}` : "-");
function pin(move, orientation, field, accepted, derived, note) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted), d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  out.push({ move, orientation, field, accepted: a, derived: d, match: a === d, ...(note ? { note } : {}) });
}
const sideOf = (o) => (o === "player-back" ? "player" : "opponent");
function geo(move, o, cfg, A, T) {
  const dv = derive(A, sideOf(o), T);
  for (const role of ["attacker", "target"]) {
    const c = cfg[role]?.geometry; if (!c) continue; const d = dv[role];
    pin(move, o, `${role}.spriteCorner`, pt(c.spriteCorner), pt({ x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 }));
    pin(move, o, `${role}.animationCenter`, pt(c.animationCenter), pt(d.picOffsetPoint));
    pin(move, o, `${role}.battlePositionCenter`, pt(c.battlePositionCenter), pt(d.battlePositionCenter));
  }
  return dv;
}
function profileCenters(move, o, p, dv) {
  if (!p) return;
  if (p.attackerCenter) pin(move, o, "animationProfile.attackerCenter", pt(p.attackerCenter), pt(dv.attacker.picOffsetPoint));
  if (p.targetCenter) pin(move, o, "animationProfile.targetCenter", pt(p.targetCenter), pt(dv.target.picOffsetPoint));
  if (p.targetBattlePosition) pin(move, o, "animationProfile.targetBattlePosition", pt(p.targetBattlePosition), pt(dv.target.battlePositionCenter));
  for (const k of ["targetSubpriority", "attackerSubpriority"]) if (typeof p[k] === "number") pin(move, o, `animationProfile.${k}`, p[k], dv[k === "targetSubpriority" ? "target" : "attacker"].subpriority, "base battler subpriority (30 player / 40 opponent); createsprite offset is applied by the reducer");
  if (typeof p.flameSubpriority === "number") pin(move, o, "animationProfile.flameSubpriority", p.flameSubpriority, dv.target.subpriority, "informational: accepted value is the sprite subpriority after the script offset; target base shown");
}
const NAME = (m, a, t, o) => (o === "player-back" ? `${m}-player-${a}-opponent-${t}` : `${m}-opponent-${a}-player-${t}`);
const O = ["player-back", "opponent-front"];
// two-orientation compare fixtures with attacker/target geometry
for (const [move, m, a, t, A, T] of [["FLAMETHROWER", "flamethrower", "onix", "murkrow", "ONIX", "MURKROW"], ["BLAZE_KICK", "blaze-kick", "onix", "murkrow", "ONIX", "MURKROW"], ["EMBER", "ember", "onix", "murkrow", "ONIX", "MURKROW"],
  ["ROCK_THROW", "rock-throw", "graveler", "onix", "GRAVELER", "ONIX"], ["DRAGON_RAGE", "dragon-rage", "charmeleon", "onix", "CHARMELEON", "ONIX"], ["PERISH_SONG", "perish-song", "murkrow", "onix", "MURKROW", "ONIX"],
  ["LEAF_BLADE", "leaf-blade", "sceptile", "onix", "SCEPTILE", "ONIX"]]) {
  for (const o of O) {
    const nm = move === "DRAGON_RAGE" ? (o === "player-back" ? "dragon-rage-player-charmeleon-opponent-onix" : "dragon-rage-opponent-charmeleon-player-onix") : NAME(m, a, t, o);
    const f = rd(CF(nm)); const dv = geo(move, o, f, A, T); profileCenters(move, o, f.animationProfile, dv);
    if (move === "LEAF_BLADE") { const t2 = dv.target; pin(move, o, "targetProfile", JSON.stringify(f.targetProfile), JSON.stringify({ pictureOffset: t2.picOffsetPoint, width: t2.coords.width, height: t2.coords.height, subpriority: t2.subpriority })); }
  }
}
// HEAL_BELL literals (tools/compare/healBellFramebuffer.ts:20-52)
const HB = { "player-back": { a: [[40, 55], [72, 95], [72, 80], "player"], t: [[144, 10], [176, 42], [176, 40], "opponent"] }, "opponent-front": { a: [[144, 2], [176, 34], [176, 40], "opponent"], t: [[40, 53], [72, 93], [72, 80], "player"] } };
for (const o of O) {
  const mk = ([c, ac, bp, side]) => ({ geometry: { side, spriteCorner: { x: c[0], y: c[1] }, animationCenter: { x: ac[0], y: ac[1] }, battlePositionCenter: { x: bp[0], y: bp[1] } } });
  geo("HEAL_BELL", o, { attacker: mk(HB[o].a), target: mk(HB[o].t) }, "CHIMECHO", "ONIX");
}
// MUD_SLAP / SAND_ATTACK: no attacker/target geometry in the accepted fixtures (animationProfile only) -> derived values recorded, accepted '-'
for (const [move, nm, o, A, T] of [["MUD_SLAP", "mud-slap-player-pidgeotto-onix", "player-back", "PIDGEOTTO", "ONIX"], ["MUD_SLAP", "mud-slap-pidgeotto-onix", "opponent-front", "PIDGEOTTO", "ONIX"],
  ["SAND_ATTACK", "sand-attack-player-pidgeotto-onix", "player-back", "PIDGEOTTO", "ONIX"], ["SAND_ATTACK", "sand-attack-pidgeotto-onix", "opponent-front", "PIDGEOTTO", "ONIX"]]) {
  const dv = derive(A, sideOf(o), T); const f = rd(CF(nm));
  for (const role of ["attacker", "target"]) {
    const d = dv[role];
    out.push({ move, orientation: o, field: `${role} derived (no accepted literal; fixture carries slots/steps only)`, accepted: "-", derived: JSON.stringify({ spriteCorner: pt({ x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 }), animationCenter: pt(d.picOffsetPoint), battlePositionCenter: pt(d.battlePositionCenter), subpriority: d.subpriority }), match: null });
  }
  out.push({ move, orientation: o, field: "fixture keys other than order", accepted: Object.keys(f.animationProfile).filter((k) => k !== "spriteOrderSeed").join(","), derived: "-", match: null });
}
// ROCK_SLIDE: opponent-front Grovyle -> player-back Onix (one orientation accepted)
{ const f = rd(CF("rock-slide-grovyle-onix")); geo("ROCK_SLIDE", "opponent-front", f.geometry && { attacker: { geometry: f.geometry.attacker }, target: { geometry: f.geometry.target } }, "GROVYLE", "ONIX");
  const dv = derive("GROVYLE", "player", "ONIX"); out.push({ move: "ROCK_SLIDE", orientation: "player-back", field: "derived only (no accepted player-back fixture)", accepted: "-", derived: JSON.stringify({ attacker: pt(dv.attacker.picOffsetPoint), target: pt(dv.target.picOffsetPoint) }), match: null }); }
// GRUDGE / DIVE / MAGNITUDE: dense rows[0].battlerSprites (RAM sprite centres) vs derived spriteCenter
const dense = (p) => JSON.parse(gunzipSync(readFileSync(p)).toString()).frames;
const ev = (f) => rd(CF(f));
for (const [move, file, A, T] of [["GRUDGE", "grudge-evidence", "HAUNTER", "ONIX"], ["DIVE", "dive-evidence", "CHINCHOU", "ONIX"]]) {
  const e = ev(file).orientations;
  for (const o of O) {
    const first = dense(e[o].denseState)[0], dv = derive(A, sideOf(o), T);
    for (const role of ["attacker", "target"]) {
      const b = first.battlerSprites[role], d = move === "GRUDGE" && role === "target" ? dv.attacker : dv[role]; // Grudge's animation target is the user (MOVE_TARGET_USER)
      pin(move, o, `${role}.spriteCenter (dense row0 battlerSprites)`, `${b.x},${b.y}`, pt(d.spriteCenter), move === "GRUDGE" && role === "target" ? "anim target = user, compared to the derived attacker" : undefined);
      pin(move, o, `${role}.subpriority (dense row0)`, b.subpriority, d.subpriority);
    }
  }
}
{
  const e = ev("magnitude-dense-evidence").bodies;
  for (const b of e) {
    const stats = JSON.parse(readFileSync("src/data/gen/species-stats.json", "utf8")), nm = (id) => stats.species.find((x) => x.id === id).name.replace("SPECIES_", "");
    const ov = rd(b.scenario).overrides.parties, o = b.orientation, aSide = sideOf(o), tSide = aSide === "player" ? "opponent" : "player";
    const A = nm(ov[aSide][0].species), T = nm(ov[tSide][0].species), first = dense(b.denseState)[0], dv = derive(A, aSide, T);
    for (const role of ["attacker", "target"]) { const s = first.battlerSprites[role]; pin("MAGNITUDE", o + "/" + b.branch, `${role}.spriteCenter (dense row0) ${A}>${T}`, `${s.x},${s.y}`, pt(dv[role].spriteCenter)); pin("MAGNITUDE", o + "/" + b.branch, `${role}.subpriority (dense row0)`, s.subpriority, dv[role].subpriority); }
  }
}
console.log(JSON.stringify(out, null, 1));
