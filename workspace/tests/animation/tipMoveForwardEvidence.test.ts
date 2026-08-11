import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  tipMoveForwardFrameAtTick,
  TIP_MOVE_FORWARD_FACTORY_FRONT_SPECIES,
  TIP_MOVE_FORWARD_FRONT_SPECIES,
  TIP_MOVE_FORWARD_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-relicanth.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-relicanth-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-relicanth-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_TIP_MOVE_FORWARD";

describe("ANIM_TIP_MOVE_FORWARD Scene-ON evidence", () => {
  it("pins selector 26, direct dispatch, its complete census, and adjacent controls", () => {
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
    expect(constants).toMatch(/^#define ANIM_V_SHAKE_TWICE\s+25$/m);
    expect(constants).toMatch(/^#define ANIM_TIP_MOVE_FORWARD\s+26$/m);
    expect(constants).toMatch(/^#define ANIM_H_PIVOT\s+27$/m);
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_RELICANTH - 1\]\s*= ANIM_TIP_MOVE_FORWARD,$/m,
    );
    const dispatch = animationSource.indexOf(
      "[ANIM_TIP_MOVE_FORWARD]                  = Anim_TipMoveForward,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_V_SHAKE_TWICE]",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_H_PIVOT]"));

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["RELICANTH"]);
    expect(TIP_MOVE_FORWARD_FRONT_SPECIES).toEqual(generated);
    expect(TIP_MOVE_FORWARD_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(TIP_MOVE_FORWARD_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(selectorTables.frontAnimIds.species.BLASTOISE).toBe("ANIM_V_SHAKE_TWICE");
    expect(Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_H_PIVOT"))
      .toEqual([
        ["WINGULL", "ANIM_H_PIVOT"],
        ["DEOXYS", "ANIM_H_PIVOT"],
      ]);
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain(SELECTOR);
  });

  it("pins Task_HandleMonAnimation setup, direct callback order, C arithmetic, and teardown", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const taskStart = source.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = source.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = source.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /gTasks\[taskId\]\.tBattlerId = sprite->data\[0\];[\s\S]*?gTasks\[taskId\]\.tSpeciesId = sprite->data\[2\];[\s\S]*?sprite->sDontFlip = TRUE;[\s\S]*?sprite->data\[0\] = 0;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );
    expect(task).toMatch(
      /if \(sprite->callback == SpriteCallbackDummy\)[\s\S]*?sprite->data\[0\] = gTasks\[taskId\]\.tBattlerId;[\s\S]*?sprite->data\[2\] = gTasks\[taskId\]\.tSpeciesId;[\s\S]*?sprite->data\[1\] = 0;/,
    );

    const initStart = source.indexOf("static bool32 InitAnimData(u8 id)\n{");
    const addStart = source.indexOf("static u8 AddNewAnim(void)\n{");
    const resetStart = source.indexOf("static void ResetSpriteAfterAnim", addStart);
    const init = source.slice(initStart, addStart);
    const add = source.slice(addStart, resetStart);
    expect(init).toMatch(/rotation = 0;[\s\S]*?delay = 0;[\s\S]*?runs = 1;[\s\S]*?speed = 0;[\s\S]*?data = 0;/);
    expect(add).toMatch(/sAnimIdx = \(sAnimIdx \+ 1\) % MAX_BATTLERS_COUNT;[\s\S]*?InitAnimData\(sAnimIdx\);/);

    const tipStart = source.indexOf("static void Anim_TipMoveForward(struct Sprite *sprite)\n{");
    const pivotStart = source.indexOf("static void Anim_HorizontalPivot", tipStart);
    const tip = source.slice(tipStart, pivotStart);
    expect(tip).toContain("u8 counter = 0;");
    const order = [
      tip.indexOf("TryFlipX(sprite);"),
      tip.indexOf("counter = sprite->data[2];"),
      tip.indexOf("if (sprite->data[2] == 0)"),
      tip.indexOf("HandleStartAffineAnim(sprite);"),
      tip.indexOf("if (sprite->data[2] > 35)"),
      tip.indexOf("HandleSetAffineData(sprite, 256, 256, 0);"),
      tip.indexOf("ResetSpriteAfterAnim(sprite);"),
      tip.indexOf("sprite->callback = WaitAnimEnd;"),
      tip.indexOf("sprite->x2 = 0;"),
      tip.indexOf("s16 index = ((counter - 10) * 128) / 20;"),
      tip.indexOf("if (counter < 10)"),
      tip.indexOf("else if (counter >= 10 && counter <= 29)"),
      tip.indexOf("sprite->x2 = -(Sin(index, 5));"),
      tip.indexOf("sprite->data[2]++;"),
      tip.lastIndexOf("TryFlipX(sprite);"),
    ];
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect([...tip.matchAll(/TryFlipX\(sprite\);/g)]).toHaveLength(2);
    expect(tip).toContain("counter / 2 * 512");
    expect(tip).toContain("(35 - counter) / 2 * 1024");
    expect(source).toMatch(
      /static void WaitAnimEnd\(struct Sprite \*sprite\)[\s\S]*?if \(sprite->animEnded\)[\s\S]*?sprite->callback = SpriteCallbackDummy;/,
    );
  });

  it("pins RELICANTH's real Factory-set profile inside a complete legal Scene-ON party", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_RELICANTH_1"))
      .toMatchObject({
        index: 259,
        species: "SPECIES_RELICANTH",
        moves: ["MOVE_ANCIENT_POWER", "MOVE_WATER_PULSE", "MOVE_HARDEN", "MOVE_AMNESIA"],
        itemTableId: 52,
        evSpread: 49,
        nature: "NATURE_SASSY",
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
      species: 381,
      level: 50,
      nature: 22,
      moves: [106, 106, 106, 106],
      ppUps: [0, 0, 0, 0],
      item: 168,
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

  it("pins a byte-identical full active-to-dummy Scene-ON pair, RAM/OAM state, and raw frame hashes", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-relicanth-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-relicanth-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(34589);
    expect(rawA.at(-1)).toBe("\n".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("0c1fffb728ed675db5e0e632c85c25802bc66ed0fec83afffdfb151523ec0d6c");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "tip-move-forward-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 381,
      sourceSelector: SELECTOR,
      sourceId: 26,
      sourceWindow: { startFrame: 1618, endFrame: 1694, frameCount: 77 },
      callbackAddresses: {
        Anim_TipMoveForward: 135791548,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(77);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 77 }, (_, index) => 1618 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      ...Array(37).fill("Anim_TipMoveForward"),
      ...Array(39).fill("WaitAnimEnd"),
      "SpriteCallbackDummy",
    ]);
    expect(Object.keys(runA.callbackAddresses).sort()).toEqual([
      "Anim_TipMoveForward",
      "SpriteCallbackDummy",
      "WaitAnimEnd",
    ]);

    expect(frames[0]).toMatchObject({
      sha256: "bde1e5e984863dbfa925253b9cf877606d291bd45202943f39d03437afe1e8b0",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_TipMoveForward",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (let tick = 0; tick <= 36; tick += 1) {
      const model = tipMoveForwardFrameAtTick(tick)!;
      const row = frames[tick + 1]!.battler1;
      expect(row).toMatchObject({
        x2: model.x2,
        y2: model.y2,
        data: [0, 1, model.data2, 0, 0, 0, 0, 0],
        callbackSymbol: model.callback,
        oam: { affineMode: model.affineMode === "double" ? 3 : 1 },
      });
    }
    expect(frames[9]).toMatchObject({
      battler1: { data: [0, 1, 9, 0, 0, 0, 0, 0], oam: { matrix: [251, -49, 49, 251] } },
    });
    expect(frames[10]).toMatchObject({
      battler1: { data: [0, 1, 10, 0, 0, 0, 0, 0], oam: { matrix: [251, -49, 49, 251] } },
    });
    expect(frames[20]).toMatchObject({
      battler1: { x2: -4, data: [0, 1, 20, 0, 0, 0, 0, 0], oam: { matrix: [251, -49, 49, 251] } },
    });
    expect(frames[35]).toMatchObject({
      battler1: { data: [0, 1, 35, 0, 0, 0, 0, 0], oam: { matrix: [256, 0, 0, 256] } },
    });
    expect(frames[37]).toMatchObject({
      sha256: "9dda114ec0335a70fbcf507228b4dfd65d3aa642a79d15cd5f44d4f63edd114b",
      battler1: {
        x2: 0,
        y2: 0,
        data: [0, 1, 37, 0, 0, 0, 0, 0],
        callbackSymbol: "WaitAnimEnd",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    for (const row of frames.slice(37, 76)) {
      expect(row).toMatchObject({
        battler1: {
          x2: 0,
          y2: 0,
          data: [0, 1, 37, 0, 0, 0, 0, 0],
          callbackSymbol: "WaitAnimEnd",
          oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
        },
      });
    }
    expect(frames.at(-1)).toMatchObject({
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 381, 0, 0, 0, 0, 0],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
