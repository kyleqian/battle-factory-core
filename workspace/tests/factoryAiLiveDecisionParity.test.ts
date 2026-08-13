import { describe, expect, it } from "vitest";
import {
  createBattleCommandRequest,
  type BattleCommandRequest,
} from "../src/engine/battleDecisionBoundary.ts";
import { encodeFactoryAiLiveViewInput } from "../core-rs/adapter/factoryAiLiveViewEngine.ts";
import {
  encodeFactoryAiLiveDecisionInput,
  factoryAiLiveDecisionEngine,
  invokeFactoryAiLiveDecisionPacket,
  tsFactoryAiLiveDecisionEngine,
  wasmFactoryAiLiveDecisionEngine,
  type FactoryAiLiveDecisionEngine,
  type FactoryAiLiveDecisionInput,
} from "../core-rs/adapter/factoryAiLiveDecisionEngine.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";
import type {
  FactoryAiBattleHistory,
  FactoryAiChallengePolicy,
} from "../src/engine/factoryAiLiveDriver.ts";

type Patch = Readonly<Record<string, unknown>>;

const WEATHER_RAIN_BITS = (1 << 0) | (1 << 1) | (1 << 2);
const WEATHER_SUN_BITS = (1 << 5) | (1 << 6);
const WEATHER_HAIL_BITS = 1 << 7;
const SIDE_REFLECT_BITS = 1 << 0;
const SIDE_LIGHTSCREEN_BITS = 1 << 1;
const SIDE_SPIKES_BITS = 1 << 4;
const SIDE_SAFEGUARD_BITS = 1 << 5;
const SIDE_FUTUREATTACK_BITS = 1 << 6;
const STATE1_SLEEP_BITS = 0x0000_0007;
const STATE1_TOXIC_POISON_BITS = 1 << 7;
const STATE1_REFRESH_CURE_BITS = (1 << 3) | (1 << 4) | (1 << 6) | (1 << 7);
const STATE2_CONFUSION_BITS = 0x0000_0007;
const STATE2_INFATUATION_BITS = 0x000f_0000;
const STATE2_FOCUS_ENERGY_BITS = 1 << 20;
const STATE2_SUBSTITUTE_BITS = 1 << 24;
const STATE2_ESCAPE_PREVENTION_BITS = 1 << 26;
const STATE2_NIGHTMARE_BITS = 1 << 27;
const STATE2_CURSED_BITS = 1 << 28;
const STATE2_FORESIGHT_BITS = 1 << 29;
const STATE2_TORMENT_BITS = 0x8000_0000;
const STATE3_LEECHSEED_BITS = 1 << 2;
const STATE3_PERISH_SONG_BITS = 1 << 5;
const STATE3_ROOTED_BITS = 1 << 10;
const STATE3_YAWN_BITS = (1 << 11) | (1 << 12);
const MOVE_SOLAR_BEAM = 76;
const MOVE_PROTECT = 182;

function battler(patch: Patch = {}): BattleScriptRulesContext["battlers"][number] {
  const base = {
    types: ["TYPE_NORMAL", "TYPE_NORMAL"], attack: 100, defense: 100,
    spAttack: 100, spDefense: 100, speed: 100, level: 50,
    statStages: [0, 6, 6, 6, 6, 6, 6, 6], isFirstTurn: 2, hp: 100, maxHP: 100,
    ability: 0, status1: 0, status2: 0, status3: 0, protectUses: 0, tauntTimer: 0,
    species: 213, moves: [150, 150, 150, 150], partyIndex: 0,
  };
  const value = { ...base, ...patch };
  return {
    ...value,
    types: [...(patch.types as readonly string[] | undefined ?? base.types)],
    statStages: [...(patch.statStages as readonly number[] | undefined ?? base.statStages)],
    moves: [...(patch.moves as readonly number[] | undefined ?? base.moves)],
  } as unknown as BattleScriptRulesContext["battlers"][number];
}

function history(overrides: Patch = {}): FactoryAiBattleHistory {
  const base = {
    usedMoves: [[], [], [], []], knownAbilities: [null, null, null, null],
    knownItemEffects: [0, 0, 0, 0], partyIndexes: [0, 1, 2, 3],
  };
  const value = { ...base, ...overrides } as unknown as typeof base;
  return {
    usedMoves: value.usedMoves.map((row) => [...row]),
    knownAbilities: [...value.knownAbilities],
    knownItemEffects: [...value.knownItemEffects],
    partyIndexes: [...value.partyIndexes],
  } as unknown as FactoryAiBattleHistory;
}

function legalDecisions(mask: number): BattleCommandRequest["legalDecisions"] {
  return [0, 1, 2, 3].filter((slot) => (mask & (1 << slot)) !== 0).map((moveSlot) => ({
    kind: "use-move" as const,
    moveSlot: moveSlot as 0 | 1 | 2 | 3,
    targetBattler: moveSlot === 2 ? 1 as const : 0 as const,
  }));
}

function request(mask: number): BattleCommandRequest {
  return createBattleCommandRequest({
    kind: "command", requestId: 91, side: "trainer", battler: 1,
    legalDecisions: legalDecisions(mask),
  });
}

type CaseSpec = Readonly<{
  label: string; category: string; streak: number; weather?: number;
  sideStatuses?: readonly [number, number]; lastMoves?: readonly [number, number, number, number];
  target?: Patch; attacker?: Patch; history?: Patch; legalMask: number;
  seed: number; calls?: number; turnMode?: 0 | 1 | 2; battleTurnCount?: number;
}>;

function sourceCase(spec: CaseSpec): FactoryAiLiveDecisionInput & Readonly<{ label: string; category: string }> {
  const rulesContext = {
    battlers: [
      battler({ partyIndex: 0, ...(spec.target ?? {}) }),
      battler({ partyIndex: 1, ...(spec.attacker ?? {}) }),
      battler({ partyIndex: 2 }), battler({ partyIndex: 3 }),
    ],
    weather: spec.weather ?? 0,
    sideStatuses: spec.sideStatuses ?? [0, 0],
    moveHistory: { lastMoves: spec.lastMoves ?? [0, 0, 0, 0] },
  } as unknown as BattleScriptRulesContext;
  const challenge: FactoryAiChallengePolicy = {
    factoryWinStreak: spec.streak, trainerOpponentId: 222,
    ...(spec.battleTurnCount === undefined ? {} : { battleTurnCount: spec.battleTurnCount }),
  };
  const turnStartRandomNumber = spec.turnMode === 1
    ? { owner: "decision" as const }
    : spec.turnMode === 2
    ? { owner: "battle-turn-boundary" as const, value: 0x4321 }
    : undefined;
  return {
    label: spec.label, category: spec.category, rulesContext, history: history(spec.history),
    challenge, request: request(spec.legalMask), rng: { value: spec.seed, calls: spec.calls ?? 0 },
    ...(turnStartRandomNumber === undefined ? {} : { turnStartRandomNumber }),
  } as FactoryAiLiveDecisionInput & Readonly<{ label: string; category: string }>;
}

const CASES = [
  sourceCase({ label: "mask_zero_baseline", category: "mask-0", streak: 0, attacker: { moves: [33, 0, 0, 0] }, legalMask: 1, seed: 0x1234_5678 }),
  sourceCase({ label: "mask_zero_sparse_history", category: "mask-0-history", streak: 6, attacker: { moves: [57, 157, 34, 85], types: ["TYPE_WATER", "TYPE_ICE"] }, target: { types: ["TYPE_GROUND", "TYPE_ROCK"], ability: 69 }, history: { usedMoves: [[105, 0], [57], [], []], knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null], knownItemEffects: [44, 0, 0, 0] }, legalMask: 5, seed: 0x0bad_cafe, calls: 9 }),
  sourceCase({ label: "mask_one_type_ability_edges", category: "mask-1-type-ability", streak: 14, attacker: { moves: [85, 150, 150, 150], types: ["TYPE_FIRE", "TYPE_FLYING"], ability: 70 }, target: { species: 105, types: ["TYPE_GROUND", "TYPE_GROUND"], ability: 69 }, history: { knownAbilities: ["ABILITY_ROCK_HEAD", null, null, null], usedMoves: [[182], [], [], []] }, legalMask: 1, seed: 1, calls: 7 }),
  sourceCase({ label: "mask_one_status_weather_screens", category: "mask-1-status-weather", streak: 20, weather: WEATHER_RAIN_BITS | WEATHER_SUN_BITS | WEATHER_HAIL_BITS, sideStatuses: [SIDE_SAFEGUARD_BITS | SIDE_SPIKES_BITS, SIDE_LIGHTSCREEN_BITS | SIDE_REFLECT_BITS], attacker: { moves: [92, 150, 150, 150], status1: STATE1_REFRESH_CURE_BITS, status2: STATE2_FOCUS_ENERGY_BITS | STATE2_SUBSTITUTE_BITS, status3: STATE3_ROOTED_BITS, protectUses: 3 }, target: { species: 213, ability: 5, status1: STATE1_TOXIC_POISON_BITS, status2: STATE2_CONFUSION_BITS | STATE2_ESCAPE_PREVENTION_BITS | STATE2_TORMENT_BITS, status3: STATE3_LEECHSEED_BITS | STATE3_PERISH_SONG_BITS, tauntTimer: 2 }, legalMask: 1, seed: 0x1020_3040, calls: 3 }),
  sourceCase({ label: "mask_seven_sleep_history_short", category: "mask-7-history", streak: 28, weather: WEATHER_SUN_BITS, attacker: { moves: [47, 57, 157, 34], ability: 70 }, target: { ability: 5, status1: STATE1_SLEEP_BITS, status2: STATE2_NIGHTMARE_BITS | STATE2_FORESIGHT_BITS | STATE2_CURSED_BITS, status3: STATE3_YAWN_BITS }, history: { usedMoves: [[138], [], [], []], knownAbilities: [null, null, null, null] }, legalMask: 15, seed: 1, turnMode: 2, battleTurnCount: 3 }),
  sourceCase({ label: "mask_seven_sleep_history_four", category: "mask-7-history", streak: 28, weather: WEATHER_HAIL_BITS, attacker: { moves: [47, 57, 157, 34], statStages: [99, 0, 1, 2, 3, 4, 5, 12], hp: 37, maxHP: 155 }, target: { types: ["TYPE_WATER", "TYPE_PSYCHIC"], ability: 37, status2: STATE2_INFATUATION_BITS, status3: STATE3_LEECHSEED_BITS }, history: { usedMoves: [[150, 150, 150, 138], [], [], []], knownAbilities: ["ABILITY_HUGE_POWER", null, null, null] }, legalMask: 9, seed: 0xabcd_ef01, calls: 4, turnMode: 1, battleTurnCount: 19 }),
  sourceCase({ label: "mask_seven_sleep_history_extended", category: "mask-7-history", streak: 28, weather: WEATHER_HAIL_BITS, attacker: { moves: [47, 57, 157, 34], statStages: [99, 0, 1, 2, 3, 4, 5, 12], hp: 37, maxHP: 155 }, target: { types: ["TYPE_WATER", "TYPE_PSYCHIC"], ability: 37, status2: STATE2_INFATUATION_BITS, status3: STATE3_LEECHSEED_BITS }, history: { usedMoves: [[150, 150, 150, 150, 138], [], [], []], knownAbilities: ["ABILITY_HUGE_POWER", null, null, null] }, legalMask: 9, seed: 0xabcd_ef01, calls: 4, turnMode: 1, battleTurnCount: 19 }),
  sourceCase({ label: "mask_seven_charge_up_extended_protect_positional_gate", category: "mask-7-positional-history", streak: 28, attacker: { moves: [MOVE_SOLAR_BEAM, 57, 157, 34], types: ["TYPE_GRASS", "TYPE_GRASS"] }, target: { types: ["TYPE_NORMAL", "TYPE_NORMAL"] }, history: { usedMoves: [[33, 33, 33, 33, MOVE_PROTECT], [], [], []] }, legalMask: 1, seed: 0x2468_ace0, calls: 17 }),
  sourceCase({ label: "mask_seven_protect_optional_flags", category: "mask-7-optional", streak: 28, sideStatuses: [SIDE_REFLECT_BITS | SIDE_FUTUREATTACK_BITS, SIDE_LIGHTSCREEN_BITS | SIDE_SAFEGUARD_BITS | SIDE_FUTUREATTACK_BITS], attacker: { moves: [182, 57, 157, 34], status2: STATE2_INFATUATION_BITS | STATE2_FOCUS_ENERGY_BITS | STATE2_SUBSTITUTE_BITS, status3: STATE3_LEECHSEED_BITS | STATE3_YAWN_BITS | STATE3_ROOTED_BITS, protectUses: 2 }, target: { status1: STATE1_TOXIC_POISON_BITS, status2: STATE2_CURSED_BITS | STATE2_TORMENT_BITS, status3: STATE3_LEECHSEED_BITS | STATE3_PERISH_SONG_BITS, tauntTimer: 4 }, legalMask: 1, seed: 0x3141_5926, calls: 12 }),
  sourceCase({ label: "mask_seven_stage_type_edges", category: "mask-7-stages", streak: 28, attacker: { moves: [104, 150, 150, 150], types: ["TYPE_GROUND", "TYPE_ROCK"], statStages: [0, 0, 12, 0, 12, 0, 12, 9], hp: 50, maxHP: 100 }, target: { species: 12, types: ["TYPE_GRASS", "TYPE_FLYING"], statStages: [0, 12, 0, 12, 0, 12, 0, 0], hp: 999, maxHP: 999, ability: 71 }, legalMask: 1, seed: 99, calls: 23 }),
  sourceCase({ label: "mask_seven_boundary_turn_owner", category: "mask-7-turn-ownership", streak: 28, attacker: { moves: [57, 157, 34, 85] }, target: { ability: 37, types: ["TYPE_WATER", "TYPE_WATER"] }, legalMask: 15, seed: 0x7654_3210, calls: 41, turnMode: 2, battleTurnCount: 0 }),
  sourceCase({ label: "mask_seven_decision_turn_owner", category: "mask-7-turn-ownership", streak: 28, attacker: { moves: [57, 157, 34, 85] }, target: { ability: 37, types: ["TYPE_WATER", "TYPE_WATER"] }, legalMask: 15, seed: 0x7654_3210, calls: 41, turnMode: 1 }),
] as const;

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
    (actual as unknown[]).forEach((value, index) => expectDeepSame(value, (expected as unknown[])[index], `${path}[${index}]`));
    return;
  }
  if ((actual !== null && typeof actual === "object") || (expected !== null && typeof expected === "object")) {
    expect(actual !== null && typeof actual === "object", path).toBe(true);
    expect(expected !== null && typeof expected === "object", path).toBe(true);
    const actualRecord = actual as Record<string, unknown>;
    const expectedRecord = expected as Record<string, unknown>;
    expect(Object.keys(actualRecord).sort(), path).toEqual(Object.keys(expectedRecord).sort());
    for (const key of Object.keys(expectedRecord)) expectDeepSame(actualRecord[key], expectedRecord[key], `${path}.${key}`);
    return;
  }
  expect(actual, path).toBe(expected);
}

function outputStatus(packet: Uint8Array): { status: number; message: string } {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
  const totalLength = view.getUint32(0, true);
  expect(totalLength).toBe(packet.length);
  const status = view.getUint8(4);
  const messageLength = view.getUint32(5, true);
  return { status, message: new TextDecoder().decode(packet.subarray(9, 9 + messageLength)) };
}

async function engines(): Promise<readonly FactoryAiLiveDecisionEngine[]> {
  return [tsFactoryAiLiveDecisionEngine(), await wasmFactoryAiLiveDecisionEngine()];
}

describe("Factory AI live decision ABI-v1 parity", () => {
  it("covers all 12 M8g source-view/chooser corpus cases in both modes", async () => {
    const adapters = await engines();
    const masks = new Set<number>();
    const categories = new Map<string, number>();
    for (const testInput of CASES) {
      categories.set(testInput.category, (categories.get(testInput.category) ?? 0) + 1);
      const results = adapters.map((adapter) => adapter.chooseFactoryAiLiveDecision(testInput));
      expectDeepSame(results[1], results[0], testInput.label);
      masks.add(results[0]!.trace.mask);
    }
    expect(CASES).toHaveLength(12);
    expect([...masks].sort()).toEqual([0, 1, 7]);
    expect(Object.fromEntries(categories)).toEqual({
      "mask-0": 1, "mask-0-history": 1, "mask-1-type-ability": 1,
      "mask-1-status-weather": 1, "mask-7-history": 3, "mask-7-optional": 1,
      "mask-7-positional-history": 1, "mask-7-stages": 1, "mask-7-turn-ownership": 2,
    });
    expect(CASES.find((testCase) => testCase.category === "mask-7-positional-history")!.history.usedMoves[0]).toHaveLength(5);
  });

  it("retains turn ownership and the authoritative target decisions", async () => {
    const adapters = await engines();
    const boundary = CASES.find((testCase) => testCase.label === "mask_seven_boundary_turn_owner")!;
    const decision = CASES.find((testCase) => testCase.label === "mask_seven_decision_turn_owner")!;
    for (const testInput of [boundary, decision]) {
      for (const adapter of adapters) {
        const result = adapter.chooseFactoryAiLiveDecision(testInput);
        expect(result.trace.mask).toBe(7);
        const trace = result.trace;
        if (trace.mask !== 7) throw new Error("expected scored mask 7 trace");
        expect(trace.turnStartRandomNumber.owner).toBe(
          testInput === boundary ? "battle-turn-boundary" : "decision",
        );
        expect(trace.tie.chosenDecision.targetBattler).toBe(
          trace.tie.chosenDecision.moveSlot === 2 ? 1 : 0,
        );
      }
    }
  });

  it("preserves exact production errors while malformed packets stay checked", async () => {
    const adapter = await wasmFactoryAiLiveDecisionEngine();
    const challengeErrors = [
      { challenge: { factoryWinStreak: 1.5, trainerOpponentId: 222 }, message: "factoryWinStreak must be an integer from 0 through 65535" },
      { challenge: { factoryWinStreak: -1, trainerOpponentId: 222 }, message: "factoryWinStreak must be an integer from 0 through 65535" },
      { challenge: { factoryWinStreak: 65536, trainerOpponentId: 222 }, message: "factoryWinStreak must be an integer from 0 through 65535" },
      { challenge: { factoryWinStreak: 0, trainerOpponentId: 65536 }, message: "trainerOpponentId must be an integer from 0 through 65535" },
    ] as const;
    for (const { challenge, message } of challengeErrors) {
      const invalid = { ...CASES[0]!, challenge } as FactoryAiLiveDecisionInput;
      for (const engine of [tsFactoryAiLiveDecisionEngine(), adapter]) {
        expect(() => engine.chooseFactoryAiLiveDecision(invalid)).toThrow(RangeError);
        expect(() => engine.chooseFactoryAiLiveDecision(invalid)).toThrow(message);
      }
      expect(outputStatus(await invokeFactoryAiLiveDecisionPacket(encodeFactoryAiLiveDecisionInput(invalid)))).toEqual({
        status: 1,
        message,
      });
    }

    const unknownAbility = sourceCase({ label: "unknown", category: "error", streak: 28, attacker: { ability: 78 }, legalMask: 1, seed: 1 });
    expect(() => tsFactoryAiLiveDecisionEngine().chooseFactoryAiLiveDecision(unknownAbility)).toThrow("Factory AI live view: unknown ability id 78");
    expect(() => adapter.chooseFactoryAiLiveDecision(unknownAbility)).toThrow("Factory AI live view: unknown ability id 78");

    const noLegal = {
      ...CASES[2]!,
      request: { ...CASES[2]!.request, legalDecisions: [] } as BattleCommandRequest,
    };
    expect(() => tsFactoryAiLiveDecisionEngine().chooseFactoryAiLiveDecision(noLegal)).toThrow("Battle command request.legalDecisions must be a non-empty array, got ");
    expect(() => adapter.chooseFactoryAiLiveDecision(noLegal)).toThrow("Battle command request.legalDecisions must be a non-empty array, got ");

    const invalidRequestAndUnknownAbility = {
      ...unknownAbility,
      request: noLegal.request,
    };
    expect(() => tsFactoryAiLiveDecisionEngine().chooseFactoryAiLiveDecision(invalidRequestAndUnknownAbility)).toThrow("Factory AI live view: unknown ability id 78");
    expect(() => adapter.chooseFactoryAiLiveDecision(invalidRequestAndUnknownAbility)).toThrow("Factory AI live view: unknown ability id 78");

    const invalidRequestAndChallenge = {
      ...noLegal,
      challenge: { ...noLegal.challenge, factoryWinStreak: 1.5 },
    };
    expect(() => tsFactoryAiLiveDecisionEngine().chooseFactoryAiLiveDecision(invalidRequestAndChallenge)).toThrow("Battle command request.legalDecisions must be a non-empty array, got ");
    expect(() => adapter.chooseFactoryAiLiveDecision(invalidRequestAndChallenge)).toThrow("Battle command request.legalDecisions must be a non-empty array, got ");

    const switchRequest = createBattleCommandRequest({
      ...noLegal.request,
      legalDecisions: [{ kind: "switch", partyIndex: 2 }],
    });
    const switchInput = { ...noLegal, request: switchRequest };
    expect(() => adapter.chooseFactoryAiLiveDecision(switchInput)).toThrow("Factory AI scored move policy does not implement switch action prechecks");

    const valid = encodeFactoryAiLiveDecisionInput(CASES[0]!);
    const prefixLength = encodeFactoryAiLiveViewInput(CASES[0]!).length;
    const corruptLivePresence = valid.slice();
    corruptLivePresence[prefixLength - 1] = 9;
    const corruptTurnOwner = valid.slice();
    corruptTurnOwner[corruptTurnOwner.length - 3] = 9;
    const malformed = [
      new Uint8Array(), valid.slice(0, valid.length - 1), Uint8Array.from([...valid, 0]), corruptLivePresence,
    ];
    for (const packet of malformed) {
      expect(outputStatus(await invokeFactoryAiLiveDecisionPacket(packet))).toEqual({
        status: 2, message: "factory-wasm factoryAiLiveDecisionEngine: malformed input",
      });
    }
    expect(outputStatus(await invokeFactoryAiLiveDecisionPacket(corruptTurnOwner))).toEqual({
      status: 1, message: "factory-wasm factoryAiEngine: invalid turn-start owner 9",
    });

    const oversizedHistory = sourceCase({
      label: "history-overflow", category: "error", streak: 28,
      history: { usedMoves: [[1, 2, 3, 4, 5, 6, 7, 8, 9], [], [], []] },
      legalMask: 1, seed: 1,
    });
    expect(outputStatus(await invokeFactoryAiLiveDecisionPacket(encodeFactoryAiLiveDecisionInput(oversizedHistory)))).toEqual({
      status: 1,
      message: "Factory AI live decision known move history length 9 exceeds eight slots",
    });
  });

  it("selects the requested default or forced-WASM engine without fallback", async () => {
    const selected = await factoryAiLiveDecisionEngine();
    expect(selected.id).toBe(process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts");
    expect(encodeFactoryAiLiveDecisionInput(CASES[0]!).length).toBeGreaterThan(0);
  });
});
