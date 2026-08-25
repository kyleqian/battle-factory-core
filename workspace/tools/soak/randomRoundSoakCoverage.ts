// Coverage instrument for the seeded random-play Factory round soak
// (tools/soak/randomRoundSoak.ts, --coverage-json). OBSERVATION ONLY: it
// never touches a policy's decisions, RNG walk, or frame budget, and the
// driver constructs a collector at all only when the flag is present, so a
// flagless run keeps today's exact behavior.
//
// It answers "which parts of the Level-50 universe did this sweep actually
// touch?" for five dimensions -- moves, move effects, species, abilities,
// held items -- aggregated ACROSS ALL SEEDS of one run, so the supervisor
// can aim the next census at what has never run instead of sweeping at
// random.
//
// Every reading is taken from ENGINE STATE, never from transcript strings:
//
//  * executed moves (both sides) come from the battle kernel's own semantic
//    event receipts: each `STRINGID_USEDMOVE` message event carries the
//    frozen `actionSnapshot` (`src/engine/battleScriptEvents.ts:27-31`) that
//    Cmd_attackstring/Cmd_printstring froze at print time -- `attacker`
//    (battler id; side = id & 1) and `currentMove` (source gCurrentMove).
//    That is one receipt per genuinely executed action for BOTH battlers,
//    with exact attribution, which the per-battler `gLastMoves` cells cannot
//    give (they are last-write-wins, so a move repeated on consecutive turns
//    is indistinguishable from no action at all). The receipts live on the
//    orchestrator's `battleResolutionPresentation.segments[].events`
//    (`src/engine/battleResolutionPresentation.ts:377-416`), appended in
//    strictly ascending `sequence` order, so a per-battle high-water mark is
//    enough to consume each exactly once.
//  * the player's confirmed fight slot at commit time is recorded
//    separately (`recordPlayerFightCommit`) from the fight menu's own
//    confirm press, as an independent cross-check of the receipt read.
//  * species come from `rulesContext.party.player/.opponent[i].species`, and
//    abilities/items from the ACTIVE battlers `rulesContext.battlers[0]/[1]`
//    (`.ability` / `.item`), both sampled once at each battle's start.
//
// Universe totals come from the Level-50 rental corpus: the union of
// `factory-round-policy.json`'s `rentalSelection.ranges.level50` ranges
// (inclusive on both ends -- `factoryRentalGeneration.ts:328` draws
// `start + rand % (end - start + 1)`) indexed into
// `battle-frontier-mons.json`.

import type { EngineState } from "../../src/engine/core.ts";
import type { BattleScriptRulesContext } from "../../src/engine/battleScriptRulesContext.ts";
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import speciesNamesData from "../../src/data/gen/species-names.json" with { type: "json" };
import speciesStatsData from "../../src/data/gen/species-stats.json" with { type: "json" };
import abilityItemHooksData from "../../src/data/gen/ability-item-hooks.json" with { type: "json" };
import battleFrontierMonsData from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import battleFrontierHeldItemsData from "../../src/data/gen/battle-frontier-held-items.json" with { type: "json" };
import factoryRoundPolicyData from "../../src/data/gen/factory-round-policy.json" with { type: "json" };

// ---------------------------------------------------------------------------
// Generated-table views (same tables the driver/engine already read)
// ---------------------------------------------------------------------------

type MoveRow = Readonly<{ id: number; name: string; move: string; effect: string }>;
type FrontierMonRow = Readonly<{
  species: string;
  moves: readonly string[];
  itemTableId: number;
}>;
type HeldItemRow = Readonly<{ itemTableId: number; itemId: number; displayName: string }>;
type SpeciesStatsRow = Readonly<{ id: number; name: string; abilities: readonly string[] }>;

const MOVE_ROWS = (movesData as unknown as { moves: readonly MoveRow[] }).moves;
const MOVE_ROW_BY_ID = new Map<number, MoveRow>(MOVE_ROWS.map((row) => [row.id, row]));
const MOVE_ID_BY_SYMBOL = new Map<string, number>(MOVE_ROWS.map((row) => [row.move, row.id]));
const SPECIES_NAME_BY_ID = new Map<number, string>(
  (speciesNamesData as unknown as { species: readonly { name: string }[] }).species
    .map((row, index) => [index, row.name]),
);
const SPECIES_STATS_BY_SYMBOL = new Map<string, SpeciesStatsRow>(
  (speciesStatsData as unknown as { species: readonly SpeciesStatsRow[] }).species
    .map((row) => [row.name, row]),
);
const ABILITY_NAME_BY_ID = new Map<number, string>(
  (abilityItemHooksData as unknown as { universes: { abilities: readonly { name: string; id: number }[] } })
    .universes.abilities.map((row) => [row.id, row.name]),
);
const ABILITY_ID_BY_NAME = new Map<string, number>(
  (abilityItemHooksData as unknown as { universes: { abilities: readonly { name: string; id: number }[] } })
    .universes.abilities.map((row) => [row.name, row.id]),
);
const HELD_ITEM_ROWS =
  (battleFrontierHeldItemsData as unknown as { entries: readonly HeldItemRow[] }).entries;
const ITEM_NAME_BY_ID = new Map<number, string>(
  HELD_ITEM_ROWS.map((row) => [row.itemId, row.displayName]),
);
const ITEM_ID_BY_TABLE_ID = new Map<number, number>(
  HELD_ITEM_ROWS.map((row) => [row.itemTableId, row.itemId]),
);
const FRONTIER_MONS =
  (battleFrontierMonsData as unknown as { entries: readonly FrontierMonRow[] }).entries;
const LEVEL_50_RANGES =
  (factoryRoundPolicyData as unknown as {
    rentalSelection: { ranges: { level50: readonly { start: number; end: number }[] } };
  }).rentalSelection.ranges.level50;

// ---------------------------------------------------------------------------
// Level-50 rental universe
// ---------------------------------------------------------------------------

export type Level50Universe = Readonly<{
  /** Frontier set indices in the union of every level-50 rental range. */
  setIds: readonly number[];
  moveIds: ReadonlySet<number>;
  effects: ReadonlySet<string>;
  speciesIds: ReadonlySet<number>;
  abilityIds: ReadonlySet<number>;
  itemIds: ReadonlySet<number>;
}>;

let cachedUniverse: Level50Universe | null = null;

/**
 * The Level-50 rental corpus every draft (and every Factory opponent, which
 * is generated from the same `gFacilityTrainerMons` table) is drawn from.
 * Memoized: the sets are frozen and read-only.
 */
export function level50Universe(): Level50Universe {
  if (cachedUniverse !== null) return cachedUniverse;
  const setIds: number[] = [];
  const seenSet = new Set<number>();
  for (const range of LEVEL_50_RANGES) {
    // Inclusive on both ends -- see the module header.
    for (let setId = range.start; setId <= range.end; setId += 1) {
      if (seenSet.has(setId)) continue;
      seenSet.add(setId);
      setIds.push(setId);
    }
  }
  setIds.sort((a, b) => a - b);
  const moveIds = new Set<number>();
  const effects = new Set<string>();
  const speciesIds = new Set<number>();
  const abilityIds = new Set<number>();
  const itemIds = new Set<number>();
  for (const setId of setIds) {
    const row = FRONTIER_MONS[setId];
    if (row === undefined) continue;
    for (const moveSymbol of row.moves) {
      const moveId = MOVE_ID_BY_SYMBOL.get(moveSymbol);
      if (moveId === undefined || moveId === 0) continue;
      moveIds.add(moveId);
      const effect = MOVE_ROW_BY_ID.get(moveId)?.effect;
      if (effect !== undefined) effects.add(effect);
    }
    const stats = SPECIES_STATS_BY_SYMBOL.get(row.species);
    if (stats !== undefined) {
      speciesIds.add(stats.id);
      for (const abilitySymbol of stats.abilities) {
        if (abilitySymbol === "ABILITY_NONE") continue;
        const abilityId = ABILITY_ID_BY_NAME.get(abilitySymbol);
        if (abilityId !== undefined && abilityId !== 0) abilityIds.add(abilityId);
      }
    }
    const itemId = ITEM_ID_BY_TABLE_ID.get(row.itemTableId);
    if (itemId !== undefined && itemId !== 0) itemIds.add(itemId);
  }
  cachedUniverse = Object.freeze({
    setIds: Object.freeze(setIds),
    moveIds,
    effects,
    speciesIds,
    abilityIds,
    itemIds,
  });
  return cachedUniverse;
}

export function moveDisplayName(moveId: number): string {
  return MOVE_ROW_BY_ID.get(moveId)?.name ?? `<unknown move ${moveId}>`;
}

export function moveEffectSymbol(moveId: number): string | null {
  return MOVE_ROW_BY_ID.get(moveId)?.effect ?? null;
}

function speciesDisplayName(speciesId: number): string {
  return SPECIES_NAME_BY_ID.get(speciesId) ?? `<unknown species ${speciesId}>`;
}

function abilityDisplayName(abilityId: number): string {
  return ABILITY_NAME_BY_ID.get(abilityId) ?? `<unknown ability ${abilityId}>`;
}

function itemDisplayName(itemId: number): string {
  return ITEM_NAME_BY_ID.get(itemId) ?? `<unknown item ${itemId}>`;
}

// ---------------------------------------------------------------------------
// Per-dimension tally
// ---------------------------------------------------------------------------

export type CoverageEntryReport = Readonly<{
  id: number | string;
  name: string;
  player: number;
  opponent: number;
  total: number;
  inUniverse: boolean;
}>;

export type CoverageDimensionReport = Readonly<{
  /** "executed" for moves/effects, "seen"/"present" for the party dimensions. */
  verb: string;
  universe: number;
  observed: number;
  never: number;
  /** Observed ids that are NOT in the Level-50 universe -- reported, never dropped. */
  outsideUniverse: readonly CoverageEntryReport[];
  bySide: Readonly<{
    player: Readonly<{ distinct: number; total: number }>;
    opponent: Readonly<{ distinct: number; total: number }>;
  }>;
  entries: readonly CoverageEntryReport[];
  neverObserved: readonly Readonly<{ id: number | string; name: string }>[];
}>;

type SideKey = "player" | "opponent";

/**
 * One dimension's cross-seed tally. Keys are numeric ids except for move
 * effects, whose id IS the generated `EFFECT_*` symbol.
 */
class DimensionTally<K extends number | string> {
  private readonly player = new Map<K, number>();
  private readonly opponent = new Map<K, number>();

  record(side: SideKey, key: K, count = 1): void {
    const target = side === "player" ? this.player : this.opponent;
    target.set(key, (target.get(key) ?? 0) + count);
  }

  report(
    verb: string,
    universe: ReadonlySet<K>,
    name: (key: K) => string,
  ): CoverageDimensionReport {
    const keys = new Set<K>([...this.player.keys(), ...this.opponent.keys()]);
    const entries: CoverageEntryReport[] = [...keys].map((key) => {
      const player = this.player.get(key) ?? 0;
      const opponent = this.opponent.get(key) ?? 0;
      return Object.freeze({
        id: key,
        name: name(key),
        player,
        opponent,
        total: player + opponent,
        inUniverse: universe.has(key),
      });
    });
    entries.sort((a, b) => b.total - a.total || String(a.id).localeCompare(String(b.id)));
    const neverObserved = [...universe]
      .filter((key) => !keys.has(key))
      .map((key) => Object.freeze({ id: key as number | string, name: name(key) }));
    neverObserved.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const sideStats = (map: Map<K, number>) =>
      Object.freeze({
        distinct: map.size,
        total: [...map.values()].reduce((sum, value) => sum + value, 0),
      });
    const observed = [...keys].filter((key) => universe.has(key)).length;
    return Object.freeze({
      verb,
      universe: universe.size,
      observed,
      never: universe.size - observed,
      outsideUniverse: Object.freeze(entries.filter((entry) => !entry.inUniverse)),
      bySide: Object.freeze({
        player: sideStats(this.player),
        opponent: sideStats(this.opponent),
      }),
      entries: Object.freeze(entries),
      neverObserved: Object.freeze(neverObserved),
    });
  }
}

// ---------------------------------------------------------------------------
// Collector
// ---------------------------------------------------------------------------

export type SoakCoverageReport = Readonly<{
  schemaVersion: 1;
  run: Readonly<{
    policy: string;
    seeds: readonly number[];
    seedCount: number;
    battles: number;
    turns: number;
    executedMoveActions: number;
  }>;
  notes: Readonly<Record<string, string>>;
  moves: CoverageDimensionReport;
  effects: CoverageDimensionReport;
  species: CoverageDimensionReport;
  abilities: CoverageDimensionReport;
  items: CoverageDimensionReport;
  playerFightCommits: Readonly<{
    distinct: number;
    total: number;
    entries: readonly Readonly<{ id: number; name: string; commits: number }>[];
  }>;
}>;

/**
 * Aggregates one soak RUN (all its seeds). Construct one per invocation and
 * hand it to `runSeed` via `RunOptions.coverage`; the driver calls
 * `beginSeed`/`observe` and the fight menu calls `recordPlayerFightCommit`.
 */
export class SoakCoverageCollector {
  private readonly policy: string;
  private readonly seeds: number[] = [];
  private readonly moves = new DimensionTally<number>();
  private readonly effects = new DimensionTally<string>();
  private readonly species = new DimensionTally<number>();
  private readonly abilities = new DimensionTally<number>();
  private readonly items = new DimensionTally<number>();
  private readonly playerCommits = new Map<number, number>();
  private battles = 0;
  private turns = 0;
  private executedMoveActions = 0;
  /** Identity of the battle whose start snapshot / event watermark is current. */
  private battleKey: string | null = null;
  private battleStartRecorded = false;
  private eventWatermark = -1;
  private turnKey: string | null = null;

  constructor(policy: string) {
    this.policy = policy;
  }

  beginSeed(seed: number): void {
    this.seeds.push(seed);
    // A fresh seed is a fresh EngineState: nothing carries over.
    this.battleKey = null;
    this.battleStartRecorded = false;
    this.eventWatermark = -1;
    this.turnKey = null;
  }

  /** The fight menu's own confirm press (a commit the engine will accept). */
  recordPlayerFightCommit(moveId: number): void {
    if (moveId === 0) return;
    this.playerCommits.set(moveId, (this.playerCommits.get(moveId) ?? 0) + 1);
  }

  /** Called once per ticked frame with the post-tick EngineState. */
  observe(state: EngineState): void {
    const orchestrator = state.factoryRoundBattleOrchestrator;
    if (orchestrator === null) return;
    const battle = orchestrator.battle;
    if (battle === null) return;
    const battleKey = `${orchestrator.config.id}#${orchestrator.round.rules.battleIndex}`;
    if (battleKey !== this.battleKey) {
      this.battleKey = battleKey;
      this.battleStartRecorded = false;
      // `sequence` restarts per battle (BattleState.nextEventSequence).
      this.eventWatermark = -1;
      this.battles += 1;
    }
    const rulesContext = battle.rules.rulesContext;
    if (!this.battleStartRecorded) this.recordBattleStart(rulesContext);

    const command = orchestrator.battleCommandPresentation;
    if (command !== null) {
      const turnKey = `${battleKey}:${command.request.requestId}`;
      if (turnKey !== this.turnKey) {
        this.turnKey = turnKey;
        this.turns += 1;
      }
    }

    const resolution = orchestrator.battleResolutionPresentation;
    if (resolution !== null) this.scanResolutionReceipts(resolution);
  }

  /**
   * Species (whole party) plus the ACTIVE battlers' ability and held item,
   * sampled at the first tick of each battle at which the kernel party is
   * populated. Abilities/items are PRESENCE, not activation.
   */
  private recordBattleStart(rulesContext: BattleScriptRulesContext): void {
    const party = rulesContext.party;
    if (party.player[0]?.species === 0 && party.opponent[0]?.species === 0) return;
    this.battleStartRecorded = true;
    for (const side of ["player", "opponent"] as const) {
      for (const member of party[side]) {
        if (member.species !== 0) this.species.record(side, member.species);
      }
    }
    const battlers = rulesContext.battlers;
    for (const battlerId of [0, 1] as const) {
      const battler = battlers[battlerId];
      if (battler === undefined) continue;
      const side: SideKey = battlerId === 0 ? "player" : "opponent";
      if (battler.ability !== 0) this.abilities.record(side, battler.ability);
      if (battler.item !== 0) this.items.record(side, battler.item);
    }
  }

  /**
   * Consumes every not-yet-seen kernel semantic event on the live resolution
   * presentation. `sequence` is strictly ascending across the appended
   * segments (appendResolutionSegment rejects a regression), so one
   * high-water mark per battle consumes each event exactly once even as the
   * presentation is replaced at successive command boundaries.
   */
  private scanResolutionReceipts(
    resolution: NonNullable<
      NonNullable<EngineState["factoryRoundBattleOrchestrator"]>["battleResolutionPresentation"]
    >,
  ): void {
    for (const segment of resolution.segments) {
      for (const event of segment.events) {
        if (event.sequence <= this.eventWatermark) continue;
        this.eventWatermark = event.sequence;
        const payload = event.payload;
        if (payload.kind !== "message") continue;
        if (payload.messageId !== "STRINGID_USEDMOVE") continue;
        const snapshot = payload.actionSnapshot;
        if (snapshot === undefined) continue;
        const side: SideKey = (snapshot.attacker & 1) === 0 ? "player" : "opponent";
        this.recordExecutedMove(side, snapshot.currentMove);
      }
    }
  }

  /**
   * Public so a Tier-1 test can pin the outside-the-corpus reporting without
   * having to stage a live Struggle/called-move turn; the driver itself only
   * ever reaches this through `scanResolutionReceipts`.
   */
  recordExecutedMove(side: SideKey, moveId: number): void {
    if (moveId === 0) return;
    this.executedMoveActions += 1;
    this.moves.record(side, moveId);
    const effect = moveEffectSymbol(moveId);
    if (effect !== null) this.effects.record(side, effect);
  }

  report(): SoakCoverageReport {
    const universe = level50Universe();
    const commitEntries = [...this.playerCommits.entries()]
      .map(([id, commits]) => Object.freeze({ id, name: moveDisplayName(id), commits }))
      .sort((a, b) => b.commits - a.commits || a.id - b.id);
    return Object.freeze({
      schemaVersion: 1,
      run: Object.freeze({
        policy: this.policy,
        seeds: Object.freeze([...this.seeds]),
        seedCount: this.seeds.length,
        battles: this.battles,
        turns: this.turns,
        executedMoveActions: this.executedMoveActions,
      }),
      notes: Object.freeze({
        moves:
          "one count per executed action, from each STRINGID_USEDMOVE event's frozen"
          + " actionSnapshot (attacker/currentMove); side = attacker & 1",
        effects: "the executed move's generated EFFECT_* symbol (src/data/gen/moves.json)",
        species: "every party slot present at battle start, per side",
        abilities:
          "PRESENCE on the ACTIVE battler at battle start -- not activation;"
          + " an ability counted here may never have fired",
        items:
          "PRESENCE on the ACTIVE battler at battle start -- not consumption;"
          + " an item counted here may never have triggered",
        universe:
          "the Level-50 rental corpus: the union of factory-round-policy.json's"
          + " rentalSelection.ranges.level50 (inclusive) over battle-frontier-mons.json",
        playerFightCommits:
          "the fight menu's confirmed slot at commit time -- an independent"
          + " cross-check of the player-side receipt read, not a second source",
      }),
      moves: this.moves.report("executed", universe.moveIds, moveDisplayName),
      effects: this.effects.report("executed", universe.effects, (effect) => effect),
      species: this.species.report("seen", universe.speciesIds, speciesDisplayName),
      abilities: this.abilities.report("present", universe.abilityIds, abilityDisplayName),
      items: this.items.report("present", universe.itemIds, itemDisplayName),
      playerFightCommits: Object.freeze({
        distinct: commitEntries.length,
        total: commitEntries.reduce((sum, entry) => sum + entry.commits, 0),
        entries: Object.freeze(commitEntries),
      }),
    });
  }

  /** The `=== coverage ===` stdout block (the CLI prints these verbatim). */
  summaryLines(): string[] {
    const report = this.report();
    const { run } = report;
    const seedSpan = run.seedCount === 0
      ? "none"
      : `${run.seedCount} (${run.seeds[0]}..${run.seeds[run.seedCount - 1]})`;
    const lines = [
      "=== coverage ===",
      `policy ${run.policy}  seeds ${seedSpan}  battles ${run.battles}`
        + `  turns ${run.turns}  move actions ${run.executedMoveActions}`,
    ];
    const row = (label: string, dimension: CoverageDimensionReport): string =>
      `${label.padEnd(10)}${String(dimension.observed).padStart(4)}/`
        + `${String(dimension.universe).padEnd(4)} ${dimension.verb}`
        + ` (${dimension.never} never)`
        + (dimension.outsideUniverse.length > 0
          ? `  [+${dimension.outsideUniverse.length} outside corpus]`
          : "");
    lines.push(row("moves", report.moves));
    lines.push(row("effects", report.effects));
    lines.push(row("species", report.species));
    lines.push(row("abilities", report.abilities));
    lines.push(row("items", report.items));
    return lines;
  }
}
