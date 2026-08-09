/**
 * RUNG 1 of S10 step (ii): the miss-path prefix of BattleScript_EffectHit's
 * standard hit chain -- Cmd_accuracycheck, Cmd_attackstring, Cmd_ppreduce
 * (battle_script_commands.c:1099-1247). Consumes the already-pinned
 * calculateAccuracy/rollAccuracyHits ports from damageCalc.ts; does not
 * reimplement the accuracy math.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  recordBattleScriptAbilityReveal,
  recordBattleScriptItemEffectReveal,
} from "./battleScriptAiReveal.ts";
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
  type BattleScriptRngState,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptOperand,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import type {
  BattleScriptBattlerSelectorResolverPort,
  BattleScriptControllerIdlePort,
  BattleScriptMessagePreparationPort,
} from "./battleScriptSourceCommands.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING,
  BATTLE_SCRIPT_ITEM_ENIGMA_BERRY,
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT,
  BATTLE_SCRIPT_MOVE_STRUGGLE,
  BATTLE_SCRIPT_MOVE_TARGET_BOTH,
  BATTLE_SCRIPT_STATUS2_SUBSTITUTE,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptBattlerHoldEffectParam,
  resolveBattleScriptBattlerPartner,
  resolveBattleScriptMoveTarget,
  resolveBattleScriptMoveType,
  withBattleScriptPartyMemberItem,
  withBattleScriptPartyMemberHp,
  withBattleScriptPartyMemberPp,
  withBattleScriptPartyMemberStatus1,
  type BattleScriptMoveEndHalfwords,
  type BattleScriptMoveHistory,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesBattlers,
  type BattleScriptRulesContext,
  type BattleScriptStatStages,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_FIRST_BATTLE,
  BATTLE_SCRIPT_BATTLE_TYPE_WALLY_TUTORIAL,
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND,
  BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER,
  BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS,
  BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT,
  BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE,
  BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED,
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE,
  BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE,
  BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY,
  BATTLE_SCRIPT_STATUS2_FORESIGHT,
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_ALWAYS_HITS,
  BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT,
  BATTLE_SCRIPT_STATUS3_ON_AIR,
  BATTLE_SCRIPT_STATUS3_UNDERGROUND,
  BATTLE_SCRIPT_STATUS3_UNDERWATER,
} from "./battleScriptSourceConstants.ts";
import {
  applyRandomDamageMultiplier,
  applyStab,
  calculateAccuracy,
  calculateBaseDamage,
  getCriticalHitChanceStage,
  isTypePhysical,
  rollAccuracyHits,
  rollIsCriticalHit,
  type TypeEffectivenessEntry,
} from "./damageCalc.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import typeEffectivenessData from "../data/gen/type-effectiveness.json" with { type: "json" };
import {
  changeStatBuffs,
  STAT_ACC,
  STAT_ATK,
  STAT_DEF,
  STAT_EVASION,
  STAT_SPATK,
  STAT_SPDEF,
  STAT_SPEED,
} from "./battleScriptStatBuffs.ts";
import { cancelBattleScriptMultiTurnMoves } from "./battleScriptMultiTurnCancellation.ts";

type MoveRow = Readonly<{
  id: number;
  power: number;
  accuracy: number;
  effect: string;
  type: string;
  flags: readonly string[];
  secondaryEffectChance: number;
}>;

const MOVE_ROWS = new Map<number, MoveRow>(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row]),
);

function requireMoveRow(move: number): MoveRow {
  const row = MOVE_ROWS.get(move);
  if (!row) throw new Error(`accuracycheck/ppreduce: move ${move} has no source-derived gBattleMoves row`);
  return row;
}

const TYPE_NAME_BY_ID: readonly string[] = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
];

function resolveMoveTypeName(rulesContext: BattleScriptRulesContext, move: number): string {
  const id = resolveBattleScriptMoveType(move, rulesContext.dynamicMoveType);
  const name = TYPE_NAME_BY_ID[id];
  if (!name) throw new Error(`accuracycheck: unknown numeric type id ${id}`);
  return name;
}

const ABILITY_BATTLE_ARMOR = 4;
const ABILITY_LEVITATE = 26;
const ABILITY_WONDER_GUARD = 25;
const ABILITY_PRESSURE = 46;
const ABILITY_SHELL_ARMOR = 75;
/** include/constants/abilities.h:14-15,22 -- the only three AbilityBattleEffects(ABILITYEFFECT_ABSORBING) switch cases (battle_util.c:2679-2729); every other ability (including ABILITY_NONE) falls through that switch with no effect. */
const ABILITY_VOLT_ABSORB = 10;
const ABILITY_WATER_ABSORB = 11;
const ABILITY_FLASH_FIRE = 18;
const ABILITY_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({
  8: "ABILITY_SAND_VEIL",
  14: "ABILITY_COMPOUND_EYES",
  55: "ABILITY_HUSTLE",
  62: "ABILITY_GUTS",
});

const SPECIES_FARFETCHD = 83;
const SPECIES_CHANSEY = 113;

/** hold_effects.h ids (item-hold-effects.json's `holdEffectId`). */
export const HOLD_EFFECT_ID_FOCUS_BAND = 39;
const HOLD_EFFECT_ID_SCOPE_LENS = 41;
const HOLD_EFFECT_ID_LUCKY_PUNCH = 63;
const HOLD_EFFECT_ID_STICK = 66;

/**
 * hold_effects.h ids -> engine HOLD_EFFECT_* spellings. This is the shared
 * numeric-id resolver for consumers whose pure helpers retain a string ABI:
 * CalculateBaseDamage's item block and GetWhoStrikesFirst's Macho Brace
 * check. Keep each source id here rather than creating consumer-local tables.
 */
export const HOLD_EFFECT_NAME_BY_ID: Readonly<Record<number, string>> = Object.freeze({
  24: "HOLD_EFFECT_MACHO_BRACE",
  26: "HOLD_EFFECT_QUICK_CLAW",
  29: "HOLD_EFFECT_CHOICE_BAND",
  31: "HOLD_EFFECT_BUG_POWER",
  34: "HOLD_EFFECT_SOUL_DEW",
  35: "HOLD_EFFECT_DEEP_SEA_TOOTH",
  36: "HOLD_EFFECT_DEEP_SEA_SCALE",
  42: "HOLD_EFFECT_STEEL_POWER",
  45: "HOLD_EFFECT_LIGHT_BALL",
  46: "HOLD_EFFECT_GROUND_POWER",
  47: "HOLD_EFFECT_ROCK_POWER",
  48: "HOLD_EFFECT_GRASS_POWER",
  49: "HOLD_EFFECT_DARK_POWER",
  50: "HOLD_EFFECT_FIGHTING_POWER",
  51: "HOLD_EFFECT_ELECTRIC_POWER",
  52: "HOLD_EFFECT_WATER_POWER",
  53: "HOLD_EFFECT_FLYING_POWER",
  54: "HOLD_EFFECT_POISON_POWER",
  55: "HOLD_EFFECT_ICE_POWER",
  56: "HOLD_EFFECT_GHOST_POWER",
  57: "HOLD_EFFECT_PSYCHIC_POWER",
  58: "HOLD_EFFECT_FIRE_POWER",
  59: "HOLD_EFFECT_DRAGON_POWER",
  60: "HOLD_EFFECT_NORMAL_POWER",
  64: "HOLD_EFFECT_METAL_POWDER",
  65: "HOLD_EFFECT_THICK_CLUB",
});

/** STATUS3_CHARGED_UP (include/constants/battle.h:166) - Charge's next-hit Electric ×2. */
const STATUS3_CHARGED_UP = 1 << 9;
/** STATUS1_BURN (include/constants/battle.h:118). */
const STATUS1_BURN = 1 << 4;
/** STATUS1_TOXIC_POISON (include/constants/battle.h:121). */
const STATUS1_TOXIC_POISON = 1 << 7;

const B_MSG_MISSED = 0;
const B_MSG_PROTECTED = 1;
const B_MSG_AVOIDED_ATK = 2;
const B_MSG_AVOIDED_DMG = 3;
const B_MSG_GROUND_MISS = 4;
const MISS_STRING_ID_BY_TYPE: readonly string[] = [
  "STRINGID_ATTACKMISSED",
  "STRINGID_PKMNPROTECTEDITSELF",
  "STRINGID_PKMNAVOIDEDATTACK",
  "STRINGID_AVOIDEDDAMAGE",
  "STRINGID_PKMNMAKESGROUNDMISS",
];

/** include/constants/battle.h:220-227, the u8 gMoveResultFlags bits resultmessage/effectivenesssound switch on. */
const MOVE_RESULT_SUPER_EFFECTIVE = 1 << 1;
const MOVE_RESULT_NOT_VERY_EFFECTIVE = 1 << 2;
const MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;
const MOVE_RESULT_ONE_HIT_KO = 1 << 4;
const MOVE_RESULT_FOE_ENDURED = 1 << 6;
const MOVE_RESULT_FOE_HUNG_ON = 1 << 7;

/** include/constants/battle.h: hitMarker bits datahpupdate/hitanimation/healthbarupdate read. */
const HITMARKER_IGNORE_BIDE = 1 << 5;
const HITMARKER_IGNORE_SUBSTITUTE = 1 << 8;
const HITMARKER_PASSIVE_HP_UPDATE = 1 << 20;
/** include/constants/battle.h:183,199,201 -- tryfaintmon's own hitMarker bits. */
const HITMARKER_DESTINYBOND = 1 << 6;
const HITMARKER_PLAYER_FAINTED = 1 << 22;
const HITMARKER_GRUDGE = 1 << 24;
/** include/constants/battle.h:171 -- Grudge's status3 bit, read by tryfaintmon directly off gBattlerTarget. */
const STATUS3_GRUDGE = 1 << 14;
/** include/abilities.h:36. */
const ABILITY_SERENE_GRACE = 32;
/** include/constants/battle.h:310 -- seteffectwithchance's own MOVE_EFFECT_BYTE bit. */
const MOVE_EFFECT_CERTAIN = 1 << 7;
/** include/constants/battle.h:309 -- SetMoveEffect's self-vs-target selector bit. */
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;
/** include/constants/battle.h:247-252 -- the family-A (status1-write) MOVE_EFFECT_* values. */
const MOVE_EFFECT_SLEEP = 1;
const MOVE_EFFECT_POISON = 2;
const MOVE_EFFECT_BURN = 3;
const MOVE_EFFECT_FREEZE = 4;
const MOVE_EFFECT_PARALYSIS = 5;
const MOVE_EFFECT_TOXIC = 6;
/** include/constants/battle.h:253 -- MOVE_EFFECT_TOXIC; every family-A byte is <= this. */
const PRIMARY_STATUS_MOVE_EFFECT = MOVE_EFFECT_TOXIC;
/** include/constants/battle.h:254-255 -- the first two family-B (status2/misc) MOVE_EFFECT_* values. */
const MOVE_EFFECT_CONFUSION = 7;
const MOVE_EFFECT_FLINCH = 8;
const MOVE_EFFECT_TRI_ATTACK = 9;
/** include/constants/battle.h:256 -- Uproar's user-owned lock/timer effect. */
const MOVE_EFFECT_UPROAR = 10;
const MOVE_EFFECT_PAYDAY = 11;
/** include/constants/battle.h:259 -- SetMoveEffect's two-turn-charge case (docs/semi-invulnerable-registration-scout.md §5 rung 2). */
const MOVE_EFFECT_CHARGING = 12;
/** include/constants/battle.h:260 -- SetMoveEffect's Wrap-family case (docs/ingrain-leechseed-wrap-ground-truth.md §1c/§5 slice 2). */
const MOVE_EFFECT_WRAP = 13;
/** include/constants/battle.h:261 -- shared 25%-of-damage recoil used by Struggle and ordinary recoil moves. */
const MOVE_EFFECT_RECOIL_25 = 14;
const MOVE_EFFECT_RECHARGE = 29;
const MOVE_EFFECT_RAGE = 30;
const MOVE_EFFECT_STEAL_ITEM = 31;
const MOVE_EFFECT_PREVENT_ESCAPE = 32;
const MOVE_EFFECT_NIGHTMARE = 33;
const MOVE_EFFECT_ALL_STATS_UP = 34;
const MOVE_EFFECT_RAPIDSPIN = 35;
const MOVE_EFFECT_REMOVE_PARALYSIS = 36;
const MOVE_EFFECT_ATK_DEF_DOWN = 37;
/** include/constants/battle.h:291 -- Double-Edge's one-third damage-derived recoil. */
const MOVE_EFFECT_RECOIL_33 = 38;
const MOVE_EFFECT_KNOCK_OFF = 54;
/** include/constants/battle.h:300 -- SetMoveEffect's Thrash-family lock-in case (docs/yawn-thrash-endturn-design.md §3, Rung 4). */
const MOVE_EFFECT_THRASH = 53;
const MOVE_EFFECT_SP_ATK_TWO_DOWN = 59;
/** include/constants/battle.h:147. */
const STATUS2_RAGE = 1 << 23;
/**
 * `gTrappingMoves` (`battle_message.c:1256-1264`) -- the fixed 6-move family
 * MOVE_EFFECT_WRAP's own duration/message dispatch indexes by, in this exact
 * order (`include/constants/moves.h`).
 */
const TRAPPING_MOVES: readonly number[] = [20, 35, 83, 128, 250, 328]; // BIND, WRAP, FIRE_SPIN, CLAMP, WHIRLPOOL, SAND_TOMB
/** include/constants/battle.h:117,119,120 -- STATUS1_BURN is already declared above. */
const STATUS1_POISON = 1 << 3;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
/** include/abilities.h. */
const ABILITY_CLOUD_NINE = 13;
const ABILITY_INSOMNIA = 15;
const ABILITY_LIMBER = 7;
const ABILITY_IMMUNITY = 17;
const ABILITY_SHIELD_DUST = 19;
const ABILITY_OWN_TEMPO = 20;
const ABILITY_MAGMA_ARMOR = 40;
const ABILITY_WATER_VEIL = 41;
const ABILITY_INNER_FOCUS = 39;
const ABILITY_SOUNDPROOF = 43;
const ABILITY_AIR_LOCK = 77;
const ABILITY_VITAL_SPIRIT = 72;
/** include/constants/battle.h:190 -- SetMoveEffect's ability-vs-move message discriminant. */
const HITMARKER_STATUS_ABILITY_EFFECT = 1 << 13;
/** include/constants/battle.h:191 -- SetMoveEffect's Synchronize handoff marker. */
const HITMARKER_SYNCHRONIZE_EFFECT = 1 << 14;
/** include/constants/battle.h:214. */
const SIDE_STATUS_SAFEGUARD = 1 << 5;
/** include/constants/battle.h:239-241. */
const B_WEATHER_SUN = (1 << 5) | (1 << 6);
/** battle_message.c:573-579 -- gGotXStringIds' MULTISTRING_CHOOSER indices. */
const B_MSG_STATUSED = 0;
const B_MSG_STATUSED_BY_ABILITY = 1;
/** battle_message.c:576-579 -- g{PSN,BRN,PRLZ}PreventionStringIds' MULTISTRING_CHOOSER indices. */
const B_MSG_ABILITY_PREVENTS_MOVE_STATUS = 0;
const B_MSG_ABILITY_PREVENTS_ABILITY_STATUS = 1;
const B_MSG_STATUS_HAD_NO_EFFECT = 2;

/** printfromtable's registered small constant tables, each indexed by MULTISTRING_CHOOSER. */
const PRINTFROMTABLE_TABLES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  /** battle_message.c:1060-1065 -- Transform success/failure selectors. */
  gTransformUsedStringIds: Object.freeze([
    "STRINGID_PKMNTRANSFORMEDINTO",
    "STRINGID_BUTITFAILED",
  ]),
  /** battle_message.c:1126-1131 -- Mud Sport / Water Sport. */
  gSportsUsedStringIds: Object.freeze([
    "STRINGID_ELECTRICITYWEAKENED",
    "STRINGID_FIREWEAKENED",
  ]),
  /** battle_message.c:981-986. */
  gStockpileUsedStringIds: Object.freeze([
    "STRINGID_PKMNSTOCKPILED",
    "STRINGID_PKMNCANTSTOCKPILE",
  ]),
  /** battle_message.c:987-991 -- ordinary expiry / Uproar wake-up. */
  gWokeUpStringIds: Object.freeze([
    "STRINGID_PKMNWOKEUP",
    "STRINGID_PKMNWOKEUPINUPROAR",
  ]),
  /** battle_message.c:991-996. */
  gSwallowFailStringIds: Object.freeze([
    "STRINGID_FAILEDTOSWALLOW",
    "STRINGID_PKMNHPFULL",
  ]),
  /** battle_message.c:1084-1088 -- sleep's ordinary/ability-caused selectors. */
  gFellAsleepStringIds: Object.freeze([
    "STRINGID_PKMNFELLASLEEP",
    "STRINGID_PKMNMADESLEEP",
  ]),
  /** battle_message.c:1132-1139 -- Heal Bell's four Soundproof selectors plus Aromatherapy. */
  gPartyStatusHealStringIds: Object.freeze([
    "STRINGID_BELLCHIMED",
    "STRINGID_BELLCHIMED",
    "STRINGID_BELLCHIMED",
    "STRINGID_BELLCHIMED",
    "STRINGID_SOOTHINGAROMA",
  ]),
  /** battle_message.c:1235-1240 -- Trick's taken/given/both item-result table. */
  gItemSwapStringIds: Object.freeze([
    "STRINGID_PKMNOBTAINEDX",
    "STRINGID_PKMNOBTAINEDX2",
    "STRINGID_PKMNOBTAINEDXYOBTAINEDZ",
  ]),
  gFocusEnergyUsedStringIds: Object.freeze([
    "STRINGID_PKMNGETTINGPUMPED",
    "STRINGID_BUTITFAILED",
  ]),
  gFutureMoveUsedStringIds: Object.freeze([
    "STRINGID_PKMNFORESAWATTACK",
    "STRINGID_PKMNCHOSEXASDESTINY",
  ]),
  gSubstituteUsedStringIds: Object.freeze([
    "STRINGID_PKMNMADESUBSTITUTE",
    "STRINGID_TOOWEAKFORSUBSTITUTE",
  ]),
  gGotPoisonedStringIds: Object.freeze(["STRINGID_PKMNWASPOISONED", "STRINGID_PKMNPOISONEDBY"]),
  gGotBurnedStringIds: Object.freeze(["STRINGID_PKMNWASBURNED", "STRINGID_PKMNBURNEDBY"]),
  gGotFrozenStringIds: Object.freeze(["STRINGID_PKMNWASFROZEN", "STRINGID_PKMNFROZENBY"]),
  gGotParalyzedStringIds: Object.freeze(["STRINGID_PKMNWASPARALYZED", "STRINGID_PKMNWASPARALYZEDBY"]),
  gPSNPreventionStringIds: Object.freeze([
    "STRINGID_PKMNPREVENTSPOISONINGWITH",
    "STRINGID_PKMNSXPREVENTSYSZ",
    "STRINGID_PKMNSXHADNOEFFECTONY",
  ]),
  gBRNPreventionStringIds: Object.freeze([
    "STRINGID_PKMNSXPREVENTSBURNS",
    "STRINGID_PKMNSXPREVENTSYSZ",
    "STRINGID_PKMNSXHADNOEFFECTONY",
  ]),
  gPRLZPreventionStringIds: Object.freeze([
    "STRINGID_PKMNPREVENTSPARALYSISWITH",
    "STRINGID_PKMNSXPREVENTSYSZ",
    "STRINGID_PKMNSXHADNOEFFECTONY",
  ]),
  /**
   * battle_message.c:1006-1015. Index 4 (`B_MSG_STAT_ROSE_ITEM`) is driven by
   * `BattleScript_BerryStatRaiseDoStatUp` (docs/endturn-abilities-items-
   * ground-truth.md §5 slice 5, Liechi/Salac/Petaya); index 3
   * (`B_MSG_STAT_ROSE_EMPTY`, the multi-stat caller) stays unexercised.
   */
  gStatUpStringIds: Object.freeze([
    "STRINGID_ATTACKERSSTATROSE",
    "STRINGID_DEFENDERSSTATROSE",
    "STRINGID_STATSWONTINCREASE",
    "STRINGID_EMPTYSTRING3",
    "STRINGID_USINGITEMSTATOFPKMNROSE",
  ]),
  /** battle_message.c:1016-1022. */
  gStatDownStringIds: Object.freeze([
    "STRINGID_ATTACKERSSTATFELL",
    "STRINGID_DEFENDERSSTATFELL",
    "STRINGID_STATSWONTDECREASE",
    "STRINGID_EMPTYSTRING3",
  ]),
  /** battle_message.c:999-1004 -- BattleScript_CantMakeAsleep's own table (Cmd_jumpifcantmakeasleep, docs/status-cluster-ground-truth.md). */
  gUproarAwakeStringIds: Object.freeze([
    "STRINGID_PKMNCANTSLEEPINUPROAR2",
    "STRINGID_UPROARKEPTPKMNAWAKE",
    "STRINGID_PKMNSTAYEDAWAKEUSING",
  ]),
  /** battle_message.c:975-979 -- ENDTURN_UPROAR continuation/expiry. */
  gUproarOverTurnStringIds: Object.freeze([
    "STRINGID_PKMNMAKINGUPROAR",
    "STRINGID_PKMNCALMEDDOWN",
  ]),
  /** battle_message.c:1208-1212 -- BattleScript_BerryCureChosenStatusRet's own table, shared by HOLD_EFFECT_CURE_STATUS (Lum) and HOLD_EFFECT_CURE_ATTRACT (Mental Herb) (docs/endturn-abilities-items-ground-truth.md §1c). */
  gBerryEffectStringIds: Object.freeze([
    "STRINGID_PKMNSITEMCUREDPROBLEM",
    "STRINGID_PKMNSITEMNORMALIZEDSTATUS",
  ]),
  /** battle_message.c:908-911 -- gMoveWeatherChangeStringIds, the setter move's own tail (BattleScript_MoveWeatherChange). B_MSG_STARTED_DOWNPOUR (index 1) is unused source-wide. */
  gMoveWeatherChangeStringIds: Object.freeze([
    "STRINGID_STARTEDTORAIN",
    "STRINGID_DOWNPOURSTARTED",
    "STRINGID_BUTITFAILED",
    "STRINGID_SANDSTORMBREWED",
    "STRINGID_SUNLIGHTGOTBRIGHT",
    "STRINGID_STARTEDHAIL",
  ]),
  /** battle_message.c:936-941 -- B_MSG_RAIN_CONTINUES(0)/DOWNPOUR_CONTINUES(1, unused)/RAIN_STOPPED(2). */
  gRainContinuesStringIds: Object.freeze(["STRINGID_RAINCONTINUES", "STRINGID_DOWNPOURCONTINUES", "STRINGID_RAINSTOPPED"]),
  /** battle_message.c:918-922 -- B_MSG_SANDSTORM(0)/B_MSG_HAIL(1). */
  gSandStormHailContinuesStringIds: Object.freeze(["STRINGID_SANDSTORMRAGES", "STRINGID_HAILCONTINUES"]),
  gSandStormHailDmgStringIds: Object.freeze(["STRINGID_PKMNBUFFETEDBYSANDSTORM", "STRINGID_PKMNPELTEDBYHAIL"]),
  gSandStormHailEndStringIds: Object.freeze(["STRINGID_SANDSTORMSUBSIDED", "STRINGID_HAILSTOPPED"]),
  /** battle_message.c:945-951 -- B_MSG_SIDE_STATUS_FAILED(0)/SET_REFLECT_SINGLE(1)/DOUBLE(2)/SET_LIGHTSCREEN_SINGLE(3)/DOUBLE(4)/SET_SAFEGUARD(5). */
  gReflectLightScreenSafeguardStringIds: Object.freeze([
    "STRINGID_BUTITFAILED",
    "STRINGID_PKMNRAISEDDEF",
    "STRINGID_PKMNRAISEDDEFALITTLE",
    "STRINGID_PKMNRAISEDSPDEF",
    "STRINGID_PKMNRAISEDSPDEFALITTLE",
    "STRINGID_PKMNCOVEREDBYVEIL",
  ]),
  /** battle_message.c:1048-1052 -- B_MSG_SET_MIST(0)/MIST_FAILED(1). */
  gMistUsedStringIds: Object.freeze(["STRINGID_PKMNSHROUDEDINMIST", "STRINGID_BUTITFAILED"]),
  /** battle_message.c:960-966 -- B_MSG_LEECH_SEED_SET(0)/MISS(1)/FAIL(2)/DRAIN(3)/OOZE(4). */
  gLeechSeedStringIds: Object.freeze([
    "STRINGID_PKMNSEEDED",
    "STRINGID_PKMNEVADEDATTACK",
    "STRINGID_ITDOESNTAFFECT",
    "STRINGID_PKMNSAPPEDBYLEECHSEED",
    "STRINGID_ITSUCKEDLIQUIDOOZE",
  ]),
  /** battle_message.c:943-947 -- BattleScript_EffectProtect/_EffectEndure's own table (Cmd_setprotectlike, battleScriptProtectlikeOpcode.ts), B_MSG_PROTECTED_ITSELF(0)/BRACED_ITSELF(1)/PROTECT_FAILED(2). */
  gProtectLikeUsedStringIds: Object.freeze([
    "STRINGID_PKMNPROTECTEDITSELF2",
    "STRINGID_PKMNBRACEDITSELF",
    "STRINGID_BUTITFAILED",
  ]),
  /** battle_message.c:1120-1124 -- BattleScript_EffectAbsorb's own table, B_MSG_ABSORB(0)/ABSORB_OOZE(1). */
  gAbsorbDrainStringIds: Object.freeze(["STRINGID_PKMNENERGYDRAINED", "STRINGID_ITSUCKEDLIQUIDOOZE"]),
  /** battle_message.c:1242-1246 -- first Flash Fire activation (0) vs an already-active boost (1). */
  gFlashFireStringIds: Object.freeze([
    "STRINGID_PKMNRAISEDFIREPOWERWITH",
    "STRINGID_PKMNSXMADEYINEFFECTIVE",
  ]),
  /** battle_message.c:969-973 -- BattleScript_EffectRest's own table (Cmd_trysetrest, battleScriptTrysetrestOpcode.ts), B_MSG_REST(0)/REST_STATUSED(1). */
  gRestUsedStringIds: Object.freeze(["STRINGID_PKMNWENTTOSLEEP", "STRINGID_PKMNSLEPTHEALTHY"]),
  /** battle_message.c:1038-1045 -- indexed by the move's own position in gTrappingMoves, not MULTISTRING_CHOOSER's usual small enum. */
  gWrappedStringIds: Object.freeze([
    "STRINGID_PKMNSQUEEZEDBYBIND",
    "STRINGID_PKMNWRAPPEDBY",
    "STRINGID_PKMNTRAPPEDINVORTEX",
    "STRINGID_PKMNCLAMPED",
    "STRINGID_PKMNTRAPPEDINVORTEX",
    "STRINGID_PKMNTRAPPEDBYSANDTOMB",
  ]),
  /** battle_message.c:1108-1111 -- BattleScript_KOFail's own table (Cmd_tryKO, battleScriptTryKOOpcode.ts), B_MSG_KO_MISS(0)/KO_UNAFFECTED(1). */
  gKOFailedStringIds: Object.freeze(["STRINGID_ATTACKMISSED", "STRINGID_PKMNUNAFFECTED"]),
  /**
   * battle_message.c:1025-1035 -- `BattleScriptFirstChargingTurn`'s own
   * `printfromtable gFirstTurnOfTwoStringIds`, indexed by `sTWOTURN_STRINGID`
   * (semi-invulnerable registration rung 4, docs/semi-invulnerable-
   * registration-scout.md §1b/§5 rung 4). Shared by all five two-turn-charge
   * effects' turn-1 message. B_MSG_TURN1_RAZOR_WIND(0)/SOLAR_BEAM(1)/
   * SKULL_BASH(2)/SKY_ATTACK(3)/FLY(4)/DIG(5)/DIVE(6)/BOUNCE(7).
   */
  gFirstTurnOfTwoStringIds: Object.freeze([
    "STRINGID_PKMNWHIPPEDWHIRLWIND",
    "STRINGID_PKMNTOOKSUNLIGHT",
    "STRINGID_PKMNLOWEREDHEAD",
    "STRINGID_PKMNISGLOWING",
    "STRINGID_PKMNFLEWHIGH",
    "STRINGID_PKMNDUGHOLE",
    "STRINGID_PKMNHIDUNDERWATER",
    "STRINGID_PKMNSPRANGUP",
  ]),
  /** battle_message.c:1102-1106 -- B_MSG_DEFROSTED(0)/DEFROSTED_BY_MOVE(1), BattleScript_MoveUsedUnfroze (frozen mon thawed by a fire move). */
  gGotDefrostedStringIds: Object.freeze([
    "STRINGID_PKMNWASDEFROSTED2",
    "STRINGID_PKMNWASDEFROSTEDBY",
  ]),
  /**
   * battle_message.c:1176-1183 -- BattleScript_MoveUsedLoafingAroundMsg's own
   * table (Truant loafing) plus the traded-mon disobedience rows:
   * B_MSG_LOAFING(0)/WONT_OBEY(1)/TURNED_AWAY(2)/PRETEND_NOT_NOTICE(3)/
   * INCAPABLE_OF_POWER(4). Rows 1-4 need a disobedient traded mon, which
   * Frontier rental teams never contain (no traded-mon disobedience), so only
   * row 0 is reachable in Factory singles; all five are transcribed anyway
   * because the table is the ROM's data and truncating it would reintroduce an
   * index bug.
   */
  gInobedientStringIds: Object.freeze([
    "STRINGID_PKMNLOAFING",
    "STRINGID_PKMNWONTOBEY",
    "STRINGID_PKMNTURNEDAWAY",
    "STRINGID_PKMNPRETENDNOTNOTICE",
    "STRINGID_PKMNINCAPABLEOFPOWER",
  ]),
});

const MOVE_EFFECT_LABEL_BY_BYTE: Readonly<Record<number, string>> = Object.freeze({
  /** sMoveEffectBS_Ptrs[MOVE_EFFECT_SLEEP] (:628) -- reached only via Cmd_seteffectprimary's own status1-write tail below, never the generic STATUS1_BIT_BY_MOVE_EFFECT_BYTE path (sleep's status1 write is a drawn turn count, not a fixed bit). */
  [MOVE_EFFECT_SLEEP]: "BattleScript_MoveEffectSleep",
  [MOVE_EFFECT_POISON]: "BattleScript_MoveEffectPoison",
  [MOVE_EFFECT_BURN]: "BattleScript_MoveEffectBurn",
  [MOVE_EFFECT_FREEZE]: "BattleScript_MoveEffectFreeze",
  [MOVE_EFFECT_PARALYSIS]: "BattleScript_MoveEffectParalysis",
  [MOVE_EFFECT_TOXIC]: "BattleScript_MoveEffectToxic",
});

const STATUS1_BIT_BY_MOVE_EFFECT_BYTE: Readonly<Record<number, number>> = Object.freeze({
  [MOVE_EFFECT_POISON]: STATUS1_POISON,
  [MOVE_EFFECT_BURN]: STATUS1_BURN,
  [MOVE_EFFECT_FREEZE]: STATUS1_FREEZE,
  [MOVE_EFFECT_PARALYSIS]: STATUS1_PARALYSIS,
  [MOVE_EFFECT_TOXIC]: STATUS1_TOXIC_POISON,
});

/**
 * include/constants/battle.h:262-275,286-299 -- the 12 real (+-1) ids plus
 * the 12 (+-2) ids no move in battle_moves.h actually uses (topology-join
 * confirmed by docs/stat-change-confusion-ground-truth.md S1.3); ported
 * anyway since ChangeStatBuffs' own guard ladder is magnitude-generic and
 * the source itself defines all 24 SetMoveEffect cases uniformly.
 */
type StatMoveEffectEntry = Readonly<{
  statId: number;
  direction: "increase" | "decrease";
  magnitude: 1 | 2;
}>;
const STAT_MOVE_EFFECT_TABLE: Readonly<Record<number, StatMoveEffectEntry>> = Object.freeze({
  15: Object.freeze({ statId: STAT_ATK, direction: "increase", magnitude: 1 }),
  16: Object.freeze({ statId: STAT_DEF, direction: "increase", magnitude: 1 }),
  17: Object.freeze({ statId: STAT_SPEED, direction: "increase", magnitude: 1 }),
  18: Object.freeze({ statId: STAT_SPATK, direction: "increase", magnitude: 1 }),
  19: Object.freeze({ statId: STAT_SPDEF, direction: "increase", magnitude: 1 }),
  20: Object.freeze({ statId: STAT_ACC, direction: "increase", magnitude: 1 }),
  21: Object.freeze({ statId: STAT_EVASION, direction: "increase", magnitude: 1 }),
  22: Object.freeze({ statId: STAT_ATK, direction: "decrease", magnitude: 1 }),
  23: Object.freeze({ statId: STAT_DEF, direction: "decrease", magnitude: 1 }),
  24: Object.freeze({ statId: STAT_SPEED, direction: "decrease", magnitude: 1 }),
  25: Object.freeze({ statId: STAT_SPATK, direction: "decrease", magnitude: 1 }),
  26: Object.freeze({ statId: STAT_SPDEF, direction: "decrease", magnitude: 1 }),
  27: Object.freeze({ statId: STAT_ACC, direction: "decrease", magnitude: 1 }),
  28: Object.freeze({ statId: STAT_EVASION, direction: "decrease", magnitude: 1 }),
  39: Object.freeze({ statId: STAT_ATK, direction: "increase", magnitude: 2 }),
  40: Object.freeze({ statId: STAT_DEF, direction: "increase", magnitude: 2 }),
  41: Object.freeze({ statId: STAT_SPEED, direction: "increase", magnitude: 2 }),
  42: Object.freeze({ statId: STAT_SPATK, direction: "increase", magnitude: 2 }),
  43: Object.freeze({ statId: STAT_SPDEF, direction: "increase", magnitude: 2 }),
  44: Object.freeze({ statId: STAT_ACC, direction: "increase", magnitude: 2 }),
  45: Object.freeze({ statId: STAT_EVASION, direction: "increase", magnitude: 2 }),
  46: Object.freeze({ statId: STAT_ATK, direction: "decrease", magnitude: 2 }),
  47: Object.freeze({ statId: STAT_DEF, direction: "decrease", magnitude: 2 }),
  48: Object.freeze({ statId: STAT_SPEED, direction: "decrease", magnitude: 2 }),
  49: Object.freeze({ statId: STAT_SPATK, direction: "decrease", magnitude: 2 }),
  50: Object.freeze({ statId: STAT_SPDEF, direction: "decrease", magnitude: 2 }),
  51: Object.freeze({ statId: STAT_ACC, direction: "decrease", magnitude: 2 }),
  52: Object.freeze({ statId: STAT_EVASION, direction: "decrease", magnitude: 2 }),
});

/**
 * The exact MOVE_EFFECT_BYTE values applySetMoveEffect (below) dispatches to
 * completion today -- everything else still falls into unsupportedBranch.
 * Single source of truth for "genuinely executable via either
 * Cmd_seteffectwithchance or Cmd_seteffectprimary" (both call this same
 * function; SLEEP/MOVE_EFFECT_TOXIC's own real switch cases were registered
 * by docs/status-cluster-ground-truth.md but this exported list was never
 * updated to match until the census's SETEFFECTPRIMARY-dispatch fix
 * (ISSUES #45) exposed the gap), read live by
 * tools/report/executable-frontier-census.ts so its SETMOVEEFFECT_SUPPORTED
 * set can't drift from this dispatch again the way it did before the
 * STAT_MOVE_EFFECT_TABLE family was ever wired into the census (ISSUES #44).
 */
export const SET_MOVE_EFFECT_SUPPORTED_BYTES: ReadonlySet<number> = new Set<number>([
  0,
  MOVE_EFFECT_SLEEP,
  MOVE_EFFECT_POISON,
  MOVE_EFFECT_BURN,
  MOVE_EFFECT_FREEZE,
  MOVE_EFFECT_PARALYSIS,
  MOVE_EFFECT_TOXIC,
  MOVE_EFFECT_CONFUSION,
  MOVE_EFFECT_FLINCH,
  MOVE_EFFECT_TRI_ATTACK,
  MOVE_EFFECT_UPROAR,
  MOVE_EFFECT_PAYDAY,
  MOVE_EFFECT_STEAL_ITEM,
  MOVE_EFFECT_CHARGING,
  MOVE_EFFECT_WRAP,
  MOVE_EFFECT_RECOIL_25,
  MOVE_EFFECT_RECHARGE,
  MOVE_EFFECT_RAGE,
  MOVE_EFFECT_PREVENT_ESCAPE,
  MOVE_EFFECT_NIGHTMARE,
  MOVE_EFFECT_ALL_STATS_UP,
  MOVE_EFFECT_RAPIDSPIN,
  MOVE_EFFECT_REMOVE_PARALYSIS,
  MOVE_EFFECT_ATK_DEF_DOWN,
  MOVE_EFFECT_RECOIL_33,
  MOVE_EFFECT_KNOCK_OFF,
  MOVE_EFFECT_THRASH,
  MOVE_EFFECT_SP_ATK_TWO_DOWN,
  ...Object.keys(STAT_MOVE_EFFECT_TABLE).map(Number),
]);

/** include/battle.h:52-53, the doubles-only spread-move target bits attackanimation's early-return checks. */
const MOVE_TARGET_DEPENDS = 1 << 0;
const MOVE_TARGET_FOES_AND_ALLY = 1 << 5;

/** include/constants/songs.h:18-20. */
const SE_NOT_EFFECTIVE = 12;
const SE_EFFECTIVE = 13;
const SE_SUPER_EFFECTIVE = 14;

function stringOperand(expression: string, sourceMacroLine: number): BattleScriptOperand {
  return Object.freeze({
    widthBytes: 2,
    expression,
    sourceMacro: expression,
    sourceMacroLine,
    wrapperPath: Object.freeze([]),
  });
}

const HOLD_EFFECT_EVASION_UP_ID = 22;

const TYPE_EFFECTIVENESS = (typeEffectivenessData.typeEffectiveness as readonly TypeEffectivenessEntry[]);

export function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceFile: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "unsupported-branch",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        sourceConstruct,
        sourceFile,
        sourceLine,
      }),
    }),
  );
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

function blockOnUnavailableMessage(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  operandExpression: string,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "source-context-unavailable",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
    port: "prepare-message",
    operandExpression,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
}

/**
 * GetBattlerForBattleScript's BS_TARGET/BS_ATTACKER cases plus BS_FAINTED,
 * which the shared Spikes-on-switch script passes to healthbarupdate and
 * datahpupdate. Other selector cases remain outside this shared hit/HP seam.
 */
function resolveHitChainBattlerOperand(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
): BattleScriptBattlerId | "unsupported" {
  const expression = context.instruction.operands[0]?.expression;
  if (expression === "BS_TARGET") return requireBattlerRole(rulesContext, "target");
  if (expression === "BS_ATTACKER") return requireBattlerRole(rulesContext, "attacker");
  if (expression === "BS_FAINTED") {
    const fainted = rulesContext.selectorRoles.fainted;
    if (fainted === null) throw new Error("Battle Script HP command requires a fainted role");
    return fainted;
  }
  return "unsupported";
}

export function requireBattlerRole(
  rulesContext: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const value = rulesContext.selectorRoles[role];
  if (value === null) throw new Error(`Battle Script hit-chain command requires a ${role} role`);
  return value;
}

export function withBattler(
  rulesContext: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
  changes: Partial<BattleScriptRulesBattlerState>,
): BattleScriptRulesContext {
  const battlers = rulesContext.battlers.map((candidate, index) =>
    index === battler ? Object.freeze({ ...candidate, ...changes }) : candidate
  ) as unknown as BattleScriptRulesBattlers;
  return Object.freeze({ ...rulesContext, battlers: Object.freeze(battlers) });
}

export function withClearedLandedMove(
  moveHistory: BattleScriptMoveHistory,
  target: BattleScriptBattlerId,
): BattleScriptMoveHistory {
  const clearAt = (halfwords: BattleScriptMoveEndHalfwords) =>
    Object.freeze(halfwords.map((value, index) => (index === target ? 0 : value))) as unknown as
      BattleScriptMoveEndHalfwords;
  return Object.freeze({
    ...moveHistory,
    lastLandedMoves: clearAt(moveHistory.lastLandedMoves),
    lastHitByType: clearAt(moveHistory.lastHitByType),
  });
}

/**
 * Cmd_accuracycheck's DEFENDER_IS_PROTECTED gate (JumpIfMoveAffectedByProtect,
 * battle_script_commands.c:1038-1048), and the identical macro reused by
 * Cmd_attackcanceler's own tail check -- exported so both call sites share
 * one source-faithful predicate.
 */
export function isDefenderProtected(
  targetBattler: BattleScriptRulesBattlerState,
  move: number,
): boolean {
  return targetBattler.protected === 1 && moveHasProtectFlag(move);
}

const MOVE_FLAGS_BY_ID = new Map<number, readonly string[]>(
  (movesData.moves as readonly MoveRow[]).map((row) => [row.id, row.flags]),
);

function moveHasProtectFlag(move: number): boolean {
  return (MOVE_FLAGS_BY_ID.get(move) ?? []).includes("FLAG_PROTECT_AFFECTED");
}

/**
 * JumpIfMoveFailed's two outcomes (battle_script_commands.c:1009-1024),
 * specialized to accuracycheck: this opcode only ever sets MOVE_RESULT_MISSED
 * (part of MOVE_RESULT_NO_EFFECT) before calling it, or leaves flags
 * untouched, so the branch always resolves to exactly one of these two
 * shapes -- never the type-immunity/failed forms other callers can produce.
 */
function jumpToMissTarget(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
  rng: BattleScriptRngState,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const targetLabelOperand = context.instruction.operands[0]!;
  const entry = resolveBattleScriptLabel(context.program, targetLabelOperand.expression);
  if (!entry) {
    throw new Error(`accuracycheck: committed program has no label ${targetLabelOperand.expression}`);
  }
  void attacker;
  const withHistory = Object.freeze({
    ...rulesContext,
    moveHistory: withClearedLandedMove(rulesContext.moveHistory, target),
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "jump", programCounter: entry.programCounter }),
    { rulesContext: withHistory, rng },
  );
}

/**
 * TrySetDestinyBondToHappen (battle_script_commands.c:8285-8294): sets the
 * shared per-action `hitMarker`'s `HITMARKER_DESTINYBOND` bit (consumed later
 * by `Cmd_tryfaintmon`'s avenging-script branch) when the TARGET
 * currently carries `STATUS2_DESTINY_BOND` (from using the move on some
 * earlier turn), the two battlers are on opposite sides, and no Grudge has
 * already consumed this hitmarker slot this action. Exported so both of
 * TrySetDestinyBondToHappen's two real call sites -- `JumpIfMoveFailed`'s
 * "not failed" branch below (every `ACC_CURR_MOVE` accuracycheck site) and
 * the standalone `Cmd_trysetdestinybondtohappen` opcode
 * (`battleScriptTrysetdestinybondtohappenOpcode.ts`, `BattleScript_EffectOHKO`'s
 * own post-tryKO call, needed because OHKO's `NO_ACC_CALC_CHECK_LOCK_ON`
 * accuracycheck bypass never reaches `JumpIfMoveFailed` at all) -- share one
 * provably-identical implementation. Previously this miscomputed the write as
 * the ATTACKER's own `status2 |= STATUS2_DESTINY_BOND` (a different field
 * entirely, and never read by anything -- `Cmd_tryfaintmon` reads
 * `hitMarker`, not any battler's `status2`); harmless today only because
 * `EFFECT_DESTINY_BOND` itself is unregistered, so no committed script could
 * ever make the target's `STATUS2_DESTINY_BOND` true. Fixed here rather than
 * carried forward, since this step needs the exact same computation for real.
 */
export function applyTrySetDestinyBondToHappen(
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
): BattleScriptRulesContext {
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const destinyBond = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_DESTINY_BOND) !== 0
    && attackerBattler.side !== targetBattler.side
    && (rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_GRUDGE) === 0;
  if (!destinyBond) return rulesContext;
  return Object.freeze({ ...rulesContext, hitMarker: (rulesContext.hitMarker | HITMARKER_DESTINYBOND) >>> 0 });
}

/**
 * JumpIfMoveFailed's "not failed" branch: TrySetDestinyBondToHappen (above)
 * plus AbilityBattleEffects (ABILITYEFFECT_ABSORBING, ...), source-complete
 * for its only three cases (battle_util.c:2679-2729). Volt/Water Absorb
 * require a damaging matching-type move, heal one quarter max HP through
 * BattleScript_MoveHPDrain, and take the full-HP useless arm instead when
 * capped. Flash Fire accepts any Fire move while not frozen, sets its
 * persistent resource flag only once, and chooses the boost/no-boost string
 * for BattleScript_FlashFireBoost. Each activation records the exact AI
 * reveal at AbilityBattleEffects' shared tail. Every other ability, a
 * mismatched type, zero-power Volt/Water move, or frozen Flash Fire target
 * falls through with `effect == 0`.
 */
function advancePastAccuracyCheck(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
  rng: BattleScriptRngState,
  move: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  let nextRulesContext = applyTrySetDestinyBondToHappen(rulesContext, attacker, target);
  const attackerBattler = nextRulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveType = resolveMoveTypeName(rulesContext, move);
  const ppWasAlreadyReduced = attackerBattler.notFirstStrike === 1;

  const absorbAbility = (
    targetBattler.ability === ABILITY_VOLT_ABSORB
    && moveType === "TYPE_ELECTRIC"
    && nextRulesContext.currentMovePower !== 0
  )
    || (
      targetBattler.ability === ABILITY_WATER_ABSORB
      && moveType === "TYPE_WATER"
      && nextRulesContext.currentMovePower !== 0
    );
  if (absorbAbility) {
    nextRulesContext = recordBattleScriptAbilityReveal(
      Object.freeze({
        ...nextRulesContext,
        lastUsedAbility: targetBattler.ability === ABILITY_VOLT_ABSORB
          ? ABILITY_VOLT_ABSORB
          : ABILITY_WATER_ABSORB,
        ...(targetBattler.hp === targetBattler.maxHP
          ? {}
          : { battleMoveDamage: -Math.max(1, Math.trunc(targetBattler.maxHP / 4)) }),
      }),
      target,
      targetBattler.ability,
    );
    const label = targetBattler.hp === targetBattler.maxHP
      ? `BattleScript_MonMadeMoveUseless${ppWasAlreadyReduced ? "" : "_PPLoss"}`
      : `BattleScript_MoveHPDrain${ppWasAlreadyReduced ? "" : "_PPLoss"}`;
    const programCounter = resolveRequiredLabelProgramCounter(context.program, label);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter }),
      { rulesContext: nextRulesContext, rng },
    );
  }

  if (
    targetBattler.ability === ABILITY_FLASH_FIRE
    && moveType === "TYPE_FIRE"
    && (targetBattler.status1 & STATUS1_FREEZE) === 0
  ) {
    const alreadyBoosted = targetBattler.flashFireBoosted === 1;
    nextRulesContext = withBattler(
      Object.freeze({
        ...nextRulesContext,
        lastUsedAbility: ABILITY_FLASH_FIRE,
        multistringChooser: alreadyBoosted ? 1 : 0,
      }),
      target,
      { flashFireBoosted: 1 },
    );
    nextRulesContext = recordBattleScriptAbilityReveal(
      nextRulesContext,
      target,
      ABILITY_FLASH_FIRE,
    );
    const label = `BattleScript_FlashFireBoost${ppWasAlreadyReduced ? "" : "_PPLoss"}`;
    const programCounter = resolveRequiredLabelProgramCounter(context.program, label);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter }),
      { rulesContext: nextRulesContext, rng },
    );
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, rng },
  );
}

/** CheckWonderGuardAndLevitate (battle_script_commands.c:1426-1470), miss-only. */
type WonderGuardOutcome = Readonly<{
  lastUsedAbility?: number;
  missType?: number;
  targetNotAffected?: true;
}>;

function checkWonderGuardAndLevitate(
  move: number,
  moveType: string,
  targetBattler: BattleScriptRulesBattlerState,
): WonderGuardOutcome {
  const row = requireMoveRow(move);
  if (move === BATTLE_SCRIPT_MOVE_STRUGGLE || row.power === 0) return Object.freeze({});
  if (targetBattler.ability === ABILITY_LEVITATE && moveType === "TYPE_GROUND") {
    return Object.freeze({ lastUsedAbility: ABILITY_LEVITATE, missType: B_MSG_GROUND_MISS });
  }
  const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
  const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
    ? [targetBattler.types[0]]
    : targetBattler.types;
  let hasSuperEffective = false;
  let hasNotVeryEffective = false;
  for (const defendingType of distinctTypes) {
    if (
      hasForesight
      && defendingType === "TYPE_GHOST"
      && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")
    ) {
      continue;
    }
    const entry = TYPE_EFFECTIVENESS.find(
      (candidate) => candidate.attackingType === moveType && candidate.defendingType === defendingType,
    );
    if (entry?.multiplierTenths === 0) return Object.freeze({ targetNotAffected: true });
    if (entry?.multiplierTenths === 20) hasSuperEffective = true;
    if (entry?.multiplierTenths === 5) hasNotVeryEffective = true;
  }
  if (
    isWonderGuardAbility(targetBattler.ability)
    && (!hasSuperEffective || (hasSuperEffective && hasNotVeryEffective))
  ) {
    return Object.freeze({
      lastUsedAbility: ABILITY_WONDER_GUARD,
      missType: B_MSG_AVOIDED_DMG,
    });
  }
  return Object.freeze({});
}

function isWonderGuardAbility(ability: number): boolean {
  return ability === ABILITY_WONDER_GUARD;
}

/**
 * Cmd_accuracycheck's `NO_ACC_CALC`/`NO_ACC_CALC_CHECK_LOCK_ON` bypass branch
 * (`battle_script_commands.c:1103-1113`), narrowed to the
 * `NO_ACC_CALC_CHECK_LOCK_ON` literal -- `BattleScript_EffectYawn`'s own
 * accuracycheck (docs/yawn-thrash-endturn-design.md, Rung 1: the design
 * doc's own §0 opcode census marked this opcode ID "[registered]" without
 * catching that this specific operand form was still unhandled -- verified
 * against source this session, not assumed). Computes NO accuracy roll at
 * all: either an identity-qualified sure-hit (Lock-On/Mind-Reader), a
 * semi-invulnerable miss
 * (a bare jump to the fail label -- source's own `JumpIfMoveAffectedByProtect`
 * is never reached down this sub-branch, so no `MOVE_RESULT_MISSED` flag or
 * `missType` is set here, unlike the Protect-gate branch below), or
 * `JumpIfMoveAffectedByProtect(0)`'s own Protect gate. That gate's
 * `DEFENDER_IS_PROTECTED` macro reads `gCurrentMove` (the real move) for its
 * flag check regardless of the literal `0` argument -- the `0` only ever
 * feeds `JumpIfMoveFailed`'s `else`-branch `AbilityBattleEffects`/Destiny
 * Bond tail, which is unreachable whenever Protect was the reason for
 * jumping in the first place (the `if` branch taken instead).
 */
function accuracycheckNoAccCalc(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  checksLockOn: boolean,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const targetBattler = rulesContext.battlers[target];

  if (
    checksLockOn
    && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) !== 0
    && targetBattler.battlerWithSureHit === attacker
  ) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }

  const semiInvulnerableMask = (
    BATTLE_SCRIPT_STATUS3_ON_AIR | BATTLE_SCRIPT_STATUS3_UNDERGROUND | BATTLE_SCRIPT_STATUS3_UNDERWATER
  ) >>> 0;
  if ((targetBattler.status3 & semiInvulnerableMask) !== 0) {
    const failOperand = context.instruction.operands[0]!;
    const entry = resolveBattleScriptLabel(context.program, failOperand.expression);
    if (!entry) throw new Error(`accuracycheck: committed program has no label ${failOperand.expression}`);
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: entry.programCounter }));
  }

  if (isDefenderProtected(targetBattler, rulesContext.currentMove)) {
    const withFlags = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
      missType: B_MSG_PROTECTED,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }

  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
}

/**
 * Cmd_accuracycheck (battle_script_commands.c:1099-1189). Two argument forms
 * are source-complete: `ACC_CURR_MOVE` (`BattleScript_EffectHit` and 53 of
 * the program's other accuracycheck sites), the two explicit delayed-attack
 * literals (`MOVE_FUTURE_SIGHT`/`MOVE_DOOM_DESIRE`), and
 * `NO_ACC_CALC_CHECK_LOCK_ON` (`accuracycheckNoAccCalc` above,
 * `BattleScript_EffectYawn`'s own site -- 1 of 8 sites using this literal,
 * the rest still barriered behind their own separate unregistered opcodes),
 * and Mean Look's sole bare `NO_ACC_CALC`. The bare form shares the no-roll
 * semi-invulnerability/Protect path but source-skips the Lock-On identity
 * comparison.
 */
export const accuracycheckOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const moveOperand = context.instruction.operands[1];
  if (
    moveOperand?.expression === "NO_ACC_CALC_CHECK_LOCK_ON"
    || moveOperand?.expression === "NO_ACC_CALC"
  ) {
    return accuracycheckNoAccCalc(
      context,
      moveOperand.expression === "NO_ACC_CALC_CHECK_LOCK_ON",
    );
  }
  const explicitMove = moveOperand?.expression === "MOVE_FUTURE_SIGHT"
    ? 248
    : moveOperand?.expression === "MOVE_DOOM_DESIRE"
      ? 353
      : null;
  if (!moveOperand || (moveOperand.expression !== "ACC_CURR_MOVE" && explicitMove === null)) {
    return unsupportedBranch(
      context,
      `Cmd_accuracycheck's non-ACC_CURR_MOVE move argument `
        + `(${moveOperand?.expression ?? "<missing>"}) -- this registered path supports `
        + "ACC_CURR_MOVE plus Future Sight/Doom Desire's explicit literals",
      "battle_script_commands.c",
      1103,
    );
  }

  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const move = explicitMove ?? rulesContext.currentMove;
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);

  if (isDefenderProtected(targetBattler, move)) {
    const withFlags = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
      missType: B_MSG_PROTECTED,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }

  if (
    (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) !== 0
    && targetBattler.battlerWithSureHit === attacker
  ) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }

  let hitMarker = rulesContext.hitMarker;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_ON_AIR) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_ON_AIR) >>> 0;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_UNDERGROUND) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      hitMarker,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERGROUND) >>> 0;
  if ((hitMarker & BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER) === 0 && (targetBattler.status3 & BATTLE_SCRIPT_STATUS3_UNDERWATER) !== 0) {
    const withFlags = Object.freeze({
      ...rulesContext,
      hitMarker,
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    });
    return jumpToMissTarget(context, withFlags, attacker, target, context.state.rng);
  }
  hitMarker = (hitMarker & ~BATTLE_SCRIPT_HITMARKER_IGNORE_UNDERWATER) >>> 0;

  // AccuracyCalcHelper's effective-rain Thunder bypass (battle_script_commands.c:1088-1094);
  // the rules context now carries raw gBattleWeather, so this is no longer structurally false.
  const effectiveWeather = weatherHasEffect(rulesContext);
  const alwaysHits = (effectiveWeather && (rulesContext.weather & ((1 << 0) | (1 << 1) | (1 << 2))) !== 0 && moveRow.effect === "EFFECT_THUNDER") || moveRow.effect === "EFFECT_ALWAYS_HIT" || moveRow.effect === "EFFECT_VITAL_THROW";
  if (alwaysHits) {
    return advancePastAccuracyCheck(
      context,
      Object.freeze({ ...rulesContext, hitMarker }),
      attacker,
      target,
      context.state.rng,
      move,
    );
  }

  const targetHoldEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
  const targetHoldEffect = targetHoldEffectId === HOLD_EFFECT_EVASION_UP_ID
    ? "HOLD_EFFECT_EVASION_UP"
    : null;
  const targetHoldEffectParam = targetHoldEffect
    ? resolveBattleScriptBattlerHoldEffectParam(rulesContext, target)
    : 0;

  const calc = calculateAccuracy({
    moveAccuracy: effectiveWeather && (rulesContext.weather & B_WEATHER_SUN) !== 0 && moveRow.effect === "EFFECT_THUNDER" ? 50 : moveRow.accuracy,
    attackerAccuracyStage: attackerBattler.statStages[6],
    targetEvasionStage: targetBattler.statStages[7],
    targetHasForesight: (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0,
    attackerAbility: ABILITY_NAME_BY_ID[attackerBattler.ability] ?? null,
    targetAbility: ABILITY_NAME_BY_ID[targetBattler.ability] ?? null,
    isSandstorm: effectiveWeather && (rulesContext.weather & ((1 << 3) | (1 << 4))) !== 0,
    moveType,
    targetHoldEffect,
    targetHoldEffectParam,
  });

  const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "accuracycheck");
  const hit = rollAccuracyHits(calc, randomValue);
  const rulesContextWithHitMarker = Object.freeze({ ...rulesContext, hitMarker });

  if (hit) {
    return advancePastAccuracyCheck(
      context,
      Object.freeze({ ...rulesContextWithHitMarker }),
      attacker,
      target,
      rng,
      move,
    );
  }

  const moveTarget = resolveBattleScriptMoveTarget(move);
  const isDoubleAvoided = (rulesContext.battleTopology.battleTypeFlags & 1) !== 0
    && (moveTarget & BATTLE_SCRIPT_MOVE_TARGET_BOTH) !== 0;
  const wonderGuard = checkWonderGuardAndLevitate(move, moveType, targetBattler);
  let moveResultFlags = (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
  let attackerChanges: Partial<BattleScriptRulesBattlerState> = {};
  if (wonderGuard.targetNotAffected) {
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
    attackerChanges = { targetNotAffected: 1 };
  }
  let withFlags = Object.freeze({
    ...rulesContextWithHitMarker,
    moveResultFlags,
    missType: wonderGuard.missType ?? (isDoubleAvoided ? B_MSG_AVOIDED_ATK : B_MSG_MISSED),
    ...(wonderGuard.lastUsedAbility !== undefined ? { lastUsedAbility: wonderGuard.lastUsedAbility } : {}),
  });
  if (Object.keys(attackerChanges).length > 0) {
    withFlags = withBattler(withFlags, attacker, attackerChanges);
  }
  if (wonderGuard.lastUsedAbility !== undefined) {
    withFlags = recordBattleScriptAbilityReveal(
      withFlags,
      target,
      wonderGuard.lastUsedAbility,
    );
  }
  return jumpToMissTarget(context, withFlags, attacker, target, rng);
};

/**
 * Synthetic STRINGID_USEDMOVE operand: Cmd_attackstring's C body hardcodes
 * this string id rather than reading it from a script operand
 * (battle_script_commands.c:1198), so there is no real assembled operand to
 * reuse -- this stands in for one at the injected prepareMessage port's
 * boundary (only `.expression` is source-meaningful there; see
 * factoryBattleScriptDecision.ts's own port implementation).
 */
const STRINGID_USEDMOVE_OPERAND: BattleScriptOperand = Object.freeze({
  widthBytes: 2,
  expression: "STRINGID_USEDMOVE",
  sourceMacro: "STRINGID_USEDMOVE",
  sourceMacroLine: 1198,
  wrapperPath: Object.freeze([]),
});

/** Cmd_attackstring (battle_script_commands.c:1191-1202). */
export function createAttackstringOpcodeHandler(
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const printed = (rulesContext.hitMarker
      & (BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED)) !== 0;
    if (printed) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }) },
      );
    }
    const message = prepareMessage(context, STRINGID_USEDMOVE_OPERAND);
    if (message === null) {
      const reason: BattleScriptBlockReason = Object.freeze({
        kind: "source-context-unavailable",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        port: "prepare-message",
        operandExpression: "STRINGID_USEDMOVE",
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rulesContext,
          hitMarker: (rulesContext.hitMarker | BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) >>> 0,
        }),
        scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }),
        events: Object.freeze([message]),
      },
    );
  };
}

/** Cmd_ppreduce (battle_script_commands.c:1204-1247). */
export const ppreduceOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const move = rulesContext.currentMove;

  let ppToDeduct = 1;
  if (attackerBattler.ppNotAffectedByPressure !== 1) {
    const moveTarget = resolveBattleScriptMoveTarget(move);
    const { battlersCount } = rulesContext.battleTopology;
    if ((moveTarget & (1 << 5)) !== 0) {
      // MOVE_TARGET_FOES_AND_ALLY -> AbilityBattleEffects(ABILITYEFFECT_COUNT_ON_FIELD,
      // ...) (battle_util.c:3182-3191): every other battler on the field, either side,
      // no hp check.
      for (let i = 0; i < battlersCount; i += 1) {
        if (i !== attacker && rulesContext.battlers[i as BattleScriptBattlerId].ability === ABILITY_PRESSURE) {
          ppToDeduct += 1;
        }
      }
    } else if ((moveTarget & (BATTLE_SCRIPT_MOVE_TARGET_BOTH | (1 << 6))) !== 0) {
      // MOVE_TARGET_BOTH/MOVE_TARGET_OPPONENTS_FIELD -> AbilityBattleEffects
      // (ABILITYEFFECT_COUNT_OTHER_SIDE, ...) (battle_util.c:3160-3169): every battler
      // on the opposing side, no hp check.
      const attackerSide = attackerBattler.side;
      for (let i = 0; i < battlersCount; i += 1) {
        const candidate = rulesContext.battlers[i as BattleScriptBattlerId];
        if (candidate.side !== attackerSide && candidate.ability === ABILITY_PRESSURE) {
          ppToDeduct += 1;
        }
      }
    } else if (attacker !== target && targetBattler.ability === ABILITY_PRESSURE) {
      ppToDeduct += 1;
    }
  }

  const slot = rulesContext.currentMovePosition;
  const hitMarker = rulesContext.hitMarker;
  const shouldDeduct = (hitMarker & (BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT | BATTLE_SCRIPT_HITMARKER_NO_ATTACKSTRING)) === 0
    && attackerBattler.pp[slot] !== 0;

  let nextRulesContext = rulesContext;
  let scheduler = context.state.scheduler;
  let events: ReadonlyArray<Readonly<{ kind: "set-battler-pp-data"; battler: BattleScriptBattlerId; movePosition: number; pp: number }>> = [];

  if (shouldDeduct) {
    const currentPp = attackerBattler.pp[slot]!;
    const nextPp = currentPp > ppToDeduct ? currentPp - ppToDeduct : 0;
    const pp = attackerBattler.pp.map((value, index) => (index === slot ? nextPp : value)) as unknown as
      BattleScriptRulesBattlerState["pp"];
    const withActivePp = withBattler(rulesContext, attacker, { pp, notFirstStrike: 1 });
    nextRulesContext = Object.freeze({
      ...withActivePp,
      party: withBattleScriptPartyMemberPp(
        withActivePp.party,
        attackerBattler.side,
        attackerBattler.partyIndex,
        slot,
        nextPp,
      ),
    });

    const isPermanent = (attackerBattler.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0;
    if (isPermanent) {
      events = Object.freeze([
        Object.freeze({ kind: "set-battler-pp-data" as const, battler: attacker, movePosition: slot, pp: nextPp }),
      ]);
      scheduler = markBattleScriptControllerPending(scheduler, attacker);
    }
  }

  nextRulesContext = Object.freeze({
    ...nextRulesContext,
    hitMarker: (nextRulesContext.hitMarker & ~BATTLE_SCRIPT_HITMARKER_NO_PPDEDUCT) >>> 0,
  });

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, scheduler, events },
  );
};

/**
 * Cmd_critcalc (battle_script_commands.c:1253-1286): the critChance stage
 * (sCriticalHitChance, :606) plus the roll that sets gCritMultiplier for
 * damagecalc to consume. Battle Armor/Shell Armor/STATUS3_CANT_SCORE_A_CRIT/
 * tutorial-battle immunity short-circuits the source's `&&` chain *before*
 * Random() runs -- immunity consumes zero RNG here, it does not waste a roll.
 */
export const critcalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveRow = requireMoveRow(rulesContext.currentMove);

  const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, attacker);
  const attackerHoldEffect = holdEffectId === HOLD_EFFECT_ID_SCOPE_LENS
    ? "HOLD_EFFECT_SCOPE_LENS"
    : holdEffectId === HOLD_EFFECT_ID_LUCKY_PUNCH
      ? "HOLD_EFFECT_LUCKY_PUNCH"
      : holdEffectId === HOLD_EFFECT_ID_STICK
        ? "HOLD_EFFECT_STICK"
        : null;
  const critChance = getCriticalHitChanceStage({
    focusEnergy:
      (attackerBattler.status2 & BATTLE_SCRIPT_STATUS2_FOCUS_ENERGY) !== 0,
    moveEffect: moveRow.effect,
    attackerHoldEffect,
    isChansey: attackerBattler.species === SPECIES_CHANSEY,
    isFarfetchd: attackerBattler.species === SPECIES_FARFETCHD,
  });

  const immune = targetBattler.ability === ABILITY_BATTLE_ARMOR
    || targetBattler.ability === ABILITY_SHELL_ARMOR
    || (attackerBattler.status3 & BATTLE_SCRIPT_STATUS3_CANT_SCORE_A_CRIT) !== 0
    || (rulesContext.battleTopology.battleTypeFlags
      & (BATTLE_SCRIPT_BATTLE_TYPE_WALLY_TUTORIAL | BATTLE_SCRIPT_BATTLE_TYPE_FIRST_BATTLE)) !== 0;

  let isCrit = false;
  let rng = context.state.rng;
  if (!immune) {
    const drawn = drawBattleScriptRng(context.state.rng, context.instruction, "critcalc");
    rng = drawn.rng;
    isCrit = rollIsCriticalHit(critChance, drawn.randomValue);
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, critMultiplier: isCrit ? 2 : 1 }), rng },
  );
};

function toDamageCalcStatStages(battler: BattleScriptRulesBattlerState) {
  return {
    atk: battler.statStages[1]!,
    def: battler.statStages[2]!,
    spAtk: battler.statStages[4]!,
    spDef: battler.statStages[5]!,
  };
}

/**
 * Source `CalculateBaseDamage` call shared by Cmd_damagecalc and
 * Cmd_stockpiletobasedamage. This deliberately excludes crit, dmgMultiplier,
 * Charge, Helping Hand, and Stockpile's own post-call multiplier.
 */
export function calculateBattleScriptBaseDamageForCurrentMove(
  rulesContext: BattleScriptRulesContext,
): number {
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveRow = requireMoveRow(rulesContext.currentMove);
  const moveType = resolveMoveTypeName(rulesContext, rulesContext.currentMove);
  let movePower = rulesContext.dynamicBasePower !== 0
    ? rulesContext.dynamicBasePower
    : moveRow.power;
  const activeBattlers = rulesContext.battlers.slice(
    0,
    rulesContext.battleTopology.battlersCount,
  );
  if (
    moveType === "TYPE_ELECTRIC"
    && activeBattlers.some(({ status3 }) => (status3 & (1 << 16)) !== 0)
  ) {
    movePower = Math.trunc(movePower / 2);
  }
  if (
    moveType === "TYPE_FIRE"
    && activeBattlers.some(({ status3 }) => (status3 & (1 << 17)) !== 0)
  ) {
    movePower = Math.trunc(movePower / 2);
  }
  const attackerHoldEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, attacker);
  const defenderHoldEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);

  return calculateBaseDamage({
    attacker: {
      attack: attackerBattler.attack,
      defense: attackerBattler.defense,
      spAttack: attackerBattler.spAttack,
      spDefense: attackerBattler.spDefense,
      level: attackerBattler.level,
      types: attackerBattler.types,
      statStages: toDamageCalcStatStages(attackerBattler),
      isBurned: (attackerBattler.status1 & STATUS1_BURN) !== 0,
      hasStatus1: attackerBattler.status1 !== 0,
      hp: attackerBattler.hp,
      maxHP: attackerBattler.maxHP,
      ability: ABILITY_NAME_BY_ID[attackerBattler.ability] ?? null,
      species: attackerBattler.species,
      holdEffect: HOLD_EFFECT_NAME_BY_ID[attackerHoldEffectId] ?? null,
      holdEffectParam: resolveBattleScriptBattlerHoldEffectParam(rulesContext, attacker),
    },
    defender: {
      attack: targetBattler.attack,
      defense: targetBattler.defense,
      spAttack: targetBattler.spAttack,
      spDefense: targetBattler.spDefense,
      level: targetBattler.level,
      types: targetBattler.types,
      statStages: toDamageCalcStatStages(targetBattler),
      hasStatus1: targetBattler.status1 !== 0,
      ability: ABILITY_NAME_BY_ID[targetBattler.ability] ?? null,
      species: targetBattler.species,
      holdEffect: HOLD_EFFECT_NAME_BY_ID[defenderHoldEffectId] ?? null,
    },
    movePower,
    moveType,
    isCriticalHit: rulesContext.critMultiplier === 2,
    moveEffect: moveRow.effect,
    weather: rulesContext.weather,
    weatherHasEffect: weatherHasEffectForBaseDamage(rulesContext),
    currentMove: rulesContext.currentMove,
    activeBattlerAbilities: activeBattlers.map((b) => ABILITY_NAME_BY_ID[b.ability] ?? null),
    isFrontierBattle: (rulesContext.battleTopology.battleTypeFlags & BATTLE_TYPE_FRONTIER) !== 0,
    flashFireBoosted: attackerBattler.flashFireBoosted === 1,
  });
}

/**
 * Cmd_damagecalc (battle_script_commands.c:1288-1301): CalculateBaseDamage
 * (consumed via damageCalc.ts's pinned calculateBaseDamage) times
 * gCritMultiplier (set by critcalc above) times gBattleScripting.dmgMultiplier
 * -- the x2 crit step lives HERE, before Cmd_typecalc's STAB/type scaling, not
 * inside calculateBaseDamage itself (docs/hit-chain-ground-truth.md's crit
 * scenario). Source `gDynamicBasePower` carries Low Kick/Flail/Triple
 * Kick-style power overrides; zero selects `gBattleMoves[move].power`.
 * `CalculateBaseDamage`'s own `powerOverride` parameter (`pokemon.c:3119-3122`,
 * `if (!powerOverride) gBattleMovePower = gBattleMoves[move].power; else
 * gBattleMovePower = powerOverride;`) is source-generic: Triple Kick's own
 * `copyhword gDynamicBasePower, sTRIPLE_KICK_POWER` (already-modeled scratch
 * state, `rules.tripleKickPower`) copies into `rules.dynamicBasePower`;
 * Cmd_remaininghptopower writes the same source field directly. Reading that
 * single source-shaped destination needs no per-effect branch. Side Reflect/Light Screen and
 * double-battle spread scaling are not modeled anywhere in this engine yet
 * (consistent with damageCalc.ts's own documented scope) -- both are
 * structurally always their C default (0/false) since no side-condition or
 * doubles subsystem exists to set them.
 */
export const damagecalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const attackerBattler = rulesContext.battlers[attacker];
  const move = rulesContext.currentMove;
  const moveType = resolveMoveTypeName(rulesContext, move);

  let damage = calculateBattleScriptBaseDamageForCurrentMove(rulesContext);

  damage = damage * rulesContext.critMultiplier * rulesContext.dmgMultiplier;
  if ((attackerBattler.status3 & STATUS3_CHARGED_UP) !== 0 && moveType === "TYPE_ELECTRIC") {
    damage *= 2;
  }
  if (attackerBattler.helpingHand === 1) {
    damage = Math.trunc((damage * 15) / 10);
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage: damage }) },
  );
};

/**
 * Cmd_typecalc (battle_script_commands.c:1355-1420): STAB, the Levitate/Ground
 * short-circuit (skips the whole type loop when it fires, distinct from
 * CheckWonderGuardAndLevitate's own copy consumed by RUNG 1's accuracycheck --
 * this is typecalc's independent branch, kept structurally consistent with
 * it), the type-effectiveness loop (ModulateDmgByType's TYPE_MUL_* result-flag
 * toggling), the Foresight-vs-Ghost immunity skip (the source table's single
 * TYPE_FORESIGHT sentinel row, positioned immediately before the Normal/
 * Fighting-vs-Ghost immunity entries at the very end of gTypeEffectiveness --
 * breaking there only ever skips those two entries, nothing earlier in the
 * table), and Wonder Guard's own miss branch. AttacksThisTurn(attacker, move)
 * is always 2 for BattleScript_EffectHit's own typecalc call (HITMARKER_CHARGING
 * is only set during a two-turn move's charging turn, which never reaches this
 * script), so the Wonder Guard branch's `== 2` guard is structurally always
 * true here and is not modeled as a separate condition.
 */
export const typecalcOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const move = rulesContext.currentMove;

  if (move === BATTLE_SCRIPT_MOVE_STRUGGLE) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }

  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const attackerBattler = rulesContext.battlers[attacker];
  const targetBattler = rulesContext.battlers[target];
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);

  let damage = applyStab(rulesContext.battleMoveDamage, attackerBattler.types, moveType);
  let moveResultFlags = rulesContext.moveResultFlags;
  let missType = rulesContext.missType;
  let lastUsedAbility = rulesContext.lastUsedAbility;
  let moveHistory = rulesContext.moveHistory;
  let revealedAbility = false;

  if (targetBattler.ability === ABILITY_LEVITATE && moveType === "TYPE_GROUND") {
    lastUsedAbility = ABILITY_LEVITATE;
    revealedAbility = true;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_GROUND_MISS;
  } else {
    const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
    const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
      ? [targetBattler.types[0]]
      : targetBattler.types;
    for (const defType of distinctTypes) {
      if (hasForesight && defType === "TYPE_GHOST" && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")) {
        continue;
      }
      const entry = TYPE_EFFECTIVENESS.find(
        (candidate) => candidate.attackingType === moveType && candidate.defendingType === defType,
      );
      if (!entry) continue;
      damage = Math.trunc((damage * entry.multiplierTenths) / 10);
      if (damage === 0 && entry.multiplierTenths !== 0) damage = 1;
      if (entry.multiplierTenths === 0) {
        moveResultFlags = (moveResultFlags
          | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE)
          & ~BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE
          & ~BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE;
        moveResultFlags = moveResultFlags >>> 0;
      } else if (entry.multiplierTenths === 5) {
        if (moveRow.power !== 0 && (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0) {
          if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) !== 0) {
            moveResultFlags = (moveResultFlags & ~BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) >>> 0;
          } else {
            moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) >>> 0;
          }
        }
      } else if (entry.multiplierTenths === 20) {
        if (moveRow.power !== 0 && (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0) {
          if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) !== 0) {
            moveResultFlags = (moveResultFlags & ~BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE) >>> 0;
          } else {
            moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) >>> 0;
          }
        }
      }
    }
  }

  if (
    isWonderGuardAbility(targetBattler.ability)
    && moveRow.power !== 0
    && (
      (moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) === 0
      || (moveResultFlags & (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE))
        === (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE)
    )
  ) {
    lastUsedAbility = ABILITY_WONDER_GUARD;
    revealedAbility = true;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_AVOIDED_DMG;
  }

  let nextRulesContext = Object.freeze({
    ...rulesContext,
    battleMoveDamage: damage,
    moveResultFlags,
    missType,
    lastUsedAbility,
    moveHistory,
  });
  if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) !== 0) {
    nextRulesContext = withBattler(nextRulesContext, attacker, { targetNotAffected: 1 });
  }
  if (revealedAbility) {
    nextRulesContext = recordBattleScriptAbilityReveal(nextRulesContext, target, lastUsedAbility);
  }

  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Cmd_dmgtolevel (battle_script_commands.c:7926-7930): Seismic Toss/Night
 * Shade's fixed-damage source, `gBattleMoveDamage = gBattleMons[attacker]
 * .level`. Two lines, no branch, no RNG in source.
 */
export const dmgtolevelOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const level = rulesContext.battlers[attacker].level;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage: level }) },
  );
};

/**
 * Cmd_psywavedamageeffect (battle_script_commands.c:7932-7941): Psywave's
 * rejection-sampling loop over `Random() % 16`, redrawing while the sample
 * exceeds 10 (11 of 16 values accepted, ~68.75%/draw), then `gBattleMoveDamage
 * = level * (randDamage * 10 + 50) / 100` with the accepted sample. Draw
 * count is unbounded in source but small in practice -- live-verified at 1
 * and 2 draws (`docs/fixed-damage-cluster-ground-truth.md` §5b).
 */
export const psywavedamageeffectOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const level = rulesContext.battlers[attacker].level;

  let rng = context.state.rng;
  let randDamage: number;
  do {
    const draw = drawBattleScriptRng(rng, context.instruction, "psywavedamageeffect");
    rng = draw.rng;
    randDamage = draw.randomValue % 16;
  } while (randDamage > 10);

  const damage = Math.trunc((level * (randDamage * 10 + 50)) / 100);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage: damage }), rng },
  );
};

/**
 * Cmd_typecalc2 (battle_script_commands.c:4500-4593): Counter/Mirror Coat/
 * Brick Break's second-call immunity gate. Diverges from Cmd_typecalc
 * (registered above) in two load-bearing ways, both confirmed by reading the
 * bodies side by side (`docs/fixed-damage-cluster-ground-truth.md` §2):
 * (1) no STAB line anywhere in this function; (2) the type-effectiveness
 * loop only ORs bits into a *local* `flags` u8 (never calls
 * ModulateDmgByType, never touches `gBattleMoveDamage`) -- so this opcode
 * never scales damage, only gates DOESNT_AFFECT_FOE/Wonder-Guard-MISSED.
 * `flags` can therefore never carry `MOVE_RESULT_NO_EFFECT`'s bits (only
 * NOT_VERY_EFFECTIVE/SUPER_EFFECTIVE are ever OR'd into it), so source's own
 * `!(flags & MOVE_RESULT_NO_EFFECT)` Wonder Guard guard is a provable
 * tautology here -- computed for fidelity anyway since it costs nothing.
 * `AttacksThisTurn(attacker, move) == 2` is structurally always true for
 * this cluster's three effects (none are two-turn/charging moves), so it is
 * not modeled as a separate condition, matching Cmd_typecalc's own port
 * precedent above. `gLastHitByType` is not written by source here (unlike
 * typecalc) and is not modeled by this engine at all, so nothing to do.
 */
export const typecalc2OpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const targetBattler = rulesContext.battlers[target];
  const move = rulesContext.currentMove;
  const moveRow = requireMoveRow(move);
  const moveType = resolveMoveTypeName(rulesContext, move);

  let moveResultFlags = rulesContext.moveResultFlags;
  let missType = rulesContext.missType;
  let lastUsedAbility = rulesContext.lastUsedAbility;
  let moveHistory = rulesContext.moveHistory;
  let flags = 0;
  let revealedAbility = false;

  if (targetBattler.ability === ABILITY_LEVITATE && moveType === "TYPE_GROUND") {
    lastUsedAbility = ABILITY_LEVITATE;
    revealedAbility = true;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_GROUND_MISS;
  } else {
    const hasForesight = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_FORESIGHT) !== 0;
    const distinctTypes = targetBattler.types[0] === targetBattler.types[1]
      ? [targetBattler.types[0]]
      : targetBattler.types;
    for (const defType of distinctTypes) {
      if (hasForesight && defType === "TYPE_GHOST" && (moveType === "TYPE_NORMAL" || moveType === "TYPE_FIGHTING")) {
        continue;
      }
      const entry = TYPE_EFFECTIVENESS.find(
        (candidate) => candidate.attackingType === moveType && candidate.defendingType === defType,
      );
      if (!entry) continue;
      if (entry.multiplierTenths === 0) {
        moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) >>> 0;
        break;
      }
      if (entry.multiplierTenths === 5) {
        flags |= BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE;
      } else if (entry.multiplierTenths === 20) {
        flags |= BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE;
      }
    }
  }

  if (
    isWonderGuardAbility(targetBattler.ability)
    && (flags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0
    && moveRow.power !== 0
    && (
      (flags & BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE) === 0
      || (flags & (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE))
        === (BATTLE_SCRIPT_MOVE_RESULT_SUPER_EFFECTIVE | BATTLE_SCRIPT_MOVE_RESULT_NOT_VERY_EFFECTIVE)
    )
  ) {
    lastUsedAbility = ABILITY_WONDER_GUARD;
    revealedAbility = true;
    moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
    moveHistory = withClearedLandedMove(moveHistory, target);
    missType = B_MSG_AVOIDED_DMG;
  }

  let nextRulesContext = Object.freeze({
    ...rulesContext,
    moveResultFlags,
    missType,
    lastUsedAbility,
    moveHistory,
  });
  if ((moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_DOESNT_AFFECT_FOE) !== 0) {
    nextRulesContext = withBattler(nextRulesContext, attacker, { targetNotAffected: 1 });
  }
  if (revealedAbility) {
    nextRulesContext = recordBattleScriptAbilityReveal(nextRulesContext, target, lastUsedAbility);
  }

  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Cmd_counterdamagecalculator (battle_script_commands.c:7943-7966): Counter's
 * own three-gate success check, reading THIS battler's (the Counter user's,
 * `gBattlerAttacker`) own ProtectStruct copy -- `protectPhysicalDmg`/
 * `protectPhysicalBattlerId`, written by `Cmd_datahpupdate`
 * (`createDatahpupdateOpcodeHandler` above), cleared once per turn
 * (`docs/counter-retaliation-design.md` §1.4/§4 step 4). All three gates
 * must hold: (a) `protectPhysicalDmg != 0` -- something hit this battler
 * physically since the last per-turn clear; (b) the recorded hitter's side
 * differs from this battler's own side; (c) that recorded hitter is still
 * alive. Source computes `sideTarget = GetBattlerSide(physicalBattlerId)`
 * unconditionally, even in the zeroed post-clear state, but the `&&` chain
 * short-circuits on gate (a) first, so a false gate (a) makes the dummy
 * `hitter` read inert regardless of its value (pure `GetBattlerSide`, no
 * side effect either way) -- this port relies on the same short-circuit.
 * Follow Me's fields now have shared `BattleScriptSideTimerState` ownership,
 * but Counter's separate retarget reader is intentionally not widened in
 * this finite registration unit: it is unobservable in Factory L50 singles
 * and retaliation still targets the recorded hitter directly, matching
 * prep-scout §6. Failure writes the real, already-modeled
 * `ppNotAffectedByPressure` field and jumps to the operand's fail target
 * (`BattleScript_FailedFromAtkString` at every real call site).
 */
export const counterdamagecalculatorOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const attackerBattler = rulesContext.battlers[attacker];
  const hitterId = attackerBattler.protectPhysicalBattlerId;
  const hitter = rulesContext.battlers[hitterId];

  const success = attackerBattler.protectPhysicalDmg !== 0
    && attackerBattler.side !== hitter.side
    && hitter.hp !== 0;

  if (!success) {
    const [failOperand] = context.instruction.operands;
    const failTarget = resolveBattleScriptLabel(context.program, failOperand!.expression);
    if (!failTarget) {
      throw new Error(`Cmd_counterdamagecalculator: unresolved jump target ${failOperand!.expression}`);
    }
    const nextRulesContext = withBattler(rulesContext, attacker, { ppNotAffectedByPressure: 1 });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
      { rulesContext: nextRulesContext },
    );
  }

  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battleMoveDamage: attackerBattler.protectPhysicalDmg * 2,
    selectorRoles: hitterId === rulesContext.selectorRoles.target
      ? rulesContext.selectorRoles
      : Object.freeze({ ...rulesContext.selectorRoles, target: hitterId }),
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Cmd_mirrorcoatdamagecalculator (battle_script_commands.c:7969-7990):
 * "confirmed byte-for-byte identical [to Cmd_counterdamagecalculator] with
 * every physical* swapped for special*" (source's own comment at :7968,
 * docs/counter-retaliation-design.md §1.4) -- same three gates, same
 * ppNotAffectedByPressure failure write, reading protectSpecialDmg/
 * protectSpecialBattlerId instead.
 */
export const mirrorcoatdamagecalculatorOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const attackerBattler = rulesContext.battlers[attacker];
  const hitterId = attackerBattler.protectSpecialBattlerId;
  const hitter = rulesContext.battlers[hitterId];

  const success = attackerBattler.protectSpecialDmg !== 0
    && attackerBattler.side !== hitter.side
    && hitter.hp !== 0;

  if (!success) {
    const [failOperand] = context.instruction.operands;
    const failTarget = resolveBattleScriptLabel(context.program, failOperand!.expression);
    if (!failTarget) {
      throw new Error(`Cmd_mirrorcoatdamagecalculator: unresolved jump target ${failOperand!.expression}`);
    }
    const nextRulesContext = withBattler(rulesContext, attacker, { ppNotAffectedByPressure: 1 });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
      { rulesContext: nextRulesContext },
    );
  }

  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battleMoveDamage: attackerBattler.protectSpecialDmg * 2,
    selectorRoles: hitterId === rulesContext.selectorRoles.target
      ? rulesContext.selectorRoles
      : Object.freeze({ ...rulesContext.selectorRoles, target: hitterId }),
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Shared body of Cmd_adjustnormaldamage (battle_script_commands.c:1658-1698)
 * and Cmd_adjustnormaldamage2 (1701-1741). Both consume the random-damage
 * roll and share Focus Band, Endure, Substitute, flags, and HP semantics.
 * Their sole source difference is whether EFFECT_FALSE_SWIPE participates in
 * the survival clamp.
 *
 * A Focus Band holder always draws its own percent roll after variance,
 * including on non-lethal hits. A successful roll sets the action-lifetime
 * SpecialStatus bit; the lethal clamp then records HUNG_ON and the item.
 */
function adjustNormalDamageOpcodeHandler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  includeFalseSwipe: boolean,
): ReturnType<BattleScriptOpcodeHandler<BattleScriptRulesContext>> {
  const rulesContext = context.state.rulesContext;
  const target = requireBattlerRole(rulesContext, "target");
  const targetBattler = rulesContext.battlers[target];
  const damageRollReason = includeFalseSwipe ? "adjustnormaldamage" : "adjustnormaldamage2";
  const damageDraw = drawBattleScriptRng(
    context.state.rng,
    context.instruction,
    damageRollReason,
  );
  let rng = damageDraw.rng;
  let damage = applyRandomDamageMultiplier(rulesContext.battleMoveDamage, damageDraw.randomValue);
  let focusBanded = targetBattler.specialStatus.focusBanded === 1;
  let nextRulesContext = rulesContext;

  const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
  if (holdEffectId === HOLD_EFFECT_ID_FOCUS_BAND) {
    const bandDraw = drawBattleScriptRng(
      rng,
      context.instruction,
      `${damageRollReason}-focus-band`,
    );
    rng = bandDraw.rng;
    if ((bandDraw.randomValue % 100) < resolveBattleScriptBattlerHoldEffectParam(rulesContext, target)) {
      focusBanded = true;
      nextRulesContext = withBattler(rulesContext, target, {
        specialStatus: Object.freeze({ ...targetBattler.specialStatus, focusBanded: 1 }),
      });
      nextRulesContext = recordBattleScriptItemEffectReveal(
        nextRulesContext,
        target,
        holdEffectId,
      );
    }
  }

  const falseSwipeApplies = includeFalseSwipe
    && requireMoveRow(rulesContext.currentMove).effect === "EFFECT_FALSE_SWIPE";
  const hasSubstitute = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0;
  const shouldClamp = !hasSubstitute
    && (falseSwipeApplies || targetBattler.endured === 1 || focusBanded)
    && targetBattler.hp <= damage;

  let moveResultFlags = nextRulesContext.moveResultFlags;
  let lastUsedItem = nextRulesContext.lastUsedItem;
  if (shouldClamp) {
    damage = targetBattler.hp - 1;
    if (targetBattler.endured === 1) {
      moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED) >>> 0;
    } else if (focusBanded) {
      moveResultFlags = (moveResultFlags | MOVE_RESULT_FOE_HUNG_ON) >>> 0;
      lastUsedItem = targetBattler.item;
    }
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...nextRulesContext,
        battleMoveDamage: damage,
        moveResultFlags,
        lastUsedItem,
      }),
      rng,
    },
  );
}

export const adjustnormaldamageOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => adjustNormalDamageOpcodeHandler(context, true);

export const adjustnormaldamage2OpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => adjustNormalDamageOpcodeHandler(context, false);

/**
 * Cmd_setdamagetohealthdifference (battle_script_commands.c:9366-9377),
 * Endeavor's own damage source and the only concrete call site
 * (`BattleScript_EffectEndeavor`, program counter 1770). Source's fail
 * direction is `target.hp <= attacker.hp` -- i.e. it fails whenever the
 * user's own HP is already at or above the target's, matching the move's
 * real "gains power only while behind" identity. `gBattleMoveDamage =
 * target.hp - attacker.hp` on the success branch. Zero `Random(` calls on
 * either branch.
 */
export const setdamagetohealthdifferenceOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const rulesContext = context.state.rulesContext;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const targetHp = rulesContext.battlers[target].hp;
  const attackerHp = rulesContext.battlers[attacker].hp;

  if (targetHp <= attackerHp) {
    const [failOperand] = context.instruction.operands;
    const failTarget = resolveBattleScriptLabel(context.program, failOperand!.expression);
    if (!failTarget) {
      throw new Error(`Cmd_setdamagetohealthdifference: unresolved jump target ${failOperand!.expression}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }),
    );
  }

  const nextRulesContext = Object.freeze({ ...rulesContext, battleMoveDamage: targetHp - attackerHp });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
};

/**
 * Cmd_adjustsetdamage (battle_script_commands.c:5861-5899): "the same as
 * adjustnormaldamage, except there's no random damage multiplier" (the
 * source's own comment) -- the False Swipe/Endure HP clamp, ported exactly
 * like adjustnormaldamageOpcodeHandler above, minus only the variance draw.
 * Focus Band therefore remains an unconditional holder-only percent draw.
 */
export const adjustsetdamageOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const target = requireBattlerRole(rulesContext, "target");
  const targetBattler = rulesContext.battlers[target];

  let rng = context.state.rng;
  let focusBanded = targetBattler.specialStatus.focusBanded === 1;
  let nextRulesContext = rulesContext;
  const holdEffectId = resolveBattleScriptBattlerHoldEffect(rulesContext, target);
  if (holdEffectId === HOLD_EFFECT_ID_FOCUS_BAND) {
    const bandDraw = drawBattleScriptRng(
      rng,
      context.instruction,
      "adjustsetdamage-focus-band",
    );
    rng = bandDraw.rng;
    if ((bandDraw.randomValue % 100) < resolveBattleScriptBattlerHoldEffectParam(rulesContext, target)) {
      focusBanded = true;
      nextRulesContext = withBattler(rulesContext, target, {
        specialStatus: Object.freeze({ ...targetBattler.specialStatus, focusBanded: 1 }),
      });
      nextRulesContext = recordBattleScriptItemEffectReveal(
        nextRulesContext,
        target,
        holdEffectId,
      );
    }
  }

  const moveRow = requireMoveRow(rulesContext.currentMove);
  const hasSubstitute = (targetBattler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0;
  let damage = rulesContext.battleMoveDamage;
  const shouldClamp = !hasSubstitute
    && (moveRow.effect === "EFFECT_FALSE_SWIPE" || targetBattler.endured === 1 || focusBanded)
    && targetBattler.hp <= damage;

  let moveResultFlags = nextRulesContext.moveResultFlags;
  let lastUsedItem = nextRulesContext.lastUsedItem;
  if (shouldClamp) {
    damage = targetBattler.hp - 1;
    if (targetBattler.endured === 1) {
      moveResultFlags = (moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FOE_ENDURED) >>> 0;
    } else if (focusBanded) {
      moveResultFlags = (moveResultFlags | MOVE_RESULT_FOE_HUNG_ON) >>> 0;
      lastUsedItem = targetBattler.item;
    }
  }

  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...nextRulesContext,
        battleMoveDamage: damage,
        moveResultFlags,
        lastUsedItem,
      }),
      rng,
    },
  );
};

/**
 * Cmd_attackanimation (battle_script_commands.c:1743-1799). MOVE_TRANSFORM/
 * MOVE_SUBSTITUTE never reach BattleScript_EffectHit's own hit chain (each
 * has its own dedicated effect script), so the HITMARKER_NO_ANIMATIONS
 * branch's move-id exclusion is structurally always true here -- only the
 * hitMarker bit itself gates it. animTurn/animTargetsHit are the already
 * source-shaped gBattleScripting counters (battleScriptSetByte.ts).
 */
function createAttackanimationOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;

    if ((rulesContext.hitMarker & BATTLE_SCRIPT_HITMARKER_NO_ANIMATIONS) !== 0) {
      const pausex20 = resolveBattleScriptLabel(context.program, "BattleScript_Pausex20");
      if (!pausex20) throw new Error("attackanimation: committed program has no label BattleScript_Pausex20");
      const attacker = requireBattlerRole(rulesContext, "attacker");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter: pausex20.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            animTurn: (rulesContext.animTurn + 1) & 0xff,
            animTargetsHit: (rulesContext.animTargetsHit + 1) & 0xff,
          }),
          events: Object.freeze([
            Object.freeze({
              kind: "animation" as const,
              animationId: "SCENE_OFF_ATTACK_PAUSE",
              battler: attacker,
              arguments: Object.freeze([]),
            }),
          ]),
        },
      );
    }

    const move = rulesContext.currentMove;
    const moveTarget = resolveBattleScriptMoveTarget(move);
    const isSpreadMove =
      (moveTarget & (BATTLE_SCRIPT_MOVE_TARGET_BOTH | MOVE_TARGET_FOES_AND_ALLY | MOVE_TARGET_DEPENDS)) !== 0;
    if (isSpreadMove && rulesContext.animTargetsHit !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      const pausex20 = resolveBattleScriptLabel(context.program, "BattleScript_Pausex20");
      if (!pausex20) throw new Error("attackanimation: committed program has no label BattleScript_Pausex20");
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "call", programCounter: pausex20.programCounter }));
    }

    const attacker = requireBattlerRole(rulesContext, "attacker");
    const target = requireBattlerRole(rulesContext, "target");
    const attackerBattler = rulesContext.battlers[attacker];
    const targetBattler = rulesContext.battlers[target];
    const moveRow = requireMoveRow(move);

    let multihit: number;
    if ((targetBattler.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0) {
      multihit = rulesContext.multiHitCounter;
    } else if (rulesContext.multiHitCounter !== 0 && rulesContext.multiHitCounter !== 1) {
      multihit = targetBattler.hp <= rulesContext.battleMoveDamage ? 1 : rulesContext.multiHitCounter;
    } else {
      multihit = rulesContext.multiHitCounter;
    }

    const scheduler = markBattleScriptControllerPending(context.state.scheduler, attacker);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...rulesContext,
          animTurn: (rulesContext.animTurn + 1) & 0xff,
          animTargetsHit: (rulesContext.animTargetsHit + 1) & 0xff,
        }),
        scheduler,
        events: Object.freeze([
          Object.freeze({
            kind: "animation" as const,
            animationId: "MOVE_ANIMATION",
            battler: attacker,
            arguments: Object.freeze([
              String(move),
              String(rulesContext.animTurn),
              String(moveRow.power),
              String(rulesContext.battleMoveDamage),
              String(attackerBattler.friendship),
              String(multihit),
            ]),
          }),
        ]),
      },
    );
  };
}

/** Cmd_effectivenesssound (battle_script_commands.c:2001-2046), always gBattlerTarget. */
function createEffectivenesssoundOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const target = requireBattlerRole(rulesContext, "target");
    const flags = rulesContext.moveResultFlags;

    let songId: number | null = null;
    if ((flags & BATTLE_SCRIPT_MOVE_RESULT_MISSED) === 0) {
      const resultBits = (flags & ~BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
      if (resultBits === MOVE_RESULT_SUPER_EFFECTIVE) {
        songId = SE_SUPER_EFFECTIVE;
      } else if (resultBits === MOVE_RESULT_NOT_VERY_EFFECTIVE) {
        songId = SE_NOT_EFFECTIVE;
      } else if (resultBits === MOVE_RESULT_DOESNT_AFFECT_FOE || resultBits === BATTLE_SCRIPT_MOVE_RESULT_FAILED) {
        songId = null;
      } else if ((resultBits & MOVE_RESULT_SUPER_EFFECTIVE) !== 0) {
        songId = SE_SUPER_EFFECTIVE;
      } else if ((resultBits & MOVE_RESULT_NOT_VERY_EFFECTIVE) !== 0) {
        songId = SE_NOT_EFFECTIVE;
      } else if ((resultBits & (MOVE_RESULT_DOESNT_AFFECT_FOE | BATTLE_SCRIPT_MOVE_RESULT_FAILED)) === 0) {
        songId = SE_EFFECTIVE;
      }
    }

    if (songId === null) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, target);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler, events: Object.freeze([Object.freeze({ kind: "play-se" as const, battler: target, songId })]) },
    );
  };
}

/**
 * Cmd_hitanimation (battle_script_commands.c:5558-5576). Unlike its siblings
 * this opcode has no gBattleControllerExecFlags busy check at all -- it
 * always advances the same execution, matching the source exactly.
 */
export const hitanimationOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (context) => {
  const rulesContext = context.state.rulesContext;
  const resolved = resolveHitChainBattlerOperand(context, rulesContext);
  if (resolved === "unsupported") {
    return unsupportedBranch(
      context,
      `Cmd_hitanimation's GetBattlerForBattleScript selector `
        + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
      "battle_script_commands.c",
      5560,
    );
  }
  const battler = resolved;
  const battlerState = rulesContext.battlers[battler];

  if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0 && battlerState.substituteHP !== 0;
  const suppressedBySubstitute = (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) !== 0 && substituteActive;
  if (suppressedBySubstitute) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
  }
  const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      scheduler,
      events: Object.freeze([
        Object.freeze({ kind: "animation" as const, animationId: "HIT_ANIMATION", battler, arguments: Object.freeze([]) }),
      ]),
    },
  );
};

/** Cmd_healthbarupdate (battle_script_commands.c:1807-1841). */
function createHealthbarupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const resolved = resolveHitChainBattlerOperand(context, rulesContext);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        `Cmd_healthbarupdate's GetBattlerForBattleScript selector `
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
        "battle_script_commands.c",
        1814,
      );
    }
    const battler = resolved;
    const battlerState = rulesContext.battlers[battler];
    const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0
      && battlerState.substituteHP !== 0
      && (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) === 0;

    if (substituteActive) {
      const message = prepareMessage(context, stringOperand("STRINGID_SUBSTITUTEDAMAGED", 1818));
      if (message === null) return blockOnUnavailableMessage(context, "STRINGID_SUBSTITUTEDAMAGED");
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { events: Object.freeze([message]) });
    }

    const healthValue = Math.min(rulesContext.battleMoveDamage, 10000);
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler, events: Object.freeze([Object.freeze({ kind: "health-bar-update" as const, battler, healthValue })]) },
    );
  };
}

/**
 * Cmd_datahpupdate (battle_script_commands.c:1844-1986): the hit chain's real
 * HP mutation. Substitute-active damages the substitute instead (gHpDealt
 * bookkeeping matches source); when the substitute's HP reaches exactly zero
 * this hit -- either from overkill damage (battle_script_commands.c:1875-1882,
 * where gHpDealt/shellBellDmg clamp to the remaining HP, not the raw damage)
 * or from damage exactly equal to it (battle_script_commands.c:1884-1891's
 * post-branch `substituteHP == 0` check, which the old code never reached on
 * the `>=` path) -- the machine pushes BattleScript_SubstituteFade via the
 * same `call` shape battleScriptTryCastformDataChangeOpcode.ts uses for
 * BattleScriptPushCursorAndCallback: the pushed cursor is the byte after this
 * opcode's own operand, so `return` pops back to the next instruction.
 * Negative damage (HP gain, Ingrain/Leech
 * Seed's own end-turn ticks -- docs/ingrain-leechseed-wrap-ground-truth.md
 * §2a/§2b) is a plain HP write clamped at maxHP, with none of the positive
 * branch's bide/shellBell/physical-special bookkeeping (source has no such
 * code on this branch at all). Physical/special bookkeeping writes both
 * parallel copies source writes together:
 * gSpecialStatuses[battler].{physicalDmg,specialDmg} (added for Cmd_moveend's
 * Rage/Defrost, cleared every action) and gProtectStructs[battler].
 * {physicalDmg,specialDmg,physicalBattlerId,specialBattlerId} (Counter/
 * Mirror Coat's own attacker attribution, modeled as protectPhysicalDmg/
 * protectPhysicalBattlerId/protectSpecialDmg/protectSpecialBattlerId,
 * cleared once per turn -- docs/counter-retaliation-design.md §1.2/§2.3
 * explains why these cannot share a field despite the identical value),
 * Shell Bell's first non-passive damage receipt is stored in parallel with
 * those damage trackers (`battle_script_commands.c:1932-1933`). The real
 * (non-substitute, non-negative-damage) HP
 * write also lands in the party slice at this battler's own side/partyIndex
 * (docs/faint-outcome-ground-truth.md §3.2's sync point), keeping
 * Cmd_checkteamslost's party-wide sum consistent with the hit chain's own
 * mutations without a second write-through mechanism.
 */
function createDatahpupdateOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;

    if ((rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    const resolved = resolveHitChainBattlerOperand(context, rulesContext);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        `Cmd_datahpupdate's GetBattlerForBattleScript selector `
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
        "battle_script_commands.c",
        1864,
      );
    }
    const battler = resolved;
    const isTargetOperand = context.instruction.operands[0]!.expression === "BS_TARGET";
    const battlerState = rulesContext.battlers[battler];
    const damage = rulesContext.battleMoveDamage;

    const substituteActive = (battlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0
      && battlerState.substituteHP !== 0
      && (rulesContext.hitMarker & HITMARKER_IGNORE_SUBSTITUTE) === 0;

    if (substituteActive) {
      const remaining = battlerState.substituteHP;
      // Source clamps both gHpDealt and shellBellDmg to the REMAINING HP when
      // damage exceeds it (:1875-1882); min() is the exact encoding of both
      // branches (`remaining >= damage` keeps the full damage, otherwise the
      // remaining HP).
      const hpDealt = Math.min(damage, remaining);
      const shellBellDmg = battlerState.specialStatus.shellBellDmg === 0
        ? hpDealt
        : battlerState.specialStatus.shellBellDmg;
      const substituteHP = remaining > damage ? remaining - damage : 0;
      const nextRulesContext = withBattler(rulesContext, battler, {
        substituteHP,
        specialStatus: Object.freeze({ ...battlerState.specialStatus, shellBellDmg }),
      });
      if (substituteHP !== 0) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          { rulesContext: Object.freeze({ ...nextRulesContext, hpDealt }) },
        );
      }
      // Substitute fades (:1884-1891): gBattlescriptCurrInstr += 2;
      // BattleScriptPushCursor(); gBattlescriptCurrInstr =
      // BattleScript_SubstituteFade. Modeled as the machine's `call`, exactly
      // the way battleScriptTryCastformDataChangeOpcode.ts models
      // BattleScriptPushCursorAndCallback: the pushed cursor is the byte after
      // this opcode's own operand, i.e. the next instruction, and the fade
      // script's own `return` pops back to it.
      const fade = resolveBattleScriptLabel(context.program, "BattleScript_SubstituteFade");
      if (!fade) {
        throw new Error("Cmd_datahpupdate: unresolved BattleScript_SubstituteFade label");
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter: fade.programCounter }),
        { rulesContext: Object.freeze({ ...nextRulesContext, hpDealt }) },
      );
    }

    if (damage < 0) {
      // Negative damage is HP gain (:1899-1903) -- no bide/shellBell/physical-special
      // bookkeeping on this branch at all in source, just the HP write itself,
      // clamped at maxHP (docs/ingrain-leechseed-wrap-ground-truth.md §2a/§2b).
      const currentHp = battlerState.hp;
      const healedHp = Math.min(currentHp - damage, battlerState.maxHP);
      const nextHitMarker = (rulesContext.hitMarker & ~HITMARKER_PASSIVE_HP_UPDATE) >>> 0;
      const nextRulesContext = withBattler(
        Object.freeze({
          ...rulesContext,
          hitMarker: nextHitMarker,
          party: withBattleScriptPartyMemberHp(rulesContext.party, battlerState.side, battlerState.partyIndex, healedHp),
        }),
        battler,
        { hp: healedHp },
      );
      const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: nextRulesContext,
          scheduler,
          events: Object.freeze([Object.freeze({ kind: "hp-change" as const, battler, from: currentHp, to: healedHp })]),
        },
      );
    }

    let hitMarker = rulesContext.hitMarker;
    const ignoreBide = (hitMarker & HITMARKER_IGNORE_BIDE) !== 0;
    if (ignoreBide) {
      hitMarker = (hitMarker & ~HITMARKER_IGNORE_BIDE) >>> 0;
    }
    let bideDmg = rulesContext.bideDmg;
    let bideTarget = rulesContext.bideTarget;
    if (!ignoreBide) {
      bideDmg = bideDmg.map((value, index) => (index === battler ? value + damage : value)) as unknown as typeof bideDmg;
      const bideSource = isTargetOperand
        ? requireBattlerRole(rulesContext, "attacker")
        : requireBattlerRole(rulesContext, "target");
      bideTarget = bideTarget.map((value, index) => (index === battler ? bideSource : value)) as unknown as
        typeof bideTarget;
    }

    const currentHp = battlerState.hp;
    const dealt = currentHp > damage ? damage : currentHp;
    const nextHp = currentHp > damage ? currentHp - damage : 0;

    const noPassiveUpdate = (hitMarker & HITMARKER_PASSIVE_HP_UPDATE) === 0;
    let battlerChanges: Partial<BattleScriptRulesBattlerState> = { hp: nextHp };
    if (noPassiveUpdate) {
      const moveType = resolveMoveTypeName(rulesContext, rulesContext.currentMove);
      const physical = isTypePhysical(moveType);
      const retaliationBattlerId = isTargetOperand
        ? requireBattlerRole(rulesContext, "attacker")
        : requireBattlerRole(rulesContext, "target");
      battlerChanges = {
        ...battlerChanges,
        specialStatus: physical
          ? Object.freeze({
            ...battlerState.specialStatus,
            physicalDmg: dealt,
            shellBellDmg: battlerState.specialStatus.shellBellDmg === 0
              ? dealt
              : battlerState.specialStatus.shellBellDmg,
          })
          : Object.freeze({
            ...battlerState.specialStatus,
            specialDmg: dealt,
            shellBellDmg: battlerState.specialStatus.shellBellDmg === 0
              ? dealt
              : battlerState.specialStatus.shellBellDmg,
          }),
        ...(physical
          ? { protectPhysicalDmg: dealt, protectPhysicalBattlerId: retaliationBattlerId }
          : { protectSpecialDmg: dealt, protectSpecialBattlerId: retaliationBattlerId }),
      };
    }
    hitMarker = (hitMarker & ~HITMARKER_PASSIVE_HP_UPDATE) >>> 0;

    const nextRulesContext = withBattler(
      Object.freeze({
        ...rulesContext,
        hitMarker,
        hpDealt: dealt,
        bideDmg,
        bideTarget,
        party: withBattleScriptPartyMemberHp(
          rulesContext.party,
          battlerState.side,
          battlerState.partyIndex,
          nextHp,
        ),
      }),
      battler,
      battlerChanges,
    );

    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRulesContext,
        scheduler,
        events: Object.freeze([Object.freeze({ kind: "hp-change" as const, battler, from: currentHp, to: nextHp })]),
      },
    );
  };
}

/** Cmd_critmessage (battle_script_commands.c:1988-1999). */
function createCritmessageOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const shouldPrint = rulesContext.critMultiplier === 2
      && (rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) === 0;
    if (!shouldPrint) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }
    const message = prepareMessage(context, stringOperand("STRINGID_CRITICALHIT", 1994));
    if (message === null) return blockOnUnavailableMessage(context, "STRINGID_CRITICALHIT");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
    );
  };
}

type ResultMessageOutcome =
  | Readonly<{ kind: "string"; stringId: string }>
  | Readonly<{ kind: "jump"; label: string; clearMask: number; recordTargetItem?: boolean }>
  | Readonly<{ kind: "none" }>;

/**
 * Cmd_resultmessage's stringId selection (battle_script_commands.c:2063-2128):
 * a switch on exact single-flag values, falling to a default if-chain of bit
 * tests when the flags don't exactly match one case (both phases modeled
 * here, in the source's own priority order). The exact-match
 * MOVE_RESULT_ONE_HIT_KO case is a plain `STRINGID_ONEHITKO` print (source
 * never pushes a cursor here, unlike its combined-bits sibling below) --
 * now that Cmd_tryKO/EFFECT_OHKO are registered (this step), this is a real
 * reachable case. HUNG_ON records the target's held item, clears the two
 * survival flags, and call-current transfers to BattleScript_FocusBandActivates.
 */
function classifyResultMessage(resultBits: number): ResultMessageOutcome {
  switch (resultBits) {
    case MOVE_RESULT_SUPER_EFFECTIVE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_SUPEREFFECTIVE" });
    case MOVE_RESULT_NOT_VERY_EFFECTIVE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_NOTVERYEFFECTIVE" });
    case MOVE_RESULT_ONE_HIT_KO:
      return Object.freeze({ kind: "string", stringId: "STRINGID_ONEHITKO" });
    case MOVE_RESULT_FOE_ENDURED:
      return Object.freeze({ kind: "string", stringId: "STRINGID_PKMNENDUREDHIT" });
    case BATTLE_SCRIPT_MOVE_RESULT_FAILED:
      return Object.freeze({ kind: "string", stringId: "STRINGID_BUTITFAILED" });
    case MOVE_RESULT_DOESNT_AFFECT_FOE:
      return Object.freeze({ kind: "string", stringId: "STRINGID_ITDOESNTAFFECT" });
    case MOVE_RESULT_FOE_HUNG_ON:
      return Object.freeze({
        kind: "jump",
        label: "BattleScript_FocusBandActivates",
        clearMask: (MOVE_RESULT_FOE_ENDURED | MOVE_RESULT_FOE_HUNG_ON) >>> 0,
        recordTargetItem: true,
      });
    default:
      if ((resultBits & MOVE_RESULT_DOESNT_AFFECT_FOE) !== 0) {
        return Object.freeze({ kind: "string", stringId: "STRINGID_ITDOESNTAFFECT" });
      }
      if ((resultBits & MOVE_RESULT_ONE_HIT_KO) !== 0) {
        return Object.freeze({
          kind: "jump",
          label: "BattleScript_OneHitKOMsg",
          clearMask: (MOVE_RESULT_ONE_HIT_KO | MOVE_RESULT_SUPER_EFFECTIVE | MOVE_RESULT_NOT_VERY_EFFECTIVE) >>> 0,
        });
      }
      if ((resultBits & MOVE_RESULT_FOE_ENDURED) !== 0) {
        return Object.freeze({
          kind: "jump",
          label: "BattleScript_EnduredMsg",
          clearMask: (MOVE_RESULT_FOE_ENDURED | MOVE_RESULT_FOE_HUNG_ON) >>> 0,
        });
      }
      if ((resultBits & MOVE_RESULT_FOE_HUNG_ON) !== 0) {
        return Object.freeze({
          kind: "jump",
          label: "BattleScript_FocusBandActivates",
          clearMask: (MOVE_RESULT_FOE_ENDURED | MOVE_RESULT_FOE_HUNG_ON) >>> 0,
          recordTargetItem: true,
        });
      }
      if ((resultBits & BATTLE_SCRIPT_MOVE_RESULT_FAILED) !== 0) {
        return Object.freeze({ kind: "string", stringId: "STRINGID_BUTITFAILED" });
      }
      return Object.freeze({ kind: "none" });
  }
}

/**
 * Cmd_resultmessage (battle_script_commands.c:2048-2135). The FOE_ENDURED
 * combo jump uses BattleScriptPushCursor (call-current, resume AT this same
 * instruction) -- BattleScript_EnduredMsg's own `return` re-enters
 * resultmessage with the ENDURED/HUNG_ON bits already cleared, so a combo
 * like SUPER_EFFECTIVE|FOE_ENDURED correctly prints the endured message first
 * and then re-evaluates to STRINGID_SUPEREFFECTIVE on re-entry, exactly like
 * the source.
 */
function createResultmessageOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const flags = rulesContext.moveResultFlags;
    const missed = (flags & BATTLE_SCRIPT_MOVE_RESULT_MISSED) !== 0;
    const showMiss = missed
      && ((flags & MOVE_RESULT_DOESNT_AFFECT_FOE) === 0 || rulesContext.missType > B_MSG_AVOIDED_ATK);

    if (showMiss) {
      const stringId = MISS_STRING_ID_BY_TYPE[rulesContext.missType];
      if (!stringId) throw new Error(`resultmessage: missType ${rulesContext.missType} has no gMissStringIds entry`);
      const message = prepareMessage(context, stringOperand(stringId, 2057));
      if (message === null) return blockOnUnavailableMessage(context, stringId);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
      );
    }

    const resultBits = (flags & ~BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0;
    const outcome = classifyResultMessage(resultBits);

    if (outcome.kind === "jump") {
      const target = resolveBattleScriptLabel(context.program, outcome.label);
      if (!target) throw new Error(`resultmessage: committed program has no label ${outcome.label}`);
      const targetBattler = outcome.recordTargetItem
        ? rulesContext.battlers[requireBattlerRole(rulesContext, "target")]
        : null;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call-current", programCounter: target.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            moveResultFlags: (flags & ~outcome.clearMask) >>> 0,
            ...(targetBattler === null ? {} : { lastUsedItem: targetBattler.item }),
          }),
        },
      );
    }
    if (outcome.kind === "none") {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: false }) },
      );
    }
    const message = prepareMessage(context, stringOperand(outcome.stringId, 2131));
    if (message === null) return blockOnUnavailableMessage(context, outcome.stringId);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }), events: Object.freeze([message]) },
    );
  };
}

export function isBattlerOfType(battlerState: BattleScriptRulesBattlerState, typeName: string): boolean {
  return battlerState.types[0] === typeName || battlerState.types[1] === typeName;
}

/**
 * WEATHER_HAS_EFFECT (include/battle_util.h:47): AbilityBattleEffects
 * (ABILITYEFFECT_CHECK_ON_FIELD, ...) for both Cloud Nine and Air Lock,
 * battle_util.c:3140-3149 -- alive battlers only, same on-field ability scan
 * shape as Cmd_ppreduce's already-ported Pressure count (RUNG 1).
 */
function weatherHasEffect(rulesContext: BattleScriptRulesContext): boolean {
  const { battlersCount } = rulesContext.battleTopology;
  for (let i = 0; i < battlersCount; i += 1) {
    const candidate = rulesContext.battlers[i as BattleScriptBattlerId];
    if (candidate.hp !== 0 && (candidate.ability === ABILITY_CLOUD_NINE || candidate.ability === ABILITY_AIR_LOCK)) {
      return false;
    }
  }
  return true;
}

/**
 * WEATHER_HAS_EFFECT2 (include/battle_util.h:48) deliberately uses
 * ABILITYEFFECT_FIELD_SPORT rather than ABILITYEFFECT_CHECK_ON_FIELD.
 * battle_util.c:3111-3138's default ability scan checks every gBattleMons
 * slot below gBattlersCount without the latter case's hp != 0 predicate.
 */
function weatherHasEffectForBaseDamage(rulesContext: BattleScriptRulesContext): boolean {
  const { battlersCount } = rulesContext.battleTopology;
  for (let i = 0; i < battlersCount; i += 1) {
    const ability = rulesContext.battlers[i as BattleScriptBattlerId].ability;
    if (ability === ABILITY_CLOUD_NINE || ability === ABILITY_AIR_LOCK) return false;
  }
  return true;
}

function resolveRequiredLabelProgramCounter(program: BattleScriptProgram, label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`SetMoveEffect: committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

const ITEM_NONE = 0;
const ITEM_ORANGE_MAIL = 121;
const ITEM_RETRO_MAIL = 132;
const ABILITY_STICKY_HOLD = 60;
const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_EREADER_TRAINER = 1 << 11;
const BATTLE_TYPE_BATTLE_TOWER = 1 << 8;
const BATTLE_TYPE_DOME = 1 << 16;
const BATTLE_TYPE_PALACE = 1 << 17;
const BATTLE_TYPE_ARENA = 1 << 18;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_PIKE = 1 << 20;
const BATTLE_TYPE_PYRAMID = 1 << 21;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const BATTLE_TYPE_TRAINER_HILL = 1 << 26;
const BATTLE_TYPE_SECRET_BASE = 1 << 27;
const BATTLE_TYPE_FRONTIER = (
  BATTLE_TYPE_BATTLE_TOWER
  | BATTLE_TYPE_DOME
  | BATTLE_TYPE_PALACE
  | BATTLE_TYPE_ARENA
  | BATTLE_TYPE_FACTORY
  | BATTLE_TYPE_PIKE
  | BATTLE_TYPE_PYRAMID
);
const ITEM_STEAL_ALLOWED_SPECIAL_BATTLES = (
  BATTLE_TYPE_EREADER_TRAINER
  | BATTLE_TYPE_FRONTIER
  | BATTLE_TYPE_LINK
  | BATTLE_TYPE_RECORDED_LINK
  | BATTLE_TYPE_SECRET_BASE
);

function isMail(item: number): boolean {
  return item >= ITEM_ORANGE_MAIL && item <= ITEM_RETRO_MAIL;
}

function replaceMoveEndHalfword(
  values: BattleScriptMoveEndHalfwords,
  battler: BattleScriptBattlerId,
  value: number,
): BattleScriptMoveEndHalfwords {
  return Object.freeze(values.map((candidate, index) =>
    index === battler ? value : candidate
  )) as unknown as BattleScriptMoveEndHalfwords;
}

/**
 * SetMoveEffect (battle_script_commands.c:2234-2521), narrowed to
 * Cmd_seteffectwithchance's own call site: both of its dispatch sites always
 * call `SetMoveEffect(FALSE, ...)`, so the source's `primary===TRUE` arms
 * (reachable only from the still-unregistered Cmd_seteffectprimary) never
 * apply here. `certain` is MOVE_EFFECT_CERTAIN, already resolved by the
 * caller from either the byte's own top bit or `percentChance >= 100`
 * (docs/set-move-effect-ground-truth.md). Only the family-A (status1-write)
 * range `effectByte <= PRIMARY_STATUS_MOVE_EFFECT` is handled; family B
 * (status2/misc, `effectByte > 6`) and the two family-A members unreachable
 * via this call site (SLEEP/TOXIC -- their own scripts use
 * Cmd_seteffectprimary instead) stay named (b) barriers.
 */
function applySetMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  rawEffectByte: number,
  primary: boolean,
  certain: boolean,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const affectsUser = (rawEffectByte & MOVE_EFFECT_AFFECTS_USER) !== 0;
  const effectByte = affectsUser ? (rawEffectByte & ~MOVE_EFFECT_AFFECTS_USER) >>> 0 : rawEffectByte;
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const target = requireBattlerRole(rulesContext, "target");
  const effectBattler = affectsUser ? attacker : target;
  const scriptingBattler = affectsUser ? target : attacker;

  const baseRulesContext = Object.freeze({
    ...rulesContext,
    selectorRoles: Object.freeze({ ...rulesContext.selectorRoles, effectBattler }),
    scriptingBattler,
  });
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  const hitMarker = baseRulesContext.hitMarker;
  const abilityEffectHitmarkerSet = (hitMarker & HITMARKER_STATUS_ABILITY_EFFECT) !== 0;

  const passThrough = () => transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: baseRulesContext },
  );

  // Shield Dust (:2253-2255) -- dead on the primary path (Cmd_seteffectprimary
  // always passes primary=TRUE); only Cmd_seteffectwithchance's secondary-effect
  // callers (primary=FALSE) can still hit this early-out.
  if (effectBattlerState.ability === ABILITY_SHIELD_DUST && !abilityEffectHitmarkerSet && !primary && effectByte <= 9) {
    return passThrough();
  }
  // Safeguard (:2257-2259) -- same primary-path dead-code shape. This cluster's
  // own Safeguard gate is each script's own jumpifsideaffecting call, which
  // already ran before seteffectprimary; see createJumpifsideaffectingOpcodeHandler.
  if (
    (baseRulesContext.sideStatuses[effectBattlerState.side] & SIDE_STATUS_SAFEGUARD) !== 0
    && !abilityEffectHitmarkerSet
    && !primary
    && effectByte <= 7
  ) {
    return passThrough();
  }
  // Target at 0 HP (:2261-2264) -- the quartet's bytes (2-5) never equal
  // MOVE_EFFECT_PAYDAY(11)/STEAL_ITEM(31), so source's exclusion for those
  // two never applies here.
  if (
    effectBattlerState.hp === 0
    && effectByte !== MOVE_EFFECT_PAYDAY
    && effectByte !== MOVE_EFFECT_STEAL_ITEM
  ) {
    return passThrough();
  }
  // Substitute (:2266-2267).
  if ((effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0 && !affectsUser) {
    return passThrough();
  }

  if (effectByte > PRIMARY_STATUS_MOVE_EFFECT) {
    if (effectByte === MOVE_EFFECT_CONFUSION) {
      return applyConfusionMoveEffect(context, baseRulesContext, effectBattler);
    }
    if (effectByte === MOVE_EFFECT_FLINCH) {
      return applyFlinchMoveEffect(context, baseRulesContext, effectBattler, certain);
    }
    if (effectByte === MOVE_EFFECT_TRI_ATTACK) {
      if (effectBattlerState.status1 !== 0) return passThrough();
      const { rng, randomValue } = drawBattleScriptRng(
        context.state.rng,
        context.instruction,
        "SetMoveEffect Tri Attack status selector (Random() % 3 + 3)",
      );
      const recursiveContext = Object.freeze({
        ...context,
        state: Object.freeze({ ...context.state, rng }),
      });
      return applySetMoveEffect(
        recursiveContext,
        baseRulesContext,
        (randomValue % 3) + MOVE_EFFECT_BURN,
        false,
        false,
      );
    }
    if (effectByte === MOVE_EFFECT_UPROAR) {
      if ((effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR) !== 0) {
        return passThrough();
      }
      const { rng, randomValue } = drawBattleScriptRng(
        context.state.rng,
        context.instruction,
        "SetMoveEffect Uproar duration ((Random() & 3) + 2)",
      );
      const uproarTurns = (randomValue & 3) + 2;
      const lockedMoves = Object.freeze(
        baseRulesContext.lockedMoves.map((move, index) =>
          index === effectBattler ? baseRulesContext.currentMove : move
        ),
      ) as BattleScriptMoveEndHalfwords;
      const withUproar = withBattler(baseRulesContext, effectBattler, {
        status2: (
          effectBattlerState.status2
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
          | (uproarTurns << 4)
        ) >>> 0,
      });
      const programCounter = resolveRequiredLabelProgramCounter(
        context.program,
        "BattleScript_MoveEffectUproar",
      );
      return transitionBattleScriptCommand(
        Object.freeze({ ...context, state: Object.freeze({ ...context.state, rng }) }),
        Object.freeze({ kind: "call", programCounter }),
        { rulesContext: Object.freeze({ ...withUproar, lockedMoves }) },
      );
    }
    if (effectByte === MOVE_EFFECT_PAYDAY) {
      let paydayMoney = baseRulesContext.paydayMoney;
      if (baseRulesContext.battlers[attacker].side === 0) {
        const next = (paydayMoney + (baseRulesContext.battlers[attacker].level * 5)) & 0xffff;
        paydayMoney = paydayMoney > next ? 0xffff : next;
      }
      const programCounter = resolveRequiredLabelProgramCounter(
        context.program,
        "BattleScript_MoveEffectPayDay",
      );
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        { rulesContext: Object.freeze({ ...baseRulesContext, paydayMoney }) },
      );
    }
    if (effectByte === MOVE_EFFECT_WRAP) {
      return applyWrapMoveEffect(context, baseRulesContext, effectBattler);
    }
    if (effectByte === MOVE_EFFECT_RECOIL_25) {
      const recoilDamage = Math.max(1, Math.trunc(baseRulesContext.hpDealt / 4));
      const programCounter = resolveRequiredLabelProgramCounter(
        context.program,
        "BattleScript_MoveEffectRecoil",
      );
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        {
          rulesContext: Object.freeze({
            ...baseRulesContext,
            battleMoveDamage: recoilDamage,
          }),
        },
      );
    }
    if (effectByte === MOVE_EFFECT_RECOIL_33) {
      // SetMoveEffect, battle_script_commands.c:2843-2850: signed C division
      // truncates toward zero, then the zero result is raised to one.
      const recoilDamage = Math.max(1, Math.trunc(baseRulesContext.hpDealt / 3));
      const programCounter = resolveRequiredLabelProgramCounter(
        context.program,
        "BattleScript_MoveEffectRecoil",
      );
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        {
          rulesContext: Object.freeze({
            ...baseRulesContext,
            battleMoveDamage: recoilDamage,
          }),
        },
      );
    }
    if (effectByte === MOVE_EFFECT_CHARGING) {
      return applyChargingMoveEffect(context, baseRulesContext, effectBattler);
    }
    if (effectByte === MOVE_EFFECT_RECHARGE) {
      if ((effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE) !== 0) {
        return passThrough();
      }
      const lockedMoves = Object.freeze(
        baseRulesContext.lockedMoves.map((move, index) =>
          index === effectBattler ? baseRulesContext.currentMove : move
        ),
      ) as BattleScriptMoveEndHalfwords;
      const nextRulesContext = withBattler(baseRulesContext, effectBattler, {
        status2: (effectBattlerState.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_RECHARGE) >>> 0,
        rechargeTimer: 2,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: Object.freeze({ ...nextRulesContext, lockedMoves }) },
      );
    }
    if (effectByte === MOVE_EFFECT_RAGE) {
      const nextRulesContext = withBattler(baseRulesContext, attacker, {
        status2: (baseRulesContext.battlers[attacker].status2 | STATUS2_RAGE) >>> 0,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_STEAL_ITEM) {
      const flags = baseRulesContext.battleTopology.battleTypeFlags;
      const attackerState = baseRulesContext.battlers[attacker];
      const targetState = baseRulesContext.battlers[target];
      if ((flags & BATTLE_TYPE_TRAINER_HILL) !== 0) return passThrough();
      const regularBattle = (flags & ITEM_STEAL_ALLOWED_SPECIAL_BATTLES) === 0;
      if (attackerState.side === 1 && regularBattle) return passThrough();
      if (
        regularBattle
        && (
          baseRulesContext.knockedOffMons[attackerState.side]
          & (1 << attackerState.partyIndex)
        ) !== 0
      ) {
        return passThrough();
      }
      if (targetState.item !== ITEM_NONE && targetState.ability === ABILITY_STICKY_HOLD) {
        const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_NoItemSteal");
        const revealedRules = recordBattleScriptAbilityReveal(
          Object.freeze({
            ...baseRulesContext,
            lastUsedAbility: ABILITY_STICKY_HOLD,
          }),
          target,
          targetState.ability,
        );
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "call", programCounter }),
          {
            rulesContext: revealedRules,
          },
        );
      }
      if (
        attackerState.item !== ITEM_NONE
        || targetState.item === BATTLE_SCRIPT_ITEM_ENIGMA_BERRY
        || isMail(targetState.item)
        || targetState.item === ITEM_NONE
      ) {
        return passThrough();
      }
      let nextRules = withBattler(baseRulesContext, target, { item: ITEM_NONE });
      const stolenItem = targetState.item;
      let party = withBattleScriptPartyMemberItem(
        nextRules.party,
        attackerState.side,
        attackerState.partyIndex,
        stolenItem,
      );
      party = withBattleScriptPartyMemberItem(
        party,
        targetState.side,
        targetState.partyIndex,
        ITEM_NONE,
      );
      nextRules = Object.freeze({
        ...nextRules,
        party,
        lastUsedItem: stolenItem,
        changedItems: replaceMoveEndHalfword(nextRules.changedItems, attacker, stolenItem),
        choicedMove: replaceMoveEndHalfword(nextRules.choicedMove, target, 0),
      });
      let scheduler = markBattleScriptControllerPending(context.state.scheduler, attacker);
      scheduler = markBattleScriptControllerPending(scheduler, target);
      const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_ItemSteal");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        {
          rulesContext: nextRules,
          scheduler,
          events: Object.freeze([
            Object.freeze({ kind: "set-battler-item" as const, battler: attacker, item: stolenItem }),
            Object.freeze({ kind: "set-battler-item" as const, battler: target, item: ITEM_NONE }),
          ]),
        },
      );
    }
    if (effectByte === MOVE_EFFECT_PREVENT_ESCAPE) {
      const nextRulesContext = withBattler(baseRulesContext, target, {
        status2: (
          baseRulesContext.battlers[target].status2
          | STATUS2_ESCAPE_PREVENTION
        ) >>> 0,
        battlerPreventingEscape: attacker,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_NIGHTMARE) {
      const nextRulesContext = withBattler(baseRulesContext, target, {
        status2: (
          baseRulesContext.battlers[target].status2
          | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_NIGHTMARE
        ) >>> 0,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_ALL_STATS_UP) {
      const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_AllStatsUp");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        { rulesContext: baseRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_RAPIDSPIN) {
      const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_RapidSpinAway");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        { rulesContext: baseRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_REMOVE_PARALYSIS) {
      const targetState = baseRulesContext.battlers[target];
      if ((targetState.status1 & STATUS1_PARALYSIS) === 0) return passThrough();
      const newStatus1 = (targetState.status1 & ~STATUS1_PARALYSIS) >>> 0;
      const updatedContext = withBattler(baseRulesContext, target, { status1: newStatus1 });
      const nextRulesContext = Object.freeze({
        ...updatedContext,
        party: withBattleScriptPartyMemberStatus1(
          updatedContext.party,
          targetState.side,
          targetState.partyIndex,
          newStatus1,
        ),
      });
      const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_TargetPRLZHeal");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        {
          rulesContext: nextRulesContext,
          events: Object.freeze([
            Object.freeze({ kind: "set-battler-status-data" as const, battler: target, status1: newStatus1 }),
          ]),
        },
      );
    }
    if (effectByte === MOVE_EFFECT_ATK_DEF_DOWN || effectByte === MOVE_EFFECT_SP_ATK_TWO_DOWN) {
      const label = effectByte === MOVE_EFFECT_ATK_DEF_DOWN
        ? "BattleScript_AtkDefDown"
        : "BattleScript_SAtkDown2";
      const programCounter = resolveRequiredLabelProgramCounter(context.program, label);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        { rulesContext: baseRulesContext },
      );
    }
    if (effectByte === MOVE_EFFECT_THRASH) {
      return applyThrashMoveEffect(context, baseRulesContext, effectBattler);
    }
    if (effectByte === MOVE_EFFECT_KNOCK_OFF) {
      const targetState = baseRulesContext.battlers[effectBattler];
      if (targetState.ability === ABILITY_STICKY_HOLD) {
        if (targetState.item === ITEM_NONE) return passThrough();
        const programCounter = resolveRequiredLabelProgramCounter(
          context.program,
          "BattleScript_StickyHoldActivates",
        );
        const revealedRules = recordBattleScriptAbilityReveal(
          Object.freeze({
            ...baseRulesContext,
            lastUsedAbility: ABILITY_STICKY_HOLD,
          }),
          effectBattler,
          targetState.ability,
        );
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "jump", programCounter }),
          {
            rulesContext: revealedRules,
          },
        );
      }
      if (targetState.item === ITEM_NONE) return passThrough();
      const side = targetState.side;
      const knockedOffMons = Object.freeze(
        baseRulesContext.knockedOffMons.map((mask, index) =>
          index === side ? (mask | (1 << targetState.partyIndex)) : mask
        ),
      ) as readonly [number, number];
      const nextRules = withBattler(baseRulesContext, effectBattler, { item: ITEM_NONE });
      const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_KnockedOff");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call", programCounter }),
        {
          rulesContext: Object.freeze({
            ...nextRules,
            lastUsedItem: targetState.item,
            knockedOffMons,
            choicedMove: replaceMoveEndHalfword(nextRules.choicedMove, effectBattler, 0),
          }),
        },
      );
    }
    const statEntry = STAT_MOVE_EFFECT_TABLE[effectByte];
    if (statEntry) {
      return applyStatMoveEffect(context, baseRulesContext, effectByte, statEntry, affectsUser, attacker, target);
    }
    return unsupportedBranch(
      context,
      `SetMoveEffect's MOVE_EFFECT_BYTE ${effectByte} is in the status2/misc family `
        + "(effectByte > PRIMARY_STATUS_MOVE_EFFECT), not modeled",
      "battle_script_commands.c",
      2522,
    );
  }
  if (effectByte === 0) {
    // sStatusFlagsForMoveEffects[0] matches no switch case (:2271-2475) -- statusChanged
    // stays FALSE, the real function falls straight through to the no-op tail.
    return passThrough();
  }

  function preventionCall(
    label: string,
    withMessageChoice: boolean,
    abilityId?: number,
  ): BattleScriptCommandTransition<BattleScriptRulesContext> {
    const multistringChooser = withMessageChoice
      ? (abilityEffectHitmarkerSet ? B_MSG_ABILITY_PREVENTS_ABILITY_STATUS : B_MSG_ABILITY_PREVENTS_MOVE_STATUS)
      : B_MSG_STATUS_HAD_NO_EFFECT;
    const nextHitMarker = withMessageChoice && abilityEffectHitmarkerSet
      ? (hitMarker & ~HITMARKER_STATUS_ABILITY_EFFECT) >>> 0
      : hitMarker;
    let nextRulesContext: BattleScriptRulesContext = Object.freeze({
      ...baseRulesContext,
      hitMarker: nextHitMarker,
      multistringChooser,
      ...(abilityId === undefined ? {} : { lastUsedAbility: abilityId }),
    });
    if (abilityId !== undefined) {
      nextRulesContext = recordBattleScriptAbilityReveal(
        nextRulesContext,
        effectBattler,
        abilityId,
      );
    }
    const programCounter = resolveRequiredLabelProgramCounter(context.program, label);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call", programCounter }),
      { rulesContext: nextRulesContext },
    );
  }

  let statusChanged: boolean;
  switch (effectByte) {
    case MOVE_EFFECT_SLEEP: {
      // (:2274-2298) -- uproar check (skipped entirely if the sleeping
      // candidate itself has Soundproof), then status1/ability re-checks.
      // Provably dead on this cluster's only real topology (each of the five
      // scripts' own jumpifcantmakeasleep/jumpifstatus already filtered these
      // cases before seteffectprimary ever runs) -- ported anyway for
      // SetMoveEffect fidelity, matching every other family-A case's full
      // port. The success path shares source CancelMultiTurnMoves with Freeze;
      // finishStatusWrite applies that full reducer before writing status1.
      let uproarActive = false;
      if (effectBattlerState.ability !== ABILITY_SOUNDPROOF) {
        const { battlersCount } = baseRulesContext.battleTopology;
        for (let i = 0; i < battlersCount; i += 1) {
          if ((baseRulesContext.battlers[i as BattleScriptBattlerId].status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_UPROAR) !== 0) {
            uproarActive = true;
            break;
          }
        }
      }
      statusChanged = !(
        effectBattlerState.status1 !== 0
        || uproarActive
        || effectBattlerState.ability === ABILITY_VITAL_SPIRIT
        || effectBattlerState.ability === ABILITY_INSOMNIA
      );
      break;
    }
    case MOVE_EFFECT_POISON: {
      if (effectBattlerState.ability === ABILITY_IMMUNITY && (primary || certain)) {
        return preventionCall("BattleScript_PSNPrevention", true, ABILITY_IMMUNITY);
      }
      if (
        (isBattlerOfType(effectBattlerState, "TYPE_POISON") || isBattlerOfType(effectBattlerState, "TYPE_STEEL"))
        && abilityEffectHitmarkerSet
        && (primary || certain)
      ) {
        return preventionCall("BattleScript_PSNPrevention", false);
      }
      statusChanged = !(
        isBattlerOfType(effectBattlerState, "TYPE_POISON")
        || isBattlerOfType(effectBattlerState, "TYPE_STEEL")
        || effectBattlerState.status1 !== 0
        || effectBattlerState.ability === ABILITY_IMMUNITY
      );
      break;
    }
    case MOVE_EFFECT_BURN: {
      if (effectBattlerState.ability === ABILITY_WATER_VEIL && (primary || certain)) {
        return preventionCall("BattleScript_BRNPrevention", true, ABILITY_WATER_VEIL);
      }
      if (isBattlerOfType(effectBattlerState, "TYPE_FIRE") && abilityEffectHitmarkerSet && (primary || certain)) {
        return preventionCall("BattleScript_BRNPrevention", false);
      }
      statusChanged = !(
        isBattlerOfType(effectBattlerState, "TYPE_FIRE")
        || effectBattlerState.ability === ABILITY_WATER_VEIL
        || effectBattlerState.status1 !== 0
      );
      break;
    }
    case MOVE_EFFECT_FREEZE: {
      const noSunCanFreeze = !(weatherHasEffect(baseRulesContext) && (baseRulesContext.weather & B_WEATHER_SUN) !== 0);
      statusChanged = !(
        isBattlerOfType(effectBattlerState, "TYPE_ICE")
        || effectBattlerState.status1 !== 0
        || !noSunCanFreeze
        || effectBattlerState.ability === ABILITY_MAGMA_ARMOR
      );
      break;
    }
    case MOVE_EFFECT_PARALYSIS: {
      if (effectBattlerState.ability === ABILITY_LIMBER) {
        if (primary || certain) {
          return preventionCall("BattleScript_PRLZPrevention", true, ABILITY_LIMBER);
        }
        statusChanged = false;
      } else {
        statusChanged = effectBattlerState.status1 === 0;
      }
      break;
    }
    case MOVE_EFFECT_TOXIC: {
      if (effectBattlerState.ability === ABILITY_IMMUNITY && (primary || certain)) {
        return preventionCall("BattleScript_PSNPrevention", true, ABILITY_IMMUNITY);
      }
      if (
        (isBattlerOfType(effectBattlerState, "TYPE_POISON") || isBattlerOfType(effectBattlerState, "TYPE_STEEL"))
        && abilityEffectHitmarkerSet
        && (primary || certain)
      ) {
        return preventionCall("BattleScript_PSNPrevention", false);
      }
      if (effectBattlerState.status1 !== 0) {
        statusChanged = false;
        break;
      }
      if (isBattlerOfType(effectBattlerState, "TYPE_POISON") || isBattlerOfType(effectBattlerState, "TYPE_STEEL")) {
        // (:2477-2480) gMoveResultFlags |= MOVE_RESULT_DOESNT_AFFECT_FOE, no
        // status1 write. Provably dead here -- BattleScript_EffectToxic's own
        // jumpiftype(POISON)/jumpiftype(STEEL) already redirect to
        // BattleScript_NotAffected before seteffectprimary ever runs -- ported
        // for SetMoveEffect fidelity only.
        statusChanged = false;
        break;
      }
      statusChanged = effectBattlerState.ability !== ABILITY_IMMUNITY;
      break;
    }
    default:
      throw new Error(`applySetMoveEffect: unreachable MOVE_EFFECT_BYTE ${effectByte}`);
  }

  if (!statusChanged) return passThrough();

  const multistringChooser = abilityEffectHitmarkerSet ? B_MSG_STATUSED_BY_ABILITY : B_MSG_STATUSED;
  const nextHitMarker = abilityEffectHitmarkerSet ? (hitMarker & ~HITMARKER_STATUS_ABILITY_EFFECT) >>> 0 : hitMarker;
  const label = MOVE_EFFECT_LABEL_BY_BYTE[effectByte]!;
  const programCounter = resolveRequiredLabelProgramCounter(context.program, label);

  function finishStatusWrite(
    newStatus1: number,
    rng?: BattleScriptRngState,
  ): BattleScriptCommandTransition<BattleScriptRulesContext> {
    const statusWriteBase = effectByte === MOVE_EFFECT_SLEEP || effectByte === MOVE_EFFECT_FREEZE
      ? cancelBattleScriptMultiTurnMoves(baseRulesContext, effectBattler).rulesContext
      : baseRulesContext;
    const updatedContext = withBattler(statusWriteBase, effectBattler, { status1: newStatus1 });
    const synchronizable = effectByte === MOVE_EFFECT_POISON
      || effectByte === MOVE_EFFECT_TOXIC
      || effectByte === MOVE_EFFECT_PARALYSIS
      || effectByte === MOVE_EFFECT_BURN;
    const finalRulesContext = Object.freeze({
      ...updatedContext,
      hitMarker: synchronizable
        ? (nextHitMarker | HITMARKER_SYNCHRONIZE_EFFECT) >>> 0
        : nextHitMarker,
      synchronizeMoveEffect: synchronizable
        ? effectByte
        : updatedContext.synchronizeMoveEffect,
      multistringChooser,
      party: withBattleScriptPartyMemberStatus1(
        updatedContext.party,
        effectBattlerState.side,
        effectBattlerState.partyIndex,
        newStatus1,
      ),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call", programCounter }),
      {
        rulesContext: finalRulesContext,
        ...(rng === undefined ? {} : { rng }),
        events: Object.freeze([
          Object.freeze({ kind: "set-battler-status-data" as const, battler: effectBattler, status1: newStatus1 }),
        ]),
      },
    );
  }

  if (effectByte === MOVE_EFFECT_SLEEP) {
    // (:2480-2482) STATUS1_SLEEP_TURN((Random() & 3) + 2) -- the raw status1
    // byte IS the turn counter (battle.h:116), not a fixed bit OR'd in like
    // every other family-A member.
    const { rng, randomValue } = drawBattleScriptRng(
      context.state.rng,
      context.instruction,
      "SetMoveEffect sleep duration ((Random() & 3) + 2)",
    );
    const sleepTurns = (randomValue & 3) + 2;
    const newStatus1 = (effectBattlerState.status1 | sleepTurns) >>> 0;
    return finishStatusWrite(newStatus1, rng);
  }

  const statusBit = STATUS1_BIT_BY_MOVE_EFFECT_BYTE[effectByte]!;
  const newStatus1 = (effectBattlerState.status1 | statusBit) >>> 0;
  return finishStatusWrite(newStatus1);
}

export type BattleScriptConfusionStatus2MutationResult = Readonly<{
  rulesContext: BattleScriptRulesContext;
  rng: BattleScriptRngState;
  /** Whether STATUS2_CONFUSION was freshly written (Own Tempo/already-confused both leave this false). */
  confused: boolean;
}>;

/**
 * SetMoveEffect's MOVE_EFFECT_CONFUSION case, state mutation only
 * (battle_script_commands.c:2524,2533-2546 --
 * docs/stat-change-confusion-ground-truth.md S1.6). The shared early-out
 * (`status2 & sStatusFlagsForMoveEffects[byte]`, byte=CONFUSION resolves to
 * the full STATUS2_CONFUSION mask) and the case's own identical `status2 &
 * STATUS2_CONFUSION` recheck are the same test in practice -- this ports
 * them as one combined condition alongside the Own Tempo ability check.
 * Factored out of the script-transition wrapper so `ENDTURN_THRASH`'s own
 * direct `SetMoveEffect(TRUE, 0)` call site (`battle_util.c:1686-1689`,
 * docs/yawn-thrash-endturn-design.md §4, `battleEndTurnOrchestration.ts`'s
 * `runThrashTick`) can reuse the identical state machinery without going
 * through a Battle Script opcode transition.
 */
export function applyConfusionStatus2Mutation(
  rulesContext: BattleScriptRulesContext,
  rng: BattleScriptRngState,
  instruction: BattleScriptInstruction,
  effectBattler: BattleScriptBattlerId,
): BattleScriptConfusionStatus2MutationResult {
  const effectBattlerState = rulesContext.battlers[effectBattler];
  const alreadyConfused = (effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_CONFUSION) !== 0;
  if (effectBattlerState.ability === ABILITY_OWN_TEMPO || alreadyConfused) {
    return Object.freeze({ rulesContext, rng, confused: false });
  }

  const { rng: nextRng, randomValue } = drawBattleScriptRng(
    rng,
    instruction,
    "SetMoveEffect confusion duration ((Random() % 4) + 2)",
  );
  const turns = (randomValue % 4) + 2;
  const nextRulesContext = withBattler(rulesContext, effectBattler, {
    status2: (effectBattlerState.status2 | turns) >>> 0,
  });
  return Object.freeze({ rulesContext: nextRulesContext, rng: nextRng, confused: true });
}

/**
 * Zero new opcodes: all 4 BattleScript_MoveEffectConfusion ops
 * (chosenstatus2animation/printstring/waitmessage/return) are already
 * registered. The only new surface `applyConfusionStatus2Mutation` adds is
 * the `(Random() % 4) + 2` duration draw and the plain status2 write
 * (guaranteed-zero bits per the early-out, so `|=` and `=` are equivalent
 * here).
 */
function applyConfusionMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const mutation = applyConfusionStatus2Mutation(baseRulesContext, context.state.rng, context.instruction, effectBattler);
  if (!mutation.confused) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: mutation.rulesContext },
    );
  }

  const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_MoveEffectConfusion");
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "call", programCounter }),
    { rulesContext: mutation.rulesContext, rng: mutation.rng },
  );
}

/**
 * SetMoveEffect's family-B shared early-out plus its MOVE_EFFECT_FLINCH case
 * (battle_script_commands.c:2524,2547-2567 --
 * docs/set-move-effect-ground-truth.md:94-112). Two independent branches,
 * neither drawing any RNG:
 *
 * - Inner Focus: `certain` (this call site's own resolved MOVE_EFFECT_CERTAIN
 *   -- `primary` is always FALSE here, matching applySetMoveEffect's own
 *   documented scope) makes the ability reveal itself via a direct,
 *   un-pushed jump to BattleScript_FlinchPrevention (source: plain
 *   `gBattlescriptCurrInstr = BattleScript_FlinchPrevention`, no
 *   BattleScriptPush -- that script's own `goto BattleScript_MoveEnd` tail
 *   ends the move entirely, unlike the status1 quartet's push+jump
 *   prevention calls). Otherwise the ability silently blocks with no message
 *   at all (not even the ability reveal).
 * - Otherwise: the plain-case write is gated on the effect battler not
 *   having acted yet this turn (`GetBattlerTurnOrderNum(gEffectBattler) >
 *   gCurrentTurnActionNumber`) -- ported via the two turnOrderNum/
 *   currentTurnActionNumber rules-context fields
 *   (battleScriptRulesContext.ts). Always falls through with
 *   `gBattlescriptCurrInstr++`, whether or not the gate passed -- no script
 *   sub-call either way, matching the doc's "no message ever, just a status2
 *   write" characterization.
 */
function applyFlinchMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
  certain: boolean,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  const alreadyFlinched = (effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED) !== 0;
  if (alreadyFlinched) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: baseRulesContext },
    );
  }

  if (effectBattlerState.ability === ABILITY_INNER_FOCUS) {
    if (!certain) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: baseRulesContext },
      );
    }
    const nextRulesContext = recordBattleScriptAbilityReveal(
      Object.freeze({ ...baseRulesContext, lastUsedAbility: ABILITY_INNER_FOCUS }),
      effectBattler,
      effectBattlerState.ability,
    );
    const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_FlinchPrevention");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter }),
      { rulesContext: nextRulesContext },
    );
  }

  if (!certain) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: applyBattleScriptNonCertainFlinchMoveEffect(
          baseRulesContext,
          effectBattler,
        ),
      },
    );
  }

  const hasNotActedYet = effectBattlerState.turnOrderNum > baseRulesContext.currentTurnActionNumber;
  const nextRulesContext = hasNotActedYet
    ? withBattler(baseRulesContext, effectBattler, {
      status2: (effectBattlerState.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED) >>> 0,
    })
    : baseRulesContext;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext },
  );
}

/**
 * SetMoveEffect(FALSE, 0)'s complete MOVE_EFFECT_FLINCH mutation surface.
 * King's Rock invokes exactly this form synchronously from
 * ItemBattleEffects(ITEMEFFECT_KINGSROCK_SHELLBELL): no script call is
 * retained after BattleScriptPushCursor/SetMoveEffect/BattleScriptPop, and
 * Inner Focus is therefore the silent, non-certain arm.
 *
 * The caller supplies SetMoveEffect's already-resolved gEffectBattler and
 * already-stamped selector/scripting roles. Keeping the common early-outs
 * here is intentional: the ordinary seteffectwithchance path reaches this
 * helper after its shared guards, while King's Rock calls it directly and
 * must still honor Shield Dust, zero HP, Substitute, existing flinch,
 * Inner Focus, and the target-has-not-acted turn-order gate.
 */
export function applyBattleScriptNonCertainFlinchMoveEffect(
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
): BattleScriptRulesContext {
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  const abilityEffectHitmarkerSet =
    (baseRulesContext.hitMarker & HITMARKER_STATUS_ABILITY_EFFECT) !== 0;
  if (
    effectBattlerState.ability === ABILITY_SHIELD_DUST
    && !abilityEffectHitmarkerSet
  ) {
    return baseRulesContext;
  }
  if (effectBattlerState.hp === 0) return baseRulesContext;
  if ((effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_SUBSTITUTE) !== 0) {
    return baseRulesContext;
  }
  if (
    (effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED) !== 0
    || effectBattlerState.ability === ABILITY_INNER_FOCUS
    || effectBattlerState.turnOrderNum <= baseRulesContext.currentTurnActionNumber
  ) {
    return baseRulesContext;
  }
  return withBattler(baseRulesContext, effectBattler, {
    status2: (
      effectBattlerState.status2
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_FLINCHED
    ) >>> 0,
  });
}

/**
 * SetMoveEffect's MOVE_EFFECT_WRAP case (`battle_script_commands.c:2609-2632`,
 * docs/ingrain-leechseed-wrap-ground-truth.md §1c/§5 slice 2). Already-wrapped
 * (re-cast Wrap on an already-trapped target) is a plain skip -- the C source
 * never re-rolls the duration or re-stamps wrappedMove/wrappedBy. Otherwise:
 * draw the `(Random() & 3) + 3` duration (3-6 turns inclusive, confirmed live
 * this doc's own probe), stamp both new struct-identity fields this engine now
 * models (`wrappedMove`/`wrappedBy` -- the second unblocks
 * `Cmd_cleareffectsonfaint`'s own cross-battler clear below), compute
 * `printfromtable gWrappedStringIds`' own index (this move's position in the
 * fixed `gTrappingMoves` list, source's own bounded find-loop -- every real
 * call site is one of the six trapping moves, so the "not found" clamp to
 * index 5 is unreachable here, not silently guessed), and push+jump into
 * `BattleScript_MoveEffectWrap` (printfromtable/waitmessage/return, all
 * already-registered opcodes).
 */
function applyWrapMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  if ((effectBattlerState.status2 & STATUS2_WRAPPED_MASK) !== 0) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: baseRulesContext },
    );
  }

  const attacker = requireBattlerRole(baseRulesContext, "attacker");
  const { rng, randomValue } = drawBattleScriptRng(
    context.state.rng,
    context.instruction,
    "SetMoveEffect Wrap duration ((Random() & 3) + 3)",
  );
  const turns = (randomValue & 3) + 3;
  const updatedContext = withBattler(baseRulesContext, effectBattler, {
    status2: (effectBattlerState.status2 | (turns << 13)) >>> 0,
    wrappedMove: baseRulesContext.currentMove,
    wrappedBy: attacker,
  });
  const chooserIndex = TRAPPING_MOVES.indexOf(baseRulesContext.currentMove);
  const multistringChooser = chooserIndex === -1 ? TRAPPING_MOVES.length - 1 : chooserIndex;
  const nextRulesContext = Object.freeze({ ...updatedContext, multistringChooser });
  const programCounter = resolveRequiredLabelProgramCounter(context.program, "BattleScript_MoveEffectWrap");
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "call", programCounter }),
    { rulesContext: nextRulesContext, rng },
  );
}

/**
 * SetMoveEffect's MOVE_EFFECT_CHARGING case (`battle_script_commands.c:2605-
 * 2610`, docs/semi-invulnerable-registration-scout.md §2d/§5 rung 2). The
 * two-turn-charge start (Razor Wind/Sky Attack/Skull Bash/Solar Beam/
 * semi-invulnerable Fly/Dig/Dive/Bounce), reached via `BattleScriptFirstChargingTurn`'s
 * own unconditional `setmoveeffect MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER`
 * + `seteffectprimary`. `sStatusFlagsForMoveEffects[MOVE_EFFECT_CHARGING] ==
 * STATUS2_MULTIPLETURNS` (`:619`), so the shared family-B early-out
 * (`status2 & sStatusFlagsForMoveEffects[byte]`, `:2523-2524`) is checking
 * "is STATUS2_MULTIPLETURNS already set" -- always false the one time this
 * runs (turn 1, before the bit exists), matching `applyThrashMoveEffect`'s
 * own reasoning for its structurally identical early-out. Draws no RNG and
 * never pushes/jumps to a script -- `SetMoveEffect`'s switch just `break`s
 * for this case, so `"advance"` is correct, not `"call"`.
 *
 * The source also writes `gCurrentMove` to the effect battler's
 * `gLockedMoves` entry. The full-turn adapter consumes that exact move on the
 * next action while preserving the original chosen position as PP owner,
 * which matters when Assist called this charging move from a different slot.
 */
function applyChargingMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  const alreadyCharging = (effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS) !== 0;
  if (alreadyCharging) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: baseRulesContext },
    );
  }

  const withCharging = withBattler(baseRulesContext, effectBattler, {
    status2: (effectBattlerState.status2 | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS) >>> 0,
    chargingTurn: 1,
  });
  const lockedMoves = Object.freeze(
    withCharging.lockedMoves.map((move, index) =>
      index === effectBattler ? baseRulesContext.currentMove : move
    ),
  ) as BattleScriptRulesContext["lockedMoves"];
  const nextRulesContext = Object.freeze({ ...withCharging, lockedMoves });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext },
  );
}

/**
 * SetMoveEffect's MOVE_EFFECT_THRASH case (`battle_script_commands.c:2851-
 * 2860`, docs/yawn-thrash-endturn-design.md §3, Rung 4). Thrash/Outrage/
 * Petal Dance's lock-in start: `sStatusFlagsForMoveEffects[MOVE_EFFECT_THRASH]
 * == STATUS2_LOCK_CONFUSE` (`:624`), so the shared family-B early-out
 * (`status2 & sStatusFlagsForMoveEffects[byte]`, `:2523-2524`) already
 * excludes this case whenever `STATUS2_LOCK_CONFUSE` is set -- the case
 * body's own inner `if (status2 & STATUS2_LOCK_CONFUSE) { instr++; }` can
 * never observe TRUE and is not a second check here, matching
 * `applyFlinchMoveEffect`/`applyWrapMoveEffect`'s own single-early-out shape
 * for their respective already-set bits. On the real (not-yet-locked) path:
 * sets `STATUS2_MULTIPLETURNS`, draws the `(Random() & 1) + 2`-turn lock
 * duration into `STATUS2_LOCK_CONFUSE_TURN` (`battle.h:138`, an unmasked
 * `(num) << 10` write -- 2 or 3 both fit the 2-bit field with no carry into
 * `STATUS2_MULTIPLETURNS`'s own bit 12), and -- unlike every status1-family
 * case above -- never pushes/jumps to a script at all: `SetMoveEffect`'s own
 * switch just `break`s, so `BattleScript_EffectRampage2`'s `goto
 * BattleScript_HitFromCritCalc` tail (already run before `seteffectwithchance`
 * reaches this dispatch) is genuinely the whole move; `"advance"` is the
 * correct transition, not a `"call"`.
 *
 * Source stores `gCurrentMove` in the effect battler's `gLockedMoves` entry.
 * The full-turn action consumer reads it back independently of the move
 * occupying the remembered chosen slot, preserving called Thrash semantics.
 */
function applyThrashMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectBattler: BattleScriptBattlerId,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const effectBattlerState = baseRulesContext.battlers[effectBattler];
  const alreadyLocked = (effectBattlerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE) !== 0;
  if (alreadyLocked) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: baseRulesContext },
    );
  }

  const { rng, randomValue } = drawBattleScriptRng(
    context.state.rng,
    context.instruction,
    "SetMoveEffect Thrash-family lock-in duration ((Random() & 1) + 2)",
  );
  const turns = (randomValue & 1) + 2;
  const withRampage = withBattler(baseRulesContext, effectBattler, {
    status2: (
      effectBattlerState.status2
      | BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS
      | (turns << 10)
    ) >>> 0,
  });
  const lockedMoves = Object.freeze(
    withRampage.lockedMoves.map((move, index) =>
      index === effectBattler ? baseRulesContext.currentMove : move
    ),
  ) as BattleScriptRulesContext["lockedMoves"];
  const nextRulesContext = Object.freeze({ ...withRampage, lockedMoves });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, rng },
  );
}

/**
 * The stat-family arm of SetMoveEffect's own dispatch (:2644-2727, see
 * STAT_MOVE_EFFECT_TABLE above) -- NOT part of ChangeStatBuffs itself.
 * `flags` passed into ChangeStatBuffs is always 0 or MOVE_EFFECT_AFFECTS_USER
 * on this route (docs/stat-change-confusion-ground-truth.md S1.1), so
 * `allowPtr` inside changeStatBuffs is always false: every ability/Mist guard
 * blocks silently (no message), and the "resolved" outcome kind is only ever
 * reachable here via the Protect branch (unconditional regardless of flags).
 * On a genuine WORKED result, SetMoveEffect's own else-branch (not
 * ChangeStatBuffs') sets animArg1/animArg2 and pushes+jumps into
 * BattleScript_StatUp/StatDown to print "rose"/"fell" -- ported here
 * following the same push(current+1)+jump "call" shape `preventionCall`
 * already established for the status1 family above.
 */
function applyStatMoveEffect(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  baseRulesContext: BattleScriptRulesContext,
  effectByte: number,
  entry: StatMoveEffectEntry,
  affectsUser: boolean,
  attacker: BattleScriptBattlerId,
  target: BattleScriptBattlerId,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const flags = affectsUser ? MOVE_EFFECT_AFFECTS_USER : 0;
  const outcome = changeStatBuffs(context, {
    attacker,
    target,
    currentMove: baseRulesContext.currentMove,
    statId: entry.statId,
    direction: entry.direction,
    magnitude: entry.magnitude,
    flags,
    jumpProgramCounter: null,
  });

  // Only the Protect branch can produce "resolved" here (allowPtr is always
  // false on this route) -- its transition is already complete and correct
  // regardless of caller, no role rebinding needed.
  if (outcome.kind === "resolved") return outcome.transition;

  if (outcome.kind === "blocked-silent") {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...outcome.rulesContext,
          selectorRoles: baseRulesContext.selectorRoles,
          scriptingBattler: baseRulesContext.scriptingBattler,
        }),
      },
    );
  }

  const label = entry.direction === "increase" ? "BattleScript_StatUp" : "BattleScript_StatDown";
  const programCounter = resolveRequiredLabelProgramCounter(context.program, label);
  const nextRulesContext = Object.freeze({
    ...outcome.rulesContext,
    selectorRoles: baseRulesContext.selectorRoles,
    scriptingBattler: baseRulesContext.scriptingBattler,
    animArg1: effectByte,
  });
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "call", programCounter }),
    { rulesContext: nextRulesContext, events: outcome.events },
  );
}

function finalizeSeteffectwithchance(
  transition: BattleScriptCommandTransition<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return Object.freeze({
    ...transition,
    rulesContext: Object.freeze({ ...transition.rulesContext, moveEffectByte: 0, multiHitEffect: 0 }),
  });
}

/**
 * Cmd_seteffectwithchance (battle_script_commands.c:2908-2936). No source
 * `if (gBattleControllerExecFlags) return;` gate exists on this dispatcher
 * (unlike critmessage/resultmessage), so no isControllerIdle check here,
 * matching critcalc/damagecalc/typecalc/adjustnormaldamage. C's
 * `else if (Random() % 100 < percentChance && ...)` evaluates Random() before
 * the rest of the condition, so this opcode always consumes exactly one roll
 * whenever the MOVE_EFFECT_CERTAIN branch isn't taken -- docs/hit-chain-
 * ground-truth.md's roll 4, present on every hit-chain scenario regardless of
 * secondaryEffectChance. SetMoveEffect's dispatch (applySetMoveEffect above)
 * is now registered for the status-write quartet (POISON/BURN/FREEZE/
 * PARALYSIS); every other MOVE_EFFECT_* value stays a named (b) barrier
 * inside that function.
 */
function createSeteffectwithchanceOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const noEffect = (rulesContext.moveResultFlags & BATTLE_SCRIPT_MOVE_RESULT_NO_EFFECT) !== 0;
    const certain = (rulesContext.moveEffectByte & MOVE_EFFECT_CERTAIN) !== 0;

    if (certain && !noEffect) {
      const effectByte = (rulesContext.moveEffectByte & ~MOVE_EFFECT_CERTAIN) >>> 0;
      return finalizeSeteffectwithchance(applySetMoveEffect(context, rulesContext, effectByte, false, true));
    }

    const attacker = requireBattlerRole(rulesContext, "attacker");
    const attackerBattler = rulesContext.battlers[attacker];
    const moveRow = requireMoveRow(rulesContext.currentMove);
    const percentChance = attackerBattler.ability === ABILITY_SERENE_GRACE
      ? moveRow.secondaryEffectChance * 2
      : moveRow.secondaryEffectChance;

    const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "seteffectwithchance");
    const rolledSuccess = (randomValue % 100) < percentChance;

    if (rolledSuccess && rulesContext.moveEffectByte !== 0 && !noEffect) {
      // applySetMoveEffect may itself draw further RNG (MOVE_EFFECT_CONFUSION's
      // duration roll) -- thread the post-chance-roll rng through context.state
      // so any such nested draw starts from the right value and its own
      // advancement survives into the returned transition (previously
      // finalizeSeteffectwithchance unconditionally overwrote .rng with the
      // caller's pre-nested-draw value, silently discarding it; harmless only
      // as long as no registered effect byte drew RNG of its own, which
      // MOVE_EFFECT_CONFUSION is the first to do).
      const contextAfterRoll: typeof context = Object.freeze({
        ...context,
        state: Object.freeze({ ...context.state, rng }),
      });
      return finalizeSeteffectwithchance(
        applySetMoveEffect(contextAfterRoll, rulesContext, rulesContext.moveEffectByte, false, percentChance >= 100),
      );
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rulesContext, moveEffectByte: 0, multiHitEffect: 0 }), rng },
    );
  };
}

/**
 * Cmd_seteffectprimary (battle_script_commands.c:2941-2944): `SetMoveEffect
 * (TRUE, 0)` -- zero operands, always primary=TRUE/certain=FALSE. The effect
 * byte itself was already written into moveEffectByte by the preceding
 * setmoveeffect (setbyte cEFFECT_CHOOSER, ...) instruction, already
 * generically registered (docs/status-cluster-ground-truth.md).
 */
function createSeteffectprimaryOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const transition = applySetMoveEffect(
      context,
      rulesContext,
      rulesContext.moveEffectByte,
      true,
      false,
    );
    // SetMoveEffect's shared tail clears MOVE_EFFECT_BYTE before any pushed
    // effect script resumes (battle_script_commands.c:2905). Unlike
    // Cmd_seteffectwithchance, Cmd_seteffectprimary does not clear
    // multihitMoveEffect.
    return Object.freeze({
      ...transition,
      rulesContext: Object.freeze({
        ...transition.rulesContext,
        moveEffectByte: 0,
      }),
    });
  };
}

/** Cmd_seteffectsecondary: `SetMoveEffect(FALSE, 0)`, then clear MOVE_EFFECT_BYTE. */
function createSeteffectsecondaryOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const transition = applySetMoveEffect(
      context,
      context.state.rulesContext,
      context.state.rulesContext.moveEffectByte,
      false,
      false,
    );
    return Object.freeze({
      ...transition,
      rulesContext: Object.freeze({ ...transition.rulesContext, moveEffectByte: 0 }),
    });
  };
}

/**
 * Cmd_printfromtable (battle_script_commands.c:2180-2192). Resolves
 * table[MULTISTRING_CHOOSER] to a literal STRINGID_* and feeds it to the
 * already-registered prepareMessage port at gBattlerAttacker -- same
 * synthetic-operand trick this file already uses for
 * STRINGID_USEDMOVE_OPERAND. An unrecognized table pointer is a real
 * coverage gap (this opcode's dispatch is data-driven, not a fixed set),
 * so it barriers rather than halting as malformed.
 */
function createPrintfromtableOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const operand = context.instruction.operands[0];
    if (!operand || operand.widthBytes !== 4 || context.instruction.operands.length !== 1) {
      return unsupportedBranch(
        context,
        `Cmd_printfromtable's table-pointer operand (${operand?.expression ?? "<missing>"}) has an unexpected shape`,
        "battle_script_commands.c",
        2184,
      );
    }
    const table = PRINTFROMTABLE_TABLES[operand.expression];
    if (!table) {
      return unsupportedBranch(
        context,
        `Cmd_printfromtable's table pointer ${operand.expression} is outside the registered `
          + "status-write quartet's own string tables",
        "battle_script_commands.c",
        2184,
      );
    }
    const index = context.state.rulesContext.multistringChooser;
    const stringId = table[index];
    if (stringId === undefined) {
      return unsupportedBranch(
        context,
        `Cmd_printfromtable's MULTISTRING_CHOOSER index ${index} is out of range for ${operand.expression}`,
        "battle_script_commands.c",
        2185,
      );
    }
    const message = prepareMessage(context, stringOperand(stringId, 2187));
    if (message === null) return blockOnUnavailableMessage(context, stringId);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler: Object.freeze({ ...context.state.scheduler, messageDisplayActive: true }),
        events: Object.freeze([message]),
      },
    );
  };
}

/**
 * Cmd_updatestatusicon (battle_script_commands.c:7699-7730), including the
 * BS_ATTACKER_WITH_PARTNER source branch's absent-gated attacker emit and
 * optional doubles-partner emit.
 */
function createUpdatestatusiconOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const operand = context.instruction.operands[0];
    if (!operand || operand.widthBytes !== 1 || context.instruction.operands.length !== 1) {
      return unsupportedBranch(
        context,
        `Cmd_updatestatusicon's battler operand (${operand?.expression ?? "<missing>"}) has an unexpected shape`,
        "battle_script_commands.c",
        7704,
      );
    }
    if (operand.expression === "BS_ATTACKER_WITH_PARTNER") {
      const rules = context.state.rulesContext;
      const attacker = requireBattlerRole(rules, "attacker");
      const events = [];
      let scheduler: BattleScriptSchedulerState = Object.freeze({
        ...context.state.scheduler,
        activeBattler: attacker,
      });
      if ((rules.absentBattlerFlags & (1 << attacker)) === 0) {
        const state = rules.battlers[attacker];
        scheduler = markBattleScriptControllerPending(scheduler, attacker);
        events.push(Object.freeze({
          kind: "status-icon-update" as const,
          battler: attacker,
          status1: state.status1,
          status2: state.status2,
        }));
      }
      if (
        (
          rules.battleTopology.battleTypeFlags
          & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE
        ) !== 0
      ) {
        const partner = resolveBattleScriptBattlerPartner(
          rules.battleTopology,
          attacker,
        ) as BattleScriptBattlerId;
        scheduler = Object.freeze({ ...scheduler, activeBattler: partner });
        if ((rules.absentBattlerFlags & (1 << partner)) === 0) {
          const state = rules.battlers[partner];
          scheduler = markBattleScriptControllerPending(scheduler, partner);
          events.push(Object.freeze({
            kind: "status-icon-update" as const,
            battler: partner,
            status1: state.status1,
            status2: state.status2,
          }));
        }
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          scheduler,
          events: Object.freeze(events),
        },
      );
    }
    const battler = resolveBattlerForBattleScript(context, operand);
    if (battler === null) {
      const reason: BattleScriptBlockReason = Object.freeze({
        kind: "source-context-unavailable",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        port: "resolve-battler-for-battle-script",
        operandExpression: operand.expression,
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
    }
    const battlerState = context.state.rulesContext.battlers[battler];
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        scheduler,
        events: Object.freeze([
          Object.freeze({
            kind: "status-icon-update" as const,
            battler,
            status1: battlerState.status1,
            status2: battlerState.status2,
          }),
        ]),
      },
    );
  };
}

function hitMarkerFaintedBit(battler: BattleScriptBattlerId): number {
  return (1 << (28 + battler)) >>> 0;
}

/**
 * Cmd_tryfaintmon (battle_script_commands.c:2965-3050). No source
 * `gBattleControllerExecFlags` gate exists here either (unlike its neighbor
 * Cmd_dofaintanimation). The mode byte's nonzero form (tryfaintmon_spikes,
 * `gBattlescriptCurrInstr[2] != 0`) is assembled only at the Spikes-clearing
 * sites (data/battle_scripts_1.s:2473,2485,2497 and others) -- never by
 * BattleScript_EffectHit's own `tryfaintmon BS_TARGET` (mode FALSE) -- and it
 * uses the modeled SIDE_STATUS_SPIKES_DAMAGED guard. The mode-FALSE form's battler selection is a
 * literal `== BS_ATTACKER` comparison in source, not GetBattlerForBattleScript,
 * so any other operand spelling (BS_TARGET, BS_FAINTED, ...) takes the
 * "target" path exactly as source does -- no selector barrier needed.
 * gBattleResults bookkeeping and AdjustFriendshipOnBattleFaint (battle_util2.c:77,
 * mutating gPlayerParty, not gBattleMons) are unconditional side effects on
 * globals this engine does not model anywhere and no reachable opcode reads
 * back; omitted as inert bookkeeping, matching this file's existing precedent
 * for untracked non-branching state.
 */
function createTryfaintmonOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const mode = context.instruction.operands[1]?.expression;

    if (mode === "TRUE") {
      const selector = context.instruction.operands[0]?.expression;
      const activeBattler = selector === "BS_ATTACKER"
        ? requireBattlerRole(rulesContext, "attacker")
        : selector === "BS_TARGET"
        ? requireBattlerRole(rulesContext, "target")
        : rulesContext.selectorRoles.fainted;
      if (activeBattler === null) {
        throw new Error(`tryfaintmon_spikes requires a resolved ${selector} role`);
      }
      if ((rulesContext.hitMarker & hitMarkerFaintedBit(activeBattler)) === 0) {
        return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
      }
      const pointer = context.instruction.operands[2];
      const target = pointer?.widthBytes === 4
        ? resolveBattleScriptLabel(context.program, pointer.expression)
        : undefined;
      if (!target) throw new Error(`tryfaintmon_spikes unresolved target ${pointer?.expression ?? "<missing>"}`);
      if (context.state.callStack.length === 0) {
        return transitionBattleScriptCommand(context, Object.freeze({
          kind: "halt",
          reason: Object.freeze({
            kind: "return-stack-underflow",
            programCounter: context.state.programCounter,
          }),
        }));
      }
      const side = rulesContext.battlers[activeBattler].side;
      const sideStatuses = [...rulesContext.sideStatuses] as [number, number];
      sideStatuses[side] = (sideStatuses[side] & ~(1 << 9)) >>> 0;
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump-pop", programCounter: target.programCounter }),
        {
          rulesContext: Object.freeze({
            ...rulesContext,
            sideStatuses: Object.freeze(sideStatuses),
          }),
        },
      );
    }

    const isAttackerOperand = context.instruction.operands[0]?.expression === "BS_ATTACKER";
    const activeBattler = isAttackerOperand
      ? requireBattlerRole(rulesContext, "attacker")
      : requireBattlerRole(rulesContext, "target");
    const faintTargetLabel = isAttackerOperand ? "BattleScript_FaintAttacker" : "BattleScript_FaintTarget";

    const activeBattlerState = rulesContext.battlers[activeBattler];
    const absent = (rulesContext.absentBattlerFlags & (1 << activeBattler)) !== 0;
    const shouldFaint = !absent && activeBattlerState.hp === 0;

    if (!shouldFaint) {
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }));
    }

    let hitMarker = (rulesContext.hitMarker | hitMarkerFaintedBit(activeBattler)) >>> 0;
    if (activeBattlerState.side === 0) {
      hitMarker = (hitMarker | HITMARKER_PLAYER_FAINTED) >>> 0;
    }

    const attackerBattler = rulesContext.battlers[requireBattlerRole(rulesContext, "attacker")];
    const targetBattler = rulesContext.battlers[requireBattlerRole(rulesContext, "target")];

    const grudgeApplies = (targetBattler.status3 & STATUS3_GRUDGE) !== 0
      && (hitMarker & HITMARKER_GRUDGE) === 0
      && attackerBattler.side !== targetBattler.side
      && attackerBattler.hp !== 0
      && rulesContext.currentMove !== BATTLE_SCRIPT_MOVE_STRUGGLE;

    if ((hitMarker & HITMARKER_DESTINYBOND) !== 0 && attackerBattler.hp !== 0) {
      const faintScript = resolveBattleScriptLabel(context.program, faintTargetLabel);
      if (!faintScript) throw new Error(`tryfaintmon: committed program has no label ${faintTargetLabel}`);
      const destinyBond = resolveBattleScriptLabel(context.program, "BattleScript_DestinyBondTakesLife");
      if (!destinyBond) throw new Error("tryfaintmon: committed program has no BattleScript_DestinyBondTakesLife");
      const damageOwner = rulesContext.battlers[isAttackerOperand
        ? requireBattlerRole(rulesContext, "target")
        : requireBattlerRole(rulesContext, "attacker")];
      const nextRulesContext = Object.freeze({
        ...rulesContext,
        hitMarker: (hitMarker & ~HITMARKER_DESTINYBOND) >>> 0,
        battleMoveDamage: damageOwner.hp,
      });
      if (!grudgeApplies) {
        return transitionBattleScriptCommand(
          context,
          Object.freeze({
            kind: "call-stack",
            programCounter: destinyBond.programCounter,
            returnProgramCounters: Object.freeze([
              context.state.programCounter + 1,
              faintScript.programCounter,
            ]),
          }),
          { rulesContext: nextRulesContext },
        );
      }
      return scheduleGrudge(
        context,
        nextRulesContext,
        Object.freeze([
          context.state.programCounter + 1,
          faintScript.programCounter,
          destinyBond.programCounter,
        ]),
      );
    }

    if (grudgeApplies) {
      const faintScript = resolveBattleScriptLabel(context.program, faintTargetLabel);
      if (!faintScript) throw new Error(`tryfaintmon: committed program has no label ${faintTargetLabel}`);
      return scheduleGrudge(
        context,
        Object.freeze({ ...rulesContext, hitMarker }),
        Object.freeze([context.state.programCounter + 1, faintScript.programCounter]),
      );
    }

    const target = resolveBattleScriptLabel(context.program, faintTargetLabel);
    if (!target) throw new Error(`tryfaintmon: committed program has no label ${faintTargetLabel}`);

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call", programCounter: target.programCounter }),
      { rulesContext: Object.freeze({ ...rulesContext, hitMarker }) },
    );
  };
}

function scheduleGrudge(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  returnProgramCounters: readonly number[],
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const attacker = requireBattlerRole(rulesContext, "attacker");
  const attackerState = rulesContext.battlers[attacker];
  const movePosition = rulesContext.chosenMovePositions[attacker]!;
  const pp = attackerState.pp.map((value, index) =>
    index === movePosition ? 0 : value
  ) as unknown as BattleScriptRulesBattlerState["pp"];
  const withActivePp = withBattler(rulesContext, attacker, { pp });
  const nextRulesContext = Object.freeze({
    ...withActivePp,
    party: withBattleScriptPartyMemberPp(
      withActivePp.party,
      attackerState.side,
      attackerState.partyIndex,
      movePosition,
      0,
    ),
    battleTextBuff1Move: attackerState.moves[movePosition]!,
  });
  const grudgeScript = resolveBattleScriptLabel(context.program, "BattleScript_GrudgeTakesPP");
  if (!grudgeScript) throw new Error("tryfaintmon: committed program has no BattleScript_GrudgeTakesPP");
  const scheduler = markBattleScriptControllerPending(
    Object.freeze({ ...context.state.scheduler, activeBattler: attacker }),
    attacker,
  );
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "call-stack",
      programCounter: grudgeScript.programCounter,
      returnProgramCounters: Object.freeze([...returnProgramCounters]),
    }),
    {
      rulesContext: nextRulesContext,
      scheduler,
      events: Object.freeze([
        Object.freeze({
          kind: "set-battler-pp-data" as const,
          battler: attacker,
          movePosition,
          pp: 0,
        }),
      ]),
    },
  );
}

/** include/constants/battle.h:150 -- identity-ambiguous without gDisableStructs[].battlerPreventingEscape. */
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
/** include/constants/battle.h:140 -- identity-ambiguous without gBattleStruct->wrappedBy. */
const STATUS2_WRAPPED_MASK = (1 << 13) | (1 << 14) | (1 << 15);
const DEFAULT_STAT_STAGE = 6;
const DEFAULT_STAT_STAGES = Object.freeze([
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
  DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE, DEFAULT_STAT_STAGE,
]) as unknown as BattleScriptStatStages;

/** include/constants/battle.h:143 `STATUS2_INFATUATED_WITH(battler)` -- exported so Cmd_tryinfatuating's write and this file's own cleareffectsonfaint clear share the identical bit formula. */
export function statusInfatuatedWithBit(battler: BattleScriptBattlerId): number {
  return (1 << (16 + battler)) >>> 0;
}

function replaceAt<T extends readonly number[]>(values: T, index: number, value: number): T {
  if (values[index] === value) return values;
  return Object.freeze(values.map((entry, entryIndex) => (entryIndex === index ? value : entry))) as unknown as T;
}

/**
 * Cmd_cleareffectsonfaint (battle_script_commands.c:3062-3076) plus
 * FaintClearSetData (battle_main.c:3264-3355), the "Effects like attractions,
 * trapping, etc." helper it always calls. The status1 write is ARENA-gated
 * exactly as source (`!(BATTLE_TYPE_ARENA) || hp==0` -- always true on every
 * reachable path here since tryfaintmon's faint branch already established
 * hp==0 -- computed off the already-modeled battleTypeFlags word, not a
 * barrier). FaintClearSetData's cross-battler STATUS2_INFATUATED_WITH clear
 * is fully computable from the bit itself (`gBitTable[battler] << 16` encodes
 * the relationship directly, no external field needed), and so now is its
 * STATUS2_WRAPPED clear (docs/ingrain-leechseed-wrap-ground-truth.md §1c/§5
 * slice 2's own `wrappedBy` field this engine now models). Only
 * STATUS2_ESCAPE_PREVENTION still needs
 * `gDisableStructs[].battlerPreventingEscape` identity this engine does not
 * model, so it stays a named (b) barrier gated on its own bit actually being
 * set on some other battler (never true for a plain damaging-move KO, so
 * unreached on this rung's own scenario). `protectUses` is now a real write
 * (`battleScriptProtectlikeOpcode.ts`'s own field), tested below. The
 * Remaining struct-wide DisableStruct/ProtectStruct fields FaintClearSetData
 * zeroes (isFirstTurn, truantSwitchInHack,
 * ProtectStruct's noValidMoves/fleeType/physicalDmg/
 * specialDmg/physicalBattlerId/specialBattlerId), gActionSelectionCursor/
 * gMoveSelectionCursor, the species-base `types` reassignment (this engine
 * has no code path that ever moves `types`
 * away from base, so leaving it untouched is exactly equivalent), and
 * ClearBattlerMoveHistory/ClearBattlerAbilityHistory (a wholly separate
 * AI-history structure) all have no reader anywhere in this engine's
 * currently modeled scope and are not tracked, matching this file's existing
 * datahpupdate/tryfaintmon precedent for untracked non-branching state.
 */
function createCleareffectsonfaintOpcodeHandler(
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (!isControllerIdle(context)) return controllerBusyBlock(context);
    const rulesContext = context.state.rulesContext;
    const resolved = resolveHitChainBattlerOperand(context, rulesContext);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        `Cmd_cleareffectsonfaint's GetBattlerForBattleScript selector `
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER`,
        "battle_script_commands.c",
        3064,
      );
    }
    const active = resolved;
    const { battlersCount } = rulesContext.battleTopology;

    const activeBattlerState = rulesContext.battlers[active];
    const isArena = (rulesContext.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_ARENA) !== 0;
    const clearsStatus1 = !isArena || activeBattlerState.hp === 0;

    const infatuationBit = statusInfatuatedWithBit(active);
    const battlers = rulesContext.battlers.map((candidate, index) => {
      if (index === active) {
        return Object.freeze({
          ...candidate,
          status1: clearsStatus1 ? 0 : candidate.status1,
          status2: 0,
          status3: 0,
          substituteHP: 0,
          statStages: DEFAULT_STAT_STAGES,
          rolloutTimer: 0,
          furyCutterCounter: 0,
          mimickedMoves: 0,
          stockpileCounter: 0,
          truantCounter: 0 as const,
          rechargeTimer: 0,
          flinchImmobility: 0 as const,
          disabledMove: 0,
          disableTimer: 0,
          disableTimerStartValue: 0,
          perishSongTimer: 0,
          perishSongTimerStartValue: 0,
          usedDisabledMove: 0 as const,
          tauntTimer: 0,
          usedTauntedMove: 0 as const,
          usedImprisonedMove: 0 as const,
          bounceMove: 0 as const,
          confusionSelfDmg: 0 as const,
          prlzImmobility: 0 as const,
          loveImmobility: 0 as const,
          stealMove: 0 as const,
          endured: 0 as const,
          helpingHand: 0 as const,
          notFirstStrike: 0 as const,
          flashFireBoosted: 0 as const,
          chargingTurn: 0 as const,
          targetNotAffected: 0 as const,
          flag2Unknown: 0 as const,
          protected: 0 as const,
          protectUses: 0,
          battlerPreventingEscape: 0,
          battlerWithSureHit: 0,
          transformedMonPersonality: 0,
        });
      }
      // FaintClearSetData (battle_main.c:3281): other battlers wrapped BY the
      // fainted one are freed -- real gBattleStruct->wrappedBy identity, not a barrier.
      const wrappedByActive = (candidate.status2 & STATUS2_WRAPPED_MASK) !== 0 && candidate.wrappedBy === active;
      const preventedByActive =
        (candidate.status2 & STATUS2_ESCAPE_PREVENTION) !== 0
        && candidate.battlerPreventingEscape === active;
      const sureHitByActive =
        (candidate.status3 & BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) !== 0
        && candidate.battlerWithSureHit === active;
      const status2 = (
        candidate.status2
        & ~infatuationBit
        & (wrappedByActive ? ~STATUS2_WRAPPED_MASK : ~0)
        & (preventedByActive ? ~STATUS2_ESCAPE_PREVENTION : ~0)
      ) >>> 0;
      const status3 = sureHitByActive
        ? (candidate.status3 & ~BATTLE_SCRIPT_STATUS3_ALWAYS_HITS) >>> 0
        : candidate.status3;
      return status2 === candidate.status2 && status3 === candidate.status3
        ? candidate
        : Object.freeze({
            ...candidate,
            status2,
            status3,
            ...(preventedByActive ? { battlerPreventingEscape: 0 as BattleScriptBattlerId } : {}),
            ...(sureHitByActive ? { battlerWithSureHit: 0 as BattleScriptBattlerId } : {}),
          });
    }) as unknown as BattleScriptRulesBattlers;

    let {
      lastMoves, lastLandedMoves, lastHitByType, lastResultingMoves,
      lastPrintedMoves, lastHitBy, lastTakenMove, lastTakenMoveFrom,
    } = rulesContext.moveHistory;
    lastMoves = replaceAt(lastMoves, active, 0);
    lastLandedMoves = replaceAt(lastLandedMoves, active, 0);
    lastHitByType = replaceAt(lastHitByType, active, 0);
    lastResultingMoves = replaceAt(lastResultingMoves, active, 0);
    lastPrintedMoves = replaceAt(lastPrintedMoves, active, 0);
    lastHitBy = replaceAt(lastHitBy, active, 0xff);

    const nextLastTakenMove = [...lastTakenMove];
    nextLastTakenMove[active * 2] = 0;
    nextLastTakenMove[active * 2 + 1] = 0;
    for (let i = 0; i < battlersCount; i += 1) {
      if (i !== active && rulesContext.battlers[i as BattleScriptBattlerId].side !== activeBattlerState.side) {
        nextLastTakenMove[i * 2] = 0;
        nextLastTakenMove[i * 2 + 1] = 0;
      }
    }

    const nextLastTakenMoveFrom = [...lastTakenMoveFrom];
    for (let j = 0; j < 4; j += 1) {
      nextLastTakenMoveFrom[active * 8 + j * 2] = 0;
      nextLastTakenMoveFrom[active * 8 + j * 2 + 1] = 0;
    }
    for (let i = 0; i < battlersCount; i += 1) {
      nextLastTakenMoveFrom[i * 8 + active * 2] = 0;
      nextLastTakenMoveFrom[i * 8 + active * 2 + 1] = 0;
    }

    const choicedMove = replaceAt(rulesContext.choicedMove, active, 0);

    const nextRulesContext = Object.freeze({
      ...rulesContext,
      battlers: Object.freeze(battlers),
      choicedMove,
      moveHistory: Object.freeze({
        ...rulesContext.moveHistory,
        lastMoves,
        lastLandedMoves,
        lastHitByType,
        lastResultingMoves,
        lastPrintedMoves,
        lastHitBy,
        lastTakenMove: Object.freeze(nextLastTakenMove),
        lastTakenMoveFrom: Object.freeze(nextLastTakenMoveFrom),
      }),
    }) as unknown as BattleScriptRulesContext;

    if (!clearsStatus1) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRulesContext },
      );
    }
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, active);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRulesContext,
        scheduler,
        events: Object.freeze([
          Object.freeze({ kind: "set-battler-status-data" as const, battler: active, status1: 0 }),
        ]),
      },
    );
  };
}

export type BattleScriptHitChainPorts = Readonly<{
  isControllerIdle: BattleScriptControllerIdlePort<BattleScriptRulesContext>;
  prepareMessage: BattleScriptMessagePreparationPort<BattleScriptRulesContext>;
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
}>;

export function createBattleScriptHitChainOpcodeHandlers(
  program: BattleScriptProgram,
  ports: BattleScriptHitChainPorts,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> = Object.create(null) as Record<
    number,
    BattleScriptOpcodeHandler<BattleScriptRulesContext>
  >;
  const install = (opcodeName: string, handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>) => {
    const instruction = program.instructions.find((candidate) => candidate.opcodeName === opcodeName);
    if (!instruction) throw new Error(`committed Battle Script program does not emit ${opcodeName}`);
    handlers[instruction.opcodeId] = handler;
  };
  install("B_SCR_OP_ACCURACYCHECK", accuracycheckOpcodeHandler);
  install("B_SCR_OP_ATTACKSTRING", createAttackstringOpcodeHandler(ports.prepareMessage, ports.isControllerIdle));
  install("B_SCR_OP_PPREDUCE", ppreduceOpcodeHandler);
  install("B_SCR_OP_CRITCALC", critcalcOpcodeHandler);
  install("B_SCR_OP_DAMAGECALC", damagecalcOpcodeHandler);
  install("B_SCR_OP_TYPECALC", typecalcOpcodeHandler);
  install("B_SCR_OP_TYPECALC2", typecalc2OpcodeHandler);
  install("B_SCR_OP_DMGTOLEVEL", dmgtolevelOpcodeHandler);
  install("B_SCR_OP_PSYWAVEDAMAGEEFFECT", psywavedamageeffectOpcodeHandler);
  install("B_SCR_OP_ADJUSTNORMALDAMAGE", adjustnormaldamageOpcodeHandler);
  install("B_SCR_OP_ADJUSTNORMALDAMAGE2", adjustnormaldamage2OpcodeHandler);
  install("B_SCR_OP_SETDAMAGETOHEALTHDIFFERENCE", setdamagetohealthdifferenceOpcodeHandler);
  install("B_SCR_OP_ADJUSTSETDAMAGE", adjustsetdamageOpcodeHandler);
  install("B_SCR_OP_COUNTERDAMAGECALCULATOR", counterdamagecalculatorOpcodeHandler);
  install("B_SCR_OP_MIRRORCOATDAMAGECALCULATOR", mirrorcoatdamagecalculatorOpcodeHandler);
  install("B_SCR_OP_ATTACKANIMATION", createAttackanimationOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_EFFECTIVENESSSOUND", createEffectivenesssoundOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_HITANIMATION", hitanimationOpcodeHandler);
  install("B_SCR_OP_HEALTHBARUPDATE", createHealthbarupdateOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install("B_SCR_OP_DATAHPUPDATE", createDatahpupdateOpcodeHandler(ports.isControllerIdle));
  install("B_SCR_OP_CRITMESSAGE", createCritmessageOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install("B_SCR_OP_RESULTMESSAGE", createResultmessageOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install("B_SCR_OP_SETEFFECTWITHCHANCE", createSeteffectwithchanceOpcodeHandler());
  install("B_SCR_OP_SETEFFECTPRIMARY", createSeteffectprimaryOpcodeHandler());
  install("B_SCR_OP_SETEFFECTSECONDARY", createSeteffectsecondaryOpcodeHandler());
  install("B_SCR_OP_PRINTFROMTABLE", createPrintfromtableOpcodeHandler(ports.isControllerIdle, ports.prepareMessage));
  install(
    "B_SCR_OP_UPDATESTATUSICON",
    createUpdatestatusiconOpcodeHandler(ports.isControllerIdle, ports.resolveBattlerForBattleScript),
  );
  install("B_SCR_OP_TRYFAINTMON", createTryfaintmonOpcodeHandler());
  install("B_SCR_OP_CLEAREFFECTSONFAINT", createCleareffectsonfaintOpcodeHandler(ports.isControllerIdle));
  return Object.freeze(handlers);
}
