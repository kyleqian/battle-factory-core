import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-leer-player-dragonair-opponent-onix.json",
  "tools/battle-lab/mechanic-leer-opponent-dragonair-player-onix.json",
];

describe("MOVE_LEER source/evidence checkpoint", () => {
  it("pins its exclusive interval, complete graph, and sole carrier", () => {
    const output = execFileSync(
      "node",
      ["--experimental-strip-types", "tools/compare/leerSourceAudit.ts"],
      { encoding: "utf8" },
    );
    expect(output).toContain("0x082d2d90..0x082d2de7 (0x57 bytes)");
    expect(output).toContain(
      "nine-component LEER/ScaleMonAndRestore/ShakeMon2/monbg/splitbgprio/8:8 alpha graph plus SE_M_LEER",
    );
    expect(output).toContain(
      "sole legal Level-50 carrier set 201 FRONTIER_MON_DRAGONAIR_1",
    );
  });

  it("keeps complete legal bilateral Scene-ON parties and natural input staged", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage.profile).toBe("battle-scene-on");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      expect(stage.trace.segments).toEqual([
        { frames: 2, buttons: ["A"] },
        { frames: 30, buttons: [] },
        { frames: 2, buttons: ["A"] },
        { frames: 700, buttons: [] },
      ]);
      const dragonair = [
        ...stage.overrides.parties.player,
        ...stage.overrides.parties.opponent,
      ].find((mon: { species: number }) => mon.species === 148);
      expect(dragonair).toMatchObject({
        level: 50,
        nature: 0,
        moves: [43, 43, 43, 43],
        item: 133,
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

  it("pins twice-fresh complete dense windows and exact promotion", () => {
    const receipt = JSON.parse(
      readFileSync(
        "tools/compare/fixtures/leer-evidence-checkpoint.json",
        "utf8",
      ),
    );
    expect(receipt).toMatchObject({
      schema: "leer-evidence-checkpoint/v1",
      oracleProfile: "battle-scene-on",
      move: "LEER",
      status: "exact",
      sourceSymbols: { Move_LEER: 0x082d2d90, Move_DREAM_EATER: 0x082d2de7 },
      promotion: {
        status: "exact",
        coverage: "MOVE_LEER 171->172 exact; unsupported 105->104",
      },
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
      ["player-back", 212, 281, 70],
      ["opponent-front", 75, 144, 70],
    ]);
    for (const entry of receipt.orientations) {
      expect(entry.freshRuns).toBe(2);
      expect(entry.byteStable).toBe(true);
      expect(entry.productionFramebuffer).toBe("70/70");
      const map = readFileSync(entry.changeMap, "utf8");
      expect(createHash("sha256").update(map).digest("hex")).toBe(entry.changeMapSha256);
      expect(map).toContain("source-relative ages");
    }
    expect(readFileSync("tools/compare/agilityProbe.py", "utf8")).toContain(
      'schema="swords-dance-dense-evidence/v1" if IS_SWORDS_DANCE else "leer-dense-evidence/v1"',
    );
  });
});
