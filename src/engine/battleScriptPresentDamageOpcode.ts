/**
 * Present's `B_SCR_OP_PRESENTDAMAGECALCULATION` /
 * `Cmd_presentdamagecalculation` (`battle_script_commands.c:8613-8647`).
 *
 * The command consumes exactly one `Random()` call and branches on its low
 * byte: 0..101 => power 40, 102..177 => 80, 178..203 => 120, and 204..255
 * => heal the target by max(1, floor(maxHP / 4)). Damage branches enter the
 * shared crit/damage tail. The heal branch fails at full HP; otherwise it
 * clears Present's earlier type-immunity result and enters the existing
 * negative-damage HP-update tail.
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { requireBattlerRole } from "./battleScriptHitChainOpcode.ts";

/** include/constants/battle.h: MOVE_RESULT_DOESNT_AFFECT_FOE. */
const MOVE_RESULT_DOESNT_AFFECT_FOE = 1 << 3;

function targetPc(program: BattleScriptProgram, label: string): number {
  const target = resolveBattleScriptLabel(program, label);
  if (!target) throw new Error(`Cmd_presentdamagecalculation requires ${label}`);
  return target.programCounter;
}

const presentDamageHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  if (context.instruction.operands.length !== 0) {
    throw new Error(
      `invalid B_SCR_OP_PRESENTDAMAGECALCULATION shape at program counter ${context.state.programCounter}`,
    );
  }
  const rules = context.state.rulesContext;
  const target = requireBattlerRole(rules, "target");
  const draw = drawBattleScriptRng(
    context.state.rng,
    context.instruction,
    "Cmd_presentdamagecalculation: Random() & 0xFF outcome",
  );
  const randomByte = draw.randomValue & 0xff;
  if (randomByte < 204) {
    const dynamicBasePower = randomByte < 102 ? 40 : randomByte < 178 ? 80 : 120;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({
        kind: "jump",
        programCounter: targetPc(context.program, "BattleScript_HitFromCritCalc"),
      }),
      {
        rng: draw.rng,
        rulesContext: Object.freeze({ ...rules, dynamicBasePower }),
      },
    );
  }

  const targetState = rules.battlers[target];
  let heal = Math.floor(targetState.maxHP / 4);
  if (heal === 0) heal = 1;
  const rulesWithDamage = Object.freeze({ ...rules, battleMoveDamage: -heal });
  if (targetState.hp === targetState.maxHP) {
    return transitionBattleScriptCommand(
      context,
      Object.freeze({
        kind: "jump",
        programCounter: targetPc(context.program, "BattleScript_AlreadyAtFullHp"),
      }),
      { rng: draw.rng, rulesContext: rulesWithDamage },
    );
  }
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "jump",
      programCounter: targetPc(context.program, "BattleScript_PresentHealTarget"),
    }),
    {
      rng: draw.rng,
      rulesContext: Object.freeze({
        ...rulesWithDamage,
        moveResultFlags:
          rulesWithDamage.moveResultFlags
          & ~MOVE_RESULT_DOESNT_AFFECT_FOE,
      }),
    },
  );
};

export function createBattleScriptPresentDamageOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_PRESENTDAMAGECALCULATION",
  );
  if (instructions.length !== 1) {
    throw new Error(
      "B_SCR_OP_PRESENTDAMAGECALCULATION requires exactly 1 concrete start, "
        + `got ${instructions.length}`,
    );
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xb7
    || instruction!.dispatcher !== "Cmd_presentdamagecalculation"
    || instruction!.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_PRESENTDAMAGECALCULATION shape at program counter ${instruction!.programCounter}`,
    );
  }
  return Object.freeze({ [instruction!.opcodeId]: presentDamageHandler });
}
