/**
 * `B_SCR_OP_TRYSETFUTUREATTACK` / `Cmd_trysetfutureattack`
 * (`battle_script_commands.c:8929-8958`). The pending record belongs to the
 * target's positional battler slot, not its party member.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptBattlerHoldEffectParam,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import { calculateBaseDamage } from "./damageCalc.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const SIDE_STATUS_REFLECT = 1 << 0;
const SIDE_STATUS_LIGHTSCREEN = 1 << 1;
const MOVE_FUTURE_SIGHT = 248;
const MOVE_DOOM_DESIRE = 353;
const HOLD_EFFECT_TYPE = new Map<number, string>([
  [31, "TYPE_BUG"], [42, "TYPE_STEEL"], [46, "TYPE_GROUND"],
  [47, "TYPE_ROCK"], [48, "TYPE_GRASS"], [49, "TYPE_DARK"],
  [50, "TYPE_FIGHTING"], [51, "TYPE_ELECTRIC"], [52, "TYPE_WATER"],
  [53, "TYPE_FLYING"], [54, "TYPE_POISON"], [55, "TYPE_ICE"],
  [56, "TYPE_GHOST"], [57, "TYPE_PSYCHIC"], [58, "TYPE_FIRE"],
  [59, "TYPE_DRAGON"], [60, "TYPE_NORMAL"],
]);
const MOVE_BY_ID = new Map(
  (movesData.moves as readonly Readonly<{ id: number; power: number; type: string; effect: string }>[])
    .map((move) => [move.id, move]),
);

function statStages(battler: BattleScriptRulesBattlerState) {
  return {
    atk: battler.statStages[1]!,
    def: battler.statStages[2]!,
    spAtk: battler.statStages[4]!,
    spDef: battler.statStages[5]!,
  };
}

/**
 * The Future Sight/Doom Desire subset of CalculateBaseDamage. Their Psychic
 * and Steel types make weather, pinch abilities and field sports inert, but
 * all source modifiers that can affect either type remain here.
 */
export function calculateFutureAttackBaseDamage(
  rules: BattleScriptRulesContext,
  attackerId: 0 | 1 | 2 | 3,
  targetId: 0 | 1 | 2 | 3,
  moveId: number,
): number {
  const attacker = rules.battlers[attackerId];
  const defender = rules.battlers[targetId];
  const move = MOVE_BY_ID.get(moveId);
  if (!move || (moveId !== MOVE_FUTURE_SIGHT && moveId !== MOVE_DOOM_DESIRE)) {
    throw new Error(`Cmd_trysetfutureattack requires Future Sight or Doom Desire, got ${moveId}`);
  }

  let attack = attacker.attack;
  let defense = defender.defense;
  let spAttack = attacker.spAttack;
  let spDefense = defender.spDefense;
  const attackerHold = resolveBattleScriptBattlerHoldEffect(rules, attackerId);
  const defenderHold = resolveBattleScriptBattlerHoldEffect(rules, targetId);
  if (attacker.ability === 37 || attacker.ability === 74) attack *= 2; // Huge/Pure Power
  if (HOLD_EFFECT_TYPE.get(attackerHold) === move.type) {
    const param = resolveBattleScriptBattlerHoldEffectParam(rules, attackerId);
    if (move.type === "TYPE_STEEL") attack = Math.trunc(attack * (param + 100) / 100);
    else spAttack = Math.trunc(spAttack * (param + 100) / 100);
  }
  if (attackerHold === 29) attack = Math.trunc(attack * 150 / 100); // Choice Band
  if (attackerHold === 35 && attacker.species === 373) spAttack *= 2;
  if (defenderHold === 36 && defender.species === 373) spDefense *= 2;
  if (attackerHold === 45 && attacker.species === 25) spAttack *= 2;
  if (defenderHold === 64 && defender.species === 132) defense *= 2;
  if (attackerHold === 65 && (attacker.species === 104 || attacker.species === 105)) attack *= 2;
  if (attacker.ability === 55) attack = Math.trunc(attack * 150 / 100); // Hustle
  const fieldAbilities = rules.battlers
    .slice(0, rules.battleTopology.battlersCount)
    .filter((b, index) => (rules.absentBattlerFlags & (1 << index)) === 0 && b.hp !== 0)
    .map((b) => b.ability);
  if ((attacker.ability === 57 && fieldAbilities.includes(58))
    || (attacker.ability === 58 && fieldAbilities.includes(57))) {
    spAttack = Math.trunc(spAttack * 150 / 100);
  }
  if (attacker.ability === 62 && attacker.status1 !== 0) attack = Math.trunc(attack * 150 / 100);
  if (defender.ability === 63 && defender.status1 !== 0) defense = Math.trunc(defense * 150 / 100);

  const sideStatus = rules.sideStatuses[defender.side];
  const aliveDefenders = rules.battlers
    .slice(0, rules.battleTopology.battlersCount)
    .filter((b, index) => b.side === defender.side
      && (rules.absentBattlerFlags & (1 << index)) === 0 && b.hp !== 0).length;
  return calculateBaseDamage({
    attacker: {
      attack, defense: attacker.defense, spAttack, spDefense: attacker.spDefense,
      level: attacker.level, types: attacker.types, statStages: statStages(attacker),
      isBurned: (attacker.status1 & (1 << 4)) !== 0,
      ability: attacker.ability === 62 ? "ABILITY_GUTS" : null,
    },
    defender: {
      attack: defender.attack, defense, spAttack: defender.spAttack, spDefense,
      level: defender.level, types: defender.types, statStages: statStages(defender),
    },
    movePower: move.power,
    moveType: move.type,
    isCriticalHit: false,
    sideStatusReflect: (sideStatus & SIDE_STATUS_REFLECT) !== 0,
    sideStatusLightScreen: (sideStatus & SIDE_STATUS_LIGHTSCREEN) !== 0,
    isDoubleBattleSpreadMove: (rules.battleTopology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0
      && aliveDefenders === 2
      && false, // both delayed moves are MOVE_TARGET_SELECTED
    moveEffect: move.effect,
  });
}

function createHandler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [pointer] = context.instruction.operands;
    if (context.instruction.operands.length !== 1 || pointer?.widthBytes !== 4) {
      throw new Error("Cmd_trysetfutureattack requires exactly one four-byte script pointer");
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    if (rules.futureSightCounter[target] !== 0) {
      const label = resolveBattleScriptLabel(program, pointer.expression);
      if (!label) throw new Error(`Cmd_trysetfutureattack unresolved target ${pointer.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
      );
    }
    const counter = [...rules.futureSightCounter] as [number, number, number, number];
    const move = [...rules.futureSightMove] as [number, number, number, number];
    const storedAttacker = [...rules.futureSightAttacker] as [number, number, number, number];
    const damage = [...rules.futureSightDmg] as [number, number, number, number];
    const sideStatuses = [...rules.sideStatuses] as [number, number];
    counter[target] = 3;
    move[target] = rules.currentMove;
    storedAttacker[target] = attacker;
    damage[target] = calculateFutureAttackBaseDamage(rules, attacker, target, rules.currentMove);
    if (rules.battlers[attacker].helpingHand === 1) damage[target] = Math.trunc(damage[target] * 15 / 10);
    sideStatuses[rules.battlers[target].side] |= SIDE_STATUS_FUTUREATTACK;
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), {
      rulesContext: Object.freeze({
        ...rules,
        sideStatuses: Object.freeze(sideStatuses),
        futureSightCounter: Object.freeze(counter),
        futureSightMove: Object.freeze(move),
        futureSightAttacker: Object.freeze(storedAttacker),
        futureSightDmg: Object.freeze(damage),
        multistringChooser: rules.currentMove === MOVE_DOOM_DESIRE ? 1 : 0,
      }),
    });
  };
}

export function createBattleScriptTrysetfutureattackOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter((i) => i.opcodeName === "B_SCR_OP_TRYSETFUTUREATTACK");
  if (instructions.length !== 1) throw new Error(`expected one B_SCR_OP_TRYSETFUTUREATTACK, got ${instructions.length}`);
  const instruction = instructions[0]!;
  if (instruction.opcodeId !== 0xc3 || instruction.dispatcher !== "Cmd_trysetfutureattack"
    || instruction.operands.length !== 1 || instruction.operands[0]!.widthBytes !== 4) {
    throw new Error("invalid B_SCR_OP_TRYSETFUTUREATTACK encoding");
  }
  return Object.freeze({ [instruction.opcodeId]: createHandler(program) });
}
