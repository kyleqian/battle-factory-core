import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  WISH_FRAME_COUNT,
  wishAtAge,
  type WishTwinkleVariant,
} from "../../src/animation/wish.ts";
import {
  createSceneOnMovePresentation,
  type SceneOnWishConfig,
} from "../../src/animation/sceneOnPresentation.ts";
import { createInitialState, render } from "../../src/engine/core.ts";

const twinkles: WishTwinkleVariant[] = Array.from(
  { length: 21 },
  () => ({ tileOffset: 5, yOffset: 0 }),
);

describe("MOVE_WISH source reducer", () => {
  it("ports both black background ramps and inactive cleanup", () => {
    expect(wishAtAge(0, "player", { x: 72, y: 94 }, twinkles))
      .toMatchObject({ active: true, backgroundBlackCoeff: 0 });
    expect(wishAtAge(11, "player", { x: 72, y: 94 }, twinkles))
      .toMatchObject({ backgroundBlackCoeff: 2, visualTaskCount: 1 });
    expect(wishAtAge(31, "player", { x: 72, y: 94 }, twinkles))
      .toMatchObject({ backgroundBlackCoeff: 10 });
    expect(wishAtAge(242, "player", { x: 72, y: 94 }, twinkles))
      .toMatchObject({ backgroundBlackCoeff: 8, visualTaskCount: 1 });
    expect(wishAtAge(262, "player", { x: 72, y: 94 }, twinkles))
      .toMatchObject({ backgroundBlackCoeff: 0 });
    expect(wishAtAge(270, "player", { x: 72, y: 94 }, twinkles).active)
      .toBe(false);
    expect(WISH_FRAME_COUNT).toBe(271);
  });

  it("ports Wish-star travel, 21 twinkles, and GrantingStarsEffect", () => {
    expect(wishAtAge(39, "player", { x: 72, y: 94 }, twinkles).sprites[0])
      .toMatchObject({ kind: "wishStar", x: 252, y: 0, oamSlot: 3 });
    expect(wishAtAge(39, "opponent", { x: 176, y: 48 }, twinkles).sprites[0])
      .toMatchObject({ kind: "wishStar", x: -12, y: 0, oamSlot: 3 });
    expect(wishAtAge(101, "player", { x: 72, y: 94 }, twinkles).sprites
      .filter((sprite) => sprite.kind === "miniStar")).toHaveLength(20);
    expect(wishAtAge(166, "player", { x: 72, y: 94 }, twinkles).sprites)
      .toContainEqual({
        kind: "grantingStar", spawnIndex: 0, oamSlot: 3,
        x: 57, y: 94, frame: 0, invisible: false,
      });
    expect(wishAtAge(176, "opponent", { x: 176, y: 48 }, twinkles).sprites
      .filter((sprite) => sprite.kind === "grantingStar")).toHaveLength(2);
  });

  it("pins the legal carrier and distinct Meteor Mash sibling", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/wishSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain(
      "set 173/FRONTIER_MON_ILLUMISE_1 -> SPECIES_ILLUMISE 387/move 273",
    );
    expect(output).toContain(
      "Meteor Mash remains distinct: BG_COSMIC, spinning stars, IMPACT",
    );
  });

  it("uses typed sides and generic battler art without an evidence-pair gate", () => {
    const stage = createSceneOnMovePresentation<SceneOnWishConfig>({
      move: "WISH",
      attacker: {
        species: "ARON",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 54 },
          animationCenter: { x: 72, y: 94 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "GROVYLE",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 16 },
          animationCenter: { x: 176, y: 48 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 100, playerMaxHp: 100,
        opponentHp: 100, opponentMaxHp: 100,
        playerGender: "male", opponentGender: "male",
      },
      twinkles,
    });
    const framebuffer = render({
      ...createInitialState(), rngMode: "frontierBattle",
      sceneOnPresentation: { ...stage, age: 50 },
    });
    expect(framebuffer).toHaveLength(240 * 160 * 4);
  });
});
