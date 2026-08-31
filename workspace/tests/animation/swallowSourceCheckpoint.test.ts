import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("MOVE_SWALLOW bounded source checkpoint", () => {
  it("pins the exclusive ROM interval, carrier, branches, tasks, audio, tags, and cleanup", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/swallowSourceAudit.ts",
    ], { encoding: "utf8" });
    expect(output).toContain("0x082d4b2e..0x082d4bda (0xac bytes");
    expect(output).toContain("set 213 FRONTIER_MON_PELIPPER_1 is the lowest Level-50 carrier");
    expect(output).toContain("animTurn/stockpile 1,2,3 selects 5,10,15 BLUE_ORB sprites");
    expect(output).toContain("source body owns no GPU registers");
  });

  it("re-extracts Pelipper, exact Reversal BLUE_ORB, and shared BLUE_STAR assets", () => {
    const scratch = mkdtempSync(join(tmpdir(), "pokebench-swallow-assets-"));
    const output = join(scratch, "swallow.json");
    execFileSync(process.execPath, [
      "--experimental-strip-types", "tools/compare/extractSwallowAssets.ts",
      "--out", output,
    ]);
    expect(readFileSync(output)).toEqual(
      readFileSync("src/animation/assets/swallow.json"),
    );
    const swallow = JSON.parse(readFileSync(output, "utf8"));
    const reversal = JSON.parse(readFileSync("src/animation/assets/reversal.json", "utf8"));
    const synthesis = JSON.parse(readFileSync("src/animation/assets/synthesis.json", "utf8"));
    expect(swallow.blueOrb).toEqual(reversal.blueOrb);
    expect(swallow.blueStar).toEqual(synthesis.blueStar);
    expect(swallow.source.blueOrb).toContain("source-identical to Reversal");
    expect(swallow.source.blueStar).toContain("source-identical HealingEffect");
  });

  it("records Swallow exact only after the complete portable six-branch gate", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact"))
      .toHaveLength(215);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_SWALLOW"))
      .toMatchObject({ status: "exact" });
    const track = coverage.componentTracks.find(
      (entry: { id: string }) => entry.id === "blue-orb-reversal-evidence",
    );
    expect(track.representatives).toContain("MOVE_SWALLOW");
    expect(track.goal).toContain("MOVE_SWALLOW independently proves all six natural");
  });

  it("stages every branch through complete legal parties and ordinary controller input", () => {
    const matrix = JSON.parse(readFileSync(
      "tools/compare/fixtures/swallow-evidence-matrix.json",
      "utf8",
    ));
    const allowedButtons = new Set(["A", "B", "DOWN", "LEFT", "RIGHT", "UP"]);
    expect(matrix.branches).toHaveLength(6);

    for (const branch of matrix.branches) {
      const scenario = JSON.parse(readFileSync(branch.scenario, "utf8"));
      const stockingSide = branch.orientation === "player-back" ? "player" : "opponent";
      expect(scenario.profile).toBe("battle-scene-on");
      expect(Object.keys(scenario.overrides)).toEqual(["parties"]);
      expect(scenario.overrides).not.toHaveProperty("battlers");
      expect(scenario.overrides.parties.player).toHaveLength(3);
      expect(scenario.overrides.parties.opponent).toHaveLength(3);
      expect(scenario.overrides.parties[stockingSide][0].moves).toEqual(
        expect.arrayContaining([254, 256]),
      );
      for (const side of ["player", "opponent"]) {
        for (const mon of scenario.overrides.parties[side]) {
          expect(mon).toMatchObject({
            level: 50,
            ivs: expect.any(Object),
            evs: expect.any(Object),
            moves: expect.any(Array),
            ppUps: expect.any(Array),
            abilitySlot: expect.any(Number),
          });
          for (const transient of ["hp", "status", "stockpileCounter", "statStages"]) {
            expect(mon).not.toHaveProperty(transient);
          }
        }
      }
      expect(scenario.trace.segments.every((segment: { frames: number; buttons: string[] }) => (
        Number.isInteger(segment.frames)
        && segment.frames > 0
        && segment.buttons.every((button) => allowedButtons.has(button))
      ))).toBe(true);
      expect(scenario.trace.segments.some((segment: { buttons: string[] }) => (
        segment.buttons.includes("A")
      ))).toBe(true);
    }
  });

  it("pins twice-fresh player-back and opponent-front source windows for every Stockpile count", () => {
    const matrix = JSON.parse(readFileSync(
      "tools/compare/fixtures/swallow-evidence-matrix.json",
      "utf8",
    ));
    const expected = [
      {
        orientation: "player-back", stockpiles: 1, attacker: 0, hp: 57,
        sourceWindow: {
          startFrame: 1247, endFrame: 1409, frameCount: 163,
          rgbSequenceSha256: "1723b6d66528faf51a26facde57ab0e96ce7a564804f26da828428e29d5f95b8",
        },
        tagFrames: { blueOrb: 161, blueStar: 158 },
      },
      {
        orientation: "player-back", stockpiles: 2, attacker: 0, hp: 43,
        sourceWindow: {
          startFrame: 2174, endFrame: 2351, frameCount: 178,
          rgbSequenceSha256: "f864b72c9e6580d45a8c9c63810d6e3a04828c8b231b9e747471fd7edf0590c4",
        },
        tagFrames: { blueOrb: 176, blueStar: 173 },
      },
      {
        orientation: "player-back", stockpiles: 3, attacker: 0, hp: 89,
        sourceWindow: {
          startFrame: 2999, endFrame: 3191, frameCount: 193,
          rgbSequenceSha256: "f4e2c8b34d7b96529d2d24e787ed66d9ebf2311781a025427d231ea9aafc8b63",
        },
        tagFrames: { blueOrb: 191, blueStar: 188 },
      },
      {
        orientation: "opponent-front", stockpiles: 1, attacker: 1, hp: 104,
        sourceWindow: {
          startFrame: 1140, endFrame: 1300, frameCount: 161,
          rgbSequenceSha256: "62ac89c01abcd2ab14d48b6a0ed3d75a840fa161ddab8b40d551afb7d5feeeba",
        },
        tagFrames: { blueOrb: 159, blueStar: 156 },
      },
      {
        orientation: "opponent-front", stockpiles: 2, attacker: 1, hp: 137,
        sourceWindow: {
          startFrame: 2066, endFrame: 2241, frameCount: 176,
          rgbSequenceSha256: "be8e2bd5631e63d9259355b26a76c5437bc49936f6c391e23c269bfaf53ecc38",
        },
        tagFrames: { blueOrb: 174, blueStar: 171 },
      },
      {
        orientation: "opponent-front", stockpiles: 3, attacker: 1, hp: 104,
        sourceWindow: {
          startFrame: 6979, endFrame: 7169, frameCount: 191,
          rgbSequenceSha256: "002662dc153f5c0e8768b41c611184527bf4d0c8fd03593610ca29b50d63c96c",
        },
        tagFrames: { blueOrb: 189, blueStar: 186 },
      },
    ];
    const commonTemplates = [
      "gHealingBlueStarSpriteTemplate",
      "gSwallowBlueOrbSpriteTemplate",
    ];
    const playerCallbacks = [
      "AnimSpriteOnMonPos",
      "AnimSwallowBlueOrb",
      "SpriteCB_HealthBar",
      "SpriteCB_HealthBoxOther",
      "SpriteCB_SetInvisible",
      "SpriteCallbackDummy",
    ];
    const opponentCallbacks = [
      "AnimSpriteOnMonPos",
      "AnimSwallowBlueOrb",
      "SpriteCB_EnemyShadow",
      "SpriteCB_HealthBar",
      "SpriteCB_HealthBoxOther",
      "SpriteCallbackDummy",
    ];

    expect(matrix).toMatchObject({
      schema: "swallow-natural-evidence-matrix/v1",
      oracleProfile: "battle-scene-on",
    });
    expect(matrix.branches.map((branch: { orientation: string; stockpiles: number }) => (
      `${branch.orientation}/${branch.stockpiles}`
    ))).toEqual(expected.map((branch) => `${branch.orientation}/${branch.stockpiles}`));

    for (const row of expected) {
      const branch = matrix.branches.find((candidate: { orientation: string; stockpiles: number }) => (
        candidate.orientation === row.orientation && candidate.stockpiles === row.stockpiles
      ));
      expect(branch).toBeDefined();
      const receiptBytes = readFileSync(branch.fixture);
      const receipt = JSON.parse(receiptBytes.toString("utf8"));
      const fixtureSha256 = createHash("sha256").update(receiptBytes).digest("hex");
      expect(branch.freshReceiptSha256).toEqual([fixtureSha256, fixtureSha256]);
      expect(receipt).toMatchObject({
        schema: "swallow-natural-checkpoint/v1",
        oracleProfile: "battle-scene-on",
        setup: {
          customPartiesBuiltBeforeBattle: true,
          playerLeadSetId: row.orientation === "player-back" ? 213 : 162,
          opponentLeadSetId: row.orientation === "player-back" ? 162 : 213,
        },
        sourceWindow: row.sourceWindow,
        branch: {
          stockpiles: row.stockpiles,
          animTurn: row.stockpiles,
          orbWaves: row.stockpiles,
          attackerBattler: row.attacker,
          targetBattler: row.attacker,
        },
        lifecycleCounts: {
          blueOrb: row.stockpiles * 5,
          blueStar: 4,
          deform: 1,
          shake: 2,
        },
        audio: ["se_m_absorb_2", "se_m_spit_up", "se_m_take_down"],
        cleanup: { active: 0, visualTaskCount: 0, soundTaskCount: 0 },
        attackerHpRange: { minimum: row.hp, maximum: row.hp },
      });
      expect(receipt.tagPresence).toEqual({
        blueOrb: {
          absentAfterCleanup: true,
          paletteFrames: row.tagFrames.blueOrb,
          tileFrames: row.tagFrames.blueOrb,
        },
        blueStar: {
          absentAfterCleanup: true,
          paletteFrames: row.tagFrames.blueStar,
          tileFrames: row.tagFrames.blueStar,
        },
      });
      expect(receipt.topology.callbacks).toEqual(
        row.orientation === "player-back" ? playerCallbacks : opponentCallbacks,
      );
      expect(receipt.topology.tasks).toEqual([
        "AnimTask_ShakeMon2_Step",
        "AnimTask_SwallowDeformMon",
      ]);
      expect(receipt.topology.templates).toEqual(expect.arrayContaining(commonTemplates));
      expect(receipt.registerValues).toEqual({
        bldcnt: [0], bldalpha: [0], bldy: [0], mosaic: [0], winin: [16191], winout: [16191],
      });
    }
  });
});
