/**
 * `B_SCR_OP_TRYSETREST` / `Cmd_trysetrest` (`battle_script_commands.c:
 * 6762-6784`) -- `BattleScript_EffectRest`'s full-heal-and-sleep setter, the
 * script's only mechanical opcode (the surrounding gate is already-registered
 * `jumpifstatus BS_ATTACKER, STATUS1_SLEEP`/`jumpifcantmakeasleep`). Real
 * fallthrough order: (1) `gActiveBattler = gBattlerTarget = gBattlerAttacker`
 * -- Rest permanently reassigns the target role to the attacker for the rest
 * of this action, so the shared `BattleScript_PresentHealTarget` tail's
 * `datahpupdate BS_TARGET`/`healthbarupdate BS_TARGET` land on the same
 * battler that just fell asleep; modeled as reassigning `selectorRoles.target`
 * (the same mechanism `applyBattleScriptMoveEndUpdateLastMovesOwnership`'s own
 * attacker/target swap uses, `battleScriptRulesContext.ts`); (2)
 * `gBattleMoveDamage = -maxHP`, written unconditionally before the full-HP
 * branch, matching source exactly even though the fail path never reads it
 * back; (3) full-HP check jumps to the operand's fail pointer
 * (`BattleScript_AlreadyAtFullHp`); (4) otherwise the message chooser is
 * picked from whether any NON-sleep status1 bit is set (`STATUS1_SLEEP` is
 * the low 3 bits/turn-counter, so `status1 & ~STATUS1_SLEEP` is exactly "has
 * some other status"), status1 is unconditionally REPLACED (not OR'd) with
 * `STATUS1_SLEEP_TURN(3)` -- Rest cures any pre-existing non-sleep status in
 * the same write -- synced to the party mirror exactly like SetMoveEffect's
 * own sleep write (`battleScriptHitChainOpcode.ts`'s `finishStatusWrite`),
 * and a `set-battler-status-data` event mirrors the real
 * `BtlController_EmitSetMonData(REQUEST_STATUS_BATTLE)` call.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import {
  withBattleScriptPartyMemberStatus1,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:115-116 -- low 3 bits double as the sleep-turn counter. */
const STATUS1_SLEEP = 7;
const STATUS1_SLEEP_TURN_3 = 3;

/** include/constants/battle_string_ids.h:467-468. */
const B_MSG_REST = 0;
const B_MSG_REST_STATUSED = 1;

function createTrysetrestHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_trysetrest requires an attacker role");
    const attackerState = rulesContext.battlers[attacker];

    const selectorRoles = Object.freeze({ ...rulesContext.selectorRoles, target: attacker });
    const battleMoveDamage = -attackerState.maxHP;
    const baseRulesContext = Object.freeze({ ...rulesContext, selectorRoles, battleMoveDamage });

    if (attackerState.hp === attackerState.maxHP) {
      const [ptrOperand] = context.instruction.operands;
      const label = resolveBattleScriptLabel(context.program, ptrOperand!.expression);
      if (!label) throw new Error(`Cmd_trysetrest: unresolved jump target ${ptrOperand!.expression}`);
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: label.programCounter }),
        { rulesContext: baseRulesContext },
      );
    }

    const multistringChooser = (attackerState.status1 & ~STATUS1_SLEEP) !== 0
      ? B_MSG_REST_STATUSED
      : B_MSG_REST;
    const updatedContext = withBattler(baseRulesContext, attacker, { status1: STATUS1_SLEEP_TURN_3 });
    const nextRulesContext = Object.freeze({
      ...updatedContext,
      multistringChooser,
      party: withBattleScriptPartyMemberStatus1(
        updatedContext.party,
        attackerState.side,
        attackerState.partyIndex,
        STATUS1_SLEEP_TURN_3,
      ),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRulesContext,
        events: Object.freeze([
          Object.freeze({
            kind: "set-battler-status-data" as const,
            battler: attacker,
            status1: STATUS1_SLEEP_TURN_3,
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptTrysetrestOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_TRYSETREST",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_TRYSETREST");
  }
  return Object.freeze({ [instruction.opcodeId]: createTrysetrestHandler() });
}
