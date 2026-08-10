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
 * exact source boundaries and interrupt timing, but refutes a callback keyed
 * only by the fields below: the compiled nature check has candidate-dependent
 * cost, and VBlank service has live audio/DMA-dependent cost.  Until those
 * states have a source-derived clock model, the clean stream remains the only
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
  "candidate-personality-dependent GetNatureFromPersonality cycle accounting",
  "deterministic VBlank audio/DMA workload state and interrupt-entry latency",
] as const);

export type FactoryConstructionSourceFunction =
  | "CreateFrontierFactorySelectableMons"
  | "FillFactoryFrontierTrainerParty";

export type FactoryConstructionOperationKind =
  | "personality-random"
  | "personality-attempt"
  | "create-mon"
  | "ev-spread"
  | "calculate-mon-stats"
  | "factory-post-mon"
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
type NatureRow = Readonly<{ index: number; name: string }>;
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
): FactoryConstructionOperation {
  return { kind, sourceFunction, monIndex, input, attempt, half };
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
    do {
      const low = clock.constructionRandom(input.sourceFunction, mon, monIndex, attempt, "low");
      const high = clock.constructionRandom(input.sourceFunction, mon, monIndex, attempt, "high");
      personality = (low | (high << 16)) >>> 0;
      lastConstructionEventIndex = clock.events.length - 1;
      clock.run(sourceOperation(
        mon,
        input.sourceFunction,
        "personality-attempt",
        monIndex,
        attempt,
      ));
      if (natureFromPersonality(personality) === mon.nature) break;
      attempt += 1;
    } while (true);

    clock.run(sourceOperation(mon, input.sourceFunction, "create-mon", monIndex));
    clock.run(sourceOperation(mon, input.sourceFunction, "ev-spread", monIndex));
    clock.run(sourceOperation(mon, input.sourceFunction, "calculate-mon-stats", monIndex));
    clock.run(sourceOperation(mon, input.sourceFunction, "factory-post-mon", monIndex));

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
