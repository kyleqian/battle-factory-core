// Hermetic Tier-1 tests for the S4 summary-screen fade math (src/engine/paletteFade.ts).
// No oracle, no pixels at test time - but every literal below was read directly off
// dense oracle probes (bin/oracle run, every-frame captureFrames) of all four
// entry/exit palette-fade transitions; see paletteFade.ts's module doc and
// docs/summary-screen-notes.md for the probe methodology.

import { describe, expect, it } from "vitest";
import {
  bgFadeY,
  blendComponentToBlack,
  ENTRY_BLACK_HOLD_TICKS,
  ENTRY_FADE_OUT,
  ENTRY_FADE_OUT_TICKS,
  EXIT_BLACK_HOLD_TICKS,
  EXIT_FADE_OUT,
  EXIT_FADE_OUT_TICKS,
  FADE_IN,
  FADE_IN_TICKS,
  objFadeY,
} from "../src/engine/paletteFade.ts";

describe("blendComponentToBlack: 5-bit BlendPalette math, oracle-verified against component 90 (0x5A) and 255", () => {
  it("y=0 is unfaded, y=16 is fully black", () => {
    expect(blendComponentToBlack(90, 0)).toBe(90);
    expect(blendComponentToBlack(90, 16)).toBe(0);
    expect(blendComponentToBlack(255, 0)).toBe(255);
    expect(blendComponentToBlack(255, 16)).toBe(0);
  });

  it("matches the oracle's per-2-frame-step values for component 90 (draft-screen chrome corner)", () => {
    expect(blendComponentToBlack(90, 2)).toBe(74);
    expect(blendComponentToBlack(90, 4)).toBe(66);
    expect(blendComponentToBlack(90, 6)).toBe(49);
    expect(blendComponentToBlack(90, 8)).toBe(41);
    expect(blendComponentToBlack(90, 10)).toBe(33);
    expect(blendComponentToBlack(90, 12)).toBe(16);
    expect(blendComponentToBlack(90, 14)).toBe(8);
  });

  it("matches the oracle's per-2-frame-step values for component 255 (Info page white background)", () => {
    expect(blendComponentToBlack(255, 2)).toBe(222);
    expect(blendComponentToBlack(255, 4)).toBe(189);
    expect(blendComponentToBlack(255, 6)).toBe(156);
    expect(blendComponentToBlack(255, 8)).toBe(123);
    expect(blendComponentToBlack(255, 10)).toBe(90);
    expect(blendComponentToBlack(255, 12)).toBe(57);
    expect(blendComponentToBlack(255, 14)).toBe(24);
  });
});

describe("bgFadeY/objFadeY: entry fade-out (draft screen -> black), press-tick-relative ticks", () => {
  it("holds startY through the 5-tick dead delay, then steps by 2 every 2 ticks", () => {
    for (let t = 0; t <= 4; t += 1) expect(bgFadeY(t, ENTRY_FADE_OUT)).toBe(0);
    expect(bgFadeY(5, ENTRY_FADE_OUT)).toBe(2);
    expect(bgFadeY(6, ENTRY_FADE_OUT)).toBe(2);
    expect(bgFadeY(7, ENTRY_FADE_OUT)).toBe(4);
    expect(bgFadeY(17, ENTRY_FADE_OUT)).toBe(14);
    expect(bgFadeY(18, ENTRY_FADE_OUT)).toBe(14);
    expect(bgFadeY(19, ENTRY_FADE_OUT)).toBe(16);
    expect(bgFadeY(25, ENTRY_FADE_OUT)).toBe(16); // clamped once settled
  });

  it("OBJ lags BG by exactly one tick (objPaletteToggle alternation)", () => {
    for (let t = 0; t <= 5; t += 1) expect(objFadeY(t, ENTRY_FADE_OUT)).toBe(0);
    expect(objFadeY(6, ENTRY_FADE_OUT)).toBe(2);
    expect(objFadeY(19, ENTRY_FADE_OUT)).toBe(14);
    expect(objFadeY(20, ENTRY_FADE_OUT)).toBe(16);
  });

  it("both layers reach black exactly at ENTRY_FADE_OUT_TICKS (oracle: frame 62 = press-tick+20)", () => {
    expect(bgFadeY(ENTRY_FADE_OUT_TICKS - 1, ENTRY_FADE_OUT)).toBe(16);
    expect(objFadeY(ENTRY_FADE_OUT_TICKS, ENTRY_FADE_OUT)).toBe(16);
    expect(objFadeY(ENTRY_FADE_OUT_TICKS - 1, ENTRY_FADE_OUT)).toBeLessThan(16);
  });
});

describe("bgFadeY/objFadeY: exit fade-out (Info page -> black), B-press-tick-relative ticks", () => {
  it("holds startY through the 3-tick dead delay (shorter than entry's 5)", () => {
    for (let t = 0; t <= 2; t += 1) expect(bgFadeY(t, EXIT_FADE_OUT)).toBe(0);
    expect(bgFadeY(3, EXIT_FADE_OUT)).toBe(2);
    expect(bgFadeY(4, EXIT_FADE_OUT)).toBe(2);
    expect(bgFadeY(5, EXIT_FADE_OUT)).toBe(4);
  });

  it("both layers reach black exactly at EXIT_FADE_OUT_TICKS (oracle: frame 123 = B-press-tick+18)", () => {
    expect(bgFadeY(EXIT_FADE_OUT_TICKS - 1, EXIT_FADE_OUT)).toBe(16);
    expect(objFadeY(EXIT_FADE_OUT_TICKS, EXIT_FADE_OUT)).toBe(16);
  });
});

describe("bgFadeY/objFadeY: fade-in (black -> destination screen), shared shape by entry and exit", () => {
  it("steps immediately from tick 0, no dead delay", () => {
    expect(bgFadeY(0, FADE_IN)).toBe(14);
    expect(bgFadeY(1, FADE_IN)).toBe(14);
    expect(bgFadeY(2, FADE_IN)).toBe(12);
    expect(objFadeY(0, FADE_IN)).toBe(16);
    expect(objFadeY(1, FADE_IN)).toBe(14);
  });

  it("both layers settle on the unfaded destination colors exactly at FADE_IN_TICKS", () => {
    expect(bgFadeY(FADE_IN_TICKS - 1, FADE_IN)).toBe(0);
    expect(objFadeY(FADE_IN_TICKS, FADE_IN)).toBe(0);
    expect(objFadeY(FADE_IN_TICKS - 1, FADE_IN)).toBeGreaterThan(0);
  });

  it("matches the oracle's observed component-255 fade-in sequence (entry, press-tick+44 onward)", () => {
    expect(blendComponentToBlack(255, bgFadeY(0, FADE_IN))).toBe(24);
    expect(blendComponentToBlack(255, bgFadeY(2, FADE_IN))).toBe(57);
    expect(blendComponentToBlack(255, bgFadeY(4, FADE_IN))).toBe(90);
    expect(blendComponentToBlack(255, bgFadeY(12, FADE_IN))).toBe(222);
    expect(blendComponentToBlack(255, bgFadeY(14, FADE_IN))).toBe(255);
  });

  it("matches the oracle's observed component-90 fade-in sequence (exit, B-press-tick+38 onward)", () => {
    expect(blendComponentToBlack(90, bgFadeY(0, FADE_IN))).toBe(8);
    expect(blendComponentToBlack(90, bgFadeY(4, FADE_IN))).toBe(33);
    expect(blendComponentToBlack(90, bgFadeY(12, FADE_IN))).toBe(74);
    expect(blendComponentToBlack(90, bgFadeY(14, FADE_IN))).toBe(90);
  });
});

describe("total settle timing, oracle cross-check against docs/summary-screen-notes.md", () => {
  it("entry settles at press-tick+59 (20 fade-out + 24 black-hold + 15 fade-in)", () => {
    expect(ENTRY_FADE_OUT_TICKS + ENTRY_BLACK_HOLD_TICKS + FADE_IN_TICKS).toBe(59);
  });

  it("exit settles at B-press-tick+53 (18 fade-out + 20 black-hold + 15 fade-in)", () => {
    expect(EXIT_FADE_OUT_TICKS + EXIT_BLACK_HOLD_TICKS + FADE_IN_TICKS).toBe(53);
  });
});
