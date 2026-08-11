import { describe, expect, it } from "vitest";
import {
  BATTLE_SCRIPT_EFFECT_FRUSTRATION,
  BATTLE_SCRIPT_EFFECT_RETURN,
  BATTLE_SCRIPT_MAX_FRIENDSHIP,
  createBattleScriptFriendshipToDamageOpcodeHandlers,
  friendshipToDynamicBasePower,
} from "../src/engine/battleScriptFriendshipToDamageOpcode.ts";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContext,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  acknowledgeBattleScriptMachineController,
  createBattleScriptMachine,
  stepBattleScriptMachine,
  type BattleScriptMachineState,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  type BattleScriptProgram,
} from "../src/engine/battleScriptProgram.ts";

const MOVE_STRENGTH = 70;
const MOVE_RETURN = 216;
const MOVE_FRUSTRATION = 218;
const program = loadBattleScriptProgram();
const friendshipInstruction = program.instructions.find(
  (instruction) =>
    instruction.opcodeName === "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION",
)!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return Object.freeze({
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 999,
    maxHP: changes.maxHP ?? 999,
    moves: changes.moves ?? Object.freeze([MOVE_RETURN, 0, 0, 0]),
    pp: changes.pp ?? Object.freeze([20, 0, 0, 0]),
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
    statStages: changes.statStages ?? Object.freeze([6, 6, 6, 6, 6, 6, 6, 6]),
    protected: changes.protected,
    types: changes.types ?? (["TYPE_NORMAL", "TYPE_NORMAL"] as const),
    species: changes.species ?? 1,
    attack: changes.attack ?? 100,
    defense: changes.defense ?? 100,
    spAttack: changes.spAttack ?? 100,
    spDefense: changes.spDefense ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 0,
    partyIndex: changes.partyIndex ?? 0,
  });
}

function context(
  move: number,
  attackerChanges: Partial<BattleScriptRulesBattler> = {},
  targetChanges: Partial<BattleScriptRulesBattler> = {},
  contextChanges: Partial<BattleScriptRulesContextInput> = {},
): BattleScriptRulesContext {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0, moves: [move, 0, 0, 0], ...attackerChanges }),
      battler({ side: 1, ...targetChanges }),
      battler({ side: 0 }),
      battler({ side: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1 },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: move,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    ...contextChanges,
  });
}

function externalPorts(): BattleScriptStatusRulesExternalPorts {
  return Object.freeze({
    isControllerIdle: () => true,
    prepareMessage: (_context, operand) =>
      operand.expression.startsWith("STRINGID_")
        ? Object.freeze({
          kind: "message" as const,
          messageId: operand.expression,
          substitutions: Object.freeze([]),
        })
        : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: () => null,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_context, operand) => {
      if (operand.expression === "B_WAIT_TIME_LONG") return 64;
      if (operand.expression === "B_WAIT_TIME_SHORT") return 32;
      return null;
    },
    resolveByteOperand: () => null,
  });
}

function acknowledgeAllPending(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
): BattleScriptMachineState<BattleScriptRulesContext> {
  let next = state;
  for (const battlerId of state.scheduler.pendingControllerBattlers) {
    next = acknowledgeBattleScriptMachineController(next, battlerId);
  }
  return next;
}

function step(
  state: BattleScriptMachineState<BattleScriptRulesContext>,
  handlers: ReturnType<typeof createBattleScriptStatusRulesExecution>["handlers"],
) {
  let result = stepBattleScriptMachine(program, state, handlers);
  let guard = 0;
  while (result.kind === "scheduler-progressed" || result.kind === "blocked") {
    guard += 1;
    if (guard > 500) throw new Error("Return/Frustration step did not converge");
    const nextState = result.kind === "blocked" ? acknowledgeAllPending(result.state) : result.state;
    result = stepBattleScriptMachine(program, nextState, handlers);
  }
  return result;
}

function runToTerminal(rules: BattleScriptRulesContext, entryLabel: string, seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program,
    entryLabel,
    rules,
    seed,
    externalPorts(),
  );
  let result = step(execution.state, execution.handlers);
  let instructions = 0;
  while (result.kind === "advanced" && instructions < 500) {
    instructions += 1;
    result = step(result.state, execution.handlers);
  }
  if (result.kind !== "halted") {
    throw new Error(`Return/Frustration did not reach its own terminal: ${result.kind}`);
  }
  expect(result.state.haltReason).toMatchObject({
    kind: "terminal",
    opcodeName: "B_SCR_OP_END",
  });
  return result.state;
}

function eventReceipts(state: BattleScriptMachineState<BattleScriptRulesContext>) {
  return state.events.map((event) => {
    switch (event.kind) {
      case "message":
        return { kind: event.kind, messageId: event.messageId };
      case "set-battler-pp-data":
        return {
          kind: event.kind,
          battler: event.battler,
          movePosition: event.movePosition,
          pp: event.pp,
        };
      case "animation":
        return { kind: event.kind, animationId: event.animationId, battler: event.battler };
      case "play-se":
        return { kind: event.kind, battler: event.battler, songId: event.songId };
      case "health-bar-update":
        return { kind: event.kind, battler: event.battler, healthValue: event.healthValue };
      case "hp-change":
        return { kind: event.kind, battler: event.battler, from: event.from, to: event.to };
      case "set-battler-sprite-visibility":
        return { kind: event.kind, battler: event.battler, invisible: event.invisible };
      default:
        return { kind: event.kind };
    }
  });
}

function directOpcodeState(rules: BattleScriptRulesContext) {
  const initial = createBattleScriptMachine(
    program,
    "BattleScript_EffectReturn",
    rules,
    0x1234_5678,
  );
  return Object.freeze({
    ...initial,
    programCounter: friendshipInstruction.programCounter,
  });
}

describe("source-complete FRIENDSHIPTODAMAGECALCULATION registration", () => {
  it("pins the sole shared zero-operand instruction and exact dispatch shape", () => {
    const instructions = program.instructions.filter(
      (instruction) =>
        instruction.opcodeName === "B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION",
    );
    expect(instructions).toHaveLength(1);
    expect(instructions[0]).toMatchObject({
      opcodeId: 182,
      dispatcher: "Cmd_friendshiptodamagecalculation",
      source: { label: "BattleScript_EffectFrustration", statementLine: 1661 },
      operands: [],
    });
  });

  it("rejects missing, duplicated, wrong-dispatch, and operand-bearing program shapes", () => {
    const without = Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.filter(
        (instruction) => instruction !== friendshipInstruction,
      )),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptFriendshipToDamageOpcodeHandlers(without))
      .toThrow(/requires exactly 1 concrete start, got 0/);

    const duplicated = Object.freeze({
      ...program,
      instructions: Object.freeze([...program.instructions, friendshipInstruction]),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptFriendshipToDamageOpcodeHandlers(duplicated))
      .toThrow(/requires exactly 1 concrete start, got 2/);

    const replaceInstruction = (
      changes: Partial<typeof friendshipInstruction>,
    ): BattleScriptProgram => Object.freeze({
      ...program,
      instructions: Object.freeze(program.instructions.map((instruction) =>
        instruction === friendshipInstruction
          ? Object.freeze({ ...instruction, ...changes })
          : instruction
      )),
    }) as BattleScriptProgram;
    expect(() => createBattleScriptFriendshipToDamageOpcodeHandlers(
      replaceInstruction({ dispatcher: "Cmd_presentdamagecalculation" }),
    )).toThrow(/invalid B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION shape/);
    expect(() => createBattleScriptFriendshipToDamageOpcodeHandlers(
      replaceInstruction({
        operands: Object.freeze([{
          widthBytes: 1,
          expression: "0",
          sourceMacro: "friendshiptodamagecalculation",
          sourceMacroLine: 952,
          wrapperPath: Object.freeze(["friendshiptodamagecalculation"]),
        }]),
      }),
    )).toThrow(/invalid B_SCR_OP_FRIENDSHIPTODAMAGECALCULATION shape/);
  });

  it("uses exact Gen III floor arithmetic for every u8 friendship and its complement", () => {
    for (let friendship = 0; friendship <= BATTLE_SCRIPT_MAX_FRIENDSHIP; friendship += 1) {
      const returnPower = friendshipToDynamicBasePower(
        BATTLE_SCRIPT_EFFECT_RETURN,
        friendship,
      );
      const frustrationPower = friendshipToDynamicBasePower(
        BATTLE_SCRIPT_EFFECT_FRUSTRATION,
        friendship,
      );
      expect(returnPower).toBe(Math.trunc((10 * friendship) / 25));
      expect(frustrationPower).toBe(Math.trunc((10 * (255 - friendship)) / 25));
      expect(frustrationPower).toBe(friendshipToDynamicBasePower(
        BATTLE_SCRIPT_EFFECT_RETURN,
        255 - friendship,
      ));
    }
  });

  it.each([
    [0, 0, 102],
    [1, 0, 101],
    [2, 0, 101],
    [3, 1, 100],
    [4, 1, 100],
    [5, 2, 100],
    [250, 100, 2],
    [251, 100, 1],
    [252, 100, 1],
    [253, 101, 0],
    [254, 101, 0],
    [255, 102, 0],
  ])(
    "friendship %i pins quotient boundary/complement powers Return=%i Frustration=%i",
    (friendship, returnPower, frustrationPower) => {
      expect(friendshipToDynamicBasePower(BATTLE_SCRIPT_EFFECT_RETURN, friendship))
        .toBe(returnPower);
      expect(friendshipToDynamicBasePower(BATTLE_SCRIPT_EFFECT_FRUSTRATION, friendship))
        .toBe(frustrationPower);
    },
  );

  it("rejects invalid effects and unreachable non-u8 friendship inputs", () => {
    expect(() => friendshipToDynamicBasePower(0, 255))
      .toThrow(/reachable only for EFFECT_RETURN\/EFFECT_FRUSTRATION/);
    for (const friendship of [-1, 256, 1.5, Number.NaN]) {
      expect(() => friendshipToDynamicBasePower(BATTLE_SCRIPT_EFFECT_RETURN, friendship))
        .toThrow(/friendship must be a source u8/);
    }
  });

  it("writes only dynamicBasePower: no RNG, event, scheduler, battler, or unrelated-context side effects", () => {
    const rules = context(MOVE_RETURN, { friendship: 253 }, {}, {
      dynamicBasePower: 77,
      battleMoveDamage: 99,
    });
    const state = directOpcodeState(rules);
    const result = stepBattleScriptMachine(
      program,
      state,
      createBattleScriptFriendshipToDamageOpcodeHandlers(program),
    );
    expect(result.kind).toBe("advanced");
    expect(result.state.rulesContext.dynamicBasePower).toBe(101);
    expect(result.state.rulesContext.battleMoveDamage).toBe(99);
    expect(result.state.rulesContext.battlers).toBe(rules.battlers);
    expect(result.state.rulesContext.selectorRoles).toBe(rules.selectorRoles);
    expect(result.state.rng).toBe(state.rng);
    expect(result.state.events).toBe(state.events);
    expect(result.state.scheduler).toBe(state.scheduler);
  });

  it("rejects impossible dispatch from a third generated effect and a missing attacker role", () => {
    const handlers = createBattleScriptFriendshipToDamageOpcodeHandlers(program);
    expect(() => stepBattleScriptMachine(
      program,
      directOpcodeState(context(MOVE_STRENGTH, { friendship: 255 })),
      handlers,
    )).toThrow(/got effect/);
    expect(() => stepBattleScriptMachine(
      program,
      directOpcodeState(context(MOVE_RETURN, { friendship: 255 }, {}, {
        selectorRoles: { attacker: null, target: 1, effectBattler: 1 },
      })),
      handlers,
    )).toThrow(/requires a attacker role/);
  });
});

describe("BattleScript_EffectReturn/Frustration terminal walks", () => {
  it("Return at maximum friendship writes power 102 and reaches genuine END with exact damage/HP/PP/RNG/events", () => {
    const state = runToTerminal(
      context(MOVE_RETURN, { friendship: 255 }),
      "BattleScript_EffectReturn",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(102);
    expect(state.rulesContext.battlers[0].pp).toEqual([19, 0, 0, 0]);
    expect(state.rulesContext.battlers[1].hp).toBe(940);
    expect(state.rulesContext.hpDealt).toBe(59);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 19 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "play-se", battler: 1, songId: 13 },
      { kind: "animation", animationId: "HIT_ANIMATION", battler: 1 },
      { kind: "health-bar-update", battler: 1, healthValue: 59 },
      { kind: "hp-change", battler: 1, from: 999, to: 940 },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("Frustration at friendship 200 uses its complement power 22 and reaches genuine END with exact damage/HP/PP/RNG/events", () => {
    const state = runToTerminal(
      context(MOVE_FRUSTRATION, { friendship: 200 }),
      "BattleScript_EffectFrustration",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(22);
    expect(state.rulesContext.battlers[0].pp).toEqual([19, 0, 0, 0]);
    expect(state.rulesContext.battlers[1].hp).toBe(986);
    expect(state.rulesContext.hpDealt).toBe(13);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 19 },
      { kind: "animation", animationId: "MOVE_ANIMATION", battler: 0 },
      { kind: "play-se", battler: 1, songId: 13 },
      { kind: "animation", animationId: "HIT_ANIMATION", battler: 1 },
      { kind: "health-bar-update", battler: 1, healthValue: 13 },
      { kind: "hp-change", battler: 1, from: 999, to: 986 },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("Return's zero-power friendship extreme preserves the literal zero writer and uses move power 1 in damagecalc", () => {
    const state = runToTerminal(
      context(MOVE_RETURN, { friendship: 0 }),
      "BattleScript_EffectReturn",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(0);
    expect(state.rulesContext.hpDealt).toBe(3);
    expect(state.rulesContext.battlers[1].hp).toBe(996);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rng.calls).toBe(4);
  });

  it("Protect branches before the opcode: PP is spent by the miss tail, but power/damage/HP/RNG remain untouched", () => {
    const state = runToTerminal(
      context(
        MOVE_RETURN,
        { friendship: 255 },
        { protected: 1 },
        { dynamicBasePower: 77, battleMoveDamage: 9 },
      ),
      "BattleScript_EffectReturn",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(77);
    expect(state.rulesContext.battleMoveDamage).toBe(9);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rulesContext.battlers[1].hp).toBe(999);
    expect(state.rng.calls).toBe(0);
    expect(eventReceipts(state)).toEqual([
      { kind: "message", messageId: "STRINGID_USEDMOVE" },
      { kind: "set-battler-pp-data", battler: 0, movePosition: 0, pp: 19 },
      { kind: "message", messageId: "STRINGID_PKMNPROTECTEDITSELF" },
      { kind: "set-battler-sprite-visibility", battler: 0, invisible: false },
      { kind: "set-battler-sprite-visibility", battler: 1, invisible: false },
    ]);
  });

  it("an evasion miss branches before the opcode, consumes only accuracy RNG, spends PP, and leaves HP/power unchanged", () => {
    const state = runToTerminal(
      context(
        MOVE_FRUSTRATION,
        { friendship: 0 },
        { statStages: [6, 6, 6, 6, 6, 6, 6, 12] },
        { dynamicBasePower: 33 },
      ),
      "BattleScript_EffectFrustration",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(33);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rulesContext.battlers[1].hp).toBe(999);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual(["accuracycheck"]);
  });

  it("maximum-power Frustration faints the target through tryfaintmon and still reaches its script END", () => {
    const state = runToTerminal(
      context(MOVE_FRUSTRATION, { friendship: 0 }, { hp: 5, maxHP: 999 }),
      "BattleScript_EffectFrustration",
    );
    expect(state.rulesContext.dynamicBasePower).toBe(102);
    expect(state.rulesContext.battlers[1].hp).toBe(0);
    expect(state.rulesContext.hpDealt).toBe(5);
    expect(state.rulesContext.battlers[0].pp[0]).toBe(19);
    expect(state.rng.ledger.map((entry) => entry.reason)).toEqual([
      "accuracycheck",
      "critcalc",
      "adjustnormaldamage",
      "seteffectwithchance",
    ]);
  });
});
