import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GBA_SINE_TABLE_256 } from "../../src/engine/battleMenu.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  FRONT_FLIP_FACTORY_FRONT_SPECIES,
  FRONT_FLIP_FRONT_SPECIES,
  FRONT_FLIP_OUTSIDE_FACTORY_FRONT_SPECIES,
  frontFlipFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-pidgeot.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-pidgeot-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-pidgeot-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_FRONT_FLIP";

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

describe("ANIM_FRONT_FLIP Scene-ON evidence", () => {
  it("pins selector 41, direct no-delay dispatch, PIDGEOT's picture program, and adjacent controls", () => {
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
    const frontPicSource = readFileSync(
      new URL("../../reference/pokeemerald/src/data/pokemon_graphics/front_pic_anims.h", import.meta.url),
      "utf8",
    );

    expect(constants).toMatch(/^#define ANIM_BACK_FLIP_BIG\s+40$/m);
    expect(constants).toMatch(/^#define ANIM_FRONT_FLIP\s+41$/m);
    expect(constants).toMatch(/^#define ANIM_TUMBLING_FRONT_FLIP\s+42$/m);
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_PIDGEOT - 1\]\s*= ANIM_FRONT_FLIP,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_FRONT_FLIP]                        = Anim_FrontFlip,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf("[ANIM_BACK_FLIP_BIG]"));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_TUMBLING_FRONT_FLIP]"));

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /gTasks\[taskId\]\.tBattlerId = sprite->data\[0\];[\s\S]*?gTasks\[taskId\]\.tSpeciesId = sprite->data\[2\];[\s\S]*?sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );
    expect(task).toMatch(
      /if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );

    const frontStart = pokemonSource.indexOf("void DoMonFrontSpriteAnimation(");
    const frontEnd = pokemonSource.indexOf("void PokemonSummaryDoMonAnimation", frontStart);
    const front = pokemonSource.slice(frontStart, frontEnd);
    const delayStart = pokemonSource.indexOf("static const u8 sMonAnimationDelayTable[NUM_SPECIES - 1]");
    const delayEnd = pokemonSource.indexOf("};", delayStart);
    const delayTable = pokemonSource.slice(delayStart, delayEnd);
    expect(delayTable).not.toMatch(/^\s*\[SPECIES_PIDGEOT - 1\]\s*=/m);
    expect(front).toMatch(
      /if \(HasTwoFramesAnimation\(species\)\)[\s\S]*?StartSpriteAnim\(sprite, 1\);[\s\S]*?if \(sMonAnimationDelayTable\[species - 1\] != 0\)[\s\S]*?CreateTask\(Task_AnimateAfterDelay, 0\);[\s\S]*?else[\s\S]*?LaunchAnimationTaskForFrontSprite\(sprite, sMonFrontAnimIdsTable\[species - 1\]\);[\s\S]*?sprite->callback = SpriteCallbackDummy_2;/,
    );
    const hasTwoFramesStart = pokemonSource.indexOf("bool8 HasTwoFramesAnimation(u16 species)\n{");
    const hasTwoFramesEnd = pokemonSource.indexOf("static bool8 ShouldSkipFriendshipChange", hasTwoFramesStart);
    const hasTwoFrames = pokemonSource.slice(hasTwoFramesStart, hasTwoFramesEnd);
    expect(hasTwoFrames).toContain("species != SPECIES_CASTFORM");
    expect(hasTwoFrames).not.toContain("SPECIES_PIDGEOT");

    const pidgeotAnimStart = frontPicSource.indexOf("static const union AnimCmd sAnim_Pidgeot_1[] =");
    const pidgeotAnimEnd = frontPicSource.indexOf("static const union AnimCmd sAnim_Rattata_1[] =", pidgeotAnimStart);
    const pidgeotAnim = frontPicSource.slice(pidgeotAnimStart, pidgeotAnimEnd);
    expect([...pidgeotAnim.matchAll(/ANIMCMD_FRAME\((\d), (\d+)\)/g)].map((match) => [
      Number(match[1]), Number(match[2]),
    ])).toEqual([
      [1, 20], [0, 10], [1, 15], [0, 1],
    ]);
    expect(pidgeotAnim).toContain("ANIMCMD_END");

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["PIDGEOT"]);
    expect(FRONT_FLIP_FRONT_SPECIES).toEqual(generated);
    expect(FRONT_FLIP_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(FRONT_FLIP_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(selectorTables.frontAnimIds.species.PIDGEOTTO).toBe("ANIM_V_STRETCH");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_BACK_FLIP_BIG");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_TUMBLING_FRONT_FLIP");
    expect(selectorTables.speciesToBackAnimSet.species.PIDGEOT).toBe("BACK_ANIM_TRIANGLE_DOWN");
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
    expect(speciesFrontIdleRestOffset("PIDGEOT")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins callback order, s16 writes, OAM affine state, and WaitAnimEnd's terminal dummy", () => {
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

    const frontFlipStart = source.indexOf("static void Anim_FrontFlip(struct Sprite *sprite)\n{");
    const frontFlipEnd = source.indexOf("static void TumblingFrontFlip(struct Sprite *sprite);", frontFlipStart);
    const frontFlip = source.slice(frontFlipStart, frontFlipEnd);
    expect(frontFlipStart).toBeGreaterThan(0);
    expect(frontFlipEnd).toBeGreaterThan(frontFlipStart);
    const animStart = frontFlip.indexOf("static void Anim_FrontFlip(struct Sprite *sprite)\n{");
    const f0Start = frontFlip.indexOf("static void FrontFlip_0(struct Sprite *sprite)\n{");
    const f1Start = frontFlip.indexOf("static void FrontFlip_1(struct Sprite *sprite)\n{");
    const f2Start = frontFlip.indexOf("static void FrontFlip_2(struct Sprite *sprite)\n{");
    const anim = frontFlip.slice(animStart, f0Start);
    const f0 = frontFlip.slice(f0Start, f1Start);
    const f1 = frontFlip.slice(f1Start, f2Start);
    const f2 = frontFlip.slice(f2Start);
    expect(anim).toMatch(/HandleStartAffineAnim\(sprite\);[\s\S]*?sprite->callback = FrontFlip_0;/);
    expect(f0).toMatch(
      /TryFlipX\(sprite\);[\s\S]*?sprite->x2\+\+;[\s\S]*?sprite->y2--;[\s\S]*?if \(sprite->x2 > 15\)[\s\S]*?sprite->data\[2\] = 0;[\s\S]*?sprite->callback = FrontFlip_1;[\s\S]*?TryFlipX\(sprite\);/,
    );
    expect(f1).toMatch(
      /TryFlipX\(sprite\);[\s\S]*?sprite->data\[2\] \+= 16;[\s\S]*?if \(sprite->x2 <= -16\)[\s\S]*?sprite->x2 = -16;[\s\S]*?sprite->y2 = 16;[\s\S]*?sprite->data\[2\] = 0;[\s\S]*?sprite->callback = FrontFlip_2;[\s\S]*?else[\s\S]*?sprite->x2 -= 2;[\s\S]*?sprite->y2 \+= 2;[\s\S]*?HandleSetAffineData\(sprite, 256, 256, sprite->data\[2\] << 8\);[\s\S]*?TryFlipX\(sprite\);/,
    );
    expect(f2).toMatch(
      /TryFlipX\(sprite\);[\s\S]*?sprite->x2\+\+;[\s\S]*?sprite->y2--;[\s\S]*?if \(sprite->x2 >= 0\)[\s\S]*?sprite->x2 = 0;[\s\S]*?sprite->y2 = 0;[\s\S]*?ResetSpriteAfterAnim\(sprite\);[\s\S]*?sprite->callback = WaitAnimEnd;[\s\S]*?TryFlipX\(sprite\);/,
    );
    expect([...frontFlip.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(6);

    const startAffineStart = source.indexOf("static void HandleStartAffineAnim(struct Sprite *sprite)\n{");
    const setAffineStart = source.indexOf("static void HandleSetAffineData", startAffineStart);
    const resetStart = source.indexOf("static void ResetSpriteAfterAnim(struct Sprite *sprite)\n{");
    const resetEnd = source.indexOf("static void Anim_CircularStretchTwice", resetStart);
    const startAffine = source.slice(startAffineStart, setAffineStart);
    const setAffine = source.slice(setAffineStart, source.indexOf("static void TryFlipX", setAffineStart));
    const reset = source.slice(resetStart, resetEnd);
    expect(startAffine).toMatch(
      /sprite->oam\.affineMode = ST_OAM_AFFINE_DOUBLE;[\s\S]*?if \(!sprite->sDontFlip\)[\s\S]*?StartSpriteAffineAnim\(sprite, 1\);[\s\S]*?else[\s\S]*?StartSpriteAffineAnim\(sprite, 0\);[\s\S]*?sprite->affineAnimPaused = TRUE;/,
    );
    expect(setAffine).toMatch(
      /if \(!sprite->sDontFlip\)[\s\S]*?xScale \*= -1;[\s\S]*?rotation \*= -1;[\s\S]*?SetAffineData\(sprite, xScale, yScale, rotation\);/,
    );
    expect(reset).toMatch(
      /sprite->oam\.affineMode = ST_OAM_AFFINE_NORMAL;[\s\S]*?CalcCenterToCornerVec\(sprite, sprite->oam\.shape, sprite->oam\.size, sprite->oam\.affineMode\);/,
    );
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
  });

  it("pins PIDGEOT_1's Factory record inside complete legal Scene-ON parties", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_PIDGEOT_1"))
      .toMatchObject({
        index: 250,
        species: "SPECIES_PIDGEOT",
        moves: ["MOVE_AERIAL_ACE", "MOVE_FEATHER_DANCE", "MOVE_MUD_SLAP", "MOVE_FAINT_ATTACK"],
        itemTableId: 23,
        evSpread: 3,
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
      species: 18,
      level: 50,
      nature: 0,
      moves: [332, 297, 189, 185],
      ppUps: [0, 0, 0, 0],
      item: 210,
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
      expect(Object.values(mon.evs).reduce((total, value) => total + value, 0)).toBeLessThanOrEqual(510);
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

  it("pins a byte-identical full active-to-dummy pair, every reducer/RAM/OAM frame, and framebuffer hashes", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-pidgeot-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-pidgeot-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(23468);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("fe5a38bcddffb556d221ace425473006cc52d3b8f89acc1b5d0c951bd8f51b1b");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "front-flip-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 18,
      sourceSelector: SELECTOR,
      sourceId: 41,
      sourceAnimationDelay: 0,
      frontPictureProgram: [[1, 20], [0, 10], [1, 15], [0, 1]],
      sourceWindow: { startFrame: 1616, endFrame: 1667, frameCount: 52 },
      callbackAddresses: {
        Anim_FrontFlip: 135794936,
        FrontFlip_0: 135794960,
        FrontFlip_1: 135795012,
        FrontFlip_2: 135795108,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(52);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 52 }, (_, index) => 1616 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_FrontFlip",
      ...Array(16).fill("FrontFlip_0"),
      ...Array(17).fill("FrontFlip_1"),
      ...Array(16).fill("FrontFlip_2"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(runA.callbackAddresses).sort()).toEqual([
      "Anim_FrontFlip",
      "FrontFlip_0",
      "FrontFlip_1",
      "FrontFlip_2",
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
      sha256: "e7f67f58ffd926c29daa0e1aca2638476e4f512f2be1ca109cceb8a197c653cd",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        animNum: 1,
        animCmdIndex: 0,
        callbackSymbol: "Anim_FrontFlip",
        centerToCornerVecX: -32,
        centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= 49; tick += 1) {
      const model = frontFlipFrameAtTick(tick)!;
      const row = frames[tick + 1]!.battler1;
      const rotation = model.affineRotationU16;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
        oam: {
          affineMode: model.affineMode === "double" ? 3 : 1,
          matrix: rotation === null ? [256, 0, 0, 256] : affineMatrix(rotation),
        },
      });
    }
    expect(frames[18]).toMatchObject({
      sha256: "3b558448c2f6533c0979f7b4a44d2c1e2296785b0fb01e187f37e49d9e419678",
      battler1: {
        x2: 14,
        y2: -14,
        data: [0, 1, 16, 0, 0, 0, 0, 0],
        oam: { matrix: [236, -97, 97, 236] },
      },
    });
    expect(frames[33]).toMatchObject({
      sha256: "aaae77766b06192890c7d347f7a26aaefa4eec5a8d52f37b1f1f602956a032be",
      battler1: {
        x2: -16,
        y2: 16,
        data: [0, 1, 256, 0, 0, 0, 0, 0],
        callbackSymbol: "FrontFlip_1",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[34]).toMatchObject({
      sha256: "85feeabd483520e51deb832fadb92cd05cde4a25a9895d3abd260edc4966e142",
      battler1: {
        x2: -16,
        y2: 16,
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "FrontFlip_2",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[50]).toMatchObject({
      sha256: "7ea55c6b91e0547cf9e8d97fa22c1ebc01edeac02a0a68e8d8eaa23cd6065732",
      battler1: {
        x2: 0,
        y2: 0,
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        animNum: 1,
        animCmdIndex: 3,
        callbackSymbol: "WaitAnimEnd",
        centerToCornerVecX: -32,
        centerToCornerVecY: -32,
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[51]).toMatchObject({
      sha256: "2fc8fbdc61894a201c01ace6d7df4bee2f72c6eec530fbd5c70071d148c390bc",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 18, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
