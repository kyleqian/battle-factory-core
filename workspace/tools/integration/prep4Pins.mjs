// Pins production-derived config values against the accepted configs (S1: Ember, Dragon Breath, Defense Curl, Ingrain,
// Mean Look, Smelling Salt) for both orientations. Run from workspace root:
//   node --experimental-strip-types tools/integration/prep4Pins.mjs > tools/integration/fixtures/prep4-pins.json
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { derive } from "./prep4Production.mjs";
import { defenseCurlConfigFor } from "../compare/defenseCurlFramebuffer.ts";
import { ingrainConfigFor } from "../compare/ingrainFramebuffer.ts";
import { meanLookConfigFor } from "../compare/meanLookFramebuffer.ts";
import { smellingSaltConfigFor } from "../compare/smellingSaltFramebuffer.ts";

const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
const rows = (ev, o) => JSON.parse(gunzipSync(readFileSync(ev.orientations[o].denseState)).toString()).frames;
const pt = (p) => `${p.x},${p.y}`;
const out = [];
function pin(move, orient, field, accepted, derived) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted);
  const d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  out.push({ move, orientation: orient, field, accepted: a, derived: d, match: a === d });
}
const O = ["player-back", "opponent-front"];
const side = (o) => (o === "player-back" ? "player" : "opponent");

// geometry pins common to every move: accepted attacker/target geometry vs liveBattlerAnchors
function geo(move, orient, cfg, att, tgt) {
  const dv = derive(att, side(orient), tgt);
  // IMPORTANT: INGRAIN[LILEEP] rows exist only to show the scenario's mechanic-stage override is NOT the accepted visual species.
  for (const [role, c] of [["attacker", cfg.attacker], ["target", cfg.target]]) {
    const d = dv[role], g = c.geometry;
    pin(move, orient, `${role}.geometry.spriteCorner`, pt(g.spriteCorner), pt({ x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 }));
    pin(move, orient, `${role}.geometry.animationCenter`, pt(g.animationCenter), pt(d.picOffsetPoint));
    pin(move, orient, `${role}.geometry.battlePositionCenter`, pt(g.battlePositionCenter), pt(d.battlePositionCenter));
  }
  return dv;
}

// EMBER / DRAGON_BREATH: compare fixtures
for (const [move, file] of [["EMBER", "ember"], ["DRAGON_BREATH", "dragon-breath"]]) {
  for (const o of O) {
    const s = side(o);
    const fx = rd(`tools/compare/fixtures/${file}-${s === "player" ? "player-onix-opponent-murkrow" : "opponent-onix-player-murkrow"}.json`);
    const dv = geo(move, o, fx, "ONIX", "MURKROW");
    const ap = fx.animationProfile;
    pin(move, o, "animationProfile.attackerCenter", pt(ap.attackerCenter), pt(dv.attacker.picOffsetPoint));
    pin(move, o, "animationProfile.targetCenter", pt(ap.targetCenter), pt(dv.target.picOffsetPoint));
    if (move === "EMBER") pin(move, o, "animationProfile.targetBattlePosition", pt(ap.targetBattlePosition), pt(dv.target.battlePositionCenter));
    pin(move, o, "animationProfile.attackerSide", ap.attackerSide, s);
    pin(move, o, "animationProfile.targetSubpriority", ap.targetSubpriority, dv.target.subpriority);
    if (move === "DRAGON_BREATH") for (const [k, v] of [["duration", 20], ["subpriorityOffset", 2], ["spawnCount", 11], ["spawnInterval", 4]]) pin(move, o, `animationProfile.${k} (script constant)`, ap[k], v);
  }
}
// DEFENSE_CURL
{
  const ev = rd("tools/compare/fixtures/defense-curl-evidence.json");
  for (const o of O) {
    const cfg = defenseCurlConfigFor(o, rows(ev, o));
    const dv = geo("DEFENSE_CURL", o, cfg, "PHANPY", "ONIX");
    pin("DEFENSE_CURL", o, "animationProfile.attackerPicYOffset", cfg.animationProfile.attackerPicYOffset, dv.attacker.coords.yOffset);
    pin("DEFENSE_CURL", o, "animationProfile.attackerSubpriority", cfg.animationProfile.attackerSubpriority, dv.attacker.subpriority);
    for (const k of ["playerHp", "playerMaxHp", "opponentHp", "opponentMaxHp", "playerGender", "opponentGender"]) pin("DEFENSE_CURL", o, `fieldProfile.${k} (accepted, for fixture)`, cfg.fieldProfile[k], cfg.fieldProfile[k]);
  }
}
// INGRAIN (accepted visual attacker species is CACTURNE, see doc)
{
  for (const o of O) {
    const cfg = ingrainConfigFor(o, (await import("../compare/ingrainFramebuffer.ts")).ingrainRowsFor(o));
    for (const att of ["CACTURNE", "LILEEP"]) {
      const dv = geo(`INGRAIN[${att}]`, o, cfg, att, "ONIX");
      pin(`INGRAIN[${att}]`, o, "animationProfile.attackerSubpriority", cfg.animationProfile.attackerSubpriority, dv.attacker.subpriority);
    }
    out.push({ move: "INGRAIN", orientation: o, field: "fieldProfile (accepted)", accepted: JSON.stringify(cfg.fieldProfile), derived: "-", match: true });
  }
}
// MEAN_LOOK
{
  const ev = rd("tools/compare/fixtures/mean-look-evidence.json");
  for (const o of O) {
    const cfg = meanLookConfigFor(o, rows(ev, o));
    const dv = geo("MEAN_LOOK", o, cfg, "MURKROW", "ONIX");
    pin("MEAN_LOOK", o, "animationProfile.targetSubpriority (=ATTACKER subpriority per builder)", cfg.animationProfile.targetSubpriority, dv.attacker.subpriority);
    out.push({ move: "MEAN_LOOK", orientation: o, field: "fieldProfile (accepted)", accepted: JSON.stringify(cfg.fieldProfile), derived: "-", match: true });
  }
}
// SMELLING_SALT
{
  const ev = rd("tools/compare/fixtures/smelling-salt-evidence.json");
  for (const o of O) {
    const cfg = smellingSaltConfigFor(o, rows(ev, o));
    const dv = geo("SMELLING_SALT", o, cfg, "GRANBULL", "ONIX");
    const t = dv.target, a = cfg.animationProfile;
    pin("SMELLING_SALT", o, "animationProfile.targetLeft", a.targetLeft, t.picOffsetPoint.x - t.coords.width / 2);
    pin("SMELLING_SALT", o, "animationProfile.targetRight", a.targetRight, t.picOffsetPoint.x + t.coords.width / 2);
    pin("SMELLING_SALT", o, "animationProfile.targetTop", a.targetTop, t.picOffsetPoint.y - t.coords.height / 2);
    pin("SMELLING_SALT", o, "animationProfile.targetPictureY", a.targetPictureY, t.picOffsetPoint.y);
    pin("SMELLING_SALT", o, "animationProfile.targetVerticalSpan", a.targetVerticalSpan, t.pictureHeight);
    out.push({ move: "SMELLING_SALT", orientation: o, field: "fieldProfile (accepted)", accepted: JSON.stringify(cfg.fieldProfile), derived: "-", match: true });
  }
}
// S2: BIND (Onix <-> Murkrow) / WRAP (Tentacool <-> Onix): configs are script literals + geometry; compare fixtures
for (const [move, file, att, tgt] of [["BIND", "bind", "ONIX", "MURKROW"], ["WRAP", "wrap", "TENTACOOL", "ONIX"]]) {
  for (const o of O) {
    const s = side(o);
    const fx = rd(`tools/compare/fixtures/${file}-${s === "player" ? `player-${att.toLowerCase()}-opponent-${tgt.toLowerCase()}` : `opponent-${att.toLowerCase()}-player-${tgt.toLowerCase()}`}.json`);
    geo(move, o, fx, att, tgt);
    out.push({ move, orientation: o, field: "fieldProfile (accepted)", accepted: JSON.stringify(fx.fieldProfile), derived: "-", match: true });
  }
}
// Consumption audit of the geometry fields whose accepted value is NOT the live pic-point convention (cites in docs/h-buffer-s1-prep.md).
const NOTE = {
  "DEFENSE_CURL attacker.geometry.animationCenter": ["CONSUMED", "orb origin: Move_DEFENSE_CURL argv (0,6,0,1) -> AnimSpriteOnMonPos respectMonPicOffsets=FALSE (battle_anim_mons.c:1515-1528) = attacker battlePositionCenter + (0,6): (72,86)/(176,46)"],
  "DEFENSE_CURL target.geometry.animationCenter": ["UNCONSUMED", "sceneOnDefenseCurlView passes only attacker.animationCenter (sceneOnPresentation.ts:10267-10282); builder wrote the orb origin into the target too"],
  "INGRAIN attacker.geometry.animationCenter": ["UNCONSUMED", "sceneOnIngrainView reads attacker.battlePositionCenter only (sceneOnPresentation.ts:10285-10300)"],
  "INGRAIN target.geometry.animationCenter": ["UNCONSUMED", "same"],
  "MEAN_LOOK attacker.geometry.animationCenter": ["UNCONSUMED", "sceneOnMeanLookView reads target.animationCenter only (sceneOnPresentation.ts:10303-10318); accepted target value equals derived pic point"],
  "WRAP attacker.geometry.animationCenter": ["UNCONSUMED", "sceneOnWrapView/wrapAnimationAtAge take no geometry (sceneOnPresentation.ts:6952); accepted value is the RAM sprite centre"],
  "WRAP target.geometry.animationCenter": ["UNCONSUMED", "same"],
  "SMELLING_SALT attacker.geometry.animationCenter": ["UNCONSUMED", "reducer reads targetVerticalSpan only (sceneOnPresentation.ts:7838-7850); renderer reads attacker.battlePositionCenter and target.animationCenter.x only"],
};
for (const r of out) {
  const key = `${r.move.replace(/\[.*\]/, "")} ${r.field}`;
  if (!r.match && r.move === "INGRAIN[LILEEP]") { r.resolved = true; r.note = "EXPECTED: the accepted visual species is CACTURNE (set-140 mechanic stage overrides party data to Lileep after the buffers exist, ingrainFramebuffer.ts:68-77); LILEEP rows only show the species is not interchangeable at the corner"; }
  if (!r.match && NOTE[key]) { r.note = NOTE[key][0] + ": " + NOTE[key][1]; r.resolved = NOTE[key][0] === "UNCONSUMED"; }
  if (!r.match && key === "DEFENSE_CURL attacker.geometry.animationCenter") {
    const dv = derive("PHANPY", r.orientation === "player-back" ? "player" : "opponent", "ONIX").attacker.battlePositionCenter;
    r.derivedByRule = `${dv.x},${dv.y + 6}`; r.resolved = r.derivedByRule === r.accepted;
  }
}
console.log(JSON.stringify(out, null, 1));
