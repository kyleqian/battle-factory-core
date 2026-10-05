// prep6: accepted Scene-ON presentation configs of the eleven prep6 moves, rebuilt exactly as the accepted tests build them
// (sources cited per entry; all numbers are the accepted values, never production-derived). Run from workspace root.
//   acceptedConfig(move, o, variant?) -> { config, species: [attackerSpecies, targetSpecies], sourceWindow:[start,end], extras }
//   o = "player-back" | "opponent-front" (= attacker side).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE, ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE } from "../../src/animation/sceneOnPresentation.ts";
export const rd = (p) => JSON.parse(readFileSync(p, "utf8"));
export const rdz = (p) => JSON.parse(gunzipSync(readFileSync(p)).toString());
const cf = (n) => rd(`tools/compare/fixtures/${n}.json`);
export const O = ["player-back", "opponent-front"];
export const sideOf = (o) => (o === "player-back" ? "player" : "opponent");
export const otherSide = (s) => (s === "player" ? "opponent" : "player");

const sprBattlers = (row) => {
  const ids = row.animationBattlers.spriteIds;
  const side = (b) => (b & 1 ? "opponent" : "player");
  const a = row.animationBattlers.attacker, t = row.animationBattlers.target;
  const spr = (b) => row.sprites.find((s) => s.slot === ids[b]);
  return { attacker: { battler: a, side: side(a), sprite: spr(a) }, target: { battler: t, side: side(t), sprite: spr(t) } };
};
const bpc = (side) => (side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 });
const hpOf = (row) => ({ playerHp: row.battlers.player.hp, playerMaxHp: row.battlers.player.maxHp, opponentHp: row.battlers.opponent.hp, opponentMaxHp: row.battlers.opponent.maxHp });

export const MOVE_ID = { SELF_DESTRUCT: 120, DOUBLE_TEAM: 104, FAINT_ATTACK: 185, ROCK_TOMB: 317, PAIN_SPLIT: 220, DRAGON_DANCE: 349, SAFEGUARD: 219, SWEET_SCENT: 230, FIRE_BLAST: 126, SWALLOW: 256, KNOCK_OFF: 282 };

export function acceptedConfig(move, o, variant = 1) {
  const side = sideOf(o), tside = otherSide(side), pl = side === "player";
  switch (move) {
    case "SELF_DESTRUCT": {
      const f = cf(`self-destruct-${pl ? "player-sudowoodo-opponent-shuckle" : "opponent-sudowoodo-player-shuckle"}`);
      return { config: { move, attacker: f.attacker, target: f.target, fieldProfile: f.fieldProfile }, species: ["SUDOWOODO", "SHUCKLE"], sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame], extras: { attackerCenter: f.attackerCenter, ageOffset: 0 }, scenario: f.scenario };
    }
    case "KNOCK_OFF": {
      const f = cf(pl ? "knock-off-player-shuppet-opponent-onix" : "knock-off-opponent-onix-player-plusle");
      return { config: { move, attacker: f.attacker, target: f.target, fieldProfile: f.fieldProfile, animationAgeOffset: f.appStage.firstFramePresentationAge }, species: [f.attacker.species, f.target.species],
        sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame], extras: { ageOffset: f.appStage.firstFramePresentationAge, scenarioSpecies: f.pair }, scenario: f.scenario };
    }
    case "DOUBLE_TEAM": case "FAINT_ATTACK": {
      if (!pl) return null; // accepted evidence is player-back ONIX -> GROVYLE only
      const f = cf(move === "DOUBLE_TEAM" ? "double-team-onix-grovyle" : "faint-attack-onix-grovyle");
      const g = f.geometry; const mk = (x) => ({ species: x.species, geometry: { side: x.side, spriteCorner: x.spriteCorner, animationCenter: x.animationCenter, battlePositionCenter: x.battlePositionCenter } });
      return { config: { move, attacker: mk(g.attacker), target: mk(g.target), fieldProfile: f.fieldProfile, moveTextStartAge: f.presentation.moveTextStartAge, animationProfile: move === "DOUBLE_TEAM" ? ONIX_TO_GROVYLE_DOUBLE_TEAM_PROFILE : ONIX_TO_GROVYLE_FAINT_ATTACK_PROFILE.animationProfile }, species: ["ONIX", "GROVYLE"], sourceWindow: [f.denseWindow.startFrame, f.denseWindow.endFrame],
        extras: { moveTextStartAge: f.presentation.moveTextStartAge, probeArguments: f.probeArguments, oracleFrame: f.appStage.oracleFrame }, scenario: `${f.probe} ${f.probeArguments.join(" ")}` };
    }
    case "ROCK_TOMB": {
      const e = cf("rock-tomb-dense-evidence").orientations[o]; const rows = rdz(e.stateGzip).frames; const first = rows[0]; const b = sprBattlers(first);
      const mk = (x) => ({ species: first.battlers[x.side].species === 88 ? "GRIMER" : "ONIX", geometry: { side: x.side, spriteCorner: { x: x.sprite.x - 32, y: x.sprite.y - 32 }, animationCenter: { x: x.sprite.x, y: x.sprite.y }, battlePositionCenter: { x: x.sprite.x, y: x.side === "player" ? 80 : 40 } } });
      const tg = b.target;
      return { config: { move, attacker: mk(b.attacker), target: mk(b.target), fieldProfile: { ...hpOf(first), playerGender: "male", opponentGender: "male" },
        targetSpriteSlot: first.battlerSprites.target.slot, targetInitialX2: first.battlerSprites.target.x2, effectCenter: { x: first.battlerSprites.target.x, y: first.battlerSprites.target.y + (first.animationBattlers.target & 1 ? 0 : 8) } },
        species: ["GRIMER", "ONIX"], sourceWindow: [e.sourceWindow.startFrame, e.sourceWindow.endFrame], extras: { targetBattlerSlot: tg.sprite.slot }, scenario: e.scenario };
    }
    case "PAIN_SPLIT": {
      const e = cf("pain-split-evidence").orientations[o];
      const A = pl ? { corner: [40, 58], center: [72, 98] } : { corner: [144, 12], center: [176, 44] };
      const T = pl ? { corner: [144, 13], center: [176, 45] } : { corner: [40, 57], center: [72, 97] };
      const mk = (species, s, x) => ({ species, geometry: { side: s, spriteCorner: { x: x.corner[0], y: x.corner[1] }, animationCenter: { x: x.center[0], y: x.center[1] }, battlePositionCenter: bpc(s) } });
      return { config: { move, attacker: mk("MISDREAVUS", side, A), target: mk("GENGAR", tside, T),
        fieldProfile: pl ? { playerHp: 117, playerMaxHp: 167, opponentHp: 156, opponentMaxHp: 156, playerGender: "female", opponentGender: "male" } : { playerHp: 156, playerMaxHp: 156, opponentHp: 117, opponentMaxHp: 167, playerGender: "male", opponentGender: "female" } },
        species: ["MISDREAVUS", "GENGAR"], sourceWindow: [e.sourceWindow.startFrame, e.sourceWindow.endFrame], extras: {}, scenario: e.scenario };
    }
    case "DRAGON_DANCE": {
      const e = cf("dragon-dance-evidence").orientations[o]; const first = rdz(e.denseState).frames[0];
      const dr = pl ? { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } : { side: "opponent", spriteCorner: { x: 144, y: 14 }, animationCenter: { x: 176, y: 46 }, battlePositionCenter: { x: 176, y: 40 } };
      const on = pl ? { side: "opponent", spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 }, battlePositionCenter: { x: 176, y: 40 } } : { side: "player", spriteCorner: { x: 40, y: 48 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } };
      return { config: { move, attacker: { species: "DRAGONAIR", geometry: dr }, target: { species: "ONIX", geometry: on },
        animationProfile: { pictureSize: { width: 64, height: 64 }, allocationSlots: [3, 4, 5, 7, 9, 10], allocationOrder: [0, 1, 2, 3, 4, 5] },
        fieldProfile: { ...hpOf(first), playerGender: pl ? "female" : "male", opponentGender: pl ? "male" : "female" } },
        species: ["DRAGONAIR", "ONIX"], sourceWindow: [e.sourceWindow.startFrame, e.sourceWindow.endFrame], extras: {}, scenario: e.scenario };
    }
    case "SAFEGUARD": {
      const e = cf("safeguard-evidence").orientations[o]; const rows = rdz(e.denseState).frames; const first = rows[0];
      const sp = (slot) => first.sprites.find((s) => s.slot === slot);
      const mk = (species, s, spr) => ({ species, geometry: { side: s, spriteCorner: { x: spr.x - 32, y: spr.y - 32 }, animationCenter: { x: spr.x, y: spr.y }, battlePositionCenter: bpc(s) } });
      const attacker = sp(pl ? 6 : 8), target = sp(pl ? 8 : 6);
      const rings = rows[20].sprites.filter((s) => s.template?.symbol === "gGuardRingSpriteTemplate");
      const P = first.parties.player[0], Q = first.parties.opponent[0];
      return { config: { move, attacker: mk("BAYLEEF", side, attacker), target: mk("ONIX", tside, target),
        fieldProfile: { playerHp: P.hp, playerMaxHp: P.maxHp, opponentHp: Q.hp, opponentMaxHp: Q.maxHp, playerGender: P.gender === "genderless" ? "none" : P.gender, opponentGender: Q.gender === "genderless" ? "none" : Q.gender },
        animationProfile: { ringSlots: [rings[0].slot, rings[1].slot, rings[2].slot], ringSubpriority: attacker.subpriority - 2 } },
        species: ["BAYLEEF", "ONIX"], sourceWindow: [e.window.startFrame, e.window.endFrame], extras: { attackerRamSubpriority: attacker.subpriority }, scenario: e.scenario };
    }
    case "SWEET_SCENT": {
      const e = cf("sweet-scent-evidence").orientations[o]; const first = rdz(e.denseState).frames[0];
      const PETAL_SLOTS = [3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15, 16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14];
      const mk = (species, s) => ({ species, geometry: { side: s, spriteCorner: s === "player" ? { x: 40, y: species === "WEEPINBELL" ? 57 : 48 } : { x: 144, y: species === "WEEPINBELL" ? 19 : 10 },
        animationCenter: s === "player" ? { x: 72, y: 90 } : { x: 176, y: 42 }, battlePositionCenter: bpc(s) } });
      return { config: { move, attacker: mk("WEEPINBELL", side), target: mk("ONIX", tside), fieldProfile: { ...hpOf(first), playerGender: "male", opponentGender: "male" },
        animationProfile: { spriteSlots: PETAL_SLOTS, targetSubpriority: pl ? 28 : 38 } }, species: ["WEEPINBELL", "ONIX"], sourceWindow: [e.window.startFrame, e.window.endFrame], extras: {}, scenario: e.scenario };
    }
    case "FIRE_BLAST": {
      const e = cf("fire-blast-evidence").orientations[o]; const rows = rdz(e.denseState).frames; const first = rows[0];
      const a = rows[4].battlerSprites.attacker, t = rows[4].battlerSprites.target;
      const mk = (species, s, spr) => ({ species, geometry: { side: s, spriteCorner: { x: spr.x - 32, y: spr.y - 32 }, animationCenter: { x: spr.x, y: spr.y }, battlePositionCenter: { x: spr.x, y: spr.y } } });
      return { config: { move, attacker: mk("OCTILLERY", side, a), target: mk("ONIX", tside, t), fieldProfile: { ...hpOf(first), playerGender: "male", opponentGender: "male" },
        animationProfile: { attackerPictureCenter: pl ? { x: 72, y: 98 } : { x: 176, y: 50 }, targetPictureCenter: pl ? { x: 176, y: 42 } : { x: 72, y: 88 }, targetSpriteSlot: t.slot } },
        species: ["OCTILLERY", "ONIX"], sourceWindow: [e.sourceWindow.startFrame, e.sourceWindow.endFrame], extras: { attackerBattlerSlot: a.slot }, scenario: e.scenario };
    }
    case "SWALLOW": {
      const st = variant; const name = `swallow-${pl ? "player" : "opponent"}-pelipper-${["", "one", "two", "three"][st]}-stockpile-checkpoint`;
      const c = cf(name); const hp = c.attackerHpRange.minimum;
      const sw = !pl && st === 3;
      return { config: { move, stockpileCount: st,
        attacker: { species: "PELIPPER", geometry: pl ? { side: "player", spriteCorner: { x: 40, y: 54 }, animationCenter: { x: 72, y: 86 }, battlePositionCenter: { x: 72, y: 80 } } : { side: "opponent", spriteCorner: { x: 144, y: 4 }, animationCenter: { x: 176, y: 36 }, battlePositionCenter: { x: 176, y: 40 } } },
        target: { species: sw ? "SABLEYE" : "DELCATTY", geometry: pl ? { side: "opponent", spriteCorner: { x: 144, y: 16 }, animationCenter: { x: 176, y: 48 }, battlePositionCenter: { x: 176, y: 40 } } : { side: "player", spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 88 }, battlePositionCenter: { x: 72, y: 80 } } },
        fieldProfile: pl ? { playerHp: hp, playerMaxHp: 154, opponentHp: 164, opponentMaxHp: 164, playerGender: "male", opponentGender: "male" } : { playerHp: st === 3 ? 144 : 164, playerMaxHp: st === 3 ? 144 : 164, opponentHp: hp, opponentMaxHp: 154, playerGender: "male", opponentGender: "male" },
        attackerPictureOffset: pl ? { x: 72, y: 94 } : { x: 176, y: 36 }, attackerPictureYOffset: pl ? 6 : 4 },
        species: ["PELIPPER", sw ? "SABLEYE" : "DELCATTY"], sourceWindow: [c.sourceWindow.startFrame, c.sourceWindow.endFrame], extras: { stockpiles: st, animTurn: c.branch.animTurn }, scenario: `tools/battle-lab/mechanic-swallow-${pl ? "player" : "opponent"}-pelipper-${["", "one", "two", "three"][st]}-stockpile.json` };
    }
  }
  throw new Error("unknown move " + move);
}
