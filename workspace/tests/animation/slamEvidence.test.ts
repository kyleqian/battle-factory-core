import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { semanticReceiptSha256 } from "../../tools/compare/semanticReceipt.ts";

describe("MOVE_SLAM complete dense evidence", () => {
  it("pins both legal Level-50 Scene-ON receipts and complete parties", () => {
    const contracts = [
      {
        path: "tools/compare/fixtures/slam-player-lickitung-opponent-onix.json",
        orientation: "player-to-opponent",
        evidence: "8f520d7599ce22335081f096258dba8a4dc61f880c9b5167f0d3d68a33e14182",
        raw: "4e3abdaf0e4ab636fc415fb933a10cb47f9ed86fffcef880fd3d6479d1a4c8c2",
      },
      {
        path: "tools/compare/fixtures/slam-opponent-lickitung-player-onix.json",
        orientation: "opponent-to-player",
        evidence: "66a2b9d72b6dd0eb160faf6336a395fd036745d1fc09433fca7aea3641697401",
        raw: "66d4cdf1aed7f739b15a44eaccbb346268f5cc3b05112836b8717d31255f62fc",
      },
    ] as const;

    for (const contract of contracts) {
      const fixture = JSON.parse(readFileSync(contract.path, "utf8"));
      const scenario = JSON.parse(readFileSync(fixture.scenario, "utf8"));
      expect(fixture).toMatchObject({
        schema: "slam-portable-evidence/v1",
        oracleProfile: "battle-scene-on",
        orientation: contract.orientation,
        sourceWindow: { frameCount: 54 },
        evidenceSha256: contract.evidence,
        rawRgbSha256: contract.raw,
        battleState: { species: 108, heldItem: 142 },
      });
      expect(
        fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1,
      ).toBe(54);
      expect(scenario).toMatchObject({
        schemaVersion: 1,
        mode: "mechanicLab",
        profile: "battle-scene-on",
        level: 50,
        challengeNum: 0,
      });
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      for (const party of Object.values(scenario.overrides.parties) as any[][]) {
        for (const mon of party) {
          expect(mon).toMatchObject({
            level: 50,
            ivs: {
              hp: expect.any(Number), attack: expect.any(Number),
              defense: expect.any(Number), speed: expect.any(Number),
              spAttack: expect.any(Number), spDefense: expect.any(Number),
            },
            evs: {
              hp: expect.any(Number), attack: expect.any(Number),
              defense: expect.any(Number), speed: expect.any(Number),
              spAttack: expect.any(Number), spDefense: expect.any(Number),
            },
            moves: expect.any(Array),
            ppUps: [0, 0, 0, 0],
            abilitySlot: expect.any(Number),
            friendship: 70,
            shiny: false,
          });
          expect(mon.moves).toHaveLength(4);
          expect(mon.gender === "male" || mon.gender === "female").toBe(true);
        }
      }
    }
  });

  it("normalizes only the asserted-empty normal Python transport receipt", () => {
    const fresh = {
      schema: "slam-hit-slide-shake-test",
      setup: {
        name: "\u00e9",
        preCheckpointCaptures: [],
        nested: { value: 1 },
      },
      rows: [0, true, "line\n"],
    };
    const semantic = "{\"schema\": \"slam-hit-slide-shake-test\", \"setup\": {\"name\": \"\\u00e9\", \"nested\": {\"value\": 1}}, \"rows\": [0, true, \"line\\n\"]}\n";
    expect(semanticReceiptSha256(fresh)).toBe(
      createHash("sha256").update(semantic).digest("hex"),
    );
    expect(() => semanticReceiptSha256({
      ...fresh,
      setup: { ...fresh.setup, preCheckpointCaptures: [1] },
    })).toThrow("setup.preCheckpointCaptures must be []");
  });

  it("ratchets only the independently receipted slam-hit-slide-shake track", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    for (const move of ["MOVE_SLAM", "MOVE_SECRET_POWER"]) {
      expect(coverage.entries.find((entry: { move: string }) =>
        entry.move === move)).toMatchObject({ status: "exact" });
    }
    expect(coverage.componentTracks.find((track: { id: string }) =>
      track.id === "slam-hit-slide-shake")).toMatchObject({
      components: [
        "asset:ANIM_TAG_SLAM_HIT",
        "sprite:gSlamHitSpriteTemplate",
        "sprite:gSlideMonToOffsetSpriteTemplate",
        "sprite:gSlideMonToOriginalPosSpriteTemplate",
        "visualCommand:create_basic_hitsplat_sprite",
        "task:AnimTask_ShakeMonInPlace",
        "visualCommand:monbg",
        "visualCommand:setalpha",
        "visualCommand:blendoff",
        "visualCommand:clearmonbg",
      ],
      representatives: ["MOVE_SLAM", "MOVE_SECRET_POWER"],
      fulfilled: true,
    });
  });
});
