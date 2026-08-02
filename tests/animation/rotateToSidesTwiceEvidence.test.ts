import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import selectorTables from "../../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };
import {
  ROTATE_TO_SIDES_TWICE_FACTORY_FRONT_SPECIES,
  ROTATE_TO_SIDES_TWICE_FRONT_SPECIES,
  ROTATE_TO_SIDES_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES,
} from "../../src/animation/speciesIdleAnim.ts";
import scenario from "../../tools/compare/fixtures/sendout-front-solrock.json" with { type: "json" };
import runA from "../../tools/compare/fixtures/sendout-front-solrock-run-a.json" with { type: "json" };
import runB from "../../tools/compare/fixtures/sendout-front-solrock-run-b.json" with { type: "json" };

const FIXTURES = "../../tools/compare/fixtures/";
const SELECTOR = "ANIM_ROTATE_TO_SIDES_TWICE";

describe("ANIM_ROTATE_TO_SIDES_TWICE Scene-ON evidence", () => {
  it("pins selector 8, its adjacent unselected routes, and SOLROCK's complete census", () => {
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
    expect(constants).toMatch(/^#define ANIM_ROTATE_TO_SIDES\s+7$/m);
    expect(constants).toMatch(/^#define ANIM_ROTATE_TO_SIDES_TWICE\s+8$/m);
    expect(constants).toMatch(/^#define ANIM_ROTATE_TO_SIDES_FAST\s+51$/m);
    const dispatch = animationSource.indexOf(
      "[ANIM_ROTATE_TO_SIDES_TWICE]             = Anim_RotateToSides_Twice,",
    );
    expect(dispatch).toBeGreaterThan(animationSource.indexOf(
      "[ANIM_ROTATE_TO_SIDES]                   = Anim_RotateToSides, // Unused",
    ));
    expect(dispatch).toBeLessThan(animationSource.indexOf("[ANIM_GROW_VIBRATE]"));
    expect(pokemonSource).toMatch(
      /^\s*\[SPECIES_SOLROCK - 1\]\s*= ANIM_ROTATE_TO_SIDES_TWICE,$/m,
    );

    const generated = Object.entries(selectorTables.frontAnimIds.species)
      .filter(([, family]) => family === SELECTOR)
      .map(([species]) => species);
    const factory = new Set(
      frontierMons.entries.map(({ species }) => species.replace(/^SPECIES_/, "")),
    );
    expect(generated).toEqual(["SOLROCK"]);
    expect(ROTATE_TO_SIDES_TWICE_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_TO_SIDES_TWICE_FACTORY_FRONT_SPECIES).toEqual(generated);
    expect(ROTATE_TO_SIDES_TWICE_OUTSIDE_FACTORY_FRONT_SPECIES).toEqual([]);
    expect(generated.filter((species) => factory.has(species))).toEqual(generated);
    expect(Object.values(selectorTables.frontAnimIds.species)
      .filter((family) => family === "ANIM_ROTATE_TO_SIDES"))
      .toEqual([]);
    expect(Object.values(selectorTables.frontAnimIds.species)
      .filter((family) => family === "ANIM_ROTATE_TO_SIDES_FAST"))
      .toEqual([]);
    expect(JSON.stringify(selectorTables.backAnimationIds)).not.toContain("ROTATE_TO_SIDES");
  });

  it("pins the shared callback, selector-8 initializer, repeat reset, and cleanup ordering", () => {
    const source = readFileSync(
      new URL("../../reference/pokeemerald/src/pokemon_animation.c", import.meta.url),
      "utf8",
    );
    const callbackStart = source.indexOf("static void RotateToSides(struct Sprite *sprite)\n{");
    const fastStart = source.indexOf("static void Anim_RotateToSides_Fast(struct Sprite *sprite)\n{");
    const normalStart = source.indexOf("static void Anim_RotateToSides(struct Sprite *sprite)\n{");
    const twiceStart = source.indexOf("static void Anim_RotateToSides_Twice(struct Sprite *sprite)\n{");
    const nextStart = source.indexOf("static void Anim_SwingConcave(struct Sprite *sprite)\n{");
    expect(callbackStart).toBeGreaterThan(0);
    expect(fastStart).toBeGreaterThan(callbackStart);
    expect(normalStart).toBeGreaterThan(fastStart);
    expect(twiceStart).toBeGreaterThan(normalStart);
    expect(nextStart).toBeGreaterThan(twiceStart);

    const callback = source.slice(callbackStart, fastStart);
    expect(callback).toContain("if (sprite->data[2] == 0)");
    expect(callback).toContain("HandleStartAffineAnim(sprite);");
    // One call precedes the branch; each terminal/active branch carries its
    // own second call, so every live callback still executes exactly two.
    expect(callback.match(/TryFlipX\(sprite\);/g)).toHaveLength(3);
    expect(callback).toContain("if (sprite->data[7] > 254)");
    expect(callback).toContain("HandleSetAffineData(sprite, 256, 256, 0);");
    expect(callback).toContain("if (sAnims[sprite->data[0]].runs > 1)");
    expect(callback).toContain("sAnims[sprite->data[0]].runs--;");
    expect(callback).toContain("sprite->data[2] = 0;");
    expect(callback).toContain("sprite->data[7] = 0;");
    expect(callback).toContain("ResetSpriteAfterAnim(sprite);");
    expect(callback).toContain("sprite->callback = WaitAnimEnd;");
    expect(callback).toContain("sprite->x2 = -(Sin(sprite->data[7], 16));");
    expect(callback).toContain("rotation = Sin(sprite->data[7], 32);");
    expect(callback).toContain("HandleSetAffineData(sprite, 256, 256, rotation << 8);");
    expect(callback).toContain("sprite->data[7] += sAnims[sprite->data[0]].rotation;");

    const normal = source.slice(normalStart, twiceStart);
    const twice = source.slice(twiceStart, nextStart);
    expect(normal).toContain("sAnims[id].rotation = 2;");
    expect(normal).not.toContain("sAnims[id].runs = 2;");
    expect(twice).toContain("u8 id = sprite->data[0] = AddNewAnim();");
    expect(twice).toContain("sAnims[id].rotation = 4;");
    expect(twice).toContain("sAnims[id].runs = 2;");
    expect(twice).toContain("RotateToSides(sprite);");
    expect(twice).toContain("sprite->callback = RotateToSides;");
  });

  it("pins a complete legal Scene-ON Solrock party derived from its Factory set", () => {
    expect(frontierMons.entries.find(({ label }) => label === "FRONTIER_MON_SOLROCK_1"))
      .toMatchObject({
        index: 223,
        species: "SPECIES_SOLROCK",
        moves: ["MOVE_CONFUSION", "MOVE_FIRE_SPIN", "MOVE_LIGHT_SCREEN", "MOVE_SANDSTORM"],
        itemTableId: 2,
        evSpread: 33,
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
      species: 349,
      level: 50,
      nature: 17,
      moves: [93, 83, 113, 201],
      ppUps: [0, 0, 0, 0],
      abilitySlot: 0,
      friendship: 70,
      gender: "genderless",
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

  it("pins the byte-identical full active-to-dummy Scene-ON pair, hashes, RAM, OAM, and affine state", () => {
    const rawA = readFileSync(new URL(
      `${FIXTURES}sendout-front-solrock-run-a.json`, import.meta.url,
    ));
    const rawB = readFileSync(new URL(
      `${FIXTURES}sendout-front-solrock-run-b.json`, import.meta.url,
    ));
    expect(rawA.equals(rawB)).toBe(true);
    expect(rawA).toHaveLength(59501);
    expect(createHash("sha256").update(rawA).digest("hex"))
      .toBe("06ad352e574feb2b5fae6bbe818bead7af2431bc4890d90430278797e9e35dff");
    expect(runA).toEqual(runB);
    expect(runA).toMatchObject({
      schema: "rotate-to-sides-twice-scene-on-dense/v1",
      profile: "battle-scene-on",
      species: 349,
      sourceSelector: SELECTOR,
      sourceId: 8,
      sourceWindow: { startFrame: 1616, endFrame: 1747, frameCount: 132 },
      callbackAddresses: {
        Anim_RotateToSides_Twice: 135802928,
        RotateToSides: 135797992,
        WaitAnimEnd: 135810440,
        SpriteCallbackDummy: 134247464,
      },
    });

    const frames = runA.frames;
    expect(frames).toHaveLength(132);
    expect(frames.map((row) => row.frame)).toEqual(
      Array.from({ length: 132 }, (_, index) => 1616 + index),
    );
    expect(frames.map((row) => row.battler1.callbackSymbol)).toEqual([
      "Anim_RotateToSides_Twice",
      ...Array(129).fill("RotateToSides"),
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
      sha256: "8ff533c6ad3298a42287f2a177456857adc8709c035dc4954abe327ddd1351de",
      battler1: {
        data: [0, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "Anim_RotateToSides_Twice",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[1]).toMatchObject({
      sha256: "d6f36de2e5cc7009888c4e448b5248d8df2f865369e3e04d40c74425815dbb2b",
      battler1: {
        centerToCornerVecX: -64,
        data: [1, 1, 1, 0, 0, 0, 0, 4],
        callbackSymbol: "RotateToSides",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[2]).toMatchObject({
      sha256: "d3f164c6bf42b30773ab0213f7804e7d6361f094f964a3adb457e7871d1499e8",
      battler1: {
        x2: -1,
        data: [1, 1, 1, 0, 0, 0, 0, 8],
        oam: { affineMode: 3, matrix: [255, -18, 18, 255] },
      },
    });
    expect(frames[64]).toMatchObject({
      sha256: "5456b63bb5e4bfbc48f181b4ce6f66494ca7a4447552fb1b41291935ce437408",
      battler1: {
        x2: 2,
        data: [1, 1, 1, 0, 0, 0, 0, 256],
        oam: { affineMode: 3, matrix: [254, 25, -25, 254] },
      },
    });
    expect(frames[65]).toMatchObject({
      sha256: "c64be200fcac31dc5e340671e933084c062eded68da717c9fe609f5f421c71d6",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 0, 0, 0, 0, 0, 0],
        callbackSymbol: "RotateToSides",
        oam: { affineMode: 3, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[66]).toMatchObject({
      sha256: "ae692455635bfa61aa81b53b6dc6058c0ef392188eac16a43999c225fddc7cce",
      battler1: { data: [1, 1, 1, 0, 0, 0, 0, 4] },
    });
    expect(frames[129]).toMatchObject({
      sha256: "35fa44bdb0900620f84bb09f5633f672dbb166846794ef8d4286ff937bcfded6",
      battler1: {
        x2: 2,
        data: [1, 1, 1, 0, 0, 0, 0, 256],
        callbackSymbol: "RotateToSides",
        oam: { affineMode: 3, matrix: [254, 25, -25, 254] },
      },
    });
    expect(frames[130]).toMatchObject({
      sha256: "5408bbe1892f84e7360b54a9d3fd7ccba2bef96f6fc721350c409ef5b98b3bfc",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 1, 1, 0, 0, 0, 0, 256],
        callbackSymbol: "WaitAnimEnd",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
    expect(frames[131]).toMatchObject({
      sha256: "f279ed0d5e0e2dd121428ff9f5c40f90e35f8833dc68ff5fe9c775e7c3058cf5",
      battler1: {
        x2: 0,
        y2: 0,
        data: [1, 0, 349, 0, 0, 0, 0, 256],
        callbackSymbol: "SpriteCallbackDummy",
        oam: { affineMode: 1, matrix: [256, 0, 0, 256] },
      },
    });
  });
});
