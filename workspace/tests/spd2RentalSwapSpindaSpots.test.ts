// spd2 (docs/spd2-rental-swap-spinda-spots.md): SPINDA's spots on the Factory's rental and swap screens, and in Scene ON move bodies.
// Kyle's 2026-11-24 draft showed the rental cursor pic of a SPINDA with no spots. Every front pic the ROM builds goes through
// LoadSpecialPokePic -> DrawSpindaSpots (decompress.c:85-112) with the personality CreateMonPicSprite_HandleDeoxys is handed:
// the cursor pic (Select_CreateMonSprite / Select_ReshowMonSprite), the three chosen pics (Select_CreateChosenMonsSprites) and the
// swap screen's pic (Swap_CreateMonSprite) pass the mon's personality; the swap screen's redraw after a summary
// (Swap_ShowSummaryMonSprite, battle_factory_screen.c:4089-4093, non-BUGFIX) passes personality and OT id swapped, so its spots come
// from the OT id. A live move body drew the opponent from the plain sheet (spd1 spotted only the field picture).
//
// ROM: the frame catcher (tools/frame-catcher) over the three traces in fixtures/spd2-spinda-traces.json. ROM_SPOTS is, per row of
// the 64x64 picture, the pixels drawn in palette[c + 4] where the plain picture has colour c in 1..3, measured from the ROM frame
// alone (every other opaque pixel of the picture was the plain colour, offset 0, 0). Kyle's draft: ROM frame 901 (personality
// 1984593932); seed 10's draft: ROM 280 (cursor), 466 (after the summary), 732 (chosen); seed 28's swaps: ROM 13123 (the enemy's
// SPINDA), 26591 (the same mon as the player's), 26835 (after its summary: OT id 416049562's spots), and battle 1's FAINT ATTACK body (the
// opponent SPINDA attacking) at ROM 3334 (region hash below, the sprite at rest).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import "../src/engine/monPicPixelsInstall.ts";
import { frontPixels } from "../src/engine/monPicPixels.ts";
import { spindaSpottedTileset } from "../src/engine/spindaSpots.ts";
import { render } from "../src/engine/core.ts";
import { FactorySession, type FactorySessionOptions } from "../src/factorySession.ts";
import type { EngineState } from "../src/engine/core.ts";
import tracesJson from "./fixtures/spd2-spinda-traces.json" with { type: "json" };

type Trace = Readonly<{ challenge: FactorySessionOptions; segments: readonly (readonly [number, string])[] }>;
const traces = tracesJson as unknown as Readonly<Record<"draftSeed10" | "swapSeed28" | "kyle1124Draft", Trace>>;

const KYLE = 1984593932;
const SEED10 = 3753806507;
const SEED28 = 2945348007;
const PLAYER_TRAINER_ID = 416049562; // every Factory mon's OT id (OT_ID_PLAYER_ID / the oracle save's trainer id)

const r = (rows: Record<number, bigint>) => rows;
const ROM_SPOTS: Readonly<Record<number, Readonly<Record<number, bigint>>>> = {
  [KYLE]: r({ 8: 0x600000n, 9: 0x1c00000n, 10: 0x2000000n, 11: 0xc0000000000n, 12: 0xc0000000000n, 13: 0x160000000000n, 14: 0x1a0000000000n, 15: 0x1a0000000000n, 16: 0xb0000000000n, 17: 0x30000000000n, 18: 0x70000000000n, 19: 0x73800000000n, 20: 0x6000000000n, 21: 0x1c000000n, 22: 0x3e000000n, 23: 0x7f000000n, 24: 0x7f000000n, 25: 0x3c78000000n, 26: 0xe77000000n, 27: 0xf769000000n, 28: 0x9b2a000000n, 29: 0x6b08000000n, 30: 0x4b00000000n, 31: 0x7700000000n, 32: 0xe00000000n, 33: 0x3c00000000n }),
  [SEED10]: r({ 9: 0x1e00001800000n, 10: 0x3f00003e00000n, 11: 0x7f80003100000n, 12: 0x7880006e00000n, 13: 0xf740005f00000n, 14: 0xef8000db00000n, 15: 0xeb8000da00000n, 16: 0x6b8000e680000n, 17: 0x690001fd00000n, 18: 0x340001f300000n, 19: 0x360001c600000n, 20: 0x1800001000000n, 28: 0x1c0000000n, 29: 0x3e0000000n, 30: 0x3e0000000n, 31: 0x7807f0000000n, 32: 0x7c07f0000000n, 33: 0x3e0790000000n, 34: 0x3e07f0000000n, 35: 0x1e0000000000n, 36: 0xe0000000000n, 37: 0x60000000000n }),
  [SEED28]: r({ 9: 0x380000n, 10: 0x180000fc0000n, 11: 0x1c00011e0000n, 12: 0xc0002ee0000n, 13: 0x360001f60000n, 14: 0x3a0005b60000n, 15: 0x1a0005a40000n, 16: 0x1b00066c0000n, 17: 0x30003d80000n, 18: 0x70003300000n, 19: 0x10000600000n, 20: 0x800000n, 25: 0x1c0000000n, 26: 0x3e0000000n, 27: 0x7e0000000n, 28: 0x7803e0000000n, 29: 0x7c03e0000000n, 30: 0x7c03e0000000n, 31: 0x7c07f0000000n, 32: 0x7c03e0000000n, 33: 0x3e0180000000n, 34: 0x3e0000000000n, 35: 0x1c0000000000n, 36: 0x80000000000n }),
  [PLAYER_TRAINER_ID]: r({ 8: 0x400000n, 9: 0x1e00001f00000n, 10: 0x3f80003f80000n, 11: 0x7fc0003180000n, 12: 0x78c0006ec0000n, 13: 0xf760005f40000n, 14: 0xef8000db40000n, 15: 0xeb8000da40000n, 16: 0x6b8000e680000n, 17: 0x690001fd80000n, 18: 0x140000f300000n, 19: 0x3004000000n, 20: 0x17800000000n, 21: 0x3fc00000000n, 22: 0x3fc00000000n, 23: 0x1fc00000000n, 24: 0x3fc00000000n, 25: 0x3fc00000000n, 26: 0x10800000000n, 27: 0xf000000000n, 29: 0x60000000n, 30: 0xe8000000n, 31: 0x1f0000000n, 32: 0x1fc000000n, 33: 0x19c000000n, 34: 0x1fc000000n, 35: 0xc000000n, 36: 0x18000000n, 37: 0x30000000n }),
};
/** sha256 of the RGB888 pixels of (136,0)-(216,72) on ROM frame 3334: battle 1's FAINT ATTACK body by the opponent SPINDA (SEED28). */
const ROM_BODY_REGION_SHA256 = "7a6c65e6845492255b330f97e5c979de695da6c8bced3f6d2cbb8c7b8909c064";

type Tiles = Readonly<{ columns: number; tiles: readonly (readonly number[])[] }>;
const plain = () => frontPixels("SPINDA")!.tileset as Tiles;
const palette = () => frontPixels("SPINDA")!.palette!;
const index = (t: Tiles, x: number, y: number): number => t.tiles[(y >> 3) * t.columns + (x >> 3)]![(y & 7) * 8 + (x & 7)]!;

/** The spot rows of the SPINDA drawn at (x0, y0) of a 240x160 RGBA frame; throws when an opaque pixel is neither plain nor spotted. */
function spotRows(fb: Uint8Array, x0: number, y0: number): Record<number, bigint> {
  const rows: Record<number, bigint> = {};
  const pal = palette();
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const c = index(plain(), x, y);
      if (c === 0) continue;
      const o = ((y0 + y) * 240 + x0 + x) * 4;
      const is = (k: number) => fb[o] === pal[k]!.r && fb[o + 1] === pal[k]!.g && fb[o + 2] === pal[k]!.b;
      if (c >= 1 && c <= 3 && is(c + 4)) rows[y] = (rows[y] ?? 0n) | (1n << BigInt(x));
      else if (!is(c)) throw new Error(`pixel (${x0 + x}, ${y0 + y}) is not SPINDA's colour ${c}`);
    }
  }
  return rows;
}

function tilesetRows(tileset: Tiles): Record<number, bigint> {
  const rows: Record<number, bigint> = {};
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      if (index(tileset, x, y) !== index(plain(), x, y)) rows[y] = (rows[y] ?? 0n) | (1n << BigInt(x));
    }
  }
  return rows;
}

/** Replays `trace` and hands the session to `at` on each listed frame (1-based, FactorySession.frame after the step). */
function replay(trace: Trace, frames: readonly number[], at: (frame: number, state: EngineState) => void): void {
  const session = new FactorySession({ ...trace.challenge, challengeRequest: "hold" });
  const wanted = new Set(frames);
  const last = Math.max(...frames);
  let frame = 0;
  for (const [count, buttons] of trace.segments) {
    const held = new Set(buttons === "" ? [] : buttons.split("+")) as never;
    for (let i = 0; i < count; i += 1) {
      session.replayStep(held);
      frame += 1;
      if (wanted.has(frame)) at(frame, session.state);
      if (frame >= last) return;
    }
  }
  throw new Error(`trace ended at frame ${frame} before ${last}`);
}

describe("spd2: SPINDA's spots on the rental and swap screens, as on the ROM", () => {
  it("the spot rule gives the ROM's spots for each personality measured, the OT id's included", () => {
    for (const [value, rows] of Object.entries(ROM_SPOTS)) {
      expect(tilesetRows(spindaSpottedTileset(plain() as Tiles & { rows: number }, Number(value))), value).toEqual(rows);
    }
  });

  it("Kyle's draft: the rental cursor pic of his SPINDA has its personality's spots (the summary already had them)", () => {
    replay(traces.kyle1124Draft, [900], (_frame, state) => {
      expect(state.draftScreen.mode).toBe("menu");
      expect(state.draftScreen.rentals[state.draftScreen.cursorPos]).toMatchObject({ name: "SPINDA", personality: KYLE });
      expect(spotRows(render(state), 88, 32)).toEqual(ROM_SPOTS[KYLE]);
    });
  });

  it("seed 10's draft: the cursor pic, its redraw after a summary, the chosen pics and the decline's hold", () => {
    const seen: string[] = [];
    replay(traces.draftSeed10, [300, 520, 790, 828, 829, 950], (frame, state) => {
      const draft = state.draftScreen;
      const fb = render(state);
      if (frame === 300 || frame === 520) {
        // 300: Select_CreateMonSprite; 520: Select_ReshowMonSprite after the SUMMARY visit (personality, otId in the right order)
        expect(draft.rentals[draft.cursorPos]).toMatchObject({ name: "SPINDA", personality: SEED10 });
        expect(spotRows(fb, 88, 32)).toEqual(ROM_SPOTS[SEED10]);
      } else {
        // Select_CreateChosenMonsSprites: SPINDA was rented first, so it is the left pic ((0 * 72) + 16, 32)
        expect(draft.confirmReveal?.phase).toBe(frame === 828 || frame === 829 ? "closing" : "shown");
        if (frame === 828 || frame === 829) {
          // the decline cleared the 3rd pick the same tick; the pics hold from the snapshot (confirmReveal.decliningPersonalities)
          expect(draft.selectedIds.filter((id) => id > 0)).toHaveLength(2);
          expect(draft.confirmReveal?.decliningPersonalities?.[0]).toBe(SEED10);
        }
        expect(spotRows(fb, 16, 32)).toEqual(ROM_SPOTS[SEED10]);
      }
      seen.push(`${frame}`);
    });
    expect(seen).toEqual(["300", "520", "790", "828", "829", "950"]);
  });

  it("seed 28's swaps: the enemy's and the player's SPINDA, then the redraw after its summary with the OT id's spots", () => {
    replay(traces.swapSeed28, [12740, 25830, 26080], (frame, state) => {
      const swap = state.factorySwap!;
      const fb = render(state);
      if (frame === 12740) {
        // Swap_CreateMonSprite on the enemy screen (gEnemyParty[cursorPos])
        expect(swap.controller.phase).toBe("acceptPrompt");
        expect(swap.controller.enemyParty[swap.controller.cursor as 0]).toMatchObject({ species: "SPINDA", personality: SEED28 });
        expect(spotRows(fb, 88, 32)).toEqual(ROM_SPOTS[SEED28]);
      } else if (frame === 25830) {
        // Swap_CreateMonSprite on the player screen, before the summary
        expect(swap.controller.phase).toBe("playerOptions");
        expect(swap.returnedFromSummary).toBe(false);
        expect(swap.controller.playerParty[swap.controller.cursor as 0]).toMatchObject({ species: "SPINDA", personality: SEED28 });
        expect(spotRows(fb, 88, 32)).toEqual(ROM_SPOTS[SEED28]);
      } else {
        // Swap_ShowSummaryMonSprite: the same mon, its spots now from the OT id (the non-BUGFIX argument swap)
        expect(swap.controller.phase).toBe("playerOptions");
        expect(swap.returnedFromSummary).toBe(true);
        expect(swap.controller.playerParty[swap.controller.cursor as 0]).toMatchObject({ species: "SPINDA", personality: SEED28 });
        expect(spotRows(fb, 88, 32)).toEqual(ROM_SPOTS[PLAYER_TRAINER_ID]);
        expect(ROM_SPOTS[PLAYER_TRAINER_ID]).not.toEqual(ROM_SPOTS[SEED28]);
      }
    });
  });

  it("seed 28's battle 1: a Scene ON move body (its FAINT ATTACK) draws the opponent SPINDA with its spots, frame for frame as the ROM", () => {
    replay(traces.swapSeed28, [3140], (_frame, state) => {
      const fb = render(state);
      expect(spotRows(fb, 144, 16)).toEqual(ROM_SPOTS[SEED28]);
      const rgb = Buffer.alloc(80 * 72 * 3);
      for (let y = 0; y < 72; y += 1) {
        for (let x = 0; x < 80; x += 1) {
          const o = (y * 240 + 136 + x) * 4;
          rgb.set([fb[o]!, fb[o + 1]!, fb[o + 2]!], (y * 80 + x) * 3);
        }
      }
      expect(createHash("sha256").update(rgb).digest("hex")).toBe(ROM_BODY_REGION_SHA256);
    });
  });
});
