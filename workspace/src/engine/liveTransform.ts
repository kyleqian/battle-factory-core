/**
 * trf174 (ISSUES #153 remainder): the live Move_TRANSFORM body and the transformed battler's field state. Presentation only:
 * never read by rules, RNG, damage, turn order or the logical queue. Both scenes play the body (Cmd_attackanimation,
 * battle_script_commands.c:1748, exempts Transform from HITMARKER_NO_ANIMATIONS; sub157).
 *
 * Source (data/battle_anim_scripts.s Move_TRANSFORM; battle_anim_effects_3.c:2250 AnimTask_TransformMon): `monbg ANIM_ATTACKER`
 * moves the attacker to its anim BG (BG2 for the player, BG1 for the opponent; Task_UpdateMonBg copies the OBJ palette and follows
 * the sprite position every frame), then the task ramps the BG mosaic 1..15 one step every 3 frames, calls
 * HandleSpeciesGfxDataChange (battle_gfx_sfx_util.c:935: the target's party species picture — back for the player, front for the
 * opponent — drawn with the target's personality, its palette blended 6/16 toward white, sprite y = GetBattlerSpriteDefault_Y of
 * the copied species), ramps the mosaic back 15..0, clears it and (opponent attacker) re-arms the enemy shadow for the copied
 * species; `clearmonbg` shows the sprite again. No RNG, no particle, no palette fade.
 *
 * Measured (trf174Probe.py, 8 scenarios x 2 fresh runs, both scenes, both sides, SLOWBRO / elevated GOLBAT targets;
 * tools/integration/fixtures/trf174/): 108 script rows + the first inactive row = 109; RAM mosaic step k (1..15) on rows 3k + 3,
 * the swap on row 49, the descent 14..0 on rows 52 + 3j; each is displayed one row later (BG mosaic register / VRAM / palette
 * latch), so display row 50 is the first copied-species row. The anim BG equals the sprite pixel for pixel when unmosaicked, and BG
 * mosaic samples the block's top-left screen pixel. The enemy shadow is hidden from row 1 through the window (gAnimScriptActive).
 */
import type { BattleCommandFieldBattler } from "./battleCommandPresentation.ts";
import type { BattleMoveAnimationRequest } from "./battleMoveAnimation.ts";
import type { BattleResolutionDisplayedField } from "./battleResolutionPresentation.ts";
import { liveBattlerIsShiny } from "./liveMovePaletteComposite.ts";

export const LIVE_TRANSFORM_MOVE_ID = 144;
/** Activation .. first inactive row (108 Move_TRANSFORM script rows + 1), both scenes, both sides. */
export const LIVE_TRANSFORM_ROWS = 109;
/** First display row that shows the copied species (HandleSpeciesGfxDataChange on RAM row 49, latched one row later). */
export const LIVE_TRANSFORM_SWAP_ROW = 50;

const SPECIES_SPINDA = 308;
const SPECIES_CASTFORM = 385;

/**
 * Displayed BG mosaic level (H = V = level + 1 pixel blocks) on body row `age`: the RAM value of the row before. RAM: data[2]++ > 1
 * steps every third task run from row 3 (case 0 on row 4 enables the BG mosaic), 1..15 on rows 6..48, hold, 14..0 on rows 52..94.
 */
export function liveTransformMosaicLevel(age: number): number {
  const ram = age - 1;
  if (ram < 6) return 0;
  if (ram < 49) return Math.min(15, Math.floor((ram - 3) / 3));
  if (ram < 52) return 15;
  return Math.max(0, 15 - Math.floor((ram - 49) / 3));
}

const battlerOf = (field: BattleResolutionDisplayedField, battler: number): BattleCommandFieldBattler =>
  battler === 0 ? field.player : field.opponent;

/** The copied species / personality a Transform body shows on its attacker (the target's party species and personality). */
export function liveTransformOf(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): Readonly<{ species: number; personality: number }> {
  const target = battlerOf(field, request.target);
  return Object.freeze({ species: target.species, personality: (target.personality ?? 0) >>> 0 });
}

/**
 * Why the Transform body declines (null: it runs live). Proven scope: a non-shiny, untransformed, mon-shown attacker copying a
 * mon-shown, untransformed target other than SPINDA (spots by personality) and CASTFORM (form-keyed palette / frames), with a target
 * on the other side.
 */
export function liveTransformDeclineReason(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): string | null {
  if (request.moveId !== LIVE_TRANSFORM_MOVE_ID) return "not transform";
  if (request.attacker === request.target) return "self target";
  const attacker = battlerOf(field, request.attacker), target = battlerOf(field, request.target);
  if (attacker.transform !== undefined || target.transform !== undefined) return "transformed battler";
  if (attacker.substituteDoll === true || target.substituteDoll === true) return "substitute doll";
  if (liveBattlerIsShiny(attacker.personality)) return "shiny attacker (shiny palette of the copied species)";
  if (target.species === SPECIES_SPINDA) return "SPINDA target (personality spots)";
  if (target.species === SPECIES_CASTFORM || attacker.species === SPECIES_CASTFORM) return "CASTFORM";
  if (attacker.castformForm !== undefined || target.castformForm !== undefined) return "CASTFORM form";
  return null;
}

/**
 * Every OTHER live body declines while either battler is shown transformed: adapters draw species art keyed by the displayed party
 * species and have no proof with the copied picture / blended palette.
 */
export function liveTransformedBattlerDeclines(
  request: BattleMoveAnimationRequest, field: BattleResolutionDisplayedField,
): boolean {
  return request.moveId !== LIVE_TRANSFORM_MOVE_ID && (field.player.transform !== undefined || field.opponent.transform !== undefined);
}

/** `field` with `battler` shown transformed into `transform` (or back to its own species when null). */
export function withLiveTransform(
  field: BattleResolutionDisplayedField,
  battler: 0 | 1,
  transform: Readonly<{ species: number; personality: number }> | null,
): BattleResolutionDisplayedField {
  const current = battlerOf(field, battler);
  const { transform: _shown, ...mon } = current;
  const next = Object.freeze(transform === null ? mon : { ...mon, transform: Object.freeze({ ...transform }) });
  return Object.freeze(battler === 0 ? { ...field, player: next } : { ...field, opponent: next });
}
