/**
 * `B_SCR_OP_TRYSETPERISHSONG` / `Cmd_trysetperishsong`
 * (`battle_script_commands.c:8508-8534`).
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
  type BattleScriptSchedulerState,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
} from "./battleScriptSourceConstants.ts";
import {
  withBattleScriptPartyMemberPp,
  type BattleScriptRulesBattlerState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";

const MOVE_PERISH_SONG = 195;
const ABILITY_PRESSURE = 46;

function requireInstruction(instruction: BattleScriptInstruction): string {
  const [failure] = instruction.operands;
  if (
    instruction.opcodeId !== 0xb2
    || instruction.dispatcher !== "Cmd_trysetperishsong"
    || instruction.operands.length !== 1
    || failure?.widthBytes !== 4
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRYSETPERISHSONG shape at program counter ${instruction.programCounter}`,
    );
  }
  return failure.expression;
}

function handler(program: BattleScriptProgram): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const failureExpression = requireInstruction(context.instruction);
    let rules = context.state.rulesContext;
    const count = rules.battleTopology.battlersCount;
    let notAffectedCount = 0;

    for (let i = 0; i < count; i += 1) {
      const battler = i as BattleScriptBattlerId;
      const state = rules.battlers[battler];
      if (
        (state.status3 & BATTLE_SCRIPT_STATUS3_PERISH_SONG) !== 0
        || state.ability === BATTLE_SCRIPT_ABILITY_SOUNDPROOF
      ) {
        notAffectedCount += 1;
      } else {
        rules = withBattler(rules, battler, {
          status3: (state.status3 | BATTLE_SCRIPT_STATUS3_PERISH_SONG) >>> 0,
          perishSongTimer: 3,
          perishSongTimerStartValue: 3,
        });
      }
    }

    // PressurePPLoseOnUsingPerishSong (battle_util.c:799-828): unlike ordinary ppreduce, this scans
    // every other battler because Perish Song's move target is USER. One PP per Pressure holder while
    // nonzero, then ONE persistent controller write after the loop (`:822-827`,
    // BtlController_EmitSetMonData(REQUEST_PPMOVE1_BATTLE + perishSongPos)): the party Pokemon's PP
    // follows the battler's. Without the party write the extra PP came back when the user left the field
    // and returned (ROM seed 5908, docs/parity-mac/party-pp-writes.md).
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    const perishSongPos = attackerState.moves.findIndex((move) => move === MOVE_PERISH_SONG);
    let scheduler: BattleScriptSchedulerState = context.state.scheduler;
    let events: ReadonlyArray<Readonly<{ kind: "set-battler-pp-data"; battler: BattleScriptBattlerId; movePosition: number; pp: number }>> = Object.freeze([]);
    if (perishSongPos !== -1) {
      let pp = attackerState.pp[perishSongPos]!;
      let pressureHolders = 0;
      for (let i = 0; i < count; i += 1) {
        if (i !== attacker && rules.battlers[i as BattleScriptBattlerId].ability === ABILITY_PRESSURE) {
          pressureHolders += 1;
          if (pp !== 0) pp -= 1;
        }
      }
      if (pp !== attackerState.pp[perishSongPos]) {
        const nextPp = attackerState.pp.map(
          (value, index) => index === perishSongPos ? pp : value,
        ) as unknown as BattleScriptRulesBattlerState["pp"];
        rules = withBattler(rules, attacker, { pp: nextPp });
      }
      const permanent = (attackerState.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0
        && (attackerState.mimickedMoves & (1 << perishSongPos)) === 0;
      if (pressureHolders !== 0 && permanent) {
        rules = Object.freeze({
          ...rules,
          party: withBattleScriptPartyMemberPp(rules.party, attackerState.side, attackerState.partyIndex, perishSongPos, pp),
        });
        scheduler = markBattleScriptControllerPending(Object.freeze({ ...scheduler, activeBattler: attacker }), attacker);
        events = Object.freeze([
          Object.freeze({ kind: "set-battler-pp-data" as const, battler: attacker, movePosition: perishSongPos, pp }),
        ]);
      }
    }

    if (notAffectedCount === count) {
      const failure = resolveBattleScriptLabel(program, failureExpression);
      if (!failure) {
        throw new Error(`Cmd_trysetperishsong unresolved failure target ${failureExpression}`);
      }
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "jump", programCounter: failure.programCounter }),
        { rulesContext: rules, scheduler, events },
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: rules, scheduler, events },
    );
  };
}

export function createBattleScriptTrysetperishsongOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYSETPERISHSONG",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYSETPERISHSONG requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: handler(program) });
}
