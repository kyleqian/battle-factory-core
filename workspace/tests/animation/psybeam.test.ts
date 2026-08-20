import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  psybeamAtAge,
  psybeamBgBldyAtAge,
  psybeamBgPaletteRotationCountAtAge,
  psybeamRingsAtAge,
  psybeamSwayMonAtAge,
} from "../../src/animation/psybeam.ts";
import {
  createSceneOnMovePresentation,
  sceneOnPsybeamView,
} from "../../src/animation/sceneOnPresentation.ts";

const playerAttacker = { x: 72, y: 93 };
const opponentTarget = { x: 176, y: 42 };

describe("MOVE_PSYBEAM source-relative reducer", () => {
  it("ports PsybeamRings with source Q8.8 timing and cleanup", () => {
    expect(psybeamRingsAtAge(41, "player", playerAttacker, opponentTarget))
      .toEqual([]);
    expect(psybeamRingsAtAge(42, "player", playerAttacker, opponentTarget))
      .toMatchObject([{
        index: 0,
        slot: 3,
        x: 88,
        y: 93,
        x2: 6,
        y2: -3,
        data: [12, 1732, 1005, 1732, 1005, 0, 15357, 2058],
        callback: "AnimTranslateLinear_WithFollowup",
      }]);
    expect(psybeamRingsAtAge(54, "player", playerAttacker, opponentTarget))
      .toHaveLength(3);
    expect(psybeamRingsAtAge(55, "player", playerAttacker, opponentTarget)[0])
      .toMatchObject({ localAge: 13, callback: "DestroyAnimSprite", x2: 87, y2: -51 });
    expect(psybeamRingsAtAge(116, "player", playerAttacker, opponentTarget))
      .toEqual([]);
  });

  it("mirrors ring geometry and SwayMon arguments without shifting source age", () => {
    const rings = psybeamRingsAtAge(
      42,
      "opponent",
      { x: 176, y: 41 },
      { x: 72, y: 88 },
    );
    expect(rings).toMatchObject([{
      x: 160,
      y: 41,
      x2: -6,
      y2: 3,
      data: [12, 1733, 924, 1733, 924, 0, 15357, 2058],
      subpriority: 28,
    }]);
    expect(psybeamSwayMonAtAge(54, "player")).toMatchObject({
      amplitude: 6,
      period: 2048,
      phase: 2048,
      offsetX2: 1,
    });
    expect(psybeamSwayMonAtAge(54, "player")?.taskData.slice(0, 6))
      .toEqual([0, 6, 2048, 4, 8, 1]);
    expect(psybeamSwayMonAtAge(69, "opponent")).toMatchObject({
      amplitude: -6,
      swaysRemaining: 3,
      phase: -32768,
    });
    expect(psybeamSwayMonAtAge(69, "opponent")?.taskData.slice(0, 6))
      .toEqual([0, -6, 2048, 3, 6, 0]);
  });

  it("replays the bilateral source schedule through age 159", () => {
    for (const side of ["player", "opponent"] as const) {
      const attacker = side === "player" ? playerAttacker : { x: 176, y: 41 };
      const target = side === "player" ? opponentTarget : { x: 72, y: 88 };
      for (let age = 0; age < 160; age++) {
        const state = psybeamAtAge(age, side, attacker, target);
        expect(state.age).toBe(age);
        expect(state.active).toBe(age < 159);
        expect(state.rings.every((ring) => ring.localAge >= 0 && ring.localAge <= 13))
          .toBe(true);
        expect(state.visualTaskCount).toBe(
          state.rings.length
            + (state.swayMon ? 1 : 0)
            + (state.tasks.some((task) =>
              task.callback === "AnimTask_BlendColorCycleLoop") ? 1 : 0),
        );
        expect(state.soundTaskCount).toBe(age >= 42 && age <= 88 ? 1 : 0);
      }
      expect(psybeamAtAge(159, side, attacker, target).source.active).toBe(false);
      expect(psybeamAtAge(159, side, attacker, target).resources.loaded).toBe(false);
    }
    expect(psybeamBgBldyAtAge(5)).toBe(0);
    expect(psybeamBgBldyAtAge(21)).toBe(16);
    expect(psybeamBgBldyAtAge(40)).toBe(0);
    expect(psybeamBgBldyAtAge(122)).toBe(0);
    expect(psybeamBgBldyAtAge(138)).toBe(16);
    expect(psybeamBgBldyAtAge(157)).toBe(0);
    expect(psybeamBgPaletteRotationCountAtAge(23)).toBe(0);
    expect(psybeamBgPaletteRotationCountAtAge(26)).toBe(1);
    expect(psybeamBgPaletteRotationCountAtAge(138)).toBe(29);
    expect(psybeamBgPaletteRotationCountAtAge(140)).toBe(0);
  });

  it("exposes the reducer through the typed Scene-ON seam", () => {
    const stage = createSceneOnMovePresentation({
      move: "PSYBEAM",
      attacker: {
        species: "SPINDA",
        geometry: {
          side: "player",
          spriteCorner: { x: 40, y: 60 },
          animationCenter: playerAttacker,
          battlePositionCenter: { x: 72, y: 80 },
        },
      },
      target: {
        species: "ONIX",
        geometry: {
          side: "opponent",
          spriteCorner: { x: 144, y: 10 },
          animationCenter: opponentTarget,
          battlePositionCenter: { x: 176, y: 40 },
        },
      },
      targetIdleX2: 1,
      fieldProfile: {
        playerHp: 148,
        playerMaxHp: 156,
        opponentHp: 117,
        opponentMaxHp: 117,
      },
    });
    const view = sceneOnPsybeamView({ ...stage, age: 42 });
    expect(view).toMatchObject({
      age: 42,
      active: true,
      targetIdleX2: 1,
      rings: [{ x: 88, y: 93, x2: 6, y2: -3 }],
      displayedRings: [],
      displayedTargetSwayX2: 0,
      displayedBgPaletteAge: 41,
    });
  });

  it("replays every retained bilateral source row without framebuffer claims", () => {
    const output = execFileSync(process.execPath, [
      "--experimental-strip-types",
      "tools/compare/psybeamReducerAudit.ts",
    ], { encoding: "utf8" });
    const audit = JSON.parse(output.trim().split("\n").at(-1)!);
    expect(audit).toMatchObject({
      schema: "psybeam-reducer-audit/v1",
      framebufferCompared: false,
      orientations: [
        { orientation: "player-back", sourceRows: 160, reducerRows: 160, failures: [] },
        { orientation: "opponent-front", sourceRows: 160, reducerRows: 160, failures: [] },
      ],
    });
  });
});
