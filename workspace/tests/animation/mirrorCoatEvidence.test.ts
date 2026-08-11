import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mirrorCoatScenario } from "../../tools/compare/mirrorCoatScenario.ts";

describe("MOVE_MIRROR_COAT exact evidence", () => {
  it("pins complete first-active through first-inactive windows", () => {
    const fixtures = [
      JSON.parse(readFileSync(
        "tools/compare/fixtures/mirror-coat-player-corsola-opponent-exeggcute.json",
        "utf8",
      )),
      JSON.parse(readFileSync(
        "tools/compare/fixtures/mirror-coat-opponent-corsola-player-exeggcute.json",
        "utf8",
      )),
    ];
    expect(fixtures.map((fixture) => ({
      orientation: fixture.orientation,
      window: fixture.sourceWindow,
      receipt: fixture.counterReceipt,
      evidence: fixture.evidenceSha256,
      raw: fixture.rawRgbSha256,
    }))).toEqual([
      {
        orientation: "player-back",
        window: {
          startFrame: 349, endFrame: 423, frameCount: 75, wallFrame: 349,
        },
        receipt: {
          specialDmg: 26, specialBattlerId: 1, resolvedDamage: 52,
        },
        evidence:
          "ebc190bd54157d237ac2784fa409db158037823d039497059c9e2d8042a47ced",
        raw:
          "c8a70485e2d13ae522c31760ee7e6ecb24bb464eb567427855448389ab1128a7",
      },
      {
        orientation: "opponent-front",
        window: {
          startFrame: 355, endFrame: 429, frameCount: 75, wallFrame: 355,
        },
        receipt: {
          specialDmg: 31, specialBattlerId: 0, resolvedDamage: 62,
        },
        evidence:
          "5decc45188f5d85341e4186755197bf4c0848eaeb57d74aa77a5db67edaa2f6a",
        raw:
          "0fcba1ad43f479f613f84243bca184e10f4545e7e6566558327c081444b73b5b",
      },
    ]);
  });

  it("pins the one reachable body and its distinct audio/wall contract", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/lightScreenSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(JSON.parse(output).sibling).toMatchObject({
      move: "MOVE_MIRROR_COAT",
      lowestCarrier: expect.stringContaining("FRONTIER_MON_CORSOLA"),
      reachableBodies: [{
        name: "successful-special-damage-counter",
        animation: "Move_MIRROR_COAT",
      }],
      failureRoute: expect.stringContaining("does not select"),
      presentationDifference: expect.stringContaining("no Light Screen sound task"),
    });
  });

  it("builds complete legal parties and stages a real special counter", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      const scenario = mirrorCoatScenario(orientation) as any;
      expect(scenario.profile).toBe("battle-scene-on");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const side of ["player", "opponent"]) {
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ppUps).toHaveLength(4);
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
        }
      }
      const corsola = orientation === "player-back"
        ? scenario.overrides.parties.player[0]
        : scenario.overrides.parties.opponent[0];
      const exeggcute = orientation === "player-back"
        ? scenario.overrides.parties.opponent[0]
        : scenario.overrides.parties.player[0];
      expect(corsola).toMatchObject({
        species: 222, nature: 8, item: 142,
        moves: [243, 243, 243, 243],
      });
      expect(exeggcute.moves).toEqual([93, 93, 93, 93]);
    }
  });

  it("regenerates Corsola and red-wall assets byte-for-byte", () => {
    const scratch = mkdtempSync(
      join(tmpdir(), "pokebench-mirror-coat-assets-"),
    );
    const output = join(scratch, "mirror-coat.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/extractMirrorCoatAssets.ts",
      "--out",
      output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/mirror-coat.json"),
    );
  });

  it("keeps twice-fresh semantic and framebuffer acceptance portable", () => {
    const audit = readFileSync(
      "tools/compare/mirrorCoatEvidence.ts",
      "utf8",
    );
    expect(audit).toContain("counterReceipt");
    expect(audit).toContain("framebufferMatches");
    expect(audit).toContain(
      "for (let runNumber = 1; runNumber <= 2; runNumber += 1)",
    );
  });
});
