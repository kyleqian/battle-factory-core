import { describe, expect, it } from "vitest";
import {
  monIconElapsedAfterSubmenuStall,
  monIconFrameAt,
  monIconSelectedY2,
} from "../src/engine/battlePartySelect.ts";
import partyMonIconsData from "../src/assets/gen/party-mon-icons.json" with { type: "json" };

type PartyIcon = Readonly<{
  paletteIndex: number;
  frame0: Readonly<{ tiles: readonly (readonly number[])[] }>;
  frame1: Readonly<{ tiles: readonly (readonly number[])[] }>;
  palette: readonly Readonly<{ r: number; g: number; b: number }>[];
}>;
const partyIcons = partyMonIconsData as unknown as Readonly<Record<string, PartyIcon>>;

// ISSUES #80 rank 2 pins: the in-battle party-menu slot "list art" is the
// mon-icon family (CreateMonIcon at party_menu.c:3946 resolving
// gMonIconTable gfx + gMonIconPaletteIndices[species] into the shared
// gMonIconPaletteTable palettes, pokemon_icon.c:24/468/912). party-mon-icons.json
// is derived from those tables; these tests pin the derivation and the
// ROM-accurate 2-frame animation (sAnim_0 + SpriteCB_BouncePartyMonIcon).
describe("party-menu mon-icon derivation (ISSUES #80 rank 2)", () => {
  it("resolves RATTATA to gMonIconPaletteIndices index 2 and a 16-color shared palette row", () => {
    const rattata = partyIcons["SPECIES_RATTATA"]!;
    // pokemon_icon.c:489 [SPECIES_RATTATA] = 2.
    expect(rattata.paletteIndex).toBe(2);
    expect(rattata.palette).toHaveLength(16);
    // gMonIconPaletteTable[2] = gMonIconPalettes[2] = icon_palette_2.pal.
    // Frame 0 tile (row 2, col 1): the rat's head/ear edge.
    expect(rattata.frame0.tiles[2 * 4 + 1]!.slice(48, 56)).toEqual([14, 15, 12, 12, 12, 12, 12, 12]);
    // Palette index 15 = (66,66,66) dark-gray outline ink shared across icon palettes.
    expect(rattata.palette[15]).toEqual({ r: 66, g: 66, b: 66 });
    expect(rattata.palette[12]).toEqual({ r: 198, g: 165, b: 206 });
  });

  it("resolves ABSOL to a different gMonIconPaletteIndices row with distinct art", () => {
    const absol = partyIcons["SPECIES_ABSOL"]!;
    // pokemon_icon.c:495-ish [SPECIES_ABSOL] = 0 (shared icon palette row 0).
    expect(absol.paletteIndex).toBe(0);
    expect(absol.palette).toHaveLength(16);
    // Frame 0 tile (row 2, col 1): the scythe-blade tip pattern.
    expect(absol.frame0.tiles[2 * 4 + 1]!.slice(0, 8)).toEqual([3, 3, 3, 3, 15, 2, 2, 2]);
    expect(absol.palette[4]).toEqual({ r: 189, g: 165, b: 66 });
  });

  it("has two distinct frames whose tile data differ", () => {
    const rattata = partyIcons["SPECIES_RATTATA"]!;
    expect(rattata.frame0.tiles).not.toEqual(rattata.frame1.tiles);
    expect(rattata.frame0.tiles).toHaveLength(16);
    expect(rattata.frame1.tiles).toHaveLength(16);
  });
});

// sAnim_0 (pokemon_icon.c:941-946) frames frame0 for 6 ticks, frame1 for 6,
// then ANIMCMD_JUMP; UpdateMonIconFrame's per-frame advance makes frame 0 show
// 7 ticks and frame 1 show 8 (a 15-tick cycle). Calibrated so the settled
// menu's frame clock starts 30 frames before the selector's elapsed=0.
describe("party-menu mon-icon animation cadence", () => {
  it("alternates frames on the ROM's 7/8-tick 15-cycle", () => {
    expect(monIconFrameAt(36)).toBe(0);
    expect(monIconFrameAt(37)).toBe(1);
    expect(monIconFrameAt(44)).toBe(1);
    expect(monIconFrameAt(45)).toBe(0);
    expect(monIconFrameAt(51)).toBe(0);
    expect(monIconFrameAt(52)).toBe(1);
    // Repeats with the same period.
    expect(monIconFrameAt(36 + 15)).toBe(0);
    expect(monIconFrameAt(37 + 15)).toBe(1);
  });

  it("bounces the selected icon -3/+1 on frame changes after a 0 hold", () => {
    // Selected at elapsed 121 (the RIGHT edge moving the cursor to slot 1 in
    // the mid-battle-switch fixture): y2 holds 0 until the first frame change
    // (elapsed 127), then -3 on frame 0 / +1 on frame 1.
    expect(monIconSelectedY2(121, 121)).toBe(0);
    expect(monIconSelectedY2(126, 121)).toBe(0);
    expect(monIconSelectedY2(127, 121)).toBe(1);
    expect(monIconSelectedY2(135, 121)).toBe(-3);
    expect(monIconSelectedY2(142, 121)).toBe(1);
    // Frame-905 acceptance: selected slot 1 sits at +1, matching the oracle.
    expect(monIconFrameAt(142)).toBe(1);
  });

  it("stalls the icon clock by +2 from the submenu-open edge (ISSUES #80 (c))", () => {
    // docs/fade-layer-forensics.md §7(e): the oracle's icon clock stalls 2
    // frames while the SEND OUT submenu opens, so the B phase holds 920-929 and
    // the toggles land at oracle frames 930/937/945/... -- not the un-stalled
    // app's 928/935/943/... (the fixture's icon clock is elapsed = frame - 763).
    const preStall = (frame: number) =>
      monIconFrameAt(monIconElapsedAfterSubmenuStall(frame - 763, false));
    const stalled = (frame: number) =>
      monIconFrameAt(monIconElapsedAfterSubmenuStall(frame - 763, true));
    // Before the submenu opens the toggles at 905/913/920 are unchanged.
    expect(preStall(905)).toBe(1);
    expect(preStall(913)).toBe(0);
    expect(preStall(920)).toBe(1);
    // Un-stalled (the bug): the frame-1→frame-0 toggle lands at 928 (and 935).
    expect(monIconFrameAt(928 - 763)).toBe(0);
    expect(monIconFrameAt(935 - 763)).toBe(1);
    // Stalled: the B hold covers 928-929 and the toggle lands at 930, then the
    // cadence carries the +2 through 937/945.
    expect(stalled(928)).toBe(1);
    expect(stalled(929)).toBe(1);
    expect(stalled(930)).toBe(0);
    expect(stalled(935)).toBe(0);
    expect(stalled(937)).toBe(1);
    expect(stalled(945)).toBe(0);
  });
});
