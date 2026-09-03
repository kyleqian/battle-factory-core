import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnFrustrationView,
  type SceneOnFrustrationConfig,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

type Row = Record<string, any>;

function rows(side: "player" | "opponent"): Row[] {
  return JSON.parse(gunzipSync(readFileSync(
    `tools/compare/evidence/frustration-${side}-dense-state.json.gz`,
  )).toString("utf8")).frames;
}

function configFor(side: "player" | "opponent", corpus: Row[]): SceneOnFrustrationConfig {
  const first = corpus[0]!;
  const playerAttacker = side === "player";
  const attacker = first.battlerSprites.attacker;
  const target = first.battlerSprites.target;
  const battler = (species: SceneOnPresentationBattler["species"], battleSide: "player" | "opponent", sprite: Row): SceneOnPresentationBattler => ({
    species,
    geometry: {
      side: battleSide,
      spriteCorner: { x: sprite.x - 32, y: sprite.y - 32 },
      animationCenter: { x: sprite.x, y: sprite.y },
      battlePositionCenter: battleSide === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    },
  });
  return {
    move: "FRUSTRATION",
    attacker: battler("FURRET", playerAttacker ? "player" : "opponent", attacker),
    target: battler("ONIX", playerAttacker ? "opponent" : "player", target),
    fieldProfile: {
      playerHp: first.parties.player[0].hp,
      playerMaxHp: first.parties.player[0].maxHp,
      opponentHp: first.parties.opponent[0].hp,
      opponentMaxHp: first.parties.opponent[0].maxHp,
      playerGender: first.parties.player[0].gender,
      opponentGender: first.parties.opponent[0].gender,
    },
    targetInitialX2: target.x2,
    attackerEffectCenter: playerAttacker ? { x: attacker.x, y: attacker.y + 8 } : { x: attacker.x, y: attacker.y },
    targetEffectCenter: playerAttacker ? { x: target.x, y: target.y } : { x: target.x, y: target.y + 8 },
    animationProfile: {
      angerSlot: 3,
      angerMatrix: 0,
      impactSlots: [3, 4],
      impactMatrices: [0, 3],
      impactOrders: [63, 1],
      impactSubpriority: playerAttacker ? 27 : 37,
      attackerSubpriority: attacker.subpriority,
      targetSubpriority: target.subpriority,
    },
  };
}

describe("MOVE_FRUSTRATION strongest source-relative production checkpoint", () => {
  it.each(["player", "opponent"] as const)("matches all 229 retained %s component/seam rows", (side) => {
    const corpus = rows(side);
    const stage = createSceneOnMovePresentation(configFor(side, corpus));
    expect(corpus).toHaveLength(229);
    for (const [age, row] of corpus.entries()) {
      const view = sceneOnFrustrationView({ ...stage, age });
      expect(view.scriptActive, `${age} script`).toBe(row.animScriptActive);
      expect(view.visualTaskCount, `${age} tasks`).toBe(row.visualTaskCount);
      expect(view.attackerX2, `${age} attacker x2`).toBe(row.battlerSprites.attacker.x2);
      expect(view.targetX2, `${age} target x2`).toBe(row.battlerSprites.target.x2);
      expect(view.alpha ? [16192, 2060] : [0, 0], `${age} alpha`)
        .toEqual([row.registers.bldcnt, row.registers.bldalpha]);
      const anger = row.sprites.filter((sprite: Row) =>
        sprite.template?.symbol === "gAngerMarkSpriteTemplate");
      expect(view.angerMarks).toHaveLength(anger.length);
      for (const [index, mark] of view.angerMarks.entries()) {
        expect([mark.x, mark.y, Math.trunc(0x10000 / mark.xScale)], `${age} anger ${index}`)
          .toEqual([anger[index].x, anger[index].y, anger[index].matrix[0]]);
      }
      const impacts = row.sprites.filter((sprite: Row) =>
        sprite.template?.symbol === "gBasicHitSplatSpriteTemplate");
      expect(view.impacts).toHaveLength(impacts.length);
      for (const impact of view.impacts) {
        const source = impacts.find((sprite: Row) => sprite.slot === impact.slot);
        expect(source, `${age} impact slot ${impact.slot}`).toBeTruthy();
        expect([impact.x, impact.y, impact.subpriority, impact.matrixNum, impact.matrix], `${age} impact ${impact.index}`)
          .toEqual([source.x, source.y, source.subpriority, source.matrixNum, source.matrix]);
      }
    }
  });

  it("routes altered species, reversed geometry, slots, matrices, and order through the same seam", () => {
    const base = configFor("player", rows("player"));
    const altered: SceneOnFrustrationConfig = {
      ...base,
      attacker: { species: "ARON", geometry: { side: "opponent", spriteCorner: { x: 141, y: 7 }, animationCenter: { x: 173, y: 39 }, battlePositionCenter: { x: 176, y: 40 } } },
      target: { species: "GROVYLE", geometry: { side: "player", spriteCorner: { x: 37, y: 55 }, animationCenter: { x: 69, y: 87 }, battlePositionCenter: { x: 72, y: 80 } } },
      targetInitialX2: 3,
      attackerEffectCenter: { x: 173, y: 39 },
      targetEffectCenter: { x: 69, y: 91 },
      animationProfile: { angerSlot: 12, angerMatrix: 7, impactSlots: [13, 15], impactMatrices: [8, 11], impactOrders: [9, 4], impactSubpriority: 22, attackerSubpriority: 39, targetSubpriority: 31 },
    };
    const view = sceneOnFrustrationView({ ...createSceneOnMovePresentation(altered), age: 133 });
    expect(view.attacker.species).toBe("ARON");
    expect(view.target.species).toBe("GROVYLE");
    expect(view.impacts.map((impact) => [impact.slot, impact.matrixNum, impact.order]))
      .toEqual([[13, 8, 9], [15, 11, 4]]);
    expect(view.impacts.map((impact) => [impact.x, impact.y])).toEqual([[69, 91], [45, 99]]);
  });
});
