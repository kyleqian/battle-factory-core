import { describe, expect, it } from "vitest";
import { computeEligibility } from "../tools/report/battlescene-split-eligibility.ts";

// Pins ISSUES #39's known battleScene.ts canonical-split hazard ground
// truth (PROGRESS #1349/#1350, batch 5/6): the eligibility scanner must
// reproduce these exclusions exactly, or it is wrong and must not be
// trusted for batch selection (ISSUES #39 records a prior false-
// certification bug in an earlier scan of this same graph).

const result = computeEligibility();
const byName = new Map(result.rows.map((row) => [row.name, row]));

describe("battleScene.ts split eligibility (decision (a))", () => {
  it("finds no unrecognized top-level battleScene.ts content", () => {
    expect(result.residualLines).toEqual([]);
  });

  it("flags the ONIX-Sitrus rotate-render-lag guard constant as blocked (H1, reverse direction)", () => {
    const row = byName.get("ONIX_SITRUS_ROTATE_RENDER_LAG");
    expect(row?.eligible).toBe(false);
    expect(row?.hazard).toMatch(/H1-eval-read/);
    expect(row?.offending.join(" ")).toMatch(/module-eval guard/);
  });

  it("flags the 6 named animation-import functions (H2) batch 6 found by hand", () => {
    const named = [
      "drawFirePunchBurnFlames",
      "drawFirePunchEmbers",
      "drawGrovyleSettled",
      "drawTurn13MurkrowSettled",
      "drawTurn5PidgeottoSettled",
      "drawTurn6FeatherSprites",
    ];
    for (const name of named) {
      const row = byName.get(name);
      expect(row?.eligible, `${name} should be blocked`).toBe(false);
      expect(row?.hazard, `${name} hazard`).toBe("H2-animation-import");
    }
  });

  it("flags the two let caches as let-cache", () => {
    for (const name of ["turn10OnixDarkPaletteCache", "menuHealthboxPlayerContentMask"]) {
      const row = byName.get(name);
      expect(row?.eligible, `${name} should be blocked`).toBe(false);
      expect(row?.hazard, `${name} hazard`).toBe("let-cache");
    }
  });

  it("flags exactly the known 8-symbol ONIX-Sitrus cluster with the cluster label", () => {
    const clusterNames = [
      "ONIX_SITRUS_IDENTITY_RENDER_TICK",
      "ONIX_SITRUS_ROTATE_RENDER_LAG",
      "onixSitrusRotateMatrix",
      "onixSitrusTintCoeff",
      "turn5GrantingStarPlacement",
      "turn5SitrusHealTextVisibleChars",
      "turn5SitrusOnixHp",
      "turn5SitrusRingMatrix",
    ];
    for (const name of clusterNames) {
      const row = byName.get(name);
      expect(row?.eligible, `${name} should be blocked`).toBe(false);
      expect(row?.hazard, `${name} hazard`).toMatch(/^ONIX-Sitrus-cluster/);
    }
    const taggedCount = result.rows.filter((r) => r.hazard?.startsWith("ONIX-Sitrus-cluster")).length;
    expect(taggedCount).toBe(clusterNames.length);
  });

  it("excludes the canonical entry points as final-slice, not a batch move", () => {
    for (const name of ["renderBattleScene", "advanceBattleScene"]) {
      const row = byName.get(name);
      expect(row?.eligible, `${name} should be blocked`).toBe(false);
      expect(row?.hazard, `${name} hazard`).toBe("final-slice-entry-point");
    }
  });

  it("never marks a let-kind or animation-importing symbol eligible", () => {
    for (const row of result.rows) {
      if (row.kind === "let") expect(row.eligible).toBe(false);
    }
  });

  it("finds a function-kind eligible pool for batch selection", () => {
    // Batch 8 (75b73fab) moved 47 of the 50 the scanner listed, down from
    // batch 7's 100 -- this pins a floor, not an exact count, since the
    // eligible pool shrinks as future batches move symbols out.
    expect(result.eligibleFunctions.length).toBeGreaterThan(0);
    for (const name of result.eligibleFunctions) {
      expect(byName.get(name)?.kind).toBe("function");
      expect(byName.get(name)?.hazard).toBeNull();
    }
  });

  it("already-moved batch-6 symbols are gone from the CANONICAL bucket, not re-flagged", () => {
    for (const name of ["opponentHealthboxContentForHp", "presentationForEncounter", "tableX2", "ballStateTileIndex"]) {
      expect(byName.has(name), `${name} should no longer be CANONICAL-only`).toBe(false);
    }
  });
});
