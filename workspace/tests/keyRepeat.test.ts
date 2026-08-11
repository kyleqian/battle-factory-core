import { describe, expect, it } from "vitest";
import { INITIAL_KEY_REPEAT_STATE, readKeys, type KeyRepeatState } from "../src/engine/keyRepeat.ts";

function press(button: "RIGHT" | "LEFT", frames: number, state: KeyRepeatState) {
  const fires: number[] = [];
  for (let i = 1; i <= frames; i += 1) {
    const { newAndRepeatedKeys, next } = readKeys(new Set([button]), state);
    if (newAndRepeatedKeys.has(button)) fires.push(i);
    state = next;
  }
  return { fires, state };
}

describe("keyRepeat (reference/pokeemerald src/main.c ReadKeys)", () => {
  it("fires JOY_NEW immediately on the press frame", () => {
    const { newKeys, newAndRepeatedKeys } = readKeys(new Set(["RIGHT"]), INITIAL_KEY_REPEAT_STATE);
    expect(newKeys.has("RIGHT")).toBe(true);
    expect(newAndRepeatedKeys.has("RIGHT")).toBe(true);
  });

  it("does not repeat while released", () => {
    const { newAndRepeatedKeys } = readKeys(new Set(), INITIAL_KEY_REPEAT_STATE);
    expect(newAndRepeatedKeys.size).toBe(0);
  });

  it("repeats a held button for the first time on tick 41, then every 5 ticks (start=40, continue=5)", () => {
    const { fires } = press("RIGHT", 60, INITIAL_KEY_REPEAT_STATE);
    expect(fires).toEqual([1, 41, 46, 51, 56]);
  });

  it("resets the repeat counter when the button is released and re-pressed", () => {
    const first = press("RIGHT", 10, INITIAL_KEY_REPEAT_STATE); // well short of the first repeat
    const released = readKeys(new Set(), first.state);
    const second = press("RIGHT", 41, released.next);
    // Re-press starts a fresh JOY_NEW + a fresh 40-tick countdown to repeat.
    expect(second.fires).toEqual([1, 41]);
  });

  it("does not repeat a fresh, different button combination on the change frame", () => {
    const held = press("RIGHT", 5, INITIAL_KEY_REPEAT_STATE);
    const switched = readKeys(new Set(["LEFT"]), held.state);
    expect(switched.newKeys.has("LEFT")).toBe(true);
    expect(switched.newAndRepeatedKeys.has("LEFT")).toBe(true);
    expect(switched.newAndRepeatedKeys.has("RIGHT")).toBe(false);
  });
});
