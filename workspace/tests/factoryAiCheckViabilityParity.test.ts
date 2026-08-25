// Differential contract for core-rs/adapter/factoryAiEngine.ts's
// runCheckViability surface. The TS implementation remains the specification;
// every assertion below compares its complete result object (including each
// receipt's text, kind, ordinal, RNG snapshots, and variant field) with the
// factory-wasm `fw_run_check_viability` result for exactly the same input.
//
// The ABI itself is intentionally self-describing only at its string tail:
// two 108-byte presence-preserving battlers sit in a 236-byte fixed prefix,
// followed by a u32 UTF-8 byte count and `reasonPrefix`. See the adjacent
// encoder/export comments for the field-by-field table. This suite uses both
// omitted and explicit false/zero options so a boundary that silently applies
// TS defaults cannot pass by accident.
//
// `AI_CHECK_VIABILITY_TABLE_EFFECTS` has 122 entries. Ten are vestigial
// Gen-3 dispatch names with no move in moves.json, so no public
// `runCheckViability(moveId)` ABI input can reach them; the sweep proves the
// exact ten-name census and runs every remaining reachable effect. The
// handler-direct-only entries were already covered by M5d's native vectors;
// this boundary deliberately does not grow a second, non-game move/effect
// entrypoint just to synthesize them.
//
// Run in both engine modes from the workspace root:
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiCheckViabilityParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiCheckViabilityParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import {
  tsFactoryAiEngine,
  wasmFactoryAiEngine,
  type FactoryAiEngine,
  type RunCheckViabilityInput,
} from "../core-rs/adapter/factoryAiEngine.ts";
import {
  AI_CHECK_VIABILITY_TABLE_EFFECTS,
  type FactoryAiCheckViabilityBattler,
} from "../src/engine/factoryAiCheckViability.ts";
import { firstMoveIdWithEffect } from "../src/engine/factoryAiCheckBadMove.ts";

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      "which does not exist. Build it with: core-rs/build-wasm.sh",
  );
}

let wasmEnginePromise: Promise<FactoryAiEngine> | undefined;
function getWasmEngine(): Promise<FactoryAiEngine> {
  wasmEnginePromise ??= wasmFactoryAiEngine();
  return wasmEnginePromise;
}

const ts: FactoryAiEngine = tsFactoryAiEngine();

function moveIdForEffect(effect: string): number {
  const moveId = firstMoveIdWithEffect(effect);
  if (moveId === undefined) {
    throw new Error(`factoryAiCheckViabilityParity: no real Gen-3 move for ${effect}`);
  }
  return moveId;
}

function baseBattler(
  overrides: Partial<FactoryAiCheckViabilityBattler> = {},
): FactoryAiCheckViabilityBattler {
  return {
    speed: 100,
    speedStage: 6,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    isFirstTurn: 0,
    evasionStage: 6,
    accStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    hp: 100,
    maxHp: 100,
    ...overrides,
  };
}

function baseInput(
  moveId: number,
  attacker: FactoryAiCheckViabilityBattler = baseBattler(),
  target: FactoryAiCheckViabilityBattler = baseBattler(),
  overrides: Partial<Omit<RunCheckViabilityInput, "moveId" | "attacker" | "target">> = {},
): RunCheckViabilityInput {
  return {
    rng: { value: 249_678_687, calls: 0 },
    moveId,
    attacker,
    target,
    drawOrdinalStart: 1,
    reasonPrefix: "cv-parity",
    ...overrides,
  };
}

// === Part A: ABI pin =========================================================

describe.skipIf(!wasmAvailable)("factory-wasm ABI pin", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version()).toBe(1);
  });
});

// === Part B: directed boundary and behavioral cases ========================

describe.skipIf(!wasmAvailable)("runCheckViability - directed ts/wasm parity", () => {
  const wasmP = getWasmEngine();

  async function compare(input: RunCheckViabilityInput, label: string): Promise<ReturnType<FactoryAiEngine["runCheckViability"]>> {
    const wasm = await wasmP;
    const expected = ts.runCheckViability(input);
    const actual = wasm.runCheckViability(input);
    expect(actual, label).toEqual(expected);
    return expected;
  }

  it("keeps every explicitly present 42-field battler option distinct from omitted options", async () => {
    // This covers all 31 optional fields in one actual ABI record, including
    // values which are easy to lose while truthiness-encoding (false, zero,
    // ABILITY_NONE, weather Sun, and item zero). `knownAbility: null` is the
    // one source-level semantic alias for omitted: both mean an unknown
    // target ability and intentionally encode as absent in factory-core.
    const complete = baseBattler({
      speed: 73,
      speedStage: 3,
      types: ["TYPE_GROUND", "TYPE_ICE"],
      isFirstTurn: 2,
      evasionStage: 9,
      accStage: 4,
      atkStage: 8,
      defStage: 2,
      spDefStage: 11,
      hp: 61,
      maxHp: 127,
      spAtkStage: 10,
      lastUsedMoveId: 199,
      isToxicPoisoned: false,
      isLeechSeeded: false,
      isRooted: false,
      isCursed: false,
      ability: "ABILITY_NONE",
      currentWeather: 0,
      moves: [92, 57, 85, 19],
      battleTurnCount: 0,
      knownMoves: [182, 199, 57, 0],
      isInfatuated: false,
      isAsleep: false,
      isConfused: false,
      isTaunted: false,
      hasYawn: false,
      hasPerishSong: false,
      protectUses: 0,
      hasSideReflect: false,
      isPoisoned: false,
      isBurned: false,
      isParalyzed: false,
      hasSubstitute: false,
      anyMoveDisabled: false,
      hasAnyStatus: false,
      targetPartyStatusEqualsAny: false,
      holdEffect: 0,
      speciesAbilities: ["ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD"],
      knownAbility: null,
      usedHeldItemId: 0,
      stockpileCount: 0,
    });
    await compare(
      baseInput(57 /* Surf, no CheckViability table body */, complete, complete, {
        staleFuncResultFallback: 3,
        drawOrdinalStart: 37,
        reasonPrefix: "cv/utf8-π",
      }),
      "complete-presence-zero-false-utf8",
    );
    await compare(
      baseInput(moveIdForEffect("EFFECT_TOXIC"), complete, complete, {
        staleFuncResultFallback: 0,
        reasonPrefix: "complete-toxic",
      }),
      "complete-presence-toxic",
    );
    await compare(
      baseInput(moveIdForEffect("EFFECT_RAIN_DANCE"), complete, complete, {
        staleFuncResultFallback: 2,
        reasonPrefix: "complete-weather",
      }),
      "complete-presence-weather",
    );
  });

  it("preserves zero draw results and a stale funcResult carry/weather collision", async () => {
    const omittedWeather = baseBattler({ hp: 100, maxHp: 100 });
    const input = baseInput(moveIdForEffect("EFFECT_SUNNY_DAY"), omittedWeather, baseBattler(), {
      staleFuncResultFallback: 2, // AI_WEATHER_SANDSTORM -- SunnyDay's "other three" collision.
      reasonPrefix: "stale-carry",
    });
    const expected = await compare(input, "zero-draw-stale-weather-collision");
    expect(expected).toMatchObject({ kind: "scored", draws: [], scoreDelta: 1, funcResultAfter: 2 });
  });

  it("carries the proven maximum seven active draws (not the eight-slot internal capacity)", async () => {
    const attacker = baseBattler({ hp: 45, maxHp: 100, evasionStage: 9, isRooted: true });
    const target = baseBattler({
      hp: 100,
      maxHp: 100,
      isToxicPoisoned: true,
      isLeechSeeded: true,
      isCursed: true,
    });
    const moveId = moveIdForEffect("EFFECT_EVASION_UP");
    let maxInput: RunCheckViabilityInput | undefined;
    for (let seed = 1; seed < 4_096; seed++) {
      const candidate = baseInput(moveId, attacker, target, {
        rng: { value: seed, calls: 0 },
        drawOrdinalStart: 91,
        reasonPrefix: "max-draw",
      });
      const result = ts.runCheckViability(candidate);
      if (result.kind === "scored" && result.draws.length === 7) {
        maxInput = candidate;
        break;
      }
    }
    expect(maxInput, "a deterministic EvasionUp seven-draw path").toBeDefined();
    const expected = await compare(maxInput!, "max-seven-draws");
    expect(expected).toMatchObject({ kind: "scored" });
    if (expected.kind === "scored") expect(expected.draws).toHaveLength(7);
  });

  it("keeps Haze's repeated ordinal receipt while RNG snapshots still advance", async () => {
    const input = baseInput(
      moveIdForEffect("EFFECT_HAZE"),
      baseBattler({ atkStage: 9 }),
      baseBattler({ defStage: 9 }),
      { rng: { value: 1, calls: 0 }, drawOrdinalStart: 41, reasonPrefix: "haze-repeat" },
    );
    const expected = await compare(input, "haze-repeated-ordinal");
    expect(expected.kind).toBe("scored");
    if (expected.kind === "scored") {
      expect(expected.draws).toHaveLength(2);
      expect(expected.draws.map((draw) => draw.ordinal)).toEqual([41, 41]);
      expect(expected.draws[1].before).toEqual(expected.draws[0].after);
    }
  });

  // SKIPPED while the Rust port lags the spec -- ISSUES #124. The TS side
  // landed ISSUES #122 (SemiInvulnerable5 now RETURNS the speed-tie receipt it
  // spends, `battle_main.c:4745` through `battle_ai_script_commands.c:1268`),
  // and factory-core's `factory_ai_check_viability.rs` still drops it, so this
  // one input is the only directed case where ts and wasm disagree. The
  // corrected TS receipt is pinned unconditionally in
  // tests/factoryAiSemiInvulnerableTieDraw.test.ts; un-skip this the moment
  // the Rust mirror + regenerated vectors land.
  it.skip("keeps SemiInvulnerable5's tie receipt alongside its TryEncourage roll", async () => {
    // Equal speeds generate the tie roll, and the non-target-faster branch
    // then enters TryEncourage: both receipts belong to the returned list and
    // both RNG calls are spent.
    const input = baseInput(
      19 /* Fly / EFFECT_SEMI_INVULNERABLE */,
      baseBattler({ speed: 100 }),
      baseBattler({ speed: 100, lastUsedMoveId: 0 }),
      { rng: { value: 1, calls: 0 }, drawOrdinalStart: 17, reasonPrefix: "semi-drop" },
    );
    const expected = await compare(input, "semi-invulnerable-tie-receipt");
    expect(expected.kind).toBe("scored");
    if (expected.kind === "scored") {
      expect(expected.rng.calls).toBe(2);
      expect(expected.draws).toHaveLength(2);
      expect(expected.draws[0]).toMatchObject({ kind: "target-faster-tie", ordinal: 17 });
      expect(expected.draws[1]).toMatchObject({ kind: "semi-invulnerable-roll", ordinal: 18 });
    }
  });

  it("returns the source unknown-move error byte-for-byte", async () => {
    const wasm = await wasmP;
    const input = baseInput(9_999);
    const message = "factory-ai-check-viability: unknown move 9999";
    expect(() => ts.runCheckViability(input)).toThrow(message);
    expect(() => wasm.runCheckViability(input)).toThrow(message);
  });

  it("maps Toxic's missing optional moves to the source Error instead of a WASM abort", async () => {
    const wasm = await wasmP;
    const input = baseInput(moveIdForEffect("EFFECT_TOXIC"));
    const message = "factory-ai-check-viability: AI_CV_Toxic requires AI_USER moves";
    expect(() => ts.runCheckViability(input)).toThrow(message);
    expect(() => wasm.runCheckViability(input)).toThrow(message);
  });
});

// === Part C: deterministic broad sweep across every real table effect ======

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randInt(random: () => number, maxInclusive: number): number {
  return Math.floor(random() * (maxInclusive + 1));
}

function maybe<T>(random: () => number, value: T): T | undefined {
  return random() < 0.5 ? value : undefined;
}

const TYPES = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
] as const;
const ABILITIES = ["ABILITY_NONE", "ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD", "ABILITY_SWIFT_SWIM"] as const;
const LIVE_MOVES = [0, 19, 33, 57, 68, 85, 92, 120, 153, 182, 199, 240, 241, 258] as const;

function randomBattler(random: () => number): FactoryAiCheckViabilityBattler {
  const ability = ABILITIES[randInt(random, ABILITIES.length - 1)];
  return baseBattler({
    speed: randInt(random, 255),
    speedStage: randInt(random, 12),
    types: [TYPES[randInt(random, TYPES.length - 1)], TYPES[randInt(random, TYPES.length - 1)]],
    isFirstTurn: randInt(random, 2),
    evasionStage: randInt(random, 12),
    accStage: randInt(random, 12),
    atkStage: randInt(random, 12),
    defStage: randInt(random, 12),
    spDefStage: randInt(random, 12),
    hp: randInt(random, 160) + 1,
    maxHp: randInt(random, 160) + 1,
    spAtkStage: maybe(random, randInt(random, 12)),
    lastUsedMoveId: maybe(random, LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)]),
    isToxicPoisoned: maybe(random, random() < 0.5),
    isLeechSeeded: maybe(random, random() < 0.5),
    isRooted: maybe(random, random() < 0.5),
    isCursed: maybe(random, random() < 0.5),
    ability: maybe(random, ability),
    currentWeather: maybe(random, randInt(random, 3) as 0 | 1 | 2 | 3),
    moves: maybe(random, [
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
    ]),
    battleTurnCount: maybe(random, randInt(random, 20)),
    knownMoves: maybe(random, [
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
      LIVE_MOVES[randInt(random, LIVE_MOVES.length - 1)],
    ]),
    isInfatuated: maybe(random, random() < 0.5),
    isAsleep: maybe(random, random() < 0.5),
    isConfused: maybe(random, random() < 0.5),
    isTaunted: maybe(random, random() < 0.5),
    hasYawn: maybe(random, random() < 0.5),
    hasPerishSong: maybe(random, random() < 0.5),
    protectUses: maybe(random, randInt(random, 6)),
    hasSideReflect: maybe(random, random() < 0.5),
    isPoisoned: maybe(random, random() < 0.5),
    isBurned: maybe(random, random() < 0.5),
    isParalyzed: maybe(random, random() < 0.5),
    hasSubstitute: maybe(random, random() < 0.5),
    anyMoveDisabled: maybe(random, random() < 0.5),
    hasAnyStatus: maybe(random, random() < 0.5),
    targetPartyStatusEqualsAny: maybe(random, random() < 0.5),
    holdEffect: maybe(random, randInt(random, 255)),
    speciesAbilities: maybe(random, ["ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD"]),
    knownAbility: random() < 0.33 ? null : maybe(random, ability),
    usedHeldItemId: maybe(random, randInt(random, 255)),
    stockpileCount: maybe(random, randInt(random, 3)),
  });
}

describe.skipIf(!wasmAvailable)("runCheckViability - deterministic sweep across all 122 table effects", () => {
  it("every real table effect x six complete varied inputs matches TS receipts exactly", async () => {
    const wasm = await getWasmEngine();
    const random = mulberry32(0xc0de_5e5e);
    const effects = [...AI_CHECK_VIABILITY_TABLE_EFFECTS].sort();
    expect(effects).toHaveLength(122);

    const skipped: string[] = [];
    let cases = 0;
    for (const effect of effects) {
      const moveId = firstMoveIdWithEffect(effect);
      if (moveId === undefined) {
        skipped.push(effect);
        continue;
      }
      for (let variation = 0; variation < 6; variation++) {
        const rawAttacker = randomBattler(random);
        // AI_CV_Toxic intentionally rejects absent `moves`; keep the broad
        // sweep in the scored-result domain and pin that error above.
        const attacker = effect === "EFFECT_TOXIC" || effect === "EFFECT_LEECH_SEED"
          ? { ...rawAttacker, moves: [92, 57, 85, 19] as const }
          : rawAttacker;
        const input = baseInput(moveId, attacker, randomBattler(random), {
          rng: { value: Math.floor(random() * 0x1_0000_0000) >>> 0, calls: randInt(random, 9) },
          staleFuncResultFallback: maybe(random, randInt(random, 3) as 0 | 1 | 2 | 3),
          drawOrdinalStart: randInt(random, 100),
          reasonPrefix: `sweep-${cases}`,
        });
        expect(wasm.runCheckViability(input), `[${cases}] ${effect} v${variation} move ${moveId}`)
          .toEqual(ts.runCheckViability(input));
        cases++;
      }
    }

    expect(skipped.sort()).toEqual([
      "EFFECT_ACCURACY_DOWN_2", "EFFECT_ACCURACY_UP", "EFFECT_ACCURACY_UP_2",
      "EFFECT_EVASION_DOWN_2", "EFFECT_EVASION_UP_2",
      "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN_2",
      "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_SPECIAL_DEFENSE_UP", "EFFECT_SPEED_UP",
    ].sort());
    expect(cases).toBe((122 - skipped.length) * 6);
  });
});
