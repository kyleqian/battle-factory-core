import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json";
import fixture from "../../tools/compare/fixtures/stockpile-evidence.json";
import { verifyStockpileEvidence } from "../../tools/compare/stockpileEvidence.ts";

const root = resolve(import.meta.dirname, "../..");

describe("MOVE_STOCKPILE bounded bilateral evidence checkpoint", () => {
  it("retains complete twice-fresh source/state and chronological raw RGB receipts", () => {
    expect(verifyStockpileEvidence()).toEqual({
      "player-back": {
        rows: 99,
        dense: "f55004eb823b2dedbd97c0da1b17f0fc821af356165b87e825364daf3c8da559",
        rawRgb: "b743b02daa7d6f78cff6092371e18e476db2812effa5239765ecc4e7eee786b1",
        changeMap: "af6485b75f687c878cbcdfa9cb42566ea56aecb45abaec4b825bdc872f1ad4d0",
      },
      "opponent-front": {
        rows: 99,
        dense: "b9365d176d9b4257bcadcd8803854c1a00725e78ca55c28e779611813c19a736",
        rawRgb: "8b89999c50091577ee524df03b2ab3a4c706544e73277fdc391dcd839feee589",
        changeMap: "371e7de847fa4547af4d91197d56ea6f4862955158dc4fdb557aa509a5e1a71a",
      },
    });
  });

  it("records no move/component acceptance and preserves named sibling controls", () => {
    const status = (move: string): string => coverage.entries.find((entry) => entry.move === move)?.status ?? "unsupported";
    expect(fixture.status).toBe("unsupported");
    expect(fixture.coverageCredit).toBe(false);
    expect(fixture.evidenceScope.productionAnimationChanged).toBe(false);
    expect(fixture.acceptance.productionFramebufferRows).toBe(0);
    expect(coverage.componentTracks.find((track) => track.id === "stockpile-gray-orb-absorption")).toMatchObject({
      representatives: ["MOVE_STOCKPILE"], fulfilled: false,
    });
    expect(status("MOVE_STOCKPILE")).toBe("unsupported");
    expect(status("MOVE_SWALLOW")).toBe("exact");
    expect(status("MOVE_SPIT_UP")).toBe("unsupported");
    expect([status("MOVE_SAFEGUARD"), status("MOVE_CONFUSE_RAY"), status("MOVE_SOFT_BOILED")]).toEqual(["exact", "exact", "exact"]);
    expect(readFileSync(resolve(root, "src/animation/assets/stockpile-gray-orb.json"))).toHaveLength(915);
  });
});
