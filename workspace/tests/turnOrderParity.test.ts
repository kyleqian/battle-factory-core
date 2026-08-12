// Differential spec for core-rs/adapter/turnEngine.ts: proves the TS engine
// (src/engine/turnOrder.ts + src/engine/turnRng.ts) and the factory-wasm
// engine (fw_effective_speed et al.) agree on the full turn-order/turn-RNG
// surface for identical inputs — not just that either one individually
// looks right.
//
// Structure mirrors tests/damageCalcParity.test.ts:
//   Part A — spec-conformance: the RAM-pinned regression cases from
//     tests/turnOrder.test.ts and tests/turnRng.test.ts (read, not
//     edited), run against whichever engine POKEBENCH_ENGINE selects
//     (defaultEngineId()).
//   Part B — ABI pin: fw_abi_version() === 1 through the loader.
//   Part C — differential sweeps: TS is the expected value, wasm must
//     equal it exactly (skipped when the wasm artifact is absent and no
//     opt-in was requested).
//
// Availability rules mirror tests/rngEngineParity.test.ts: POKEBENCH_ENGINE=wasm
// with the artifact missing is a hard failure; the artifact merely being
// absent (no opt-in) skips only the wasm-dependent Part C suites.
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/turnOrderParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/turnOrderParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import { tsTurnEngine, wasmTurnEngine, type TurnEngine } from "../core-rs/adapter/turnEngine.ts";
import { DEFAULT_STAT_STAGE } from "../src/engine/damageCalc.ts";
import type { TurnOrderBattler } from "../src/engine/turnOrder.ts";
import { GbaRng } from "../src/engine/rng.ts";
import ramDump from "../src/data/gen/battle1-turn1-ram-dump.json" with { type: "json" };

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

let currentEnginePromise: Promise<TurnEngine> | undefined;
function getCurrentEngine(): Promise<TurnEngine> {
  currentEnginePromise ??= requestedEngine === "wasm" ? wasmTurnEngine() : Promise.resolve(tsTurnEngine());
  return currentEnginePromise;
}

let wasmEnginePromise: Promise<TurnEngine> | undefined;
function getWasmEngine(): Promise<TurnEngine> {
  wasmEnginePromise ??= wasmTurnEngine();
  return wasmEnginePromise;
}

const ts: TurnEngine = tsTurnEngine();

// === Part A: spec-conformance — RAM-pinned regression cases, mirroring ====
// tests/turnOrder.test.ts's describe blocks exactly (same battlers, same
// expected values), run against whichever engine defaultEngineId() selects.

const ONIX: TurnOrderBattler = { speed: 76, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };
const GROVYLE: TurnOrderBattler = { speed: 90, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };

describe("getWhoStrikesFirst - battle 1 turn 1 (RAM-pinned), parameterized over the selected engine", () => {
  it(`[engine=${requestedEngine}] Grovyle (90) strikes before Onix (76) - both priority 0`, async () => {
    const engine = await getCurrentEngine();
    expect(engine.getWhoStrikesFirst(ONIX, GROVYLE, 0)).toBe(1);
  });

  it(`[engine=${requestedEngine}] sortBattlersByTurnOrder([0,1]) reproduces gBattlerByTurnOrder = [1, 0]`, async () => {
    const engine = await getCurrentEngine();
    const battlers = new Map([
      [0, ONIX],
      [1, GROVYLE],
    ]);
    expect(engine.sortBattlersByTurnOrder([0, 1], battlers)).toEqual([1, 0]);
  });
});

const TURN9_ONIX: TurnOrderBattler = { speed: 76, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };
const TURN9_PIDGEOTTO: TurnOrderBattler = { speed: 77, speedStage: DEFAULT_STAT_STAGE, movePriority: 1 };

describe("getWhoStrikesFirst - battle 1 turn 9 (RAM-pinned, QUICK_ATTACK priority), parameterized over the selected engine", () => {
  it(`[engine=${requestedEngine}] Pidgeotto (priority 1) strikes before Onix (priority 0)`, async () => {
    const engine = await getCurrentEngine();
    expect(engine.getWhoStrikesFirst(TURN9_ONIX, TURN9_PIDGEOTTO, 0)).toBe(1);
  });

  it(`[engine=${requestedEngine}] priority overrides a losing speed margin`, async () => {
    const engine = await getCurrentEngine();
    const fastOnix: TurnOrderBattler = { ...TURN9_ONIX, speed: 200 };
    expect(engine.getWhoStrikesFirst(fastOnix, TURN9_PIDGEOTTO, 0)).toBe(1);
  });
});

describe("getWhoStrikesFirst - speed-tie Random()&1 tie-break, parameterized over the selected engine", () => {
  const tiedA: TurnOrderBattler = { speed: 100, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };
  const tiedB: TurnOrderBattler = { speed: 100, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };

  it(`[engine=${requestedEngine}] bit 0 = 0: no swap; bit 0 = 1: swap via coin flip`, async () => {
    const engine = await getCurrentEngine();
    expect(engine.getWhoStrikesFirst(tiedA, tiedB, 0)).toBe(0);
    expect(engine.getWhoStrikesFirst(tiedA, tiedB, 0b10)).toBe(0);
    expect(engine.getWhoStrikesFirst(tiedA, tiedB, 1)).toBe(2);
    expect(engine.getWhoStrikesFirst(tiedA, tiedB, 0b11)).toBe(2);
  });

  it(`[engine=${requestedEngine}] priority still overrides a speed tie`, async () => {
    const engine = await getCurrentEngine();
    const priority1: TurnOrderBattler = { ...tiedA, movePriority: 1 };
    expect(engine.getWhoStrikesFirst(priority1, tiedB, 1)).toBe(0);
  });
});

describe("getWhoStrikesFirst - Quick Claw stored turn random, parameterized over the selected engine", () => {
  const slowHolder: TurnOrderBattler = {
    speed: 45,
    speedStage: DEFAULT_STAT_STAGE,
    movePriority: 0,
    holdEffect: "HOLD_EFFECT_QUICK_CLAW",
    holdEffectParam: 20,
  };
  const fastOpponent: TurnOrderBattler = { speed: 95, speedStage: DEFAULT_STAT_STAGE, movePriority: 0 };

  it(`[engine=${requestedEngine}] exact param-20 threshold: 13106 procs, 13107 does not`, async () => {
    const engine = await getCurrentEngine();
    expect(engine.getWhoStrikesFirst(slowHolder, fastOpponent, 0, {}, 13106)).toBe(0);
    expect(engine.getWhoStrikesFirst(slowHolder, fastOpponent, 0, {}, 13107)).toBe(1);
  });

  it(`[engine=${requestedEngine}] keeps priority above the UINT_MAX speed sentinel`, async () => {
    const engine = await getCurrentEngine();
    expect(engine.getWhoStrikesFirst(slowHolder, { ...fastOpponent, movePriority: 1 }, 0, {}, 0)).toBe(1);
  });

  it(`[engine=${requestedEngine}] two holders reading the same stored value fall to the ordinary tie roll`, async () => {
    const engine = await getCurrentEngine();
    const fastHolder: TurnOrderBattler = {
      ...fastOpponent,
      holdEffect: "HOLD_EFFECT_QUICK_CLAW",
      holdEffectParam: 20,
    };
    expect(engine.getWhoStrikesFirst(slowHolder, fastHolder, 0, {}, 0)).toBe(0);
    expect(engine.getWhoStrikesFirst(slowHolder, fastHolder, 1, {}, 0)).toBe(2);
  });
});

// The committed ground truth: src/data/gen/battle1-turn1-ram-dump.json's own
// rngLedger array (7 entries), same seed tests/turnRng.test.ts pins.
const DUMP_LEDGER = ramDump.rngLedger;
const PRE_TURN_RNG_VALUE = DUMP_LEDGER[0]!.fromValue;

describe("runTurn1RngLedger - replays the committed dump's RNG ledger bit-exactly, parameterized over the selected engine", () => {
  it(`[engine=${requestedEngine}] each step's call count and before/after gRngValue matches the dump`, async () => {
    const engine = await getCurrentEngine();
    const results = engine.runTurn1RngLedger(PRE_TURN_RNG_VALUE);
    expect(results).toHaveLength(7);
    for (let i = 0; i < DUMP_LEDGER.length; i++) {
      expect(results[i]!.rolls.length, `step ${i} roll count`).toBe(DUMP_LEDGER[i]!.steps);
      expect(results[i]!.rngValueBefore, `step ${i} fromValue`).toBe(DUMP_LEDGER[i]!.fromValue);
      expect(results[i]!.rngValueAfter, `step ${i} toValue`).toBe(DUMP_LEDGER[i]!.toValue);
    }
  });

  it(`[engine=${requestedEngine}] the final gRngValue matches the dump's own flat post-turn tail`, async () => {
    const engine = await getCurrentEngine();
    const results = engine.runTurn1RngLedger(PRE_TURN_RNG_VALUE);
    const lastTick = ramDump.ticks.at(-1)! as { rng: number };
    expect(results.at(-1)!.rngValueAfter).toBe(lastTick.rng);
  });
});

// === Part B: wasm ABI ========================================================

describe.skipIf(!wasmAvailable)("Part B — wasm ABI", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version() >>> 0).toBe(1);
  });
});

// === Part C: differential sweeps, ts vs wasm ===============================

function battler(overrides: Partial<TurnOrderBattler> = {}): TurnOrderBattler {
  return { speed: 50, speedStage: DEFAULT_STAT_STAGE, movePriority: 0, ...overrides };
}

const ABILITIES = [undefined, "ABILITY_SWIFT_SWIM", "ABILITY_CHLOROPHYLL", "ABILITY_GUTS"];
const HOLD_EFFECTS = [undefined, "HOLD_EFFECT_MACHO_BRACE", "HOLD_EFFECT_QUICK_CLAW", "HOLD_EFFECT_CHOICE_BAND"];
const PRIORITIES = [-3, -1, 0, 0, 0, 1, 2];

describe.skipIf(!wasmAvailable)("Part C — effectiveSpeed differential sweep — ts vs wasm", () => {
  const rng = new GbaRng(0x2468_ace0);
  const pick = (n: number) => rng.next() % n;

  for (let i = 0; i < 60; i++) {
    it(`sweep[${i}]: effectiveSpeed agrees`, async () => {
      const tsEngine = ts;
      const wasm = await getWasmEngine();
      const b = battler({
        speed: 1 + pick(999),
        speedStage: pick(13),
        isParalyzed: pick(2) === 0,
        ability: ABILITIES[pick(ABILITIES.length)],
        holdEffect: HOLD_EFFECTS[pick(HOLD_EFFECTS.length)],
        holdEffectParam: pick(101),
      });
      const weather = { isRaining: pick(2) === 0, isSunny: pick(2) === 0 };
      const randomTurnNumber = pick(0x10000);
      const tsResult = tsEngine.effectiveSpeed(b, weather, randomTurnNumber);
      const wasmResult = wasm.effectiveSpeed(b, weather, randomTurnNumber);
      expect(wasmResult, `battler=${JSON.stringify(b)} weather=${JSON.stringify(weather)}`).toBe(tsResult);
    });
  }
});

describe.skipIf(!wasmAvailable)("Part C — getWhoStrikesFirst differential sweep — ts vs wasm", () => {
  const rng = new GbaRng(0x1a2b_3c4d);
  const pick = (n: number) => rng.next() % n;
  function sweepBattler(): TurnOrderBattler {
    return battler({
      speed: 1 + pick(400),
      speedStage: pick(13),
      movePriority: PRIORITIES[pick(PRIORITIES.length)],
      isParalyzed: pick(3) === 0,
      ability: ABILITIES[pick(ABILITIES.length)],
      holdEffect: HOLD_EFFECTS[pick(HOLD_EFFECTS.length)],
      holdEffectParam: pick(101),
    });
  }

  for (let i = 0; i < 80; i++) {
    it(`sweep[${i}]: getWhoStrikesFirst agrees`, async () => {
      const tsEngine = ts;
      const wasm = await getWasmEngine();
      const b1 = sweepBattler();
      const b2 = sweepBattler();
      const weather = { isRaining: pick(2) === 0, isSunny: pick(2) === 0 };
      const speedTieRngRoll = pick(0x10000);
      const randomTurnNumber = pick(0x10000);
      const tsResult = tsEngine.getWhoStrikesFirst(b1, b2, speedTieRngRoll, weather, randomTurnNumber);
      const wasmResult = wasm.getWhoStrikesFirst(b1, b2, speedTieRngRoll, weather, randomTurnNumber);
      expect(wasmResult, `b1=${JSON.stringify(b1)} b2=${JSON.stringify(b2)}`).toBe(tsResult);
    });
  }
});

describe.skipIf(!wasmAvailable)("Part C — sortBattlersByTurnOrder differential sweep — ts vs wasm", () => {
  const rng = new GbaRng(0x5566_7788);
  const pick = (n: number) => rng.next() % n;

  for (let i = 0; i < 30; i++) {
    it(`sweep[${i}]: sortBattlersByTurnOrder agrees over 2-4 battlers`, async () => {
      const tsEngine = ts;
      const wasm = await getWasmEngine();
      const count = 2 + pick(3); // 2..4 battlers
      const ids = Array.from({ length: count }, (_, idx) => idx);
      const battlerList = ids.map(() =>
        battler({
          speed: 1 + pick(200), // narrow range to force real ties
          speedStage: DEFAULT_STAT_STAGE,
          movePriority: pick(4) === 0 ? 1 : 0,
        }),
      );
      const battlers = new Map(ids.map((id, idx) => [id, battlerList[idx]!]));
      const rollCount = (count * (count - 1)) / 2;
      const rolls = Array.from({ length: rollCount }, () => pick(0x10000));
      const weather = { isRaining: pick(2) === 0, isSunny: pick(2) === 0 };
      const randomTurnNumber = pick(0x10000);

      const tsResult = tsEngine.sortBattlersByTurnOrder(ids, battlers, rolls, weather, randomTurnNumber);
      const wasmResult = wasm.sortBattlersByTurnOrder(ids, battlers, rolls, weather, randomTurnNumber);
      expect(wasmResult, `battlers=${JSON.stringify(battlerList)}`).toEqual(tsResult);
    });
  }
});

describe.skipIf(!wasmAvailable)("Part C — runTurn1RngLedger differential sweep — ts vs wasm", () => {
  const rng = new GbaRng(0x99aa_bbcc);
  const seeds = [0, 0xffffffff, PRE_TURN_RNG_VALUE, 0xd2ddeec8];
  for (let i = 0; i < 20; i++) seeds.push(rng.next() * 0x10000 + rng.next());

  seeds.forEach((seed, i) => {
    it(`seed[${i}]=${seed >>> 0}: full 7-step ledger deep-equals between ts and wasm`, async () => {
      const tsEngine = ts;
      const wasm = await getWasmEngine();
      const tsResult = tsEngine.runTurn1RngLedger(seed >>> 0);
      const wasmResult = wasm.runTurn1RngLedger(seed >>> 0);
      expect(wasmResult).toEqual(tsResult);
    });
  });
});
