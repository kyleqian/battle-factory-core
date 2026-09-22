import mudSandAsset from "./assets/sand-tomb-mud-sand.json" with { type: "json" };
import {
  compositeGbaObjScanlines,
  type GbaObjComposite,
  type GbaObjRaster,
} from "./gbaObjCompositor.ts";
import type { NativeSpriteSeed } from "./nativeAnimationRuntime.ts";

export interface NativeAnimationColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Convert runtime-owned source sprites into ordinary compositor inputs.
 * The host supplies these alongside the scene's other OBJ rasters; this adapter
 * deliberately does not claim complete battle OAM ownership.
 */
export function nativeAnimationObjRasters(
  spritesInOamOrder: readonly NativeSpriteSeed[],
): readonly GbaObjRaster<NativeAnimationColor>[] {
  return spritesInOamOrder.flatMap((sprite, oamIndex) => {
    if (!sprite.inUse || sprite.invisible) return [];
    if (sprite.template !== "gMudsportMudSpriteTemplate") {
      throw new Error(`unsupported native render template ${sprite.template}`);
    }
    const tileOffset = (sprite.attr[2] & 0x3ff) - sprite.sheetTileStart;
    if (tileOffset < 0 || tileOffset + 3 >= mudSandAsset.tileset.tiles.length) {
      throw new Error(`MUD_SAND 16x16 tile span is invalid at ${tileOffset}`);
    }
    const indices = new Array<number>(16 * 16).fill(0);
    for (let tileY = 0; tileY < 2; tileY++) {
      for (let tileX = 0; tileX < 2; tileX++) {
        const tile = mudSandAsset.tileset.tiles[tileOffset + tileY * 2 + tileX]!;
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          indices[(tileY * 8 + y) * 16 + tileX * 8 + x] = tile[y * 8 + x]!;
        }
      }
    }
    const pixels = indices.map((index) => index === 0 ? null : mudSandAsset.palette[index]!);
    const rawX = sprite.attr[1] & 0x1ff;
    const rawY = sprite.attr[0] & 0xff;
    return [{
      oamIndex,
      priority: (sprite.attr[2] >>> 10 & 3) as 0 | 1 | 2 | 3,
      mode: "normal" as const,
      declaredWidth: 16,
      x: rawX >= 256 ? rawX - 512 : rawX,
      y: rawY >= 160 ? rawY - 256 : rawY,
      width: 16,
      height: 16,
      pixels,
    }];
  });
}

/** Focused convenience for standalone hosts; integrated hosts should merge rasters first. */
export function compositeNativeAnimationObjects(
  spritesInOamOrder: readonly NativeSpriteSeed[],
): GbaObjComposite<NativeAnimationColor> {
  return compositeGbaObjScanlines(240, 160, nativeAnimationObjRasters(spritesInOamOrder));
}
