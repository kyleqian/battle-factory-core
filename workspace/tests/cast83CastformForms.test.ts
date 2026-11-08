// cast83 (ISSUES #143; docs/cast83-castform-forms.md): the per-form CASTFORM catalog (tools/extract/cast83-extract-castform-forms.ts)
// pinned against the reference build's own concatenated sheets and palette, and the form-aware field art.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import castformForms from "../src/assets/gen/castform-forms.json" with { type: "json" };
import backSprites from "../src/assets/gen/battle-back-sprites.json" with { type: "json" };
import frontSprites from "../src/assets/gen/battle-opponent-front-sprites.json" with { type: "json" };
import {
  battleCommandFieldArtElevation, battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView,
} from "../src/engine/battleCommandFieldArt.ts";
import { composeLiveArtPalettes, composeLivePalettes } from "../src/engine/liveMovePaletteComposite.ts";
import {
  LIVE_CASTFORM_FORM_PROVEN, LIVE_CASTFORM_FORM_RESIDUAL, liveCastformFormDeclineReason, liveCastformFormDeclines,
} from "../src/engine/liveMoveAnimation.ts";

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

const SPECIES = { CASTFORM: 385, CHANSEY: 113, GOLBAT: 42 } as const;
const fieldOf = (player: number, opponent: number, forms: [number?, number?] = []) => ({
  player: { species: player, ...(forms[0] === undefined ? {} : { castformForm: forms[0] }) },
  opponent: { species: opponent, ...(forms[1] === undefined ? {} : { castformForm: forms[1] }) },
}) as never;

describe("cast83: the field art draws the CASTFORM form", () => {
  it("normal form / other species: byte-identical to the species art (no castformForm on the art)", () => {
    const plain = createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.CASTFORM));
    // bnd254b: the pic's palette comes from battle-sprite-palettes.json (equal values), its pixels are the sprite table's own object.
    expect(plain.player.pic).toEqual((backSprites as Record<string, unknown>).CASTFORM);
    expect(plain.opponent.pic).toEqual((frontSprites as Record<string, unknown>).CASTFORM);
    expect(plain.player.pic.tileset).toBe((backSprites as Record<string, { tileset: unknown }>).CASTFORM!.tileset);
    expect(plain.opponent.pic.tileset).toBe((frontSprites as Record<string, { tileset: unknown }>).CASTFORM!.tileset);
    expect([plain.player.castformForm, plain.opponent.castformForm]).toEqual([undefined, undefined]);
    expect(battleCommandFieldSpriteOrigin(plain.opponent, "opponent")).toEqual({ x: 144, y: 12 }); // 8 + 17 - 13 (castform-art-diagnosis)
    expect(battleCommandFieldSpriteOrigin(plain.player, "player")).toEqual({ x: 40, y: 48 });
    // An unknown form keeps the normal art (the gate declines it); a form on another species is ignored.
    const unknown = createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.CHANSEY, [255, 2]));
    expect(unknown.player.pic).toBe(plain.player.pic);
    expect(unknown.player.castformForm).toBeUndefined();
    expect(unknown.opponent.speciesSymbol).toBe("CHANSEY");
    expect(unknown.opponent.castformForm).toBeUndefined();
  });

  it("weather forms: frame + palette, opponent gCastformFrontSpriteCoords[form] + sCastformElevations[form], player back Y 0", () => {
    for (const form of [1, 2, 3]) {
      const art = createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.CASTFORM, [form, form]));
      const source = forms[form]!;
      expect(art.player.pic).toEqual(source.back);
      expect(art.opponent.pic).toEqual(source.front);
      expect([art.player.castformForm, art.opponent.castformForm]).toEqual([form, form]);
      expect(art.opponent.coords).toEqual(source.frontCoords);
      expect(art.player.coords).toEqual(createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.CHANSEY)).player.coords);
      expect(battleCommandFieldArtElevation(art.opponent, "opponent")).toBe(source.elevation);
      expect(battleCommandFieldSpriteOrigin(art.opponent, "opponent"))
        .toEqual({ x: 144, y: 8 + source.frontCoords.yOffset - source.elevation });
      expect(battleCommandFieldSpriteOrigin(art.player, "player")).toEqual({ x: 40, y: 48 });
    }
    // FIRE 3, WATER 4, ICE 3: the opponent corner y per form (8 + y_offset - elevation)
    expect([1, 2, 3].map((form) => battleCommandFieldSpriteOrigin(
      createBattleCommandFieldArtView(fieldOf(SPECIES.CHANSEY, SPECIES.CASTFORM, [undefined, form])).opponent, "opponent").y)).toEqual([3, 4, 3]);
  });

  it("composeLiveArtPalettes loads castformPalette[form] into the CASTFORM's OBJ bank; identical without a form", () => {
    const plain = createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT));
    expect(composeLiveArtPalettes(plain)).toEqual(composeLivePalettes("CASTFORM", "GOLBAT"));
    const water = createBattleCommandFieldArtView(fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT, [2]));
    const words = composeLiveArtPalettes(water)!.unfaded;
    expect(Buffer.from(Uint16Array.from(words.slice(16 * 16, 17 * 16)).buffer)
      .equals(readFileSync(`${CASTFORM_DIR}/normal.gbapal`).subarray(64, 96))).toBe(true);
    expect(words.slice(17 * 16, 18 * 16)).toEqual(composeLivePalettes("CASTFORM", "GOLBAT")!.unfaded.slice(17 * 16, 18 * 16));
  });
});

describe("cast83: the weather-form gate lifts only ROM-proven (move, Castform role, form) keys", () => {
  const receipt = JSON.parse(readFileSync("tools/integration/fixtures/cast83/receipt.json", "utf8")) as {
    keys: Record<string, { windows: number; live: number; liveExact: number; sides: string[]; allSame: boolean }>;
  };
  const lifted = JSON.parse(readFileSync("tools/integration/fixtures/cast83/receipt-lifted.json", "utf8")) as typeof receipt;
  it("every proven key: live in the final-code receipt, every live window 0 px, r1 == r2, both Castform sides", () => {
    // qa91: three keys lifted on live audit 21's aligned windows (their receipt: tests/qa91QuickAttackCastformKeys.test.ts).
    const qa91Lifted = new Set(["52:by:1", "53:by:1", "184:at:3", "52:by:2", "52:by:3"]); // + cff230 (tests/cff230CastformForms.test.ts)
    expect(LIVE_CASTFORM_FORM_PROVEN.size).toBe(29 + qa91Lifted.size);
    for (const key of LIVE_CASTFORM_FORM_PROVEN) {
      if (qa91Lifted.has(key)) continue;
      const k = receipt.keys[key];
      expect(k, key).toBeDefined();
      expect([k!.live > 0, k!.liveExact === k!.live, k!.allSame, k!.sides], key).toEqual([true, true, true, ["opponent", "player"]]);
    }
  });
  it("every residual key: declines in the final-code receipt; measured with the gate lifted, its live windows are not all 0 px", () => {
    for (const key of LIVE_CASTFORM_FORM_RESIDUAL.keys()) {
      expect(receipt.keys[key]!.live, key).toBe(0);
      expect(lifted.keys[key]!.liveExact < lifted.keys[key]!.live, key).toBe(true);
    }
  });
  it("the predicate: by / at role, any castform side; no request (the Substitute swap composite) and unknown forms decline", () => {
    const field = fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT, [3]);
    expect(liveCastformFormDeclines(fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT), { moveId: 52, attacker: 0 })).toBe(false);
    expect(liveCastformFormDeclines(field, { moveId: 196, attacker: 0 })).toBe(false); // 196:by:3
    expect(liveCastformFormDeclines(field, { moveId: 196, attacker: 1 })).toBe(false); // 196:at:3
    expect(liveCastformFormDeclines(field, { moveId: 184, attacker: 1 })).toBe(false); // 184:at:3 (qa91)
    expect(liveCastformFormDeclineReason(fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT, [2]), { moveId: 196, attacker: 1 }))
      .toMatch(/^measured residual 196:at:2/);
    expect(liveCastformFormDeclineReason(field, { moveId: 19, attacker: 1 })).toBe("body not ROM-proven for 19:at:3");
    expect(liveCastformFormDeclineReason(field)).toBe("Substitute swap composite not measured");
    expect(liveCastformFormDeclineReason(fieldOf(SPECIES.CASTFORM, SPECIES.GOLBAT, [255]), { moveId: 196, attacker: 0 }))
      .toBe("unknown form 255: no form art");
  });
});
