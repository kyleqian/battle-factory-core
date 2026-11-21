// sfa2 (docs/sfa2-summary-front-animations.md): the summary screen's front-sprite animation of every Battle Frontier species against
// the ROM. tests/fixtures/sfa2-summary-front-anim-rom.json holds, from the mGBA receipts of tools/probe/sfa2-summary-front-anim-rom.py
// (the draft summary, Info page, Battle Scene OFF), each picture from the motion's dispatch + 1 until two pictures after the sprite's
// callback became SpriteCallbackDummy: [x2, y2, OAM matrix | null, frame, invisible, blended colours 1..15 | null]. One species per
// motion type is pinned picture by picture (the batch opener, the initial path); every species is pinned by a digest of its whole
// sequence (the replacement path for all but the openers).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import fixture from "./fixtures/sfa2-summary-front-anim-rom.json" with { type: "json" };
import summaryFrontAnimation from "../src/data/gen/summary-front-animation.json" with { type: "json" };
import frontSpritesData from "../src/assets/gen/front-sprites.json" with { type: "json" };
import { frontPixels } from "../src/engine/monPicPixels.ts";
import {
  SUMMARY_FRONT_IMPLEMENTED_MOTIONS,
  SUMMARY_INITIAL_MON_ANIMATION_START,
  SUMMARY_REPLACEMENT_MON_ANIMATION_START,
  summaryFrontMotionIsApproximate,
  summaryFrontSpritePresentation,
} from "../src/engine/summaryFrontAnimation.ts";

type Picture = [number, number, number[] | null, number, number, number[] | null];
type Run = [number, ...Picture];

const frontSprites = frontSpritesData as unknown as Record<string, { palette: { r: number; g: number; b: number }[] }>;

function palette555(species: string): number[] {
  const palette = frontSprites[species]?.palette ?? frontPixels(species)!.palette;
  return palette.map((c) => (c.r >> 3) | ((c.g >> 3) << 5) | ((c.b >> 3) << 10));
}

/** BlendPalette over BGR555 colours (palette.c). */
function blend(color: number, target: number, coefficient: number): number {
  let out = 0;
  for (const shift of [0, 5, 10]) {
    const from = (color >> shift) & 31;
    const to = (target >> shift) & 31;
    out |= (from + (((to - from) * coefficient) >> 4)) << shift;
  }
  return out;
}

function ourPictures(species: string, path: string, count: number): Picture[] {
  const replacement = path !== "initial";
  const start = replacement ? SUMMARY_REPLACEMENT_MON_ANIMATION_START : SUMMARY_INITIAL_MON_ANIMATION_START;
  let palette: number[] | null = null;
  const pictures: Picture[] = [];
  for (let e = 1; e <= count; e += 1) {
    const p = summaryFrontSpritePresentation(species, start + e, replacement);
    let blended: number[] | null = null;
    if (p.blend && p.blend.coefficient > 0) {
      palette ??= palette555(species);
      blended = palette.slice(1).map((c) => blend(c, p.blend!.color, p.blend!.coefficient));
    }
    pictures.push([p.x2, p.y2, p.matrix ? [...p.matrix] : null, p.frame, p.invisible ? 1 : 0, blended]);
  }
  return pictures;
}

function expand(runs: readonly Run[]): Picture[] {
  return runs.flatMap(([count, ...picture]) => Array.from({ length: count }, () => picture as Picture));
}

const representatives = fixture.representatives as unknown as Record<string, { species: string; path: string; runs: Run[] }>;
const digests = fixture.digests as Record<string, { path: string; frames: number; sha256: string }>;
const types = [...new Set(summaryFrontAnimation.species.map((entry) => entry.motion.type))].sort();

describe("sfa2: summary front animations against the ROM", () => {
  it("has a ROM receipt for every motion type a Battle Frontier species uses (62) and a digest for every species (376)", () => {
    expect(types.length).toBe(62);
    expect(Object.keys(representatives).sort()).toEqual(types);
    expect(Object.keys(digests).sort()).toEqual(summaryFrontAnimation.species.map((entry) => entry.species.replace("SPECIES_", "")).sort());
  });

  it.each(types)("%s matches its ROM receipt picture for picture", (type) => {
    const { species, path, runs } = representatives[type]!;
    const rom = expand(runs);
    expect(ourPictures(species, path, rom.length)).toEqual(rom);
  });

  it("every species' whole animation matches its ROM digest (initial and replacement paths)", () => {
    const failures: string[] = [];
    for (const [species, { path, frames, sha256 }] of Object.entries(digests)) {
      const ours = createHash("sha256").update(JSON.stringify(ourPictures(species, path, frames))).digest("hex");
      if (ours !== sha256) failures.push(species);
    }
    expect(failures).toEqual([]);
  });

  it("leaves no species on the approximate-static fallback", () => {
    expect([...SUMMARY_FRONT_IMPLEMENTED_MOTIONS].sort()).toEqual(types);
    for (const entry of summaryFrontAnimation.species) {
      const species = entry.species.replace("SPECIES_", "");
      expect(summaryFrontMotionIsApproximate(entry.motion.type)).toBe(false);
      expect(summaryFrontSpritePresentation(species, SUMMARY_INITIAL_MON_ANIMATION_START + 30, false).motionClaim).toBe("source");
    }
  });

  it("pins the three species Kyle saw fidget (2026-11-21): GRAVELER rocks, LUVDISC wobbles side to side, POLIWHIRL hops and stretches", () => {
    // Replacement path, elapsed from the dispatch picture; each value is in the species' ROM digest above.
    const at = (species: string, e: number) => summaryFrontSpritePresentation(species, SUMMARY_REPLACEMENT_MON_ANIMATION_START + e, true);
    // BOUNCE_ROTATE_TO_SIDES_SMALL: bounces out to x2 -8 / +8 tilted by -(2048 * x2) / 8, negated for the flipped summary sprite
    expect(at("GRAVELER", 10)).toMatchObject({ x2: -8, y2: 0, matrix: [-251, 49, 49, 251] });
    expect(at("GRAVELER", 23)).toMatchObject({ x2: 8, y2: 0, matrix: [-251, -49, -49, 251] });
    // H_SLIDE_WOBBLE: x2 = Sin(e * 256 / 100, 8) (flipped) under a Sin(e * 512 / 100, 3276) rotation wobble
    expect(at("LUVDISC", 13)).toMatchObject({ x2: -5, matrix: [-243, -80, -80, 243] });
    expect(at("LUVDISC", 27)).toMatchObject({ x2: -8, matrix: [-256, 0, 0, 256] });
    // H_JUMPS_V_STRETCH (delay 5, noFlip): a hop left, the squash, the stretch up, then the hop back
    expect(at("POLIWHIRL", 26)).toMatchObject({ x2: -7, y2: 8, matrix: [224, 0, 0, 320] });
    expect(at("POLIWHIRL", 41)).toMatchObject({ x2: 1, y2: -20, matrix: [288, 0, 0, 193] });
    expect(at("POLIWHIRL", 79)).toMatchObject({ x2: 0, y2: 0, matrix: null, motionFinished: true });
  });
});
