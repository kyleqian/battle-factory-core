// The Battle Factory initial-rental generation adapter: decodes the
// fw_generate_initial_rentals wasm buffer into EXACTLY the TS spec engine's
// FactoryInitialRentalGenerationResult shape (src/engine/factoryRentalGeneration.ts),
// so tests/factoryRentalParity.test.ts can assert deep toEqual between the
// TS engine and the factory-wasm engine on identical inputs.
//
// Follows the M2 pattern in ./rngEngine.ts: a thin wrapper over
// ./loadFactoryWasm.ts, loaded once and reused. Engine selection
// (POKEBENCH_ENGINE, wasm-artifact availability) is generic and lives in
// rngEngine.ts's defaultEngineId/resolveWasmArtifactPath — the parity spec
// reuses those directly rather than duplicating them here.
//
// Buffer layout is documented in the doc comment over
// `fw_generate_initial_rentals` (crates/factory-wasm/src/lib.rs); the
// offset constants below mirror it field-for-field. `position` is not
// encoded per ledger entry — it always equals the entry's index in
// `draw_ledger` (both engines push entries strictly in order), so the
// decoder reconstructs it from the loop index instead of spending 4 bytes
// per entry on a derivable value.

import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import frontierHeldItemsData from "../../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import naturesData from "../../src/data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };
import type { BattleScriptIvs } from "../../src/engine/battleScriptRulesContext.ts";
import type {
  FactoryCorpusEvs,
  FactoryCorpusPartyInstance,
  FactoryCorpusPartyMemberState,
  FactoryCorpusPpUps,
} from "../../src/engine/factoryCorpusParty.ts";
import type {
  FactoryInitialRentalGenerationInput,
  FactoryInitialRentalGenerationResult,
  FactoryInitialRentalRecord,
  FactoryRentalDrawLedgerEntry,
} from "../../src/engine/factoryRentalGeneration.ts";
import type { MonGender } from "../../src/engine/monGender.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { packMonDataIvs } from "./monDataIvs.ts";

type SpeciesRow = Readonly<{ id: number; name: string }>;
const SPECIES_NAME_BY_ID = new Map(
  (speciesStatsData as unknown as { species: SpeciesRow[] }).species.map((row) => [row.id, row.name]),
);

function speciesNameForId(speciesId: number): string {
  const name = SPECIES_NAME_BY_ID.get(speciesId);
  if (name === undefined) throw new Error(`factory-wasm: unknown Factory species id ${speciesId}`);
  return name;
}

type SymbolIdRow = Readonly<{ name: string; id: number }>;
const ABILITY_NAME_BY_ID = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities
    .map((row) => [row.id, row.name]),
);
const HOLD_EFFECT_NAME_BY_ID = new Map(
  (abilityItemHooksData as { universes: { holdEffects: SymbolIdRow[] } }).universes.holdEffects
    .map((row) => [row.id, row.name]),
);

function abilityNameForId(abilityId: number): string {
  const name = ABILITY_NAME_BY_ID.get(abilityId);
  if (name === undefined) throw new Error(`factory-wasm: unknown ability id ${abilityId}`);
  return name;
}

function holdEffectNameForId(holdEffectId: number): string {
  const name = HOLD_EFFECT_NAME_BY_ID.get(holdEffectId);
  if (name === undefined) throw new Error(`factory-wasm: unknown hold effect id ${holdEffectId}`);
  return name;
}

type HeldItemRow = Readonly<{ itemId: number; item: string }>;
const ITEM_NAME_BY_ID = new Map(
  (frontierHeldItemsData as { entries: HeldItemRow[] }).entries.map((row) => [row.itemId, row.item]),
);

function itemNameForId(itemId: number): string {
  const name = ITEM_NAME_BY_ID.get(itemId);
  if (name === undefined) throw new Error(`factory-wasm: unknown Factory held item id ${itemId}`);
  return name;
}

type NatureRow = Readonly<{ index: number; name: string }>;
const NATURE_NAME_BY_INDEX = new Map(
  (naturesData as { natures: NatureRow[] }).natures.map((row) => [row.index, row.name]),
);

function natureNameForIndex(nature: number): string {
  const name = NATURE_NAME_BY_INDEX.get(nature);
  if (name === undefined) throw new Error(`factory-wasm: unknown nature index ${nature}`);
  return name;
}

const MON_GENDER_NAMES = ["male", "female", "genderless"] as const satisfies readonly MonGender[];

function monGenderForByte(byte: number): MonGender {
  const gender = MON_GENDER_NAMES[byte];
  if (gender === undefined) throw new Error(`factory-wasm: unknown gender byte ${byte}`);
  return gender;
}

// Discriminant order is the Rust `Phase`/`Purpose` enums'
// (crates/factory-core/src/rental_generation.rs); these are byte-indexed.
const PHASE_NAMES = ["set-selection", "personality", "random-ivs"] as const;
const PURPOSE_NAMES = [
  "set-candidate", "personality-low", "personality-high",
  "random-ivs-low", "random-ivs-high",
] as const;
const SELECTION_OUTCOME_NAMES = [
  "accepted", "unown", "duplicate-set", "duplicate-species", "duplicate-item",
] as const;
const PERSONALITY_OUTCOME_NAMES = ["accepted", "wrong-nature"] as const;

const HEADER_STATUS_OFFSET = 4;
const ERROR_MESSAGE_LEN_OFFSET = 5;
const ERROR_MESSAGE_OFFSET = 7;

const OK_CHALLENGE_NUM_OFFSET = 5;
const OK_RENTAL_RANK_OFFSET = 9;
const OK_SELECTION_RNG_VALUE_OFFSET = 10;
const OK_RNG_VALUE_OFFSET = 14;
const OK_RENTALS_OFFSET = 18;
const RENTAL_RECORD_WIDTH = 29;
const RENTAL_IVS_OFFSET = 23;
const RENTALS_COUNT = 6;
const LEDGER_COUNT_OFFSET = OK_RENTALS_OFFSET + RENTAL_RECORD_WIDTH * RENTALS_COUNT; // 192
const LEDGER_ENTRIES_OFFSET = LEDGER_COUNT_OFFSET + 4; // 196
const LEDGER_ENTRY_WIDTH = 26;

function lookupOrThrow<T>(names: readonly T[], byte: number, what: string): T {
  const value = names[byte];
  if (value === undefined) throw new Error(`factory-wasm: unknown ${what} byte ${byte}`);
  return value;
}

/**
 * Decodes an `fw_generate_initial_rentals` buffer (already copied out of
 * wasm linear memory — see `wasmFactoryEngine` below) into the same shape
 * `generateInitialFactoryRentals` returns, or throws the decoded `Error`
 * message on the wasm side's error status, mirroring the TS engine's own
 * throws (`src/engine/factoryRentalGeneration.ts`).
 */
export function decodeRentalGeneration(bytes: Uint8Array): FactoryInitialRentalGenerationResult {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalLen = view.getUint32(0, true);
  if (totalLen !== bytes.byteLength) {
    throw new Error(`factory-wasm: buffer length mismatch, header says ${totalLen}, got ${bytes.byteLength}`);
  }
  const status = view.getUint8(HEADER_STATUS_OFFSET);
  if (status === 1) {
    const messageLen = view.getUint16(ERROR_MESSAGE_LEN_OFFSET, true);
    const messageBytes = bytes.subarray(ERROR_MESSAGE_OFFSET, ERROR_MESSAGE_OFFSET + messageLen);
    throw new Error(new TextDecoder().decode(messageBytes));
  }
  if (status !== 0) {
    throw new Error(`factory-wasm: unknown status byte ${status}`);
  }

  const challengeNum = view.getUint32(OK_CHALLENGE_NUM_OFFSET, true);
  const rentalRank = view.getUint8(OK_RENTAL_RANK_OFFSET);
  const selectionRngValue = view.getUint32(OK_SELECTION_RNG_VALUE_OFFSET, true) >>> 0;
  const rngValue = view.getUint32(OK_RNG_VALUE_OFFSET, true) >>> 0;

  const rentals: FactoryInitialRentalRecord[] = [];
  for (let i = 0; i < RENTALS_COUNT; i++) {
    const offset = OK_RENTALS_OFFSET + i * RENTAL_RECORD_WIDTH;
    const speciesId = view.getUint16(offset + 12, true);
    const personalityDrawPositions: readonly [number, number] = [
      view.getUint16(offset + 19, true),
      view.getUint16(offset + 21, true),
    ];
    rentals.push(Object.freeze({
      setId: view.getUint16(offset, true),
      personality: view.getUint32(offset + 2, true) >>> 0,
      // The record's fixed_iv is the constructed mon's ATK IV, i.e. always
      // ivs[1] (battle_factory_screen.c:1824), not the fixed-IV argument.
      fixedIv: view.getUint8(offset + 6),
      ivs: readSixU8(view, offset + RENTAL_IVS_OFFSET),
      abilitySlot: view.getUint8(offset + 7) as 0 | 1,
      otId: view.getUint32(offset + 8, true) >>> 0,
      speciesName: speciesNameForId(speciesId),
      itemId: view.getUint16(offset + 14, true),
      nature: view.getUint8(offset + 16),
      selectionDrawPosition: view.getUint16(offset + 17, true),
      personalityDrawPositions,
    }));
  }

  const ledgerCount = view.getUint32(LEDGER_COUNT_OFFSET, true);
  const drawLedger: FactoryRentalDrawLedgerEntry[] = [];
  for (let i = 0; i < ledgerCount; i++) {
    const offset = LEDGER_ENTRIES_OFFSET + i * LEDGER_ENTRY_WIDTH;
    const phase = lookupOrThrow(PHASE_NAMES, view.getUint8(offset), "phase");
    const purpose = lookupOrThrow(PURPOSE_NAMES, view.getUint8(offset + 1), "purpose");
    const base = {
      position: i,
      phase,
      rentalIndex: view.getUint8(offset + 2),
      purpose,
      rngBefore: view.getUint32(offset + 3, true) >>> 0,
      rngAfter: view.getUint32(offset + 7, true) >>> 0,
      randomU16: view.getUint16(offset + 11, true),
    };

    if (phase === "set-selection") {
      drawLedger.push(Object.freeze({
        ...base,
        range: Object.freeze({
          start: view.getUint16(offset + 13, true),
          end: view.getUint16(offset + 15, true),
        }),
        betterRange: view.getUint8(offset + 17) !== 0,
        candidateSetId: view.getUint16(offset + 18, true),
        selectionOutcome: lookupOrThrow(SELECTION_OUTCOME_NAMES, view.getUint8(offset + 20), "selection outcome"),
      }));
    } else if (phase === "random-ivs") {
      // CreateBoxMon's two IV words populate NEITHER optional group: the
      // drawn word is the entry's whole payload, and the three 5-bit fields
      // it carries are already decoded into the record's `ivs`.
      drawLedger.push(Object.freeze({ ...base }));
    } else {
      drawLedger.push(Object.freeze({
        ...base,
        personality: view.getUint32(offset + 21, true) >>> 0,
        personalityOutcome: lookupOrThrow(
          PERSONALITY_OUTCOME_NAMES, view.getUint8(offset + 25), "personality outcome",
        ),
      }));
    }
  }

  return Object.freeze({
    challengeNum,
    rentalRank,
    rentals: Object.freeze(rentals),
    selectionRngValue,
    rngValue,
    drawLedger: Object.freeze(drawLedger),
  });
}

// --- fw_create_factory_party_member decoding -------------------------------
//
// Buffer layout is documented in the doc comment over
// `fw_create_factory_party_member` (crates/factory-wasm/src/lib.rs); the
// offset constants below mirror it field-for-field. Name fields
// (speciesName/abilityName/natureName/itemName/holdEffectName) are resolved
// here from the same JSONs the TS engine reads, exactly like
// `speciesNameForId` above does for `RentalRecord`.

const MEMBER_SET_ID_OFFSET = 5;
const MEMBER_SPECIES_ID_OFFSET = 7;
const MEMBER_IS_EGG_OFFSET = 9;
const MEMBER_ABILITY_NUM_OFFSET = 10;
const MEMBER_ABILITY_SLOT_OFFSET = 11;
const MEMBER_ABILITY_OFFSET = 12;
const MEMBER_IVS_OFFSET = 14;
const MEMBER_PERSONALITY_OFFSET = 20;
const MEMBER_EXPERIENCE_OFFSET = 24;
const MEMBER_LEVEL_OFFSET = 28;
const MEMBER_FRIENDSHIP_OFFSET = 29;
const MEMBER_MAX_HP_OFFSET = 30;
const MEMBER_ATTACK_OFFSET = 34;
const MEMBER_DEFENSE_OFFSET = 38;
const MEMBER_SPEED_OFFSET = 42;
const MEMBER_SP_ATTACK_OFFSET = 46;
const MEMBER_SP_DEFENSE_OFFSET = 50;
const MEMBER_HP_OFFSET = 54;
const MEMBER_STATUS1_OFFSET = 58;
const MEMBER_ITEM_ID_OFFSET = 59;
const MEMBER_HOLD_EFFECT_OFFSET = 61;
const MEMBER_HOLD_EFFECT_PARAM_OFFSET = 63;
const MEMBER_MOVES_OFFSET = 64;
const MEMBER_PP_OFFSET = 72;
const MEMBER_PP_BONUSES_OFFSET = 76;
const MEMBER_PP_UPS_OFFSET = 77;
const MEMBER_NATURE_OFFSET = 81;
const MEMBER_EVS_OFFSET = 82;
const MEMBER_GENDER_OFFSET = 94;
const MEMBER_SHINY_OFFSET = 95;

function readSixU8(view: DataView, offset: number): BattleScriptIvs {
  const [hp, attack, defense, speed, spAttack, spDefense] = Array.from(
    { length: 6 }, (_, i) => view.getUint8(offset + i),
  );
  return Object.freeze({ hp, attack, defense, speed, spAttack, spDefense } as BattleScriptIvs);
}

function readSixU16(view: DataView, offset: number): FactoryCorpusEvs {
  const [hp, attack, defense, speed, spAttack, spDefense] = Array.from(
    { length: 6 }, (_, i) => view.getUint16(offset + i * 2, true),
  );
  return Object.freeze({ hp, attack, defense, speed, spAttack, spDefense } as FactoryCorpusEvs);
}

/**
 * Decodes an `fw_create_factory_party_member` buffer (already copied out of
 * wasm linear memory — see `wasmFactoryEngine` below) into EXACTLY
 * `createFactoryCorpusPartyMember`'s `FactoryCorpusPartyMemberState` shape
 * (`src/engine/factoryCorpusParty.ts`), or throws the decoded `Error`
 * message on the wasm side's error status, mirroring the TS engine's own
 * throws.
 */
export function decodeFactoryPartyMember(bytes: Uint8Array): FactoryCorpusPartyMemberState {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalLen = view.getUint32(0, true);
  if (totalLen !== bytes.byteLength) {
    throw new Error(`factory-wasm: buffer length mismatch, header says ${totalLen}, got ${bytes.byteLength}`);
  }
  const status = view.getUint8(HEADER_STATUS_OFFSET);
  if (status === 1) {
    const messageLen = view.getUint16(ERROR_MESSAGE_LEN_OFFSET, true);
    const messageBytes = bytes.subarray(ERROR_MESSAGE_OFFSET, ERROR_MESSAGE_OFFSET + messageLen);
    throw new Error(new TextDecoder().decode(messageBytes));
  }
  if (status !== 0) {
    throw new Error(`factory-wasm: unknown status byte ${status}`);
  }

  const setId = view.getUint16(MEMBER_SET_ID_OFFSET, true);
  const speciesId = view.getUint16(MEMBER_SPECIES_ID_OFFSET, true);
  const abilitySlot = view.getUint8(MEMBER_ABILITY_SLOT_OFFSET) as 0 | 1;
  const ability = view.getUint16(MEMBER_ABILITY_OFFSET, true);
  const itemId = view.getUint16(MEMBER_ITEM_ID_OFFSET, true);
  const holdEffect = view.getUint16(MEMBER_HOLD_EFFECT_OFFSET, true);
  const nature = view.getUint8(MEMBER_NATURE_OFFSET);
  const moves = [
    view.getUint16(MEMBER_MOVES_OFFSET, true),
    view.getUint16(MEMBER_MOVES_OFFSET + 2, true),
    view.getUint16(MEMBER_MOVES_OFFSET + 4, true),
    view.getUint16(MEMBER_MOVES_OFFSET + 6, true),
  ] as const;
  const pp = [
    view.getUint8(MEMBER_PP_OFFSET),
    view.getUint8(MEMBER_PP_OFFSET + 1),
    view.getUint8(MEMBER_PP_OFFSET + 2),
    view.getUint8(MEMBER_PP_OFFSET + 3),
  ] as const;
  const ppUps: FactoryCorpusPpUps = [
    view.getUint8(MEMBER_PP_UPS_OFFSET),
    view.getUint8(MEMBER_PP_UPS_OFFSET + 1),
    view.getUint8(MEMBER_PP_UPS_OFFSET + 2),
    view.getUint8(MEMBER_PP_UPS_OFFSET + 3),
  ];

  return Object.freeze({
    setId,
    species: speciesId,
    speciesName: speciesNameForId(speciesId),
    isEgg: view.getUint8(MEMBER_IS_EGG_OFFSET) !== 0,
    abilityNum: view.getUint8(MEMBER_ABILITY_NUM_OFFSET),
    abilitySlot,
    ability,
    abilityName: abilityNameForId(ability),
    ivs: readSixU8(view, MEMBER_IVS_OFFSET),
    personality: view.getUint32(MEMBER_PERSONALITY_OFFSET, true) >>> 0,
    experience: view.getUint32(MEMBER_EXPERIENCE_OFFSET, true) >>> 0,
    level: view.getUint8(MEMBER_LEVEL_OFFSET),
    friendship: view.getUint8(MEMBER_FRIENDSHIP_OFFSET),
    maxHP: view.getUint32(MEMBER_MAX_HP_OFFSET, true) >>> 0,
    attack: view.getUint32(MEMBER_ATTACK_OFFSET, true) >>> 0,
    defense: view.getUint32(MEMBER_DEFENSE_OFFSET, true) >>> 0,
    speed: view.getUint32(MEMBER_SPEED_OFFSET, true) >>> 0,
    spAttack: view.getUint32(MEMBER_SP_ATTACK_OFFSET, true) >>> 0,
    spDefense: view.getUint32(MEMBER_SP_DEFENSE_OFFSET, true) >>> 0,
    hp: view.getUint32(MEMBER_HP_OFFSET, true) >>> 0,
    status1: view.getUint8(MEMBER_STATUS1_OFFSET),
    item: itemId,
    itemName: itemNameForId(itemId),
    holdEffect,
    holdEffectName: holdEffectNameForId(holdEffect),
    holdEffectParam: view.getUint8(MEMBER_HOLD_EFFECT_PARAM_OFFSET),
    moves,
    pp,
    ppBonuses: view.getUint8(MEMBER_PP_BONUSES_OFFSET),
    ppUps,
    nature,
    natureName: natureNameForIndex(nature),
    evs: readSixU16(view, MEMBER_EVS_OFFSET),
    gender: monGenderForByte(view.getUint8(MEMBER_GENDER_OFFSET)),
    shiny: view.getUint8(MEMBER_SHINY_OFFSET) !== 0,
  }) as unknown as FactoryCorpusPartyMemberState;
}

export interface FactoryEngine {
  readonly id: "wasm";
  generateInitialFactoryRentals(
    input: FactoryInitialRentalGenerationInput,
  ): FactoryInitialRentalGenerationResult;
  createFactoryCorpusPartyMember(instance: FactoryCorpusPartyInstance): FactoryCorpusPartyMemberState;
  createFactoryCorpusParty(
    instances: readonly [FactoryCorpusPartyInstance, FactoryCorpusPartyInstance, FactoryCorpusPartyInstance],
  ): readonly [FactoryCorpusPartyMemberState, FactoryCorpusPartyMemberState, FactoryCorpusPartyMemberState];
}

/**
 * Wraps the factory-wasm boundary's `fw_generate_initial_rentals` /
 * `fw_create_factory_party_member` as a `FactoryEngine`. Per-call: invoke
 * the export, then IMMEDIATELY re-derive a `DataView`/`Uint8Array` over
 * `exports.memory.buffer` (wasm memory may grow during the call, detaching
 * any view taken beforehand), copy the whole buffer out via `.slice()`
 * before freeing it, and only then decode — `fw_free` invalidates the
 * pointer, so nothing may read through it after.
 */
export async function wasmFactoryEngine(): Promise<FactoryEngine> {
  const exports = await loadFactoryWasm();
  function createFactoryCorpusPartyMember(instance: FactoryCorpusPartyInstance): FactoryCorpusPartyMemberState {
    const ptr = instance.ivs === undefined
      ? exports.fw_create_factory_party_member(
        instance.setId >>> 0,
        instance.personality >>> 0,
        instance.fixedIv >>> 0,
        instance.abilitySlot >>> 0,
        (instance.otId ?? 0) >>> 0,
      )
      : exports.fw_create_factory_party_member_with_ivs(
        instance.setId >>> 0,
        instance.personality >>> 0,
        packMonDataIvs(instance.ivs),
        instance.abilitySlot >>> 0,
        (instance.otId ?? 0) >>> 0,
      );
    const totalLen = new DataView(exports.memory.buffer, ptr, 4).getUint32(0, true);
    const bytes = new Uint8Array(exports.memory.buffer, ptr, totalLen).slice();
    exports.fw_free(ptr, totalLen);
    return decodeFactoryPartyMember(bytes);
  }
  return {
    id: "wasm",
    generateInitialFactoryRentals(input) {
      const hasConstructionRng = input.constructionRngValue === undefined ? 0 : 1;
      const ptr = exports.fw_generate_initial_rentals(
        input.rngValue >>> 0,
        input.factoryWinStreak >>> 0,
        input.rentsCount >>> 0,
        input.playerTrainerId >>> 0,
        hasConstructionRng,
        (input.constructionRngValue ?? 0) >>> 0,
      );
      const totalLen = new DataView(exports.memory.buffer, ptr, 4).getUint32(0, true);
      const bytes = new Uint8Array(exports.memory.buffer, ptr, totalLen).slice();
      exports.fw_free(ptr, totalLen);
      return decodeRentalGeneration(bytes);
    },
    createFactoryCorpusPartyMember,
    createFactoryCorpusParty(instances) {
      return instances.map(createFactoryCorpusPartyMember) as unknown as readonly [
        FactoryCorpusPartyMemberState,
        FactoryCorpusPartyMemberState,
        FactoryCorpusPartyMemberState,
      ];
    },
  };
}
