// prep7: pins production-derived config values (liveBattlerAnchors + createBattleCommandFieldArtView .coords via prep4Production.mjs derive()) against the accepted configs
// (prep7Accepted.mjs) of the ten prep7 moves, both orientations.   node --experimental-strip-types tools/integration/prep7Pins.mjs > tools/integration/fixtures/prep7-pins.json
// Pin: { move, orientation, field, accepted, derived, match, consumed, resolved, note }. `consumed` = a reducer/renderer reads the field (CONSUMED below, cites in the doc);
// `resolved` = match OR the field is unread OR the note names the production rule that produces the accepted value.
import { derive } from "./prep4Production.mjs";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { liveSpriteSlotForOwner } from "../../src/engine/liveSpriteAllocator.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER } from "../../src/engine/spriteOrderProvider.ts";
import { acceptedConfig, O, sideOf, MOVE_ID, rd } from "./prep7Accepted.mjs";
const out = [];
const pt = (p) => `${p.x},${p.y}`;
const seeds = rd("tools/integration/fixtures/prep7-order-seed.json");
// Fields a reducer/renderer branch reads (battleScene.ts spans: FT 33728-33904, ST 34258-34392, DD 37136-37219, FB 47647-47758, QA 48633-48836, FD 48836-48979, IP 48979-49332, DT 49467-49565, RS 49565-49637, AA 50131-50342).
const CONSUMED = {
  AERIAL_ACE: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "target.geometry.battlePositionCenter"], // renderer :50179-50182,:50192,:50250 (reducer reads attacker side + age only)
  QUICK_ATTACK: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "target.geometry.animationCenter"], // renderer :48664,:48738-48741,:48749-48750
  FEATHER_DANCE: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "target.geometry.battlePositionCenter"], // reducer :12835 (target battlePositionCenter+side), renderer :48873,:48886,:48948
  ICE_PUNCH: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "target.geometry.animationCenter"], // reducer :12623 (target animationCenter), renderer :49039-49085,:49144-49194
  FAKE_TEARS: ["attacker.geometry.animationCenter", "target.geometry.spriteCorner"], // renderer :33803-33811,:33874 (reducer reads attackerPictureBounds + attacker side)
  SLEEP_TALK: ["attacker.geometry.animationCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :10123 (attacker animationCenter), renderer :34304-34318
  FIRE_BLAST: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :47692-47700; reducer reads animationProfile + attacker side
  DRAGON_DANCE: ["attacker.geometry.animationCenter", "attacker.geometry.battlePositionCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer, renderer :37161-37168
  DOUBLE_TEAM: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :49491-49525 (reducer reads animationProfile only)
  ROCK_SLIDE: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :49585-49594
};
function pin(move, o, field, accepted, derived, note, extra = {}) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted), d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  const consumed = extra.consumed ?? (CONSUMED[move] ?? []).includes(field), match = a === d;
  out.push({ move, orientation: o, field, accepted: a, derived: d, match, consumed, resolved: match || !consumed || extra.resolved === true, ...(note ? { note } : {}) });
}
const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
const battlerSlot = (s) => liveSpriteSlotForOwner(provider.firstMove, { kind: "battler", side: s });
for (const move of Object.keys(MOVE_ID)) for (const o of O) {
  const acc = acceptedConfig(move, o);
  if (!acc) { out.push({ move, orientation: o, field: "(no accepted evidence)", accepted: "-", derived: "-", match: null, consumed: false, resolved: true, note: "no accepted evidence for this attacker side; the adapter declines this orientation" }); continue; }
  const sd = sideOf(o), c = acc.config;
  const dv = derive(acc.species[0], sd, acc.species[1]);
  for (const role of ["attacker", "target"]) {
    const g = c[role].geometry, d = dv[role];
    const idleX2 = d.side === "opponent" ? d.frontIdleRest.x2 : 0, derivedCorner = { x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 };
    pin(move, o, `${role}.geometry.spriteCorner`, pt(g.spriteCorner), pt(derivedCorner));
    { const q = out[out.length - 1];
      if (!q.match && g.spriteCorner.x === derivedCorner.x + idleX2 && g.spriteCorner.y === derivedCorner.y) { q.resolved = true; q.note = `accepted corner includes the settled front idle OAM x2=${idleX2} (production frontIdleRest.x2=${idleX2}, liveBattlerAnchors): accepted = derived.x + frontIdleRest.x2`; }
      if (!q.match && move === "SLEEP_TALK" && role === "attacker" && g.spriteCorner.x === derivedCorner.x && g.spriteCorner.y === derivedCorner.y + 8) { q.resolved = true; q.note = "accepted corner is the unclipped logical-sheet y (+8); the renderer subtracts 8 for the player SEAKING draw (battleScene.ts:34304-34306 seakingSpriteY) so the drawn y equals the production corner 59 = hardware OAM y; under liveField that -8 must not be applied twice"; } }
    pin(move, o, `${role}.geometry.animationCenter`, pt(g.animationCenter), pt(d.picOffsetPoint));
    pin(move, o, `${role}.geometry.battlePositionCenter`, pt(g.battlePositionCenter), pt(d.battlePositionCenter));
  }
  const A = dv.attacker, T = dv.target;
  if (move === "FAKE_TEARS") {
    pin(move, o, "attacker.geometry.animationCenter == production sprite centre (affine rule)", pt(c.attacker.geometry.animationCenter), pt(A.spriteCenter), "accepted animationCenter is the OBJ centre (spriteCorner + 32), not the pic point (the player pic point adds +8): the live adapter must pass affineCenterBattler(attacker) (liveMoveAnimation.ts affineCenterBattler); renderer reads it at battleScene.ts:33810-33811", { consumed: true });
    const dd = out.find((q) => q.move === move && q.orientation === o && q.field === "attacker.geometry.animationCenter");
    if (dd && !dd.match && out[out.length - 1].match) { dd.resolved = true; dd.note = "accepted = sprite centre; affine-centre pin below matches"; }
  }
  if (move === "AERIAL_ACE" || move === "QUICK_ATTACK" || move === "FEATHER_DANCE") {
    pin(move, o, "controllerProfile/controllerPresentation/fieldProfile/moveTextStartAge (HUD+text only; body fn reads side + age only)", "accepted fixture", "not passed", "sceneOn*View body call reads attacker/target side (+ target battlePositionCenter for Feather Dance) and age+animationAgeOffset; every controllerProfile field feeds hitReaction/displayedTargetHp/resultText/currentMove/controllerDisplay HUD fields only (src/animation/sceneOnPresentation.ts:13039-13090, :12872-12900, :12835-12870)", { consumed: false });
    pin(move, o, "animationAgeOffset (accepted window-relative) -> live age basis at activation", c.animationAgeOffset, c.animationAgeOffset, `accepted preset offset ${c.animationAgeOffset}; reducer age at activation = ${acc.extras.presentationAgeAtWindowStart} + (activation - window start) + offset: see prep7-summary.json (liveAgeBasisAtActivation)`, { consumed: true, resolved: true });
  }
  if (move === "FAKE_TEARS") {
    const b = c.attackerPictureBounds, w = A.coords.width, h = A.coords.height, p = A.picOffsetPoint;
    pin(move, o, "attackerPictureBounds {left,right,top}", JSON.stringify(b), JSON.stringify({ left: p.x - w / 2, right: p.x + w / 2, top: p.y - h / 2 }), `GetBattlerSpriteCoordAttr LEFT/RIGHT/TOP = pic point -/+ width/2, pic point - height/2 (battle_anim_mons.c GetBattlerSpriteCoordAttr); production coords ${w}x${h}`, { consumed: true });
  }
  if (move === "FAKE_TEARS" || move === "SLEEP_TALK") {
    const dd = out.find((q) => q.move === move && q.orientation === o && q.field === "attacker.geometry.animationCenter");
    if (dd && !dd.match) dd.note = "accepted animationCenter vs production pic point; see doc for the per-move rule";
  }
  if (move === "ICE_PUNCH") {
    pin(move, o, "hpDrainProfile/controllerDisplayProfile (HUD only: displayedTargetHp, actionMenu, status ice cubes)", "accepted fixture", "not passed", "ordinary queue owns HP drain, result text, status and menu; iceCubes only draw when controllerDisplayProfile carries statusIceCubeTaskFirstAge/nextControllerIceCubeTaskFirstAge (absent => none)", { consumed: false });
  }
  if (move === "ROCK_SLIDE") {
    const lit = JSON.stringify(c.animationProfile.spriteOrderSeed), prov = JSON.stringify([...KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, ...seeds.providerKnownEntryFree]);
    pin(move, o, "animationProfile.spriteOrderSeed (64)", lit, prov, "provider call = spriteOrderWithOccupiedPrefix(state, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER) at the activation edge of the battle's first body; seed-independent in pixels (0/40 arbitrary seeds, prep7-sprites-analysis.json rs-*)", { consumed: true });
    pin(move, o, "animationProfile.occupiedSpriteSlots", JSON.stringify(c.animationProfile.occupiedSpriteSlots), JSON.stringify([...provider.firstMove.occupants.map((x) => x.slot)].sort((a, b) => a - b)), "known-entry occupants (battlers 6/8, healthboxes 0/1/63/61, shadow 2, bars 60/62)", { consumed: true });
  }
  if (move === "FIRE_BLAST") {
    pin(move, o, "animationProfile.attackerPictureCenter", c.animationProfile.attackerPictureCenter, A.picOffsetPoint, "", { consumed: true });
    pin(move, o, "animationProfile.targetPictureCenter", c.animationProfile.targetPictureCenter, T.picOffsetPoint, "", { consumed: true });
    pin(move, o, "animationProfile.targetSpriteSlot", c.animationProfile.targetSpriteSlot, battlerSlot(T.side), "known-entry allocator battler slot of the target side", { consumed: true });
  }
  if (move === "DRAGON_DANCE") {
    pin(move, o, "animationProfile.pictureSize -> orb radius max(w,h)>>1", Math.max(c.animationProfile.pictureSize.width, c.animationProfile.pictureSize.height) >> 1, Math.max(A.coords.width, A.coords.height) >> 1, `accepted literal 64x64 vs production coords ${A.coords.width}x${A.coords.height}; only max(w,h)>>1 is read (dragonDance.ts:160)`, { consumed: true });
  }
}
console.log(JSON.stringify(out, null, 1));
