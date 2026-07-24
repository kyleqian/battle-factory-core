// Dev-time extractor for S7 move-animation groundwork (docs/
// battle-move-anim-notes.md): the two moves turn 1 of
// tools/compare/traces-groundtruth/battle1-turn1.json actually plays -
// ROCK_SLIDE (Onix -> Grovyle) and DOUBLE_TEAM (Grovyle, self) - plus the
// generic per-hit hit-flash effect every damaging move shares.
//
// Call chain, per reference/pokeemerald/src/battle_anim.c:205
// (LaunchBattleAnimation(gBattleAnims_Moves, move, TRUE)):
//   gBattleAnims_Moves[MOVE_ROCK_SLIDE]  -> Move_ROCK_SLIDE  (data/battle_anim_scripts.s:2119)
//   gBattleAnims_Moves[MOVE_DOUBLE_TEAM] -> Move_DOUBLE_TEAM (data/battle_anim_scripts.s:2778)
// Both scripts are decoded (not re-derived) into
// src/data/gen/battle-move-anim-scripts.json by
// tools/extract/decode-battle-anim-script.ts's shared opcode table - see
// that file for the decoder itself.
//
// This file extracts the ONE genuinely new tile/palette asset the two
// scripts need: ROCK_SLIDE's `loadspritegfx ANIM_TAG_ROCKS` ->
// gFallingRockSpriteTemplate (src/battle_anim_rock.c:55-64) -> rocks.png.
// DOUBLE_TEAM needs NO new tile/palette asset: AnimTask_DoubleTeam
// (src/battle_anim_effects_1.c:5173-5206) clones the ATTACKER's own already-
// rendered battle sprite via CloneBattlerSpriteWithBlend (src/
// battle_anim_mons.c:1626-1645, `gSprites[i] = gSprites[spriteId]` - a
// struct copy, no new gfx load) - Grovyle's front sprite is already
// extracted as src/assets/gen/battle-opponent-front-sprites.json (GROVYLE
// key, prior session). The clone's darkened/translucent look comes from a
// palette blend + OBJ_BLEND OAM flag, not new art - see
// src/data/gen/battle-move-anim-tables.json's `doubleTeam` entry for those
// constants, extracted alongside the shared hit-flash timing.
//
// Run with:
//   node --experimental-strip-types tools/extract/extract-battle-move-anim-assets.ts
//
// Never imported at runtime - the production build only reads the JSON
// output under src/assets/gen/ and src/data/gen/.

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
const DATA_GEN = join(RUN_ROOT, "src", "data", "gen");

mkdirSync(ASSETS_GEN, { recursive: true });
mkdirSync(DATA_GEN, { recursive: true });

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  console.log(`wrote ${path}`);
}

// --- rocks.png: gFallingRockSpriteTemplate's tile/palette source -----------
//
// graphics/battle_anims/sprites/rocks.png, 32x192px = 4 cols x 24 rows of
// 8x8 tiles = 96 tiles, matching gBattleAnimSpriteGfx_Rocks/
// gBattleAnimSpritePal_Rocks's compiled size (0x0C00 bytes / 32B-per-4bpp-
// tile = 96 tiles, src/graphics.c:203-204, table entries src/data/
// battle_anim.h:1070/1363 tagged ANIM_TAG_ROCKS). gFallingRockSpriteTemplate
// (src/battle_anim_rock.c:55-64) uses OAM shape 32x32 (4x4 tiles = 16 tiles
// per frame, gOamData_AffineOff_ObjNormal_32x32) - so the 96 tiles form 6
// stacked 32x32 frames (frame N = tiles [16N, 16N+16)).
//
// sAnims_FlyingRock (battle_anim_rock.c:30-53), the ONLY anim table
// gFallingRockSpriteTemplate references, selects frames 2/3/4 (tile offsets
// 32/48/64) via ANIMCMD_FRAME - frames 0/1/5 (tile offsets 0/16/80) are
// real data in this same sheet but belong to OTHER rock-move templates
// (e.g. the sAnim_Rock_Biggest/Bigger/Big sequence a few lines up in the
// same file, used by ROCK_TOMB/ROCK_BLAST-family moves) - out of this
// step's scope (ROCK_SLIDE + DOUBLE_TEAM only), flagged as a needs-only
// adjacency, not extracted separately (the full 96-tile sheet already
// covers them if a future slice wants them).
{
  const image = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "rocks.png"));
  const { columns, rows, tiles } = sliceTiles(image);
  writeJson(join(ASSETS_GEN, "battle-anim-rocks.json"), {
    source: "graphics/battle_anims/sprites/rocks.png (src/graphics.c:203-204, ANIM_TAG_ROCKS)",
    tileset: { columns, rows, tiles: tiles.map((t) => [...t.pixels]) },
    palette: image.palette,
    oam: { shape: "32x32", size: "32x32", affine: false },
    frameSizeTiles: 16,
    // Frame index = tile offset / 16 (frame occupies tiles [16*i, 16*i+16)).
    fallingRockAnims: {
      source: "src/battle_anim_rock.c:30-64 (sAnims_FlyingRock, gFallingRockSpriteTemplate)",
      frames: [2, 3, 4],
    },
    otherRockFramesNeedsOnly: {
      note: "frames 0,1,5 belong to other rock-move templates in the same file (ROCK_TOMB/ROCK_BLAST family) - out of scope for ROCK_SLIDE/DOUBLE_TEAM, not decoded this session",
      frames: [0, 1, 5],
    },
  });
}

// --- ENDEAVOR's own new sprite gfx (S7 slice E1c groundwork) ---------------
//
// Move_ENDEAVOR (data/battle_anim_scripts.s:3789-3803, see docs/
// battle-menu-notes.md §14/§15) is genuinely custom asset work, unlike
// DOUBLE_TEAM above (no new gfx) - it `loadspritegfx`s TWO tags neither
// ROCK_SLIDE nor DOUBLE_TEAM needed:
//   ANIM_TAG_SWEAT_DROP -> gBattleAnimSpriteGfx_SweatDrop (graphics/
//     battle_anims/sprites/sweat_drop.png, src/graphics.c:866-867) - a
//     single 8x8 tile (0x0020 bytes / 32B-per-4bpp-tile = 1 tile), used
//     un-animated (gDummySpriteAnimTable) by gFacadeSweatDropSpriteTemplate
//     (src/battle_anim_effects_3.c:891-900, OAM gOamData_AffineOff_
//     ObjNormal_8x8) - the small droplet dot CreateSweatDroplets spawns
//     (see battle-move-anim-tables.json's own `endeavor.sweatDroplets`).
//   ANIM_TAG_IMPACT -> gBattleAnimSpriteGfx_Impact (graphics/battle_anims/
//     sprites/impact.png, src/graphics.c:464-465) - 32x32px = 4x4 tiles =
//     16 tiles (0x0200 bytes / 32B = 16 tiles), ONE frame only (no
//     ANIMCMD_FRAME table - gBasicHitSplatSpriteTemplate,
//     src/battle_anim_normal.c:169-178, uses gDummySpriteAnimTable and
//     instead pops/shrinks via its own AFFINE anim, sAffineAnims_HitSplat
//     :134-166 - see `endeavor.hitSplat` below).
{
  const sweatDrop = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "sweat_drop.png"));
  const sweatDropTiles = sliceTiles(sweatDrop);
  writeJson(join(ASSETS_GEN, "battle-anim-sweat-drop.json"), {
    source: "graphics/battle_anims/sprites/sweat_drop.png (src/graphics.c:866-867, ANIM_TAG_SWEAT_DROP)",
    tileset: { columns: sweatDropTiles.columns, rows: sweatDropTiles.rows, tiles: sweatDropTiles.tiles.map((t) => [...t.pixels]) },
    palette: sweatDrop.palette,
    oam: { shape: "8x8", size: "8x8", affine: false },
  });

  const impact = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "impact.png"));
  const impactTiles = sliceTiles(impact);
  writeJson(join(ASSETS_GEN, "battle-anim-hitsplat.json"), {
    source: "graphics/battle_anims/sprites/impact.png (src/graphics.c:464-465, ANIM_TAG_IMPACT)",
    tileset: { columns: impactTiles.columns, rows: impactTiles.rows, tiles: impactTiles.tiles.map((t) => [...t.pixels]) },
    palette: impact.palette,
    oam: { shape: "32x32", size: "32x32", affine: true },
  });
}

// --- DRAGON_BREATH's own new sprite gfx (S7 slice E2a, docs/dragon-breath-
// notes.md's asset inventory) ------------------------------------------------
//
// gDragonBreathFireSpriteTemplate (src/battle_anim_dragon.c:89-98) loads
// ANIM_TAG_SMALL_EMBER -> gBattleAnimSpriteGfx_SmallEmber (graphics/
// battle_anims/sprites/small_ember.png, src/graphics.c:113-114) - 32x160px =
// 4x20 tiles = 80 8x8 tiles, OAM shape 32x32 (4x4 tiles = 16 tiles/frame,
// gOamData_AffineDouble_ObjNormal_32x32) -> 5 stacked frames (tile offsets
// 0/16/32/48/64, sAnim_DragonBreathFire_0/_1 at battle_anim_dragon.c:47-59
// both ANIMCMD_FRAME into this same sheet, only frames 1/2/3 (offsets
// 16/32/48) are ever used - a yellow->red ramp, frame 0/4 belong to sibling
// moves sharing this tag (OUTRAGE/DRAGON_RAGE's own fire templates further
// up the same file). `_1` is the mirrored (vFlip+hFlip) variant, selected
// when the attacker is player-side (StartDragonFireTranslation's own
// GetBattlerSide check) - Onix here, so `_1` is this trace's own variant;
// both share the same tile/palette source, only the OAM flip flags differ
// (a renderer concern, not a gfx-extraction one).
{
  const smallEmber = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "small_ember.png"));
  const smallEmberTiles = sliceTiles(smallEmber);
  writeJson(join(ASSETS_GEN, "battle-anim-small-ember.json"), {
    source: "graphics/battle_anims/sprites/small_ember.png (src/graphics.c:113-114, ANIM_TAG_SMALL_EMBER)",
    tileset: { columns: smallEmberTiles.columns, rows: smallEmberTiles.rows, tiles: smallEmberTiles.tiles.map((t) => [...t.pixels]) },
    palette: smallEmber.palette,
    oam: { shape: "32x32", size: "32x32", affine: true },
    frameSizeTiles: 16,
    // Frame index = tile offset / 16 (frame occupies tiles [16*i, 16*i+16)).
    dragonBreathFireAnims: {
      source: "src/battle_anim_dragon.c:47-98 (sAnim_DragonBreathFire_0/_1, gDragonBreathFireSpriteTemplate)",
      frames: [1, 2, 3],
      variant0: "attacker on the opponent side (unmirrored)",
      variant1: "attacker on the player side (vFlip+hFlip) - Onix's own case this trace",
    },
    firePunchAnims: {
      source: "src/battle_anim_fire.c:39-84,466-488 (sAnim_FireSpiralSpread, gFireSpiralInwardSpriteTemplate, gFireSpreadSpriteTemplate)",
      frames: [1, 2, 3],
      frameDurationTicks: 4,
      spiral: { durationTicks: 30, radiusStart: 60, radiusDeltaFixed8: -512, angleStep: 9 },
      spread: { startYOffset: 10, durationTicks: 40 },
    },
    otherFramesNeedsOnly: {
      note: "frames 0,4 belong to sibling moves sharing ANIM_TAG_SMALL_EMBER (OUTRAGE/DRAGON_RAGE fire templates, same file) - out of scope for DRAGON_BREATH, not decoded this session",
      frames: [0, 4],
    },
  });
}

// --- FIRE_PUNCH's basic fist ------------------------------------------------
//
// `create_fist_sprite` expands to gFistFootSpriteTemplate with anim 0.
// The template uses the first 32x32 frame (16 tiles) of hands_and_feet.png;
// the remaining three frames are sibling foot/hand animations.
{
  const hands = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "hands_and_feet.png"));
  const handTiles = sliceTiles(hands);
  writeJson(join(ASSETS_GEN, "battle-anim-hands-and-feet.json"), {
    source: "graphics/battle_anims/sprites/hands_and_feet.png (src/graphics.c:847-848, ANIM_TAG_HANDS_AND_FEET)",
    tileset: { columns: handTiles.columns, rows: handTiles.rows, tiles: handTiles.tiles.map((t) => [...t.pixels]) },
    palette: hands.palette,
    oam: { shape: "32x32", size: "32x32", affine: false },
    frameSizeTiles: 16,
    firePunchFist: {
      source: "asm/macros/battle_anim_script.inc:create_fist_sprite; src/battle_anim_fight.c:sAnim_Fist,gFistFootSpriteTemplate,AnimBasicFistOrFoot",
      frame: 0,
      durationArg: 8,
    },
  });
}

// --- ICE_PUNCH's source-composed crystal sheet -----------------------------
//
// graphics_file_rules.mk concatenates ice_crystals_0..4 into the compiled
// 0x1c0-byte ANIM_TAG_ICE_CRYSTALS sheet. Preserve that tile order: the
// source animation tables address the large crystal at tile 4 and the small
// crystal at tile 6.
{
  const parts = [0, 1, 2, 3, 4].map((part) =>
    sliceTiles(
      decodeIndexedPng(
        join(
          REF,
          "graphics",
          "battle_anims",
          "sprites",
          `ice_crystals_${part}.png`,
        ),
      ),
    )
  );
  const tiles = parts.flatMap((part) =>
    part.tiles.map((tile) => [...tile.pixels])
  );
  writeJson(join(ASSETS_GEN, "battle-anim-ice-crystals.json"), {
    source: "graphics/battle_anims/sprites/ice_crystals_{0..4}.png concatenated by graphics_file_rules.mk (src/graphics.c:484-485, ANIM_TAG_ICE_CRYSTALS)",
    tileset: { columns: 2, rows: 7, tiles },
    palette: loadJascPal(
      join(REF, "graphics", "battle_anims", "sprites", "ice_crystals.pal"),
    ),
    frames: {
      large: { tile: 4, width: 8, height: 16 },
      small: { tile: 6, width: 8, height: 8 },
    },
  });
}

// --- Status_Freeze / SHEER_COLD's source-composed frozen cube --------------
//
// graphics_file_rules.mk concatenates four differently shaped OBJ pieces
// into ANIM_TAG_ICE_CUBE's 0x1200-byte sheet. AnimTask_FrozenIceCube installs
// the matching subsprite table around its task-created anchor: 64x64 at
// (-16,-16), 64x32 at (-16,48), 32x64 at (48,-16), and 32x32 at (48,48).
// Keep the pieces separate so the runtime compositor follows that source OAM
// layout rather than treating the assembled 96x96 image as baked chrome.
{
  const pieces = [
    { file: "ice_cube_0.png", x: -16, y: -16, width: 64, height: 64, tileOffset: 0 },
    { file: "ice_cube_1.png", x: -16, y: 48, width: 64, height: 32, tileOffset: 64 },
    { file: "ice_cube_2.png", x: 48, y: -16, width: 32, height: 64, tileOffset: 96 },
    { file: "ice_cube_3.png", x: 48, y: 48, width: 32, height: 32, tileOffset: 128 },
  ].map((piece) => {
    const image = decodeIndexedPng(
      join(REF, "graphics", "battle_anims", "sprites", piece.file),
    );
    const sliced = sliceTiles(image);
    return {
      ...piece,
      tileset: {
        columns: sliced.columns,
        rows: sliced.rows,
        tiles: sliced.tiles.map((tile) => [...tile.pixels]),
      },
    };
  });
  writeJson(join(ASSETS_GEN, "battle-anim-ice-cube.json"), {
    source: "graphics/battle_anims/sprites/ice_cube_{0..3}.png concatenated by graphics_file_rules.mk (src/graphics.c:48-49, ANIM_TAG_ICE_CUBE)",
    palette: loadJascPal(
      join(REF, "graphics", "battle_anims", "sprites", "ice_cube.pal"),
    ),
    task: {
      source: "src/battle_anim_status_effects.c:210-259,381-480 (sFrozenIceCubeSubsprites, AnimTask_FrozenIceCube)",
      createAnchorOffset: { x: -32, y: -36 },
      subpriority: 4,
      objMode: "blend",
    },
    pieces,
  });
}

// --- decoded battle_anim_scripts.s step lists -------------------------------
//
// Hand-transcribed (not machine-parsed) from data/battle_anim_scripts.s -
// deterministic since the source text itself is fixed, same convention as
// this extractor's own literal `fallingRockAnims` table above and the prior
// session's `regularBallAnim`/`affineEmerge` tables in
// extract-battle-anim-assets.ts. Opcode field names mirror the macros in
// asm/macros/battle_anim_script.inc 1:1 (createsprite's `argv` -> this
// script's own `gBattleAnimArgs[]`, consumed by whichever C callback the
// template names - see battle-move-anim-tables.json for those callbacks'
// decoded formulas). `delay N` is the only opcode this doc claims exact
// tick-cost for (the VM's own `sAnimFramesToWait = N + 1` at
// src/battle_anim.c, i.e. N=2 blocks the script for 3 ticks including the
// tick the delay itself executes on - NOT independently reverified against
// RAM this session, flagged as an open item); other opcodes
// (createsprite/createvisualtask/playsewithpan/loadspritegfx/monbg) are
// effectively instant to the *script's* dispatch (they queue a sprite/task
// and move on), except `monbg` which itself blocks 1 tick
// (src/battle_anim.c:645, `sAnimFramesToWait = 1`) - noted per-step below.
{
  const rockSlideMainSteps = [
    { op: "loadspritegfx", args: { tag: "ANIM_TAG_ROCKS" }, source: "battle_anim_scripts.s:2120" },
    {
      op: "monbg",
      args: { battler: "ANIM_DEF_PARTNER" },
      blocksTicks: 1,
      note: "no-op in a single battle - GetBattlerAtPosition(ANIM_DEF_PARTNER) has no live sprite for Onix-vs-Grovyle (src/battle_anim.c:591-647, IsBattlerSpriteVisible gate)",
      source: "battle_anim_scripts.s:2121",
    },
    {
      op: "shake_mon_or_platform",
      args: { velocity: 7, shakeTimer: 1, shakeDuration: 11, type: "SHAKE_BG_Y" },
      expandsTo: "createsprite gShakeMonOrPlatformSpriteTemplate, ANIM_ATTACKER, 2, 7, 1, 11, SHAKE_BG_Y",
      decoded: "writes to gBattle_BG3_Y (background scroll register, not BLDALPHA/mosaic) - toggles +-7 every other tick for 11 total ticks then restores the original value; see battle-move-anim-tables.json's shakeMonOrPlatform entry",
      source: "battle_anim_scripts.s:2122; src/battle_anim_normal.c:AnimShakeMonOrBattlePlatforms/_Step",
    },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-5, 1, -5, 1], source: "battle_anim_scripts.s:2123" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2124" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2125" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [5, 0, 6, 1], source: "battle_anim_scripts.s:2126" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2127" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2128" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [19, 1, 10, 1], source: "battle_anim_scripts.s:2129" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2130" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2131" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-23, 2, -10, 1], source: "battle_anim_scripts.s:2132" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2133" },
    { op: "createvisualtask", task: "AnimTask_ShakeMon", priority: 2, args: ["ANIM_TARGET", 0, 5, 50, 1], decoded: "toggles the target's y2 between 0 and 5 every tick, 50 times (mon bounce/shake)", source: "battle_anim_scripts.s:2134" },
    { op: "createvisualtask", task: "AnimTask_ShakeMon", priority: 2, args: ["ANIM_DEF_PARTNER", 0, 5, 50, 1], note: "no-op in a single battle (GetAnimBattlerSpriteId returns SPRITE_NONE, task self-destroys immediately)", source: "battle_anim_scripts.s:2135" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2136" },
    { op: "call", target: "RockSlideRocks", source: "battle_anim_scripts.s:2137" },
    { op: "call", target: "RockSlideRocks", source: "battle_anim_scripts.s:2138" },
    { op: "waitforvisualfinish", source: "battle_anim_scripts.s:2139" },
    { op: "clearmonbg", args: { battler: "ANIM_DEF_PARTNER" }, source: "battle_anim_scripts.s:2140" },
    { op: "end", source: "battle_anim_scripts.s:2141" },
  ];

  // RockSlideRocks (battle_anim_scripts.s:2143-2168) - one createsprite +
  // playsewithpan + delay(2) triplet per rock, 8 rocks, then `return`. Called
  // twice from the main script (steps above), so this subroutine's 8 rocks
  // play out twice in sequence - 16 rocks total, plus the main script's own
  // 4 = 20 falling-rock sprites for the whole animation.
  const rockSlideRocksSubroutine = [
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-20, 0, -10, 1], source: "battle_anim_scripts.s:2144" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2145" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2146" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [28, 1, 10, 1], source: "battle_anim_scripts.s:2147" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2148" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2149" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-10, 1, -5, 1], source: "battle_anim_scripts.s:2150" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2151" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2152" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [10, 0, 6, 1], source: "battle_anim_scripts.s:2153" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2154" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2155" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [24, 1, 10, 1], source: "battle_anim_scripts.s:2156" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2157" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2158" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-32, 2, -10, 1], source: "battle_anim_scripts.s:2159" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2160" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2161" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [-20, 0, -10, 1], source: "battle_anim_scripts.s:2162" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2163" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2164" },
    { op: "createsprite", template: "gFallingRockSpriteTemplate", battler: "ANIM_TARGET", subpriority: 2, args: [30, 2, 10, 1], source: "battle_anim_scripts.s:2165" },
    { op: "playsewithpan", args: { se: "SE_M_ROCK_THROW", pan: "SOUND_PAN_TARGET" }, source: "battle_anim_scripts.s:2166" },
    { op: "delay", frames: 2, source: "battle_anim_scripts.s:2167" },
    { op: "return", source: "battle_anim_scripts.s:2168" },
  ];

  // createsprite argv mapping for gFallingRockSpriteTemplate, decoded from
  // AnimFallingRock (src/battle_anim_rock.c:297-318): args = [xOffset,
  // animNum (index into sAnims_FlyingRock, i.e. frame 2/3/4), velocity
  // (signed x2 step applied once the initial arc ends), useAveragePos
  // (nonzero -> SetAverageBattlerPositions(ANIM_TARGET, ...) instead of the
  // template's own InitSpritePosToAnim*, i.e. every rock here starts from
  // the midpoint between the two battlers' sprites, offset by xOffset).
  const rockSlideArgvMapping = ["xOffset", "animNum", "velocity", "useAveragePos"];

  // Move_DOUBLE_TEAM (battle_anim_scripts.s:2778-2803). No createsprite for
  // the clones themselves - those come from the C-side AnimTask_DoubleTeam
  // (src/battle_anim_effects_1.c:5173-5206), triggered by this script's own
  // createvisualtask. The script's own job is: kick that task off, set the
  // screen-wide alpha-blend registers, move the attacker (+ any partner) to
  // the BG layer so the blend composites correctly, then just play 9 sound
  // cues on a decaying delay schedule while the C task runs, and clean up.
  const doubleTeamSteps = [
    { op: "createvisualtask", task: "AnimTask_DoubleTeam", priority: 2, args: [], decoded: "spawns 2 darkened/translucent clones of the attacker's own sprite that swim in a sine-wave x-offset for ~64-65 ticks each, staggered by half a phase; see battle-move-anim-tables.json's doubleTeam entry", source: "battle_anim_scripts.s:2779" },
    { op: "setalpha", args: { eva: 12, evb: 8 }, decoded: "BLDALPHA = eva=12/16, evb=8/16 (src/data/battle_anim.h opcode 0x0C, ((evb)<<8)|(eva))", source: "battle_anim_scripts.s:2780" },
    { op: "monbg", args: { battler: "ANIM_ATK_PARTNER" }, blocksTicks: 1, note: "no-op in a single battle (no attacker partner)", source: "battle_anim_scripts.s:2781" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2782" },
    { op: "delay", frames: 32, source: "battle_anim_scripts.s:2783" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2784" },
    { op: "delay", frames: 24, source: "battle_anim_scripts.s:2785" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2786" },
    { op: "delay", frames: 16, source: "battle_anim_scripts.s:2787" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2788" },
    { op: "delay", frames: 8, source: "battle_anim_scripts.s:2789" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2790" },
    { op: "delay", frames: 8, source: "battle_anim_scripts.s:2791" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2792" },
    { op: "delay", frames: 8, source: "battle_anim_scripts.s:2793" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2794" },
    { op: "delay", frames: 8, source: "battle_anim_scripts.s:2795" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2796" },
    { op: "delay", frames: 8, source: "battle_anim_scripts.s:2797" },
    { op: "playsewithpan", args: { se: "SE_M_DOUBLE_TEAM", pan: "SOUND_PAN_ATTACKER" }, source: "battle_anim_scripts.s:2798" },
    { op: "waitforvisualfinish", source: "battle_anim_scripts.s:2799" },
    { op: "clearmonbg", args: { battler: "ANIM_ATK_PARTNER" }, source: "battle_anim_scripts.s:2800" },
    { op: "blendoff", source: "battle_anim_scripts.s:2801" },
    { op: "delay", frames: 1, source: "battle_anim_scripts.s:2802" },
    { op: "end", source: "battle_anim_scripts.s:2803" },
  ];

  writeJson(join(DATA_GEN, "battle-move-anim-scripts.json"), {
    ROCK_SLIDE: {
      source: "reference/pokeemerald/data/battle_anim_scripts.s:2119-2168 (Move_ROCK_SLIDE + RockSlideRocks)",
      main: rockSlideMainSteps,
      subroutines: { RockSlideRocks: rockSlideRocksSubroutine },
      createspriteArgvMapping: rockSlideArgvMapping,
      totalRockSprites: 20,
    },
    DOUBLE_TEAM: {
      source: "reference/pokeemerald/data/battle_anim_scripts.s:2778-2803 (Move_DOUBLE_TEAM)",
      main: doubleTeamSteps,
    },
  });
}

// --- shared numeric/behavioral tables ---------------------------------------
//
// The per-tick formulas the two decoded scripts above hand off to C sprite
// callbacks / tasks, plus the generic per-hit "flash" effect neither script
// triggers directly (it's a separate battle-script opcode, `hitanimation`,
// common to every damaging move's script - see the doc for the full
// BattleScript_EffectHit/EffectFlinchHit citation).
{
  writeJson(join(DATA_GEN, "battle-move-anim-tables.json"), {
    fallingRock: {
      source: "src/battle_anim_rock.c:297-333 (AnimFallingRock, AnimFallingRock_Step, both driving TranslateSpriteInEllipse, src/battle_anim_mons.c:516-531)",
      decoded:
        "Phase 1 (arc down, 16 ticks): sprite.x2 = Sin(circlePos, 0) = 0 always; sprite.y2 = Cos(circlePos, -70); circlePos starts 0, += 4/tick (mod 256) for 16 ticks (0..60) - a quarter-turn arc, y2 sweeping from -70 toward Cos(60,-70). Phase 2 (settle, 32 ticks, starts immediately after phase 1): sprite.x += velocity (one-time step, the createsprite arg), then x2 = Sin(circlePos, velocity) with circlePos restarting at 192 and += 4/tick (mod 256) for 32 ticks, y2 = Cos(circlePos, -24); sprite destroyed when phase 2's duration hits 0. Total per-rock lifetime: 48 ticks from its own createsprite tick (staggered per-rock by the script's own delay-2 spacing, so rocks overlap heavily).",
      phase1: { durationTicks: 16, circlePosStart: 0, circlePosStep: 4, amplitudeX: 0, amplitudeY: -70 },
      phase2: { durationTicks: 32, circlePosStart: 192, circlePosStep: 4, amplitudeXSource: "velocity (createsprite arg 2)", amplitudeY: -24 },
      note: "Sin/Cos use the engine's standard 256-unit circle (gSineTable); exact per-tick pixel values not hand-derived here - out of scope for extraction, an engine slice reimplements Sin/Cos directly against this formula.",
    },
    shakeMonOrPlatform: {
      source: "src/battle_anim_normal.c:AnimShakeMonOrBattlePlatforms/_Step",
      decoded:
        "type=SHAKE_BG_Y targets gBattle_BG3_Y (a background SCROLL register, not BLDALPHA/mosaic). velocity is negated once at setup; every other tick (period = shakeTimer+1, here 2 ticks) the register is offset by +-velocity and the sign flips, for shakeDuration total ticks (here 11), then the register is restored to its pre-effect value and the sprite self-destroys. For ROCK_SLIDE's shake_mon_or_platform velocity=7/shakeTimer=1/shakeDuration=11: gBattle_BG3_Y oscillates +-7 roughly every 2 ticks across an 11-tick window (~5 register writes) then resets.",
      registers: ["gBattle_BG3_Y (SHAKE_BG_Y)", "gBattle_BG3_X (SHAKE_BG_X)", "gSpriteCoordOffsetX (SHAKE_MON_X)", "gSpriteCoordOffsetY (SHAKE_MON_Y)"],
    },
    shakeMon: {
      source: "src/battle_anim_mon_movement.c:92-140 (AnimTask_ShakeMon/_Step)",
      decoded:
        "Toggles the named battler sprite's x2/y2 between 0 and the given (xOffset,yOffset) every `frameDelay` ticks, `numTimes` times, then restores 0/0 and destroys the task. ROCK_SLIDE calls this with (ANIM_TARGET, 0, 5, 50, 1) - Grovyle's sprite bounces y2 0<->5 every tick for 50 ticks - and (ANIM_DEF_PARTNER, ...), a no-op in this single battle.",
    },
    hitFlash: {
      source:
        "reference/pokeemerald/data/battle_scripts_1.s:236-261 (BattleScript_EffectHit, the generic damaging-move script ROCK_SLIDE's own BattleScript_EffectFlinchHit :668-670 falls through to via `goto`) issues the `hitanimation BS_TARGET` opcode AFTER attackanimation/waitanimation and BEFORE healthbarupdate - i.e. this fires once the move's own battle_anim_scripts.s script (the falling rocks) has fully finished, not concurrently with it. Cmd_hitanimation (src/battle_script_commands.c:5556-5570) emits BtlController_EmitHitAnimation, handled per-side by e.g. OpponentHandleHitAnimation (src/battle_controller_opponent.c:1804-1816, the Grovyle/opponent-side path relevant here).",
      decoded:
        "Two concurrent effects on the target: (1) DoHitAnimHealthboxEffect (src/pokeball.c:1284-1291, SpriteCB_HitAnimHealthoxEffect :1294-1306) - the healthbox sprite's y2 toggles +1/-1 every tick, self-destroys after 21 ticks (a small vertical wobble on the HP-bar box). (2) DoHitAnimBlinkSpriteEffect (src/battle_controller_opponent.c:440-455) - the mon sprite's `invisible` flag toggles every 4 ticks, for 32 ticks total (8 toggles = 4 blink cycles), then forces visible and signals done. This is generic to every damaging hit (not ROCK_SLIDE-specific) - the same two effects would fire for any move that reaches `hitanimation` in its battle script.",
      healthboxWobble: { periodTicks: 1, totalTicks: 21, amplitudePx: 1 },
      spriteBlink: { toggleEveryTicks: 4, totalTicks: 32, blinkCycles: 4 },
    },
    doubleTeam: {
      source: "src/battle_anim_effects_1.c:5173-5243 (AnimTask_DoubleTeam, AnimTask_DoubleTeam_Step, AnimDoubleTeam)",
      decoded:
        "Setup: allocates a scratch palette (reusing tag ANIM_TAG_BENT_SPOON), copies the attacker's own 15 non-transparent palette colors into it, then BlendPalette()s that copy 11/16 of the way toward RGB_BLACK (a darkened afterimage tint) - no new tile graphics, CloneBattlerSpriteWithBlend (src/battle_anim_mons.c:1626-1645) just struct-copies the attacker's existing rendered sprite (Grovyle's own front sprite, already in src/assets/gen/battle-opponent-front-sprites.json) into up to 2 free sprite slots, sets ST_OAM_OBJ_BLEND (so the BG-level BLDALPHA the script set via `setalpha 12,8` actually blends it - see the script's own setalpha step) and makes each visible. Motion (AnimDoubleTeam, called every tick): a sub-counter toggles each call and increments a second counter (data[0], the sine-table index driving both amplitude and phase speed) once every 2 ticks, up to 65; every tick (regardless of the sub-counter), amplitude = gSineTable[data[0]]/6 and phaseSpeed = gSineTable[data[0]]/13 are recomputed from the CURRENT data[0], the running phase (data[1], seeded 0 for the first clone / 128 (half-cycle) for the second - the i<<7 stagger - so the two clones swim out of sync) advances by phaseSpeed and wraps mod 256, and x2 = Sin(phase, amplitude); the clone is destroyed once data[0] exceeds 64 (~130 ticks total motion, since data[0] only advances every 2 ticks). Screen state: DISPCNT's BG1 or BG2 layer (whichever the attacker's sprite BG-priority rank resolves to, GetBattlerSpriteBGPriorityRank) is turned OFF for the whole task's lifetime and restored once both clones are gone - part of how the real sprite vs. its BG-composited copy (from the script's own `monbg` step) avoid double-rendering during the blend.",
      cloneCount: 2,
      paletteBlend: { towardColor: "RGB_BLACK", coefficient16ths: 11 },
      bldalpha: { eva: 12, evb: 8 },
      motion: { advanceEveryTicks: 2, counterMax: 64, phaseStagger: [0, 128], ampDivisor: 6, phaseSpeedDivisor: 13 },
    },
    endeavor: {
      source: "data/battle_anim_scripts.s:3789-3803 (Move_ENDEAVOR) - see docs/battle-menu-notes.md §15 for the full oracle-timed derivation, NOT wired into the engine yet (groundwork only, S7 slice E1c)",
      squish: {
        source: "src/battle_anim_effects_3.c:3742-3802 (AnimTask_SquishAndSweatDroplets/_Step), gFacadeSquishAffineAnimCmds :883-889",
        decoded:
          "Attacker-only affine scale (2-axis, unlike the materialize sequence's uniform affineEmerge - x and y deltas are opposite sign here). Steps (AFFINEANIMCMD_FRAME(dx,dy,rotation,duration), same accumulator semantics as affineEmergeAccumulator): [(-16,+16,0,6), (+16,-16,0,12), (-16,+16,0,6)] starting from neutral (0x100,0x100) - squashes X / stretches Y for 6 ticks, reverses over 12, re-settles over 6 (24 ticks total per cycle). `createvisualtask ... 2` (arg1=numSquishes=2) repeats the WHOLE 24-tick cycle twice (48 ticks total), restarting the accumulator at neutral each cycle (AnimTask_SquishAndSweatDroplets_Step's case 0 re-calls PrepareAffineAnimInTaskData when tNumSquishes hasn't hit 0).",
        steps: [
          { dxScale: -16, dyScale: 16, rotation: 0, duration: 6 },
          { dxScale: 16, dyScale: -16, rotation: 0, duration: 12 },
          { dxScale: -16, dyScale: 16, rotation: 0, duration: 6 },
        ],
        neutralScale: 256,
        cycles: 2,
        cycleDurationTicks: 24,
      },
      sweatDroplets: {
        source: "src/battle_anim_effects_3.c:3804-3849 (CreateSweatDroplets, AnimFacadeSweatDrop)",
        decoded:
          "Within EACH 24-tick squish cycle (so 2x total, 8 droplets/cycle = 16 sprites over the full window), CreateSweatDroplets fires twice off the squish task's own local tTimer: tTimer==6 with lowerDroplets=FALSE (xOffset=18,yOffset=-20, upper droplets) and tTimer==18 with lowerDroplets=TRUE (xOffset=30,yOffset=+20, lower droplets) - each call spawns 4 sprites at (baseX-xOffset[-4 for the 2nd]/+xOffset[+4 for the 4th], baseY+yOffset alternating +0/+6), 2 traveling velocX=-2 (leftward) and 2 at velocX=+2 (rightward), all velocY=-1 (drift up), 8x8 un-animated ANIM_TAG_SWEAT_DROP tile. AnimFacadeSweatDrop moves the sprite by (velocX,velocY) every tick and self-destroys once its own local timer exceeds 6 (7 ticks alive: spawn tick + 6 more).",
        perBatch: { count: 4, velocYPerTick: -1, lifetimeTicks: 7 },
        upper: { spawnLocalTick: 6, xOffset: 18, yOffset: -20, velocX: [-2, -2, 2, 2] },
        lower: { spawnLocalTick: 18, xOffset: 30, yOffset: 20, velocX: [-2, -2, 2, 2] },
      },
      blend: {
        source: "src/battle_anim_mons.c:1714-1769 (AnimTask_BlendMonInAndOut/_Setup/_Step), BlendPalette",
        decoded:
          "Attacker-only 16-color palette ramp toward RGB(31,21,0) (a warm yellow) via BlendPalette(paletteId,15,coeff,color) - coeff steps +1/tick (task data[5]=1-tick delay) up to targetCoeff=12 (arg2=12, i.e. 12/16 toward the color), then -1/tick back to 0, repeated numBlends=2 times (arg4=2) - 24 ticks/cycle (12 up + 12 down) x2 = 48 ticks total, same overall length as the squish above (independently driven, not synchronized by a shared clock - coincidence of both scripts using matching-length parameters).",
        targetColor: { r: 31, g: 21, b: 0 },
        coeffMax: 15,
        targetCoeff: 12,
        stepEveryTicks: 1,
        cycles: 2,
        cycleDurationTicks: 24,
      },
      targetShake: {
        source: "src/battle_anim_mon_movement.c:971-1032 (AnimTask_ShakeTargetBasedOnMovePowerOrDmg/_Step)",
        decoded:
          "Two separate task instances (one per script `createvisualtask` call, NOT a single repeating task), each `(FALSE, 1, 8, 1, 0)`: arg0=FALSE -> amplitude source is gAnimMovePower (Endeavor's own listed power is 0, the move deals variable HP-diff damage instead - GetMovePower likely returns a nonzero placeholder or 0; NOT RAM-confirmed this session, flagged for the engine slice), clamped to [1,16], then halved into a +up/-down pair (data[14]=amp/2 down-step, data[13]=amp/2 rounded-up up-step). arg1=1 -> step every task-tick-counter > 1, i.e. every 2 ticks. arg2=8 -> 8 alternations before the task restores x2/y2=0 and self-destroys (~16 ticks/instance). arg3=1,arg4=0 -> X-axis (`x2`) shake only, Y branch (`y2`) is gated off (arg4=0) so never executes despite the code path existing. Target = Onix (ANIM_TARGET), the sprite's own x2 offset alternates between +upStep and -downStep every 2 ticks.",
        amplitudeSource: "gAnimMovePower/12, clamped [1,16] (RAM-unconfirmed for ENDEAVOR specifically - base power likely 0, needs a dump)",
        axis: "x2 only (arg4=0 disables y2)",
        stepEveryTicks: 2,
        alternations: 8,
        instances: 2,
        gapBetweenInstancesTicks: "script `delay 24` between the two create_basic_hitsplat_sprite/createvisualtask pairs",
      },
      hitSplat: {
        source: "src/battle_anim_normal.c:169-178 (gBasicHitSplatSpriteTemplate), :134-166 (sAffineAnims_HitSplat), :1006-1017 (AnimHitSplatBasic)",
        decoded:
          "Two static-position 32x32 sprites (ANIM_TAG_IMPACT, one per script round) at target-relative offsets (12,-12) and (-12,12) (`relative_to=ANIM_TARGET`), each using affine anim index 2 (sAffineAnim_HitSplat_2: instant jump to scale 0xB0 i.e. a zoomed-in/large pop, then AFFINEANIMCMD_FRAME(0,0,0,8) ramps back to neutral 0x100 over 8 ticks) - self-destroys when the affine anim ends (RunStoredCallbackWhenAffineAnimEnds -> DestroyAnimSprite), so each hitsplat is visible ~8-9 ticks total. Round 1 spawns alongside the first targetShake instance; round 2 spawns after `delay 24` (script ticks) alongside the second targetShake instance.",
        offsets: [
          { x: 12, y: -12 },
          { x: -12, y: 12 },
        ],
        popScale256: 176,
        neutralScale256: 256,
        settleDurationTicks: 8,
      },
    },
  });
}

// --- white_feather.png: gFallingFeatherSpriteTemplate's tile/palette source (S7 slice N-3) ---
//
// graphics/battle_anims/sprites/white_feather.png, 32x64px = 4 cols x 8 rows
// of 8x8 tiles = 32 tiles (src/graphics.c:1195-1196,
// gBattleAnimSpriteGfx_WhiteFeather/gBattleAnimSpritePal_WhiteFeather,
// ANIM_TAG_WHITE_FEATHER, tagged src/data/battle_anim.h:1282/1575).
// gFallingFeatherSpriteTemplate (src/battle_anim_flying.c:171-179) uses OAM
// shape 32x32 (gOamData_AffineNormal_ObjNormal_32x32) - so the 32 tiles form
// 2 stacked 32x32 frames: sAnim_FallingFeather_0 (tile offset 0, animNum 0)
// and sAnim_FallingFeather_1 (tile offset 16, animNum 1, .hFlip=TRUE in the
// ANIMCMD_FRAME entry - but this sprite is ALWAYS affine (gDummySpriteAffineAnimTable,
// ST_OAM_AFFINE_NORMAL per its oam template), and hardware ignores OBJ h/v-flip
// bits for affine sprites (they're repurposed as affine-matrix-select bits
// instead) - so this is genuinely a SECOND, separately-drawn mirrored frame,
// not a runtime flip flag; `AnimFallingFeather`/`_Step`'s own `sprite->hFlip`
// field only selects which of these two pre-drawn frames to show
// (`animNum = hFlip`), never a hardware mirror. Same 2-frame stacked
// convention as `extract-battle-mon-pics.ts`'s `loadAnimFrame2` (front-sprite
// entrance anim), reimplemented inline here since that helper isn't exported.
{
  const image = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "white_feather.png"));
  const { columns, rows, tiles } = sliceTiles(image);
  if (rows % 2 !== 0) throw new Error(`white_feather.png: expected an even row count (2 stacked frames), got ${rows}`);
  const frameRows = rows / 2;
  const frame0Tiles = tiles.slice(0, frameRows * columns);
  const frame1Tiles = tiles.slice(frameRows * columns);
  writeJson(join(ASSETS_GEN, "battle-anim-white-feather.json"), {
    source: "graphics/battle_anims/sprites/white_feather.png (src/graphics.c:1195-1196, ANIM_TAG_WHITE_FEATHER)",
    tileset: { columns, rows: frameRows, tiles: frame0Tiles.map((t) => [...t.pixels]) },
    frame2: { columns, rows: frameRows, tiles: frame1Tiles.map((t) => [...t.pixels]) },
    palette: image.palette,
    oam: { shape: "32x32", size: "32x32", affine: true },
  });
}

// --- spark_2.png: Status_Paralysis / ElectricityEffect --------------------
//
// The 16x48 source is three stacked 16x16 frames (4 tiles each).
// `gElectricitySpriteTemplate` selects them with `tileNum += arg3 * 4`,
// and arg3 1/2 additionally selects the hardware H/V flip bit.
{
  const image = decodeIndexedPng(join(REF, "graphics", "battle_anims", "sprites", "spark_2.png"));
  const { columns, rows, tiles } = sliceTiles(image);
  if (columns !== 2 || rows !== 6) {
    throw new Error(`spark_2.png: expected 2x6 tiles, got ${columns}x${rows}`);
  }
  writeJson(join(ASSETS_GEN, "battle-anim-spark-2.json"), {
    source: "graphics/battle_anims/sprites/spark_2.png (src/graphics.c:54-55, ANIM_TAG_SPARK_2)",
    frames: {
      columns,
      rows: 2,
      list: [0, 1, 2].map((frame) =>
        tiles.slice(frame * 4, frame * 4 + 4).map((tile) => [...tile.pixels])
      ),
    },
    palette: image.palette,
    oam: { shape: "16x16", size: "16x16", affine: false },
  });
}

console.log("extraction complete");
