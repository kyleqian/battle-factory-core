import { describe, expect, it } from "vitest";
import {
  createBattleScriptJumpifnodamageOpcodeHandlers,
} from "../src/engine/battleScriptJumpifnodamageOpcode.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
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
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
  type FactoryFullTurnConfig,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const FOCUS_PUNCH = 264;
const SWIFT = 129;
const LIGHT_SCREEN = 113;
const EVIDENCE_RNG_SEED = 919694434;
const program = loadBattleScriptProgram();
const instruction = program.instructions.find(
  (candidate) => candidate.opcodeName === "B_SCR_OP_JUMPIFNODAMAGE",
)!;
const hitFromAccCheck = resolveBattleScriptLabel(
  program,
  "BattleScript_HitFromAccCheck",
)!;

function battler(
  side: 0 | 1,
  changes: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesBattler {
  return Object.freeze({
    side,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 135,
    maxHP: changes.maxHP ?? changes.hp ?? 135,
    moves: changes.moves ?? ([FOCUS_PUNCH, 0, 0, 0] as const),
    pp: changes.pp ?? ([20, 0, 0, 0] as const),
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
    item: changes.item ?? 0,
    statStages: changes.statStages ?? ([6, 6, 6, 6, 6, 6, 6, 6] as const),
    protectPhysicalDmg: changes.protectPhysicalDmg ?? 0,
    protectPhysicalBattlerId: changes.protectPhysicalBattlerId ?? 0,
    protectSpecialDmg: changes.protectSpecialDmg ?? 0,
    protectSpecialBattlerId: changes.protectSpecialBattlerId ?? 0,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    speed: changes.speed ?? 100,
  });
}

function rules(
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler(0, attackerChanges),
      battler(1),
      battler(0, { hp: 0 }),
      battler(1, { hp: 0 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FOCUS_PUNCH,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: (context: Readonly<{
      state: { scheduler: { pendingControllerBattlers: readonly unknown[] } };
    }>) => context.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (
      _context: unknown,
      operand: Readonly<{ expression: string }>,
    ) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
            kind: "message" as const,
            messageId: operand.expression,
            substitutions: Object.freeze([]),
          })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => 0 as const,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (
      _context: unknown,
      operand: Readonly<{ expression: string }>,
    ) =>
      operand.expression === "B_WAIT_TIME_LONG" ? 64 : null,
    resolveByteOperand: () => null,
  });
}

function directState(
  rulesContext: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectFocusPunch",
    rulesContext,
    EVIDENCE_RNG_SEED,
    externalPorts(),
  );
  return Object.freeze({
    ...execution.state,
    programCounter: instruction.programCounter,
  });
}

function runFocusPunch(
  rulesContext: BattleScriptRulesContext,
): BattleScriptMachineState<BattleScriptRulesContext> {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    "BattleScript_EffectFocusPunch",
    rulesContext,
    EVIDENCE_RNG_SEED,
    externalPorts(),
  );
  let state = execution.state;
  for (let guard = 0; guard < 300; guard += 1) {
    const stepped = stepBattleScriptMachine(program, state, execution.handlers);
    state = stepped.state;
    if (stepped.kind === "blocked") {
      for (const pending of state.scheduler.pendingControllerBattlers) {
        state = acknowledgeBattleScriptMachineController(state, pending);
      }
      continue;
    }
    if (stepped.kind === "halted") {
      expect(state.haltReason).toMatchObject({
        kind: "terminal",
        opcodeName: "B_SCR_OP_END",
      });
      return state;
    }
    expect(stepped.kind).not.toBe("unsupported");
  }
  throw new Error("Focus Punch did not reach its own END");
}

function malformedProgram(
  operand: Readonly<{ widthBytes: 1 | 2 | 4; expression: string }>,
): BattleScriptProgram {
  const instructions = program.instructions.map((candidate) =>
    candidate.programCounter === instruction.programCounter
      ? {
          ...candidate,
          operands: [{
            ...candidate.operands[0]!,
            widthBytes: operand.widthBytes,
            expression: operand.expression,
          }],
        }
      : candidate);
  return { ...program, instructions } as BattleScriptProgram;
}

describe("B_SCR_OP_JUMPIFNODAMAGE / Cmd_jumpifnodamage", () => {
  it("registers the sole source instruction as opcode 0xcf with one [4] operand (five bytes total)", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xcf,
      dispatcher: "Cmd_jumpifnodamage",
      source: {
        label: "BattleScript_EffectFocusPunch",
        statementLine: 2262,
      },
      operands: [{
        widthBytes: 4,
        expression: "BattleScript_HitFromAccCheck",
      }],
    });
    expect(1 + instruction.operands.reduce((sum, operand) => sum + operand.widthBytes, 0)).toBe(5);
    expect(createBattleScriptJumpifnodamageOpcodeHandlers(program)[0xcf]).toBeTypeOf("function");
  });

  it("both attacker ProtectStruct receipts zero: jumps to the exact encoded pointer", () => {
    const handlers = createBattleScriptJumpifnodamageOpcodeHandlers(program);
    const result = stepBattleScriptMachine(program, directState(rules()), handlers);
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(hitFromAccCheck.programCounter);
    expect(program.instructions[result.state.programCounter]!.source.label)
      .toBe("BattleScript_HitFromAccCheck");
  });

  it.each([
    ["physical", { protectPhysicalDmg: 24 }],
    ["special", { protectSpecialDmg: 24 }],
    ["both", { protectPhysicalDmg: 24, protectSpecialDmg: 17 }],
  ])("%s attacker receipt: falls through by the full five-byte instruction", (_name, receipts) => {
    const handlers = createBattleScriptJumpifnodamageOpcodeHandlers(program);
    const result = stepBattleScriptMachine(
      program,
      directState(rules(receipts)),
      handlers,
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.programCounter).toBe(instruction.programCounter + 1);
    expect(program.instructions[result.state.programCounter]).toMatchObject({
      opcodeName: "B_SCR_OP_PPREDUCE",
      source: { label: "BattleScript_EffectFocusPunch" },
    });
  });

  it("reads ProtectStruct receipts, not same-named SpecialStatus copies or the target", () => {
    const source = createBattleScriptRulesContext({
      ...rules(),
      battlers: [
        battler(0, {
          specialStatus: { restoredBattlerSprite: 0, physicalDmg: 99, specialDmg: 88 },
        }),
        battler(1, { protectPhysicalDmg: 77, protectSpecialDmg: 66 }),
        battler(0, { hp: 0 }),
        battler(1, { hp: 0 }),
      ],
    });
    const result = stepBattleScriptMachine(
      program,
      directState(source),
      createBattleScriptJumpifnodamageOpcodeHandlers(program),
    );
    expect(result.state.programCounter).toBe(hitFromAccCheck.programCounter);
  });

  it("rejects malformed operand width and unresolved/wrong pointer before registration", () => {
    expect(() => createBattleScriptJumpifnodamageOpcodeHandlers(
      malformedProgram({ widthBytes: 2, expression: "BattleScript_HitFromAccCheck" }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFNODAMAGE shape/);
    expect(() => createBattleScriptJumpifnodamageOpcodeHandlers(
      malformedProgram({ widthBytes: 4, expression: "BattleScript_DoesNotExist" }),
    )).toThrow(/invalid B_SCR_OP_JUMPIFNODAMAGE shape/);
  });
});

describe("genuine BattleScript_EffectFocusPunch terminal routes", () => {
  it("physical receipt reaches the real lost-focus END, spends PP, emits the source message, and consumes no RNG", () => {
    const result = runFocusPunch(rules({ protectPhysicalDmg: 24 }));
    expect(result.rulesContext.battlers[0]!.pp[0]).toBe(19);
    expect(result.rulesContext.battlers[1]!.hp).toBe(135);
    expect(result.events).toContainEqual(expect.objectContaining({
      kind: "message",
      messageId: "STRINGID_PKMNLOSTFOCUS",
    }));
    expect(result.events.some((event) => event.kind === "hp-change")).toBe(false);
    expect(result.rng).toMatchObject({
      value: EVIDENCE_RNG_SEED,
      calls: 0,
      ledger: [],
    });
  });

  it("zero receipts reach the real hit-chain END with the banked cursor's exact four-roll ledger", () => {
    const result = runFocusPunch(rules({
      species: 307,
      attack: 150,
      types: ["TYPE_GRASS", "TYPE_FIGHTING"],
    }));
    expect(result.rulesContext.battlers[0]!.pp[0]).toBe(19);
    expect(result.rulesContext.battlers[1]!.hp).toBeLessThan(135);
    expect(result.events.some((event) =>
      event.kind === "message" && event.messageId === "STRINGID_PKMNLOSTFOCUS"
    )).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({
      kind: "hp-change",
      battler: 1,
      from: 135,
    }));
    expect(result.rng.calls).toBe(4);
    expect(result.rng.value).toBe(1621732966);
    expect(result.rng.ledger.map(({ reason, randomValue }) => [reason, randomValue]))
      .toEqual([
        ["accuracycheck", 56317],
        ["critcalc", 15002],
        ["adjustnormaldamage", 52212],
        ["seteffectwithchance", 24745],
      ]);
  });
});

function focusFullTurnConfig(trainerMove: number): FactoryFullTurnConfig {
  return {
    requestId: 1,
    rngSeed: EVIDENCE_RNG_SEED,
    player: {
      species: 307,
      moveId: FOCUS_PUNCH,
      moves: [202, 73, FOCUS_PUNCH, 147],
      pp: [5, 10, 20, 15],
      attack: 150,
      defense: 100,
      spAttack: 80,
      spDefense: 80,
      speed: 90,
      hp: 135,
      types: ["TYPE_GRASS", "TYPE_FIGHTING"],
    },
    trainer: {
      species: 121,
      moveId: trainerMove,
      moves: [trainerMove, trainerMove, trainerMove, trainerMove],
      pp: trainerMove === SWIFT ? [20, 20, 20, 20] : [30, 30, 30, 30],
      attack: 95,
      defense: 105,
      spAttack: 120,
      spDefense: 105,
      speed: 135,
      hp: 135,
      types: ["TYPE_WATER", "TYPE_PSYCHIC"],
    },
  };
}

function runFullTurn(trainerMove: number) {
  const initial = createFactoryFullTurnBattleState(focusFullTurnConfig(trainerMove));
  const afterPlayer = submitFactoryFullTurnDecision(initial, {
    requestId: 1,
    side: "player",
    decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
  });
  if (afterPlayer.kind !== "decision-required") throw new Error("expected trainer decision");
  return submitFactoryFullTurnDecision(afterPlayer.state, {
    requestId: 2,
    side: "trainer",
    decision: { kind: "use-move", moveSlot: 0, targetBattler: trainerMove === LIGHT_SCREEN ? 1 : 0 },
  });
}

describe("Focus Punch receipts carry through the generic full-turn owner", () => {
  it("Swift's real datahpupdate receipt survives action-finished SpecialStatus cleanup into lost focus", () => {
    const result = runFullTurn(SWIFT);
    expect(result.kind).toBe("decision-required");
    const rc = result.state.rules.rulesContext;
    expect(rc.battlers[0]!.hp).toBe(111);
    expect(rc.battlers[0]!.pp[2]).toBe(19);
    expect(rc.battlers[1]!.hp).toBe(135);
    expect(result.events).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({ kind: "message", messageId: "STRINGID_PKMNLOSTFOCUS" }),
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      payload: expect.objectContaining({ kind: "hp-change", battler: 0, from: 135, to: 111 }),
      provenance: expect.objectContaining({ opcodeName: "B_SCR_OP_DATAHPUPDATE" }),
    }));
    expect(result.state.rng.calls).toBe(4);
    expect(result.state.rng.value).toBe(1621732966);
    // The receipt survived between actions, then the existing
    // TurnValuesCleanUp(FALSE) owner reset it at the next-turn boundary.
    expect(rc.battlers[0]!.specialStatus.physicalDmg).toBe(0);
    expect(rc.battlers[0]!.protectPhysicalDmg).toBe(0);
    expect(rc.battlers[0]!.protectSpecialDmg).toBe(0);
  });

  it("Light Screen writes no receipt, so Focus Punch executes the hit chain before next-turn reset", () => {
    const result = runFullTurn(LIGHT_SCREEN);
    expect(result.kind).toBe("decision-required");
    const rc = result.state.rules.rulesContext;
    expect(rc.battlers[0]!.hp).toBe(135);
    expect(rc.battlers[0]!.pp[2]).toBe(19);
    expect(rc.battlers[1]!.hp).toBe(66);
    expect(rc.sideTimers[1]!.lightscreenTimer).toBe(4);
    expect(result.events.some(({ payload }) =>
      payload.kind === "message" && payload.messageId === "STRINGID_PKMNLOSTFOCUS"
    )).toBe(false);
    expect(result.state.rng.calls).toBe(5);
    expect(result.state.rng.value).toBe(2756097505);
    expect(rc.battlers[0]!.protectPhysicalDmg).toBe(0);
    expect(rc.battlers[0]!.protectSpecialDmg).toBe(0);
  });
});
