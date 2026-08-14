import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  FLAIL_FRAME_COUNT,
  flailAtAge,
  flailMovementAtAge,
  flailShakeAmplitude,
  type FlailPower,
} from "../../src/animation/flail.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFlailView,
} from "../../src/animation/sceneOnPresentation.ts";

const branches = [
  ["player-back", 40], ["player-back", 80], ["player-back", 100],
  ["player-back", 150], ["player-back", 200], ["opponent-front", 40],
  ["opponent-front", 80], ["opponent-front", 100],
  ["opponent-front", 150], ["opponent-front", 200],
] as const;

function load(orientation: string, power: number): any {
  return JSON.parse(gunzipSync(readFileSync(
    `tools/compare/evidence/flail-natural-hp-${orientation}-power-${power}-dense-state.json.gz`,
  )).toString("utf8"));
}

describe("Move_FLAIL pure source-relative reducer", () => {
  it("ports every AnimTask_FlailMovement data row and live battler transform", () => {
    const probe = load("player-back", 40);
    const func = probe.componentSymbols.AnimTask_FlailMovement_Step;
    for (let age = 0; age < FLAIL_FRAME_COUNT; age += 1) {
      const row = probe.frames[age];
      const task = row.tasks.find((entry: any) =>
        (entry.func.address & ~1) === func);
      const source = flailMovementAtAge(age);
      if (!task) {
        expect(source.task, `age ${age}`).toBeNull();
        continue;
      }
      expect(source.task, `age ${age}`).toEqual({
        phase: task.data[0], age: task.data[1], rotation: task.data[2],
        decayRemaining: task.data[12], decayStep: task.data[13],
        amplitude: task.data[14],
      });
      const attacker = row.sprites.find((sprite: any) =>
        sprite.slot === row.battlerSpriteIds[0]);
      expect(source.offset, `age ${age}`).toEqual({ x2: attacker.x2, y2: attacker.y2 });
      expect(source.matrix, `age ${age}`).toEqual({
        a: attacker.matrix[0], b: attacker.matrix[1],
        c: attacker.matrix[2], d: attacker.matrix[3],
      });
    }
  });

  it.each(branches)("matches the retained %s power-%i shake/hitsplat rows", (orientation, power) => {
    const probe = load(orientation, power);
    const playerBack = orientation === "player-back";
    const targetCenter = playerBack ? { x: 177, y: 43 } : { x: 71, y: 83 };
    const component = probe.componentSymbols.gRandomPosHitSplatSpriteTemplate;
    const hit = probe.frames[49].sprites.find((sprite: any) =>
      sprite.template.address === component);
    const targetSlotAtStart = probe.frames[0].battlerSpriteIds[playerBack ? 1 : 0];
    const targetInitialX2 = probe.frames[0].sprites.find((sprite: any) =>
      sprite.slot === targetSlotAtStart).x2;
    const visualRandom = { x: hit.x2 + 24, y: hit.y2 + 12 };
    for (let age = 0; age < FLAIL_FRAME_COUNT; age += 1) {
      const state = flailAtAge(age, {
        attackerSide: playerBack ? "player" : "opponent",
        targetCenter,
        targetInitialX2,
        power: power as FlailPower,
        visualRandom,
      });
      expect(state.shakeAmplitude).toBe(flailShakeAmplitude(power));
      const targetSlot = probe.frames[age].battlerSpriteIds[playerBack ? 1 : 0];
      const target = probe.frames[age].sprites.find((sprite: any) =>
        sprite.slot === targetSlot);
      expect(state.targetShakeX2, `age ${age}`).toBe(target.x2);
      const sourceHit = probe.frames[age].sprites.find((sprite: any) =>
        sprite.template.address === component);
      expect(Boolean(state.hitsplat), `age ${age}`).toBe(Boolean(sourceHit));
      if (sourceHit) {
        expect(state.hitsplat).toMatchObject({
          center: targetCenter,
          offset: { x2: sourceHit.x2, y2: sourceHit.y2 },
          animation: 3,
          matrix: { a: 512, b: 0, c: 0, d: 512 },
        });
      }
    }
  });

  it("carries immutable visual RNG and power through the typed seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "FLAIL",
      attacker: { species: "KRABBY", geometry: {
        side: "player", spriteCorner: { x: 40, y: 58 },
        animationCenter: { x: 72, y: 90 }, battlePositionCenter: { x: 72, y: 80 },
      } },
      target: { species: "ONIX", geometry: {
        side: "opponent", spriteCorner: { x: 144, y: 10 },
        animationCenter: { x: 177, y: 43 }, battlePositionCenter: { x: 176, y: 40 },
      } },
      fieldProfile: { playerHp: 69, playerMaxHp: 137, opponentHp: 142, opponentMaxHp: 142 },
      movePower: 40,
      targetInitialX2: 1,
      visualRandom: { x: 4, y: 3 },
    });
    expect(sceneOnFlailView({ ...stage, age: 49 })).toMatchObject({
      age: 49, attacker: { species: "KRABBY" }, target: { species: "ONIX" },
      shakeAmplitude: 3,
      hitsplat: { offset: { x2: -20, y2: -9 }, animation: 3 },
    });
    expect(stage.config.visualRandom).toEqual({ x: 4, y: 3 });
  });
});
