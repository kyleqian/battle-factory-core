import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontPics from "../../src/assets/gen/battle-opponent-front-sprites.json";
import backPics from "../../src/assets/gen/battle-back-sprites.json";
import cut from "../../src/assets/gen/battle-anim-cutting-slice.json";
import {
  viceGripAtAge,
  VICE_GRIP_FRAME_COUNT,
} from "../../src/animation/viceGrip.ts";
import {
  createSceneOnMovePresentation,
  sceneOnViceGripView,
} from "../../src/animation/sceneOnPresentation.ts";

const target = { x: 176, y: 42 };

describe("MOVE_VICE_GRIP source-relative presentation", () => {
  it("ports both six-step pincers, distinct flips/animations, hit, shake, and cleanup", () => {
    expect(VICE_GRIP_FRAME_COUNT).toBe(42);
    expect(viceGripAtAge(9, "opponent", target).pincers).toEqual([]);
    expect(viceGripAtAge(10, "opponent", target).pincers).toEqual([
      {
        x: 208,
        y: 10,
        x2: -2,
        y2: 2,
        frame: 0,
        hFlip: false,
        vFlip: false,
        oamSlot: 3,
      },
      {
        x: 144,
        y: 74,
        x2: 2,
        y2: -2,
        frame: 0,
        hFlip: true,
        vFlip: true,
        oamSlot: 4,
      },
    ]);
    expect(
      [10, 11, 12, 13, 14, 15].map(
        (age) => viceGripAtAge(age, "opponent", target).pincers[0]?.x2,
      ),
    ).toEqual([-2, -5, -8, -10, -13, -16]);
    expect(
      [10, 11, 12, 13, 14, 15].map(
        (age) => viceGripAtAge(age, "opponent", target).pincers[0]?.y2,
      ),
    ).toEqual([2, 5, 7, 10, 13, 15]);
    expect(viceGripAtAge(21, "opponent", target).hitsplat).toEqual({
      x: 176,
      y: 42,
      matrix: 372,
      oamSlot: 5,
    });
    expect(
      [21, 22, 23, 24, 25, 26, 27, 28, 29].map(
        (age) => viceGripAtAge(age, "opponent", target).targetOffset.x2,
      ),
    ).toEqual([-2, -2, 2, 2, -2, -2, 2, 2, 0]);
    expect(viceGripAtAge(40, "opponent", target)).toMatchObject({
      active: true,
      cutLoaded: true,
      impactLoaded: true,
    });
    expect(viceGripAtAge(41, "opponent", target)).toMatchObject({
      active: false,
      cutLoaded: false,
      impactLoaded: false,
      targetOnMonBg: false,
      alpha: null,
    });
  });

  it("crosses only the typed Scene-ON presentation seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "VICE_GRIP" as const,
      attacker: {
        species: "CRAWDAUNT",
        geometry: {
          side: "player" as const,
          spriteCorner: { x: 40, y: 53 },
          animationCenter: { x: 72, y: 85 },
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent" as const,
          spriteCorner: { x: 144, y: 10 },
          animationCenter: target,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      fieldProfile: {
        playerHp: 137,
        playerMaxHp: 145,
        opponentHp: 117,
        opponentMaxHp: 117,
      },
    });
    expect(sceneOnViceGripView({ ...stage, age: 21 })).toMatchObject({
      hitsplat: { matrix: 372 },
      targetOffset: { x2: -2, y2: 0 },
      sound: null,
    });
    expect(Object.keys(stage.config.fieldProfile)).not.toContain("damage");
  });

  it("pins set 249, the isolated source body, source-identical CUT art, and Crawdaunt art", () => {
    const constants = readFileSync(
      "reference/pokeemerald/include/constants/battle_frontier_mons.h",
      "utf8",
    );
    const mons = readFileSync(
      "reference/pokeemerald/src/data/battle_frontier/battle_frontier_mons.h",
      "utf8",
    );
    const scripts = readFileSync(
      "reference/pokeemerald/data/battle_anim_scripts.s",
      "utf8",
    );
    expect(constants).toContain("#define FRONTIER_MON_CRAWDAUNT_1    249");
    expect(mons.match(/MOVE_VICE_GRIP/g)).toHaveLength(1);
    expect(
      mons.slice(0, mons.indexOf("[FRONTIER_MON_CRAWDAUNT_1]")),
    ).not.toContain("MOVE_VICE_GRIP");
    const carrier = mons.slice(
      mons.indexOf("[FRONTIER_MON_CRAWDAUNT_1]"),
      mons.indexOf("[FRONTIER_MON_PIDGEOT_1]"),
    );
    expect(carrier).toContain(
      ".moves = {MOVE_BUBBLE_BEAM, MOVE_VICE_GRIP, MOVE_KNOCK_OFF, MOVE_PROTECT}",
    );
    const body = scripts.slice(
      scripts.indexOf("Move_VICE_GRIP:"),
      scripts.indexOf("Move_GUILLOTINE:"),
    );
    for (const command of [
      "loadspritegfx ANIM_TAG_CUT",
      "loadspritegfx ANIM_TAG_IMPACT",
      "monbg ANIM_DEF_PARTNER",
      "setalpha 12, 8",
      "playsewithpan SE_M_VICEGRIP, SOUND_PAN_TARGET",
      "createsprite gViceGripSpriteTemplate, ANIM_ATTACKER, 2, 0",
      "createsprite gViceGripSpriteTemplate, ANIM_ATTACKER, 2, 1",
      "animation=2",
      "AnimTask_ShakeMon2",
      "clearmonbg ANIM_DEF_PARTNER",
      "blendoff",
    ])
      expect(body).toContain(command);
    expect(cut.source).toContain("cut.png");
    expect(cut.source).toContain(
      "CUT's own paletteTag resolves to this same array",
    );
    expect(frontPics).toHaveProperty("CRAWDAUNT");
    expect(backPics).toHaveProperty("CRAWDAUNT");
  });
});
