import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createScratchDir } from "../../tools/lib/scratch.ts";

const root = resolve(new URL("../..", import.meta.url).pathname);
const receipt = JSON.parse(readFileSync(
  resolve(root, "tools/compare/fixtures/screech-evidence.json"),
  "utf8",
));

describe("MOVE_SCREECH bilateral Scene-ON evidence", () => {
  it("stages complete legal three-mon parties in both attacker orientations", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const scenario = JSON.parse(readFileSync(
        resolve(root, receipt.orientations[orientation].scenario),
        "utf8",
      ));
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
      });
      const parties = scenario.overrides.parties;
      expect(parties.player).toHaveLength(3);
      expect(parties.opponent).toHaveLength(3);
      const carrier = [...parties.player, ...parties.opponent].find(
        (mon: { species: number }) => mon.species === 100,
      );
      expect(carrier).toMatchObject({
        level: 50,
        moves: [103, 103, 103, 103],
        ppUps: [0, 0, 0, 0],
        abilitySlot: 0,
        gender: "genderless",
      });
      for (const mon of [...parties.player, ...parties.opponent]) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("pins the complete twice-fresh pointer-owned dense/raw windows", () => {
    expect(receipt).toMatchObject({
      schema: "screech-bilateral-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "MOVE_SCREECH",
      status: "exact",
      coverageCredit: true,
      repeatability: { runsPerOrientation: 2, allMatched: true },
      measured: {
        pointerRows: "63/63 each",
        firstInactiveAge: 62,
        oamPredecessor: "62/62 each",
        matrixPredecessor: "62/62 each",
        palettePredecessor: "62/62 each",
        gameplayRngTransitions: 0,
        animationRngTransitions: 62,
      },
    });
    expect(receipt.orientations["player-back"].window).toEqual({
      startFrame: 72, endFrame: 134, frameCount: 63,
    });
    expect(receipt.orientations["opponent-front"].window).toEqual({
      startFrame: 76, endFrame: 138, frameCount: 63,
    });
    expect(receipt.controls).toEqual({
      independent: ["MOVE_SUPERSONIC", "MOVE_METAL_SOUND"],
      statusesChanged: false,
    });
  });

  it("re-extracts the source purple-ring art and palette byte-for-byte", () => {
    const scratch = createScratchDir("pokebench-screech-assets-");
    const output = join(scratch, "screech.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractScreechAssets.ts",
      "--out",
      output,
    ], { cwd: root });
    expect(readFileSync(output)).toEqual(readFileSync(
      resolve(root, "src/animation/assets/screech.json"),
    ));
  });
});
