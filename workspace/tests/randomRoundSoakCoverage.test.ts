// Tier-1 pin for the soak coverage instrument (tools/soak/randomRoundSoakCoverage.ts,
// the CLI's `--coverage-json`). Hermetic: it drives the exported soak driver
// API over a short frame budget, exactly like the CLI does, and asserts the
// aggregated report -- never the emulator, never the oracle.

import { describe, expect, it } from "vitest";
import {
  level50Universe,
  mergeCoverageReports,
  SoakCoverageCollector,
  type SoakCoverageReport,
} from "../tools/soak/randomRoundSoakCoverage.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

/** One short vanilla seed is enough to execute real moves on both sides. */
function driveShortSeed(): SoakCoverageCollector {
  const coverage = new SoakCoverageCollector("vanilla");
  runSeed(0, {
    policy: "vanilla",
    maxFrames: 30_000,
    renderEvery: 0,
    // lbra: stay in the first challenge (the old loss -> new-draft chain is gone; the Lobby walk-back would add a second challenge).
    newChallengeFromLobby: false,
    coverage,
  });
  return coverage;
}

describe("soak coverage universe", () => {
  it("derives non-zero, stable Level-50 corpus totals from src/data/gen", () => {
    const universe = level50Universe();
    // The union of factory-round-policy.json's level50 rental ranges,
    // inclusive on both ends (factoryRentalGeneration.ts:328).
    expect(universe.setIds.length).toBe(740);
    expect(universe.setIds[0]).toBe(110);
    expect(universe.setIds.at(-1)).toBe(849);
    expect(universe.moveIds.size).toBe(276);
    expect(universe.effects.size).toBe(166);
    expect(universe.speciesIds.size).toBe(264);
    expect(universe.abilityIds.size).toBe(71);
    expect(universe.itemIds.size).toBe(40);
    // Memoized: the same frozen object, not a rebuilt one.
    expect(level50Universe()).toBe(universe);
  });

  it("reports the universe totals on every dimension of an empty run", () => {
    const report = new SoakCoverageCollector("vanilla").report();
    for (const dimension of [
      report.moves,
      report.effects,
      report.species,
      report.abilities,
      report.items,
    ]) {
      expect(dimension.observed).toBe(0);
      expect(dimension.never).toBe(dimension.universe);
      expect(dimension.universe).toBeGreaterThan(0);
      expect(dimension.neverObserved.length).toBe(dimension.universe);
      expect(dimension.entries).toEqual([]);
    }
    expect(report.run.seedCount).toBe(0);
    expect(report.run.battles).toBe(0);
  });
});

describe("soak coverage aggregation over a driven seed", () => {
  const coverage = driveShortSeed();
  const report = coverage.report();

  it("records the run's own density (seeds, battles, turns)", () => {
    expect(report.schemaVersion).toBe(1);
    expect(report.run.policy).toBe("vanilla");
    expect(report.run.seeds).toEqual([0]);
    expect(report.run.seedCount).toBe(1);
    expect(report.run.battles).toBeGreaterThan(0);
    expect(report.run.turns).toBeGreaterThan(0);
    expect(report.run.executedMoveActions).toBeGreaterThan(0);
  });

  it("executes moves on both sides and derives their effects", () => {
    expect(report.moves.observed).toBeGreaterThan(0);
    expect(report.moves.observed + report.moves.never).toBe(report.moves.universe);
    expect(report.moves.bySide.player.distinct).toBeGreaterThan(0);
    expect(report.moves.bySide.opponent.distinct).toBeGreaterThan(0);
    // Every executed move contributes its generated EFFECT_* symbol.
    expect(report.effects.observed).toBeGreaterThan(0);
    expect(report.effects.entries.every((entry) => String(entry.id).startsWith("EFFECT_")))
      .toBe(true);
    expect(report.effects.bySide.player.total).toBe(report.moves.bySide.player.total);
  });

  it("attributes the player's committed fight slots to the player side", () => {
    expect(report.playerFightCommits.total).toBeGreaterThan(0);
    let executedCommits = 0;
    for (const commit of report.playerFightCommits.entries) {
      const executed = report.moves.entries.find((entry) => entry.id === commit.id);
      // A commit need not execute: the frame budget can cut the run off
      // between the confirm press and the action, and a real turn can be
      // eaten by flinch/paralysis/sleep. What must never happen is a
      // committed move showing up credited to the OPPONENT side only.
      if (executed === undefined) continue;
      executedCommits += 1;
      expect(executed.player, `committed move ${commit.name} credited to the wrong side`)
        .toBeGreaterThan(0);
    }
    expect(executedCommits).toBeGreaterThan(0);
    // The reverse direction: the opponent executed at least one move the
    // player never committed, so the two sides are genuinely separate tallies.
    const committedIds = new Set<string | number>(
      report.playerFightCommits.entries.map((entry) => entry.id),
    );
    expect(report.moves.entries.some((entry) => entry.opponent > 0 && !committedIds.has(entry.id)))
      .toBe(true);
  });

  it("sees rental species and battle-start ability/item presence per side", () => {
    expect(report.species.bySide.player.distinct).toBeGreaterThan(0);
    expect(report.species.bySide.opponent.distinct).toBeGreaterThan(0);
    expect(report.abilities.bySide.player.total).toBeGreaterThan(0);
    expect(report.items.bySide.opponent.total + report.items.bySide.player.total)
      .toBeGreaterThan(0);
    expect(report.notes.abilities).toContain("PRESENCE");
    expect(report.notes.items).toContain("PRESENCE");
  });

  it("counts the SITRUS BERRY activation this seed announces, on the holder's side", () => {
    // ACTIVATION, not presence: seed 0's player-side rental drops below half
    // HP and its Sitrus Berry fires, which the engine announces as a
    // STRINGID_PKMNSITEMRESTOREDHEALTH message whose {B_LAST_ITEM} buffer
    // carries item 142 (ITEM_SITRUS_BERRY) and whose HELD_ITEM_EFFECT
    // animation receipt names battler 0. Drop either read and this goes to 0.
    const sitrus = report.itemsActivated.entries.find((entry) => entry.id === 142);
    expect(sitrus, "seed 0 announces no SITRUS BERRY activation").toBeDefined();
    expect(sitrus!.name).toBe("SITRUS BERRY");
    expect(sitrus!.player).toBeGreaterThanOrEqual(1);
    expect(sitrus!.opponent).toBe(0);
    expect(sitrus!.inUniverse).toBe(true);
    expect(report.itemsActivated.verb).toBe("activated");
    expect(report.itemsActivated.observed).toBeGreaterThan(0);
    expect(report.itemsActivated.observed + report.itemsActivated.never)
      .toBe(report.itemsActivated.universe);
    expect(report.itemsActivated.bySide.player.total).toBeGreaterThan(0);
  });

  it("keeps activation inside the corpus and independent of the presence read", () => {
    // Activation is the strictly narrower reading of the SAME universe, so no
    // activated id may be outside the corpus and the ratio can never exceed
    // it. It is NOT nested inside presence, though: presence is sampled on the
    // ACTIVE battler at battle start only, so a mon that entered by switching
    // can activate an ability/item that was never counted present. The
    // instrument says so in its own notes rather than pretending otherwise.
    for (const dimension of [report.abilitiesActivated, report.itemsActivated]) {
      expect(dimension.outsideUniverse).toEqual([]);
      expect(dimension.entries.every((entry) => entry.inUniverse)).toBe(true);
      expect(dimension.observed).toBeLessThanOrEqual(dimension.universe);
      expect(dimension.entries.every((entry) => entry.total === entry.player + entry.opponent))
        .toBe(true);
    }
    expect(report.abilitiesActivated.universe).toBe(report.abilities.universe);
    expect(report.itemsActivated.universe).toBe(report.items.universe);
    expect(report.notes.abilitiesActivated).toContain("ANNOUNCED OR RECEIPTED");
    expect(report.notes.abilitiesActivated).toContain("SILENT BY CONSTRUCTION");
    expect(report.notes.itemsActivated).toContain("ANNOUNCED OR RECEIPTED");
    expect(report.notes.activationSide).toContain("never guessed onto a side");
  });

  it("prints an `=== coverage ===` block with an executed/universe ratio per dimension", () => {
    const lines = coverage.summaryLines();
    expect(lines[0]).toBe("=== coverage ===");
    expect(lines[1]).toContain("policy vanilla");
    expect(lines.slice(2)).toHaveLength(5);
    expect(lines[2]).toMatch(/^moves\s+\d+\/\d+\s+executed \(\d+ never\)/);
    expect(lines[6]).toMatch(/^items\s+\d+\/\d+\s+present \(\d+ never\)/);
    // The activation half rides on the presence row rather than adding one.
    expect(lines[5]).toMatch(
      /^abilities\s+\d+\/\d+\s+present \(\d+ never\).*\u00b7 \d+\/\d+ activated \(\d+ never activated\)$/,
    );
    expect(lines[6]).toMatch(
      /^items\s+\d+\/\d+\s+present \(\d+ never\).*\u00b7 \d+\/\d+ activated \(\d+ never activated\)$/,
    );
  });
});

describe("soak coverage activation merge", () => {
  /** Two hand-built slices, exactly what a `--parallel` fan-out produces. */
  function slice(
    abilities: readonly (readonly ["player" | "opponent", number])[],
    items: readonly (readonly ["player" | "opponent", number])[],
  ): SoakCoverageReport {
    const collector = new SoakCoverageCollector("coverage-fight");
    for (const [side, ability] of abilities) collector.recordAbilityActivation(side, ability);
    for (const [side, item] of items) collector.recordItemActivation(side, item);
    return collector.report();
  }

  // ABILITY_SPEED_BOOST (3) and ABILITY_POISON_POINT (38); SITRUS BERRY (142).
  const left = slice([["opponent", 3], ["opponent", 3], ["player", 38]], [["player", 142]]);
  const right = slice([["opponent", 3]], [["player", 142], ["opponent", 142]]);

  it("sums per-side activation counts and recomputes the never-activated list", () => {
    const merged = mergeCoverageReports([left, right]);
    const speedBoost = merged.abilitiesActivated.entries.find((entry) => entry.id === 3);
    expect(speedBoost).toEqual({
      id: 3,
      name: "ABILITY_SPEED_BOOST",
      player: 0,
      opponent: 3,
      total: 3,
      inUniverse: true,
    });
    const poisonPoint = merged.abilitiesActivated.entries.find((entry) => entry.id === 38);
    expect(poisonPoint?.player).toBe(1);
    const sitrus = merged.itemsActivated.entries.find((entry) => entry.id === 142);
    expect(sitrus).toEqual({
      id: 142,
      name: "SITRUS BERRY",
      player: 2,
      opponent: 1,
      total: 3,
      inUniverse: true,
    });
    // Derived fields are RECOMPUTED, never unioned: the two merged ids drop
    // out of the never-activated list the slices each reported separately.
    expect(merged.abilitiesActivated.observed).toBe(2);
    expect(merged.abilitiesActivated.never)
      .toBe(merged.abilitiesActivated.universe - 2);
    const neverIds = new Set(merged.abilitiesActivated.neverObserved.map((entry) => entry.id));
    expect(neverIds.has(3)).toBe(false);
    expect(neverIds.has(38)).toBe(false);
    expect(merged.itemsActivated.observed).toBe(1);
    expect(merged.itemsActivated.bySide.player.total).toBe(2);
    expect(merged.itemsActivated.bySide.opponent.distinct).toBe(1);
  });

  it("merges a report written before the activation dimensions existed as empty", () => {
    // The supervisor holds coverage JSONs from before this rung; they are
    // JSON.parsed straight into SoakCoverageReport, so the keys are simply
    // absent at runtime.
    const { abilitiesActivated, itemsActivated, ...legacy } = left;
    expect(abilitiesActivated.observed).toBe(2);
    expect(itemsActivated.observed).toBe(1);
    const merged = mergeCoverageReports([legacy as SoakCoverageReport, right]);
    expect(merged.abilitiesActivated.entries).toEqual([
      { id: 3, name: "ABILITY_SPEED_BOOST", player: 0, opponent: 1, total: 1, inUniverse: true },
    ]);
    expect(merged.itemsActivated.entries).toEqual([
      { id: 142, name: "SITRUS BERRY", player: 1, opponent: 1, total: 2, inUniverse: true },
    ]);
    expect(merged.abilitiesActivated.observed).toBe(1);
    expect(merged.itemsActivated.observed).toBe(1);
    // The legacy report's own dimensions still merge normally.
    expect(merged.moves.universe).toBe(left.moves.universe);
    // And a report with NO activation data at all on either side merges clean.
    const bothLegacy = mergeCoverageReports([legacy as SoakCoverageReport]);
    expect(bothLegacy.abilitiesActivated.entries).toEqual([]);
    expect(bothLegacy.abilitiesActivated.never).toBe(bothLegacy.abilitiesActivated.universe);
    expect(bothLegacy.itemsActivated.entries).toEqual([]);
  });
});

describe("soak coverage honesty about ids outside the corpus", () => {
  it("reports an executed move that is not in the Level-50 corpus instead of dropping it", () => {
    const universe = level50Universe();
    // MOVE_STRUGGLE is executable in any battle (every slot unusable) but is
    // no rental set's move, so it is the natural outside-the-corpus case.
    const struggle = 165;
    expect(universe.moveIds.has(struggle)).toBe(false);
    const coverage = new SoakCoverageCollector("vanilla");
    coverage.recordExecutedMove("player", struggle);
    const report = coverage.report();
    const entry = report.moves.entries.find((row) => row.id === struggle);
    expect(entry).toEqual({
      id: struggle,
      name: "STRUGGLE",
      player: 1,
      opponent: 0,
      total: 1,
      inUniverse: false,
    });
    expect(report.moves.outsideUniverse).toEqual([entry]);
    // An outside-corpus id never inflates the executed/universe ratio.
    expect(report.moves.observed).toBe(0);
    expect(report.moves.never).toBe(report.moves.universe);
    expect(coverage.summaryLines()[2]).toContain("[+1 outside corpus]");
  });
});
