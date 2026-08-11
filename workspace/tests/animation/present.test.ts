import { describe, expect, it } from "vitest";
import {
  PRESENT_DAMAGE_FRAME_COUNT,
  PRESENT_HEAL_FRAME_COUNT,
  presentAtAge,
} from "../../src/animation/present.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPresentView,
} from "../../src/animation/sceneOnPresentation.ts";

const player = { x: 72, y: 80 };
const opponent = { x: 176, y: 40 };

describe("MOVE_PRESENT source-relative reducer", () => {
  it("ports the common 60-frame bag path and branch cleanup", () => {
    expect(presentAtAge(4, "damage", "player", player, opponent).bag)
      .toMatchObject({
        x: 72,
        y: 75,
        y2: -5,
        matrix: { a: 251, b: 49, c: -49, d: 251 },
        callback: "AnimItemSteal_Step1",
      });
    expect(presentAtAge(63, "damage", "player", player, opponent).bag)
      .toMatchObject({
        x: 174,
        y: 51,
        callback: "AnimItemSteal_Step2",
      });
    expect(presentAtAge(114, "damage", "player", player, opponent).bag)
      .toBeNull();
    expect(presentAtAge(
      PRESENT_DAMAGE_FRAME_COUNT - 1,
      "damage",
      "player",
      player,
      opponent,
    ).active).toBe(false);
    expect(presentAtAge(
      PRESENT_HEAL_FRAME_COUNT - 1,
      "heal",
      "player",
      player,
      opponent,
    ).active).toBe(false);
  });

  it("ports five explosions or nine green sparkles plus four blue stars", () => {
    const damageStarts = [118, 126, 134, 142, 150].map((age) =>
      presentAtAge(age, "damage", "player", player, opponent)
        .explosions.at(-1)?.sourceIndex
    );
    expect(damageStarts).toEqual([0, 1, 2, 3, 4]);
    expect(presentAtAge(134, "damage", "player", player, opponent).explosions)
      .toHaveLength(3);

    const greenStarts = [121, 126, 131, 136, 141, 146, 151, 156, 161]
      .map((age) =>
        presentAtAge(age, "heal", "player", player, opponent)
          .greenSparkles.at(-1)?.sourceIndex
      );
    expect(greenStarts).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(presentAtAge(136, "heal", "player", player, opponent).greenSparkles)
      .toHaveLength(4);
    expect([198, 207, 216, 225].map((age) =>
      presentAtAge(age, "heal", "player", player, opponent)
        .blueStars.at(-1)?.sourceIndex
    )).toEqual([0, 1, 2, 3]);
  });

  it("takes the branch as immutable controller-owned seam input", () => {
    const stage = createSceneOnMovePresentation({
      move: "PRESENT",
      branch: "heal",
      attacker: {
        species: "DELIBIRD",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 54 },
          animationCenter: { x: 72, y: 86 },
          battlePositionCenter: player,
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: opponent,
        },
      },
      fieldProfile: {
        playerHp: 106,
        playerMaxHp: 138,
        opponentHp: 104,
        opponentMaxHp: 117,
      },
    });
    const view = sceneOnPresentView({ ...stage, age: 121 });
    expect(view.branch).toBe("heal");
    expect(view.greenSparkles).toHaveLength(1);
    expect(view.explosions).toHaveLength(0);
    expect("damage" in view).toBe(false);
    expect("healedHp" in view).toBe(false);
  });
});
