/**
 * Source-operation clock for Factory mon construction.
 *
 * The retail path runs `CreateMonWithEVSpreadNatureOTID` while the main loop
 * can be interrupted by `VBlankIntr`.  The interrupt's ambient `Random()` is
 * therefore ordered by crossed VBlank periods, not by a fixed number of
 * draws between two mons.  This module keeps that ordering explicit without
 * importing an oracle receipt or assigning cursors to a trainer, battle, or
 * absolute presentation tick.
 *
 * The cycle-cost callback is intentional.  The issue-55 v2 packet records
 * exact source boundaries and interrupt timing. The compiled nature check's
 * candidate-dependent cost is reduced below from its Thumb instruction path;
 * VBlank service still has live audio/DMA-dependent cost. Until that remaining
 * state has a source-derived clock model, the clean stream remains the only
 * source-state-only production contract.
 *
 * Source references:
 * - `src/pokemon.c:2562-2593`
 * - `src/battle_factory_screen.c:1736-1777`
 * - `src/battle_tower.c:1824-1884`
 * - `src/main.c:340-369`
 */

import frontierMonsData from "../data/gen/battle-frontier-mons.json" with { type: "json" };
import naturesData from "../data/gen/natures.json" with { type: "json" };
import speciesStatsData from "../data/gen/species-stats.json" with { type: "json" };
import { advanceRngValue } from "./rng.ts";
import { natureFromPersonality, randomU16 } from "./opponentGen.ts";

export const GBA_VBLANK_CYCLES = 280_896;

/**
 * Evidence still required before a main-lane caller can claim live exactness.
 * These are deliberately operation-level facts, not a request for another
 * per-trace cursor schedule.
 */
export const REQUIRED_FACTORY_CONSTRUCTION_CLOCK_EVIDENCE = Object.freeze([
  "exact ROM-fetch/EWRAM timing for CreateMon, EV/stat, and Factory post operations",
  "deterministic VBlank/audio/DMA workload state and interrupt/event-entry latency",
] as const);

export type FactoryConstructionSourceFunction =
  | "CreateFrontierFactorySelectableMons"
  | "FillFactoryFrontierTrainerParty";

export type FactoryConstructionOperationKind =
  | "construction-entry"
  | "personality-random"
  | "personality-attempt"
  | "create-mon"
  | "ev-spread"
  | "calculate-mon-stats"
  | "factory-post-mon"
  | "factory-outer-loop"
  | "source-return";

export type FactoryConstructionHalf = "low" | "high";

export interface FactoryMonConstructionInput {
  /** Source species input to CreateMon, not a set/trainer lookup key. */
  speciesId: number;
  speciesName?: string;
  /** Target `GetNatureFromPersonality` value. */
  nature: number;
  /** Source `evSpread` bitfield passed to CreateMonWithEVSpreadNatureOTID. */
  evSpread: number;
  /** Number of set EV slots; source computes this before dividing total EVs. */
  evStatCount: number;
  level?: number;
  fixedIv?: number;
  sourceFunction: FactoryConstructionSourceFunction;
  /** Optional source-data identity for diagnostics only; never used for timing. */
  sourceSetId?: number;
}

export interface FactoryConstructionOperation {
  kind: FactoryConstructionOperationKind;
  sourceFunction: FactoryConstructionSourceFunction;
  monIndex: number | null;
  input: FactoryMonConstructionInput | null;
  attempt: number | null;
  half: FactoryConstructionHalf | null;
  /** u16 returned by this half's Random() call. */
  randomValue: number | null;
  /**
   * Candidate assembled exactly as `Random32()` does. Nature-attempt operations
   * carry every candidate; downstream CreateMon/EV/stat/Factory-post operations
   * carry the accepted personality because encrypted box-mon access is keyed by it.
   */
  candidatePersonality: number | null;
  candidateNature: number | null;
  natureAccepted: boolean | null;
}

export interface FactoryNatureAttemptTiming {
  personality: number;
  targetNature: number;
  candidateNature: number;
  accepted: boolean;
  /**
   * Source-owned master cycles from `GetNatureFromPersonality+2` to the next
   * low Random entry (wrong nature) or `CreateMon+2` (accepted nature).
   * Asynchronous timer/DMA service is deliberately outside this reducer.
   */
  cycles: number;
}

export interface FactoryGetNatureTiming {
  /** Full source personality returned by MON_DATA_PERSONALITY. */
  personality: number;
  /** `personality % NUM_NATURES`, narrowed to the source u8 return type. */
  nature: number;
  entryPc: number;
  getMonDataEntryPc: number;
  divisionEntryPc: number;
  /** Complete nested GetMonData2 -> GetBoxMonData2 field-zero path. */
  getMonDataCycles: number;
  /** GetNature instructions/call refills outside the two nested callees. */
  wrapperCycles: number;
  /** Complete personality-dependent `__umodsi3(personality, 25)` path. */
  moduloCycles: number;
  /** Complete direct-callee source cost; asynchronous IRQ/service is excluded. */
  cycles: number;
}

export interface FactoryConstructionEntryTiming {
  sourceFunction: FactoryConstructionSourceFunction;
  /** Compiled BL in the selected Factory source-function sibling. */
  callerCallPc: number;
  /** Entry of `CreateMonWithEVSpreadNatureOTID`. */
  entryPc: number;
  /** Entry of the first `Random` call used by `Random32`. */
  firstRandomPc: number;
  /** Sequential Thumb halfwords executed, including both halves of BL. */
  sequentialThumbHalfwords: number;
  /** Taken-control-flow pipeline refills after the measured entry boundary. */
  pipelineRefills: number;
  /** Source-owned master cycles between the two instruction boundaries. */
  cycles: number;
}

export interface FactorySourceReturnTiming {
  sourceFunction: FactoryConstructionSourceFunction;
  /** First executed Thumb instruction after the final mon's held-item write. */
  startPc: number;
  /** First caller instruction reached after the source function returns. */
  callerResumePc: number;
  /** Source-owned master cycles between those two instruction boundaries. */
  cycles: number;
}

export type FactoryOuterLoopTimingInput =
  | Readonly<{
    sourceFunction: "CreateFrontierFactorySelectableMons";
    /** Source loop index of the mon whose construction entry follows. */
    nextMonIndex: number;
    /** `GetNumPastRentalsRank` result read by the selectable-mon loop. */
    selectableRentalRank: number;
    /** Factory win-streak quotient read before the selectable-mon loop. */
    selectableChallengeNum: number;
  }>
  | Readonly<{
    sourceFunction: "FillFactoryFrontierTrainerParty";
    /** Source loop index of the mon whose construction entry follows. */
    nextMonIndex: number;
  }>;

export interface FactoryOuterLoopTiming {
  sourceFunction: FactoryConstructionSourceFunction;
  nextMonIndex: number;
  /** First executed instruction after the preceding held-item write. */
  startPc: number;
  /** Compiled BL which enters the next mon's construction. */
  nextCallerCallPc: number;
  nextConstructionEntryPc: number;
  sequentialRomFetches: number;
  takenControlFlows: number;
  romLiteralLoads: number;
  romTableLoads: number;
  elevatedRental: boolean | null;
  fixedIvChallenge: number | null;
  fixedIvClamped: boolean | null;
  cycles: number;
}

export interface FactoryCalculateMonStatsParentTimingInput {
  /** Source `MON_DATA_SPECIES` value read by CalculateMonStats. */
  speciesId: number;
  /** Source `MON_DATA_MAX_HP` value captured before recalculation. */
  oldMaxHp: number;
  /** Source `MON_DATA_HP` value captured before recalculation. */
  currentHp: number;
  /** Newly calculated max HP (or one for Shedinja). */
  newMaxHp: number;
}

export interface FactoryCalculateMonStatsParentTiming {
  speciesId: number;
  oldMaxHp: number;
  currentHp: number;
  newMaxHp: number;
  shedinja: boolean;
  /** u8 assignment to `gBattleScripting.levelUpHP`, before its zero-to-one fix. */
  rawLevelUpHp: number;
  storedLevelUpHp: number;
  currentHpPath: "shedinja-set-one" | "normal-initialize" | "normal-adjust" | "return-without-write";
  writesCurrentHp: boolean;
  /** Direct callees whose durations are deliberately excluded from `cycles`. */
  directCallCount: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  romLiteralLoads: number;
  romTableLoads: number;
  /** Parent/interstitial cycles only; every direct callee remains excluded. */
  cycles: number;
}

/** `gNatureStatTable`'s signed byte values for one affected stat. */
export type FactoryNatureStatModifier = -1 | 0 | 1;

export interface FactoryModifyStatByNatureTimingInput {
  /** Valid `GetNature` result passed in r0 by `CalculateMonStats`. */
  nature: number;
  /** Source u16 stat passed in r1. */
  stat: number;
  /** Source u8 stat index passed in r2 (1..5 are nature-affected). */
  statIndex: number;
}

export interface FactoryModifyStatByNatureTiming {
  nature: number;
  stat: number;
  statIndex: number;
  /** First executed instruction; mGBA reports this boundary as `entryPc + 2`. */
  entryPc: number;
  /** Nested `__udivsi3` entry for a raise/lower route, otherwise null. */
  divisionEntryPc: number | null;
  route: "unaffected-stat-index" | "neutral" | "raise" | "lower";
  /** Null when the compiled stat-index guard skips `gNatureStatTable`. */
  natureModifier: FactoryNatureStatModifier | null;
  /** 90 or 110 only when the compiled path executes the multiply/divide pair. */
  multiplier: 90 | 110 | null;
  /** u16 product immediately after the compiled `lsls`/`lsrs` truncation. */
  scaledStat: number;
  /** u16 value returned in r0. */
  result: number;
  /** ARM7TDMI multiply algorithm cycles, zero when no multiply executes. */
  multiplyInternalCycles: 0 | 1 | 2;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  romLiteralLoads: number;
  romTableLoads: number;
  /** Complete direct-callee cost, including the nested `__udivsi3` route. */
  cycles: number;
}

export interface FactorySignedDivisionTimingInput {
  /** Source signed i32 dividend passed in r0. */
  dividend: number;
  /** Source signed i32 divisor passed in r1. */
  divisor: number;
}

export interface FactorySignedDivisionTiming {
  dividend: number;
  divisor: number;
  /** mGBA's pipelined entry boundary for the retail `__divsi3` call. */
  entryPc: number;
  /** First instruction of the shared inline unsigned Loop1/2/3 core. */
  unsignedCoreEntryPc: number;
  dividendMagnitude: number;
  divisorMagnitude: number;
  signNegative: boolean;
  divisorZero: boolean;
  overflow: boolean;
  /** Unsigned register result after the wrapper's final `negs`, as a u32. */
  resultBits: number;
  /** Same result interpreted as the source signed i32 return value. */
  result: number;
  unsignedCoreSequentialThumbHalfwords: number;
  unsignedCorePipelineRefills: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  /** Source-owned master cycles; asynchronous IRQ/service is excluded. */
  cycles: number;
}

/** Source ABI for `SetMonData(struct Pokemon *, s32 field, const void *)`. */
export interface FactorySetMonDataTimingInput {
  /** Compiled `s32 field` selector in r1. Data bytes do not select a path. */
  field: number;
}

export type FactorySetMonDataRoute =
  | "party-status-u32"
  | "party-level-u8"
  | "party-hp-u16"
  | "party-max-hp-u16"
  | "party-attack-u16"
  | "party-defense-u16"
  | "party-speed-u16"
  | "party-sp-attack-u16"
  | "party-sp-defense-u16"
  | "party-mail-u8"
  | "party-species-or-egg-noop"
  | "delegates-to-set-box-mon-data";

/**
 * Complete timing for one direct `SetMonData` party-field path, or an honest
 * shell description when the source switch delegates to `SetBoxMonData`.
 */
export interface FactorySetMonDataTiming {
  field: number;
  /** mGBA's pipelined entry boundary for retail `SetMonData`. */
  entryPc: number;
  route: FactorySetMonDataRoute;
  /** True only for the direct status/level/HP/stat/mail stores. */
  directPartyWrite: boolean;
  /** True when the default arm calls the unresolved encrypted box-mon body. */
  delegatedToSetBoxMonData: boolean;
  /** Bytes assembled from `dataArg`; zero is the source's explicit no-op. */
  valueWidth: 0 | 1 | 2 | 4 | null;
  /** `struct Pokemon` byte offset for a direct store, otherwise null. */
  partyOffset: number | null;
  /** Pipelined callee entry for the default arm, otherwise null. */
  setBoxMonDataEntryPc: number | null;
  /** SetMonData's own executed Thumb halfwords, excluding any nested body. */
  sequentialThumbHalfwords: number;
  /** Taken branch / indirect jump / BL / return pipeline refills. */
  pipelineRefills: number;
  /** PC-relative dispatch-base load(s), each 11 master cycles total. */
  romLiteralLoads: number;
  /** Indexed ROM jump-table word load(s), each 11 master cycles total here. */
  romJumpTableLoads: number;
  /** Exact entry-to-SetBoxMonData boundary when delegation occurs. */
  preDelegateCycles: number | null;
  /** Exact post-SetBoxMonData return shell when delegation occurs. */
  returnShellCycles: number | null;
  /**
   * Full source-owned direct-callee cost, null only when nested
   * `SetBoxMonData` remains outside this bounded reducer.
   */
  cycles: number | null;
  /** Null for exact direct/no-op paths; names the deliberately excluded gap. */
  unresolved: string | null;
}

/** Source ABI for `GetMonData2(struct Pokemon *, s32 field)`. */
export interface FactoryGetMonDataTimingInput {
  /** Compiled signed field selector in r1; the mon identity is not a timing key. */
  field: number;
}

export type FactoryGetMonDataRoute =
  | "party-status-u32"
  | "party-level-u8"
  | "party-hp-u16"
  | "party-max-hp-u16"
  | "party-mail-u8"
  | "party-attack2-u16"
  | "party-defense2-u16"
  | "party-speed2-u16"
  | "party-sp-attack2-u16"
  | "party-sp-defense2-u16"
  | "party-attack-via-get-deoxys-stat"
  | "party-defense-via-get-deoxys-stat"
  | "party-speed-via-get-deoxys-stat"
  | "party-sp-attack-via-get-deoxys-stat"
  | "party-sp-defense-via-get-deoxys-stat"
  | "compare-default-to-get-box-mon-data"
  | "table-default-to-get-box-mon-data";

/**
 * Complete timing for simple direct party-field reads, or exact wrapper shells
 * around a deliberately unresolved nested GetBoxMonData2/GetDeoxysStat body.
 */
export interface FactoryGetMonDataTiming {
  field: number;
  /** mGBA's pipelined boundary while retail GetMonData2's opening push executes. */
  entryPc: number;
  route: FactoryGetMonDataRoute;
  directPartyRead: boolean;
  delegatedToGetBoxMonData2: boolean;
  valueWidth: 1 | 2 | 4 | null;
  partyOffset: number | null;
  getBoxMonData2EntryPc: number | null;
  getDeoxysStatEntryPc: number | null;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  romLiteralLoads: number;
  romJumpTableLoads: number;
  /** EWRAM load cost including its two-cycle instruction baseline. */
  ewramReadCycles: number | null;
  preDelegateCycles: number | null;
  returnShellCycles: number | null;
  overrideReturnShellCycles: number | null;
  partyFallbackReturnShellCycles: number | null;
  cycles: number | null;
  unresolved: string | null;
}

export interface FactoryGetBoxMonDataDependencyInput {
  /** One encrypted field used by CalculateMonStats or GetLevelFromMonExp. */
  field: number;
  /** BoxMon personality; the only input to GetSubstruct's modulo-24 route. */
  personality: number;
  /** Source checksum comparison result, never an observed duration key. */
  checksumValid: boolean;
  /** Bad-egg flag read only by MON_DATA_SPECIES's extraction tail. */
  isBadEgg: boolean;
}

export type FactoryGetBoxMonDataFieldGroup =
  | "species"
  | "experience"
  | "ev-byte"
  | "iv-bitfield";

export type FactoryGetBoxMonDataFetchClass =
  | "ewram-u16-conditional"
  | "ewram-u32"
  | "ewram-u8"
  | "ewram-u8-bitfield"
  | "ewram-u16-bitfield"
  | "ewram-u32-bitfield";

export type FactoryGetSubstructType = 0 | 1 | 2 | 3;

/**
 * The source/ELF-reduced, ROM-only part of one GetSubstruct call.
 *
 * The separate libgcc `% 24` body, dispatch table, and every one of the 24
 * compiled arms are fully source/ELF-reduced here. `cycles` is consequently
 * exact for GetSubstruct itself; the surrounding encrypted accessor's EWRAM
 * loads, field tail, crypt/checksum data buses, async service, and IRQ remain
 * deliberately outside this reducer.
 */
export interface FactoryGetSubstructTiming {
  personality: number;
  personalityModulo24: number;
  substructType: FactoryGetSubstructType;
  logicalToPhysicalSlots: readonly number[];
  selectedPhysicalSlot: number;
  secureStorageOffset: number;
  armPc: number;
  armTargetPc: number;
  commonSequentialThumbHalfwords: number;
  commonPipelineRefills: number;
  commonRomLiteralLoads: number;
  commonRomTableLoads: number;
  commonNonModuloCycles: number;
  armSequentialThumbHalfwords: number;
  armPipelineRefills: number;
  armInstructionFetchCycles: number;
  /** GetSubstruct's Thumb BL into the helper and the caller instruction after it. */
  moduloCallPc: number;
  moduloReturnPc: number;
  /** libgcc's `__umodsi3` symbol entry and its selected `mov pc, lr`. */
  moduloEntryPc: number;
  moduloReturnInstructionPc: number;
  moduloSequentialThumbHalfwords: number;
  moduloPipelineRefills: number;
  moduloRorInternalCycles: number;
  moduloLoop1Iterations: number;
  moduloLoop2Iterations: number;
  moduloLoop3Iterations: number;
  /** Common dispatch shell plus the selected arm, excluding the helper body. */
  nonModuloCycles: number;
  /** Exact source-general `__umodsi3(personality, 24)` cost. */
  moduloCycles: number;
  /** Complete GetSubstruct instruction/fetch cost; no secure-data load occurs here. */
  cycles: number;
  unresolved: null;
}

export type FactoryEncryptedWordLoopKind = "decrypt" | "encrypt";

export type FactoryEwramAccessKind = "read" | "write";
export type FactoryEwramAccessWidth = 1 | 2 | 4;

/**
 * One aligned retail EWRAM data access on the GBA's 16-bit external bus.
 * Misaligned ARM7TDMI load rotation/alignment behavior is deliberately not
 * claimed by this slice because none of the pinned BoxPokemon accesses uses it.
 */
export interface FactoryEwramAccessTiming {
  region: "ewram";
  access: FactoryEwramAccessKind;
  width: FactoryEwramAccessWidth;
  address: number;
  alignment: FactoryEwramAccessWidth;
  transfers: 1 | 2;
  busWidth: 2;
  cycles: 2 | 6;
  instructionBaselineCycles: 2;
  busPremiumCycles: 0 | 4;
  unresolved: null;
}

export interface FactoryChecksumTailTiming {
  route: "valid" | "invalid-marks-bad-egg";
  entryPc: 0x0806_a6d0;
  dispatchPc: 0x0806_a6f2;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  halfwordReads: 1;
  byteReads: number;
  byteWrites: number;
  dataAccessCycles: number;
  dataAccessPremiumCycles: number;
  instructionFetchCycles: number;
  cycles: number;
  unresolved: null;
}

export type FactoryFieldTailRoute =
  | "species"
  | "bad-egg-species"
  | "experience"
  | "ev-byte"
  | "iv-bitfield";

export interface FactoryFieldTailTiming {
  route: FactoryFieldTailRoute;
  entryPc: number;
  commonTailPc: 0x0806_ac8c;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  byteReads: number;
  halfwordReads: number;
  wordReads: number;
  dataAccessCycles: number;
  dataAccessPremiumCycles: number;
  instructionFetchCycles: number;
  cycles: number;
  unresolved: null;
}

/**
 * Fixed instruction/fetch census for DecryptBoxMon or EncryptBoxMon.
 *
 * The loops are source-general and always execute 12 word iterations.  The
 * instruction stream and five aligned 32-bit EWRAM accesses per iteration are
 * exact. Data-access totals include each load/store's two-cycle instruction
 * baseline; `dataAccessPremiumCycles` is the part added to the instruction
 * subtotal when composing complete component cycles.
 */
export interface FactoryEncryptedWordLoopTiming {
  kind: FactoryEncryptedWordLoopKind;
  entryPc: number;
  loopPc: number;
  returnPc: number;
  iterations: 12;
  ewramWordReads: 36;
  ewramWordWrites: 24;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  instructionFetchCycles: number;
  dataAccessCycles: number;
  dataAccessPremiumCycles: number;
  cycles: number;
  unresolved: null;
}

/**
 * Fixed instruction/fetch census for the four six-halfword checksum loops.
 * The 24 aligned EWRAM halfword reads are reported separately from ROM
 * instruction accounting; no observed pause or asynchronous service is folded
 * into this component.
 */
export interface FactoryChecksumLoopTiming {
  entryPc: number;
  firstLoopSetupPc: number;
  firstReadPc: number;
  afterLoopPc: number;
  substructCount: 4;
  halfwordsPerSubstruct: 6;
  checksumHalfwordReads: 24;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  instructionFetchCycles: number;
  ewramHalfwordReadCycles: number;
  ewramReadPremiumCycles: number;
  cycles: number;
  unresolved: null;
}

/**
 * Source/ELF dependency census for the encrypted GetBoxMonData2 subset used
 * by CalculateMonStats. It composes every complete ROM-only GetSubstruct call
 * with the fixed crypt/checksum fetch subtotal, but deliberately keeps the
 * complete accessor cost null until the EWRAM accesses, field tails, async
 * service, and VBlank/IRQ boundaries are independently accepted.
 */
export interface FactoryGetBoxMonDataDependency {
  field: number;
  personality: number;
  personalityModulo24: number;
  fieldGroup: FactoryGetBoxMonDataFieldGroup;
  logicalSubstruct: 0 | 2 | 3;
  logicalToPhysicalSlots: readonly number[];
  /** Exact ELF entry selected by GetSubstruct's personality jump table. */
  getSubstructModuloArmPc: number;
  selectedPhysicalSlot: number;
  secureStorageOffset: number;
  tailEntryPc: number;
  fetchClass: FactoryGetBoxMonDataFetchClass;
  commonFetchClasses: readonly string[];
  checksumRoute: "valid" | "invalid-marks-bad-egg";
  speciesTailRoute: "not-applicable" | "species" | "bad-egg-species";
  /** One field-selected arm; the accessor still performs seven other calls. */
  selectedSubstructTiming: FactoryGetSubstructTiming;
  /** Source order: outer encrypted setup [0..3], then checksum [0..3]. */
  getSubstructTypes: readonly FactoryGetSubstructType[];
  /** Every source-proven GetSubstruct function call in that exact order. */
  getSubstructTimings: readonly FactoryGetSubstructTiming[];
  /** Exact function-only total of the eight calls, not an accessor total. */
  getSubstructCycles: number;
  decryptLoopTiming: FactoryEncryptedWordLoopTiming;
  checksumLoopTiming: FactoryChecksumLoopTiming;
  encryptLoopTiming: FactoryEncryptedWordLoopTiming;
  /** Exact ROM instruction/fetch subtotal, not a complete accessor duration. */
  sharedInstructionFetchCycles: number;
  /** Shared crypt/checksum fetch work plus the eight complete GetSubstruct calls. */
  composedInstructionFetchCycles: number;
  /** Complete bus occupancy of the two crypt loops and checksum read loop. */
  sharedDataBusCycles: number;
  /** Part of shared bus occupancy not already in the instruction baseline. */
  sharedDataBusPremiumCycles: number;
  checksumTailTiming: FactoryChecksumTailTiming;
  fieldTailTiming: FactoryFieldTailTiming;
  /** Checksum-route plus selected-field data bus occupancy. */
  tailDataBusCycles: number;
  /** Complete checksum-route plus selected-field tail instruction/data time. */
  tailCycles: number;
  /** All independently closed nested components; still not an accessor total. */
  composedKnownCycles: number;
  getSubstructCalls: 8;
  decryptIterations: 12;
  checksumHalfwordReads: 24;
  encryptIterations: 12;
  boundaries: Readonly<{
    symbolEntryPc: number;
    probeEntryPc: number;
    firstGetSubstructCallPc: number;
    decryptCallPc: number;
    checksumCallPc: number;
    dispatchPc: number;
    commonTailPc: number;
    encryptCallPc: number;
    returnTailPc: number;
    getSubstructSymbolEntryPc: number;
    moduloCallPc: number;
    moduloReturnPc: number;
    getSubstructDispatchPc: number;
    getSubstructReturnPc: number;
    decryptLoopPc: number;
    checksumLoopPc: number;
    encryptLoopPc: number;
  }>;
  cycles: null;
  unresolved: string;
}

const THUMB_SEQUENTIAL_CYCLES = 2;
const THUMB_PIPELINE_REFILL_CYCLES = 6;
const THUMB_TAKEN_CONTROL_CYCLES = THUMB_SEQUENTIAL_CYCLES + THUMB_PIPELINE_REFILL_CYCLES;
const THUMB_ROM_LITERAL_LOAD_CYCLES = 11;
const THUMB_ROM_TABLE_LOAD_CYCLES = 9;
// `SetMonData`'s indexed 32-bit ROM jump-table read is not the prefetchable
// byte-table class above: the ELF/mGBA instruction audit charges 11 total.
const THUMB_ROM_JUMP_TABLE_LOAD_CYCLES = 11;

function rotateRight32(value: number, amount: number): number {
  const shift = amount & 31;
  if (shift === 0) return value >>> 0;
  return ((value >>> shift) | (value << (32 - shift))) >>> 0;
}

/**
 * Reduce the common construction-entry path through the first Random call.
 *
 * The two applicable Factory callers prepare different source arguments and
 * call from different sites (`battle_factory_screen.c:1765`, ROM 0x0819b5a4;
 * `battle_tower.c:1870`, ROM 0x08163706), but both BL instructions enter the
 * one `CreateMonWithEVSpreadNatureOTID` body (`pokemon.c:2562`, ROM
 * 0x08068634). From that entry, the retail Thumb path is unconditional:
 *
 * - save five low and three high registers: push, three movs, push (5);
 * - allocate locals, preserve mon, and load fixedIV/evSpread: 4 halfwords;
 * - normalize/preserve species, level, nature, fixedIV, and evSpread: 14;
 * - zero statCount: 1;
 * - execute the two-halfword BL to Random at ROM 0x0806f5cc: 2.
 *
 * Thus 26 sequential halfwords cost 52 master cycles at retail WS0 timing,
 * and the taken BL adds one six-cycle pipeline refill: 58 total. Argument
 * values cannot select a branch before this boundary. The source-function
 * input records which audited compiled caller reached the shared body; it
 * does not select a fitted duration.
 */
export function reduceFactoryConstructionEntryTiming(
  sourceFunction: FactoryConstructionSourceFunction,
): FactoryConstructionEntryTiming {
  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const call = (): void => {
    instruction(2);
    pipelineRefills += 1;
  };

  instruction(5); // push, mov r7/sl, mov r6/r9, mov r5/r8, push
  instruction(4); // sub sp, preserve mon, load fixedIV, load evSpread
  instruction(14); // normalize and preserve the five scalar arguments
  instruction(); // statCount = 0
  call(); // BL Random32's first Random

  const callerCallPc = sourceFunction === "CreateFrontierFactorySelectableMons"
    ? 0x0819_b5a4
    : 0x0816_3706;
  const cycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    sourceFunction,
    callerCallPc,
    entryPc: 0x0806_8634,
    firstRandomPc: 0x0806_f5cc,
    sequentialThumbHalfwords,
    pipelineRefills,
    cycles,
  });
}

/**
 * Reduce a non-final Factory loop tail through the next mon constructor entry.
 *
 * The boundary starts after the held-item `SetMonData` call and includes the
 * loop test, non-final back edge, next record loads, argument setup, and BL to
 * `CreateMonWithEVSpreadNatureOTID`. The selectable sibling additionally calls
 * `GetFactoryMonFixedIV`; its two real source branches are represented by the
 * rental rank and challenge number, rather than by a rental/set identity.
 *
 * The pinned ELF/mGBA timing is structural: ordinary prefetched Thumb work
 * costs 2 cycles, taken control flow costs 8 including refill, PC-relative ROM
 * literal reads cost 11, and data-table ROM reads cost 9. Stack/IWRAM accesses
 * in these paths remain hidden by prefetch and stay in the ordinary 2-cycle
 * class. Loaded mon values do not select a branch. Asynchronous hardware
 * service is deliberately outside this reducer.
 */
export function reduceFactoryOuterLoopTiming(
  input: FactoryOuterLoopTimingInput,
): FactoryOuterLoopTiming {
  const nextMonIndex = requireNonnegativeInteger(input.nextMonIndex, "nextMonIndex");
  const maxNextMonIndex = input.sourceFunction === "CreateFrontierFactorySelectableMons" ? 5 : 2;
  if (nextMonIndex < 1 || nextMonIndex > maxNextMonIndex) {
    throw new Error(
      `${input.sourceFunction} nextMonIndex must be in [1, ${maxNextMonIndex}], got ${nextMonIndex}`,
    );
  }

  let sequentialRomFetches: number;
  let takenControlFlows: number;
  let romLiteralLoads: number;
  let romTableLoads: number;
  let startPc: number;
  let nextCallerCallPc: number;
  let elevatedRental: boolean | null = null;
  let fixedIvChallenge: number | null = null;
  let fixedIvClamped: boolean | null = null;

  if (input.sourceFunction === "FillFactoryFrontierTrainerParty") {
    // 0x0816376c -> 0x08163706 -> 0x08068634.
    sequentialRomFetches = 27;
    takenControlFlows = 2;
    romLiteralLoads = 3;
    romTableLoads = 3;
    startPc = 0x0816_376c;
    nextCallerCallPc = 0x0816_3706;
  } else {
    const selectableRentalRank = requireNonnegativeInteger(
      input.selectableRentalRank,
      "selectableRentalRank",
    );
    const selectableChallengeNum = requireNonnegativeInteger(
      input.selectableChallengeNum,
      "selectableChallengeNum",
    );
    if (selectableRentalRank > 5) {
      throw new Error(`selectableRentalRank must be in [0, 5], got ${selectableRentalRank}`);
    }
    if (selectableChallengeNum > 0xff) {
      throw new Error(`selectableChallengeNum must be a source u8, got ${selectableChallengeNum}`);
    }

    elevatedRental = nextMonIndex < selectableRentalRank;
    fixedIvChallenge = (selectableChallengeNum + (elevatedRental ? 1 : 0)) & 0xff;
    // Retail source uses `>` rather than `>=`; challenge 8 is the documented
    // out-of-bounds row and therefore does not take the clamp body.
    fixedIvClamped = fixedIvChallenge > 8;

    // Anchor branch shape: rentalRank 0 and challenge 0.
    sequentialRomFetches = 61;
    takenControlFlows = 6;
    romLiteralLoads = 5;
    romTableLoads = 4;
    if (elevatedRental) {
      // Non-taken `bcs`, challenge+1 setup, then a taken join branch.
      sequentialRomFetches += 5;
    }
    if (fixedIvClamped) {
      // Replace GetFactoryMonFixedIV's taken `bls` with non-taken `bls` + mov.
      sequentialRomFetches += 2;
      takenControlFlows -= 1;
    }
    startPc = 0x0819_b612;
    nextCallerCallPc = 0x0819_b5a4;
  }

  const cycles = sequentialRomFetches * THUMB_SEQUENTIAL_CYCLES
    + takenControlFlows * THUMB_TAKEN_CONTROL_CYCLES
    + romLiteralLoads * THUMB_ROM_LITERAL_LOAD_CYCLES
    + romTableLoads * THUMB_ROM_TABLE_LOAD_CYCLES;
  return Object.freeze({
    sourceFunction: input.sourceFunction,
    nextMonIndex,
    startPc,
    nextCallerCallPc,
    nextConstructionEntryPc: 0x0806_8634,
    sequentialRomFetches,
    takenControlFlows,
    romLiteralLoads,
    romTableLoads,
    elevatedRental,
    fixedIvChallenge,
    fixedIvClamped,
    cycles,
  });
}

/**
 * Reduce only CalculateMonStats' compiled parent/interstitial instructions.
 *
 * Every BL pipeline refill belongs to the parent, but the time spent inside
 * each direct callee does not. The pinned retail ELF body is
 * `pokemon.c:2823-2889`, ROM `0x08068d0c..0x08069002`. Its WS0 classes are
 * the same ones independently established by the construction reducers:
 * ordinary prefetched Thumb halfwords cost 2 cycles, a taken control flow
 * adds a 6-cycle refill, PC-relative ROM literals cost 11 cycles total, and
 * `gSpeciesInfo` ROM byte reads cost 9 cycles total. Stack/IWRAM/EWRAM data
 * accesses in this body stay hidden by prefetch and remain in the ordinary
 * class.
 *
 * The observed 1081/1083 split is source-visible: `levelUpHP` is a u8, so the
 * branch at `0x08068e38` tests the truncated `(newMaxHp - oldMaxHp) & 0xff`.
 * Zero falls through two extra halfwords but avoids one pipeline refill,
 * costing 2 fewer cycles overall. Species and HP state also select the real
 * Shedinja/final-HP branches; no mon, set, case, frame, cursor, or receipt
 * identity is available here.
 */
export function reduceFactoryCalculateMonStatsParentTiming(
  input: Readonly<FactoryCalculateMonStatsParentTimingInput>,
): FactoryCalculateMonStatsParentTiming {
  const speciesId = requireNonnegativeInteger(input.speciesId, "speciesId");
  const oldMaxHp = requireNonnegativeInteger(input.oldMaxHp, "oldMaxHp");
  const currentHp = requireNonnegativeInteger(input.currentHp, "currentHp");
  const newMaxHp = requireNonnegativeInteger(input.newMaxHp, "newMaxHp");
  for (const [field, value] of Object.entries({ speciesId, oldMaxHp, currentHp, newMaxHp })) {
    if (value > 0xffff) throw new Error(`${field} must be a source u16, got ${value}`);
  }

  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  let romLiteralLoads = 0;
  let romTableLoads = 0;
  let directCallCount = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };
  const call = (): void => {
    instruction(2);
    pipelineRefills += 1;
    directCallCount += 1;
  };
  const literalLoad = (): void => {
    instruction();
    romLiteralLoads += 1;
  };
  const tableLoad = (): void => {
    instruction();
    romTableLoads += 1;
  };

  // Prologue and the fifteen GetMonData2 calls.
  instruction(9);
  call();
  for (let field = 1; field < 15; field += 1) {
    instruction(4);
    call();
  }
  instruction(3);
  call(); // GetLevelFromMonExp
  instruction(6);
  call(); // SetMonData(MON_DATA_LEVEL)

  const shedinja = speciesId === 303;
  literalLoad();
  instruction();
  branch(!shedinja);
  if (shedinja) {
    instruction(3); // newMaxHP = 1; preserve species stride
    branch(true);
  } else {
    literalLoad();
    instruction(4);
    tableLoad(); // gSpeciesInfo[species].baseHP
    instruction(5);
    branch(true); // hpEV is returned as a nonnegative source u8
    instruction(5);
    call(); // __divsi3 for max HP
    instruction(3);
  }

  const rawLevelUpHp = (newMaxHp - oldMaxHp) & 0xff;
  literalLoad();
  instruction(8);
  branch(rawLevelUpHp !== 0);
  if (rawLevelUpHp === 0) instruction(2);
  instruction(2);
  call(); // SetMonData(MON_DATA_MAX_HP)

  // Attack setup, then the five identical CALC_STAT call groups. Four groups
  // end with a gSpeciesInfo load and arithmetic setup for the next stat.
  literalLoad();
  instruction(3);
  tableLoad();
  instruction(5);
  branch(true); // every stat EV is a nonnegative source u8
  instruction(5);
  call(); // attack __divsi3
  for (let statIndex = 0; statIndex < 5; statIndex += 1) {
    instruction(3);
    call(); // GetNature
    instruction(5);
    call(); // ModifyStatByNature
    instruction(6);
    call(); // SetMonData(stat)
    if (statIndex < 4) {
      tableLoad();
      instruction(5);
      branch(true); // next stat EV is nonnegative
      instruction(5);
      call(); // next stat __divsi3
    }
  }

  literalLoad();
  instruction();
  branch(!shedinja);
  let currentHpPath: FactoryCalculateMonStatsParentTiming["currentHpPath"];
  let writesCurrentHp: boolean;
  if (shedinja) {
    instruction(2);
    branch(currentHp !== 0);
    if (currentHp === 0) {
      instruction(2);
      branch(oldMaxHp !== 0);
    }
    writesCurrentHp = currentHp !== 0 || oldMaxHp === 0;
    if (writesCurrentHp) {
      currentHpPath = "shedinja-set-one";
      instruction();
      branch(true);
    } else {
      currentHpPath = "return-without-write";
    }
  } else {
    instruction(2);
    branch(currentHp !== 0);
    if (currentHp !== 0) {
      currentHpPath = "normal-adjust";
      writesCurrentHp = true;
      instruction(4);
    } else {
      instruction(2);
      branch(oldMaxHp !== 0);
      writesCurrentHp = oldMaxHp === 0;
      if (writesCurrentHp) {
        currentHpPath = "normal-initialize";
        instruction();
        branch(true);
      } else {
        currentHpPath = "return-without-write";
      }
    }
  }
  if (writesCurrentHp) {
    instruction(4);
    call(); // SetMonData(MON_DATA_HP)
  }
  instruction(7);
  branch(true); // bx to CreateMonWithEVSpreadNatureOTID

  const cycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES
    + romLiteralLoads * (THUMB_ROM_LITERAL_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES)
    + romTableLoads * (THUMB_ROM_TABLE_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES);
  return Object.freeze({
    speciesId,
    oldMaxHp,
    currentHp,
    newMaxHp,
    shedinja,
    rawLevelUpHp,
    storedLevelUpHp: rawLevelUpHp === 0 ? 1 : rawLevelUpHp,
    currentHpPath,
    writesCurrentHp,
    directCallCount,
    sequentialThumbHalfwords,
    pipelineRefills,
    romLiteralLoads,
    romTableLoads,
    cycles,
  });
}

/**
 * Reduce retail `GetMonData2` at `pokemon.c:3661-3711` / ELF
 * `0x0806a518..0x0806a672` from the signed field selector alone.
 *
 * Simple party fields complete through a fixed jump-table arm and EWRAM read.
 * Stat fields 59-63 retain their exact GetDeoxysStat entry/return shells, and
 * default fields retain their exact GetBoxMonData2 shells; neither nested body
 * is converted into an observed-duration table.
 */
export function reduceFactoryGetMonDataTiming(
  input: Readonly<FactoryGetMonDataTimingInput>,
): FactoryGetMonDataTiming {
  const field = requireSigned32(input.field, "field");
  const entryPc = 0x0806_a51a;
  const getBoxMonData2EntryPc = 0x0806_a676;
  const getDeoxysStatEntryPc = 0x0806_8a12;

  const direct = (
    route: FactoryGetMonDataRoute,
    valueWidth: 1 | 2 | 4,
    partyOffset: number,
  ): FactoryGetMonDataTiming => {
    const status = valueWidth === 4;
    const sequentialThumbHalfwords = status ? 17 : 19;
    const pipelineRefills = 4;
    const romLiteralLoads = 1;
    const romJumpTableLoads = 1;
    // The 32-bit EWRAM LDR occupies six cycles on the 16-bit bus at this
    // boundary; byte/halfword reads stay in the ordinary two-cycle class.
    // The sequential instruction baseline already counts two cycles.
    const ewramReadCycles = status ? 6 : 2;
    const cycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
      + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES
      + (romLiteralLoads + romJumpTableLoads) * (11 - THUMB_SEQUENTIAL_CYCLES)
      + (ewramReadCycles - THUMB_SEQUENTIAL_CYCLES);
    return Object.freeze({
      field,
      entryPc,
      route,
      directPartyRead: true,
      delegatedToGetBoxMonData2: false,
      valueWidth,
      partyOffset,
      getBoxMonData2EntryPc: null,
      getDeoxysStatEntryPc: null,
      sequentialThumbHalfwords,
      pipelineRefills,
      romLiteralLoads,
      romJumpTableLoads,
      ewramReadCycles,
      preDelegateCycles: null,
      returnShellCycles: null,
      overrideReturnShellCycles: null,
      partyFallbackReturnShellCycles: null,
      cycles,
      unresolved: null,
    });
  };

  switch (field) {
    case 55: return direct("party-status-u32", 4, 0x50);
    case 56: return direct("party-level-u8", 1, 0x54);
    case 57: return direct("party-hp-u16", 2, 0x56);
    case 58: return direct("party-max-hp-u16", 2, 0x58);
    case 64: return direct("party-mail-u8", 1, 0x55);
    case 84: return direct("party-attack2-u16", 2, 0x5a);
    case 85: return direct("party-defense2-u16", 2, 0x5c);
    case 86: return direct("party-speed2-u16", 2, 0x5e);
    case 87: return direct("party-sp-attack2-u16", 2, 0x60);
    case 88: return direct("party-sp-defense2-u16", 2, 0x62);
    default:
      break;
  }

  if (field >= 59 && field <= 63) {
    const routes = [
      "party-attack-via-get-deoxys-stat",
      "party-defense-via-get-deoxys-stat",
      "party-speed-via-get-deoxys-stat",
      "party-sp-attack-via-get-deoxys-stat",
      "party-sp-defense-via-get-deoxys-stat",
    ] as const;
    return Object.freeze({
      field,
      entryPc,
      route: routes[field - 59],
      directPartyRead: false,
      delegatedToGetBoxMonData2: false,
      valueWidth: 2,
      partyOffset: 0x5a + (field - 59) * 2,
      getBoxMonData2EntryPc: null,
      getDeoxysStatEntryPc,
      sequentialThumbHalfwords: 16,
      pipelineRefills: 3,
      romLiteralLoads: 1,
      romJumpTableLoads: 1,
      ewramReadCycles: null,
      preDelegateCycles: 68,
      returnShellCycles: null,
      overrideReturnShellCycles: 26,
      partyFallbackReturnShellCycles: 42,
      cycles: null,
      unresolved: "GetDeoxysStat nested timing/result is outside the direct party-field reducer",
    });
  }

  const compareDefault = field < 55 || field > 88;
  return Object.freeze({
    field,
    entryPc,
    route: compareDefault
      ? "compare-default-to-get-box-mon-data"
      : "table-default-to-get-box-mon-data",
    directPartyRead: false,
    delegatedToGetBoxMonData2: true,
    valueWidth: null,
    partyOffset: null,
    getBoxMonData2EntryPc,
    getDeoxysStatEntryPc: null,
    sequentialThumbHalfwords: compareDefault ? 15 : 19,
    pipelineRefills: compareDefault ? 3 : 4,
    romLiteralLoads: compareDefault ? 0 : 1,
    romJumpTableLoads: compareDefault ? 0 : 1,
    ewramReadCycles: null,
    preDelegateCycles: compareDefault ? 36 : 68,
    returnShellCycles: 12,
    overrideReturnShellCycles: null,
    partyFallbackReturnShellCycles: null,
    cycles: null,
    unresolved: "GetBoxMonData2 encrypted/default body timing is outside the direct party-field reducer",
  });
}

const GET_SUBSTRUCT_LOGICAL_TO_PHYSICAL = Object.freeze([
  [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
  [0, 2, 3, 1], [0, 3, 2, 1], [1, 0, 2, 3], [1, 0, 3, 2],
  [2, 0, 1, 3], [3, 0, 1, 2], [2, 0, 3, 1], [3, 0, 2, 1],
  [1, 2, 0, 3], [1, 3, 0, 2], [2, 1, 0, 3], [3, 1, 0, 2],
  [2, 3, 0, 1], [3, 2, 0, 1], [1, 2, 3, 0], [1, 3, 2, 0],
  [2, 1, 3, 0], [3, 1, 2, 0], [2, 3, 1, 0], [3, 2, 1, 0],
] as const);

const GET_SUBSTRUCT_MODULO_ARM_PCS = Object.freeze([
  0x0806_a2f8, 0x0806_a31c, 0x0806_a338, 0x0806_a34e,
  0x0806_a364, 0x0806_a380, 0x0806_a396, 0x0806_a3ac,
  0x0806_a3bc, 0x0806_a3da, 0x0806_a3f2, 0x0806_a402,
  0x0806_a416, 0x0806_a428, 0x0806_a43a, 0x0806_a44c,
  0x0806_a45e, 0x0806_a470, 0x0806_a482, 0x0806_a498,
  0x0806_a4ac, 0x0806_a4ba, 0x0806_a4cc, 0x0806_a4e0,
] as const);

// Counts from the compiled arm entry through the common GetSubstruct return
// (`0x0806a510`), using 2 cycles per ROM Thumb halfword and +6 for each taken
// control-flow refill.  Rows are personality % 24; columns are substruct
// types 0..3.  The non-contiguous arm PCs above and this table are both
// derived from the pinned ELF, not from an observed duration.
const GET_SUBSTRUCT_ARM_HALFWORDS = Object.freeze([
  [14, 14, 16, 18], [14, 12, 16, 18], [14, 12, 16, 19], [14, 12, 16, 19],
  [14, 12, 16, 18], [14, 12, 16, 19], [16, 10, 16, 18], [16, 10, 17, 19],
  [16, 10, 16, 19], [16, 10, 16, 19], [16, 10, 17, 19], [15, 10, 15, 19],
  [16, 11, 13, 19], [16, 11, 13, 19], [16, 11, 13, 19], [15, 11, 13, 19],
  [16, 11, 13, 19], [15, 11, 13, 19], [16, 11, 15, 16], [17, 11, 15, 17],
  [16, 11, 16, 17], [15, 11, 15, 17], [17, 11, 15, 17], [15, 11, 15, 15],
] as const);

const GET_SUBSTRUCT_ARM_PIPELINE_REFILLS = Object.freeze([
  [3, 4, 4, 7], [4, 3, 4, 6], [4, 3, 4, 7], [4, 3, 4, 7],
  [4, 3, 4, 6], [4, 3, 4, 7], [4, 2, 5, 7], [5, 2, 5, 7],
  [4, 2, 5, 8], [5, 2, 5, 8], [5, 2, 5, 7], [5, 2, 4, 6],
  [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 2, 5],
  [4, 3, 2, 5], [4, 3, 2, 5], [4, 3, 3, 2], [4, 3, 4, 4],
  [4, 3, 4, 3], [4, 3, 3, 3], [4, 3, 4, 4], [3, 3, 4, 3],
] as const);

const GET_SUBSTRUCT_ARM_TARGET_PCS = Object.freeze([
  0x0806_a50e, // physical slot 0: return the box+0x20 base
  0x0806_a508, // physical slot 1
  0x0806_a502, // physical slot 2
  0x0806_a4fc, // physical slot 3
] as const);

// `GetBoxMonData3` establishes pointers for 0..3 before decrypting, then
// `CalculateBoxMonChecksum` independently establishes 0..3 again. Both
// sequences are visible in pokemon.c and in the two pinned ELF call blocks.
const GET_BOX_MON_DATA_GET_SUBSTRUCT_TYPES = Object.freeze([
  0, 1, 2, 3, 0, 1, 2, 3,
] as const satisfies readonly FactoryGetSubstructType[]);

const GET_BOX_COMMON_FETCH_CLASSES = Object.freeze([
  "rom-thumb-sequential",
  "rom-literal-u32",
  "rom-jump-table-u32",
  "ewram-u8",
  "ewram-u16",
  "ewram-u32-on-16-bit-bus",
] as const);

const GET_BOX_COMMON_BOUNDARIES = Object.freeze({
  symbolEntryPc: 0x0806_a674,
  probeEntryPc: 0x0806_a676,
  firstGetSubstructCallPc: 0x0806_a698,
  decryptCallPc: 0x0806_a6c6,
  checksumCallPc: 0x0806_a6cc,
  dispatchPc: 0x0806_a6f2,
  commonTailPc: 0x0806_ac8c,
  encryptCallPc: 0x0806_ac94,
  returnTailPc: 0x0806_ac98,
  getSubstructSymbolEntryPc: 0x0806_a270,
  moduloCallPc: 0x0806_a27e,
  moduloReturnPc: 0x0806_a282,
  getSubstructDispatchPc: 0x0806_a288,
  getSubstructReturnPc: 0x0806_a510,
  decryptLoopPc: 0x0806_a256,
  checksumLoopPc: 0x0806_8cb2,
  encryptLoopPc: 0x0806_a232,
});

/** Exact private result for the one libgcc symbol used by GetSubstruct. */
interface GetSubstructModulo24Timing {
  remainder: number;
  entryPc: number;
  returnInstructionPc: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
  rorInternalCycles: number;
  loop1Iterations: number;
  loop2Iterations: number;
  loop3Iterations: number;
  cycles: number;
}

/**
 * Replay the full, pinned `__umodsi3(personality, 24)` libgcc symbol.
 *
 * This is intentionally a narrow reducer rather than an assumed alias of
 * `__udivsi3`: the ELF's `0x082e7be0..0x082e7c9e` body resets the temporary
 * quotient group in Loop3 and uses register ROR plus a correction tail to
 * recover a remainder. The only caller-specific work lies outside it in
 * GetSubstruct's BL at `0x0806a27e` and resume at `0x0806a282`.
 */
function reduceGetSubstructModulo24Timing(personalityValue: number): GetSubstructModulo24Timing {
  const personality = requireU32(personalityValue, "personality");
  let r0 = personality;
  let r1 = 24;
  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  let rorInternalCycles = 0;
  let loop1Iterations = 0;
  let loop2Iterations = 0;
  let loop3Iterations = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };
  const returnBranch = (): void => branch(true);
  const ror = (value: number, amount: number): number => {
    instruction();
    // The one-cycle Thumb instruction class omits ARM7TDMI's register-ROR
    // internal cycle; the mGBA/source timing receipt charges it explicitly.
    rorInternalCycles += 1;
    return rotateRight32(value, amount);
  };
  const result = (returnInstructionPc: number): GetSubstructModulo24Timing => Object.freeze({
    remainder: r0,
    entryPc: 0x082e_7be0,
    returnInstructionPc,
    sequentialThumbHalfwords,
    pipelineRefills,
    rorInternalCycles,
    loop1Iterations,
    loop2Iterations,
    loop3Iterations,
    cycles: sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
      + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES
      + rorInternalCycles,
  });

  instruction(); // cmp r1, #0
  branch(false); // beq Ldiv0: compiled divisor is the literal 24
  let r3 = 1;
  instruction(); // movs r3, #1
  instruction(); // cmp r0, r1
  const belowDivisor = r0 < r1;
  branch(!belowDivisor); // bcs Over1
  if (belowDivisor) {
    returnBranch(); // 0x082e7bea: mov pc, lr
    return result(0x082e_7bea);
  }

  instruction(); // push {r4}
  let r4 = 1;
  instruction();
  r4 = (r4 << 28) >>> 0;
  instruction();

  // ELF Loop1 at 0x082e7bf2: normalize four quotient bits at a time.
  while (true) {
    loop1Iterations += 1;
    instruction();
    const reachedLargeDivisor = r1 >= r4;
    branch(reachedLargeDivisor);
    if (reachedLargeDivisor) break;
    instruction();
    const reachedDividend = r1 >= r0;
    branch(reachedDividend);
    if (reachedDividend) break;
    r1 = (r1 << 4) >>> 0;
    r3 = (r3 << 4) >>> 0;
    instruction(2);
    branch(true);
  }

  r4 = (r4 << 3) >>> 0;
  instruction();
  // ELF Loop2 at 0x082e7c02: normalize the remaining zero to three bits.
  while (true) {
    loop2Iterations += 1;
    instruction();
    const reachedLargeDivisor = r1 >= r4;
    branch(reachedLargeDivisor);
    if (reachedLargeDivisor) break;
    instruction();
    const reachedDividend = r1 >= r0;
    branch(reachedDividend);
    if (reachedDividend) break;
    r1 = (r1 << 1) >>> 0;
    r3 = (r3 << 1) >>> 0;
    instruction(2);
    branch(true);
  }

  let ip = r3;
  let r2 = 0;
  // ELF Loop3 at 0x082e7c10: consume four quotient bits, retaining the
  // quotient-group bits solely for the tail correction below.
  while (true) {
    loop3Iterations += 1;
    r2 = 0;
    instruction(); // movs r2, #0

    instruction(); // cmp r0, r1
    const below0 = r0 < r1;
    branch(below0);
    if (!below0) {
      r0 = (r0 - r1) >>> 0;
      instruction();
    }

    r4 = r1 >>> 1;
    instruction();
    instruction(); // cmp r0, r4
    const below1 = r0 < r4;
    branch(below1);
    if (!below1) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      ip = r3;
      instruction();
      r4 = 1;
      instruction();
      r3 = ror(r3, r4);
      r2 = (r2 | r3) >>> 0;
      instruction();
      r3 = ip;
      instruction();
    }

    r4 = r1 >>> 2;
    instruction();
    instruction(); // cmp r0, r4
    const below2 = r0 < r4;
    branch(below2);
    if (!below2) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      ip = r3;
      instruction();
      r4 = 2;
      instruction();
      r3 = ror(r3, r4);
      r2 = (r2 | r3) >>> 0;
      instruction();
      r3 = ip;
      instruction();
    }

    r4 = r1 >>> 3;
    instruction();
    instruction(); // cmp r0, r4
    const below3 = r0 < r4;
    branch(below3);
    if (!below3) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      ip = r3;
      instruction();
      r4 = 3;
      instruction();
      r3 = ror(r3, r4);
      r2 = (r2 | r3) >>> 0;
      instruction();
      r3 = ip;
      instruction();
    }

    ip = r3;
    instruction(); // mov ip, r3
    instruction(); // cmp r0, #0
    const exactRemainder = r0 === 0;
    branch(exactRemainder);
    if (exactRemainder) break;
    r3 >>>= 4;
    instruction();
    const quotientDone = r3 === 0;
    branch(quotientDone);
    if (quotientDone) break;
    r1 >>>= 4;
    instruction();
    branch(true);
  }

  r4 = 14;
  instruction();
  r4 = (r4 << 28) >>> 0;
  instruction();
  r2 = (r2 & r4) >>> 0;
  instruction();
  const needsCorrection = r2 !== 0;
  branch(needsCorrection);
  if (!needsCorrection) {
    instruction(); // pop {r4}
    returnBranch(); // 0x082e7c66: mov pc, lr
    return result(0x082e_7c66);
  }

  r3 = ip;
  instruction();
  r4 = 3;
  instruction();
  r3 = ror(r3, r4);
  instruction();
  const skipThird = (r2 & r3) === 0;
  branch(skipThird);
  if (!skipThird) {
    r4 = r1 >>> 3;
    r0 = (r0 + r4) >>> 0;
    instruction(2);
  }

  r3 = ip;
  instruction();
  r4 = 2;
  instruction();
  r3 = ror(r3, r4);
  instruction();
  const skipSecond = (r2 & r3) === 0;
  branch(skipSecond);
  if (!skipSecond) {
    r4 = r1 >>> 2;
    r0 = (r0 + r4) >>> 0;
    instruction(2);
  }

  r3 = ip;
  instruction();
  r4 = 1;
  instruction();
  r3 = ror(r3, r4);
  instruction();
  const skipFirst = (r2 & r3) === 0;
  branch(skipFirst);
  if (!skipFirst) {
    r4 = r1 >>> 1;
    r0 = (r0 + r4) >>> 0;
    instruction(2);
  }

  instruction(); // pop {r4}
  returnBranch(); // 0x082e7c94: mov pc, lr
  return result(0x082e_7c94);
}

/**
 * Reduce the personality-selected GetSubstruct dispatch arm.
 *
 * The fixed shell is `GetSubstruct` `0x0806a270..0x0806a290`: seven ordinary
 * prologue halfwords, the two-halfword BL, the range check, the dispatch
 * shift, one PC-relative literal load, one ROM jump-table load, and the
 * `mov pc` refill.  That shell is 68 cycles excluding the body of
 * `__umodsi3`.  Each selected arm then performs only ROM instructions and
 * pointer arithmetic before joining the common return at `0x0806a510`.
 *
 * The exact `__umodsi3(personality, 24)` symbol is composed with the fixed
 * shell and selected arm here. It has no secure-data access of its own, so
 * `cycles` is complete for GetSubstruct. Async +18 service and VBlank/IRQ
 * pauses belong to the caller/accessor epoch and remain external.
 */
export function reduceFactoryGetSubstructTiming(
  personalityValue: number,
  substructTypeValue: number,
): FactoryGetSubstructTiming {
  const personality = requireU32(personalityValue, "personality");
  const substructType = requireNonnegativeInteger(substructTypeValue, "substructType");
  if (substructType > 3) {
    throw new Error(`substructType must be a source u8 in [0, 3], got ${substructType}`);
  }

  // Feed the dispatch from the independently reconstructed `__umodsi3`
  // result, rather than duplicating the host-language modulo operation.
  const modulo = reduceGetSubstructModulo24Timing(personality);
  const personalityModulo24 = modulo.remainder;
  const logicalToPhysicalSlots = GET_SUBSTRUCT_LOGICAL_TO_PHYSICAL[personalityModulo24]!;
  const selectedPhysicalSlot = logicalToPhysicalSlots[substructType as FactoryGetSubstructType]!;
  const armPc = GET_SUBSTRUCT_MODULO_ARM_PCS[personalityModulo24]!;
  const armSequentialThumbHalfwords = GET_SUBSTRUCT_ARM_HALFWORDS[personalityModulo24]![substructType]!;
  const armPipelineRefills = GET_SUBSTRUCT_ARM_PIPELINE_REFILLS[personalityModulo24]![substructType]!;
  const armInstructionFetchCycles = armSequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES;
  const commonNonModuloCycles = 68;
  const nonModuloCycles = commonNonModuloCycles
    + armInstructionFetchCycles
    + armPipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    personality,
    personalityModulo24,
    substructType: substructType as FactoryGetSubstructType,
    logicalToPhysicalSlots,
    selectedPhysicalSlot,
    secureStorageOffset: 0x20 + selectedPhysicalSlot * 12,
    armPc,
    armTargetPc: GET_SUBSTRUCT_ARM_TARGET_PCS[selectedPhysicalSlot]!,
    commonSequentialThumbHalfwords: 16,
    commonPipelineRefills: 3,
    commonRomLiteralLoads: 1,
    commonRomTableLoads: 1,
    commonNonModuloCycles,
    armSequentialThumbHalfwords,
    armPipelineRefills,
    armInstructionFetchCycles,
    moduloCallPc: 0x0806_a27e,
    moduloReturnPc: 0x0806_a282,
    moduloEntryPc: modulo.entryPc,
    moduloReturnInstructionPc: modulo.returnInstructionPc,
    moduloSequentialThumbHalfwords: modulo.sequentialThumbHalfwords,
    moduloPipelineRefills: modulo.pipelineRefills,
    moduloRorInternalCycles: modulo.rorInternalCycles,
    moduloLoop1Iterations: modulo.loop1Iterations,
    moduloLoop2Iterations: modulo.loop2Iterations,
    moduloLoop3Iterations: modulo.loop3Iterations,
    nonModuloCycles,
    moduloCycles: modulo.cycles,
    cycles: modulo.cycles + nonModuloCycles,
    unresolved: null,
  });
}

/**
 * Reduce one aligned retail ARM7TDMI EWRAM load/store.
 *
 * Pinned `BoxPokemon` storage is naturally word-aligned. On the retail GBA's
 * 16-bit EWRAM bus, aligned byte/halfword instructions take two master cycles;
 * an aligned word instruction performs two bus transfers and takes six. The
 * instruction census already charges two cycles for the load/store itself, so
 * callers add only `busPremiumCycles` when composing a component total.
 *
 * This reducer intentionally rejects rather than invents misaligned semantics.
 * No receipt-used crypt/checksum/field access is misaligned.
 */
export function reduceFactoryEwramAccessTiming(
  input: Readonly<{
    access: FactoryEwramAccessKind;
    width: FactoryEwramAccessWidth;
    address: number;
  }>,
): FactoryEwramAccessTiming {
  const address = requireU32(input.address, "address");
  if (input.access !== "read" && input.access !== "write") {
    throw new Error("access must be read or write");
  }
  if (input.width !== 1 && input.width !== 2 && input.width !== 4) {
    throw new Error("width must be 1, 2, or 4 bytes");
  }
  if (address < 0x0200_0000 || address + input.width > 0x0204_0000) {
    throw new Error("address must be in retail EWRAM");
  }
  if (input.width === 2 && (address & 1) !== 0) {
    throw new Error("misaligned EWRAM halfword behavior is not claimed");
  }
  if (input.width === 4 && (address & 3) !== 0) {
    throw new Error("misaligned EWRAM word behavior is not claimed");
  }
  const word = input.width === 4;
  return Object.freeze({
    region: "ewram",
    access: input.access,
    width: input.width,
    address,
    alignment: input.width,
    transfers: word ? 2 : 1,
    busWidth: 2,
    cycles: word ? 6 : 2,
    instructionBaselineCycles: 2,
    busPremiumCycles: word ? 4 : 0,
    unresolved: null,
  } as const);
}

function sumFactoryEwramAccesses(
  accesses: readonly FactoryEwramAccessTiming[],
): Readonly<{ cycles: number; premiumCycles: number }> {
  return Object.freeze({
    cycles: accesses.reduce((total, access) => total + access.cycles, 0),
    premiumCycles: accesses.reduce((total, access) => total + access.busPremiumCycles, 0),
  });
}

/**
 * Reduce the fixed ROM instruction stream of one 12-word crypt loop.
 *
 * Both helpers have 5 prologue halfwords, 12 iterations × 10 halfwords, and
 * 3 epilogue halfwords.  Eleven loop back-edges plus the final `bx` refill
 * are the 12 taken flows.  Each iteration has three word reads and two word
 * writes in EWRAM; their bus cost is deliberately kept null.
 */
export function reduceFactoryEncryptedWordLoopTiming(
  kind: FactoryEncryptedWordLoopKind,
): FactoryEncryptedWordLoopTiming {
  const entryPc = kind === "decrypt" ? 0x0806_a24c : 0x0806_a228;
  const loopPc = kind === "decrypt" ? 0x0806_a256 : 0x0806_a232;
  const returnPc = kind === "decrypt" ? 0x0806_a26e : 0x0806_a24a;
  const sequentialThumbHalfwords = 5 + 12 * 10 + 3;
  const pipelineRefills = 11 + 1;
  const representativeRead = reduceFactoryEwramAccessTiming({
    access: "read", width: 4, address: 0x0200_0020,
  });
  const representativeWrite = reduceFactoryEwramAccessTiming({
    access: "write", width: 4, address: 0x0200_0020,
  });
  const dataAccessCycles = 36 * representativeRead.cycles + 24 * representativeWrite.cycles;
  const dataAccessPremiumCycles = 36 * representativeRead.busPremiumCycles
    + 24 * representativeWrite.busPremiumCycles;
  const instructionFetchCycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    kind,
    entryPc,
    loopPc,
    returnPc,
    iterations: 12,
    ewramWordReads: 36,
    ewramWordWrites: 24,
    sequentialThumbHalfwords,
    pipelineRefills,
    instructionFetchCycles,
    dataAccessCycles,
    dataAccessPremiumCycles,
    cycles: instructionFetchCycles + dataAccessPremiumCycles,
    unresolved: null,
  });
}

export function reduceFactoryDecryptBoxMonTiming(): FactoryEncryptedWordLoopTiming {
  return reduceFactoryEncryptedWordLoopTiming("decrypt");
}

export function reduceFactoryEncryptBoxMonTiming(): FactoryEncryptedWordLoopTiming {
  return reduceFactoryEncryptedWordLoopTiming("encrypt");
}

/**
 * Reduce the four fixed six-halfword checksum loops without claiming their
 * EWRAM read latency.  Seven setup/pointer halfwords surround 192 loop-body
 * halfwords; five of each loop's six `bge` edges are taken.
 */
export function reduceFactoryChecksumLoopTiming(): FactoryChecksumLoopTiming {
  const sequentialThumbHalfwords = 4 * 6 * 8 + 7;
  const pipelineRefills = 4 * 5;
  const representativeRead = reduceFactoryEwramAccessTiming({
    access: "read", width: 2, address: 0x0200_0020,
  });
  const ewramHalfwordReadCycles = 24 * representativeRead.cycles;
  const ewramReadPremiumCycles = 24 * representativeRead.busPremiumCycles;
  const instructionFetchCycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    entryPc: 0x0806_8c78,
    firstLoopSetupPc: 0x0806_8cb0,
    firstReadPc: 0x0806_8cb2,
    afterLoopPc: 0x0806_8cfe,
    substructCount: 4,
    halfwordsPerSubstruct: 6,
    checksumHalfwordReads: 24,
    sequentialThumbHalfwords,
    pipelineRefills,
    instructionFetchCycles,
    ewramHalfwordReadCycles,
    ewramReadPremiumCycles,
    cycles: instructionFetchCycles + ewramReadPremiumCycles,
    unresolved: null,
  });
}

export function reduceFactoryCalculateBoxMonChecksumTiming(): FactoryChecksumLoopTiming {
  return reduceFactoryChecksumLoopTiming();
}

function reduceFactoryChecksumTailTiming(checksumValid: boolean): FactoryChecksumTailTiming {
  const accesses: FactoryEwramAccessTiming[] = [
    reduceFactoryEwramAccessTiming({ access: "read", width: 2, address: 0x0200_001c }),
  ];
  if (!checksumValid) {
    accesses.push(
      reduceFactoryEwramAccessTiming({ access: "read", width: 1, address: 0x0200_0013 }),
      reduceFactoryEwramAccessTiming({ access: "write", width: 1, address: 0x0200_0013 }),
      // The physical substruct-3 slot varies, but every 12-byte slot's +7 byte
      // has the same width/alignment/bus class.
      reduceFactoryEwramAccessTiming({ access: "read", width: 1, address: 0x0200_0027 }),
      reduceFactoryEwramAccessTiming({ access: "write", width: 1, address: 0x0200_0027 }),
    );
  }
  const route = checksumValid ? "valid" : "invalid-marks-bad-egg";
  const sequentialThumbHalfwords = checksumValid ? 6 : 17;
  const pipelineRefills = checksumValid ? 1 : 0;
  const data = sumFactoryEwramAccesses(accesses);
  const instructionFetchCycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    route,
    entryPc: 0x0806_a6d0,
    dispatchPc: 0x0806_a6f2,
    sequentialThumbHalfwords,
    pipelineRefills,
    halfwordReads: 1,
    byteReads: checksumValid ? 0 : 2,
    byteWrites: checksumValid ? 0 : 2,
    dataAccessCycles: data.cycles,
    dataAccessPremiumCycles: data.premiumCycles,
    instructionFetchCycles,
    cycles: instructionFetchCycles + data.premiumCycles,
    unresolved: null,
  });
}

function reduceFactoryFieldTailTiming(input: Readonly<{
  field: number;
  tailEntryPc: number;
  secureStorageOffset: number;
  badEggSpecies: boolean;
}>): FactoryFieldTailTiming {
  let route: FactoryFieldTailRoute;
  let sequentialThumbHalfwords: number;
  let pipelineRefills = 1;
  const accesses: FactoryEwramAccessTiming[] = [];
  const read = (width: FactoryEwramAccessWidth, relativeAddress: number): void => {
    accesses.push(reduceFactoryEwramAccessTiming({
      access: "read", width, address: 0x0200_0000 + relativeAddress,
    }));
  };

  if (input.field === 11) {
    read(1, 0x13); // BoxPokemon::isBadEgg bit container.
    if (input.badEggSpecies) {
      route = "bad-egg-species";
      sequentialThumbHalfwords = 9;
    } else {
      route = "species";
      sequentialThumbHalfwords = 11;
      pipelineRefills = 2;
      read(2, input.secureStorageOffset);
    }
  } else if (input.field === 25) {
    route = "experience";
    sequentialThumbHalfwords = 3;
    read(4, input.secureStorageOffset + 4);
  } else if (input.field >= 26 && input.field <= 31) {
    route = "ev-byte";
    sequentialThumbHalfwords = 2;
    read(1, input.secureStorageOffset + input.field - 26);
  } else {
    route = "iv-bitfield";
    sequentialThumbHalfwords = 4;
    const ivWidths: readonly FactoryEwramAccessWidth[] = [1, 2, 1, 4, 2, 1];
    const ivOffsets = [4, 4, 5, 4, 6, 7] as const;
    const index = input.field - 39;
    read(ivWidths[index]!, input.secureStorageOffset + ivOffsets[index]!);
  }

  const data = sumFactoryEwramAccesses(accesses);
  const instructionFetchCycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES;
  return Object.freeze({
    route,
    entryPc: input.tailEntryPc,
    commonTailPc: 0x0806_ac8c,
    sequentialThumbHalfwords,
    pipelineRefills,
    byteReads: accesses.filter((access) => access.access === "read" && access.width === 1).length,
    halfwordReads: accesses.filter((access) => access.access === "read" && access.width === 2).length,
    wordReads: accesses.filter((access) => access.access === "read" && access.width === 4).length,
    dataAccessCycles: data.cycles,
    dataAccessPremiumCycles: data.premiumCycles,
    instructionFetchCycles,
    cycles: instructionFetchCycles + data.premiumCycles,
    unresolved: null,
  });
}

/**
 * Census the common encrypted accessor dependency without reducing its total.
 *
 * Pinned source: pokemon.c GetBoxMonData3, GetSubstruct, DecryptBoxMon,
 * CalculateBoxMonChecksum, and EncryptBoxMon. Pinned ELF boundaries are
 * exposed above so probes/tests can observe stable segments without retaining
 * a BoxMon pointer or any decrypted secure bytes.
 */
export function censusFactoryGetBoxMonDataDependency(
  input: Readonly<FactoryGetBoxMonDataDependencyInput>,
): FactoryGetBoxMonDataDependency {
  const field = requireSigned32(input.field, "field");
  const personality = requireU32(input.personality, "personality");
  if (typeof input.checksumValid !== "boolean") throw new Error("checksumValid must be boolean");
  if (typeof input.isBadEgg !== "boolean") throw new Error("isBadEgg must be boolean");

  let fieldGroup: FactoryGetBoxMonDataFieldGroup;
  let logicalSubstruct: 0 | 2 | 3;
  let tailEntryPc: number;
  let fetchClass: FactoryGetBoxMonDataFetchClass;
  if (field === 11) {
    fieldGroup = "species";
    logicalSubstruct = 0;
    tailEntryPc = 0x0806_a95e;
    fetchClass = "ewram-u16-conditional";
  } else if (field === 25) {
    fieldGroup = "experience";
    logicalSubstruct = 0;
    tailEntryPc = 0x0806_a97c;
    fetchClass = "ewram-u32";
  } else if (field >= 26 && field <= 31) {
    fieldGroup = "ev-byte";
    logicalSubstruct = 2;
    tailEntryPc = 0x0806_a9a4 + (field - 26) * 4;
    fetchClass = "ewram-u8";
  } else if (field >= 39 && field <= 44) {
    const tails = [0x0806_a9f6, 0x0806_a9fe, 0x0806_aa06, 0x0806_aa0e, 0x0806_aa16, 0x0806_aa1e];
    const classes: FactoryGetBoxMonDataFetchClass[] = [
      "ewram-u8-bitfield", "ewram-u16-bitfield", "ewram-u8-bitfield",
      "ewram-u32-bitfield", "ewram-u16-bitfield", "ewram-u8-bitfield",
    ];
    fieldGroup = "iv-bitfield";
    logicalSubstruct = 3;
    tailEntryPc = tails[field - 39]!;
    fetchClass = classes[field - 39]!;
  } else {
    throw new Error("field is outside the CalculateMonStats/GetLevelFromMonExp encrypted subset");
  }

  const getSubstructTimings = Object.freeze(GET_BOX_MON_DATA_GET_SUBSTRUCT_TYPES.map((substructType) => (
    reduceFactoryGetSubstructTiming(personality, substructType)
  )));
  // The selected field arm is one of the source-proven outer setup calls, so
  // reuse that exact `% 24` reduction rather than a host-language modulo.
  const selectedSubstructTiming = getSubstructTimings[logicalSubstruct]!;
  const personalityModulo24 = selectedSubstructTiming.personalityModulo24;
  const logicalToPhysicalSlots = selectedSubstructTiming.logicalToPhysicalSlots;
  const selectedPhysicalSlot = selectedSubstructTiming.selectedPhysicalSlot;
  const secureStorageOffset = 0x20 + selectedPhysicalSlot * 12;
  const getSubstructCycles = getSubstructTimings.reduce((total, timing) => total + timing.cycles, 0);
  const sharedInstructionFetchCycles = 328 + 518 + 328;
  const decryptLoopTiming = reduceFactoryDecryptBoxMonTiming();
  const checksumLoopTiming = reduceFactoryChecksumLoopTiming();
  const encryptLoopTiming = reduceFactoryEncryptBoxMonTiming();
  const checksumTailTiming = reduceFactoryChecksumTailTiming(input.checksumValid);
  const badEggSpecies = field === 11 && (input.isBadEgg || !input.checksumValid);
  const fieldTailTiming = reduceFactoryFieldTailTiming({
    field,
    tailEntryPc,
    secureStorageOffset,
    badEggSpecies,
  });
  const sharedDataBusCycles = decryptLoopTiming.dataAccessCycles
    + checksumLoopTiming.ewramHalfwordReadCycles
    + encryptLoopTiming.dataAccessCycles;
  const sharedDataBusPremiumCycles = decryptLoopTiming.dataAccessPremiumCycles
    + checksumLoopTiming.ewramReadPremiumCycles
    + encryptLoopTiming.dataAccessPremiumCycles;
  const tailDataBusCycles = checksumTailTiming.dataAccessCycles + fieldTailTiming.dataAccessCycles;
  const tailCycles = checksumTailTiming.cycles + fieldTailTiming.cycles;
  const composedKnownCycles = getSubstructCycles
    + decryptLoopTiming.cycles
    + checksumLoopTiming.cycles
    + encryptLoopTiming.cycles
    + tailCycles;
  return Object.freeze({
    field,
    personality,
    personalityModulo24,
    fieldGroup,
    logicalSubstruct,
    logicalToPhysicalSlots,
    getSubstructModuloArmPc: GET_SUBSTRUCT_MODULO_ARM_PCS[personalityModulo24]!,
    selectedPhysicalSlot,
    secureStorageOffset,
    tailEntryPc,
    fetchClass,
    commonFetchClasses: GET_BOX_COMMON_FETCH_CLASSES,
    checksumRoute: input.checksumValid ? "valid" : "invalid-marks-bad-egg",
    speciesTailRoute: field !== 11
      ? "not-applicable"
      : input.isBadEgg || !input.checksumValid ? "bad-egg-species" : "species",
    selectedSubstructTiming,
    getSubstructTypes: GET_BOX_MON_DATA_GET_SUBSTRUCT_TYPES,
    getSubstructTimings,
    getSubstructCycles,
    decryptLoopTiming,
    checksumLoopTiming,
    encryptLoopTiming,
    sharedInstructionFetchCycles,
    composedInstructionFetchCycles: sharedInstructionFetchCycles + getSubstructCycles,
    sharedDataBusCycles,
    sharedDataBusPremiumCycles,
    checksumTailTiming,
    fieldTailTiming,
    tailDataBusCycles,
    tailCycles,
    composedKnownCycles,
    getSubstructCalls: 8,
    decryptIterations: 12,
    checksumHalfwordReads: 24,
    encryptIterations: 12,
    boundaries: GET_BOX_COMMON_BOUNDARIES,
    cycles: null,
    unresolved: "complete GetBoxMonData2 timing still awaits outer prologue/setup/dispatch/common-return instruction and memory costs, async +18, and VBlank/IRQ costs",
  });
}

/**
 * Reduce the retail `SetMonData` direct-party-field switch at
 * `pokemon.c:4105-4141` / ELF `0x0806acac..0x0806ad98`.
 *
 * The calculated-stats calls are all fields 56-63: level takes the u8 arm,
 * and HP/max-HP/five stats take the seven structurally identical u16 arms.
 * The field selector alone chooses a direct arm. The data bytes are copied
 * straight through `ldrb`/`str{b,h}` instructions and never feed a compare,
 * branch, address calculation beyond the fixed selected destination, or
 * memory-width choice, so accepting a value would only create a spurious
 * timing key.
 *
 * Direct paths have one common ROM dispatcher (11 Thumb halfwords): its
 * PC-relative table-base LDR and indexed jump-table word LDR each cost 11
 * master cycles in the instruction audit, and `mov pc, r0` refills the Thumb
 * pipeline. The selected status/byte/halfword path returns through the same
 * `pop; bx` tail. Thus the reducer counts instructions and ROM fetch classes,
 * rather than adopting the observed 72/78 values as constants.
 *
 * Field values outside the unsigned `55..65` dispatch interval take the
 * compiled `bhi` default arm and call `SetBoxMonData` at `0x0806ad9c`. Its
 * encrypted/decrypt/checksum body is deliberately not claimed here; the
 * returned shell timings make that boundary explicit without a duration key.
 */
export function reduceFactorySetMonDataTiming(
  input: Readonly<FactorySetMonDataTimingInput>,
): FactorySetMonDataTiming {
  const field = requireSigned32(input.field, "field");
  const entryPc = 0x0806_acae;
  const isDirectDispatchField = field >= 55 && field <= 65;

  if (!isDirectDispatchField) {
    // `push`, r3 copy, selector setup/comparison, taken `bhi`, r0 restore,
    // two-halfword BL, then after the nested return `pop; bx`.
    const sequentialThumbHalfwords = 11;
    const pipelineRefills = 3; // `bhi`, BL, bx
    const preDelegateCycles = 30;
    const returnShellCycles = 10;
    return Object.freeze({
      field,
      entryPc,
      route: "delegates-to-set-box-mon-data",
      directPartyWrite: false,
      delegatedToSetBoxMonData: true,
      valueWidth: null,
      partyOffset: null,
      setBoxMonDataEntryPc: 0x0806_ad9e,
      sequentialThumbHalfwords,
      pipelineRefills,
      romLiteralLoads: 0,
      romJumpTableLoads: 0,
      preDelegateCycles,
      returnShellCycles,
      cycles: null,
      unresolved: "SetBoxMonData encrypted-body timing is outside the direct party-data reducer",
    });
  }

  let route: FactorySetMonDataRoute;
  let directPartyWrite: boolean;
  let valueWidth: FactorySetMonDataTiming["valueWidth"];
  let partyOffset: number | null;
  let selectedPathHalfwords: number;
  let pipelineRefills: number;

  switch (field) {
    case 55:
      route = "party-status-u32";
      directPartyWrite = true;
      valueWidth = 4;
      partyOffset = 80;
      // Four byte reads, three shifts, three adds, store, then branch.
      selectedPathHalfwords = 12;
      pipelineRefills = 3; // indirect jump, case `b`, bx
      break;
    case 56:
      route = "party-level-u8";
      directPartyWrite = true;
      valueWidth = 1;
      partyOffset = 84;
      // Byte read, destination setup, byte store, branch to epilogue.
      selectedPathHalfwords = 5;
      pipelineRefills = 3;
      break;
    case 57:
      route = "party-hp-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 86;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 58:
      route = "party-max-hp-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 88;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 59:
      route = "party-attack-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 90;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 60:
      route = "party-defense-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 92;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 61:
      route = "party-speed-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 94;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 62:
      route = "party-sp-attack-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 96;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 63:
      route = "party-sp-defense-u16";
      directPartyWrite = true;
      valueWidth = 2;
      partyOffset = 98;
      selectedPathHalfwords = 8;
      pipelineRefills = 3;
      break;
    case 64:
      route = "party-mail-u8";
      directPartyWrite = true;
      valueWidth = 1;
      partyOffset = 85;
      selectedPathHalfwords = 5;
      pipelineRefills = 3;
      break;
    case 65:
      // Source case MON_DATA_SPECIES_OR_EGG intentionally falls through to
      // `pop; bx` after the dispatcher; it neither reads dataArg nor writes.
      route = "party-species-or-egg-noop";
      directPartyWrite = false;
      valueWidth = 0;
      partyOffset = null;
      selectedPathHalfwords = 0;
      pipelineRefills = 2; // indirect jump directly to epilogue, then bx
      break;
    default:
      // The interval guard above exhausts the compiled 11-entry jump table.
      throw new Error(`unreachable direct SetMonData field ${field}`);
  }

  // Common dispatcher: push, selector arithmetic/guard, table-base literal,
  // indexed pointer load, and `mov pc`; all direct routes then execute `pop;
  // bx`. The selected path includes its own branch-to-epilogue if present.
  const sequentialThumbHalfwords = 11 + selectedPathHalfwords + 2;
  const romLiteralLoads = 1;
  const romJumpTableLoads = 1;
  const cycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES
    + romLiteralLoads * (THUMB_ROM_LITERAL_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES)
    + romJumpTableLoads * (THUMB_ROM_JUMP_TABLE_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES);

  return Object.freeze({
    field,
    entryPc,
    route,
    directPartyWrite,
    delegatedToSetBoxMonData: false,
    valueWidth,
    partyOffset,
    setBoxMonDataEntryPc: null,
    sequentialThumbHalfwords,
    pipelineRefills,
    romLiteralLoads,
    romJumpTableLoads,
    preDelegateCycles: null,
    returnShellCycles: null,
    cycles,
    unresolved: null,
  });
}

interface UnsignedDivisionCoreTiming {
  quotient: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
}

/**
 * Replay the shared inline unsigned Loop1/2/3 body used by retail
 * `__udivsi3` (`0x082e7b72`) and by `__divsi3` after its sign wrapper
 * (`0x082e755c`). The bodies share these instructions exactly, but their
 * entry/setup/return boundaries remain separate below. This is not the
 * distinct `__umodsi3` body used by the nature reducers: its Loop3 resets and
 * rotates a different result register, so it is intentionally not shared.
 */
function reduceUnsignedDivisionCoreTiming(
  dividend: number,
  divisor: number,
): UnsignedDivisionCoreTiming {
  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };

  let r0 = requireU32(dividend, "unsigned dividend");
  let r1 = requireU32(divisor, "unsigned divisor");
  if (r1 === 0) throw new Error("unsigned divisor must be nonzero");
  let r3 = 1;
  let r2 = 0;
  instruction(); // cmp r0, r1
  const belowDivisor = r0 < r1;
  branch(belowDivisor); // bcc Lgot_result
  if (belowDivisor) {
    instruction(); // adds r0, r2, #0
    return { quotient: r2, sequentialThumbHalfwords, pipelineRefills };
  }

  let r4 = 1;
  instruction();
  r4 = (r4 << 28) >>> 0;
  instruction();

  // `__udivsi3` Loop1: establish the first four-bit quotient group.
  while (true) {
    instruction();
    const reachedLargeDivisor = r1 >= r4;
    branch(reachedLargeDivisor);
    if (reachedLargeDivisor) break;
    instruction();
    const reachedDividend = r1 >= r0;
    branch(reachedDividend);
    if (reachedDividend) break;
    r1 = (r1 << 4) >>> 0;
    instruction();
    r3 = (r3 << 4) >>> 0;
    instruction();
    branch(true);
  }

  r4 = (r4 << 3) >>> 0;
  instruction();
  // `__udivsi3` Loop2: establish the remaining one to three quotient bits.
  while (true) {
    instruction();
    const reachedLargeDivisor = r1 >= r4;
    branch(reachedLargeDivisor);
    if (reachedLargeDivisor) break;
    instruction();
    const reachedDividend = r1 >= r0;
    branch(reachedDividend);
    if (reachedDividend) break;
    r1 = (r1 << 1) >>> 0;
    instruction();
    r3 = (r3 << 1) >>> 0;
    instruction();
    branch(true);
  }

  // `__udivsi3` Loop3: consume four quotient bits per iteration.
  while (true) {
    instruction();
    const belowFirst = r0 < r1;
    branch(belowFirst);
    if (!belowFirst) {
      r0 = (r0 - r1) >>> 0;
      instruction();
      r2 = (r2 | r3) >>> 0;
      instruction();
    }

    r4 = r1 >>> 1;
    instruction();
    instruction(); // cmp r0, r4
    const belowSecond = r0 < r4;
    branch(belowSecond);
    if (!belowSecond) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      r4 = r3 >>> 1;
      instruction();
      r2 = (r2 | r4) >>> 0;
      instruction();
    }

    r4 = r1 >>> 2;
    instruction();
    instruction(); // cmp r0, r4
    const belowThird = r0 < r4;
    branch(belowThird);
    if (!belowThird) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      r4 = r3 >>> 2;
      instruction();
      r2 = (r2 | r4) >>> 0;
      instruction();
    }

    r4 = r1 >>> 3;
    instruction();
    instruction(); // cmp r0, r4
    const belowFourth = r0 < r4;
    branch(belowFourth);
    if (!belowFourth) {
      r0 = (r0 - r4) >>> 0;
      instruction();
      r4 = r3 >>> 3;
      instruction();
      r2 = (r2 | r4) >>> 0;
      instruction();
    }

    instruction(); // cmp r0, #0
    const remainderIsZero = r0 === 0;
    branch(remainderIsZero);
    if (remainderIsZero) break;
    r3 >>>= 4;
    instruction();
    const quotientIsComplete = r3 === 0;
    branch(quotientIsComplete);
    if (quotientIsComplete) break;
    r1 >>>= 4;
    instruction();
    branch(true);
  }

  instruction(); // adds r0, r2, #0
  return { quotient: r2, sequentialThumbHalfwords, pipelineRefills };
}

interface UnsignedDivisionBy100Timing extends UnsignedDivisionCoreTiming {}

/**
 * Replay the complete retail `__udivsi3` boundary at `0x082e7b68` for its
 * one nonzero constant divisor. Its setup and return remain distinct from
 * `__divsi3`; only the exact Loop1/2/3 body is factored above.
 */
function reduceUnsignedDivisionBy100Timing(dividend: number): UnsignedDivisionBy100Timing {
  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };

  instruction(); // cmp r1, #0
  branch(false); // beq Ldiv0; divisor is the compiled constant 100
  instruction(); // movs r3, #1
  instruction(); // movs r2, #0
  instruction(); // push {r4}
  const core = reduceUnsignedDivisionCoreTiming(dividend, 100);
  instruction(); // pop {r4}
  branch(true); // mov pc, lr
  return {
    quotient: core.quotient,
    sequentialThumbHalfwords: sequentialThumbHalfwords + core.sequentialThumbHalfwords,
    pipelineRefills: pipelineRefills + core.pipelineRefills,
  };
}

/**
 * Reduce one complete retail `__divsi3` call at ELF `0x082e7542`.
 *
 * `__divsi3` is not a call to the separate `__udivsi3` symbol: its wrapper
 * records the sign in `ip`, negates each negative operand in place, then
 * enters an inline copy of the exact `__udivsi3` Loop1/Loop2/Loop3 body at
 * `0x082e755c`. The wrapper applies the result sign at `Lgot_result` and has
 * a distinct `__div0` call/return path for a zero divisor. All branch choices
 * below come only from the source signed-i32 ABI values; no mon, set,
 * fixture, frame, tick, cursor, or observed-duration key is accepted.
 */
export function reduceFactorySignedDivisionTiming(
  input: Readonly<FactorySignedDivisionTimingInput>,
): FactorySignedDivisionTiming {
  const dividend = requireSigned32(input.dividend, "dividend");
  const divisor = requireSigned32(input.divisor, "divisor");
  const dividendBits = dividend >>> 0;
  const divisorBits = divisor >>> 0;
  const dividendNegative = dividend < 0;
  const divisorNegative = divisor < 0;
  const signNegative = ((dividendBits ^ divisorBits) & 0x8000_0000) !== 0;
  const divisorZero = divisor === 0;
  const overflow = dividend === -0x8000_0000 && divisor === -1;
  const dividendMagnitude = dividendNegative
    ? (-dividendBits) >>> 0
    : dividendBits;
  const divisorMagnitude = divisorNegative
    ? (-divisorBits) >>> 0
    : divisorBits;

  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };
  const call = (): void => {
    instruction(2); // Thumb BL pair
    pipelineRefills += 1;
  };

  instruction(); // cmp r1, #0
  branch(divisorZero); // beq Ldiv0
  if (divisorZero) {
    instruction(); // push {lr}
    call(); // BL __div0
    instruction(); // __div0: mov pc, lr
    pipelineRefills += 1;
    instruction(); // movs r0, #0
    branch(true); // pop {pc}
    return Object.freeze({
      dividend,
      divisor,
      entryPc: 0x082e_7542,
      unsignedCoreEntryPc: 0x082e_755c,
      dividendMagnitude,
      divisorMagnitude,
      signNegative,
      divisorZero,
      overflow,
      resultBits: 0,
      result: 0,
      unsignedCoreSequentialThumbHalfwords: 0,
      unsignedCorePipelineRefills: 0,
      sequentialThumbHalfwords,
      pipelineRefills,
      cycles: sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
        + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES,
    });
  }

  instruction(); // push {r4}
  instruction(); // adds r4, r0, #0
  instruction(); // eors r4, r1
  instruction(); // mov ip, r4
  instruction(); // movs r3, #1
  instruction(); // movs r2, #0
  instruction(); // cmp r1, #0
  branch(!divisorNegative); // bpl Over1
  if (divisorNegative) instruction(); // negs r1, r1
  instruction(); // cmp r0, #0
  branch(!dividendNegative); // bpl Over2
  if (dividendNegative) instruction(); // negs r0, r0

  const core = reduceUnsignedDivisionCoreTiming(dividendMagnitude, divisorMagnitude);
  sequentialThumbHalfwords += core.sequentialThumbHalfwords;
  pipelineRefills += core.pipelineRefills;
  instruction(); // mov r4, ip
  instruction(); // cmp r4, #0
  branch(!signNegative); // bpl Over7
  if (signNegative) instruction(); // negs r0, r0
  instruction(); // pop {r4}
  branch(true); // mov pc, lr

  const resultBits = signNegative ? (-core.quotient) >>> 0 : core.quotient >>> 0;
  const result = resultBits >= 0x8000_0000
    ? resultBits - 0x1_0000_0000
    : resultBits;
  return Object.freeze({
    dividend,
    divisor,
    entryPc: 0x082e_7542,
    unsignedCoreEntryPc: 0x082e_755c,
    dividendMagnitude,
    divisorMagnitude,
    signNegative,
    divisorZero,
    overflow,
    resultBits,
    result,
    unsignedCoreSequentialThumbHalfwords: core.sequentialThumbHalfwords,
    unsignedCorePipelineRefills: core.pipelineRefills,
    sequentialThumbHalfwords,
    pipelineRefills,
    cycles: sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
      + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES,
  });
}

/**
 * ARM7TDMI's `muls r0, r3` uses the zero-extended source stat in r3 as its
 * early-termination operand. A source u16 is one internal cycle through 255
 * and two thereafter; the normal 2-cycle Thumb class already includes the
 * first internal cycle, so callers add only `m - 1` to the total.
 */
function multiplyInternalCyclesForSourceU16(stat: number): 1 | 2 {
  return stat <= 0xff ? 1 : 2;
}

/**
 * Reduce the complete direct `ModifyStatByNature` callee, including its
 * nested unsigned divide when the stat's nature row is non-neutral.
 *
 * This follows `pokemon.c:5878-5911` and the pinned retail body at
 * `0x0806d8d4..0x0806d932`: the u8 stat-index guard, the PC-relative
 * `gNatureStatTable` lookup, its signed-byte three-way branch, the source
 * u16 multiplication truncation, and libgcc's `__udivsi3` Loop1/2/3 path.
 * It accepts only a real `GetNature` result (0..24), never a mon, set,
 * trainer, battle/frame/tick/cursor, receipt id, or observed duration.
 *
 * The reducer is deliberately standalone. It does not wire the aggregate
 * `CalculateMonStats` operation or construction clock: the sibling Get/Set,
 * level, signed-divide, and nature-fetch callee budgets remain unresolved.
 */
export function reduceFactoryModifyStatByNatureTiming(
  input: Readonly<FactoryModifyStatByNatureTimingInput>,
): FactoryModifyStatByNatureTiming {
  const nature = requireNonnegativeInteger(input.nature, "nature");
  const stat = requireNonnegativeInteger(input.stat, "stat");
  const statIndex = requireNonnegativeInteger(input.statIndex, "statIndex");
  if (nature > 24) throw new Error(`nature must be a GetNature result in [0, 24], got ${nature}`);
  if (stat > 0xffff) throw new Error(`stat must be a source u16, got ${stat}`);
  if (statIndex > 0xff) throw new Error(`statIndex must be a source u8, got ${statIndex}`);

  let sequentialThumbHalfwords = 0;
  let pipelineRefills = 0;
  let romLiteralLoads = 0;
  let romTableLoads = 0;
  let multiplyInternalCycles: 0 | 1 | 2 = 0;
  const instruction = (count = 1): void => {
    sequentialThumbHalfwords += count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) pipelineRefills += 1;
  };
  const literalLoad = (): void => {
    instruction();
    romLiteralLoads += 1;
  };
  const tableLoad = (): void => {
    instruction();
    romTableLoads += 1;
  };

  instruction(); // push {r4, r5, lr}
  instruction(11); // u8/u16 normalizations through cmp (statIndex - 1), #4
  const natureAffectedStat = statIndex >= 1 && statIndex <= 5;
  branch(natureAffectedStat); // bls 0x0806d8f2

  let route: FactoryModifyStatByNatureTiming["route"];
  let natureModifier: FactoryNatureStatModifier | null = null;
  let multiplier: FactoryModifyStatByNatureTiming["multiplier"] = null;
  let scaledStat = stat;
  let result = stat;
  let divisionEntryPc: number | null = null;

  if (!natureAffectedStat) {
    route = "unaffected-stat-index";
    instruction(); // adds r0, r3, #0
    branch(true); // b 0x0806d92e
  } else {
    literalLoad(); // PC-relative gNatureStatTable address
    instruction(5); // 5*nature + statIndex - 1 address arithmetic
    tableLoad(); // signed `gNatureStatTable[nature][statIndex - 1]`
    instruction(5); // sign extend and prepare {-1, +1} comparisons

    const field = NATURE_STAT_FIELDS[statIndex - 1];
    if (field === undefined) throw new Error(`missing nature stat field ${statIndex}`);
    const natureRow = NATURES[nature];
    if (natureRow === undefined || natureRow.index !== nature) {
      throw new Error(`missing extracted nature row ${nature}`);
    }
    natureModifier = natureRow[field];
    const lowered = natureModifier === -1;
    branch(lowered); // beq -1
    if (lowered) {
      route = "lower";
      multiplier = 90;
      instruction(); // movs r0, #90
    } else {
      instruction(); // cmp r1, #1
      const neutral = natureModifier !== 1;
      branch(neutral); // bne default
      if (neutral) {
        route = "neutral";
        instruction(); // adds r0, r3, #0
      } else {
        route = "raise";
        multiplier = 110;
        instruction(); // movs r0, #110
        branch(true); // b 0x0806d91a
      }
    }

    if (multiplier !== null) {
      multiplyInternalCycles = multiplyInternalCyclesForSourceU16(stat);
      instruction(); // muls r0, r3
      scaledStat = (stat * multiplier) & 0xffff;
      instruction(2); // u16 truncation after mul
      instruction(); // movs r1, #100
      const division = reduceUnsignedDivisionBy100Timing(scaledStat);
      instruction(2); // BL __udivsi3
      pipelineRefills += 1;
      sequentialThumbHalfwords += division.sequentialThumbHalfwords;
      pipelineRefills += division.pipelineRefills;
      divisionEntryPc = 0x082e_7b68;
      result = division.quotient & 0xffff;
      instruction(2); // u16 return-value truncation
      branch(true); // b 0x0806d92e
    }
  }

  instruction(2); // pop {r4, r5}; pop {r1}
  branch(true); // bx r1

  const cycles = sequentialThumbHalfwords * THUMB_SEQUENTIAL_CYCLES
    + pipelineRefills * THUMB_PIPELINE_REFILL_CYCLES
    + romLiteralLoads * (THUMB_ROM_LITERAL_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES)
    + romTableLoads * (THUMB_ROM_TABLE_LOAD_CYCLES - THUMB_SEQUENTIAL_CYCLES)
    + Math.max(0, multiplyInternalCycles - 1);
  return Object.freeze({
    nature,
    stat,
    statIndex,
    entryPc: 0x0806_d8d4,
    divisionEntryPc,
    route,
    natureModifier,
    multiplier,
    scaledStat,
    result,
    multiplyInternalCycles,
    sequentialThumbHalfwords,
    pipelineRefills,
    romLiteralLoads,
    romTableLoads,
    cycles,
  });
}

/**
 * Reduce the exact retail Thumb path for one nature rejection check.
 *
 * The compiler emits `GetNatureFromPersonality -> __umodsi3(personality, 25)`
 * (`pokemon.c:5498`, ROM 0x0806d088; libgcc ROM 0x082e7be0), then either the
 * caller's `bne` back to `Random32()` or its accepted `CreateMon` setup
 * (`pokemon.c:2562-2575`, ROM 0x08068676). Emerald configures WS0 as N=3,
 * S=1 with prefetch (`main.c:98`), so mGBA charges two master cycles per
 * sequential Thumb instruction, six more for a taken control-flow pipeline
 * refill, and one internal cycle for register `ROR`. Stack accesses in this
 * path are fully hidden by prefetch. This reducer follows those compiled
 * branches; it contains no personality, trainer, set, frame, or receipt table.
 * The v2 receipt has eleven +18-cycle asynchronous scheduler stalls inside
 * these windows; those are live hardware workload, not instructions here.
 */
export function reduceFactoryNatureAttemptTiming(
  candidatePersonality: number,
  targetNature: number,
): FactoryNatureAttemptTiming {
  let r0 = requireU32(candidatePersonality, "candidatePersonality");
  if (!Number.isInteger(targetNature) || targetNature < 0 || targetNature >= 25) {
    throw new Error(`targetNature must be in [0, 24], got ${targetNature}`);
  }

  let cycles = 0;
  const instruction = (count = 1): void => {
    cycles += THUMB_SEQUENTIAL_CYCLES * count;
  };
  const branch = (taken = true): void => {
    instruction();
    if (taken) cycles += THUMB_PIPELINE_REFILL_CYCLES;
  };
  const call = (): void => {
    // Thumb BL is a two-instruction pair; its second half writes PC.
    instruction(2);
    cycles += THUMB_PIPELINE_REFILL_CYCLES;
  };
  const returnBranch = (): void => branch();
  const ror = (value: number, amount: number): number => {
    instruction();
    cycles += 1;
    return rotateRight32(value, amount);
  };

  // GetNatureFromPersonality+2: movs r1, #25; BL __umodsi3.
  instruction();
  call();

  let r1 = 25;
  instruction(); // cmp r1, #0
  branch(false); // divisor is a source constant and never zero
  let r3 = 1;
  instruction();
  instruction(); // cmp r0, r1
  const belowDivisor = r0 < r1;
  branch(!belowDivisor);

  if (belowDivisor) {
    returnBranch();
  } else {
    instruction(); // push {r4}
    let r4 = 1;
    instruction();
    r4 = (r4 << 28) >>> 0;
    instruction();

    // __umodsi3 Loop1: normalize four quotient bits at a time.
    while (true) {
      instruction();
      const reachedLargeDivisor = r1 >= r4;
      branch(reachedLargeDivisor);
      if (reachedLargeDivisor) break;
      instruction();
      const reachedDividend = r1 >= r0;
      branch(reachedDividend);
      if (reachedDividend) break;
      r1 = (r1 << 4) >>> 0;
      r3 = (r3 << 4) >>> 0;
      instruction(2);
      branch();
    }

    r4 = (r4 << 3) >>> 0;
    instruction();
    // Loop2: normalize the remaining zero to three quotient bits.
    while (true) {
      instruction();
      const reachedLargeDivisor = r1 >= r4;
      branch(reachedLargeDivisor);
      if (reachedLargeDivisor) break;
      instruction();
      const reachedDividend = r1 >= r0;
      branch(reachedDividend);
      if (reachedDividend) break;
      r1 = (r1 << 1) >>> 0;
      r3 = (r3 << 1) >>> 0;
      instruction(2);
      branch();
    }

    let ip = r3;
    let r2 = 0;
    while (true) {
      // Loop3 resets r2 for each four-bit quotient group.
      r2 = 0;
      instruction();

      instruction();
      const below0 = r0 < r1;
      branch(below0);
      if (!below0) {
        r0 = (r0 - r1) >>> 0;
        instruction();
      }

      r4 = r1 >>> 1;
      instruction();
      instruction();
      const below1 = r0 < r4;
      branch(below1);
      if (!below1) {
        r0 = (r0 - r4) >>> 0;
        instruction();
        ip = r3;
        instruction();
        r4 = 1;
        instruction();
        r3 = ror(r3, r4);
        r2 = (r2 | r3) >>> 0;
        instruction();
        r3 = ip;
        instruction();
      }

      r4 = r1 >>> 2;
      instruction();
      instruction();
      const below2 = r0 < r4;
      branch(below2);
      if (!below2) {
        r0 = (r0 - r4) >>> 0;
        instruction();
        ip = r3;
        instruction();
        r4 = 2;
        instruction();
        r3 = ror(r3, r4);
        r2 = (r2 | r3) >>> 0;
        instruction();
        r3 = ip;
        instruction();
      }

      r4 = r1 >>> 3;
      instruction();
      instruction();
      const below3 = r0 < r4;
      branch(below3);
      if (!below3) {
        r0 = (r0 - r4) >>> 0;
        instruction();
        ip = r3;
        instruction();
        r4 = 3;
        instruction();
        r3 = ror(r3, r4);
        r2 = (r2 | r3) >>> 0;
        instruction();
        r3 = ip;
        instruction();
      }

      ip = r3;
      instruction();
      instruction();
      const exactRemainder = r0 === 0;
      branch(exactRemainder);
      if (exactRemainder) break;
      r3 >>>= 4;
      instruction();
      const quotientDone = r3 === 0;
      branch(quotientDone);
      if (quotientDone) break;
      r1 >>>= 4;
      instruction();
      branch();
    }

    r4 = 14;
    instruction();
    r4 = (r4 << 28) >>> 0;
    instruction();
    r2 = (r2 & r4) >>> 0;
    instruction();
    const needsCorrection = r2 !== 0;
    branch(needsCorrection);
    if (needsCorrection) {
      r3 = ip;
      instruction();
      r4 = 3;
      instruction();
      r3 = ror(r3, r4);
      instruction();
      const skipThird = (r2 & r3) === 0;
      branch(skipThird);
      if (!skipThird) {
        r4 = r1 >>> 3;
        r0 = (r0 + r4) >>> 0;
        instruction(2);
      }

      r3 = ip;
      instruction();
      r4 = 2;
      instruction();
      r3 = ror(r3, r4);
      instruction();
      const skipSecond = (r2 & r3) === 0;
      branch(skipSecond);
      if (!skipSecond) {
        r4 = r1 >>> 2;
        r0 = (r0 + r4) >>> 0;
        instruction(2);
      }

      r3 = ip;
      instruction();
      r4 = 1;
      instruction();
      r3 = ror(r3, r4);
      instruction();
      const skipFirst = (r2 & r3) === 0;
      branch(skipFirst);
      if (!skipFirst) {
        r4 = r1 >>> 1;
        r0 = (r0 + r4) >>> 0;
        instruction(2);
      }
    }

    instruction(); // pop {r4}
    returnBranch();
  }

  // GetNatureFromPersonality's u8 conversion and return.
  instruction(2);
  instruction(); // pop {r1}
  returnBranch();

  const candidateNature = candidatePersonality % 25;
  const accepted = candidateNature === targetNature;
  // Caller u8 conversion, compare, and rejection branch.
  instruction(3);
  branch(!accepted);
  if (accepted) {
    // Accepted setup at 0x08068684 through the CreateMon entry boundary.
    instruction();
    instruction(3);
    instruction();
    instruction();
    instruction();
    instruction();
    instruction(3);
    call();
  } else {
    // BL Random plus its first literal load; receipt observes Random+2.
    call();
    instruction();
  }

  return Object.freeze({
    personality: candidatePersonality >>> 0,
    targetNature,
    candidateNature,
    accepted,
    cycles,
  });
}

/**
 * Reduce the complete direct `GetNature` callee used by `CalculateMonStats`.
 *
 * This boundary is `0x0806d070..0x0806d088`, not the construction rejection
 * loop's `GetNatureFromPersonality+2` boundary. The wrapper first executes the
 * compiled field-zero `GetMonData2 -> GetBoxMonData2` route. That fixed route
 * is 54 sequential Thumb halfwords, nine refills, one ROM literal read, one
 * ROM jump-table read, and one 32-bit EWRAM personality read: 180 cycles. The
 * wrapper itself contributes another 42 cycles around the nested calls.
 *
 * The personality-dependent modulo body is shared with the already-accepted
 * 278-call nature-attempt reducer without changing that reducer's boundary or
 * result. Its accepted route contains 66 fixed cycles outside `__umodsi3`
 * (26 in GetNatureFromPersonality and 40 in the accepted caller tail), so only
 * that explicitly named fixed shell is removed here. No mon/set/case/frame/
 * tick/cursor/receipt identity or observed duration enters this reduction.
 */
export function reduceFactoryGetNatureTiming(personalityValue: number): FactoryGetNatureTiming {
  const personality = requireU32(personalityValue, "personality");
  const nature = personality % 25;
  const acceptedAttempt = reduceFactoryNatureAttemptTiming(personality, nature);
  const moduloCycles = acceptedAttempt.cycles - 66;
  const getMonDataCycles = 180;
  const wrapperCycles = 42;
  return Object.freeze({
    personality,
    nature,
    entryPc: 0x0806_d070,
    getMonDataEntryPc: 0x0806_a518,
    divisionEntryPc: 0x082e_7be0,
    getMonDataCycles,
    wrapperCycles,
    moduloCycles,
    cycles: getMonDataCycles + wrapperCycles + moduloCycles,
  });
}

/**
 * Reduce the final loop-test and return path of a Factory construction source.
 *
 * The boundary begins after the final held-item `SetMonData` and ends when the
 * caller resumes. `CreateFrontierFactorySelectableMons` executes its final
 * six-mon loop test at `battle_factory_screen.c:1757-1778` (ROM
 * 0x0819b612), takes `bhi`, restores the saved high registers, and returns to
 * 0x0819a9fe. `FillFactoryFrontierTrainerParty` executes the corresponding
 * three-mon loop test at `battle_tower.c:1867-1885` (ROM 0x0816376c), lets
 * `bls` fall through, restores the same register set, and returns to
 * 0x081635b2.
 *
 * Both paths use the retail WS0 timing already established for the nature
 * reducer: two master cycles per sequential Thumb instruction and six extra
 * cycles for each taken control-flow pipeline refill. No trainer, set, mon,
 * frame, cursor, or receipt identity selects this path; only the compiled
 * source function does.
 */
export function reduceFactorySourceReturnTiming(
  sourceFunction: FactoryConstructionSourceFunction,
): FactorySourceReturnTiming {
  let cycles = 0;
  const instruction = (count = 1): void => {
    cycles += THUMB_SEQUENTIAL_CYCLES * count;
  };
  const branch = (taken: boolean): void => {
    instruction();
    if (taken) cycles += THUMB_PIPELINE_REFILL_CYCLES;
  };

  let startPc: number;
  let callerResumePc: number;
  if (sourceFunction === "CreateFrontierFactorySelectableMons") {
    startPc = 0x0819_b612;
    callerResumePc = 0x0819_a9fe;
    instruction(5); // mov, lsl, lsr, mov, cmp
    branch(true); // final `bhi` exits the six-mon loop
  } else {
    startPc = 0x0816_376c;
    callerResumePc = 0x0816_35b2;
    instruction(4); // mov, lsl, lsr, cmp
    branch(false); // final `bls` falls through after three mons
  }

  instruction(7); // stack release and saved-register restoration
  branch(true); // bx to the caller

  return Object.freeze({ sourceFunction, startPc, callerResumePc, cycles });
}

/**
 * Return the exact source-operation cost in mGBA master-cycle units.
 *
 * The operation is deliberately structural: a cost model may use species,
 * nature, EV/stat work, source function, and rejection-attempt count, but it
 * has no trainer/battle/tick or receipt cursor available to it.
 */
export type FactoryConstructionCycleCost =
  (operation: FactoryConstructionOperation) => number;

export interface FactoryConstructionClockStart {
  /** Frame containing the first construction Random() call. */
  frame: number;
  /** Master-cycle phase of that first construction operation, [0, frameCycles). */
  cycle: number;
  rngValue: number;
}

export interface FactoryAmbientRandomResult {
  rngValue: number;
  /** CPU cycles spent in the interrupt callback before source resumes. */
  cycles?: number;
}

export interface FactoryConstructionClockOptions {
  start: FactoryConstructionClockStart;
  frameCycles?: number;
  /**
   * Called once per crossed VBlank. Returning the next raw gRngValue models
   * the `VBlankIntr` Random() callback. Omit it for the old clean stream.
   */
  ambientRandom?:
    (rngValue: number, frame: number) => number | FactoryAmbientRandomResult;
  cycleCost?: FactoryConstructionCycleCost;
}

export interface FactoryConstructionEvent {
  tag: "construction" | "ambient";
  frame: number;
  caller: "CreateMonWithEVSpreadNatureOTID+0x35" | "CreateMonWithEVSpreadNatureOTID+0x3b" | "VBlankIntr+0x87";
  preCursor: number;
  postCursor: number;
  monIndex: number | null;
  attempt: number | null;
  half: FactoryConstructionHalf | null;
}

export interface FactoryMonConstructionResult {
  monIndex: number;
  input: FactoryMonConstructionInput;
  entryFrame: number;
  entryCycle: number;
  entryRngValue: number;
  attempts: number;
  constructionDraws: number;
  personality: number;
  exitFrame: number;
  exitCycle: number;
  exitRngValue: number;
  firstEventIndex: number;
  /** Last construction event; ambient events after it belong to the clock gap. */
  lastEventIndex: number;
}

export type FactoryConstructionFrameCount = readonly [
  frame: number,
  construction: number,
  ambient: number,
  total: number,
];

export interface FactoryConstructionSchedule {
  sourceFunction: FactoryConstructionSourceFunction;
  start: FactoryConstructionClockStart;
  end: FactoryConstructionClockStart;
  events: readonly FactoryConstructionEvent[];
  mons: readonly FactoryMonConstructionResult[];
  frameCounts: readonly FactoryConstructionFrameCount[];
  ambientEnabled: boolean;
}

type FrontierMonRow = Readonly<{
  index: number;
  species: string;
  nature: string;
  evSpread: number;
}>;
const NATURE_STAT_FIELDS = ["attack", "defense", "speed", "spAttack", "spDefense"] as const;
type NatureRow = Readonly<{
  index: number;
  name: string;
  attack: FactoryNatureStatModifier;
  defense: FactoryNatureStatModifier;
  speed: FactoryNatureStatModifier;
  spAttack: FactoryNatureStatModifier;
  spDefense: FactoryNatureStatModifier;
}>;
type SpeciesRow = Readonly<{ id: number; name: string }>;

const FRONTIER_MONS = (frontierMonsData as unknown as { entries: FrontierMonRow[] }).entries;
const NATURES = (naturesData as unknown as { natures: NatureRow[] }).natures;
const SPECIES = (speciesStatsData as unknown as { species: SpeciesRow[] }).species;
const NATURE_BY_NAME = new Map(NATURES.map((row) => [row.name, row.index]));
const SPECIES_BY_NAME = new Map(SPECIES.map((row) => [row.name, row]));

function requireU32(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    throw new Error(`${field} must be a source u32, got ${value}`);
  }
  return value >>> 0;
}

function requireSigned32(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < -0x8000_0000 || value > 0x7fff_ffff) {
    throw new Error(`${field} must be a source i32, got ${value}`);
  }
  return value;
}

function requireNonnegativeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a nonnegative integer, got ${value}`);
  }
  return value;
}

function requireCycle(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a nonnegative integer, got ${value}`);
  }
  return value;
}

function countEvSlots(evSpread: number): number {
  let value = evSpread & 0x3f;
  let count = 0;
  while (value !== 0) {
    count += value & 1;
    value >>>= 1;
  }
  return count;
}

function validateMonInput(input: FactoryMonConstructionInput, index: number): void {
  requireNonnegativeInteger(input.speciesId, `mons[${index}].speciesId`);
  if (input.speciesId === 0) throw new Error(`mons[${index}].speciesId must be nonzero`);
  if (!Number.isInteger(input.nature) || input.nature < 0 || input.nature >= 25) {
    throw new Error(`mons[${index}].nature must be in [0, 24]`);
  }
  if (!Number.isInteger(input.evSpread) || input.evSpread < 0 || input.evSpread > 0x3f) {
    throw new Error(`mons[${index}].evSpread must be a six-bit source bitfield`);
  }
  const expectedStatCount = countEvSlots(input.evSpread);
  if (expectedStatCount === 0 || input.evStatCount !== expectedStatCount) {
    throw new Error(
      `mons[${index}].evStatCount must equal the set-bit count (${expectedStatCount})`,
    );
  }
  if (input.level !== undefined) requireNonnegativeInteger(input.level, `mons[${index}].level`);
  if (input.fixedIv !== undefined) requireNonnegativeInteger(input.fixedIv, `mons[${index}].fixedIv`);
}

function validateStart(start: FactoryConstructionClockStart, frameCycles: number): FactoryConstructionClockStart {
  requireNonnegativeInteger(start.frame, "start.frame");
  requireCycle(start.cycle, "start.cycle");
  if (start.cycle >= frameCycles) {
    throw new Error(`start.cycle must be below frameCycles (${frameCycles})`);
  }
  return {
    frame: start.frame,
    cycle: start.cycle,
    rngValue: requireU32(start.rngValue, "start.rngValue"),
  };
}

function freezeEvent(event: FactoryConstructionEvent): FactoryConstructionEvent {
  return Object.freeze({ ...event });
}

function freezeMonResult(result: FactoryMonConstructionResult): FactoryMonConstructionResult {
  return Object.freeze({ ...result, input: Object.freeze({ ...result.input }) });
}

/**
 * Build a source mon input from the generated Factory tables.
 *
 * `sourceSetId` is retained only as a provenance label. The scheduler and its
 * cost callback consume the resulting species/nature/stat-work fields, so a
 * set/trainer/fixture cannot select a timing branch.
 */
export function factoryMonConstructionInputFromSet(
  sourceSetId: number,
  sourceFunction: FactoryConstructionSourceFunction,
): FactoryMonConstructionInput {
  if (!Number.isInteger(sourceSetId) || sourceSetId < 0 || sourceSetId >= FRONTIER_MONS.length) {
    throw new Error(`sourceSetId must be a Factory set index, got ${sourceSetId}`);
  }
  const row = FRONTIER_MONS[sourceSetId]!;
  const species = SPECIES_BY_NAME.get(row.species);
  const nature = NATURE_BY_NAME.get(row.nature);
  if (species === undefined || nature === undefined) {
    throw new Error(`Factory set ${sourceSetId} has incomplete source mon data`);
  }
  return Object.freeze({
    sourceSetId,
    sourceFunction,
    speciesId: species.id,
    speciesName: species.name,
    nature,
    evSpread: row.evSpread,
    evStatCount: countEvSlots(row.evSpread),
  });
}

function sourceOperation(
  input: FactoryMonConstructionInput | null,
  sourceFunction: FactoryConstructionSourceFunction,
  kind: FactoryConstructionOperationKind,
  monIndex: number | null,
  attempt: number | null = null,
  half: FactoryConstructionHalf | null = null,
  facts: Partial<Pick<
    FactoryConstructionOperation,
    "randomValue" | "candidatePersonality" | "candidateNature" | "natureAccepted"
  >> = {},
): FactoryConstructionOperation {
  return {
    kind,
    sourceFunction,
    monIndex,
    input,
    attempt,
    half,
    randomValue: facts.randomValue ?? null,
    candidatePersonality: facts.candidatePersonality ?? null,
    candidateNature: facts.candidateNature ?? null,
    natureAccepted: facts.natureAccepted ?? null,
  };
}

class ConstructionClock {
  readonly frameCycles: number;
  readonly events: FactoryConstructionEvent[] = [];
  private frameValue: number;
  private cycleValue: number;
  private rngValueValue: number;
  private readonly ambientRandom: FactoryConstructionClockOptions["ambientRandom"];
  private readonly cycleCost: FactoryConstructionCycleCost;

  constructor(options: FactoryConstructionClockOptions) {
    this.frameCycles = options.frameCycles ?? GBA_VBLANK_CYCLES;
    requireCycle(this.frameCycles, "frameCycles");
    if (this.frameCycles === 0) throw new Error("frameCycles must be positive");
    const start = validateStart(options.start, this.frameCycles);
    this.frameValue = start.frame;
    this.cycleValue = start.cycle;
    this.rngValueValue = start.rngValue;
    this.ambientRandom = options.ambientRandom;
    this.cycleCost = options.cycleCost ?? (() => 0);
  }

  get frame(): number { return this.frameValue; }
  get cycle(): number { return this.cycleValue; }
  get rngValue(): number { return this.rngValueValue; }

  private emitAmbient(): number {
    if (this.ambientRandom === undefined) return 0;
    const preCursor = this.rngValueValue;
    const result = this.ambientRandom(preCursor, this.frameValue);
    const postCursor = requireU32(
      typeof result === "number" ? result : result.rngValue,
      "ambientRandom result",
    );
    this.rngValueValue = postCursor;
    this.events.push(freezeEvent({
      tag: "ambient",
      frame: this.frameValue,
      caller: "VBlankIntr+0x87",
      preCursor,
      postCursor,
      monIndex: null,
      attempt: null,
      half: null,
    }));
    return typeof result === "number"
      ? 0
      : requireCycle(result.cycles ?? 0, "ambientRandom cycles");
  }

  advance(operation: FactoryConstructionOperation): void {
    const cycles = requireCycle(this.cycleCost(operation), `cycleCost(${operation.kind})`);
    let remaining = cycles;
    while (remaining > 0) {
      const untilVBlank = this.frameCycles - this.cycleValue;
      if (remaining < untilVBlank) {
        this.cycleValue += remaining;
        remaining = 0;
      } else {
        remaining -= untilVBlank;
        this.cycleValue = 0;
        this.frameValue += 1;
        remaining += this.emitAmbient();
      }
    }
  }

  constructionRandom(
    sourceFunction: FactoryConstructionSourceFunction,
    input: FactoryMonConstructionInput,
    monIndex: number,
    attempt: number,
    half: FactoryConstructionHalf,
  ): number {
    const preCursor = this.rngValueValue;
    const draw = randomU16(preCursor);
    this.rngValueValue = draw.rngValue;
    this.events.push(freezeEvent({
      tag: "construction",
      frame: this.frameValue,
      caller: half === "low"
        ? "CreateMonWithEVSpreadNatureOTID+0x35"
        : "CreateMonWithEVSpreadNatureOTID+0x3b",
      preCursor,
      postCursor: draw.rngValue,
      monIndex,
      attempt,
      half,
    }));
    this.advance(sourceOperation(
      input,
      sourceFunction,
      "personality-random",
      monIndex,
      attempt,
      half,
      { randomValue: draw.value },
    ));
    return draw.value;
  }

  run(operation: FactoryConstructionOperation): void {
    this.advance(operation);
  }
}

export interface ScheduleFactoryConstructionInput {
  sourceFunction: FactoryConstructionSourceFunction;
  mons: readonly FactoryMonConstructionInput[];
  clock: FactoryConstructionClockOptions;
}

/** The source-state-only result: no VBlank callback, no ambient draws. */
export function scheduleFactoryConstructionCleanStream(
  input: ScheduleFactoryConstructionInput,
): FactoryConstructionSchedule {
  return scheduleFactoryConstruction(input);
}

/**
 * Replay the source construction loop with an optional VBlank Random callback.
 *
 * With `clock.ambientRandom` omitted this is the old clean stream: the same
 * personality rejection loop as `CreateMonWithEVSpreadNatureOTID`, with no
 * attempt to guess presentation timing. With a callback, every crossed
 * period inserts one ambient event and advances the same cursor.
 */
export function scheduleFactoryConstruction(
  input: ScheduleFactoryConstructionInput,
): FactoryConstructionSchedule {
  if (input.mons.length === 0) throw new Error("mons must not be empty");
  for (const [index, mon] of input.mons.entries()) validateMonInput(mon, index);
  if (input.sourceFunction !== input.mons[0]!.sourceFunction) {
    throw new Error("sourceFunction must match each mon's sourceFunction");
  }
  const clock = new ConstructionClock(input.clock);
  const start: FactoryConstructionClockStart = {
    frame: clock.frame,
    cycle: clock.cycle,
    rngValue: clock.rngValue,
  };
  const mons: FactoryMonConstructionResult[] = [];

  for (const [monIndex, mon] of input.mons.entries()) {
    const firstEventIndex = clock.events.length;
    const entryFrame = clock.frame;
    const entryCycle = clock.cycle;
    const entryRngValue = clock.rngValue;
    let attempt = 0;
    let personality = 0;
    let lastConstructionEventIndex = -1;
    clock.run(sourceOperation(mon, input.sourceFunction, "construction-entry", monIndex));
    do {
      const low = clock.constructionRandom(input.sourceFunction, mon, monIndex, attempt, "low");
      const high = clock.constructionRandom(input.sourceFunction, mon, monIndex, attempt, "high");
      personality = (low | (high << 16)) >>> 0;
      const candidateNature = natureFromPersonality(personality);
      lastConstructionEventIndex = clock.events.length - 1;
      clock.run(sourceOperation(
        mon,
        input.sourceFunction,
        "personality-attempt",
        monIndex,
        attempt,
        null,
        {
          candidatePersonality: personality,
          candidateNature,
          natureAccepted: candidateNature === mon.nature,
        },
      ));
      if (candidateNature === mon.nature) break;
      attempt += 1;
    } while (true);

    const acceptedPersonality = { candidatePersonality: personality } as const;
    clock.run(sourceOperation(
      mon,
      input.sourceFunction,
      "create-mon",
      monIndex,
      null,
      null,
      acceptedPersonality,
    ));
    clock.run(sourceOperation(
      mon,
      input.sourceFunction,
      "ev-spread",
      monIndex,
      null,
      null,
      acceptedPersonality,
    ));
    clock.run(sourceOperation(
      mon,
      input.sourceFunction,
      "calculate-mon-stats",
      monIndex,
      null,
      null,
      acceptedPersonality,
    ));
    clock.run(sourceOperation(
      mon,
      input.sourceFunction,
      "factory-post-mon",
      monIndex,
      null,
      null,
      acceptedPersonality,
    ));

    mons.push(freezeMonResult({
      monIndex,
      input: mon,
      entryFrame,
      entryCycle,
      entryRngValue,
      attempts: attempt + 1,
      constructionDraws: (attempt + 1) * 2,
      personality,
      exitFrame: clock.frame,
      exitCycle: clock.cycle,
      exitRngValue: clock.rngValue,
      firstEventIndex,
      lastEventIndex: lastConstructionEventIndex,
    }));
    const nextMon = input.mons[monIndex + 1];
    if (nextMon !== undefined) {
      clock.run(sourceOperation(
        nextMon,
        input.sourceFunction,
        "factory-outer-loop",
        monIndex + 1,
      ));
    }
  }

  clock.run(sourceOperation(null, input.sourceFunction, "source-return", null));
  const end: FactoryConstructionClockStart = {
    frame: clock.frame,
    cycle: clock.cycle,
    rngValue: clock.rngValue,
  };
  const frameCounts: FactoryConstructionFrameCount[] = [];
  const firstFrame = start.frame;
  for (let frame = firstFrame; frame <= end.frame; frame += 1) {
    let construction = 0;
    let ambient = 0;
    for (const event of clock.events) {
      if (event.frame !== frame) continue;
      if (event.tag === "construction") construction += 1;
      else ambient += 1;
    }
    frameCounts.push(Object.freeze([frame, construction, ambient, construction + ambient]));
  }

  return Object.freeze({
    sourceFunction: input.sourceFunction,
    start,
    end,
    events: Object.freeze(clock.events),
    mons: Object.freeze(mons),
    frameCounts: Object.freeze(frameCounts),
    ambientEnabled: input.clock.ambientRandom !== undefined,
  });
}

/** Default source callback for `VBlankIntr`'s ordinary `Random()` call. */
export function vblankRandom(rngValue: number, _frame: number): number {
  return advanceRngValue(rngValue);
}
