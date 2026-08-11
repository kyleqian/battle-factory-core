import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-guillotine-player-gligar-opponent-onix.json",
  "tools/battle-lab/mechanic-guillotine-opponent-gligar-player-onix.json",
];

describe("MOVE_GUILLOTINE source/evidence checkpoint", () => {
  it("pins the exclusive interval, complete graph, and lowest carrier", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/guillotineSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082cb829..0x082cb8b5 (0x8c bytes)");
    expect(output).toContain("complete 14-component");
    expect(output).toContain(
      "lowest legal Level-50 carrier set 315 FRONTIER_MON_GLIGAR_2",
    );
  });

  it("keeps complete legal bilateral Scene-ON parties and natural input", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage.profile).toBe("battle-scene-on");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(stage.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
        { frames: 800, buttons: [] },
      ]);
      const gligar = [
        ...stage.overrides.parties.player,
        ...stage.overrides.parties.opponent,
      ].find((mon: { species: number }) => mon.species === 207);
      expect(gligar).toMatchObject({
        level: 50,
        nature: 3,
        moves: [12, 12, 12, 12],
        item: 183,
      });
      for (const mon of [
        ...stage.overrides.parties.player,
        ...stage.overrides.parties.opponent,
      ]) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("banks twice-fresh complete dense windows without promotion", () => {
    const receipt = JSON.parse(
      readFileSync(
        "tools/compare/fixtures/guillotine-evidence-checkpoint.json",
        "utf8",
      ),
    );
    expect(receipt).toMatchObject({
      schema: "guillotine-evidence-checkpoint/v1",
      oracleProfile: "battle-scene-on",
      move: "GUILLOTINE",
      status: "unsupported",
      sourceSymbols: { Move_GUILLOTINE: 0x082cb829, Move_PAY_DAY: 0x082cb8b5 },
    });
    expect(
      receipt.orientations.map(
        (entry: {
          orientation: string;
          startFrame: number;
          endFrame: number;
          frameCount: number;
        }) => [
          entry.orientation,
          entry.startFrame,
          entry.endFrame,
          entry.frameCount,
        ],
      ),
    ).toEqual([
      ["player-back", 74, 238, 165],
      ["opponent-front", 78, 241, 164],
    ]);
    expect(readFileSync("tools/compare/agilityProbe.py", "utf8")).toContain(
      '"guillotine-dense-evidence/v1" if IS_GUILLOTINE',
    );
  });
});
