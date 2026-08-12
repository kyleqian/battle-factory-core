// Differential spec for core-rs/adapter/factoryAiEngine.ts's
// runCheckBadMovePreamble surface: proves the TS engine
// (src/engine/factoryAiCheckBadMove.ts) and the factory-wasm engine
// (fw_run_check_bad_move_preamble) agree on AI_CheckBadMove's universal
// preamble plus all 109 CBM_TABLE_EFFECTS table effects for identical
// inputs — not just that either one individually looks right. This is a
// pure differential spec (unlike tests/factoryAiMaskParity.test.ts's Part A):
// TS is always the expected value for every case below, so no case needs a
// hand-derived expected score — only inputs that structurally exercise each
// effect group/quirk, per docs/rust-m5b-checkbadmove-batching.md.
//
// Structure mirrors tests/damageCalcParity.test.ts's Part B/C:
//   Part A — ABI pin: fw_abi_version() === 1 through the loader.
//   Part B — directed cases: one (or a documented pair) per effect group
//     from the M5b batching doc's partition, plus the universal preamble's
//     own quirks (type immunity, ability negation, Soundproof, unknown move
//     id), each engine.runCheckBadMovePreamble(input) compared ts vs wasm.
//   Part C — a seeded random sweep across all 109 CBM_TABLE_EFFECTS x
//     varied targets/attackers (batched into one it(), damageCalcParity's
//     batching style — high cases-per-test, not one it() per case).
//
// `CbmResultView` (core-rs/adapter/factoryAiEngine.ts) already strips the
// TS-only `reason`/`kind` receipt sugar from both engines' outputs before
// they reach this file, so every comparison below is a direct `toEqual` —
// see that module's header doc comment for the scoping rationale.
//
// Availability rules mirror tests/rngEngineParity.test.ts: POKEBENCH_ENGINE=wasm
// with the artifact missing is a hard failure; the artifact merely being
// absent (no opt-in) skips this whole file (every case here is inherently
// differential — there is no single-engine spec-conformance part to run
// standalone, unlike tests/factoryAiMaskParity.test.ts's Part A).
//
// Invocations (from the workspace root):
//   ./core-rs/build-wasm.sh
//   NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiCheckBadMoveParity.test.ts --no-watch --pool=forks
//   POKEBENCH_ENGINE=wasm NODE_OPTIONS=--max-old-space-size=8192 npx vitest run tests/factoryAiCheckBadMoveParity.test.ts --no-watch --pool=forks

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultEngineId, resolveWasmArtifactPath } from "../core-rs/adapter/rngEngine.ts";
import { loadFactoryWasm } from "../core-rs/adapter/loadFactoryWasm.ts";
import {
  tsFactoryAiEngine,
  wasmFactoryAiEngine,
  type FactoryAiEngine,
  type RunCheckBadMovePreambleInput,
} from "../core-rs/adapter/factoryAiEngine.ts";
import {
  AI_CHECK_BAD_MOVE_TABLE_EFFECTS,
  firstMoveIdWithEffect,
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveRoarTarget,
  type FactoryAiMonGender,
} from "../src/engine/factoryAiCheckBadMove.ts";

const requestedEngine = defaultEngineId();
const wasmArtifactPath = resolveWasmArtifactPath();
const wasmAvailable = existsSync(wasmArtifactPath);

if (requestedEngine === "wasm" && !wasmAvailable) {
  throw new Error(
    `POKEBENCH_ENGINE=wasm requires the factory-wasm artifact at ${wasmArtifactPath}, ` +
      `which does not exist. Build it with: core-rs/build-wasm.sh`,
  );
}

let wasmEnginePromise: Promise<FactoryAiEngine> | undefined;
function getWasmEngine(): Promise<FactoryAiEngine> {
  wasmEnginePromise ??= wasmFactoryAiEngine();
  return wasmEnginePromise;
}

const ts: FactoryAiEngine = tsFactoryAiEngine();

// === Part A: ABI pin =========================================================

describe.skipIf(!wasmAvailable)("factory-wasm ABI pin", () => {
  it("fw_abi_version() === 1 through the loader", async () => {
    const exports = await loadFactoryWasm();
    expect(exports.fw_abi_version()).toBe(1);
  });
});

// === shared fixtures ==========================================================

const RNG_SEED = 249_678_687; // tests/factoryAiCheckBadMove.test.ts's own `run` default (also factory_ai_check_bad_move.rs's RNG_SEED).

// MAROWAK: two distinct, non-trapper, non-negating, non-Soundproof abilities
// (69 ROCK_HEAD / 31 LIGHTNING_ROD) -- forces a genuine ability draw when
// unknown. Same fixture factory_ai_check_bad_move.rs's own native tests use
// (verified against gen_tables::SPECIES there, not recalled here).
const MAROWAK = { species: 105, abilities: ["ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD"] as const };

function baseTarget(overrides: Partial<FactoryAiCheckBadMoveRoarTarget> = {}): FactoryAiCheckBadMoveRoarTarget {
  return {
    species: MAROWAK.species,
    types: ["TYPE_NORMAL", "TYPE_NORMAL"],
    knownAbility: MAROWAK.abilities[0],
    realAbility: MAROWAK.abilities[0],
    speedStage: 6,
    atkStage: 6,
    defStage: 6,
    spDefStage: 6,
    ...overrides,
  };
}

function baseAttacker(overrides: Partial<FactoryAiCheckBadMoveAttacker> = {}): FactoryAiCheckBadMoveAttacker {
  return { atkStage: 6, defStage: 6, ...overrides };
}

function baseInput(
  moveId: number,
  target: FactoryAiCheckBadMoveRoarTarget,
  attacker: FactoryAiCheckBadMoveAttacker = baseAttacker(),
  rngValue: number = RNG_SEED,
): RunCheckBadMovePreambleInput {
  return {
    rng: { value: rngValue, calls: 0 },
    moveId,
    target,
    attacker,
    drawOrdinalStart: 1,
    reasonPrefix: "parity",
  };
}

function moveIdForEffectOrThrow(effect: string): number {
  const moveId = firstMoveIdWithEffect(effect);
  if (moveId === undefined) {
    throw new Error(
      `factoryAiCheckBadMoveParity: no Gen-3 move carries ${effect} -- one of the ` +
        "10 vestigial CBM_TABLE_EFFECTS members (verified against moves.json, see " +
        "Part C's `skipped` assertion below for the exact set), handler-direct-only " +
        "and out of scope for this ABI per the M5c brief.",
    );
  }
  return moveId;
}

// === Part B: directed cases — one per effect group/quirk from the M5b =====
// batching doc's partition (docs/rust-m5b-checkbadmove-batching.md §2), plus
// the universal preamble's own branches. TS is always the expected value.

describe.skipIf(!wasmAvailable)("runCheckBadMovePreamble - directed cases, ts vs wasm", () => {
  const wasmP = getWasmEngine();

  async function compare(input: RunCheckBadMovePreambleInput, label: string): Promise<void> {
    const wasm = await wasmP;
    const expected = ts.runCheckBadMovePreamble(input);
    const actual = wasm.runCheckBadMovePreamble(input);
    expect(actual, label).toEqual(expected);
  }

  it("universal preamble: type immunity scores -10 with zero draws", async () => {
    // MOVE_THUNDERBOLT (85) vs Ground/Ground -- Electric x0.
    await compare(
      baseInput(85, baseTarget({ types: ["TYPE_GROUND", "TYPE_GROUND"] })),
      "type-immune",
    );
  });

  it("universal preamble: unknown ability draws at both the negates-type and Soundproof sites", async () => {
    // MOVE_SURF (57) vs Ground/Ground, no table entry -- exactly 2 draws,
    // both preamble call sites (factory_ai_check_bad_move.rs's own
    // non_immune_no_table_entry_move_draws_exactly_two_and_scores_zero).
    await compare(
      baseInput(57, baseTarget({ types: ["TYPE_GROUND", "TYPE_GROUND"], knownAbility: null })),
      "two-draw-no-table-entry",
    );
  });

  it("universal preamble: the five ability-negation branches", async () => {
    const cases: ReadonlyArray<[number, string, string]> = [
      [85 /* THUNDERBOLT */, "TYPE_ELECTRIC", "ABILITY_VOLT_ABSORB"],
      [61 /* BUBBLEBEAM */, "TYPE_WATER", "ABILITY_WATER_ABSORB"],
      [52 /* EMBER */, "TYPE_FIRE", "ABILITY_FLASH_FIRE"],
      [92 /* CONFUSION */, "TYPE_PSYCHIC", "ABILITY_WONDER_GUARD"],
      [89 /* EARTHQUAKE */, "TYPE_GROUND", "ABILITY_LEVITATE"],
    ];
    for (const [moveId, moveType, ability] of cases) {
      await compare(
        baseInput(
          moveId,
          baseTarget({ types: [moveType, "TYPE_NORMAL"], knownAbility: ability, realAbility: ability }),
        ),
        `negates-${ability}`,
      );
    }
  });

  it("universal preamble: Soundproof rejects the 9-move sound list", async () => {
    await compare(
      baseInput(46 /* MOVE_ROAR */, {
        ...baseTarget({ knownAbility: "ABILITY_SOUNDPROOF", realAbility: "ABILITY_SOUNDPROOF" }),
        usablePartyMons: 2,
      }),
      "soundproof",
    );
  });

  it("HighRiskForDamage cluster (18 effects, one shared handler): EFFECT_COUNTER rep", async () => {
    await compare(baseInput(moveIdForEffectOrThrow("EFFECT_COUNTER"), baseTarget()), "high-risk-counter");
  });

  it("EFFECT_TELEPORT: bare Score_Minus10, no handler body", async () => {
    await compare(baseInput(moveIdForEffectOrThrow("EFFECT_TELEPORT"), baseTarget()), "teleport");
  });

  const ZERO_RNG_SINGLES = [
    "EFFECT_INGRAIN", "EFFECT_PERISH_SONG", "EFFECT_NIGHTMARE", "EFFECT_FORESIGHT",
    "EFFECT_SPIKES", "EFFECT_FUTURE_SIGHT", "EFFECT_FOCUS_ENERGY", "EFFECT_REFRESH",
  ];
  it.each(ZERO_RNG_SINGLES)("zero-RNG single: %s", async (effect) => {
    await compare(
      baseInput(moveIdForEffectOrThrow(effect), baseTarget(), baseAttacker({ isRooted: true, hasFocusEnergy: true, hasCurableStatus: true })),
      effect,
    );
  });

  it("weather quartet incl. a stale-funcResult ability/weather collision", async () => {
    // ABILITY_DRIZZLE (id 2) collides with AI_WEATHER_SANDSTORM (2) in
    // Cmd_get_weather's own raw-id compare (module doc comment "Stale
    // funcResult weather bug") -- known (zero-RNG) so the collision is
    // exercised deterministically on both engines.
    const collisionTarget = baseTarget({ knownAbility: "ABILITY_DRIZZLE", realAbility: "ABILITY_DRIZZLE" });
    for (const effect of ["EFFECT_RAIN_DANCE", "EFFECT_SUNNY_DAY", "EFFECT_HAIL", "EFFECT_SANDSTORM"]) {
      await compare(baseInput(moveIdForEffectOrThrow(effect), collisionTarget), `weather-${effect}`);
      await compare(baseInput(moveIdForEffectOrThrow(effect), baseTarget()), `weather-${effect}-no-collision`);
    }
  });

  it("EFFECT_MAGNITUDE: own Levitate draw falls through into the HighRisk cluster", async () => {
    // Unknown two-ability target -> Magnitude's own Levitate check draws,
    // then falls through to run_cbm_high_risk_for_damage's own draw: 2 total.
    await compare(
      baseInput(moveIdForEffectOrThrow("EFFECT_MAGNITUDE"), baseTarget({ knownAbility: null })),
      "magnitude-multi-draw",
    );
  });

  // --- M5b-2: RNG-gated status/stat-DOWN family --------------------------

  const M5B2_SINGLE_REPS = [
    "EFFECT_OHKO", "EFFECT_LEECH_SEED", "EFFECT_FAKE_OUT", "EFFECT_WILL_O_WISP",
    "EFFECT_SLEEP", "EFFECT_PARALYZE", "EFFECT_CONFUSE", "EFFECT_SWAGGER", "EFFECT_FLATTER",
    "EFFECT_TOXIC", "EFFECT_POISON",
    "EFFECT_SPEED_DOWN", "EFFECT_DEFENSE_DOWN", "EFFECT_SPECIAL_DEFENSE_DOWN_2", "EFFECT_EVASION_DOWN",
    "EFFECT_KNOCK_OFF", "EFFECT_TRICK", "EFFECT_EXPLOSION", "EFFECT_DREAM_EATER",
    "EFFECT_SPIT_UP", "EFFECT_SWALLOW",
  ];
  it.each(M5B2_SINGLE_REPS)("M5b-2 rep: %s", async (effect) => {
    await compare(
      baseInput(
        moveIdForEffectOrThrow(effect),
        baseTarget({ knownAbility: null, level: 40 }),
        baseAttacker({ usablePartyMons: 3, isAsleep: false }),
      ),
      effect,
    );
  });

  it("EFFECT_ATTACK_DOWN(+_2): 2-draw case (Hyper Cutter + shared-tail ability read)", async () => {
    await compare(
      baseInput(moveIdForEffectOrThrow("EFFECT_ATTACK_DOWN"), baseTarget({ knownAbility: null })),
      "attack-down-2-draw",
    );
  });

  it("EFFECT_ACCURACY_DOWN: 2-draw case (Keen Eye + shared-tail ability read)", async () => {
    await compare(
      baseInput(moveIdForEffectOrThrow("EFFECT_ACCURACY_DOWN"), baseTarget({ knownAbility: null })),
      "acc-down-2-draw",
    );
  });

  it("EFFECT_ROAR: needs FactoryAiCheckBadMoveRoarTarget.usablePartyMons", async () => {
    await compare(
      baseInput(moveIdForEffectOrThrow("EFFECT_ROAR"), baseTarget({ usablePartyMons: 4 })),
      "roar",
    );
  });

  const ATTRACT_GENDER_PAIRS: ReadonlyArray<[FactoryAiMonGender | undefined, FactoryAiMonGender | undefined]> = [
    ["MON_MALE", "MON_FEMALE"],
    ["MON_FEMALE", "MON_MALE"],
    ["MON_MALE", "MON_MALE"],
    ["MON_MALE", undefined],
    [undefined, "MON_FEMALE"],
    ["MON_GENDERLESS", "MON_GENDERLESS"],
  ];
  it("EFFECT_ATTRACT: gender-pairing cases (the module's most branchy handler)", async () => {
    const moveId = moveIdForEffectOrThrow("EFFECT_ATTRACT");
    for (const [targetGender, attackerGender] of ATTRACT_GENDER_PAIRS) {
      await compare(
        baseInput(moveId, baseTarget({ gender: targetGender }), baseAttacker({ gender: attackerGender })),
        `attract-${targetGender}-${attackerGender}`,
      );
    }
  });

  // --- M5b-3: stat-UP family, screens, remaining zero-RNG singles --------

  const M5B3_REPS = [
    "EFFECT_ATTACK_UP", "EFFECT_DEFENSE_UP", "EFFECT_DEFENSE_CURL", "EFFECT_BULK_UP", "EFFECT_CURSE",
    "EFFECT_SPEED_UP_2", "EFFECT_SPECIAL_ATTACK_UP", "EFFECT_SPECIAL_DEFENSE_UP_2",
    "EFFECT_COSMIC_POWER", "EFFECT_CALM_MIND", "EFFECT_DRAGON_DANCE",
    "EFFECT_LIGHT_SCREEN", "EFFECT_REFLECT", "EFFECT_EVASION_UP", "EFFECT_MINIMIZE",
    "EFFECT_SAFEGUARD", "EFFECT_SNORE", "EFFECT_SLEEP_TALK", "EFFECT_BATON_PASS", "EFFECT_SUBSTITUTE",
    "EFFECT_MEAN_LOOK", "EFFECT_TORMENT", "EFFECT_HELPING_HAND", "EFFECT_TICKLE", "EFFECT_BELLY_DRUM",
    "EFFECT_MEMENTO", "EFFECT_STOCKPILE", "EFFECT_RECYCLE", "EFFECT_IMPRISON",
    "EFFECT_MUD_SPORT", "EFFECT_WATER_SPORT",
    "EFFECT_HAZE", "EFFECT_PSYCH_UP", "EFFECT_MIST", "EFFECT_DISABLE", "EFFECT_ENCORE",
  ];
  it.each(M5B3_REPS)("M5b-3 rep: %s", async (effect) => {
    await compare(
      baseInput(
        moveIdForEffectOrThrow(effect),
        baseTarget({ spAtkStage: 9, evasionStage: 3 }),
        baseAttacker({
          atkStage: 8, defStage: 9, speedStage: 10, spAtkStage: 4, spDefStage: 2, evasionStage: 11, accStage: 3,
          lightScreenUp: true, reflectUp: false, safeguardUp: false, mistUp: true,
          hasSubstitute: false, hp: 50, maxHp: 100, usablePartyMons: 2, stockpileCount: 2,
          usedHeldItemId: 0, imprisonedOthers: false, mudSportUp: false, waterSportUp: false,
        }),
      ),
      effect,
    );
  });

  it("error parity: unknown move id rejects on both engines with the same message", async () => {
    const wasm = await wasmP;
    const input = baseInput(9999, baseTarget());
    const message = "factory-ai-check-bad-move: unknown move 9999";
    expect(() => ts.runCheckBadMovePreamble(input)).toThrow(message);
    expect(() => wasm.runCheckBadMovePreamble(input)).toThrow(message);
  });
});

// === Part C: seeded random sweep across all 109 table effects x varied ====
// targets/attackers (batched into one it(), damageCalcParity's batching style).

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng: () => number, maxInclusive: number): number {
  return Math.floor(rng() * (maxInclusive + 1));
}
function randomBool(rng: () => number): boolean {
  return rng() < 0.5;
}
function maybe<T>(rng: () => number, value: T): T | undefined {
  return rng() < 0.5 ? value : undefined;
}
function randomGender(rng: () => number): FactoryAiMonGender | undefined {
  const r = randInt(rng, 3);
  if (r === 0) return undefined;
  return (["MON_MALE", "MON_FEMALE", "MON_GENDERLESS"] as const)[r - 1];
}

const REAL_TYPE_NAMES = [
  "TYPE_NORMAL", "TYPE_FIGHTING", "TYPE_FLYING", "TYPE_POISON", "TYPE_GROUND",
  "TYPE_ROCK", "TYPE_BUG", "TYPE_GHOST", "TYPE_STEEL", "TYPE_MYSTERY",
  "TYPE_FIRE", "TYPE_WATER", "TYPE_GRASS", "TYPE_ELECTRIC", "TYPE_PSYCHIC",
  "TYPE_ICE", "TYPE_DRAGON", "TYPE_DARK",
] as const;

const SWEEP_SPECIES_POOL = [
  { species: 105, abilities: ["ABILITY_ROCK_HEAD", "ABILITY_LIGHTNING_ROD"] },
  { species: 25, abilities: ["ABILITY_STATIC"] },
  { species: 213, abilities: ["ABILITY_STURDY"] },
] as const;

function randomTarget(rng: () => number): FactoryAiCheckBadMoveRoarTarget {
  const pick = SWEEP_SPECIES_POOL[randInt(rng, SWEEP_SPECIES_POOL.length - 1)];
  const realAbility = pick.abilities[randInt(rng, pick.abilities.length - 1)];
  const knownAbility = randomBool(rng) ? realAbility : null;
  return {
    species: pick.species,
    types: [REAL_TYPE_NAMES[randInt(rng, 17)], REAL_TYPE_NAMES[randInt(rng, 17)]],
    knownAbility,
    realAbility,
    speedStage: randInt(rng, 12),
    atkStage: randInt(rng, 12),
    defStage: randInt(rng, 12),
    spDefStage: randInt(rng, 12),
    accStage: maybe(rng, randInt(rng, 12)),
    evasionStage: maybe(rng, randInt(rng, 12)),
    hasAnyStatus: maybe(rng, randomBool(rng)),
    safeguardUp: maybe(rng, randomBool(rng)),
    isConfused: maybe(rng, randomBool(rng)),
    isLeechSeeded: maybe(rng, randomBool(rng)),
    isAsleep: maybe(rng, randomBool(rng)),
    isEscapePrevented: maybe(rng, randomBool(rng)),
    isTormented: maybe(rng, randomBool(rng)),
    hasPerishSong: maybe(rng, randomBool(rng)),
    isNightmared: maybe(rng, randomBool(rng)),
    isForesighted: maybe(rng, randomBool(rng)),
    spikesUp: maybe(rng, randomBool(rng)),
    targetFutureAttackUp: maybe(rng, randomBool(rng)),
    level: maybe(rng, randInt(rng, 100)),
    spAtkStage: maybe(rng, randInt(rng, 12)),
    isInfatuated: maybe(rng, randomBool(rng)),
    anyMoveDisabled: maybe(rng, randomBool(rng)),
    anyMoveEncored: maybe(rng, randomBool(rng)),
    gender: randomGender(rng),
    usablePartyMons: maybe(rng, randInt(rng, 6)),
  };
}

function randomAttacker(rng: () => number): FactoryAiCheckBadMoveAttacker {
  return {
    atkStage: randInt(rng, 12),
    defStage: randInt(rng, 12),
    speedStage: maybe(rng, randInt(rng, 12)),
    spAtkStage: maybe(rng, randInt(rng, 12)),
    spDefStage: maybe(rng, randInt(rng, 12)),
    lightScreenUp: maybe(rng, randomBool(rng)),
    reflectUp: maybe(rng, randomBool(rng)),
    evasionStage: maybe(rng, randInt(rng, 12)),
    attackerFutureAttackUp: maybe(rng, randomBool(rng)),
    hasFocusEnergy: maybe(rng, randomBool(rng)),
    hasCurableStatus: maybe(rng, randomBool(rng)),
    currentWeather: maybe(rng, randInt(rng, 3) as 0 | 1 | 2 | 3),
    level: maybe(rng, randInt(rng, 100)),
    isFirstTurn: maybe(rng, randInt(rng, 2)),
    safeguardUp: maybe(rng, randomBool(rng)),
    isAsleep: maybe(rng, randomBool(rng)),
    usablePartyMons: maybe(rng, randInt(rng, 6)),
    hasSubstitute: maybe(rng, randomBool(rng)),
    hp: maybe(rng, randInt(rng, 100)),
    maxHp: maybe(rng, randInt(rng, 100) + 1),
    isRooted: maybe(rng, randomBool(rng)),
    accStage: maybe(rng, randInt(rng, 12)),
    mistUp: maybe(rng, randomBool(rng)),
    gender: randomGender(rng),
    imprisonedOthers: maybe(rng, randomBool(rng)),
    mudSportUp: maybe(rng, randomBool(rng)),
    waterSportUp: maybe(rng, randomBool(rng)),
    usedHeldItemId: maybe(rng, randInt(rng, 50)),
    stockpileCount: maybe(rng, randInt(rng, 3)),
  };
}

describe.skipIf(!wasmAvailable)("runCheckBadMovePreamble - seeded random sweep across all 109 table effects", () => {
  it("every CBM_TABLE_EFFECTS member x 3 varied target/attacker draws matches ts vs wasm", async () => {
    const wasm = await getWasmEngine();
    const rng = mulberry32(0x5eed_c0de);
    const effects = [...AI_CHECK_BAD_MOVE_TABLE_EFFECTS].sort();
    expect(effects.length).toBe(109);

    const skipped: string[] = [];
    let cursor = 0;
    for (const effect of effects) {
      const moveId = firstMoveIdWithEffect(effect);
      if (moveId === undefined) {
        // Vestigial dispatches with no real Gen-3 move (ACCURACY_UP(+_2)/
        // SPECIAL_ATTACK_DOWN(+_2)/ACCURACY_DOWN_2) -- handler-direct-only,
        // out of scope for this ABI (see this file's header doc comment).
        skipped.push(effect);
        continue;
      }
      for (let variation = 0; variation < 3; variation++) {
        const input: RunCheckBadMovePreambleInput = {
          rng: { value: RNG_SEED, calls: 0 },
          moveId,
          target: randomTarget(rng),
          attacker: randomAttacker(rng),
          drawOrdinalStart: 1,
          reasonPrefix: "sweep",
        };
        const expected = ts.runCheckBadMovePreamble(input);
        const actual = wasm.runCheckBadMovePreamble(input);
        expect(actual, `[${cursor}] ${effect} variation ${variation} (move ${moveId})`).toEqual(expected);
        cursor++;
      }
    }
    // 10 vestigial effects carry no real Gen-3 move (verified directly
    // against src/data/gen/moves.json, not recalled -- several base/`_2`
    // pairs split unevenly: only one member of the pair has a real move,
    // e.g. EFFECT_SPEED_UP_2 does but EFFECT_SPEED_UP does not).
    expect(skipped.sort()).toEqual(
      [
        "EFFECT_ACCURACY_DOWN_2", "EFFECT_ACCURACY_UP", "EFFECT_ACCURACY_UP_2",
        "EFFECT_EVASION_DOWN_2", "EFFECT_EVASION_UP_2",
        "EFFECT_SPECIAL_ATTACK_DOWN", "EFFECT_SPECIAL_ATTACK_DOWN_2",
        "EFFECT_SPECIAL_DEFENSE_DOWN", "EFFECT_SPECIAL_DEFENSE_UP", "EFFECT_SPEED_UP",
      ].sort(),
    );
    expect(cursor).toBe((109 - skipped.length) * 3);
  });
});
