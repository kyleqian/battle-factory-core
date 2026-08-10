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

const THUMB_SEQUENTIAL_CYCLES = 2;
const THUMB_PIPELINE_REFILL_CYCLES = 6;
const THUMB_TAKEN_CONTROL_CYCLES = THUMB_SEQUENTIAL_CYCLES + THUMB_PIPELINE_REFILL_CYCLES;
const THUMB_ROM_LITERAL_LOAD_CYCLES = 11;
const THUMB_ROM_TABLE_LOAD_CYCLES = 9;

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

interface UnsignedDivisionBy100Timing {
  quotient: number;
  sequentialThumbHalfwords: number;
  pipelineRefills: number;
}

/**
 * Replay the retail `__udivsi3` implementation at `0x082e7b68` for its one
 * nonzero constant divisor. This is intentionally separate from
 * `reduceFactoryNatureAttemptTiming`'s `__umodsi3`: the two libgcc bodies
 * have different Loop3 result/correction paths, so sharing a synthetic
 * division formula would hide real executed control flow.
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

  let r0 = dividend >>> 0;
  let r1 = 100;
  instruction(); // cmp r1, #0
  branch(false); // beq Ldiv0; divisor is the compiled constant 100
  let r3 = 1;
  instruction();
  let r2 = 0;
  instruction();
  instruction(); // push {r4}
  instruction(); // cmp r0, r1
  const belowDivisor = r0 < r1;
  branch(belowDivisor); // bcc Lgot_result
  if (belowDivisor) {
    instruction(); // adds r0, r2, #0
    instruction(); // pop {r4}
    branch(true); // mov pc, lr
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
  instruction(); // pop {r4}
  branch(true); // mov pc, lr
  return { quotient: r2, sequentialThumbHalfwords, pipelineRefills };
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
type NatureStatField = (typeof NATURE_STAT_FIELDS)[number];
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
