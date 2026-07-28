/**
 * `B_SCR_OP_TRYCHOOSESLEEPTALKMOVE` / `Cmd_trychoosesleeptalkmove`
 * (`battle_script_commands.c:8241-8277`) and
 * `B_SCR_OP_JUMPTOCALLEDMOVE` / `Cmd_jumptocalledmove` (`:5743-5752`).
 *
 * These are one source control-flow unit: Sleep Talk chooses a usable move
 * slot with the live battle RNG, then the second opcode directly replaces
 * the script cursor with that called move's effect entry. The direct jump is
 * deliberately not a call and never pushes a return address.
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
  type BattleScriptRngState,
} from "./battleScriptMachine.ts";
import type { BattleScriptInstruction, BattleScriptProgram } from "./battleScriptProgram.ts";
import { resolveBattleScriptLabel } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE,
  BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED,
  BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND,
  resolveBattleScriptBattlerAtPosition,
  resolveBattleScriptBattlerHoldEffect,
  resolveBattleScriptCurrentMoveEffect,
  resolveBattleScriptCurrentMovePower,
  resolveBattleScriptMoveTarget,
  resolveBattleScriptMoveType,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import { scanBattleScriptImprisonedMoves } from "./battleScriptActionAdmission.ts";
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };
import topologyData from "../data/gen/battle-script-topology.json" with { type: "json" };

type MoveRow = Readonly<{
  id: number;
  move: string;
  effect: string;
}>;

type EffectRow = Readonly<{
  id: number;
  entryScript: string;
}>;

const MOVE_ROWS = movesData.moves as readonly MoveRow[];
const MOVE_BY_NAME = new Map(MOVE_ROWS.map((row) => [row.move, row.id]));
const MOVE_EFFECT_NAME_BY_ID = new Map(MOVE_ROWS.map((row) => [row.id, row.effect]));
const EFFECT_ENTRY_BY_ID = new Map(
  (topologyData.effects as readonly EffectRow[]).map((row) => [row.id, row.entryScript]),
);

function requireMoveId(name: string): number {
  const id = MOVE_BY_NAME.get(name);
  if (id === undefined) throw new Error(`Cmd_trychoosesleeptalkmove: missing generated ${name}`);
  return id;
}

const INVALID_CALLED_MOVES = new Set([
  0, // MOVE_NONE
  requireMoveId("MOVE_SLEEP_TALK"),
  requireMoveId("MOVE_ASSIST"),
  requireMoveId("MOVE_MIRROR_MOVE"),
  requireMoveId("MOVE_METRONOME"),
  requireMoveId("MOVE_FOCUS_PUNCH"),
  requireMoveId("MOVE_UPROAR"),
]);

const TWO_TURN_EFFECTS = new Set([
  "EFFECT_SKULL_BASH",
  "EFFECT_RAZOR_WIND",
  "EFFECT_SKY_ATTACK",
  "EFFECT_SOLAR_BEAM",
  "EFFECT_SEMI_INVULNERABLE",
  "EFFECT_BIDE",
]);

/** include/constants/battle.h:155. */
const STATUS2_TORMENT = 1 << 31;
/** include/constants/abilities.h:35. */
const ABILITY_LIGHTNING_ROD = 31;
/** include/constants/pokemon.h:19. */
const TYPE_ELECTRIC = 13;
/** include/constants/battle.h:56. */
const BIT_FLANK = 2;
/** include/constants/battle.h:28-31. */
const B_POSITION_PLAYER_LEFT = 0;
const B_POSITION_OPPONENT_LEFT = 1;
const B_POSITION_PLAYER_RIGHT = 2;
const B_POSITION_OPPONENT_RIGHT = 3;

function requireAttacker(rules: BattleScriptRulesContext): BattleScriptBattlerId {
  const attacker = rules.selectorRoles.attacker;
  if (attacker === null) throw new Error("Cmd_trychoosesleeptalkmove requires an attacker role");
  return attacker;
}

function battlerSide(
  rules: BattleScriptRulesContext,
  battler: BattleScriptBattlerId,
): 0 | 1 {
  return (rules.battleTopology.battlerPositions[battler]! & 1) as 0 | 1;
}

function isTwoTurnMove(move: number): boolean {
  return TWO_TURN_EFFECTS.has(MOVE_EFFECT_NAME_BY_ID.get(move) ?? "");
}

function sleepTalkUnusableMask(
  rules: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
): number {
  const battler = rules.battlers[attacker];
  const lastMove = rules.moveHistory.lastMoves[attacker]!;
  const choicedMove = rules.choicedMove[attacker]!;
  const holdEffect = resolveBattleScriptBattlerHoldEffect(rules, attacker);
  let mask = 0;

  for (let slot = 0; slot < 4; slot += 1) {
    const move = battler.moves[slot]!;
    const sourceExcluded = INVALID_CALLED_MOVES.has(move) || isTwoTurnMove(move);
    const disabled = move === battler.disabledMove;
    const tormented = move === lastMove
      && (battler.status2 & STATUS2_TORMENT) !== 0;
    const taunted = battler.tauntTimer !== 0
      && resolveBattleScriptCurrentMovePower(move) === 0;
    const imprisoned = scanBattleScriptImprisonedMoves(rules, attacker, move).isImprisoned;
    const encored = battler.encoreTimer !== 0 && battler.encoredMove !== move;
    const choiceLocked = holdEffect === BATTLE_SCRIPT_HOLD_EFFECT_CHOICE_BAND
      && choicedMove !== 0 // MOVE_NONE
      && choicedMove !== 0xffff // MOVE_UNAVAILABLE
      && choicedMove !== move;
    // CheckMoveLimitations receives ~MOVE_LIMITATION_PP: empty PP is
    // intentionally absent from this union.
    if (
      sourceExcluded
      || disabled
      || tormented
      || taunted
      || imprisoned
      || encored
      || choiceLocked
    ) {
      mask |= 1 << slot;
    }
  }
  return mask;
}

type TargetResolution = Readonly<{
  target: BattleScriptBattlerId;
  rng: BattleScriptRngState;
  battlers: BattleScriptRulesContext["battlers"];
}>;

function drawTargetRng(
  rng: BattleScriptRngState,
  instruction: BattleScriptInstruction,
): ReturnType<typeof drawBattleScriptRng> {
  return drawBattleScriptRng(rng, instruction, "sleep-talk-called-move-target");
}

/** Source-complete `GetMoveTarget(gCalledMove, NO_TARGET_OVERRIDE)`. */
function resolveCalledMoveTarget(
  rules: BattleScriptRulesContext,
  attacker: BattleScriptBattlerId,
  move: number,
  instruction: BattleScriptInstruction,
  initialRng: BattleScriptRngState,
): TargetResolution {
  const moveTarget = resolveBattleScriptMoveTarget(move);
  const topology = rules.battleTopology;
  const attackerSide = battlerSide(rules, attacker);
  const opposingSide = (attackerSide ^ 1) as 0 | 1;
  const followMe = rules.sideTimers[opposingSide];
  let rng = initialRng;
  let target = 0 as BattleScriptBattlerId;
  let battlers = rules.battlers;

  switch (moveTarget) {
    case 0: { // MOVE_TARGET_SELECTED
      if (followMe.followmeTimer !== 0 && rules.battlers[followMe.followmeTarget].hp !== 0) {
        target = followMe.followmeTarget;
      } else {
        do {
          const draw = drawTargetRng(rng, instruction);
          rng = draw.rng;
          target = (draw.randomValue % topology.battlersCount) as BattleScriptBattlerId;
        } while (
          target === attacker
          || battlerSide(rules, target) === attackerSide
          || (rules.absentBattlerFlags & (1 << target)) !== 0
        );

        const hasOpposingLightningRod = rules.battlers.some((candidate, index) =>
          index < topology.battlersCount
          && battlerSide(rules, index as BattleScriptBattlerId) !== attackerSide
          && candidate.ability === ABILITY_LIGHTNING_ROD
        );
        if (
          resolveBattleScriptMoveType(move, 0) === TYPE_ELECTRIC
          && hasOpposingLightningRod
          && rules.battlers[target].ability !== ABILITY_LIGHTNING_ROD
        ) {
          target = (target ^ BIT_FLANK) as BattleScriptBattlerId;
          battlers = Object.freeze(rules.battlers.map((candidate, index) =>
            index === target
              ? Object.freeze({
                ...candidate,
                lightningRodRedirected: 1 as const,
              })
              : candidate
          )) as BattleScriptRulesContext["battlers"];
        }
      }
      break;
    }
    case 1 << 0: // MOVE_TARGET_DEPENDS
    case 1 << 3: // MOVE_TARGET_BOTH
    case 1 << 5: // MOVE_TARGET_FOES_AND_ALLY
    case 1 << 6: { // MOVE_TARGET_OPPONENTS_FIELD
      target = resolveBattleScriptBattlerAtPosition(topology, opposingSide) as BattleScriptBattlerId;
      if ((rules.absentBattlerFlags & (1 << target)) !== 0) {
        target = (target ^ BIT_FLANK) as BattleScriptBattlerId;
      }
      break;
    }
    case 1 << 2: { // MOVE_TARGET_RANDOM
      if (followMe.followmeTimer !== 0 && rules.battlers[followMe.followmeTarget].hp !== 0) {
        target = followMe.followmeTarget;
      } else if (
        (topology.battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_DOUBLE) !== 0
      ) {
        const draw = drawTargetRng(rng, instruction);
        rng = draw.rng;
        const position = attackerSide === 0
          ? ((draw.randomValue & 1) !== 0 ? B_POSITION_OPPONENT_LEFT : B_POSITION_OPPONENT_RIGHT)
          : ((draw.randomValue & 1) !== 0 ? B_POSITION_PLAYER_LEFT : B_POSITION_PLAYER_RIGHT);
        target = resolveBattleScriptBattlerAtPosition(topology, position) as BattleScriptBattlerId;
        if ((rules.absentBattlerFlags & (1 << target)) !== 0) {
          target = (target ^ BIT_FLANK) as BattleScriptBattlerId;
        }
      } else {
        target = resolveBattleScriptBattlerAtPosition(topology, opposingSide) as BattleScriptBattlerId;
      }
      break;
    }
    case 1 << 1: // MOVE_TARGET_USER_OR_SELECTED
    case 1 << 4: // MOVE_TARGET_USER
      target = attacker;
      break;
  }

  return Object.freeze({ target, rng, battlers });
}

function createTryChooseSleepTalkMoveHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [pointer] = context.instruction.operands;
    const selectedEntry = pointer?.widthBytes === 4
      ? resolveBattleScriptLabel(program, pointer.expression)
      : undefined;
    if (
      context.instruction.operands.length !== 1
      || !selectedEntry
    ) {
      throw new Error("Cmd_trychoosesleeptalkmove requires one resolved four-byte script pointer");
    }

    const rules = context.state.rulesContext;
    const attacker = requireAttacker(rules);
    const unusableMask = sleepTalkUnusableMask(rules, attacker);
    if (unusableMask === 0x0f) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
      );
    }

    let rng = context.state.rng;
    let movePosition: number;
    do {
      const draw = drawBattleScriptRng(
        rng,
        context.instruction,
        "trychoosesleeptalkmove-slot",
      );
      rng = draw.rng;
      movePosition = draw.randomValue % 4;
    } while ((unusableMask & (1 << movePosition)) !== 0);

    const calledMove = rules.battlers[attacker].moves[movePosition]!;
    const target = resolveCalledMoveTarget(
      rules,
      attacker,
      calledMove,
      context.instruction,
      rng,
    );
    const nextRules = Object.freeze({
      ...rules,
      battlers: target.battlers,
      calledMove,
      currentMovePosition: movePosition,
      hitMarker: (rules.hitMarker & ~BATTLE_SCRIPT_HITMARKER_ATTACKSTRING_PRINTED) >>> 0,
      selectorRoles: Object.freeze({
        ...rules.selectorRoles,
        target: target.target,
      }),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: selectedEntry.programCounter }),
      { rulesContext: nextRules, rng: target.rng },
    );
  };
}

function createJumpToCalledMoveHandler(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const [notChosenMove] = context.instruction.operands;
    const value = notChosenMove?.expression === "TRUE" || notChosenMove?.expression === "1"
      ? 1
      : notChosenMove?.expression === "FALSE" || notChosenMove?.expression === "0"
        ? 0
        : null;
    if (
      context.instruction.operands.length !== 1
      || notChosenMove?.widthBytes !== 1
      || value === null
    ) {
      throw new Error("Cmd_jumptocalledmove requires one TRUE/FALSE byte operand");
    }

    const rules = context.state.rulesContext;
    const effect = resolveBattleScriptCurrentMoveEffect(rules.calledMove);
    const entryName = EFFECT_ENTRY_BY_ID.get(effect);
    const entry = entryName === undefined
      ? undefined
      : resolveBattleScriptLabel(program, entryName);
    if (!entry) {
      throw new Error(
        `Cmd_jumptocalledmove: called move ${rules.calledMove} effect ${effect} has no script entry`,
      );
    }
    const nextRules = Object.freeze({
      ...rules,
      currentMove: rules.calledMove,
      currentMoveEffect: effect,
      currentMovePower: resolveBattleScriptCurrentMovePower(rules.calledMove),
      ...(value === 0 ? { chosenMove: rules.calledMove } : {}),
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: entry.programCounter }),
      { rulesContext: nextRules },
    );
  };
}

export function createBattleScriptSleepTalkOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const tryChoose = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_TRYCHOOSESLEEPTALKMOVE",
  );
  const jumpToCalled = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_JUMPTOCALLEDMOVE",
  );
  if (tryChoose.length !== 1) {
    throw new Error(
      `B_SCR_OP_TRYCHOOSESLEEPTALKMOVE requires one concrete start, got ${tryChoose.length}`,
    );
  }
  if (jumpToCalled.length === 0) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_JUMPTOCALLEDMOVE");
  }
  return Object.freeze({
    [tryChoose[0]!.opcodeId]: createTryChooseSleepTalkMoveHandler(program),
    [jumpToCalled[0]!.opcodeId]: createJumpToCalledMoveHandler(program),
  });
}
