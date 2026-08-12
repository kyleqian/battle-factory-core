import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-fissure-player-dugtrio-opponent-onix.json",
  "tools/battle-lab/mechanic-fissure-opponent-dugtrio-player-onix.json",
];

describe("MOVE_FISSURE source/staging checkpoint", () => {
  it("pins the exclusive interval, complete graph, lowest carrier, and Dig distinction", () => {
    const output = execFileSync("node", ["--experimental-strip-types", "tools/compare/fissureSourceAudit.ts"], { encoding: "utf8" });
    expect(output).toContain("0x082ccb7e..0x082ccca1 (0x123 bytes)");
    expect(output).toContain("complete 12-component");
    expect(output).toContain("set 564 FRONTIER_MON_DUGTRIO_3");
    expect(output).toContain("MOVE_DIG has 17 components and shares exactly");
  });

  it("keeps complete legal bilateral Scene-ON parties with all four active choices constrained", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage.profile).toBe("battle-scene-on");
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      const dugtrio = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent].find((mon: { species: number }) => mon.species === 51);
      expect(dugtrio).toMatchObject({ level: 50, nature: 3, moves: [90, 90, 90, 90] });
      for (const mon of [...stage.overrides.parties.player, ...stage.overrides.parties.opponent]) {
        expect(mon.moves).toHaveLength(4);
        expect(mon.ppUps).toHaveLength(4);
        expect(Object.keys(mon.ivs)).toHaveLength(6);
        expect(Object.keys(mon.evs)).toHaveLength(6);
      }
    }
  });

  it("banks the pointer-bounded probe mode and an honest unsupported receipt", () => {
    const probe = readFileSync("tools/compare/agilityProbe.py", "utf8");
    expect(probe).toContain('IS_FISSURE = "mechanic-fissure-" in SCENARIO.name');
    expect(probe).toContain('("Move_FISSURE","Move_DIG")');
    expect(probe).toContain('"fissure-dense-evidence/v1"');
    for (const field of ["softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices", "fadedPalette", "hardwarePalette", "paletteTags", "tileTags", "registers", "se1", "se2", "immutableState"]) {
      expect(probe).toContain(`"${field}"`);
    }
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/fissure-source-staging-checkpoint.json", "utf8"));
    expect(receipt).toMatchObject({ oracleProfile: "battle-scene-on", move: "FISSURE", status: "unsupported", components: 12, denseEvidence: null });
    expect(receipt.siblingAudit).toEqual({ move: "MOVE_DIG", components: 17, shared: ["asset:ANIM_TAG_MUD_SAND", "sprite:gDirtPlumeSpriteTemplate"], promoted: false });
  });
});
