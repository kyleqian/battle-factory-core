// Tier-1 pins for the soak CLI's `--parallel N` seed fan-out
// (tools/soak/randomRoundSoak.ts) and the coverage merge it reassembles
// slices with (tools/soak/randomRoundSoakCoverage.ts `mergeCoverageReports`).
//
// The contract is DETERMINISM, not speed: seeds are independent runs of
// `runSeed`, so slicing the seed list across child processes must produce
// exactly the results, per-seed lines, and merged coverage report the serial
// run produces. These tests therefore run the real CLI as a subprocess (the
// only way to exercise the parent/child split) with the cheapest gate
// configuration -- vanilla + --first-round, ~1 s/seed.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  level50Universe,
  mergeCoverageReports,
  SoakCoverageCollector,
} from "../tools/soak/randomRoundSoakCoverage.ts";

const scratch = mkdtempSync(join(tmpdir(), "soak-parallel-test-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const BASE_ARGS = [
  "--policy", "vanilla",
  "--seeds", "0:4",
  "--render-every", "0",
  "--first-round",
];

function runSoakCli(extraArgs: readonly string[]): string {
  return execFileSync(
    process.execPath,
    ["--experimental-strip-types", "tools/soak/randomRoundSoak.ts", ...BASE_ARGS, ...extraArgs],
    { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
  );
}

/**
 * The per-seed lines only, with the per-seed wall-clock blanked: that field
 * is genuinely different under a fan-out (children run concurrently on a
 * loaded box) and is the ONLY field allowed to differ.
 */
function perSeedLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  const summaryIndex = lines.findIndex((line) => line.startsWith("=== soak summary"));
  return (summaryIndex >= 0 ? lines.slice(0, summaryIndex) : lines)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.replace(/\d+\.\d+s/g, "<elapsed>"));
}

describe("soak --parallel seed fan-out", () => {
  it("produces the serial run's per-seed results and lines", () => {
    const serialJson = join(scratch, "serial.json");
    const parallelJson = join(scratch, "parallel.json");
    const serialOut = runSoakCli(["--json", serialJson]);
    const parallelOut = runSoakCli(["--parallel", "2", "--json", parallelJson]);

    const serial = JSON.parse(readFileSync(serialJson, "utf8")) as Record<string, unknown>;
    const parallel = JSON.parse(readFileSync(parallelJson, "utf8")) as Record<string, unknown>;
    // Same seeds, same outcomes, same frames -- the whole result record.
    expect(parallel.results).toEqual(serial.results);
    expect(parallel.counts).toEqual(serial.counts);
    expect((serial.results as { seed: number }[]).map((r) => r.seed)).toEqual([0, 1, 2, 3]);

    // Ascending seed order, never interleaved, and the same summary blocks.
    expect(perSeedLines(parallelOut)).toEqual(perSeedLines(serialOut));
    const summaryOf = (stdout: string) =>
      stdout.slice(stdout.indexOf("=== soak summary")).replace(/in \d+\.\d+s/, "in <elapsed>s");
    expect(summaryOf(parallelOut).replace(parallelJson, "<json>"))
      .toBe(summaryOf(serialOut).replace(serialJson, "<json>"));
  }, 120_000);

  it("merges --coverage-json field-for-field with the serial report", () => {
    const serialJson = join(scratch, "serial-cov-results.json");
    const parallelJson = join(scratch, "parallel-cov-results.json");
    const serialCoverage = join(scratch, "serial-coverage.json");
    const parallelCoverage = join(scratch, "parallel-coverage.json");
    runSoakCli(["--json", serialJson, "--coverage-json", serialCoverage]);
    runSoakCli([
      "--parallel", "2",
      "--json", parallelJson,
      "--coverage-json", parallelCoverage,
    ]);

    const serial = JSON.parse(readFileSync(serialCoverage, "utf8")) as Record<string, unknown>;
    const parallel = JSON.parse(readFileSync(parallelCoverage, "utf8")) as Record<string, unknown>;
    // Field-for-field: counts, universe totals, never-lists, run totals.
    expect(parallel).toEqual(serial);
    const run = serial.run as { seeds: number[]; battles: number };
    expect(run.seeds).toEqual([0, 1, 2, 3]);
    expect(run.battles).toBeGreaterThan(0);
    const moves = serial.moves as { observed: number; never: number; universe: number };
    expect(moves.observed).toBeGreaterThan(0);
    expect(moves.observed + moves.never).toBe(moves.universe);
  }, 120_000);
});

describe("mergeCoverageReports", () => {
  const universe = level50Universe();
  const [inCorpusA, inCorpusB] = [...universe.moveIds].sort((a, b) => a - b);
  /** MOVE_POUND: a real move no level-50 rental set carries. */
  const outsideCorpus = 1;

  /** Two hand-built slice reports and the single-collector report they must merge into. */
  function buildReports() {
    const sliceOne = new SoakCoverageCollector("vanilla");
    sliceOne.beginSeed(0);
    sliceOne.recordExecutedMove("player", inCorpusA!);
    sliceOne.recordExecutedMove("opponent", inCorpusA!);
    sliceOne.recordPlayerFightCommit(inCorpusA!);

    const sliceTwo = new SoakCoverageCollector("vanilla");
    sliceTwo.beginSeed(1);
    sliceTwo.recordExecutedMove("player", inCorpusA!);
    sliceTwo.recordExecutedMove("player", inCorpusB!);
    sliceTwo.recordExecutedMove("opponent", outsideCorpus);
    sliceTwo.recordPlayerFightCommit(inCorpusA!);
    sliceTwo.recordPlayerFightCommit(inCorpusB!);

    const serial = new SoakCoverageCollector("vanilla");
    serial.beginSeed(0);
    serial.recordExecutedMove("player", inCorpusA!);
    serial.recordExecutedMove("opponent", inCorpusA!);
    serial.recordPlayerFightCommit(inCorpusA!);
    serial.beginSeed(1);
    serial.recordExecutedMove("player", inCorpusA!);
    serial.recordExecutedMove("player", inCorpusB!);
    serial.recordExecutedMove("opponent", outsideCorpus);
    serial.recordPlayerFightCommit(inCorpusA!);
    serial.recordPlayerFightCommit(inCorpusB!);

    return { sliceOne: sliceOne.report(), sliceTwo: sliceTwo.report(), serial: serial.report() };
  }

  it("sums per-side counts and run totals", () => {
    const { sliceOne, sliceTwo } = buildReports();
    const merged = mergeCoverageReports([sliceOne, sliceTwo]);
    expect(merged.run.seeds).toEqual([0, 1]);
    expect(merged.run.seedCount).toBe(2);
    expect(merged.run.executedMoveActions).toBe(5);
    const entry = merged.moves.entries.find((e) => e.id === inCorpusA)!;
    // 2 player (one per slice) + 1 opponent.
    expect(entry).toMatchObject({ player: 2, opponent: 1, total: 3, inUniverse: true });
    expect(merged.moves.bySide.player).toEqual({ distinct: 2, total: 3 });
    expect(merged.moves.bySide.opponent).toEqual({ distinct: 2, total: 2 });
    expect(merged.playerFightCommits.total).toBe(3);
    expect(merged.playerFightCommits.entries.find((e) => e.id === inCorpusA)!.commits).toBe(2);
  });

  it("recomputes the never-list from the universe and unions outsideUniverse", () => {
    const { sliceOne, sliceTwo } = buildReports();
    const merged = mergeCoverageReports([sliceOne, sliceTwo]);
    // Each slice alone still calls the other slice's move "never"; the merge
    // recomputes against the universe, so neither survives in the merged list.
    expect(sliceOne.moves.neverObserved.some((e) => e.id === inCorpusB)).toBe(true);
    expect(merged.moves.neverObserved.some((e) => e.id === inCorpusA)).toBe(false);
    expect(merged.moves.neverObserved.some((e) => e.id === inCorpusB)).toBe(false);
    expect(merged.moves.observed).toBe(2);
    expect(merged.moves.never).toBe(universe.moveIds.size - 2);
    // The out-of-corpus move is carried, never dropped, and never counted as observed.
    expect(merged.moves.outsideUniverse.map((e) => e.id)).toEqual([outsideCorpus]);
  });

  it("equals the single-collector report of the same observations", () => {
    const { sliceOne, sliceTwo, serial } = buildReports();
    expect(mergeCoverageReports([sliceOne, sliceTwo])).toEqual(serial);
  });

  it("rejects an empty merge", () => {
    expect(() => mergeCoverageReports([])).toThrow(/no reports/);
  });
});
