import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-memento-player-weezing-opponent-onix.json",
  "tools/battle-lab/mechanic-memento-opponent-weezing-player-onix.json",
];

describe("MOVE_MEMENTO source/staging checkpoint", () => {
  it("pins its exclusive interval, complete graph, sole carrier, and distinct Dig sibling", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/mementoSourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result.sourceBounds).toEqual({ start: "0x082cdcf2", endExclusive: "0x082cdd36", bytes: "0x44" });
    expect(result.carrier).toContain("set 501 FRONTIER_MON_WEEZING_2");
    expect(result.components).toHaveLength(8);
    expect(result.siblingAudit).toMatchObject({ move: "MOVE_DIG", components: 17, promoted: false });
    expect(result.siblingAudit.shared).toEqual(["visualCommand:clearmonbg_static", "visualCommand:monbg_static"]);
  });

  it("keeps complete legal bilateral Weezing/Onix Scene-ON parties", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage.profile).toBe("battle-scene-on");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      const all = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent];
      expect(all.find((mon: { species: number }) => mon.species === 110)).toMatchObject({ nature: 3, moves: [262, 262, 262, 262], item: 142 });
      expect(all.find((mon: { species: number }) => mon.species === 95)).toBeTruthy();
      for (const mon of all) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("records an honest unsupported checkpoint with no inherited Dig acceptance", () => {
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/memento-source-staging-checkpoint.json", "utf8"));
    expect(receipt).toMatchObject({ oracleProfile: "battle-scene-on", move: "MOVE_MEMENTO", status: "unsupported", components: 8, denseEvidence: false, productionFramebuffer: false });
    expect(receipt.siblingAudit).toEqual({ move: "MOVE_DIG", components: 17, shared: ["visualCommand:clearmonbg_static", "visualCommand:monbg_static"], promoted: false });
  });
});
