import { describe, expect, it } from "vitest";
import {
  shadowPunchLiveBackgroundBldy,
  SHADOW_PUNCH_STEADY_FADE_HOST,
} from "../../src/animation/shadowPunchFadeHost.ts";

describe("Shadow Punch source fade host", () => {
  it("runs both hardware fades from callback order rather than attacker side", () => {
    expect([0, 16, 20, 21, 36].map(age => shadowPunchLiveBackgroundBldy(age)))
      .toEqual([0, 16, 16, 15, 0]);
    expect([61, 62, 64, 65, 79, 82, 83, 98, 99]
      .map(age => shadowPunchLiveBackgroundBldy(age)))
      .toEqual([0, 1, 1, 2, 16, 16, 15, 0, 0]);
    expect(SHADOW_PUNCH_STEADY_FADE_HOST).toEqual({ restoreTaskCallbackDeferrals: 0 });
  });

  it("defers restore task progress when the source main callback misses a display", () => {
    const deferred = { restoreTaskCallbackDeferrals: 1 } as const;
    expect([82, 83, 84, 99].map(age => shadowPunchLiveBackgroundBldy(age, deferred)))
      .toEqual([16, 16, 15, 0]);
  });

  it("rejects a non-source callback count", () => {
    expect(() => shadowPunchLiveBackgroundBldy(83, { restoreTaskCallbackDeferrals: -1 }))
      .toThrow("nonnegative integer");
  });
});

