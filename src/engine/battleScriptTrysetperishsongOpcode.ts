/**
 * `B_SCR_OP_TRYSETPERISHSONG` / `Cmd_trysetperishsong`
 * (`battle_script_commands.c:8508-8534`).
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_ABILITY_SOUNDPROOF,
  BATTLE_SCRIPT_STATUS3_PERISH_SONG,
} from "./battleScriptSourceConstants.ts";
import type {
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
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

    // PressurePPLoseOnUsingPerishSong: unlike ordinary ppreduce, this scans
    // every other battler because Perish Song's move target is USER.
    const attacker = requireBattlerRole(rules, "attacker");
    const attackerState = rules.battlers[attacker];
    const perishSongPos = attackerState.moves.findIndex((move) => move === MOVE_PERISH_SONG);
    if (perishSongPos !== -1) {
      let pp = attackerState.pp[perishSongPos]!;
      for (let i = 0; i < count; i += 1) {
        if (
          i !== attacker
          && rules.battlers[i as BattleScriptBattlerId].ability === ABILITY_PRESSURE
          && pp !== 0
        ) {
          pp -= 1;
        }
      }
      if (pp !== attackerState.pp[perishSongPos]) {
        const nextPp = attackerState.pp.map(
          (value, index) => index === perishSongPos ? pp : value,
        ) as unknown as BattleScriptRulesBattlerState["pp"];
        rules = withBattler(rules, attacker, { pp: nextPp });
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
        { rulesContext: rules },
      );
    }
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: rules },
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
