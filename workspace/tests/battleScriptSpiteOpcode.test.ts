import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptPartyMemberInput,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram, resolveBattleScriptLabel } from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_STATUS2_MASKS,
  BATTLE_SCRIPT_STATUS2_TRANSFORMED,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MOVE_NONE = 0;
const MOVE_TACKLE = 33;
const MOVE_SPITE = 180;
const spiteInstruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSPITEPPREDUCE",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 100,
    maxHP: changes.maxHP ?? 100,
    moves: changes.moves ?? ([MOVE_TACKLE, 0, 0, 0] as const),
    pp: changes.pp ?? ([10, 0, 0, 0] as const),
    status1: changes.status1 ?? 0,
    status2: changes.status2 ?? 0,
    status3: changes.status3 ?? 0,
    substituteHP: changes.substituteHP ?? 0,
    rolloutTimer: changes.rolloutTimer ?? 0,
    furyCutterCounter: changes.furyCutterCounter ?? 0,
    truantCounter: changes.truantCounter ?? 0,
    rechargeTimer: changes.rechargeTimer ?? 0,
    flinchImmobility: changes.flinchImmobility ?? 0,
    disabledMove: changes.disabledMove ?? 0,
    usedDisabledMove: changes.usedDisabledMove ?? 0,
    tauntTimer: changes.tauntTimer ?? 0,
    usedTauntedMove: changes.usedTauntedMove ?? 0,
    usedImprisonedMove: changes.usedImprisonedMove ?? 0,
    partyIndex: changes.partyIndex ?? 0,
    mimickedMoves: changes.mimickedMoves,
  });
}

function partyMember(move: number, pp: number): BattleScriptPartyMemberInput {
  return Object.freeze({
    species: 1,
    hp: 100,
    moves: [move, 0, 0, 0] as const,
    pp: [pp, 0, 0, 0] as const,
  });
}

function party(move: number, pp: number): readonly BattleScriptPartyMemberInput[] {
  return Object.freeze([partyMember(move, pp), {}, {}, {}, {}, {}]);
}

function rules(
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, moves: [MOVE_SPITE, 0, 0, 0], pp: [10, 0, 0, 0] }),
      battler({ side: 1, moves: [MOVE_TACKLE, 0, 0, 0], pp: [10, 0, 0, 0], ...targetChanges }),
      battler({ side: 0, hp: 0 }),
      battler({ side: 1, hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: MOVE_SPITE,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    moveHistory: { lastMoves: [MOVE_NONE, MOVE_TACKLE, MOVE_NONE, MOVE_NONE] },
    party: {
      player: party(MOVE_SPITE, 10),
      opponent: party(MOVE_TACKLE, targetChanges.pp?.[0] ?? 10),
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (
      context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
    ) => context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (
      context: Readonly<{ state: BattleScriptMachineState<BattleScriptRulesContext> }>,
      operand: Readonly<{ expression: string }>,
    ) => operand.expression.startsWith("STRINGID_")
      ? Object.freeze({
        kind: "message" as const,
        messageId: operand.expression,
        substitutions: Object.freeze(
          operand.expression === "STRINGID_PKMNREDUCEDPP"
            ? [
              `MOVE:${context.state.rulesContext.battleTextBuff1Move}`,
              `NUMBER:${context.state.rulesContext.battleTextBuff2ByteNumber}`,
            ]
            : [],
        ),
      })
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) =>
      operand.expression.startsWith("B_WAIT_TIME_") ? 1 : null,
    resolveByteOperand: () => null,
  });
}

function acknowledge(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function execution(source: BattleScriptRulesContext, seed: number) {
  return createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectSpite",
    source,
    seed,
    ports(),
  );
}

function stepOpcode(source: BattleScriptRulesContext, seed: number) {
  const run = execution(source, seed);
  return stepBattleScriptMachine(
    program,
    Object.freeze({ ...run.state, programCounter: spiteInstruction.programCounter }),
    run.handlers,
  );
}

function runToTerminal(source: BattleScriptRulesContext, seed: number) {
  const run = execution(source, seed);
  let state = run.state;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, run.handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.kind === "blocked" ? acknowledge(result.state) : result.state;
  }
  throw new Error("Spite script did not reach its own terminal");
}

describe("B_SCR_OP_TRYSPITEPPREDUCE / EFFECT_SPITE", () => {
  it("registers the exact source opcode/pointer shape", () => {
    expect(spiteInstruction).toMatchObject({
      opcodeId: 0xad,
      dispatcher: "Cmd_tryspiteppreduce",
      operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
    });
  });

  it("materializes and validates frozen mimic/message state", () => {
    const source = rules(
      { mimickedMoves: 15 },
      { battleTextBuff1Move: MOVE_TACKLE, battleTextBuff2ByteNumber: 5 },
    );
    expect(source.battlers[1].mimickedMoves).toBe(15);
    expect(source).toMatchObject({
      battleTextBuff1Move: MOVE_TACKLE,
      battleTextBuff2ByteNumber: 5,
    });
    expect(Object.isFrozen(source.battlers[1])).toBe(true);
    expect(() => rules({ mimickedMoves: 16 })).toThrow(/mimickedMoves/);
  });

  it.each([
    [0, 2],
    [4, 3],
    [1, 4],
    [3, 5],
  ])("draws source seed %i as a %i-PP reduction with exactly one local ledger entry", (seed, deducted) => {
    const result = stepOpcode(rules(), seed);
    if (result.kind !== "advanced") throw new Error(`Spite did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[1].pp[0]).toBe(10 - deducted);
    expect(result.state.rulesContext.party.opponent[0].pp[0]).toBe(10 - deducted);
    expect(result.state.rulesContext).toMatchObject({
      battleTextBuff1Move: MOVE_TACKLE,
      battleTextBuff2ByteNumber: deducted,
    });
    expect(result.state.rng.calls).toBe(1);
    expect(result.state.rng.ledger).toHaveLength(1);
    expect(result.state.rng.ledger[0]).toMatchObject({
      call: 1,
      reason: "Spite PP reduction ((Random() & 3) + 2)",
      provenance: { opcodeName: "B_SCR_OP_TRYSPITEPPREDUCE" },
    });
  });

  it("clamps the deduction to current PP, reaches zero, and cancels multi-turn state", () => {
    const result = stepOpcode(rules({
      pp: [3, 0, 0, 0],
      status2: BATTLE_SCRIPT_STATUS2_MASKS.STATUS2_MULTIPLETURNS,
      rolloutTimer: 4,
      furyCutterCounter: 2,
    }), 3);
    if (result.kind !== "advanced") throw new Error(`Spite did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[1]).toMatchObject({
      pp: [0, 0, 0, 0],
      status2: 0,
      rolloutTimer: 0,
      furyCutterCounter: 0,
    });
    expect(result.state.rulesContext.battleTextBuff2ByteNumber).toBe(3);
    expect(result.state.rulesContext.party.opponent[0].pp[0]).toBe(0);
  });

  it.each([
    ["no last move", () => rules({}, { moveHistory: { lastMoves: [0, MOVE_NONE, 0, 0] } })],
    ["unavailable move", () => rules({}, { moveHistory: { lastMoves: [0, 0xffff, 0, 0] } })],
    ["move missing from slots", () => rules({}, { moveHistory: { lastMoves: [0, 99, 0, 0] } })],
    ["PP one", () => rules({ pp: [1, 0, 0, 0] })],
  ])("takes failure without a local draw for %s", (_name, source) => {
    const result = stepOpcode(source(), 3);
    if (result.kind !== "advanced") throw new Error(`Spite failure did not jump: ${result.kind}`);
    expect(result.state.programCounter)
      .toBe(resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!.programCounter);
    expect(result.state.rng.calls).toBe(0);
  });

  it.each([
    ["mimicked", { mimickedMoves: 1, status2: 0 }],
    ["transformed", { mimickedMoves: 0, status2: BATTLE_SCRIPT_STATUS2_TRANSFORMED }],
  ])("changes only active PP for a %s move slot", (_name, target) => {
    const result = stepOpcode(rules(target), 0);
    if (result.kind !== "advanced") throw new Error(`Spite did not advance: ${result.kind}`);
    expect(result.state.rulesContext.battlers[1].pp[0]).toBe(8);
    expect(result.state.rulesContext.party.opponent[0].pp[0]).toBe(10);
    expect(result.state.events).toEqual([]);
    expect(result.state.scheduler.pendingControllerBattlers).toEqual([]);
    expect(result.state.rng.calls).toBe(1);
  });

  it("persists the controller PP write for a later switch-in", () => {
    const result = stepOpcode(rules(), 1);
    if (result.kind !== "advanced") throw new Error(`Spite did not advance: ${result.kind}`);
    const durablePp = result.state.rulesContext.party.opponent[0].pp;
    const switched = createBattleScriptRulesContext({
      ...result.state.rulesContext,
      battlers: result.state.rulesContext.battlers.map((candidate, index) =>
        index === 1 ? { ...candidate, pp: durablePp } : candidate
      ),
    });
    expect(switched.battlers[1].pp).toEqual([6, 0, 0, 0]);
    expect(result.state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "set-battler-pp-data",
        battler: 1,
        movePosition: 0,
        pp: 6,
      }),
    ]));
  });

  it("walks the committed effect to END with accuracy + deduction draws, typed buffers, and canonical replay", () => {
    const source = rules();
    const first = runToTerminal(source, 7);
    const replay = runToTerminal(source, 7);
    expect(first.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(first.rng.calls).toBe(2);
    expect(first.rng.ledger.map(({ provenance }) => provenance.opcodeName)).toEqual([
      "B_SCR_OP_ACCURACYCHECK",
      "B_SCR_OP_TRYSPITEPPREDUCE",
    ]);
    expect(first.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "message",
        messageId: "STRINGID_PKMNREDUCEDPP",
        substitutions: [
          `MOVE:${MOVE_TACKLE}`,
          `NUMBER:${first.rulesContext.battleTextBuff2ByteNumber}`,
        ],
      }),
    ]));
    expect(replay).toEqual(first);
  });

  it("walks no-last-move failure to END with only the script's accuracy draw", () => {
    const failed = runToTerminal(
      rules({}, { moveHistory: { lastMoves: [0, MOVE_NONE, 0, 0] } }),
      7,
    );
    expect(failed.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(failed.rng.calls).toBe(1);
    expect(failed.rng.ledger[0]?.provenance.opcodeName).toBe("B_SCR_OP_ACCURACYCHECK");
  });
});
