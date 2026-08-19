// CLI for the seeded random-play Factory round soak.
// The driver itself lives in tools/soak/randomRoundSoakDriver.ts (library,
// no import side effects) so tests/randomRoundSoak.test.ts can pin the green
// milestone surface. Crash findings are cataloged in
// docs/soak-crash-catalog.md — this tool never fixes engine behavior.
//
// Usage:
//   node --experimental-strip-types tools/soak/randomRoundSoak.ts --seeds 0:300
//   node --experimental-strip-types tools/soak/randomRoundSoak.ts --seed 7 --verbose
//   (npx tsx works identically if tsx is available)
// Options:
//   --seeds A:B        run seeds A..B-1 (default 0:50)
//   --seed N           run a single seed
//   --policy P         "full" (default: arbitrary-but-legal play), "vanilla"
//                      (plainest play: FIGHT first legal move, decline
//                      swaps, GO ON), or "winning" (opt-in: full's
//                      exploration, but biases fight-move selection to the
//                      highest-power legal damaging move and declines
//                      voluntary switches, for deep-streak crash coverage)
//   --max-frames N     per-seed tick budget before reporting HANG (default: resolveMaxFrames(policy), i.e. DEFAULT_MAX_FRAMES_BY_POLICY[policy])
//   --render-every N   call render() every N frames (0 disables; default 8)
//   --milestone        stop each seed at battle 1's first action menu (the
//                      Tier-1 pin surface)
//   --verbose          per-action log for a single-seed repro
//   --json PATH        also write the full per-seed results as JSON

import { writeFileSync } from "node:fs";
import {
  resolveMaxFrames,
  runSeed,
  type RunOptions,
  type SeedOutcome,
  type SeedResult,
  type SoakPolicy,
} from "./randomRoundSoakDriver.ts";

function main(): void {
  const args = process.argv.slice(2);
  const getFlag = (name: string): string | null => {
    const index = args.indexOf(name);
    return index >= 0 && index + 1 < args.length ? args[index + 1]! : null;
  };
  const verbose = args.includes("--verbose");
  const milestone = args.includes("--milestone");
  const singleSeed = getFlag("--seed");
  const seedsRange = getFlag("--seeds") ?? "0:50";
  const renderEvery = Number(getFlag("--render-every") ?? 8);
  const policy = (getFlag("--policy") ?? "full") as SoakPolicy;
  const jsonPath = getFlag("--json");
  if (policy !== "full" && policy !== "vanilla" && policy !== "winning") {
    console.error(`bad --policy: ${policy} (want full|vanilla|winning)`);
    process.exit(2);
  }
  const maxFramesFlag = getFlag("--max-frames");
  const maxFrames = resolveMaxFrames(policy, maxFramesFlag !== null ? Number(maxFramesFlag) : undefined);

  let seeds: number[];
  if (singleSeed !== null) {
    seeds = [Number(singleSeed)];
  } else {
    const match = seedsRange.match(/^(-?\d+):(-?\d+)$/);
    if (!match) {
      console.error(`bad --seeds range: ${seedsRange} (want A:B)`);
      process.exit(2);
    }
    const [start, end] = [Number(match![1]), Number(match![2])];
    seeds = Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
  }

  const options: Partial<RunOptions> = {
    maxFrames,
    renderEvery,
    verbose,
    policy,
    stopAtFirstActionMenu: milestone,
  };
  const results: SeedResult[] = [];
  const startedAt = Date.now();

  for (const seed of seeds) {
    const seedStart = Date.now();
    const result = runSeed(seed, options);
    results.push(result);
    const elapsed = ((Date.now() - seedStart) / 1000).toFixed(1);
    const head = `seed ${String(seed).padStart(4)}  ${result.outcome.padEnd(5)}`
      + `  b${result.battle} t${result.turn}  ${String(result.frames).padStart(6)}f  ${elapsed}s`;
    const depthSuffix = `  carry<=${result.maxCarriedWinStreak ?? "-"} depth<=${result.maxBattleDepth ?? "-"}`;
    if (result.outcome === "OK") {
      console.log(`${head}  ${result.endState}${depthSuffix}`);
    } else if (result.outcome === "CRASH") {
      console.log(`${head}  [${result.errorOrigin}/${result.errorPhase}] ${result.errorName}: ${result.errorMessage}${depthSuffix}`);
      if (verbose) {
        for (const frame of result.stackTop ?? []) console.log(`    ${frame}`);
        for (const action of result.lastActions ?? []) console.log(`    ${action}`);
      }
    } else {
      console.log(`${head}  stuck at ${result.hangSurface}${depthSuffix}`);
      if (verbose) {
        for (const action of result.lastActions ?? []) console.log(`    ${action}`);
      }
    }
  }

  // Aggregate
  const counts = { OK: 0, CRASH: 0, HANG: 0 } as Record<SeedOutcome, number>;
  const bySignature = new Map<string, SeedResult[]>();
  for (const result of results) {
    counts[result.outcome] += 1;
    if (result.outcome === "CRASH") {
      const list = bySignature.get(result.signature!) ?? [];
      list.push(result);
      bySignature.set(result.signature!, list);
    }
    if (result.outcome === "HANG") {
      const sig = `HANG @ ${result.hangSurface}`;
      const list = bySignature.get(sig) ?? [];
      list.push(result);
      bySignature.set(sig, list);
    }
  }

  const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log(`=== soak summary: ${results.length} seeds (policy ${policy}) in ${totalSeconds}s ===`);
  console.log(`OK ${counts.OK}  CRASH ${counts.CRASH}  HANG ${counts.HANG}`);

  // Depth distribution: how many seeds ever carried a win streak reaching
  // each challengeNum threshold (challengeNum = floor(factoryWinStreak / 7),
  // factoryRentalGeneration.ts/factoryTrainerSchedule.ts), plus the deepest
  // carry and battle-depth reached anywhere in the sweep.
  const reachedCarry = (min: number) =>
    results.filter((r) => (r.maxCarriedWinStreak ?? -1) >= min).length;
  const deepestCarry = results.reduce(
    (max, r) => (r.maxCarriedWinStreak !== null ? Math.max(max, r.maxCarriedWinStreak) : max),
    -1,
  );
  const deepestBattleDepth = results.reduce(
    (max, r) => (r.maxBattleDepth !== null ? Math.max(max, r.maxBattleDepth) : max),
    -1,
  );
  console.log("");
  console.log("=== depth distribution ===");
  console.log(`carry >= 7  (challengeNum >= 1): ${reachedCarry(7)}/${results.length}`);
  console.log(`carry >= 14 (challengeNum >= 2): ${reachedCarry(14)}/${results.length}`);
  console.log(`carry >= 21 (challengeNum >= 3): ${reachedCarry(21)}/${results.length}`);
  console.log(`deepest carry anywhere: ${deepestCarry >= 0 ? deepestCarry : "n/a"}`);
  console.log(`deepest battle-depth anywhere: ${deepestBattleDepth >= 0 ? deepestBattleDepth : "n/a"}`);

  const ranked = [...bySignature.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [signature, list] of ranked) {
    const seedsList = list.slice(0, 8).map((r) => r.seed).join(", ");
    console.log(`\n[${list.length}/${results.length}] ${signature}`);
    console.log(`  seeds: ${seedsList}${list.length > 8 ? ", …" : ""}`);
    const sample = list[0]!;
    console.log(`  first at: seed ${sample.seed}, battle ${sample.battle}, turn ${sample.turn}, frame ${sample.frames}`);
  }

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ counts, results }, null, 2));
    console.log(`\nwrote ${jsonPath}`);
  }
}

main();
