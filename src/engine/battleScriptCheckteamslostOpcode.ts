/**
 * S10 step (iv) rung 5: B_SCR_OP_CHECKTEAMSLOST / Cmd_checkteamslost
 * (battle_script_commands.c:3534-3619). Sums MON_DATA_HP across all
 * PARTY_SIZE (6) slots of each side's party (species-nonzero, non-egg
 * gated), writes gBattleOutcome, then always falls through to the next
 * instruction for a non-link battle -- this is the opcode that actually
 * computes the WIN-path's real battleOutcome 0 -> 1 transition from the
 * party slice (docs/faint-outcome-ground-truth.md §1a row 12, §2c).
 *
 * Three named (b) barriers, each gated on its own real, currently-unmodeled
 * condition (never true for a plain Factory singles battle, so never taken
 * on this rung's WIN path):
 *  - BATTLE_TYPE_INGAME_PARTNER + Steven's own partner-mon exclusion needs
 *    gPartnerTrainerId, unmodeled;
 *  - BATTLE_TYPE_ARENA's per-mon HP exclusion needs
 *    gBattleStruct->arenaLostPlayerMons/arenaLostOpponentMons, unmodeled;
 *  - the link-battle empty-battler-spot counting needs
 *    gSpecialStatuses[].faintedHasReplacement, unmodeled.
 */
import {
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_BATTLE_TYPE_ARENA,
  BATTLE_SCRIPT_PARTY_SIZE,
  type BattleScriptPartyState,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:100-101. */
const B_OUTCOME_WON = 1;
const B_OUTCOME_LOST = 2;

/** include/constants/battle.h:60,84. */
const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;

/** include/constants/battle.h:81. */
const BATTLE_TYPE_INGAME_PARTNER = 1 << 22;

function partyHpSum(party: BattleScriptPartyState): number {
  let sum = 0;
  for (let index = 0; index < BATTLE_SCRIPT_PARTY_SIZE; index += 1) {
    const member = party[index];
    if (member.species !== 0 && !member.isEgg) sum += member.hp;
  }
  return sum;
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceLine: number,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  return transitionBattleScriptCommand(
    context,
    Object.freeze({
      kind: "halt",
      reason: Object.freeze({
        kind: "unsupported-branch",
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
        sourceConstruct,
        sourceFile: "battle_script_commands.c",
        sourceLine,
      }),
    }),
  );
}

function createCheckteamslostOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.state.scheduler.pendingControllerBattlers.length !== 0) {
      const reason = Object.freeze({
        kind: "controller-busy" as const,
        programCounter: context.state.programCounter,
        opcodeId: context.instruction.opcodeId,
        opcodeName: context.instruction.opcodeName,
      });
      return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
    }

    const rules = context.state.rulesContext;
    const battleTypeFlags = rules.battleTopology.battleTypeFlags;

    if ((battleTypeFlags & BATTLE_TYPE_INGAME_PARTNER) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_checkteamslost's BATTLE_TYPE_INGAME_PARTNER + Steven-partner MULTI_PARTY_SIZE "
          + "HP-count branch needs gPartnerTrainerId, not modeled",
        3543,
      );
    }
    if ((battleTypeFlags & BATTLE_SCRIPT_BATTLE_TYPE_ARENA) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_checkteamslost's BATTLE_TYPE_ARENA per-mon HP exclusion needs "
          + "gBattleStruct->arenaLostPlayerMons/arenaLostOpponentMons (:3557 player loop, :3571 opponent "
          + "loop), not modeled",
        3557,
      );
    }

    const playerHp = partyHpSum(rules.party.player);
    const opponentHp = partyHpSum(rules.party.opponent);
    let battleOutcome = rules.battleOutcome;
    if (playerHp === 0) battleOutcome = (battleOutcome | B_OUTCOME_LOST) & 0xff;
    if (opponentHp === 0) battleOutcome = (battleOutcome | B_OUTCOME_WON) & 0xff;

    if (battleOutcome === 0 && (battleTypeFlags & (BATTLE_TYPE_LINK | BATTLE_TYPE_RECORDED_LINK)) !== 0) {
      return unsupportedBranch(
        context,
        "Cmd_checkteamslost's link-battle empty-battler-spot counting needs "
          + "gSpecialStatuses[].faintedHasReplacement, not modeled",
        3582,
      );
    }

    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "advance" }),
      { rulesContext: Object.freeze({ ...rules, battleOutcome }) },
    );
  };
}

export function createBattleScriptCheckteamslostOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_CHECKTEAMSLOST",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_CHECKTEAMSLOST");
  return Object.freeze({ [instruction.opcodeId]: createCheckteamslostOpcodeHandler() });
}
