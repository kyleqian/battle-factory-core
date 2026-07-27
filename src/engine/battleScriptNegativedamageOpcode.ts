/**
 * `B_SCR_OP_NEGATIVEDAMAGE` / `Cmd_negativedamage` (`battle_script_commands.c:
 * 6925-6932`) -- the drain-move heal-amount setter shared by
 * `BattleScript_EffectAbsorb`/`BattleScript_EffectDreamEater` (the only two
 * `negativedamage` call sites source-wide). Reads the just-dealt-to-target
 * `gHpDealt` (`Cmd_datahpupdate`'s own bookkeeping, `battleScriptHitChainOpcode.ts`'s
 * `hpDealt` field) and halves it into a negative `gBattleMoveDamage` for the
 * immediately-following `datahpupdate BS_ATTACKER` to apply as an HP gain --
 * that negative-damage HP-gain branch is already modeled
 * (`battleScriptHitChainOpcode.ts:1985-2010`, verified this session, not
 * assumed free). Zero operands, no RNG. C's `/` truncates toward zero and
 * `gHpDealt` is always non-negative on this path (it is only ever written
 * from the positive-damage branches of `Cmd_datahpupdate`), so `Math.floor`
 * matches. The `gBattleMoveDamage == 0` guard (`gHpDealt` 0 or 1) forces a
 * minimum-1 HP drain rather than a 0 HP no-op heal.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

function createNegativedamageHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    if (context.instruction.operands.length !== 0) {
      throw new Error(
        `invalid B_SCR_OP_NEGATIVEDAMAGE shape at program counter ${context.state.programCounter}`,
      );
    }
    let battleMoveDamage = -Math.floor(rulesContext.hpDealt / 2);
    if (battleMoveDamage === 0) battleMoveDamage = -1;
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rulesContext, battleMoveDamage }) },
    );
  };
}

export function createBattleScriptNegativedamageOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_NEGATIVEDAMAGE",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_NEGATIVEDAMAGE");
  }
  return Object.freeze({ [instruction.opcodeId]: createNegativedamageHandler() });
}
