// Tier-1 pin for the soak coverage instrument (tools/soak/randomRoundSoakCoverage.ts,
// the CLI's `--coverage-json`). Hermetic: it drives the exported soak driver
// API over a short frame budget, exactly like the CLI does, and asserts the
// aggregated report -- never the emulator, never the oracle.

import { describe, expect, it } from "vitest";
import {
  level50Universe,
  SoakCoverageCollector,
} from "../tools/soak/randomRoundSoakCoverage.ts";
import { runSeed } from "../tools/soak/randomRoundSoakDriver.ts";

/** One short vanilla seed is enough to execute real moves on both sides. */
function driveShortSeed(): SoakCoverageCollector {
  const coverage = new SoakCoverageCollector("vanilla");
  runSeed(0, {
    policy: "vanilla",
    maxFrames: 30_000,
    renderEvery: 0,
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

  it("prints an `=== coverage ===` block with an executed/universe ratio per dimension", () => {
    const lines = coverage.summaryLines();
    expect(lines[0]).toBe("=== coverage ===");
    expect(lines[1]).toContain("policy vanilla");
    expect(lines.slice(2)).toHaveLength(5);
    expect(lines[2]).toMatch(/^moves\s+\d+\/\d+\s+executed \(\d+ never\)/);
    expect(lines[6]).toMatch(/^items\s+\d+\/\d+\s+present \(\d+ never\)/);
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
