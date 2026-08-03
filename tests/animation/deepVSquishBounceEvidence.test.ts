import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  DEEP_V_SQUISH_AND_BOUNCE_FACTORY_FRONT_SPECIES,
  DEEP_V_SQUISH_AND_BOUNCE_FRONT_SPECIES,
  DEEP_V_SQUISH_AND_BOUNCE_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import mukScenario from "../../tools/compare/fixtures/sendout-front-muk.json" with { type: "json" };
import wobbuffetScenario from "../../tools/compare/fixtures/sendout-front-wobbuffet.json" with { type: "json" };
import mukA from "../../tools/compare/fixtures/sendout-front-muk-run-a.json" with { type: "json" };
import mukB from "../../tools/compare/fixtures/sendout-front-muk-run-b.json" with { type: "json" };
import wobbuffetA from "../../tools/compare/fixtures/sendout-front-wobbuffet-run-a.json" with { type: "json" };
import wobbuffetB from "../../tools/compare/fixtures/sendout-front-wobbuffet-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_DEEP_V_SQUISH_AND_BOUNCE";

describe("ANIM_DEEP_V_SQUISH_AND_BOUNCE Scene-ON evidence", () => {
  it("pins selector 48, adjacent dispatch rows, and the complete census", () => {
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
    expect(constants).toMatch(/^#define ANIM_DEEP_V_SQUISH_AND_BOUNCE\s+48$/m);
    expect(constants).toMatch(/^#define ANIM_DEEP_V_SQUISH_AND_BOUNCE_TWICE\s+85$/m);
    const dispatch = animationSource.indexOf(
      "[ANIM_DEEP_V_SQUISH_AND_BOUNCE]          = Anim_DeepVerticalSquishBounce,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_ROTATE_UP_SLAM_DOWN]",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_H_JUMPS]"));
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_MUK - 1\]\s*= ANIM_DEEP_V_SQUISH_AND_BOUNCE,$/m,
    );
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_WOBBUFFET - 1\]\s*= ANIM_DEEP_V_SQUISH_AND_BOUNCE,$/m,
    );

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["MUK", "WOBBUFFET"]);
    expect(DEEP_V_SQUISH_AND_BOUNCE_FRONT_SPECIES).toEqual(generated);
    expect(DEEP_V_SQUISH_AND_BOUNCE_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(DEEP_V_SQUISH_AND_BOUNCE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
  });

  it("pins the source initializer, reducer phases, arithmetic, and cleanup", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const reducerStart = source.indexOf("static void DeepVerticalSquishBounce(struct Sprite *sprite)\n{");
    const initializerStart = source.indexOf("static void Anim_DeepVerticalSquishBounce(struct Sprite *sprite)\n{");
    const twiceStart = source.indexOf("static void Anim_DeepVerticalSquishBounce_Twice(struct Sprite *sprite)\n{");
    expect(reducerStart).toBeGreaterThan(0);
    expect(initializerStart).toBeGreaterThan(reducerStart);
    expect(twiceStart).toBeGreaterThan(initializerStart);
    const reducer = source.slice(reducerStart, initializerStart);
    const initializer = source.slice(initializerStart, twiceStart);
    expect(initializer).toContain("sAnims[id].rotation = 4;");
    expect(initializer).toContain("DeepVerticalSquishBounce(sprite);");
    expect(initializer).toContain("sprite->callback = DeepVerticalSquishBounce;");
    expect(reducer).toContain("sAnims[sprite->data[0]].delay--;");
    expect(reducer).toContain("HandleStartAffineAnim(sprite);");
    expect(reducer).toContain("sprite->data[7] = Sin(sprite->data[4], 256);");
    expect(reducer).toContain("sprite->y2 = Sin(sprite->data[4], 16);");
    expect(reducer).toContain("sprite->data[6] = Sin(sprite->data[4], 32);");
    expect(reducer).toContain("sprite->data[7] = Sin(sprite->data[4], 32);");
    expect(reducer).toContain("sprite->y2 = -(Sin(sprite->data[4], 8));");
    expect(reducer).toContain("sprite->data[6] = Sin(sprite->data[4], 128);");
    expect(reducer).toContain("if (sprite->data[4] == 128)");
    expect(reducer).toContain("sAnims[sprite->data[0]].runs--;");
    expect(reducer).toContain("sAnims[sprite->data[0]].delay = 10;");
    expect(reducer).toContain("HandleSetAffineData(sprite, 256, 256, 0);");
    expect(reducer).toContain("ResetSpriteAfterAnim(sprite);");
    expect(reducer).toContain("sprite->callback = WaitAnimEnd;");
    expect(reducer).toContain("sprite->data[4] += sAnims[sprite->data[0]].rotation;");
  });

  it.each([
    ["MUK", mukScenario],
    ["WOBBUFFET", wobbuffetScenario],
  ] as const)("pins a complete legal Scene-ON %s party and dense capture request", (species, scenario) => {
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
    expect(scenario.overrides.parties.opponent[0]!.species).toBe(
      species === "MUK" ? 89 : 202,
    );
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

  it.each([
    ["MUK", mukA, mukB, 67, 31103, "fa36e420297d624604ee3ef267eb801141f7c1bfb56876e80fb72eb149700812", 1],
    ["WOBBUFFET", wobbuffetA, wobbuffetB, 87, 39736, "efa85c119ebbd5c8e497e558e8f26e5394fbe04dac99b9188e9beeea6592073e", 21],
  ] as const)("pins byte-identical dense Scene-ON receipts for %s", (
    species, receiptA, receiptB, frameCount, byteLength, sha256, waitCount,
  ) => {
    const fileA = readFileSync(new URL(
      `${FIXTURES}sendout-front-${species.toLowerCase()}-run-a.json`, import.meta.url,
    ));
    const fileB = readFileSync(new URL(
      `${FIXTURES}sendout-front-${species.toLowerCase()}-run-b.json`, import.meta.url,
    ));
    expect(fileA.equals(fileB)).toBe(true);
    expect(fileA).toHaveLength(byteLength);
    expect(createHash("sha256").update(fileA).digest("hex")).toBe(sha256);
    expect(receiptA).toEqual(receiptB);
    expect(receiptA).toMatchObject({
      schema: "deep-v-squish-bounce-scene-on-dense/v1",
      profile: "battle-scene-on",
      sourceSelector: SELECTOR,
      sourceId: 48,
      sourceWindow: { frameCount },
    });
    const frames = receiptA.frames;
    expect(frames).toHaveLength(frameCount);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: frameCount }, (_, index) => frames[0]!.frame + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_DeepVerticalSquishBounce",
      ...Array(64).fill("DeepVerticalSquishBounce"),
      ...Array(waitCount).fill("WaitAnimEnd"),
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(receiptA.callbackAddresses).sort()).toEqual([
      "Anim_DeepVerticalSquishBounce",
      "DeepVerticalSquishBounce",
      "SpriteCallbackDummy",
      "WaitAnimEnd",
    ]);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler1.oam).toEqual(expect.objectContaining({
        matrix: expect.any(Array),
        affineMode: expect.any(Number),
      }));
    }
    expect(frames[0]!.battler1).toMatchObject({
      data: [0, 1, 0, 0, 0, 0, 0, 0],
      oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    });
    expect(frames[1]!.battler1).toMatchObject({
      data: [1, 1, 1, 0, 4, 0, 0, 0],
      oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
    });
    expect(frames[2]!.battler1).toMatchObject({
      data: [1, 1, 1, 0, 8, 0, 3, 25],
      y2: 1,
      oam: { affineMode: 3, matrix: [253, 0, 0, 281] },
    });
    expect(frames[33]!.battler1).toMatchObject({
      callbackSymbol: "DeepVerticalSquishBounce",
      data: [1, 1, 1, 0, 4, 1, 0, 0],
      oam: { matrix: [256, 0, 0, 256] },
    });
    expect(frames[34]!.battler1).toMatchObject({
      data: [1, 1, 1, 0, 8, 1, 12, 3],
      y2: 0,
      oam: { matrix: [268, 0, 0, 253] },
    });
    const waitRows = frames.filter((row) => row.battler1.callbackSymbol === "WaitAnimEnd");
    expect(waitRows).toHaveLength(waitCount);
    for (const row of waitRows) {
      expect(row.battler1).toMatchObject({
        x2: 0,
        y2: 0,
        data: [1, 1, 1, 0, 132, 1, 0, 0],
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      });
    }
    expect(frames.at(-1)!.battler1).toMatchObject({
      callbackSymbol: "SpriteCallbackDummy",
      x2: 0,
      y2: 0,
      data: [1, 0, species === "MUK" ? 89 : 202, 0, 132, 1, 0, 0],
      oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    });
  });
});
