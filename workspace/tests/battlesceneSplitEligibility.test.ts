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
      "onixSitrusIdentityRenderTick()",
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

  it("flags a function that assigns to a stay-behind let as H3-let-write (batch 8's wasted move+revert)", () => {
    // turn10OnixDarkPalette writes its cache via `??=` (compound assignment);
    // getMenuHealthboxPlayerContentMask writes its cache via plain `=`. Both
    // reassign a module-level `let` that stays behind -- moving either turns
    // the assignment into a write to an imported binding (illegal ESM).
    for (const name of ["turn10OnixDarkPalette", "getMenuHealthboxPlayerContentMask"]) {
      const row = byName.get(name);
      expect(row?.eligible, `${name} should be blocked`).toBe(false);
      expect(row?.hazard, `${name} hazard`).toBe("H3-let-write");
    }
  });

  it("playerHealthboxHpOverlayForHp is gone from the CANONICAL bucket (batch 9 moved it)", () => {
    // It only called `.get()`/`.set()` on its cache -- legal ESM even
    // against an imported binding, unlike the H3-let-write functions
    // above. Batch 8 over-excluded it by pattern-matching; batch 9 moved
    // it after confirming it was the whole remaining function-kind pool.
    expect(byName.has("playerHealthboxHpOverlayForHp")).toBe(false);
  });

  it("never marks a let-kind or animation-importing symbol eligible", () => {
    for (const row of result.rows) {
      if (row.kind === "let") expect(row.eligible).toBe(false);
    }
  });

  it("the function-kind eligible pool is empty (batch 9 moved the last one)", () => {
    // Batch 8 (a2a57e91) moved 47 of the 50 the scanner listed, down from
    // batch 7's 100, leaving 1 (playerHealthboxHpOverlayForHp). Batch 9
    // moved that one too, so the pool is now genuinely empty -- every
    // remaining CANONICAL function-kind symbol is hazard-blocked. If a
    // future scanner/topology change makes one eligible again, update
    // this pin rather than loosening it back to a floor.
    expect(result.eligibleFunctions.length).toBe(0);
  });

  it("already-moved batch-6 symbols are gone from the CANONICAL bucket, not re-flagged", () => {
    for (const name of ["opponentHealthboxContentForHp", "presentationForEncounter", "tableX2", "ballStateTileIndex"]) {
      expect(byName.has(name), `${name} should no longer be CANONICAL-only`).toBe(false);
    }
  });
});
