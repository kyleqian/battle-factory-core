// prep5: pins production-derived config values (liveBattlerAnchors + createBattleCommandFieldArtView .coords) against the accepted
// configs of HEAL_BELL, MIST_BALL, AROMATHERAPY, PERISH_SONG, DRAGON_RAGE, FOLLOW_ME, TAUNT, METRONOME, LEAF_BLADE, BELLY_DRUM, both orientations.
//   node --experimental-strip-types tools/integration/prep5Pins.mjs > tools/integration/fixtures/prep5-pins.json   (run from workspace root)
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { derive } from "./prep4Production.mjs";
const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const out = [];
const pt = (p) => `${p.x},${p.y}`;
function pin(move, orientation, field, accepted, derived, note) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted);
  const d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  out.push({ move, orientation, field, accepted: a, derived: d, match: a === d, ...(note ? { note } : {}) });
}
const sideOf = (o) => (o === "player-back" ? "player" : "opponent");
const O = ["player-back", "opponent-front"];

function geo(move, o, cfg, att, tgt) {
  const dv = derive(att, sideOf(o), tgt);
  for (const [role, c] of [["attacker", cfg.attacker], ["target", cfg.target]]) {
    const d = dv[role], g = c.geometry;
    pin(move, o, `${role}.geometry.spriteCorner`, pt(g.spriteCorner), pt({ x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 }));
    pin(move, o, `${role}.geometry.animationCenter`, pt(g.animationCenter), pt(d.picOffsetPoint));
    pin(move, o, `${role}.geometry.battlePositionCenter`, pt(g.battlePositionCenter), pt(d.battlePositionCenter));
  }
  return dv;
}
const fx = (name) => rd(`tools/compare/fixtures/${name}.json`);
const fxName = (m, a, t, o) => (o === "player-back" ? `${m}-player-${a}-opponent-${t}` : `${m}-opponent-${a}-player-${t}`);

// plain geometry-only moves: AROMATHERAPY Vileplume>Onix, MIST_BALL Latias>Registeel, PERISH_SONG Murkrow>Onix, DRAGON_RAGE Charmeleon>Onix
for (const [move, m, a, t, A, T] of [["AROMATHERAPY", "aromatherapy", "vileplume", "onix", "VILEPLUME", "ONIX"], ["MIST_BALL", "mist-ball", "latias", "registeel", "LATIAS", "REGISTEEL"],
  ["PERISH_SONG", "perish-song", "murkrow", "onix", "MURKROW", "ONIX"], ["DRAGON_RAGE", "dragon-rage", "charmeleon", "onix", "CHARMELEON", "ONIX"]]) {
  for (const o of O) { const f = fx(fxName(m, a, t, o)); geo(move, o, f, A, T); }
}
// HEAL_BELL: configs are literals in tools/compare/healBellFramebuffer.ts:20-52 (not exported)
const HB = { "player-back": { a: [[40, 55], [72, 95], [72, 80], "player"], t: [[144, 10], [176, 42], [176, 40], "opponent"] }, "opponent-front": { a: [[144, 2], [176, 34], [176, 40], "opponent"], t: [[40, 53], [72, 93], [72, 80], "player"] } };
for (const o of O) {
  const mk = ([c, ac, bp, side]) => ({ geometry: { side, spriteCorner: { x: c[0], y: c[1] }, animationCenter: { x: ac[0], y: ac[1] }, battlePositionCenter: { x: bp[0], y: bp[1] } } });
  geo("HEAL_BELL", o, { attacker: mk(HB[o].a.concat()), target: mk(HB[o].t.concat()) }, "CHIMECHO", "ONIX");
}
// FOLLOW_ME Togetic>Onix: attackerTop = (battlePositionCenter.x, max(10, pic.y - height/2))   (battle_anim_effects_1.c:5556-5559, AnimThoughtBubble-style GetBattlerSpriteCoordAttr TOP)
for (const o of O) {
  const f = fx(fxName("follow-me", "togetic", "onix", o)); const dv = geo("FOLLOW_ME", o, f, "TOGETIC", "ONIX"); const a = dv.attacker;
  pin("FOLLOW_ME", o, "attackerTop", pt(f.attackerTop), pt({ x: a.battlePositionCenter.x, y: Math.max(10, a.picOffsetPoint.y - a.coords.height / 2) }), `coords h=${a.coords.height}`);
}
// TAUNT Murkrow>Shuckle, METRONOME Chansey>Onix: attackerHead = SetSpriteNextToMonHead (battle_anim_effects_1.c:5480-5488)
const head = (a) => ({ x: a.side === "player" ? a.picOffsetPoint.x + a.coords.width / 2 + 8 : a.picOffsetPoint.x - a.coords.width / 2 - 8, y: a.picOffsetPoint.y - Math.trunc(a.coords.height / 4) });
for (const [move, m, a, t, A, T] of [["TAUNT", "taunt", "murkrow", "shuckle", "MURKROW", "SHUCKLE"], ["METRONOME", "metronome", "chansey", "onix", "CHANSEY", "ONIX"]]) {
  for (const o of O) {
    const f = fx(fxName(m, a, t, o)); const dv = geo(move, o, f, A, T);
    pin(move, o, "attackerHead", pt(f.attackerHead), pt(head(dv.attacker)), `coords w=${dv.attacker.coords.width} h=${dv.attacker.coords.height}`);
  }
}
// LEAF_BLADE Sceptile>Onix: targetProfile = {pictureOffset: target pic, width, height, subpriority 30/40}
for (const o of O) {
  const f = fx(fxName("leaf-blade", "sceptile", "onix", o)); const dv = geo("LEAF_BLADE", o, f, "SCEPTILE", "ONIX"); const t = dv.target;
  pin("LEAF_BLADE", o, "targetProfile", JSON.stringify(f.targetProfile), JSON.stringify({ pictureOffset: t.picOffsetPoint, width: t.coords.width, height: t.coords.height, subpriority: t.subpriority }));
}
// BELLY_DRUM Poliwrath>Onix: dense rows give spriteCorner; attackerNoteOrigin = attacker pic + (0,8) (tools/compare/bellyDrumFramebuffer.ts:105-139)
{
  const ev = rd("tools/compare/fixtures/belly-drum-evidence.json");
  for (const o of O) {
    const rows = JSON.parse(gunzipSync(readFileSync(ev.orientations[o].denseState)).toString()).frames, first = rows[0];
    const pl = o === "player-back"; const ids = first.animationBattlers.spriteIds;
    const spr = (slot) => first.sprites.find((s) => s.slot === slot);
    const as = spr(ids[pl ? 0 : 1]), ts = spr(ids[pl ? 1 : 0]);
    const lit = pl ? { x: 72, y: 107 } : { x: 176, y: 56 };
    const cfg = { attacker: { geometry: { side: pl ? "player" : "opponent", spriteCorner: { x: as.x - 32, y: as.y - 32 }, animationCenter: lit, battlePositionCenter: pl ? { x: 72, y: 80 } : { x: 176, y: 40 } } },
      target: { geometry: { side: pl ? "opponent" : "player", spriteCorner: { x: ts.x - 32, y: ts.y - 32 }, animationCenter: pl ? { x: 176, y: 42 } : { x: 72, y: 80 }, battlePositionCenter: pl ? { x: 176, y: 40 } : { x: 72, y: 80 } } } };
    const dv = geo("BELLY_DRUM", o, cfg, "POLIWRATH", "ONIX");
    pin("BELLY_DRUM", o, "attackerNoteOrigin", pt(lit), pt({ x: dv.attacker.picOffsetPoint.x, y: dv.attacker.picOffsetPoint.y + 8 }), "attacker pic + (0,8)");
    out.push({ move: "BELLY_DRUM", orientation: o, field: "fieldProfile (dense frame 0 displayed HP; genders male/male literal)", accepted: JSON.stringify({ player: first.battlers.player.hp + "/" + first.battlers.player.maxHp, opponent: first.battlers.opponent.hp + "/" + first.battlers.opponent.maxHp }), derived: "-", match: true });
  }
}
console.log(JSON.stringify(out, null, 1));
