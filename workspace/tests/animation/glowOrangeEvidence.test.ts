import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import kakunaScenario from "../../tools/compare/fixtures/sendout-front-kakuna.json" with { type: "json" };
import kakunaRunA from "../../tools/compare/fixtures/sendout-front-kakuna-run-a.json" with { type: "json" };
import kakunaRunB from "../../tools/compare/fixtures/sendout-front-kakuna-run-b.json" with { type: "json" };
import ponytaScenario from "../../tools/compare/fixtures/sendout-front-ponyta.json" with { type: "json" };
import ponytaRunA from "../../tools/compare/fixtures/sendout-front-ponyta-run-a.json" with { type: "json" };
import ponytaRunB from "../../tools/compare/fixtures/sendout-front-ponyta-run-b.json" with { type: "json" };

const RECEIPTS = [
  ["KAKUNA", 14, 10, kakunaScenario, kakunaRunA, kakunaRunB, 373,
    "323b9838655b0faa062cb8852a08374e341e15dc02bc8f43f9f47c5e00c26c37"],
  ["PONYTA", 77, 1, ponytaScenario, ponytaRunA, ponytaRunB, 372,
    "4a5bf6f9883e9527190e3af1d0a62fb4ab41124988ee567ba78a234f0fbd97ba"],
] as const;

describe("ANIM_GLOW_ORANGE Scene-ON evidence", () => {
  it("pins selector 32, its distinct initializer, shared lifecycle source, and census", () => {
    const constants = readFileSync(
      new URL("../../reference/pokeemerald/include/pokemon_animation.h", import.meta.url),
      "utf8",
    );
    const animationSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const selectorSource = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon.c", import.meta.url),
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
    expect(paletteHeader).toMatch(/^#define OBJ_PLTT_ID\(n\) \(OBJ_PLTT_OFFSET \+ PLTT_ID\(n\)\)$/m);
    expect(rgbHeader).toContain("#define RGB(r, g, b)  ((r) | ((g) << 5) | ((b) << 10))");
    expect(spriteHeader).toMatch(/\/\*0x2E\*\/ s16 data\[8\];/);
    expect(gbaTypesHeader).toMatch(/u16 paletteNum:4;/);
    expect(31 | (22 << 5)).toBe(0x02df);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );

    const glowStart = animationSource.indexOf("#define GlowColor(color, colorIncrement, speed)");
    const glowEnd = animationSource.indexOf("static void Anim_HorizontalStretch", glowStart);
    const glow = animationSource.slice(glowStart, glowEnd);
    const macroPositions = [
      glow.indexOf("if (sprite->data[2] == 0)"),
      glow.indexOf("sprite->data[7] = OBJ_PLTT_ID(sprite->oam.paletteNum);"),
      glow.indexOf("if (sprite->data[2] > 128)"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, 0, (color));"),
      glow.indexOf("sprite->callback = WaitAnimEnd;"),
      glow.indexOf("sprite->data[6] = Sin(sprite->data[2], (colorIncrement));"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, sprite->data[6], (color));"),
      glow.indexOf("sprite->data[2] += (speed);"),
    ];
    expect(macroPositions.every((position) => position >= 0)).toBe(true);
    expect(macroPositions).toEqual([...macroPositions].sort((a, b) => a - b));

    const orangeStart = animationSource.indexOf("static void Anim_GlowOrange(struct Sprite *sprite)\n{");
    const orangeEnd = animationSource.indexOf("static void Anim_GlowRed", orangeStart);
    const orangeInitializer = animationSource.slice(orangeStart, orangeEnd);
    expect(orangeInitializer).toContain("GlowColor(RGB(31, 22, 0), 12, 2);");

    const mapped = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_GLOW_ORANGE")
      .map(([species]) => species);
    expect(mapped).toEqual(["KAKUNA", "PONYTA"]);
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(mapped.filter((species) => factory.has(species))).toEqual(mapped);
    for (const species of mapped) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_GLOW_ORANGE,$`, "m",
      ));
    }
  });

  it.each(RECEIPTS)("pins a complete legal challenge-0 Scene-ON %s party", (
    _species, speciesId, _animCmdIndex, scenario,
  ) => {
    expect(scenario).toMatchObject({
      mode: "mechanicLab", profile: "battle-scene-on", level: 50,
      challengeNum: 0, battleNum: 0, trainerId: 50,
    });
    expect(scenario.overrides.parties.player).toHaveLength(3);
    expect(scenario.overrides.parties.opponent).toHaveLength(3);
    expect(scenario.overrides.parties.opponent[0]!.species).toBe(speciesId);
    for (const setId of [...scenario.playerSetIds, ...scenario.opponentSetIds]) {
      expect(setId).toBeGreaterThanOrEqual(110);
      expect(setId).toBeLessThanOrEqual(199);
    }
    for (const party of Object.values(scenario.overrides.parties)) {
      for (const mon of party) {
        expect(mon.level).toBe(50);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(mon).toEqual(expect.objectContaining({
          item: expect.any(Number), abilitySlot: expect.any(Number),
          friendship: expect.any(Number), gender: expect.any(String), shiny: false,
        }));
      }
    }
  });

  it.each(RECEIPTS)("matches byte-identical independent settled %s Scene-ON receipts", (
    species, speciesId, animCmdIndex, _scenario, runA, runB, bytes, sha256,
  ) => {
    const stem = species.toLowerCase();
    const rawA = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `../../tools/compare/fixtures/sendout-front-${stem}-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(bytes);
    expect(rawA.at(-1)).toBe("}".charCodeAt(0));
    expect(createHash("sha256").update(rawA).digest("hex")).toBe(sha256);
    expect(runA).toEqual(runB);
    expect(runA.ticks).toHaveLength(1);
    expect(runA.ticks[0]!.battler1).toMatchObject({
      x2: 0,
      y2: 0,
      animNum: 1,
      animCmdIndex,
      data2: speciesId,
      callback: "0x8007428",
      callbackSymbol: "SpriteCallbackDummy",
    });
    expect(speciesFrontIdleRestOffset(species)).toEqual({ x2: 0, y2: 0 });
  });
});
