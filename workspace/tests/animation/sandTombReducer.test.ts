import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sandTombAtAge } from "../../src/animation/sandTomb.ts";
import {
  createSceneOnMovePresentation,
  sceneOnSandTombView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { sandTombProfileFor, verifySandTombReducer } from "../../tools/compare/sandTombReducer.ts";

const profile = sandTombProfileFor("player-back");
const fieldProfile: SceneOnDragonRageFieldProfile = {
  playerHp: 100, playerMaxHp: 100, opponentHp: 100, opponentMaxHp: 100,
  playerGender: "female", opponentGender: "male",
};

const battler = (
  side: "player" | "opponent",
  species: SceneOnPresentationBattler["species"],
): SceneOnPresentationBattler => ({
  species,
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 40, y: 48 } : { x: 144, y: 10 },
    animationCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 42 },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  },
});

describe("MOVE_SAND_TOMB source-relative reducer", () => {
  it("retains both complete 124-row source/task/sprite/order/palette/resource windows", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      expect(verifySandTombReducer(orientation)).toMatchObject({
        rows: 124,
        checked: { sourceRows: 124, spriteRows: 124, taskRows: 124, targetRows: 124, targetOamRows: 124, orderRows: 124, rngRows: 124, resourceRows: 124 },
        latches: { oam: "123/123 RAM+1", matrices: "123/123 RAM+1", palette: "123/123 RAM+1", shakeMon: "RAM+1" },
        lifecycle: { dirtSprites: 18, palettePrograms: 2, shakeRows: 84, audioAge: 4 },
        cleanup: { age: 123, active: false, sprites: 0, tasks: 0, framebufferCompared: false },
        gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: 124 },
      });
    }
  });

  it("uses typed live species/sides/geometry instead of a carrier or evidence pair", () => {
    const state = createSceneOnMovePresentation({
      move: "SAND_TOMB",
      attacker: battler("player", "SURSKIT"),
      target: battler("opponent", "ARON"),
      fieldProfile,
      animationProfile: profile,
    });
    const view = sceneOnSandTombView({ ...state, age: 52 });
    expect(view.attacker.species).toBe("SURSKIT");
    expect(view.target.species).toBe("ARON");
    expect(view.source).toMatchObject({ owner: "SandTombSwirlingDirt", offset: 100, args: [0, 32, 528, 30, 10, 50, 1, 0], active: true });
    expect(view.sprites.filter((sprite) => sprite.kind === "dirt")).toHaveLength(7);
    expect(sandTombAtAge(123, profile).cleanup.firstInactive).toBe(true);
  });

  it("promotes only Sand Tomb and leaves the shared MUD_SAND neighbors independent", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SAND_TOMB")?.status).toBe("exact");
    expect(coverage.componentTracks.find((track: any) => track.id === "sand-tomb-vortex")).toMatchObject({
      representatives: ["MOVE_SAND_TOMB"], fulfilled: true,
    });
    const expectedStatus: Record<string, string | undefined> = {
      MOVE_SAND_ATTACK: "exact",
      MOVE_FISSURE: "exact",
      MOVE_DIG: "exact",
      MOVE_MUD_SLAP: "exact",
      MOVE_ROLLOUT: "exact",
      MOVE_MUD_SPORT: undefined,
    };
    for (const sibling of ["MOVE_SAND_ATTACK", "MOVE_FISSURE", "MOVE_DIG", "MOVE_MUD_SLAP", "MOVE_ROLLOUT", "MOVE_MUD_SPORT"]) {
      expect(coverage.componentTracks.find((track: any) => track.id === "sand-tomb-vortex")?.representatives).not.toContain(sibling);
      expect(coverage.entries.find((entry: any) => entry.move === sibling)?.status).toBe(expectedStatus[sibling]);
    }
  });
});
