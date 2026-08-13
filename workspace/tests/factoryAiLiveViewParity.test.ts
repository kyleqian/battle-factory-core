import { describe, expect, it } from "vitest";
import {
  encodeFactoryAiLiveViewInput,
  factoryAiLiveViewEngine,
  invokeFactoryAiLiveViewPacket,
  tsFactoryAiLiveViewEngine,
  wasmFactoryAiLiveViewEngine,
  type FactoryAiLiveViewEngine,
} from "../core-rs/adapter/factoryAiLiveViewEngine.ts";
import {
  createFactoryAiViewFromLiveRules,
  type FactoryAiBattleHistory,
  type FactoryAiChallengePolicy,
} from "../src/engine/factoryAiLiveDriver.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

const TYPES = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY", "TYPE_FIRE",
  "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC", "TYPE_ICE",
  "TYPE_DRAGON", "TYPE_DARK",
] as const;

type Patch = Readonly<Record<string, unknown>>;

function battler(patch: Patch = {}): BattleScriptRulesContext["battlers"][number] {
  return {
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    attack: 100,
    defense: 101,
    spAttack: 102,
    spDefense: 103,
    speed: 104,
    level: 50,
    statStages: [6, 6, 6, 6, 6, 6, 6, 6],
    isFirstTurn: 0,
    hp: 100,
    maxHP: 120,
    ability: 0,
    status1: 0,
    status2: 0,
    status3: 0,
    protectUses: 0,
    tauntTimer: 0,
    species: 1,
    moves: [33, 0, 0, 0],
    partyIndex: 0,
    ...patch,
  } as unknown as BattleScriptRulesContext["battlers"][number];
}

function rules(input: Readonly<{
  target?: Patch;
  attacker?: Patch;
  other?: readonly [Patch, Patch];
  weather?: number;
  sideStatuses?: readonly [number, number];
  lastMoves?: readonly [number, number, number, number];
}> = {}): BattleScriptRulesContext {
  return {
    battlers: [
      battler({ partyIndex: 0, ...(input.target ?? {}) }),
      battler({ partyIndex: 1, ...(input.attacker ?? {}) }),
      battler({ partyIndex: 2, ...(input.other?.[0] ?? {}) }),
      battler({ partyIndex: 3, ...(input.other?.[1] ?? {}) }),
    ],
    weather: input.weather ?? 0,
    sideStatuses: input.sideStatuses ?? [0, 0],
    moveHistory: { lastMoves: input.lastMoves ?? [0, 0, 0, 0] },
  } as unknown as BattleScriptRulesContext;
}

function history(input: Readonly<Partial<FactoryAiBattleHistory>> = {}): FactoryAiBattleHistory {
  return {
    usedMoves: input.usedMoves ?? [[], [], [], []],
    knownAbilities: input.knownAbilities ?? [null, null, null, null],
    knownItemEffects: input.knownItemEffects ?? [0, 0, 0, 0],
    partyIndexes: input.partyIndexes ?? [0, 1, 2, 3],
  } as FactoryAiBattleHistory;
}

function challenge(input: Partial<FactoryAiChallengePolicy> = {}): FactoryAiChallengePolicy {
  return {
    factoryWinStreak: input.factoryWinStreak ?? 0,
    trainerOpponentId: input.trainerOpponentId ?? 0,
    ...(input.battleTurnCount === undefined ? {} : { battleTurnCount: input.battleTurnCount }),
  };
}

function input(
  rulesContext: BattleScriptRulesContext,
  inputHistory: FactoryAiBattleHistory = history(),
  inputChallenge: FactoryAiChallengePolicy = challenge(),
): Parameters<typeof createFactoryAiViewFromLiveRules>[0] {
  return { rulesContext, history: inputHistory, challenge: inputChallenge };
}

function capture(action: () => unknown): unknown {
  try {
    return action();
  } catch (error) {
    return error;
  }
}

function expectDeepSame(actual: unknown, expected: unknown, path = "root"): void {
  if (typeof actual === "number" || typeof expected === "number") {
    expect(typeof actual, path).toBe("number");
    expect(typeof expected, path).toBe("number");
    expect(Object.is(actual, expected), path).toBe(true);
    return;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect(Array.isArray(expected), path).toBe(true);
    expect((actual as unknown[]).length, path).toBe((expected as unknown[]).length);
    (actual as unknown[]).forEach((value, index) => {
      expectDeepSame(value, (expected as unknown[])[index], `${path}[${index}]`);
    });
    return;
  }
  if (actual !== null && typeof actual === "object" || expected !== null && typeof expected === "object") {
    expect(actual !== null && typeof actual === "object", path).toBe(true);
    expect(expected !== null && typeof expected === "object", path).toBe(true);
    const actualRecord = actual as Record<string, unknown>;
    const expectedRecord = expected as Record<string, unknown>;
    expect(Object.keys(actualRecord).sort(), path).toEqual(Object.keys(expectedRecord).sort());
    for (const key of Object.keys(expectedRecord)) {
      expectDeepSame(actualRecord[key], expectedRecord[key], `${path}.${key}`);
    }
    return;
  }
  expect(actual, path).toBe(expected);
}

async function engines(): Promise<readonly FactoryAiLiveViewEngine[]> {
  return [tsFactoryAiLiveViewEngine(), await wasmFactoryAiLiveViewEngine()];
}

function statusAndMessage(packet: Uint8Array): { status: number; message: string } {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  const totalLength = view.getUint32(0, true);
  expect(totalLength).toBe(packet.length);
  const status = view.getUint8(4);
  const messageLength = view.getUint32(5, true);
  const message = new TextDecoder().decode(packet.subarray(9, 9 + messageLength));
  return { status, message };
}

describe("Factory AI live-view constructor ABI-v1 parity", () => {
  it("deep-compares complete source-shaped views across semantic categories", async () => {
    const adapters = await engines();
    const cases = [
      input(rules()),
      input(
        rules({
          target: {
            types: ["TYPE_GROUND", "TYPE_ROCK"], species: 105, attack: 130, defense: 131,
            spAttack: 55, spDefense: 70, speed: 65, level: 49, isFirstTurn: 2,
            hp: 1, maxHP: 135, status1: 0x87, status2: (0x0000_0007 | (1 << 28)) | (1 << 26),
            status3: (1 << 2) | (1 << 5) | (1 << 11), tauntTimer: 3,
          },
          attacker: {
            types: ["TYPE_PSYCHIC", "TYPE_PSYCHIC"], species: 65, ability: 70,
            attack: 55, defense: 65, spAttack: 135, spDefense: 105, speed: 140,
            level: 50, isFirstTurn: 2, hp: 135, maxHP: 135, protectUses: 2,
            status1: 0x87, status2: (0x000f_0000 | (1 << 20) | (1 << 24)),
            status3: (1 << 2) | (1 << 10) | (1 << 11), moves: [57, 89, 33, 0],
            statStages: [99, 11, 22, 33, 44, 55, 66, 77],
          },
          weather: 0x60,
          sideStatuses: [(1 << 4) | (1 << 5) | (1 << 6), (1 << 0) | (1 << 1) | (1 << 5) | (1 << 6)],
          lastMoves: [89, 0, 0, 0],
        }),
        history({
          usedMoves: [[89, 57], [], [], []],
          knownAbilities: ["ABILITY_λ_CUSTOM", null, null, null],
          knownItemEffects: [44, 0, 0, 0],
        }),
        challenge({ factoryWinStreak: 12, trainerOpponentId: 41, battleTurnCount: 7 }),
      ),
      input(
        rules({
          weather: 0x07,
          target: { ability: 69, statStages: [-128, -127, -64, -1, 0, 1, 63, 127] },
          attacker: { ability: 77, statStages: [127, 63, 1, 0, -1, -64, -127, -128] },
        }),
        history({
          usedMoves: [[Number.NaN, -0, 1.5], [-999, Number.POSITIVE_INFINITY], [42], [0]],
          knownAbilities: ["history\u0000λ🧪", "ABILITY_ODD", null, "ABILITY_FINAL"],
          knownItemEffects: [Number.NaN, -0, -11.5, Number.POSITIVE_INFINITY],
          partyIndexes: [Number.NaN, -0, 2.5, Number.POSITIVE_INFINITY],
        }),
        challenge({
          factoryWinStreak: Number.NaN,
          trainerOpponentId: Number.POSITIVE_INFINITY,
          battleTurnCount: -0,
        }),
      ),
    ] as const;

    for (const testInput of cases) {
      const expected = capture(() => createFactoryAiViewFromLiveRules(testInput));
      expect(expected).not.toBeInstanceOf(Error);
      for (const adapter of adapters) {
        const actual = capture(() => adapter.createFactoryAiViewFromLiveRules(testInput));
        expect(actual).not.toBeInstanceOf(Error);
        expectDeepSame(actual, expected);
      }
    }
    expect(cases).toHaveLength(3);
  });

  it("covers weather precedence, numeric edges, and every attacker/target optional combination", async () => {
    const adapters = await engines();
    let comparisons = 0;
    const weatherValues = [0, 0x60, 0x07, 0x18, 0x80, 0x60 | 0x07 | 0x18 | 0x80, 4_294_967_296 + 0x80, Number.NaN];
    for (let index = 0; index < weatherValues.length; index += 1) {
      const status1 = index & 1 ? 0x87 : 0;
      const status2 = index & 2 ? 0x3f0f_0000 : 0;
      const status3 = index & 4 ? 0x0000_0c24 : 0;
      const sideStatuses: readonly [number, number] = [
        index & 1 ? (1 << 5) | (1 << 4) | (1 << 6) : 0,
        index & 2 ? (1 << 0) | (1 << 1) | (1 << 5) | (1 << 6) : 0,
      ];
      const testInput = input(
        rules({
          weather: weatherValues[index]!,
          sideStatuses,
          target: { status1, status2, status3, tauntTimer: index & 4 ? 1 : 0, ability: 69 },
          attacker: { status1, status2, status3, protectUses: index & 1 ? -0 : 0, ability: 70 },
        }),
        history({ usedMoves: index & 1 ? [[Number.NaN], [], [], []] : [[], [], [], []] }),
        challenge({
          factoryWinStreak: index & 1 ? -0 : Number.POSITIVE_INFINITY,
          trainerOpponentId: index & 2 ? Number.NaN : 1.5,
          ...(index & 4 ? { battleTurnCount: Number.NaN } : {}),
        }),
      );
      const expected = createFactoryAiViewFromLiveRules(testInput);
      for (const adapter of adapters) {
        expectDeepSame(adapter.createFactoryAiViewFromLiveRules(testInput), expected);
        comparisons += 1;
      }
    }
    expect(comparisons).toBe(weatherValues.length * 2);
  });

  it("preserves attacker-before-target unknown-ability ordering and exact errors", async () => {
    const adapters = await engines();
    const cases = [
      { attacker: 78, target: 69 },
      { attacker: 1.5, target: 78 },
      { attacker: Number.NaN, target: 78 },
      { attacker: 70, target: 78 },
      { attacker: 70, target: Number.POSITIVE_INFINITY },
    ] as const;
    for (const values of cases) {
      const testInput = input(rules({ attacker: { ability: values.attacker }, target: { ability: values.target } }));
      const expected = capture(() => createFactoryAiViewFromLiveRules(testInput));
      expect(expected).toBeInstanceOf(Error);
      for (const adapter of adapters) {
        expect(() => adapter.createFactoryAiViewFromLiveRules(testInput)).toThrow((expected as Error).message);
      }
      const packet = await invokeFactoryAiLiveViewPacket(encodeFactoryAiLiveViewInput(testInput));
      expect(statusAndMessage(packet)).toEqual({ status: 1, message: (expected as Error).message });
    }
    expect(cases).toHaveLength(5);
  });

  it("selects the requested adapter and rejects malformed packets without trapping", async () => {
    expect((await factoryAiLiveViewEngine()).id).toBe(
      process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts",
    );
    const valid = encodeFactoryAiLiveViewInput(input(rules()));
    const corruptWidth = valid.slice();
    new DataView(corruptWidth.buffer).setUint32(0, 0xffff_ffff, true);
    const corruptOptional = valid.slice();
    corruptOptional[corruptOptional.length - 1] = 9;
    const malformed = [
      new Uint8Array(),
      valid.slice(0, valid.length - 1),
      Uint8Array.from([...valid, 0]),
      corruptWidth,
      corruptOptional,
    ];
    for (const packet of malformed) {
      const output = await invokeFactoryAiLiveViewPacket(packet);
      expect(statusAndMessage(output)).toEqual({
        status: 2,
        message: "factory-wasm factoryAiLiveViewEngine: malformed input",
      });
    }
    expect(malformed).toHaveLength(5);
  });

  it("retains the full source view shape, including optional absence", async () => {
    const expected = createFactoryAiViewFromLiveRules(input(rules()));
    expect(Object.keys(expected.attacker).sort()).toEqual([
      "ability", "attack", "battleTurnCount", "defense", "hp", "isFirstTurn", "isRooted",
      "level", "lightScreenUp", "maxHp", "reflectUp", "spAttack", "spDefense", "speed",
      "statStages", "types",
    ].sort());
    expect(Object.keys(expected.target).sort()).toEqual([
      "ability", "attack", "defense", "hp", "isCursed", "isFirstTurn", "isLeechSeeded",
      "isToxicPoisoned", "knownAbility", "knownItemEffect", "lastUsedMoveId", "level", "maxHp", "spAttack",
      "spDefense", "species", "speed", "statStages", "types",
    ].sort());
    expect(TYPES).toHaveLength(18);
  });
});
