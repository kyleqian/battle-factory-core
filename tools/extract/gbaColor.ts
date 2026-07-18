// GBA color pipeline shared by every extractor.
//
// Reference art (.pal files, PNG PLTE chunks) stores colors as 8-bit RGB
// approximations of the real 5-bit-per-channel GBA color. Most of this
// codebase's reference art (JASC-PAL files, tileset/sprite PNGs) comes from
// pret/pokeemerald's own build tools, which emit `floor(c5 * 255 / 31)` -
// but that's just one convention for approximating a 5-bit channel in 8
// bits; gbagfx-family tools that convert straight from a paletted PNG (e.g.
// `graphics/text_window/message_box.png`) instead emit the simpler `c5 * 8`
// (a plain left-shift, no low-bit fill). Both conventions - and mGBA's own
// real `(c5<<3)|(c5>>2)` framebuffer expansion - agree on one thing: the
// true 5-bit value always survives in the value's top 5 bits. Recovering it
// via `v8 >> 3` (rather than rounding against one specific forward formula)
// is therefore the correct general inverse regardless of which convention
// produced a given reference file - verified against all 22 colors of the
// anchor frame (see ROADMAP.md Domain notes) and, since fixing ISSUES #15,
// against `message_box.png`'s embedded palette (whose raw values are exact
// multiples of 8 - `floor(v8*31/255)` silently rounded those down by one
// GBA step, e.g. 248 -> 30 instead of the correct 31).

/** Recover the 5-bit GBA channel value from an 8-bit reference-art value (top 5 bits - see module doc). */
export function to5Bit(v8: number): number {
  return v8 >> 3;
}

/** Expand a 5-bit GBA channel value to 8-bit the way mGBA's framebuffer does. */
export function expand5to8(c5: number): number {
  return (c5 << 3) | (c5 >> 2);
}

/** Round-trip an 8-bit reference-art channel value to the oracle-matching 8-bit value. */
export function gbaRoundTrip(v8: number): number {
  return expand5to8(to5Bit(v8));
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function gbaRoundTripColor([r, g, b, a]: readonly [number, number, number, number]): Rgba {
  // Palette index 0 of every GBA palette is transparent regardless of its
  // stored RGB value; callers that care use a=0 to signal that.
  return { r: gbaRoundTrip(r), g: gbaRoundTrip(g), b: gbaRoundTrip(b), a };
}
