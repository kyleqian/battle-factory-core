/**
 * Source-pinned constants used by the typed Battle Script rules seam.
 *
 * Provenance:
 * - include/constants/battle_script_commands.h:304-318
 * - include/battle.h:26-42,649-692
 * - include/constants/battle.h:129-178,184-210
 * - include/constants/moves.h:169
 * - include/constants/abilities.h:47-52
 *
 * Keep these source identities centralized. Command handlers and rules ports
 * consume numeric source data; they do not dispatch on move names.
 */
export const BATTLE_SCRIPT_BATTLER_SELECTORS = Object.freeze({
  BS_TARGET: 0,
  BS_ATTACKER: 1,
  BS_EFFECT_BATTLER: 2,
  BS_FAINTED: 3,
  /** battle_script_commands.h:311 / battle_util.c:708-710 -- literal battler id 0. */
  BS_BATTLER_0: 7,
  /** battle_script_commands.h:314 -- gBattleScripting.battler, the ItemBattleEffects/AbilityBattleEffects end-turn scripts' own selector (docs/endturn-abilities-items-ground-truth.md §1c/§5 slice 4). */
  BS_SCRIPTING: 10,
} as const);

export const BATTLE_SCRIPT_STATUS2_MASKS = Object.freeze({
  STATUS2_CONFUSION: 0x0000_0007,
  STATUS2_UPROAR: 0x0000_0070,
  STATUS2_BIDE: 0x0000_0300,
  STATUS2_LOCK_CONFUSE: 0x0000_0c00,
  STATUS2_MULTIPLETURNS: 0x0000_1000,
  STATUS2_INFATUATION: 0x000f_0000,
  STATUS2_FLINCHED: 0x0000_0008,
  STATUS2_RECHARGE: 0x0040_0000,
  STATUS2_SUBSTITUTE: 0x0100_0000,
  STATUS2_DESTINY_BOND: 0x0200_0000,
  STATUS2_NIGHTMARE: 0x0800_0000,
  STATUS2_CURSED: 0x1000_0000,
  STATUS2_DEFENSE_CURL: 0x4000_0000,
  STATUS2_TORMENT: 0x8000_0000,
} as const);

/** include/battle_util.h:4-10. */
export const BATTLE_SCRIPT_MOVE_LIMITATIONS = Object.freeze({
  MOVE_LIMITATION_ZEROMOVE: 1 << 0,
  MOVE_LIMITATION_PP: 1 << 1,
  MOVE_LIMITATION_DISABLED: 1 << 2,
  MOVE_LIMITATION_TORMENTED: 1 << 3,
  MOVE_LIMITATION_TAUNT: 1 << 4,
  MOVE_LIMITATION_IMPRISON: 1 << 5,
  MOVE_LIMITATIONS_ALL: 0xff,
} as const);

export const BATTLE_SCRIPT_STATUS1_SLEEP = 0x0000_0007;
export const BATTLE_SCRIPT_STATUS1_POISON = 1 << 3;
export const BATTLE_SCRIPT_STATUS1_BURN = 1 << 4;
export const BATTLE_SCRIPT_STATUS1_FREEZE = 1 << 5;
export const BATTLE_SCRIPT_STATUS1_PARALYSIS = 1 << 6;
export const BATTLE_SCRIPT_STATUS1_TOXIC_POISON = 1 << 7;
/** Cmd_cureifburnedparalyzedorpoisoned's exact accepted-status predicate. */
export const BATTLE_SCRIPT_STATUS1_REFRESH_CURE_MASK = (
  BATTLE_SCRIPT_STATUS1_POISON
  | BATTLE_SCRIPT_STATUS1_BURN
  | BATTLE_SCRIPT_STATUS1_PARALYSIS
  | BATTLE_SCRIPT_STATUS1_TOXIC_POISON
) >>> 0;
export const BATTLE_SCRIPT_STATUS3_IMPRISONED_OTHERS = 1 << 13;
export const BATTLE_SCRIPT_STATUS3_GRUDGE = 1 << 14;

export const BATTLE_SCRIPT_ATTACK_CANCELER_PHASES = Object.freeze({
  CANCELER_FLAGS: 0,
  CANCELER_ASLEEP: 1,
  CANCELER_FROZEN: 2,
  CANCELER_TRUANT: 3,
  CANCELER_RECHARGE: 4,
  CANCELER_FLINCH: 5,
  CANCELER_DISABLED: 6,
  CANCELER_TAUNTED: 7,
  CANCELER_IMPRISONED: 8,
  CANCELER_CONFUSED: 9,
  CANCELER_PARALYZED: 10,
  CANCELER_IN_LOVE: 11,
  CANCELER_BIDE: 12,
  CANCELER_THAW: 13,
  CANCELER_END: 14,
} as const);

export const BATTLE_SCRIPT_MOVE_NONE = 0;
export const BATTLE_SCRIPT_MOVE_POUND = 1;
export const BATTLE_SCRIPT_MOVE_BIDE = 117;

export const BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE =
  (1 << 6 | 1 << 7 | 1 << 18) >>> 0;
export const BATTLE_SCRIPT_STATUS3_ALWAYS_HITS = (1 << 3 | 1 << 4) >>> 0;
/** include/constants/battle.h:160 -- the Perish Song active marker. */
export const BATTLE_SCRIPT_STATUS3_PERISH_SONG = 1 << 5;
export const BATTLE_SCRIPT_STATUS3_ON_AIR = 1 << 6;
export const BATTLE_SCRIPT_STATUS3_UNDERGROUND = 1 << 7;
export const BATTLE_SCRIPT_STATUS3_MINIMIZED = 1 << 8;
export const BATTLE_SCRIPT_STATUS3_ROOTED = 1 << 10;
export const BATTLE_SCRIPT_STATUS3_UNDERWATER = 1 << 18;
/** include/constants/battle.h:168 -- the 2-bit yawn-countdown field (bits 11-12), "number of turns to sleep". */
export const BATTLE_SCRIPT_STATUS3_YAWN = ((1 << 11) | (1 << 12)) >>> 0;
/** include/constants/battle.h:169 -- STATUS3_YAWN_TURN(2), the fresh-countdown value `Cmd_setyawn` writes on success. */
export const BATTLE_SCRIPT_STATUS3_YAWN_TURN_2 = ((2 << 11) & BATTLE_SCRIPT_STATUS3_YAWN) >>> 0;
/** include/constants/battle.h:169 -- STATUS3_YAWN_TURN(1), the one-turn decrement `ENDTURN_YAWN` subtracts each end-turn pass (`battle_util.c:1756`). */
export const BATTLE_SCRIPT_STATUS3_YAWN_TURN_1 = ((1 << 11) & BATTLE_SCRIPT_STATUS3_YAWN) >>> 0;
/** include/constants/battle.h:138 -- STATUS2_LOCK_CONFUSE_TURN(1), the one-turn decrement `ENDTURN_THRASH` subtracts each end-turn pass (`battle_util.c:1677`). */
export const BATTLE_SCRIPT_STATUS2_LOCK_CONFUSE_TURN_1 = ((1 << 10) & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE) >>> 0;
/** include/constants/battle.h:158-159 -- the seeder's battler id (bits 0-1) plus the "is seeded" bit. */
export const BATTLE_SCRIPT_STATUS3_LEECHSEED_BATTLER_MASK = (1 << 0) | (1 << 1);
export const BATTLE_SCRIPT_STATUS3_LEECHSEED = 1 << 2;
/** include/constants/battle.h:140-141 -- STATUS2_WRAPPED's 3-bit turn counter (bits 13-15). */
export const BATTLE_SCRIPT_STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);

export const BATTLE_SCRIPT_STATUS2_TRANSFORMED = 1 << 21;
export const BATTLE_SCRIPT_STATUS2_FORESIGHT = 1 << 29;

export const BATTLE_SCRIPT_HITMARKER_IGNORE_BIDE = 1 << 5;
export const BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR = 1 << 16;
export const BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND = 1 << 17;
export const BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER = 1 << 18;
export const BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS = 1 << 7;
export const BATTLE_SCRIPT_HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;
export const BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING = 1 << 9;
export const BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED = 1 << 10;
export const BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT = 1 << 11;
export const BATTLE_SCRIPT_HITMARKER_UNABLE_TO_USE_MOVE = 1 << 19;
export const BATTLE_SCRIPT_HITMARKER_PASSIVE_HP_UPDATE = 1 << 20;
export const BATTLE_SCRIPT_HITMARKER_ALLOW_NO_PP = 1 << 23;
export const BATTLE_SCRIPT_HITMARKER_GRUDGE = 1 << 24;
export const BATTLE_SCRIPT_HITMARKER_OBEYS = 1 << 25;
export const BATTLE_SCRIPT_HITMARKER_CHARGING = 1 << 27;

export const BATTLE_SCRIPT_HITMARKER_DESTINYBOND = 1 << 6;
export const BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
export const BATTLE_SCRIPT_MOVE_VALUES_CLEANUP_HITMARKER_MASK =
  BATTLE_SCRIPT_HITMARKER_DESTINYBOND
  | BATTLE_SCRIPT_HITMARKER_SYNCHRONIZE_EFFECT;

export const BATTLE_SCRIPT_MOVE_RESULT_MISSED = 1 << 0;
export const BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE = 1 << 1;
export const BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
export const BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;
export const BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED = 1 << 6;
/** include/constants/battle.h:225. */
export const BATTLE_SCRIPT_MOVE_RESULT_FAILED = 1 << 5;
/** include/constants/battle.h:224. */
export const BATTLE_SCRIPT_MOVE_RESULT_ONE_HIT_KO = 1 << 4;
/** include/constants/battle.h:227. */
export const BATTLE_SCRIPT_MOVE_RESULT_FOE_HUNG_ON = 1 << 7;
export const BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY = 1 << 20;
export const BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT = 1 << 15;
/** Never set for BATTLE_TYPE_FRONTIER, which every battle this engine models is. */
export const BATTLE_SCRIPT_BATTLE_TYPE_FIRST_BATTLE = 1 << 4;
export const BATTLE_SCRIPT_BATTLE_TYPE_WALLY_TUTORIAL = 1 << 9;
export const BATTLE_SCRIPT_MOVE_STRUGGLE = 165;
export const BATTLE_SCRIPT_MOVE_SNORE = 173;
export const BATTLE_SCRIPT_MOVE_SLEEP_TALK = 214;
export const BATTLE_SCRIPT_ABILITY_SOUNDPROOF = 43;
export const BATTLE_SCRIPT_ABILITY_EARLY_BIRD = 48;
export const BATTLE_SCRIPT_ABILITY_TRUANT = 54;
export const BATTLE_SCRIPT_EFFECT_THAW_HIT = 125;
export const BATTLE_SCRIPT_ACTION_FINISHED = 12;
