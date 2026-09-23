import enemyElevations from "../data/gen/enemy-mon-elevations.json" with { type: "json" };
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import { createBattleCommandFieldArtView } from "./battleCommandFieldArt.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import type {
  SceneOnMovePresentationState, SceneOnMoveConfig, SceneOnPresentationBattler,
} from "../animation/sceneOnPresentation.ts";
import { TAIL_WHIP_FRAME_COUNT } from "../animation/tailWhip.ts";
import { CONFUSE_RAY_FRAME_COUNT } from "../animation/confuseRay.ts";

/** Only adapters with production inputs belong here; exact acceptance is separate. */
export const LIVE_MOVE_ANIMATION_IDS = Object.freeze([29, 39, 108, 109, 325] as const);

export function liveMoveAnimationDuration(request: BattleMoveAnimationRequest): number | null {
  switch (request.moveId) {
    case 29: return 48; // headbuttAtAge: active through 46, then cleanup.
    case 39: return TAIL_WHIP_FRAME_COUNT;
    case 108: return 125; // smokescreenAtAge: active through 123.
    case 109: return CONFUSE_RAY_FRAME_COUNT;
    // Source restorebg fade, then inactive display. Both orientations restore.
    case 325: return request.attacker === 0 ? 106 : 105;
    default: return null;
  }
}

/** Source singles field geometry and art, from the current displayed party members. */
export function liveMoveAnimationPresentation(
  request: BattleMoveAnimationRequest,
  field: BattleResolutionDisplayedField,
  age: number,
): SceneOnMovePresentationState | null {
  if (liveMoveAnimationDuration(request) === null) return null;
  const art = createBattleCommandFieldArtView(field);
  const battler = (side: "player" | "opponent"): SceneOnPresentationBattler => ({
    species: art[side].speciesSymbol,
    geometry: {
      side, spriteCorner: art[side].origin,
      // GetBattlerSpriteFinal_Y(..., TRUE): player effects add 8 and
      // clamp to 104; opponent effects subtract species elevation.
      animationCenter: { x: art[side].origin.x + 32, y: Math.min(104,
        art[side].origin.y + 32 + (side === "player" ? 8 :
          -((enemyElevations as Readonly<Record<string, number>>)[art[side].speciesSymbol] ?? 0))) },
      battlePositionCenter: { x: side === "player" ? 72 : 176, y: side === "player" ? 80 : 40 },
    },
  });
  const attacker = battler(request.attacker === 0 ? "player" : "opponent");
  // These move bodies draw the whole field. A self-targeting move's effect
  // adapter must separately retain its semantic target when one is added.
  const target = battler(request.attacker === 0 ? "opponent" : "player");
  const fieldProfile = {
    playerHp: field.player.hp, playerMaxHp: field.player.maxHP,
    opponentHp: field.opponent.hp, opponentMaxHp: field.opponent.maxHP,
    // All HUD values are composed from the live resolution view after the body.
  };
  let config: SceneOnMoveConfig;
  switch (request.moveId) {
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
    case 108: config = { move: "SMOKESCREEN", attacker, target, fieldProfile }; break;
    case 109: config = { move: "CONFUSE_RAY", attacker, target, fieldProfile }; break;
    case 325:
      config = {
        move: "SHADOW_PUNCH", attacker, target,
        fieldProfile: { ...fieldProfile, playerStatus: "none" },
        attackerSpriteId: request.attacker === 0 ? 6 : 8,
        attackerMoveSpeed: request.attacker === 0 ? 8 : -8,
        attackerSubpriority: request.attacker === 0 ? 30 : 40,
      };
      break;
    default: return null;
  }
  return { config, age };
}
