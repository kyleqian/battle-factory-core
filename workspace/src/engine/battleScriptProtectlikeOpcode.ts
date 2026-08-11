/**
 * `B_SCR_OP_SETPROTECTLIKE` / `Cmd_setprotectlike` (`battle_script_commands.c:
 * 6503-6536`) -- `BattleScript_EffectProtect`'s/`BattleScript_EffectEndure`'s
 * shared setter (both labels alias the exact same script; there is only one
 * `setprotectlike` call site source-wide). Real fallthrough order: (1) reset
 * `protectUses` to 0 whenever the user's own `gLastResultingMoves` wasn't
 * Protect/Detect/Endure last turn -- an unconditional write, not an `else` of
 * the roll below; (2) compute `notLastTurn` from `gCurrentTurnActionNumber`;
 * (3) always roll `Random()` against `sProtectSuccessRates[protectUses]` --
 * the roll is the left operand of a C `&&`, unconditionally evaluated, so a
 * last-action Protect still spends an RNG call it is guaranteed to lose; (4)
 * on success, set the acting battler's own `ProtectStruct` bit for whichever
 * of `EFFECT_PROTECT`/`EFFECT_ENDURE` `gCurrentMove` actually is (both `if`s
 * are independent in source, ported the same way here) and increment
 * `protectUses`; on failure, reset `protectUses` to 0 and OR
 * `MOVE_RESULT_MISSED`. `sProtectSuccessRates` has exactly 4 entries; a 5th
 * consecutive successful Protect indexes one past it. On the real ROM that
 * read is not undefined -- the linker placed `sMovesForbiddenToCopy` directly
 * after the table, so `sProtectSuccessRates[4]` returns that array's first
 * entry, `MOVE_METRONOME == 118` (measured from the built artifacts, see
 * `PROTECT_SUCCESS_RATE_OOB` below). `protectUses >= 4` reads that constant,
 * so a 5th Protect succeeds only when `Random() <= 118` (~0.18% of draws).
 */
import {
  drawBattleScriptRng,
  transitionBattleScriptCommand,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import { withBattler } from "./battleScriptHitChainOpcode.ts";
import { BATTLE_SCRIPT_MOVE_RESULT_MISSED } from "./battleScriptSourceConstants.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type MoveEffectRow = Readonly<{ id: number; effect: string }>;

const MOVE_EFFECTS_BY_ID = new Map<number, string>(
  (movesData.moves as readonly MoveEffectRow[]).map(({ id, effect }) => [id, effect]),
);

function requireMoveEffect(move: number): string {
  const effect = MOVE_EFFECTS_BY_ID.get(move);
  if (effect === undefined) {
    throw new Error(`Cmd_setprotectlike: move ${move} has no source-derived gBattleMoves effect`);
  }
  return effect;
}

/** include/constants/moves.h:186,201,207. */
const MOVE_PROTECT = 182;
const MOVE_DETECT = 197;
const MOVE_ENDURE = 203;

/** battle_script_commands.c:719 -- USHRT_MAX/{1,2,4,8}, C integer division. */
const PROTECT_SUCCESS_RATES: readonly number[] = [65535, 32767, 16383, 8191];

/**
 * battle_script_commands.c:6514 indexes `sProtectSuccessRates[protectUses]`;
 * with `protectUses` at 4 (four consecutive successful Protect-like uses) that
 * read lands one past the table's 4 entries. This is not undefined behavior on
 * the real ROM: measured from the built artifacts (pokeemerald.map /
 * pokeemerald.elf / pokeemerald.gba), the linker placed `sMovesForbiddenToCopy`
 * (battle_script_commands.c:725) immediately after the table --
 *
 *   sProtectSuccessRates  @ 0x0831c3d8  (8 bytes: ff ff | ff 7f | ff 3f | ff 1f
 *                                        == 65535, 32767, 16383, 8191)
 *   sMovesForbiddenToCopy @ 0x0831c3e0  (u16 LE bytes at 0x0831c3e0..0x0831c3e1
 *                                        == 76 00 == 0x0076 == MOVE_METRONOME == 118)
 *
 * so `sProtectSuccessRates[4]` reads 118: a 5th consecutive Protect succeeds
 * only when `Random() <= 118` (~0.18% of draws) and otherwise fails. Verified
 * the same 2 bytes in both pokeemerald.gba and pokeemerald.elf's .rodata.
 */
const PROTECT_SUCCESS_RATE_OOB = 118;

/** battle_message.c:943-947, include/constants/battle_string_ids.h:461-464 -- gProtectLikeUsedStringIds' own MULTISTRING_CHOOSER indices. */
const B_MSG_PROTECTED_ITSELF = 0;
const B_MSG_BRACED_ITSELF = 1;
const B_MSG_PROTECT_FAILED = 2;

function createSetprotectlikeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rulesContext = context.state.rulesContext;
    const attacker = rulesContext.selectorRoles.attacker;
    if (attacker === null) throw new Error("Cmd_setprotectlike requires an attacker role");
    const attackerBattler = rulesContext.battlers[attacker];

    const lastMove = rulesContext.moveHistory.lastResultingMoves[attacker];
    const mustReset = lastMove !== MOVE_PROTECT && lastMove !== MOVE_DETECT && lastMove !== MOVE_ENDURE;
    const protectUsesBeforeRoll = mustReset ? 0 : attackerBattler.protectUses;

    const notLastTurn = rulesContext.currentTurnActionNumber !== rulesContext.battleTopology.battlersCount - 1;
    const { rng, randomValue } = drawBattleScriptRng(context.state.rng, context.instruction, "setprotectlike");
    const successRate =
      protectUsesBeforeRoll < PROTECT_SUCCESS_RATES.length
        ? PROTECT_SUCCESS_RATES[protectUsesBeforeRoll]!
        : PROTECT_SUCCESS_RATE_OOB;
    const succeeds = successRate >= randomValue && notLastTurn;

    if (succeeds) {
      const effect = requireMoveEffect(rulesContext.currentMove);
      const isProtect = effect === "EFFECT_PROTECT";
      const isEndure = effect === "EFFECT_ENDURE";
      const nextRulesContext = Object.freeze({
        ...withBattler(rulesContext, attacker, {
          protectUses: protectUsesBeforeRoll + 1,
          ...(isProtect ? { protected: 1 as const } : {}),
          ...(isEndure ? { endured: 1 as const } : {}),
        }),
        multistringChooser: isProtect
          ? B_MSG_PROTECTED_ITSELF
          : isEndure
          ? B_MSG_BRACED_ITSELF
          : rulesContext.multistringChooser,
      });
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "advance" }),
        { rulesContext: nextRulesContext, rng },
      );
    }

    const nextRulesContext = Object.freeze({
      ...withBattler(rulesContext, attacker, { protectUses: 0 }),
      moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
      multistringChooser: B_MSG_PROTECT_FAILED,
    });
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: nextRulesContext, rng },
    );
  };
}

export function createBattleScriptProtectlikeOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_SETPROTECTLIKE",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_SETPROTECTLIKE");
  }
  return Object.freeze({ [instruction.opcodeId]: createSetprotectlikeHandler() });
}
