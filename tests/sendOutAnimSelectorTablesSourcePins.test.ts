import { describe, expect, it } from "vitest";
import selectorTables from "../src/data/gen/send-out-anim-selector-tables.json" with { type: "json" };

const frontAnimIds = selectorTables.frontAnimIds.species as Record<string, string>;
const animationDelay = selectorTables.animationDelay.species as Record<string, number>;
const speciesToBackAnimSet = selectorTables.speciesToBackAnimSet.species as Record<string, string>;
const backAnimNatureMod = selectorTables.backAnimNatureMod.natures as Record<string, number>;
const backAnimationIds = selectorTables.backAnimationIds.sets as Record<string, string[]>;

describe("send-out animation selector source-line pins", () => {
  it("pins three sMonFrontAnimIdsTable rows hand-read from pokemon.c", () => {
    // reference/pokeemerald/src/pokemon.c:1407
    expect(frontAnimIds.BULBASAUR).toBe("ANIM_V_JUMPS_H_JUMPS");
    // reference/pokeemerald/src/pokemon.c:1425
    expect(frontAnimIds.RATTATA).toBe("ANIM_RAPID_H_HOPS");
    // reference/pokeemerald/src/pokemon.c:1792
    expect(frontAnimIds.CHIMECHO).toBe("ANIM_H_SLIDE_WOBBLE");
  });

  it("pins three sMonAnimationDelayTable rows hand-read from pokemon.c", () => {
    // reference/pokeemerald/src/pokemon.c:1797
    expect(animationDelay.BLASTOISE).toBe(50);
    // reference/pokeemerald/src/pokemon.c:1850
    expect(animationDelay.KYOGRE).toBe(60);
    // reference/pokeemerald/src/pokemon.c:1851
    expect(animationDelay.RAYQUAZA).toBe(60);
  });

  it("pins three sSpeciesToBackAnimSet rows hand-read from pokemon_animation.c", () => {
    // reference/pokeemerald/src/pokemon_animation.c:220
    expect(speciesToBackAnimSet.CHARIZARD).toBe("BACK_ANIM_SHAKE_GLOW_RED");
    // reference/pokeemerald/src/pokemon_animation.c:223
    expect(speciesToBackAnimSet.BLASTOISE).toBe("BACK_ANIM_SHAKE_GLOW_BLUE");
    // reference/pokeemerald/src/pokemon_animation.c:600
    expect(speciesToBackAnimSet.CHIMECHO).toBe("BACK_ANIM_CONVEX_DOUBLE_ARC");
  });

  it("pins three sBackAnimNatureModTable rows hand-read from pokemon_animation.c", () => {
    // reference/pokeemerald/src/pokemon_animation.c:819
    expect(backAnimNatureMod.NATURE_HARDY).toBe(0);
    // reference/pokeemerald/src/pokemon_animation.c:829
    expect(backAnimNatureMod.NATURE_TIMID).toBe(2);
    // reference/pokeemerald/src/pokemon_animation.c:843
    expect(backAnimNatureMod.NATURE_QUIRKY).toBe(1);
  });

  it("pins three sBackAnimationIds triples hand-read from pokemon_animation.c", () => {
    // reference/pokeemerald/src/pokemon_animation.c:790
    expect(backAnimationIds.BACK_ANIM_H_VIBRATE).toEqual([
      "ANIM_H_VIBRATE_FASTEST",
      "ANIM_H_VIBRATE_FAST",
      "ANIM_H_VIBRATE",
    ]);
    // reference/pokeemerald/src/pokemon_animation.c:806
    expect(backAnimationIds.BACK_ANIM_CONVEX_DOUBLE_ARC).toEqual([
      "ANIM_CONVEX_DOUBLE_ARC_TWICE",
      "ANIM_CONVEX_DOUBLE_ARC",
      "ANIM_CONVEX_DOUBLE_ARC_SLOW",
    ]);
    // reference/pokeemerald/src/pokemon_animation.c:814
    expect(backAnimationIds.BACK_ANIM_SHAKE_GLOW_BLUE).toEqual([
      "ANIM_SHAKE_GLOW_BLUE_FAST",
      "ANIM_SHAKE_GLOW_BLUE",
      "ANIM_SHAKE_GLOW_BLUE_SLOW",
    ]);
  });
});
