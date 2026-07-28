import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import fakeTearsAsset from "../../src/animation/assets/fake-tears.json" with { type: "json" };
import {
  FAKE_TEARS_SOUND_RESTART_AGES,
  FAKE_TEARS_SOURCE_FRAME_COUNT,
  FAKE_TEARS_TEAR_SPAWN_AGES,
  fakeTearsAtAge,
} from "../../src/animation/fakeTears.ts";
import { rockMonBackAndForthAtAge } from "../../src/animation/charm.ts";
import {
  createSceneOnMovePresentation,
  sceneOnFakeTearsView,
  type SceneOnPresentationBattler,
} from "../../src/animation/sceneOnPresentation.ts";

const playerBounds = { left: 40, right: 104, top: 72 };
const opponentBounds = { left: 152, right: 200, top: 24 };
const player: SceneOnPresentationBattler = {
  species: "DELCATTY",
  geometry: {
    side: "player",
    spriteCorner: { x: 40, y: 56 },
    animationCenter: { x: 72, y: 88 },
    battlePositionCenter: { x: 72, y: 80 },
  },
};
const opponent: SceneOnPresentationBattler = {
  species: "SHUCKLE",
  geometry: {
    side: "opponent",
    spriteCorner: { x: 144, y: 17 },
    animationCenter: { x: 176, y: 49 },
    battlePositionCenter: { x: 176, y: 40 },
  },
};
const fieldProfile = {
  playerHp: 145,
  playerMaxHp: 145,
  opponentHp: 127,
  opponentMaxHp: 127,
};

describe("MOVE_FAKE_TEARS source reducer", () => {
  it("generalizes RockMonBackAndForth to the literal speed-1 two-rock task", () => {
    expect(rockMonBackAndForthAtAge(0, "player", 1, 2)).toMatchObject({
      active: true, x2: 3, y2: 1, rotation: -384,
      matrix: { a: 255, b: 12, c: -12, d: 255 },
    });
    expect(rockMonBackAndForthAtAge(5, "player", 1, 2).x2).toBe(18);
    expect(rockMonBackAndForthAtAge(23, "player", 1, 2).x2).toBe(0);
    expect(rockMonBackAndForthAtAge(47, "opponent", 1, 2))
      .toMatchObject({ active: true, x2: 0, y2: 0 });
    expect(rockMonBackAndForthAtAge(48, "player", 1, 2))
      .toMatchObject({ active: false, x2: 0, y2: 0 });
  });

  it("ports all four typed tear pairs and their 32-callback arc/affine lifetimes", () => {
    expect(FAKE_TEARS_TEAR_SPAWN_AGES).toEqual([20, 30, 40, 50]);
    expect(fakeTearsAtAge(20, "player", playerBounds).tears).toMatchObject([
      {
        identity: "tear-0", type: 0, slot: 3, localAge: 0,
        x: 96, y: 80, x2: 0, y2: -2,
        matrix: { a: -114, b: -321, c: 321, d: -114 },
      },
      {
        identity: "tear-1", type: 1, slot: 4, localAge: 0,
        x: 90, y: 88, x2: 0, y2: -2,
      },
    ]);
    expect(fakeTearsAtAge(30, "player", playerBounds).tears.slice(-2))
      .toMatchObject([
        {
          identity: "tear-2", type: 2, slot: 5,
          x: 48, y: 80, x2: 0, y2: -2,
          matrix: { a: -114, b: 321, c: -321, d: -114 },
        },
        { identity: "tear-3", type: 3, slot: 7, x: 54, y: 88 },
      ]);
    expect(fakeTearsAtAge(20, "opponent", opponentBounds).tears[0])
      .toMatchObject({ x: 192, y: 32 });
    expect(fakeTearsAtAge(51, "player", playerBounds).tears
      .map((tear) => tear.identity)).toEqual([
        "tear-0", "tear-1", "tear-2", "tear-3",
        "tear-4", "tear-5", "tear-6", "tear-7",
      ]);
    expect(fakeTearsAtAge(81, "player", playerBounds).tears
      .map((tear) => tear.identity)).toEqual(["tear-6", "tear-7"]);
    expect(fakeTearsAtAge(82, "player", playerBounds).tears).toEqual([]);
  });

  it("pins asset latches, looped Tail Whip restarts, and clear tail", () => {
    expect(fakeTearsAtAge(0, "player", playerBounds)).toMatchObject({
      smallBubblesLoaded: true,
      thoughtBubbleLoaded: false,
      musicNotesLoaded: false,
      smallBubblesBlendY: 0,
    });
    expect(fakeTearsAtAge(9, "player", playerBounds)).toMatchObject({
      smallBubblesLoaded: true,
      thoughtBubbleLoaded: true,
      musicNotesLoaded: true,
      smallBubblesBlendY: 4,
    });
    expect(Array.from({ length: FAKE_TEARS_SOURCE_FRAME_COUNT }, (_, age) =>
      fakeTearsAtAge(age, "player", playerBounds).soundRestart ? age : null)
      .filter((age) => age !== null)).toEqual(FAKE_TEARS_SOUND_RESTART_AGES);
    expect(fakeTearsAtAge(10, "player", playerBounds).soundActive).toBe(true);
    expect(fakeTearsAtAge(72, "player", playerBounds).soundActive).toBe(true);
    expect(fakeTearsAtAge(73, "player", playerBounds).soundActive).toBe(false);
    expect(fakeTearsAtAge(82, "player", playerBounds))
      .toMatchObject({ active: true, smallBubblesLoaded: true });
    expect(fakeTearsAtAge(83, "player", playerBounds))
      .toMatchObject({
        active: false,
        smallBubblesLoaded: false,
        thoughtBubbleLoaded: false,
        musicNotesLoaded: false,
      });
  });

  it("exposes only typed relative source state through the presentation seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "FAKE_TEARS",
      attacker: player,
      target: opponent,
      fieldProfile,
      attackerPictureBounds: playerBounds,
      controllerPresentation: {
        kind: "resolved-stat-drop",
        kickoff: {
          messageId: "STRINGID_USEDMOVE",
          firstAge: -31,
          selection: {
            moveIds: [313, 313, 313, 313],
            maxPP: [20, 20, 20, 20],
            cursor: 0,
          },
        },
        statChange: { battler: "target", stat: "special-defense", from: 6, to: 4 },
        statAnimation: { animationId: "STATS_CHANGE", argument: 55, firstAge: 94 },
        result: { messageId: "STRINGID_DEFENDERSSTATFELL", firstAge: 179 },
        moveEnd: { clearAge: 284 },
      },
    });
    const expected = fakeTearsAtAge(30, "player", playerBounds);
    expect(sceneOnFakeTearsView({ ...stage, age: 30 })).toEqual({
      age: 30,
      attacker: player,
      target: opponent,
      ...expected,
    });
  });

  it("regenerates all source-owned art byte-for-byte", () => {
    const scratch = mkdtempSync(join(tmpdir(), "fake-tears-assets-"));
    const output = join(scratch, "fake-tears.json");
    execFileSync("node", [
      "--experimental-strip-types",
      resolve("tools/compare/extractFakeTearsAssets.ts"),
      "--out",
      output,
    ]);
    expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(fakeTearsAsset);
    expect(fakeTearsAsset.source.script).toContain("SMALL_BUBBLES");
  });
});
