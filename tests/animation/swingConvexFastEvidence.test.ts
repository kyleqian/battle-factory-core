import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  SWING_CONVEX_FAST_FACTORY_FRONT_SPECIES,
  SWING_CONVEX_FAST_FRONT_SPECIES,
  SWING_CONVEX_FAST_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-lunatone.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-lunatone-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-lunatone-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_SWING_CONVEX_FAST";

describe("ANIM_SWING_CONVEX_FAST Scene-ON evidence", () => {
  it("pins selector 14, its complete Factory census, and adjacent controls", () => {
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const pokemonSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    expect(constants).toMatch(/^#define ANIM_SWING_CONCAVE_FAST\s+12$/m);
    expect(constants).toMatch(/^#define ANIM_SWING_CONVEX\s+13$/m);
    expect(constants).toMatch(/^#define ANIM_SWING_CONVEX_FAST\s+14$/m);
    expect(constants).toMatch(/^#define ANIM_H_SHAKE\s+15$/m);
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_LUNATONE - 1\]\s*= ANIM_SWING_CONVEX_FAST,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_SWING_CONVEX_FAST]                 = Anim_SwingConvex_Fast,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_SWING_CONVEX]                      = Anim_SwingConvex,",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf(
      "[ANIM_H_SHAKE]                           = Anim_HorizontalShake,",
    ));

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["LUNATONE"]);
    expect(SWING_CONVEX_FAST_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONVEX_FAST_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONVEX_FAST_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(selectorTables.frontAnimIds.species.IGGLYBUFF).toBe("ANIM_SWING_CONCAVE_FAST");
    expect(selectorTables.frontAnimIds.species.SOLROCK).toBe("ANIM_ROTATE_TO_SIDES_TWICE");
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
  });

  it("pins zeroed task state, the distinct fast initializer, shared reducer order, and teardown", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const spriteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/sprite.h", import.meta.url),
      "utf8",
    );
    const gbaTypesHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/gba/types.h", import.meta.url),
      "utf8",
    );
    expect(spriteHeader).toMatch(/\/\*0x24\*\/ s16 x2, y2;/);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(gbaTypesHeader).toMatch(/#define ST_OAM_AFFINE_DOUBLE 3/);
    expect(gbaTypesHeader).toMatch(/#define ST_OAM_AFFINE_NORMAL 1/);

    const taskStart = source.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = source.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = source.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );

    const sharedStart = source.indexOf("static void SwingConvex(struct Sprite *sprite)\n{");
    const fastShortStart = source.indexOf(
      "static void Anim_SwingConvex_FastShort(struct Sprite *sprite)\n{", sharedStart,
    );
    const fastStart = source.indexOf("static void Anim_SwingConvex_Fast(struct Sprite *sprite)\n{");
    const fastEnd = source.indexOf("// Very similar to VerticalShake", fastStart);
    expect(sharedStart).toBeGreaterThanOrEqual(0);
    expect(fastShortStart).toBeGreaterThan(sharedStart);
    expect(fastStart).toBeGreaterThanOrEqual(0);
    expect(fastEnd).toBeGreaterThan(fastStart);

    const shared = source.slice(sharedStart, fastShortStart);
    const sharedOrder = [
      shared.indexOf("if (sprite->data[2] == 0)"),
      shared.indexOf("HandleStartAffineAnim(sprite);"),
      shared.indexOf("TryFlipX(sprite);"),
      shared.indexOf("if (sprite->data[2] > sAnims[sprite->data[0]].data)"),
      shared.indexOf("HandleSetAffineData(sprite, 256, 256, 0);"),
      shared.indexOf("sprite->x2 = 0;"),
      shared.indexOf("if (sAnims[sprite->data[0]].runs > 1)"),
      shared.indexOf("sAnims[sprite->data[0]].runs--;"),
      shared.indexOf("sprite->data[2] = 0;"),
      shared.indexOf("ResetSpriteAfterAnim(sprite);"),
      shared.indexOf("sprite->callback = WaitAnimEnd;"),
      shared.indexOf("s16 index = (sprite->data[2] * 256) / sAnims[sprite->data[0]].data;"),
      shared.indexOf("sprite->x2 = -(Sin(index, 10));"),
      shared.indexOf("HandleSetAffineData(sprite, 256, 256, -(Sin(index, 3276)));"),
      shared.indexOf("sprite->data[2]++;"),
      shared.lastIndexOf("TryFlipX(sprite);"),
    ];
    expect(sharedOrder.every((position) => position >= 0)).toBe(true);
    expect(sharedOrder).toEqual([...sharedOrder].sort((a, b) => a - b));
    expect([...shared.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(2);

    const fast = source.slice(fastStart, fastEnd);
    const initializerOrder = [
      fast.indexOf("u8 id = sprite->data[0] = AddNewAnim();"),
      fast.indexOf("sAnims[id].data = 50;"),
      fast.indexOf("sAnims[id].runs = 2;"),
      fast.indexOf("SwingConvex(sprite);"),
      fast.indexOf("sprite->callback = SwingConvex;"),
    ];
    expect(initializerOrder.every((position) => position >= 0)).toBe(true);
    expect(initializerOrder).toEqual([...initializerOrder].sort((a, b) => a - b));
    expect(source).toMatch(/\[ANIM_SWING_CONVEX_FAST\]\s*=\s*Anim_SwingConvex_Fast,/);
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
  });

  it("pins a complete legal Scene-ON LUNATONE party from its Factory set", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_LUNATONE_1"))
      .toMatchObject({
        index: 222,
        species: "SPECIES_LUNATONE",
        moves: ["MOVE_CONFUSION", "MOVE_COSMIC_POWER", "MOVE_LIGHT_SCREEN", "MOVE_SANDSTORM"],
        itemTableId: 2,
        evSpread: 5,
        nature: "NATURE_QUIET",
      });
    expect(scenario).toMatchObject({
      mode: "mechanicLab",
      profile: "battle-scene-on",
      level: 50,
      challengeNum: 0,
      battleNum: 0,
      trainerId: 50,
      preCheckpointCaptureAllFrames: true,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]).toMatchObject({
      species: 348,
      level: 50,
      nature: 17,
      moves: [93, 322, 113, 201],
      ppUps: [0, 0, 0, 0],
      item: 142,
      abilitySlot: 0,
      friendship: 70,
      gender: "genderless",
      shiny: false,
    });
    for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    for (const mon of [
      ...scenario.overrides.parties.player,
      ...scenario.overrides.parties.opponent,
    ]) {
      expect(mon.level).toBe(50);
      expect(Object.keys(mon.ivs)).toEqual([
        "hp", "attack", "defense", "speed", "spAttack", "spDefense",
      ]);
      expect(Object.keys(mon.evs)).toEqual([
        "hp", "attack", "defense", "speed", "spAttack", "spDefense",
      ]);
      expect(mon.moves).toHaveLength(4);
      expect(mon.ppUps).toHaveLength(4);
      expect(mon).toEqual(expect.objectContaining({
        item: expect.any(Number),
        abilitySlot: expect.any(Number),
        friendship: expect.any(Number),
        gender: expect.any(String),
        shiny: expect.any(Boolean),
      }));
    }
  });

  it("pins a byte-identical full active-to-dummy Scene-ON pair, frame hashes, RAM, and OAM", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-lunatone-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-lunatone-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(46864);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("fd1a912e5034ef040bd4036258a82c6bf9dcbebafb9ffe6d6f31e537f553cbf8");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "swing-convex-fast-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 348,
      sourceSelector: SELECTOR,
      sourceId: 14,
      sourceWindow: { startFrame: 1617, endFrame: 1721, frameCount: 105 },
      callbackAddresses: {
        Anim_SwingConvex_Fast: 135803144,
        SwingConvex: 135796180,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(105);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 105 }, (_, index) => 1617 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_SwingConvex_Fast",
      ...Array(102).fill("SwingConvex"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler1.oam).toEqual(expect.objectContaining({
        matrix: expect.any(Array),
        affineMode: expect.any(Number),
      }));
    }

    expect(frames[0]).toMatchObject({
      sha256: "873c9dae13a1de97f3678ea186f381726c0beff49a81666741bd36044eeacc07",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_SwingConvex_Fast",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[1]).toMatchObject({
      sha256: "c35adf692f23c28029cbc2982fa1f78dc5d1cedbb30e19009469e6f133940f23",
      battler1: {
        data: [1, 1, 1, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConvex",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[51]).toMatchObject({
      sha256: "7887ab9dcb02007330e496761dd75b752982bd568f58489356b22b7b32b756e9",
      battler1: {
        data: [1, 1, 51, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConvex",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[52]).toMatchObject({
      sha256: "7504f67932153eab6d1a762ce719ac7bd4650de32f05e14d775eac41a1e9c87b",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 1, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConvex",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[102]).toMatchObject({
      sha256: "0f244e7a711b5f548c9956bea65b90c454fd1fe739e88e309b99f11152445863",
      battler1: {
        data: [1, 1, 51, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConvex",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[103]).toMatchObject({
      sha256: "3f7dec59168dc9377845dc2c5702115eba62b5e8ae89df7faaf212390ca7ec07",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 52, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames.at(-1)).toMatchObject({
      sha256: "3f7dec59168dc9377845dc2c5702115eba62b5e8ae89df7faaf212390ca7ec07",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 348, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
