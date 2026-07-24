import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import summaryFrontAnimation from "../src/data/gen/summary-front-animation.json" with { type: "json" };
import { buildSummaryFrontAnimationData } from "../tools/extract/extract-summary-front-animation.ts";
import {
  SUMMARY_INITIAL_MON_ANIMATION_START,
  summaryFrontAnimationForSpecies,
  summaryFrontSpritePresentation,
} from "../src/engine/summaryFrontAnimation.ts";

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

describe("summary front-animation presentation", () => {
  it.each([
    ["ONIX", "ANIM_RAPID_H_HOPS"],
    ["MAGBY", "ANIM_V_SQUISH_AND_BOUNCE"],
    ["VOLBEAT", "ANIM_V_SQUISH_AND_BOUNCE"],
    ["ELECTRIKE", "ANIM_V_SQUISH_AND_BOUNCE"],
    ["SPINDA", "ANIM_H_JUMPS"],
    ["SWABLU", "ANIM_V_SLIDE"],
  ] as const)("maps %s through its extracted source animation type", (species, type) => {
    expect(summaryFrontAnimationForSpecies(species).motion.type).toBe(type);
    expect(
      summaryFrontSpritePresentation(
        species,
        SUMMARY_INITIAL_MON_ANIMATION_START,
        false,
      ).sourceAnimationType,
    ).toBe(type);
  });

  it("runs MAGBY's frame program on its independent source clock with the OAM boundary lag", () => {
    const at = (clock: number) =>
      summaryFrontSpritePresentation("MAGBY", clock, false);
    expect(at(4)).toMatchObject({ animationStarted: false, frame: 0, affine: null });
    expect(at(5)).toMatchObject({ animationStarted: true, frame: 0, affine: null });
    expect(at(7).affine).toEqual({ xScale: 256, yScale: 256 });
    expect(at(20).frame).toBe(0);
    expect(at(21).frame).toBe(1);
    expect(at(36).frame).toBe(0);
    expect(at(55)).toMatchObject({ motionFinished: false });
    expect(at(56)).toMatchObject({ motionFinished: true, affine: null });
    expect(at(96).frame).toBe(0);
  });

  it("drives every extracted frame program from data rather than species branches", () => {
    for (const entry of summaryFrontAnimation.species) {
      const species = entry.species.replace("SPECIES_", "");
      if (!entry.spriteFrameProgram) {
        expect(summaryFrontSpritePresentation(species, 200, false).frame).toBe(0);
        continue;
      }
      let elapsed = 0;
      for (const command of entry.spriteFrameProgram) {
        const clock = SUMMARY_INITIAL_MON_ANIMATION_START + elapsed + 1;
        expect(summaryFrontSpritePresentation(species, clock, false).frame).toBe(
          command.frame,
        );
        elapsed += command.duration;
      }
    }
  });

  it("keeps each source motion finite and releases every affine matrix", () => {
    for (const species of ["ONIX", "MAGBY", "VOLBEAT", "ELECTRIKE", "SPINDA", "SWABLU"]) {
      expect(summaryFrontSpritePresentation(species, 500, false)).toMatchObject({
        affine: null,
        motionFinished: true,
      });
    }
    for (const species of ["MAGBY", "VOLBEAT", "ELECTRIKE", "SPINDA", "SWABLU"]) {
      expect(summaryFrontSpritePresentation(species, 500, false)).toMatchObject({
        x2: 0,
        y2: 0,
      });
    }
  });
});
