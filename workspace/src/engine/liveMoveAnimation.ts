import monPicCoordsData from "../data/gen/mon-pic-coords.json" with { type: "json" };
import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import type { LiveMoveSpriteAllocatorInput, LiveMoveSpriteOrderInput } from "./liveMoveSpriteAllocator.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type {
  SceneOnMovePresentationState, SceneOnMoveConfig, SceneOnPresentationBattler,
} from "../animation/sceneOnPresentation.ts";
import { PRESENT_DAMAGE_FRAME_COUNT, PRESENT_HEAL_FRAME_COUNT } from "../animation/present.ts";
import { SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE, SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE } from "../animation/solarBeam.ts";
import { HOWL_FRAME_COUNT } from "../animation/howl.ts";
import { TAIL_WHIP_FRAME_COUNT } from "../animation/tailWhip.ts";
import { CONFUSE_RAY_FRAME_COUNT } from "../animation/confuseRay.ts";
import { FOCUS_PUNCH_FIRST_INACTIVE_AGE } from "../animation/focusPunch.ts";
import { SCREECH_FIRST_INACTIVE_AGE } from "../animation/screech.ts";
import {
  BRICK_BREAK_NORMAL_FRAME_COUNT,
  BRICK_BREAK_SHATTERED_FRAME_COUNT,
} from "../animation/brickBreak.ts";
import { AGILITY_FRAME_COUNT } from "../animation/agility.ts";
import { SWORDS_DANCE_FRAME_COUNT } from "../animation/swordsDance.ts";
import { CALM_MIND_CLEANUP_AGE } from "../animation/calmMind.ts";
import { FURY_SWIPES_LAST_BODY_AGE } from "../animation/furySwipes.ts";
import { KARATE_CHOP_FRAME_COUNT } from "../animation/karateChop.ts";
import {
  HYPNOSIS_OPPONENT_FRAME_COUNT,
  HYPNOSIS_PLAYER_FRAME_COUNT,
} from "../animation/hypnosis.ts";
import { NIGHT_SHADE_FRAME_COUNT } from "../animation/nightShade.ts";
import { SHADOW_BALL_END_AGE } from "../animation/shadowBall.ts";
import { SPORE_FRAME_COUNT } from "../animation/spore.ts";
import { STOMP_FRAME_COUNT } from "../animation/stomp.ts";
import { STUN_SPORE_FRAME_COUNT } from "../animation/stunSpore.ts";
import { GRASS_WHISTLE_WINDOW_FRAMES } from "../animation/grassWhistle.ts";
import { DOUBLE_EDGE_FRAME_COUNT } from "../animation/doubleEdge.ts";
import { speciesFrontIdleRestOffsetOrZero } from "../animation/speciesIdleAnim.ts";
import { FAINT_ATTACK_ANIMATION_PROFILE } from "../animation/faintAttack.ts";
import { RAZOR_LEAF_BODY_LAST_AGE } from "../animation/razorLeaf.ts";
import { THUNDER_PUNCH_MOVE_BODY_LAST_AGE } from "../animation/thunderPunch.ts";
import { NEEDLE_ARM_FRAME_COUNT } from "../animation/needleArm.ts";
import { COVET_FRAME_COUNT } from "../animation/covet.ts";
import {
  GUILLOTINE_OPPONENT_FRAME_COUNT,
  GUILLOTINE_PLAYER_FRAME_COUNT,
} from "../animation/guillotine.ts";

import { ACID_ARMOR_FIRST_INACTIVE_AGE } from "../animation/acidArmor.ts";
import { ATTRACT_FRAME_COUNT } from "../animation/attract.ts";
import { CHARM_BODY_FRAME_COUNT } from "../animation/charm.ts";
import { COTTON_SPORE_FRAME_COUNT } from "../animation/cottonSpore.ts";
import { DISABLE_WINDOW_FRAMES } from "../animation/disable.ts";
import { ENCORE_END_AGE } from "../animation/encore.ts";
import { REFRESH_FRAME_COUNT } from "../animation/refresh.ts";
import { CRABHAMMER_FRAME_COUNT } from "../animation/crabHammer.ts";
import { FISSURE_FRAME_COUNT } from "../animation/fissure.ts";
import { MAGICAL_LEAF_FRAME_COUNT } from "../animation/magicalLeaf.ts";
import { REST_FRAME_COUNT } from "../animation/rest.ts";
import { SWEET_KISS_FRAME_COUNT } from "../animation/sweetKiss.ts";
import { TICKLE_FRAME_COUNT } from "../animation/tickle.ts";
import { SURF_WAVE_FRAME_COUNT } from "../animation/surfWave.ts";
import { BIND_ANIMATION_PROFILE } from "../animation/bind.ts";
import { WRAP_ANIMATION_PROFILE } from "../animation/wrap.ts";
import { CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY } from "../animation/dragonBreath.ts";
import { icyWindEffectOamOrderAtAge } from "../animation/icyWind.ts";
import { blizzardEffectOamOrderAtAge } from "../animation/blizzard.ts";
import { YAWN_CLEANUP_AGE } from "../animation/yawn.ts";
import { ROCK_THROW_ANIMATION_PROFILE } from "../animation/rockThrow.ts";
import { perishSongNoteOrderFromFree } from "../animation/perishSong.ts";
import { LEAF_BLADE_OAM_ORDER_SLOTS } from "../animation/leafBlade.ts";
import { HEAL_BELL_REUSED_ORDER_SLOTS } from "../animation/healBell.ts";
import { KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER, spriteOrderForSlots, spriteOrderWithOccupiedPrefix } from "./spriteOrderProvider.ts";


/** Only adapters with production inputs belong here; exact acceptance is separate. */
export const LIVE_MOVE_ANIMATION_IDS = Object.freeze([
  2, 5, 9, 11, 12, 14, 21, 23, 25, 27, 29, 34, 36, 38, 39, 41, 42, 43, 44, 47, 48, 49, 50,
  51, 55, 65, 66, 67, 68, 74, 75, 78, 79, 83, 92, 93, 94, 95, 97, 101, 103, 105, 106, 108, 109, 112, 113,
  114, 115, 122, 124, 131, 136, 147, 148, 151, 154, 156, 158, 162, 163, 172, 178, 180, 182, 186, 188, 201, 204,
  208, 211, 213, 223, 227, 231, 232, 235, 242, 243, 246, 247, 257, 264, 272, 277, 280, 281, 287, 290, 302,
  305, 306, 319, 320, 321, 325, 334, 335, 336, 337, 342, 343, 347,
  56, 61, 197, 238, 259, 294, 341,
  // anchor3: source battler anchors (position center, picture height, pic offset).
  86, 87, 107, 116, 203, 207, 263, 339,
  // selectors: request-selected branches and healing anchors.
  76, 217, 236, 250,
  // multihit: one MOVE_ANIMATION per hit, selected by request.turn (battle_script_commands.c:1787).
  3, 4, 167,
  // anchor4: species idle offsets (and picture size) derived through liveBattlerAnchors.
  89, 90, 152, 345, 133, 60,
  // next5: eye anchors from liveBattlerAnchors (docs/next-adapters-prep.md s4).
  184, 137,
  // next5 personality: Spinda spots read the displayed party mon's personality (presentation-only).
  298, 146,
  // next5 self-target: healing anchors on the attacker, other-side battler drawn from the field.
  135,
  // prep2 (docs/next-adapters-prep2.md s2): Surf + Muddy Water share one branch.
  57, 330,
  // prep2: anchor-derived effect geometry.
  196, 59,
  // prep2: pic-coord yOffset (Fake Out); plain recipe (Cosmic Power).
  252, 322,
  // prep2: Future Sight turn-1 body only (the delayed hit is a separate playanimation, battle_scripts_1.s:3519).
  248,
  // prep2: Explosion body (attacker displayed HP is 0 at the event; setatkhptozero precedes attackanimation).
  153,
  // H_BUFFER S1 (docs/h-buffer-s1-prep.md): Mean Look, Smelling Salt, Defense Curl, Ingrain, Wrap, Bind, Dragon Breath.
  212, 265, 111, 275, 35, 20, 225,
  // prep5 (docs/next-adapters-prep5.md): Mist Ball, Aromatherapy, Follow Me, Metronome (body), Taunt, Belly Drum.
  296, 312, 266, 118, 269, 187,
  // prep6 (docs/next-adapters-prep6.md): Rock Tomb, Safeguard, Sweet Scent, Self-Destruct, Swallow, Knock Off, Faint Attack (player attacker only).
  317, 219, 230, 120, 256, 282, 185,
  // prep7 (docs/next-adapters-prep7.md): Aerial Ace, Quick Attack, Ice Punch, Fake Tears.
  332, 98, 8, 313,
  // order consumers (docs/order-consumer-prep.md): Grudge, first move body of a battle only (sprite-order input).
  288,
  // order consumers, order-independent (docs/order-consumer-prep.md §0): Ember (one sprite per sort window, ties resolve
  // by creation order whatever the free order is).
  52,
  // Dragon Rage: one plume per sort window (orderFirePlumesForDraw); the 21-frame script tail is not covered.
  82,
  // Flamethrower: one flame per sort window, so the order seed is pixel-neutral (provider seed when known, ascending
  // otherwise); the script's 80-frame tail beyond the accepted window is uncovered.
  53,
  // Provider consumers (while the tracked order is known; unknown order -> null): Heal Bell.
  215,
  // Leaf Blade (initial persistent order of the blade + trail slots).
  348,
  // Perish Song (equal-centerY note ties from the provider's creation rank; literal 3/3 turn counts).
  195,
  // Rock Throw (64-entry seed: occupied prefix + F).
  88,
  // Blaze Kick (pixel-sensitive seed; 9-frame script tail beyond the accepted window is uncovered).
  299,
] as const);

const SWEET_SCENT_PETAL_SLOTS: readonly number[] = Object.freeze([
  3, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14, 15, 16, 17, 4, 5, 7, 9, 10, 3, 11, 12, 13, 14]);

/**
 * ISSUES #142: live age on which the elevated-opponent enemy shadow is still
 * displayed. `SpriteCB_EnemyShadow` (battle_gfx_sfx_util.c:1203) hides the
 * 32x8 shadow only after it observes gAnimScriptActive, so with the one-frame
 * display lag it is visible on the ROM frame where the move script activates.
 * shadowRow = activationFrame - acceptedWindowStart + ageOffset; an id is
 * listed only when 0 <= shadowRow < duration (its window starts at the
 * activation frame). Ids whose accepted window starts after activation (Bite,
 * Toxic, Confusion, ...) are absent: that frame precedes the body. Both
 * orientations share the row (tools/integration/fixtures/issue142-shadow-rows.json,
 * pinned by tests/liveShadowRows.test.ts).
 */
export const LIVE_MOVE_OPPONENT_SHADOW_ROW: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries([
    2, 5, 11, 12, 14, 21, 23, 25, 27, 29, 34, 36, 38, 39, 42, 43, 47, 49, 50, 56, 61, 65, 66, 67, 68,
    78, 79, 83, 86, 87, 95, 97, 101, 103, 107, 108, 109, 112, 113, 114, 115, 116, 122, 131, 147, 148,
    151, 154, 156, 162, 163, 172, 178, 180, 182, 186, 197, 201, 203, 211, 213, 231, 238, 242, 243, 246,
    257, 259, 263, 264, 272, 277, 280, 281, 287, 290, 302, 306, 319, 320, 321, 335, 336, 341,
    // selectors batch (issue142-shadow-rows-extra.json): every variant's window starts at activation.
    76, 217, 236, 250,
    // multihit batch (multihit-shadow-rows.json): every hit window starts at its own activation.
    3, 4, 167,
    // anchor4 batch (issue142-shadow-rows-extra.json): every window starts at activation (Earthquake: age 0 is the activation frame).
    89, 90, 152, 345, 60, 133,
    // next5 (issue142-shadow-rows-extra.json): Glare/Teeter Dance/Soft-Boiled windows start at activation;
    // Scary Face (-4) and Dizzy Punch (-13) start after it and have no row.
    137, 298, 135,
    // prep2 (issue142-shadow-rows-extra.json): Surf / Muddy Water windows start at activation.
    57, 330, 196, 59, 252, 322,
    // H_BUFFER S1 (issue142-shadow-rows-extra.json): Mean Look, Smelling Salt, Defense Curl, Ingrain, Wrap start at activation.
    // Dragon Breath (-6) starts after it and has no row.
    212, 265, 111, 275, 35,
    // prep5 (issue142-shadow-rows-extra.json): Mist Ball, Aromatherapy, Follow Me, Metronome, Belly Drum start at
    // activation. Taunt (-10) starts after it and has no row.
    296, 312, 266, 118, 187,
    // prep6 (issue142-shadow-rows-extra.json): Rock Tomb, Safeguard, Sweet Scent, Swallow start at activation.
    // Self-Destruct (-4), Knock Off (-6), Faint Attack (-4) start after it and have no row.
    317, 219, 230, 256,
    // order consumers (issue142-shadow-rows-extra.json): Grudge's window starts at activation (66/70).
    // Heal Bell (215), Rock Throw (88), Perish Song (195), Leaf Blade (348) start at activation (0).
    288, 215, 348, 195, 88,
    // prep7 (issue142-shadow-rows-extra.json): Aerial Ace / Quick Attack accepted windows begin before activation (idle
    // rows owned by the preceding message command); the live age basis is the activation frame (reducer age 42 / 44), so
    // the shadow row is live age 0.
    332, 98,
    // Ice Punch (staged windows start at activation: row 0).
    8,
  ].map((id) => [id, 0] as [number, number]).concat([
    // Bind (prep s2.7): activation 384/438 vs window 382/436 -> row +2, the first non-zero row; the shared hook
    // arms the shadow when the live age equals the row, so a non-zero row needs no further code.
    [20, 2],
  ])),
);

/** Shadow row for a live request, or null when the activation frame is outside the window. */
export function liveMoveOpponentShadowRow(request: BattleMoveAnimationRequest): number | null {
  return LIVE_MOVE_OPPONENT_SHADOW_ROW[request.moveId] ?? null;
}

export interface LiveBattlerAnchors {
  /** `GetBattlerSpriteCoord2(battler, X_2/Y_PIC_OFFSET)`. */
  readonly picOffsetPoint: Readonly<{ x: number; y: number }>;
  /** Unshifted battler OBJ center (sprite x/y; BG1_X/BG1_Y source). */
  readonly spriteCenter: Readonly<{ x: number; y: number }>;
  /** `sBattlerCoords` x/y for the battler position. */
  readonly battlePositionCenter: Readonly<{ x: number; y: number }>;
  /** `MON_PIC_HEIGHT - 2 * yDelta` from the species pic coords. */
  readonly pictureHeight: number;
  /** Front idle rest offset (opponent only; the player back sprite has none). */
  readonly frontIdleRest: Readonly<{ x2: number; y2: number }>;
}

/**
 * Raw source anchors for one live battler. Per-move side corrections (Disable
 * -8, Rest -16, ...) stay in each adapter. Sources, pokeemerald:
 * - battle_anim_mons.c:112-165 GetBattlerSpriteCoord: X/X_2 read sBattlerCoords;
 *   Y_PIC_OFFSET is GetBattlerSpriteFinal_Y(..., TRUE).
 * - battle_anim_mons.c:269-292 GetBattlerSpriteFinal_Y: YDelta, minus enemy
 *   elevation for the opponent, plus sBattlerCoords y; TRUE adds 8 on the
 *   player side and clamps to DISPLAY_HEIGHT - MON_PIC_HEIGHT + 8 (= 104).
 * - battle_anim_mons.c:294 GetBattlerSpriteCoord2 (X_2/Y_PIC_OFFSET forwards
 *   to the same values; the species is the displayed one).
 * - battle_gfx_sfx_util.c battler sprite creation: the OBJ is a 64x64 canvas
 *   placed at the sBattlerCoords x with the species yOffset, so the OBJ
 *   center is spriteCorner + 32 (opponent corner includes the elevation).
 */
export function liveBattlerAnchors(
  battler: "player" | "opponent",
  art: ReturnType<typeof createBattleCommandFieldArtView>,
): LiveBattlerAnchors {
  const origin = battleCommandFieldSpriteOrigin(art[battler], battler);
  return {
    picOffsetPoint: {
      x: origin.x + 32,
      y: Math.min(104, origin.y + 32 + (battler === "player" ? 8 : 0)),
    },
    spriteCenter: { x: origin.x + 32, y: origin.y + 32 },
    battlePositionCenter: battler === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
    pictureHeight: 64 - 2 * art[battler].coords.yOffset,
    frontIdleRest: battler === "opponent"
      ? speciesFrontIdleRestOffsetOrZero(art[battler].speciesSymbol)
      : { x2: 0, y2: 0 },
  };
}

/**
 * `GetBattlerSpriteCoordAttr` width/height/yOffset (battle_anim_mons.c:2151-2280): the species pic coords
 * the field art view already carries (back table for the player, front for the opponent).
 */
export function liveBattlerCoordAttrs(
  battler: "player" | "opponent",
  art: ReturnType<typeof createBattleCommandFieldArtView>,
): { readonly width: number; readonly height: number; readonly yOffset: number } {
  const { width, height, yOffset } = art[battler].coords;
  return { width, height, yOffset };
}

const effectOrderProvable = new Map<string, boolean>();
/**
 * Icy Wind / Blizzard replay source CreateSprite/SortSprites against the retained OAM slot table, which
 * their reducers verify and throw on (icyWind.ts:257, blizzard.ts:562). The table was captured at the
 * accepted geometry; a species pair whose pic points sort the particles differently is not proven, so
 * the live seam returns null (the scene-off view) instead of throwing mid-battle. The result depends on
 * the geometry only and is cached per (move, side, geometry).
 */
function provableEffectOrder(moveId: 196 | 59, side: "player" | "opponent", duration: number,
  geometry: Parameters<typeof icyWindEffectOamOrderAtAge>[2] | Parameters<typeof blizzardEffectOamOrderAtAge>[2]): boolean {
  const key = `${moveId}/${side}/${JSON.stringify(geometry)}`;
  let ok = effectOrderProvable.get(key);
  if (ok === undefined) {
    try {
      if (moveId === 196) icyWindEffectOamOrderAtAge(duration - 1, side, geometry as Parameters<typeof icyWindEffectOamOrderAtAge>[2]);
      else blizzardEffectOamOrderAtAge(duration - 1, side, geometry);
      ok = true;
    } catch { ok = false; }
    effectOrderProvable.set(key, ok);
  }
  return ok;
}

export function liveMoveAnimationDuration(request: BattleMoveAnimationRequest): number | null {
  switch (request.moveId) {
    case 2: return KARATE_CHOP_FRAME_COUNT;
    case 9: return THUNDER_PUNCH_MOVE_BODY_LAST_AGE + 1;
    case 5: return 160; // Mega Punch source body through first inactive row.
    case 11: return 42; // Vice Grip source body through first inactive row.
    case 12:
      return request.attacker === 0
        ? GUILLOTINE_PLAYER_FRAME_COUNT
        : GUILLOTINE_OPPONENT_FRAME_COUNT;
    case 14: return SWORDS_DANCE_FRAME_COUNT;
    case 21: return 54; // Slam source body through first inactive row.
    case 23: return STOMP_FRAME_COUNT;
    case 25: return 160; // Mega Kick source body through first inactive row.
    case 27: return 55; // Rolling Kick source body through first inactive row.
    case 29: return 48; // headbuttAtAge: active through 46, then cleanup.
    case 34: return 107; // Body Slam source body through final cleanup row.
    case 36: return 98; // Take Down source body through final cleanup row.
    case 38: return DOUBLE_EDGE_FRAME_COUNT;
    case 39: return TAIL_WHIP_FRAME_COUNT;
    case 41: return 37; // Twineedle's two stingers through clearmonbg cleanup.
    case 42: return 93; // Pin Missile's complete source pointer body.
    case 43: return 70; // Leer source body through its last ShakeMon2 row.
    case 44: return 26; // First sharp-teeth row through inactive cleanup.
    // Full source-script body, including the target-monbg / palette cleanup.
    case 47: return request.attacker === 0 ? 245 : 248;
    case 48: return 51; // First Supersonic ring through the final inactive row.
    case 49: return 52; // Sonic Boom source body through the final inactive row.
    case 51: return 131; // Acid source body through its final row.
    case 55: return 111; // Water Gun source body through its final row.
    case 65: return 91; // Drill Peck's full BowMon/impact/cleanup body.
    case 66: return 124; // Submission source body through monbg cleanup.
    case 67: return 33; // Low Kick source body through first inactive row.
    case 68: return 88; // Counter's source body through final clear display.
    case 78:
    case 79: return STUN_SPORE_FRAME_COUNT;
    case 83: return 104; // Fire Spin source window through target-shake cleanup.
    case 92: return 219; // Toxic's bubbles through the source-owned cleanup.
    case 93:
    case 94: return 140; // Psychic-background fade-out through inactive cleanup.
    case 95:
      return request.attacker === 0
        ? HYPNOSIS_PLAYER_FRAME_COUNT
        : HYPNOSIS_OPPONENT_FRAME_COUNT;
    case 50: return DISABLE_WINDOW_FRAMES;
    case 74: return 63; // Growth's second ScaleMonAndRestore through cleanup.
    case 75: return RAZOR_LEAF_BODY_LAST_AGE + 1;
    case 97: return AGILITY_FRAME_COUNT;
    case 101: return NIGHT_SHADE_FRAME_COUNT;
    case 103: return SCREECH_FIRST_INACTIVE_AGE + 1;
    case 105: return 169; // Recover's final blend/star source-owned row.
    case 106: return 101; // Harden source body through its final blend row.
    case 108: return 125; // smokescreenAtAge: active through 123.
    case 109: return CONFUSE_RAY_FRAME_COUNT;
    // Script activation through the two inactive controller displays after
    // resource destruction. The following success printer starts next.
    case 112:
    case 277: return 76; // Defensive wall script through its first inactive cleanup row.
    case 113: return 88;
    case 115: return 79; // Reflect script (activation..cleanup pointer row).
    case 182: return 123; // Protect script through its first inactive row.
    case 243: return 86; // Mirror Coat script (activation..cleanup pointer row).
    case 122: return 73;
    case 124: return 102; // Sludge source body through its final row. // Lick source body through first inactive row.
    case 131: return 84; // Spike Cannon pointer body through inactive cleanup.
    case 136: return 91; // Hi Jump Kick source body through first inactive row.
    case 147: return SPORE_FRAME_COUNT;
    case 148: return 64; // Flash source body (snap, hold, 16..0 ramp) through cleanup.
    case 114: return 202; // Haze's FadeToBg/fog restore through cleanup.
    case 151: return ACID_ARMOR_FIRST_INACTIVE_AGE + 1;
    case 154: return FURY_SWIPES_LAST_BODY_AGE + 1;
    case 3: return 34; // Double Slap per-hit accepted window.
    case 4: case 167: return 37; // Comet Punch / Triple Kick per-hit accepted window.
    case 156: return REST_FRAME_COUNT;
    case 158: return 107; // Hyper Fang restorebg fade through cleanup.
    case 162: return 200; // Super Fang's complete palette/return cleanup body.
    case 163: return 46; // Slash body through final source-owned shake row.
    case 172: return 170; // Flame Wheel source body through cleanup.
    case 201: return 168; // Sandstorm source body (weather bookkeeping stays in rules).
    case 211: return 197; // Steel Wing source body through first inactive row.
    case 223: return 75; // Dynamic Punch source body through first inactive row.
    case 231: return 135;
    case 232: return 140; // Metal Claw source body through its final row. // Iron Tail source body through first inactive row.
    case 235: return 130; // Synthesis grow/star body through cleanup.
    case 178: return COTTON_SPORE_FRAME_COUNT;
    case 180: return 221; // Spite ghost-bg/target-clone body through cleanup.
    case 208: return 186; // Milk Drink bottle/ring/star body through cleanup.
    case 186: return SWEET_KISS_FRAME_COUNT;
    case 188: return 160; // Sludge Bomb source body through its final row.
    case 56: return 141; // Hydro Pump source body through its final row.
    case 61: return 239; // Bubble Beam source body through its final row.
    case 197: return 110; // Detect source body through its final row.
    case 238: return 88; // Cross Chop source body through its final row.
    case 259: return 177; // Torment source body through its final row.
    case 294: return 203; // Tail Glow source body through its final row.
    case 86: return 120; // Thunder Wave accepted source animation window.
    case 87: return 262; // Thunder source body through the first inactive cleanup row.
    case 107: return 153; // Minimize accepted source window.
    case 116: return 122; // Focus Energy accepted source window.
    case 203: return 122; // Endure accepted source window.
    case 207: return 161; // Swagger accepted source window.
    case 263: return 81; // Facade accepted source window.
    case 339: return 104; // Bulk Up accepted source window.
    // Cmd_choosetwoturnanim (battle_anim.c:1073): gAnimMoveTurn bit 0 selects the unleash body.
    case 76: return (request.turn & 1) === 0 
        ? SOLAR_BEAM_SETUP_FIRST_INACTIVE_AGE + 1 : SOLAR_BEAM_UNLEASH_FIRST_INACTIVE_AGE + 1;
    // AnimTask_IsHealingMove (battle_anim_effects_3.c:1531): heal iff gAnimMoveDmg <= 0.
    case 217: return request.damage > 0 ? PRESENT_DAMAGE_FRAME_COUNT : PRESENT_HEAL_FRAME_COUNT;
    case 250: return 133; // Whirlpool main body (accepted window 78..210); residual is a general animation.
    case 236: return 352; // Moonlight accepted source window (207..558).
    // The accepted opponent-front Mud Shot window is one row shorter.
    case 341: return request.attacker === 0 ? 145 : 144;
    case 204: return CHARM_BODY_FRAME_COUNT;
    case 213: return ATTRACT_FRAME_COUNT;
    case 227: return ENCORE_END_AGE + 1;
    case 242: return 142; // Crunch dark-background body through cleanup.
    case 246: return 128; // ancientPowerAtAge: active through 126, cleanup at 127.
    case 247: return SHADOW_BALL_END_AGE + 1;
    case 264:
      return FOCUS_PUNCH_FIRST_INACTIVE_AGE[
        request.target === 0 ? "player" : "opponent"
      ] + 1;
    case 272: return 147; // Role Play silhouette/blend body through cleanup.
    case 280:
      return request.turn === 0
        ? BRICK_BREAK_NORMAL_FRAME_COUNT
        : BRICK_BREAK_SHATTERED_FRAME_COUNT;
    case 290: return 102; // Factory Secret Power -> Strength complete body.
    case 302: return NEEDLE_ARM_FRAME_COUNT;
    case 257: return 168; // Heat Wave source body through cleanup.
    case 281: return YAWN_CLEANUP_AGE + 1;
    case 287: return REFRESH_FRAME_COUNT;
    case 305: return 104; // Poison Fang body through blend/monbg cleanup.
    case 306: return 69; // Crush Claw body through inactive cleanup.
    case 320: return GRASS_WHISTLE_WINDOW_FRAMES;
    // The opponent-front script drops its final wave one source row earlier.
    case 319: return request.attacker === 0 ? 86 : 85;
    case 321: return TICKLE_FRAME_COUNT;
    // Source restorebg fade, then inactive display. Both orientations restore.
    case 325: return request.attacker === 0 ? 106 : 105;
    // The source Block script is two rows longer on the opponent-front side.
    case 335: return request.attacker === 0 ? 141 : 146;
    case 334: return 101; // Iron Defense source body through its final blend row.
    case 336: return HOWL_FRAME_COUNT;
    case 337: return 137; // Dragon Claw palette restoration through cleanup.
    case 342: return 187; // Poison Tail source body through first inactive row.
    case 343: return COVET_FRAME_COUNT;
    case 89: return 198; // Earthquake accepted window (197 rows from presentation age 1).
    case 90: return FISSURE_FRAME_COUNT;
    case 152: return CRABHAMMER_FRAME_COUNT;
    case 345: return MAGICAL_LEAF_FRAME_COUNT;
    case 60: return 160; // Psybeam accepted window (source script through first inactive row).
    case 133: return 216; // Amnesia accepted window (source script through first inactive row).
    case 135: return 272; // Soft-Boiled accepted window (first inactive row 271).
    case 298: return 169; // Teeter Dance accepted window (firstInactiveAge 168).
    case 146: return 69; // Dizzy Punch accepted window; script tail 5 rows uncovered.
    case 184: return 190; // Scary Face accepted window (79..268); script tail 14 rows uncovered.
    case 137: return 213; // Glare accepted window (GLARE_SOURCE_FRAME_COUNT).
    case 57: case 330: return SURF_WAVE_FRAME_COUNT; // Surf / Muddy Water accepted window (144 rows).
    case 196: return 287; // Icy Wind accepted window (220..506).
    // Blizzard accepted windows: 214..585 player-back, 213..573 opponent-front (Guillotine precedent).
    case 59: return request.attacker === 0 ? 372 : 361;
    case 252: return 86; // Fake Out accepted window (78..163 / 82..167).
    case 322: return 241; // Cosmic Power accepted window (294..534).
    // H_BUFFER S1 accepted windows (docs/h-buffer-s1-prep.md).
    case 212: return 171; // Mean Look (71..241 / 75..245).
    case 265: return 121; // Smelling Salt (218..338).
    case 111: return 100; // Defense Curl (214..313 / 215..314).
    case 275: return 164; // Ingrain (205..368 / 293..456).
    case 35: return 38; // Wrap (222..259 / 78..115).
    case 20: return 45; // Bind (382..426 / 436..480).
    // prep5 accepted windows (docs/next-adapters-prep5.md s2.4).
    case 296: return 213; // Mist Ball (75..287 / 79..291).
    // Aromatherapy: both windows end on the same script-end frame 474 but start at activation 75 / 79, so the
    // opponent-attacker window is 4 rows shorter (the reducer frameCount is 400; Blizzard precedent).
    case 312: return request.attacker === 0 ? 400 : 396;
    case 266: return 185; // Follow Me (69..253 / 73..257).
    case 118: return 127; // Metronome body (245..371 / 244..370); the called move is a separate request.
    case 269: return 125; // Taunt (76..200 / 80..204); script activation is 10 frames earlier.
    case 187: return 110; // Belly Drum (231..340 / 211..320).
    case 299: return 78; // Blaze Kick (399..476 / 453..530); the script runs 9 frames past the window (485/539), uncovered.
    case 88: return 87; // Rock Throw (296..382 / 296..382, no tail).
    case 195: return 259; // Perish Song (71..329 / 75..333, no tail).
    case 348: return 224; // Leaf Blade (76..299 / 80..303, no tail).
    case 215: return 261; // Heal Bell (209..469 / 210..470, no tail).
    case 53: return 115; // Flamethrower (395..520 / 449..574 incl. 11 negative-age rows, ageOffset -11); script ends 600/654.
    case 82: return 150; // Dragon Rage (89..238 / 93..242); the script runs 21 frames past the window (259/263), uncovered.
    case 52: return 63; // Ember (388..450 / 442..504, ageOffset 0); script ends 3 frames later (453/507).
    case 288: return 209; // Grudge (66..274 / 70..278); script end 274/278 (no tail).
    // prep6 accepted windows (docs/next-adapters-prep6.md s0/s2.4).
    case 317: return 174; // Rock Tomb (217..390 / 229..402); window end = script end.
    case 219: return 71; // Safeguard (209..279 both).
    case 230: return 175; // Sweet Scent (222..396 both).
    // Self-Destruct: 113 rows (82..194 / 86..198) = the whole accepted window, live age 0 = its first row (reducer age 0,
    // selfDestructPortable.ts presentationAge 0), the Taunt/Dragon Rage convention: the window starts 4 frames after
    // the script activation (78/82, row -4, no #142 shadow row) and the script runs 10 frames past it (204/208), uncovered.
    case 120: return 113;
    // Knock Off: 59 rows (70..128 / 74..132) at accepted presentation age -11 (ageOffset -11): reducer age 0 = frame 81/85 =
    // activation + 6 (prep6 s2.4), so live age 0 is the reducer's age 0 and the activation is live age -6 (no #142 row).
    // The window ends 4 frames after the script end (124/128); duration = rows + ageOffset (the Dragon Breath convention).
    case 282: return 48;
    // Faint Attack: 221 rows (2344..2564 player attacker), reducer ages 0..220 (faintAttack.ts LAST_ANIMATION_OWNED_AGE);
    // the window starts 4 frames after the script activation (row -4, no #142 shadow row). Only the player-attacker
    // orientation has accepted evidence (prep6 s0): an opponent attacker returns null (no adapter, scene-off view).
    case 185: return request.attacker === 0 ? 221 : null;
    // Swallow: per stockpile branch (request.turn = gBattleScripting.animTurn = stockpileCounter, prep6 s2.1) and side:
    // player 163/178/193 (1247..1409 ...), opponent 161/176/191 (= 148 + 15 turn / 146 + 15 turn), every window end = script end.
    case 256:
      return request.turn >= 1 && request.turn <= 3 ? (request.attacker === 0 ? 148 : 146) + 15 * request.turn : null;
    // prep7 accepted windows (docs/next-adapters-prep7.md s2.2), counted from the activation frame: the accepted dense
    // windows start 35/31 (AA) and 37/33 (QA) rows earlier with idle body rows owned by the queue's `message` command.
    case 332: return 50; // Aerial Ace: activation..first inactive row (81..130 / 77..126); the later hit/HP/text rows are queue commands.
    case 98: return 33; // Quick Attack (83..115 / 79..111).
    case 313: return 87; // Fake Tears 80..166 / 76..162: the first displayed row is one after activation (row -1, no shadow row), 83 script + 4 clear rows.
    case 8: return 184; // Ice Punch script activation..first inactive row (staged 1966..2149 / 2339..2522); HP/text/freeze/Sitrus rows are queue commands.
    case 225: return 83; // Dragon Breath: 85 rows 395..479 / 449..533 starting at presentation age -2.
    case 248: return 114; // Future Sight turn-1 accepted window (77..190 / 81..194).
    case 153: return 212; // Explosion accepted window (76..287 / 80..291).
    case 347: return CALM_MIND_CLEANUP_AGE + 1;
    default: return null;
  }
}

/** Source singles field geometry and art, from the current displayed party members. */
export function liveMoveAnimationPresentation(
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
  age: number,
  paletteInput?: LiveMovePaletteInput,
  spriteAllocatorInput?: LiveMoveSpriteAllocatorInput,
  spriteOrderInput?: LiveMoveSpriteOrderInput,
): SceneOnMovePresentationState | null {
  if (liveMoveAnimationDuration(request) === null) return null;
  const art = createBattleCommandFieldArtView(field);
  const battler = (side: "player" | "opponent"): SceneOnPresentationBattler => {
    const origin = battleCommandFieldSpriteOrigin(art[side], side);
    return {
      species: art[side].speciesSymbol,
      geometry: {
        side, spriteCorner: origin,
        // GetBattlerSpriteFinal_Y(..., TRUE): player effects add 8 and
        // clamp to 104; the field origin already includes opponent elevation.
        animationCenter: {
          x: origin.x + 32,
          y: Math.min(104, origin.y + 32 + (side === "player" ? 8 : 0)),
        },
        battlePositionCenter: {
          x: side === "player" ? 72 : 176,
          y: side === "player" ? 80 : 40,
        },
      },
    };
  };
  const attacker = battler(request.attacker === 0 ? "player" : "opponent");
  // These move bodies draw the whole field. A self-targeting move's effect
  // adapter must separately retain its semantic target when one is added.
  const target = battler(request.attacker === 0 ? "opponent" : "player");
  // Effect pictures use Y_PIC_OFFSET (the player-side +8/clamp above), while
  // affine battler centers use the unshifted OBJ center. Keep that selector
  // explicit at the live seam instead of inheriting fixture coordinates.
  const affineCenterBattler = (battler: SceneOnPresentationBattler): SceneOnPresentationBattler => ({
    ...battler,
    geometry: {
      ...battler.geometry,
      animationCenter: {
        x: battler.geometry.spriteCorner.x + 32,
        y: battler.geometry.spriteCorner.y + 32,
      },
    },
  });
  const pictureHeight = (side: "player" | "opponent") =>
    64 - 2 * art[side].coords.yOffset;
  const attackerAnchors = liveBattlerAnchors(attacker.geometry.side, art);
  const fieldProfile = {
    playerHp: field.player.hp, playerMaxHp: field.player.maxHP,
    opponentHp: field.opponent.hp, opponentMaxHp: field.opponent.maxHP,
    // All HUD values are composed from the live resolution view after the body.
  };
  let config: SceneOnMoveConfig;
  switch (request.moveId) {
    case 2: config = { move: "KARATE_CHOP", attacker, target, fieldProfile }; break;
    case 9:
      config = {
        move: "THUNDER_PUNCH", attacker, target,
        // Thunder Punch's legacy fixture config requires the narrow
        // faint-attack status shape. Preserve the live burn bit when it is
        // present; the live queue still owns the complete current HUD/status.
        fieldProfile: {
          ...fieldProfile,
          playerStatus: field.player.status === "burn" ? "burn" : "none",
        },
      };
      break;
    case 5: config = { move: "MEGA_PUNCH", attacker, target, fieldProfile }; break;
    case 11: config = { move: "VICE_GRIP", attacker, target, fieldProfile }; break;
    case 12: config = { move: "GUILLOTINE", attacker, target, fieldProfile }; break;
    case 14: config = { move: "SWORDS_DANCE", attacker, target, fieldProfile }; break;
    case 21: config = { move: "SLAM", attacker, target, fieldProfile }; break;
    case 23: config = { move: "STOMP", attacker, target, fieldProfile }; break;
    case 25: config = { move: "MEGA_KICK", attacker, target, fieldProfile }; break;
    case 27: config = { move: "ROLLING_KICK", attacker, target, fieldProfile }; break;
    case 29:
      // BowMon's affine center is the existing OBJ center; its hitsplat
      // independently uses the target picture-offset coordinate.
      config = { move: "HEADBUTT", attacker: { ...attacker, geometry: {
        ...attacker.geometry, animationCenter: {
          x: attacker.geometry.spriteCorner.x + 32, y: attacker.geometry.spriteCorner.y + 32,
        },
      } }, target, fieldProfile };
      break;
    case 34: config = { move: "BODY_SLAM", attacker, target, fieldProfile }; break;
    case 36: config = { move: "TAKE_DOWN", attacker, target, fieldProfile }; break;
    case 38: config = { move: "DOUBLE_EDGE", attacker, target, fieldProfile }; break;
    case 39: config = { move: "TAIL_WHIP", attacker, target, fieldProfile }; break;
    case 41: config = { move: "TWINEEDLE", attacker, target, fieldProfile }; break;
    case 42: config = { move: "PIN_MISSILE", attacker, target, fieldProfile }; break;
    case 43: config = { move: "LEER", attacker, target, fieldProfile }; break;
    case 44: config = { move: "BITE", attacker, target, fieldProfile }; break;
    case 47: config = { move: "SING", attacker, target, fieldProfile }; break;
    case 48: config = { move: "SUPERSONIC", attacker, target, fieldProfile }; break;
    case 49: config = { move: "SONIC_BOOM", attacker, target, fieldProfile }; break;
    case 51:
      config = { move: "ACID", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 55:
      config = { move: "WATER_GUN", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 124:
      config = { move: "SLUDGE", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 188:
      config = { move: "SLUDGE_BOMB", attacker, target, fieldProfile, projectileOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 106:
      config = { move: "HARDEN", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 334:
      config = { move: "IRON_DEFENSE", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 56: case 61: case 341: {
      const move = request.moveId === 56 ? "HYDRO_PUMP" : request.moveId === 61 ? "BUBBLE_BEAM" : "MUD_SHOT";
      config = {
        move, attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
      };
      break;
    }
    case 238:
      config = { move: "CROSS_CHOP", attacker, target, fieldProfile,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint };
      break;
    case 197:
      config = { move: "DETECT", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint };
      break;
    case 294:
      config = { move: "TAIL_GLOW", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint };
      break;
    case 116: case 203:
      // GetBattlerSpriteCoord(attacker, BATTLER_COORD_X/Y) reads sBattlerCoords.
      config = { move: request.moveId === 116 ? "FOCUS_ENERGY" : "ENDURE", attacker, target, fieldProfile,
        attackerCoord: attackerAnchors.battlePositionCenter };
      break;
    case 263: case 107:
      config = { move: request.moveId === 263 ? "FACADE" : "MINIMIZE", attacker, target, fieldProfile,
        battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 86: case 87:
      // GetBattlerSpriteCoord(target, X_2/Y_2) resolves to the picture-offset point.
      config = { move: request.moveId === 86 ? "THUNDER_WAVE" : "THUNDER", attacker, target, fieldProfile,
        targetEffectCenter: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint };
      break;
    case 207:
      config = { move: "SWAGGER", attacker, target, fieldProfile,
        breathOrigin: attackerAnchors.picOffsetPoint };
      break;
    case 339:
      config = { move: "BULK_UP", attacker, target, fieldProfile,
        breathOrigin: attackerAnchors.picOffsetPoint, battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 250: config = { move: "WHIRLPOOL", attacker, target, fieldProfile, body: "main" }; break;
    case 76: {
      // sourceOrbOrigin adds 10 to the "resolved animation center" to reach
      // GetBattlerSpriteCoord(Y_PIC_OFFSET), so battlers carry that point minus 10.
      const resolved = (battler: SceneOnPresentationBattler): SceneOnPresentationBattler => {
        const point = liveBattlerAnchors(battler.geometry.side, art).picOffsetPoint;
        return { ...battler, geometry: { ...battler.geometry, animationCenter: {
          x: point.x, y: point.y - 10 } } };
      };
      config = { move: "SOLAR_BEAM", attacker: resolved(attacker), target: resolved(target), fieldProfile,
        body: (request.turn & 1) === 0 ? "setup" : "unleash" };
      break;
    }
    case 217: {
      // presentAtAge adds the player-side +8 of CreateHealingEffect's Y_PIC_OFFSET
      // itself, so hand it the picture-offset point without that +8 (clamp kept).
      const targetPoint = liveBattlerAnchors(target.geometry.side, art).picOffsetPoint;
      config = { move: "PRESENT", attacker, fieldProfile,
        branch: request.damage > 0 ? "damage" : "heal",
        target: { ...target, geometry: { ...target.geometry, animationCenter: {
          x: targetPoint.x, y: targetPoint.y - (target.geometry.side === "player" ? 8 : 0) } } } };
      break;
    }
    case 236: {
      // InitSpritePosToAnimAttacker(TRUE) reads the attacker's picture-offset point.
      // The staged heal payload is never read live (the controller owns HP).
      const attackerHp = attacker.geometry.side === "player" ? field.player.hp : field.opponent.hp;
      const attackerMaxHp = attacker.geometry.side === "player" ? field.player.maxHP : field.opponent.maxHP;
      config = { move: "MOONLIGHT", attacker, target,
        fieldProfile: { ...fieldProfile, pendingHeal: {
          battler: "attacker", fromHp: attackerHp, toHp: attackerMaxHp,
          weather: "none", numerator: 1, denominator: 2 } },
        healingCenter: attackerAnchors.picOffsetPoint };
      break;
    }
    case 259:
      config = { move: "TORMENT", attacker, target, fieldProfile,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        targetPictureOffset: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
        battlerHeight: attackerAnchors.pictureHeight };
      break;
    case 232:
      config = { move: "METAL_CLAW", attacker, target, fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter };
      break;
    case 65:
      // BowMon affines the battler OBJ around its unshifted sprite center.
      // The impact sprites independently retain the target's picture-offset
      // coordinate, so only the attacker takes the affine-center selector.
      config = {
        move: "DRILL_PECK",
        attacker: affineCenterBattler(attacker),
        target,
        fieldProfile,
      };
      break;
    case 66: config = { move: "SUBMISSION", attacker, target, fieldProfile }; break;
    case 67: config = { move: "LOW_KICK", attacker, target, fieldProfile }; break;
    case 68: config = { move: "COUNTER", attacker, target, fieldProfile }; break;
    case 78: config = { move: "STUN_SPORE", attacker, target, fieldProfile }; break;
    case 79: config = { move: "SLEEP_POWDER", attacker, target, fieldProfile }; break;
    case 83: config = { move: "FIRE_SPIN", attacker, target, fieldProfile }; break;
    case 92: config = { move: "TOXIC", attacker, target, fieldProfile }; break;
    case 93: config = { move: "CONFUSION", attacker, target, fieldProfile }; break;
    case 94: config = { move: "PSYCHIC", attacker, target, fieldProfile }; break;
    case 95: config = { move: "HYPNOSIS", attacker, target, fieldProfile }; break;
    case 50:
      // `AnimSpinningSparkle` starts from Y_PIC_OFFSET and its established
      // reducer applies the player-side remaining -8 itself.  Keep that
      // source convention at the adapter boundary rather than double-raising
      // the player back sprite.
      config = {
        move: "DISABLE",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y
                - (attacker.geometry.side === "player" ? 8 : 0),
            },
          },
        },
        target,
        fieldProfile,
      };
      break;
    case 74: config = { move: "GROWTH", attacker, target, fieldProfile }; break;
    case 75: config = { move: "RAZOR_LEAF", attacker, target, fieldProfile }; break;
    case 97: config = { move: "AGILITY", attacker, target, fieldProfile }; break;
    case 101: config = { move: "NIGHT_SHADE", attacker, target, fieldProfile }; break;
    case 103: config = { move: "SCREECH", attacker, target, fieldProfile }; break;
    case 105: config = { move: "RECOVER", attacker, target, fieldProfile }; break;
    case 108: config = { move: "SMOKESCREEN", attacker, target, fieldProfile }; break;
    case 109: config = { move: "CONFUSE_RAY", attacker, target, fieldProfile }; break;
    case 113:
      if (!spriteAllocatorInput?.historyKnown) return null;
      config = {
        move: "LIGHT_SCREEN", attacker, target, fieldProfile,
        allocatorProfile: {
          wall: spriteAllocatorInput.wall,
          sparkles: spriteAllocatorInput.sparkles,
        },
      };
      break;
    case 112: case 115: case 182: case 243: case 277: {
      if (!spriteAllocatorInput?.historyKnown) return null;
      const wall = spriteAllocatorInput.wall;
      const sparkles = spriteAllocatorInput.sparkles;
      config = request.moveId === 112
        ? { move: "BARRIER", attacker, target, fieldProfile, allocatorProfile: { wall } }
        : request.moveId === 277
        ? { move: "MAGIC_COAT", attacker, target, fieldProfile, allocatorProfile: { wall } }
        : request.moveId === 182
        ? { move: "PROTECT", attacker, target, fieldProfile, allocatorProfile: { protect: wall } }
        : request.moveId === 115
        ? { move: "REFLECT", attacker, target, fieldProfile, allocatorProfile: { wall, sparkles } }
        : { move: "MIRROR_COAT", attacker, target, fieldProfile, allocatorProfile: { wall, sparkles } };
      break;
    }
    case 122: config = { move: "LICK", attacker, target, fieldProfile }; break;
    case 131: config = { move: "SPIKE_CANNON", attacker, target, fieldProfile }; break;
    case 136:
      config = {
        move: "HI_JUMP_KICK", attacker, target, fieldProfile,
        targetInitialX2: target.geometry.side === "opponent"
          ? speciesFrontIdleRestOffsetOrZero(target.species).x2
          : 0,
      };
      break;
    case 147: config = { move: "SPORE", attacker, target, fieldProfile }; break;
    case 148: config = { move: "FLASH", attacker, target, fieldProfile }; break;
    case 114: config = { move: "HAZE", attacker, target, fieldProfile }; break;
    case 151: config = { move: "ACID_ARMOR", attacker, target, fieldProfile }; break;
    case 154: config = { move: "FURY_SWIPES", attacker, target, fieldProfile }; break;
    case 3: config = { move: "DOUBLE_SLAP", attacker, target, fieldProfile, moveTurn: request.turn }; break;
    case 4:
      // cometPunchAtAge's opponent-route hitsplat offset (0, not the script's -8) is relative to
      // the unshifted OBJ center, not the player-side +8 Y_PIC_OFFSET point.
      config = { move: "COMET_PUNCH", attacker, target: affineCenterBattler(target), fieldProfile,
        moveTurn: request.turn };
      break;
    // Cmd_jumpifmoveturn 0/1 else Center (battle_anim_scripts.s:6543): turns >= 2 share the Center branch.
    case 167:
      config = { move: "TRIPLE_KICK", attacker, target, fieldProfile,
        moveTurn: Math.min(request.turn, 2) as 0 | 1 | 2 };
      break;
    case 156:
      // Rest's player-side Letter-Z renderer carries the affine OAM center
      // correction at scanout (`screenCenterYOffset: 16`), so its reducer
      // input is the source picture point minus that already-applied amount.
      config = {
        move: "REST",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y
                - (attacker.geometry.side === "player" ? 16 : 0),
            },
          },
        },
        target,
        fieldProfile,
      };
      break;
    case 158: config = { move: "HYPER_FANG", attacker, target, fieldProfile }; break;
    case 162: config = { move: "SUPER_FANG", attacker, target, fieldProfile }; break;
    case 163: config = { move: "SLASH", attacker, target, fieldProfile }; break;
    case 172: config = { move: "FLAME_WHEEL", attacker, target, fieldProfile }; break;
    case 201: config = { move: "SANDSTORM", attacker, target, fieldProfile }; break;
    case 211:
      config = {
        move: "STEEL_WING",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
      };
      break;
    case 223: config = { move: "DYNAMIC_PUNCH", attacker, target, fieldProfile }; break;
    case 231:
      config = {
        move: "IRON_TAIL",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
      };
      break;
    case 178: config = { move: "COTTON_SPORE", attacker, target, fieldProfile }; break;
    case 180: config = { move: "SPITE", attacker, target, fieldProfile }; break;
    case 208: config = { move: "MILK_DRINK", attacker, target, fieldProfile }; break;
    case 186: config = { move: "SWEET_KISS", attacker, target, fieldProfile }; break;
    case 204: config = { move: "CHARM", attacker, target, fieldProfile }; break;
    case 213: config = { move: "ATTRACT", attacker, target, fieldProfile }; break;
    case 227: config = { move: "ENCORE", attacker, target, fieldProfile }; break;
    case 242: config = { move: "CRUNCH", attacker, target, fieldProfile }; break;
    case 246: config = { move: "ANCIENT_POWER", attacker, target, fieldProfile }; break;
    case 247: config = { move: "SHADOW_BALL", attacker, target, fieldProfile }; break;
    case 264: config = { move: "FOCUS_PUNCH", attacker, target, fieldProfile }; break;
    case 272: {
      // CreateAdditionalMonSpriteForMoveAnim places the target-species
      // silhouette at the attacker's coord plus that species' pic y offset in
      // the attacker's orientation; the view anchors it on battlePositionCenter.
      const pics = (monPicCoordsData as unknown as {
        back: Record<string, { yOffset: number }>; front: Record<string, { yOffset: number }>;
      })[attacker.geometry.side === "player" ? "back" : "front"];
      const yOffset = pics[target.species]?.yOffset ?? 0;
      config = {
        move: "ROLE_PLAY", target, fieldProfile,
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            battlePositionCenter: {
              x: attacker.geometry.battlePositionCenter.x,
              y: attacker.geometry.battlePositionCenter.y + yOffset,
            },
          },
        },
      };
      break;
    }
    case 235: config = { move: "SYNTHESIS", attacker, target, fieldProfile }; break;
    case 280:
      config = {
        move: "BRICK_BREAK",
        body: request.turn === 0 ? "normal" : "shattered-wall",
        attacker, target, fieldProfile,
      };
      break;
    case 290: config = { move: "SECRET_POWER", attacker, target, fieldProfile }; break;
    case 302: config = { move: "NEEDLE_ARM", attacker, target, fieldProfile }; break;
    case 281:
      config = {
        move: "YAWN", attacker, target, fieldProfile,
        battlerInput: {
          attackerPictureHeight: pictureHeight(attacker.geometry.side),
          targetPictureHeight: pictureHeight(target.geometry.side),
          attackerEffectCenter: attacker.geometry.animationCenter,
          targetEffectCenter: target.geometry.animationCenter,
        },
      };
      break;
    case 257: config = { move: "HEAT_WAVE", attacker, target, fieldProfile }; break;
    case 287: config = { move: "REFRESH", attacker, target, fieldProfile }; break;
    case 305: config = { move: "POISON_FANG", attacker, target, fieldProfile }; break;
    case 306: config = { move: "CRUSH_CLAW", attacker, target, fieldProfile }; break;
    case 320: config = { move: "GRASS_WHISTLE", attacker, target, fieldProfile }; break;
    case 319: config = { move: "METAL_SOUND", attacker, target, fieldProfile }; break;
    case 321:
      // `AnimEyeSparkle` starts from the effect-picture coordinate, then the
      // Move_TICKLE script supplies y=-8. `RockMonBackAndForth` instead
      // rotates the target battler OBJ around its unraised sprite center.
      config = {
        move: "TICKLE",
        attacker: {
          ...attacker,
          geometry: {
            ...attacker.geometry,
            animationCenter: {
              x: attacker.geometry.animationCenter.x,
              y: attacker.geometry.animationCenter.y - 8,
            },
          },
        },
        target: {
          ...target,
          geometry: {
            ...target.geometry,
            animationCenter: {
              x: target.geometry.spriteCorner.x + 32,
              y: target.geometry.spriteCorner.y + 32,
            },
          },
        },
        fieldProfile,
      };
      break;
    case 325:
      config = {
        move: "SHADOW_PUNCH", attacker, target,
        traceScratchUnfadedPalette: paletteInput?.traceScratchUnfadedPalette,
        fieldProfile: { ...fieldProfile, playerStatus: "none" },
        attackerSpriteId: request.attacker === 0 ? 6 : 8,
        attackerMoveSpeed: request.attacker === 0 ? 8 : -8,
        attackerSubpriority: request.attacker === 0 ? 30 : 40,
      };
      break;
    case 335: config = { move: "BLOCK", attacker, target, fieldProfile }; break;
    case 336:
      config = {
        move: "HOWL", attacker, target, fieldProfile,
        battlerInput: {
          pictureHeight: 64 - 2 * art[request.attacker === 0 ? "player" : "opponent"].coords.yOffset,
          species: attacker.species,
        },
      };
      break;
    case 337: config = { move: "DRAGON_CLAW", attacker, target, fieldProfile }; break;
    case 89:
      // ShakeBattlers retains each battler's current idle x2 (player back sprites have none).
      config = { move: "EARTHQUAKE", attacker, target, fieldProfile,
        initialBattlerX2: {
          player: liveBattlerAnchors("player", art).frontIdleRest.x2,
          opponent: liveBattlerAnchors("opponent", art).frontIdleRest.x2,
        } };
      break;
    case 90:
      config = { move: "FISSURE", attacker, target, fieldProfile,
        initialTargetX2: liveBattlerAnchors(target.geometry.side, art).frontIdleRest.x2 };
      break;
    case 133:
      // BATTLER_COORD_ATTR_WIDTH/HEIGHT: GetBattlerSpriteCoordAttr reads the species pic coords.
      config = { move: "AMNESIA", attacker, target, fieldProfile,
        attackerPictureSize: { width: art[attacker.geometry.side].coords.width,
          height: art[attacker.geometry.side].coords.height } };
      break;
    case 152: case 345: case 60:
      // Species-owned idle x2 of the target (player back sprites have none).
      config = { move: request.moveId === 152 ? "CRABHAMMER" : request.moveId === 60 ? "PSYBEAM" : "MAGICAL_LEAF", attacker, target, fieldProfile,
        targetIdleX2: liveBattlerAnchors(target.geometry.side, art).frontIdleRest.x2 };
      break;
    case 135: {
      // MOVE_TARGET_USER: the semantic target is the attacker (healing stars use X_2 / Y_PIC_OFFSET of it);
      // the other-side battler is only background and is drawn from the displayed field.
      // softBoiledFramebuffer.ts:30: the egg's attacker center is the OBJ center +5 (player) / +7 (opponent).
      const eggAttacker = { ...attacker, geometry: { ...attacker.geometry, animationCenter: {
        x: attackerAnchors.spriteCenter.x,
        y: attackerAnchors.spriteCenter.y + (attacker.geometry.side === "player" ? 5 : 7) } } };
      config = { move: "SOFT_BOILED", attacker: eggAttacker, target: eggAttacker, fieldProfile,
        healingCenter: attackerAnchors.picOffsetPoint, bystander: target };
      break;
    }
    case 298: {
      // teeterDanceFramebuffer.ts:84-110: the attacker's note/pic center is its pic point, the player-side
      // target uses its OBJ center, and the attacker's own sprite x/y is the OBJ center.
      config = { move: "TEETER_DANCE",
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: attackerAnchors.picOffsetPoint } },
        target: { ...target, geometry: { ...target.geometry, animationCenter: target.geometry.side === "player"
          ? liveBattlerAnchors("player", art).spriteCenter : liveBattlerAnchors("opponent", art).picOffsetPoint } },
        fieldProfile, attackerSpriteCenter: attackerAnchors.spriteCenter,
        attackerPersonality: field[attacker.geometry.side].personality ?? 0 };
      break;
    }
    case 146:
      config = { move: "DIZZY_PUNCH", attacker, target, fieldProfile,
        attackerPersonality: field[attacker.geometry.side].personality ?? 0 };
      break;
    case 184:
      // InitSpritePosToAnimAttacker(sprite, TRUE): attacker X_2 / Y_PIC_OFFSET.
      config = { move: "SCARY_FACE", attacker, target, fieldProfile,
        attackerEyeCenter: attackerAnchors.picOffsetPoint };
      break;
    case 137: {
      // AnimTask_GlareEyeDots (battle_anim_effects_3.c:3989): HEIGHT = GET_MON_COORDS_HEIGHT of the
      // attacker's own (back for player, front for opponent) pic coords, not LiveBattlerAnchors.pictureHeight.
      const pic = attackerAnchors.picOffsetPoint;
      const quarter = Math.trunc(art[attacker.geometry.side].coords.height / 4);
      config = { move: "GLARE", attacker, target, fieldProfile,
        attackerEyeCenter: { x: pic.x, y: pic.y - 8 },
        eyeDotStart: { x: pic.x + (attacker.geometry.side === "player" ? quarter : -quarter), y: pic.y - quarter },
        eyeDotEnd: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint };
      break;
    }
    case 57: case 330:
      config = { move: request.moveId === 330 ? "MUDDY_WATER" : "SURF", attacker, target, fieldProfile };
      break;
    case 196: case 59: {
      // Source X_2/Y_PIC attacker and target centers; singles SetAverageBattlerPositions is the target's own point.
      // Icy Wind's spikes aim at the target's sBattlerCoords point (battlePositionCenter).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art);
      const geometry = { attackerCenter: attackerAnchors.picOffsetPoint, targetCenter: targetAnchors.picOffsetPoint };
      const icyGeometry = { ...geometry, spikeTargetCenter: targetAnchors.battlePositionCenter };
      if (!provableEffectOrder(request.moveId as 196 | 59, attacker.geometry.side,
        liveMoveAnimationDuration(request)!, request.moveId === 196 ? icyGeometry : geometry)) return null;
      config = request.moveId === 196
        ? { move: "ICY_WIND", attacker, target, fieldProfile, effectGeometry: icyGeometry }
        : { move: "BLIZZARD", attacker, target, fieldProfile, effectGeometry: geometry };
      break;
    }
    case 252:
      // SetBattlerSpriteYOffsetFromYScale reads the target's pic-coords yOffset.
      config = { move: "FAKE_OUT", attacker, target, fieldProfile,
        targetPictureYOffset: liveBattlerCoordAttrs(target.geometry.side, art).yOffset };
      break;
    case 322: config = { move: "COSMIC_POWER", attacker, target, fieldProfile }; break;
    case 212:
      // meanLookFramebuffer.ts:124: the eye is created from ANIM_ATTACKER, so the profile carries its subpriority.
      config = { move: "MEAN_LOOK", attacker, target, fieldProfile,
        animationProfile: { targetSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 265: {
      // GetBattlerSpriteCoordAttr width/height + picture height of the target (prep s2.6).
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art);
      const coords = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "SMELLING_SALT", attacker, target, fieldProfile,
        animationProfile: {
          targetLeft: targetAnchors.picOffsetPoint.x - coords.width / 2,
          targetRight: targetAnchors.picOffsetPoint.x + coords.width / 2,
          targetTop: targetAnchors.picOffsetPoint.y - coords.height / 2,
          targetPictureY: targetAnchors.picOffsetPoint.y,
          targetVerticalSpan: targetAnchors.pictureHeight,
        } };
      break;
    }
    case 111:
      // Move_DEFENSE_CURL argv (0,6,0,1): AnimSpriteOnMonPos(respectMonPicOffsets=FALSE)
      // = attacker battlePositionCenter + (0,6) (battle_anim_mons.c:1515-1528).
      config = { move: "DEFENSE_CURL",
        attacker: { ...attacker, geometry: { ...attacker.geometry, animationCenter: {
          x: attacker.geometry.battlePositionCenter.x, y: attacker.geometry.battlePositionCenter.y + 6 } } },
        target, fieldProfile,
        animationProfile: { attackerPicYOffset: art[attacker.geometry.side].coords.yOffset,
          attackerSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 275:
      config = { move: "INGRAIN", attacker, target, fieldProfile,
        animationProfile: { attackerSubpriority: attacker.geometry.side === "player" ? 30 : 40 } };
      break;
    case 35:
      config = { move: "WRAP", attacker, target, fieldProfile, animationProfile: WRAP_ANIMATION_PROFILE };
      break;
    case 20:
      config = { move: "BIND", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: BIND_ANIMATION_PROFILE };
      break;
    case 225:
      config = { move: "DRAGON_BREATH", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: { ...CANONICAL_DRAGON_BREATH_FIRE_GEOMETRY,
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
          attackerSide: attacker.geometry.side,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40 } };
      break;
    case 296: config = { move: "MIST_BALL", attacker, target, fieldProfile }; break;
    case 312: config = { move: "AROMATHERAPY", attacker, target, fieldProfile }; break;
    case 266: {
      // battle_anim_effects_1.c thought-bubble/finger top: BATTLER_COORD_X and max(10, pic y - height / 2).
      const pic = attackerAnchors.picOffsetPoint;
      const coords = liveBattlerCoordAttrs(attacker.geometry.side, art);
      config = { move: "FOLLOW_ME", attacker, target, fieldProfile,
        attackerTop: { x: attackerAnchors.battlePositionCenter.x, y: Math.max(10, pic.y - coords.height / 2) } };
      break;
    }
    case 118: case 269: {
      // SetSpriteNextToMonHead (battle_anim_effects_1.c:5480-5488).
      const pic = attackerAnchors.picOffsetPoint;
      const coords = liveBattlerCoordAttrs(attacker.geometry.side, art);
      const attackerHead = {
        x: pic.x + (attacker.geometry.side === "player" ? coords.width / 2 + 8 : -coords.width / 2 - 8),
        y: pic.y - Math.trunc(coords.height / 4),
      };
      config = request.moveId === 118
        ? { move: "METRONOME", attacker, target, fieldProfile, attackerHead }
        : { move: "TAUNT", attacker, target, fieldProfile, attackerHead };
      break;
    }
    case 187: {
      // SetSpriteCoordsToAnimAttackerCoords + the note's +8 y; HP is the displayed pre-move HP (healthbarupdate follows).
      const pic = attackerAnchors.picOffsetPoint;
      config = { move: "BELLY_DRUM", attacker, target, fieldProfile, attackerNoteOrigin: { x: pic.x, y: pic.y + 8 } };
      break;
    }
    case 52:
      // Order-independent (docs/order-consumer-prep.md §0): every equal-key ember/flare pair is created in a different
      // sort window, so ember.ts's creation-order rule needs no host order. Geometry as Dragon Breath's fire.
      config = { move: "EMBER", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
          targetBattlePosition: liveBattlerAnchors(target.geometry.side, art).battlePositionCenter,
          attackerSide: attacker.geometry.side,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40,
        } };
      break;
    case 215: {
      // Order consumer (docs/order-consumer-prep.md §0): the persistent sort replays from F filtered to the six reused
      // slots at activation. Unknown tracked order (liveSpriteOrderHost.ts) -> null, the bounded scene-off view.
      if (!spriteOrderInput?.known) return null;
      const noteOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        HEAL_BELL_REUSED_ORDER_SLOTS);
      if (noteOrderSeed === null) return null;
      config = { move: "HEAL_BELL", attacker, target, fieldProfile, noteOrderSeed };
      break;
    }
    case 348: {
      // Order consumer (docs/order-consumer-prep.md §0): F filtered to the blade + trail slots at activation seeds the
      // persistent sort; unknown order -> null (scene-off fallback).
      if (!spriteOrderInput?.known) return null;
      const oamOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        LEAF_BLADE_OAM_ORDER_SLOTS);
      if (oamOrderSeed === null) return null;
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art);
      const targetCoords = liveBattlerCoordAttrs(target.geometry.side, art);
      config = { move: "LEAF_BLADE", attacker, target, fieldProfile, oamOrderSeed,
        targetProfile: { pictureOffset: targetAnchors.picOffsetPoint, width: targetCoords.width,
          height: targetCoords.height, subpriority: target.geometry.side === "player" ? 30 : 40 } };
      break;
    }
    case 299: {
      // Order consumer (docs/order-consumer-prep.md §0): F filtered to the ten lowest-free slots before the foot
      // allocation seeds the sort (pixel-sensitive: reversed/ascending seeds change 8 ages); unknown -> null.
      if (!spriteOrderInput?.known) return null;
      const spriteSlots = [...spriteOrderInput.free].sort((l, r) => l - r).slice(0, 10);
      const spriteOrderSeed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] },
        spriteSlots);
      if (spriteOrderSeed === null || spriteSlots.length !== 10) return null;
      config = { move: "BLAZE_KICK", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          targetCenter: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
          targetSubpriority: target.geometry.side === "player" ? 30 : 40,
          attackerSide: attacker.geometry.side, spriteSlots, spriteOrderSeed,
        } };
      break;
    }
    case 88: {
      // Order consumer (docs/order-consumer-prep.md §0): the profile's 64-entry seed is the known-entry occupied
      // prefix + F (valid only while the occupants are the known-entry ones: the host lends only then, and the prefix
      // order is the known one at every such real-route body edge, tests/spriteOrderEventTransform.test.ts).
      if (!spriteOrderInput?.known) return null;
      const spriteOrderSeed = spriteOrderWithOccupiedPrefix(
        { known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, KNOWN_ENTRY_OCCUPIED_SPRITE_ORDER);
      if (spriteOrderSeed === null) return null;
      config = { move: "ROCK_THROW", attacker, target, fieldProfile,
        animationProfile: { ...ROCK_THROW_ANIMATION_PROFILE, spriteOrderSeed } };
      break;
    }
    case 195: {
      // Order consumer (docs/order-consumer-prep.md §0): equal-centerY notes inherit the free order of their
      // creation window; unknown order -> null. The 3/3 perish counts are the battle engine's immutable result
      // (next-adapters-prep5 §2.2): a live Perish Song always starts both timers at three.
      if (!spriteOrderInput?.known) return null;
      const noteOrderSeed = perishSongNoteOrderFromFree(spriteOrderInput.free);
      if (noteOrderSeed === null) return null;
      config = { move: "PERISH_SONG", attacker, target, noteOrderSeed,
        fieldProfile: { ...fieldProfile, playerPerishSongTurns: 3, opponentPerishSongTurns: 3 } };
      break;
    }
    case 53: {
      // docs/order-consumer-prep.md §0: flames take the eight lowest free slots, one per sort window, so equal keys
      // resolve by creation order whatever the free order is (0/130 ages change for 5 alternative seeds). A known
      // order supplies the provider's relative order (== accepted literal == observed 2/2); otherwise the slots
      // ascend. Slots are labels only here (known-entry lowest-free 3,4,5,7,9,10,11,12 when the host has no order).
      const known = spriteOrderInput?.known ? [...spriteOrderInput.free].sort((l, r) => l - r).slice(0, 8) : null;
      const flameSpriteSlots = known ?? [3, 4, 5, 7, 9, 10, 11, 12];
      const provided = known && spriteOrderInput
        ? spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, flameSpriteSlots) : null;
      config = { move: "FLAMETHROWER", attacker, target, fieldProfile: { ...fieldProfile, playerStatus: "none" },
        animationProfile: {
          attackerCenter: attackerAnchors.picOffsetPoint,
          targetCenter: liveBattlerAnchors(target.geometry.side, art).picOffsetPoint,
          attackerSide: attacker.geometry.side,
          // ANIM_ATTACKER subpriority 3 off the attacker's base (30 player / 40 opponent): 27 / 37.
          flameSubpriority: attacker.geometry.side === "player" ? 27 : 37,
          flameSpriteSlots,
          spriteOrderSeed: provided ?? flameSpriteSlots,
        } };
      break;
    }
    case 82: config = { move: "DRAGON_RAGE", attacker, target, fieldProfile }; break;
    case 288: {
      // Order consumer (docs/order-consumer-prep.md §0): the six flames take the six lowest free slots in one
      // sort window and inherit their relative free order, so only a host-supplied order is exact. Unknown tracked
      // order (liveSpriteOrderHost.ts) -> null, the bounded scene-off view.
      if (!spriteOrderInput?.known) return null;
      const lowestFree = [...spriteOrderInput.free].sort((left, right) => left - right).slice(0, 6);
      const seed = spriteOrderForSlots({ known: true, free: spriteOrderInput.free, pendingDestroyed: [] }, lowestFree);
      if (lowestFree.length !== 6 || seed === null) return null;
      const side = attacker.geometry.side;
      // AnimTask_GrudgeFlames (battle_anim_ghost.c:1182-1187): X_2, GetBattlerYCoordWithElevation (sBattlerCoords y
      // minus the enemy elevation), BG priority of the battler's BG (BG2 player / BG1 opponent), subpriority.
      const elevation = art[side].origin.y - battleCommandFieldSpriteOrigin(art[side], side).y;
      config = {
        move: "GRUDGE",
        attacker: affineCenterBattler(attacker),
        target: affineCenterBattler(target),
        fieldProfile,
        animationProfile: {
          flameSlots: lowestFree as unknown as readonly [number, number, number, number, number, number],
          spriteOrderSeed: seed as unknown as readonly [number, number, number, number, number, number],
          attackerSubpriority: side === "player" ? 30 : 40,
          targetSubpriority: side === "player" ? 40 : 30,
          attackerBgPriority: side === "player" ? 2 : 1,
          attackerWidth: liveBattlerCoordAttrs(side, art).width,
          flameCenter: {
            x: attackerAnchors.battlePositionCenter.x,
            y: attackerAnchors.battlePositionCenter.y - (side === "opponent" ? elevation : 0),
          },
          // State-only diagnostic in grudge.ts (no pixel consumer); the live seam has no ROM animation-RNG value.
          animationRngSeed: 0,
        },
      };
      break;
    }
    case 317: {
      // docs/next-adapters-prep6.md s2.1: rocks/Red-X use the target pic point; the target's battler slot is the
      // known-entry slot (opponent 8 / player 6, equal to liveSpriteSlotForOwner on the known-entry host); the rock
      // slots 3,4,5,7,9 are first-free and seed-independent (0/42 seeds), so the reducer's slot rule needs no host.
      const targetAnchors = liveBattlerAnchors(target.geometry.side, art);
      config = { move: "ROCK_TOMB", attacker, target, fieldProfile,
        targetSpriteSlot: target.geometry.side === "opponent" ? 8 : 6,
        targetInitialX2: targetAnchors.frontIdleRest.x2,
        effectCenter: targetAnchors.picOffsetPoint };
      break;
    }
    case 219:
      // ringSubpriority = GetBattlerSpriteSubpriority(attacker) - 2 (30/40 - 2); the three ring slots are the
      // known-entry first-free slots 3,4,5 (prep6 s2.2) and seed-independent (0/42 seeds, s2.3): labels only.
      config = { move: "SAFEGUARD", attacker, target, fieldProfile,
        animationProfile: { ringSlots: [3, 4, 5], ringSubpriority: attacker.geometry.side === "player" ? 28 : 38 } };
      break;
    case 230:
      // spriteSlots = ROM spawn order of the 24 petals on the known-entry first-free host with slot reuse
      // (prep6-plans.json); seed-independent (0/42 seeds, 12 equal-key pairs none overlapping). targetSubpriority
      // is attacker subpriority - 2.
      config = { move: "SWEET_SCENT", attacker, target, fieldProfile,
        animationProfile: { spriteSlots: SWEET_SCENT_PETAL_SLOTS, targetSubpriority: attacker.geometry.side === "player" ? 28 : 38 } };
      break;
    // The attacker's displayed HP is already 0 at the event (setatkhptozero precedes attackanimation; prep6 s2.1),
    // the same displayed-field path as Explosion; the live seam reads it from the field.
    case 120: config = { move: "SELF_DESTRUCT", attacker, target, fieldProfile }; break;
    case 256: {
      // Stockpile count = request.turn (measured 1/2/3, prep6-swallow-probe.json). The attacker's affine centre is the
      // OBJ/sprite centre (affineCenterBattler), not the pic point; the pic point and coords.yOffset are separate inputs.
      const turn = request.turn as 1 | 2 | 3;
      config = { move: "SWALLOW", attacker: affineCenterBattler(attacker), target, fieldProfile, stockpileCount: turn,
        attackerPictureOffset: attackerAnchors.picOffsetPoint,
        attackerPictureYOffset: liveBattlerCoordAttrs(attacker.geometry.side, art).yOffset };
      break;
    }
    // Knock Off reads only the target's animation centre (the hit splat) and the reducer age; no order seed exists in
    // the config (known seed shapes give 0 differing frames, prep6 s2.3), so there is no order input to lend.
    case 282: config = { move: "KNOCK_OFF", attacker, target, fieldProfile }; break;
    case 185:
      if (attacker.geometry.side !== "player") return null;
      // The canonical ONIX_TO_GROVYLE profile = the source-age constants (prep6 s2.1: spriteCorners and the target's
      // hit-splat centre derive exactly); the move text and HP chrome come from the live view under liveField.
      config = { move: "FAINT_ATTACK", attacker, target, animationProfile: FAINT_ATTACK_ANIMATION_PROFILE,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" },
        moveTextStartAge: -24 };
      break;
    case 332:
    case 98: {
      // The body fns read the attacker side and the reducer age only (prep7 s2.1); the controller profile, hit reaction,
      // HP and text are HUD owned by the queue's hit/HP/message commands (never-reached ages here). The accepted windows
      // start before activation: the reducer age at the activation frame is 42 (Aerial Ace) / 44 (Quick Attack), the
      // same for both orientations (the player preset's offset 4 re-expresses it, prep7-reducer-checks.json), so live
      // age 0 = activation = reducer age 42 / 44. Rows before it are idle bodies under the preceding `message` command
      // (the move compositor's age is the move-animation command's phaseElapsed, liveMoveAnimation.ts header comment).
      const never = 1_000_000;
      const common = { attacker, target, animationAgeOffset: request.moveId === 332 ? 42 : 44, moveTextStartAge: 0,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" as const } };
      config = request.moveId === 332
        ? { move: "AERIAL_ACE", ...common, controllerProfile: { targetHpBefore: field.player.hp, targetHpAfter: field.player.hp,
            hitReactionFirstAge: never, hpDrainFirstAge: never, moveTextClearAge: never, resultTextFirstAge: never,
            currentMoveResetAge: never } }
        : { move: "QUICK_ATTACK", ...common, controllerProfile: { targetHpBefore: field.player.hp, targetHpAfter: field.player.hp,
            hitReactionFirstAge: never, hpDrainFirstAge: never, resultTextFirstAge: never,
            resultKind: "notVeryEffective" as const, currentMoveResetAge: never } };
      break;
    }
    case 8:
      // The body reads the target animation centre + side and the age only (prep7 s2.1). The accepted hpDrainProfile /
      // controllerDisplayProfile feed HP, result text, menu, freeze status (FrozenIceCube from age 409) and Sitrus: all
      // later queue commands outside the 183-frame script, so neutral never-reached ages are passed (omitting
      // controllerDisplayProfile drops no body-window pixel: dense rows 0..183 are exact without it).
      config = { move: "ICE_PUNCH", attacker, target, moveTextStartAge: 0,
        fieldProfile: { playerHp: field.player.hp, opponentHp: field.opponent.hp, playerStatus: "none" },
        hpDrainProfile: { startHp: field.player.hp, endHp: field.player.hp, firstDisplayedAge: 1_000_000 } };
      break;
    case 313: {
      // prep7 s2.1: the picture bounds are the attacker pic point -/+ width/2 and - height/2 (GetBattlerSpriteCoordAttr
      // LEFT/RIGHT/TOP, exact 2/2); the affine centre is the sprite centre, not the pic point. The typed
      // controllerPresentation is read only by the renderer's bottom-UI/banner block, which liveField skips (the queue's
      // stat command owns the banner, result text and menu): never-reached ages. The -2 Sp. Def receipt (6 -> 4, anim
      // argument 55) is the move's fixed effect (EFFECT_SPECIAL_DEFENSE_DOWN_2), which the display fn validates.
      const attrs = liveBattlerCoordAttrs(attacker.geometry.side, art);
      const pic = attackerAnchors.picOffsetPoint;
      const never = 1_000_000;
      config = { move: "FAKE_TEARS", attacker: affineCenterBattler(attacker), target, fieldProfile,
        attackerPictureBounds: { left: pic.x - attrs.width / 2, right: pic.x + attrs.width / 2, top: pic.y - attrs.height / 2 },
        controllerPresentation: { kind: "resolved-stat-drop",
          kickoff: { messageId: "STRINGID_USEDMOVE", firstAge: 0,
            selection: { moveIds: [0, 0, 0, 0], maxPP: [0, 0, 0, 0], cursor: 0 } },
          statChange: { battler: "target", stat: "special-defense", from: 6, to: 4 },
          statAnimation: { animationId: "STATS_CHANGE", argument: 55, firstAge: never },
          result: { messageId: "STRINGID_DEFENDERSSTATFELL", firstAge: never },
          moveEnd: { clearAge: never } } };
      break;
    }
    case 153: config = { move: "EXPLOSION", attacker, target, fieldProfile }; break;
    case 248: config = { move: "FUTURE_SIGHT", attacker, target, fieldProfile }; break;
    case 342:
      config = {
        move: "POISON_TAIL",
        attacker: affineCenterBattler(attacker),
        target,
        fieldProfile,
      };
      break;
    case 343: config = { move: "COVET", attacker, target, fieldProfile }; break;
    case 347: config = { move: "CALM_MIND", attacker, target, fieldProfile }; break;
    default: return null;
  }
  // sceneOnLightScreenView/lightScreenAtAge are relative to wall creation;
  // the controller-owned live command starts at animation-script activation.
  // The MetallicShine bodies' accepted staged windows start at presentation
  // age -1: the first displayed row precedes the shine task's age 0.
  const shineBody = request.moveId === 106 || request.moveId === 334 || request.moveId === 232;
  // Reflect and Mirror Coat views anchor at wall creation (activation + 7);
  // Barrier, Magic Coat and Protect anchor at the first script pointer.
  const wallAnchorOffset = request.moveId === 113 || request.moveId === 115
    || request.moveId === 243 ? 7 : 0;
  // Sweet Scent's accepted rows start at reducer age -4 (the pointer-owned setup rows, sweetScentFramebuffer.ts:101).
  const setupAge = request.moveId === 230 ? 4 : 0;
  return { config, age: wallAnchorOffset ? age - wallAnchorOffset : shineBody ? age - 1 : age - setupAge };
}
