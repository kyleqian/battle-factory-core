import { describe, expect, it } from "vitest";
import {
  factoryAiBattleHistoryEngine,
  tsFactoryAiBattleHistoryEngine,
  wasmFactoryAiBattleHistoryEngine,
  type FactoryAiBattleHistoryEngine,
} from "../core-rs/adapter/factoryAiBattleHistoryEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import {
  createFactoryAiBattleHistory,
  recordFactoryAiKnownAbility,
  recordFactoryAiKnownItemEffect,
  syncFactoryAiBattleHistory,
  type FactoryAiBattleHistory,
} from "../src/engine/factoryAiLiveDriver.ts";
import type { BattleScriptRulesContext } from "../src/engine/battleScriptRulesContext.ts";

function rules(input: Readonly<{
  party?: readonly [number, number, number, number];
  lastMove?: number;
  abilities?: readonly [number, number, number, number];
  items?: readonly [number, number, number, number];
}> = {}): BattleScriptRulesContext {
  const party = input.party ?? [0, 1, 2, 3];
  return {
    battlers: party.map((partyIndex) => ({ partyIndex })),
    moveHistory: { lastMoves: [input.lastMove ?? 0, 0, 0, 0] },
    aiObservedAbilityIds: input.abilities ?? [0, 0, 0, 0],
    aiObservedItemEffects: input.items ?? [0, 0, 0, 0],
  } as unknown as BattleScriptRulesContext;
}

async function engines(): Promise<readonly FactoryAiBattleHistoryEngine[]> {
  return [tsFactoryAiBattleHistoryEngine(), await wasmFactoryAiBattleHistoryEngine()];
}

function expectSameNumbers(actual: FactoryAiBattleHistory, expected: FactoryAiBattleHistory): void {
  expect(actual).toEqual(expected);
  for (let battler = 0; battler < 4; battler += 1) {
    actual.usedMoves[battler]!.forEach((value, index) => {
      expect(Object.is(value, expected.usedMoves[battler]![index])).toBe(true);
    });
    expect(Object.is(actual.knownItemEffects[battler], expected.knownItemEffects[battler])).toBe(true);
    expect(Object.is(actual.partyIndexes[battler], expected.partyIndexes[battler])).toBe(true);
  }
}

describe("Factory AI battle-history ABI-v1 parity", () => {
  it("matches create, explicit records, sync ordering, invalidation, overlays, move dedup and cap", async () => {
    for (const engine of await engines()) {
      const initialRules = rules({ party: [4, 3, 2, 1] });
      let actual = engine.createFactoryAiBattleHistory(initialRules);
      let expected = createFactoryAiBattleHistory(initialRules);
      expectSameNumbers(actual, expected);

      actual = engine.recordFactoryAiKnownAbility(actual, 2, "ABILITY_CUSTOM_TWO");
      expected = recordFactoryAiKnownAbility(expected, 2, "ABILITY_CUSTOM_TWO");
      actual = engine.recordFactoryAiKnownItemEffect(actual, 2, 29);
      expected = recordFactoryAiKnownItemEffect(expected, 2, 29);
      expectSameNumbers(actual, expected);

      for (const lastMove of [70, 70, 89, 33, 57, 85]) {
        const live = rules({ party: [4, 3, 2, 1], lastMove });
        actual = engine.syncFactoryAiBattleHistory(actual, live);
        expected = syncFactoryAiBattleHistory(expected, live);
      }
      expect(actual.usedMoves[0]).toEqual([70, 89, 33, 57]);

      // Party change clears only that battler's moves/ability, retains its
      // item, then observed overlays run in battler order and can repopulate.
      const switched = rules({
        party: [4, 3, 9, 1],
        lastMove: 85,
        abilities: [9, 0, 69, 77],
        items: [101, 0, 0, 303],
      });
      actual = engine.syncFactoryAiBattleHistory(actual, switched);
      expected = syncFactoryAiBattleHistory(expected, switched);
      expectSameNumbers(actual, expected);
      expect(actual.knownAbilities).toEqual([
        "ABILITY_STATIC", null, "ABILITY_ROCK_HEAD", "ABILITY_AIR_LOCK",
      ]);
      expect(actual.knownItemEffects).toEqual([101, 0, 29, 303]);
      expect(actual.usedMoves[0]).toEqual([70, 89, 33, 57]);
    }
  });

  it("preserves arbitrary history Numbers, NaN SameValueZero, and canonical unknown-ability errors", async () => {
    const arbitrary = {
      usedMoves: [[Number.NaN, -0, 1.5], [-999, Number.POSITIVE_INFINITY], [42], [0]],
      knownAbilities: ["ABILITY_UNTRUSTED", "ABILITY_ODD", null, "ABILITY_FINAL"],
      knownItemEffects: [Number.NaN, -0, -11.5, Number.POSITIVE_INFINITY],
      partyIndexes: [Number.NaN, -0, 2.5, Number.POSITIVE_INFINITY],
    } as const satisfies FactoryAiBattleHistory;
    const live = rules({
      party: [Number.NaN, -0, 2.5, Number.POSITIVE_INFINITY],
      lastMove: Number.NaN,
    });
    const expected = syncFactoryAiBattleHistory(arbitrary, live);
    expect(expected.usedMoves[0]).toHaveLength(1); // NaN party index invalidates, then NaN records once.
    expect(Number.isNaN(expected.usedMoves[0][0])).toBe(true);

    for (const engine of await engines()) {
      expectSameNumbers(engine.syncFactoryAiBattleHistory(arbitrary, live), expected);
      let recorded = engine.recordFactoryAiKnownItemEffect(arbitrary, 1, -0);
      expect(Object.is(recorded.knownItemEffects[1], -0)).toBe(true);
      recorded = engine.recordFactoryAiKnownAbility(recorded, 3, "ABILITY_λ_CUSTOM");
      expect(recorded.knownAbilities[3]).toBe("ABILITY_λ_CUSTOM");
      for (const abilityId of [78, 1.5, Number.NaN]) {
        const bad = rules({ abilities: [abilityId, 0, 0, 0] });
        const message = (() => {
          try { syncFactoryAiBattleHistory(createFactoryAiBattleHistory(bad), bad); }
          catch (error) { return (error as Error).message; }
          throw new Error("expected canonical unknown-ability error");
        })();
        const history = engine.createFactoryAiBattleHistory(bad);
        expect(() => engine.syncFactoryAiBattleHistory(history, bad)).toThrow(message);
      }
    }
  });

  it("selects the requested engine and rejects malformed wire packets without trapping", async () => {
    expect((await factoryAiBattleHistoryEngine()).id).toBe(
      process.env.POKEBENCH_ENGINE === "wasm" ? "wasm" : "ts",
    );
    const wasm = await loadFactoryWasm();
    const malformed = [
      new Uint8Array(),
      new Uint8Array([9]),
      new Uint8Array([0]),
      new Uint8Array([1, 4]),
      new Uint8Array([2, 0]),
      new Uint8Array(1 + 13 * 8 + 1), // create plus one forbidden trailing byte
    ];
    for (const input of malformed) {
      const inputPtr = wasm.fw_alloc(input.length);
      let outputPtr: number;
      try {
        new Uint8Array(wasm.memory.buffer, inputPtr, input.length).set(input);
        outputPtr = wasm.fw_apply_factory_ai_battle_history_operation(inputPtr, input.length);
      } finally {
        wasm.fw_free(inputPtr, input.length);
      }
      const header = new DataView(wasm.memory.buffer, outputPtr, 7);
      const totalLength = header.getUint32(0, true);
      expect(header.getUint8(4)).toBe(2);
      const messageLength = header.getUint16(5, true);
      expect(new TextDecoder().decode(
        new Uint8Array(wasm.memory.buffer, outputPtr + 7, messageLength).slice(),
      )).toBe("factory-wasm factoryAiBattleHistoryEngine: malformed operation input");
      wasm.fw_free(outputPtr, totalLength);
    }
  });
});
