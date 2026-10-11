import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import inventory from "../../src/data/gen/factory-animation-inventory.json" with { type: "json" };
import frontierMons from "../../src/data/gen/battle-frontier-mons.json" with { type: "json" };
import { LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS } from "../../src/engine/liveMovePresentationRng.ts";
import { LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS } from "../../src/engine/liveMoveTimingPolicy.ts";
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

describe("live inventory claim buckets", () => {
  it("counts faithful-random adapters apart from scoped-exact live adapters and Factory acceptance", () => {
    const status = JSON.parse(readFileSync(join(import.meta.dirname, "../../docs/animation-integration-live-status.json"), "utf8"));
    // implementedCount keeps meaning the scoped-exact live adapters; faithful random is a disjoint bucket.
    expect(status.implementedCount).toBe(238); // d4later: Sky Attack -> faithful timing; fp100: Focus Punch -> faithful timing
    // Faithful-random adapters (liveMovePresentationRng.ts): the production list, nothing more.
    expect(status.faithfulRandomCount).toBe(LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS.length);
    expect(status.faithfulRandomAdapters).toHaveLength(status.faithfulRandomCount);
    const implemented = new Set((status.implementedAdapters as { id: number }[]).map((entry) => entry.id));
    const faithful = (status.faithfulRandomAdapters as { id: number }[]).map((entry) => entry.id);
    expect(faithful.filter((id) => implemented.has(id))).toEqual([]);
    expect(new Set(faithful).size).toBe(faithful.length);
    // Faithful timing (D4, docs/faithful-timing.md): a third disjoint bucket; a D3+D4 adapter is counted there once (d3: true).
    expect(status.faithfulTimingCount).toBe(LIVE_FAITHFUL_TIMING_MOVE_ANIMATION_IDS.length);
    expect(status.faithfulTimingAdapters).toHaveLength(status.faithfulTimingCount);
    const timing = (status.faithfulTimingAdapters as { id: number; d3: boolean }[]);
    expect(timing.filter((entry) => implemented.has(entry.id) || faithful.includes(entry.id))).toEqual([]);
    expect(timing.filter((entry) => (LIVE_FAITHFUL_RANDOM_MOVE_ANIMATION_IDS as readonly number[]).includes(entry.id))).toEqual([]);
    // dive70: Dive's provider covers both bodies (the attack body's 56 Random2 words: d3), still counted once, in faithful timing
    const dive = timing.find((entry) => entry.id === 291) as { d3: boolean; evidence: string[] } | undefined;
    expect(dive?.d3).toBe(true);
    expect(dive?.evidence[0]).toMatch(/^scope: BOTH bodies \(dive70/);
    expect(dive?.evidence.some((line) => line.startsWith("tools/integration/fixtures/dive70-live-receipt.json"))).toBe(true);
    // fix74: Bulk Up's scope names every Factory Bulk Up user (battle-frontier-mons.json) as proven, with the fix74 receipt.
    const bulkUp = (status.implementedAdapters as { id: number; sourceFieldEvidence: string[]; liveEvidence: string[] }[])
      .find((entry) => entry.id === 339)!;
    const bulkUpUsers = [...new Set((frontierMons.entries as { species: string; moves: string[] }[])
      .filter((mon) => mon.moves.includes("MOVE_BULK_UP")).map((mon) => mon.species.replace(/^SPECIES_/, "")))].sort();
    expect(bulkUpUsers).toEqual(["HERACROSS", "MACHAMP", "PRIMEAPE", "SLAKING", "URSARING"]);
    expect(bulkUp.liveEvidence[0]).toMatch(/^scope: every Factory Bulk Up user \(fix74\): /);
    for (const species of bulkUpUsers) expect(bulkUp.liveEvidence[0]).toContain(species);
    expect(bulkUp.sourceFieldEvidence).toContain("../tools/integration/fixtures/fix74-live-receipt.json");
    // every accepted move is in exactly one of exact / faithful random / faithful timing / remaining (276)
    const census = JSON.parse(readFileSync(join(import.meta.dirname, "../../tools/integration/fixtures/remaining-adapters-census.json"), "utf8")).summary;
    expect(status.implementedCount + status.faithfulRandomCount + status.faithfulTimingCount + census.remaining).toBe(276);
    expect(census.faithfulTiming).toBe(status.faithfulTimingCount);
    // Faithful random / timing add no exact coverage or Factory acceptance.
    expect(status.currentAcceptedFactoryMoves).toBe(276);
    expect(animationCoverageSummary().find((row) => row.tier === "level50")?.exact).toBe(275);
  });
});

describe("animation coverage ledger", () => {
  it("is internally valid and reports exact Factory coverage honestly", () => {
    expect(validateAnimationCoverage).not.toThrow();
    expect(animationCoverageSummary()).toEqual([
      {
        tier: "level50",
        total: 276,
        unsupported: 1,
        staged: 0,
        partial: 0,
        exact: 275,
      },
      {
        tier: "openOnly",
        total: 1,
        unsupported: 0,
        staged: 0,
        partial: 0,
        exact: 1,
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

  it("does not queue the exact Open-only Outrage", () => {
    const queue = queuedAnimationMoves();
    expect(queue.map(({ move }) => move)).toEqual([]);
    expect(openLevelVariantAudit()).toEqual({
      monSets: 32,
      species: 8,
      auditedSpecies: 0,
      overlappingMoves: 37,
    });
  });

  it("uses the source dependency graph for non-exclusive work grouping", () => {
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "green-spike-needle-arm",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_NEEDLE_ARM",
        "MOVE_SECRET_POWER",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "focus-energy-endure-effect",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_FOCUS_ENERGY",
        "MOVE_ENDURE",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "bubble-beam-water-bubbles",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_BUBBLE_BEAM",
        "MOVE_SECRET_POWER",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "anger-mark-grow-breath",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_SWAGGER",
        "MOVE_FRUSTRATION",
        "MOVE_TORMENT",
        "MOVE_TAUNT",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "elemental-punch",
      ),
    ).toMatchObject({
      representatives: ["MOVE_FIRE_PUNCH", "MOVE_ICE_PUNCH", "MOVE_THUNDER_PUNCH"],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "horizontal-shake-complex-bg-palette",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_EARTHQUAKE",
        "MOVE_FISSURE",
        "MOVE_SKY_ATTACK",
        "MOVE_MAGNITUDE",
        "MOVE_ERUPTION",
        "MOVE_LUSTER_PURGE",
      ],
    });
    expect(
      queuedAnimationComponentTracks().find(
        (track) => track.id === "acid-poison-bubble",
      ),
    ).toMatchObject({
      representatives: [
        "MOVE_ACID",
        "MOVE_TOXIC",
        "MOVE_SLUDGE",
        "MOVE_SLUDGE_BOMB",
        "MOVE_POISON_FANG",
        "MOVE_POISON_TAIL",
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
      item.component === "task:AnimTask_ShakeMon2" &&
      item.provenBy.includes("MOVE_CURSE") &&
      item.remainingMoves.includes("MOVE_HELPING_HAND")
    )).toBe(true);
    expect(leverage.unproven).toHaveLength(0);
  });
});
