import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coverage from "../../ANIMATION_COVERAGE.json";
import fixture from "../../tools/compare/fixtures/stockpile-evidence.json";
import { verifyStockpileEvidence } from "../../tools/compare/stockpileEvidence.ts";

const root = resolve(import.meta.dirname, "../..");

function pinnedBattleLabOracleDirectory(): string {
  let candidate = root;
  while (true) {
    const oracle = resolve(candidate, "oracle");
    if (existsSync(resolve(oracle, "battle_lab.py"))) return oracle;
    const parent = dirname(candidate);
    if (parent === candidate) throw new Error("could not locate pinned battle_lab.py");
    candidate = parent;
  }
}

function validateStage(scenario: string, withForbiddenDescription = false) {
  return spawnSync("python3", ["-c", [
    "import json, sys",
    "sys.path.insert(0, sys.argv[1])",
    "from battle_lab import validate_request",
    "request = json.load(open(sys.argv[2], encoding='utf-8'))",
    "if sys.argv[3] == 'description': request['description'] = 'forbidden regression'",
    "validate_request(request, 'battle-scene-on')",
  ].join("\n"), pinnedBattleLabOracleDirectory(), resolve(root, scenario), withForbiddenDescription ? "description" : ""], {
    cwd: root,
    encoding: "utf8",
  });
}

describe("MOVE_STOCKPILE bounded bilateral evidence checkpoint", () => {
  it("validates both checked-in stages against the pinned local Battle Lab contract", () => {
    const scenarios = [
      "tools/battle-lab/mechanic-stockpile-player-pelipper-opponent-delcatty.json",
      "tools/battle-lab/mechanic-stockpile-opponent-pelipper-player-delcatty.json",
    ];
    for (const scenario of scenarios) {
      const result = validateStage(scenario);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
    }
    const forbidden = validateStage(scenarios[0]!, true);
    expect(forbidden.status).not.toBe(0);
    expect(`${forbidden.stdout ?? ""}${forbidden.stderr ?? ""}`).toContain("unknown fields: description");
  });

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

  it("records Stockpile-only production acceptance and preserves named sibling controls", () => {
    const status = (move: string): string => coverage.entries.find((entry) => entry.move === move)?.status ?? "unsupported";
    expect(fixture.status).toBe("exact");
    expect(fixture.coverageCredit).toBe(true);
    expect(fixture.evidenceScope).toMatchObject({
      productionAnimationChanged: true,
      reducerAdded: true,
      typedSeamAdded: true,
      compositorAdded: true,
      framebufferCompared: true,
      framebufferLookupAdded: false,
      coveragePromotion: true,
      gameplayStateOwned: false,
    });
    expect(fixture.acceptance.productionFramebufferRows).toEqual({
      "player-back": 99, "opponent-front": 99,
    });
    expect(fixture.acceptance.productionFramebufferResidualPixels).toBe(0);
    expect(coverage.componentTracks.find((track) => track.id === "stockpile-gray-orb-absorption")).toMatchObject({
      representatives: ["MOVE_STOCKPILE"], fulfilled: true,
    });
    expect(status("MOVE_STOCKPILE")).toBe("exact");
    expect(status("MOVE_SWALLOW")).toBe("exact");
    expect(status("MOVE_SPIT_UP")).toBe("unsupported");
    expect([status("MOVE_SAFEGUARD"), status("MOVE_CONFUSE_RAY"), status("MOVE_SOFT_BOILED")]).toEqual(["exact", "exact", "exact"]);
    expect(readFileSync(resolve(root, "src/animation/assets/stockpile-gray-orb.json"))).toHaveLength(915);
  });
});
