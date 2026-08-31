import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnRockBlastView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { rockBlastProfileFor, verifyRockBlastReducer } from "../../tools/compare/rockBlastReducer.ts";

const battler = (
  side: "player" | "opponent",
  species: SceneOnPresentationBattler["species"],
): SceneOnPresentationBattler => ({
  species,
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 34, y: 53 } : { x: 142, y: 12 },
    animationCenter: side === "player" ? { x: 66, y: 85 } : { x: 174, y: 44 },
    battlePositionCenter: side === "player" ? { x: 66, y: 79 } : { x: 174, y: 39 },
  },
});

describe("MOVE_ROCK_BLAST first-body source reducer", () => {
  it("matches every retained source/task/sprite/resource row bilaterally", () => {
    const expected = {
      rows: 90,
      checked: { sourceRows: 90, spriteRows: 90, battlerRows: 90, resourceRows: 90, audioRows: 2 },
      lifecycle: { lunge: [7, 17], rock: [12, 37], hitsplat: [39, 48], fragments: [39, 53], shakeMon: [39, 46] },
      decodedBasicRockCells: [0, 1, 5],
      latches: { oam: "89/89 RAM+1", matrices: "89/89 RAM+1", palette: "89/89 RAM+1", shakeMon: "RAM+1" },
      cleanup: { age: 89, active: false, sprites: 0, tasks: 0, resourcesFreed: true },
      gameplay: { immutable: true, gameplayRngTransitions: 0, multiHitOwned: false },
    };
    expect(verifyRockBlastReducer("player-back")).toEqual(expected);
    expect(verifyRockBlastReducer("opponent-front")).toEqual(expected);
  });

  it("threads altered species, geometry, and allocator facts without a pair gate", () => {
    const captured = rockBlastProfileFor("player-back");
    const animationProfile = {
      ...captured,
      attackerSide: "player" as const,
      attacker: { ...captured.attacker, spriteSlot: 21, battlePositionCenter: { x: 66, y: 79 } },
      target: { ...captured.target, spriteSlot: 22, battlePositionCenter: { x: 174, y: 39 }, effectCenter: { x: 174, y: 44 } },
      allocator: { lungeSlot: 23, rockSlot: 24, hitsplatSlot: 25, fragmentSlots: [26, 27, 28, 29] as const, shakeTaskSlot: 7 },
    };
    const state = createSceneOnMovePresentation({
      move: "ROCK_BLAST",
      attacker: battler("player", "SURSKIT"),
      target: battler("opponent", "ARON"),
      fieldProfile: { playerHp: 91, playerMaxHp: 91, opponentHp: 88, opponentMaxHp: 88 },
      animationProfile,
    });
    expect(sceneOnRockBlastView({ ...state, age: 39 })).toMatchObject({
      attacker: { species: "SURSKIT", geometry: { side: "player" } },
      target: { species: "ARON", geometry: { side: "opponent" } },
      sprites: [
        { kind: "hitsplat", slot: 25 },
        { kind: "fragment", slot: 26 },
        { kind: "fragment", slot: 27 },
        { kind: "fragment", slot: 28 },
        { kind: "fragment", slot: 29 },
      ],
      shakeTask: { slot: 7, targetSpriteSlot: 22 },
    });
  });

  it("keeps Rock Blast unsupported and all named controls independent", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const track = coverage.componentTracks.find((entry: any) => entry.id === "rock-blast-first-body");
    expect(track).toMatchObject({ representatives: ["MOVE_ROCK_BLAST"], fulfilled: false });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_ROCK_BLAST")).toBeUndefined();
    for (const control of ["MOVE_ROCK_THROW", "MOVE_ROCK_TOMB", "MOVE_ANCIENT_POWER"]) {
      expect(track.representatives).not.toContain(control);
      expect(coverage.entries.find((entry: any) => entry.move === control)?.status).toBe("exact");
    }
  });
});
