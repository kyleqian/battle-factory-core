import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  H_PIVOT_FACTORY_FRONT_SPECIES,
  H_PIVOT_FRONT_SPECIES,
  H_PIVOT_OUTSIDE_FACTORY_FRONT_SPECIES,
  horizontalPivotFrameAtTick,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-wingull.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-wingull-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-wingull-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_H_PIVOT";

function gbaSin(index: number, amplitude: number): number {
  return Math.floor((amplitude * GBA_SINE_TABLE_256[index & 0xff]!) / 256);
}

function affineMatrix(rotationU16: number): [number, number, number, number] {
  const angle = (rotationU16 >>> 8) & 0xff;
  const sine = gbaSin(angle, 256);
  const cosine = gbaSin(angle + 64, 256);
  // GBA signed matrix entries do not preserve JS's distinct negative zero.
  return [cosine, -sine + 0, sine, cosine];
}

describe("ANIM_H_PIVOT Scene-ON evidence", () => {
  it("pins selector 27, direct dispatch, WINGULL/DEOXYS census, and adjacent controls", () => {
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
    expect(constants).toMatch(/^#define ANIM_TIP_MOVE_FORWARD\s+26$/m);
    expect(constants).toMatch(/^#define ANIM_H_PIVOT\s+27$/m);
    expect(constants).toMatch(/^#define ANIM_V_SLIDE_WOBBLE\s+28$/m);
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_WINGULL - 1\]\s*= ANIM_H_PIVOT,$/m,
    );
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_DEOXYS - 1\]\s*= ANIM_H_PIVOT,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_H_PIVOT]                           = Anim_HorizontalPivot,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf("[ANIM_TIP_MOVE_FORWARD]"));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_V_SLIDE_WOBBLE]"));

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["WINGULL", "DEOXYS"]);
    expect(H_PIVOT_FRONT_SPECIES).toEqual(generated);
    expect(H_PIVOT_FACTORY_FRONT_SPECIES).toEqual(["WINGULL"]);
    expect(H_PIVOT_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual(["DEOXYS"]);
    expect(generated.filter((species) => factory.has(species))).toEqual(["WINGULL"]);
    expect(generated.filter((species) => !factory.has(species))).toEqual(["DEOXYS"]);
    expect(selectorTables.frontAnimIds.species.RELICANTH).toBe("ANIM_TIP_MOVE_FORWARD");
    expect(selectorTables.frontAnimIds.species.CHIMECHO).toBe("ANIM_H_SLIDE_WOBBLE");
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
  });

  it("pins task setup, the source callback's exact order, no TryFlipX, affine geometry, and teardown", () => {
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
      /gTasks\[taskId\]\.tBattlerId = sprite->data\[0\];[\s\S]*?gTasks\[taskId\]\.tSpeciesId = sprite->data\[2\];[\s\S]*?sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );
    expect(task).toMatch(
      /if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );

    const pivotStart = source.indexOf("static void Anim_HorizontalPivot(struct Sprite *sprite)\n{");
    const nextStart = source.indexOf("static void VerticalSlideWobble(struct Sprite *sprite)\n{", pivotStart);
    const pivot = source.slice(pivotStart, nextStart);
    expect(pivotStart).toBeGreaterThan(0);
    expect(nextStart).toBeGreaterThan(pivotStart);
    const order = [
      pivot.indexOf("if (sprite->data[2] == 0)"),
      pivot.indexOf("HandleStartAffineAnim(sprite);"),
      pivot.indexOf("if (sprite->data[2] > 100)"),
      pivot.indexOf("HandleSetAffineData(sprite, 256, 256, 0);"),
      pivot.indexOf("sprite->y2 = 0;"),
      pivot.indexOf("ResetSpriteAfterAnim(sprite);"),
      pivot.indexOf("sprite->callback = WaitAnimEnd;"),
      pivot.indexOf("s16 index = (sprite->data[2] * 256) / 100;"),
      pivot.indexOf("sprite->y2 = Sin(index, 10);"),
      pivot.indexOf("HandleSetAffineData(sprite, 256, 256, Sin(index, 3276));"),
      pivot.indexOf("sprite->data[2]++;"),
    ];
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect([...pivot.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(0);

    const startAffineStart = source.indexOf(
      "static void HandleStartAffineAnim(struct Sprite *sprite)\n{",
    );
    const setAffineStart = source.indexOf("static void HandleSetAffineData", startAffineStart);
    const resetStart = source.indexOf("static void ResetSpriteAfterAnim(struct Sprite *sprite)\n{");
    const resetEnd = source.indexOf("static void Anim_CircularStretchTwice", resetStart);
    expect(startAffineStart).toBeGreaterThan(0);
    expect(setAffineStart).toBeGreaterThan(startAffineStart);
    expect(resetStart).toBeGreaterThan(setAffineStart);
    expect(resetEnd).toBeGreaterThan(resetStart);
    const startAffine = source.slice(startAffineStart, setAffineStart);
    const reset = source.slice(resetStart, resetEnd);
    expect(startAffine).toMatch(
      /sprite->oam\.affineMode = ST_OAM_AFFINE_DOUBLE;[\s\S]*?CalcCenterToCornerVec\(sprite, sprite->oam\.shape, sprite->oam\.size, sprite->oam\.affineMode\);/,
    );
    expect(reset).toMatch(
      /sprite->oam\.affineMode = ST_OAM_AFFINE_NORMAL;[\s\S]*?CalcCenterToCornerVec\(sprite, sprite->oam\.shape, sprite->oam\.size, sprite->oam\.affineMode\);/,
    );
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
  });

  it("pins WINGULL's real Factory set inside complete legal Scene-ON parties", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_WINGULL"))
      .toMatchObject({
        index: 45,
        species: "SPECIES_WINGULL",
        moves: ["MOVE_WATER_PULSE", "MOVE_FLY", "MOVE_QUICK_ATTACK", "MOVE_STEEL_WING"],
        itemTableId: 7,
        evSpread: 17,
        nature: "NATURE_HARDY",
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
      species: 309,
      level: 50,
      nature: 0,
      moves: [352, 19, 98, 211],
      ppUps: [0, 0, 0, 0],
      item: 140,
      abilitySlot: 0,
      friendship: 70,
      gender: "male",
      shiny: false,
    });
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

  it("pins the byte-identical active-to-dummy pair, every reducer/RAM/OAM frame, and raw framebuffer hashes", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-wingull-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-wingull-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(47483);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("b709b5f8831cf086234a1e578ddb6b32bc0732b21efc248d41c0dbd7167d8e63");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "horizontal-pivot-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 309,
      sourceSelector: SELECTOR,
      sourceId: 27,
      sourceWindow: { startFrame: 1616, endFrame: 1719, frameCount: 104 },
      callbackAddresses: {
        Anim_HorizontalPivot: 135791732,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(104);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 104 }, (_, index) => 1616 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      ...Array(102).fill("Anim_HorizontalPivot"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(runA.callbackAddresses).sort()).toEqual([
      "Anim_HorizontalPivot",
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

    expect(frames[0]).toMatchObject({
      sha256: "157cc02db82d9bd7e22524f571b0c39f09529840afc1c083f61016a4224373e0",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_HorizontalPivot",
        centerToCornerVecX: -32,
        centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= 101; tick += 1) {
      const model = horizontalPivotFrameAtTick(tick)!;
      const row = frames[tick + 1]!.battler1;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
        oam: {
          affineMode: model.affineMode === "double" ? 3 : 1,
          matrix: affineMatrix(model.affineRotationU16),
        },
      });
    }
    expect(frames[26]).toMatchObject({
      sha256: "d5056b4cd7df68c3eafa52195545835ee1c62759019c97d1b354ad977707ff31",
      battler1: { y2: 10, data: [0, 1, 26, 0, 0, 0, 0, 0], oam: { matrix: [244, -74, 74, 244] } },
    });
    expect(frames[51]).toMatchObject({
      sha256: "21ec203efe874e1ee088b46408cfde90f2e4cc752993b5a8e8fbb58161c3201f",
      battler1: { y2: 0, data: [0, 1, 51, 0, 0, 0, 0, 0], oam: { matrix: [256, 0, 0, 256] } },
    });
    expect(frames[76]).toMatchObject({
      sha256: "94860ffe7c6accdb67fc5278680bdc416618db0266008b802ee3b3a5263f02bf",
      battler1: { y2: -10, data: [0, 1, 76, 0, 0, 0, 0, 0], oam: { matrix: [243, 80, -80, 243] } },
    });
    expect(frames[101]).toMatchObject({
      sha256: "c397b27b59f5a20348a739c2834b8b14e293dcf7f8796aa7d3c061abe7924835",
      battler1: { y2: 0, data: [0, 1, 101, 0, 0, 0, 0, 0], oam: { affineMode: 3, matrix: [256, 0, 0, 256] } },
    });
    expect(frames[102]).toMatchObject({
      sha256: "21ec203efe874e1ee088b46408cfde90f2e4cc752993b5a8e8fbb58161c3201f",
      battler1: {
        x2: 0,
        y2: 0,
        data: [0, 1, 102, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
        centerToCornerVecX: -32,
        centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames.at(-1)).toMatchObject({
      sha256: "21ec203efe874e1ee088b46408cfde90f2e4cc752993b5a8e8fbb58161c3201f",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 309, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
