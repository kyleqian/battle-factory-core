import {
  advanceBattleScriptAttackCancelerUnableToUseMove,
  type BattleScriptAttackCancelerLoopResult,
} from "./battleScriptAttackCanceler.ts";
import {
  BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
  joinBattleScriptAttackCancelerFactoryObedience,
  joinBattleScriptAttackCancelerMovesBlock,
  joinBattleScriptAttackCancelerSelectedMovePp,
} from "./battleScriptAbilityMovesBlock.ts";
import { joinBattleScriptAttackCancelerMagicCoat } from "./battleScriptMagicCoat.ts";
import { preflightBattleScriptActionEntry } from "./battleScriptActionAdmission.ts";
import {
  drawBattleScriptRng,
  markBattleScriptControllerPending,
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
  type BattleScriptRngState,
} from "./battleScriptMachine.ts";
import { resolveBattleScriptLabel, type BattleScriptProgram } from "./battleScriptProgram.ts";
import type {
  BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  withBattleScriptPartyMemberPp,
  withBattleScriptPartyMemberStatus1,
} from "./battleScriptRulesContext.ts";
import { isDefenderProtected } from "./battleScriptHitChainOpcode.ts";
import { cancelBattleScriptMultiTurnMoves } from "./battleScriptMultiTurnCancellation.ts";
import {
  BATTLE_SCRIPT_MOVE_RESULT_MISSED,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
  BATTLE_SCRIPT_STATUS2_MASKS,
} from "./battleScriptSourceConstants.ts";
import movesData from "../data/gen/moves.json" with { type: "json" };

type MoveFlagsRow = Readonly<{ id: number; flags: readonly string[]; effect: string }>;

const GENERATED_MOVE_FLAGS = new Map<number, readonly string[]>(
  (movesData.moves as readonly MoveFlagsRow[]).map(({ id, flags }) => [id, flags]),
);

const GENERATED_MOVE_EFFECT_NAMES = new Map<number, string>(
  (movesData.moves as readonly MoveFlagsRow[]).map(({ id, effect }) => [id, effect]),
);

function moveHasFlag(move: number, flag: string): boolean {
  return (GENERATED_MOVE_FLAGS.get(move) ?? []).includes(flag);
}

const BATTLE_SCRIPT_MOVE_CURSE = 174;
const BATTLE_SCRIPT_MOVE_MAGIC_COAT = 277;
const BATTLE_SCRIPT_MOVE_SNATCH = 289;
const BATTLE_SCRIPT_ABILITY_PRESSURE = 46;

/** IsTwoTurnsMove (battle_script_commands.c:8196-8206). */
function isTwoTurnsMove(move: number): boolean {
  const effect = GENERATED_MOVE_EFFECT_NAMES.get(move);
  return effect === "EFFECT_SKULL_BASH"
    || effect === "EFFECT_RAZOR_WIND"
    || effect === "EFFECT_SKY_ATTACK"
    || effect === "EFFECT_SOLAR_BEAM"
    || effect === "EFFECT_SEMI_INVULNERABLE"
    || effect === "EFFECT_BIDE";
}

function requireLabelProgramCounter(program: BattleScriptProgram, label: string): number {
  const entry = resolveBattleScriptLabel(program, label);
  if (!entry) throw new Error(`committed Battle Script program does not define label ${label}`);
  return entry.programCounter;
}

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  sourceConstruct: string,
  sourceFile: string,
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
        sourceFile,
        sourceLine,
      }),
    }),
  );
}

type CancelerCursorResolution =
  | Readonly<{ kind: "jump" }>
  | Readonly<{ kind: "call-current" }>
  | Readonly<{ kind: "call-explicit"; returnLabel: string }>;

/**
 * Resolves whether the loop's terminating phase performed a source
 * BattleScriptPushCursor (resume at this same opcode-0 instruction) or the
 * CANCELER_IN_LOVE immobilized-by-love BattleScriptPush(explicit label),
 * which pushes a distinct script label as the return address. The machine's
 * `call-explicit` directive models the latter without rewriting either
 * source script.
 */
function resolveCancelerCursor(
  result: BattleScriptAttackCancelerLoopResult,
): CancelerCursorResolution {
  const decision = result.receipt.phases.at(-1);
  if (!decision) return Object.freeze({ kind: "jump" });
  const receipt = decision.receipt;
  switch (receipt.sourcePhase) {
    case "CANCELER_ASLEEP":
    case "CANCELER_FROZEN":
    case "CANCELER_CONFUSED":
    case "CANCELER_THAW":
      return receipt.cursor.kind === "push"
        ? Object.freeze({ kind: "call-current" as const })
        : Object.freeze({ kind: "jump" as const });
    case "CANCELER_IN_LOVE":
      if (receipt.scriptStack.kind === "push-script") {
        return Object.freeze({
          kind: "call-explicit" as const,
          returnLabel: receipt.scriptStack.targetLabel,
        });
      }
      return receipt.scriptStack.kind === "push-cursor"
        ? Object.freeze({ kind: "call-current" as const })
        : Object.freeze({ kind: "jump" as const });
    default:
      return Object.freeze({ kind: "jump" as const });
  }
}

function applyCancelerEffectTransition(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  cancelerResult: BattleScriptAttackCancelerLoopResult,
  rulesContext: BattleScriptRulesContext,
  rng: BattleScriptRngState,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const scriptEffect = cancelerResult.receipt.programCounter;
  if (scriptEffect.kind !== "handoff") {
    throw new Error("Battle Script attack canceler nonzero effect requires a script handoff");
  }
  const cursor = resolveCancelerCursor(cancelerResult);
  const target = requireLabelProgramCounter(context.program, scriptEffect.targetLabel);
  const control = cursor.kind === "call-current"
    ? Object.freeze({ kind: "call-current" as const, programCounter: target })
    : cursor.kind === "call-explicit"
      ? Object.freeze({
        kind: "call-explicit" as const,
        programCounter: target,
        returnProgramCounter: requireLabelProgramCounter(context.program, cursor.returnLabel),
      })
      : Object.freeze({ kind: "jump" as const, programCounter: target });

  if (cancelerResult.effect !== 2) {
    return transitionBattleScriptCommand(context, control, { rulesContext, rng });
  }

  const sync = cancelerResult.receipt.controllerSync;
  if (sync.kind !== "request-status1-write") {
    throw new Error("Battle Script attack canceler effect 2 requires a status1 controller sync");
  }
  const syncedBattler = rulesContext.battlers[sync.battler];
  const syncedRulesContext = Object.freeze({
    ...rulesContext,
    party: withBattleScriptPartyMemberStatus1(
      rulesContext.party,
      syncedBattler.side,
      syncedBattler.partyIndex,
      sync.value,
    ),
  });
  const scheduler = markBattleScriptControllerPending(context.state.scheduler, sync.battler);
  return transitionBattleScriptCommand(context, control, {
    scheduler,
    rulesContext: syncedRulesContext,
    rng,
    events: Object.freeze([
      Object.freeze({
        kind: "set-battler-status-data" as const,
        battler: sync.battler,
        status1: sync.value,
      }),
    ]),
  });
}

/**
 * The Cmd_attackcanceler tail after Magic Coat continues without bouncing:
 * the Snatch redirect loop (battle_script_commands.c:971-982), Lightning Rod redirection
 * (battle_script_commands.c:984-990, unreachable in Level-50 singles), and
 * the final DEFENDER_IS_PROTECTED check (battle_script_commands.c:992-1006).
 * Snatch/Lightning Rod are evaluated against their real source fields so a
 * Tier-1-constructed transient state can still reach each barrier; Protect
 * is an unconditional barrier because its predicate needs battler-type,
 * IsTwoTurnsMove, and Curse/Ghost data this engine does not model yet.
 */
function resolveTailBranches(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  rulesContext: BattleScriptRulesContext,
  rng: BattleScriptRngState,
): BattleScriptCommandTransition<BattleScriptRulesContext> {
  const { battlersCount } = rulesContext.battleTopology;
  if (moveHasFlag(rulesContext.currentMove, "FLAG_SNATCH_AFFECTED")) {
    for (let index = 0; index < battlersCount; index += 1) {
      const winner = rulesContext.battlerByTurnOrder[index] as 0 | 1 | 2 | 3;
      if ((rulesContext.battlers[winner].stealMove ?? 0) !== 1) continue;

      const attacker = rulesContext.selectorRoles.attacker;
      if (attacker === null) throw new Error("Snatch redirect requires an attacker role");
      const owner = rulesContext.battlers[winner];
      const movePosition = owner.moves.indexOf(BATTLE_SCRIPT_MOVE_SNATCH);
      const pressure = rulesContext.battlers[attacker].ability === BATTLE_SCRIPT_ABILITY_PRESSURE;
      const nextPp = pressure && movePosition !== -1 && owner.pp[movePosition] !== 0
        ? owner.pp[movePosition]! - 1
        : null;
      const battlers = Object.freeze(rulesContext.battlers.map((battler, battlerId) => {
        if (battlerId !== winner) return battler;
        const pp = nextPp === null
          ? owner.pp
          : Object.freeze(owner.pp.map((value, slot) => slot === movePosition ? nextPp : value));
        return Object.freeze({ ...owner, pp, stealMove: 0 as const });
      })) as unknown as typeof rulesContext.battlers;
      let nextRules = Object.freeze({
        ...rulesContext,
        battlers,
        scriptingBattler: winner,
        ...(nextPp === null ? {} : {
          party: withBattleScriptPartyMemberPp(
            rulesContext.party,
            owner.side,
            owner.partyIndex,
            movePosition,
            nextPp,
          ),
        }),
      });
      let scheduler = context.state.scheduler;
      const events = [];
      if (
        nextPp !== null
        && (owner.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0
      ) {
        events.push(Object.freeze({
          kind: "set-battler-pp-data" as const,
          battler: winner,
          movePosition,
          pp: nextPp,
        }));
        scheduler = markBattleScriptControllerPending(scheduler, winner);
      }
      const targetPc = requireLabelProgramCounter(context.program, "BattleScript_SnatchedMove");
      return transitionBattleScriptCommand(
        context,
        Object.freeze({ kind: "call-current", programCounter: targetPc }),
        { rulesContext: nextRules, rng, scheduler, events: Object.freeze(events) },
      );
    }
  }

  const target = rulesContext.selectorRoles.target;
  if (target === null) {
    throw new Error("Battle Script attack canceler tail branches require a target role");
  }
  if ((rulesContext.battlers[target].lightningRodRedirected ?? 0) === 1) {
    return unsupportedBranch(
      context,
      `Lightning Rod redirection: gSpecialStatuses[battler ${target}].lightningRodRedirected `
        + "is set (RecordAbilityBattle and BattleScript_TookAttack handoff are unimplemented)",
      "battle_script_commands.c",
      984,
    );
  }

  const attacker = rulesContext.selectorRoles.attacker;
  if (attacker === null) {
    throw new Error("Battle Script attack canceler tail branches require an attacker role");
  }
  const attackerBattler = rulesContext.battlers[attacker];
  const move = rulesContext.currentMove;
  const protectTriggers = isDefenderProtected(rulesContext.battlers[target], move)
    && (move !== BATTLE_SCRIPT_MOVE_CURSE || attackerBattler.types.includes("TYPE_GHOST"))
    && (!isTwoTurnsMove(move)
      || (attackerBattler.status2 & BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS) !== 0);

  if (!protectTriggers) {
    return transitionBattleScriptCommand(context, Object.freeze({ kind: "advance" }), { rulesContext, rng });
  }

  const cancelled = cancelBattleScriptMultiTurnMoves(rulesContext, attacker);
  const clearAt = (halfwords: readonly number[]) =>
    Object.freeze(halfwords.map((value, index) => (index === target ? 0 : value)));
  const nextRulesContext = Object.freeze({
    ...rulesContext,
    battlers: cancelled.rulesContext.battlers,
    moveResultFlags: (rulesContext.moveResultFlags | BATTLE_SCRIPT_MOVE_RESULT_MISSED) >>> 0,
    missType: 1, // B_MSG_PROTECTED (include/constants/battle_string_ids.h:410)
    moveHistory: Object.freeze({
      ...rulesContext.moveHistory,
      lastLandedMoves: clearAt(rulesContext.moveHistory.lastLandedMoves),
      lastHitByType: clearAt(rulesContext.moveHistory.lastHitByType),
    }),
  }) as unknown as BattleScriptRulesContext;
  return transitionBattleScriptCommand(
    context,
    Object.freeze({ kind: "advance" }),
    { rulesContext: nextRulesContext, rng },
  );
}

/**
 * Production Cmd_attackcanceler (opcode 0) dispatcher.
 *
 * Composes the already Tier-1-pinned entry preflight, the
 * AtkCanceler_UnableToUseMove loop, the ability moves-block/selected-move-PP/
 * Factory-obedience join chain, and the Magic Coat bounce check into one
 * real opcode-0 handler. Every branch the join chain cannot yet complete
 * source-completely (Magic Coat's PressurePPLose, Snatch, Lightning Rod, and
 * the final Protect check) halts explicitly via "unsupported-branch" rather
 * than falling through.
 */
export const attackCancelerOpcodeHandler: BattleScriptOpcodeHandler<BattleScriptRulesContext> = (
  context,
) => {
  const sourcePc = context.state.programCounter;

  const entry = preflightBattleScriptActionEntry(context.state.rulesContext, sourcePc);
  if (entry.kind === "stop") {
    if (entry.reason === "battle-outcome-finished") {
      // UNREACHABLE in Level-50 singles, and the reason is one level up in the
      // source, not here (supervisor refutation 2026-08-08; see
      // docs/barrier-reachability-triage.md A12). RunTurnActionsFunctions
      // (battle_main.c:4937-4945) forces gCurrentActionFuncId = B_ACTION_FINISHED
      // BEFORE dispatching sTurnActionsFuncsTable[], and HandleAction_UseMove
      // (battle_util.c:78) -- the only producer of a script that begins with
      // attackcanceler -- runs only through that dispatcher. Nothing chains past
      // the check inside one frame either: HandleAction_ActionFinished
      // (battle_util.c:658-683) assigns the next action and returns rather than
      // calling it. So Cmd_attackcanceler's own gBattleOutcome preflight is
      // defensive redundancy in the C source. This engine already models the
      // preemption (factoryBattleScriptFullTurnDecision.ts's terminal
      // second-action skip cites the same lines), so reaching this guard would
      // mean the turn orchestrator failed to preempt -- a real defect, which is
      // exactly what halting loudly here should report.
      return unsupportedBranch(
        context,
        "gBattleOutcome != 0 -> gCurrentActionFuncId = B_ACTION_FINISHED; "
          + "unreachable because RunTurnActionsFunctions (battle_main.c:4939) "
          + "preempts the action before HandleAction_UseMove can start a script",
        "battle_script_commands.c",
        919,
      );
    }
    const target = requireLabelProgramCounter(context.program, "BattleScript_MoveEnd");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target }),
      { rulesContext: entry.rulesContext },
    );
  }

  const cancelerResult = advanceBattleScriptAttackCancelerUnableToUseMove(
    {
      rulesContext: entry.rulesContext,
      rngValue: context.state.rng.value,
      rngCallsConsumed: context.state.rng.calls,
    },
    sourcePc,
  );
  let rng = context.state.rng;
  const drawsNeeded = cancelerResult.rngCallsConsumed - context.state.rng.calls;
  for (let index = 0; index < drawsNeeded; index += 1) {
    rng = drawBattleScriptRng(rng, context.instruction, "attackcanceler:unable-to-use-move").rng;
  }
  if (rng.value !== cancelerResult.rngValue || rng.calls !== cancelerResult.rngCallsConsumed) {
    throw new Error(
      "Battle Script attack canceler loop RNG did not match the machine's RNG ledger",
    );
  }

  const movesBlockResult = joinBattleScriptAttackCancelerMovesBlock(cancelerResult, sourcePc);
  const ppResult = joinBattleScriptAttackCancelerSelectedMovePp(movesBlockResult, sourcePc);
  const obedienceResult = joinBattleScriptAttackCancelerFactoryObedience(
    ppResult,
    BATTLE_SCRIPT_FACTORY_FRONTIER_SCOPE,
    sourcePc,
  );
  const magicCoatResult = joinBattleScriptAttackCancelerMagicCoat(
    obedienceResult,
    context.state.callStack,
    sourcePc,
  );

  if (magicCoatResult.kind === "canceler-effect") {
    return applyCancelerEffectTransition(
      context,
      cancelerResult,
      magicCoatResult.rulesContext,
      rng,
    );
  }
  if (magicCoatResult.kind === "moves-block") {
    const target = requireLabelProgramCounter(context.program, "BattleScript_SoundproofProtected");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target }),
      { rulesContext: magicCoatResult.rulesContext, rng },
    );
  }
  if (magicCoatResult.kind === "selected-move-no-pp") {
    const target = requireLabelProgramCounter(context.program, "BattleScript_NoPPForMove");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "jump", programCounter: target }),
      { rulesContext: magicCoatResult.rulesContext, rng },
    );
  }
  if (magicCoatResult.kind === "magic-coat") {
    const attacker = magicCoatResult.receipt.attacker;
    const coatOwner = magicCoatResult.receipt.target;
    let rulesContext = magicCoatResult.rulesContext;
    let scheduler = context.state.scheduler;
    const events: Array<Readonly<{
      kind: "set-battler-pp-data";
      battler: 0 | 1 | 2 | 3;
      movePosition: number;
      pp: number;
    }>> = [];

    if (rulesContext.battlers[attacker].ability === BATTLE_SCRIPT_ABILITY_PRESSURE) {
      const owner = rulesContext.battlers[coatOwner];
      const movePosition = owner.moves.indexOf(BATTLE_SCRIPT_MOVE_MAGIC_COAT);
      if (movePosition !== -1) {
        const nextPp = owner.pp[movePosition] === 0
          ? 0
          : owner.pp[movePosition]! - 1;
        const pp = owner.pp.map((value, index) =>
          index === movePosition ? nextPp : value
        ) as unknown as typeof owner.pp;
        const battlers = rulesContext.battlers.map((battler, index) =>
          index === coatOwner ? Object.freeze({ ...owner, pp: Object.freeze(pp) }) : battler
        ) as unknown as typeof rulesContext.battlers;
        rulesContext = Object.freeze({
          ...rulesContext,
          battlers: Object.freeze(battlers),
        });
        if ((owner.status2 & BATTLE_SCRIPT_STATUS2_TRANSFORMED) === 0) {
          events.push(Object.freeze({
            kind: "set-battler-pp-data",
            battler: coatOwner,
            movePosition,
            pp: nextPp,
          }));
          scheduler = markBattleScriptControllerPending(scheduler, coatOwner);
        }
      }
    }

    const target = requireLabelProgramCounter(context.program, "BattleScript_MagicCoatBounce");
    return transitionBattleScriptCommand(
      context,
      Object.freeze({ kind: "call-current", programCounter: target }),
      {
        rulesContext,
        rng,
        scheduler,
        events: Object.freeze(events),
      },
    );
  }

  return resolveTailBranches(context, magicCoatResult.rulesContext, rng);
};

export function createBattleScriptAttackCancelerOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const instruction = program.instructions.find(
    (candidate) => candidate.opcodeName === "B_SCR_OP_ATTACKCANCELER",
  );
  if (!instruction) {
    throw new Error("committed Battle Script program does not emit B_SCR_OP_ATTACKCANCELER");
  }
  const handlers: Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>> =
    Object.create(null) as Record<number, BattleScriptOpcodeHandler<BattleScriptRulesContext>>;
  handlers[instruction.opcodeId] = attackCancelerOpcodeHandler;
  return Object.freeze(handlers);
}
