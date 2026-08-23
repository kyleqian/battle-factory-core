import { describe, expect, it } from "vitest";
import {
  TEETER_DANCE_FIRST_INACTIVE_AGE,
  TEETER_DANCE_NOTE_SPAWN_AGES,
  TEETER_DANCE_SOUND_AGES,
  TEETER_DANCE_WINDOW_FRAMES,
  teeterDanceAtAge,
  teeterDanceNoteAtAge,
  teeterDanceNotesBackToFrontAtAge,
  teeterDanceNotesAtAge,
  teeterDanceTaskAtAge,
} from "../../src/animation/teeterDance.ts";
import {
  createSceneOnMovePresentation,
  sceneOnTeeterDanceView,
} from "../../src/animation/sceneOnPresentation.ts";

const playerNoteOrigin = { x: 72, y: 93 };
const playerBattlerOrigin = { x: 72, y: 85 };
const opponentNoteOrigin = { x: 176, y: 41 };
const opponentBattlerOrigin = { x: 176, y: 41 };

describe("MOVE_TEETER_DANCE source-relative reducer", () => {
  it("retains the five source-created fast-note paths and their one-row latch", () => {
    expect(TEETER_DANCE_NOTE_SPAWN_AGES).toEqual([7, 33, 59, 85, 111]);
    expect(teeterDanceNoteAtAge(7, 0, playerNoteOrigin, "player"))
      .toMatchObject({
        index: 0, localAge: 1, x: 91, y: 87, x2: 0, y2: 0,
        animation: 0, tileOffset: 0, paletteIndex: 0,
        affinePaPd: 244, spriteSlot: 3,
      });
    expect(teeterDanceNoteAtAge(13, 0, playerNoteOrigin, "player"))
      .toMatchObject({ localAge: 7, x2: 16, y2: 6 });
    expect(teeterDanceNoteAtAge(28, 0, playerNoteOrigin, "player"))
      .toMatchObject({ localAge: 22, x2: 18, y2: 0 });
    expect(teeterDanceNoteAtAge(54, 0, playerNoteOrigin, "player"))
      .toBeNull();
    expect(teeterDanceNoteAtAge(33, 1, playerNoteOrigin, "player"))
      .toMatchObject({ localAge: 1, x: 72, y: 87, spriteSlot: 4 });
  });

  it("flips the source x arguments only on the opponent side", () => {
    expect(teeterDanceNoteAtAge(7, 0, opponentNoteOrigin, "opponent"))
      .toMatchObject({ localAge: 1, x: 156, y: 35, x2: 0, y2: 0 });
    expect(teeterDanceNoteAtAge(33, 1, opponentNoteOrigin, "opponent"))
      .toMatchObject({ localAge: 1, x: 176, y: 35 });
    expect(teeterDanceNoteAtAge(85, 3, opponentNoteOrigin, "opponent"))
      .toMatchObject({ localAge: 1, x: 185, y: 35, animation: 1, tileOffset: 4 });
    expect(teeterDanceNotesAtAge(111, opponentNoteOrigin, "opponent")
      .map((note) => note.index)).toEqual([3, 4]);
  });

  it("ports the live-battler TeeterDance task independently", () => {
    expect(teeterDanceTaskAtAge(6, playerNoteOrigin, "player", playerBattlerOrigin))
      .toBeNull();
    const playerTask = teeterDanceTaskAtAge(7, playerNoteOrigin, "player", playerBattlerOrigin);
    expect(playerTask).toMatchObject({
      tick: 1, phase: 0, sideSign: 1, baseX: 72, baseY: 85, x: 73, x2: 1,
    });
    expect(playerTask?.data.slice(0, 13)).toEqual([0, 0, 0, 0, 1, 72, 85, 0, 0, 2, 1, 8, 0]);
    expect(teeterDanceTaskAtAge(134, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ tick: 128, phase: 1, x: 72, x2: 0 });
    expect(teeterDanceTaskAtAge(166, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ tick: 160, phase: 2, x: 72, x2: 0 });
    expect(teeterDanceTaskAtAge(167, playerNoteOrigin, "player", playerBattlerOrigin))
      .toBeNull();
    const opponentTask = teeterDanceTaskAtAge(7, opponentNoteOrigin, "opponent", opponentBattlerOrigin);
    expect(opponentTask).toMatchObject({ sideSign: -1, x: 175, x2: 1 });
    expect(opponentTask?.data.slice(0, 13)).toEqual([0, 0, 0, 0, -1, 176, 41, 0, 0, 2, 1, 8, 0]);
  });

  it("tracks audio cues, task/sprite teardown, and the first inactive row", () => {
    expect(TEETER_DANCE_SOUND_AGES).toEqual([7, 33, 59, 85, 111]);
    expect(teeterDanceAtAge(7, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ active: true, visualTaskCount: 2, audio: { soundEffect: "SE_M_TEETER_DANCE", panX: -64 } });
    expect(teeterDanceAtAge(33, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ visualTaskCount: 3 });
    expect(teeterDanceAtAge(166, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ active: true, visualTaskCount: 1, notes: [] });
    expect(teeterDanceAtAge(167, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ active: true, visualTaskCount: 0, task: null });
    expect(teeterDanceAtAge(TEETER_DANCE_FIRST_INACTIVE_AGE, playerNoteOrigin, "player", playerBattlerOrigin))
      .toMatchObject({ active: false, visualTaskCount: 0, battlerX: 72, battlerX2: 0 });
    expect(TEETER_DANCE_WINDOW_FRAMES).toBe(169);
  });

  it("keeps persistent two-slot painter order source-relative", () => {
    expect(teeterDanceNotesBackToFrontAtAge(33, playerNoteOrigin, "player")
      .map((note) => note.index)).toEqual([0, 1]);
    expect(teeterDanceNotesBackToFrontAtAge(59, opponentNoteOrigin, "opponent")
      .map((note) => note.index)).toEqual([1, 2]);
  });

  it("exposes a typed Scene-ON seam without owning battle state", () => {
    const state = createSceneOnMovePresentation({
      move: "TEETER_DANCE",
      attacker: {
        species: "SPINDA",
        geometry: {
          side: "player", spriteCorner: { x: 40, y: 53 },
          animationCenter: playerNoteOrigin,
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent", spriteCorner: { x: 144, y: 10 },
          animationCenter: { x: 176, y: 42 },
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      attackerSpriteCenter: playerBattlerOrigin,
      fieldProfile: {
        playerHp: 157, playerMaxHp: 157,
        opponentHp: 110, opponentMaxHp: 110,
        playerGender: "male", opponentGender: "male",
      },
    });
    const view = sceneOnTeeterDanceView({ ...state, age: 7 });
    expect(view).toMatchObject({ age: 7, visualTaskCount: 2, battlerX: 73, battlerX2: 1 });
    expect(view.notes[0]).toMatchObject({ x: 91, y: 87, spriteSlot: 3 });
  });
});
