import { describe, expect, it } from "vitest";
import { advanceRngValue, GbaRng, RNG_INCREMENT, RNG_MULTIPLIER } from "../src/engine/rng.ts";

// Anchor state: the Level-50 single challenge's rental-draft screen,
// RAM-verified gRngValue = 0xd2ddeec8 (see ROADMAP.md Domain notes and
// src/data/gen/anchor-state.json).
const ANCHOR_RNG_VALUE = 0xd2ddeec8;

describe("RNG constants", () => {
  it("match reference/pokeemerald/include/random.h's ISO_RANDOMIZE1", () => {
    expect(RNG_MULTIPLIER).toBe(1103515245);
    expect(RNG_INCREMENT).toBe(24691);
  });
});

describe("advanceRngValue", () => {
  it("computes gRngValue = 1103515245 * gRngValue + 24691 (mod 2^32)", () => {
    // Cross-checked against a BigInt reference computation independent of the
    // implementation under test.
    const v = 0x12345678;
    const expected = Number((1103515245n * BigInt(v) + 24691n) & 0xffffffffn);
    expect(advanceRngValue(v)).toBe(expected);
  });

  it("wraps modulo 2^32 without producing negative or fractional values", () => {
    const next = advanceRngValue(0xffffffff);
    expect(Number.isInteger(next)).toBe(true);
    expect(next).toBeGreaterThanOrEqual(0);
    expect(next).toBeLessThanOrEqual(0xffffffff);
  });

  it("advances the anchor seed to the RAM-verified next values", () => {
    // Independently verified via node BigInt arithmetic against the anchor seed.
    expect(advanceRngValue(ANCHOR_RNG_VALUE)).toBe(0xddeffb9b);
    expect(advanceRngValue(0xddeffb9b)).toBe(0x92b9bb72);
  });
});

describe("GbaRng", () => {
  it("seeds from the anchor gRngValue and exposes it via rngValue", () => {
    const rng = new GbaRng(ANCHOR_RNG_VALUE);
    expect(rng.rngValue).toBe(ANCHOR_RNG_VALUE);
  });

  it("next() advances gRngValue then returns its upper 16 bits, like Random()", () => {
    const rng = new GbaRng(ANCHOR_RNG_VALUE);
    const result = rng.next();
    expect(rng.rngValue).toBe(0xddeffb9b);
    expect(result).toBe(0xddef);
  });

  it("produces the same N-step sequence as repeated advanceRngValue calls", () => {
    let value = ANCHOR_RNG_VALUE;
    const rng = new GbaRng(ANCHOR_RNG_VALUE);
    for (let i = 0; i < 50; i++) {
      value = advanceRngValue(value);
      expect(rng.next()).toBe((value >>> 16) & 0xffff);
    }
    expect(rng.rngValue).toBe(value);
  });
});
