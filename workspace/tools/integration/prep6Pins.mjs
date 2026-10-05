// prep6: pins production-derived config values (liveBattlerAnchors + createBattleCommandFieldArtView .coords, via prep4Production.mjs derive())
// against the accepted configs (prep6Accepted.mjs) of the eleven prep6 moves, both orientations.
//   node --experimental-strip-types tools/integration/prep6Pins.mjs > tools/integration/fixtures/prep6-pins.json   (run from workspace root)
// Each pin: { move, orientation, field, accepted, derived, match, consumed, resolved, note }.  `consumed` = a reducer/renderer reads that field
// (reducer sceneOn*View in src/animation/sceneOnPresentation.ts, renderer branch in src/engine/battleScene.ts; see CONSUMED below).
// `resolved` = match OR the difference is on an unread field OR the note names the production rule that produces the accepted value.
import { derive } from "./prep4Production.mjs";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { liveSpriteSlotForOwner } from "../../src/engine/liveSpriteAllocator.ts";
import { readFileSync } from "node:fs";
import { acceptedConfig, O, sideOf, rd } from "./prep6Accepted.mjs";
const routeProbe = rd("tools/integration/fixtures/prep6-route-probe.json");
const sdMeasured = routeProbe.find((r) => r.move === "SELF_DESTRUCT" && r.kind === "accepted-species").requests[0].field; // route 56/14/0, attacker 0 (player)
const receipt = (n) => rd(`tools/integration/fixtures/prep6-activation/${n}.json`).intervals.find((i) => i.move === 282);

const pt = (p) => `${p.x},${p.y}`;
const out = [];
// fields read per move (A = attacker, T = target). battleScene.ts line spans: SD 39635-39759, DT 49446-49543, FA 49719-49828, RT 19376-19511,
// PS 44895-45016, DD 37125-37207, SG 15965-16087, SS 16712-16823, FB 47636-47746, SW 21695-21851, KO 30112-30255.
const CONSUMED = {
  SELF_DESTRUCT: ["attacker.geometry.battlePositionCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :10808 + renderer :39692-39702
  DOUBLE_TEAM: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :49470-49504 (reducer reads animationProfile only)
  FAINT_ATTACK: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "target.geometry.animationCenter"], // renderer :49751-49756, hitsplat :49782-49783
  ROCK_TOMB: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :19416-19429; reducer reads targetSpriteSlot/targetInitialX2/effectCenter
  PAIN_SPLIT: ["attacker.geometry.animationCenter", "target.geometry.animationCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :7190, renderer :44951-44959
  DRAGON_DANCE: ["attacker.geometry.animationCenter", "attacker.geometry.battlePositionCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :10568 (battlePositionCenter.y), renderer :37150-37156
  SAFEGUARD: ["attacker.geometry.battlePositionCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :7780, renderer :16005-16013
  SWEET_SCENT: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :10248 passes attacker animationCenter but sweetScent.ts:145 names it `_origin` and never reads it; renderer :16758-16766
  FIRE_BLAST: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :47681-47689; reducer reads animationProfile + attacker side
  SWALLOW: ["attacker.geometry.battlePositionCenter", "attacker.geometry.animationCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // reducer :9631, renderer :21747-21766 (pelipper drawn at animationCenter + x2/y2), shadow :21747-21749
  KNOCK_OFF: ["target.geometry.animationCenter", "attacker.geometry.spriteCorner", "target.geometry.spriteCorner"], // renderer :30148-30193, :30209
};

function pin(move, o, field, accepted, derived, note, extra = {}) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted);
  const d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  const consumed = extra.consumed ?? (CONSUMED[move] ?? []).includes(field);
  const match = a === d;
  out.push({ move, orientation: o, field, accepted: a, derived: d, match, consumed, resolved: match || !consumed || extra.resolved === true, ...(note ? { note } : {}) });
}
const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
const battlerSlot = (s) => liveSpriteSlotForOwner(provider.firstMove, { kind: "battler", side: s });

function geo(move, o, acc, [aSp, tSp]) {
  const dv = derive(aSp, sideOf(o.split("#")[0]), tSp);
  for (const role of ["attacker", "target"]) {
    const c = acc.config[role].geometry, d = dv[role];
    pin(move, o, `${role}.geometry.spriteCorner`, pt(c.spriteCorner), pt({ x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 }));
    pin(move, o, `${role}.geometry.animationCenter`, pt(c.animationCenter), pt(d.picOffsetPoint));
    pin(move, o, `${role}.geometry.battlePositionCenter`, pt(c.battlePositionCenter), pt(d.battlePositionCenter));
  }
  return dv;
}
// SetBattlerSpriteYOffsetFromYScale: y2 = (var - var2) / 2, var = 64 - 2 * yDelta, var2 = min(128, (var << 8) / d)  (battle_anim_mons.c:1873-1882)
const painSplitY2 = (yDelta, d) => { const v = 64 - 2 * yDelta; let v2 = Math.trunc((v << 8) / d); if (v2 > 128) v2 = 128; return Math.trunc((v - v2) / 2); };

for (const move of ["SELF_DESTRUCT", "KNOCK_OFF", "DOUBLE_TEAM", "FAINT_ATTACK", "ROCK_TOMB", "PAIN_SPLIT", "DRAGON_DANCE", "SAFEGUARD", "SWEET_SCENT", "FIRE_BLAST", "SWALLOW"]) {
  for (const o of O) {
    const variants = move === "SWALLOW" ? [1, 2, 3] : [1];
    for (const variant of variants) {
      const acc = acceptedConfig(move, o, variant);
      const tag = move === "SWALLOW" ? `${o}#stockpile${variant}` : o;
      if (!acc) { out.push({ move, orientation: o, field: "(no accepted evidence)", accepted: "-", derived: "-", match: null, consumed: false, resolved: true, note: "accepted evidence is player-back ONIX -> GROVYLE only" }); continue; }
      const dv = geo(move, tag, acc, acc.species);
      const A = dv.attacker, T = dv.target, sd = sideOf(o);
      const c = acc.config;
      if (move === "SELF_DESTRUCT") {
        pin(move, o, "fieldProfile.attackerHp (displayed at the MOVE_ANIMATION event)", `${sd === "player" ? c.fieldProfile.playerHp : c.fieldProfile.opponentHp}`, `${sdMeasured.player.hp}`, `measured on a generated route (prep6-route-probe.json, seed 56 streak 14 slot 0, attacker 0 => player hp ${sdMeasured.player.hp}/${sdMeasured.player.maxHP}); setatkhptozero precedes attackanimation (battle_scripts_1.s:374-386), same script as Explosion. Opponent-attacker orientation not measured on a route (same script)`, { consumed: true });
      }
      if (move === "KNOCK_OFF") {
        { const iv = receipt(o === "player-back" ? "mechanic-knock-off-shuppet-onix" : "mechanic-knock-off-opponent-shuppet-player-onix"); const live = iv.start - acc.sourceWindow[0] + c.animationAgeOffset;
          pin(move, o, "animationAgeOffset (live: age 0 = activation frame)", c.animationAgeOffset, live, `accepted -11 is relative to the accepted window start ${acc.sourceWindow[0]}; reducer animation age 0 = frame ${acc.sourceWindow[0] - c.animationAgeOffset} = activation ${iv.start} + ${acc.sourceWindow[0] - c.animationAgeOffset - iv.start}; a live window starting at the activation frame needs offset ${live}`, { consumed: true, resolved: true }); }
      }
      if (move === "ROCK_TOMB") {
        pin(move, o, "targetSpriteSlot", c.targetSpriteSlot, battlerSlot(T.side), "known-entry allocator battler slot of the target side (provider.firstMove)", { consumed: true });
        pin(move, o, "targetInitialX2", c.targetInitialX2, T.frontIdleRest.x2, "dense row0 target x2 vs production frontIdleRest.x2 (liveBattlerAnchors)", { consumed: true });
        pin(move, o, "effectCenter", c.effectCenter, T.picOffsetPoint, "InitSpritePosToAnimTarget = target pic point (sprite y + 8 for player target)", { consumed: true });
      }
      if (move === "PAIN_SPLIT") {
        // reducer constants painSplit.ts:76-90 (phase 0: MISDREAVUS 4 / GENGAR 5; phases 1,2: GENGAR-opponent 3 else 2; the +16 player correction is separate)
        for (const [role, sp, sdd] of [["attacker", "MISDREAVUS", A], ["target", "GENGAR", T]]) {
          const yd = sdd.coords.yOffset;
          const derivedY2 = [painSplitY2(yd, 320), painSplitY2(yd, 283), painSplitY2(yd, 283)];
          const reducer = [sp === "MISDREAVUS" ? 4 : 5, sdd.side === "opponent" && sp === "GENGAR" ? 3 : 2, sdd.side === "opponent" && sp === "GENGAR" ? 3 : 2];
          pin(move, o, `${role}.yOffsetFromYScale y2 phases 0,1,2 (coords.yOffset=${yd})`, reducer, derivedY2, "reducer constants (painSplit.ts:85-89) vs SetBattlerSpriteYOffsetFromYScale evaluated with production coords.yOffset and d=320/283/283", { consumed: true });
        }
      }
      if (move === "DRAGON_DANCE") {
        pin(move, o, "animationProfile.pictureSize -> orb radius max(w,h)>>1", Math.max(c.animationProfile.pictureSize.width, c.animationProfile.pictureSize.height) >> 1, Math.max(A.coords.width, A.coords.height) >> 1, `accepted literal 64x64 vs production coords ${A.coords.width}x${A.coords.height}; only max(w,h)>>1 is read (dragonDance.ts:160)`, { consumed: true });
      }
      if (move === "SAFEGUARD") {
        pin(move, o, "animationProfile.ringSubpriority", c.animationProfile.ringSubpriority, A.subpriority - 2, "GetBattlerSpriteSubpriority(attacker) - 2", { consumed: true });
      }
      if (move === "SWEET_SCENT") {
        pin(move, o, "animationProfile.targetSubpriority", c.animationProfile.targetSubpriority, A.subpriority - 2, "= attacker subpriority - 2 (field is named target, value is the attacker-side 28/38)", { consumed: true });
      }
      if (move === "FIRE_BLAST") {
        pin(move, o, "animationProfile.attackerPictureCenter", c.animationProfile.attackerPictureCenter, A.picOffsetPoint, "", { consumed: true });
        pin(move, o, "animationProfile.targetPictureCenter", c.animationProfile.targetPictureCenter, T.picOffsetPoint, "", { consumed: true });
        pin(move, o, "animationProfile.targetSpriteSlot", c.animationProfile.targetSpriteSlot, battlerSlot(T.side), "known-entry allocator battler slot of the target side", { consumed: true });
      }
      if (move === "SWALLOW") {
        pin(move, tag, "attackerPictureOffset", c.attackerPictureOffset, A.picOffsetPoint, "attacker pic point", { consumed: true });
        pin(move, tag, "attackerPictureYOffset", c.attackerPictureYOffset, A.coords.yOffset, "coords.yOffset", { consumed: true });
        pin(move, tag, "attacker.geometry.animationCenter (affine centre rule)", pt(c.attacker.geometry.animationCenter), pt(A.spriteCenter),
          "the accepted animationCenter is the sprite CENTRE (live affineCenterBattler = spriteCorner+32, liveMoveAnimation.ts:~503) not the pic point; the renderer draws Pelipper there", { consumed: true });
        const last = out[out.length - 1];
        if (last.match) { const gen = out.find((q) => q.move === move && q.orientation === tag && q.field === "attacker.geometry.animationCenter"); if (gen && !gen.match) { gen.resolved = true; gen.note = "accepted = sprite centre (affine rule pin below matches); the live adapter must pass affineCenterBattler(attacker)"; } }
      }
    }
  }
}
console.log(JSON.stringify(out, null, 1));
