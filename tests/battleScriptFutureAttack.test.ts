import { describe, expect, it } from "vitest";
import {
  createBattleScriptRulesContext,
  createBattleScriptStatusRulesExecution,
  type BattleScriptRulesBattler,
  type BattleScriptRulesContextInput,
  type BattleScriptStatusRulesExternalPorts,
} from "../src/engine/battleScriptRulesContext.ts";
import {
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import { loadBattleScriptProgram } from "../src/engine/battleScriptProgram.ts";
import { runBattleEndTurnOrchestration } from "../src/engine/battleEndTurnOrchestration.ts";
import { calculateFutureAttackBaseDamage } from "../src/engine/battleScriptTrysetfutureattackOpcode.ts";
import { BATTLE_SCRIPT_STATUS2_SUBSTITUTE } from "../src/engine/battleScriptRulesContext.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const FUTURE_SIGHT = 248;
const DOOM_DESIRE = 353;
const TACKLE = 33;
const SIDE_STATUS_FUTUREATTACK = 1 << 6;
const FACTORY_TRAINER = (1 << 19) | (1 << 3);
const program = loadBattleScriptProgram();
const instruction = program.instructions.find((i) => i.opcodeName === "B_SCR_OP_TRYSETFUTUREATTACK")!;

function battler(changes: Partial<BattleScriptRulesBattler> = {}): BattleScriptRulesBattler {
  return {
    side: changes.side ?? 0,
    ability: changes.ability ?? 0,
    hp: changes.hp ?? 140,
    maxHP: changes.maxHP ?? 140,
    moves: changes.moves ?? [FUTURE_SIGHT, 0, 0, 0],
    pp: changes.pp ?? [15, 0, 0, 0],
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
    statStages: changes.statStages ?? [6, 6, 6, 6, 6, 6, 6, 6],
    types: changes.types ?? ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    species: changes.species ?? 64,
    personality: changes.personality ?? 1,
    attack: changes.attack ?? 70,
    defense: changes.defense ?? 60,
    spAttack: changes.spAttack ?? 120,
    spDefense: changes.spDefense ?? 80,
    speed: changes.speed ?? 100,
    level: changes.level ?? 50,
    friendship: changes.friendship ?? 70,
    partyIndex: changes.partyIndex ?? 0,
    protected: changes.protected,
  } as BattleScriptRulesBattler;
}

function rules(changes: Partial<BattleScriptRulesContextInput> = {}) {
  return createBattleScriptRulesContext({
    battlers: [
      battler({ side: 0 }),
      battler({ side: 1, species: 135, types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"] }),
      battler({ side: 0, hp: 0, maxHP: 1 }),
      battler({ side: 1, hp: 0, maxHP: 1 }),
    ],
    selectorRoles: { attacker: 0, target: 1, effectBattler: 1, fainted: null },
    scriptingBattler: 0,
    atkCancelerTracker: 0,
    battleOutcome: 0,
    currentMove: FUTURE_SIGHT,
    currentMovePosition: 0,
    moveResultFlags: 0,
    dmgMultiplier: 1,
    critMultiplier: 1,
    moveEffectByte: 0,
    missType: 0,
    hitMarker: 0,
    multiHitCounter: 0,
    party: {
      player: [{ species: 64, hp: 140 }, {}, {}, {}, {}, {}],
      opponent: [{ species: 135, hp: 140 }, {}, {}, {}, {}, {}],
    },
    battleTopology: {
      battlersCount: 2,
      battleTypeFlags: FACTORY_TRAINER,
      battlerPositions: [0, 1, 0xff, 0xff],
    },
    ...changes,
  });
}

function ports(): BattleScriptStatusRulesExternalPorts {
  return {
    isControllerIdle: (ctx) => ctx.state.scheduler.pendingControllerBattlers.length === 0,
    prepareMessage: (_ctx, operand) => operand.expression.startsWith("STRINGID_")
      ? { kind: "message", messageId: operand.expression, substitutions: [] }
      : null,
    prepareSelectionMessage: () => null,
    prepareSelectionMessageFromTable: () => null,
    resolveAttackerBattler: (ctx) => ctx.state.rulesContext.selectorRoles.attacker,
    resolveBattlerAtPosition: () => null,
    resolveHalfwordOperand: (_ctx, operand) => operand.expression === "B_WAIT_TIME_LONG"
      ? 64
      : operand.expression === "B_WAIT_TIME_SHORT" ? 32 : null,
    resolveByteOperand: () => null,
  };
}

function atOpcode(source = rules()) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_EffectFutureSight", source, 1, ports(),
  );
  return {
    ...execution,
    state: { ...execution.state, programCounter: instruction.programCounter },
  };
}

function endTurn(source = rules(), seed = 1) {
  const execution = createBattleScriptStatusRulesExecution(
    program, "BattleScript_HandleFaintedMon", source, seed, ports(),
  );
  return runBattleEndTurnOrchestration(program, execution.handlers, execution.state);
}

describe("B_SCR_OP_TRYSETFUTUREATTACK", () => {
  it("registers exact five-byte 0xc3 pointer encoding", () => {
    expect(instruction).toMatchObject({
      opcodeId: 0xc3,
      dispatcher: "Cmd_trysetfutureattack",
      operands: [expect.objectContaining({ widthBytes: 4, expression: "BattleScript_ButItFailed" })],
    });
    expect(1 + instruction.operands.reduce((n, operand) => n + operand.widthBytes, 0)).toBe(5);
  });

  it.each([0, 1] as const)("stores attacker %i and target-position state, while duplicate pending takes the pointer branch", (attacker) => {
    const target = attacker === 0 ? 1 : 0;
    const base = rules({
      selectorRoles: { attacker, target, effectBattler: target, fainted: null },
      currentMove: attacker === 0 ? FUTURE_SIGHT : DOOM_DESIRE,
    });
    const execution = atOpcode(base);
    const installed = stepBattleScriptMachine(program, execution.state, execution.handlers);
    expect(installed.kind).toBe("advanced");
    expect(installed.state.programCounter).toBe(instruction.programCounter + 1);
    expect(installed.state.rulesContext.futureSightCounter[target]).toBe(3);
    expect(installed.state.rulesContext.futureSightMove[target]).toBe(attacker === 0 ? FUTURE_SIGHT : DOOM_DESIRE);
    expect(installed.state.rulesContext.futureSightAttacker[target]).toBe(attacker);
    expect(installed.state.rulesContext.futureSightDmg[target]).toBeGreaterThan(2);
    expect(installed.state.rulesContext.sideStatuses[installed.state.rulesContext.battlers[target].side] & SIDE_STATUS_FUTUREATTACK).toBe(SIDE_STATUS_FUTUREATTACK);
    expect(installed.state.rng.calls).toBe(0);

    const pendingExecution = atOpcode(createBattleScriptRulesContext({
      ...base,
      futureSightCounter: target === 0 ? [2, 0, 0, 0] : [0, 2, 0, 0],
      futureSightMove: target === 0 ? [FUTURE_SIGHT, 0, 0, 0] : [0, FUTURE_SIGHT, 0, 0],
      futureSightAttacker: [1, 0, 0, 0],
      futureSightDmg: [55, 44, 0, 0],
    }));
    const pending = stepBattleScriptMachine(program, pendingExecution.state, pendingExecution.handlers);
    expect(program.instructions[pending.state.programCounter]!.source.label).toBe("BattleScript_ButItFailed");
    expect(pending.state.rulesContext.futureSightCounter[target]).toBe(2);
    expect(pending.state.rulesContext.futureSightDmg).toEqual(target === 0 ? [55, 44, 0, 0] : [55, 44, 0, 0]);
    expect(pending.state.rng.calls).toBe(0);
  });

  it("pins source-shaped setup arithmetic for Twisted Spoon Future Sight and Metal Coat Doom Desire", () => {
    const future = rules({
      battlers: [
        battler({ side: 0, item: 214, spAttack: 120 }),
        battler({ side: 1, spDefense: 80 }),
        battler({ side: 0, hp: 0 }), battler({ side: 1, hp: 0 }),
      ],
    });
    expect(calculateFutureAttackBaseDamage(future, 0, 1, FUTURE_SIGHT)).toBe(60);
    const doom = createBattleScriptRulesContext({
      ...future,
      currentMove: DOOM_DESIRE,
      battlers: [
        battler({ side: 0, item: 199, attack: 120, types: ["TYPE_STEEL", "TYPE_STEEL"] }),
        battler({ side: 1, defense: 80 }),
        battler({ side: 0, hp: 0 }), battler({ side: 1, hp: 0 }),
      ],
    });
    expect(calculateFutureAttackBaseDamage(doom, 0, 1, DOOM_DESIRE)).toBe(89);
  });
});

describe("Future Sight through the generic full-turn seam", () => {
  it("matches the merged OFF Kadabra proof: ordinary PP, duplicate failure, delayed 140→103, and side-bit clear", () => {
    let state: ReturnType<typeof createFactoryFullTurnBattleState> = createFactoryFullTurnBattleState({
      requestId: 1,
      // The stock mechanicLab trainer AI consumes unrelated draws. This
      // injected-decision seam does not; seed 8 makes its delayed accuracy
      // and random multiplier source-equivalent (34% hit roll, 85% damage).
      rngSeed: 8,
      player: {
        species: 64,
        moveId: FUTURE_SIGHT,
        moves: [93, 272, FUTURE_SIGHT, 50],
        pp: [25, 10, 15, 20],
        ability: 28,
        item: 214,
        friendship: 70,
        attack: 55,
        defense: 90,
        spAttack: 126,
        spDefense: 90,
        speed: 125,
        hp: 147,
        types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
      },
      trainer: {
        species: 135,
        moveId: TACKLE,
        moves: [TACKLE, TACKLE, TACKLE, TACKLE],
        pp: [35, 35, 35, 35],
        ability: 10,
        attack: 85,
        defense: 80,
        spAttack: 130,
        spDefense: 115,
        speed: 182,
        hp: 140,
        types: ["TYPE_ELECTRIC", "TYPE_ELECTRIC"],
      },
    });

    const targetHp: number[] = [];
    const futurePp: number[] = [];
    for (let turn = 0; turn < 3; turn += 1) {
      const player = submitFactoryFullTurnDecision(state, {
        requestId: turn * 2 + 1,
        side: "player",
        decision: { kind: "use-move", moveSlot: 2, targetBattler: 1 },
      });
      if (player.kind !== "decision-required") throw new Error(`turn ${turn + 1} did not request trainer`);
      const trainer = submitFactoryFullTurnDecision(player.state, {
        requestId: turn * 2 + 2,
        side: "trainer",
        decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
      });
      if (trainer.kind !== "decision-required") throw new Error(`turn ${turn + 1} result ${JSON.stringify(trainer)}`);
      state = trainer.state;
      targetHp.push(state.rules.rulesContext.battlers[1].hp);
      futurePp.push(state.rules.rulesContext.battlers[0].pp[2]);
    }

    expect(futurePp).toEqual([14, 13, 12]);
    expect(targetHp).toEqual([140, 140, 103]);
    expect(state.rules.rulesContext.futureSightCounter[1]).toBe(0);
    expect(state.rules.rulesContext.sideStatuses[1] & SIDE_STATUS_FUTUREATTACK).toBe(0);
    expect(state.rng.calls).toBe(14);
  });
});

describe("positional delayed Future Sight resolution", () => {
  it("decrements 3→2→1→0 after faint actions, restores attacker/move, clears bit, and draws only accuracy+damage", () => {
    let rc = rules({
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      futureSightCounter: [0, 3, 0, 0],
      futureSightMove: [0, FUTURE_SIGHT, 0, 0],
      futureSightAttacker: [0, 0, 0, 0],
      futureSightDmg: [0, 40, 0, 0],
    });
    const first = endTurn(rc);
    expect(first.kind).toBe("next-turn");
    expect(first.state.rulesContext.futureSightCounter[1]).toBe(2);
    expect(first.state.rulesContext.battlers[1].hp).toBe(140);
    expect(first.state.rng.calls).toBe(0);
    rc = first.state.rulesContext;
    const second = endTurn(rc);
    expect(second.state.rulesContext.futureSightCounter[1]).toBe(1);
    expect(second.state.rng.calls).toBe(0);
    const third = endTurn(second.state.rulesContext);
    if (third.kind === "non-terminal-barrier") throw new Error(`barrier ${third.instruction.opcodeName} ${third.instruction.source.label}:${third.instruction.source.statementLine}`);
    expect(third.kind).toBe("next-turn");
    expect(third.state.rulesContext.futureSightCounter[1]).toBe(0);
    expect(third.state.rulesContext.sideStatuses[1] & SIDE_STATUS_FUTUREATTACK).toBe(0);
    expect(third.state.rulesContext.selectorRoles).toMatchObject({ attacker: 0, target: 1 });
    expect(third.state.rulesContext.currentMove).toBe(FUTURE_SIGHT);
    expect(third.state.rulesContext.battlers[1].hp).toBeLessThan(140);
    expect(third.state.rng.calls).toBe(2);
  });

  it("targets a switched replacement in the same slot, bypasses Protect, and lets Substitute absorb", () => {
    const switched = rules({
      battlers: [
        battler({ side: 0 }),
        battler({
          side: 1, species: 242, partyIndex: 2, protected: 1,
          status2: BATTLE_SCRIPT_STATUS2_SUBSTITUTE, substituteHP: 50,
        }),
        battler({ side: 0, hp: 0 }), battler({ side: 1, hp: 0 }),
      ],
      party: {
        player: [{ species: 64, hp: 140 }, {}, {}, {}, {}, {}],
        opponent: [{ species: 135, hp: 140 }, {}, { species: 242, hp: 140 }, {}, {}, {}],
      },
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      futureSightCounter: [0, 1, 0, 0],
      futureSightMove: [0, FUTURE_SIGHT, 0, 0],
      futureSightAttacker: [0, 0, 0, 0],
      futureSightDmg: [0, 40, 0, 0],
    });
    const result = endTurn(switched);
    if (result.kind === "non-terminal-barrier") throw new Error(`barrier ${result.instruction.opcodeName} ${result.instruction.source.label}:${result.instruction.source.statementLine}`);
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.battlers[1].species).toBe(242);
    expect(result.state.rulesContext.battlers[1].hp).toBe(140);
    expect(result.state.rulesContext.battlers[1].substituteHP).toBeLessThan(50);
    expect(result.state.rng.calls).toBe(2);
  });

  it("routes Doom Desire through the same positional timer with its own accuracy and hit animation", () => {
    const result = endTurn(rules({
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      futureSightCounter: [0, 1, 0, 0],
      futureSightMove: [0, DOOM_DESIRE, 0, 0],
      futureSightAttacker: [0, 0, 0, 0],
      futureSightDmg: [0, 50, 0, 0],
    }));
    expect(result.kind).toBe("next-turn");
    expect(result.state.rulesContext.currentMove).toBe(DOOM_DESIRE);
    expect(result.state.rulesContext.battlers[1].hp).toBeLessThan(140);
    expect(result.state.rng.calls).toBe(2);
    expect(result.state.events).toContainEqual(expect.objectContaining({
      kind: "animation",
      animationId: "DOOM_DESIRE_HIT",
      battler: 0,
    }));
  });

  it("skips absent positions without decrement; a present fainted slot decrements to zero without hit or side-bit clear", () => {
    const absent = endTurn(rules({
      absentBattlerFlags: 0b0010,
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      futureSightCounter: [0, 1, 0, 0],
    }));
    expect(absent.state.rulesContext.futureSightCounter[1]).toBe(1);
    expect(absent.state.rng.calls).toBe(0);

    const fainted = endTurn(rules({
      battlers: [
        battler({ side: 0 }),
        battler({ side: 1, hp: 0 }),
        battler({ side: 0, hp: 0 }), battler({ side: 1, hp: 0 }),
      ],
      party: {
        player: [{ species: 64, hp: 140 }, {}, {}, {}, {}, {}],
        opponent: [{ species: 135, hp: 0 }, {}, {}, {}, {}, {}],
      },
      battleOutcome: 1,
      sideStatuses: [0, SIDE_STATUS_FUTUREATTACK],
      futureSightCounter: [0, 1, 0, 0],
    }));
    expect(fainted.state.rulesContext.futureSightCounter[1]).toBe(0);
    expect(fainted.state.rulesContext.sideStatuses[1] & SIDE_STATUS_FUTUREATTACK).toBe(SIDE_STATUS_FUTUREATTACK);
    expect(fainted.state.rng.calls).toBe(0);
  });
});
