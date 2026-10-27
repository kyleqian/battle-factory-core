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
//                      swaps, GO ON), "winning" (opt-in: full's
//                      exploration, but biases fight-move selection to the
//                      highest-power legal damaging move and declines
//                      voluntary switches, for deep-streak crash coverage),
//                      or "winning-swap" (opt-in: identical to "winning"
//                      except it accepts every postwin swap offer and, on
//                      the swap screen, swaps its lowest-scoring rental for
//                      the defeated opponent's highest-scoring mon -- covers
//                      the Factory swap screen at real carried-streak depth)
//                      or "oracle-strength" (opt-in: identical to "winning"
//                      except the fight-move choice, which is delegated to
//                      the engine's own source-derived Factory AI scorer
//                      running for the player's side under the full mask 7
//                      -- the lever-2 measurement instrument of
//                      docs/soak-policy-strength-scout-2026-08-23.md)
//                      or "winning-coverage" (opt-in: identical to
//                      "winning" except the draft, which rents the 3-of-6
//                      offered rentals maximising a coverage-first
//                      (offensive coverage, defensive diversity, base-stat
//                      total) score instead of a random 3-of-6 -- the
//                      lever-4' measurement instrument of the same doc)
//                      or "winning-combined" (opt-in: "winning-coverage"
//                      with a strength floor -- the same coverage-first
//                      score maximised only over trios whose summed
//                      base-stat total is >= the mean candidate trio's,
//                      so coverage cannot field an all-frail party)
//                      or "coverage-fight" (opt-in CRASH-COVERAGE
//                      instrument: "winning-coverage"'s draft and every
//                      other winning-like decision, but the fight menu
//                      commits the LEGAL slot whose move this run has used
//                      least so far -- ties to the lowest slot -- so every
//                      move in every drafted set gets spent, including the
//                      status/utility slots a strength policy never plays)
//   --max-frames N     per-seed tick budget; a seed still progressing when it
//                      runs out finishes OK ("budget"), not HANG (default:
//                      resolveMaxFrames(policy), i.e. DEFAULT_MAX_FRAMES_BY_POLICY[policy])
//   --stall-frames N   frames of zero progress before reporting HANG (default: DEFAULT_STALL_FRAMES, i.e. 30_000 — ISSUES #104 retune)
//   --max-rounds N     finish OK ("max-rounds") once N round decisions have been observed (default: unlimited)
//   --render-every N   call render() every N frames (0 disables; default 8)
//   --start-carry N    opt-in: start the FIRST chained round from a carried
//                      win streak of N instead of the anchor boot -- crash
//                      coverage of the challengeNum >= 1 tiers a soak's own
//                      natural chaining almost never reaches. N must be a
//                      multiple of 7 in 0..49 (rejected otherwise); 0 or
//                      omitted is byte-identical to today.
//   --vary-rng         opt-in: advance the boot RNG cursor by the seed (one
//                      LCG step per seed unit) before generating the
//                      start-carry draft, so every seed opens on different
//                      offers. THE VARIANCE INSTRUMENT for deterministic-
//                      draft policies (winning-coverage/winning-combined),
//                      whose seeds otherwise collapse into one trajectory
//                      because the engine itself is seed-invariant. Works
//                      with --start-carry 0/omitted too (generated carry-0
//                      draft off the walked cursor instead of the pinned
//                      anchor snapshot).
//   --first-round      stop each seed at its FIRST round's own decided
//                      outcome (endState roundComplete/roundLost) instead of
//                      chaining to the frame budget -- the direct
//                      rounds-won-at-boot measurement. A first round that
//                      never decides is OK ("budget") while it keeps
//                      progressing; HANG only after --stall-frames frozen
//                      frames, exactly as in continuous play.
//   --scene S          on | off | both. Absent = today's behaviour,
//                      byte-identical (Scene OFF, no scene tags anywhere).
//                      `on` starts every seed from battleSceneMode "on" (fresh,
//                      --start-carry and --vary-rng starts alike), so render()
//                      -- the same entry point the browser calls -- runs the
//                      real Scene ON battle-scene drawing. `off` is the same
//                      as absent but tags lines/JSON/summary with the scene.
//                      `both` runs every seed twice (off, then on), each
//                      seed's pair adjacent, and the summary adds one count
//                      line per scene. Works with --parallel. Rejected with
//                      --coverage-json when `both` (a seed would be counted
//                      twice). A throw from render() is a CRASH
//                      (errorPhase "render"), like an engine throw.
//   --milestone        stop each seed at battle 1's first action menu (the
//                      Tier-1 pin surface)
//   --verbose          per-action log for a single-seed repro
//   --parallel N       opt-in: run the seed list as N contiguous slices in N
//                      child processes of this same script (default 1 =
//                      today's single-process behaviour, byte-identical
//                      output). Seeds are independent runs of runSeed(), so
//                      each slice's per-seed results are exactly what the
//                      serial run would have produced; the parent buffers
//                      each child's per-seed lines and prints them in
//                      ASCENDING seed order (never interleaved), then prints
//                      the SAME summary blocks computed from the merged
//                      results. Exits non-zero if any child does; child
//                      stderr is forwarded. Ignored for a --seed run.
//   --json PATH        also write the full per-seed results as JSON
//   --coverage-json PATH  opt-in: aggregate, ACROSS ALL SEEDS of this run,
//                      which moves / move effects / species / abilities /
//                      held items the chains actually touched, against the
//                      Level-50 rental corpus as the universe; writes the
//                      full report to PATH and prints an `=== coverage ===`
//                      summary block. Observation only -- absent, the run is
//                      byte-identical to today (see
//                      tools/soak/randomRoundSoakCoverage.ts).

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  coverageSummaryLines,
  mergeCoverageReports,
  SoakCoverageCollector,
  type SoakCoverageReport,
} from "./randomRoundSoakCoverage.ts";
import {
  createStartCarryState,
  DEFAULT_STALL_FRAMES,
  resolveMaxFrames,
  runSeed,
  validateStartCarry,
  type RunOptions,
  type SeedOutcome,
  type SeedResult,
  type SoakPolicy,
  type SoakScene,
} from "./randomRoundSoakDriver.ts";

// ---------------------------------------------------------------------------
// --parallel fan-out (parent side)
// ---------------------------------------------------------------------------

type SceneFlag = SoakScene | "both" | null;

const SCRIPT_PATH = fileURLToPath(import.meta.url);

/**
 * Flags the parent REPLACES for each child: the seed selection it slices and
 * the two output paths it redirects to per-slice temp files. Every other flag
 * (policy, budgets, --vary-rng, --first-round, --verbose, …) is passed through
 * verbatim, so a slice runs the parent's exact configuration.
 */
const PARENT_ONLY_VALUE_FLAGS = ["--parallel", "--seed", "--seeds", "--json", "--coverage-json"];

function childArgs(
  args: readonly string[],
  seedStart: number,
  seedEnd: number,
  jsonPath: string,
  coverageJsonPath: string | null,
): string[] {
  const kept: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    // Each of these carries a value; skip both tokens.
    if (PARENT_ONLY_VALUE_FLAGS.includes(arg)) {
      index += 1;
      continue;
    }
    kept.push(arg);
  }
  kept.push("--seeds", `${seedStart}:${seedEnd}`, "--json", jsonPath);
  if (coverageJsonPath !== null) kept.push("--coverage-json", coverageJsonPath);
  return kept;
}

/**
 * Contiguous, near-equal slices of an ascending seed list, as the half-open
 * `--seeds A:B` ranges the children take. The first `length % sliceCount`
 * slices carry one extra seed; empty slices are dropped.
 */
function sliceSeeds(
  seeds: readonly number[],
  sliceCount: number,
): { start: number; end: number }[] {
  const slices: { start: number; end: number }[] = [];
  const base = Math.floor(seeds.length / sliceCount);
  const remainder = seeds.length % sliceCount;
  let index = 0;
  for (let slice = 0; slice < sliceCount; slice += 1) {
    const size = base + (slice < remainder ? 1 : 0);
    if (size === 0) continue;
    slices.push({ start: seeds[index]!, end: seeds[index + size - 1]! + 1 });
    index += size;
  }
  return slices;
}

/** One child's captured stdout plus its exit status (stderr is inherited). */
function runChild(childArgv: readonly string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", SCRIPT_PATH, ...childArgv],
      // stderr is inherited, so a child's diagnostics reach the parent's
      // stderr as they happen instead of being buffered and reordered.
      { stdio: ["ignore", "pipe", "inherit"] },
    );
    const chunks: string[] = [];
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout: chunks.join("") }));
  });
}

/**
 * A child's per-seed lines only: everything it printed before its own
 * `=== soak summary` block (verbose stack/action lines included, blank
 * separator trimmed). The parent prints the summary itself, from the merged
 * results.
 */
function perSeedLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  const summaryIndex = lines.findIndex((line) => line.startsWith("=== soak summary"));
  const head = summaryIndex >= 0 ? lines.slice(0, summaryIndex) : lines;
  while (head.length > 0 && head[head.length - 1] === "") head.pop();
  return head;
}

/**
 * Runs the seed list as `parallel` contiguous slices in child processes of
 * this same script and reassembles their output as if it had been one serial
 * run: per-seed lines buffered per child and emitted in ascending seed order,
 * then the shared summary blocks over the merged results. Sets a non-zero
 * exit code if any child failed (a CRASH *seed* is a normal finding and still
 * exits 0, exactly as in the serial path).
 */
async function runParallelFanOut(options: {
  args: readonly string[];
  seeds: readonly number[];
  parallel: number;
  policy: SoakPolicy;
  scene: SceneFlag;
  jsonPath: string | null;
  coverageJsonPath: string | null;
}): Promise<void> {
  const { args, seeds, parallel, policy, scene, jsonPath, coverageJsonPath } = options;
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "soak-parallel-"));
  const startedAt = Date.now();
  let failed = false;
  try {
    const plans = sliceSeeds(seeds, Math.min(parallel, seeds.length)).map((slice, index) => ({
      slice,
      jsonPath: join(temporaryDirectory, `slice-${index}.json`),
      coverageJsonPath: coverageJsonPath !== null
        ? join(temporaryDirectory, `slice-${index}-coverage.json`)
        : null,
    }));
    const runs = await Promise.all(plans.map((plan) =>
      runChild(childArgs(args, plan.slice.start, plan.slice.end, plan.jsonPath, plan.coverageJsonPath))
    ));

    // Slice order IS ascending seed order, and each child's own lines are
    // ascending within its slice: printing them buffered, child by child,
    // reproduces the serial ordering exactly (never interleaved).
    for (const run of runs) {
      for (const line of perSeedLines(run.stdout)) console.log(line);
    }

    const results: SeedResult[] = [];
    const coverageReports: SoakCoverageReport[] = [];
    for (const [index, plan] of plans.entries()) {
      const run = runs[index]!;
      const label = `slice ${plan.slice.start}:${plan.slice.end}`;
      if (run.code !== 0) {
        failed = true;
        console.error(`soak --parallel: ${label} exited ${run.code}`);
      }
      try {
        const parsed = JSON.parse(readFileSync(plan.jsonPath, "utf8")) as { results: SeedResult[] };
        results.push(...parsed.results);
      } catch (error) {
        failed = true;
        console.error(`soak --parallel: ${label} wrote no readable results (${(error as Error).message})`);
        continue;
      }
      if (plan.coverageJsonPath === null) continue;
      try {
        coverageReports.push(
          JSON.parse(readFileSync(plan.coverageJsonPath, "utf8")) as SoakCoverageReport,
        );
      } catch (error) {
        failed = true;
        console.error(`soak --parallel: ${label} wrote no readable coverage (${(error as Error).message})`);
      }
    }

    const counts = printSoakSummary(results, policy, ((Date.now() - startedAt) / 1000).toFixed(1), scene);

    if (jsonPath) {
      writeFileSync(jsonPath, JSON.stringify({ counts, results }, null, 2));
      console.log(`\nwrote ${jsonPath}`);
    }
    if (coverageJsonPath !== null && coverageReports.length > 0) {
      const merged = mergeCoverageReports(coverageReports);
      console.log("");
      for (const line of coverageSummaryLines(merged)) console.log(line);
      writeFileSync(coverageJsonPath, JSON.stringify(merged, null, 2));
      console.log(`wrote ${coverageJsonPath}`);
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  if (failed) process.exitCode = 1;
}

/**
 * The whole post-run stdout tail -- `=== soak summary`, the depth
 * distribution, the OK breakdown, and the CRASH/HANG signature groups --
 * plus the outcome counts that go into `--json`. Called by BOTH the serial
 * path (on the seeds it just ran) and the `--parallel` parent (on the merged
 * results of every slice), so a fan-out prints exactly the serial blocks.
 */
function printSoakSummary(
  results: readonly SeedResult[],
  policy: SoakPolicy,
  totalSeconds: string,
  scene: SceneFlag = null,
): Record<SeedOutcome, number> {
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

  console.log("");
  const sceneLabel = scene === null ? "" : `, scene ${scene}`;
  console.log(
    `=== soak summary: ${results.length} ${scene === "both" ? "runs" : "seeds"}`
      + ` (policy ${policy}${sceneLabel}) in ${totalSeconds}s ===`,
  );
  // `budget` is a subset of OK (broken out again in the OK breakdown
  // below): seeds that reached --max-frames while still progressing — a
  // stalemate or an endlessly chaining run, not a hang. On the headline
  // line so a gate reader sees them without grepping the per-seed lines.
  const budgetSeeds = results.filter((r) => r.endState === "budget").length;
  console.log(
    `OK ${counts.OK}  CRASH ${counts.CRASH}  HANG ${counts.HANG}  budget ${budgetSeeds}`,
  );
  const containedSeeds = results.filter((r) => r.contained !== undefined).length;
  if (containedSeeds > 0) console.log(`CONTAINED ${containedSeeds} (presentation throws degraded to the static field)`);
  if (scene !== null) {
    for (const sceneName of ["off", "on"] as const) {
      const subset = results.filter((r) => r.scene === sceneName);
      if (subset.length === 0) continue;
      const count = (outcome: SeedOutcome) => subset.filter((r) => r.outcome === outcome).length;
      console.log(
        `scene ${sceneName.padEnd(3)}: ${subset.length} runs  OK ${count("OK")}`
          + `  CRASH ${count("CRASH")}  HANG ${count("HANG")}`
          + `  budget ${subset.filter((r) => r.endState === "budget").length}`,
      );
    }
  }

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
  console.log(`carry >= 28 (challengeNum >= 4): ${reachedCarry(28)}/${results.length}`);
  console.log(`deepest carry anywhere: ${deepestCarry >= 0 ? deepestCarry : "n/a"}`);
  console.log(`deepest battle-depth anywhere: ${deepestBattleDepth >= 0 ? deepestBattleDepth : "n/a"}`);

  // OK breakdown: "budget" (frame budget reached while still progressing)
  // vs. "max-rounds" vs. a genuine round/milestone outcome (ISSUES #104
  // retune, PROGRESS ~1368) — cheap since it only re-groups results already
  // in memory.
  const okByEndState = new Map<string, number>();
  for (const result of results) {
    if (result.outcome !== "OK") continue;
    const key = result.endState ?? "unknown";
    okByEndState.set(key, (okByEndState.get(key) ?? 0) + 1);
  }
  if (okByEndState.size > 0) {
    console.log("");
    console.log("=== OK breakdown ===");
    for (const [key, count] of [...okByEndState.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${key}: ${count}`);
    }
  }

  const ranked = [...bySignature.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [signature, list] of ranked) {
    const seedsList = list.slice(0, 8).map((r) => r.seed).join(", ");
    console.log(`\n[${list.length}/${results.length}] ${signature}`);
    console.log(`  seeds: ${seedsList}${list.length > 8 ? ", …" : ""}`);
    const sample = list[0]!;
    const sampleScene = sample.scene !== undefined ? ` (scene ${sample.scene})` : "";
    console.log(`  first at: seed ${sample.seed}${sampleScene}, battle ${sample.battle}, turn ${sample.turn}, frame ${sample.frames}`);
  }

  return counts;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getFlag = (name: string): string | null => {
    const index = args.indexOf(name);
    return index >= 0 && index + 1 < args.length ? args[index + 1]! : null;
  };
  const verbose = args.includes("--verbose");
  const milestone = args.includes("--milestone");
  const varyRng = args.includes("--vary-rng");
  const firstRound = args.includes("--first-round");
  const singleSeed = getFlag("--seed");
  const seedsRange = getFlag("--seeds") ?? "0:50";
  const renderEvery = Number(getFlag("--render-every") ?? 8);
  const policy = (getFlag("--policy") ?? "full") as SoakPolicy;
  const jsonPath = getFlag("--json");
  const coverageJsonPath = getFlag("--coverage-json");
  const parallelFlag = getFlag("--parallel");
  const parallel = parallelFlag !== null ? Number(parallelFlag) : 1;
  if (!Number.isInteger(parallel) || parallel < 1) {
    console.error(`bad --parallel: ${parallelFlag} (want a positive integer)`);
    process.exit(2);
  }
  if (
    policy !== "full" && policy !== "vanilla" && policy !== "winning"
    && policy !== "winning-swap" && policy !== "oracle-strength"
    && policy !== "winning-coverage" && policy !== "winning-combined"
    && policy !== "coverage-fight"
  ) {
    console.error(
      `bad --policy: ${policy} `
        + `(want full|vanilla|winning|winning-swap|oracle-strength|winning-coverage`
        + `|winning-combined|coverage-fight)`,
    );
    process.exit(2);
  }
  const sceneFlag = getFlag("--scene");
  if (args.includes("--scene") && sceneFlag !== "on" && sceneFlag !== "off" && sceneFlag !== "both") {
    console.error(`bad --scene: ${sceneFlag} (want on|off|both)`);
    process.exit(2);
  }
  const scene = sceneFlag as SceneFlag;
  if (scene === "both" && getFlag("--coverage-json") !== null) {
    console.error("bad --scene: both cannot be combined with --coverage-json (each seed would be counted twice)");
    process.exit(2);
  }
  const maxFramesFlag = getFlag("--max-frames");
  const maxFrames = resolveMaxFrames(policy, maxFramesFlag !== null ? Number(maxFramesFlag) : undefined);
  const stallFramesFlag = getFlag("--stall-frames");
  const stallFrames = stallFramesFlag !== null ? Number(stallFramesFlag) : DEFAULT_STALL_FRAMES;
  const maxRoundsFlag = getFlag("--max-rounds");
  const maxRounds = maxRoundsFlag !== null ? Number(maxRoundsFlag) : undefined;
  const startCarryFlag = getFlag("--start-carry");
  const startCarry = startCarryFlag !== null ? Number(startCarryFlag) : 0;
  try {
    validateStartCarry(startCarry);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }

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

  // Opt-in process fan-out. A --seed run (and a degenerate 1-seed range) has
  // nothing to split, so it stays in-process regardless of --parallel.
  if (singleSeed === null && parallel > 1 && seeds.length > 1) {
    await runParallelFanOut({ args, seeds, parallel, policy, scene, jsonPath, coverageJsonPath });
    return;
  }

  // Constructed only when the flag is present, so a flagless run never
  // enters a single line of the instrument.
  const coverage = coverageJsonPath !== null ? new SoakCoverageCollector(policy) : null;

  const baseOptions: Partial<RunOptions> = {
    maxFrames,
    renderEvery,
    verbose,
    policy,
    stopAtFirstActionMenu: milestone,
    stopAtFirstRoundDecision: firstRound,
    stallFrames,
    maxRounds,
    ...(coverage !== null ? { coverage } : {}),
  };
  const optionsFor = (sceneName: SoakScene | null): Partial<RunOptions> => ({
    ...baseOptions,
    ...(sceneName !== null ? { scene: sceneName } : {}),
    ...(startCarry !== 0 || varyRng
      ? {
        stateFactory: (seed: number) =>
          createStartCarryState(startCarry, varyRng ? seed : 0, sceneName ?? "off"),
      }
      : {}),
  });
  const scenes: (SoakScene | null)[] = scene === "both" ? ["off", "on"] : [scene];
  const results: SeedResult[] = [];
  const startedAt = Date.now();

  for (const seed of seeds) for (const sceneName of scenes) {
    const seedStart = Date.now();
    const result = runSeed(seed, optionsFor(sceneName));
    results.push(result);
    const elapsed = ((Date.now() - seedStart) / 1000).toFixed(1);
    const sceneTag = sceneName !== null ? ` ${sceneName.padEnd(3)}` : "";
    const head = `seed ${String(seed).padStart(4)}${sceneTag}  ${result.outcome.padEnd(5)}`
      + `  b${result.battle} t${result.turn}  ${String(result.frames).padStart(6)}f  ${elapsed}s`;
    // contain209: presentation throws the engine contained (the seed's outcome is unchanged).
    const depthSuffix = `  carry<=${result.maxCarriedWinStreak ?? "-"} depth<=${result.maxBattleDepth ?? "-"}`
      + (result.contained !== undefined ? `  CONTAINED ${result.contained}: ${result.containedFirstMessage}` : "");
    if (result.outcome === "OK") {
      console.log(`${head}  ${result.endState}${depthSuffix}`);
    } else if (result.outcome === "CRASH") {
      console.log(`${head}  [${result.errorOrigin}/${result.errorPhase}] ${result.errorName}: ${result.errorMessage}${depthSuffix}`);
      if (verbose) {
        for (const frame of result.stackTop ?? []) console.log(`    ${frame}`);
        for (const action of result.lastActions ?? []) console.log(`    ${action}`);
      }
    } else {
      const decidedSuffix = result.endState ? ` (decided: ${result.endState})` : "";
      console.log(`${head}  stuck at ${result.hangSurface}${decidedSuffix}${depthSuffix}`);
      if (verbose) {
        for (const action of result.lastActions ?? []) console.log(`    ${action}`);
      }
    }
  }

  const counts = printSoakSummary(results, policy, ((Date.now() - startedAt) / 1000).toFixed(1), scene);

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ counts, results }, null, 2));
    console.log(`\nwrote ${jsonPath}`);
  }

  if (coverage !== null && coverageJsonPath !== null) {
    console.log("");
    for (const line of coverage.summaryLines()) console.log(line);
    writeFileSync(coverageJsonPath, JSON.stringify(coverage.report(), null, 2));
    console.log(`wrote ${coverageJsonPath}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
