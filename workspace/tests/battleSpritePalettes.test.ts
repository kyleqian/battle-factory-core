// Pins src/assets/gen/battle-sprite-palettes.json (the gameplay tick path's
// palette-only view of the battle sprite tables, see
// tools/extract/extract-battle-sprite-palettes.ts) to the full tables, so a
// re-extraction of either sprite table without re-running the palette
// extractor fails here instead of drifting the live move palettes.
import { describe, expect, it } from "vitest";
import { backSprites, frontSprites } from "./helpers/battleSprites.ts";
import palettes from "../src/assets/gen/battle-sprite-palettes.json" with { type: "json" };
import { extractBattleSpritePalettes } from "../tools/extract/extract-battle-sprite-palettes.ts";

type Rgb = { r: number; g: number; b: number };
type SpriteTable = Record<string, { palette: Rgb[] }>;

describe("battle-sprite-palettes.json", () => {
  it("is exactly the palettes of the two sprite tables", () => {
    expect(palettes).toEqual(
      extractBattleSpritePalettes(backSprites as unknown as SpriteTable, frontSprites as unknown as SpriteTable),
    );
    expect(Object.keys(palettes.back)).toHaveLength(Object.keys(backSprites).length);
    expect(Object.keys(palettes.front)).toHaveLength(Object.keys(frontSprites).length);
    expect((palettes.front as Record<string, Rgb[]>).GROVYLE).toEqual((frontSprites as unknown as SpriteTable).GROVYLE!.palette);
  });
});
