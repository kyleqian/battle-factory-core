// prep8: pins production-derived config values (liveBattlerAnchors + createBattleCommandFieldArtView().coords via prep4Production.mjs derive()) against the accepted configs
// (prep8Accepted.mjs) of the ten allocator-plan-v2 moves, both orientations.   node --experimental-strip-types tools/integration/prep8Pins.mjs > tools/integration/fixtures/prep8-pins.json
// Pin: { move, orientation, field, accepted, derived, match, consumed, resolved, note }. `consumed` = a reducer/renderer reads the field (CONSUMED below; the doc cites the lines);
// `resolved` = match OR the field is unread OR the note names the production rule that produces the accepted value.
import { derive } from "./prep4Production.mjs";
import { createKnownEntrySpriteAllocatorProvider } from "../../src/engine/knownEntrySpriteAllocator.ts";
import { liveSpriteSlotForOwner } from "../../src/engine/liveSpriteAllocator.ts";
import { acceptedConfig, O, sideOf, MOVE_ID } from "./prep8Accepted.mjs";
const out = [];
const pt = (p) => `${p.x},${p.y}`;
// Geometry fields a renderer branch reads (battleScene.ts at this base: TRICK 15108-15307, SWIFT 15463-15542, STOCKPILE 21566-21695, ZAP 27289-27387, THUNDERBOLT 27389-27503, AURORA 27638-27762, HORN_DRILL 27882-28042, UPROAR 35897-35985, SEISMIC 39896-39968, FRUSTRATION 40090-40172).
// Branches read attacker/target spriteCorner (draw origin) and animationCenter.y (sort key / battler y); battlePositionCenter is read only by the opponent-attacker shadow draws (Thunderbolt :27412, Zap :27310, Stockpile :21647) and Stockpile/Uproar y deltas.
const CONSUMED = {
  SWIFT: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "attacker.geometry.animationCenter", "target.geometry.animationCenter"],
  TRICK: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"],
  THUNDERBOLT: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "attacker.geometry.animationCenter", "target.geometry.animationCenter", "attacker.geometry.battlePositionCenter"],
  FRUSTRATION: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"],
  HORN_DRILL: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "attacker.geometry.animationCenter", "target.geometry.animationCenter"],
  SEISMIC_TOSS: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner"],
  AURORA_BEAM: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "attacker.geometry.animationCenter", "target.geometry.animationCenter"],
  STOCKPILE: ["attacker.geometry.animationCenter", "attacker.geometry.battlePositionCenter", "target.geometry.spriteCorner"],
  UPROAR: ["attacker.geometry.animationCenter", "attacker.geometry.battlePositionCenter", "target.geometry.spriteCorner"],
  ZAP_CANNON: ["attacker.geometry.spriteCorner", "target.geometry.spriteCorner", "attacker.geometry.animationCenter", "target.geometry.animationCenter", "attacker.geometry.battlePositionCenter"],
};
function pin(move, o, field, accepted, derived, note, extra = {}) {
  const a = typeof accepted === "object" ? JSON.stringify(accepted) : String(accepted), d = typeof derived === "object" ? JSON.stringify(derived) : String(derived);
  const consumed = extra.consumed ?? (CONSUMED[move] ?? []).includes(field), match = a === d;
  const kind = /^(allocator|NOT an allocator|ad-hoc)/.test(note ?? "") ? "measured-constant (typed from the ROM plan, not a production call)" : "production-derived";
  out.push({ move, orientation: o, field, kind, accepted: a, derived: d, match, consumed, resolved: match || !consumed || extra.resolved === true, ...(note ? { note } : {}) });
}
const provider = createKnownEntrySpriteAllocatorProvider("battle-lab-ordinary-singles");
const battlerSlot = (s) => liveSpriteSlotForOwner(provider.firstMove, { kind: "battler", side: s });
const dir = (side) => (side === "player" ? 1 : -1); // attacker faces +x on the player side
for (const move of Object.keys(MOVE_ID)) for (const o of O) {
  const acc = acceptedConfig(move, o), sd = sideOf(o), c = acc.config;
  const dv = derive(acc.species[0], sd, acc.species[1]);
  const A = dv.attacker, T = dv.target;
  for (const role of ["attacker", "target"]) {
    const g = c[role].geometry, d = dv[role];
    const idleX2 = d.side === "opponent" ? d.frontIdleRest.x2 : 0, derivedCorner = { x: d.spriteCenter.x - 32, y: d.spriteCenter.y - 32 };
    pin(move, o, `${role}.geometry.spriteCorner`, pt(g.spriteCorner), pt(derivedCorner));
    { const q = out[out.length - 1];
      if (!q.match && g.spriteCorner.x === derivedCorner.x + idleX2 && g.spriteCorner.y === derivedCorner.y) { q.resolved = true; q.note = `accepted corner includes the settled front idle OAM x2=${idleX2} (production frontIdleRest.x2, liveBattlerAnchors)`; } }
    // all ten accepted configs use the OBJ centre (corner + 32) for animationCenter = the live affineCenterBattler (liveMoveAnimation.ts:497), not the Y_PIC_OFFSET point
    pin(move, o, `${role}.geometry.animationCenter`, pt(g.animationCenter), pt(d.spriteCenter), "accepted = OBJ centre (corner+32) = liveMoveAnimation affineCenterBattler(battler); the picture-offset point is derived separately below");
    pin(move, o, `${role}.geometry.battlePositionCenter`, pt(g.battlePositionCenter), pt(d.battlePositionCenter));
  }
  const slotA = battlerSlot(A.side), slotT = battlerSlot(T.side), subA = A.subpriority, subT = T.subpriority;
  const P = c.animationProfile, G = c.animationGeometry;
  if (move === "SWIFT") {
    pin(move, o, "animationProfile.attackerEffectCenter", P.attackerEffectCenter, A.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationProfile.targetAverageCenter", P.targetAverageCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationProfile.attackerSpriteSlot", P.attackerSpriteSlot, slotA, "known-entry battler slot", { consumed: true });
    pin(move, o, "animationProfile.targetSpriteSlot", P.targetSpriteSlot, slotT, "known-entry battler slot", { consumed: true });
    pin(move, o, "animationProfile.targetInitialOffset.x2", P.targetInitialOffset.x2, T.frontIdleRest.x2, "settled front idle rest x2 (0 for the player target)", { consumed: true });
    pin(move, o, "animationProfile.starSlots", P.starSlots, [3, 4, 5, 7, 9], "allocator: lowest-free slots at the activation edge (prep8-sprites-analysis.json spawnSlotsInOrder)", { consumed: true });
    pin(move, o, "animationProfile.targetShakeTaskSlot", P.targetShakeTaskSlot, 0, "allocator: ShakeMon2 takes task slot 0 (affine-task plan.json 129)", { consumed: true });
  }
  if (move === "TRICK") {
    pin(move, o, "animationProfile.attacker.spriteSlot", P.attacker.spriteSlot, slotA, "known-entry battler slot", { consumed: true });
    pin(move, o, "animationProfile.target.spriteSlot", P.target.spriteSlot, slotT, "known-entry battler slot", { consumed: true });
    pin(move, o, "animationProfile.bagSlots", P.bagSlots, [3, 4], "allocator: lowest-free sprite slots", { consumed: true });
    pin(move, o, "animationProfile task slots (attacker stretch/shake, target stretch/shake)", [P.attacker.stretchTaskSlot, P.attacker.shakeTaskSlot, P.target.stretchTaskSlot, P.target.shakeTaskSlot], [1, 0, 0, 1], "allocator: StretchTargetUp 25:0, StretchAttackerUp 25:1, ShakeMon 173:0,1 (plan.json 271)", { consumed: true });
  }
  if (move === "THUNDERBOLT") {
    pin(move, o, "animationGeometry.targetBattleCenter", G.targetBattleCenter, T.battlePositionCenter, "", { consumed: true });
    pin(move, o, "animationGeometry.targetPictureCenter", G.targetPictureCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
  }
  if (move === "FRUSTRATION") {
    pin(move, o, "attackerEffectCenter", c.attackerEffectCenter, A.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "targetEffectCenter", c.targetEffectCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "targetInitialX2", c.targetInitialX2, T.frontIdleRest.x2, "settled front idle rest x2", { consumed: true });
    pin(move, o, "animationProfile.attackerSubpriority/targetSubpriority", [P.attackerSubpriority, P.targetSubpriority], [subA, subT], "30 player / 40 opponent", { consumed: true });
    pin(move, o, "animationProfile.impactSubpriority", P.impactSubpriority, subA - 3, "attacker battler subpriority - 3 (hit-splat template subpriority offset; accepted 27/37)", { consumed: true });
    pin(move, o, "animationProfile angerSlot/angerMatrix/impactSlots/impactMatrices", [P.angerSlot, P.angerMatrix, P.impactSlots, P.impactMatrices], [3, 0, [3, 4], [0, 3]], "allocator: constants of the baseline (plan.json 218: 71:0 anger, 126:0 133:3 impacts)", { consumed: true });
  }
  if (move === "HORN_DRILL") {
    pin(move, o, "animationGeometry.attackerCenter", G.attackerCenter, A.spriteCenter, "OBJ centre (no +8)", { consumed: true });
    pin(move, o, "animationGeometry.targetPictureCenter", G.targetPictureCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationGeometry.attackerRestOffset.x2", G.attackerRestOffset.x2, A.frontIdleRest.x2, "", { consumed: true });
    pin(move, o, "animationGeometry.targetRestOffset.x2", G.targetRestOffset.x2, T.frontIdleRest.x2, "", { consumed: true });
    pin(move, o, "animationProfile.effectSubpriority", P.effectSubpriority, subT - 3, "target battler subpriority - 3 (accepted 37/27)", { consumed: true });
    pin(move, o, "animationProfile.hornMatrixId", P.hornMatrixId, sd === "player" ? 0 : 24, "NOT an allocator id: raw OAM matrixNum field bits of a non-affine sprite (0 player / 24 = hflip|vflip... opponent; affine-task/owned-sprites.json), adapter constant per orientation", { consumed: true, resolved: true });
    pin(move, o, "animationProfile hornSlot/impactSlots/impactMatrixIds", [P.hornSlot, P.impactSlots, P.impactMatrixIds], [4, [3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4], [0, 3, 4, 0, 3, 4, 0, 3, 4, 0, 3]], "allocator: lowest free + matrix baseline (plan.json 32: 74:0 80:3 86:4 92:0 ...)", { consumed: true });
  }
  if (move === "SEISMIC_TOSS") {
    pin(move, o, "animationGeometry.targetEffectCenter", G.targetEffectCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationGeometry.targetRockCenter", G.targetRockCenter, T.battlePositionCenter, "battle position centre", { consumed: true });
    pin(move, o, "animationGeometry.attackerRestOffset.x2", G.attackerRestOffset.x2, A.frontIdleRest.x2, "", { consumed: true });
    pin(move, o, "animationGeometry.targetRestOffset.x2", G.targetRestOffset.x2, T.frontIdleRest.x2, "", { consumed: true });
    pin(move, o, "animationProfile.attackerSubpriority/targetSubpriority", [P.attackerSubpriority, P.targetSubpriority], [subA, subT], "", { consumed: true });
  }
  if (move === "AURORA_BEAM") {
    pin(move, o, "animationGeometry.attackerRingOrigin", G.attackerRingOrigin, { x: A.picOffsetPoint.x + 20 * dir(A.side), y: A.picOffsetPoint.y }, "picture-offset point shifted 20 px toward the target (attacker x +/-20: aurora ring origin, source AnimAuroraBeam)", { consumed: true });
    pin(move, o, "animationGeometry.targetPictureCenter", G.targetPictureCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationGeometry.targetRestOffset.x2", G.targetRestOffset.x2, T.frontIdleRest.x2, "", { consumed: true });
    pin(move, o, "animationProfile.ringSubpriority", P.ringSubpriority, subT - 2, "target battler subpriority - 2 (accepted 38/28)", { consumed: true });
  }
  if (move === "STOCKPILE") {
    pin(move, o, "attackerPictureCenter", c.attackerPictureCenter, A.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "attackerPictureYOffset", c.attackerPictureYOffset, A.coords.yOffset, "species pic yOffset (GetBattlerSpriteCoordAttr)", { consumed: true });
    pin(move, o, "animationProfile.attackerSubpriority", P.attackerSubpriority, subA, "", { consumed: true });
    pin(move, o, "animationProfile orbSlotPool/orbMatrixPool", [P.orbSlotPool, P.orbMatrixPool], [[3, 4, 5, 7, 9], [0, 3, 4, 5, 6]], "allocator: lowest-free slots / matrix baseline (plan.json 254: 4:0 7:3 10:4 13:5 16:6)", { consumed: true });
    pin(move, o, "attackerShadowAtEntry", c.attackerShadowAtEntry, sd === "opponent", "ad-hoc shadow flag: true iff the opponent attacks (age-0 shadow draw battleScene.ts:21647); replaced by the shared liveOpponentShadow hook", { consumed: true });
  }
  if (move === "UPROAR") {
    pin(move, o, "animationInputs.attackerCenter", c.animationInputs.attackerCenter, A.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "attackerYDelta = attacker animationCenter.y - battlePositionCenter.y (computed by the view, sceneOnPresentation.ts:11496)", c.attacker.geometry.animationCenter.y - c.attacker.geometry.battlePositionCenter.y, A.spriteCenter.y - A.battlePositionCenter.y, "view-computed from the OBJ-centre geometry above", { consumed: true });
    pin(move, o, "animationInputs.attackerMatrixSlot", c.animationInputs.attackerMatrixSlot, sd === "player" ? 1 : 2, "allocator baseline: bitmap 0x6, battler matrices 1 (player slot 6) / 2 (opponent slot 8) (allocator-plan-v2-evidence.md answer 1)", { consumed: true });
    pin(move, o, "animationInputs.ringSlots/noteSlots/ringMatrixSlots", [c.animationInputs.ringSlots, c.animationInputs.noteSlots, c.animationInputs.ringMatrixSlots], [[3, 3, 3], [4, 5], [0, 0, 0]], "allocator (plan.json 253: 10:0 28:0 46:0 one matrix recycled; sprite slots 3 reused, notes 4,5)", { consumed: true });
  }
  if (move === "ZAP_CANNON") {
    pin(move, o, "animationGeometry.attackerPictureCenter", G.attackerPictureCenter, { x: A.picOffsetPoint.x + 10 * dir(A.side), y: A.picOffsetPoint.y }, "picture-offset point shifted 10 px toward the target (ball origin, source AnimTask/ZapCannon)", { consumed: true });
    pin(move, o, "animationGeometry.targetPictureCenter", G.targetPictureCenter, T.picOffsetPoint, "picture-offset point", { consumed: true });
    pin(move, o, "animationGeometry.targetBattleCenter", G.targetBattleCenter, T.battlePositionCenter, "", { consumed: true });
  }
}
console.log(JSON.stringify(out, null, 1));
