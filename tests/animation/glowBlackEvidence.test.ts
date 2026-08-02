import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { speciesFrontIdleRestOffset } from "../../src/animation/speciesIdleAnim.ts";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import gastlyScenario from "../../tools/compare/fixtures/sendout-front-gastly.json" with { type: "json" };
import gastlyRunA from "../../tools/compare/fixtures/sendout-front-gastly-run-a.json" with { type: "json" };
import gastlyRunB from "../../tools/compare/fixtures/sendout-front-gastly-run-b.json" with { type: "json" };
import sableyeScenario from "../../tools/compare/fixtures/sendout-front-sableye.json" with { type: "json" };
import sableyeRunA from "../../tools/compare/fixtures/sendout-front-sableye-run-a.json" with { type: "json" };
import sableyeRunB from "../../tools/compare/fixtures/sendout-front-sableye-run-b.json" with { type: "json" };

const RECEIPTS = [
  ["GASTLY", 92, 2, gastlyScenario, gastlyRunA, gastlyRunB, 372,
    "64e09ca6ce19b244f3f34b0ddfcd1a4ecd84327d3e7fae3de805a85590f3f637"],
  ["SABLEYE", 322, 4, sableyeScenario, sableyeRunA, sableyeRunB, 373,
    "951a7b12ebc5d211fe26a7112cbf7b81f5890532426fc47cba82a17a13ca80a1"],
] as const;

describe("ANIM_GLOW_BLACK Scene-ON evidence", () => {
  it("pins selector 21, direct dispatch, palette lifecycle, and the complete census", () => {
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

    expect(constants).toMatch(/^#define ANIM_GLOW_BLACK\s+21$/m);
    expect(paletteHeader).toMatch(/^#define OBJ_PLTT_ID\(n\) \(OBJ_PLTT_OFFSET \+ PLTT_ID\(n\)\)$/m);
    expect(rgbHeader).toMatch(/^#define RGB_BLACK\s+RGB\(0, 0, 0\)$/m);

    const taskStart = animationSource.indexOf("static void Task_HandleMonAnimation(u8 taskId)\n{");
    const taskEnd = animationSource.indexOf("void LaunchAnimationTaskForFrontSprite", taskStart);
    const task = animationSource.slice(taskStart, taskEnd);
    expect(task).toMatch(
      /sprite->sDontFlip = TRUE;[\s\S]*?for \(i = 2; i < ARRAY_COUNT\(sprite->data\); i\+\+\)[\s\S]*?sprite->data\[i\] = 0;[\s\S]*?sprite->callback = sMonAnimFunctions/,
    );

    const glowStart = animationSource.indexOf("#define GlowColor(color, colorIncrement, speed)");
    const glowEnd = animationSource.indexOf("static void Anim_HorizontalStretch", glowStart);
    const glow = animationSource.slice(glowStart, glowEnd);
    const positions = [
      glow.indexOf("if (sprite->data[2] == 0)"),
      glow.indexOf("sprite->data[7] = OBJ_PLTT_ID(sprite->oam.paletteNum);"),
      glow.indexOf("if (sprite->data[2] > 128)"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, 0, (color));"),
      glow.indexOf("sprite->callback = WaitAnimEnd;"),
      glow.indexOf("sprite->data[6] = Sin(sprite->data[2], (colorIncrement));"),
      glow.indexOf("BlendPalette(sprite->data[7], 16, sprite->data[6], (color));"),
      glow.indexOf("sprite->data[2] += (speed);"),
      glow.indexOf("GlowColor(RGB_BLACK, 16, 1);"),
    ];
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    const mapped = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_GLOW_BLACK")
      .map(([species]) => species);
    expect(mapped).toEqual(["GASTLY", "SABLEYE"]);
    const factory = new Set(frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")));
    expect(mapped.filter((species) => factory.has(species))).toEqual(mapped);
    for (const species of mapped) {
      expect(selectorSource).toMatch(new RegExp(
        `^\\s*\\[SPECIES_${species} - 1\\]\\s*= ANIM_GLOW_BLACK,$`, "m",
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
