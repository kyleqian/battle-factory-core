import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Two ratchets that enforce ROADMAP S10's "Executable-frontier reset" rules as
// tests rather than prose, because prose rules are the ones that quietly decay.
//
//   1. Overfit containment (ROADMAP S10 §4, ISSUES #41): production engine
//      modules must not gain new imports of canonical RAM recordings. The
//      allowlist below may only ever *shrink*.
//   2. Barrier inventory (ROADMAP S10 §1): the (a)/(b) registration policy
//      lets an opcode register with unimplemented branches guarded by an
//      explicit `unsupported-branch` halt. That policy is only safe while
//      barriers stay narrow and few — an opcode that is 90% barrier is
//      "registered" on paper and inert in practice. Pinning the counts forces
//      every new barrier into a diff a reviewer sees.

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTsFiles(path, out);
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const PRODUCTION_TS_FILES = collectTsFiles("src");

/** A canonical recording: a captured trace of one specific oracle playthrough. */
const RECORDING_IMPORT = /^\s*import\s[^;]*?\sfrom\s+"([^"]*(?:-dump|-probe|-watch|-boundaries)[^"]*\.json)"/gm;

/**
 * Every production import of a canonical recording that exists today.
 *
 * This list may shrink, never grow. Each entry is real debt tracked in
 * ISSUES.md #41 (`battleScene.ts`) and #39 (its turn-keyed structure); the
 * 2026-07-24 supervisor session already retired three entries by porting
 * `featherDance.ts` off its recorded per-tick table onto the real animation
 * script. New engine work must derive behaviour from ported source, not from
 * a replayed capture of the one battle we happen to have on disk.
 */
const ALLOWED_RECORDING_IMPORTS: ReadonlySet<string> = new Set([
  "src/engine/factorySwapPresentation.ts::../data/gen/battle1-swap-rentalmons-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-turn1-ram-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-turn2-ram-dump.json",
  "src/engine/battleScene.ts::../data/gen/battle1-grovyle-faint-ram-dump.json",
]);

/**
 * `unsupportedBranch(...)` call sites per production module, excluding each
 * module's own helper definition.
 *
 * Raising a number here is a real decision, not a formality: it means another
 * slice of a registered opcode is unreachable. If a diff raises one of these,
 * the brief should say which source construct it defers and why that construct
 * is not on the path the step claims to make executable.
 */
const PINNED_BARRIER_COUNTS: ReadonlyMap<string, number> = new Map([
  ["src/engine/battleScriptHitChainOpcode.ts", 18],
  ["src/engine/battleScriptAttackCancelerOpcode.ts", 5],
]);

function recordingImportsIn(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found: string[] = [];
  for (const match of source.matchAll(RECORDING_IMPORT)) {
    found.push(`${file}::${match[1]}`);
  }
  return found;
}

function barrierCallSitesIn(file: string): number {
  const source = readFileSync(file, "utf8");
  return source
    .split("\n")
    .filter((line) => line.includes("unsupportedBranch(") && !/^\s*(?:function|const)\s+unsupportedBranch\b/.test(line))
    .length;
}

describe("overfit containment ratchet (ROADMAP S10 §4, ISSUES #41)", () => {
  it("adds no production import of a canonical RAM recording", () => {
    const found = PRODUCTION_TS_FILES.flatMap(recordingImportsIn).sort();
    const added = found.filter((entry) => !ALLOWED_RECORDING_IMPORTS.has(entry));
    expect(
      added,
      "A production module imported a canonical recording. Engine behaviour must "
        + "be derived from ported source, not replayed from a capture of one battle. "
        + "See ROADMAP S10's Executable-frontier reset §4 and ISSUES #41.",
    ).toEqual([]);
  });

  it("keeps the allowlist honest — a retired import must be deleted from it", () => {
    const found = new Set(PRODUCTION_TS_FILES.flatMap(recordingImportsIn));
    const stale = [...ALLOWED_RECORDING_IMPORTS].filter((entry) => !found.has(entry)).sort();
    expect(
      stale,
      "These allowlist entries no longer exist in the tree — delete them so the "
        + "ratchet records the win and cannot silently re-admit them.",
    ).toEqual([]);
  });

  it("pins the debt at four imports across two modules", () => {
    const byFile = new Map<string, number>();
    for (const entry of ALLOWED_RECORDING_IMPORTS) {
      const file = entry.split("::")[0]!;
      byFile.set(file, (byFile.get(file) ?? 0) + 1);
    }
    expect([...byFile.entries()].sort()).toEqual([
      ["src/engine/battleScene.ts", 3],
      ["src/engine/factorySwapPresentation.ts", 1],
    ]);
  });
});

describe("barrier inventory ratchet (ROADMAP S10 §1)", () => {
  it("pins the number of unsupported-branch barriers per registered-opcode module", () => {
    const actual = new Map(
      [...PINNED_BARRIER_COUNTS.keys()].map((file) => [file, barrierCallSitesIn(file)] as const),
    );
    expect(
      [...actual.entries()].sort(),
      "Barrier count changed. The (a)/(b) registration policy stays safe only "
        + "while barriers are narrow and rare — update this pin deliberately and "
        + "say in the brief which source construct the new barrier defers.",
    ).toEqual([...PINNED_BARRIER_COUNTS.entries()].sort());
  });

  it("finds no barriers outside the modules that pin them", () => {
    const unpinned = PRODUCTION_TS_FILES
      .filter((file) => !PINNED_BARRIER_COUNTS.has(file))
      .filter((file) => barrierCallSitesIn(file) > 0)
      .sort();
    expect(
      unpinned,
      "A new module grew unsupported-branch barriers without an entry in "
        + "PINNED_BARRIER_COUNTS. Add it, with a reachability test per barrier.",
    ).toEqual([]);
  });

  it("requires every barrier-bearing module to have a test asserting the halt kind", () => {
    const missing = [...PINNED_BARRIER_COUNTS.keys()].filter((file) => {
      const testFile = file.replace(/^src\/engine\//, "tests/").replace(/\.ts$/, ".test.ts");
      let source: string;
      try {
        source = readFileSync(testFile, "utf8");
      } catch {
        return true;
      }
      return !source.includes("unsupported-branch");
    });
    expect(
      missing,
      "ROADMAP S10 §1 requires each (b) guard to be proven reachable by a Tier-1 "
        + "test. This module's test file does not assert the unsupported-branch halt.",
    ).toEqual([]);
  });
});
