/**
 * `B_SCR_OP_REMOVEITEM` / `Cmd_removeitem` (`battle_script_commands.c:
 * 5901-5915`): `gBattleMons[battler].item = ITEM_NONE`, plus a controller
 * notify (`BtlController_EmitSetMonData(REQUEST_HELDITEM_BATTLE)` +
 * `MarkBattlerForControllerExec`). No busy gate at all (same "always
 * advances" shape as `Cmd_hitanimation` -- battle_script_commands.c never
 * checks `gBattleControllerExecFlags` here), and `usedHeldItems[battler]`
 * (the pre-clear item snapshot, consumed by Recycle/Bug Bite/Pluck -- none
 * of which this engine models yet) is intentionally not tracked: no ported
 * consumer reads it.
 *
 * This is the one new opcode `docs/endturn-abilities-items-ground-truth.md`
 * §5 slice 4 needs: every one of the ten `ItemBattleEffects`
 * `BattleScriptExecute`+`end2` cases wired this slice EXCEPT Leftovers ends
 * its script with `removeitem BS_SCRIPTING` (the eight cure berries + White
 * Herb) or `removeitem BS_ATTACKER` (Sitrus/Oran/Berry Juice, Leppa --
 * neither wired this slice, but their concrete instances still need eager
 * validation below since registration validates every instance the
 * committed program actually emits, not just the ones a caller currently
 * reaches). All 13 concrete call sites in the whole script corpus use one of
 * those two selectors (verified against the loaded program, not assumed) --
 * both already resolve through `resolveRulesBattlerForBattleScript` once
 * that shared port is widened for `BS_SCRIPTING` (this doc's own finding:
 * `gBattleScripting.battler`, the existing `scriptingBattler` rules field).
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { unsupportedBranch, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/items.h:5. */
const ITEM_NONE = 0;

function createRemoveitemOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const operand = context.instruction.operands[0];
    const battler = operand ? resolveBattlerForBattleScript(context, operand) : null;
    if (battler === null) {
      return unsupportedBranch(
        context,
        `Cmd_removeitem's GetBattlerForBattleScript selector `
          + `(${operand?.expression ?? "<missing>"}) is unavailable`,
        "battle_script_commands.c",
        5905,
      );
    }
    const rulesContext = withBattler(context.state.rulesContext, battler, { item: ITEM_NONE });
    const scheduler = markBattleScriptControllerPending(context.state.scheduler, battler);
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext,
        scheduler,
        events: Object.freeze([
          Object.freeze({ kind: "set-battler-item" as const, battler, item: ITEM_NONE }),
        ]),
      },
    );
  };
}

export function createBattleScriptRemoveitemOpcodeHandlers(
  program: BattleScriptProgram,
  ports: Readonly<{
    resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
  }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_REMOVEITEM",
  );
  if (starts.length !== 13) {
    throw new Error(`B_SCR_OP_REMOVEITEM requires all 13 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [operand] = instruction.operands;
    if (
      instruction.dispatcher !== "Cmd_removeitem"
      || instruction.operands.length !== 1
      || operand?.widthBytes !== 1
      || (operand.expression !== "BS_SCRIPTING" && operand.expression !== "BS_ATTACKER")
    ) {
      throw new Error(`invalid B_SCR_OP_REMOVEITEM shape at program counter ${instruction.programCounter}`);
    }
  }
  return Object.freeze({
    [starts[0]!.opcodeId]: createRemoveitemOpcodeHandler(ports.resolveBattlerForBattleScript),
  });
}
