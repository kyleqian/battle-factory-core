import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import inventory from "../../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import {
  animationComponentLeverage,
  animationCoverageSummary,
  openLevelVariantAudit,
  queuedAnimationComponentTracks,
  queuedAnimationMoves,
  relatedAnimationMoves,
  validateAnimationCoverage,
} from "../../tools/animation/coverage.ts";

describe("Factory animation inventory", () => {
  it("partitions every real Emerald move into stable priority tiers", () => {
    expect(inventory.schema).toBe("factory-animation-inventory/v1");
    expect(inventory.tiers.level50).toMatchObject({
      monIndices: { first: 110, last: 849, count: 740 },
      moveCount: 276,
    });
    expect(inventory.tiers.openOnly.moveCount).toBe(1);
    expect(inventory.tiers.openOnly.moves.map((move) => move.move)).toEqual(["MOVE_OUTRAGE"]);
    expect(inventory.tiers.outsideFactory.moveCount).toBe(77);
    expect(inventory.variantAudits.openLevelExclusiveMons).toMatchObject({
      monIndices: { first: 850, last: 881, count: 32 },
      speciesCount: 8,
      moveCount: 37,
    });

    const labels = Object.values(inventory.tiers).flatMap((tier) =>
      tier.moves.map((move) => move.move)
    );
    expect(new Set(labels).size).toBe(354);
  });

  it("pins both player/opponent reachability and animation script labels", () => {
    expect(inventory.roles.level50).toEqual(["player", "opponent"]);
    expect(inventory.roles.openOnly).toEqual(["player", "opponent"]);
    const fly = inventory.tiers.level50.moves.find((move) => move.move === "MOVE_FLY");
    expect(fly).toMatchObject({ id: 19, animationScript: "Move_FLY" });
  });

  it("reproduces the committed inventory byte-for-byte", () => {
    const directory = mkdtempSync(join(tmpdir(), "factory-animation-inventory-"));
    const output = join(directory, "inventory.json");
    try {
      execFileSync(
        process.execPath,
        ["--experimental-strip-types", "tools/extract/extract-factory-animation-inventory.ts", "--out", output],
        { stdio: "pipe" },
      );
      expect(readFileSync(output)).toEqual(
        readFileSync("src/data/gen/factory-animation-inventory.json"),
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("animation coverage ledger", () => {
  it("is internally valid and reports exact Level 50 coverage honestly", () => {
    expect(validateAnimationCoverage).not.toThrow();
    expect(animationCoverageSummary()).toEqual([
      {
        tier: "level50",
        total: 276,
        // Knock Off is exact in both required orientations at 59/59.
        unsupported: 249,
        staged: 0,
        partial: 3,
        exact: 24,
      },
      {
        tier: "openOnly",
        total: 1,
        unsupported: 1,
        staged: 0,
        partial: 0,
        exact: 0,
      },
      {
        tier: "outsideFactory",
        total: 77,
        unsupported: 77,
        staged: 0,
        partial: 0,
        exact: 0,
      },
    ]);
  });

  it("keeps the explicit queue inside Level 50 coverage", () => {
    const queue = queuedAnimationMoves();
    expect(queue).toHaveLength(2);
    expect(queue[0]).toMatchObject({
      move: "MOVE_DRAGON_BREATH",
      status: "exact",
    });
    expect(queue.at(-1)).toMatchObject({ move: "MOVE_BIND", status: "exact" });
    expect(openLevelVariantAudit()).toEqual({
      monSets: 32,
      species: 8,
      auditedSpecies: 0,
      overlappingMoves: 37,
    });
  });

  it("uses the source dependency graph for non-exclusive work grouping", () => {
    expect(queuedAnimationComponentTracks()[0]).toMatchObject({
      id: "elemental-punch",
      representatives: [
        "MOVE_FIRE_PUNCH",
        "MOVE_ICE_PUNCH",
        "MOVE_THUNDER_PUNCH",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "knock-off-lunge-shake",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_KNOCK_OFF",
        "MOVE_SUPER_FANG",
        "MOVE_SECRET_POWER",
      ],
    });
    const punchNeighbors = relatedAnimationMoves("MOVE_FIRE_PUNCH", 12).map(
      (move) => move.move,
    );
    expect(punchNeighbors).toContain("MOVE_ICE_PUNCH");
    expect(punchNeighbors).toContain("MOVE_THUNDER_PUNCH");

    const leverage = animationComponentLeverage();
    expect(leverage.proven.some((item) =>
      item.provenBy.includes("MOVE_FIRE_PUNCH") &&
      item.provenBy.includes("MOVE_ICE_PUNCH")
    )).toBe(true);
    expect(leverage.unproven.length).toBeGreaterThan(0);
  });
});
