// The Factory AI move/switch-scoring leaf adapter: a uniform FactoryAiEngine
// interface over the TS spec engine (src/engine/factoryAiMaskSelection.ts +
// src/engine/factoryAiCheckBadMove.ts) and the factory-wasm boundary's
// fw_select_factory_ai_mask / fw_run_check_bad_move_preamble exports, so
// tests/factoryAiMaskParity.test.ts and tests/factoryAiCheckBadMoveParity.test.ts
// can run identical inputs against either without knowing which one it's
// holding. Sibling to ./damageEngine.ts/./turnEngine.ts — same M2 opt-in
// pattern (POKEBENCH_ENGINE env var, TS default, wasm opt-in), reusing
// rngEngine.ts's defaultEngineId/resolveWasmArtifactPath directly.
//
// The boundary is exactly the two module APIs factoryAiDecisionPolicy.ts
// consumes: selectFactoryAiMask and runCheckBadMovePreamble. Strings stay
// TS-side: move ids are already numeric on both sides (moves.json's own
// `id` field); species ids are already numeric on both sides
// (FactoryAiCheckBadMoveTarget.species); ability names cross as the
// numeric ids from src/data/gen/ability-item-hooks.json `.universes`
// (same ids gen_tables.rs uses); mon/move types cross as the TYPE_IDS
// table (imported from ./damageEngine.ts, the same table
// damage_calc.rs's TYPE_* consts mirror).
//
// Scoping note (mirrors damageEngine.ts's activeBattlerAbilities doc): the
// CheckBadMove draw's `reason` string and `kind: "get-ability"` tag are
// TS-only receipt sugar (factory_ai_check_bad_move.rs's module doc comment
// — reason is built from a caller-supplied `reasonPrefix` that never
// crosses the ABI at all, and `CheckBadMoveDrawSite` has no TS
// counterpart). Both engine wrappers below strip these before returning,
// so parity tests can deep-equal the wrapper's return value directly
// without a separate field-stripping step. Likewise `NotYetPorted`'s
// `effect` field would need a full EFFECT_* id<->name table this adapter
// does not build (no such id crosses the ABI on the ok path, and no real
// Gen-3 move can reach this branch now that all 109 CBM_TABLE_EFFECTS are
// handled — docs/rust-m5b-checkbadmove-batching.md §3) — both wrappers
// collapse it to the bare `{ kind: "not-yet-ported" }` tag.
//
// Buffer layouts mirror the doc comments over the corresponding fw_
// exports (crates/factory-wasm/src/lib.rs): fw_select_factory_ai_mask's
// variable-length, length-prefixed receipt/error buffer, and
// fw_run_check_bad_move_preamble's fixed 132-byte CheckBadMovePreambleInput
// input buffer / variable-length, length-prefixed scored/not-yet-ported/
// error output buffer.

import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import factoryAiPolicyData from "../../src/data/gen/factory-ai-policy.json" with { type: "json" };
import type { BattleRngState } from "../../src/engine/battleDecisionBoundary.ts";
import {
  type FactoryAiCheckBadMoveAttacker,
  type FactoryAiCheckBadMoveRoarTarget,
  type FactoryAiMonGender,
  runCheckBadMovePreamble as tsRunCheckBadMovePreamble,
} from "../../src/engine/factoryAiCheckBadMove.ts";
import {
  type FactoryAiMaskSelection,
  type FactoryAiMaskSelectionInput,
  type FactoryAiPolicyBranchId,
  selectFactoryAiMask as tsSelectFactoryAiMask,
} from "../../src/engine/factoryAiMaskSelection.ts";
import { typeId } from "./damageEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";

type SymbolIdRow = Readonly<{ name: string; id: number }>;
const ABILITY_ID_BY_NAME = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities
    .map((row) => [row.name, row.id]),
);
const ABILITY_NAME_BY_ID = new Map(
  (abilityItemHooksData as { universes: { abilities: SymbolIdRow[] } }).universes.abilities
    .map((row) => [row.id, row.name]),
);

function abilityId(name: string): number {
  const id = ABILITY_ID_BY_NAME.get(name);
  if (id === undefined) throw new Error(`factory-wasm factoryAiEngine: unknown ability ${name}`);
  return id;
}

function abilityName(id: number): string {
  const name = ABILITY_NAME_BY_ID.get(id);
  if (name === undefined) throw new Error(`factory-wasm factoryAiEngine: unknown ability id ${id}`);
  return name;
}

function genderByte(gender: FactoryAiMonGender): number {
  switch (gender) {
    case "MON_MALE":
      return 0;
    case "MON_FEMALE":
      return 1;
    case "MON_GENDERLESS":
      return 2;
  }
}

// === fw_select_factory_ai_mask ==============================================

type GeneratedPolicy = Readonly<{
  branches: readonly Readonly<{
    order: number;
    id: string;
    condition: string;
    flags: readonly string[];
    mask: number;
  }>[];
}>;
const POLICY = factoryAiPolicyData as GeneratedPolicy;
const BRANCH_IDS: readonly FactoryAiPolicyBranchId[] = [
  "tent",
  "frontierBrain",
  "challengeBelow2",
  "challengeBelow4",
  "challengeAtLeast4",
];

/** RangeError message text, mirroring `requireIntegerInRange`'s format exactly (factoryAiMaskSelection.ts:120-124) -- the value is NOT part of the message, only name/minimum/maximum, so these four are static. */
const FACTORY_AI_MASK_ERROR_MESSAGES: readonly string[] = [
  "levelMode must be an integer from 0 through 2",
  "battleMode must be an integer from 0 through 1",
  "factoryWinStreak must be an integer from 0 through 65535",
  "trainerOpponentId must be an integer from 0 through 65535",
];

export interface FactoryAiEngine {
  readonly id: "ts" | "wasm";
  selectFactoryAiMask(input: FactoryAiMaskSelectionInput): FactoryAiMaskSelection;
  runCheckBadMovePreamble(input: RunCheckBadMovePreambleInput): CbmResultView;
}

export type RunCheckBadMovePreambleInput = Readonly<{
  rng: BattleRngState;
  moveId: number;
  target: FactoryAiCheckBadMoveRoarTarget;
  attacker: FactoryAiCheckBadMoveAttacker;
  drawOrdinalStart: number;
  reasonPrefix: string;
}>;

export type CbmDrawView = Readonly<{
  ordinal: number;
  before: BattleRngState;
  after: BattleRngState;
  rawRngValue: number;
  randomValue: number;
  guessedAbility: string;
}>;

export type CbmResultView =
  | Readonly<{ kind: "scored"; rng: BattleRngState; draws: readonly CbmDrawView[]; scoreDelta: number }>
  | Readonly<{ kind: "not-yet-ported" }>;

/** Thin wrapper over the TS spec engine — the default, always-available engine. */
export function tsFactoryAiEngine(): FactoryAiEngine {
  return {
    id: "ts",
    selectFactoryAiMask: tsSelectFactoryAiMask,
    runCheckBadMovePreamble(input) {
      const result = tsRunCheckBadMovePreamble(input);
      if (result.kind === "unsupported-branch") return { kind: "not-yet-ported" };
      return {
        kind: "scored",
        rng: result.rng,
        draws: result.draws.map((d) => ({
          ordinal: d.ordinal,
          before: d.before,
          after: d.after,
          rawRngValue: d.rawRngValue,
          randomValue: d.randomValue,
          guessedAbility: d.guessedAbility,
        })),
        scoreDelta: result.scoreDelta,
      };
    },
  };
}

// --- little-endian byte cursor helpers (mirror factory-wasm/src/lib.rs's
// ByteReader/decode_cbm_target/decode_cbm_attacker: a sequential
// reader/writer rather than hardcoded per-field offset literals, since at
// ~60 fields per struct that's the real correctness risk, not the offsets
// themselves -- see fw_run_check_bad_move_preamble's doc comment for the
// full field-by-field offset table this mirrors) ---------------------------

class ByteWriter {
  private readonly view: DataView;
  private offset = 0;
  constructor(size: number) {
    this.view = new DataView(new ArrayBuffer(size));
  }
  u8(v: number): void {
    this.view.setUint8(this.offset, v);
    this.offset += 1;
  }
  bool(v: boolean): void {
    this.u8(v ? 1 : 0);
  }
  u16(v: number): void {
    this.view.setUint16(this.offset, v, true);
    this.offset += 2;
  }
  u32(v: number): void {
    this.view.setUint32(this.offset, v >>> 0, true);
    this.offset += 4;
  }
  i32(v: number): void {
    this.view.setInt32(this.offset, v, true);
    this.offset += 4;
  }
  optU8(v: number | undefined): void {
    this.bool(v !== undefined);
    this.u8(v ?? 0);
  }
  optBool(v: boolean | undefined): void {
    this.bool(v !== undefined);
    this.bool(v ?? false);
  }
  optU16(v: number | undefined): void {
    this.bool(v !== undefined);
    this.u16(v ?? 0);
  }
  optI32(v: number | undefined): void {
    this.bool(v !== undefined);
    this.i32(v ?? 0);
  }
  finish(): ArrayBuffer {
    if (this.offset !== this.view.byteLength) {
      throw new Error(
        `factory-wasm factoryAiEngine: buffer offset mismatch, wrote ${this.offset}, expected ${this.view.byteLength}`,
      );
    }
    return this.view.buffer;
  }
}

class ByteReader {
  private readonly view: DataView;
  private readonly bytes: Uint8Array;
  offset = 0;
  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  u8(): number {
    const v = this.view.getUint8(this.offset);
    this.offset += 1;
    return v;
  }
  bool(): boolean {
    return this.u8() !== 0;
  }
  u16(): number {
    const v = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return v;
  }
  u32(): number {
    const v = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }
  i32(): number {
    const v = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return v;
  }
  slice(len: number): Uint8Array {
    const s = this.bytes.subarray(this.offset, this.offset + len);
    this.offset += len;
    return s;
  }
}

const CBM_PREAMBLE_INPUT_WIDTH = 132;

function encodeCbmTarget(w: ByteWriter, t: FactoryAiCheckBadMoveRoarTarget): void {
  w.u16(t.species);
  w.u8(typeId(t.types[0]));
  w.u8(typeId(t.types[1]));
  w.optU16(t.knownAbility === null ? undefined : abilityId(t.knownAbility));
  w.u16(abilityId(t.realAbility));
  w.u8(t.speedStage);
  w.u8(t.atkStage);
  w.u8(t.defStage);
  w.u8(t.spDefStage);
  w.optU8(t.accStage);
  w.optU8(t.evasionStage);
  w.optBool(t.hasAnyStatus);
  w.optBool(t.safeguardUp);
  w.optBool(t.isConfused);
  w.optBool(t.isLeechSeeded);
  w.optBool(t.isAsleep);
  w.optBool(t.isEscapePrevented);
  w.optBool(t.isTormented);
  w.optBool(t.hasPerishSong);
  w.optBool(t.isNightmared);
  w.optBool(t.isForesighted);
  w.optBool(t.spikesUp);
  w.optBool(t.targetFutureAttackUp);
  w.optU8(t.level);
  w.optU8(t.spAtkStage);
  w.optBool(t.isInfatuated);
  w.optBool(t.anyMoveDisabled);
  w.optBool(t.anyMoveEncored);
  w.optU8(t.gender === undefined ? undefined : genderByte(t.gender));
}

function encodeCbmAttacker(w: ByteWriter, a: FactoryAiCheckBadMoveAttacker): void {
  w.u8(a.atkStage);
  w.u8(a.defStage);
  w.optU8(a.speedStage);
  w.optU8(a.spAtkStage);
  w.optU8(a.spDefStage);
  w.optBool(a.lightScreenUp);
  w.optBool(a.reflectUp);
  w.optU8(a.evasionStage);
  w.optBool(a.attackerFutureAttackUp);
  w.optBool(a.hasFocusEnergy);
  w.optBool(a.hasCurableStatus);
  w.optU8(a.currentWeather);
  w.optU8(a.level);
  w.optU8(a.isFirstTurn);
  w.optBool(a.safeguardUp);
  w.optBool(a.isAsleep);
  w.optU8(a.usablePartyMons);
  w.optBool(a.hasSubstitute);
  w.optI32(a.hp);
  w.optI32(a.maxHp);
  w.optBool(a.isRooted);
  w.optU8(a.accStage);
  w.optBool(a.mistUp);
  w.optU8(a.gender === undefined ? undefined : genderByte(a.gender));
  w.optBool(a.imprisonedOthers);
  w.optBool(a.mudSportUp);
  w.optBool(a.waterSportUp);
  w.optU16(a.usedHeldItemId);
  w.optU8(a.stockpileCount);
}

function encodeCbmPreambleInput(input: RunCheckBadMovePreambleInput): ArrayBuffer {
  const w = new ByteWriter(CBM_PREAMBLE_INPUT_WIDTH);
  w.u32(input.rng.value);
  w.u32(input.rng.calls);
  w.u16(input.moveId);
  w.u32(input.drawOrdinalStart);
  encodeCbmTarget(w, input.target);
  w.optU8(input.target.usablePartyMons);
  encodeCbmAttacker(w, input.attacker);
  return w.finish();
}

function decodeCbmResult(bytes: Uint8Array): CbmResultView {
  const r = new ByteReader(bytes);
  r.u32(); // total_len -- already used by the caller to size `bytes`.
  const status = r.u8();
  if (status === 0) {
    const rngValue = r.u32();
    const rngCalls = r.u32();
    const drawCount = r.u8();
    const draws: CbmDrawView[] = [];
    for (let i = 0; i < 3; i++) {
      const ordinal = r.u32();
      r.u8(); // site -- CheckBadMoveDrawSite has no TS counterpart, not compared.
      const beforeValue = r.u32();
      const beforeCalls = r.u32();
      const afterValue = r.u32();
      const afterCalls = r.u32();
      const rawRngValue = r.u32();
      const randomValue = r.u16();
      const guessedAbility = r.u16();
      if (i < drawCount) {
        draws.push({
          ordinal,
          before: { value: beforeValue, calls: beforeCalls },
          after: { value: afterValue, calls: afterCalls },
          rawRngValue,
          randomValue,
          guessedAbility: abilityName(guessedAbility),
        });
      }
    }
    const scoreDelta = r.i32();
    return { kind: "scored", rng: { value: rngValue, calls: rngCalls }, draws, scoreDelta };
  }
  if (status === 1) {
    return { kind: "not-yet-ported" };
  }
  if (status === 2) {
    const messageLen = r.u16();
    const messageBytes = r.slice(messageLen);
    throw new Error(new TextDecoder().decode(messageBytes));
  }
  throw new Error(`factory-wasm factoryAiEngine: unknown CheckBadMove result status ${status}`);
}

function decodeMaskSelection(bytes: Uint8Array, input: FactoryAiMaskSelectionInput): FactoryAiMaskSelection {
  const r = new ByteReader(bytes);
  r.u32(); // total_len
  const status = r.u8();
  if (status === 1) {
    const kind = r.u8();
    r.u32(); // value -- not part of TS's RangeError message text, see FACTORY_AI_MASK_ERROR_MESSAGES.
    const message = FACTORY_AI_MASK_ERROR_MESSAGES[kind];
    if (message === undefined) {
      throw new Error(`factory-wasm factoryAiEngine: unknown mask error_kind ${kind}`);
    }
    throw new RangeError(message);
  }
  if (status !== 0) {
    throw new Error(`factory-wasm factoryAiEngine: unknown mask status ${status}`);
  }

  const mask = r.u8();
  const isFrontierBrain = r.bool();
  const frontierStagesPerChallenge = r.u32();
  const hasChallengeNumber = r.bool();
  const challengeNumber = r.u32();
  const evaluationCount = r.u8();
  const evaluations: { order: number; id: FactoryAiPolicyBranchId; matched: boolean }[] = [];
  for (let i = 0; i < 5; i++) {
    const branchOrder = r.u8();
    const matched = r.bool();
    if (i < evaluationCount) {
      evaluations.push(Object.freeze({ order: branchOrder, id: BRANCH_IDS[branchOrder], matched }));
    }
  }
  const branchOrder = r.u8();
  const branch = POLICY.branches[branchOrder];

  return Object.freeze({
    mask: mask as FactoryAiMaskSelection["mask"],
    receipt: Object.freeze({
      schema: "factory-ai-mask-selection/v1" as const,
      inputs: Object.freeze({
        levelMode: input.levelMode,
        battleMode: input.battleMode,
        factoryWinStreak: input.factoryWinStreak,
        trainerOpponentId: input.trainerOpponentId,
        isFrontierBrain,
      }),
      frontierStagesPerChallenge,
      challengeNumber: hasChallengeNumber ? challengeNumber : null,
      evaluations: Object.freeze(evaluations),
      branch: Object.freeze({
        order: branch.order,
        id: BRANCH_IDS[branchOrder],
        condition: branch.condition,
        flags: Object.freeze([...branch.flags]),
        mask: branch.mask as FactoryAiMaskSelection["mask"],
      }),
    }),
  });
}

/**
 * Wraps the factory-wasm boundary's `fw_select_factory_ai_mask` /
 * `fw_run_check_bad_move_preamble` exports as a `FactoryAiEngine`. Per-call:
 * for `fw_run_check_bad_move_preamble`'s buffer input, write the encoded
 * input into a scratch region carved out of wasm linear memory via
 * `fw_alloc` and free it again once the (synchronous) call returns —
 * mirrors `wasmDamageEngine`'s `withInputBuffer` exactly. Both exports'
 * outputs are length-prefixed `fw_alloc`'d buffers: peek `total_len` from
 * the first 4 bytes, copy exactly that many bytes out via `.slice()`, then
 * `fw_free` — mirrors `wasmFactoryEngine`'s decode calls in
 * `./factoryEngine.ts`.
 */
export async function wasmFactoryAiEngine(): Promise<FactoryAiEngine> {
  const exports = await loadFactoryWasm();

  function copyOutAllocdBuffer(ptr: number): Uint8Array {
    const totalLen = new DataView(exports.memory.buffer, ptr, 4).getUint32(0, true);
    const bytes = new Uint8Array(exports.memory.buffer, ptr, totalLen).slice();
    exports.fw_free(ptr, totalLen);
    return bytes;
  }

  return {
    id: "wasm",
    selectFactoryAiMask(input) {
      const ptr = exports.fw_select_factory_ai_mask(
        input.levelMode,
        input.battleMode,
        input.factoryWinStreak,
        input.trainerOpponentId,
      );
      return decodeMaskSelection(copyOutAllocdBuffer(ptr), input);
    },
    runCheckBadMovePreamble(input) {
      const encoded = encodeCbmPreambleInput(input);
      const inputPtr = exports.fw_alloc(encoded.byteLength);
      let ptr: number;
      try {
        new Uint8Array(exports.memory.buffer, inputPtr, encoded.byteLength).set(new Uint8Array(encoded));
        ptr = exports.fw_run_check_bad_move_preamble(inputPtr);
      } finally {
        exports.fw_free(inputPtr, encoded.byteLength);
      }
      return decodeCbmResult(copyOutAllocdBuffer(ptr));
    },
  };
}
