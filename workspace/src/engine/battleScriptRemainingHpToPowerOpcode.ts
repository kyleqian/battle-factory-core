/**
 * `B_SCR_OP_REMAININGHPTOPOWER` / `Cmd_remaininghptopower`
 * (`battle_script_commands.c:8303-8316`) -- the shared Flail/Reversal
 * dynamic-power setter.
 *
 * The source first computes `GetScaledHPFraction(hp, maxHP, 48)`, whose
 * integer division is floored and whose only correction maps a living
 * battler's zero result to one. It then selects the first inclusive threshold
 * in `sFlailHpScaleToPowerTable`:
 *
 *   <= 1: 200, <= 4: 150, <= 9: 100,
 *   <= 16: 80, <= 32: 40, <= 48: 20.
 *
 * The command has no operands, consumes no RNG, emits no event, and mutates
 * only source `gDynamicBasePower`.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

const FLAIL_HP_SCALE_TO_POWER = Object.freeze([
  [1, 200],
  [4, 150],
  [9, 100],
  [16, 80],
  [32, 40],
  [48, 20],
] as const);

export function remainingHpToPower(hp: number, maxHP: number): number {
  let hpFraction = Math.trunc((hp * 48) / maxHP);
  if (hpFraction === 0 && hp > 0) hpFraction = 1;
  for (const [threshold, power] of FLAIL_HP_SCALE_TO_POWER) {
    if (hpFraction <= threshold) return power;
  }
  throw new Error(`GetScaledHPFraction produced out-of-range Flail fraction ${hpFraction}`);
}

const remainingHpToPowerHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const attacker = requireBattlerRole(context.state.rulesContext, "attacker");
  const attackerState = context.state.rulesContext.battlers[attacker];
  const dynamicBasePower = remainingHpToPower(attackerState.hp, attackerState.maxHP);
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    {
      rulesContext: Object.freeze({
        ...context.state.rulesContext,
        dynamicBasePower,
      }),
    },
  );
};

export function createBattleScriptRemainingHpToPowerOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (candidate) => candidate.opcodeName === "B_SCR_OP_REMAININGHPTOPOWER",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_REMAININGHPTOPOWER requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.dispatcher !== "Cmd_remaininghptopower"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_REMAININGHPTOPOWER shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: remainingHpToPowerHandler });
}
