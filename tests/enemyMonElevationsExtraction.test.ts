import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import elevationsData from "../src/data/gen/enemy-mon-elevations.json" with { type: "json" };
import battleEnemyShadowData from "../src/assets/gen/battle-enemy-shadow.json" with { type: "json" };

const elevations = elevationsData as Record<string, number>;

describe("enemy-mon-elevations.json (gEnemyMonElevation, ISSUES #56 item 3)", () => {
  it("reproduces the committed artifact byte-for-byte", () => {
    const path = "src/data/gen/enemy-mon-elevations.json";
    const before = readFileSync(path, "utf8");
    const outputDirectory = mkdtempSync(join(tmpdir(), "pokeemerald-factory-enemy-mon-elevations-"));
    execFileSync(
      "node",
      ["--experimental-strip-types", "tools/extract/extract-enemy-mon-elevations.ts", "--out-dir", outputDirectory],
      { stdio: "pipe" },
    );
    expect(readFileSync(join(outputDirectory, "enemy-mon-elevations.json"), "utf8")).toBe(before);
  });

  it("holds every entry positive and species symbols well-formed, absent species implicitly 0", () => {
    const names = Object.keys(elevations);
    expect(names.length).toBeGreaterThan(50);
    for (const name of names) {
      expect(name).toMatch(/^[A-Z0-9_]+$/);
      expect(elevations[name]).toBeGreaterThan(0);
    }
    expect(elevations.COMBUSKEN).toBeUndefined();
    expect(elevations.DUNSPARCE).toBeUndefined();
  });

  it("matches battle-enemy-shadow.json's elevatedSpecies exactly (same source table)", () => {
    const shadowSpecies = new Set(
      (battleEnemyShadowData.elevatedSpecies as string[]).map((symbol) => symbol.replace(/^SPECIES_/, "")),
    );
    expect(new Set(Object.keys(elevations))).toEqual(shadowSpecies);
  });

  it("pins the four species from docs/opponent-release-tint-third-species.md", () => {
    expect(elevations.MAGNETON).toBe(8);
    expect(elevations.GOLBAT).toBe(8);
    expect(elevations.COMBUSKEN).toBeUndefined();
    expect(elevations.DUNSPARCE).toBeUndefined();
  });
});
