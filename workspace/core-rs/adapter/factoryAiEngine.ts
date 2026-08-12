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
  MOVES_BY_ID,
  runCheckBadMovePreamble as tsRunCheckBadMovePreamble,
} from "../../src/engine/factoryAiCheckBadMove.ts";
import {
  type FactoryAiCheckViabilityBattler,
  type FactoryAiCheckViabilityDraw,
  type FactoryAiCheckViabilityResult,
  runCheckViability as tsRunCheckViability,
} from "../../src/engine/factoryAiCheckViability.ts";
import {
  type FactoryAiMaskSelection,
  type FactoryAiMaskSelectionInput,
  type FactoryAiPolicyBranchId,
  selectFactoryAiMask as tsSelectFactoryAiMask,
} from "../../src/engine/factoryAiMaskSelection.ts";
import {
  chooseFactoryAiMaskZeroDecision as tsChooseFactoryAiMaskZeroDecision,
  chooseFactoryAiScoredDecision as tsChooseFactoryAiScoredDecision,
  type FactoryAiDecisionChoice,
  type FactoryAiScoredBattlerView,
  type FactoryAiScoredChoice,
} from "../../src/engine/factoryAiDecisionPolicy.ts";
import type {
  BattleDecisionRequest,
} from "../../src/engine/battleDecisionBoundary.ts";
import { typeId } from "./damageEngine.ts";
import { loadFactoryWasm } from "./loadFactoryWasm.ts";
import { defaultEngineId } from "./rngEngine.ts";

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
  chooseFactoryAiMaskZeroDecision(input: MaskZeroDecisionInput): FactoryAiDecisionChoice;
  chooseFactoryAiScoredDecision(input: ScoredDecisionInput): FactoryAiScoredChoice;
}

export type MaskZeroDecisionInput = Parameters<typeof tsChooseFactoryAiMaskZeroDecision>[0];
export type ScoredDecisionInput = Parameters<typeof tsChooseFactoryAiScoredDecision>[0];

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
    chooseFactoryAiMaskZeroDecision: tsChooseFactoryAiMaskZeroDecision,
    chooseFactoryAiScoredDecision: tsChooseFactoryAiScoredDecision,
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

// === complete DecisionPolicy chooser inputs ================================

function policyLegalDecisions(request: BattleDecisionRequest): readonly Readonly<{
  kind: "use-move" | "switch";
  moveSlot?: number;
  targetBattler?: number;
  partyIndex?: number;
}>[] {
  return request.kind === "command" ? request.legalDecisions : [];
}

function encodePolicyPrefix(
  w: ByteWriter,
  input: MaskZeroDecisionInput | ScoredDecisionInput,
): void {
  w.u32(input.rng.value);
  w.u32(input.rng.calls);
  w.u32(input.view.factory.levelMode);
  w.u32(input.view.factory.battleMode);
  w.u32(input.view.factory.factoryWinStreak);
  w.u32(input.view.factory.trainerOpponentId);
  for (const moveId of input.view.moves) w.u16(moveId);
  w.u8(input.request.kind === "command" ? 0 : 1);
  w.u32(input.request.requestId);
  w.u8(input.request.side === "player" ? 0 : 1);
  w.u8(input.request.battler);
  const legal = policyLegalDecisions(input.request);
  if (legal.length > 0xff) {
    throw new Error("factory-wasm factoryAiEngine: legal decision count exceeds 255");
  }
  w.u8(legal.length);
  for (const decision of legal) {
    if (decision.kind === "use-move") {
      w.u8(0);
      w.u8(decision.moveSlot!);
      w.u8(decision.targetBattler!);
    } else {
      w.u8(1);
      w.u8(decision.partyIndex!);
      w.u8(0);
    }
  }
}

function encodeMaskZeroDecisionInput(input: MaskZeroDecisionInput): ArrayBuffer {
  const legalCount = policyLegalDecisions(input.request).length;
  const w = new ByteWriter(40 + 3 * legalCount);
  encodePolicyPrefix(w, input);
  return w.finish();
}

function encodeScoredBattler(w: ByteWriter, b: FactoryAiScoredBattlerView): void {
  w.u8(typeId(b.types[0]));
  w.u8(typeId(b.types[1]));
  w.i32(b.attack);
  w.i32(b.defense);
  w.i32(b.spAttack);
  w.i32(b.spDefense);
  w.u32(b.speed);
  w.u8(b.level);
  w.u8(b.statStages.atk);
  w.u8(b.statStages.def);
  w.u8(b.statStages.spAtk);
  w.u8(b.statStages.spDef);
  w.u8(b.statStages.speed);
  w.u8(b.statStages.acc);
  w.u8(b.statStages.evasion);
  w.u8(b.isFirstTurn);
  w.i32(b.hp);
  w.i32(b.maxHp);
  w.optU16(b.lastUsedMoveId);
  w.optBool(b.isToxicPoisoned);
  w.optBool(b.hasAnyStatus);
  w.optBool(b.isConfused);
  w.optBool(b.isAsleep);
  w.optBool(b.isTaunted);
  w.optBool(b.isLeechSeeded);
  w.optBool(b.isInfatuated);
  w.optBool(b.hasYawn);
  w.optBool(b.hasPerishSong);
  w.optBool(b.isNightmared);
  w.optBool(b.isForesighted);
  w.optBool(b.spikesUp);
  w.optBool(b.targetFutureAttackUp);
  w.optU8(b.protectUses);
  w.optU32(b.battleTurnCount);
  w.optBool(b.isRooted);
  w.optBool(b.attackerFutureAttackUp);
  w.optBool(b.hasFocusEnergy);
  w.optBool(b.hasCurableStatus);
  w.optBool(b.isPoisoned);
  w.optBool(b.isBurned);
  w.optBool(b.isParalyzed);
  w.optBool(b.isCursed);
  w.optBool(b.isEscapePrevented);
  w.optBool(b.isTormented);
  w.optBool(b.lightScreenUp);
  w.optBool(b.reflectUp);
  w.optBool(b.targetSideReflectUp);
  w.optBool(b.targetPartyStatusEqualsAny);
  w.optBool(b.safeguardUp);
  w.u16(abilityId(b.ability ?? "ABILITY_NONE"));
  w.optU16(b.holdEffect);
  w.optU8(b.currentWeather);
  w.optU8(b.usablePartyMons);
  w.optBool(b.hasSubstitute);
  w.optBool(b.anyMoveDisabled);
  w.optBool(b.anyMoveEncored);
  w.optBool(b.mistUp);
  w.optU8(b.gender === undefined ? undefined : genderByte(b.gender));
  w.optBool(b.imprisonedOthers);
  w.optBool(b.mudSportUp);
  w.optBool(b.waterSportUp);
  w.optU16(b.usedHeldItemId);
  w.optU8(b.stockpileCount);
}

function encodeScoredDecisionInput(input: ScoredDecisionInput): ArrayBuffer {
  const legalCount = policyLegalDecisions(input.request).length;
  const w = new ByteWriter(332 + 3 * legalCount);
  encodePolicyPrefix(w, input);
  const turnStart = input.turnStartRandomNumber;
  if (turnStart === undefined) {
    w.u8(0);
    w.u16(0);
  } else if (turnStart.owner === "decision") {
    w.u8(1);
    w.u16(0);
  } else if (turnStart.owner === "battle-turn-boundary") {
    w.u8(2);
    w.u16(turnStart.value);
  } else {
    throw new Error("Factory AI turn-start random-number owner must be decision or battle-turn-boundary");
  }
  encodeScoredBattler(w, input.view.attacker);
  encodeScoredBattler(w, input.view.target);
  w.u16(input.view.target.species);
  w.optU16(input.view.target.knownAbility === null ? undefined : abilityId(input.view.target.knownAbility));
  w.bool(input.view.target.speciesAbilities !== undefined);
  w.u16(input.view.target.speciesAbilities === undefined ? 0 : abilityId(input.view.target.speciesAbilities[0]));
  w.u16(input.view.target.speciesAbilities === undefined ? 0 : abilityId(input.view.target.speciesAbilities[1]));
  w.bool(input.view.target.knownMoveIds !== undefined);
  for (let i = 0; i < 4; i++) w.u16(input.view.target.knownMoveIds?.[i] ?? 0);
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

function decodeCvDraw(r: ByteReader): FactoryAiCheckViabilityDraw {
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
  switch (extraTag) {
    case 1:
      return { ...common, strikesFirst: extraValue } as FactoryAiCheckViabilityDraw;
    case 2:
      return { ...common, jumped: extraValue !== 0 } as FactoryAiCheckViabilityDraw;
    case 3:
      return { ...common, jumpedToEnd: extraValue !== 0 } as FactoryAiCheckViabilityDraw;
    case 4:
      return { ...common, succeeded: extraValue !== 0 } as FactoryAiCheckViabilityDraw;
    case 5:
      return { ...common, guessedAbility: abilityName(extraValue) } as FactoryAiCheckViabilityDraw;
    default:
      throw new Error(`factory-wasm factoryAiEngine: unknown CheckViability draw extra tag ${extraTag}`);
  }
}

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
      draws.push(decodeCvDraw(r));
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

const POLICY_SCRIPT_NAMES = ["check-bad-move", "try-to-faint", "check-viability"] as const;
const TURN_OWNER_NAMES = ["decision", "battle-turn-boundary", "legacy-post-boundary"] as const;
const CBM_REASON_SUFFIXES = [
  "negates-type", "soundproof", "high-risk-ability", "magnitude-levitate",
  "speed-down-shared-tail", "attack-down-hyper-cutter", "attack-down-shared-tail",
  "defense-down-shared-tail", "sp-def-down-shared-tail", "acc-down-keen-eye",
  "acc-down-shared-tail", "evasion-down-shared-tail", "sp-atk-down-shared-tail",
  "toxic-immunity", "sleep-ability", "paralyze-ability", "confuse-ability",
  "one-hit-ko-ability", "will-o-wisp-ability", "roar-ability",
  "trick-and-knock-off-ability", "explosion-ability", "attract-ability",
] as const;

function decodePolicyMaskReceipt(r: ByteReader, input: FactoryAiMaskSelectionInput) {
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
  const branch = POLICY.branches[branchOrder]!;
  return Object.freeze({
    schema: "factory-ai-mask-selection/v1" as const,
    inputs: Object.freeze({ ...input, isFrontierBrain }),
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
  });
}

function decodePolicyChoice(
  bytes: Uint8Array,
  input: MaskZeroDecisionInput | ScoredDecisionInput,
  scored: boolean,
): FactoryAiDecisionChoice | FactoryAiScoredChoice {
  const r = new ByteReader(bytes);
  r.u32();
  const status = r.u8();
  if (status === 1) throw new Error(r.utf8(r.u32()));
  if (status !== 0) throw new Error(`factory-wasm factoryAiEngine: unknown policy status ${status}`);

  const requestId = r.u32();
  const side = r.u8() === 0 ? "player" as const : "trainer" as const;
  const submissionDecision = Object.freeze({
    kind: "use-move" as const,
    moveSlot: r.u8() as 0 | 1 | 2 | 3,
    targetBattler: r.u8(),
  });
  const rng = Object.freeze({ value: r.u32(), calls: r.u32() });
  const mask = r.u8();
  const maskSelection = decodePolicyMaskReceipt(r, input.view.factory);
  const scriptCount = r.u8();
  const scripts: string[] = [];
  for (let i = 0; i < 3; i++) {
    const tag = r.u8();
    if (i < scriptCount) scripts.push(POLICY_SCRIPT_NAMES[tag]!);
  }
  const turnOwner = r.u8();
  const hasTurnValue = r.bool();
  const turnValue = r.u16();
  const drawCount = r.u8();
  const draws: unknown[] = [];
  for (let i = 0; i < drawCount; i++) {
    const tag = r.u8();
    const moveSlotByte = r.u8();
    if (tag === 4) {
      draws.push(Object.freeze({
        ...decodeCvDraw(r),
        phase: "check-viability" as const,
        moveSlot: moveSlotByte,
      }));
      continue;
    }
    const ordinal = r.u32();
    const before = Object.freeze({ value: r.u32(), calls: r.u32() });
    const after = Object.freeze({ value: r.u32(), calls: r.u32() });
    const rawRngValue = r.u32();
    const randomValue = r.u16();
    const common = { ordinal, before, after, rawRngValue, randomValue };
    if (tag === 0) {
      draws.push(Object.freeze({
        ...common,
        reason: "BattleTurnPassed gRandomTurnNumber (battle_main.c:4013)",
        kind: "turn-start-random-number" as const,
      }));
    } else if (tag === 1) {
      draws.push(Object.freeze({
        ...common,
        reason: `setup-simulated-rng-slot-${moveSlotByte}`,
        kind: "setup-simulated-rng" as const,
        moveSlot: moveSlotByte,
        simulatedRng: r.u8(),
      }));
    } else if (tag === 2) {
      const site = r.u8();
      const guessedAbility = abilityName(r.u16());
      draws.push(Object.freeze({
        ...common,
        reason: `slot-${moveSlotByte}-check-bad-move-${CBM_REASON_SUFFIXES[site]}`,
        kind: "get-ability" as const,
        guessedAbility,
        phase: "check-bad-move" as const,
        moveSlot: moveSlotByte,
      }));
    } else if (tag === 3) {
      r.u8(); // TryToFaintDrawKind::DoubleSuperEffective
      draws.push(Object.freeze({
        ...common,
        reason: `slot-${moveSlotByte}-try-to-faint-double-super-effective`,
        kind: "double-super-effective" as const,
        succeeded: r.bool(),
        phase: "try-to-faint" as const,
        moveSlot: moveSlotByte,
      }));
    } else if (tag === 5) {
      draws.push(Object.freeze({
        ...common,
        reason: "best-move-tie-selection",
        kind: "best-move-tie" as const,
      }));
    } else {
      throw new Error(`factory-wasm factoryAiEngine: unknown policy draw tag ${tag}`);
    }
  }

  const slotScores: unknown[] = [];
  for (let i = 0; i < 4; i++) {
    const moveSlot = r.u8();
    const moveId = r.u16();
    const legal = r.bool();
    const initialScore = r.i32();
    const deltas: (number | null)[] = [];
    for (let d = 0; d < 3; d++) {
      const present = r.bool();
      const value = r.i32();
      deltas.push(present ? value : null);
    }
    const finalScore = r.i32();
    slotScores.push(Object.freeze(scored
      ? { moveSlot, moveId, legal, initialScore, checkBadMoveDelta: deltas[0], tryToFaintDelta: deltas[1], checkViabilityDelta: deltas[2], finalScore }
      : { moveSlot, moveId, legal, initialScore, finalScore }));
  }
  const bestCount = r.u8();
  const bestMoveSlots: number[] = [];
  for (let i = 0; i < 4; i++) {
    const slot = r.u8();
    if (i < bestCount) bestMoveSlots.push(slot);
  }
  const modulus = r.u8();
  const index = r.u8();
  const chosenDecision = Object.freeze({
    kind: "use-move" as const,
    moveSlot: r.u8() as 0 | 1 | 2 | 3,
    targetBattler: r.u8(),
  });
  const submission = Object.freeze({ requestId, side, decision: submissionDecision });
  const traceBase = {
    schema: "factory-ai-trace/v1" as const,
    phase: "choose-move" as const,
    mask,
    maskSelection,
    executedScoringScripts: Object.freeze(scripts),
    draws: Object.freeze(draws),
    slotScores: Object.freeze(slotScores),
    bestMoveSlots: Object.freeze(bestMoveSlots),
    tie: Object.freeze({ modulus, index, chosenDecision }),
  };
  const trace = scored
    ? Object.freeze({
      ...traceBase,
      turnStartRandomNumber: Object.freeze({
        owner: TURN_OWNER_NAMES[turnOwner]!,
        value: hasTurnValue ? turnValue : null,
      }),
    })
    : Object.freeze(traceBase);
  return Object.freeze({ submission, rng, trace }) as unknown as FactoryAiDecisionChoice | FactoryAiScoredChoice;
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

  function withPolicyInput(
    encoded: ArrayBuffer,
    invoke: (ptr: number, len: number) => number,
  ): Uint8Array {
    const inputPtr = exports.fw_alloc(encoded.byteLength);
    let outputPtr: number;
    try {
      new Uint8Array(exports.memory.buffer, inputPtr, encoded.byteLength).set(new Uint8Array(encoded));
      outputPtr = invoke(inputPtr, encoded.byteLength);
    } finally {
      exports.fw_free(inputPtr, encoded.byteLength);
    }
    return copyOutAllocdBuffer(outputPtr);
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
    chooseFactoryAiMaskZeroDecision(input) {
      const bytes = withPolicyInput(
        encodeMaskZeroDecisionInput(input),
        exports.fw_choose_factory_ai_mask_zero_decision,
      );
      return decodePolicyChoice(bytes, input, false) as FactoryAiDecisionChoice;
    },
    chooseFactoryAiScoredDecision(input) {
      const bytes = withPolicyInput(
        encodeScoredDecisionInput(input),
        exports.fw_choose_factory_ai_scored_decision,
      );
      return decodePolicyChoice(bytes, input, true) as FactoryAiScoredChoice;
    },
  };
}

/** Selects the uniform Factory AI API from `POKEBENCH_ENGINE` (TS by default). */
export async function factoryAiEngine(): Promise<FactoryAiEngine> {
  return defaultEngineId() === "wasm" ? wasmFactoryAiEngine() : tsFactoryAiEngine();
}
