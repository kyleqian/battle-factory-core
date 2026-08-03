import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  GLOW_BLUE_FACTORY_FRONT_SPECIES,
  GLOW_BLUE_FRONT_SPECIES,
  GLOW_BLUE_OUTSIDE_FACTORY_FRONT_SPECIES,
  glowBlueFrameAtTick,
  speciesFrontIdleRestOffset,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-milotic.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-milotic-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-milotic-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_GLOW_BLUE";
const BLUE = 0x7c00;

function blendChannel(source: number, target: number, coefficient: number): number {
  return source + (((target - source) * coefficient) >> 4);
}

/** Source-order `BlendPalette` port for the receipt's 15-bit color entries. */
function blendPalette(unfaded: readonly number[], coefficient: number): number[] {
  const targetR = BLUE & 0x1f;
  const targetG = (BLUE >> 5) & 0x1f;
  const targetB = (BLUE >> 10) & 0x1f;
  return unfaded.map((color) => {
    const red = blendChannel(color & 0x1f, targetR, coefficient);
    const green = blendChannel((color >> 5) & 0x1f, targetG, coefficient);
    const blue = blendChannel((color >> 10) & 0x1f, targetB, coefficient);
    return red | (green << 5) | (blue << 10);
  });
}

describe("ANIM_GLOW_BLUE Scene-ON evidence", () => {
  it("pins selector 34 (not adjacent red selector 33), its direct dispatch, source order, delay, and census", () => {
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const pokemonSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
      "utf8",
    );
    const frontPicSource = readFileSync(
      new URL("../../reference/pokeemerald/src/data/pokemon_graphics/front_pic_anims.h", import.meta.url),
      "utf8",
    );
    const paletteSource = readFileSync(
      new URL("../../reference/pokeemerald/src/util.c", import.meta.url),
      "utf8",
    );
    const paletteHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/palette.h", import.meta.url),
      "utf8",
    );
    const rgbHeader = readFileSync(
      new URL("../../reference/pokeemerald/include/constants/rgb.h", import.meta.url),
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

    expect(constants).toMatch(/^#define ANIM_GLOW_ORANGE\s+32$/m);
    expect(constants).toMatch(/^#define ANIM_GLOW_RED\s+33$/m);
    expect(constants).toMatch(/^#define ANIM_GLOW_BLUE\s+34$/m);
    expect(constants).toMatch(/^#define ANIM_GLOW_YELLOW\s+35$/m);
    expect(rgbHeader).toMatch(/^#define RGB_BLUE\s+RGB\(0, 0, 31\)$/m);
    expect(0 | (0 << 5) | (31 << 10)).toBe(BLUE);
    expect(paletteHeader).toMatch(/^#define OBJ_PLTT_ID\(n\) \(OBJ_PLTT_OFFSET \+ PLTT_ID\(n\)\)$/m);
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(spriteHeader).toMatch(/\/\*0x2C\*\/ u8 animDelayCounter:6;/);
    expect(spriteHeader).toMatch(/animEnded:1;/);
    expect(gbaTypesHeader).toMatch(/u16 paletteNum:4;/);

    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_MILOTIC - 1\]\s*= ANIM_GLOW_BLUE,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_GLOW_BLUE]                         = Anim_GlowBlue,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf("[ANIM_GLOW_RED]"));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_GLOW_YELLOW]"));

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );
    expect(task).toMatch(
      /if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );

    const glowStart = animationSource.indexOf("#define GlowColor(color, colorIncrement, speed)");
    const glowEnd = animationSource.indexOf("static void Anim_HorizontalStretch", glowStart);
    const glow = animationSource.slice(glowStart, glowEnd);
    const macroOrder = [
      glow.indexOf("if (sprite->data[2] == 0)"),
      glow.indexOf("sprite->data[7] = OBJ_PLTT_ID(sprite->oam.paletteNum);"),
      glow.indexOf("if (sprite->data[2] > 128)"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, 0, (color));"),
      glow.indexOf("sprite->callback = WaitAnimEnd;"),
      glow.indexOf("sprite->data[6] = Sin(sprite->data[2], (colorIncrement));"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, sprite->data[6], (color));"),
      glow.indexOf("sprite->data[2] += (speed);"),
    ];
    expect(macroOrder.every((position) => position >= 0)).toBe(true);
    expect(macroOrder).toEqual([...macroOrder].sort((a, b) => a - b));
    expect(paletteSource).toMatch(
      /void BlendPalette\(u16 palOffset, u16 numEntries, u8 coeff, u16 blendColor\)[\s\S]*?gPlttBufferFaded\[index\] = RGB\(r \+ \(\(\(data2->r - r\) \* coeff\) >> 4\),[\s\S]*?g \+ \(\(\(data2->g - g\) \* coeff\) >> 4\),[\s\S]*?b \+ \(\(\(data2->b - b\) \* coeff\) >> 4\)\);/,
    );

    const blueStart = animationSource.indexOf("static void Anim_GlowBlue(struct Sprite *sprite)\n{");
    const blueEnd = animationSource.indexOf("static void Anim_GlowYellow", blueStart);
    const blue = animationSource.slice(blueStart, blueEnd);
    expect(blue).toContain("GlowColor(RGB_BLUE, 12, 2);");
    expect(blue).not.toContain("AddNewAnim");
    expect(blue).not.toContain("TryFlipX");
    expect(animationSource).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );

    const delayStart = pokemonSource.indexOf("static const u8 sMonAnimationDelayTable[NUM_SPECIES - 1]");
    const delayEnd = pokemonSource.indexOf("};", delayStart);
    const delayTable = pokemonSource.slice(delayStart, delayEnd);
    expect(delayTable).toMatch(/^\s*\[SPECIES_MILOTIC - 1\]\s*= 45,$/m);
    const delayTaskStart = pokemonSource.indexOf("static void Task_AnimateAfterDelay(u8 taskId)\n{");
    const delayTaskEnd = pokemonSource.indexOf("static void Task_PokemonSummaryAnimateAfterDelay", delayTaskStart);
    const delayTask = pokemonSource.slice(delayTaskStart, delayTaskEnd);
    expect(delayTask).toMatch(
      /if \(--gTasks\[taskId\]\.sAnimDelay == 0\)[\s\S]*?LaunchAnimationTaskForFrontSprite\([\s\S]*?DestroyTask\(taskId\);/,
    );
    const frontStart = pokemonSource.indexOf("void DoMonFrontSpriteAnimation(");
    const frontEnd = pokemonSource.indexOf("void PokemonSummaryDoMonAnimation", frontStart);
    const front = pokemonSource.slice(frontStart, frontEnd);
    expect(front).toMatch(
      /StartSpriteAnim\(sprite, 1\);[\s\S]*?sMonAnimationDelayTable\[species - 1\][\s\S]*?CreateTask\(Task_AnimateAfterDelay, 0\);[\s\S]*?gTasks\[taskId\]\.sAnimId = sMonFrontAnimIdsTable\[species - 1\];[\s\S]*?gTasks\[taskId\]\.sAnimDelay = sMonAnimationDelayTable\[species - 1\];[\s\S]*?sprite->callback = SpriteCallbackDummy_2;/,
    );
    const miloticAnimStart = frontPicSource.indexOf("static const union AnimCmd sAnim_Milotic_1[] =");
    const miloticAnimEnd = frontPicSource.indexOf("static const union AnimCmd sAnim_Carvanha_1[] =", miloticAnimStart);
    const miloticAnim = frontPicSource.slice(miloticAnimStart, miloticAnimEnd);
    expect([...miloticAnim.matchAll(/ANIMCMD_FRAME\((\d), (\d+)\)/g)].map((match) => [
      Number(match[1]), Number(match[2]),
    ])).toEqual([
      [0, 15], [1, 15], [0, 15], [1, 15], [0, 15], [1, 15], [0, 15],
    ]);
    expect(miloticAnim).toContain("ANIMCMD_END");

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["MILOTIC"]);
    expect(GLOW_BLUE_FRONT_SPECIES).toEqual(generated);
    expect(GLOW_BLUE_FACTORY_FRONT_SPECIES).toEqual(["MILOTIC"]);
    expect(GLOW_BLUE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_RED");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_YELLOW");
    expect(Object.values(selectorTables.frontAnimIds.species)).not.toContain("ANIM_GLOW_PURPLE");
    expect(speciesFrontIdleRestOffset("MILOTIC")).toEqual({ x2: 0, y2: 0 });
    expect(speciesFrontIdleRestOffset("PIDGEOT")).toEqual({ x2: 0, y2: 0 });
  });

  it("pins MILOTIC_1's Factory source record inside complete legal Scene-ON parties", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_MILOTIC_1"))
      .toMatchObject({
        index: 463,
        species: "SPECIES_MILOTIC",
        moves: ["MOVE_HYDRO_PUMP", "MOVE_ICY_WIND", "MOVE_RECOVER", "MOVE_MIRROR_COAT"],
        itemTableId: 41,
        evSpread: 21,
        nature: "NATURE_MODEST",
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
    for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]).toEqual(expect.objectContaining({
      species: 329,
      level: 50,
      nature: 15,
      moves: [56, 196, 105, 243],
      ppUps: [0, 0, 0, 0],
      item: 141,
      abilitySlot: 0,
      friendship: 70,
      gender: "female",
      shiny: false,
    }));
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

  it("pins the byte-identical full active-to-dummy pair, reducer/RAM/palette/OAM facts, and RGB hashes", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-milotic-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-milotic-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(58643);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("29a28ccc3d39e04533a74065f5a561153d59899a5654966e452e3c9e98a9cfba");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "glow-blue-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 329,
      sourceSelector: SELECTOR,
      sourceId: 34,
      sourceAnimationDelay: 45,
      sourceWindow: { startFrame: 1660, endFrame: 1727, frameCount: 68 },
      callbackAddresses: {
        Anim_GlowBlue: 135793500,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(68);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 68 }, (_, index) => 1660 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      ...Array(66).fill("Anim_GlowBlue"),
      "WaitAnimEnd",
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(runA.callbackAddresses).sort()).toEqual([
      "Anim_GlowBlue",
      "SpriteCallbackDummy",
      "WaitAnimEnd",
    ]);
    expect(frames.map((row) => row.sha256)).toHaveLength(68);
    for (const row of frames) {
      expect(row.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(row.battler1.oam).toEqual(expect.objectContaining({
        matrix: [256, 0, 0, 256],
        affineMode: 1,
      }));
    }
    expect(frames[0]!.sha256).toBe("4a8d0f97d52d095bcd829a19b57b78f4fcb55f83c7ac39a2091a6e1c34e3ccbd");
    expect(frames[33]!.sha256).toBe("e92bae12719ce82e48d3e544c1bfb86df2fd6123ae3ac71681af5bb166cb937f");
    expect(frames[67]!.sha256).toBe("4a8d0f97d52d095bcd829a19b57b78f4fcb55f83c7ac39a2091a6e1c34e3ccbd");

    const initial = frames[0]!.battler1;
    expect(initial).toMatchObject({
      data: [0, 1, 0, 0, 0, 0, 0, 0],
      callback: "0x08180b5d",
      callbackSymbol: "Anim_GlowBlue",
      animNum: 1,
      animCmdIndex: 2,
      animDelayCounter: 0,
      animEnded: false,
      x2: 0,
      y2: 0,
      centerToCornerVecX: -32,
      centerToCornerVecY: -32,
      oam: { raw: "080190c4d9190000" },
      palette: { paletteNum: 1, start: 272 },
    });
    const originalPalette = initial.palette.unfaded;
    expect(initial.palette.faded).toEqual(originalPalette);
    expect(initial.palette.hardware).toEqual(originalPalette);

    for (let tick = 0; tick <= 64; tick += 1) {
      const model = glowBlueFrameAtTick(tick, 1)!;
      const row = frames[tick + 1]!.battler1;
      expect(row.x2, `callback ${tick} x2`).toBe(model.x2);
      expect(row.y2, `callback ${tick} y2`).toBe(model.y2);
      expect(row.data, `callback ${tick} registers`).toEqual([
        0, 1, model.data2, 0, 0, 0, model.data6, model.data7,
      ]);
      expect(row.callbackSymbol, `callback ${tick} symbol`).toBe(model.callback);
      expect(row.palette.paletteNum, `callback ${tick} palette num`).toBe(model.paletteNum);
      expect(row.palette.start, `callback ${tick} palette start`).toBe(model.paletteStart);
      expect(row.palette.unfaded, `callback ${tick} unfaded palette`).toEqual(originalPalette);
      expect(row.palette.faded, `callback ${tick} BlendPalette output`).toEqual(
        blendPalette(originalPalette, model.blendCoefficient),
      );
      expect(row.palette.hardware, `callback ${tick} hardware palette transfer`).toEqual(
        frames[tick]!.battler1.palette.faded,
      );
      expect(row.oam, `callback ${tick} OAM`).toEqual(initial.oam);
    }

    const terminalModel = glowBlueFrameAtTick(65, 1)!;
    const terminal = frames[66]!.battler1;
    expect(terminalModel.callback).toBe("WaitAnimEnd");
    expect(terminal).toMatchObject({
      data: [0, 1, terminalModel.data2, 0, 0, 0, terminalModel.data6, terminalModel.data7],
      callback: "0x08184d89",
      callbackSymbol: "WaitAnimEnd",
      animNum: 1,
      animCmdIndex: 6,
      animDelayCounter: 0,
      animEnded: true,
      x2: 0,
      y2: 0,
    });
    expect(terminal.palette.unfaded).toEqual(originalPalette);
    expect(terminal.palette.faded).toEqual(originalPalette);
    expect(terminal.palette.hardware).toEqual(frames[65]!.battler1.palette.faded);
    expect(terminal.oam).toEqual(initial.oam);

    const stable = frames[67]!.battler1;
    expect(stable).toMatchObject({
      data: [1, 0, 329, 0, 0, 0, 0, 272],
      callback: "0x08007429",
      callbackSymbol: "SpriteCallbackDummy",
      animNum: 1,
      animCmdIndex: 6,
      animDelayCounter: 0,
      animEnded: true,
      x2: 0,
      y2: 0,
    });
    expect(stable.palette.faded).toEqual(originalPalette);
    expect(stable.palette.hardware).toEqual(terminal.palette.faded);
    expect(stable.oam).toEqual(initial.oam);
  });
});
