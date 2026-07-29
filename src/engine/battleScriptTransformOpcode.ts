/**
 * Transform's indivisible source step: Cmd_transformdataexecution plus the
 * raw BattlePokemon [0x00,0x24) copy boundary and controller reset receipt.
 */
import {
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptInstruction, BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, withBattler } from "./battleScriptHitChainOpcode.ts";
import type {
  BattleScriptRulesBattlerState,
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_FAILED,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE,
} from "./battleScriptSourceConstants.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type MoveRow = Readonly<{ id: number; pp: number }>;
const BASE_PP_BY_MOVE = new Map(
  (movesData.moves as readonly MoveRow[]).map(({ id, pp }) => [id, pp]),
);
const MOVE_UNAVAILABLE = 0xffff;

function requireInstruction(instruction: BattleScriptInstruction): void {
  if (
    instruction.opcodeId !== 0x9b
    || instruction.dispatcher !== "Cmd_transformdataexecution"
    || instruction.operands.length !== 0
  ) {
    throw new Error(
      `invalid B_SCR_OP_TRANSFORMDATAEXECUTION shape at program counter ${instruction.programCounter}`,
    );
  }
}

function createHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    requireInstruction(context.instruction);
    const rules = context.state.rulesContext;
    const attacker = requireBattlerRole(rules, "attacker");
    const target = requireBattlerRole(rules, "target");
    const targetState = rules.battlers[target];
    const chosenRules = Object.freeze({ ...rules, chosenMove: MOVE_UNAVAILABLE });

    if (
      (targetState.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) !== 0
      || (targetState.status3 & BATTLE_SCRIPT_STATUS3_SEMI_INVULNERABLE) !== 0
    ) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        {
          rulesContext: Object.freeze({
            ...chosenRules,
            moveResultFlags: (chosenRules.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_FAILED) >>> 0,
            multistringChooser: 1,
          }),
        },
      );
    }

    const attackerState = rules.battlers[attacker];
    const pp = targetState.moves.map((move) =>
      Math.min(BASE_PP_BY_MOVE.get(move) ?? 0, 5)
    ) as unknown as BattleScriptRulesBattlerState["pp"];
    const copied = withBattler(chosenRules, attacker, {
      // Exact struct BattlePokemon bytes [0x00,0x24).
      species: targetState.species,
      attack: targetState.attack,
      defense: targetState.defense,
      speed: targetState.speed,
      spAttack: targetState.spAttack,
      spDefense: targetState.spDefense,
      moves: targetState.moves,
      ivs: targetState.ivs,
      isEgg: targetState.isEgg,
      abilityNum: targetState.abilityNum,
      statStages: targetState.statStages,
      ability: targetState.ability,
      types: targetState.types,
      unknown: targetState.unknown,
      pp: Object.freeze(pp),
      // DisableStruct fields and status2 live after the copied range.
      status2: (attackerState.status2 | BATTLE_SCRIPT_STATUS2_TRANSFORMED) >>> 0,
      disabledMove: 0,
      disableTimer: 0,
      mimickedMoves: 0,
      transformedMonPersonality: targetState.personality,
    });
    const nextRules = Object.freeze({
      ...copied,
      battleTextBuff1Species: targetState.species,
      multistringChooser: 0,
    });
    const scheduler = markBattleScriptControllerPending(
      Object.freeze({ ...context.state.scheduler, activeBattler: attacker }),
      attacker,
    );
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      {
        rulesContext: nextRules,
        scheduler,
        events: Object.freeze([
          Object.freeze({
            kind: "reset-action-move-selection" as const,
            battler: attacker,
            reset: "move-selection" as const,
            command: 54 as const,
            argument: 2 as const,
          }),
        ]),
      },
    );
  };
}

export function createBattleScriptTransformOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_TRANSFORMDATAEXECUTION",
  );
  if (instructions.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRANSFORMDATAEXECUTION requires exactly 1 concrete start, got ${instructions.length}`,
    );
  }
  requireInstruction(instructions[0]!);
  return Object.freeze({ [instructions[0]!.opcodeId]: createHandler() });
}
