// Hermetic regression test for the anchor draft-screen render: pins the
// engine's output against committed src/assets/gen + src/data/gen artifacts
// only - no oracle, no emulator. Complements (does not replace) the oracle
// pixel comparison in `npm run compare -- tools/compare/traces/anchor.json`.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createInitialState, render, SCREEN_WIDTH, SCREEN_HEIGHT, tick } from "../src/engine/core.ts";

describe("anchor draft screen render", () => {
  it("renders a fully-opaque 240x160 RGBA frame", () => {
    const fb = render(createInitialState());
    expect(fb.length).toBe(SCREEN_WIDTH * SCREEN_HEIGHT * 4);
    for (let i = 3; i < fb.length; i += 4) {
      expect(fb[i]).toBe(255);
    }
  });

  it("is deterministic across repeated renders of the same state", () => {
    const a = render(createInitialState());
    const b = render(createInitialState());
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("draws the six gray rental balls at their known sprite centers", () => {
    const fb = render(createInitialState());
    for (let i = 0; i < 6; i += 1) {
      const centerX = 35 * i + 32;
      const offset = (64 * SCREEN_WIDTH + centerX) * 4;
      // Ball highlight pixel should not be the black chrome background.
      expect([fb[offset], fb[offset + 1], fb[offset + 2]]).not.toEqual([0, 0, 0]);
    }
  });

  it("draws the red cursor arrow under rental slot 1 (cursorPos 0)", () => {
    const fb = render(createInitialState());
    const offset = (84 * SCREEN_WIDTH + 32) * 4;
    expect(fb[offset]).toBeGreaterThan(fb[offset + 1]); // red-dominant pixel
  });

  it("pins the current render byte-for-byte (update deliberately, not accidentally)", () => {
    const fb = render(createInitialState());
    const hash = createHash("sha256").update(fb).digest("hex");
    // Not yet pixel-exact against the oracle (see PROGRESS.md / ISSUES.md for
    // the known font half-row decompression gap) - this pins the current
    // deterministic output so unrelated changes don't silently shift it.
    expect(hash).toBe("e6b63b424799f44b5295db820b941372b42af62a92a44108b12bc8753a8327d0");
  });

  it("tick() only advances the frame counter (S1 renders a static anchor frame)", () => {
    const state = createInitialState();
    const next = tick(state, new Set());
    expect(next.frame).toBe(state.frame + 1);
    expect(render(next)).toEqual(render(state));
  });
});
