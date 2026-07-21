// Tier-1 pins for the settled first-action-menu window (docs/battle-menu-
// idle-notes.md, trace ticks 1742-1810 of tools/compare/traces-groundtruth/
// battle1-menu-dense.json / tools/compare/traces/menu-idle.json, 69/69 at 0
// diff against the live oracle). Pure logic only, per this file's own
// worktree-contract split from tests/battleMenu.test.ts - no oracle/pixels
// here (see tools/compare/traces/menu-idle.json for the pixel-parity side).
import { describe, expect, it } from "vitest";
import { MENU_IDLE_BLANK_START_TICK, MENU_IDLE_BLANK_END_TICK, MENU_DRAW_TICK, menuIdleBounce, CLOSED_FIGHT_SUBMENU_STATE } from "../src/engine/battleMenu.ts";
import { renderBattleScene, TICK0 } from "../src/engine/battleScene.ts";
import menuIdleBlankAsset from "../src/assets/gen/menu-idle-blank.json" with { type: "json" };
import menuIdleBaseAsset from "../src/assets/gen/menu-idle-base.json" with { type: "json" };
import menuIdleOnixBounceAsset from "../src/assets/gen/menu-idle-onix-bounce.json" with { type: "json" };
import menuIdleHealthboxBounceAsset from "../src/assets/gen/menu-idle-healthbox-bounce.json" with { type: "json" };

describe("battleMenu: blank/draw boundary ticks (docs/battle-menu-idle-notes.md §4/battle-menu-notes.md §1)", () => {
  it("the teal blank box spans exactly 1742-1747, the menu draws atomically at 1748", () => {
    expect(MENU_IDLE_BLANK_START_TICK).toBe(1742);
    expect(MENU_IDLE_BLANK_END_TICK).toBe(1747);
    expect(MENU_DRAW_TICK).toBe(1748);
    expect(MENU_DRAW_TICK).toBe(MENU_IDLE_BLANK_END_TICK + 1);
  });
});

describe("battleMenu: menuIdleBounce closed-form generator vs the dossier's RAM-probed phase table (docs/battle-menu-idle-notes.md §1)", () => {
  it("both regions are at rest before the bounce starts (RAM ticks 1745-1747, screen ticks 1746-1748)", () => {
    for (const t of [1742, 1746, 1747, 1748]) {
      expect(menuIdleBounce(t)).toEqual({ onixY2: 0, healthboxY2: 0 });
    }
  });

  it("the tick-1749 blip: region B jumps to 1 for exactly one screen tick, one tick after the menu draws", () => {
    expect(menuIdleBounce(1749)).toEqual({ onixY2: 0, healthboxY2: 1 });
  });

  it("phase 0 (screen 1750-1758): both regions at rest", () => {
    for (const t of [1750, 1754, 1758]) {
      expect(menuIdleBounce(t)).toEqual({ onixY2: 0, healthboxY2: 0 });
    }
  });

  it("phase 1 (screen 1759-1767): region A raised, region B at rest", () => {
    for (const t of [1759, 1763, 1767]) {
      expect(menuIdleBounce(t)).toEqual({ onixY2: 1, healthboxY2: 0 });
    }
  });

  it("phase 2 (screen 1768-1776): both regions raised", () => {
    for (const t of [1768, 1772, 1776]) {
      expect(menuIdleBounce(t)).toEqual({ onixY2: 1, healthboxY2: 1 });
    }
  });

  it("phase 3 (screen 1777-1785): region A at rest, region B raised - same state as the 1749 blip", () => {
    for (const t of [1777, 1781, 1785]) {
      expect(menuIdleBounce(t)).toEqual({ onixY2: 0, healthboxY2: 1 });
    }
  });

  it("the cycle repeats (screen 1786-1810, phase 0/1/2 again)", () => {
    expect(menuIdleBounce(1786)).toEqual({ onixY2: 0, healthboxY2: 0 }); // phase 0 repeat
    expect(menuIdleBounce(1794)).toEqual({ onixY2: 0, healthboxY2: 0 });
    expect(menuIdleBounce(1795)).toEqual({ onixY2: 1, healthboxY2: 0 }); // phase 1 repeat
    expect(menuIdleBounce(1803)).toEqual({ onixY2: 1, healthboxY2: 0 });
    expect(menuIdleBounce(1804)).toEqual({ onixY2: 1, healthboxY2: 1 }); // phase 2 repeat
    expect(menuIdleBounce(1810)).toEqual({ onixY2: 1, healthboxY2: 1 });
  });

  it("the tick-1813-class transient: region B's non-exact 256/7 divisor briefly produces the rare y2=2 state, one tick past this window's own trace", () => {
    expect(menuIdleBounce(1813)).toEqual({ onixY2: 1, healthboxY2: 2 });
  });

  it("region A has the SAME rare y2=2 sine-peak transient as region B (ISSUES #22, docs/battle-menu-notes.md §8c) - tick 1877, further past this window's own trace than region B's own 1813", () => {
    expect(menuIdleBounce(1877)).toEqual({ onixY2: 2, healthboxY2: 1 });
  });

  it("is a real closed-form generator, not a lookup table: distinct sinIndex sequences for regions A and B (seeded 192/128, +7/tick) never re-collide back to the same relative phase within this window (drift, per docs/battle-menu-idle-notes.md §2)", () => {
    // Sanity-check the +7 mod 256 step by re-deriving one point analytically:
    // region B's sinIndex at RAM tick 1748+18=1766 is (128+7*18)&0xFF = 254,
    // which sits in Sin's small-negative range (table[254]=-97 => Sin=-1,
    // y2=0) - screen tick 1767 (RAM 1766) should show healthboxY2=0.
    expect(menuIdleBounce(1767)).toEqual({ onixY2: 1, healthboxY2: 0 });
  });
});

describe("battleMenu: idle window render matches its own committed pixel-harvest assets exactly (belt-and-suspenders on top of tools/compare/traces/menu-idle.json's 69/69 oracle match)", () => {
  /** Renders `t` exactly ONCE (unlike `pixelAtSentOut`, which re-renders per call - too slow for a full-rect scan) and checks every pixel of `asset`'s rect against it. */
  function assertRectMatches(t: number, asset: { x: number; y: number; width: number; height: number; pixels: number[] }) {
    const fb = new Uint8Array(240 * 160 * 4);
    renderBattleScene(fb, { elapsed: t - TICK0, sendOutPressElapsed: 380, fightSubmenu: CLOSED_FIGHT_SUBMENU_STATE, turn1Resolved: false, turn2Resolved: false, turn3Resolved: false, turn4Resolved: false, turn5KoDismissElapsed: null, turn5Resolved: false, turn6Resolved: false, turn7Resolved: false, turn8Resolved: false, turn9Resolved: false, turn10Resolved: false, turn11Resolved: false });
    const { x, y, width, height, pixels } = asset;
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        const i = (py * width + px) * 3;
        const o = ((y + py) * 240 + (x + px)) * 4;
        const actual: [number, number, number] = [fb[o]!, fb[o + 1]!, fb[o + 2]!];
        const expected: [number, number, number] = [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
        expect(actual).toEqual(expected);
      }
    }
  }

  it("blank box (tick 1742) matches the harvested frame", () => {
    assertRectMatches(1742, menuIdleBlankAsset);
  });

  it("menu draw (tick 1748, both regions at rest) matches the harvested base frame", () => {
    assertRectMatches(1748, menuIdleBaseAsset);
  });

  it("region A raised to y2=1 (tick 1759) matches the harvested onix-bounce patch's y1 state", () => {
    const { x, y, width, height, y1 } = menuIdleOnixBounceAsset;
    assertRectMatches(1759, { x, y, width, height, pixels: y1 });
  });

  it("region A raised to y2=2 (tick 1877, the rare sine-peak transient - ISSUES #22, docs/battle-menu-notes.md §8c) matches the harvested onix-bounce patch's y2 state, NOT its y1 state", () => {
    const { x, y, width, height, y2 } = menuIdleOnixBounceAsset;
    assertRectMatches(1877, { x, y, width, height, pixels: y2 });
  });

  it("region B raised to y2=1 (tick 1749, the blip) matches the harvested healthbox-bounce patch's y1 state", () => {
    const { x, y, width, height, y1 } = menuIdleHealthboxBounceAsset;
    assertRectMatches(1749, { x, y, width, height, pixels: y1 });
  });

  it("region B raised to y2=2 (tick 1813, the rare transient) matches the harvested healthbox-bounce patch's y2 state", () => {
    const { x, y, width, height, y2 } = menuIdleHealthboxBounceAsset;
    assertRectMatches(1813, { x, y, width, height, pixels: y2 });
  });
});
