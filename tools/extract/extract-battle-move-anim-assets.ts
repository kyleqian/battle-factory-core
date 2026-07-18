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
  });
}

console.log("extraction complete");
