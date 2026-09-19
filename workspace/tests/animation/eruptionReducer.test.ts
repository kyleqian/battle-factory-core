import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eruptionAtAge } from "../../src/animation/eruption.ts";
import {
  createSceneOnMovePresentation,
  sceneOnEruptionView,
  type SceneOnDragonRageFieldProfile,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";
import { eruptionProfileFor, verifyEruptionReducer } from "../../tools/compare/eruptionReducer.ts";

const profile = eruptionProfileFor("player-back");
const fieldProfile: SceneOnDragonRageFieldProfile = {
  playerHp: 100,
  playerMaxHp: 100,
  opponentHp: 100,
  opponentMaxHp: 100,
  playerGender: "female",
  opponentGender: "male",
};

const battler = (
  side: "player" | "opponent",
  species: SceneOnPresentationBattler["species"],
): SceneOnPresentationBattler => ({
  species,
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 40, y: 48 } : { x: 144, y: 10 },
    animationCenter: side === "player" ? { x: 72, y: 88 } : { x: 176, y: 42 },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  },
});

describe("MOVE_ERUPTION composed source-relative reducer", () => {
  it("retains complete 476/494 bilateral source, task, sprite, order, palette, resource, and cleanup rows", () => {
    expect(verifyEruptionReducer("player-back")).toMatchObject({
      rows: 476,
      checked: { sourceRows: 476, paletteRows: 476, orderRows: 476 },
      lifecycle: { launchRocks: 14, fallingRocks: 6, palettePrograms: 2 },
      cleanup: { age: 475, active: false, sprites: 0, tasks: 0, framebufferCompared: false },
      gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: 476 },
    });
    expect(verifyEruptionReducer("opponent-front")).toMatchObject({
      rows: 494,
      checked: { sourceRows: 494, paletteRows: 494, orderRows: 494 },
      lifecycle: { launchRocks: 14, fallingRocks: 6, palettePrograms: 2 },
      cleanup: { age: 493, active: false, sprites: 0, tasks: 0, framebufferCompared: false },
      gameplay: { immutable: true, gameplayRngTransitions: 0, animationRngRows: 494 },
    });
  });

  it("uses live species, sides, and geometry without a carrier/evidence gate", () => {
    const state = createSceneOnMovePresentation({
      move: "ERUPTION",
      attacker: battler("player", "SURSKIT"),
      target: battler("opponent", "ONIX"),
      fieldProfile,
      animationProfile: profile,
    });
    const view = sceneOnEruptionView({ ...state, age: 239 });
    expect(view.attacker.species).toBe("SURSKIT");
    expect(view.target.species).toBe("ONIX");
    expect(view.source).toMatchObject({ offset: 187, args: [4, 8, 60, 70, 1, 0, 0, 0], active: true });
    expect(view.horizontalShake.platformTask?.callback).toBe("AnimTask_ShakePlatforms");
    expect(view.audio.audio?.song).toBe("se_m_rock_throw");
    expect(eruptionAtAge(475, profile).cleanup.firstInactive).toBe(true);
  });

  it("keeps independent sibling controls and the compositor remainder explicit", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8")) as Record<string, any>;
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_EARTHQUAKE")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_FISSURE")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_LUSTER_PURGE")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SKY_ATTACK")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_MAGNITUDE")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_EXPLOSION")?.status).toBe("exact");
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_SELF_DESTRUCT")?.status).toBe("exact");
    expect(() => sceneOnEruptionView({
      ...createSceneOnMovePresentation({
        move: "EARTHQUAKE",
        attacker: battler("player", "SURSKIT"),
        target: battler("opponent", "ONIX"),
        fieldProfile,
        initialBattlerX2: { player: 0, opponent: 0 },
      }),
      age: 0,
    } as never)).toThrow("expected ERUPTION");
    expect(() => renderSceneOnMovePresentation(new Uint8Array(240 * 160 * 4), {
      ...stateForRender(),
      age: 0,
    })).not.toThrow();
  });
});

function stateForRender() {
  return createSceneOnMovePresentation({
    move: "ERUPTION" as const,
    attacker: battler("player", "SURSKIT"),
    target: battler("opponent", "ONIX"),
    fieldProfile,
    animationProfile: profile,
  });
}
