/**
 * Recycle's `B_SCR_OP_TRYRECYCLEITEM` / `Cmd_tryrecycleitem`
 * (`battle_script_commands.c:9808-9830`).
 *
 * Success requires a recorded consumed item and an empty active held-item
 * slot. It transfers `usedHeldItems[attacker]` back into the active and
 * persistent party owners, clears the consumed-item cell, records
 * gLastUsedItem for the message, and emits the held-item controller write.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  withBattleScriptPartyMemberItem,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

const ITEM_NONE = 0;

function createTryrecycleitemHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [failureOperand] = context.instruction.operands;
    if (
      context.instruction.opcodeId !== 0xea
      || context.instruction.dispatcher !== "Cmd_tryrecycleitem"
      || context.instruction.operands.length !== 1
      || failureOperand?.widthBytes !== 4
    ) {
      throw new Error(`invalid B_SCR_OP_TRYRECYCLEITEM shape at program counter ${context.state.programCounter}`);
    }
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    const usedItem = rules.usedHeldItems[attacker];
    if (usedItem === ITEM_NONE || attackerState.item !== ITEM_NONE) {
      const failure = resolveBattleScriptLabel(context.program, failureOperand.expression);
      if (!failure) throw new Error(`Cmd_tryrecycleitem: unresolved failure target ${failureOperand.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
      );
    }
    const usedHeldItems = Object.freeze(
      rules.usedHeldItems.map((item, index) => index === attacker ? ITEM_NONE : item),
    ) as BattleScriptRulesContext["usedHeldItems"];
    const party = withBattleScriptPartyMemberItem(
      rules.party,
      attackerState.side,
      attackerState.partyIndex,
      usedItem,
    );
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: Object.freeze({
          ...withBattler(rules, attacker, { item: usedItem }),
          party,
          usedHeldItems,
          lastUsedItem: usedItem,
        }),
        scheduler: markBattleScriptControllerPending(context.state.scheduler, attacker),
        events: Object.freeze([
          Object.freeze({ kind: "set-battler-item" as const, battler: attacker, item: usedItem }),
        ]),
      },
    );
  };
}

export function createBattleScriptTryrecycleitemOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYRECYCLEITEM",
  );
  if (instructions.length !== 1) {
    throw new Error(`B_SCR_OP_TRYRECYCLEITEM requires exactly 1 concrete start, got ${instructions.length}`);
  }
  const [instruction] = instructions;
  if (
    instruction!.opcodeId !== 0xea
    || instruction!.dispatcher !== "Cmd_tryrecycleitem"
    || instruction!.operands.length !== 1
    || instruction!.operands[0]?.widthBytes !== 4
  ) {
    throw new Error(`invalid B_SCR_OP_TRYRECYCLEITEM shape at program counter ${instruction!.programCounter}`);
  }
  return Object.freeze({ [instruction!.opcodeId]: createTryrecycleitemHandler() });
}
