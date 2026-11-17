// Baton Pass seed scanner for the ISSUES #89 pin in tests/randomRoundSoak.test.ts
// ("seed N's mid-turn Baton Pass openpartyscreen halt resumes through the forced party selector").
//
// A seed HITS when its soak run commits Baton Pass (move 226) and afterwards the forced party selector opens on a
// STILL-LIVING outgoing slot (Baton Pass's own switch; a faint-driven selector's outgoing slot has fainted). It observes
// the soak's own runSeed() through the observation-only `coverage` seam, never as a decision input. A seed is a PIN
// CANDIDATE when it hits AND ends outcome OK with no openpartyscreen / machine-barrier error AND played >= 1 Lobby new
// challenge -- exactly the pin's assertions. The pin takes the LOWEST candidate.
//
// Usage (the defaults reproduce the pin's options: full policy, 80,000 frames, renderEvery 0):
//   node --experimental-strip-types --no-warnings tools/soak/batonPassSearch.ts --seeds 0:40
//   node --experimental-strip-types --no-warnings tools/soak/batonPassSearch.ts --seeds 0:200 --parallel 4
// Options:
//   --seeds A:B          scan seeds A..B-1 (default 0:20)
//   --parallel N         run the range as N contiguous slices in N child processes (default 1)
//   --max-frames N       frame budget per seed (default 80000, the pin's)
//   --policy P           soak policy (default full, the pin's)
//   --first-round        also set stopAtFirstRoundDecision (NOT the pin's options; the pre-lbra scans used it)
//   --out FILE           write one JSON row per seed (ascending) to FILE
//   --stop-after N       stop after N hits (single process only; default: scan the whole range)
// Output: one line per seed, then "pin candidates:" with the lowest first. Re-pin: set the test's runSeed(<lowest candidate>),
// add a history line naming the commit that moved it, and the scan range / candidates (see the test's history).
// A whole 0:40 scan at 80,000 frames takes a few minutes per core; use --parallel to fan out.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EngineState } from "../../src/engine/core.ts";
import "../../src/engine/monPicPixelsInstall.ts"; // iss215: standalone node run must install the sprite pixel provider
import { runSeed } from "./randomRoundSoakDriver.ts";

const BATON_PASS = 226;
const SCRIPT_PATH = fileURLToPath(import.meta.url);

type Halt = { frame: number; battleIndex: number | null; outgoingPartyIndex: number; species: string };

export type BatonPassRow = {
  seed: number;
  hit: boolean;
  candidate: boolean;
  batonPassCommits: number;
  firstCommitFrame: number | null;
  halt: Halt | null;
  outcome: string;
  frames: number;
  battle: number;
  turn: number;
  lobbyNewChallenges: number;
  errorMessage: string | null;
};

function getFlag(name: string): string | null {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseRange(text: string): [number, number] {
  const match = /^(\d+):(\d+)$/.exec(text);
  if (match === null) throw new Error(`--seeds expects A:B (half-open), got "${text}"`);
  return [Number(match[1]), Number(match[2])];
}

function scanSeed(seed: number, policy: string, maxFrames: number, firstRound: boolean): BatonPassRow {
  let frame = 0;
  let batonPassCommits = 0;
  let firstCommitFrame: number | null = null;
  let halt: Halt | null = null;
  const observer = {
    beginSeed(): void {},
    recordPlayerFightCommit(moveId: number): void {
      if (moveId !== BATON_PASS) return;
      batonPassCommits += 1;
      firstCommitFrame ??= frame;
    },
    observe(state: EngineState): void {
      frame = state.frame;
      const orch = state.factoryRoundBattleOrchestrator;
      const selector = orch?.battleForcedPartySelect ?? null;
      if (halt !== null || selector === null || firstCommitFrame === null) return;
      const outgoing = selector.party.find((m) => m.partyIndex === selector.request.faintedPartyIndex);
      if (outgoing !== undefined && !outgoing.fainted) {
        halt = {
          frame: state.frame,
          battleIndex: orch?.round.rules.battleIndex ?? null,
          outgoingPartyIndex: outgoing.partyIndex,
          species: outgoing.species,
        };
      }
    },
  };
  const result = runSeed(seed, {
    policy: policy as never,
    maxFrames,
    renderEvery: 0,
    ...(firstRound ? { stopAtFirstRoundDecision: true } : {}),
    // Duck-typed: runSeed only calls beginSeed / observe / recordPlayerFightCommit.
    coverage: observer as never,
  });
  const errorMessage = result.errorMessage ?? null;
  const lobbyNewChallenges = result.lobbyNewChallenges ?? 0;
  const hit = halt !== null;
  return {
    seed,
    hit,
    candidate:
      hit &&
      result.outcome === "OK" &&
      !/openpartyscreen|machine-barrier/i.test(errorMessage ?? "") &&
      lobbyNewChallenges >= 1,
    batonPassCommits,
    firstCommitFrame,
    halt,
    outcome: result.outcome,
    frames: result.frames,
    battle: result.battle,
    turn: result.turn,
    lobbyNewChallenges,
    errorMessage,
  };
}

function formatRow(row: BatonPassRow): string {
  const halt = row.halt === null ? "no halt" : `halt ${row.halt.frame} ${row.halt.species} battleIndex ${row.halt.battleIndex}`;
  return (
    `seed ${row.seed}: ${row.candidate ? "CANDIDATE" : row.hit ? "hit (not a candidate)" : "-"} ` +
    `commits ${row.batonPassCommits} first ${row.firstCommitFrame ?? "-"} ${halt} | ${row.outcome} ` +
    `${row.frames} frames battle ${row.battle} turn ${row.turn} lobbyNew ${row.lobbyNewChallenges}` +
    (row.errorMessage === null ? "" : ` error "${row.errorMessage.slice(0, 80)}"`)
  );
}

function slices(start: number, end: number, count: number): [number, number][] {
  const total = end - start;
  const base = Math.floor(total / count);
  const extra = total % count;
  const out: [number, number][] = [];
  let at = start;
  for (let i = 0; i < count; i += 1) {
    const size = base + (i < extra ? 1 : 0);
    if (size > 0) out.push([at, at + size]);
    at += size;
  }
  return out;
}

function report(rows: BatonPassRow[], outPath: string | null): void {
  rows.sort((a, b) => a.seed - b.seed);
  for (const row of rows) console.log(formatRow(row));
  const hits = rows.filter((row) => row.hit).map((row) => row.seed);
  const candidates = rows.filter((row) => row.candidate).map((row) => row.seed);
  console.log(`hits: ${hits.join(", ") || "none"}`);
  console.log(`pin candidates (lowest first): ${candidates.join(", ") || "none"}`);
  if (outPath !== null) writeFileSync(outPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
}

function main(): void {
  const [lo, hi] = parseRange(getFlag("seeds") ?? "0:20");
  const policy = getFlag("policy") ?? "full";
  const maxFrames = Number(getFlag("max-frames") ?? 80_000);
  const firstRound = hasFlag("first-round");
  const parallel = Number(getFlag("parallel") ?? 1);
  const outPath = getFlag("out");
  const stopAfter = getFlag("stop-after") === null ? Infinity : Number(getFlag("stop-after"));

  if (parallel <= 1) {
    const rows: BatonPassRow[] = [];
    let hits = 0;
    for (let seed = lo; seed < hi && hits < stopAfter; seed += 1) {
      const row = scanSeed(seed, policy, maxFrames, firstRound);
      if (row.hit) hits += 1;
      rows.push(row);
      console.error(formatRow(row));
    }
    report(rows, outPath);
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "baton-pass-scan-"));
  const children = slices(lo, hi, parallel).map(([start, end], index) => {
    const file = join(dir, `slice-${index}.jsonl`);
    const args = [
      "--experimental-strip-types",
      "--no-warnings",
      SCRIPT_PATH,
      "--seeds",
      `${start}:${end}`,
      "--policy",
      policy,
      "--max-frames",
      String(maxFrames),
      "--out",
      file,
      ...(firstRound ? ["--first-round"] : []),
    ];
    const done = new Promise<number | null>((resolve) => {
      spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] }).on("close", resolve);
    });
    return { file, start, end, done };
  });
  void Promise.all(children.map((child) => child.done)).then((codes) => {
    const rows: BatonPassRow[] = [];
    try {
      children.forEach((child, index) => {
        if (codes[index] !== 0) throw new Error(`slice ${child.start}:${child.end} exited ${codes[index]}`);
        for (const line of readFileSync(child.file, "utf8").split("\n")) {
          if (line.trim() !== "") rows.push(JSON.parse(line) as BatonPassRow);
        }
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    report(rows, outPath);
  });
}

main();
