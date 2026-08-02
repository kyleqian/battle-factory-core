import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import venusaurScenario from "../../tools/compare/fixtures/sendout-front-venusaur.json" with { type: "json" };
import golemScenario from "../../tools/compare/fixtures/sendout-front-golem.json" with { type: "json" };
import venusaurA from "../../tools/compare/fixtures/sendout-front-venusaur-run-a.json" with { type: "json" };
import venusaurB from "../../tools/compare/fixtures/sendout-front-venusaur-run-b.json" with { type: "json" };
import golemA from "../../tools/compare/fixtures/sendout-front-golem-run-a.json" with { type: "json" };
import golemB from "../../tools/compare/fixtures/sendout-front-golem-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";

describe("ANIM_ROTATE_UP_SLAM_DOWN Scene-ON evidence", () => {
  it("pins selector 47, adjacent dispatch rows, and both complete source mappings", () => {
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
    expect(constants).toMatch(/^#define ANIM_ROTATE_UP_SLAM_DOWN\s+47$/m);
    const dispatch = animationSource.indexOf(
      "[ANIM_ROTATE_UP_SLAM_DOWN]               = Anim_RotateUpSlamDown,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_SWING_CONVEX_FAST_SHORT]",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf(
      "[ANIM_DEEP_V_SQUISH_AND_BOUNCE]",
    ));
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_VENUSAUR - 1\]\s*= ANIM_ROTATE_UP_SLAM_DOWN,$/m,
    );
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_GOLEM - 1\]\s*= ANIM_ROTATE_UP_SLAM_DOWN,$/m,
    );
    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === "ANIM_ROTATE_UP_SLAM_DOWN")
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["VENUSAUR", "GOLEM"]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
  });

  it("pins the initializer, every callback phase, and source-order cleanup", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const names = [
      "Anim_RotateUpSlamDown",
      "RotateUpSlamDown_0",
      "RotateUpSlamDown_1",
      "RotateUpSlamDown_2",
    ];
    const positions = names.map((name) => source.indexOf(
      `static void ${name}(struct Sprite *sprite)\n{`,
    ));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    const block = (index: number, next: string): string => source.slice(
      positions[index]!,
      source.indexOf(`static void ${next}(struct Sprite *sprite)\n{`, positions[index]),
    );

    const initializer = block(0, names[1]!);
    expect(initializer).toContain("HandleStartAffineAnim(sprite);");
    expect(initializer).toContain("sprite->data[6] = -(14 * sprite->centerToCornerVecX / 10);");
    expect(initializer).toContain("sprite->data[7] = 128;");
    expect(initializer).toContain("sprite->callback = RotateUpSlamDown_0;");
    expect(initializer).not.toContain("RotateUpSlamDown_0(sprite);");

    const phase0 = block(1, names[2]!);
    expect(phase0.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(phase0).toContain("sprite->data[7]--;");
    expect(phase0).toContain("sprite->x2 = sprite->data[6] + Cos(sprite->data[7], sprite->data[6]);");
    expect(phase0).toContain("sprite->y2 = -(Sin(sprite->data[7], sprite->data[6]));");
    expect(phase0).toContain("if (sprite->data[7] <= 120)");
    expect(phase0).toContain("sprite->data[3] = 0;");
    const phase1 = block(2, names[3]!);
    expect(phase1.match(/TryFlipX\(sprite\);/g)).toBeNull();
    expect(phase1).toContain("if (sprite->data[3] == 20)");
    expect(phase1).toContain("sprite->callback = RotateUpSlamDown_2;");
    expect(phase1).toContain("sprite->data[3]++;");
    const phase2 = block(3, "DeepVerticalSquishBounce");
    expect(phase2.match(/TryFlipX\(sprite\);/g)).toHaveLength(2);
    expect(phase2).toContain("sprite->data[7] += 2;");
    expect(phase2).toContain("if (sprite->data[7] >= 128)");
    expect(phase2).toContain("sprite->x2 = 0;");
    expect(phase2).toContain("sprite->y2 = 0;");
    expect(phase2.match(/HandleSetAffineData\(sprite, 256, 256/g)).toHaveLength(2);
    expect(phase2).toContain("sprite->data[2] = 0;");
    expect(phase2).toContain("ResetSpriteAfterAnim(sprite);");
    expect(phase2).toContain("sprite->callback = Anim_VerticalShake;");

    const verticalStart = source.indexOf("static void VerticalShake(struct Sprite *sprite)\n{");
    const vertical = source.slice(
      verticalStart,
      source.indexOf("static void Anim_VerticalShakeTwice(struct Sprite *sprite)\n{", verticalStart),
    );
    expect(vertical).toContain("sprite->data[0] = 60;");
    expect(vertical).toContain("VerticalShake(sprite);");
    expect(vertical).toContain("sprite->callback = VerticalShake;");
    expect(vertical).toContain("if (counter > 2304)");
  });

  it.each([
    ["VENUSAUR", venusaurScenario],
    ["GOLEM", golemScenario],
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
      species === "VENUSAUR" ? 3 : 76,
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
    ["VENUSAUR", venusaurA, venusaurB, 34759, "fab9786556bf5780c29c1e7fe79526ccb2fa0ae1be0c4271cc66c9d05140aa35"],
    ["GOLEM", golemA, golemB, 34748, "b4f0ad9d2a21a447ff0bc72cbf4c1680d1599a071cf0cc52b2fddf6d8e817c36"],
  ] as const)("pins byte-identical dense Scene-ON receipts for %s", (
    species, receiptA, receiptB, byteLength, sha256,
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
      schema: "rotate-up-slam-down-scene-on-dense/v1",
      profile: "battle-scene-on",
      sourceSelector: "ANIM_ROTATE_UP_SLAM_DOWN",
      sourceId: 47,
      sourceWindow: { frameCount: 76 },
    });
    const frames = receiptA.frames;
    expect(frames).toHaveLength(76);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 76 }, (_, index) => frames[0]!.frame + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_RotateUpSlamDown",
      ...Array(8).fill("RotateUpSlamDown_0"),
      ...Array(21).fill("RotateUpSlamDown_1"),
      ...Array(4).fill("RotateUpSlamDown_2"),
      "Anim_VerticalShake",
      ...Array(39).fill("VerticalShake"),
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
    expect(frames[0]!.battler1).toMatchObject({
      centerToCornerVecX: -32,
      data: [0, 1, 0, 0, 0, 0, 0, 0],
      oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    });
    expect(frames[1]!.battler1).toMatchObject({
      centerToCornerVecX: -64,
      data: [0, 1, 0, 0, 0, 0, 89, 128],
      oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
    });
    expect(frames.at(-2)!.battler1).toMatchObject({
      callbackSymbol: "WaitAnimEnd",
      x2: 0,
      y2: 0,
      data: [60, 1, 2400, 1, 0, 0, 89, 128],
      oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
    });
    expect(frames.at(-1)!.battler1.callbackSymbol).toBe("SpriteCallbackDummy");
  });
});
