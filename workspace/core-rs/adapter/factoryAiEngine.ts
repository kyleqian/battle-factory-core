// The Factory AI move/switch-scoring leaf adapter: a uniform FactoryAiEngine
// interface over the TS spec engine (src/engine/factoryAiMaskSelection.ts +
// src/engine/factoryAiCheckBadMove.ts + src/engine/factoryAiCheckViability.ts)
// and the factory-wasm boundary's fw_select_factory_ai_mask /
// fw_run_check_bad_move_preamble / fw_run_check_viability exports, so the
// three Factory-AI parity suites can run identical inputs against either
// without knowing which one it's holding. Sibling to
// ./damageEngine.ts/./turnEngine.ts — same M2 opt-in
// pattern (POKEBENCH_ENGINE env var, TS default, wasm opt-in), reusing
// rngEngine.ts's defaultEngineId/resolveWasmArtifactPath directly.
//
// The boundary is exactly the three module APIs factoryAiDecisionPolicy.ts
// consumes: selectFactoryAiMask, runCheckBadMovePreamble, and
// runCheckViability. Strings stay
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
// error output buffer, and fw_run_check_viability's self-describing
// presence-preserving input / variable-length result buffer.

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
  type FactoryAiCheckViabilityBattler,
  type FactoryAiCheckViabilityDraw,
  type FactoryAiCheckViabilityResult,
  MOVES_BY_ID,
  runCheckViability as tsRunCheckViability,
} from "../../src/engine/factoryAiCheckViability.ts";
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
  runCheckViability(input: RunCheckViabilityInput): CvResultView;
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

/** The complete public CheckViability result, including receipt strings. */
export type CvResultView = FactoryAiCheckViabilityResult;

/** The exact runCheckViability argument object; `reasonPrefix` crosses too. */
export type RunCheckViabilityInput = Parameters<typeof tsRunCheckViability>[0];

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
    runCheckViability: tsRunCheckViability,
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
  bytes(v: Uint8Array): void {
    new Uint8Array(this.view.buffer, this.offset, v.byteLength).set(v);
    this.offset += v.byteLength;
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
  optU32(v: number | undefined): void {
    this.bool(v !== undefined);
    this.u32(v ?? 0);
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
  utf8(len: number): string {
    return new TextDecoder().decode(this.slice(len));
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

// === fw_run_check_viability ================================================
//
// ABI-v1 layout, all little-endian. The input is self-describing solely for
// `reasonPrefix`, whose UTF-8 byte length follows the two fixed battlers:
//
//   0  u32 rng.value                 4  u32 rng.calls
//   8  u16 moveId                   10  opt_u8 staleFuncResultFallback
//  12  u32 drawOrdinalStart         16  attacker (108 bytes)
// 124  target (108 bytes)          232  u32 reasonPrefix UTF-8 byte length
// 236  reasonPrefix UTF-8 bytes; total input width = 236 + that length.
//
// Each 108-byte `FactoryAiCheckViabilityBattler` is in the Rust declaration
// order, so all 31 optionals retain *presence* rather than being resolved to
// TS defaults here. Relative offsets: speed 0/u32; speedStage 4; types 5..7;
// isFirstTurn 7; evasion/acc/atk/def/spDef stages 8..13; hp 13/i32; maxHp
// 17/i32; spAtkStage 21/opt_u8; lastUsedMoveId 23/opt_u16; toxic 26/opt_bool;
// leechSeeded 28/opt_bool; rooted 30/opt_bool; cursed 32/opt_bool; ability
// 34/opt_u16; weather 37/opt_u8; moves 39/opt_[u16;4]; battleTurnCount
// 48/opt_u32; knownMoves 53/opt_[u16;4]; infatuated/asleep/confused/taunted/
// yawn/perishSong/protectUses/sideReflect/poisoned/burned/paralyzed/substitute/
// anyMoveDisabled/anyStatus/targetPartyStatusEqualsAny at 62,64,66,68,70,72,
// 74,76,78,80,82,84,86,88,90 respectively (all opt_bool except protectUses
// opt_u8); holdEffect 92/opt_u16; speciesAbilities 95/opt_[u16;2];
// knownAbility 100/opt_u16; usedHeldItemId 103/opt_u16; stockpileCount
// 106/opt_u8. `opt_T` is exactly presence:u8 + T, with an ignored zero value
// when absent. The Rust export documents the same table beside its decoder.

const CV_BATTLER_WIDTH = 108;
const CV_INPUT_FIXED_WIDTH = 16 + (2 * CV_BATTLER_WIDTH) + 4;

function encodeCvBattler(w: ByteWriter, b: FactoryAiCheckViabilityBattler): void {
  w.u32(b.speed);
  w.u8(b.speedStage);
  w.u8(typeId(b.types[0]));
  w.u8(typeId(b.types[1]));
  w.u8(b.isFirstTurn);
  w.u8(b.evasionStage);
  w.u8(b.accStage);
  w.u8(b.atkStage);
  w.u8(b.defStage);
  w.u8(b.spDefStage);
  w.i32(b.hp);
  w.i32(b.maxHp);
  w.optU8(b.spAtkStage);
  w.optU16(b.lastUsedMoveId);
  w.optBool(b.isToxicPoisoned);
  w.optBool(b.isLeechSeeded);
  w.optBool(b.isRooted);
  w.optBool(b.isCursed);
  w.optU16(b.ability === undefined ? undefined : abilityId(b.ability));
  w.optU8(b.currentWeather);
  w.bool(b.moves !== undefined);
  for (let i = 0; i < 4; i++) w.u16(b.moves?.[i] ?? 0);
  w.optU32(b.battleTurnCount);
  w.bool(b.knownMoves !== undefined);
  for (let i = 0; i < 4; i++) w.u16(b.knownMoves?.[i] ?? 0);
  w.optBool(b.isInfatuated);
  w.optBool(b.isAsleep);
  w.optBool(b.isConfused);
  w.optBool(b.isTaunted);
  w.optBool(b.hasYawn);
  w.optBool(b.hasPerishSong);
  w.optU8(b.protectUses);
  w.optBool(b.hasSideReflect);
  w.optBool(b.isPoisoned);
  w.optBool(b.isBurned);
  w.optBool(b.isParalyzed);
  w.optBool(b.hasSubstitute);
  w.optBool(b.anyMoveDisabled);
  w.optBool(b.hasAnyStatus);
  w.optBool(b.targetPartyStatusEqualsAny);
  w.optU16(b.holdEffect);
  w.bool(b.speciesAbilities !== undefined);
  w.u16(b.speciesAbilities === undefined ? 0 : abilityId(b.speciesAbilities[0]));
  w.u16(b.speciesAbilities === undefined ? 0 : abilityId(b.speciesAbilities[1]));
  w.optU16(
    b.knownAbility === undefined || b.knownAbility === null ? undefined : abilityId(b.knownAbility),
  );
  w.optU16(b.usedHeldItemId);
  w.optU8(b.stockpileCount);
}

function encodeCvInput(input: RunCheckViabilityInput): ArrayBuffer {
  const reasonBytes = new TextEncoder().encode(input.reasonPrefix);
  const w = new ByteWriter(CV_INPUT_FIXED_WIDTH + reasonBytes.byteLength);
  w.u32(input.rng.value);
  w.u32(input.rng.calls);
  w.u16(input.moveId);
  w.optU8(input.staleFuncResultFallback);
  w.u32(input.drawOrdinalStart);
  encodeCvBattler(w, input.attacker);
  encodeCvBattler(w, input.target);
  w.u32(reasonBytes.byteLength);
  w.bytes(reasonBytes);
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

// `fw_run_check_viability` output is length-prefixed at 0 and carries either
// an exact scored receipt or the same error/not-yet-ported surface as the TS
// leaf. A scored header is: status:u8 at 4, rng.value:u32 at 5,
// rng.calls:u32 at 9, scoreDelta:i32 at 13, funcResultAfter presence/value
// bytes at 17/18, and drawCount:u8 at 19. Each active draw then has
// ordinal:u32, before.value/calls:u32/u32, after.value/calls:u32/u32,
// rawRngValue:u32, randomValue:u16, kindLength:u32 + UTF-8 kind,
// reasonLength:u32 + UTF-8 reason, extraTag:u8, extraValue:u16. `extraTag`
// is 1=strikesFirst, 2=jumped, 3=jumpedToEnd, 4=succeeded, or
// 5=guessedAbility (the first four use 0/1-or-2 in extraValue). The Rust
// export owns the literal kind/reason reconstruction so this decoder never
// reruns any CheckViability branch logic.

function decodeCvResult(bytes: Uint8Array): CvResultView {
  const r = new ByteReader(bytes);
  r.u32(); // total_len -- already used by the caller to size `bytes`.
  const status = r.u8();
  if (status === 0) {
    const rng = { value: r.u32(), calls: r.u32() };
    const scoreDelta = r.i32();
    const hasFuncResultAfter = r.bool();
    const funcResultAfter = r.u8();
    const drawCount = r.u8();
    const draws: FactoryAiCheckViabilityDraw[] = [];
    for (let i = 0; i < drawCount; i++) {
      const ordinal = r.u32();
      const before = { value: r.u32(), calls: r.u32() };
      const after = { value: r.u32(), calls: r.u32() };
      const rawRngValue = r.u32();
      const randomValue = r.u16();
      const kind = r.utf8(r.u32());
      const reason = r.utf8(r.u32());
      const extraTag = r.u8();
      const extraValue = r.u16();
      const common = { ordinal, reason, kind, before, after, rawRngValue, randomValue };
      let draw: unknown;
      switch (extraTag) {
        case 1:
          draw = { ...common, strikesFirst: extraValue };
          break;
        case 2:
          draw = { ...common, jumped: extraValue !== 0 };
          break;
        case 3:
          draw = { ...common, jumpedToEnd: extraValue !== 0 };
          break;
        case 4:
          draw = { ...common, succeeded: extraValue !== 0 };
          break;
        case 5:
          draw = { ...common, guessedAbility: abilityName(extraValue) };
          break;
        default:
          throw new Error(`factory-wasm factoryAiEngine: unknown CheckViability draw extra tag ${extraTag}`);
      }
      draws.push(draw as FactoryAiCheckViabilityDraw);
    }
    return {
      kind: "scored",
      rng,
      draws,
      scoreDelta,
      funcResultAfter: hasFuncResultAfter ? (funcResultAfter as 0 | 1 | 2 | 3) : undefined,
    };
  }
  if (status === 1) {
    const effectId = r.u16();
    const moveId = r.u16();
    const effect = MOVES_BY_ID.get(moveId)?.effect ?? `effect-id-${effectId}`;
    return {
      kind: "unsupported-branch",
      barrier: "factory-ai-check-viability",
      effect,
      moveId,
    } as CvResultView;
  }
  if (status === 2) {
    throw new Error(r.utf8(r.u32()));
  }
  throw new Error(`factory-wasm factoryAiEngine: unknown CheckViability result status ${status}`);
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
 * `fw_run_check_bad_move_preamble` / `fw_run_check_viability` exports as a
 * `FactoryAiEngine`. Per-call, write each encoded buffer input into a scratch
 * region carved out of wasm linear memory via
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
    runCheckViability(input) {
      const encoded = encodeCvInput(input);
      const inputPtr = exports.fw_alloc(encoded.byteLength);
      let ptr: number;
      try {
        new Uint8Array(exports.memory.buffer, inputPtr, encoded.byteLength).set(new Uint8Array(encoded));
        ptr = exports.fw_run_check_viability(inputPtr, encoded.byteLength);
      } finally {
        exports.fw_free(inputPtr, encoded.byteLength);
      }
      return decodeCvResult(copyOutAllocdBuffer(ptr));
    },
  };
}
