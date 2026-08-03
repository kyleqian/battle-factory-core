import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  SWING_CONCAVE_FAST_FACTORY_FRONT_SPECIES,
  SWING_CONCAVE_FAST_FRONT_SPECIES,
  SWING_CONCAVE_FAST_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-igglybuff.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-igglybuff-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-igglybuff-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_SWING_CONCAVE_FAST";

describe("ANIM_SWING_CONCAVE_FAST Scene-ON evidence", () => {
  it("pins selector 12, its complete Factory census, and adjacent controls", () => {
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
    expect(constants).toMatch(/^#define ANIM_SWING_CONCAVE\s+11$/m);
    expect(constants).toMatch(/^#define ANIM_SWING_CONCAVE_FAST\s+12$/m);
    expect(constants).toMatch(/^#define ANIM_SWING_CONVEX\s+13$/m);
    expect(constants).toMatch(/^#define ANIM_SWING_CONVEX_FAST\s+14$/m);
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_IGGLYBUFF - 1\]\s*= ANIM_SWING_CONCAVE_FAST,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_SWING_CONCAVE_FAST]                = Anim_SwingConcave_Fast,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_SWING_CONCAVE]                     = Anim_SwingConcave,",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf(
      "[ANIM_SWING_CONVEX]                      = Anim_SwingConvex,",
    ));

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["IGGLYBUFF"]);
    expect(SWING_CONCAVE_FAST_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONCAVE_FAST_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(SWING_CONCAVE_FAST_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(selectorTables.frontAnimIds.species.LUNATONE).toBe("ANIM_SWING_CONVEX_FAST");
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
    expect(taskStart).toBeGreaterThanOrEqual(0);
    expect(taskEnd).toBeGreaterThan(taskStart);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );

    const sharedStart = source.indexOf("static void SwingConcave(struct Sprite *sprite)\n{");
    const fastShortStart = source.indexOf(
      "static void Anim_SwingConcave_FastShort(struct Sprite *sprite)\n{", sharedStart,
    );
    const normalStart = source.indexOf("static void Anim_SwingConcave(struct Sprite *sprite)\n{");
    const fastStart = source.indexOf("static void Anim_SwingConcave_Fast(struct Sprite *sprite)\n{");
    const convexStart = source.indexOf("static void Anim_SwingConvex(struct Sprite *sprite)\n{");
    expect(sharedStart).toBeGreaterThanOrEqual(0);
    expect(fastShortStart).toBeGreaterThan(sharedStart);
    expect(normalStart).toBeGreaterThan(fastShortStart);
    expect(fastStart).toBeGreaterThan(normalStart);
    expect(convexStart).toBeGreaterThan(fastStart);

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
      shared.indexOf("HandleSetAffineData(sprite, 256, 256, Sin(index, 3276));"),
      shared.indexOf("sprite->data[2]++;"),
      shared.lastIndexOf("TryFlipX(sprite);"),
    ];
    expect(sharedOrder.every((position) => position >= 0)).toBe(true);
    expect(sharedOrder).toEqual([...sharedOrder].sort((a, b) => a - b));
    expect([...shared.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(2);

    const normal = source.slice(normalStart, fastStart);
    const fast = source.slice(fastStart, convexStart);
    expect(normal).toContain("sAnims[id].data = 100;");
    const initializerOrder = [
      fast.indexOf("u8 id = sprite->data[0] = AddNewAnim();"),
      fast.indexOf("sAnims[id].data = 50;"),
      fast.indexOf("sAnims[id].runs = 2;"),
      fast.indexOf("SwingConcave(sprite);"),
      fast.indexOf("sprite->callback = SwingConcave;"),
    ];
    expect(initializerOrder.every((position) => position >= 0)).toBe(true);
    expect(initializerOrder).toEqual([...initializerOrder].sort((a, b) => a - b));
    expect(source).toMatch(
      /\[ANIM_SWING_CONCAVE_FAST\]\s*=\s*Anim_SwingConcave_Fast,/,
    );
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
  });

  it("pins a complete legal Scene-ON IGGLYBUFF party from its Factory set", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_IGGLYBUFF"))
      .toMatchObject({
        index: 13,
        species: "SPECIES_IGGLYBUFF",
        moves: ["MOVE_SWEET_KISS", "MOVE_SING", "MOVE_ATTRACT", "MOVE_SEISMIC_TOSS"],
        itemTableId: 6,
        evSpread: 3,
        nature: "NATURE_DOCILE",
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
      species: 174,
      level: 50,
      nature: 6,
      moves: [186, 47, 213, 69],
      ppUps: [0, 0, 0, 0],
      item: 196,
      abilitySlot: 0,
      friendship: 70,
      gender: "female",
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
      `${FIXTURES}sendout-front-igglybuff-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-igglybuff-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(47073);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("3ce05c26f5d10bdb51d710e4be61919d3d8bcf9c03e7d072206d9f525117f764");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "swing-concave-fast-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 174,
      sourceSelector: SELECTOR,
      sourceId: 12,
      sourceWindow: { startFrame: 1618, endFrame: 1722, frameCount: 105 },
      callbackAddresses: {
        Anim_SwingConcave_Fast: 135803036,
        SwingConcave: 135795924,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(105);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 105 }, (_, index) => 1618 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_SwingConcave_Fast",
      ...Array(102).fill("SwingConcave"),
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
      sha256: "e5b70fbd9d4e8965af9c8035a7f9444c99db5a745ec8ad8b17dec84681d42a0e",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_SwingConcave_Fast",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[1]).toMatchObject({
      sha256: "69316c2ed6325191fb9d62c490051295c54076dc52d5bf563b3ae05d7d5050f4",
      battler1: {
        data: [1, 1, 1, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConcave",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[51]).toMatchObject({
      sha256: "1cefcb78e24f9422eb9a346b79ab89a884b949f4763bef621a0ae6febcbc9b10",
      battler1: {
        data: [1, 1, 51, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConcave",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[52]).toMatchObject({
      sha256: "38254c666c1ed9ae54a97052a0a659f428a70df856b3e3d3ffd02bb9ec0ff28d",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 1, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConcave",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[102]).toMatchObject({
      sha256: "1904903496c807bd0e068a446b87f2ad1a496f48d24e2b2e451693c108e65898",
      battler1: {
        data: [1, 1, 51, 0, 0, 0, 0, 0],
        callbackSymbol: "SwingConcave",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[103]).toMatchObject({
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 52, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames.at(-1)).toMatchObject({
      sha256: "44174f4cde1de09ad7627602fa1123eeab5020942f57ad5e7878e5748156a258",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 174, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
