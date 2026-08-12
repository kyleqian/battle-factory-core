import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const scenarios = [
  "tools/battle-lab/mechanic-confuse-ray-player-chinchou-opponent-onix.json",
  "tools/battle-lab/mechanic-confuse-ray-opponent-chinchou-player-onix.json",
];

describe("MOVE_CONFUSE_RAY source contract", () => {
  it("pins the exclusive interval, 12-component graph, lowest carrier, and panning task", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/confuseRaySourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result).toMatchObject({
      move: "MOVE_CONFUSE_RAY",
      sourceBounds: { start: "0x082cbe91", endExclusive: "0x082cbee4", bytes: "0x53" },
      carrier: "set 116 FRONTIER_MON_CHINCHOU / SPECIES_CHINCHOU / MOVE_CONFUSE_RAY",
      soundTask: "SoundTask_AdjustPanningVar uses gAnimCustomPanning for the Confuse Ray bounce cue",
    });
    expect(result.components).toHaveLength(12);
    expect(result.components).toContain("task:SoundTask_AdjustPanningVar");
  });

  it("keeps Will-O-Wisp as a distinct non-promoted sibling audit", () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/confuseRaySourceAudit.ts",
    ], { encoding: "utf8" }));
    expect(result.siblingAudit).toEqual({
      move: "MOVE_WILL_O_WISP",
      components: [
        "asset:ANIM_TAG_WISP_FIRE",
        "asset:ANIM_TAG_WISP_ORB",
        "sprite:gWillOWispFireSpriteTemplate",
        "sprite:gWillOWispOrbSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "task:SoundTask_AdjustPanningVar",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
        "visualCommand:splitbgprio_all",
        "visualCommand:splitbgprio_foes",
      ],
      shared: [
        "task:SoundTask_AdjustPanningVar",
        "visualCommand:clearmonbg",
        "visualCommand:monbg",
      ],
      independence: "Will-O-Wisp retains WISP_FIRE/WISP_ORB, its orb/fire callbacks, split-bg transitions, and ShakeMon2 body; it is not promoted.",
    });
  });

  it("stages complete legal bilateral Chinchou parties with every active choice constrained", () => {
    for (const path of scenarios) {
      const stage = JSON.parse(readFileSync(path, "utf8"));
      expect(stage).toMatchObject({ schemaVersion: 1, mode: "mechanicLab", profile: "battle-scene-on", level: 50 });
      expect(stage.overrides.parties.player).toHaveLength(3);
      expect(stage.overrides.parties.opponent).toHaveLength(3);
      const activeChinchou = [...stage.overrides.parties.player, ...stage.overrides.parties.opponent].find(
        (mon: { species: number }) => mon.species === 170,
      );
      expect(activeChinchou).toMatchObject({ level: 50, nature: 0, moves: [109, 109, 109, 109] });
      for (const side of [stage.overrides.parties.player, stage.overrides.parties.opponent]) {
        expect(side[0].moves).toHaveLength(4);
        expect(new Set(side[0].moves)).toHaveLength(1);
        for (const mon of side) {
          expect(mon.moves).toHaveLength(4);
          expect(mon.ppUps).toHaveLength(4);
          expect(Object.keys(mon.ivs)).toHaveLength(6);
          expect(Object.keys(mon.evs)).toHaveLength(6);
          expect(mon).toMatchObject({ level: 50, abilitySlot: 0, friendship: 70, shiny: false });
        }
      }
    }
  });

  it("banks a full-state pointer-bounded probe and honest unsupported receipt", () => {
    const probe = readFileSync("tools/compare/agilityProbe.py", "utf8");
    expect(probe).toContain('IS_CONFUSE_RAY = "mechanic-confuse-ray-" in SCENARIO.name');
    expect(probe).toContain('("Move_CONFUSE_RAY","Move_LOCK_ON")');
    expect(probe).toContain('"confuse-ray-dense-evidence/v1"');
    for (const field of [
      "tasks", "sprites", "softwareOam", "hardwareOam", "softwareMatrices", "hardwareMatrices",
      "fadedPalette", "hardwarePalette", "paletteTags", "tileTags", "registers", "se1", "se2", "immutableState",
    ]) {
      expect(probe).toContain(`"${field}"`);
    }
    const receipt = JSON.parse(readFileSync("tools/compare/fixtures/confuse-ray-source-staging-checkpoint.json", "utf8"));
    expect(receipt).toMatchObject({
      oracleProfile: "battle-scene-on",
      move: "CONFUSE_RAY",
      status: "unsupported",
      components: 12,
      denseEvidence: {
        schema: "confuse-ray-dense-evidence/v1",
        twiceFresh: true,
      },
    });
    expect(receipt.sourceSymbols).toEqual({ Move_CONFUSE_RAY: 137150097, Move_LOCK_ON: 137150180 });
    expect(receipt.orientations).toEqual([
      {
        orientation: "player-back",
        scenario: "tools/battle-lab/mechanic-confuse-ray-player-chinchou-opponent-onix.json",
        endpointFrame: 834,
        endpointSha256: "276079d7a85d294688abd28c4d25419653af9b348ebd6ae7fa2c203fc2887206",
      },
      {
        orientation: "opponent-front",
        scenario: "tools/battle-lab/mechanic-confuse-ray-opponent-chinchou-player-onix.json",
        endpointFrame: 834,
        endpointSha256: "5c9ea0c7e3f19ba0c894fa5a3042046b496cf6c678d13e7e4df54ffbb452ea06",
      },
    ]);
    expect(receipt.siblingAudit).toEqual({
      move: "MOVE_WILL_O_WISP",
      components: 10,
      shared: ["task:SoundTask_AdjustPanningVar", "visualCommand:clearmonbg", "visualCommand:monbg"],
      distinct: [
        "asset:ANIM_TAG_WISP_FIRE",
        "asset:ANIM_TAG_WISP_ORB",
        "sprite:gWillOWispFireSpriteTemplate",
        "sprite:gWillOWispOrbSpriteTemplate",
        "task:AnimTask_ShakeMon2",
        "visualCommand:splitbgprio_all",
        "visualCommand:splitbgprio_foes",
      ],
      promoted: false,
    });
  });
});
