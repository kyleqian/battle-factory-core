import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ROLE_PLAY_ADDITIONAL_MON_OAM_SLOT,
  ROLE_PLAY_ADDITIONAL_MON_PALETTE_SLOT,
  ROLE_PLAY_ADDITIONAL_MON_RESOURCE_TAG,
  ROLE_PLAY_ADDITIONAL_MON_TILE_SLOT,
  rolePlayAdditionalMonHardwareMatrixAtAge,
  rolePlayAdditionalMonOamAtAge,
  rolePlayAdditionalMonSoftwareMatrixAtAge,
} from "../../tools/compare/rolePlayOamEvidence.ts";

const fixtures = [
  "tools/compare/fixtures/role-play-player-kadabra-opponent-onix.json",
  "tools/compare/fixtures/role-play-opponent-kadabra-player-onix.json",
] as const;

describe("MOVE_ROLE_PLAY dense evidence checkpoint", () => {
  it.each(fixtures)("pins a complete twice-fresh pointer-bounded receipt: %s", (path) => {
    const fixture = JSON.parse(readFileSync(path, "utf8"));
    expect(fixture).toMatchObject({
      schema: "role-play-portable-evidence/v1",
      oracleProfile: "battle-scene-on",
      move: "ROLE_PLAY",
      moveId: 272,
      sourceWindow: { frameCount: 147 },
      sourceBounds: { start: "0x082d4fae", endExclusive: "0x082d500a" },
      acceptance: {
        status: "exact",
        componentMatching: 147,
        typedSeamMatching: 147,
        oamHardwareMatching: 147,
        rawRgbMatching: 147,
        framebufferMatching: 147,
      },
    });
    expect(fixture.sourceWindow.endFrame - fixture.sourceWindow.startFrame + 1).toBe(147);
    for (const digest of [fixture.probeJsonSha256, fixture.rawRgbSha256, fixture.changeMapSha256]) {
      expect(digest).toMatch(/^[0-9a-f]{64}$/);
    }
    const map = readFileSync(fixture.changeMap, "utf8");
    expect(createHash("sha256").update(map).digest("hex")).toBe(fixture.changeMapSha256);
    expect(map).toContain("147 frames, 240x160");
  });

  it("pins bilateral source-derived identity and geometry without promoting", () => {
    const [player, opponent] = fixtures.map((path) => JSON.parse(readFileSync(path, "utf8")));
    expect(player).toMatchObject({ orientation: "player-back", sourceWindow: { startFrame: 70, endFrame: 216 }, attacker: { side: "player", animationCenter: { x: 72, y: 80 } }, target: { art: "back", personality: 1793700000, otId: 416049562 } });
    expect(opponent).toMatchObject({ orientation: "opponent-front", sourceWindow: { startFrame: 74, endFrame: 220 }, attacker: { side: "opponent", animationCenter: { x: 176, y: 42 } }, target: { art: "front", personality: 2349019075, otId: 416049562 } });
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    expect(coverage.entries.filter((entry: { status?: string }) => entry.status === "exact")).toHaveLength(152);
    expect(coverage.entries.find((entry: { move: string }) => entry.move === "MOVE_ROLE_PLAY")?.status).toBe("exact");
  });

  it("pins the direct additional-ONIX software and scanout OAM handoff", () => {
    const player = { x: 52, y: 80 };
    const opponent = { x: 196, y: 42 };
    const playerNormal = [0x0530, 0xc014, 0x7931];
    const playerIntermediate = [0x0730, 0xc014, 0x7931];
    const playerDouble = [0x0710, 0xc1f4, 0x7931];
    const opponentNormal = [0x050a, 0xc0a4, 0x7931];
    const opponentIntermediate = [0x070a, 0xc0a4, 0x7931];
    const opponentDouble = [0x07ea, 0xc084, 0x7931];

    expect({
      oamSlot: ROLE_PLAY_ADDITIONAL_MON_OAM_SLOT,
      resourceTag: ROLE_PLAY_ADDITIONAL_MON_RESOURCE_TAG,
      paletteSlot: ROLE_PLAY_ADDITIONAL_MON_PALETTE_SLOT,
      tileSlot: ROLE_PLAY_ADDITIONAL_MON_TILE_SLOT,
    }).toEqual({ oamSlot: 9, resourceTag: 55125, paletteSlot: 7, tileSlot: 6 });
    expect(rolePlayAdditionalMonOamAtAge(53, player, "source")).toBeNull();
    expect(rolePlayAdditionalMonOamAtAge(54, player, "source")).toEqual(playerNormal);
    expect(rolePlayAdditionalMonOamAtAge(54, player, "software")).toEqual(playerNormal);
    expect(rolePlayAdditionalMonOamAtAge(54, player, "hardware")).toBeNull();
    expect(rolePlayAdditionalMonOamAtAge(55, player, "hardware")).toEqual(playerNormal);
    expect(rolePlayAdditionalMonOamAtAge(84, player, "source")).toEqual(playerIntermediate);
    expect(rolePlayAdditionalMonOamAtAge(84, player, "software")).toEqual(playerNormal);
    expect(rolePlayAdditionalMonOamAtAge(85, player, "source")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(85, player, "software")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(85, player, "hardware")).toEqual(playerNormal);
    expect(rolePlayAdditionalMonOamAtAge(86, player, "hardware")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(91, player, "source")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(92, player, "source")).toBeNull();
    expect(rolePlayAdditionalMonOamAtAge(92, player, "software")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(93, player, "software")).toBeNull();
    expect(rolePlayAdditionalMonOamAtAge(93, player, "hardware")).toEqual(playerDouble);
    expect(rolePlayAdditionalMonOamAtAge(94, player, "hardware")).toBeNull();
    expect(rolePlayAdditionalMonOamAtAge(54, opponent, "source")).toEqual(opponentNormal);
    expect(rolePlayAdditionalMonOamAtAge(84, opponent, "source")).toEqual(opponentIntermediate);
    expect(rolePlayAdditionalMonOamAtAge(85, opponent, "software")).toEqual(opponentDouble);
    expect(rolePlayAdditionalMonOamAtAge(86, opponent, "hardware")).toEqual(opponentDouble);
  });

  it("pins the fresh affine matrix's two-display hardware lag through teardown", () => {
    const player = { x: 52, y: 80 };
    expect(rolePlayAdditionalMonSoftwareMatrixAtAge(84, "player", player)).toEqual([256, 0, 0, 256]);
    expect(rolePlayAdditionalMonSoftwareMatrixAtAge(85, "player", player)).toEqual([240, 0, 0, 384]);
    expect(rolePlayAdditionalMonHardwareMatrixAtAge(84, "player", player)).toEqual([256, 0, 0, 256]);
    expect(rolePlayAdditionalMonHardwareMatrixAtAge(85, "player", player)).toEqual([256, 0, 0, 256]);
    expect(rolePlayAdditionalMonHardwareMatrixAtAge(86, "player", player)).toEqual([240, 0, 0, 384]);
    expect(rolePlayAdditionalMonHardwareMatrixAtAge(93, "player", player)).toEqual([128, 0, 0, 1280]);
    expect(rolePlayAdditionalMonHardwareMatrixAtAge(94, "player", player)).toEqual([256, 0, 0, 256]);
  });

  it("keeps the portable receipt load-bearing for each reported category", () => {
    const portable = readFileSync("tools/compare/rolePlayPortable.ts", "utf8");
    for (const token of [
      "rolePlayAdditionalMonOamAtAge(age,silhouetteCenter,\"source\")",
      "decodeSoftwareOam(oracle.softwareOam[ROLE_PLAY_ADDITIONAL_MON_OAM_SLOT]!)",
      "additional-mon palette/tile resource lifecycle",
      "full software-to-hardware OAM transfer",
      "full software-to-hardware matrix transfer",
      "additional-mon fresh affine hardware lag",
      "typed-seam ${matches.typedSeam}/147 OAM/hardware ${matches.oamHardware}/147 raw-RGB ${matches.rawRgb}/147",
    ]) expect(portable).toContain(token);
  });
});
