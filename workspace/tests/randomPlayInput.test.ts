import { describe, expect, it } from "vitest";
import {
  createInputGenerator,
  createRng,
  KEY_FOR_BUTTON,
  parseSeed,
  presentationSeedHex,
  type PlayInput,
} from "../tools/browser/randomPlayInput.ts";
import { buttonForKey } from "../src/input.ts";

function take(seed: number, count: number, stalled = false): PlayInput[] {
  const generator = createInputGenerator(seed);
  return Array.from({ length: count }, () => generator.next(stalled));
}

describe("random play input generator", () => {
  it("is deterministic per seed and differs across seeds", () => {
    expect(take(7, 200)).toEqual(take(7, 200));
    expect(take(7, 200)).not.toEqual(take(8, 200));
  });

  it("rng stays in [0, 1)", () => {
    const rng = createRng(0xffffffff);
    for (let i = 0; i < 10_000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("is biased towards A while progressing and spreads out when stalled", () => {
    const share = (inputs: PlayInput[]) => inputs.filter((input) => input.button === "A").length / inputs.length;
    expect(share(take(1, 5000))).toBeGreaterThan(0.55);
    expect(share(take(1, 5000))).toBeLessThan(0.75);
    expect(share(take(1, 5000, true))).toBeLessThan(0.35);
  });

  it("covers every button, with sane hold and gap durations", () => {
    const inputs = take(3, 5000);
    expect(new Set(inputs.map((input) => input.button))).toEqual(new Set(Object.keys(KEY_FOR_BUTTON)));
    for (const input of inputs) {
      expect(input.holdMs).toBeGreaterThanOrEqual(50);
      expect(input.holdMs).toBeLessThanOrEqual(1000);
      expect(input.gapMs).toBeGreaterThanOrEqual(30);
      expect(input.gapMs).toBeLessThan(250);
    }
  });

  it("maps every button to a key the game binds", () => {
    const bound = Object.values(KEY_FOR_BUTTON).map((key) => buttonForKey(key));
    expect(bound.sort()).toEqual(["A", "B", "DOWN", "LEFT", "RIGHT", "START", "UP"]);
  });

  it("parses seeds as decimal or hex and renders the presentation seed as bare hex", () => {
    expect(parseSeed("42")).toBe(42);
    expect(parseSeed("0xdeadBEEF")).toBe(0xdeadbeef);
    expect(presentationSeedHex(0xdeadbeef)).toBe("deadbeef");
    expect(() => parseSeed("-1")).toThrow();
    expect(() => parseSeed("abc")).toThrow();
  });
});
