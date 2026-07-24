/**
 * Source-pinned constants used by the typed Battle Script rules seam.
 *
 * Provenance:
 * - include/constants/battle_script_commands.h:304-318
 * - include/battle.h:26-42,649-692
 * - include/constants/battle.h:129-178,184-210
 * - include/constants/moves.h:169
 *
 * Keep these source identities centralized. Command handlers and rules ports
 * consume numeric source data; they do not dispatch on move names.
 */
export const BATTLE_SCRIPT_BATTLER_SELECTORS = Object.freeze({
  BS_ATTACKER: 1,
  BS_EFFECT_BATTLER: 2,
} as const);

export const BATTLE_SCRIPT_STATUS2_MASKS = Object.freeze({
  STATUS2_CONFUSION: 0x0000_0007,
  STATUS2_MULTIPLETURNS: 0x0000_1000,
  STATUS2_INFATUATION: 0x000f_0000,
  STATUS2_NIGHTMARE: 0x0800_0000,
  STATUS2_CURSED: 0x1000_0000,
} as const);

export const BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE =
  (1 << 6 | 1 << 7 | 1 << 18) >>> 0;

export const BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS = 1 << 7;
export const BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING = 1 << 9;
export const BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE = 1 << 19;
export const BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP = 1 << 23;

export const BATTLE_SCRIPT_HITMARKER_DESTINYBOND = 1 << 6;
export const BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
export const BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK =
  BATTLE_SCRIPT_HITMARKER_DESTINYBOND
  | BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT;

export const BATTLE_SCRIPT_MOVE_RESULT_MISSED = 1 << 0;
export const BATTLE_SCRIPT_MOVE_STRUGGLE = 165;
export const BATTLE_SCRIPT_ACTION_FINISHED = 12;
