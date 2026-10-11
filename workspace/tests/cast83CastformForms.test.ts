// cast83 (ISSUES #143; docs/cast83-castform-forms.md): the per-form CASTFORM catalog (tools/extract/cast83-extract-castform-forms.ts)
// pinned against the reference build's own concatenated sheets and palette, and the form-aware field art.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import castformForms from "../src/assets/gen/castform-forms.json" with { type: "json" };
import backSprites from "../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSprites from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };

const CASTFORM_DIR = "reference/pokeemerald/graphics/pokemon/castform";
type Tiles = { columns: number; rows: number; tiles: number[][] };
type Rgb = { r: number; g: number; b: number };

/** The tileset re-encoded as GBA 4bpp (row-major 8x8 tiles, two pixels per byte, low nibble first). */
function encode4bpp(tileset: Tiles): Buffer {
  const out = Buffer.alloc(tileset.tiles.length * 32);
  tileset.tiles.forEach((tile, index) => {
    for (let pixel = 0; pixel < 64; pixel += 2) out[index * 32 + pixel / 2] = (tile[pixel]! & 15) | ((tile[pixel + 1]! & 15) << 4);
  });
  return out;
}
const bgr555 = (palette: readonly Rgb[]) => {
  const out = Buffer.alloc(palette.length * 2);
  palette.forEach(({ r, g, b }, index) => out.writeUInt16LE((r >> 3) | ((g >> 3) << 5) | ((b >> 3) << 10), index * 2));
  return out;
};
const sha1 = (data: Buffer) => createHash("sha1").update(data).digest("hex");
const forms = castformForms.forms;

describe("cast83: the CASTFORM form catalog equals the reference sheets", () => {
  it("each form's front / back frame is frame `form` of anim_front.4bpp / back.4bpp; the palette is castformPalette[form]", () => {
    const front = readFileSync(`${CASTFORM_DIR}/anim_front.4bpp`);
    const back = readFileSync(`${CASTFORM_DIR}/back.4bpp`);
    const palettes = readFileSync(`${CASTFORM_DIR}/normal.gbapal`);
    expect([front.length, back.length, palettes.length]).toEqual([4 * 2048, 4 * 2048, 4 * 32]);
    expect(forms.map(({ form, name }) => [form, name])).toEqual([[0, "NORMAL"], [1, "FIRE"], [2, "WATER"], [3, "ICE"]]);
    for (const { form, front: f, back: b } of forms) {
      expect(encode4bpp(f.tileset).equals(front.subarray(form * 2048, (form + 1) * 2048))).toBe(true);
      expect(f.frame2).toEqual(f.tileset);
      expect(encode4bpp(b.tileset).equals(back.subarray(form * 2048, (form + 1) * 2048))).toBe(true);
      expect(bgr555(f.palette).equals(palettes.subarray(form * 32, (form + 1) * 32))).toBe(true);
      expect(b.palette).toEqual(f.palette);
    }
    // frame / palette hashes of the reference files (anim_front.4bpp, back.4bpp, normal.gbapal chunks), per form
    expect(forms.map(({ form }) => [
      sha1(front.subarray(form * 2048, (form + 1) * 2048)), sha1(back.subarray(form * 2048, (form + 1) * 2048)),
      sha1(palettes.subarray(form * 32, (form + 1) * 32)),
    ].map((hash) => hash.slice(0, 12)))).toEqual([
      ["4f03e80e24c4", "71fb95ecc895", "9cc893b1862f"],
      ["b5eae2e660f9", "1bdacb905923", "0ab0006eed31"],
      ["994976b412fe", "a6776e8c2c26", "bc80f7dbb521"],
      ["75d7b3a53efb", "22154e71a809", "f62e68a9716c"],
    ]);
  });

  it("the source geometry tables: gCastformFrontSpriteCoords, sCastformElevations, sCastformBackSpriteYCoords", () => {
    expect(forms.map(({ frontCoords, elevation, backYDelta }) => [frontCoords, elevation, backYDelta])).toEqual([
      [{ width: 32, height: 32, yOffset: 17 }, 13, 0],
      [{ width: 48, height: 48, yOffset: 9 }, 14, 0],
      [{ width: 32, height: 48, yOffset: 9 }, 13, 0],
      [{ width: 64, height: 48, yOffset: 8 }, 13, 0],
    ]);
  });

  it("form 0 is byte-identical to the existing CASTFORM catalog entries (which stay unchanged)", () => {
    expect(forms[0]!.back).toEqual((backSprites as Record<string, unknown>).CASTFORM);
    expect(forms[0]!.front).toEqual((frontSprites as Record<string, unknown>).CASTFORM);
  });
});
