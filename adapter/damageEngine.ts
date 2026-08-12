// The damage/accuracy/crit-math engine adapter: a uniform DamageEngine
// interface over the TS spec engine (src/engine/damageCalc.ts) and the
// factory-wasm boundary's damage_calc surface (fw_calculate_base_damage
// et al., ./loadFactoryWasm.ts), so tests/damageCalcParity.test.ts can run
// identical inputs against either without knowing which one it's holding.
// Sibling to ./factoryEngine.ts (rental/party-construction surface) and
// ./rngEngine.ts (RNG surface) — same M2 opt-in pattern, a distinct file
// because this is a distinct, larger function family.
//
// Engine selection reuses rngEngine.ts's defaultEngineId/resolveWasmArtifactPath
// directly (POKEBENCH_ENGINE env var; TS is the default, "wasm" opts in).
//
// Strings stay TS-side: move/mon types cross the ABI as the numeric
// TYPE_IDS this module defines (mirrors the unexported table inline in
// damageCalc.ts and damage_calc.rs's TYPE_* consts — both cited below),
// abilities/hold-effects cross as the numeric ids from
// src/data/gen/ability-item-hooks.json `.universes` (the same ids
// damage_calc.rs and gen_tables.rs use), resolved back to TS's string
// identifiers on the way out where the TS engine's own signatures expect
// them. Numbers (stats, power, stages, HP, rng rolls) cross as-is.
//
// Buffer layouts mirror the doc comments over the corresponding fw_
// exports (crates/factory-wasm/src/lib.rs): fw_calculate_base_damage's
// fixed 117-byte DamageCalcInput, fw_calculate_accuracy's fixed 26-byte
// AccuracyCalcInput, fw_apply_type_effectiveness's fixed 8-byte
// {damage, multiplierTenths} output. None of the three are
// length-prefixed — their widths are compile-time constants on both sides.

import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import type {
  AccuracyCalcInput,
  CritChanceInput,
  DamageBattler,
  DamageCalcInput,
  TypeEffectivenessEntry,
} from "../../src/engine/damageCalc.ts";
import {
  applyRandomDamageMultiplier as tsApplyRandomDamageMultiplier,
  applyStab as tsApplyStab,
  applyStatStageMod as tsApplyStatStageMod,
  applyTypeEffectiveness as tsApplyTypeEffectiveness,
  calculateAccuracy as tsCalculateAccuracy,
  calculateBaseDamage as tsCalculateBaseDamage,
  calculateEndeavorDamage as tsCalculateEndeavorDamage,
  getCriticalHitChanceStage as tsGetCriticalHitChanceStage,
  isTypePhysical as tsIsTypePhysical,
  isTypeSpecial as tsIsTypeSpecial,
  resolveEndeavorDamage as tsResolveEndeavorDamage,
  rollAccuracyHits as tsRollAccuracyHits,
  rollIsCriticalHit as tsRollIsCriticalHit,
} from "../../src/engine/damageCalc.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

/**
 * `TYPE_*` numeric ids (`include/constants/pokemon.h`), mirroring the
 * unexported table inline in `src/engine/damageCalc.ts` and
 * `damage_calc.rs`'s `TYPE_*` consts. Verified against both at adapter
 * time, not recalled — see `core-rs/tools/gen-damage-vectors.mjs`'s own
 * copy of this same table for the third independent citation.
 */
const TYPE_IDS: Readonly<Record<string, number>> = {
  TYPE_NORMAL: 0,
  TYPE_FIGHTING: 1,
  TYPE_FLYING: 2,
  TYPE_POISON: 3,
  TYPE_GROUND: 4,
  TYPE_ROCK: 5,
  TYPE_BUG: 6,
  TYPE_GHOST: 7,
  TYPE_STEEL: 8,
  TYPE_MYSTERY: 9,
  TYPE_FIRE: 10,
  TYPE_WATER: 11,
  TYPE_GRASS: 12,
  TYPE_ELECTRIC: 13,
  TYPE_PSYCHIC: 14,
  TYPE_ICE: 15,
  TYPE_DRAGON: 16,
  TYPE_DARK: 17,
};
const TYPE_NAME_BY_ID = new Map(Object.entries(TYPE_IDS).map(([name, id]) => [id, name]));

function typeId(name: string): number {
  const id = TYPE_IDS[name];
  if (id === undefined) throw new Error(`factory-wasm damageEngine: unknown move/mon type ${name}`);
  return id;
}

function typeName(id: number): string {
  const name = TYPE_NAME_BY_ID.get(id);
  if (name === undefined) throw new Error(`factory-wasm damageEngine: unknown TYPE_* id ${id}`);
  return name;
}

type SymbolIdRow = Readonly<{ name: string; id: number }>;
const ABILITY_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities
    .map((row) => [row.name, row.id]),
);
const HOLD_EFFECT_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { holdEffects: SymbolIdRow[] } }).universes.holdEffects
    .map((row) => [row.name, row.id]),
);

function abilityId(name: string | null | undefined): number {
  if (name === null || name === undefined) return 0; // ABILITY_NONE
  const id = ABILITY_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`factory-wasm damageEngine: unknown ability ${name}`);
  return id;
}

function holdEffectId(name: string | null | undefined): number {
  if (name === null || name === undefined) return 0; // HOLD_EFFECT_NONE
  const id = HOLD_EFFECT_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`factory-wasm damageEngine: unknown hold effect ${name}`);
  return id;
}

/**
 * `CritMoveEffect` discriminant mapping (mirrors the Rust
 * `crit_move_effect_from_u32` helper's doc comment exactly): 0 = Other
 * (also every `moveEffect` string this module's crit-chance branch
 * doesn't read — matches the TS's own string-equality checks against a
 * single optional field), 1 = HighCritical, 2 = SkyAttack, 3 = BlazeKick,
 * 4 = PoisonTail.
 */
function critMoveEffectId(moveEffect: string | undefined): number {
  switch (moveEffect) {
    case "EFFECT_HIGH_CRITICAL":
      return 1;
    case "EFFECT_SKY_ATTACK":
      return 2;
    case "EFFECT_BLAZE_KICK":
      return 3;
    case "EFFECT_POISON_TAIL":
      return 4;
    default:
      return 0;
  }
}

// --- fixed-width buffer encoders (mirror crates/factory-wasm/src/lib.rs's
// decode_damage_battler / decode_damage_calc_input / decode_accuracy_calc_input
// doc comments field-for-field) ---------------------------------------------

const DAMAGE_BATTLER_WIDTH = 48;
const DAMAGE_CALC_INPUT_WIDTH = 117;
const ACCURACY_CALC_INPUT_WIDTH = 26;

function writeDamageBattler(view: DataView, offset: number, battler: DamageBattler): void {
  view.setInt32(offset + 0, battler.attack, true);
  view.setInt32(offset + 4, battler.defense, true);
  view.setInt32(offset + 8, battler.spAttack, true);
  view.setInt32(offset + 12, battler.spDefense, true);
  view.setInt32(offset + 16, battler.level, true);
  view.setUint8(offset + 20, typeId(battler.types[0]));
  view.setUint8(offset + 21, typeId(battler.types[1]));
  view.setUint8(offset + 22, battler.statStages.atk);
  view.setUint8(offset + 23, battler.statStages.def);
  view.setUint8(offset + 24, battler.statStages.spAtk);
  view.setUint8(offset + 25, battler.statStages.spDef);
  view.setUint8(offset + 26, battler.isBurned ? 1 : 0);
  view.setUint8(offset + 27, battler.hasStatus1 ? 1 : 0);
  view.setUint8(offset + 28, battler.hp !== undefined ? 1 : 0);
  view.setInt32(offset + 29, battler.hp ?? 0, true);
  view.setUint8(offset + 33, battler.maxHP !== undefined ? 1 : 0);
  view.setInt32(offset + 34, battler.maxHP ?? 0, true);
  view.setUint16(offset + 38, abilityId(battler.ability), true);
  view.setUint16(offset + 40, battler.species ?? 0, true);
  view.setUint16(offset + 42, holdEffectId(battler.holdEffect), true);
  view.setInt32(offset + 44, battler.holdEffectParam ?? 0, true);
}

/**
 * Encodes a `DamageCalcInput` into the fixed 117-byte buffer
 * `fw_calculate_base_damage` reads. `activeBattlerAbilities` is NOT
 * encodable at this boundary — see this module's header comment and
 * `crates/factory-wasm/src/lib.rs`'s module doc comment for why (the
 * doubles-only Plus/Minus field-scan override, out of scope for this
 * boundary); throws if the input sets it to a value other than the TS
 * default two-battler pairing.
 */
function encodeDamageCalcInput(input: DamageCalcInput): ArrayBuffer {
  if (input.activeBattlerAbilities !== undefined) {
    throw new Error(
      "factory-wasm damageEngine: activeBattlerAbilities is not encodable at this boundary " +
        "(doubles-only Plus/Minus field scan, out of scope — see module header comment)",
    );
  }
  const buffer = new ArrayBuffer(DAMAGE_CALC_INPUT_WIDTH);
  const view = new DataView(buffer);
  writeDamageBattler(view, 0, input.attacker);
  writeDamageBattler(view, DAMAGE_BATTLER_WIDTH, input.defender);
  view.setInt32(96, input.movePower, true);
  view.setUint8(100, typeId(input.moveType));
  view.setUint8(101, input.isCriticalHit ? 1 : 0);
  view.setUint8(102, input.sideStatusReflect ? 1 : 0);
  view.setUint8(103, input.sideStatusLightScreen ? 1 : 0);
  view.setUint8(104, input.isDoubleBattleSpreadMove ? 1 : 0);
  view.setUint8(105, input.moveEffect === "EFFECT_EXPLOSION" ? 1 : 0);
  view.setUint32(106, (input.weather ?? 0) >>> 0, true);
  view.setUint8(110, input.weatherHasEffect !== false ? 1 : 0);
  view.setUint32(111, (input.currentMove ?? 0) >>> 0, true);
  view.setUint8(115, input.isFrontierBattle ? 1 : 0);
  view.setUint8(116, input.flashFireBoosted ? 1 : 0);
  return buffer;
}

function encodeAccuracyCalcInput(input: AccuracyCalcInput): ArrayBuffer {
  const buffer = new ArrayBuffer(ACCURACY_CALC_INPUT_WIDTH);
  const view = new DataView(buffer);
  view.setInt32(0, input.moveAccuracy, true);
  view.setInt32(4, input.attackerAccuracyStage, true);
  view.setInt32(8, input.targetEvasionStage, true);
  view.setUint8(12, input.targetHasForesight ? 1 : 0);
  view.setUint16(13, abilityId(input.attackerAbility), true);
  view.setUint16(15, abilityId(input.targetAbility), true);
  view.setUint8(17, input.isSandstorm ? 1 : 0);
  view.setUint8(18, input.moveType !== undefined ? 1 : 0);
  view.setUint8(19, input.moveType !== undefined ? typeId(input.moveType) : 0);
  view.setUint16(20, holdEffectId(input.targetHoldEffect), true);
  view.setInt32(22, input.targetHoldEffectParam ?? 0, true);
  return buffer;
}

export type DamageEngineId = "ts" | "wasm";

export interface DamageEngine {
  readonly id: DamageEngineId;
  isTypePhysical(moveType: string): boolean;
  isTypeSpecial(moveType: string): boolean;
  applyStatStageMod(stat: number, stage: number): number;
  calculateBaseDamage(input: DamageCalcInput): number;
  getCriticalHitChanceStage(input: CritChanceInput): number;
  rollIsCriticalHit(critChanceStage: number, rngRoll: number, targetImmune?: boolean): boolean;
  applyStab(damage: number, attackerTypes: readonly [string, string], moveType: string): number;
  applyTypeEffectiveness(
    damage: number,
    moveType: string,
    defenderTypes: readonly [string, string],
    table: readonly TypeEffectivenessEntry[],
  ): { damage: number; multiplierTenths: number };
  calculateEndeavorDamage(targetHp: number, userHp: number): number;
  resolveEndeavorDamage(targetHp: number, userHp: number, typeMultiplierTenths: number): number;
  applyRandomDamageMultiplier(damage: number, rngRoll: number): number;
  calculateAccuracy(input: AccuracyCalcInput): number;
  rollAccuracyHits(calc: number, rngRoll: number): boolean;
}

/** Thin wrapper over the TS spec engine — the default, always-available engine. */
export function tsDamageEngine(): DamageEngine {
  return {
    id: "ts",
    isTypePhysical: tsIsTypePhysical,
    isTypeSpecial: tsIsTypeSpecial,
    applyStatStageMod: tsApplyStatStageMod,
    calculateBaseDamage: tsCalculateBaseDamage,
    getCriticalHitChanceStage: tsGetCriticalHitChanceStage,
    rollIsCriticalHit: tsRollIsCriticalHit,
    applyStab: tsApplyStab,
    applyTypeEffectiveness: tsApplyTypeEffectiveness,
    calculateEndeavorDamage: tsCalculateEndeavorDamage,
    resolveEndeavorDamage: tsResolveEndeavorDamage,
    applyRandomDamageMultiplier: tsApplyRandomDamageMultiplier,
    calculateAccuracy: tsCalculateAccuracy,
    rollAccuracyHits: tsRollAccuracyHits,
  };
}

/**
 * Wraps the factory-wasm boundary's damage_calc surface as a
 * `DamageEngine`. Per-call: for the two buffer-input exports
 * (`fw_calculate_base_damage`/`fw_calculate_accuracy`), write the encoded
 * input into a scratch region carved out of wasm linear memory via
 * `fw_alloc` and free it again once the (synchronous) call returns — wasm
 * memory may grow between calls, so the `DataView` is created fresh each
 * time, never cached. For `fw_apply_type_effectiveness`'s buffer output,
 * copy it out via `.slice()` before `fw_free`, exactly like
 * `factoryEngine.ts`'s wasm wrappers.
 */
export async function wasmDamageEngine(): Promise<DamageEngine> {
  const exports = await loadFactoryWasm();

  function withInputBuffer<T>(bytes: ArrayBuffer, run: (ptr: number) => T): T {
    const len = bytes.byteLength;
    const ptr = exports.fw_alloc(len);
    try {
      new Uint8Array(exports.memory.buffer, ptr, len).set(new Uint8Array(bytes));
      return run(ptr);
    } finally {
      exports.fw_free(ptr, len);
    }
  }

  return {
    id: "wasm",
    isTypePhysical(moveType) {
      return exports.fw_is_type_physical(typeId(moveType)) !== 0;
    },
    isTypeSpecial(moveType) {
      return exports.fw_is_type_special(typeId(moveType)) !== 0;
    },
    applyStatStageMod(stat, stage) {
      return exports.fw_apply_stat_stage_mod(stat, stage);
    },
    calculateBaseDamage(input) {
      const bytes = encodeDamageCalcInput(input);
      return withInputBuffer(bytes, (ptr) => exports.fw_calculate_base_damage(ptr));
    },
    getCriticalHitChanceStage(input) {
      return exports.fw_get_critical_hit_chance_stage(
        input.focusEnergy ? 1 : 0,
        critMoveEffectId(input.moveEffect),
        holdEffectId(input.attackerHoldEffect),
        input.isChansey ? 1 : 0,
        input.isFarfetchd ? 1 : 0,
      );
    },
    rollIsCriticalHit(critChanceStage, rngRoll, targetImmune = false) {
      return exports.fw_roll_is_critical_hit(critChanceStage, rngRoll, targetImmune ? 1 : 0) !== 0;
    },
    applyStab(damage, attackerTypes, moveType) {
      return exports.fw_apply_stab(damage, typeId(attackerTypes[0]), typeId(attackerTypes[1]), typeId(moveType));
    },
    applyTypeEffectiveness(damage, moveType, defenderTypes) {
      // The `table` parameter is accepted for interface parity with the TS
      // engine's own signature but is NOT forwarded across the ABI: the
      // wasm side always uses its embedded gen_tables::TYPE_EFFECTIVENESS_TABLE
      // (see fw_apply_type_effectiveness's doc comment). Callers in the
      // parity suite must always pass the canonical
      // src/data/gen/type-effectiveness.json table — the same one the
      // embedded table was generated from — or wasm and TS results will
      // silently diverge.
      const ptr = exports.fw_apply_type_effectiveness(
        damage,
        typeId(moveType),
        typeId(defenderTypes[0]),
        typeId(defenderTypes[1]),
      );
      const view = new DataView(exports.memory.buffer, ptr, 8);
      const result = { damage: view.getInt32(0, true), multiplierTenths: view.getInt32(4, true) };
      exports.fw_free(ptr, 8);
      return result;
    },
    calculateEndeavorDamage(targetHp, userHp) {
      return exports.fw_calculate_endeavor_damage(targetHp, userHp);
    },
    resolveEndeavorDamage(targetHp, userHp, typeMultiplierTenths) {
      return exports.fw_resolve_endeavor_damage(targetHp, userHp, typeMultiplierTenths);
    },
    applyRandomDamageMultiplier(damage, rngRoll) {
      return exports.fw_apply_random_damage_multiplier(damage, rngRoll);
    },
    calculateAccuracy(input) {
      const bytes = encodeAccuracyCalcInput(input);
      return withInputBuffer(bytes, (ptr) => exports.fw_calculate_accuracy(ptr));
    },
    rollAccuracyHits(calc, rngRoll) {
      return exports.fw_roll_accuracy_hits(calc, rngRoll) !== 0;
    },
  };
}

// TYPE_NAME_BY_ID's reverse lookup (typeName) is currently unused by this
// module's own encode-only traffic but is kept public via the exported
// helpers below for callers (e.g. the parity spec) that need to go from a
// numeric TYPE_* id (as gen-damage-vectors.mjs / damage_vectors_gen.rs use)
// back to the TS engine's string form.
export { typeId, typeName };
