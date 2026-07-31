import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import battleFrontierMonsData from "../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import cryDurationsData from "../src/data/gen/cry-durations.json" with { type: "json" };

type CryDurationRow = { id: number; name: string; durationTicks: number };

const durations = cryDurationsData.species as CryDurationRow[];
const byName = new Map(durations.map((row) => [row.name, row]));

describe("cry-durations.json (per-species send-out cry duration in GBA VBlank ticks)", () => {
  it("reproduces the committed artifact byte-for-byte", () => {
    const before = readFileSync("src/data/gen/cry-durations.json", "utf8");
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-cry-durations-"));
    execFileSync("node", ["--experimental-strip-types", "tools/extract/extract-cry-durations.ts", "--out-dir", outputDirectory], {
      stdio: "pipe",
    });
    expect(readFileSync(join(outputDirectory, "cry-durations.json"), "utf8")).toBe(before);
  });

  it("covers exactly the Frontier rental catalog's distinct species, each with a positive duration", () => {
    const rentalSpecies = new Set(
      (battleFrontierMonsData.entries as Array<{ species: string }>).map((entry) => entry.species),
    );
    expect(durations).toHaveLength(rentalSpecies.size);
    for (const row of durations) {
      expect(rentalSpecies.has(row.name)).toBe(true);
      expect(row.durationTicks).toBeGreaterThan(0);
      expect(row.name).toMatch(/^SPECIES_[A-Z0-9_]+$/);
    }
    for (const name of rentalSpecies) {
      expect(byName.get(name), `missing cry duration for ${name}`).toBeDefined();
    }
  });

  it("is sorted by numeric species id", () => {
    const ids = durations.map((row) => row.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it("pins the four oracle-triangulated species (docs/trainer-pic-off-window-scout.md §D)", () => {
    // GROVYLE is the already-validated baseline fixture
    // (battle-command-generated-off / interactive-generated-intro-off).
    // durationTicks is the ceiling of the raw WAV-derived tick count (a
    // per-VBlank "still playing" poll counts any partial remaining tick as
    // playing, docs/intro-cry-shadow-evidence.md Part 1) - one tick higher
    // than nearest-rounding for species whose raw fraction is <= 0.5.
    expect(byName.get("SPECIES_GROVYLE")).toMatchObject({ id: 278, durationTicks: 58 });
    // COMBUSKEN and MAGNETON: dense oracle captures pin the observed
    // handoff-to-"Go!" delta at +125 and +111 respectively; both match
    // `101 + (durationTicks - 58)` exactly (124 -> 125, 110 -> 111, and
    // independently: 58+24=82, 58+10=68) - the difference formula is
    // invariant to the round-vs-ceil choice as long as both terms use the
    // same representation.
    expect(byName.get("SPECIES_COMBUSKEN")).toMatchObject({ id: 281, durationTicks: 82 });
    expect(byName.get("SPECIES_MAGNETON")).toMatchObject({ id: 82, durationTicks: 68 });
    // KABUTO: not independently oracle-validated this round (only the WAV-
    // duration prediction, +79 vs GROVYLE's +101 baseline); pinned here as a
    // regression guard on the extractor's own output, not a ground-truth claim.
    expect(byName.get("SPECIES_KABUTO")).toMatchObject({ id: 140, durationTicks: 35 });
  });
});
