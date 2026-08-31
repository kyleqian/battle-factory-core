import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createSceneOnMovePresentation,
  sceneOnTrickView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";
import { trickProfileFor, verifyTrickReducer } from "../../tools/compare/trickReducer.ts";

const battler = (
  side: "player" | "opponent",
  species: SceneOnPresentationBattler["species"],
): SceneOnPresentationBattler => ({
  species,
  geometry: {
    side,
    spriteCorner: side === "player" ? { x: 38, y: 57 } : { x: 146, y: 13 },
    animationCenter: side === "player" ? { x: 72, y: 93 } : { x: 176, y: 45 },
    battlePositionCenter: side === "player" ? { x: 72, y: 80 } : { x: 176, y: 40 },
  },
});

describe("MOVE_TRICK source-age reducer", () => {
  it("matches both complete Item Bag/stretch/shake/resource/audio windows without framebuffer credit", () => {
    for (const orientation of ["player-back", "opponent-front"] as const) {
      expect(verifyTrickReducer(orientation)).toEqual({
        rows: 225,
        checked: { sourceRows: 225, bagRows: 225, stretchRows: 450, shakeRows: 450, resourceRows: 225, audioRows: 8, gameplayRows: 225 },
        lifecycle: { bags: { start: 7, end: 198, count: 2 }, stretch: { start: 25, end: 44, paired: true }, shake: { start: 173, end: 191, paired: true }, speedDustSprites: 0 },
        latches: { oam: "224/224 RAM+1", palette: "224/224 RAM+1", stretchMatrices: "27..44 RAM+2", shakeMon: "RAM+1" },
        resources: { itemBag: "1..223", speedDust: "4..223 resource-only" },
        audio: { sketch: 25, doubleTeam: [57, 83, 101, 119, 137, 155], attract: 173 },
        cleanup: { age: 224, sourceActive: false, bags: 0, tasks: 0, resourcesFreed: true, framebufferCompared: false },
        gameplay: { immutable: true, gameplayRngTransitions: 0 },
      });
    }
  });

  it("threads arbitrary live species, sides, geometry, and allocation facts through the typed seam", () => {
    const captured = trickProfileFor("player-back");
    const animationProfile = {
      ...captured,
      bagSlots: [17, 18] as const,
      attacker: { spriteSlot: 21, stretchTaskSlot: 22, shakeTaskSlot: 23 },
      target: { spriteSlot: 24, stretchTaskSlot: 25, shakeTaskSlot: 26 },
    };
    const state = createSceneOnMovePresentation({
      move: "TRICK",
      attacker: battler("player", "SURSKIT"),
      target: battler("opponent", "ARON"),
      fieldProfile: { playerHp: 91, playerMaxHp: 91, opponentHp: 88, opponentMaxHp: 88 },
      animationProfile,
    });
    expect(sceneOnTrickView({ ...state, age: 25 })).toMatchObject({
      attacker: { species: "SURSKIT", geometry: { side: "player" } },
      target: { species: "ARON", geometry: { side: "opponent" } },
      sprites: [{ slot: 17 }, { slot: 18 }],
      tasks: [
        { kind: "stretch", battler: "target", slot: 25, spriteSlot: 24 },
        { kind: "stretch", battler: "attacker", slot: 22, spriteSlot: 21 },
      ],
      audio: [{ song: "se_m_sketch", pan: 0 }],
    });
  });

  it("keeps Trick uncredited and the shared exact controls independent", () => {
    const coverage = JSON.parse(readFileSync("ANIMATION_COVERAGE.json", "utf8"));
    const track = coverage.componentTracks.find((entry: any) => entry.id === "trick-item-bags");
    expect(track).toMatchObject({ representatives: ["MOVE_TRICK"], fulfilled: false });
    expect(coverage.entries.find((entry: any) => entry.move === "MOVE_TRICK")).toBeUndefined();
    for (const control of ["MOVE_PRESENT", "MOVE_COVET", "MOVE_EXTREME_SPEED", "MOVE_FAKE_OUT", "MOVE_ASTONISH", "MOVE_SAND_TOMB"]) {
      expect(track.representatives).not.toContain(control);
      expect(coverage.entries.find((entry: any) => entry.move === control)?.status).toBe("exact");
    }
  });
});
