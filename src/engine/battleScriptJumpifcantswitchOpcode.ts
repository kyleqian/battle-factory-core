/**
 * `B_SCR_OP_JUMPIFCANTSWITCH` / `Cmd_jumpifcantswitch`
 * (`battle_script_commands.c:4700-4850`).
 *
 * The committed Emerald program has exactly two concrete six-byte starts:
 * Baton Pass's `SWITCH_IGNORE_ESCAPE_PREVENTION | BS_ATTACKER` and the
 * fainted-mon flow's `BS_PLAYER1`. Ordinary singles can resolve both from
 * the existing battler roles/topology and can scan the authoritative
 * six-slot party directly. Partner/MULTI/two-opponent/doubles scans depend
 * on ownership identities the current rules context does not carry and are
 * therefore one explicit executable-frontier barrier.
 */
import {
  createBattleScriptSchedulerState,
  isBattleScriptBattlerId,
  transitionBattleScriptCommand,
  type BattleScriptCommandTransition,
  type BattleScriptOpcodeHandler,
  type BattleScriptOpcodeHandlerContext,
  type BattleScriptOpcodeHandlers,
} from "./battleScriptMachine.ts";
import {
  resolveBattleScriptLabel,
  type BattleScriptInstruction,
  type BattleScriptProgram,
} from "./battleScriptProgram.ts";
import {
  resolveBattleScriptBattlerAtPosition,
  type BattleScriptRulesContext,
} from "./battleScriptRulesContext.ts";
import {
  BATTLE_SCRIPT_STATUS2_WRAPPED_MASK,
  BATTLE_SCRIPT_STATUS3_ROOTED,
} from "./battleScriptSourceConstants.ts";

const SWITCH_IGNORE_ESCAPE_PREVENTION = 1 << 7;
const BS_ATTACKER = 1;
const BS_PLAYER1 = 11;
const B_POSITION_PLAYER_LEFT = 0;
const STATUS2_ESCAPE_PREVENTION = 1 << 26;
const BATTLE_TYPE_MULTI = 1 << 6;
const BATTLE_TYPE_TWO_OPPONENTS = 1 << 15;
const BATTLE_TYPE_INGAME_PARTNER = 1 << 22;

const EXPECTED_STARTS = Object.freeze({
  BattleScript_EffectBatonPass: Object.freeze({
    statementLine: 1699,
    selectorExpression: "SWITCH_IGNORE_ESCAPE_PREVENTION | BS_ATTACKER",
    selector: SWITCH_IGNORE_ESCAPE_PREVENTION | BS_ATTACKER,
    jumpExpression: "BattleScript_ButItFailed",
  }),
  BattleScript_FaintedMonTryChoose: Object.freeze({
    statementLine: 2853,
    selectorExpression: "BS_PLAYER1",
    selector: BS_PLAYER1,
    jumpExpression: "BattleScript_FaintedMonSendOutNew",
  }),
});

function unsupportedBranch(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
  scheduler: ReturnType<typeof createBattleScriptSchedulerState>,
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
        sourceConstruct:
          "Cmd_jumpifcantswitch's in-game-partner/MULTI/two-opponents/ordinary-doubles "
          + "party-range and active-slot identity scans are not modeled "
          + "(battle_script_commands.c:4714-4848)",
        sourceFile: "battle_script_commands.c",
        sourceLine: 4714,
      }),
    }),
    { scheduler },
  );
}

function decodedSelector(instruction: BattleScriptInstruction): number {
  const expected = EXPECTED_STARTS[
    instruction.source.label as keyof typeof EXPECTED_STARTS
  ];
  if (!expected) {
    throw new Error(
      `Cmd_jumpifcantswitch: unvalidated source start ${instruction.source.label}`,
    );
  }
  return expected.selector & ~SWITCH_IGNORE_ESCAPE_PREVENTION;
}

function resolveSelectedBattler(
  context: BattleScriptOpcodeHandlerContext<BattleScriptRulesContext>,
): 0 | 1 | 2 | 3 {
  const selector = decodedSelector(context.instruction);
  const rules = context.state.rulesContext;
  const battler = selector === BS_ATTACKER
    ? rules.selectorRoles.attacker
    : selector === BS_PLAYER1
      ? resolveBattleScriptBattlerAtPosition(
        rules.battleTopology,
        B_POSITION_PLAYER_LEFT,
      )
      : null;
  if (!isBattleScriptBattlerId(battler)) {
    throw new Error(
      `Cmd_jumpifcantswitch: selector ${selector} did not resolve to an active battler`,
    );
  }
  return battler;
}

function createJumpifcantswitchHandler(): BattleScriptOpcodeHandler<BattleScriptRulesContext> {
  return (context) => {
    const rules = context.state.rulesContext;
    const battler = resolveSelectedBattler(context);
    const scheduler = createBattleScriptSchedulerState({
      ...context.state.scheduler,
      activeBattler: battler,
    });
    const selector = EXPECTED_STARTS[
      context.instruction.source.label as keyof typeof EXPECTED_STARTS
    ]!.selector;
    const ignoresEscapePrevention =
      (selector & SWITCH_IGNORE_ESCAPE_PREVENTION) !== 0;
    const battlerState = rules.battlers[battler];
    const volatilePreventsSwitch =
      (battlerState.status2
        & (BATTLE_SCRIPT_STATUS2_WRAPPED_MASK | STATUS2_ESCAPE_PREVENTION)) !== 0
      || (battlerState.status3 & BATTLE_SCRIPT_STATUS3_ROOTED) !== 0;
    const jumpOperand = context.instruction.operands[1]!;
    const jumpTarget = resolveBattleScriptLabel(
      context.program,
      jumpOperand.expression,
    );
    if (!jumpTarget) {
      throw new Error(
        `Cmd_jumpifcantswitch: unresolved jump target ${jumpOperand.expression}`,
      );
    }
    if (!ignoresEscapePrevention && volatilePreventsSwitch) {
      return transitionBattleScriptCommand(
        context,
        Object.freeze({
          kind: "jump",
          programCounter: jumpTarget.programCounter,
        }),
        { scheduler },
      );
    }

    const { battlersCount, battleTypeFlags } = rules.battleTopology;
    if (
      battlersCount !== 2
      || (battleTypeFlags
        & (BATTLE_TYPE_MULTI | BATTLE_TYPE_TWO_OPPONENTS
          | BATTLE_TYPE_INGAME_PARTNER)) !== 0
    ) {
      return unsupportedBranch(context, scheduler);
    }

    const party = battlerState.side === 0
      ? rules.party.player
      : rules.party.opponent;
    const canSwitch = party.some((member, partyIndex) =>
      member.species !== 0
      && !member.isEgg
      && member.hp !== 0
      && partyIndex !== battlerState.partyIndex
    );
    return transitionBattleScriptCommand(
      context,
      canSwitch
        ? Object.freeze({ kind: "advance" })
        : Object.freeze({
          kind: "jump",
          programCounter: jumpTarget.programCounter,
        }),
      { scheduler },
    );
  };
}

export function createBattleScriptJumpifcantswitchOpcodeHandlers(
  program: BattleScriptProgram,
): BattleScriptOpcodeHandlers<BattleScriptRulesContext> {
  const starts = program.instructions.filter(
    (instruction) =>
      instruction.opcodeName === "B_SCR_OP_JUMPIFCANTSWITCH",
  );
  if (starts.length !== 2) {
    throw new Error(
      `B_SCR_OP_JUMPIFCANTSWITCH requires exactly 2 concrete starts, got ${starts.length}`,
    );
  }
  for (const instruction of starts) {
    const expected = EXPECTED_STARTS[
      instruction.source.label as keyof typeof EXPECTED_STARTS
    ];
    const [selectorOperand, jumpOperand] = instruction.operands;
    if (
      !expected
      || instruction.dispatcher !== "Cmd_jumpifcantswitch"
      || instruction.source.statementLine !== expected.statementLine
      || instruction.operands.length !== 2
      || selectorOperand?.widthBytes !== 1
      || selectorOperand.expression !== expected.selectorExpression
      || jumpOperand?.widthBytes !== 4
      || jumpOperand.expression !== expected.jumpExpression
      || !resolveBattleScriptLabel(program, jumpOperand.expression)
    ) {
      throw new Error(
        `invalid B_SCR_OP_JUMPIFCANTSWITCH shape at program counter ${instruction.programCounter}`,
      );
    }
  }
  if (new Set(starts.map((instruction) => instruction.source.label)).size !== 2) {
    throw new Error("B_SCR_OP_JUMPIFCANTSWITCH requires both assembled selector shapes");
  }
  return Object.freeze({
    [starts[0]!.opcodeId]: createJumpifcantswitchHandler(),
  });
}
