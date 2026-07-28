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
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  BATTLE_SCRIPT_HITMARKER_GRUDGE,
  BATTLE_SCRIPT_STATUS3_GRUDGE,
} from "../src/engine/battleScriptSourceConstants.ts";

const program = loadBattleScriptProgram();
const MOVE_TACKLE = 33;
const MOVE_GRUDGE = 288;
const grudgeInstruction = program.instructions.find(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_TRYSETGRUDGE",
)!;
const tryFaintInstruction = program.instructions.find(
  ({ opcodeName, source }) =>
    opcodeName === "B_SCR_OP_TRYFAINTMON"
    && source.label === "BattleScript_HitFromAtkAnimation",
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
  });
}

function partyMember(move: number, pp: number, hp = 100): BattleScriptPartyMemberInput {
  return Object.freeze({
    species: 1,
    hp,
    moves: [move, 0, 0, 0] as const,
    pp: [pp, 0, 0, 0] as const,
  });
}

function party(move: number, pp: number): readonly BattleScriptPartyMemberInput[] {
  return Object.freeze([
    partyMember(move, pp),
    {}, {}, {}, {}, {},
  ]);
}

function rules(
  attacker: 0 | 1 = 0,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  changes: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  const target = attacker === 0 ? 1 : 0;
  const battlers = [
    battler({ side: 0 }),
    battler({ side: 1 }),
    battler({ side: 0, hp: 0 }),
    battler({ side: 1, hp: 0 }),
  ];
  battlers[attacker] = battler({ side: attacker === 0 ? 0 : 1, ...attackerChanges });
  battlers[target] = battler({ side: target === 0 ? 0 : 1, ...targetChanges });
  return createBattleScriptRulesContext({
    battlers,
    selectorRoles: { attacker, target, effectBattler: target, fainted: null },
    scriptingBattler: attacker,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: attackerChanges.moves?.[0] ?? MOVE_TACKLE,
    currentMovePosition: 0,
    chosenMovePositions: attacker === 0 ? [0, 0, 0, 0] : [0, 0, 0, 0],
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: party(attacker === 0 ? MOVE_TACKLE : MOVE_GRUDGE, attacker === 0 ? 10 : 5),
      opponent: party(attacker === 1 ? MOVE_TACKLE : MOVE_GRUDGE, attacker === 1 ? 10 : 5),
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
          operand.expression === "STRINGID_PKMNLOSTPPGRUDGE"
            ? [`MOVE:${context.state.rulesContext.battleTextBuff1Move}`]
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

function runFromState(
  initial: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
): BattleScriptMachineState<BattleScriptRulesContext> {
  let state = initial;
  for (let guard = 0; guard < 1000; guard += 1) {
    const result = stepBattleScriptMachine(program, state, handlers);
    if (result.kind === "halted") return result.state;
    expect(result.kind).not.toBe("unsupported");
    state = result.kind === "blocked" ? acknowledge(result.state) : result.state;
  }
  throw new Error("Grudge script did not reach a terminal");
}

function runEntry(entry: string, source: BattleScriptRulesContext, seed = 7) {
  const execution = createBattleScriptStatusRulesExecution(program, entry, source, seed, ports());
  return runFromState(execution.state, execution.handlers);
}

function runTryFaint(source: BattleScriptRulesContext) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectHit",
    source,
    7,
    ports(),
  );
  return runFromState(
    Object.freeze({ ...execution.state, programCounter: tryFaintInstruction.programCounter }),
    execution.handlers,
  );
}

describe("B_SCR_OP_TRYSETGRUDGE / EFFECT_GRUDGE", () => {
  it("registers the exact source opcode/pointer shape", () => {
    expect(grudgeInstruction).toMatchObject({
      opcodeId: 0xdc,
      dispatcher: "Cmd_trysetgrudge",
      operands: [{ widthBytes: 4, expression: "BattleScript_ButItFailed" }],
    });
  });

  it("sets only the attacker status3 bit without RNG and takes the duplicate failure pointer", () => {
    const source = rules(0, { moves: [MOVE_GRUDGE, 0, 0, 0], pp: [5, 0, 0, 0] });
    const execution = createBattleScriptStatusRulesExecution(
      program,
      "BattleScript_EffectGrudge",
      source,
      7,
      ports(),
    );
    const first = stepBattleScriptMachine(
      program,
      Object.freeze({ ...execution.state, programCounter: grudgeInstruction.programCounter }),
      execution.handlers,
    );
    if (first.kind !== "advanced") throw new Error(`setter did not advance: ${first.kind}`);
    expect(first.state.rulesContext.battlers[0].status3).toBe(BATTLE_SCRIPT_STATUS3_GRUDGE);
    expect(first.state.rng.calls).toBe(0);
    const duplicate = stepBattleScriptMachine(
      program,
      Object.freeze({ ...first.state, programCounter: grudgeInstruction.programCounter }),
      execution.handlers,
    );
    if (duplicate.kind !== "advanced") throw new Error(`duplicate did not jump: ${duplicate.kind}`);
    expect(duplicate.state.programCounter)
      .toBe(resolveBattleScriptLabel(program, "BattleScript_ButItFailed")!.programCounter);
    expect(duplicate.state.rng.calls).toBe(0);
  });

  it("walks the full committed effect to END with its message and canonical zero-draw replay", () => {
    const source = rules(0, { moves: [MOVE_GRUDGE, 0, 0, 0], pp: [5, 0, 0, 0] });
    const first = runEntry("BattleScript_EffectGrudge", source);
    const replay = runEntry("BattleScript_EffectGrudge", source);
    expect(first.haltReason).toMatchObject({ kind: "terminal", opcodeName: "B_SCR_OP_END" });
    expect(first.rulesContext.battlers[0]).toMatchObject({
      pp: [4, 0, 0, 0],
      status3: BATTLE_SCRIPT_STATUS3_GRUDGE,
    });
    expect(first.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNWANTSGRUDGE" }),
    ]));
    expect(first.rng.calls).toBe(0);
    expect(replay).toEqual(first);
  });
});

describe("Cmd_tryfaintmon Grudge consumer", () => {
  it.each([0, 1] as const)(
    "zeros and persists the opposing attacker's chosen PP when battler %i is the attacker",
    (attacker) => {
      const final = runTryFaint(rules(
        attacker,
        { moves: [MOVE_TACKLE, 0, 0, 0], pp: [10, 0, 0, 0], hp: 100 },
        { hp: 0, status3: BATTLE_SCRIPT_STATUS3_GRUDGE },
        { currentMove: MOVE_TACKLE },
      ));
      const side = attacker === 0 ? "player" : "opponent";
      expect(final.rulesContext.battlers[attacker].pp[0]).toBe(0);
      expect(final.rulesContext.party[side][0].pp[0]).toBe(0);
      expect(final.rulesContext.battleTextBuff1Move).toBe(MOVE_TACKLE);
      expect(final.events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: "set-battler-pp-data",
          battler: attacker,
          movePosition: 0,
          pp: 0,
        }),
        expect.objectContaining({
          kind: "message",
          messageId: "STRINGID_PKMNLOSTPPGRUDGE",
          substitutions: [`MOVE:${MOVE_TACKLE}`],
        }),
      ]));
      expect(final.rng.calls).toBe(0);
    },
  );

  it("excludes passive/non-direct damage and an already-fainted attacker", () => {
    const passive = runTryFaint(rules(
      0,
      { moves: [MOVE_TACKLE, 0, 0, 0], pp: [10, 0, 0, 0] },
      { hp: 0, status3: BATTLE_SCRIPT_STATUS3_GRUDGE },
      { currentMove: MOVE_TACKLE, hitMarker: BATTLE_SCRIPT_HITMARKER_GRUDGE },
    ));
    expect(passive.rulesContext.battlers[0].pp[0]).toBe(10);
    expect(passive.events.some(({ kind }) => kind === "set-battler-pp-data")).toBe(false);

    const attackerFaintedToo = runTryFaint(rules(
      0,
      { moves: [MOVE_TACKLE, 0, 0, 0], pp: [10, 0, 0, 0], hp: 0 },
      { hp: 0, status3: BATTLE_SCRIPT_STATUS3_GRUDGE },
      { currentMove: MOVE_TACKLE },
    ));
    expect(attackerFaintedToo.rulesContext.battlers[0].pp[0]).toBe(10);
    expect(attackerFaintedToo.events.some(({ kind }) => kind === "set-battler-pp-data")).toBe(false);
  });
});
