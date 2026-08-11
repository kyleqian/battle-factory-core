/**
 * `B_SCR_OP_SETYAWN` / `Cmd_setyawn` (`battle_script_commands.c:9352-9364`,
 * docs/yawn-thrash-endturn-design.md §1a) -- `BattleScript_EffectYawn`'s own
 * setter, the one opcode gap in that script (every other instruction is
 * already registered). Same one-ptr-operand, implicit-`BS_TARGET` shape as
 * `Cmd_trysetroots` (`battleScriptIngrainLeechSeedWrapOpcode.ts`'s
 * `createTrysetrootsHandler`) -- no `GetBattlerForBattleScript` selector
 * operand at all, always `gBattlerTarget`. Two real fail conditions ORed
 * together (already yawning, or any `status1` bit already set); success
 * writes a fresh 2-turn countdown (`STATUS3_YAWN_TURN(2)`, `battle.h:168-
 * 169`) into the target's `status3`. `ENDTURN_YAWN`'s own countdown
 * decrement/sleep transition is a separate rung (design doc §2, Rung 2) --
 * this opcode only ever writes the initial value.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  BATTLE_SCRIPT_STATUS1_SLEEP,
  BATTLE_SCRIPT_STATUS3_YAWN,
  BATTLE_SCRIPT_STATUS3_YAWN_TURN_2,
} from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:117-123,125 -- STATUS1_ANY, the same union `battleScriptStatusPrimaryOpcode.ts`'s own STATUS1_SINGLE_BITS resolves. */
const STATUS1_POISON = 1 << 3;
const STATUS1_BURN = 1 << 4;
const STATUS1_FREEZE = 1 << 5;
const STATUS1_PARALYSIS = 1 << 6;
const STATUS1_TOXIC_POISON = 1 << 7;
const STATUS1_ANY = BATTLE_SCRIPT_STATUS1_SLEEP | STATUS1_POISON | STATUS1_BURN
  | STATUS1_FREEZE | STATUS1_PARALYSIS | STATUS1_TOXIC_POISON;

function createSetyawnHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const target = rulesContext.selectorRoles.target;
    if (target === null) throw new Error("Cmd_setyawn requires a target role");
    const targetState = rulesContext.battlers[target];

    const alreadyYawnedOrStatused =
      (targetState.status3 & BATTLE_SCRIPT_STATUS3_YAWN) !== 0
      || (targetState.status1 & STATUS1_ANY) !== 0;
    if (alreadyYawnedOrStatused) {
      const failOperand = context.instruction.operands[0]!;
      const failTarget = resolveBattleScriptLabel(context.program, failOperand.expression);
      if (!failTarget) throw new Error(`Cmd_setyawn: unresolved fail label ${failOperand.expression}`);
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "jump", programCounter: failTarget.programCounter }));
    }

    const nextRulesContext = withBattler(rulesContext, target, {
      status3: (targetState.status3 | BATTLE_SCRIPT_STATUS3_YAWN_TURN_2) >>> 0,
    });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
  };
}

export function createBattleScriptSetyawnOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === "B_SCR_OP_SETYAWN");
  if (starts.length !== 1) {
    throw new Error(`B_SCR_OP_SETYAWN requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== 1) {
    throw new Error(`invalid B_SCR_OP_SETYAWN shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createSetyawnHandler() });
}
