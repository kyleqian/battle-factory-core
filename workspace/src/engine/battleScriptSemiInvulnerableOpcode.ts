/**
 * Semi-invulnerable registration rungs 6-7
 * (docs/semi-invulnerable-registration-scout.md §2a/§2c/§5). Three opcodes:
 *
 * - `B_SCR_OP_CLEARSTATUSFROMEFFECT` / `Cmd_clearstatusfromeffect`
 *   (`battle_script_commands.c:2951-2963`): a table-driven AND-mask clear
 *   keyed on whichever `MOVE_EFFECT_*` byte the preceding `setmoveeffect`
 *   staged (`gBattleCommunication[MOVE_EFFECT_BYTE]`). Every one of this
 *   opcode's 5 concrete call sites in the whole committed program feeds it
 *   exactly one of two values -- `MOVE_EFFECT_CHARGING` (12, at
 *   `BattleScript_TwoTurnMovesSecondTurn`/`BattleScript_SecondTurnSemi
 *   Invulnerable`/`BattleScript_BideAttack`/`BattleScript_BideNoEnergyToAttack`)
 *   or `MOVE_EFFECT_RAGE` (30, at `BattleScript_RageMiss`) -- so the minimal
 *   `STATUS_MASK_FOR_MOVE_EFFECT` lookup below (unlisted bytes, including
 *   `MOVE_EFFECT_RAGE`, defaulting to mask 0, matching
 *   `sStatusFlagsForMoveEffects`'s own designated-initializer default
 *   exactly) is source-complete for this opcode's true call-site domain, not
 *   merely this session's scope. `gBattleScripting.multihitMoveEffect`/
 *   `gBattleCommunication[MOVE_EFFECT_BYTE]` resets are pure no-ops (no
 *   reader in this engine's scope, matching `Cmd_initmultihitstring`'s own
 *   precedent).
 *
 * - `B_SCR_OP_SETSEMIINVULNERABLEBIT` / `B_SCR_OP_CLEARSEMIINVULNERABLEBIT`
 *   (`battle_script_commands.c:9009-9045`): zero-operand, unconditional
 *   advance, a `gCurrentMove`-keyed switch writing/clearing one of the
 *   attacker's own `status3` bits (`STATUS3_ON_AIR` for Fly/Bounce,
 *   `STATUS3_UNDERGROUND` for Dig, `STATUS3_UNDERWATER` for Dive).
 *   Structurally identical to the already-registered `setminimize`'s own
 *   `STATUS3_MINIMIZED` write. The consumer side (accuracycheck's
 *   `ACC_CURR_MOVE` branch forcing a miss against a semi-invulnerable
 *   target) is already source-complete and unmodified by this file.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { requireBattlerRole, unsupportedBranch, withBattler } from "./battleScriptHitChainOpcode.ts";
import type { BattleScriptBattlerSelectorResolverPort } from "./battleScriptSourceCommands.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:139. */
const STATUS2_MULTIPLETURNS = 1 << 12;
/** include/constants/battle.h:259,300. */
const MOVE_EFFECT_CHARGING = 12;
/** include/constants/battle.h:253. */
const PRIMARY_STATUS_MOVE_EFFECT = 6;

/**
 * `sStatusFlagsForMoveEffects` (`battle_script_commands.c:608-625`), narrowed
 * to the only two indices this opcode's committed call sites ever feed it --
 * `MOVE_EFFECT_CHARGING` (12) and `MOVE_EFFECT_RAGE` (30, at
 * `BattleScript_RageMiss`). Unlisted bytes (including `MOVE_EFFECT_RAGE`
 * itself) default to mask 0, exactly matching the real 60-entry array's own
 * designated-initializer default.
 */
const STATUS_MASK_FOR_MOVE_EFFECT: Readonly<Record<number, number>> = Object.freeze({
  [MOVE_EFFECT_CHARGING]: STATUS2_MULTIPLETURNS,
});

function createClearstatusfromeffectOpcodeHandler(
  resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>,
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const operand = context.instruction.operands[0];
    const battler = operand ? resolveBattlerForBattleScript(context, operand) : null;
    if (battler === null) {
      return unsupportedBranch(
        context,
        `Cmd_clearstatusfromeffect's GetBattlerForBattleScript selector `
          + `(${operand?.expression ?? "<missing>"}) is unavailable`,
        "battle_script_commands.c",
        2953,
      );
    }
    const rulesContext = context.state.rulesContext;
    const effectByte = rulesContext.moveEffectByte;
    const mask = STATUS_MASK_FOR_MOVE_EFFECT[effectByte] ?? 0;
    const battlerState = rulesContext.battlers[battler];
    const nextRulesContext = withBattler(
      Object.freeze({ ...rulesContext, moveEffectByte: 0 }),
      battler,
      effectByte <= PRIMARY_STATUS_MOVE_EFFECT
        ? { status1: (battlerState.status1 & ~mask) >>> 0 }
        : { status2: (battlerState.status2 & ~mask) >>> 0 },
    );
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext },
    );
  };
}

export function createBattleScriptClearstatusfromeffectOpcodeHandlers(
  program: BattleScriptProgram,
  ports: Readonly<{
    resolveBattlerForBattleScript: BattleScriptBattlerSelectorResolverPort<BattleScriptRulesContext>;
  }>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) => instruction.opcodeName === "B_SCR_OP_CLEARSTATUSFROMEFFECT",
  );
  if (starts.length !== 5) {
    throw new Error(`B_SCR_OP_CLEARSTATUSFROMEFFECT requires all 5 concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    const [operand] = instruction.operands;
    if (
      instruction.dispatcher !== "Cmd_clearstatusfromeffect"
      || instruction.operands.length !== 1
      || operand?.widthBytes !== 1
      || operand.expression !== "BS_ATTACKER"
    ) {
      throw new Error(`invalid B_SCR_OP_CLEARSTATUSFROMEFFECT shape at program counter ${instruction.programCounter}`);
    }
  }
  return Object.freeze({
    [starts[0]!.opcodeId]: createClearstatusfromeffectOpcodeHandler(ports.resolveBattlerForBattleScript),
  });
}

/** include/constants/moves.h. */
const MOVE_FLY = 19;
const MOVE_DIG = 91;
const MOVE_DIVE = 291;
const MOVE_BOUNCE = 340;
/** include/constants/battle.h:163,164,175. */
const STATUS3_ON_AIR = 1 << 6;
const STATUS3_UNDERGROUND = 1 << 7;
const STATUS3_UNDERWATER = 1 << 18;

function semiInvulnerableBitForCurrentMove(currentMove: number): number {
  switch (currentMove) {
    case MOVE_FLY:
    case MOVE_BOUNCE:
      return STATUS3_ON_AIR;
    case MOVE_DIG:
      return STATUS3_UNDERGROUND;
    case MOVE_DIVE:
      return STATUS3_UNDERWATER;
    default:
      return 0;
  }
}

function createSemiInvulnerableBitOpcodeHandler(
  mode: "set" | "clear",
): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = requireBattlerRole(rulesContext, "attacker");
    const bit = semiInvulnerableBitForCurrentMove(rulesContext.currentMove);
    const attackerState = rulesContext.battlers[attacker];
    const nextStatus3 = mode === "set"
      ? (attackerState.status3 | bit) >>> 0
      : (attackerState.status3 & ~bit) >>> 0;
    const nextRulesContext = withBattler(rulesContext, attacker, { status3: nextStatus3 });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext },
    );
  };
}

function registerZeroOperandOpcode(
  program: BattleScriptProgram,
  opcodeName: string,
  expectedCount: number,
  dispatcher: string,
  handler: BattleScriptOpcodeHandler<BattleScriptRulesContext>,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter((instruction) => instruction.opcodeName === opcodeName);
  if (starts.length !== expectedCount) {
    throw new Error(`${opcodeName} requires all ${expectedCount} concrete starts, got ${starts.length}`);
  }
  for (const instruction of starts) {
    if (instruction.dispatcher !== dispatcher || instruction.operands.length !== 0) {
      throw new Error(`invalid ${opcodeName} shape at program counter ${instruction.programCounter}`);
    }
  }
  return Object.freeze({ [starts[0]!.opcodeId]: handler });
}

export function createBattleScriptSemiInvulnerableBitOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  return Object.freeze({
    ...registerZeroOperandOpcode(
      program,
      "B_SCR_OP_SETSEMIINVULNERABLEBIT",
      1,
      "Cmd_setsemiinvulnerablebit",
      createSemiInvulnerableBitOpcodeHandler("set"),
    ),
    ...registerZeroOperandOpcode(
      program,
      "B_SCR_OP_CLEARSEMIINVULNERABLEBIT",
      2,
      "Cmd_clearsemiinvulnerablebit",
      createSemiInvulnerableBitOpcodeHandler("clear"),
    ),
  });
}
