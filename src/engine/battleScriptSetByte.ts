import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";

export type BattleScriptSetByteRulesContext = Readonly<{
  battleCommunication0: number;
  battleCommunication1: number;
  battleMoveDamage: number;
  dmgMultiplier: number;
  moveEffectByte: number;
  moveResultFlags: number;
  multistringChooser: number;
  selectorRoles: Readonly<{ target: 0 | 1 | 2 | 3 | null }>;
  scriptingBattler: 0 | 1 | 2 | 3;
  animTargetsHit: number;
  animTurn: number;
  giveExpState: number;
  learnMoveState: number;
  lvlBoxState: number;
  moveendState: number;
  multiHitEffect: number;
  statChanger: number;
  statAnimPlayed: number;
  tripleKickPower: number;
  twoTurnStringId: number;
}>;

export const BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS = Object.freeze([
  "cEFFECT_CHOOSER",
  "cMULTISTRING_CHOOSER",
  "gBattleCommunication",
  "gBattleCommunication + 1",
  "gBattleMoveDamage",
  "gBattleMoveDamage + 1",
  "gBattleMoveDamage + 2",
  "gBattleMoveDamage + 3",
  "gBattlerTarget",
  "gMoveResultFlags",
  "sBATTLER",
  "sB_ANIM_TARGETS_HIT",
  "sB_ANIM_TURN",
  "sDMG_MULTIPLIER",
  "sGIVEEXP_STATE",
  "sLEARNMOVE_STATE",
  "sLVLBOX_STATE",
  "sMOVEEND_STATE",
  "sMULTIHIT_EFFECT",
  "sSTATCHANGER",
  "sSTAT_ANIM_PLAYED",
  "sTRIPLE_KICK_POWER",
  "sTRIPLE_KICK_POWER + 1",
  "sTWOTURN_STRINGID",
] as const);

const ATOMIC_VALUES = Object.freeze({
  FALSE: 0,
  TRUE: 1,
  B_MSG_ABSORB: 0,
  B_MSG_ABSORB_OOZE: 1,
  B_MSG_ABILITY_PREVENTS_MOVE_STATUS: 0,
  B_MSG_LEECH_SEED_DRAIN: 3,
  B_MSG_LEECH_SEED_OOZE: 4,
  B_MSG_STAT_FELL_EMPTY: 3,
  /** battle_string_ids.h:397,405 -- both literally 2, the same shared MULTISTRING_CHOOSER value ChangeStatBuffs' clamp tail writes for either direction. */
  B_MSG_STAT_WONT_INCREASE: 2,
  B_MSG_STAT_WONT_DECREASE: 2,
  B_MSG_INCAPABLE_OF_POWER: 4,
  B_MSG_STAT_ROSE_ITEM: 4,
  /** battle_string_ids.h:447 -- `BattleScript_RainContinuesOrEnds`'s own `jumpifbyte CMP_EQUAL, cMULTISTRING_CHOOSER, B_MSG_RAIN_STOPPED, ...` comparand. */
  B_MSG_RAIN_STOPPED: 2,
  B_MSG_TURN1_RAZOR_WIND: 0,
  B_MSG_TURN1_SOLAR_BEAM: 1,
  B_MSG_TURN1_SKULL_BASH: 2,
  B_MSG_TURN1_SKY_ATTACK: 3,
  B_MSG_TURN1_FLY: 4,
  B_MSG_TURN1_DIG: 5,
  B_MSG_TURN1_DIVE: 6,
  B_MSG_TURN1_BOUNCE: 7,
  MOVEEND_RAGE: 0,
  MOVEEND_SYNCHRONIZE_TARGET: 2,
  MOVEEND_ON_DAMAGE_ABILITIES: 3,
  MOVEEND_IMMUNITY_ABILITIES: 4,
  MOVEEND_ITEM_EFFECTS_ALL: 11,
  MOVEEND_UPDATE_LAST_MOVES: 14,
  MOVEEND_MIRROR_MOVE: 15,
  MOVE_EFFECT_SLEEP: 1,
  MOVE_EFFECT_POISON: 2,
  MOVE_EFFECT_BURN: 3,
  MOVE_EFFECT_FREEZE: 4,
  MOVE_EFFECT_PARALYSIS: 5,
  MOVE_EFFECT_TOXIC: 6,
  MOVE_EFFECT_CONFUSION: 7,
  MOVE_EFFECT_FLINCH: 8,
  MOVE_EFFECT_TRI_ATTACK: 9,
  MOVE_EFFECT_UPROAR: 10,
  MOVE_EFFECT_PAYDAY: 11,
  MOVE_EFFECT_CHARGING: 12,
  MOVE_EFFECT_WRAP: 13,
  MOVE_EFFECT_RECOIL_25: 14,
  MOVE_EFFECT_ATK_PLUS_1: 15,
  MOVE_EFFECT_DEF_PLUS_1: 16,
  MOVE_EFFECT_ATK_MINUS_1: 22,
  MOVE_EFFECT_DEF_MINUS_1: 23,
  MOVE_EFFECT_SPD_MINUS_1: 24,
  MOVE_EFFECT_SP_ATK_MINUS_1: 25,
  MOVE_EFFECT_SP_DEF_MINUS_1: 26,
  MOVE_EFFECT_ACC_MINUS_1: 27,
  MOVE_EFFECT_RECHARGE: 29,
  MOVE_EFFECT_RAGE: 30,
  MOVE_EFFECT_STEAL_ITEM: 31,
  MOVE_EFFECT_PREVENT_ESCAPE: 32,
  MOVE_EFFECT_NIGHTMARE: 33,
  MOVE_EFFECT_ALL_STATS_UP: 34,
  MOVE_EFFECT_RAPIDSPIN: 35,
  MOVE_EFFECT_REMOVE_PARALYSIS: 36,
  MOVE_EFFECT_ATK_DEF_DOWN: 37,
  MOVE_EFFECT_RECOIL_33: 38,
  MOVE_EFFECT_KNOCK_OFF: 54,
  MOVE_EFFECT_SP_ATK_TWO_DOWN: 59,
} as const);

const SETBYTE_VALUES: Readonly<Record<string, number>> = Object.freeze({
  "0": 0,
  "1": 1,
  "2": 2,
  "(0) & 0xFF": 0,
  "((0) >> 8) & 0xFF": 0,
  "(20) & 0xFF": 20,
  "((20) >> 8) & 0xFF": 0,
  "((20) >> 16) & 0xFF": 0,
  "((20) >> 24) & 0xFF": 0,
  "(40) & 0xFF": 40,
  "((40) >> 8) & 0xFF": 0,
  "((40) >> 16) & 0xFF": 0,
  "((40) >> 24) & 0xFF": 0,
  ...ATOMIC_VALUES,
  "MOVE_EFFECT_CHARGING | MOVE_EFFECT_AFFECTS_USER": 12 | 64,
  "MOVE_EFFECT_RECOIL_25 | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 14 | 64 | 128,
  "MOVE_EFFECT_DEF_PLUS_1 | MOVE_EFFECT_AFFECTS_USER": 16 | 64,
  "MOVE_EFFECT_ATK_PLUS_1 | MOVE_EFFECT_AFFECTS_USER": 15 | 64,
  "MOVE_EFFECT_ALL_STATS_UP | MOVE_EFFECT_AFFECTS_USER": 34 | 64,
  "MOVE_EFFECT_FLINCH | MOVE_EFFECT_CERTAIN": 8 | 128,
  "MOVE_EFFECT_UPROAR | MOVE_EFFECT_AFFECTS_USER": 10 | 64,
  "MOVE_EFFECT_REMOVE_PARALYSIS | MOVE_EFFECT_CERTAIN": 36 | 128,
  "MOVE_EFFECT_ATK_DEF_DOWN | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 37 | 64 | 128,
  "MOVE_EFFECT_RECOIL_33 | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 38 | 64 | 128,
  "MOVE_EFFECT_SP_ATK_TWO_DOWN | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 59 | 64 | 128,
  "MOVE_EFFECT_RECHARGE | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 29 | 64 | 128,
  "MOVE_EFFECT_RAPIDSPIN | MOVE_EFFECT_AFFECTS_USER | MOVE_EFFECT_CERTAIN": 35 | 64 | 128,
  "MOVE_EFFECT_SLEEP | MOVE_EFFECT_AFFECTS_USER": 1 | 64,
  "MOVE_EFFECT_CONFUSION | MOVE_EFFECT_AFFECTS_USER": 7 | 64,
  "STAT_ATK | 1 << 4 | FALSE << 7": 1 | (1 << 4),
  "STAT_DEF | 1 << 4 | FALSE << 7": 2 | (1 << 4),
  "STAT_SPEED | 1 << 4 | FALSE << 7": 3 | (1 << 4),
  "STAT_SPATK | 1 << 4 | FALSE << 7": 4 | (1 << 4),
  "STAT_SPDEF | 1 << 4 | FALSE << 7": 5 | (1 << 4),
  "STAT_ATK | 1 << 4 | TRUE << 7": 1 | (1 << 4) | (1 << 7),
  "STAT_DEF | 1 << 4 | TRUE << 7": 2 | (1 << 4) | (1 << 7),
  "STAT_SPEED | 1 << 4 | TRUE << 7": 3 | (1 << 4) | (1 << 7),
  "STAT_ACC | 1 << 4 | TRUE << 7": 6 | (1 << 4) | (1 << 7),
  "STAT_EVASION | 1 << 4 | FALSE << 7": 7 | (1 << 4),
  "STAT_EVASION | 1 << 4 | TRUE << 7": 7 | (1 << 4) | (1 << 7),
  "STAT_ATK | 2 << 4 | FALSE << 7": 1 | (2 << 4),
  "STAT_DEF | 2 << 4 | FALSE << 7": 2 | (2 << 4),
  "STAT_SPEED | 2 << 4 | FALSE << 7": 3 | (2 << 4),
  "STAT_SPATK | 2 << 4 | FALSE << 7": 4 | (2 << 4),
  "STAT_SPDEF | 2 << 4 | FALSE << 7": 5 | (2 << 4),
  "STAT_ATK | 2 << 4 | TRUE << 7": 1 | (2 << 4) | (1 << 7),
  "STAT_DEF | 2 << 4 | TRUE << 7": 2 | (2 << 4) | (1 << 7),
  "STAT_SPEED | 2 << 4 | TRUE << 7": 3 | (2 << 4) | (1 << 7),
  "STAT_SPATK | 2 << 4 | TRUE << 7": 4 | (2 << 4) | (1 << 7),
  "STAT_SPDEF | 2 << 4 | TRUE << 7": 5 | (2 << 4) | (1 << 7),
});

export function resolveBattleScriptSetByteValue(expression: string): number | null {
  return Object.hasOwn(SETBYTE_VALUES, expression) ? SETBYTE_VALUES[expression]! : null;
}

function replaceByte32(value: number, offset: number, byte: number): number {
  const shift = offset * 8;
  return (((value >>> 0) & ~(0xff << shift)) | (byte << shift)) | 0;
}

function replaceByte16(value: number, offset: number, byte: number): number {
  const shift = offset * 8;
  return ((value & ~(0xff << shift)) | (byte << shift)) & 0xffff;
}

export function readBattleScriptRulesByte(
  rules: BattleScriptSetByteRulesContext,
  expression: string,
): number | null {
  switch (expression) {
    case "cEFFECT_CHOOSER": return rules.moveEffectByte;
    case "cMULTISTRING_CHOOSER": return rules.multistringChooser;
    case "gBattleCommunication": return rules.battleCommunication0;
    case "gBattleCommunication + 1": return rules.battleCommunication1;
    case "gBattleMoveDamage": return rules.battleMoveDamage & 0xff;
    case "gBattleMoveDamage + 1": return (rules.battleMoveDamage >>> 8) & 0xff;
    case "gBattleMoveDamage + 2": return (rules.battleMoveDamage >>> 16) & 0xff;
    case "gBattleMoveDamage + 3": return (rules.battleMoveDamage >>> 24) & 0xff;
    case "gBattlerTarget": return rules.selectorRoles.target ?? 0xff;
    case "gMoveResultFlags": return rules.moveResultFlags;
    case "sBATTLER": return rules.scriptingBattler;
    case "sB_ANIM_TARGETS_HIT": return rules.animTargetsHit;
    case "sB_ANIM_TURN": return rules.animTurn;
    case "sDMG_MULTIPLIER": return rules.dmgMultiplier;
    case "sGIVEEXP_STATE": return rules.giveExpState;
    case "sLEARNMOVE_STATE": return rules.learnMoveState;
    case "sLVLBOX_STATE": return rules.lvlBoxState;
    case "sMOVEEND_STATE": return rules.moveendState;
    case "sMULTIHIT_EFFECT": return rules.multiHitEffect;
    case "sSTATCHANGER": return rules.statChanger;
    case "sSTAT_ANIM_PLAYED": return rules.statAnimPlayed;
    case "sTRIPLE_KICK_POWER": return rules.tripleKickPower & 0xff;
    case "sTRIPLE_KICK_POWER + 1": return (rules.tripleKickPower >>> 8) & 0xff;
    case "sTWOTURN_STRINGID": return rules.twoTurnStringId;
    default: return null;
  }
}

export function writeBattleScriptRulesByte<
  RulesContext extends BattleScriptSetByteRulesContext,
>(
  rules: RulesContext,
  expression: string,
  value: number,
): RulesContext | null {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xff) return null;
  switch (expression) {
    case "cEFFECT_CHOOSER": return Object.freeze({ ...rules, moveEffectByte: value }) as RulesContext;
    case "cMULTISTRING_CHOOSER": return Object.freeze({ ...rules, multistringChooser: value }) as RulesContext;
    case "gBattleCommunication": return Object.freeze({ ...rules, battleCommunication0: value }) as RulesContext;
    case "gBattleCommunication + 1": return Object.freeze({ ...rules, battleCommunication1: value }) as RulesContext;
    case "gBattleMoveDamage": return Object.freeze({ ...rules, battleMoveDamage: replaceByte32(rules.battleMoveDamage, 0, value) }) as RulesContext;
    case "gBattleMoveDamage + 1": return Object.freeze({ ...rules, battleMoveDamage: replaceByte32(rules.battleMoveDamage, 1, value) }) as RulesContext;
    case "gBattleMoveDamage + 2": return Object.freeze({ ...rules, battleMoveDamage: replaceByte32(rules.battleMoveDamage, 2, value) }) as RulesContext;
    case "gBattleMoveDamage + 3": return Object.freeze({ ...rules, battleMoveDamage: replaceByte32(rules.battleMoveDamage, 3, value) }) as RulesContext;
    case "gBattlerTarget": return value < 4 ? Object.freeze({ ...rules, selectorRoles: Object.freeze({ ...rules.selectorRoles, target: value }) }) as RulesContext : null;
    case "gMoveResultFlags": return Object.freeze({ ...rules, moveResultFlags: value }) as RulesContext;
    case "sBATTLER": return value < 4 ? Object.freeze({ ...rules, scriptingBattler: value }) as RulesContext : null;
    case "sB_ANIM_TARGETS_HIT": return Object.freeze({ ...rules, animTargetsHit: value }) as RulesContext;
    case "sB_ANIM_TURN": return Object.freeze({ ...rules, animTurn: value }) as RulesContext;
    case "sDMG_MULTIPLIER": return Object.freeze({ ...rules, dmgMultiplier: value }) as RulesContext;
    case "sGIVEEXP_STATE": return Object.freeze({ ...rules, giveExpState: value }) as RulesContext;
    case "sLEARNMOVE_STATE": return Object.freeze({ ...rules, learnMoveState: value }) as RulesContext;
    case "sLVLBOX_STATE": return Object.freeze({ ...rules, lvlBoxState: value }) as RulesContext;
    case "sMOVEEND_STATE": return Object.freeze({ ...rules, moveendState: value }) as RulesContext;
    case "sMULTIHIT_EFFECT": return Object.freeze({ ...rules, multiHitEffect: value }) as RulesContext;
    case "sSTATCHANGER": return Object.freeze({ ...rules, statChanger: value }) as RulesContext;
    case "sSTAT_ANIM_PLAYED": return Object.freeze({ ...rules, statAnimPlayed: value }) as RulesContext;
    case "sTRIPLE_KICK_POWER": return Object.freeze({ ...rules, tripleKickPower: replaceByte16(rules.tripleKickPower, 0, value) }) as RulesContext;
    case "sTRIPLE_KICK_POWER + 1": return Object.freeze({ ...rules, tripleKickPower: replaceByte16(rules.tripleKickPower, 1, value) }) as RulesContext;
    case "sTWOTURN_STRINGID": return Object.freeze({ ...rules, twoTurnStringId: value }) as RulesContext;
    default: return null;
  }
}

/**
 * Source-complete Cmd_setbyte for the committed program. Registry creation
 * validates every concrete opcode start before opcode 46 becomes executable.
 */
export function createBattleScriptSetByteCommandHandlers<
  RulesContext extends BattleScriptSetByteRulesContext,
>(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<RulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_SETBYTE",
  );
  const pointers = new Set<string>();
  if (starts.length !== 214) {
    throw new Error(`B_SCR_OP_SETBYTE requires all 214 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [pointer, value] = instruction.operands;
    if (
      instruction.opcodeId !== 46
      || instruction.dispatcher !== "Cmd_setbyte"
      || instruction.operands.length !== 2
      || pointer?.widthBytes !== 4
      || value?.widthBytes !== 1
    ) {
      throw new Error(`invalid B_SCR_OP_SETBYTE shape at program counter ${instruction.programCounter}`);
    }
    pointers.add(pointer.expression);
    if (!BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.includes(pointer.expression as never)) {
      throw new Error(`unknown B_SCR_OP_SETBYTE pointer ${pointer.expression}`);
    }
    if (resolveBattleScriptSetByteValue(value.expression) === null) {
      throw new Error(`unknown B_SCR_OP_SETBYTE value ${value.expression}`);
    }
  }
  if (
    pointers.size !== BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.length
    || BATTLE_SCRIPT_SETBYTE_POINTER_EXPRESSIONS.some((expression) => !pointers.has(expression))
  ) {
    throw new Error("B_SCR_OP_SETBYTE pointer universe is incomplete");
  }

  const handler: BattleScriptOpcodeHandler<RulesContext> = (context) => {
    const [pointer, valueOperand] = context.instruction.operands;
    const value = valueOperand
      ? resolveBattleScriptSetByteValue(valueOperand.expression)
      : null;
    const rulesContext = pointer && value !== null
      ? writeBattleScriptRulesByte(context.state.rulesContext, pointer.expression, value)
      : null;
    if (!rulesContext) {
      throw new Error(`validated B_SCR_OP_SETBYTE became undecodable at ${context.state.programCounter}`);
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext },
    );
  };
  return Object.freeze({ 46: handler });
}
