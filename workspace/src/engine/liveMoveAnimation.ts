import type { LiveMovePaletteInput } from "./liveMoveAnimationPalette.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { battleCommandFieldSpriteOrigin, createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type {
  SceneOnMovePresentationState, SceneOnMoveConfig, SceneOnPresentationBattler,
} from "../animation/sceneOnPresentation.ts";
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
import { speciesFrontIdleRestOffsetOrZero } from "../animation/speciesIdleAnim.ts";

/** Only adapters with production inputs belong here; exact acceptance is separate. */
export const LIVE_MOVE_ANIMATION_IDS = Object.freeze([
  2, 5, 11, 14, 21, 23, 25, 27, 29, 39, 41, 44, 47, 48, 67, 78,
  79, 92, 93, 94, 95, 97, 101, 103, 108, 109, 122, 131, 136, 147, 154, 158,
  163, 211, 223, 231, 242, 246, 247, 264, 280, 305, 306, 320, 325, 336, 337, 342,
  347,
] as const);

export function liveMoveAnimationDuration(request: BattleMoveAnimationRequest): number | null {
  switch (request.moveId) {
    case 2: return KARATE_CHOP_FRAME_COUNT;
    case 5: return 160; // Mega Punch source body through first inactive row.
    case 11: return 42; // Vice Grip source body through first inactive row.
    case 14: return SWORDS_DANCE_FRAME_COUNT;
    case 21: return 54; // Slam source body through first inactive row.
    case 23: return STOMP_FRAME_COUNT;
    case 25: return 160; // Mega Kick source body through first inactive row.
    case 27: return 55; // Rolling Kick source body through first inactive row.
    case 29: return 48; // headbuttAtAge: active through 46, then cleanup.
    case 39: return TAIL_WHIP_FRAME_COUNT;
    case 41: return 37; // Twineedle's two stingers through clearmonbg cleanup.
    case 44: return 26; // First sharp-teeth row through inactive cleanup.
    // Full source-script body, including the target-monbg / palette cleanup.
    case 47: return request.attacker === 0 ? 245 : 248;
    case 48: return 51; // First Supersonic ring through the final inactive row.
    case 67: return 33; // Low Kick source body through first inactive row.
    case 78:
    case 79: return STUN_SPORE_FRAME_COUNT;
    case 92: return 219; // Toxic's bubbles through the source-owned cleanup.
    case 93:
    case 94: return 140; // Psychic-background fade-out through inactive cleanup.
    case 95:
      return request.attacker === 0
        ? HYPNOSIS_PLAYER_FRAME_COUNT
        : HYPNOSIS_OPPONENT_FRAME_COUNT;
    case 97: return AGILITY_FRAME_COUNT;
    case 101: return NIGHT_SHADE_FRAME_COUNT;
    case 103: return SCREECH_FIRST_INACTIVE_AGE + 1;
    case 108: return 125; // smokescreenAtAge: active through 123.
    case 109: return CONFUSE_RAY_FRAME_COUNT;
    case 122: return 73; // Lick source body through first inactive row.
    case 131: return 84; // Spike Cannon pointer body through inactive cleanup.
    case 136: return 91; // Hi Jump Kick source body through first inactive row.
    case 147: return SPORE_FRAME_COUNT;
    case 154: return FURY_SWIPES_LAST_BODY_AGE + 1;
    case 158: return 107; // Hyper Fang restorebg fade through cleanup.
    case 163: return 46; // Slash body through final source-owned shake row.
    case 211: return 197; // Steel Wing source body through first inactive row.
    case 223: return 75; // Dynamic Punch source body through first inactive row.
    case 231: return 135; // Iron Tail source body through first inactive row.
    case 242: return 142; // Crunch dark-background body through cleanup.
    case 246: return 128; // ancientPowerAtAge: active through 126, cleanup at 127.
    case 247: return SHADOW_BALL_END_AGE + 1;
    case 264:
      return FOCUS_PUNCH_FIRST_INACTIVE_AGE[
        request.target === 0 ? "player" : "opponent"
      ] + 1;
    case 280:
      return request.turn === 0
        ? BRICK_BREAK_NORMAL_FRAME_COUNT
        : BRICK_BREAK_SHATTERED_FRAME_COUNT;
    case 305: return 104; // Poison Fang body through blend/monbg cleanup.
    case 306: return 69; // Crush Claw body through inactive cleanup.
    case 320: return GRASS_WHISTLE_WINDOW_FRAMES;
    // Source restorebg fade, then inactive display. Both orientations restore.
    case 325: return request.attacker === 0 ? 106 : 105;
    case 336: return HOWL_FRAME_COUNT;
    case 337: return 137; // Dragon Claw palette restoration through cleanup.
    case 342: return 187; // Poison Tail source body through first inactive row.
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
  const fieldProfile = {
    playerHp: field.player.hp, playerMaxHp: field.player.maxHP,
    opponentHp: field.opponent.hp, opponentMaxHp: field.opponent.maxHP,
    // All HUD values are composed from the live resolution view after the body.
  };
  let config: SceneOnMoveConfig;
  switch (request.moveId) {
    case 2: config = { move: "KARATE_CHOP", attacker, target, fieldProfile }; break;
    case 5: config = { move: "MEGA_PUNCH", attacker, target, fieldProfile }; break;
    case 11: config = { move: "VICE_GRIP", attacker, target, fieldProfile }; break;
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
    case 39: config = { move: "TAIL_WHIP", attacker, target, fieldProfile }; break;
    case 41: config = { move: "TWINEEDLE", attacker, target, fieldProfile }; break;
    case 44: config = { move: "BITE", attacker, target, fieldProfile }; break;
    case 47: config = { move: "SING", attacker, target, fieldProfile }; break;
    case 48: config = { move: "SUPERSONIC", attacker, target, fieldProfile }; break;
    case 67: config = { move: "LOW_KICK", attacker, target, fieldProfile }; break;
    case 78: config = { move: "STUN_SPORE", attacker, target, fieldProfile }; break;
    case 79: config = { move: "SLEEP_POWDER", attacker, target, fieldProfile }; break;
    case 92: config = { move: "TOXIC", attacker, target, fieldProfile }; break;
    case 93: config = { move: "CONFUSION", attacker, target, fieldProfile }; break;
    case 94: config = { move: "PSYCHIC", attacker, target, fieldProfile }; break;
    case 95: config = { move: "HYPNOSIS", attacker, target, fieldProfile }; break;
    case 97: config = { move: "AGILITY", attacker, target, fieldProfile }; break;
    case 101: config = { move: "NIGHT_SHADE", attacker, target, fieldProfile }; break;
    case 103: config = { move: "SCREECH", attacker, target, fieldProfile }; break;
    case 108: config = { move: "SMOKESCREEN", attacker, target, fieldProfile }; break;
    case 109: config = { move: "CONFUSE_RAY", attacker, target, fieldProfile }; break;
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
    case 154: config = { move: "FURY_SWIPES", attacker, target, fieldProfile }; break;
    case 158: config = { move: "HYPER_FANG", attacker, target, fieldProfile }; break;
    case 163: config = { move: "SLASH", attacker, target, fieldProfile }; break;
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
    case 242: config = { move: "CRUNCH", attacker, target, fieldProfile }; break;
    case 246: config = { move: "ANCIENT_POWER", attacker, target, fieldProfile }; break;
    case 247: config = { move: "SHADOW_BALL", attacker, target, fieldProfile }; break;
    case 264: config = { move: "FOCUS_PUNCH", attacker, target, fieldProfile }; break;
    case 280:
      config = {
        move: "BRICK_BREAK",
        body: request.turn === 0 ? "normal" : "shattered-wall",
        attacker, target, fieldProfile,
      };
      break;
    case 305: config = { move: "POISON_FANG", attacker, target, fieldProfile }; break;
    case 306: config = { move: "CRUSH_CLAW", attacker, target, fieldProfile }; break;
    case 320: config = { move: "GRASS_WHISTLE", attacker, target, fieldProfile }; break;
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
    case 342:
      config = {
        move: "POISON_TAIL",
        attacker: affineCenterBattler(attacker),
        target,
        fieldProfile,
      };
      break;
    case 347: config = { move: "CALM_MIND", attacker, target, fieldProfile }; break;
    default: return null;
  }
  return { config, age };
}
