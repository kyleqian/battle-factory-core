// Dev-time extractor for the two gfx tags docs/faint-switch-notes.md §7c
// found genuinely unextracted: ANIM_TAG_SPARKLE_2 and ANIM_TAG_THIN_RING, the
// sprite gfx `General_HeldItemEffect` loads for HOLD_EFFECT_RESTORE_HP's
// battle-script animation (reference/pokeemerald/data/battle_anim_scripts.s:
// 10440-10460, "GrantingStarsEffect" + a `gThinRingExpandingSpriteTemplate`
// createsprite) - the Sitrus Berry heal's own sparkle/ring visual (Onix's
// proc, ~tick 7040-7072 of `battle1-switchin-dense-c.json`).
//
// `General_HeldItemEffect`'s actual body, in order:
//   loadspritegfx ANIM_TAG_THIN_RING
//   loadspritegfx ANIM_TAG_SPARKLE_2
//   3x createvisualtask AnimTask_RotateMonToSideAndRestore (rocks the
//     attacker side to side - a rotation task, no sprite of its own; not an
//     asset, not extracted here)
//   call GrantingStarsEffect (2x createsprite gGrantingStarsSpriteTemplate,
//     8 ticks apart, at attacker-relative offsets (-15,0) and (12,-5))
//   simple_palette_blend toward RGB(17,31,25) (attacker's OWN palette blend,
//     not a sprite gfx - the source of §3e's "Onix tints cyan/teal" pixel
//     read; not extracted here, it's a palette-blend call, not tile/palette
//     data, and out of this extractor's scope)
//   createsprite gThinRingExpandingSpriteTemplate (the ring itself)
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-anim-item-heal.ts
//
// Never imported at runtime - the production build only reads its JSON output.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndexedPng } from "./indexedPng.ts";
import { loadJascPal } from "./jascPal.ts";
import { sliceTiles } from "./tiles.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_ROOT = join(HERE, "..", "..");
const REF = join(RUN_ROOT, "reference", "pokeemerald");
const ASSETS_GEN = join(RUN_ROOT, "src", "assets", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- (1) sparkle_1.png + sparkle_2.pal: ANIM_TAG_SPARKLE_2 ("granting stars") ---
//
// tiles:   gBattleAnimSpriteGfx_Sparkle1 = INCGFX_U32("graphics/battle_anims/
//          sprites/sparkle_1.png", ".4bpp.lz") (src/graphics.c:179), bound to
//          BOTH ANIM_TAG_SPARKLE_1 and ANIM_TAG_SPARKLE_2
//          (src/data/battle_anim.h:1060-1061) - same tile source, two tags.
//          sparkle_1.png is 32x256px = 4 cols x 32 rows of 8x8 tiles (128
//          tiles total).
// palette: gBattleAnimSpritePal_Sparkle2 = INCGFX_U32("graphics/battle_anims/
//          sprites/sparkle_2.pal", ".gbapal.lz") (src/graphics.c:182) - a
//          standalone JASC-PAL file (not PNG-embedded, unlike most other
//          battle-anim sprite gfx already extracted in this repo).
// oam:     &gOamData_AffineOff_ObjNormal_32x32 (src/data/battle_anim.h:30),
//          used by gGrantingStarsSpriteTemplate (src/battle_anim_effects_2.c:
//          1400-1410, the template `GrantingStarsEffect` actually creates).
// anim:    gGrantingStarsAnimCmds (src/battle_anim_effects_2.c:733-741): 8
//          frames, tile offsets 0,16,32,...,112 (each a 4x4-tile=32x32 block,
//          matching the 32x32 OAM shape), 7 ticks each, then loops (JUMP(0)).
{
  const tilesImg = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "sparkle_1.png"));
  const { columns, rows, tiles } = sliceTiles(tilesImg);
  const palette = loadJascPal(join(REF, "graphics", "battle_anims", "sprites", "sparkle_2.pal"));
  const ringImg = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "thin_ring.png"));
  const ringSliced = sliceTiles(ringImg);
  writeJson(join(ASSETS_GEN, "battle-anim-item-heal.json"), {
    sparkle: {
      tileTag: "ANIM_TAG_SPARKLE_2",
      source: "src/graphics.c:179,182 (gBattleAnimSpriteGfx_Sparkle1 / gBattleAnimSpritePal_Sparkle2)",
      tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
      palette,
      oam: { shape: "32x32", size: "32x32", affine: false },
      // gGrantingStarsAnimCmds (battle_anim_effects_2.c:733-741). `tile`
      // indexes this sheet's 128 tiles (4 cols x 32 rows); each frame covers
      // a 4x4-tile (32x32px) block starting at that tile index.
      grantingStarsAnim: [0, 16, 32, 48, 64, 80, 96, 112].map((tile) => ({ tile, duration: 7 })),
      // GrantingStarsEffect (data/battle_anim_scripts.s:10040-10045): two
      // sprites, 8 ticks apart, at ANIM_ATTACKER-relative pixel offsets.
      spawns: [
        { dx: -15, dy: 0, delayAfterPrev: 0 },
        { dx: 12, dy: -5, delayAfterPrev: 8 },
      ],
    },
    // --- (2) thin_ring.png: ANIM_TAG_THIN_RING ("expanding ring") -----------
    //
    // Single source PNG supplies BOTH tiles and palette (src/graphics.c:
    // 691-692, both INCGFX_U32 calls target "thin_ring.png" - one as
    // ".4bpp.lz", one as ".gbapal.lz") - the embedded PLTE is genuinely the
    // sprite's own palette, not a borrowed one (unlike §1's split-source
    // sparkle). 64x64px = 8x8 tiles (64 tiles).
    // oam: &gOamData_AffineDouble_ObjNormal_64x64 (src/data/battle_anim.h:
    //      380), used by gThinRingExpandingSpriteTemplate
    //      (src/battle_anim_effects_2.c:742-751) - the template
    //      General_HeldItemEffect's own createsprite call actually uses
    //      (as opposed to gThinRingShrinkingSpriteTemplate/
    //      gBlendThinRingExpandingSpriteTemplate, which use the ObjBlend
    //      variant and aren't reached by this battle script).
    // affine anim: gThinRingExpandingAffineAnimTable has TWO entries
    //      (gThinRingExpandingAffineAnimCmds1/2, battle_anim_effects_2.c:
    //      710-722); which index General_HeldItemEffect's createsprite
    //      selects was NOT resolved from source alone (AnimSpriteOnMonPos's
    //      own affine-anim-index selection wasn't traced this session - see
    //      docs/faint-switch-notes.md §8). Both extracted, cmds1 flagged as
    //      the template's own array-index-0 default.
    ring: {
      tileTag: "ANIM_TAG_THIN_RING",
      source: "src/graphics.c:691-692 (gBattleAnimSpriteGfx_ThinRing / gBattleAnimSpritePal_ThinRing, one source PNG for both)",
      tileset: { columns: ringSliced.columns, rows: ringSliced.rows, tiles: ringSliced.tiles.map((t) => [...t.pixels]) },
      palette: ringImg.palette,
      oam: { shape: "64x64", size: "64x64", affine: "double" },
      affineAnims: {
        // AFFINEANIMCMD_FRAME(xScale,yScale,rotation,duration) - same
        // relative/absolute duration convention as `affineEmerge` in
        // battle-anim-tables.json (duration 0 = absolute jump, duration N =
        // once-per-tick relative add for N ticks).
        cmds1: [
          { xScale: 0x10, yScale: 0x10, rotation: 0, duration: 0 },
          { xScale: 0x10, yScale: 0x10, rotation: 0, duration: 30 },
        ],
        cmds2: [
          { xScale: 0x10, yScale: 0x10, rotation: 0, duration: 0 },
          { xScale: 0x20, yScale: 0x20, rotation: 0, duration: 15 },
        ],
        defaultIndex: 0,
      },
    },
  });
}

console.log("extraction complete");
