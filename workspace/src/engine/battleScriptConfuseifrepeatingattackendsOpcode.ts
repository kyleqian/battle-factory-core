/**
 * `B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS` / `Cmd_confuseifrepeatingattackends`
 * (`battle_script_commands.c:7131-7136`, docs/yawn-thrash-endturn-design.md
 * §3, Rung 4) -- `BattleScript_EffectRampage2`'s own opcode, the one gap in
 * the Thrash/Outrage/Petal Dance lock-in-start script (every other
 * instruction is already registered). Zero operands, no jump target: it
 * only ever stages `gBattleCommunication[MOVE_EFFECT_BYTE]` (this engine's
 * `moveEffectByte` field) with `MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER`
 * when the attacker is not already locked in, then unconditionally advances.
 * The staged byte is read later by the shared `applySetMoveEffect` dispatcher
 * (`battleScriptHitChainOpcode.ts`'s own `MOVE_EFFECT_THRASH` case, this same
 * rung) via `BattleScript_HitFromCritCalc`'s downstream `seteffectwithchance`
 * -- `Cmd_seteffectwithchance` never re-derives the byte from the move's own
 * effect id, it only ever consumes whatever a preceding opcode already
 * staged (confirmed by direct read of `battle_script_commands.c:2908-2936`).
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { BATTLE_SCRIPT_STATUS2_MASKS } from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:300 -- SetMoveEffect's Thrash-family lock-in case. */
const MOVE_EFFECT_THRASH = 53;
/** include/constants/battle.h:309 -- SetMoveEffect's self-vs-target selector bit. */
const MOVE_EFFECT_AFFECTS_USER = 1 << 6;

function createConfuseifrepeatingattackendsHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_confuseifrepeatingattackends requires an attacker role");
    const attackerState = rulesContext.battlers[attacker];

    const alreadyLocked = (attackerState.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_LOCK_CONFUSE) !== 0;
    const nextRulesContext = alreadyLocked
      ? rulesContext
      : Object.freeze({
        ...rulesContext,
        moveEffectByte: (MOVE_EFFECT_THRASH | MOVE_EFFECT_AFFECTS_USER) >>> 0,
      });
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext: nextRulesContext });
  };
}

export function createBattleScriptConfuseifrepeatingattackendsOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS",
  );
  if (starts.length !== 1) {
    throw new Error(`B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS requires exactly 1 concrete start, got ${starts.length}`);
  }
  const [instruction] = starts;
  if (instruction!.operands.length !== 0) {
    throw new Error(`invalid B_SCR_OP_CONFUSEIFREPEATINGATTACKENDS shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createConfuseifrepeatingattackendsHandler() });
}
