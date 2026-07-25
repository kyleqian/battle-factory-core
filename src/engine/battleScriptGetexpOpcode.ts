/**
 * S10 step (iv) rung 4: B_SCR_OP_GETEXP / Cmd_getexp
 * (battle_script_commands.c:3255-3529), registered under the (a)/(b) policy
 * for exactly the Frontier short-circuit path. `BattleScript_GiveExp`
 * (data/battle_scripts_1.s:2825-2828) always runs `getexp BS_TARGET` for
 * every fainted battler, win or not -- but state 0's own gate
 * (`GetBattlerSide(gBattlerFainted) != B_SIDE_OPPONENT || (gBattleTypeFlags &
 * (...|BATTLE_TYPE_FRONTIER|...))`, :3270-3280) is true for every Factory
 * battle (BATTLE_TYPE_FACTORY is one of BATTLE_TYPE_FRONTIER's own bits), so
 * this engine's whole reachable domain always takes the short-circuit to
 * state 6 -- the general EXP/level-up/evolution machinery (states 1-5) is
 * Frontier-dead and is a single named (b) barrier, gated on the real
 * condition so it only fires when that condition is actually false (proven
 * reachable with a non-Frontier battle type in tests, and proven crossed
 * without halting on the Frontier path).
 *
 * Like Cmd_moveend and Cmd_jumpifbyte, Cmd_getexp reads
 * GetBattlerForBattleScript's selector directly; only BS_TARGET/BS_ATTACKER
 * are modeled (matching Cmd_datahpupdate's own selector scope) -- a literal
 * `getexp BS_FAINTED` operand (reachable only from the Spikes-on-faint
 * scripts, unrelated to this rung's WIN path) is the other named barrier.
 * BattleScript_GiveExp's own call site is `getexp BS_TARGET`, which the
 * fainted-actions orchestration (battleScriptFaintedActionsOrchestration.ts)
 * correctly reassigns to the currently-processing fainted battler before
 * this runs (ISSUES #43, closed).
 *
 * Unlike Cmd_moveend's own do-while loop, Cmd_getexp's states are plain
 * switch cases with a trailing `break` -- state 0 does not touch
 * `gBattlescriptCurrInstr` at all, so on real hardware this opcode is
 * dispatched twice (two separate VM steps) to cross states 0 -> 6. This
 * engine models that with a same-instruction "jump" transition between the
 * two steps, exactly mirroring the real ROM's two-call cadence.
 */
import type { BattleScriptBattlerId } from "./battleScriptEvents.ts";
import {
  transitionBattleScriptCommand,
  type BattleScriptBlockReason,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import type { BattleScriptProgram } from "./battleScriptProgram.ts";
import type { BattleScriptRulesContext } from "./battleScriptRulesContext.ts";

/** include/constants/battle.h:48-49. */
const B_SIDE_OPPONENT = 1;

/** include/constants/battle.h -- the exact bits Cmd_getexp's state 0 tests. */
const BATTLE_TYPE_LINK = 1 << 1;
const BATTLE_TYPE_SAFARI = 1 << 7;
const BATTLE_TYPE_BATTLE_TOWER = 1 << 8;
const BATTLE_TYPE_EREADER_TRAINER = 1 << 11;
const BATTLE_TYPE_DOME = 1 << 16;
const BATTLE_TYPE_PALACE = 1 << 17;
const BATTLE_TYPE_ARENA = 1 << 18;
const BATTLE_TYPE_FACTORY = 1 << 19;
const BATTLE_TYPE_PIKE = 1 << 20;
const BATTLE_TYPE_PYRAMID = 1 << 21;
const BATTLE_TYPE_RECORDED_LINK = 1 << 25;
const BATTLE_TYPE_TRAINER_HILL = 1 << 26;
/** include/constants/battle.h:91, BATTLE_TYPE_FRONTIER's own composite. */
const BATTLE_TYPE_FRONTIER = BATTLE_TYPE_BATTLE_TOWER
  | BATTLE_TYPE_DOME
  | BATTLE_TYPE_PALACE
  | BATTLE_TYPE_ARENA
  | BATTLE_TYPE_FACTORY
  | BATTLE_TYPE_PIKE
  | BATTLE_TYPE_PYRAMID;
/** battle_script_commands.c:3270-3277's own OR mask (BATTLE_TOWER appears in both operands, harmlessly). */
const GETEXP_STATE0_SHORT_CIRCUIT_MASK = BATTLE_TYPE_LINK
  | BATTLE_TYPE_RECORDED_LINK
  | BATTLE_TYPE_TRAINER_HILL
  | BATTLE_TYPE_FRONTIER
  | BATTLE_TYPE_SAFARI
  | BATTLE_TYPE_BATTLE_TOWER
  | BATTLE_TYPE_EREADER_TRAINER;

const ITEM_NONE = 0;
const ABILITY_NONE = 0;

const GETEXP_STATE_CALCULATE = 1;
const GETEXP_STATE_DONE = 6;

function requireBattlerRole(
  rules: BattleScriptRulesContext,
  role: "attacker" | "target",
): BattleScriptBattlerId {
  const value = rules.selectorRoles[role];
  if (value === null) throw new Error(`Cmd_getexp requires a ${role} role`);
  return value;
}

/** Matches Cmd_datahpupdate's own resolveHitChainBattlerOperand scope. */
function resolveGetexpBattlerOperand(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rules: BattleScriptRulesContext,
): BattleScriptBattlerId | "unsupported" {
  const expression = context.instruction.operands[0]?.expression;
  if (expression === "BS_TARGET") return requireBattlerRole(rules, "target");
  if (expression === "BS_ATTACKER") return requireBattlerRole(rules, "attacker");
  return "unsupported";
}

function controllerBusyBlock(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const reason: BattleScriptBlockReason = Object.freeze({
    kind: "controller-busy",
    programCounter: context.state.programCounter,
    opcodeId: context.instruction.opcodeId,
    opcodeName: context.instruction.opcodeName,
  });
  return transitionBattleScriptCommand(context, Object.freeze({ kind: "block", reason }));
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

function createGetexpOpcodeHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    if (context.state.scheduler.pendingControllerBattlers.length !== 0) {
      return controllerBusyBlock(context);
    }
    const rules = context.state.rulesContext;

    const resolved = resolveGetexpBattlerOperand(context, rules);
    if (resolved === "unsupported") {
      return unsupportedBranch(
        context,
        "Cmd_getexp's GetBattlerForBattleScript selector "
          + `(${context.instruction.operands[0]?.expression ?? "<missing>"}) is not BS_TARGET/BS_ATTACKER `
          + "(BattleScript_GiveExp's own call site is always `getexp BS_TARGET`, correctly reassigned to the "
          + "fainted battler by the orchestration before this runs, battleScriptFaintedActionsOrchestration.ts)",
        3264,
      );
    }
    const battlerFainted = resolved;

    switch (rules.giveExpState) {
      case 0: {
        const side = rules.battlers[battlerFainted].side;
        const battleTypeFlags = rules.battleTopology.battleTypeFlags;
        const shortCircuits = side !== B_SIDE_OPPONENT
          || (battleTypeFlags & GETEXP_STATE0_SHORT_CIRCUIT_MASK) !== 0;
        if (!shortCircuits) {
          return unsupportedBranch(
            context,
            "Cmd_getexp's general EXP/level-up/evolution machinery (states "
              + `${GETEXP_STATE_CALCULATE}-5) is reachable only for a non-Frontier, non-link, non-Safari, `
              + "non-Trainer-Hill, non-EReader-trainer battle against the opponent side; not modeled",
            3287,
          );
        }
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "jump", programCounter: context.state.programCounter }),
          { rulesContext: Object.freeze({ ...rules, giveExpState: GETEXP_STATE_DONE }) },
        );
      }
      case GETEXP_STATE_DONE: {
        const nextBattlers = rules.battlers.map((candidate, index) =>
          index === battlerFainted
            ? Object.freeze({ ...candidate, item: ITEM_NONE, ability: ABILITY_NONE })
            : candidate
        ) as unknown as typeof rules.battlers;
        return transitionBattleScriptCommand(
          context,
          Object.freeze({ kind: "advance" }),
          {
            rulesContext: Object.freeze({
              ...rules,
              battlers: Object.freeze(nextBattlers),
              giveExpState: 0,
            }),
          },
        );
      }
      default:
        throw new Error(
          `Cmd_getexp: giveExpState ${rules.giveExpState} is outside the committed program's 0/6 domain `
            + "(states 1-5 are the barriered general EXP machinery)",
        );
    }
  };
}

export function createBattleScriptGetexpOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_GETEXP",
  );
  if (!instruction) throw new Error("committed Battle Script program does not emit B_SCR_OP_GETEXP");
  return Object.freeze({ [instruction.opcodeId]: createGetexpOpcodeHandler() });
}
