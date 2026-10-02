import { describe, expect, it } from "vitest";
import {
  shadowPunchLiveBackgroundBldy,
  SHADOW_PUNCH_STEADY_FADE_HOST,
} from "../../src/animation/shadowPunchFadeHost.ts";
import { renderSceneOnMovePresentation } from "../../src/engine/battleScene.ts";

const liveState = (restoreTaskStartCallbackDeferrals: number) => ({
  age: 83,
  config: {
    move: "SHADOW_PUNCH" as const,
    attacker: {
      species: "HAUNTER",
      geometry: {
        side: "player" as const,
        spriteCorner: { x: 40, y: 56 }, animationCenter: { x: 72, y: 96 },
        battlePositionCenter: { x: 72, y: 80 },
      },
    },
    target: {
      species: "ONIX",
      geometry: {
        side: "opponent" as const,
        spriteCorner: { x: 144, y: 10 }, animationCenter: { x: 176, y: 42 },
        battlePositionCenter: { x: 176, y: 40 },
      },
    },
    attackerSpriteId: 6, attackerMoveSpeed: 8, attackerSubpriority: 30,
    fieldProfile: { playerHp: 120, opponentHp: 110, playerStatus: "none" as const },
    liveFadeHost: { restoreTaskStartCallbackDeferrals },
  },
});

describe("Shadow Punch source fade host", () => {
  it("runs both hardware fades from callback order rather than attacker side", () => {
    expect([0, 16, 20, 21, 36].map(age => shadowPunchLiveBackgroundBldy(age)))
      .toEqual([0, 16, 16, 15, 0]);
    expect([61, 62, 64, 65, 79, 82, 83, 98, 99]
      .map(age => shadowPunchLiveBackgroundBldy(age)))
      .toEqual([0, 1, 1, 2, 16, 16, 15, 0, 0]);
    expect(SHADOW_PUNCH_STEADY_FADE_HOST).toEqual({ restoreTaskStartCallbackDeferrals: 0 });
  });

  it("defers restore task progress when the source main callback misses a display", () => {
    const deferred = { restoreTaskStartCallbackDeferrals: 1 } as const;
    expect([82, 83, 84, 99].map(age => shadowPunchLiveBackgroundBldy(age, deferred)))
      .toEqual([16, 16, 15, 0]);
  });

  it("carries the typed deferral through the live framebuffer renderer", () => {
    const steady = new Uint8Array(240 * 160 * 4);
    const deferred = new Uint8Array(steady.length);
    renderSceneOnMovePresentation(steady, liveState(0), true);
    renderSceneOnMovePresentation(deferred, liveState(1), true);
    let changedPixels = 0;
    for (let p = 0; p < 240 * 160; p++) {
      if (steady[p * 4] !== deferred[p * 4]
          || steady[p * 4 + 1] !== deferred[p * 4 + 1]
          || steady[p * 4 + 2] !== deferred[p * 4 + 2]) changedPixels++;
    }
    expect(changedPixels).toBeGreaterThan(10_000);
  });

  it("rejects a non-source callback count", () => {
    expect(() => shadowPunchLiveBackgroundBldy(83, { restoreTaskStartCallbackDeferrals: -1 }))
      .toThrow("nonnegative integer");
  });
});
