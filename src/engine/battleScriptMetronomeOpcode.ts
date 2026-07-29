/**
 * `B_SCR_OP_METRONOME` / `Cmd_metronome`
 * (`battle_script_commands.c:7885-7923`).
 *
 * Unlike Sleep Talk and Assist, this selector writes gCurrentMove directly
 * and tail-jumps to the selected effect without touching gCalledMove or the
 * script stack. gChosenMove and gCurrMovePos deliberately remain Metronome's.
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveDynamicMoveTarget } from "./battleScriptSleepTalkOpcode.ts";
import {
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  resolveBattleScriptCurrentMoveEffect,
  resolveBattleScriptCurrentMovePower,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

type MoveRow = Readonly<{ id: number; move: string }>;
type EffectRow = Readonly<{ id: number; entryScript: string }>;

const MOVE_ROWS = movesData.moves as readonly MoveRow[];
const MOVE_BY_NAME = new Map(MOVE_ROWS.map(({ move, id }) => [move, id]));
const EFFECT_ENTRY_BY_ID = new Map(
  (topologyData.effects as readonly EffectRow[]).map(({ id, entryScript }) => [id, entryScript]),
);
const MOVES_COUNT = MOVE_ROWS.length;
const MIMIC_FORBIDDEN_END = 0xfffe;
const METRONOME_FORBIDDEN_END = 0xffff;

function requireMove(name: string): number {
  const move = MOVE_BY_NAME.get(name);
  if (move === undefined) throw new Error(`Cmd_metronome: missing generated ${name}`);
  return move;
}

/**
 * Exact `sMovesForbiddenToCopy` order. Metronome scans past 0xfffe, which
 * terminates only Mimic's prefix, and stops solely at 0xffff.
 */
export const METRONOME_FORBIDDEN_MOVE_TABLE = Object.freeze([
  requireMove("MOVE_METRONOME"),
  requireMove("MOVE_STRUGGLE"),
  requireMove("MOVE_SKETCH"),
  requireMove("MOVE_MIMIC"),
  MIMIC_FORBIDDEN_END,
  requireMove("MOVE_COUNTER"),
  requireMove("MOVE_MIRROR_COAT"),
  requireMove("MOVE_PROTECT"),
  requireMove("MOVE_DETECT"),
  requireMove("MOVE_ENDURE"),
  requireMove("MOVE_DESTINY_BOND"),
  requireMove("MOVE_SLEEP_TALK"),
  requireMove("MOVE_THIEF"),
  requireMove("MOVE_FOLLOW_ME"),
  requireMove("MOVE_SNATCH"),
  requireMove("MOVE_HELPING_HAND"),
  requireMove("MOVE_COVET"),
  requireMove("MOVE_TRICK"),
  requireMove("MOVE_FOCUS_PUNCH"),
  METRONOME_FORBIDDEN_END,
]);

function isMetronomeForbidden(move: number): boolean {
  for (const entry of METRONOME_FORBIDDEN_MOVE_TABLE) {
    if (entry === move) return true;
    if (entry === METRONOME_FORBIDDEN_END) return false;
  }
  throw new Error("Cmd_metronome: forbidden table lacks its 0xffff terminator");
}

function createMetronomeHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const attacker = rules.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_metronome requires an attacker role");

    let rng = context.state.rng;
    let selected: number;
    do {
      const draw = drawBattleScriptRng(
        rng,
        context.instruction,
        "metronome-candidate",
      );
      rng = draw.rng;
      selected = (draw.randomValue & 0x1ff) + 1;
    } while (selected >= MOVES_COUNT || isMetronomeForbidden(selected));

    const effect = resolveBattleScriptCurrentMoveEffect(selected);
    const entryName = EFFECT_ENTRY_BY_ID.get(effect);
    const entry = entryName ? resolveBattleScriptLabel(program, entryName) : undefined;
    if (!entry) {
      throw new Error(`Cmd_metronome: move ${selected} effect ${effect} has no script entry`);
    }
    const targeted = resolveDynamicMoveTarget(
      rules,
      attacker,
      selected,
      context.instruction,
      rng,
      "metronome-selected-target",
    );
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: entry.programCounter }),
      {
        rulesContext: Object.freeze({
          ...rules,
          battlers: targeted.battlers,
          currentMove: selected,
          currentMoveEffect: effect,
          currentMovePower: resolveBattleScriptCurrentMovePower(selected),
          hitMarker: (rules.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) >>> 0,
          selectorRoles: Object.freeze({
            ...rules.selectorRoles,
            target: targeted.target,
          }),
        }),
        rng: targeted.rng,
      },
    );
  };
}

export function createBattleScriptMetronomeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instructions = program.instructions.filter(
    ({ opcodeName }) => opcodeName === "B_SCR_OP_METRONOME",
  );
  if (
    instructions.length !== 1
    || instructions[0]!.opcodeId !== 0x9e
    || instructions[0]!.dispatcher !== "Cmd_metronome"
    || instructions[0]!.operands.length !== 0
  ) {
    throw new Error(`invalid B_SCR_OP_METRONOME committed shape (${instructions.length})`);
  }
  return Object.freeze({
    [instructions[0]!.opcodeId]: createMetronomeHandler(program),
  });
}
