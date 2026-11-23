// obr2 (ISSUES #200 c): the party-status-summary ball tiles are selected by CreatePartyStatusSummarySprites' `oam.tileNum += n`
// (battle_interface.c:1546-1586): healthy 0, empty 1, status 2, fainted 3. The ball sheet used to be named in the enum order
// (Fainted 2, Statused 3), so every typed path that went through `ballStateTileIndex` drew a fainted mon with the status tile.
// The obr251 opponent bar (ROM-offset mapped) is oracle-exact over 527..546 on obr251-opponent-faint-{on,off}; these paths now agree with it.
import { describe, expect, it } from "vitest";
import {
  ballDisplay,
  ballIcons,
  ballStateTileIndex,
  drawOpponentSummaryExit,
  healthboxBackgroundColorAt,
} from "../src/engine/battleScene.ts";
import { TURN13_OPPONENT_ICON_STATES, TURN5_OPPONENT_ICON_STATES } from "../src/engine/battleSceneCanonical.ts";
import type { PartyBallState } from "../src/engine/battleResolutionPresentation.ts";

const SUMMARY: readonly PartyBallState[] = ["fainted", "status", "healthy", "empty", "empty", "empty"];

describe("party ball tiles follow the ROM tile offsets (obr2)", () => {
  it("the sheet's states are named by the ROM offsets: healthy 0, empty 1, status 2, fainted 3", () => {
    expect(ballDisplay.states).toEqual(["Full", "Empty", "Statused", "Fainted"]);
    expect(ballStateTileIndex("Full")).toBe(0);
    expect(ballStateTileIndex("Empty")).toBe(1);
    expect(ballStateTileIndex("Statused")).toBe(2);
    expect(ballStateTileIndex("Fainted")).toBe(3);
  });

  it("the canonical Battle 2 trays keep their oracle-confirmed pixels: the former 'Statused' slots were fainted mons (tile 3)", () => {
    expect(TURN5_OPPONENT_ICON_STATES.map(ballStateTileIndex)).toEqual([1, 1, 1, 0, 0, 3]);
    expect(TURN13_OPPONENT_ICON_STATES.map(ballStateTileIndex)).toEqual([1, 1, 1, 3, 0, 3]);
  });

  it("the intro tray (ballIcons) maps fainted -> tile 3 and status -> tile 2, the opponent side mirrored", () => {
    const icons = ballIcons(200, { player: SUMMARY, opponent: SUMMARY });
    const opponent = icons.slice(0, 6).map((icon) => ballStateTileIndex(icon.state));
    const player = icons.slice(6).map((icon) => ballStateTileIndex(icon.state));
    expect(player).toEqual([3, 2, 0, 1, 1, 1]);
    expect(opponent).toEqual([1, 1, 1, 0, 2, 3]);
  });

  it("the opponent exit path draws a fainted ball with tile 3 and a status ball with tile 2", () => {
    const eva = 15;
    const evb = 1;
    const blend = (c: number, bg: number): number => Math.min(255, Math.floor((c * eva + bg * evb) / 16));
    const draw = (): Uint8Array => {
      const fb = new Uint8Array(240 * 160 * 4).fill(0);
      drawOpponentSummaryExit(fb, 11, 10, "destin", SUMMARY);
      return fb;
    };
    const fb = draw();
    // Exit elapsed 0: icon j sits at 26 + 10 j (icon 5 has already moved 3 px: opponentIconExitX) and shows summaryStates[5 - j]; pixel (col 3, row 1) tells the tiles apart.
    const expected = (tile: number, x: number, y: number): number[] => {
      const colour = ballDisplay.palette[ballDisplay.tileset.tiles[tile]![1 * 8 + 3]!]!;
      const bg = healthboxBackgroundColorAt(x, y) ?? { r: 0, g: 0, b: 0 };
      return [blend(colour.r, bg.r), blend(colour.g, bg.g), blend(colour.b, bg.b)];
    };
    const pixel = (x: number, y: number): number[] => [...fb.subarray((y * 240 + x) * 4, (y * 240 + x) * 4 + 3)];
    const at = (j: number) => ({ x: 26 + 10 * j + 3 + (j === 5 ? 3 : 0), y: 33 });
    expect(pixel(at(5).x, at(5).y)).toEqual(expected(3, at(5).x, at(5).y)); // states[0] fainted
    expect(pixel(at(4).x, at(4).y)).toEqual(expected(2, at(4).x, at(4).y)); // states[1] status
    expect(pixel(at(3).x, at(3).y)).toEqual(expected(0, at(3).x, at(3).y)); // states[2] healthy
    expect(expected(3, 0, 0)).not.toEqual(expected(2, 0, 0));
  });
});
