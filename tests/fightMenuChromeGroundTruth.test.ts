// Tier-1 pins for the fight-menu chrome pass (docs/fight-menu-chrome-ground-truth.md).
//
// The static residuals measured on the torment fixture are NOT render/asset
// bugs in the fight submenu itself - the submenu chrome (border + cursor
// arrow + move names + PP label + TYPE row) is byte-exact. The two residuals
// named "type cell" and "type-name text" in ISSUES #81 were mis-attributed:
//
//   (2) "type cell" (y80-87 x184-199) = the PLAYER-healthbox GENDER GLYPH.
//       The oracle's BUTTERFREE is male (fixture pins gender "male" on the
//       staged player); the app stages personality 0 -> female. This file
//       pins the exact getMonGender staging contract a fix must satisfy.
//   (3) "type-name text" (y120-135 x205-215) = the TACKLE PP digit. Turn 1
//       used TACKLE, so the oracle's live currentPP[0] is 34, not 35; the
//       app stages full PP. This file pins the ppRemainingGlyphCodes
//       sequence for the oracle's real post-turn-1 value.
//
// and class (1) "move-target arrow" is falsified: there is no arrow diff, and
// the fight-submenu harvest's four slots share the border chrome, differing
// only in the per-slot text rows and the cursor arrow's own row (the
// MoveSelectionCreateCursorAt cursor - battle_controller_player.c), i.e. no
// context-dependent arrow is baked in by a bad harvest tick.

import { describe, expect, it } from "vitest";
import { getMonGender } from "../src/engine/monGender.ts";
import { ppRemainingGlyphCodes } from "../src/engine/battleMenu.ts";
import fightSubmenuWindowAsset from "../src/assets/gen/fight-submenu-window.json" with { type: "json" };

const BUTTERFREE_GENDER_RATIO = 127; // 50% female, `summary-info.json` species 12
const MURKROW_GENDER_RATIO = 127; // 50% female, species 198

describe("getMonGender: the torment-stage gender contract (class 2 root cause)", () => {
  it("personality 0 (current BUTTERFREE_TORMENTED_LV50 default) yields FEMALE - the oracle is male", () => {
    expect(getMonGender(BUTTERFREE_GENDER_RATIO, 0)).toBe("female");
  });

  it("personality 150 (MURKROW's existing pin) yields MALE for a 127-ratio species", () => {
    expect(getMonGender(MURKROW_GENDER_RATIO, 150)).toBe("male");
    expect(getMonGender(BUTTERFREE_GENDER_RATIO, 150)).toBe("male");
  });

  it("any low byte >= genderRatio yields male (the fix's staging constraint, matching pokemon.c:3471)", () => {
    for (const lowByte of [127, 128, 150, 200, 254]) {
      expect(getMonGender(127, lowByte)).toBe("male");
    }
    for (const lowByte of [0, 1, 64, 126]) {
      expect(getMonGender(127, lowByte)).toBe("female");
    }
  });
});

describe("ppRemainingGlyphCodes: the oracle's post-turn-1 TACKLE PP (class 3 root cause)", () => {
  it("TACKLE used once on turn 1 -> currentPP 34, maxPP 35 -> the exact '34/35' glyph-code run", () => {
    const codes = ppRemainingGlyphCodes(34, 35);
    // FONT_NORMAL digit codes (battleMenu.ts): 0..9 = 161..170, '/' = 186.
    expect(codes).toEqual([164, 165, 186, 164, 166]);
    // '3'=164, '4'=165, '/'=186, '3'=164, '5'=166
  });

  it("the app's current full-PP staging (35/35) is the residual - a full-PP mon renders '35/35'", () => {
    expect(ppRemainingGlyphCodes(35, 35)).toEqual([164, 166, 186, 164, 166]);
  });
});

describe("fight-submenu-window.json: the harvest's per-slot cursor arrow is correct (class 1 falsified)", () => {
  const window = fightSubmenuWindowAsset as {
    x: number;
    y: number;
    width: number;
    height: number;
    slots: Record<string, number[]>;
  };
  const SLOT_NAMES = ["ROCK_SLIDE", "BIND", "SANDSTORM", "DRAGON_BREATH"] as const;
  const CURSOR_COLOR = [74, 66, 82]; // the arrow's outline color, oracle-verified at screen (3-8, 124-133)
  const { width } = window;

  // Per-slot cursor bbox, patch-local: row1 (y11-19) or row2 (y27-35), left
  // column (x3-9) or right column (x80-88). NOTE the fight menu's second row
  // is REVERSED: slot 2 (SANDSTORM) is bottom-RIGHT and slot 3 (DRAGON_BREATH)
  // is bottom-LEFT - oracle-verified against battle1-fight-submenu-nav.json at
  // the harvest's own SLOT_TICKS (1900/1918/1940/2010) and matches
  // MoveSelectionCreateCursorAt (battle_controller_player.c). This is the
  // "context-dependent arrow" question: the harvest bakes each cursor's real
  // position, and it agrees with the oracle.
  const EXPECTED_ARROWS: Readonly<Record<string, { x: number; y: number }>> = {
    ROCK_SLIDE: { x: 3, y: 11 },
    BIND: { x: 80, y: 11 },
    SANDSTORM: { x: 80, y: 27 },
    DRAGON_BREATH: { x: 3, y: 27 },
  };

  function cursorPixels(slot: number[], x0: number, y0: number): number {
    let count = 0;
    for (let y = y0; y < y0 + 9; y += 1) {
      for (let x = x0; x < x0 + 7; x += 1) {
        const i = (y * width + x) * 3;
        if (slot[i] === CURSOR_COLOR[0] && slot[i + 1] === CURSOR_COLOR[1] && slot[i + 2] === CURSOR_COLOR[2]) {
          count += 1;
        }
      }
    }
    return count;
  }

  it("each slot's cursor arrow sits at its own expected row/column (the harvest bakes per-slot positions, no context-dependent arrow)", () => {
    for (const name of SLOT_NAMES) {
      const slot = window.slots[name]!;
      // The arrow must be present at its own slot's position and ABSENT from
      // the other three slots' positions.
      for (const other of SLOT_NAMES) {
        const e = EXPECTED_ARROWS[other]!;
        const count = cursorPixels(slot, e.x, e.y);
        if (other === name) {
          expect(count).toBeGreaterThan(0);
        } else {
          expect(count).toBe(0);
        }
      }
    }
  });

  it("the border chrome rows are byte-identical across all four slots (no bake drift)", () => {
    const base = window.slots[SLOT_NAMES[0]]!;
    // Top border (y0-1), divider rows (y21-22, y37-38), bottom border (y44-45).
    for (const row of [0, 1, 21, 22, 37, 38, 44, 45]) {
      for (const name of SLOT_NAMES.slice(1)) {
        const a = base.slice(row * width * 3, (row + 1) * width * 3);
        const b = window.slots[name]!.slice(row * width * 3, (row + 1) * width * 3);
        expect(a).toEqual(b);
      }
    }
  });
});
