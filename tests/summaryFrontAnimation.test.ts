import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import summaryFrontAnimation from "../src/data/gen/summary-front-animation.json" with { type: "json" };
import { buildSummaryFrontAnimationData } from "../tools/extract/extract-summary-front-animation.ts";

const root = new URL("..", import.meta.url);

function source(relativePath: string): string {
  return readFileSync(new URL(`reference/pokeemerald/${relativePath}`, root), "utf8");
}

describe("summary front-animation extraction", () => {
  it("reproduces the committed source-derived data without an oracle or emulator", () => {
    expect(buildSummaryFrontAnimationData({
      pokemonC: source("src/pokemon.c"),
      pokemonAnimationC: source("src/pokemon_animation.c"),
      pokemonAnimationH: source("include/pokemon_animation.h"),
      frontPicAnimsH: source("src/data/pokemon_graphics/front_pic_anims.h"),
    })).toEqual(summaryFrontAnimation);
  });

  it("pins the six S9 anchors' delay, callback type, and source frame programs", () => {
    expect(summaryFrontAnimation).toEqual({
      schema: "summary-front-animation/v1",
      species: [
        { species: "SPECIES_ONIX", delay: 0, motion: { id: 67, type: "ANIM_RAPID_H_HOPS", callback: "Anim_RapidHorizontalHops" }, startsSecondSpriteFrame: true, spriteFrameProgram: [{ frame: 1, duration: 50 }, { frame: 1, duration: 30 }, { frame: 0, duration: 30 }] },
        { species: "SPECIES_MAGBY", delay: 0, motion: { id: 0, type: "ANIM_V_SQUISH_AND_BOUNCE", callback: "Anim_VerticalSquishBounce" }, startsSecondSpriteFrame: true, spriteFrameProgram: [{ frame: 0, duration: 15 }, { frame: 1, duration: 15 }, { frame: 0, duration: 20 }, { frame: 1, duration: 10 }, { frame: 0, duration: 10 }, { frame: 1, duration: 10 }, { frame: 0, duration: 10 }] },
        { species: "SPECIES_VOLBEAT", delay: 0, motion: { id: 0, type: "ANIM_V_SQUISH_AND_BOUNCE", callback: "Anim_VerticalSquishBounce" }, startsSecondSpriteFrame: true, spriteFrameProgram: [{ frame: 0, duration: 11 }, { frame: 1, duration: 11 }, { frame: 0, duration: 11 }, { frame: 1, duration: 11 }, { frame: 0, duration: 11 }, { frame: 1, duration: 11 }, { frame: 0, duration: 5 }] },
        { species: "SPECIES_ELECTRIKE", delay: 0, motion: { id: 0, type: "ANIM_V_SQUISH_AND_BOUNCE", callback: "Anim_VerticalSquishBounce" }, startsSecondSpriteFrame: true, spriteFrameProgram: [{ frame: 0, duration: 8 }, { frame: 1, duration: 25 }, { frame: 0, duration: 17 }, { frame: 1, duration: 25 }, { frame: 0, duration: 3 }] },
        { species: "SPECIES_SPINDA", delay: 0, motion: { id: 49, type: "ANIM_H_JUMPS", callback: "Anim_HorizontalJumps" }, startsSecondSpriteFrame: false, spriteFrameProgram: null },
        { species: "SPECIES_SWABLU", delay: 0, motion: { id: 4, type: "ANIM_V_SLIDE", callback: "Anim_VerticalSlide" }, startsSecondSpriteFrame: true, spriteFrameProgram: [{ frame: 0, duration: 1 }, { frame: 1, duration: 10 }, { frame: 0, duration: 10 }, { frame: 1, duration: 10 }, { frame: 0, duration: 10 }, { frame: 1, duration: 10 }, { frame: 0, duration: 10 }] },
      ],
    });
  });
});
