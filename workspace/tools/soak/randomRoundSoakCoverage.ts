// Coverage instrument for the seeded random-play Factory round soak
// (tools/soak/randomRoundSoak.ts, --coverage-json). OBSERVATION ONLY: it
// never touches a policy's decisions, RNG walk, or frame budget, and the
// driver constructs a collector at all only when the flag is present, so a
// flagless run keeps today's exact behavior.
//
// It answers "which parts of the Level-50 universe did this sweep actually
// touch?" for seven dimensions -- moves, move effects, species, abilities
// present, held items present, abilities ACTIVATED, held items ACTIVATED --
// aggregated ACROSS ALL SEEDS of one run, so the supervisor can aim the next
// census at what has never run instead of sweeping at random.
//
// ACTIVATED = ANNOUNCED OR RECEIPTED. Presence says a rental carried
// Intimidate; activation says the engine actually ran its script and said so.
// An activation is counted when a resolved message event's own ability text
// buffer names the ability, or when its `{B_LAST_ITEM}` buffer carries the
// item id -- one count per announcement, never one per announcement AND its
// receipt. The complement is real and is NOT a gap in the instrument:
// abilities and hold effects that only bias a calculation print nothing, so
// they are SILENT BY CONSTRUCTION and can never be counted here. The classes:
//
//  * speed/turn-order modifiers -- Swift Swim, Chlorophyll (and Quick Claw's
//    hold effect, whose Gen-3 script prints no string at all);
//  * damage/stat multipliers -- Huge Power, Pure Power, Thick Fat, Overgrow/
//    Blaze/Torrent/Swarm, Guts, Marvel Scale, Hustle, Plus/Minus, and every
//    type-boost or Choice Band-style held item;
//  * accuracy/evasion and crit-rate biases -- Compound Eyes, Sand Veil,
//    Battle Armor/Shell Armor's silent crit denial, Bright Powder, Scope Lens;
//  * secondary-effect roll modifiers -- Serene Grace, Shield Dust;
//  * out-of-battle / encounter-only abilities -- Illuminate, Run Away, Stench,
//    Pickup's overworld half.
//
// Everything else in the corpus announces (Intimidate, Shed Skin, Levitate,
// Wonder Guard, Volt/Water Absorb, Synchronize, the status-prevention family,
// Leftovers/Sitrus/the berries, Focus Band, White Herb...), so a zero in the
// activated column for one of those is a genuine, actionable coverage hole.
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
//  * ability activations read the message receipt's own text buffer contents,
//    joined back to the source ability id through the same
//    `ABILITY_* -> gAbilityNames` table `resolveFactoryAbilityDisplayName`
//    fills them from; WHICH buffer a message uses is a property of the
//    extracted `gBattleStringsTable` template (`battleStringReferencesToken`),
//    not of any rendered line. Item activations read the receipt's numeric
//    `lastItem` (source u16 gLastUsedItem) directly, and take their holder
//    from the typed `HELD_ITEM_EFFECT` animation receipt that every source
//    held-item result script presents before printing.
//
// PRESENCE IS NOT A CEILING FOR ACTIVATION. Presence is sampled on the ACTIVE
// battler at battle start only, so an ability/item on a mon that entered by
// switching can be activated without ever being counted present. The two
// columns answer different questions and are not nested.
//
// Universe totals come from the Level-50 rental corpus: the union of
// `factory-round-policy.json`'s `rentalSelection.ranges.level50` ranges
// (inclusive on both ends -- `factoryRentalGeneration.ts:328` draws
// `start + rand % (end - start + 1)`) indexed into
// `battle-frontier-mons.json`.
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider (bnd257d)

import type { EngineState } from "../../src/engine/core.ts";
import type { BattleScriptRulesContext } from "../../src/engine/battleScriptRulesContext.ts";
import { battleStringReferencesToken } from "../../src/engine/battleStringResolver.ts";
import movesData from "../../src/data/gen/moves.json" with { type: "json" };
import summaryInfoData from "../../src/data/gen/summary-info.json" with { type: "json" };
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
/**
 * `ABILITY_* -> gAbilityNames` display text, the exact join
 * `resolveFactoryAbilityDisplayName` (factoryBattleScriptFullTurnDecision.ts:187-200)
 * uses to fill an ability message's own text buffer. Inverted here so an
 * announced activation's buffer contents map straight back to the source
 * ability id. Four `ABILITY_*` rows have no `gAbilityNames` entry (source
 * placeholders); they are simply absent, never guessed.
 */
const ABILITY_ID_BY_DISPLAY_NAME = new Map<string, number>(
  (abilityItemHooksData as unknown as { universes: { abilities: readonly { name: string; id: number }[] } })
    .universes.abilities.flatMap(({ id, name }) => {
      const display =
        (summaryInfoData as unknown as { abilities: Readonly<Record<string, { name: string }>> })
          .abilities[name]?.name;
      return display === undefined || id === 0 ? [] : [[display, id] as const];
    }),
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
// Activation classification (announced or receipted -- see the header)
// ---------------------------------------------------------------------------

/**
 * The five source ability text buffers, in the precedence the holder lookup
 * below falls back through. Each names the battler role whose ability the
 * template prints: `B_SCR_ACTIVE_ABILITY` -> gBattleScripting.battler,
 * `B_DEF_ABILITY` -> gBattlerTarget, `B_ATK_ABILITY` -> gBattlerAttacker,
 * `B_EFF_ABILITY` -> gEffectBattler. `B_LAST_ABILITY` (gLastUsedAbility) has
 * no dedicated role field on a message receipt, so it contributes the id
 * only and leaves the holder to the identity match.
 */
const ABILITY_BUFFER_TOKENS = Object.freeze([
  "B_SCR_ACTIVE_ABILITY",
  "B_DEF_ABILITY",
  "B_ATK_ABILITY",
  "B_EFF_ABILITY",
  "B_LAST_ABILITY",
] as const);

type AbilityBufferToken = (typeof ABILITY_BUFFER_TOKENS)[number];

const abilityTokenCache = new Map<string, AbilityBufferToken | null>();
const lastItemTokenCache = new Map<string, boolean>();

/**
 * Which ability buffer (if any) this message id's own `gBattleStringsTable`
 * template references -- a source-table property of the string, cached per
 * id. Purely a capability query on the extracted template
 * (`battleStringReferencesToken`), never a read of rendered text.
 */
function abilityBufferTokenOf(messageId: string): AbilityBufferToken | null {
  const cached = abilityTokenCache.get(messageId);
  if (cached !== undefined) return cached;
  const token = ABILITY_BUFFER_TOKENS
    .find((candidate) => battleStringReferencesToken(messageId, candidate)) ?? null;
  abilityTokenCache.set(messageId, token);
  return token;
}

/** Same capability query for `{B_LAST_ITEM}` (source gLastUsedItem). */
function referencesLastItemBuffer(messageId: string): boolean {
  const cached = lastItemTokenCache.get(messageId);
  if (cached !== undefined) return cached;
  const references = battleStringReferencesToken(messageId, "B_LAST_ITEM");
  lastItemTokenCache.set(messageId, references);
  return references;
}

/** One resolved `kind: "message"` receipt off the live resolution presentation. */
type ResolutionMessagePayload = Extract<
  NonNullable<
    NonNullable<EngineState["factoryRoundBattleOrchestrator"]>["battleResolutionPresentation"]
  >["segments"][number]["events"][number]["payload"],
  { kind: "message" }
>;

/** Singles has exactly two real battlers; anything else is not a side. */
function singlesBattlerOrNull(battler: number | undefined): 0 | 1 | null {
  return battler === 0 || battler === 1 ? battler : null;
}

/** The source battler role whose ability an ability buffer token prints. */
function abilityRoleBattler(
  token: AbilityBufferToken,
  payload: ResolutionMessagePayload,
): 0 | 1 | null {
  if (token === "B_SCR_ACTIVE_ABILITY") return singlesBattlerOrNull(payload.scriptingBattler);
  if (token === "B_DEF_ABILITY") return singlesBattlerOrNull(payload.targetBattler);
  if (token === "B_ATK_ABILITY") return singlesBattlerOrNull(payload.actionSnapshot?.attacker);
  if (token === "B_EFF_ABILITY") return singlesBattlerOrNull(payload.effectBattler);
  // B_LAST_ABILITY (gLastUsedAbility) names no battler role on the receipt.
  return null;
}

/**
 * Which side owns one activation, in descending order of evidence: a typed
 * holder receipt, then the IDENTITY match against the live battler that
 * actually carries the ability/item, then the message's own battler role,
 * then any battler role the receipt froze. `null` means the activation is not
 * attributable from engine state -- it is dropped rather than guessed.
 */
function holderSide(
  rulesContext: BattleScriptRulesContext,
  holds: (battler: Readonly<{ ability: number; item: number }>) => boolean,
  receiptBattler: 0 | 1 | null,
  roleBattler: 0 | 1 | null,
  payload: ResolutionMessagePayload,
): SideKey | null {
  const sideOf = (battler: 0 | 1): SideKey => (battler === 0 ? "player" : "opponent");
  if (receiptBattler !== null) return sideOf(receiptBattler);
  const player = rulesContext.battlers[0];
  const opponent = rulesContext.battlers[1];
  const playerHolds = player !== undefined && holds(player);
  const opponentHolds = opponent !== undefined && holds(opponent);
  if (playerHolds !== opponentHolds) return playerHolds ? "player" : "opponent";
  if (roleBattler !== null) return sideOf(roleBattler);
  const fallback = singlesBattlerOrNull(payload.scriptingBattler)
    ?? singlesBattlerOrNull(payload.effectBattler)
    ?? singlesBattlerOrNull(payload.targetBattler)
    ?? singlesBattlerOrNull(payload.actionSnapshot?.attacker);
  return fallback === null ? null : sideOf(fallback);
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
  /**
   * ACTIVATION, not presence: an ability/item the engine announced or
   * receipted at least once. Absent from reports written before this
   * dimension existed -- `mergeCoverageReports` treats a missing dimension as
   * empty rather than refusing the merge.
   */
  abilitiesActivated: CoverageDimensionReport;
  itemsActivated: CoverageDimensionReport;
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
  private readonly abilitiesActivated = new DimensionTally<number>();
  private readonly itemsActivated = new DimensionTally<number>();
  private readonly playerCommits = new Map<number, number>();
  private battles = 0;
  private turns = 0;
  private executedMoveActions = 0;
  /** Identity of the battle whose start snapshot / event watermark is current. */
  private battleKey: string | null = null;
  private battleStartRecorded = false;
  private eventWatermark = -1;
  private turnKey: string | null = null;
  /**
   * The battler named by the most recent `HELD_ITEM_EFFECT` animation
   * receipt, cleared at the next message exactly as the presentation reducer
   * clears its own `pendingHeldItemEffectBattler`
   * (`battleResolutionPresentation.ts:3312,3327-3333`). Every source
   * held-item result script presents that typed receipt for the holder before
   * printing its text, so it is the item activation's holder of record.
   */
  private pendingHeldItemBattler: 0 | 1 | null = null;

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
    this.pendingHeldItemBattler = null;
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
      this.pendingHeldItemBattler = null;
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
    if (resolution !== null) this.scanResolutionReceipts(resolution, rulesContext);
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
    rulesContext: BattleScriptRulesContext,
  ): void {
    for (const segment of resolution.segments) {
      for (const event of segment.events) {
        if (event.sequence <= this.eventWatermark) continue;
        this.eventWatermark = event.sequence;
        const payload = event.payload;
        if (payload.kind === "animation" && payload.animationId === "HELD_ITEM_EFFECT") {
          const battler = payload.battler;
          this.pendingHeldItemBattler = battler === 0 || battler === 1 ? battler : null;
          continue;
        }
        if (payload.kind !== "message") continue;
        // Same lifetime as the presentation's own: one message consumes it.
        const heldItemBattler = this.pendingHeldItemBattler;
        this.pendingHeldItemBattler = null;
        if (payload.messageId === "STRINGID_USEDMOVE") {
          const snapshot = payload.actionSnapshot;
          if (snapshot === undefined) continue;
          const side: SideKey = (snapshot.attacker & 1) === 0 ? "player" : "opponent";
          this.recordExecutedMove(side, snapshot.currentMove);
          continue;
        }
        this.scanAbilityActivation(payload, rulesContext);
        this.scanItemActivation(payload, rulesContext, heldItemBattler);
      }
    }
  }

  /**
   * One ability activation per announced message that references an ability
   * text buffer. The id comes from the buffer's own contents joined back
   * through `gAbilityNames`; the holder side prefers the IDENTITY match
   * against the live `rulesContext.battlers[].ability` (the same field the
   * presence read samples) and falls back to the buffer token's own source
   * battler role. A message that resolves to neither is not attributable and
   * is deliberately not counted rather than guessed onto a side.
   */
  private scanAbilityActivation(
    payload: ResolutionMessagePayload,
    rulesContext: BattleScriptRulesContext,
  ): void {
    const token = abilityBufferTokenOf(payload.messageId);
    if (token === null) return;
    for (const substitution of payload.substitutions) {
      const abilityId = ABILITY_ID_BY_DISPLAY_NAME.get(substitution);
      if (abilityId === undefined) continue;
      const side = holderSide(
        rulesContext,
        (battler) => battler.ability === abilityId,
        null,
        abilityRoleBattler(token, payload),
        payload,
      );
      if (side === null) return;
      this.abilitiesActivated.record(side, abilityId);
      return;
    }
  }

  /**
   * One item activation per announced message whose `{B_LAST_ITEM}` buffer
   * carries a real id (source u16 gLastUsedItem, frozen at print time and
   * already on the message receipt). Holder side prefers the typed
   * `HELD_ITEM_EFFECT` animation receipt, then the identity match against the
   * live held items, then the message's own battler roles.
   *
   * "Announced" is the honest bound here: the family includes the
   * steal/knock-off/trick strings, which name an item the engine moved rather
   * than one that fired. They are counted -- and said so in `notes` -- rather
   * than curated away by message id.
   */
  private scanItemActivation(
    payload: ResolutionMessagePayload,
    rulesContext: BattleScriptRulesContext,
    heldItemBattler: 0 | 1 | null,
  ): void {
    if (!referencesLastItemBuffer(payload.messageId)) return;
    const itemId = payload.lastItem;
    if (itemId === undefined || itemId === 0) return;
    const side = holderSide(
      rulesContext,
      (battler) => battler.item === itemId,
      heldItemBattler,
      null,
      payload,
    );
    if (side === null) return;
    this.itemsActivated.record(side, itemId);
  }

  /**
   * Public so a Tier-1 test can pin the outside-the-corpus reporting without
   * having to stage a live Struggle/called-move turn; the driver itself only
   * ever reaches this through `scanResolutionReceipts`.
   */
  /**
   * Public for the same reason `recordExecutedMove` is: a Tier-1 test can
   * hand-build an activation report (for the merge pins) without staging a
   * live Intimidate/Leftovers turn. The driver only ever reaches these
   * through `scanResolutionReceipts`.
   */
  recordAbilityActivation(side: SideKey, abilityId: number): void {
    if (abilityId === 0) return;
    this.abilitiesActivated.record(side, abilityId);
  }

  recordItemActivation(side: SideKey, itemId: number): void {
    if (itemId === 0) return;
    this.itemsActivated.record(side, itemId);
  }

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
        abilitiesActivated:
          "ACTIVATION = ANNOUNCED OR RECEIPTED: one count per resolved message"
          + " event whose own ability text buffer (B_SCR_ACTIVE_ABILITY/"
          + "B_DEF_ABILITY/B_ATK_ABILITY/B_EFF_ABILITY/B_LAST_ABILITY) names it."
          + " Abilities that only bias a calculation and print nothing are"
          + " SILENT BY CONSTRUCTION and can never appear here",
        itemsActivated:
          "ACTIVATION = ANNOUNCED OR RECEIPTED: one count per resolved message"
          + " event whose {B_LAST_ITEM} buffer (source u16 gLastUsedItem, frozen"
          + " at print time) carries the id; holder side prefers the typed"
          + " HELD_ITEM_EFFECT animation receipt. Includes the steal/knock-off/"
          + "trick strings, which name an item the engine MOVED rather than one"
          + " that fired; silent hold effects (Choice Band, Bright Powder,"
          + " Quick Claw, type-boost items) can never appear here",
        activationSide:
          "typed holder receipt first, then the identity match against the live"
          + " rulesContext.battlers[].ability/.item, then the message's own"
          + " battler role; an activation attributable by none of those is"
          + " dropped, never guessed onto a side",
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
      abilitiesActivated:
        this.abilitiesActivated.report("activated", universe.abilityIds, abilityDisplayName),
      itemsActivated: this.itemsActivated.report("activated", universe.itemIds, itemDisplayName),
      playerFightCommits: Object.freeze({
        distinct: commitEntries.length,
        total: commitEntries.reduce((sum, entry) => sum + entry.commits, 0),
        entries: Object.freeze(commitEntries),
      }),
    });
  }

  /** The `=== coverage ===` stdout block (the CLI prints these verbatim). */
  summaryLines(): string[] {
    return coverageSummaryLines(this.report());
  }
}

/**
 * The `=== coverage ===` stdout block for ANY report -- a live collector's
 * (`SoakCoverageCollector.summaryLines`) or a merged one from a `--parallel`
 * fan-out (`mergeCoverageReports`), so both paths print the same block from
 * the same code.
 */
export function coverageSummaryLines(report: SoakCoverageReport): string[] {
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
  // `activated` is the strictly narrower reading of the same universe
  // (announced or receipted), so it rides on the presence row rather than
  // taking a row of its own. A report written before the dimension existed
  // simply prints the presence half.
  const activationSuffix = (dimension: CoverageDimensionReport | undefined): string =>
    dimension === undefined
      ? ""
      : `  \u00b7 ${dimension.observed}/${dimension.universe} activated`
        + ` (${dimension.never} never activated)`
        + (dimension.outsideUniverse.length > 0
          ? ` [+${dimension.outsideUniverse.length} outside corpus]`
          : "");
  lines.push(row("moves", report.moves));
  lines.push(row("effects", report.effects));
  lines.push(row("species", report.species));
  lines.push(row("abilities", report.abilities) + activationSuffix(report.abilitiesActivated));
  lines.push(row("items", report.items) + activationSuffix(report.itemsActivated));
  return lines;
}

// ---------------------------------------------------------------------------
// Merge (the CLI's --parallel fan-out)
// ---------------------------------------------------------------------------

/**
 * Rebuilds a dimension's tally from an already-reported dimension's entries.
 * `DimensionTally.record` only ever adds a positive count, so a zero on one
 * side means that side never had the key -- reconstructing with `> 0` guards
 * restores the exact per-side map membership `bySide.distinct` reports.
 */
function tallyFromReports<K extends number | string>(
  dimensions: readonly (CoverageDimensionReport | undefined)[],
): DimensionTally<K> {
  const tally = new DimensionTally<K>();
  for (const dimension of dimensions) {
    // BACKWARD COMPATIBILITY: reports written before a dimension existed have
    // no such key at runtime (they are `JSON.parse`d straight into this type),
    // so a missing dimension merges as empty instead of throwing.
    if (dimension === undefined) continue;
    for (const entry of dimension.entries) {
      if (entry.player > 0) tally.record("player", entry.id as K, entry.player);
      if (entry.opponent > 0) tally.record("opponent", entry.id as K, entry.opponent);
    }
  }
  return tally;
}

/**
 * Merges the per-slice reports of one `--parallel` soak run into the report
 * the equivalent serial run would have produced: per-id per-side counts sum,
 * run totals (battles/turns/move actions) sum, seeds concatenate in the given
 * order, and every DERIVED field (`observed`/`never`/`neverObserved`,
 * `outsideUniverse`, `bySide`, entry ordering) is RECOMPUTED from the merged
 * tallies against the Level-50 universe by the same `DimensionTally.report`
 * the serial path uses -- never unioned by hand, so a move that only one
 * slice executed correctly drops out of the merged never-list.
 *
 * Every report must come from the same policy/schema; the first report's
 * policy and notes are carried over.
 */
export function mergeCoverageReports(
  reports: readonly SoakCoverageReport[],
): SoakCoverageReport {
  const first = reports[0];
  if (first === undefined) throw new Error("mergeCoverageReports: no reports to merge");
  const universe = level50Universe();
  const commits = new Map<number, number>();
  for (const report of reports) {
    for (const entry of report.playerFightCommits.entries) {
      commits.set(entry.id, (commits.get(entry.id) ?? 0) + entry.commits);
    }
  }
  const commitEntries = [...commits.entries()]
    .map(([id, count]) => Object.freeze({ id, name: moveDisplayName(id), commits: count }))
    .sort((a, b) => b.commits - a.commits || a.id - b.id);
  const sum = (pick: (report: SoakCoverageReport) => number): number =>
    reports.reduce((total, report) => total + pick(report), 0);
  const seeds = reports.flatMap((report) => [...report.run.seeds]);
  return Object.freeze({
    schemaVersion: 1,
    run: Object.freeze({
      policy: first.run.policy,
      seeds: Object.freeze(seeds),
      seedCount: seeds.length,
      battles: sum((report) => report.run.battles),
      turns: sum((report) => report.run.turns),
      executedMoveActions: sum((report) => report.run.executedMoveActions),
    }),
    // The first report's notes describe the same instrument; a pre-activation
    // report simply carries no activation note.
    notes: first.notes,
    moves: tallyFromReports<number>(reports.map((report) => report.moves))
      .report("executed", universe.moveIds, moveDisplayName),
    effects: tallyFromReports<string>(reports.map((report) => report.effects))
      .report("executed", universe.effects, (effect) => effect),
    species: tallyFromReports<number>(reports.map((report) => report.species))
      .report("seen", universe.speciesIds, speciesDisplayName),
    abilities: tallyFromReports<number>(reports.map((report) => report.abilities))
      .report("present", universe.abilityIds, abilityDisplayName),
    items: tallyFromReports<number>(reports.map((report) => report.items))
      .report("present", universe.itemIds, itemDisplayName),
    abilitiesActivated:
      tallyFromReports<number>(reports.map((report) => report.abilitiesActivated))
        .report("activated", universe.abilityIds, abilityDisplayName),
    itemsActivated: tallyFromReports<number>(reports.map((report) => report.itemsActivated))
      .report("activated", universe.itemIds, itemDisplayName),
    playerFightCommits: Object.freeze({
      distinct: commitEntries.length,
      total: commitEntries.reduce((total, entry) => total + entry.commits, 0),
      entries: Object.freeze(commitEntries),
    }),
  });
}
