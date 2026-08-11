import { describe, expect, it } from "vitest";
import {
  BATTLE_GAME_STAT_COUNT,
  BATTLE_GAME_STAT_MAX,
  BATTLE_GAME_STAT_USED_SPLASH,
  BATTLE_GAME_STAT_USED_STRUGGLE,
  consumeBattleGameStatIncrement,
  createBattleGameStatMetaState,
} from "../src/engine/battleGameStatMeta.ts";
import {
  createBattleScriptIncrementGameStatOpcodeHandlers,
} from "../src/engine/battleScriptIncrementGameStatOpcode.ts";
import type { BattleScriptBattlerId } from "../src/engine/battleScriptEvents.ts";
import {
  createBattleScriptMachine,
  stepBattleScriptMachine,
} from "../src/engine/battleScriptMachine.ts";
import {
  loadBattleScriptProgram,
  resolveBattleScriptLabel,
} from "../src/engine/battleScriptProgram.ts";
import {
  createFactoryFullTurnBattleState,
  submitFactoryFullTurnDecision,
} from "../src/engine/factoryBattleScriptFullTurnDecision.ts";

const SPLASH = 150;
const program = loadBattleScriptProgram();
const incrementInstructions = program.instructions.filter(
  ({ opcodeName }) => opcodeName === "B_SCR_OP_INCREMENTGAMESTAT",
);

function fullTurnState() {
  return createFactoryFullTurnBattleState({
    requestId: 1,
    rngSeed: 0x1234_5678,
    player: {
      species: 129,
      moveId: SPLASH,
      moves: [SPLASH, SPLASH, SPLASH, SPLASH],
      pp: [40, 40, 40, 40],
      friendship: 70,
      attack: 29,
      defense: 55,
      spAttack: 35,
      spDefense: 40,
      speed: 100,
      hp: 95,
      maxHp: 95,
      types: ["TYPE_WATER", "TYPE_WATER"],
    },
    trainer: {
      species: 202,
      moveId: SPLASH,
      moves: [SPLASH, SPLASH, SPLASH, SPLASH],
      pp: [40, 40, 40, 40],
      friendship: 70,
      attack: 33,
      defense: 48,
      spAttack: 33,
      spDefense: 48,
      speed: 10,
      hp: 127,
      maxHp: 127,
      types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"],
    },
  });
}

function stepIncrement(
  instruction: (typeof incrementInstructions)[number],
  attacker: BattleScriptBattlerId,
) {
  const rules = fullTurnState().rules.rulesContext;
  const source = Object.freeze({
    ...rules,
    selectorRoles: Object.freeze({
      attacker,
      target: attacker === 0 || attacker === 2 ? 1 as const : 0 as const,
      effectBattler:
        attacker === 0 || attacker === 2 ? 1 as const : 0 as const,
      fainted: null,
    }),
  });
  const initial = createBattleScriptMachine(
    program,
    instruction.source.label,
    source,
    0x89ab_cdef,
  );
  const before = Object.freeze({
    ...initial,
    programCounter: instruction.programCounter,
  });
  const result = stepBattleScriptMachine(
    program,
    before,
    createBattleScriptIncrementGameStatOpcodeHandlers(program),
  );
  if (result.kind !== "advanced") {
    throw new Error(`incrementgamestat stopped at ${result.kind}`);
  }
  return { source, before, after: result.state };
}

describe("source-complete B_SCR_OP_INCREMENTGAMESTAT registration", () => {
  it("pins both exact two-byte raw-u8 instructions and concrete stat resolution", () => {
    expect(incrementInstructions).toHaveLength(2);
    expect(incrementInstructions.map((instruction) => ({
      opcodeId: instruction.opcodeId,
      dispatcher: instruction.dispatcher,
      operandCount: instruction.operands.length,
      operandWidth: instruction.operands[0]?.widthBytes,
      operand: instruction.operands[0]?.expression,
      sourceLabel: instruction.source.label,
      byteLength: 1 + instruction.operands.reduce(
        (sum, operand) => sum + operand.widthBytes,
        0,
      ),
    }))).toEqual([
      {
        opcodeId: 0x60,
        dispatcher: "Cmd_incrementgamestat",
        operandCount: 1,
        operandWidth: 1,
        operand: "GAME_STAT_USED_STRUGGLE",
        sourceLabel: "BattleScript_EffectRecoil",
        byteLength: 2,
      },
      {
        opcodeId: 0x60,
        dispatcher: "Cmd_incrementgamestat",
        operandCount: 1,
        operandWidth: 1,
        operand: "GAME_STAT_USED_SPLASH",
        sourceLabel: "BattleScript_EffectSplash",
        byteLength: 2,
      },
    ]);
    expect(BATTLE_GAME_STAT_USED_SPLASH).toEqual({
      index: 26,
      symbol: "GAME_STAT_USED_SPLASH",
    });
    expect(BATTLE_GAME_STAT_USED_STRUGGLE).toEqual({
      index: 27,
      symbol: "GAME_STAT_USED_STRUGGLE",
    });
  });

  it.each([
    ["Struggle", 0, BATTLE_GAME_STAT_USED_STRUGGLE],
    ["Splash", 1, BATTLE_GAME_STAT_USED_SPLASH],
  ] as const)(
    "player-side %s emits one frozen save/meta observation and unconditionally advances",
    (_name, instructionIndex, gameStat) => {
      const { source, before, after } = stepIncrement(
        incrementInstructions[instructionIndex]!,
        0,
      );
      expect(after.programCounter).toBe(before.programCounter + 1);
      expect(after.rulesContext).toBe(source);
      expect(after.rng).toBe(before.rng);
      expect(after.scheduler).toBe(before.scheduler);
      expect(after.scheduler.pendingControllerBattlers).toEqual([]);
      expect(after.events.slice(before.events.length)).toEqual([
        expect.objectContaining({
          kind: "game-stat-increment",
          gameStat,
        }),
      ]);
      const event = after.events.at(-1)!;
      expect(Object.isFrozen(event)).toBe(true);
      expect(event.kind).toBe("game-stat-increment");
      if (event.kind !== "game-stat-increment") {
        throw new Error("expected game-stat-increment event");
      }
      expect(Object.isFrozen(event.gameStat)).toBe(true);
    },
  );

  it.each([0, 1] as const)(
    "opponent-side concrete instruction %i emits nothing but still advances",
    (instructionIndex) => {
      const { source, before, after } = stepIncrement(
        incrementInstructions[instructionIndex]!,
        1,
      );
      expect(after.programCounter).toBe(before.programCounter + 1);
      expect(after.rulesContext).toBe(source);
      expect(after.rng).toBe(before.rng);
      expect(after.scheduler).toBe(before.scheduler);
      expect(after.events).toBe(before.events);
    },
  );

  it("gates on the attacker's resolved side rather than its battler id", () => {
    const playerPartner = stepIncrement(incrementInstructions[1]!, 2);
    expect(playerPartner.after.events.at(-1)).toMatchObject({
      kind: "game-stat-increment",
      gameStat: BATTLE_GAME_STAT_USED_SPLASH,
    });

    const opponentPartner = stepIncrement(incrementInstructions[1]!, 3);
    expect(opponentPartner.after.programCounter).toBe(
      opponentPartner.before.programCounter + 1,
    );
    expect(opponentPartner.after.events).toBe(opponentPartner.before.events);
  });
});

describe("IncrementGameStat save/meta event consumer ownership", () => {
  it("owns the <52 guard and returns an inspectable no-op receipt", () => {
    const state = createBattleGameStatMetaState();
    for (const index of [BATTLE_GAME_STAT_COUNT, 0xff]) {
      const result = consumeBattleGameStatIncrement(state, {
        kind: "game-stat-increment",
        gameStat: { index },
      });
      expect(result.state).toBe(state);
      expect(result.receipt).toEqual({
        kind: "ignored-out-of-range",
        index,
        validIndexUpperBoundExclusive: 52,
      });
      expect(Object.isFrozen(result.receipt)).toBe(true);
    }
  });

  it("increments a valid counter and saturates at 0xFFFFFF without touching siblings", () => {
    const counters = Array(BATTLE_GAME_STAT_COUNT).fill(0);
    counters[26] = 41;
    counters[27] = BATTLE_GAME_STAT_MAX;
    const state = createBattleGameStatMetaState(counters);

    const incremented = consumeBattleGameStatIncrement(state, {
      kind: "game-stat-increment",
      gameStat: BATTLE_GAME_STAT_USED_SPLASH,
    });
    expect(incremented.receipt).toEqual({
      kind: "incremented",
      index: 26,
      before: 41,
      after: 42,
    });
    expect(incremented.state.counters[26]).toBe(42);
    expect(incremented.state.counters[27]).toBe(BATTLE_GAME_STAT_MAX);
    expect(state.counters[26]).toBe(41);

    const saturated = consumeBattleGameStatIncrement(state, {
      kind: "game-stat-increment",
      gameStat: BATTLE_GAME_STAT_USED_STRUGGLE,
    });
    expect(saturated.state).toBe(state);
    expect(saturated.receipt).toEqual({
      kind: "saturated",
      index: 27,
      before: BATTLE_GAME_STAT_MAX,
      after: BATTLE_GAME_STAT_MAX,
    });

    const lastValid = consumeBattleGameStatIncrement(state, {
      kind: "game-stat-increment",
      gameStat: { index: BATTLE_GAME_STAT_COUNT - 1 },
    });
    expect(lastValid.receipt).toEqual({
      kind: "incremented",
      index: 51,
      before: 0,
      after: 1,
    });
  });
});

describe("Splash through the shared Factory full-turn seam", () => {
  it("spends PP before the player save/meta event, then emits nothing-happened and reaches the next decision", () => {
    let state = fullTurnState();
    const player = submitFactoryFullTurnDecision(state, {
      requestId: 1,
      side: "player",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 0 },
    });
    state = player.state;
    const resolved = submitFactoryFullTurnDecision(state, {
      requestId: 2,
      side: "trainer",
      decision: { kind: "use-move", moveSlot: 0, targetBattler: 1 },
    });

    expect(resolved.kind).toBe("decision-required");
    expect(resolved.state.rng).toEqual({
      value: 192_004_491,
      calls: 1,
    });
    expect(resolved.state.rules.rulesContext.battlers[0]).toMatchObject({
      hp: 95,
      pp: [39, 40, 40, 40],
    });
    expect(resolved.state.rules.rulesContext.battlers[1]).toMatchObject({
      hp: 127,
      pp: [39, 40, 40, 40],
    });

    const payloads = resolved.events.map(({ payload }) => payload);
    const playerPp = payloads.findIndex((payload) =>
      payload.kind === "set-battler-pp-data" && payload.battler === 0
    );
    const meta = payloads.findIndex((payload) =>
      payload.kind === "game-stat-increment"
    );
    const nothing = payloads.findIndex((payload) =>
      payload.kind === "message"
      && payload.messageId === "STRINGID_BUTNOTHINGHAPPENED"
    );
    expect(playerPp).toBeGreaterThanOrEqual(0);
    expect(meta).toBeGreaterThan(playerPp);
    expect(nothing).toBeGreaterThan(meta);
    expect(payloads.filter((payload) =>
      payload.kind === "game-stat-increment"
    )).toEqual([
      {
        kind: "game-stat-increment",
        gameStat: BATTLE_GAME_STAT_USED_SPLASH,
      },
    ]);
    expect(resolveBattleScriptLabel(
      program,
      "BattleScript_EffectSplash",
    )).toBeDefined();
  });
});
